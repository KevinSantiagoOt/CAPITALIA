import { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import prisma from '../lib/prisma'

// REGISTRO
export const register = async (req: Request, res: Response) => {
  try {
    const { nombre, email, password } = req.body

    const usuarioExiste = await prisma.usuario.findUnique({ where: { email } })
    if (usuarioExiste) {
      return res.status(400).json({ message: 'El email ya está registrado' })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const usuario = await prisma.usuario.create({
      data: { nombre, email, password: hashedPassword }
    })

    res.status(201).json({ message: 'Usuario creado', id: usuario.id })
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor' })
  }
}

// LOGIN
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body

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