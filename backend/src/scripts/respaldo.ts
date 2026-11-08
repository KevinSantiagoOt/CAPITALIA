// RESPALDO DIARIO DE LA BASE DE DATOS
// Lo corre Railway cada noche (servicio de Cron). A mano:  npm run respaldo
// Sube "respaldo-AAAA-MM-DD" a Cloudinary y borra los viejos que ya no se necesitan
import 'dotenv/config'
import prisma from '../lib/prisma'
import {
    exportarDatos,
    subirRespaldo,
    listarRespaldos,
    seleccionarParaBorrar,
    borrarRespaldos,
    hoyColombia,
} from '../services/respaldoService'

const main = async () => {
    const hoy = hoyColombia()
    const datos = await exportarDatos()
    await subirRespaldo(`respaldo-${hoy}`, datos)
    console.log(
        `Respaldo respaldo-${hoy} subido: ${datos.usuarios.length} usuarios, ${datos.deudores.length} deudores, ` +
            `${datos.prestamos.length} préstamos, ${datos.cuotas.length} cuotas, ${datos.documentos.length} documentos`
    )

    const sobran = seleccionarParaBorrar(await listarRespaldos(), hoy)
    if (sobran.length > 0) {
        await borrarRespaldos(sobran)
        console.log(`Respaldos viejos borrados: ${sobran.join(', ')}`)
    }
}

main()
    .catch((error) => {
        console.error('Error en el respaldo:', error)
        process.exitCode = 1 // Railway lo marca como fallido
    })
    .finally(() => prisma.$disconnect())
