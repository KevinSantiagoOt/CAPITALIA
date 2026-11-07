import { Request, Response } from "express"
import bcrypt from "bcryptjs"
import { Prisma } from "@prisma/client"
import prisma from "../lib/prisma"

// VER MI PERFIL (nunca devuelve la contraseña)
export const getProfile = async (req: Request, res: Response) => {
    try {
        const usuarioId = res.locals.usuarioId as string
        const usuario = await prisma.usuario.findUnique({
            where: { id: usuarioId },
            select: { id: true, nombre: true, email: true }
        })
        if (!usuario) {
            return res.status(404).json({ message: "Usuario no encontrado" })
        }
        res.json(usuario)
    } catch (error) {
        res.status(500).json({ error: "Error en el servidor" })
    }
}

// EDITAR NOMBRE Y CORREO
export const updateProfile = async (req: Request, res: Response) => {
    try {
        const usuarioId = res.locals.usuarioId as string
        const nombre = String(req.body.nombre ?? "").trim()
        const email = String(req.body.email ?? "").trim().toLowerCase()

        if (!nombre || !email) {
            return res.status(400).json({ message: "El nombre y el correo son obligatorios" })
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ message: "El correo no es válido" })
        }

        const usuario = await prisma.usuario.update({
            where: { id: usuarioId },
            data: { nombre, email },
            select: { id: true, nombre: true, email: true }
        })
        res.json(usuario)
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
            return res.status(409).json({ message: "Ese correo ya lo usa otra cuenta" })
        }
        res.status(500).json({ error: "Error en el servidor" })
    }
}

// CAMBIAR CONTRASEÑA: exige la actual, para que nadie la cambie con el celular desbloqueado
export const changePassword = async (req: Request, res: Response) => {
    try {
        const usuarioId = res.locals.usuarioId as string
        const { actual, nueva } = req.body

        if (typeof nueva !== "string" || nueva.length < 6) {
            return res.status(400).json({ message: "La nueva contraseña debe tener al menos 6 caracteres" })
        }

        const usuario = await prisma.usuario.findUnique({ where: { id: usuarioId } })
        if (!usuario) {
            return res.status(404).json({ message: "Usuario no encontrado" })
        }

        // 400 y no 401: un 401 haría que la app cierre la sesión
        const actualValida = await bcrypt.compare(String(actual ?? ""), usuario.password)
        if (!actualValida) {
            return res.status(400).json({ message: "La contraseña actual no es correcta" })
        }

        const hashed = await bcrypt.hash(nueva, 10)
        await prisma.usuario.update({ where: { id: usuarioId }, data: { password: hashed } })
        res.json({ message: "Contraseña actualizada" })
    } catch (error) {
        res.status(500).json({ error: "Error en el servidor" })
    }
}
