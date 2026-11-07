import { useCallback } from "react";
import { useFocusEffect } from "expo-router";
import { setStatusBarStyle } from "expo-status-bar";
import { useTema } from "@/theme/tema";

// Para pantallas con la banda oscura arriba: la hora y la batería van en blanco mientras se ven,
// y al salir vuelven al color del tema
export function useBarraClara() {
  const { esOscuro } = useTema();
  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle("light");
      return () => setStatusBarStyle(esOscuro ? "light" : "dark");
    }, [esOscuro])
  );
}
