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
import { estadoVencimiento, estadoPlazo, diasHasta } from "@/utils/fechas";
import Letras, { Documento } from "@/components/letras";

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
  fechaFinPlazo: string | null;
  capitalDevuelto: string | null; // fecha en que devolvió el capital
  deudor: {
    nombre: string;
  };
  cuotas: Cuota[];
  documentos: Documento[];
};

export default function DetallePrestamoScreen() {
  const { colores } = useTema();
  const styles = useMemo(() => crearEstilos(colores), [colores]);
  useBarraClara();

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

  // Recarga cada vez que vuelves a esta pantalla (ej. después de editar)
  useFocusEffect(
    useCallback(() => {
      cargarPrestamo();
    }, [cargarPrestamo])
  );

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

  // EXTENDER EL PLAZO: corre la fecha fin y se crean las cuotas de los meses nuevos
  const extender = () => {
    if (!prestamo) return;

    const enviar = async (body: { meses?: number; sinFecha?: boolean }) => {
      try {
        await api(`/api/prestamos/${prestamo.id}/extender`, { method: "POST", body });
        Alert.alert("Plazo extendido");
        await cargarPrestamo();
      } catch (error) {
        Alert.alert("Error", error instanceof Error ? error.message : "No se pudo extender el plazo");
      }
    };

    Alert.alert("Extender el plazo", "¿Cuánto tiempo más?", [
      { text: "1 mes más", onPress: () => enviar({ meses: 1 }) },
      { text: "3 meses más", onPress: () => enviar({ meses: 3 }) },
      { text: "6 meses más", onPress: () => enviar({ meses: 6 }) },
      { text: "Sin fecha fin", onPress: () => enviar({ sinFecha: true }) },
      { text: "Cancelar", style: "cancel" },
    ]);
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
      <SafeAreaView style={styles.container} edges={["top"]}>
        <ActivityIndicator size="large" color={colores.sobreBanda} style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  if (!prestamo) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.banda}>
          <TouchableOpacity style={styles.atras} onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="arrow-back" size={24} color={colores.sobreBanda} />
          </TouchableOpacity>
        </View>
        <View style={[styles.hoja, styles.centrado]}>
          <Text style={{ color: colores.texto }}>No se encontró el préstamo</Text>
        </View>
      </SafeAreaView>
    );
  }

  const plazo = estadoPlazo(prestamo);
  const interesMensual = (Number(prestamo.montoCapital) * Number(prestamo.tasaInteres)) / 100;
  const pagadas = prestamo.cuotas.filter((c) => c.pagado).length;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Fondo de la hoja en la mitad de abajo: al estirar la lista hacia arriba no asoma la banda negra */}
      <View style={styles.fondoInferior} />

      {/* Banda oscura: flecha para volver y nombre del deudor */}
      <View style={styles.banda}>
        <TouchableOpacity style={styles.atras} onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={colores.sobreBanda} />
        </TouchableOpacity>
        <Text style={styles.titulo} numberOfLines={1}>
          {prestamo.deudor.nombre}
        </Text>
      </View>

      <ScrollView style={styles.hoja} contentContainerStyle={styles.hojaContenido}>
        {/* Tarjeta oscura: capital en grande y el interés que deja cada mes */}
        <View style={styles.destacada}>
          <Text style={styles.destacadaLabel}>Capital prestado</Text>
          <Text style={styles.destacadaMonto} numberOfLines={1} adjustsFontSizeToFit>
            {formatearMonto(prestamo.montoCapital)}
          </Text>
          <Text style={styles.destacadaInteres}>
            {formatearMonto(String(interesMensual))} de interés al mes ({prestamo.tasaInteres}%)
          </Text>
        </View>

        {/* Datos del préstamo */}
        <View style={styles.datos}>
          <View style={styles.dato}>
            <Text style={styles.datoLabel}>Inicio</Text>
            <Text style={styles.datoValor}>{formatearFecha(prestamo.fechaInicio)}</Text>
          </View>
          <View style={styles.dato}>
            <Text style={styles.datoLabel}>Fin del plazo</Text>
            <Text style={styles.datoValor}>
              {prestamo.fechaFinPlazo ? formatearFecha(prestamo.fechaFinPlazo) : "Sin fecha fin"}
            </Text>
          </View>
        </View>

        {/* Plazo vencido o que termina hoy: hay que decidir qué pasó con el capital */}
        {(plazo === "vencido" || plazo === "hoy") && (
          <View style={[styles.aviso, styles.avisoPlazo]}>
            <Text style={styles.avisoPlazoTitulo}>
              {plazo === "hoy"
                ? "El plazo termina hoy."
                : `El plazo terminó el ${formatearFecha(prestamo.fechaFinPlazo!)}.`}
            </Text>
            <Text style={styles.avisoPlazoTexto}>
              ¿Qué pasó con el capital de {formatearMonto(prestamo.montoCapital)}?
            </Text>
            <TouchableOpacity style={styles.botonDevolvio} onPress={cerrar}>
              <Text style={styles.botonDevolvioTexto}>Devolvió el capital</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.botonExtender} onPress={extender}>
              <Text style={styles.botonExtenderTexto}>Extender el plazo</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Aviso previo: faltan 30 días o menos */}
        {plazo === "pronto" && (
          <View style={[styles.aviso, styles.avisoPendiente]}>
            <Text style={styles.avisoPendienteTexto}>
              El plazo termina el {formatearFecha(prestamo.fechaFinPlazo!)} (en {diasHasta(prestamo.fechaFinPlazo!)} día
              {diasHasta(prestamo.fechaFinPlazo!) !== 1 ? "s" : ""}).
            </Text>
          </View>
        )}

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
          {/* Editar y cerrar solo mientras el préstamo sigue corriendo */}
          {prestamo.estado === "activo" && !prestamo.capitalDevuelto && (
            <>
              <TouchableOpacity
                style={styles.botonEditar}
                onPress={() => router.push({ pathname: "/prestamo/editar", params: { id: prestamo.id } })}
              >
                <Text style={styles.botonEditarTexto}>Editar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.botonCerrar} onPress={cerrar}>
                <Text style={styles.botonCerrarTexto}>Cerrar préstamo</Text>
              </TouchableOpacity>
            </>
          )}
          <TouchableOpacity style={styles.botonEliminar} onPress={eliminar}>
            <Text style={styles.botonEliminarTexto}>Eliminar</Text>
          </TouchableOpacity>
        </View>

        <Letras prestamoId={prestamo.id} documentos={prestamo.documentos} onCambio={cargarPrestamo} />

        <View style={styles.seccionFila}>
          <Text style={styles.seccionTitulo}>Cuotas</Text>
          {prestamo.cuotas.length > 0 && (
            <Text style={styles.seccionDetalle}>
              {pagadas} de {prestamo.cuotas.length} pagada{prestamo.cuotas.length !== 1 ? "s" : ""}
            </Text>
          )}
        </View>

        {prestamo.cuotas.length === 0 && <Text style={styles.vacio}>Sin cuotas registradas</Text>}

        {prestamo.cuotas.map((item) => {
          const estado = estadoVencimiento(item.fechaVencimiento);
          const vencida = !item.pagado && estado === "vencida";
          const venceHoy = !item.pagado && estado === "hoy";
          const cargando = actualizandoCuota === item.id;

          // Círculo según el estado: pagada verde, vencida roja, vence hoy amarilla, futura gris
          const circulo = item.pagado
            ? { icono: "checkmark" as const, color: colores.exito, fondo: colores.exitoSuave }
            : vencida
              ? { icono: "alert" as const, color: colores.peligro, fondo: colores.peligroSuave }
              : venceHoy
                ? { icono: "time-outline" as const, color: colores.aviso, fondo: colores.avisoSuave }
                : { icono: "calendar-outline" as const, color: colores.neutro, fondo: colores.neutroSuave };

          return (
            <View key={item.id} style={styles.cuotaRow}>
              <View style={[styles.cuotaCirculo, { backgroundColor: circulo.fondo }]}>
                <Ionicons name={circulo.icono} size={20} color={circulo.color} />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.cuotaMonto}>{formatearMonto(item.montoInteres)}</Text>
                <Text style={[styles.cuotaFecha, vencida && styles.textoVencido, venceHoy && styles.textoHoy]}>
                  {item.pagado && item.fechaPago
                    ? `Pagada el ${formatearFecha(item.fechaPago)}`
                    : venceHoy
                      ? "Vence hoy"
                      : `${vencida ? "Venció" : "Vence"} el ${formatearFecha(item.fechaVencimiento)}`}
                </Text>
              </View>

              {/* A la derecha: "Marcar" si falta pagarla, "Pagada" si ya se pagó (se toca para desmarcar) */}
              {cargando ? (
                <ActivityIndicator size="small" color={colores.primario} />
              ) : item.pagado ? (
                <TouchableOpacity onPress={() => desmarcar(item)} hitSlop={10}>
                  <Text style={styles.accionPagada}>Pagada</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity onPress={() => cambiarPago(item.id, true)} hitSlop={10}>
                  <Text style={styles.accionMarcar}>Marcar</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}
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

  // TARJETA OSCURA
  destacada: {
    backgroundColor: c.destacada,
    borderRadius: 20,
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  destacadaLabel: { fontSize: 13, color: c.sobreBandaTenue },
  destacadaMonto: { fontSize: 34, fontWeight: "bold", fontVariant: numerosMontos, color: c.sobreBanda, marginTop: 4 },
  // Verde claro fijo: la tarjeta es oscura en los dos modos
  destacadaInteres: { fontSize: 13, fontWeight: "600", color: "#4ade80", marginTop: 6 },

  // DATOS
  datos: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 16 },
  dato: { flexGrow: 1, minWidth: "28%" },
  datoLabel: { fontSize: 12, color: c.textoTenue },
  datoValor: { fontSize: 14, fontWeight: "600", color: c.texto, marginTop: 2 },

  // AVISOS
  aviso: { borderRadius: 12, padding: 12, marginTop: 14 },
  avisoCerrado: { backgroundColor: c.neutroSuave },
  avisoCerradoTexto: { color: c.neutro, fontWeight: "600" },
  avisoPendiente: { backgroundColor: c.avisoSuave },
  avisoPendienteTexto: { color: c.aviso },
  avisoPlazo: { backgroundColor: c.peligroSuave, padding: 14 },
  avisoPlazoTitulo: { color: c.peligro, fontWeight: "bold", fontSize: 15 },
  avisoPlazoTexto: { color: c.texto, marginTop: 4, marginBottom: 12 },
  botonDevolvio: { backgroundColor: c.exito, padding: 12, borderRadius: 10, alignItems: "center" },
  botonDevolvioTexto: { color: c.sobrePrimario, fontWeight: "bold" },
  botonExtender: {
    backgroundColor: c.tarjeta,
    borderWidth: 1,
    borderColor: c.primario,
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 8,
  },
  botonExtenderTexto: { color: c.primario, fontWeight: "bold" },

  // BOTONES
  acciones: { flexDirection: "row", gap: 10, marginTop: 16, marginBottom: 20 },
  botonEditar: { flex: 1, backgroundColor: c.primarioSuave, padding: 12, borderRadius: 12, alignItems: "center" },
  botonEditarTexto: { color: c.primario, fontWeight: "600" },
  botonCerrar: { flex: 2, backgroundColor: c.exitoSuave, padding: 12, borderRadius: 12, alignItems: "center" },
  botonCerrarTexto: { color: c.exito, fontWeight: "600" },
  botonEliminar: { flex: 1, backgroundColor: c.peligroSuave, padding: 12, borderRadius: 12, alignItems: "center" },
  botonEliminarTexto: { color: c.peligro, fontWeight: "600" },

  // CUOTAS
  seccionFila: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginTop: 12,
    marginBottom: 10,
  },
  seccionTitulo: { fontSize: 18, fontWeight: "bold", color: c.texto },
  seccionDetalle: { fontSize: 13, color: c.textoSecundario },
  vacio: { textAlign: "center", color: c.textoTenue, marginTop: 20 },
  cuotaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: c.tarjeta,
    borderWidth: 1,
    borderColor: c.separador,
    padding: 14,
    borderRadius: 16,
    marginBottom: 10,
  },
  cuotaCirculo: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  cuotaMonto: { fontSize: 16, fontWeight: "bold", fontVariant: numerosMontos, color: c.texto },
  cuotaFecha: { fontSize: 13, color: c.textoSecundario, marginTop: 2 },
  textoVencido: { color: c.peligro, fontWeight: "600" },
  textoHoy: { color: c.aviso, fontWeight: "600" },
  accionMarcar: { fontSize: 15, fontWeight: "bold", color: c.primario },
  accionPagada: { fontSize: 15, fontWeight: "600", color: c.exito },
});
