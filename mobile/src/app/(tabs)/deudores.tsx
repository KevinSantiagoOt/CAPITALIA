import { useState, useCallback } from "react";
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
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "@/services/api";


type PrestamoResumen = {
  id: string;
  montoCapital: string;
  estado: string;
  capitalDevuelto: string | null;
};

type Deudor = {
  id: string;
  nombre: string;
  cedula: string;
  telefono: string | null;
  direccion: string;
  prestamos: PrestamoResumen[];
};

export default function DeudoresScreen() {
  const [deudores, setDeudores] = useState<Deudor[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  // "todos" = los que no están archivados
  const [vista, setVista] = useState<"todos" | "archivados">("todos");

  const cargarDeudores = useCallback(async () => {
    try {
      const userId = await SecureStore.getItemAsync("userId");
      const query = vista === "archivados" ? "?archivados=true" : "";
      const data = await api<Deudor[]>(`/api/alldeudores/${userId}${query}`);
      setDeudores(data);
    } catch (error) {
      console.log("Error cargando deudores:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [vista]);

  const cambiarVista = (nueva: "todos" | "archivados") => {
    if (nueva === vista) return;
    setLoading(true);
    setVista(nueva);
  };

  // Recarga cada vez que vuelves a esta pestaña (ej. después de crear un deudor)
  useFocusEffect(
    useCallback(() => {
      cargarDeudores();
    }, [cargarDeudores])
  );

  const onRefresh = () => {
    setRefreshing(true);
    cargarDeudores();
  };

  const formatearMonto = (monto: number) => `$${monto.toLocaleString("es-CO")}`;

  const renderDeudor = ({ item }: { item: Deudor }) => {
    // Solo cuentan los préstamos activos: los pagados ya no son deuda
    const prestamosActivos = item.prestamos.filter((p) => p.estado === "activo");
    // Si ya devolvió el capital, ese préstamo solo debe cuotas: no suma al capital pendiente
    const capitalPendiente = prestamosActivos
      .filter((p) => !p.capitalDevuelto)
      .reduce((sum, p) => sum + Number(p.montoCapital), 0);
    const conDeuda = prestamosActivos.length > 0;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push(`/deudor/${item.cedula}`)}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.nombre}>{item.nombre}</Text>
          <View style={[styles.badge, !conDeuda && styles.badgeAlDia]}>
            <Text style={[styles.badgeText, !conDeuda && styles.badgeTextAlDia]}>
              {conDeuda ? "Con deuda" : "Al día"}
            </Text>
          </View>
        </View>
        <Text style={styles.detalle}>Cédula: {item.cedula}</Text>
        {item.telefono && <Text style={styles.detalle}>Tel: {item.telefono}</Text>}
        {conDeuda && capitalPendiente === 0 ? (
          <Text style={styles.total}>Debe cuotas pendientes</Text>
        ) : conDeuda ? (
          <Text style={styles.total}>
            Debe {formatearMonto(capitalPendiente)}
            <Text style={styles.totalDetalle}>
              {"  "}en {prestamosActivos.length} préstamo{prestamosActivos.length > 1 ? "s" : ""}
            </Text>
          </Text>
        ) : (
          <Text style={styles.sinDeuda}>Sin deudas pendientes</Text>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.tabsFiltro}>
        <TouchableOpacity
          style={[styles.filtroBtn, vista === "todos" && styles.filtroBtnActivo]}
          onPress={() => cambiarVista("todos")}
        >
          <Text style={[styles.filtroText, vista === "todos" && styles.filtroTextActivo]}>
            Todos
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filtroBtn, vista === "archivados" && styles.filtroBtnActivo]}
          onPress={() => cambiarVista("archivados")}
        >
          <Text style={[styles.filtroText, vista === "archivados" && styles.filtroTextActivo]}>
            Archivados
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={deudores}
          keyExtractor={(item) => item.id}
          renderItem={renderDeudor}
          contentContainerStyle={styles.lista}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <Text style={styles.vacio}>
              {vista === "archivados" ? "No hay deudores archivados" : "No hay deudores registrados"}
            </Text>
          }
        />
      )}

      {/* Botón flotante para crear un deudor (no en la vista de archivados) */}
      {vista === "todos" && (
        <TouchableOpacity style={styles.fab} onPress={() => router.push("/deudor/nuevo")}>
          <Ionicons name="add" size={30} color="#fff" />
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  lista: { padding: 12, paddingBottom: 90 }, // espacio para que el botón + no tape la última tarjeta
  tabsFiltro: { flexDirection: "row", gap: 8, paddingHorizontal: 12, paddingTop: 12 },
  filtroBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: "#e5e5e5",
  },
  filtroBtnActivo: { backgroundColor: "#2563eb" },
  filtroText: { color: "#666", fontWeight: "600" },
  filtroTextActivo: { color: "#fff" },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#2563eb",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
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
    marginBottom: 6,
  },
  nombre: { fontSize: 16, fontWeight: "bold" },
  badge: {
    backgroundColor: "#fef3c7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: { color: "#b45309", fontSize: 12, fontWeight: "600" },
  badgeAlDia: { backgroundColor: "#dcfce7" },
  badgeTextAlDia: { color: "#16a34a" },
  detalle: { color: "#666", fontSize: 13, marginTop: 2 },
  total: { fontSize: 18, fontWeight: "bold", color: "#1f2937", marginTop: 8 },
  totalDetalle: { fontSize: 13, fontWeight: "normal", color: "#666" },
  sinDeuda: { fontSize: 14, color: "#16a34a", marginTop: 8 },
  vacio: { textAlign: "center", marginTop: 40, color: "#999" },
});