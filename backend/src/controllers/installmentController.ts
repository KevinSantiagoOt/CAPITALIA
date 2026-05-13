import { Request, Response } from "express"
import prisma from "../lib/prisma"

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
        
        const updatedInstallment = await prisma.cuota.update({
            where: { id: idStrg },
            data: { pagado, fechaPago }
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