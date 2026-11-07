// En SDK 58 expo-router trae su propia copia de la navegación: el tema hay que importarlo
// de "expo-router", no de "@react-navigation/native", o la barra de pestañas no lo ve
import { Stack, ThemeProvider, DarkTheme, DefaultTheme } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { TemaProvider, useTema } from "@/theme/tema";

// La navegación (barra de pestañas, fondo entre pantallas) también usa los colores del tema
function Navegacion() {
  const { colores, esOscuro } = useTema();
  const base = esOscuro ? DarkTheme : DefaultTheme;
  const temaNavegacion = {
    ...base,
    colors: {
      ...base.colors,
      primary: colores.primario,
      background: colores.fondo,
      card: colores.tarjeta,
      text: colores.texto,
      border: colores.separador,
    },
  };

  return (
    <ThemeProvider value={temaNavegacion}>
      <StatusBar style={esOscuro ? "light" : "dark"} />
      <Stack screenOptions={{ headerShown: false }} />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <TemaProvider>
        <Navegacion />
      </TemaProvider>
    </SafeAreaProvider>
  );
}
