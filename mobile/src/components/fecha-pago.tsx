import { useState, useMemo, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Modal, Platform } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useTema } from "@/theme/tema";
import { Colores } from "@/theme/colores";

type Props = {
  visible: boolean;
  onCancelar: () => void;
  onConfirmar: (fecha: Date) => void;
};

// CALENDARIO PARA ELEGIR EL DIA EN QUE SE PAGO UNA CUOTA
// En iPhone sale una hoja desde abajo con el calendario y el botón "Guardar".
// En Android se abre el diálogo de fecha del sistema.
// No deja elegir días futuros: un pago no puede haber pasado todavía.
export default function FechaPago({ visible, onCancelar, onConfirmar }: Props) {
  const { colores, esOscuro } = useTema();
  const styles = useMemo(() => crearEstilos(colores), [colores]);
  const [fecha, setFecha] = useState(new Date());

  // Cada vez que se abre, empieza en hoy
  useEffect(() => {
    if (visible) setFecha(new Date());
  }, [visible]);

  if (!visible) return null;

  if (Platform.OS === "android") {
    return (
      <DateTimePicker
        value={fecha}
        mode="date"
        maximumDate={new Date()}
        onValueChange={(_, elegida) => onConfirmar(elegida)}
        onDismiss={onCancelar}
      />
    );
  }

  return (
    <Modal transparent animationType="slide" onRequestClose={onCancelar}>
      <TouchableOpacity style={styles.fondo} activeOpacity={1} onPress={onCancelar} />
      <View style={styles.hoja}>
        <Text style={styles.titulo}>¿Qué día pagó?</Text>
        <DateTimePicker
          value={fecha}
          mode="date"
          display="inline"
          locale="es-CO"
          maximumDate={new Date()}
          themeVariant={esOscuro ? "dark" : "light"}
          accentColor={colores.primario}
          onValueChange={(_, elegida) => setFecha(elegida)}
        />
        <View style={styles.botones}>
          <TouchableOpacity style={styles.botonCancelar} onPress={onCancelar}>
            <Text style={styles.botonCancelarTexto}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.botonGuardar} onPress={() => onConfirmar(fecha)}>
            <Text style={styles.botonGuardarTexto}>Guardar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const crearEstilos = (c: Colores) =>
  StyleSheet.create({
    fondo: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" }, // oscurece la pantalla de atrás
    hoja: {
      backgroundColor: c.hoja,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      padding: 20,
      paddingBottom: 36,
    },
    titulo: { fontSize: 18, fontWeight: "bold", color: c.texto, textAlign: "center", marginBottom: 8 },
    botones: { flexDirection: "row", gap: 10, marginTop: 12 },
    botonCancelar: { flex: 1, backgroundColor: c.neutroSuave, padding: 16, borderRadius: 14, alignItems: "center" },
    botonCancelarTexto: { color: c.neutro, fontWeight: "600", fontSize: 16 },
    botonGuardar: { flex: 1, backgroundColor: c.primario, padding: 16, borderRadius: 14, alignItems: "center" },
    botonGuardarTexto: { color: c.sobrePrimario, fontWeight: "600", fontSize: 16 },
  });
