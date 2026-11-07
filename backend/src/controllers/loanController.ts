import { Request, Response } from "express"
import { Prisma } from "@prisma/client"
import prisma from "../lib/prisma"
import { syncInstallments, actualizarEstadoPorCuotas, sumarMeses } from "../services/installmentService"
import { conEnlaces, borrarArchivosDePrestamos } from "./documentController"

// CREAR PRESTAMO
export const createLoan = async (req: Request, res: Response) => {
    try{
        const usuarioId = res.locals.usuarioId as string
        const {montoCapital, tasaInteres, fechaInicio, fechaFinPlazo, estado, deudorId} = req.body

        if (!(Number(montoCapital) > 0) || !(Number(tasaInteres) > 0)) {
            return res.status(400).json({ message: "El monto y la tasa de interés deben ser mayores a cero" })
        }

        // Las fechas llegan como "AAAA-MM-DD"; Prisma necesita objetos Date
        const inicio = new Date(fechaInicio)
        const fin = fechaFinPlazo ? new Date(fechaFinPlazo) : null
        if (isNaN(inicio.getTime()) || (fin && isNaN(fin.getTime()))) {
            return res.status(400).json({ message: "Fecha inválida" })
        }
        if (fin && fin <= inicio) {
            return res.status(400).json({ message: "La fecha fin debe ser posterior a la fecha de inicio" })
        }

        // El deudor tiene que ser del mismo prestamista
        const deudor = await prisma.deudor.findFirst({ where: { id: deudorId, usuarioId } })
        if (!deudor) {
            return res.status(404).json({ message: "Deudor no encontrado" })
        }

        // Si estaba archivado y vuelve a pedir prestado, regresa a la lista
        if (deudor.archivado) {
            await prisma.deudor.update({ where: { id: deudorId }, data: { archivado: false } })
        }

        const newLoan = await prisma.prestamo.create({
        data: {montoCapital, tasaInteres, fechaInicio: inicio, fechaFinPlazo: fin, estado: estado ?? "activo", deudorId, usuarioId}
    })
    res.status(201).json({message: "Deuda ingresada", id: newLoan.id})
    } catch(error) {
  console.error(error)
  res.status(500).json({ error: String(error) })
}
}

// OBTENER PRESTAMO POR ID
export const getLoanById = async (req: Request, res: Response) => {
  try {
    const usuarioId = res.locals.usuarioId as string
    const id = req.params.id as string

    await syncInstallments(usuarioId)

    const prestamo = await prisma.prestamo.findFirst({
      where: { id, usuarioId },
      include: {
        deudor: true,    // datos del deudor
        cuotas: { orderBy: { fechaVencimiento: "asc" } },    // sus cuotas, de la más vieja a la más nueva
        documentos: true // sus documentos
      }
    })

    if (!prestamo) {
      return res.status(404).json({ message: "Préstamo no encontrado" })
    }

    // Los documentos van con enlaces firmados: las letras son privadas en Cloudinary
    res.json({ ...prestamo, documentos: conEnlaces(prestamo.documentos) })
  } catch(error) {
    res.status(404).json({ message: "Préstamo no encontrado" })
  }
}

// ACTUALIZAR PRESTAMO
// Ajusta las cuotas pendientes a los datos nuevos; las pagadas no se tocan
// - Monto o tasa: las cuotas sin pagar toman el nuevo interés
// - Fecha fin: se borran las cuotas sin pagar posteriores; si se alarga, la sincronización crea las que falten
// - Fecha de inicio: solo si no hay cuotas pagadas; se rehacen todas las cuotas
export const updateLoan = async (req: Request, res: Response) => {
    try{
        const usuarioId = res.locals.usuarioId as string
        const {id} = req.params
        const idStrg = String(id)
        const {montoCapital, tasaInteres, fechaInicio, fechaFinPlazo} = req.body

        if (!(Number(montoCapital) > 0) || !(Number(tasaInteres) > 0)) {
            return res.status(400).json({ message: "El monto y la tasa de interés deben ser mayores a cero" })
        }
        const inicio = new Date(fechaInicio)
        const fin = fechaFinPlazo ? new Date(fechaFinPlazo) : null
        if (isNaN(inicio.getTime()) || (fin && isNaN(fin.getTime()))) {
            return res.status(400).json({ message: "Fecha inválida" })
        }
        if (fin && fin <= inicio) {
            return res.status(400).json({ message: "La fecha fin debe ser posterior a la fecha de inicio" })
        }

        const existe = await prisma.prestamo.findFirst({ where: { id: idStrg, usuarioId } })
        if (!existe) {
            return res.status(404).json({ message: "No se encontro el préstamo" })
        }
        if (existe.estado !== "activo" || existe.capitalDevuelto) {
            return res.status(409).json({ message: "No se puede editar un préstamo cerrado" })
        }

        const cambiaInicio = inicio.getTime() !== existe.fechaInicio.getTime()
        if (cambiaInicio) {
            const pagadas = await prisma.cuota.count({ where: { prestamoId: idStrg, pagado: true } })
            if (pagadas > 0) {
                return res.status(409).json({ message: "No se puede cambiar la fecha de inicio porque ya tiene cuotas pagadas" })
            }
        }

        const montoInteres = new Prisma.Decimal(montoCapital).mul(tasaInteres).div(100).toDecimalPlaces(2)

        const updatedLoan = await prisma.$transaction(async (tx) => {
            const actualizado = await tx.prestamo.update({
                where: { id: idStrg },
                data: { montoCapital, tasaInteres, fechaInicio: inicio, fechaFinPlazo: fin }
            })

            if (cambiaInicio) {
                // No hay pagadas (se verificó arriba): se borran todas y la sincronización las rehace
                await tx.cuota.deleteMany({ where: { prestamoId: idStrg } })
            } else {
                if (fin) {
                    await tx.cuota.deleteMany({ where: { prestamoId: idStrg, pagado: false, fechaVencimiento: { gt: fin } } })
                }
                await tx.cuota.updateMany({ where: { prestamoId: idStrg, pagado: false }, data: { montoInteres } })
            }
            return actualizado
        })

        // Crea las cuotas que falten con los datos nuevos
        await syncInstallments(usuarioId)

        res.json(updatedLoan)
    } catch(error) {
        console.error(error)
        res.status(500).json({ error: "Error en el servidor" })
    }
}

// CERRAR PRESTAMO (EL DEUDOR DEVOLVIO EL CAPITAL)
// Body: { conservarPendientes: boolean }
// - Las cuotas futuras sin pagar se borran: sin capital ya no se cobra interés
// - Las vencidas sin pagar se conservan como deuda (el préstamo sigue activo hasta pagarlas)
//   o se borran (el préstamo queda pagado de una vez)
export const closeLoan = async (req: Request, res: Response) => {
    try {
        const usuarioId = res.locals.usuarioId as string
        const id = String(req.params.id)
        const conservarPendientes = req.body.conservarPendientes === true

        // Primero se crean las cuotas que falten, para no cerrar sin cobrar un mes ya vencido
        await syncInstallments(usuarioId)

        const prestamo = await prisma.prestamo.findFirst({ where: { id, usuarioId } })
        if (!prestamo) {
            return res.status(404).json({ message: "Préstamo no encontrado" })
        }
        if (prestamo.estado !== "activo" || prestamo.capitalDevuelto) {
            return res.status(409).json({ message: "Este préstamo ya está cerrado o su capital ya fue devuelto" })
        }

        const hoy = new Date()
        const hoyUTC = new Date(Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()))

        await prisma.$transaction(async (tx) => {
            await tx.cuota.deleteMany({ where: { prestamoId: id, pagado: false, fechaVencimiento: { gt: hoyUTC } } })
            if (!conservarPendientes) {
                await tx.cuota.deleteMany({ where: { prestamoId: id, pagado: false } })
            }
            await tx.prestamo.update({ where: { id }, data: { capitalDevuelto: hoyUTC } })
        })

        // Sin cuotas pendientes queda "pagado"; con pendientes conservadas sigue "activo"
        await actualizarEstadoPorCuotas(id)

        const actualizado = await prisma.prestamo.findUnique({ where: { id } })
        res.json(actualizado)
    } catch (error) {
        console.error(error)
        res.status(500).json({ error: "Error en el servidor" })
    }
}

// EXTENDER EL PLAZO DE UN PRESTAMO CON FECHA FIN
// Body: { meses: 1 | 3 | 6 } para correr la fecha fin, o { sinFecha: true } para quitarla
// Cuando el plazo vence y el deudor no devuelve el capital, no se crean cuotas nuevas
// hasta que el prestamista extienda el plazo o cierre el préstamo (decisión de Kevin)
export const extendLoan = async (req: Request, res: Response) => {
    try {
        const usuarioId = res.locals.usuarioId as string
        const id = String(req.params.id)
        const { meses, sinFecha } = req.body

        if (sinFecha !== true && ![1, 3, 6].includes(Number(meses))) {
            return res.status(400).json({ message: "Indica cuántos meses extender (1, 3 o 6) o quitar la fecha fin" })
        }

        const prestamo = await prisma.prestamo.findFirst({ where: { id, usuarioId } })
        if (!prestamo) {
            return res.status(404).json({ message: "Préstamo no encontrado" })
        }
        if (prestamo.estado !== "activo" || prestamo.capitalDevuelto) {
            return res.status(409).json({ message: "Este préstamo ya está cerrado" })
        }
        if (!prestamo.fechaFinPlazo) {
            return res.status(409).json({ message: "Este préstamo no tiene fecha fin" })
        }

        const nuevaFin = sinFecha === true ? null : sumarMeses(prestamo.fechaFinPlazo, Number(meses))
        const actualizado = await prisma.prestamo.update({ where: { id }, data: { fechaFinPlazo: nuevaFin } })

        // Crea las cuotas de los meses nuevos
        await syncInstallments(usuarioId)

        res.json(actualizado)
    } catch (error) {
        console.error(error)
        res.status(500).json({ error: "Error en el servidor" })
    }
}

// ELIMINAR PRESTAMOS
export const deleteLoan = async (req: Request, res: Response) => {
    try{
        const usuarioId = res.locals.usuarioId as string
        const {id} = req.params
        const idStrg = String(id)

        const existe = await prisma.prestamo.findFirst({ where: { id: idStrg, usuarioId } })
        if (!existe) {
            return res.status(404).json({ message: "No se encontro el préstamo" })
        }

        // La BD borra los documentos en cascada, pero los archivos en Cloudinary hay que borrarlos aparte
        await borrarArchivosDePrestamos([idStrg])

        await prisma.prestamo.delete({
            where: { id: idStrg }
        })
        res.json({ message: "Préstamo eliminado" })
    } catch(error) {
        res.status(404).json({ message: "No se encontro el préstamo" })
    }
}

// VER TODOS LOS PRESTAMOS
// El :usuarioId de la URL se ignora; se usa el del token
export const getAllLoans = async (req: Request, res: Response) => {
  try {
    const usuarioId = res.locals.usuarioId as string
    await syncInstallments(usuarioId)

    const deudores = await prisma.prestamo.findMany({
      where: { usuarioId },
      include: {
        deudor: true,
        cuotas: true,
        documentos: true
      }
    })

    res.json(deudores)
  } catch(error) {
    res.status(404).json({ message: "No se encontraron préstamos" })
  }
}

//OBTENER PRESTAMOS ACTIVOS
// El :usuarioId de la URL se ignora; se usa el del token
export const getActiveLoans = async (req: Request, res: Response) => {
    try {
    const usuarioId = res.locals.usuarioId as string
    await syncInstallments(usuarioId)

    const prestamos = await prisma.prestamo.findMany({
      where: {
        usuarioId,
        estado: "activo"
      },include: {
        deudor: true,
        cuotas: true, // la app las usa para el badge de cuotas vencidas
      }
    })
    res.json(prestamos)
  } catch(error) {
    res.status(404).json({ message: "No se encontraron prestamos activos." })
  }
}
