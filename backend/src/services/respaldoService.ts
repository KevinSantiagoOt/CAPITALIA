// RESPALDOS DE LA BASE DE DATOS EN CLOUDINARY
// Cada respaldo es un archivo JSON con TODAS las tablas (una foto completa de ese momento).
// Se guarda como archivo privado ("authenticated", tipo "raw") en la carpeta RESPALDO_CARPETA.
// Se conservan los diarios de los últimos 30 días y, de cada mes anterior, el más antiguo del mes.
import { v2 as cloudinary } from 'cloudinary'
import prisma from '../lib/prisma'
import '../lib/cloudinary' // configura las claves de Cloudinary

// Para pruebas en el PC se puede usar otra carpeta y no mezclar con los respaldos reales
const CARPETA = process.env.RESPALDO_CARPETA || 'capitalia/respaldos'
const DIAS_DIARIOS = 30
const OPCIONES = { resource_type: 'raw' as const, type: 'authenticated' as const }

// Fecha de hoy en Colombia como "AAAA-MM-DD" (el servidor está en hora universal)
export const hoyColombia = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' })

// LEE TODAS LAS TABLAS. Las contraseñas van cifradas (bcrypt), igual que en la base de datos
export const exportarDatos = async () => ({
    version: 1,
    creado: new Date().toISOString(),
    usuarios: await prisma.usuario.findMany(),
    deudores: await prisma.deudor.findMany(),
    prestamos: await prisma.prestamo.findMany(),
    cuotas: await prisma.cuota.findMany(),
    documentos: await prisma.documento.findMany(),
})

export type Respaldo = Awaited<ReturnType<typeof exportarDatos>>

// SUBE EL RESPALDO CON EL NOMBRE INDICADO (si ya existe uno con ese nombre, lo reemplaza)
export const subirRespaldo = (nombre: string, datos: Respaldo) =>
    new Promise<void>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            { ...OPCIONES, public_id: `${CARPETA}/${nombre}.json`, overwrite: true },
            (error) => (error ? reject(error) : resolve())
        )
        stream.end(Buffer.from(JSON.stringify(datos)))
    })

// NOMBRES DE LOS RESPALDOS GUARDADOS, ej. ["respaldo-2026-11-09", ...]
export const listarRespaldos = async () => {
    const nombres: string[] = []
    let cursor: string | undefined
    do {
        const pagina = await cloudinary.api.resources({ ...OPCIONES, prefix: `${CARPETA}/`, max_results: 500, next_cursor: cursor })
        for (const r of pagina.resources) nombres.push(r.public_id.slice(CARPETA.length + 1).replace(/\.json$/, ''))
        cursor = pagina.next_cursor
    } while (cursor)
    return nombres.sort()
}

// CUALES BORRAR: los de hace más de 30 días, salvo el más antiguo de cada mes (queda para siempre).
// Solo considera los diarios ("respaldo-AAAA-MM-DD"); los demás (ej. "antes-de-restaurar-...") no se tocan
export const seleccionarParaBorrar = (nombres: string[], hoy: string) => {
    const [a, m, d] = hoy.split('-').map(Number)
    const limite = new Date(Date.UTC(a, m - 1, d - DIAS_DIARIOS)).toISOString().slice(0, 10)

    const diarios = nombres
        .map((nombre) => ({ nombre, fecha: /^respaldo-(\d{4}-\d{2}-\d{2})$/.exec(nombre)?.[1] }))
        .filter((r): r is { nombre: string; fecha: string } => !!r.fecha)
        .sort((x, y) => x.fecha.localeCompare(y.fecha))

    const primeroDelMes = new Set<string>()
    const vistos = new Set<string>()
    for (const r of diarios) {
        const mes = r.fecha.slice(0, 7)
        if (!vistos.has(mes)) {
            vistos.add(mes)
            primeroDelMes.add(r.nombre)
        }
    }

    return diarios.filter((r) => r.fecha < limite && !primeroDelMes.has(r.nombre)).map((r) => r.nombre)
}

export const borrarRespaldos = async (nombres: string[]) => {
    // La API borra de a 100 como máximo
    for (let i = 0; i < nombres.length; i += 100) {
        const lote = nombres.slice(i, i + 100).map((n) => `${CARPETA}/${n}.json`)
        await cloudinary.api.delete_resources(lote, OPCIONES)
    }
}

// DESCARGA UN RESPALDO POR SU NOMBRE (enlace firmado que caduca en 10 minutos)
export const descargarRespaldo = async (nombre: string): Promise<Respaldo> => {
    const url = cloudinary.utils.private_download_url(`${CARPETA}/${nombre}.json`, '', {
        ...OPCIONES,
        expires_at: Math.floor(Date.now() / 1000) + 10 * 60,
    })
    const respuesta = await fetch(url)
    if (!respuesta.ok) throw new Error(`No se pudo descargar ${nombre} (${respuesta.status})`)
    return (await respuesta.json()) as Respaldo
}

// REEMPLAZA TODA LA BASE DE DATOS POR EL CONTENIDO DEL RESPALDO
// Todo en una transacción: si algo falla a mitad de camino, no se cambia nada
export const restaurarDatos = async (datos: Respaldo) => {
    await prisma.$transaction(
        async (tx) => {
            // Se borra de las tablas hijas a las padres, y se crea al revés
            await tx.documento.deleteMany()
            await tx.cuota.deleteMany()
            await tx.prestamo.deleteMany()
            await tx.deudor.deleteMany()
            await tx.usuario.deleteMany()

            await tx.usuario.createMany({ data: datos.usuarios })
            await tx.deudor.createMany({ data: datos.deudores })
            await tx.prestamo.createMany({ data: datos.prestamos })
            await tx.cuota.createMany({ data: datos.cuotas })
            await tx.documento.createMany({ data: datos.documentos })
        },
        { timeout: 120_000 }
    )
}
