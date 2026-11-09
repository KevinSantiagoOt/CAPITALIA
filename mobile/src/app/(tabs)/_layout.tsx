import { useMemo, useEffect } from "react";
import { View, StyleSheet } from "react-native";
import { Tabs, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Notifications from "expo-notifications";
import { useTema } from "@/theme/tema";
import { Colores } from "@/theme/colores";

type NombreIcono = keyof typeof Ionicons.glyphMap;

export default function TabsLayout() {
  const { colores } = useTema();
  const styles = useMemo(() => crearEstilos(colores), [colores]);

  // Al tocar un recordatorio se abre ese préstamo. Va aquí porque las pestañas solo existen
  // con la sesión iniciada; sirve tanto con la app abierta como si la notificación la abrió
  const respuesta = Notifications.useLastNotificationResponse();
  useEffect(() => {
    const prestamoId = respuesta?.notification.request.content.data?.prestamoId;
    if (typeof prestamoId !== "string") return;
    router.push(`/prestamo/${prestamoId}`);
    Notifications.clearLastNotificationResponse(); // que no se vuelva a abrir al volver a esta pantalla
  }, [respuesta]);

  // Mismo estilo que el resto de la app: la pestaña activa lleva el ícono blanco relleno
  // sobre una cápsula oscura (como la banda); las demás, el ícono de contorno en gris
  const icono = (activo: NombreIcono, inactivo: NombreIcono) =>
    function IconoPestana({ focused, color }: { focused: boolean; color: unknown }) {
      return (
        <View style={[styles.capsula, focused && styles.capsulaActiva]}>
          <Ionicons
            name={focused ? activo : inactivo}
            size={22}
            color={focused ? colores.sobreBanda : (color as string)}
          />
        </View>
      );
    };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colores.texto,
        tabBarInactiveTintColor: colores.textoTenue,
        tabBarStyle: { backgroundColor: colores.hoja, borderTopColor: colores.separador },
        tabBarLabelStyle: styles.etiqueta,
      }}
    >
      <Tabs.Screen name="home" options={{ title: "Inicio", tabBarIcon: icono("home", "home-outline") }} />
      <Tabs.Screen name="prestamos" options={{ title: "Préstamos", tabBarIcon: icono("cash", "cash-outline") }} />
      <Tabs.Screen name="deudores" options={{ title: "Deudores", tabBarIcon: icono("people", "people-outline") }} />
      <Tabs.Screen name="ajustes" options={{ title: "Ajustes", tabBarIcon: icono("settings", "settings-outline") }} />
    </Tabs>
  );
}

const crearEstilos = (c: Colores) =>
  StyleSheet.create({
    capsula: { width: 56, height: 30, borderRadius: 15, justifyContent: "center", alignItems: "center" },
    capsulaActiva: { backgroundColor: c.destacada },
    etiqueta: { fontSize: 11, fontWeight: "700" },
  });
