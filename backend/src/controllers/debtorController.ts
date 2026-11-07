import {Request, Response} from "express"
import { Prisma } from "@prisma/client"
import prisma from "../lib/prisma"

// CREAR DEUDOR
export const createDebtor = async (req: Request, res: Response) => {
    try{
        const usuarioId = res.locals.usuarioId as string
        const {nombre, cedula, telefono, direccion} = req.body

        if (!nombre || !cedula) {
            return res.status(400).json({ message: "El nombre y la cédula son obligatorios" })
        }

        const newDebtor = await prisma.deudor.create({
        data: { nombre, cedula, telefono, direccion, usuarioId}
    })
    res.status(201).json({message: "Deudor creado", id: newDebtor.id, cedula: newDebtor.cedula})
    }catch(error){
        // P2002: se violó un campo único, en este caso la cédula
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
            return res.status(409).json({ message: "Ya existe un deudor con esa cédula" })
        }
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

        if (nombre === "" || cedula === "") {
            return res.status(400).json({ message: "El nombre y la cédula son obligatorios" })
        }

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
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
            return res.status(409).json({ message: "Ya existe un deudor con esa cédula" })
        }
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

        // La BD borra en cascada: con préstamos activos se perdería plata que aún le deben.
        // Los préstamos ya cerrados sí se borran junto con el deudor (la app lo avisa antes)
        const activos = await prisma.prestamo.count({ where: { deudorId: idNum, estado: "activo" } })
        if (activos > 0) {
            return res.status(409).json({ message: "El deudor tiene préstamos activos. Elimínalos primero." })
        }

        const deletedDebtor = await prisma.deudor.delete({
            where: { id: idNum }
        })

        res.json(deletedDebtor)
    } catch(error) {
        res.status(500).json({ error: "Error en el servidor" })
    }
}

// ARCHIVAR O DESARCHIVAR DEUDOR
// Body: { archivado: true | false }. Archivar oculta al deudor de la lista sin borrar su historial
export const archiveDebtor = async (req: Request, res: Response) => {
    try {
        const usuarioId = res.locals.usuarioId as string
        const id = String(req.params.id)
        const { archivado } = req.body

        if (typeof archivado !== "boolean") {
            return res.status(400).json({ message: "Falta indicar si se archiva o no" })
        }

        const existe = await prisma.deudor.findFirst({ where: { id, usuarioId } })
        if (!existe) {
            return res.status(404).json({ message: "Deudor no encontrado" })
        }

        // Un deudor que aún debe plata no se esconde
        const activos = await prisma.prestamo.count({ where: { deudorId: id, estado: "activo" } })
        if (archivado && activos > 0) {
            return res.status(409).json({ message: "El deudor tiene préstamos activos, no se puede archivar." })
        }

        const deudor = await prisma.deudor.update({ where: { id }, data: { archivado } })
        res.json(deudor)
    } catch (error) {
        res.status(500).json({ error: "Error en el servidor" })
    }
}

// OBTENER TODOS LOS DEUDORES
// El :usuarioId de la URL se ignora; se usa el del token
// Por defecto trae los no archivados; con ?archivados=true trae solo los archivados
export const getAllDebtors = async (req: Request, res: Response) => {
  try {
    const usuarioId = res.locals.usuarioId as string
    const archivado = req.query.archivados === "true"

    const deudores = await prisma.deudor.findMany({
      where: { usuarioId, archivado },
      include: {
        prestamos: true
      }
    })

    res.json(deudores)
  } catch(error) {
    res.status(404).json({ message: "No se encontraron Deudores" })
  }
}
