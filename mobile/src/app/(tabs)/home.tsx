import { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
} from "react-native";
import * as SecureStore from "expo-secure-store";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "@/services/api";
import { estadoPlazo } from "@/utils/fechas";
import { useTema } from "@/theme/tema";
import { Colores } from "@/theme/colores";
import { useBarraClara } from "@/theme/barra-estado";
import { numerosMontos } from "@/theme/fuentes";

type CuotaVencida = {
  id: string;
  montoInteres: string;
  fechaVencimiento: string;
  prestamoId: string;
  prestamo?: {
    deudor?: {
      nombre: string;
    };
  };
};

type CuotaProxima = {
  id: string;
  montoInteres: string;
  fechaVencimiento: string;
  prestamoId: string;
  prestamo?: {
    deudor?: {
      nombre: string;
    };
  };
};

type PrestamoActivo = {
  id: string;
  montoCapital: string;
  tasaInteres: string;
  estado: string;
  fechaFinPlazo: string | null;
  capitalDevuelto: string | null;
  deudor?: { nombre: string };
};

export default function HomeScreen() {
  const { colores } = useTema();
  useBarraClara();
  const styles = useMemo(() => crearEstilos(colores), [colores]);

  const [userName, setUserName] = useState("");
  const [vencidas, setVencidas] = useState<CuotaVencida[]>([]);
  const [proximas, setProximas] = useState<CuotaProxima[]>([]);
  const [activos, setActivos] = useState<PrestamoActivo[]>([]);
  const [cobradoMes, setCobradoMes] = useState(0);
  const [esperadoMes, setEsperadoMes] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Buenos días hasta las 12, buenas tardes hasta las 7 p. m., buenas noches después
  const saludoSegunHora = () => {
    const hora = new Date().getHours();
    if (hora < 12) return "Buenos días";
    if (hora < 19) return "Buenas tardes";
    return "Buenas noches";
  };

  const obtenerMesActual = () => {
  const meses = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
  ];
  return meses[new Date().getMonth()];
};

  const cargarDatos = useCallback(async () => {
    try {
      const userId = await SecureStore.getItemAsync("userId");
      const name = await SecureStore.getItemAsync("userName");
      if (name) setUserName(name);

      const [dataVencidas, dataProximas, dataActivos, dataCobrado] = await Promise.all([
        api<CuotaVencida[]>(`/api/cuotas/prestamo/${userId}/vencidas`),
        api<CuotaProxima[]>(`/api/cuotas/prestamo/${userId}/vencenpronto`),
        api<PrestamoActivo[]>(`/api/prestamosactivos/usuario/${userId}`),
        api<{ total: string; esperado: string }>(`/api/cuotas/prestamo/${userId}/cobradasmes`),
      ]);

      setVencidas(dataVencidas);
      setProximas(dataProximas);
      setActivos(dataActivos);
      setCobradoMes(Number(dataCobrado.total));
      setEsperadoMes(Number(dataCobrado.esperado));
    } catch (error) {
      console.log("Error cargando dashboard:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Recarga cada vez que vuelves a esta pestaña (ej. después de marcar una cuota como pagada)
  useFocusEffect(
    useCallback(() => {
      cargarDatos();
    }, [cargarDatos])
  );

  const onRefresh = () => {
    setRefreshing(true);
    cargarDatos();
  };

  const formatearMonto = (monto: string | number) => `$${Math.round(Number(monto)).toLocaleString("es-CO")}`;

  // RESUMEN "ASI VAN TUS PRESTAMOS"
  // Si ya devolvió el capital, ese préstamo solo debe cuotas: no cuenta como capital afuera
  const capitalPrestado = activos
    .filter((p) => !p.capitalDevuelto)
    .reduce((sum, p) => sum + Number(p.montoCapital), 0);
  const plazosVencidos = activos.filter((p) => {
    const plazo = estadoPlazo(p);
    return plazo === "vencido" || plazo === "hoy";
  });
  const totalVencidas = vencidas.reduce((sum, c) => sum + Number(c.montoInteres), 0);
  const totalProximas = proximas.reduce((sum, c) => sum + Number(c.montoInteres), 0);

  const formatearFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString("es-CO", {
      day: "2-digit",
      month: "short",
      timeZone: "UTC", // las fechas vienen sin hora; sin esto se corren un día en Colombia
    });
  };

  const plural = (n: number, palabra: string) => `${n} ${palabra}${n !== 1 ? "s" : ""}`;
  const mes = obtenerMesActual().toLowerCase();

  // Tarjeta de la cuadrícula: ícono en círculo de color, título, monto y detalle.
  // Con "progreso" (0 a 1) lleva además una barra, del color del ícono.
  // Con "onPress" se puede tocar (lleva una flecha arriba a la derecha)
  const tarjeta = (
    icono: keyof typeof Ionicons.glyphMap,
    color: string,
    fondoIcono: string,
    titulo: string,
    valor: string,
    detalle: string,
    progreso?: number,
    onPress?: () => void
  ) => (
    <TouchableOpacity style={styles.tarjeta} onPress={onPress} disabled={!onPress}>
      <View style={styles.tarjetaArriba}>
        <View style={[styles.tarjetaIcono, { backgroundColor: fondoIcono }]}>
          <Ionicons name={icono} size={20} color={color} />
        </View>
        {onPress && <Ionicons name="chevron-forward" size={18} color={colores.iconoTenue} />}
      </View>
      <Text style={styles.tarjetaTitulo}>{titulo}</Text>
      <Text style={styles.tarjetaValor} numberOfLines={1} adjustsFontSizeToFit>
        {valor}
      </Text>
      <Text style={styles.tarjetaDetalle} numberOfLines={1} adjustsFontSizeToFit>
        {detalle}
      </Text>
      {progreso !== undefined && (
        <View style={styles.barraFondo}>
          <View style={[styles.barraRelleno, { width: `${Math.round(progreso * 100)}%`, backgroundColor: color }]} />
        </View>
      )}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <ActivityIndicator size="large" color={colores.sobreBanda} style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Fondo de la hoja en la mitad de abajo: al estirar la lista hacia arriba no asoma la banda negra */}
      <View style={styles.fondoInferior} />
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colores.sobreBanda} />
        }
      >
        {/* Banda oscura: nombre de la app, saludo y la plata que está afuera */}
        <View style={styles.banda}>
          <Text style={styles.marca}>Capitalia</Text>
          <Text style={styles.saludo}>{saludoSegunHora()}, {userName}</Text>
          <Text style={styles.capitalLabel}>Capital prestado</Text>
          <Text style={styles.capitalMonto} numberOfLines={1} adjustsFontSizeToFit>
            {formatearMonto(capitalPrestado)}
          </Text>
        </View>

        {/* Hoja redondeada que sube sobre la banda */}
        <View style={styles.hoja}>
          <Text style={styles.hojaTitulo}>Así van tus préstamos</Text>

          <View style={styles.cuadricula}>
            <View style={styles.fila}>
              {/* Intereses del mes: de las cuotas que vencen este mes, cuánto ya se cobró */}
              {tarjeta("cash-outline", colores.exito, colores.exitoSuave, `Intereses de ${mes}`,
                formatearMonto(cobradoMes), `de ${formatearMonto(esperadoMes)}`,
                esperadoMes > 0 ? Math.min(1, cobradoMes / esperadoMes) : 0)}
              {tarjeta("wallet-outline", colores.primario, colores.primarioSuave, "Préstamos activos",
                String(activos.length),
                plazosVencidos.length > 0 ? `${plazosVencidos.length} con plazo vencido` : "Sin plazos vencidos")}
            </View>
            <View style={styles.fila}>
              {/* Al tocarlas se abre la lista de esas cuotas */}
              {tarjeta("alert-circle-outline", colores.peligro, colores.peligroSuave, "Vencidas",
                formatearMonto(totalVencidas), plural(vencidas.length, "cuota"), undefined,
                () => router.push({ pathname: "/cuotas/[tipo]", params: { tipo: "vencidas" } }))}
              {tarjeta("time-outline", colores.aviso, colores.avisoSuave, "Por cobrar",
                formatearMonto(totalProximas), `${plural(proximas.length, "cuota")} en ${mes}`, undefined,
                () => router.push({ pathname: "/cuotas/[tipo]", params: { tipo: "por-cobrar" } }))}
            </View>
          </View>

        {/* Plazos vencidos: el deudor debía devolver el capital y no se ha registrado.
            No se generan más cuotas hasta extender el plazo o cerrar el préstamo */}
        {plazosVencidos.length > 0 && (
          <>
            <Text style={styles.seccionTitulo}>Plazos vencidos</Text>
            {plazosVencidos.map((prestamo) => (
              <TouchableOpacity
                key={prestamo.id}
                style={[styles.cuotaCard, styles.bordeRojo]}
                onPress={() => router.push(`/prestamo/${prestamo.id}`)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.cuotaNombre}>{prestamo.deudor?.nombre ?? "Deudor"}</Text>
                  <Text style={[styles.cuotaFecha, { color: colores.peligro, fontWeight: "600" }]}>
                    {estadoPlazo(prestamo) === "hoy"
                      ? "El plazo termina hoy"
                      : `El plazo terminó el ${formatearFecha(prestamo.fechaFinPlazo!)}`}
                  </Text>
                </View>
                <Text style={styles.cuotaMonto}>{formatearMonto(prestamo.montoCapital)}</Text>
              </TouchableOpacity>
            ))}
          </>
        )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const crearEstilos = (c: Colores) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.banda },
    fondoInferior: { position: "absolute", left: 0, right: 0, bottom: 0, height: "50%", backgroundColor: c.hoja },

    // BANDA OSCURA
    banda: { backgroundColor: c.banda, alignItems: "center", paddingTop: 12, paddingBottom: 44, paddingHorizontal: 16 },
    marca: { fontSize: 16, fontWeight: "800", letterSpacing: 3, color: c.sobreBanda, textTransform: "uppercase" },
    saludo: { fontSize: 15, color: c.sobreBandaTenue, marginTop: 6 },
    capitalLabel: { fontSize: 13, color: c.sobreBandaTenue, marginTop: 26 },
    capitalMonto: { fontSize: 40, fontWeight: "bold", fontVariant: numerosMontos, color: c.sobreBanda, marginTop: 4 },

    // HOJA
    hoja: {
      flexGrow: 1,
      backgroundColor: c.hoja,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      marginTop: -20,
      paddingHorizontal: 16,
      paddingBottom: 24,
    },
    hojaTitulo: { fontSize: 20, fontWeight: "bold", color: c.texto, marginTop: 24, marginBottom: 14 },

    // CUADRICULA 2x2
    cuadricula: { gap: 12, marginBottom: 20 },
    fila: { flexDirection: "row", gap: 12 },
    tarjeta: {
      flex: 1,
      backgroundColor: c.tarjeta,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.separador,
      padding: 14,
    },
    tarjetaArriba: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
    tarjetaIcono: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
    tarjetaTitulo: { fontSize: 13, color: c.textoSecundario, marginTop: 12 },
    tarjetaValor: { fontSize: 19, fontWeight: "bold", fontVariant: numerosMontos, color: c.texto, marginTop: 4 },
    tarjetaDetalle: { fontSize: 12, color: c.textoTenue, marginTop: 4 },
    barraFondo: { height: 6, borderRadius: 3, backgroundColor: c.neutroSuave, marginTop: 8, overflow: "hidden" },
    barraRelleno: { height: 6, borderRadius: 3 },

    seccionTitulo: { fontSize: 16, fontWeight: "bold", marginTop: 8, marginBottom: 8, color: c.texto },
    cuotaCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: c.tarjeta,
      padding: 14,
      borderRadius: 12,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: c.separador,
      borderLeftWidth: 4,
    },
    bordeRojo: { borderLeftColor: c.peligro },
    cuotaNombre: { fontWeight: "600", fontSize: 15, color: c.texto },
    cuotaFecha: { fontSize: 13, color: c.textoSecundario, marginTop: 2 },
    cuotaMonto: { fontWeight: "bold", fontSize: 15, fontVariant: numerosMontos, color: c.primario },
  });