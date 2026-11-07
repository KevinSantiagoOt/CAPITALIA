import { Prisma } from "@prisma/client"
import prisma from "../lib/prisma"

// SUMA MESES A UNA FECHA, RESPETANDO MESES MAS CORTOS (31 ENE + 1 MES = 28 FEB)
// Se usa UTC porque las fechas de la BD son @db.Date (sin hora)
const sumarMeses = (fecha: Date, meses: number) => {
    const anio = fecha.getUTCFullYear()
    const mes = fecha.getUTCMonth() + meses
    const ultimoDiaDelMes = new Date(Date.UTC(anio, mes + 1, 0)).getUTCDate()
    return new Date(Date.UTC(anio, mes, Math.min(fecha.getUTCDate(), ultimoDiaDelMes)))
}

// CREA LAS CUOTAS QUE FALTEN DE UN PRESTAMO, UNA POR MES, HASTA EL MES ACTUAL
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
    let limite = new Date(Date.UTC(hoy.getFullYear(), hoy.getMonth() + 1, 0)) // fin del mes actual
    if (prestamo.fechaFinPlazo && prestamo.fechaFinPlazo < limite) {
        limite = prestamo.fechaFinPlazo
    }

    // Las cuotas cobran solo el interés mensual: capital x tasa
    const montoInteres = prestamo.montoCapital.mul(prestamo.tasaInteres).div(100).toDecimalPlaces(2)

    const nuevas = []
    for (let i = 1; sumarMeses(base, i) <= limite; i++) {
        nuevas.push({ montoInteres, fechaVencimiento: sumarMeses(base, i), prestamoId: prestamo.id })
    }

    if (nuevas.length > 0) {
        await prisma.cuota.createMany({ data: nuevas })
    }
}

const sincronizar = async (usuarioId: string) => {
    const prestamos = await prisma.prestamo.findMany({
        where: { usuarioId, estado: "activo" }
    })
    for (const prestamo of prestamos) {
        await sincronizarPrestamo(prestamo)
    }
}

// Si llegan dos peticiones a la vez (el dashboard pide vencidas y del mes en paralelo),
// la segunda espera a la primera en vez de crear las mismas cuotas dos veces
const enCurso = new Map<string, Promise<void>>()

// GENERA LAS CUOTAS PENDIENTES DE TODOS LOS PRESTAMOS ACTIVOS DE UN USUARIO
export const syncInstallments = (usuarioId: string) => {
    const actual = enCurso.get(usuarioId)
    if (actual) return actual

    const promesa = sincronizar(usuarioId).finally(() => enCurso.delete(usuarioId))
    enCurso.set(usuarioId, promesa)
    return promesa
}
