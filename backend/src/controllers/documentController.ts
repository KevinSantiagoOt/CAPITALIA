import { Request, Response } from "express"
import multer from "multer"
import prisma from "../lib/prisma"
import { subirArchivo, borrarArchivo, urlFirmada, TipoDocumento } from "../lib/cloudinary"

// En la columna url_archivo se guarda el public_id de Cloudinary, no un enlace:
// los enlaces se firman cada vez que se piden (ver conEnlaces), porque las letras son privadas
const publicIdDe = (prestamoId: string, documentoId: string) => `capitalia/prestamos/${prestamoId}/${documentoId}`

// RECIBE EL ARCHIVO EN MEMORIA: maximo 10 MB, solo fotos o PDF
export const recibirArchivo = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        cb(null, file.mimetype.startsWith("image/") || file.mimetype === "application/pdf")
    },
}).single("archivo")

// AGREGA A CADA DOCUMENTO SU ENLACE FIRMADO Y SU MINIATURA
export const conEnlaces = <T extends { urlArchivo: string; tipo: string | null }>(documentos: T[]) =>
    documentos.map((d) => {
        const tipo = (d.tipo ?? "imagen") as TipoDocumento
        return { ...d, url: urlFirmada(d.urlArchivo, tipo), miniatura: urlFirmada(d.urlArchivo, tipo, true) }
    })

// BORRA DE CLOUDINARY LOS ARCHIVOS DE UNOS PRESTAMOS (antes de borrarlos de la BD en cascada)
export const borrarArchivosDePrestamos = async (prestamoIds: string[]) => {
    const documentos = await prisma.documento.findMany({ where: { prestamoId: { in: prestamoIds } } })
    await Promise.all(documentos.map((d) => borrarArchivo(d.urlArchivo, (d.tipo ?? "imagen") as TipoDocumento)))
}

// SUBIR DOCUMENTO (LETRA) A UN PRESTAMO
// multipart/form-data con el campo "archivo"
export const uploadDocument = async (req: Request, res: Response) => {
    try {
        const usuarioId = res.locals.usuarioId as string
        const prestamoId = String(req.params.id)

        if (!req.file) {
            return res.status(400).json({ message: "Falta el archivo, o no es una foto ni un PDF (máximo 10 MB)" })
        }

        const prestamo = await prisma.prestamo.findFirst({ where: { id: prestamoId, usuarioId } })
        if (!prestamo) {
            return res.status(404).json({ message: "Préstamo no encontrado" })
        }

        const tipo: TipoDocumento = req.file.mimetype === "application/pdf" ? "pdf" : "imagen"

        // Primero se crea el registro para usar su id como nombre del archivo en Cloudinary
        const documento = await prisma.documento.create({
            data: { prestamoId, tipo, urlArchivo: "" }
        })
        const publicId = publicIdDe(prestamoId, documento.id)

        try {
            await subirArchivo(req.file.buffer, publicId, tipo)
        } catch (error) {
            // Si Cloudinary falla, no queda un registro sin archivo
            await prisma.documento.delete({ where: { id: documento.id } })
            throw error
        }

        const guardado = await prisma.documento.update({
            where: { id: documento.id },
            data: { urlArchivo: publicId }
        })
        res.status(201).json(conEnlaces([guardado])[0])
    } catch (error) {
        console.error(error)
        res.status(500).json({ error: "No se pudo subir el archivo" })
    }
}

// ELIMINAR DOCUMENTO
export const deleteDocument = async (req: Request, res: Response) => {
    try {
        const usuarioId = res.locals.usuarioId as string
        const id = String(req.params.id)

        const documento = await prisma.documento.findFirst({ where: { id, prestamo: { usuarioId } } })
        if (!documento) {
            return res.status(404).json({ message: "Documento no encontrado" })
        }

        await borrarArchivo(documento.urlArchivo, (documento.tipo ?? "imagen") as TipoDocumento)
        await prisma.documento.delete({ where: { id } })
        res.json({ message: "Documento eliminado" })
    } catch (error) {
        console.error(error)
        res.status(500).json({ error: "No se pudo eliminar el documento" })
    }
}
