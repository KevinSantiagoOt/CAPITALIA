import { useMemo } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useTema } from "@/theme/tema";
import { Colores } from "@/theme/colores";

type Props<T extends string> = {
  opciones: { valor: T; texto: string }[];
  seleccionado: T;
  onCambio: (valor: T) => void;
};

// SELECTOR DE ARRIBA EN LAS LISTAS (ej. "Activos | Todos"), CENTRADO
export default function Filtro<T extends string>({ opciones, seleccionado, onCambio }: Props<T>) {
  const { colores } = useTema();
  const styles = useMemo(() => crearEstilos(colores), [colores]);

  return (
    <View style={styles.contenedor}>
      {opciones.map((opcion) => {
        const activo = opcion.valor === seleccionado;
        return (
          <TouchableOpacity
            key={opcion.valor}
            style={[styles.boton, activo && styles.botonActivo]}
            onPress={() => onCambio(opcion.valor)}
          >
            <Text style={[styles.texto, activo && styles.textoActivo]}>{opcion.texto}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const crearEstilos = (c: Colores) =>
  StyleSheet.create({
    contenedor: { flexDirection: "row", justifyContent: "center", gap: 8, paddingTop: 20, paddingBottom: 4 },
    boton: { paddingVertical: 8, paddingHorizontal: 22, borderRadius: 20, backgroundColor: c.chip },
    botonActivo: { backgroundColor: c.primario },
    texto: { color: c.chipTexto, fontWeight: "600" },
    textoActivo: { color: c.sobrePrimario },
  });
