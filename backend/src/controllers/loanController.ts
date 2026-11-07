import { Request, Response } from "express"
import prisma from "../lib/prisma"
import { syncInstallments } from "../services/installmentService"

// CREAR PRESTAMO
export const createLoan = async (req: Request, res: Response) => {
    try{
        const {montoCapital, tasaInteres, fechaInicio, fechaFinPlazo, estado, deudorId, usuarioId} = req.body

        const newLoan = await prisma.prestamo.create({
        data: {montoCapital, tasaInteres, fechaInicio, fechaFinPlazo,estado, deudorId, usuarioId}
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
    const id = req.params.id as string

    const dueno = await prisma.prestamo.findUnique({ where: { id }, select: { usuarioId: true } })
    if (dueno) await syncInstallments(dueno.usuarioId)

    const prestamo = await prisma.prestamo.findUnique({
      where: { id },
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
        const {id} = req.params
        const idStrg = String(id)
        const {montoCapital, tasaInteres, fechaInicio, fechaFinPlazo, estado} = req.body
        const updatedLoan = await prisma.prestamo.update({
            where: { id: idStrg },
            data: { montoCapital, tasaInteres, fechaInicio, fechaFinPlazo, estado }
        })
        res.json(updatedLoan)
    } catch(error) {
        res.status(404).json({ message: "No se encontro el préstamo" })
    }
}

// ELIMINAR PRESTAMOS
export const deleteLoan = async (req: Request, res: Response) => {
    try{
        const {id} = req.params
        const idStrg = String(id)
        await prisma.prestamo.delete({
            where: { id: idStrg }
        })
        res.json({ message: "Préstamo eliminado" })
    } catch(error) {
        res.status(404).json({ message: "No se encontro el préstamo" })
    }
}

// VER TODOS LOS PRESTAMOS
export const getAllLoans = async (req: Request, res: Response) => {
  try {
    const { usuarioId } = req.params
    const usuarioIdStrg = String(usuarioId)
    await syncInstallments(usuarioIdStrg)

    const deudores = await prisma.prestamo.findMany({
      where: { usuarioId: usuarioIdStrg },
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
export const getActiveLoans = async (req: Request, res: Response) => {
    try {
    const { usuarioId } = req.params
    const usuarioIdStrg = String(usuarioId)
    await syncInstallments(usuarioIdStrg)

    const prestamos = await prisma.prestamo.findMany({
      where: {
        usuarioId: usuarioIdStrg,
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
