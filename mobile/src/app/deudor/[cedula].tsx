import { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useLocalSearchParams, router, Stack, useFocusEffect } from "expo-router";
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
  telefono: string | null;
  direccion: string | null;
  archivado: boolean;
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

  // Recarga cada vez que vuelves a esta pantalla (ej. después de editar)
  useFocusEffect(
    useCallback(() => {
      cargarDeudor();
    }, [cargarDeudor])
  );

  // ARCHIVAR: lo oculta de la lista sin borrar su historial. DESARCHIVAR: lo devuelve a la lista
  const cambiarArchivado = () => {
    if (!deudor) return;

    if (deudor.archivado) {
      api(`/api/deudores/${deudor.id}/archivar`, { method: "PUT", body: { archivado: false } })
        .then(() => {
          Alert.alert("Deudor desarchivado", `${deudor.nombre} volvió a la lista de deudores.`);
          cargarDeudor();
        })
        .catch((error) =>
          Alert.alert("Error", error instanceof Error ? error.message : "No se pudo desarchivar")
        );
      return;
    }

    const activos = deudor.prestamos.filter((p) => p.estado === "activo").length;
    if (activos > 0) {
      Alert.alert(
        "No se puede archivar",
        `${deudor.nombre} tiene ${activos} préstamo${activos > 1 ? "s" : ""} activo${activos > 1 ? "s" : ""}. Solo se archivan deudores sin deudas pendientes.`
      );
      return;
    }

    Alert.alert(
      "Archivar deudor",
      `${deudor.nombre} dejará de aparecer en la lista, pero su historial se conserva. Lo puedes ver en "Archivados".`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Archivar",
          onPress: async () => {
            try {
              await api(`/api/deudores/${deudor.id}/archivar`, { method: "PUT", body: { archivado: true } });
              Alert.alert("Deudor archivado", `${deudor.nombre} fue archivado.`, [
                { text: "OK", onPress: () => router.back() },
              ]);
            } catch (error) {
              Alert.alert("Error", error instanceof Error ? error.message : "No se pudo archivar");
            }
          },
        },
      ]
    );
  };

  const eliminar = () => {
    if (!deudor) return;

    const activos = deudor.prestamos.filter((p) => p.estado === "activo").length;
    const cerrados = deudor.prestamos.length - activos;

    // Con préstamos activos no se puede borrar: se perdería plata que aún le deben
    if (activos > 0) {
      Alert.alert(
        "No se puede eliminar",
        `${deudor.nombre} tiene ${activos} préstamo${activos > 1 ? "s" : ""} activo${activos > 1 ? "s" : ""}. Elimínalo${activos > 1 ? "s" : ""} primero.`
      );
      return;
    }

    // La BD borra en cascada, así que se avisa que el historial de préstamos cerrados también se va
    const aviso =
      cerrados > 0
        ? `\n\nTambién se borrarán sus ${cerrados} préstamo${cerrados > 1 ? "s" : ""} ya cerrado${cerrados > 1 ? "s" : ""} y su historial de cuotas.`
        : "";

    Alert.alert(
      "Eliminar deudor",
      `${deudor.nombre} no tiene préstamos activos. ¿Seguro que quieres eliminarlo?${aviso}`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              await api(`/api/deudores/${deudor.id}`, { method: "DELETE" });
              Alert.alert("Deudor eliminado", `${deudor.nombre} fue eliminado.`, [
                { text: "OK", onPress: () => router.back() },
              ]);
          } catch (error) {
            const message = error instanceof Error ? error.message : "No se pudo eliminar";
            Alert.alert("Error", message);
          }
        },
      },
    ]);
  };

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
        {deudor.archivado && (
          <View style={styles.badgeArchivado}>
            <Text style={styles.badgeArchivadoTexto}>Archivado</Text>
          </View>
        )}
        <Text style={styles.subInfo}>Cédula: {deudor.cedula}</Text>
        {deudor.telefono && <Text style={styles.subInfo}>Tel: {deudor.telefono}</Text>}
        {deudor.direccion && <Text style={styles.subInfo}>{deudor.direccion}</Text>}

        <View style={styles.acciones}>
          <TouchableOpacity
            style={styles.botonEditar}
            onPress={() => router.push({ pathname: "/deudor/editar", params: { cedula: deudor.cedula } })}
          >
            <Text style={styles.botonEditarTexto}>Editar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.botonArchivar} onPress={cambiarArchivado}>
            <Text style={styles.botonArchivarTexto}>
              {deudor.archivado ? "Desarchivar" : "Archivar"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.botonEliminar} onPress={eliminar}>
            <Text style={styles.botonEliminarTexto}>Eliminar</Text>
          </TouchableOpacity>
        </View>
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
  acciones: { flexDirection: "row", gap: 10, marginTop: 14 },
  botonEditar: {
    flex: 1,
    backgroundColor: "#dbeafe",
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  botonEditarTexto: { color: "#2563eb", fontWeight: "600" },
  botonArchivar: {
    flex: 1,
    backgroundColor: "#f3f4f6",
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  botonArchivarTexto: { color: "#4b5563", fontWeight: "600" },
  badgeArchivado: {
    alignSelf: "flex-start",
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 4,
  },
  badgeArchivadoTexto: { color: "#4b5563", fontSize: 12, fontWeight: "600" },
  botonEliminar: {
    flex: 1,
    backgroundColor: "#fee2e2",
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  botonEliminarTexto: { color: "#dc2626", fontWeight: "600" },
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