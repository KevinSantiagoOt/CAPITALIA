import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { useColorScheme } from "react-native";
import * as SecureStore from "expo-secure-store";
import { claro, oscuro, Colores } from "./colores";

// "sistema" sigue el modo del celular; "claro" y "oscuro" lo fijan
export type Preferencia = "sistema" | "claro" | "oscuro";

type Tema = {
  colores: Colores;
  esOscuro: boolean;
  preferencia: Preferencia;
  cambiarPreferencia: (p: Preferencia) => void;
};

const TemaContext = createContext<Tema | null>(null);

const CLAVE = "temaPreferencia"; // donde se guarda la elección en el celular

// ENVUELVE LA APP (en app/_layout.tsx) Y DECIDE QUE PALETA USAR
export function TemaProvider({ children }: { children: ReactNode }) {
  const delSistema = useColorScheme(); // "light" | "dark" según el iPhone
  const [preferencia, setPreferencia] = useState<Preferencia>("sistema");

  useEffect(() => {
    SecureStore.getItemAsync(CLAVE).then((guardada) => {
      if (guardada === "claro" || guardada === "oscuro" || guardada === "sistema") setPreferencia(guardada);
    });
  }, []);

  const valor = useMemo<Tema>(() => {
    const esOscuro = preferencia === "sistema" ? delSistema === "dark" : preferencia === "oscuro";
    return {
      colores: esOscuro ? oscuro : claro,
      esOscuro,
      preferencia,
      cambiarPreferencia: (p) => {
        setPreferencia(p);
        SecureStore.setItemAsync(CLAVE, p);
      },
    };
  }, [preferencia, delSistema]);

  return <TemaContext.Provider value={valor}>{children}</TemaContext.Provider>;
}

// USO EN UNA PANTALLA:
//   const { colores } = useTema();
//   const styles = useMemo(() => crearEstilos(colores), [colores]);
export function useTema() {
  const tema = useContext(TemaContext);
  if (!tema) throw new Error("useTema debe usarse dentro de <TemaProvider>");
  return tema;
}
