// Las fechas de la BD (vencimiento, inicio, pago) son solo día, sin hora: "2026-11-07T00:00:00.000Z".
// Para compararlas se usa el texto "AAAA-MM-DD"; comparar con new Date() haría que una cuota
// de hoy apareciera vencida desde la medianoche.

// Fecha de hoy en el celular, como "AAAA-MM-DD"
export const hoyTexto = () => {
  const hoy = new Date();
  const mes = String(hoy.getMonth() + 1).padStart(2, "0");
  const dia = String(hoy.getDate()).padStart(2, "0");
  return `${hoy.getFullYear()}-${mes}-${dia}`;
};

// Días que faltan para una fecha (negativo si ya pasó, 0 si es hoy)
export const diasHasta = (fecha: string) => {
  const [a, m, d] = fecha.slice(0, 10).split("-").map(Number);
  const [ha, hm, hd] = hoyTexto().split("-").map(Number);
  return Math.round((Date.UTC(a, m - 1, d) - Date.UTC(ha, hm - 1, hd)) / 86400000);
};

// SITUACION DEL PLAZO DE UN PRESTAMO CON FECHA FIN
//  "vencido": ya pasó la fecha fin y no ha devuelto el capital (no se generan más cuotas hasta decidir)
//  "hoy":     el plazo termina hoy
//  "pronto":  faltan 30 días o menos
//  null:      sin fecha fin, cerrado, capital devuelto, o falta mucho
export const estadoPlazo = (prestamo: {
  estado: string;
  fechaFinPlazo: string | null;
  capitalDevuelto: string | null;
}): "vencido" | "hoy" | "pronto" | null => {
  if (prestamo.estado !== "activo" || prestamo.capitalDevuelto || !prestamo.fechaFinPlazo) return null;
  const dias = diasHasta(prestamo.fechaFinPlazo);
  if (dias < 0) return "vencido";
  if (dias === 0) return "hoy";
  if (dias <= 30) return "pronto";
  return null;
};

// "vencida" si ya pasó, "hoy" si vence hoy, "futura" si aún no llega
export const estadoVencimiento = (fecha: string): "vencida" | "hoy" | "futura" => {
  const dia = fecha.slice(0, 10);
  const hoy = hoyTexto();
  if (dia < hoy) return "vencida";
  if (dia === hoy) return "hoy";
  return "futura";
};
