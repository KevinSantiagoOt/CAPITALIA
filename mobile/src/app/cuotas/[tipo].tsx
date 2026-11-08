import { useState, useCallback, useMemo } from "react";
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
import { useLocalSearchParams, router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "@/services/api";
import { estadoVencimiento, diasHasta } from "@/utils/fechas";
import { iniciales } from "@/utils/texto";
import { useTema } from "@/theme/tema";
import { Colores } from "@/theme/colores";
import { useBarraClara } from "@/theme/barra-estado";
import { numerosMontos } from "@/theme/fuentes";

type Cuota = {
  id: string;
  montoInteres: string;
  fechaVencimiento: string;
  prestamoId: string;
  prestamo?: { deudor?: { nombre: string } };
};

const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

// LISTA DE CUOTAS QUE SE ABRE DESDE LAS TARJETAS DE INICIO
//  /cuotas/vencidas:   las que ya vencieron sin pagar
//  /cuotas/por-cobrar: las que vencen de hoy al fin de mes
export default function CuotasScreen() {
  const { colores } = useTema();
  const styles = useMemo(() => crearEstilos(colores), [colores]);
  useBarraClara();

  const { tipo } = useLocalSearchParams<{ tipo: string }>();
  const esVencidas = tipo === "vencidas";

  const [cuotas, setCuotas] = useState<Cuota[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const userId = await SecureStore.getItemAsync("userId");
      const ruta = esVencidas ? "vencidas" : "vencenpronto";
      const data = await api<Cuota[]>(`/api/cuotas/prestamo/${userId}/${ruta}`);
      // Las vencidas, de la más vieja a la más reciente; las por cobrar, de la más próxima a la más lejana
      data.sort((a, b) => a.fechaVencimiento.localeCompare(b.fechaVencimiento));
      setCuotas(data);
    } catch (error) {
      console.log("Error cargando cuotas:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [esVencidas]);

  // Recarga al volver (ej. después de marcar una cuota como pagada en el detalle)
  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar])
  );

  const formatearMonto = (monto: number) => `$${Math.round(monto).toLocaleString("es-CO")}`;

  const formatearFecha = (fecha: string) =>
    new Date(fecha).toLocaleDateString("es-CO", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "UTC", // las fechas vienen sin hora; sin esto se corren un día en Colombia
    });

  const total = cuotas.reduce((sum, c) => sum + Number(c.montoInteres), 0);
  const titulo = esVencidas ? "Cuotas vencidas" : `Por cobrar en ${MESES[new Date().getMonth()]}`;
  const color = esVencidas ? colores.peligro : colores.aviso;

  const renderCuota = ({ item }: { item: Cuota }) => {
    const nombre = item.prestamo?.deudor?.nombre ?? "Deudor";
    const dias = diasHasta(item.fechaVencimiento);

    // Vencidas: cuánto lleva atrasada. Por cobrar: "Vence hoy" o la fecha
    let fecha = `Vence el ${formatearFecha(item.fechaVencimiento)}`;
    if (esVencidas) {
      fecha = `Venció el ${formatearFecha(item.fechaVencimiento)} · hace ${-dias} día${dias !== -1 ? "s" : ""}`;
    } else if (estadoVencimiento(item.fechaVencimiento) === "hoy") {
      fecha = "Vence hoy";
    }

    return (
      <TouchableOpacity style={styles.card} onPress={() => router.push(`/prestamo/${item.prestamoId}`)}>
        <View style={styles.avatar}>
          <Text style={styles.avatarTexto}>{iniciales(nombre)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.nombre} numberOfLines={1}>
            {nombre}
          </Text>
          <Text style={[styles.fecha, { color }]}>{fecha}</Text>
        </View>
        <Text style={styles.monto}>{formatearMonto(Number(item.montoInteres))}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Banda oscura: flecha para volver y título */}
      <View style={styles.banda}>
        <TouchableOpacity style={styles.atras} onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={colores.sobreBanda} />
        </TouchableOpacity>
        <Text style={styles.titulo}>{titulo}</Text>
      </View>

      <View style={styles.hoja}>
        {loading ? (
          <ActivityIndicator size="large" style={{ marginTop: 40 }} />
        ) : (
          <FlatList
            data={cuotas}
            keyExtractor={(item) => item.id}
            renderItem={renderCuota}
            contentContainerStyle={styles.lista}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); cargar(); }} />}
            ListHeaderComponent={
              cuotas.length > 0 ? (
                <View style={styles.resumen}>
                  <Text style={styles.resumenLabel}>Total</Text>
                  <Text style={[styles.resumenMonto, { color }]}>{formatearMonto(total)}</Text>
                  <Text style={styles.resumenDetalle}>
                    {cuotas.length} cuota{cuotas.length !== 1 ? "s" : ""}
                  </Text>
                </View>
              ) : undefined
            }
            ListEmptyComponent={
              <Text style={styles.vacio}>
                {esVencidas ? "No hay cuotas vencidas" : "No hay cuotas por cobrar este mes"}
              </Text>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const crearEstilos = (c: Colores) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.banda },

    // BANDA OSCURA
    banda: {
      alignItems: "center",
      justifyContent: "center",
      paddingTop: 12,
      paddingBottom: 34,
      paddingHorizontal: 56, // espacio para la flecha
      minHeight: 70,
    },
    atras: { position: "absolute", left: 16, top: 10 },
    titulo: { fontSize: 17, fontWeight: "bold", color: c.sobreBanda },

    // HOJA
    hoja: {
      flex: 1,
      backgroundColor: c.hoja,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      marginTop: -20,
      overflow: "hidden",
    },
    lista: { padding: 16, paddingBottom: 32 },

    // RESUMEN
    resumen: { alignItems: "center", marginTop: 8, marginBottom: 20 },
    resumenLabel: { fontSize: 13, color: c.textoSecundario },
    resumenMonto: { fontSize: 32, fontWeight: "bold", fontVariant: numerosMontos, marginTop: 2 },
    resumenDetalle: { fontSize: 13, color: c.textoTenue, marginTop: 2 },

    // CUOTAS
    card: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      backgroundColor: c.tarjeta,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.separador,
      padding: 14,
      marginBottom: 10,
    },
    avatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: c.neutroSuave,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarTexto: { fontSize: 14, fontWeight: "bold", color: c.texto },
    nombre: { fontSize: 16, fontWeight: "bold", color: c.texto },
    fecha: { fontSize: 13, fontWeight: "600", marginTop: 2 },
    monto: { fontSize: 16, fontWeight: "bold", fontVariant: numerosMontos, color: c.texto },

    vacio: { textAlign: "center", marginTop: 40, color: c.textoTenue },
  });
