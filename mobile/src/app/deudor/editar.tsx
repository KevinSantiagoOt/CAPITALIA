import { useState, useEffect } from "react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { api } from "@/services/api";
import DeudorForm, { DatosDeudor } from "@/components/deudor-form";

type Deudor = DatosDeudor & { id: string };

// Se abre con router.push({ pathname: "/deudor/editar", params: { cedula } })
export default function EditarDeudorScreen() {
  const { cedula } = useLocalSearchParams<{ cedula: string }>();
  const [deudor, setDeudor] = useState<Deudor | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<Deudor>(`/api/deudores/cedula/${cedula}`)
      .then(setDeudor)
      .catch((error) => console.log("Error cargando deudor:", error))
      .finally(() => setLoading(false));
  }, [cedula]);

  if (loading) {
    return (
      <View style={styles.centrado}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!deudor) {
    return (
      <View style={styles.centrado}>
        <Text>No se encontró el deudor</Text>
      </View>
    );
  }

  return (
    <DeudorForm
      titulo="Editar deudor"
      textoBoton="Guardar cambios"
      inicial={deudor}
      onGuardar={async (datos) => {
        await api(`/api/deudores/${deudor.id}`, { method: "PUT", body: datos });

        if (datos.cedula === deudor.cedula) {
          // Vuelve al detalle, que se recarga solo con los datos nuevos
          router.back();
        } else {
          // El detalle de atrás busca por la cédula vieja y ya no la encontraría,
          // así que se vuelve directo a la lista de deudores
          router.dismissTo("/deudores");
        }
      }}
    />
  );
}

const styles = StyleSheet.create({
  centrado: { flex: 1, justifyContent: "center", alignItems: "center" },
});
