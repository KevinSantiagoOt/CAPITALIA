import { Request, Response } from "express"
import prisma from "../lib/prisma"
import { syncInstallments } from "../services/installmentService"

// CREAR LA CUOTA 
export const createInstallment = async (req: Request, res: Response) => {
    try{
        const {montoInteres, fechaVencimiento, prestamoId} = req.body

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
        const prestamoId = req.params.prestamoId as string

        const installments = await prisma.cuota.findMany({
            where: { prestamoId }
        })
        res.json(installments)
    } catch(error) {
        res.status(500).json({ error: String(error) })
    }
}

// ACTUALIZAR CUOTA
export const updateInstallment = async (req: Request, res: Response) => {
    try{
        const {id} = req.params
        const idStrg = String(id)
        const {pagado, fechaPago} = req.body

        // Si se marca como pagada sin fecha, se toma la de hoy; si se desmarca, se borra
        let fechaPagoFinal = fechaPago
        if (fechaPago === undefined && pagado === true) fechaPagoFinal = new Date()
        if (fechaPago === undefined && pagado === false) fechaPagoFinal = null

        const updatedInstallment = await prisma.cuota.update({
            where: { id: idStrg },
            data: { pagado, fechaPago: fechaPagoFinal }
        })
        res.json(updatedInstallment)
    } catch(error) {
        res.status(404).json({ message: "No se encontro la cuota" })
    }   
}

// ELIMINAR CUOTA
export const deleteInstallment = async (req: Request, res: Response) => {
    try {
        const {id} = req.params
        const idStrg = String(id)
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
        const prestamoId = req.params.prestamoId as string

        const installments = await prisma.cuota.findMany({
            where: { prestamoId, pagado: true }
        })
        res.json(installments)
    } catch(error) {
        res.status(500).json({ error: String(error) })
    }
}

// VER CUOTAS SIN PAGAR DE UN PRESTAMO
export const getInstallmentsNotPaid = async (req: Request, res: Response) => {
    try {
        const prestamoId = req.params.prestamoId as string

        const installments = await prisma.cuota.findMany({
            where: { prestamoId, pagado: false }
        })
        res.json(installments)
    } catch(error) {
        res.status(500).json({ error: String(error) })
    }
}

// VER CUOTAS QUE VENCEN EN EL ACTUAL MES
export const getInstallmentsDueThisMonth = async (req: Request, res: Response) => {
    try {
        const usuarioId = req.params.usuarioId as string
        await syncInstallments(usuarioId)
        const ahora = new Date()
        const cuotas = await prisma.cuota.findMany({
            where: {
                prestamo: {usuarioId},
                fechaVencimiento: {
                gte: new Date(ahora.getFullYear(), ahora.getMonth(), 1),
                lt: new Date(ahora.getFullYear(), ahora.getMonth() + 1, 1)
            }
            },
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

// VER CUOTAS VENCIDAS
export const getInstallmentsVencidas = async (req: Request, res: Response) => {
    try {
        const usuarioId = req.params.usuarioId as string
        await syncInstallments(usuarioId)
        const ahora = new Date()
        const cuotas = await prisma.cuota.findMany({
            where: {
                prestamo: {usuarioId},
                fechaVencimiento: {
                lt: ahora,
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