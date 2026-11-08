// RESTAURAR LA BASE DE DATOS DESDE UN RESPALDO
// Uso:  npm run restaurar                    -> muestra los respaldos disponibles
//       npm run restaurar respaldo-2026-11-09 -> reemplaza TODO por ese respaldo
// Antes de restaurar guarda un respaldo del estado actual ("antes-de-restaurar-..."), por si acaso.
// Pide escribir RESTAURAR para confirmar.
import 'dotenv/config'
import readline from 'readline'
import prisma from '../lib/prisma'
import {
    listarRespaldos,
    descargarRespaldo,
    exportarDatos,
    subirRespaldo,
    restaurarDatos,
} from '../services/respaldoService'

const preguntar = (texto: string) =>
    new Promise<string>((resolve) => {
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
        rl.question(texto, (respuesta) => {
            rl.close()
            resolve(respuesta)
        })
    })

const main = async () => {
    const nombre = process.argv[2]
    const disponibles = await listarRespaldos()

    if (!nombre) {
        console.log('Respaldos disponibles:')
        for (const n of disponibles) console.log(`  ${n}`)
        console.log('\nPara restaurar uno:  npm run restaurar <nombre>')
        return
    }
    if (!disponibles.includes(nombre)) throw new Error(`No existe el respaldo ${nombre}`)

    const datos = await descargarRespaldo(nombre)
    console.log(
        `${nombre} (creado ${datos.creado}): ${datos.usuarios.length} usuarios, ${datos.deudores.length} deudores, ` +
            `${datos.prestamos.length} préstamos, ${datos.cuotas.length} cuotas, ${datos.documentos.length} documentos`
    )
    console.log('ATENCION: se borrará todo lo que hay ahora en la base de datos y se reemplazará por este respaldo.')
    if ((await preguntar('Escribe RESTAURAR para continuar: ')).trim() !== 'RESTAURAR') {
        console.log('Cancelado, no se cambió nada.')
        return
    }

    const marca = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
    await subirRespaldo(`antes-de-restaurar-${marca}`, await exportarDatos())
    console.log(`Estado actual guardado como antes-de-restaurar-${marca}`)

    await restaurarDatos(datos)
    console.log('Listo: base de datos restaurada.')
}

main()
    .catch((error) => {
        console.error('Error:', error instanceof Error ? error.message : error)
        process.exitCode = 1
    })
    .finally(() => prisma.$disconnect())
