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
import { useLocalSearchParams, Stack, router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "@/services/api";
import { estadoVencimiento } from "@/utils/fechas";

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
  capitalDevuelto: string | null; // fecha en que devolvió el capital
  deudor: {
    nombre: string;
    telefono: string | null;
    direccion: string | null;
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

  // Marca o desmarca una cuota. El backend pone (o borra) la fecha de pago
  const cambiarPago = async (cuotaId: string, pagado: boolean) => {
    setActualizandoCuota(cuotaId);
    try {
      await api(`/api/cuotas/${cuotaId}`, { method: "PUT", body: { pagado } });
      await cargarPrestamo();
    } catch (error) {
      Alert.alert("Error", pagado ? "No se pudo marcar la cuota como pagada" : "No se pudo desmarcar la cuota");
    } finally {
      setActualizandoCuota(null);
    }
  };

  // Para corregir un "Marcar pagada" tocado por error
  const desmarcar = (cuota: Cuota) => {
    Alert.alert(
      "Desmarcar cuota",
      `¿La cuota de ${formatearMonto(cuota.montoInteres)} del ${formatearFecha(cuota.fechaVencimiento)} no estaba pagada? Volverá a quedar pendiente.`,
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Desmarcar", style: "destructive", onPress: () => cambiarPago(cuota.id, false) },
      ]
    );
  };

  // CERRAR: el deudor devolvió el capital
  const cerrar = () => {
    if (!prestamo) return;

    // La de hoy cuenta como pendiente (se debe), no como futura (igual que en el backend)
    const vencidas = prestamo.cuotas.filter((c) => !c.pagado && estadoVencimiento(c.fechaVencimiento) !== "futura");
    const futuras = prestamo.cuotas.filter((c) => !c.pagado && estadoVencimiento(c.fechaVencimiento) === "futura").length;
    const totalVencidas = vencidas.reduce((sum, c) => sum + Number(c.montoInteres), 0);
    // Sin vencidas: "Sus 3 cuotas futuras se eliminarán."
    // Con vencidas: "Su próxima cuota se eliminará." / "Sus próximas cuotas se eliminarán."
    let avisoFuturas = "";
    if (futuras > 0 && vencidas.length === 0) {
      avisoFuturas =
        futuras === 1
          ? "\n\nSu cuota futura se eliminará."
          : `\n\nSus ${futuras} cuotas futuras se eliminarán.`;
    } else if (futuras > 0) {
      avisoFuturas =
        futuras === 1 ? "\n\nSu próxima cuota se eliminará." : "\n\nSus próximas cuotas se eliminarán.";
    }

    const enviar = async (conservarPendientes: boolean) => {
      try {
        const resultado = await api<{ estado: string }>(`/api/prestamos/${prestamo.id}/cerrar`, {
          method: "POST",
          body: { conservarPendientes },
        });
        if (resultado.estado === "pagado") {
          Alert.alert("Préstamo cerrado", "El préstamo quedó pagado.");
        } else {
          Alert.alert(
            "Capital devuelto",
            "El préstamo sigue activo hasta que pague las cuotas pendientes. Al pagar la última se cierra solo."
          );
        }
        await cargarPrestamo();
      } catch (error) {
        Alert.alert("Error", error instanceof Error ? error.message : "No se pudo cerrar el préstamo");
      }
    };

    // Sin cuotas vencidas: solo confirmar
    if (vencidas.length === 0) {
      Alert.alert(
        "Cerrar préstamo",
        `¿Confirmas que ${prestamo.deudor.nombre} devolvió el capital de ${formatearMonto(prestamo.montoCapital)}?${avisoFuturas}`,
        [
          { text: "Cancelar", style: "cancel" },
          { text: "Cerrar préstamo", onPress: () => enviar(false) },
        ]
      );
      return;
    }

    // Con cuotas vencidas: preguntar si se conservan como deuda o se eliminan
    Alert.alert(
      "Tiene cuotas pendientes",
      `${prestamo.deudor.nombre} tiene ${vencidas.length} cuota${vencidas.length > 1 ? "s" : ""} vencida${vencidas.length > 1 ? "s" : ""} sin pagar por ${formatearMonto(String(totalVencidas))}.\n\n¿Quieres conservarlas como deuda o eliminarlas?${avisoFuturas}`,
      [
        { text: "Conservar como deuda", onPress: () => enviar(true) },
        { text: "Eliminarlas", style: "destructive", onPress: () => enviar(false) },
        { text: "Cancelar", style: "cancel" },
      ]
    );
  };

  // ELIMINAR: pensado para préstamos registrados por error. Borra también todas sus cuotas
  const eliminar = () => {
    if (!prestamo) return;

    const pagadas = prestamo.cuotas.filter((c) => c.pagado).length;
    const avisoPagadas =
      pagadas > 0
        ? ` Ya tiene ${pagadas} cuota${pagadas > 1 ? "s" : ""} pagada${pagadas > 1 ? "s" : ""}: ese registro también se perderá.`
        : "";

    Alert.alert(
      "Eliminar préstamo",
      `¿Seguro que quieres eliminar el préstamo de ${formatearMonto(prestamo.montoCapital)} a ${prestamo.deudor.nombre}?\n\nSe borrarán sus ${prestamo.cuotas.length} cuotas.${avisoPagadas}`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              await api(`/api/prestamos/${prestamo.id}`, { method: "DELETE" });
              Alert.alert("Préstamo eliminado", "El préstamo y sus cuotas fueron eliminados.", [
                { text: "OK", onPress: () => router.back() },
              ]);
            } catch (error) {
              Alert.alert("Error", error instanceof Error ? error.message : "No se pudo eliminar");
            }
          },
        },
      ]
    );
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
        <Text style={styles.deudorNombre}>{prestamo.deudor.nombre}</Text>
        <Text style={styles.monto}>{formatearMonto(prestamo.montoCapital)}</Text>
        <Text style={styles.subInfo}>Interés: {prestamo.tasaInteres}%</Text>
        <Text style={styles.subInfo}>Inicio: {formatearFecha(prestamo.fechaInicio)}</Text>
        {prestamo.deudor.telefono && <Text style={styles.subInfo}>Tel: {prestamo.deudor.telefono}</Text>}

        {/* Estado del cierre */}
        {prestamo.estado !== "activo" && (
          <View style={[styles.aviso, styles.avisoCerrado]}>
            <Text style={styles.avisoCerradoTexto}>
              Préstamo cerrado
              {prestamo.capitalDevuelto ? ` · capital devuelto el ${formatearFecha(prestamo.capitalDevuelto)}` : ""}
            </Text>
          </View>
        )}
        {prestamo.estado === "activo" && prestamo.capitalDevuelto && (
          <View style={[styles.aviso, styles.avisoPendiente]}>
            <Text style={styles.avisoPendienteTexto}>
              Capital devuelto el {formatearFecha(prestamo.capitalDevuelto)}. Sigue activo hasta que pague las cuotas
              pendientes.
            </Text>
          </View>
        )}

        <View style={styles.acciones}>
          {prestamo.estado === "activo" && !prestamo.capitalDevuelto && (
            <TouchableOpacity style={styles.botonCerrar} onPress={cerrar}>
              <Text style={styles.botonCerrarTexto}>Cerrar préstamo</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.botonEliminar} onPress={eliminar}>
            <Text style={styles.botonEliminarTexto}>Eliminar</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.seccionTitulo}>Cuotas</Text>

      <FlatList
        data={prestamo.cuotas}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 12 }}
        ListEmptyComponent={<Text style={styles.vacio}>Sin cuotas registradas</Text>}
        renderItem={({ item }) => {
          const estado = estadoVencimiento(item.fechaVencimiento);
          const vencida = !item.pagado && estado === "vencida";
          const venceHoy = !item.pagado && estado === "hoy";
          return (
            <View style={styles.cuotaRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cuotaMonto}>{formatearMonto(item.montoInteres)}</Text>
                <Text style={[styles.cuotaFecha, vencida && styles.textoVencido, venceHoy && styles.textoHoy]}>
                  {venceHoy ? "Vence hoy" : `Vence: ${formatearFecha(item.fechaVencimiento)}`}
                  {vencida && " (vencida)"}
                </Text>
                {item.pagado && item.fechaPago && (
                  <Text style={styles.cuotaFecha}>Pagada el {formatearFecha(item.fechaPago)}</Text>
                )}
              </View>

              {item.pagado ? (
                // Se puede tocar para desmarcar si fue un error
                <TouchableOpacity
                  style={styles.pagadaBadge}
                  onPress={() => desmarcar(item)}
                  disabled={actualizandoCuota === item.id}
                >
                  {actualizandoCuota === item.id ? (
                    <ActivityIndicator color="#16a34a" size="small" />
                  ) : (
                    <Text style={styles.pagadaText}>Pagada ✓</Text>
                  )}
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.pagarBtn}
                  onPress={() => cambiarPago(item.id, true)}
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
  deudorNombre: { fontSize: 16, fontWeight: "600", color: "#333", marginBottom: 2 },
  monto: { fontSize: 26, fontWeight: "bold", color: "#2563eb", marginBottom: 8 },
  acciones: { flexDirection: "row", gap: 10, marginTop: 14 },
  botonCerrar: {
    flex: 2,
    backgroundColor: "#dcfce7",
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  botonCerrarTexto: { color: "#16a34a", fontWeight: "600" },
  botonEliminar: {
    flex: 1,
    backgroundColor: "#fee2e2",
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  botonEliminarTexto: { color: "#dc2626", fontWeight: "600" },
  aviso: { borderRadius: 8, padding: 10, marginTop: 12 },
  avisoCerrado: { backgroundColor: "#f3f4f6" },
  avisoCerradoTexto: { color: "#4b5563", fontWeight: "600" },
  avisoPendiente: { backgroundColor: "#fef3c7" },
  avisoPendienteTexto: { color: "#b45309" },
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
  textoHoy: { color: "#b45309", fontWeight: "600" },
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