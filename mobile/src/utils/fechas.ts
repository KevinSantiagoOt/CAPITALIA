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

// "vencida" si ya pasó, "hoy" si vence hoy, "futura" si aún no llega
export const estadoVencimiento = (fecha: string): "vencida" | "hoy" | "futura" => {
  const dia = fecha.slice(0, 10);
  const hoy = hoyTexto();
  if (dia < hoy) return "vencida";
  if (dia === hoy) return "hoy";
  return "futura";
};
