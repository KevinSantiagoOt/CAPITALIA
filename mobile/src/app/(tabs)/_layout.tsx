import { useMemo } from "react";
import { View, StyleSheet } from "react-native";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTema } from "@/theme/tema";
import { Colores } from "@/theme/colores";

type NombreIcono = keyof typeof Ionicons.glyphMap;

export default function TabsLayout() {
  const { colores } = useTema();
  const styles = useMemo(() => crearEstilos(colores), [colores]);

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
