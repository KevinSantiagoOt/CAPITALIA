import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import { api } from "@/services/api";
import { hoyTexto } from "@/utils/fechas";

// RECORDATORIOS DE CUOTAS Y PLAZOS (notificaciones locales)
// El celular los programa cada vez que se cargan los préstamos activos (Inicio, o después de
// marcar una cuota) y suenan a las 8 a. m. aunque la app esté cerrada:
//  - Cuota: el día anterior, el mismo día y 3 días después si sigue sin pagar
//  - Plazo con fecha fin: 7 días antes y el mismo día
// Cada vez se borran todos y se vuelven a programar, así lo pagado o cerrado deja de avisar.

const HORA = 8;
// iPhone solo guarda 64 notificaciones programadas: se dejan las 60 más próximas
const MAXIMO = 60;
const CANAL = "recordatorios";
const PREFERENCIA = "notificaciones"; // "no" si Wilfer las apagó en Ajustes

type PrestamoActivo = {
  id: string;
  montoCapital: string;
  fechaFinPlazo: string | null;
  capitalDevuelto: string | null;
  deudor?: { nombre: string };
  cuotas?: { montoInteres: string; fechaVencimiento: string; pagado: boolean | null }[];
};

type Recordatorio = { fecha: Date; titulo: string; texto: string; prestamoId: string };

// Mostrar la notificación aunque la app esté abierta
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const formatearMonto = (monto: string) => `$${Math.round(Number(monto)).toLocaleString("es-CO")}`;

// "2026-12-08..." + días -> ese día a las 8 a. m. en la hora del celular
const alas8 = (fecha: string, dias = 0) => {
  const [a, m, d] = fecha.slice(0, 10).split("-").map(Number);
  return new Date(a, m - 1, d + dias, HORA, 0, 0);
};

export const notificacionesActivadas = async () => (await SecureStore.getItemAsync(PREFERENCIA)) !== "no";

// Pide el permiso al sistema (en Android 13+ y iPhone sale el aviso "Permitir notificaciones")
export const pedirPermiso = async () => {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(CANAL, {
      name: "Recordatorios de cuotas",
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
  const actual = await Notifications.getPermissionsAsync();
  if (actual.granted) return true;
  if (!actual.canAskAgain) return false;
  return (await Notifications.requestPermissionsAsync()).granted;
};

export const cancelarRecordatorios = () => Notifications.cancelAllScheduledNotificationsAsync();

// ¿Están funcionando? Activadas en Ajustes Y con el permiso del sistema
export const recordatoriosFuncionando = async () =>
  (await notificacionesActivadas()) && (await Notifications.getPermissionsAsync()).granted;

// INTERRUPTOR DE AJUSTES. Devuelve si quedaron funcionando
// (al activarlas puede quedar en false si el sistema no da el permiso)
export const cambiarNotificaciones = async (activar: boolean) => {
  if (!activar) {
    await SecureStore.setItemAsync(PREFERENCIA, "no");
    await cancelarRecordatorios();
    return false;
  }
  await SecureStore.deleteItemAsync(PREFERENCIA);
  if (!(await pedirPermiso())) return false;
  await reprogramarRecordatorios();
  return true;
};

// ARMA LA LISTA DE RECORDATORIOS A PARTIR DE LOS PRESTAMOS ACTIVOS
const armarRecordatorios = (prestamos: PrestamoActivo[]) => {
  const lista: Recordatorio[] = [];
  const hoy = hoyTexto();

  for (const p of prestamos) {
    const nombre = p.deudor?.nombre ?? "un deudor";

    for (const c of p.cuotas ?? []) {
      if (c.pagado) continue;
      const monto = formatearMonto(c.montoInteres);
      const fecha = c.fechaVencimiento;
      lista.push(
        { fecha: alas8(fecha, -1), titulo: "Cuota para mañana", texto: `Mañana vence la cuota de ${nombre} por ${monto}`, prestamoId: p.id },
        { fecha: alas8(fecha), titulo: "Cuota para hoy", texto: `Hoy vence la cuota de ${nombre} por ${monto}`, prestamoId: p.id },
        { fecha: alas8(fecha, 3), titulo: "Cuota vencida", texto: `La cuota de ${nombre} por ${monto} lleva 3 días vencida`, prestamoId: p.id }
      );
    }

    // Plazo: solo si tiene fecha fin y todavía no devolvió el capital
    if (p.fechaFinPlazo && !p.capitalDevuelto && p.fechaFinPlazo.slice(0, 10) >= hoy) {
      const capital = formatearMonto(p.montoCapital);
      lista.push(
        { fecha: alas8(p.fechaFinPlazo, -7), titulo: "El plazo termina pronto", texto: `El plazo de ${nombre} (${capital}) termina en 7 días`, prestamoId: p.id },
        { fecha: alas8(p.fechaFinPlazo), titulo: "El plazo termina hoy", texto: `Hoy termina el plazo de ${nombre}. Revisa si devolvió el capital de ${capital}`, prestamoId: p.id }
      );
    }
  }

  // Solo los que aún no han pasado, los más próximos primero
  const ahora = Date.now();
  return lista
    .filter((r) => r.fecha.getTime() > ahora)
    .sort((a, b) => a.fecha.getTime() - b.fecha.getTime())
    .slice(0, MAXIMO);
};

// BORRA Y VUELVE A PROGRAMAR TODOS LOS RECORDATORIOS
// Si se pasan los préstamos (Inicio ya los tiene) no se hace otra petición
export const reprogramarRecordatorios = async (prestamos?: PrestamoActivo[]) => {
  try {
    await cancelarRecordatorios();
    if (!(await notificacionesActivadas())) return;
    const permiso = await Notifications.getPermissionsAsync();
    if (!permiso.granted) return;

    const datos = prestamos ?? (await api<PrestamoActivo[]>(`/api/prestamosactivos/usuario/${await SecureStore.getItemAsync("userId")}`));

    const recordatorios = armarRecordatorios(datos);
    for (const r of recordatorios) {
      await Notifications.scheduleNotificationAsync({
        content: { title: r.titulo, body: r.texto, data: { prestamoId: r.prestamoId } },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: r.fecha, channelId: CANAL },
      });
    }
    console.log(`Recordatorios programados: ${recordatorios.length}`, recordatorios[0]?.fecha.toLocaleString("es-CO") ?? "");
  } catch (error) {
    // Un recordatorio que falle no debe romper la pantalla
    console.log("Error programando recordatorios:", error);
  }
};
