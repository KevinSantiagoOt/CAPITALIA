import { TextStyle } from "react-native";

// Montos con la letra normal del celular (San Francisco en iPhone) y números de ancho fijo,
// para que las cifras queden alineadas y no "bailen" al cambiar
export const numerosMontos: TextStyle["fontVariant"] = ["tabular-nums"];
