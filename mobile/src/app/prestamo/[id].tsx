import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useLocalSearchParams, Stack } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "@/services/api";

type Cuota = {
  id: string;
  montoInteres: string;
  fechaVencimiento: string;
  pagado: boolean;
  fechaPago: string | null;
};

type PrestamoDetalle = {
  id: string;
  montoCapital: string;
  tasaInteres: string;
  fechaInicio: string;
  estado: string;
  deudor: {
    nombre: string;
    telefono: string;
    direccion: string;
  };
  cuotas: Cuota[];
};

export default function DetallePrestamoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [prestamo, setPrestamo] = useState<PrestamoDetalle | null>(null);
  const [loading, setLoading] = useState(true);
  const [actualizandoCuota, setActualizandoCuota] = useState<string | null>(null);

  const cargarPrestamo = useCallback(async () => {
    try {
      const data = await api<PrestamoDetalle>(`/api/prestamos/${id}`);
      setPrestamo(data);
    } catch (error) {
      console.log("Error cargando préstamo:", error);
      Alert.alert("Error", "No se pudo cargar el préstamo");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    cargarPrestamo();
  }, [cargarPrestamo]);

  const marcarComoPagada = async (cuotaId: string, fechaVencimiento: string) => {
  setActualizandoCuota(cuotaId);
  try {
    await api(`/api/cuotas/${cuotaId}`, {
      method: "PUT",
      body: { fechaVencimiento, pagado: true },
    });

    await cargarPrestamo();
  } catch (error) {
    Alert.alert("Error", "No se pudo marcar la cuota como pagada");
  } finally {
    setActualizandoCuota(null);
  }
};

  const formatearMonto = (monto: string) => `$${Number(monto).toLocaleString("es-CO")}`;

  const formatearFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString("es-CO", {
      day: "2-digit",
      month: "short",
      timeZone: "UTC", // las fechas vienen sin hora; sin esto se corren un día en Colombia
      year: "numeric",
    });
  };

  const estaVencida = (cuota: Cuota) => {
    return !cuota.pagado && new Date(cuota.fechaVencimiento) < new Date();
  };

  if (loading) {
    return (
      <View style={styles.container}>
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
    <SafeAreaView style={styles.container} edges={["top"]}>
      <Stack.Screen options={{ title: prestamo.deudor.nombre, headerBackTitle: "Préstamos" }} />

      {/* Info del préstamo */}
      <View style={[styles.infoCard]}>
        <Text style={styles.monto}>{formatearMonto(prestamo.montoCapital)}</Text>
        <Text style={styles.subInfo}>Interés: {prestamo.tasaInteres}%</Text>
        <Text style={styles.subInfo}>Inicio: {formatearFecha(prestamo.fechaInicio)}</Text>
        <Text style={styles.subInfo}>Tel: {prestamo.deudor.telefono}</Text>
      </View>

      <Text style={styles.seccionTitulo}>Cuotas</Text>

      <FlatList
        data={prestamo.cuotas}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 12 }}
        ListEmptyComponent={<Text style={styles.vacio}>Sin cuotas registradas</Text>}
        renderItem={({ item }) => {
          const vencida = estaVencida(item);
          return (
            <View style={styles.cuotaRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cuotaMonto}>{formatearMonto(item.montoInteres)}</Text>
                <Text style={[styles.cuotaFecha, vencida && styles.textoVencido]}>
                  Vence: {formatearFecha(item.fechaVencimiento)}
                  {vencida && " (vencida)"}
                </Text>
              </View>

              {item.pagado ? (
                <View style={styles.pagadaBadge}>
                  <Text style={styles.pagadaText}>Pagada</Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.pagarBtn}
                  onPress={() => marcarComoPagada(item.id, item.fechaVencimiento)}
                  disabled={actualizandoCuota === item.id}
                >
                  {actualizandoCuota === item.id ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.pagarBtnText}>Marcar pagada</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  centrado: { flex: 1, justifyContent: "center", alignItems: "center" },
  infoCard: {
    backgroundColor: "#fff",
    margin: 12,
    padding: 16,
    borderRadius: 12,
  },
  monto: { fontSize: 26, fontWeight: "bold", color: "#2563eb", marginBottom: 8 },
  subInfo: { fontSize: 14, color: "#666", marginTop: 2 },
  seccionTitulo: { fontSize: 16, fontWeight: "bold", marginLeft: 16, marginTop: 4 },
  vacio: { textAlign: "center", color: "#999", marginTop: 20 },
  cuotaRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 10,
    marginBottom: 10,
  },
  cuotaMonto: { fontSize: 16, fontWeight: "600" },
  cuotaFecha: { fontSize: 13, color: "#666", marginTop: 2 },
  textoVencido: { color: "#dc2626", fontWeight: "600" },
  pagadaBadge: {
    backgroundColor: "#dcfce7",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  pagadaText: { color: "#16a34a", fontWeight: "600", fontSize: 13 },
  pagarBtn: {
    backgroundColor: "#2563eb",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  pagarBtnText: { color: "#fff", fontWeight: "600", fontSize: 13 },
});