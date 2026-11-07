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
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "@/services/api";
import { estadoVencimiento, estadoPlazo } from "@/utils/fechas";
import Filtro from "@/components/filtro";
import { useTema } from "@/theme/tema";
import { Colores } from "@/theme/colores";
import { useBarraClara } from "@/theme/barra-estado";
import { numerosMontos } from "@/theme/fuentes";
import { iniciales } from "@/utils/texto";

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
  const { colores } = useTema();
  const styles = useMemo(() => crearEstilos(colores), [colores]);
  useBarraClara();

  const [prestamos, setPrestamos] = useState<Prestamo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filtro, setFiltro] = useState<"activos" | "pagados">("activos");

  const cargarPrestamos = useCallback(async () => {
    try {
      const userId = await SecureStore.getItemAsync("userId");

      const endpoint =
        filtro === "activos"
          ? `/api/prestamosactivos/usuario/${userId}`
          : `/api/prestamos/usuario/${userId}`;

      const data = await api<Prestamo[]>(endpoint);
      // "Pagados": solo los que ya se cerraron
      setPrestamos(filtro === "activos" ? data : data.filter((p) => p.estado !== "activo"));
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

  const cambiarFiltro = (nuevo: "activos" | "pagados") => {
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
    return cuotas.filter((c) => !c.pagado && estadoVencimiento(c.fechaVencimiento) === "vencida").length;
  };

  const formatearMonto = (monto: number) => `$${Math.round(monto).toLocaleString("es-CO")}`;

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

    const plazo = estadoPlazo(item);

    // Etiqueta: cerrado (gris), plazo vencido o que termina hoy (rojo), con cuotas vencidas (rojo) o al día (verde)
    let etiqueta = { texto: "Al día", fondo: styles.badgeAlDia, color: styles.badgeTextAlDia };
    if (!activo) {
      const estado = item.estado.charAt(0).toUpperCase() + item.estado.slice(1); // "pagado" -> "Pagado"
      etiqueta = { texto: estado, fondo: styles.badgeCerrado, color: styles.badgeTextCerrado };
    } else if (plazo === "vencido" || plazo === "hoy") {
      etiqueta = {
        texto: plazo === "vencido" ? "Plazo vencido" : "Plazo termina hoy",
        fondo: styles.badgeVencida,
        color: styles.badgeTextVencida,
      };
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
          <View style={styles.avatar}>
            <Text style={styles.avatarTexto}>{iniciales(item.deudor.nombre)}</Text>
          </View>
          <Text style={styles.nombre} numberOfLines={1}>
            {item.deudor.nombre}
          </Text>
          <View style={[styles.badge, etiqueta.fondo]}>
            <Text style={[styles.badgeText, etiqueta.color]}>{etiqueta.texto}</Text>
          </View>
        </View>

        <Text style={styles.total}>{formatearMonto(Number(item.montoCapital))}</Text>
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

        <Text style={styles.plazoTexto}>
          Desde {formatearFecha(item.fechaInicio)}
          {item.fechaFinPlazo ? ` hasta ${formatearFecha(item.fechaFinPlazo)}` : " · Sin fecha fin"}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Banda oscura: solo el título */}
      <View style={styles.banda}>
        <Text style={styles.titulo}>Préstamos</Text>
      </View>

      {/* Hoja redondeada con el selector y la lista */}
      <View style={styles.hoja}>
        <Filtro
          opciones={[
            { valor: "activos", texto: "Activos" },
            { valor: "pagados", texto: "Pagados" },
          ]}
          seleccionado={filtro}
          onCambio={cambiarFiltro}
        />

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
                {filtro === "activos" ? "No hay préstamos activos" : "Todavía no hay préstamos pagados"}
              </Text>
            }
            ListFooterComponent={
              filtro === "activos" ? (
                <TouchableOpacity style={styles.botonNuevo} onPress={() => router.push("/prestamo/nuevo")}>
                  <Ionicons name="add" size={22} color={colores.texto} />
                  <Text style={styles.botonNuevoTexto}>Nuevo préstamo</Text>
                </TouchableOpacity>
              ) : undefined
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
    banda: { alignItems: "center", paddingTop: 12, paddingBottom: 34, paddingHorizontal: 16 },
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

    card: {
      backgroundColor: c.tarjeta,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.separador,
      padding: 16,
      marginBottom: 12,
    },
    cardHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
    avatar: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: c.neutroSuave,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarTexto: { fontSize: 14, fontWeight: "bold", color: c.texto },
    nombre: { flex: 1, fontSize: 16, fontWeight: "bold", color: c.texto },
    badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    badgeText: { fontSize: 12, fontWeight: "600" },
    badgeAlDia: { backgroundColor: c.exitoSuave },
    badgeTextAlDia: { color: c.exito },
    badgeVencida: { backgroundColor: c.peligroSuave },
    badgeTextVencida: { color: c.peligro },
    badgeCerrado: { backgroundColor: c.neutroSuave },
    badgeTextCerrado: { color: c.neutro },

    total: { fontSize: 20, fontWeight: "bold", fontVariant: numerosMontos, color: c.texto, marginTop: 12 },
    detalle: { color: c.textoSecundario, fontSize: 13, marginTop: 2 },
    devuelto: { color: c.aviso, fontSize: 13, marginTop: 2 },

    plazoTexto: { fontSize: 12, color: c.textoTenue, marginTop: 8 },

    // BOTON PUNTEADO "+ NUEVO PRESTAMO"
    botonNuevo: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      borderWidth: 1.5,
      borderStyle: "dashed",
      borderColor: c.borde,
      borderRadius: 16,
      paddingVertical: 18,
      marginTop: 4,
    },
    botonNuevoTexto: { fontSize: 15, fontWeight: "600", color: c.texto },

    vacio: { textAlign: "center", marginTop: 40, marginBottom: 20, color: c.textoTenue },
  });
