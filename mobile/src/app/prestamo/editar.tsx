import { useState, useEffect } from "react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { api } from "@/services/api";
import PrestamoForm, { desdeTextoFecha } from "@/components/prestamo-form";

type Prestamo = {
  id: string;
  montoCapital: string;
  tasaInteres: string;
  fechaInicio: string;
  fechaFinPlazo: string | null;
  deudorId: string;
  deudor: { nombre: string };
  cuotas: { pagado: boolean }[];
};

// Se abre con router.push({ pathname: "/prestamo/editar", params: { id } })
export default function EditarPrestamoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [prestamo, setPrestamo] = useState<Prestamo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<Prestamo>(`/api/prestamos/${id}`)
      .then(setPrestamo)
      .catch((error) => console.log("Error cargando préstamo:", error))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <View style={styles.centrado}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!prestamo) {
    return (
      <View style={styles.centrado}>
        <Text>No se encontró el préstamo</Text>
      </View>
    );
  }

  return (
    <PrestamoForm
      titulo="Editar préstamo"
      textoBoton="Guardar cambios"
      deudorFijo={{ id: prestamo.deudorId, nombre: prestamo.deudor.nombre }}
      inicial={{
        monto: Number(prestamo.montoCapital),
        tasa: Number(prestamo.tasaInteres),
        fechaInicio: desdeTextoFecha(prestamo.fechaInicio),
        fechaFin: prestamo.fechaFinPlazo ? desdeTextoFecha(prestamo.fechaFinPlazo) : null,
      }}
      edicion={{ tienePagadas: prestamo.cuotas.some((c) => c.pagado) }}
      onGuardar={async (datos) => {
        await api(`/api/prestamos/${prestamo.id}`, { method: "PUT", body: datos });
        // El detalle se recarga solo al volver
        router.back();
      }}
    />
  );
}

const styles = StyleSheet.create({
  centrado: { flex: 1, justifyContent: "center", alignItems: "center" },
});
