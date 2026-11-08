import { Prisma } from "@prisma/client"
import prisma from "../lib/prisma"

// SUMA MESES A UNA FECHA, RESPETANDO MESES MAS CORTOS (31 ENE + 1 MES = 28 FEB)
// Se usa UTC porque las fechas de la BD son @db.Date (sin hora)
export const sumarMeses = (fecha: Date, meses: number) => {
    const anio = fecha.getUTCFullYear()
    const mes = fecha.getUTCMonth() + meses
    const ultimoDiaDelMes = new Date(Date.UTC(anio, mes + 1, 0)).getUTCDate()
    return new Date(Date.UTC(anio, mes, Math.min(fecha.getUTCDate(), ultimoDiaDelMes)))
}

// CREA LAS CUOTAS QUE FALTEN DE UN PRESTAMO, UNA POR MES
// - Con fecha fin: todas, hasta la fecha fin
// - Sin fecha fin: las que ya pasaron más una próxima sin pagar (si se paga por adelantado, sale la siguiente)
// Se pague o no la cuota anterior, cada mes que pasa debe tener su cuota
const sincronizarPrestamo = async (prestamo: {
    id: string
    montoCapital: Prisma.Decimal
    tasaInteres: Prisma.Decimal
    fechaInicio: Date
    fechaFinPlazo: Date | null
}) => {
    const ultimaCuota = await prisma.cuota.findFirst({
        where: { prestamoId: prestamo.id },
        orderBy: { fechaVencimiento: "desc" }
    })

    // Sin cuotas: la primera vence un mes después del inicio
    const base = ultimaCuota ? ultimaCuota.fechaVencimiento : prestamo.fechaInicio

    const hoy = new Date()
    const hoyUTC = new Date(Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()))

    // Las cuotas cobran solo el interés mensual: capital x tasa
    const montoInteres = prestamo.montoCapital.mul(prestamo.tasaInteres).div(100).toDecimalPlaces(2)

    const nuevas = []
    for (let i = 1; ; i++) {
        const fecha = sumarMeses(base, i)

        if (prestamo.fechaFinPlazo) {
            if (fecha > prestamo.fechaFinPlazo) break
        } else if (i === 1) {
            // Sin fecha fin: se crean las vencidas y siempre queda una próxima SIN PAGAR.
            // Si la última ya está pagada (pago anticipado), se crea la siguiente aunque no haya vencido.
            // (Un préstamo sin cuotas no tiene "última": su primera cuota siempre se crea)
            if (ultimaCuota && ultimaCuota.fechaVencimiento >= hoyUTC && !ultimaCuota.pagado) break
        } else {
            // Las que se van creando aquí están sin pagar: basta con que la anterior aún no venza
            if (sumarMeses(base, i - 1) >= hoyUTC) break
        }

        nuevas.push({ montoInteres, fechaVencimiento: fecha, prestamoId: prestamo.id })
    }

    if (nuevas.length > 0) {
        await prisma.cuota.createMany({ data: nuevas })
    }
}

const sincronizar = async (usuarioId: string) => {
    // Si ya devolvió el capital no se generan más cuotas, aunque siga activo por cuotas pendientes
    const prestamos = await prisma.prestamo.findMany({
        where: { usuarioId, estado: "activo", capitalDevuelto: null }
    })
    for (const prestamo of prestamos) {
        await sincronizarPrestamo(prestamo)
    }
}

// Si llegan dos peticiones a la vez (el dashboard pide vencidas y del mes en paralelo),
// la segunda espera a la primera en vez de crear las mismas cuotas dos veces
const enCurso = new Map<string, Promise<void>>()

// ACTUALIZA EL ESTADO DE UN PRESTAMO CON EL CAPITAL YA DEVUELTO
// Queda "pagado" cuando no le quedan cuotas sin pagar; vuelve a "activo" si se desmarca una
export const actualizarEstadoPorCuotas = async (prestamoId: string) => {
    const prestamo = await prisma.prestamo.findUnique({ where: { id: prestamoId } })
    if (!prestamo || !prestamo.capitalDevuelto) return

    const sinPagar = await prisma.cuota.count({ where: { prestamoId, pagado: false } })
    const estado = sinPagar === 0 ? "pagado" : "activo"
    if (prestamo.estado !== estado) {
        await prisma.prestamo.update({ where: { id: prestamoId }, data: { estado } })
    }
}

// GENERA LAS CUOTAS PENDIENTES DE TODOS LOS PRESTAMOS ACTIVOS DE UN USUARIO
export const syncInstallments = (usuarioId: string) => {
    const actual = enCurso.get(usuarioId)
    if (actual) return actual

    const promesa = sincronizar(usuarioId).finally(() => enCurso.delete(usuarioId))
    enCurso.set(usuarioId, promesa)
    return promesa
}
