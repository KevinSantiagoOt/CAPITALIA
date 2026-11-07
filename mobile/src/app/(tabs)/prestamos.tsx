import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import * as SecureStore from "expo-secure-store";
import {router} from "expo-router";
import { api } from "@/services/api";

type Cuota = {
  id: string;
  montoInteres: string;
  fechaVencimiento: string;
  pagado: boolean;
};

type Prestamo = {
  id: string;
  montoCapital: string;
  tasaInteres: string;
  fechaInicio: string;
  estado: string;
  deudor: {
    nombre: string;
    telefono: string;
  };
  cuotas?: Cuota[];
};

export default function PrestamosScreen() {
  const [prestamos, setPrestamos] = useState<Prestamo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filtro, setFiltro] = useState<"todos" | "activos">("activos");

  const cargarPrestamos = useCallback(async () => {
    try {
      const userId = await SecureStore.getItemAsync("userId");

      const endpoint =
        filtro === "activos"
          ? `/api/prestamosactivos/usuario/${userId}`
          : `/api/prestamos/usuario/${userId}`;

      const data = await api<Prestamo[]>(endpoint);
      setPrestamos(data);
    } catch (error) {
      console.log("Error cargando préstamos:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filtro]);

  useEffect(() => {
    setLoading(true);
    cargarPrestamos();
  }, [cargarPrestamos]);

  const onRefresh = () => {
    setRefreshing(true);
    cargarPrestamos();
  };

const contarCuotasVencidas = (cuotas: Cuota[] | undefined) => {
  if (!cuotas || cuotas.length === 0) return 0;
  const hoy = new Date();
  return cuotas.filter((c) => !c.pagado && new Date(c.fechaVencimiento) < hoy).length;
};

  const formatearMonto = (monto: string) => {
    return `$${Number(monto).toLocaleString("es-CO")}`;
  };

  const renderPrestamo = ({ item }: { item: Prestamo }) => {
    const vencidas = contarCuotasVencidas(item.cuotas);

    return (
      <TouchableOpacity style={styles.card} onPress={() => router.push(`/prestamo/${item.id}`)}>
        <View style={styles.cardHeader}>
          <Text style={styles.nombreDeudor}>{item.deudor.nombre}</Text>
          {vencidas > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{vencidas} vencida{vencidas > 1 ? "s" : ""}</Text>
            </View>
          )}
        </View>

        <Text style={styles.monto}>{formatearMonto(item.montoCapital)}</Text>

        <View style={styles.cardFooter}>
          <Text style={styles.detalle}>Interés: {item.tasaInteres}%</Text>
          <Text style={[styles.estado, item.estado === "activo" && styles.estadoActivo]}>
            {item.estado}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.tabsFiltro}>
        <TouchableOpacity
          style={[styles.filtroBtn, filtro === "activos" && styles.filtroBtnActivo]}
          onPress={() => setFiltro("activos")}
        >
          <Text style={[styles.filtroText, filtro === "activos" && styles.filtroTextActivo]}>
            Activos
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filtroBtn, filtro === "todos" && styles.filtroBtnActivo]}
          onPress={() => setFiltro("todos")}
        >
          <Text style={[styles.filtroText, filtro === "todos" && styles.filtroTextActivo]}>
            Todos
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={prestamos}
          keyExtractor={(item) => item.id}
          renderItem={renderPrestamo}
          contentContainerStyle={styles.lista}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <Text style={styles.vacio}>No hay préstamos para mostrar</Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  tabsFiltro: {
    flexDirection: "row",
    padding: 100,
    gap: 8,
  },
  filtroBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: "#e5e5e5",
  },
  filtroBtnActivo: { backgroundColor: "#2563eb" },
  filtroText: { color: "#666", fontWeight: "600" },
  filtroTextActivo: { color: "#fff" },
  lista: { padding: 12 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  nombreDeudor: { fontSize: 16, fontWeight: "bold" },
  badge: {
    backgroundColor: "#fee2e2",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: { color: "#dc2626", fontSize: 12, fontWeight: "600" },
  monto: { fontSize: 22, fontWeight: "bold", color: "#2563eb", marginBottom: 8 },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  detalle: { color: "#666", fontSize: 13 },
  estado: { fontSize: 13, fontWeight: "600", color: "#999", textTransform: "capitalize" },
  estadoActivo: { color: "#16a34a" },
  vacio: { textAlign: "center", marginTop: 40, color: "#999" },
});