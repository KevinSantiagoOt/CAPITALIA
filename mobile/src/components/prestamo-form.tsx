import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Modal,
  FlatList,
  Switch,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as SecureStore from "expo-secure-store";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/services/api";

type DeudorOpcion = { id: string; nombre: string; cedula: string };

// ---------- AYUDAS DE FECHAS ----------

// "AAAA-MM-DD" con la fecha local (toISOString la pasaría a UTC y de noche cambiaría el día)
const aTextoFecha = (fecha: Date) => {
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");
  return `${fecha.getFullYear()}-${mes}-${dia}`;
};

// Igual que en el backend: 31 ene + 1 mes = 28 feb
const sumarMeses = (fecha: Date, meses: number) => {
  const mes = fecha.getMonth() + meses;
  const ultimoDia = new Date(fecha.getFullYear(), mes + 1, 0).getDate();
  return new Date(fecha.getFullYear(), mes, Math.min(fecha.getDate(), ultimoDia));
};

const mostrarFecha = (fecha: Date) =>
  fecha.toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" });

const formatearMonto = (monto: number) => `$${Math.round(monto).toLocaleString("es-CO")}`;

// ---------- CAMPO DE FECHA ----------
// En iPhone el selector se muestra como un botón pequeño que abre el calendario.
// En Android se abre un diálogo al tocar el campo.
function CampoFecha({ valor, onCambio, minima }: { valor: Date; onCambio: (d: Date) => void; minima?: Date }) {
  const [abierto, setAbierto] = useState(false);

  if (Platform.OS === "ios") {
    return (
      <DateTimePicker
        value={valor}
        mode="date"
        display="compact"
        locale="es-CO"
        minimumDate={minima}
        onChange={(_, fecha) => fecha && onCambio(fecha)}
        style={{ alignSelf: "flex-start" }}
      />
    );
  }

  return (
    <>
      <TouchableOpacity style={styles.input} onPress={() => setAbierto(true)}>
        <Text style={{ fontSize: 16 }}>{mostrarFecha(valor)}</Text>
      </TouchableOpacity>
      {abierto && (
        <DateTimePicker
          value={valor}
          mode="date"
          minimumDate={minima}
          onChange={(_, fecha) => {
            setAbierto(false);
            if (fecha) onCambio(fecha);
          }}
        />
      )}
    </>
  );
}

// Convierte "2026-09-07T00:00:00.000Z" (fecha de la BD) en un Date local del mismo día
export const desdeTextoFecha = (texto: string) => {
  const [anio, mes, dia] = texto.slice(0, 10).split("-").map(Number);
  return new Date(anio, mes - 1, dia);
};

export type DatosPrestamo = {
  deudorId: string;
  montoCapital: number;
  tasaInteres: number;
  fechaInicio: string; // "AAAA-MM-DD"
  fechaFinPlazo: string | null;
};

type Props = {
  titulo: string;
  textoBoton: string;
  // Si viene, el deudor queda fijo; si no, se elige con el selector
  deudorFijo?: { id: string; nombre: string };
  // Valores iniciales (solo al editar)
  inicial?: { monto: number; tasa: number; fechaInicio: Date; fechaFin: Date | null };
  // Solo al editar: si ya hay cuotas pagadas, la fecha de inicio no se puede cambiar
  edicion?: { tienePagadas: boolean };
  // Si lanza un error, el formulario lo muestra en una alerta
  onGuardar: (datos: DatosPrestamo) => Promise<void>;
};

// ---------- FORMULARIO DE PRESTAMO, COMPARTIDO POR "NUEVO" Y "EDITAR" ----------
export default function PrestamoForm({ titulo, textoBoton, deudorFijo, inicial, edicion, onGuardar }: Props) {
  const [deudor, setDeudor] = useState<{ id: string; nombre: string } | null>(deudorFijo ?? null);
  const [monto, setMonto] = useState(inicial ? String(inicial.monto) : ""); // solo dígitos, ej "2000000"
  const [tasa, setTasa] = useState(inicial ? String(inicial.tasa) : ""); // ej "4.5"
  const [fechaInicio, setFechaInicio] = useState(inicial?.fechaInicio ?? new Date());
  const [tieneFin, setTieneFin] = useState(inicial ? inicial.fechaFin !== null : false);
  const [fechaFin, setFechaFin] = useState(inicial?.fechaFin ?? sumarMeses(new Date(), 6));
  const [guardando, setGuardando] = useState(false);
  const bloquearInicio = edicion?.tienePagadas ?? false;

  // Selector de deudor
  const [selectorAbierto, setSelectorAbierto] = useState(false);
  const [deudores, setDeudores] = useState<DeudorOpcion[]>([]);
  const [cargandoDeudores, setCargandoDeudores] = useState(false);
  const [busqueda, setBusqueda] = useState("");

  const abrirSelector = async () => {
    setSelectorAbierto(true);
    setBusqueda("");
    setCargandoDeudores(true);
    try {
      const userId = await SecureStore.getItemAsync("userId");
      setDeudores(await api<DeudorOpcion[]>(`/api/alldeudores/${userId}`));
    } catch (error) {
      console.log("Error cargando deudores:", error);
    } finally {
      setCargandoDeudores(false);
    }
  };

  const deudoresFiltrados = deudores.filter(
    (d) => d.nombre.toLowerCase().includes(busqueda.toLowerCase()) || d.cedula.includes(busqueda)
  );

  // ---------- VISTA PREVIA ----------
  const montoNumero = Number(monto) || 0;
  const tasaNumero = Number(tasa.replace(",", ".")) || 0;
  const interesMensual = (montoNumero * tasaNumero) / 100;

  // Misma regla que el backend (installmentService):
  // con fecha fin se crean todas hasta el fin; sin fecha fin, las vencidas más la próxima
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  let totalCuotas = 0;
  if (tieneFin) {
    while (sumarMeses(fechaInicio, totalCuotas + 1) <= fechaFin) totalCuotas++;
  }
  let cuotasVencidas = 0;
  while (sumarMeses(fechaInicio, cuotasVencidas + 1) < hoy) cuotasVencidas++;
  if (tieneFin) cuotasVencidas = Math.min(cuotasVencidas, totalCuotas);

  // ---------- GUARDAR ----------
  const guardar = async () => {
    if (!deudor) return Alert.alert("Faltan datos", "Elige el deudor");
    if (montoNumero <= 0) return Alert.alert("Faltan datos", "Escribe el monto del préstamo");
    if (tasaNumero <= 0) return Alert.alert("Faltan datos", "Escribe la tasa de interés mensual");
    if (tieneFin && fechaFin <= fechaInicio) {
      return Alert.alert("Fechas inválidas", "La fecha fin debe ser posterior a la fecha de inicio");
    }

    setGuardando(true);
    try {
      await onGuardar({
        deudorId: deudor.id,
        montoCapital: montoNumero,
        tasaInteres: tasaNumero,
        fechaInicio: aTextoFecha(fechaInicio),
        fechaFinPlazo: tieneFin ? aTextoFecha(fechaFin) : null,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo guardar el préstamo";
      Alert.alert("Error", message);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} disabled={guardando}>
          <Text style={styles.cancelar}>Cancelar</Text>
        </TouchableOpacity>
        <Text style={styles.titulo}>{titulo}</Text>
        <View style={{ width: 70 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
          {/* Deudor: fijo si viene del detalle, seleccionable si viene de la pestaña */}
          <Text style={styles.label}>Deudor *</Text>
          {deudorFijo ? (
            <View style={[styles.input, styles.inputFijo]}>
              <Text style={{ fontSize: 16 }}>{deudor?.nombre}</Text>
            </View>
          ) : (
            <TouchableOpacity style={[styles.input, styles.selector]} onPress={abrirSelector}>
              <Text style={{ fontSize: 16, color: deudor ? "#000" : "#999" }}>
                {deudor ? deudor.nombre : "Elegir deudor"}
              </Text>
              <Ionicons name="chevron-down" size={18} color="#999" />
            </TouchableOpacity>
          )}

          <Text style={styles.label}>Monto prestado *</Text>
          <TextInput
            style={styles.input}
            // Se muestra con puntos de miles, pero se guarda solo con dígitos
            value={monto ? Number(monto).toLocaleString("es-CO") : ""}
            onChangeText={(texto) => setMonto(texto.replace(/\D/g, ""))}
            placeholder="Ej: 2.000.000"
            placeholderTextColor="#999"
            keyboardType="number-pad"
          />

          <Text style={styles.label}>Interés mensual (%) *</Text>
          <TextInput
            style={styles.input}
            value={tasa}
            onChangeText={(texto) => setTasa(texto.replace(/[^0-9.,]/g, ""))}
            placeholder="Ej: 5"
            placeholderTextColor="#999"
            keyboardType="decimal-pad"
          />

          <Text style={styles.label}>Fecha de inicio *</Text>
          {bloquearInicio ? (
            <>
              <View style={[styles.input, styles.inputFijo]}>
                <Text style={{ fontSize: 16 }}>{mostrarFecha(fechaInicio)}</Text>
              </View>
              <Text style={styles.ayuda}>
                No se puede cambiar porque ya tiene cuotas pagadas.
              </Text>
            </>
          ) : (
            <CampoFecha valor={fechaInicio} onCambio={setFechaInicio} />
          )}

          <View style={styles.filaSwitch}>
            <Text style={styles.labelSwitch}>Tiene fecha fin</Text>
            <Switch value={tieneFin} onValueChange={setTieneFin} />
          </View>
          {tieneFin ? (
            <CampoFecha valor={fechaFin} onCambio={setFechaFin} minima={sumarMeses(fechaInicio, 1)} />
          ) : (
            <Text style={styles.ayuda}>
              Sin fecha fin: se cobra interés cada mes hasta que devuelva el capital.
            </Text>
          )}

          {/* Vista previa para confirmar que las cuentas están bien */}
          {montoNumero > 0 && tasaNumero > 0 && (
            <View style={styles.preview}>
              <Text style={styles.previewTitulo}>Resumen</Text>
              <Text style={styles.previewLinea}>
                Cuota mensual de interés:{" "}
                <Text style={styles.previewValor}>{formatearMonto(interesMensual)}</Text>
              </Text>
              {edicion ? (
                // Al editar: qué pasa con las cuotas que ya existen
                <Text style={styles.previewLinea}>
                  Las cuotas pendientes se ajustarán a estos datos. Las pagadas no cambian.
                </Text>
              ) : (
                <>
                  <Text style={styles.previewLinea}>
                    Primera cuota: {mostrarFecha(sumarMeses(fechaInicio, 1))}
                  </Text>
                  <Text style={styles.previewLinea}>
                    {tieneFin
                      ? `Se crearán ${totalCuotas} cuota${totalCuotas !== 1 ? "s" : ""}, la última el ${mostrarFecha(sumarMeses(fechaInicio, totalCuotas))}`
                      : "Se crea una cuota cada mes hasta que devuelva el capital"}
                  </Text>
                  {cuotasVencidas > 0 && (
                    <Text style={styles.previewAviso}>
                      El préstamo empezará con {cuotasVencidas} cuota{cuotasVencidas !== 1 ? "s" : ""} vencida
                      {cuotasVencidas !== 1 ? "s" : ""}.
                    </Text>
                  )}
                </>
              )}
            </View>
          )}

          <TouchableOpacity style={styles.boton} onPress={guardar} disabled={guardando}>
            {guardando ? <ActivityIndicator color="#fff" /> : <Text style={styles.botonTexto}>{textoBoton}</Text>}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Selector de deudor: hoja que sube desde abajo, con buscador */}
      <Modal
        visible={selectorAbierto}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectorAbierto(false)}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setSelectorAbierto(false)}>
              <Text style={styles.cancelar}>Cerrar</Text>
            </TouchableOpacity>
            <Text style={styles.titulo}>Elegir deudor</Text>
            <View style={{ width: 70 }} />
          </View>
          <TextInput
            style={[styles.input, { margin: 12 }]}
            value={busqueda}
            onChangeText={setBusqueda}
            placeholder="Buscar por nombre o cédula"
            placeholderTextColor="#999"
            autoFocus
          />
          {cargandoDeudores ? (
            <ActivityIndicator size="large" style={{ marginTop: 40 }} />
          ) : (
            <FlatList
              data={deudoresFiltrados}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingHorizontal: 12 }}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                <Text style={styles.vacio}>
                  {deudores.length === 0 ? "No tienes deudores. Créalo primero en la pestaña Deudores." : "Sin resultados"}
                </Text>
              }
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.opcion}
                  onPress={() => {
                    setDeudor({ id: item.id, nombre: item.nombre });
                    setSelectorAbierto(false);
                  }}
                >
                  <Text style={styles.opcionNombre}>{item.nombre}</Text>
                  <Text style={styles.opcionCedula}>Cédula: {item.cedula}</Text>
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  cancelar: { color: "#2563eb", fontSize: 16, width: 70 },
  titulo: { fontSize: 17, fontWeight: "bold" },
  form: { padding: 16, paddingBottom: 40 },
  label: { fontSize: 14, fontWeight: "600", color: "#333", marginBottom: 6, marginTop: 14 },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
  },
  inputFijo: { backgroundColor: "#f3f4f6" },
  selector: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  filaSwitch: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 18,
    marginBottom: 8,
  },
  labelSwitch: { fontSize: 14, fontWeight: "600", color: "#333" },
  ayuda: { fontSize: 13, color: "#666", marginTop: 4 },
  preview: {
    backgroundColor: "#eff6ff",
    borderRadius: 10,
    padding: 14,
    marginTop: 20,
  },
  previewTitulo: { fontSize: 14, fontWeight: "bold", color: "#1e3a8a", marginBottom: 6 },
  previewLinea: { fontSize: 14, color: "#1f2937", marginTop: 2 },
  previewValor: { fontWeight: "bold", color: "#2563eb" },
  previewAviso: { fontSize: 13, color: "#b45309", marginTop: 8 },
  boton: {
    backgroundColor: "#2563eb",
    borderRadius: 10,
    padding: 16,
    alignItems: "center",
    marginTop: 24,
  },
  botonTexto: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  vacio: { textAlign: "center", marginTop: 40, color: "#999", paddingHorizontal: 20 },
  opcion: { backgroundColor: "#fff", padding: 14, borderRadius: 10, marginBottom: 8 },
  opcionNombre: { fontSize: 16, fontWeight: "600" },
  opcionCedula: { fontSize: 13, color: "#666", marginTop: 2 },
});
