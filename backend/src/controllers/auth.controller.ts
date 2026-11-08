import { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import prisma from '../lib/prisma'

// LOGIN
export const login = async (req: Request, res: Response) => {
  try {
    const { password } = req.body
    // Los correos se guardan en minúsculas (ver profileController)
    const email = String(req.body.email ?? "").trim().toLowerCase()

    const usuario = await prisma.usuario.findUnique({ where: { email } })
    if (!usuario) {
      return res.status(401).json({ message: 'Credenciales inválidas' })
    }

    const passwordValido = await bcrypt.compare(password, usuario.password)
    if (!passwordValido) {
      return res.status(401).json({ message: 'Credenciales inválidas' })
    }

    const token = jwt.sign(
      { id: usuario.id, email: usuario.email },
      process.env.JWT_SECRET as string,
      { expiresIn: '7d' }
    )

    res.json({ token, nombre: usuario.nombre, id: usuario.id })
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor' })
  }
}