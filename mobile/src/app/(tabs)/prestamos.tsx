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
  fechaFinPlazo: string | null;
  estado: string;
  capitalDevuelto: string | null;
  deudor: {
    nombre: string;
    telefono: string | null;
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

  // Recarga cada vez que vuelves a esta pestaña (ej. después de crear un préstamo)
  useFocusEffect(
    useCallback(() => {
      cargarPrestamos();
    }, [cargarPrestamos])
  );

  const cambiarFiltro = (nuevo: "todos" | "activos") => {
    if (nuevo === filtro) return;
    setLoading(true);
    setFiltro(nuevo);
  };

  const onRefresh = () => {
    setRefreshing(true);
    cargarPrestamos();
  };

  const contarCuotasVencidas = (cuotas: Cuota[] | undefined) => {
    if (!cuotas || cuotas.length === 0) return 0;
    const hoy = new Date();
    return cuotas.filter((c) => !c.pagado && new Date(c.fechaVencimiento) < hoy).length;
  };

  const formatearMonto = (monto: number) => `$${monto.toLocaleString("es-CO")}`;

  const formatearFecha = (fecha: string) =>
    new Date(fecha).toLocaleDateString("es-CO", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "UTC", // las fechas vienen sin hora; sin esto se corren un día en Colombia
    });

  const renderPrestamo = ({ item }: { item: Prestamo }) => {
    const activo = item.estado === "activo";
    const vencidas = contarCuotasVencidas(item.cuotas);
    const interesMensual = (Number(item.montoCapital) * Number(item.tasaInteres)) / 100;

    // Etiqueta: cerrado (gris), con cuotas vencidas (rojo) o al día (verde)
    let etiqueta = { texto: "Al día", fondo: styles.badgeAlDia, color: styles.badgeTextAlDia };
    if (!activo) {
      etiqueta = { texto: item.estado, fondo: styles.badgeCerrado, color: styles.badgeTextCerrado };
    } else if (vencidas > 0) {
      etiqueta = {
        texto: `${vencidas} vencida${vencidas > 1 ? "s" : ""}`,
        fondo: styles.badgeVencida,
        color: styles.badgeTextVencida,
      };
    }

    return (
      <TouchableOpacity style={styles.card} onPress={() => router.push(`/prestamo/${item.id}`)}>
        <View style={styles.cardHeader}>
          <Text style={styles.nombre}>{item.deudor.nombre}</Text>
          <View style={[styles.badge, etiqueta.fondo]}>
            <Text style={[styles.badgeText, etiqueta.color]}>{etiqueta.texto}</Text>
          </View>
        </View>
        <Text style={styles.detalle}>
          Desde {formatearFecha(item.fechaInicio)}
          {item.fechaFinPlazo ? ` hasta ${formatearFecha(item.fechaFinPlazo)}` : " · Sin fecha fin"}
        </Text>
        <Text style={styles.total}>
          Capital {formatearMonto(Number(item.montoCapital))}
        </Text>
        {item.capitalDevuelto ? (
          <Text style={styles.devuelto}>
            Capital devuelto el {formatearFecha(item.capitalDevuelto)}
            {activo ? " · debe cuotas pendientes" : ""}
          </Text>
        ) : (
          <Text style={styles.detalle}>
            Interés {item.tasaInteres}% · {formatearMonto(interesMensual)} al mes
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.tabsFiltro}>
        <TouchableOpacity
          style={[styles.filtroBtn, filtro === "activos" && styles.filtroBtnActivo]}
          onPress={() => cambiarFiltro("activos")}
        >
          <Text style={[styles.filtroText, filtro === "activos" && styles.filtroTextActivo]}>
            Activos
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filtroBtn, filtro === "todos" && styles.filtroBtnActivo]}
          onPress={() => cambiarFiltro("todos")}
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
            <Text style={styles.vacio}>
              {filtro === "activos" ? "No hay préstamos activos" : "No hay préstamos registrados"}
            </Text>
          }
        />
      )}

      {/* Botón flotante para crear un préstamo */}
      <TouchableOpacity style={styles.fab} onPress={() => router.push("/prestamo/nuevo")}>
        <Ionicons name="add" size={30} color="#fff" />
      </TouchableOpacity>
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
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 12, fontWeight: "600", textTransform: "capitalize" },
  badgeAlDia: { backgroundColor: "#dcfce7" },
  badgeTextAlDia: { color: "#16a34a" },
  badgeVencida: { backgroundColor: "#fee2e2" },
  badgeTextVencida: { color: "#dc2626" },
  badgeCerrado: { backgroundColor: "#f3f4f6" },
  badgeTextCerrado: { color: "#4b5563" },
  detalle: { color: "#666", fontSize: 13, marginTop: 2 },
  total: { fontSize: 18, fontWeight: "bold", color: "#1f2937", marginTop: 8 },
  devuelto: { color: "#b45309", fontSize: 13, marginTop: 2 },
  vacio: { textAlign: "center", marginTop: 40, color: "#999" },
});
