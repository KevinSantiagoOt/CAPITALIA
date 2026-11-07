import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { useLocalSearchParams, router, Stack } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "@/services/api";

type Prestamo = {
  id: string;
  montoCapital: string;
  tasaInteres: string;
  fechaInicio: string;
  fechaFinPlazo: string | null;
  estado: string;
};

type DeudorDetalle = {
  id: string;
  nombre: string;
  cedula: string;
  telefono: string;
  direccion: string;
  prestamos: Prestamo[];
};

export default function DetalleDeudorScreen() {
  const { cedula } = useLocalSearchParams<{ cedula: string }>();
  const [deudor, setDeudor] = useState<DeudorDetalle | null>(null);
  const [loading, setLoading] = useState(true);

  const cargarDeudor = useCallback(async () => {
    try {
      const data = await api<DeudorDetalle>(`/api/deudores/cedula/${cedula}`);
      setDeudor(data);
    } catch (error) {
      console.log("Error cargando deudor:", error);
    } finally {
      setLoading(false);
    }
  }, [cedula]);

  useEffect(() => {
    cargarDeudor();
  }, [cargarDeudor]);

  const formatearMonto = (monto: string) => `$${Number(monto).toLocaleString("es-CO")}`;

  const formatearFecha = (fecha: string | null) => {
    if (!fecha) return "Sin fecha fin";
    return new Date(fecha).toLocaleDateString("es-CO", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

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
    <SafeAreaView style={styles.container} edges={["top"]}>
      <Stack.Screen options={{ title: deudor.nombre, headerBackTitle: "Deudores" }} />

      <View style={styles.infoCard}>
        <Text style={styles.nombre}>{deudor.nombre}</Text>
        <Text style={styles.subInfo}>Cédula: {deudor.cedula}</Text>
        <Text style={styles.subInfo}>Tel: {deudor.telefono}</Text>
        <Text style={styles.subInfo}>{deudor.direccion}</Text>
      </View>

      <Text style={styles.seccionTitulo}>Préstamos</Text>

      <FlatList
        data={deudor.prestamos}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 12 }}
        ListEmptyComponent={<Text style={styles.vacio}>Sin préstamos registrados</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.prestamoCard}
            onPress={() => router.push(`/prestamo/${item.id}`)}
          >
            <Text style={styles.monto}>{formatearMonto(item.montoCapital)}</Text>
            <Text style={styles.detalle}>Interés: {item.tasaInteres}%</Text>
            <Text style={styles.detalle}>
              {formatearFecha(item.fechaInicio)} → {formatearFecha(item.fechaFinPlazo)}
            </Text>
            <Text style={[styles.estado, item.estado === "activo" && styles.estadoActivo]}>
              {item.estado}
            </Text>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  centrado: { flex: 1, justifyContent: "center", alignItems: "center" },
  infoCard: { backgroundColor: "#fff", margin: 12, padding: 16, borderRadius: 12 },
  nombre: { fontSize: 20, fontWeight: "bold", marginBottom: 6 },
  subInfo: { fontSize: 14, color: "#666", marginTop: 2 },
  seccionTitulo: { fontSize: 16, fontWeight: "bold", marginLeft: 16, marginTop: 4 },
  vacio: { textAlign: "center", color: "#999", marginTop: 20 },
  prestamoCard: {
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 10,
    marginBottom: 10,
  },
  monto: { fontSize: 18, fontWeight: "bold", color: "#2563eb" },
  detalle: { fontSize: 13, color: "#666", marginTop: 2 },
  estado: { fontSize: 13, fontWeight: "600", color: "#999", marginTop: 4, textTransform: "capitalize" },
  estadoActivo: { color: "#16a34a" },
});