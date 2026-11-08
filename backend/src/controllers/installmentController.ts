import { Request, Response } from "express"
import prisma from "../lib/prisma"
import { syncInstallments, actualizarEstadoPorCuotas } from "../services/installmentService"

// CREAR LA CUOTA
export const createInstallment = async (req: Request, res: Response) => {
    try{
        const usuarioId = res.locals.usuarioId as string
        const {montoInteres, fechaVencimiento, prestamoId} = req.body

        // El préstamo tiene que ser del mismo prestamista
        const prestamo = await prisma.prestamo.findFirst({ where: { id: prestamoId, usuarioId } })
        if (!prestamo) {
            return res.status(404).json({ message: "Préstamo no encontrado" })
        }

        const newInstallment = await prisma.cuota.create({
        data: {montoInteres, fechaVencimiento, prestamoId}
    })
    res.status(201).json({message: "Cuota ingresada", id: newInstallment.id})
    }catch(error) {
        res.status(500).json({ error: String(error) })
    }
}

// FILTRAR TODAS LAS CUOTAS DE UN PRESTAMO
export const getInstallmentsByLoanId = async (req: Request, res: Response) => {
    try {
        const usuarioId = res.locals.usuarioId as string
        const prestamoId = req.params.prestamoId as string

        const installments = await prisma.cuota.findMany({
            where: { prestamoId, prestamo: { usuarioId } }
        })
        res.json(installments)
    } catch(error) {
        res.status(500).json({ error: String(error) })
    }
}

// ACTUALIZAR CUOTA
export const updateInstallment = async (req: Request, res: Response) => {
    try{
        const usuarioId = res.locals.usuarioId as string
        const {id} = req.params
        const idStrg = String(id)
        const {pagado, fechaPago} = req.body

        // La cuota tiene que ser de un préstamo del mismo prestamista
        const existe = await prisma.cuota.findFirst({ where: { id: idStrg, prestamo: { usuarioId } } })
        if (!existe) {
            return res.status(404).json({ message: "No se encontro la cuota" })
        }

        // La app envía el día del pago como "AAAA-MM-DD" (puede ser anterior a hoy si lo anotó después).
        // Si se marca como pagada sin fecha, se toma la de hoy; si se desmarca, se borra
        let fechaPagoFinal = fechaPago
        if (typeof fechaPago === "string") {
            if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaPago)) {
                return res.status(400).json({ message: "La fecha de pago no es válida" })
            }
            fechaPagoFinal = new Date(`${fechaPago}T00:00:00Z`) // Prisma necesita un Date, no el texto
        }
        if (fechaPago === undefined && pagado === true) fechaPagoFinal = new Date()
        if (fechaPago === undefined && pagado === false) fechaPagoFinal = null

        const updatedInstallment = await prisma.cuota.update({
            where: { id: idStrg },
            data: { pagado, fechaPago: fechaPagoFinal }
        })

        // Desmarcar un pago anticipado en un préstamo sin fecha fin: la cuota siguiente se había
        // creado por ese pago, así que sobra. Se borran las sin pagar posteriores a esta cuota
        // (solo si esta no ha vencido; si ya venció, las siguientes son meses reales)
        if (pagado === false) {
            const hoy = new Date()
            const hoyUTC = new Date(Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()))
            const prestamo = await prisma.prestamo.findUnique({ where: { id: existe.prestamoId } })
            if (prestamo && !prestamo.fechaFinPlazo && existe.fechaVencimiento >= hoyUTC) {
                await prisma.cuota.deleteMany({
                    where: { prestamoId: existe.prestamoId, pagado: false, fechaVencimiento: { gt: existe.fechaVencimiento } }
                })
            }
        }

        // Si ya devolvió el capital, al pagar la última cuota pendiente el préstamo se cierra solo
        await actualizarEstadoPorCuotas(updatedInstallment.prestamoId)

        res.json(updatedInstallment)
    } catch(error) {
        res.status(404).json({ message: "No se encontro la cuota" })
    }
}

// ELIMINAR CUOTA
export const deleteInstallment = async (req: Request, res: Response) => {
    try {
        const usuarioId = res.locals.usuarioId as string
        const {id} = req.params
        const idStrg = String(id)

        const existe = await prisma.cuota.findFirst({ where: { id: idStrg, prestamo: { usuarioId } } })
        if (!existe) {
            return res.status(404).json({ message: "No se encontro la cuota" })
        }

        await prisma.cuota.delete({
            where: { id: idStrg }
        })
        res.json({ message: "Cuota eliminada" })
    } catch(error) {
        res.status(404).json({ message: "No se encontro la cuota" })
    }
}

// VER CUOTAS PAGADAS DE UN PRESTAMO
export const getInstallmentsPaid = async (req: Request, res: Response) => {
    try {
        const usuarioId = res.locals.usuarioId as string
        const prestamoId = req.params.prestamoId as string

        const installments = await prisma.cuota.findMany({
            where: { prestamoId, pagado: true, prestamo: { usuarioId } }
        })
        res.json(installments)
    } catch(error) {
        res.status(500).json({ error: String(error) })
    }
}

// VER CUOTAS SIN PAGAR DE UN PRESTAMO
export const getInstallmentsNotPaid = async (req: Request, res: Response) => {
    try {
        const usuarioId = res.locals.usuarioId as string
        const prestamoId = req.params.prestamoId as string

        const installments = await prisma.cuota.findMany({
            where: { prestamoId, pagado: false, prestamo: { usuarioId } }
        })
        res.json(installments)
    } catch(error) {
        res.status(500).json({ error: String(error) })
    }
}

// VER CUOTAS QUE VENCEN EN EL ACTUAL MES
// El :usuarioId de la URL se ignora; se usa el del token
export const getInstallmentsDueThisMonth = async (req: Request, res: Response) => {
    try {
        const usuarioId = res.locals.usuarioId as string
        await syncInstallments(usuarioId)
        // Sin pagar, desde hoy hasta fin de mes (las de días anteriores ya salen en "vencidas")
        const ahora = new Date()
        const inicioDeHoy = new Date(Date.UTC(ahora.getFullYear(), ahora.getMonth(), ahora.getDate()))
        const inicioMesSiguiente = new Date(Date.UTC(ahora.getFullYear(), ahora.getMonth() + 1, 1))
        const cuotas = await prisma.cuota.findMany({
            where: {
                prestamo: {usuarioId},
                pagado: false,
                fechaVencimiento: {
                gte: inicioDeHoy,
                lt: inicioMesSiguiente
            }
            },
            orderBy: { fechaVencimiento: "asc" },
            include:{
                prestamo: {
                    include: {
                        deudor: true
                    }
                }
            }
        })
        res.json(cuotas)
    } catch(error) {
        res.status(500).json({ error: String(error) })
    }
}

// INTERESES DEL MES: de las cuotas que vencen este mes, cuánto se esperaba y cuánto ya se cobró
// (incluye préstamos que ya se cerraron)
export const getCollectedThisMonth = async (req: Request, res: Response) => {
    try {
        const usuarioId = res.locals.usuarioId as string // el :usuarioId de la URL se ignora
        const ahora = new Date()
        const inicioMes = new Date(Date.UTC(ahora.getFullYear(), ahora.getMonth(), 1))
        const inicioMesSiguiente = new Date(Date.UTC(ahora.getFullYear(), ahora.getMonth() + 1, 1))

        // Solo las cuotas que VENCEN este mes, sin importar cuándo se marcaron: así un préstamo viejo
        // registrado hoy no suma como cobrado en este mes lo que se cobró en meses anteriores
        await syncInstallments(usuarioId)
        const delMes = { prestamo: { usuarioId }, fechaVencimiento: { gte: inicioMes, lt: inicioMesSiguiente } }

        const [esperado, cobrado] = await Promise.all([
            prisma.cuota.aggregate({ where: delMes, _sum: { montoInteres: true }, _count: true }),
            prisma.cuota.aggregate({ where: { ...delMes, pagado: true }, _sum: { montoInteres: true }, _count: true }),
        ])
        res.json({
            total: cobrado._sum.montoInteres ?? 0, // cobrado de las cuotas del mes
            cuotas: cobrado._count,
            esperado: esperado._sum.montoInteres ?? 0, // lo que suman todas las cuotas del mes
            totalCuotas: esperado._count,
        })
    } catch (error) {
        res.status(500).json({ error: String(error) })
    }
}

// VER CUOTAS VENCIDAS
// El :usuarioId de la URL se ignora; se usa el del token
export const getInstallmentsVencidas = async (req: Request, res: Response) => {
    try {
        const usuarioId = res.locals.usuarioId as string
        await syncInstallments(usuarioId)
        // Vencida = antes de hoy. Se compara contra el inicio del día porque las fechas no tienen hora;
        // con la hora actual, una cuota de hoy saldría vencida desde la medianoche
        const ahora = new Date()
        const inicioDeHoy = new Date(Date.UTC(ahora.getFullYear(), ahora.getMonth(), ahora.getDate()))
        const cuotas = await prisma.cuota.findMany({
            where: {
                prestamo: {usuarioId},
                fechaVencimiento: {
                lt: inicioDeHoy,
            },
            pagado: false,
            },
            include: {
                prestamo: {
                    include: {
                        deudor: true
                    }
                }
            }
        })
        res.json(cuotas)
    } catch(error) {
        res.status(500).json({ error: String(error) })
    }
}
//fecha de hoy >>> fecha vencimiento cuota
