// PALETAS DE COLORES DE LA APP
// Cada pantalla usa estos nombres en vez de colores fijos ("#fff"), así cambia sola entre claro y oscuro.

export const claro = {
  fondo: "#f5f5f5", // fondo de las pantallas
  tarjeta: "#ffffff", // tarjetas, encabezados, barra de pestañas
  texto: "#111827",
  textoSecundario: "#666666",
  textoTenue: "#999999", // placeholders y textos vacíos
  borde: "#dddddd",
  separador: "#eeeeee",
  inputFijo: "#f3f4f6", // campos que no se pueden editar
  iconoTenue: "#c4c4c4",
  sombra: "#000000",

  primario: "#2563eb",
  sobrePrimario: "#ffffff", // texto encima de un botón azul
  primarioSuave: "#dbeafe",
  peligro: "#dc2626",
  peligroSuave: "#fee2e2",
  exito: "#16a34a",
  exitoSuave: "#dcfce7",
  aviso: "#b45309",
  avisoSuave: "#fef3c7",
  neutro: "#4b5563",
  neutroSuave: "#f3f4f6",

  chip: "#e5e5e5", // botones del filtro sin seleccionar
  chipTexto: "#666666",
  resumenFondo: "#eff6ff", // cuadro azul de resumen en el formulario de préstamo
  resumenTitulo: "#1e3a8a",

  banda: "#111111", // banda oscura de arriba en Inicio (oscura también en modo claro)
  sobreBanda: "#ffffff", // texto encima de la banda
  sobreBandaTenue: "#9ca3af",
  hoja: "#ffffff", // hoja redondeada que sube sobre la banda
  destacada: "#111111", // tarjeta oscura con el monto grande (detalle del préstamo)
};

export type Colores = typeof claro;

export const oscuro: Colores = {
  fondo: "#000000",
  tarjeta: "#1c1c1e",
  texto: "#f4f4f5",
  textoSecundario: "#a1a1aa",
  textoTenue: "#71717a",
  borde: "#3f3f46",
  separador: "#2c2c2e",
  inputFijo: "#2c2c2e",
  iconoTenue: "#52525b",
  sombra: "#000000",

  primario: "#3b82f6",
  sobrePrimario: "#ffffff",
  primarioSuave: "rgba(59, 130, 246, 0.18)",
  peligro: "#f87171",
  peligroSuave: "rgba(248, 113, 113, 0.15)",
  exito: "#4ade80",
  exitoSuave: "rgba(74, 222, 128, 0.15)",
  aviso: "#fbbf24",
  avisoSuave: "rgba(251, 191, 36, 0.15)",
  neutro: "#d4d4d8",
  neutroSuave: "#2c2c2e",

  chip: "#2c2c2e",
  chipTexto: "#a1a1aa",
  resumenFondo: "rgba(59, 130, 246, 0.12)",
  resumenTitulo: "#93c5fd",

  banda: "#000000",
  sobreBanda: "#ffffff",
  sobreBandaTenue: "#9ca3af",
  hoja: "#121214",
  destacada: "#232327",
};
