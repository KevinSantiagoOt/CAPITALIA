import { Request, Response } from "express"
import prisma from "../lib/prisma"
import { syncInstallments, actualizarEstadoPorCuotas } from "../services/installmentService"

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

    res.json(prestamo)
  } catch(error) {
    res.status(404).json({ message: "Préstamo no encontrado" })
  }
}

// ACTUALIZAR PRESTAMO
export const updateLoan = async (req: Request, res: Response) => {
    try{
        const usuarioId = res.locals.usuarioId as string
        const {id} = req.params
        const idStrg = String(id)
        const {montoCapital, tasaInteres, fechaInicio, fechaFinPlazo, estado} = req.body

        const existe = await prisma.prestamo.findFirst({ where: { id: idStrg, usuarioId } })
        if (!existe) {
            return res.status(404).json({ message: "No se encontro el préstamo" })
        }

        const updatedLoan = await prisma.prestamo.update({
            where: { id: idStrg },
            data: { montoCapital, tasaInteres, fechaInicio, fechaFinPlazo, estado }
        })
        res.json(updatedLoan)
    } catch(error) {
        res.status(404).json({ message: "No se encontro el préstamo" })
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
