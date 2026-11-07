import {Request, Response} from "express"
import prisma from "../lib/prisma"

// CREAR DEUDOR
export const createDebtor = async (req: Request, res: Response) => {
    try{
        const usuarioId = res.locals.usuarioId as string
        const {nombre, cedula, telefono, direccion} = req.body

        const newDebtor = await prisma.deudor.create({
        data: { nombre, cedula, telefono, direccion, usuarioId}
    })
    res.status(201).json({message: "Deudor creado", id: newDebtor.id})
    }catch(error){
        res.status(500).json({error: "Error en el servidor"})
    }
}

// OBTENER DEUDOR POR CÉDULA
export const getDebtorByCedula = async (req: Request, res: Response) => {
  try {
    const usuarioId = res.locals.usuarioId as string
    const { cedula } = req.params
    const cedulaStrg = String(cedula)
    const deudor = await prisma.deudor.findFirst({
      where: { cedula: cedulaStrg, usuarioId },
      include: {
        prestamos: true  // trae también sus préstamos
      }
    })

    if (!deudor) {
      return res.status(404).json({ message: "Deudor no encontrado" })
    }

    res.json(deudor)
  } catch(error) {
    res.status(500).json({ error: "Error en el servidor" })
  }
}


// ACTUALIZAR DEUDOR
export const updateDebtor = async (req: Request, res: Response) => {
    try{
        const usuarioId = res.locals.usuarioId as string
        const {id} = req.params
        const idNum = String(id)
        const {nombre, cedula, telefono, direccion} = req.body

        const existe = await prisma.deudor.findFirst({ where: { id: idNum, usuarioId } })
        if (!existe) {
            return res.status(404).json({ message: "Deudor no encontrado" })
        }

        const updatedDebtor = await prisma.deudor.update({
            where: { id: idNum },
            data: { nombre, cedula, telefono, direccion }
        })

        res.json(updatedDebtor)
    } catch(error) {
        res.status(500).json({ error: "Error en el servidor" })
    }
}

// ELIMINAR DEUDOR
export const deleteDebtor = async (req: Request, res: Response) => {
    try{
        const usuarioId = res.locals.usuarioId as string
        const {id} = req.params
        const idNum = String(id)

        const existe = await prisma.deudor.findFirst({ where: { id: idNum, usuarioId } })
        if (!existe) {
            return res.status(404).json({ message: "Deudor no encontrado" })
        }

        const deletedDebtor = await prisma.deudor.delete({
            where: { id: idNum }
        })

        res.json(deletedDebtor)
    } catch(error) {
        res.status(500).json({ error: "Error en el servidor" })
    }
}

// OBTENER TODOS LOS DEUDORES
// El :usuarioId de la URL se ignora; se usa el del token
export const getAllDebtors = async (req: Request, res: Response) => {
  try {
    const usuarioId = res.locals.usuarioId as string

    const deudores = await prisma.deudor.findMany({
      where: { usuarioId },
      include: {
        prestamos: true
      }
    })

    res.json(deudores)
  } catch(error) {
    res.status(404).json({ message: "No se encontraron Deudores" })
  }
}
