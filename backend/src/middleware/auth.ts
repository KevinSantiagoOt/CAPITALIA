import { Request, Response, NextFunction } from "express"
import jwt from "jsonwebtoken"

// VERIFICA EL TOKEN Y GUARDA EL ID DEL USUARIO EN res.locals.usuarioId
// Los controladores deben usar ese id y no el que venga en la URL o el body,
// así un prestamista nunca puede ver ni modificar lo de otro
export const verificarToken = (req: Request, res: Response, next: NextFunction) => {
    const header = req.headers.authorization
    if (!header?.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Token requerido" })
    }

    try {
        const payload = jwt.verify(header.slice(7), process.env.JWT_SECRET as string) as { id: string }
        res.locals.usuarioId = payload.id
        next()
    } catch (error) {
        return res.status(401).json({ message: "Token inválido o vencido" })
    }
}
