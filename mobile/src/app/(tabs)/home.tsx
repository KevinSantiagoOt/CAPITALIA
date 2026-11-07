import { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
} from "react-native";
import * as SecureStore from "expo-secure-store";
import { router, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "@/services/api";
import { estadoVencimiento } from "@/utils/fechas";

type CuotaVencida = {
  id: string;
  montoInteres: string;
  fechaVencimiento: string;
  prestamoId: string;
  prestamo?: {
    deudor?: {
      nombre: string;
    };
  };
};

type CuotaProxima = {
  id: string;
  montoInteres: string;
  fechaVencimiento: string;
  prestamoId: string;
  prestamo?: {
    deudor?: {
      nombre: string;
    };
  };
};

export default function HomeScreen() {
  const [userName, setUserName] = useState("");
  const [vencidas, setVencidas] = useState<CuotaVencida[]>([]);
  const [proximas, setProximas] = useState<CuotaProxima[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const obtenerMesActual = () => {
  const meses = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
  ];
  return meses[new Date().getMonth()];
};

  const cargarDatos = useCallback(async () => {
    try {
      const userId = await SecureStore.getItemAsync("userId");
      const name = await SecureStore.getItemAsync("userName");
      if (name) setUserName(name);

      const [dataVencidas, dataProximas] = await Promise.all([
        api<CuotaVencida[]>(`/api/cuotas/prestamo/${userId}/vencidas`),
        api<CuotaProxima[]>(`/api/cuotas/prestamo/${userId}/vencenpronto`),
      ]);

      setVencidas(dataVencidas);
      setProximas(dataProximas);
    } catch (error) {
      console.log("Error cargando dashboard:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Recarga cada vez que vuelves a esta pestaña (ej. después de marcar una cuota como pagada)
  useFocusEffect(
    useCallback(() => {
      cargarDatos();
    }, [cargarDatos])
  );

  const onRefresh = () => {
    setRefreshing(true);
    cargarDatos();
  };

  const formatearMonto = (monto: string) => `$${Number(monto).toLocaleString("es-CO")}`;

  const formatearFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString("es-CO", {
      day: "2-digit",
      month: "short",
      timeZone: "UTC", // las fechas vienen sin hora; sin esto se corren un día en Colombia
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <ActivityIndicator size="large" style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Text style={styles.saludo}>Hola, {userName} </Text>

        {/* Resumen */}
        <View style={styles.resumenRow}>
          <View style={[styles.resumenCard, styles.resumenRojo]}>
            <Text style={styles.resumenNumero}>{vencidas.length}</Text>
            <Text style={styles.resumenLabel}>Vencidas</Text>
          </View>
          <View style={[styles.resumenCard, styles.resumenAmarillo]}>
            <Text style={styles.resumenNumero}>{proximas.length}</Text>
            <Text style={styles.resumenLabel}>Cuotas de {obtenerMesActual()}</Text>
          </View>
        </View>

        {/* Cuotas vencidas */}
        <Text style={styles.seccionTitulo}>Cuotas vencidas</Text>
        {vencidas.length === 0 ? (
          <Text style={styles.vacio}>No hay cuotas vencidas</Text>
        ) : (
          vencidas.map((cuota) => (
            <TouchableOpacity
              key={cuota.id}
              style={[styles.cuotaCard, styles.bordeRojo]}
              onPress={() => router.push(`/prestamo/${cuota.prestamoId}`)}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.cuotaNombre}>
                  {cuota.prestamo?.deudor?.nombre ?? "Deudor"}
                </Text>
                <Text style={styles.cuotaFecha}>
                  Venció: {formatearFecha(cuota.fechaVencimiento)}
                </Text>
              </View>
              <Text style={styles.cuotaMonto}>{formatearMonto(cuota.montoInteres)}</Text>
            </TouchableOpacity>
          ))
        )}

        {/* Cuotas que vencen este mes */}
        <Text style={styles.seccionTitulo}>Vencen este mes</Text>
        {proximas.length === 0 ? (
          <Text style={styles.vacio}>Nada próximo a vencer</Text>
        ) : (
          proximas.map((cuota) => (
            <TouchableOpacity
              key={cuota.id}
              style={[styles.cuotaCard, styles.bordeAmarillo]}
              onPress={() => router.push(`/prestamo/${cuota.prestamoId}`)}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.cuotaNombre}>
                  {cuota.prestamo?.deudor?.nombre ?? "Deudor"}
                </Text>
                {estadoVencimiento(cuota.fechaVencimiento) === "hoy" ? (
                  <Text style={[styles.cuotaFecha, styles.textoHoy]}>Vence hoy</Text>
                ) : (
                  <Text style={styles.cuotaFecha}>Vence: {formatearFecha(cuota.fechaVencimiento)}</Text>
                )}
              </View>
              <Text style={styles.cuotaMonto}>{formatearMonto(cuota.montoInteres)}</Text>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  scroll: { padding: 16 },
  saludo: { fontSize: 22, fontWeight: "bold", marginBottom: 16 },
  resumenRow: { flexDirection: "row", gap: 12, marginBottom: 20 },
  resumenCard: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  resumenRojo: { backgroundColor: "#fee2e2" },
  resumenAmarillo: { backgroundColor: "#fef9c3" },
  resumenNumero: { fontSize: 28, fontWeight: "bold" },
  resumenLabel: { fontSize: 13, color: "#666", marginTop: 4 },
  seccionTitulo: { fontSize: 16, fontWeight: "bold", marginTop: 8, marginBottom: 8 },
  vacio: { color: "#999", marginBottom: 16 },
  cuotaCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 10,
    marginBottom: 8,
    borderLeftWidth: 4,
  },
  bordeRojo: { borderLeftColor: "#dc2626" },
  bordeAmarillo: { borderLeftColor: "#ca8a04" },
  cuotaNombre: { fontWeight: "600", fontSize: 15 },
  cuotaFecha: { fontSize: 13, color: "#666", marginTop: 2 },
  textoHoy: { color: "#b45309", fontWeight: "600" },
  cuotaMonto: { fontWeight: "bold", fontSize: 15, color: "#2563eb" },
});