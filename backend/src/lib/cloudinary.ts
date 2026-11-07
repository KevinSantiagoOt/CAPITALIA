import { v2 as cloudinary } from "cloudinary"

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
})

// Las letras se suben como "authenticated": no se pueden abrir con un enlace normal,
// solo con enlaces firmados que genera el backend (ver urlFirmada)
//  - Fotos: resource_type "image" (permite miniaturas)
//  - PDF:   resource_type "raw" (Cloudinary bloquea los PDF como imagen en cuentas gratis)
export type TipoDocumento = "imagen" | "pdf"
const resourceType = (tipo: TipoDocumento) => (tipo === "pdf" ? "raw" : "image")

// SUBE UN ARCHIVO EN MEMORIA A CLOUDINARY CON EL public_id INDICADO
export const subirArchivo = (buffer: Buffer, publicId: string, tipo: TipoDocumento) =>
    new Promise<void>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            {
                public_id: tipo === "pdf" ? `${publicId}.pdf` : publicId,
                resource_type: resourceType(tipo),
                type: "authenticated",
                overwrite: true,
            },
            (error) => (error ? reject(error) : resolve())
        )
        stream.end(buffer)
    })

// ENLACE FIRMADO PARA VER EL ARCHIVO (o una miniatura, si es foto)
//  - Fotos: enlace firmado normal
//  - PDF: Cloudinary bloquea la entrega de PDF por enlace en cuentas gratis ("deny or ACL failure"),
//    así que se usa un enlace de descarga por API, que además caduca en 1 hora
export const urlFirmada = (publicId: string, tipo: TipoDocumento, miniatura = false) => {
    if (tipo === "pdf") {
        if (miniatura) return null // la app muestra un ícono de PDF
        return cloudinary.utils.private_download_url(`${publicId}.pdf`, "", {
            resource_type: "raw",
            type: "authenticated",
            expires_at: Math.floor(Date.now() / 1000) + 60 * 60,
        })
    }
    return cloudinary.url(publicId, {
        resource_type: "image",
        type: "authenticated",
        sign_url: true,
        ...(miniatura ? { transformation: [{ width: 300, height: 300, crop: "fill" }] } : {}),
    })
}

// BORRA UN ARCHIVO DE CLOUDINARY (no falla si ya no existe)
export const borrarArchivo = async (publicId: string, tipo: TipoDocumento) => {
    await cloudinary.uploader.destroy(tipo === "pdf" ? `${publicId}.pdf` : publicId, {
        resource_type: resourceType(tipo),
        type: "authenticated",
        invalidate: true,
    })
}
