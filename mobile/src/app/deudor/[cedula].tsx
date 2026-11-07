import { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useLocalSearchParams, router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "@/services/api";
import { useTema } from "@/theme/tema";
import { Colores } from "@/theme/colores";
import { useBarraClara } from "@/theme/barra-estado";
import { numerosMontos } from "@/theme/fuentes";
import { iniciales } from "@/utils/texto";

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
  const { colores } = useTema();
  const styles = useMemo(() => crearEstilos(colores), [colores]);
  useBarraClara();

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
      timeZone: "UTC", // las fechas vienen sin hora; sin esto se corren un día en Colombia
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <ActivityIndicator size="large" color={colores.sobreBanda} style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  if (!deudor) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.banda}>
          <TouchableOpacity style={styles.atras} onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="arrow-back" size={24} color={colores.sobreBanda} />
          </TouchableOpacity>
        </View>
        <View style={[styles.hoja, styles.centrado]}>
          <Text style={{ color: colores.texto }}>No se encontró el deudor</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Fondo de la hoja en la mitad de abajo: al estirar la lista hacia arriba no asoma la banda negra */}
      <View style={styles.fondoInferior} />

      {/* Banda oscura: flecha para volver y título */}
      <View style={styles.banda}>
        <TouchableOpacity style={styles.atras} onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={colores.sobreBanda} />
        </TouchableOpacity>
        <Text style={styles.titulo}>Deudor</Text>
      </View>

      <ScrollView style={styles.hoja} contentContainerStyle={styles.hojaContenido}>
        {/* Encabezado: círculo con iniciales y nombre */}
        <View style={styles.perfil}>
          <View style={styles.avatar}>
            <Text style={styles.avatarTexto}>{iniciales(deudor.nombre)}</Text>
          </View>
          <Text style={styles.nombre}>{deudor.nombre}</Text>
          {deudor.archivado && (
            <View style={styles.badgeArchivado}>
              <Text style={styles.badgeArchivadoTexto}>Archivado</Text>
            </View>
          )}
        </View>

        {/* Datos del deudor */}
        <View style={styles.datos}>
          <View style={styles.dato}>
            <Text style={styles.datoLabel}>Cédula</Text>
            <Text style={styles.datoValor}>{deudor.cedula}</Text>
          </View>
          <View style={styles.dato}>
            <Text style={styles.datoLabel}>Teléfono</Text>
            <Text style={styles.datoValor}>{deudor.telefono || "Sin teléfono"}</Text>
          </View>
          {deudor.direccion && (
            <View style={[styles.dato, styles.datoCompleto]}>
              <Text style={styles.datoLabel}>Dirección</Text>
              <Text style={styles.datoValor}>{deudor.direccion}</Text>
            </View>
          )}
        </View>

        <View style={styles.acciones}>
          <TouchableOpacity
            style={styles.botonEditar}
            onPress={() => router.push({ pathname: "/deudor/editar", params: { cedula: deudor.cedula } })}
          >
            <Text style={styles.botonEditarTexto}>Editar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.botonArchivar} onPress={cambiarArchivado}>
            <Text style={styles.botonArchivarTexto}>{deudor.archivado ? "Desarchivar" : "Archivar"}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.botonEliminar} onPress={eliminar}>
            <Text style={styles.botonEliminarTexto}>Eliminar</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.seccionTitulo}>Préstamos</Text>

        {deudor.prestamos.length === 0 && <Text style={styles.vacio}>Sin préstamos registrados</Text>}

        {deudor.prestamos.map((item) => {
          const activo = item.estado === "activo";
          const interesMensual = (Number(item.montoCapital) * Number(item.tasaInteres)) / 100;
          return (
            <TouchableOpacity
              key={item.id}
              style={styles.prestamoCard}
              onPress={() => router.push(`/prestamo/${item.id}`)}
            >
              <View style={styles.prestamoFila}>
                <Text style={styles.monto}>{formatearMonto(item.montoCapital)}</Text>
                <View style={[styles.badge, activo ? styles.badgeActivo : styles.badgeCerrado]}>
                  <Text style={[styles.badgeTexto, activo ? styles.badgeTextoActivo : styles.badgeTextoCerrado]}>
                    {item.estado.charAt(0).toUpperCase() + item.estado.slice(1)}
                  </Text>
                </View>
              </View>
              <Text style={styles.detalle}>
                Interés {item.tasaInteres}% · {formatearMonto(String(interesMensual))} al mes
              </Text>
              <Text style={styles.fechas}>
                Desde {formatearFecha(item.fechaInicio)}
                {item.fechaFinPlazo ? ` hasta ${formatearFecha(item.fechaFinPlazo)}` : " · Sin fecha fin"}
              </Text>
            </TouchableOpacity>
          );
        })}

        <TouchableOpacity
          style={styles.botonNuevo}
          onPress={() =>
            router.push({
              pathname: "/prestamo/nuevo",
              params: { deudorId: deudor.id, deudorNombre: deudor.nombre },
            })
          }
        >
          <Ionicons name="add" size={22} color={colores.texto} />
          <Text style={styles.botonNuevoTexto}>Nuevo préstamo</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const crearEstilos = (c: Colores) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.banda },
  centrado: { justifyContent: "center", alignItems: "center" },
  fondoInferior: { position: "absolute", left: 0, right: 0, bottom: 0, height: "50%", backgroundColor: c.hoja },

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
  },
  hojaContenido: { padding: 16, paddingBottom: 40 },

  // PERFIL
  perfil: { alignItems: "center", marginTop: 8 },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: c.destacada,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarTexto: { fontSize: 26, fontWeight: "bold", color: c.sobreBanda },
  nombre: { fontSize: 22, fontWeight: "bold", color: c.texto, marginTop: 12, textAlign: "center" },
  badgeArchivado: {
    backgroundColor: c.neutroSuave,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 6,
  },
  badgeArchivadoTexto: { color: c.neutro, fontSize: 12, fontWeight: "600" },

  // DATOS
  datos: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 20,
    backgroundColor: c.tarjeta,
    borderWidth: 1,
    borderColor: c.separador,
    borderRadius: 16,
    padding: 14,
  },
  dato: { flexGrow: 1, minWidth: "40%" },
  datoCompleto: { minWidth: "100%" },
  datoLabel: { fontSize: 12, color: c.textoTenue },
  datoValor: { fontSize: 14, fontWeight: "600", color: c.texto, marginTop: 2 },

  // BOTONES
  acciones: { flexDirection: "row", gap: 10, marginTop: 16, marginBottom: 20 },
  botonEditar: { flex: 1, backgroundColor: c.primarioSuave, padding: 12, borderRadius: 12, alignItems: "center" },
  botonEditarTexto: { color: c.primario, fontWeight: "600" },
  botonArchivar: { flex: 1, backgroundColor: c.neutroSuave, padding: 12, borderRadius: 12, alignItems: "center" },
  botonArchivarTexto: { color: c.neutro, fontWeight: "600" },
  botonEliminar: { flex: 1, backgroundColor: c.peligroSuave, padding: 12, borderRadius: 12, alignItems: "center" },
  botonEliminarTexto: { color: c.peligro, fontWeight: "600" },

  // PRESTAMOS
  seccionTitulo: { fontSize: 18, fontWeight: "bold", color: c.texto, marginBottom: 10 },
  vacio: { textAlign: "center", color: c.textoTenue, marginVertical: 16 },
  prestamoCard: {
    backgroundColor: c.tarjeta,
    borderWidth: 1,
    borderColor: c.separador,
    padding: 16,
    borderRadius: 16,
    marginBottom: 10,
  },
  prestamoFila: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  monto: { fontSize: 20, fontWeight: "bold", fontVariant: numerosMontos, color: c.texto },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  badgeTexto: { fontSize: 12, fontWeight: "600" },
  badgeActivo: { backgroundColor: c.exitoSuave },
  badgeTextoActivo: { color: c.exito },
  badgeCerrado: { backgroundColor: c.neutroSuave },
  badgeTextoCerrado: { color: c.neutro },
  detalle: { fontSize: 13, color: c.textoSecundario, marginTop: 4 },
  fechas: { fontSize: 12, color: c.textoTenue, marginTop: 8 },

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
});
