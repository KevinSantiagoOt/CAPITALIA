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
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "@/services/api";


type PrestamoResumen = {
  id: string;
  montoCapital: string;
  estado: string;
};

type Deudor = {
  id: string;
  nombre: string;
  cedula: string;
  telefono: string;
  direccion: string;
  prestamos: PrestamoResumen[];
};

export default function DeudoresScreen() {
  const [deudores, setDeudores] = useState<Deudor[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const cargarDeudores = useCallback(async () => {
    try {
      const userId = await SecureStore.getItemAsync("userId");
      const data = await api<Deudor[]>(`/api/alldeudores/${userId}`);
      setDeudores(data);
    } catch (error) {
      console.log("Error cargando deudores:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    cargarDeudores();
  }, [cargarDeudores]);

  const onRefresh = () => {
    setRefreshing(true);
    cargarDeudores();
  };

  const totalPrestado = (prestamos: PrestamoResumen[]) => {
    return prestamos.reduce((sum, p) => sum + Number(p.montoCapital), 0);
  };

  const formatearMonto = (monto: number) => `$${monto.toLocaleString("es-CO")}`;

  const renderDeudor = ({ item }: { item: Deudor }) => {
    const activos = item.prestamos.filter((p) => p.estado === "activo").length;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push(`/deudor/${item.cedula}`)}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.nombre}>{item.nombre}</Text>
          {activos > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {activos} préstamo{activos > 1 ? "s" : ""}
              </Text>
            </View>
          )}
        </View>
        <Text style={styles.detalle}>Cédula: {item.cedula}</Text>
        <Text style={styles.detalle}>Tel: {item.telefono}</Text>
        <Text style={styles.total}>{formatearMonto(totalPrestado(item.prestamos))}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {loading ? (
        <ActivityIndicator size="large" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={deudores}
          keyExtractor={(item) => item.id}
          renderItem={renderDeudor}
          contentContainerStyle={styles.lista}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={<Text style={styles.vacio}>No hay deudores registrados</Text>}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
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
    marginBottom: 6,
  },
  nombre: { fontSize: 16, fontWeight: "bold" },
  badge: {
    backgroundColor: "#dbeafe",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: { color: "#2563eb", fontSize: 12, fontWeight: "600" },
  detalle: { color: "#666", fontSize: 13, marginTop: 2 },
  total: { fontSize: 18, fontWeight: "bold", color: "#16a34a", marginTop: 8 },
  vacio: { textAlign: "center", marginTop: 40, color: "#999" },
});