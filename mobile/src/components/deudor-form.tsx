import { useState, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTema } from "@/theme/tema";
import { crearEstilosFormulario } from "@/theme/formulario";
import { useBarraClara } from "@/theme/barra-estado";

export type DatosDeudor = {
  nombre: string;
  cedula: string;
  telefono: string | null;
  direccion: string | null;
};

type Props = {
  titulo: string;
  textoBoton: string;
  inicial?: DatosDeudor;
  // Recibe los datos ya limpios; si lanza un error, el formulario lo muestra en una alerta
  onGuardar: (datos: DatosDeudor) => Promise<void>;
};

// FORMULARIO DE DEUDOR, COMPARTIDO POR "NUEVO" Y "EDITAR"
export default function DeudorForm({ titulo, textoBoton, inicial, onGuardar }: Props) {
  const { colores } = useTema();
  const styles = useMemo(() => crearEstilosFormulario(colores), [colores]);
  useBarraClara();

  const [nombre, setNombre] = useState(inicial?.nombre ?? "");
  const [cedula, setCedula] = useState(inicial?.cedula ?? "");
  const [telefono, setTelefono] = useState(inicial?.telefono ?? "");
  const [direccion, setDireccion] = useState(inicial?.direccion ?? "");
  const [guardando, setGuardando] = useState(false);

  const guardar = async () => {
    if (!nombre.trim() || !cedula.trim()) {
      Alert.alert("Faltan datos", "El nombre y la cédula son obligatorios");
      return;
    }

    setGuardando(true);
    try {
      await onGuardar({
        nombre: nombre.trim(),
        cedula: cedula.trim(),
        telefono: telefono.trim() || null,
        direccion: direccion.trim() || null,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo guardar el deudor";
      Alert.alert("Error", message);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Encabezado propio, porque el Stack raíz tiene headerShown: false */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} disabled={guardando}>
          <Text style={styles.cancelar}>Cancelar</Text>
        </TouchableOpacity>
        <Text style={styles.titulo}>{titulo}</Text>
        <View style={{ width: 70 }} />
      </View>

      {/* Sube el formulario cuando aparece el teclado, para que no tape los campos */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView style={styles.hoja} contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
          <Text style={styles.label}>Nombre *</Text>
          <TextInput
            style={styles.input}
            value={nombre}
            onChangeText={setNombre}
            placeholder="Ej: Juan Pérez"
            placeholderTextColor={colores.textoTenue}
            autoCapitalize="words"
          />

          <Text style={styles.label}>Cédula *</Text>
          <TextInput
            style={styles.input}
            value={cedula}
            onChangeText={setCedula}
            placeholder="Solo números"
            placeholderTextColor={colores.textoTenue}
            keyboardType="number-pad"
          />

          <Text style={styles.label}>Teléfono</Text>
          <TextInput
            style={styles.input}
            value={telefono}
            onChangeText={setTelefono}
            placeholder="Ej: 3001234567"
            placeholderTextColor={colores.textoTenue}
            keyboardType="phone-pad"
          />

          <Text style={styles.label}>Dirección</Text>
          <TextInput
            style={styles.input}
            value={direccion}
            onChangeText={setDireccion}
            placeholder="Ej: Calle 10 #20-30"
            placeholderTextColor={colores.textoTenue}
          />

          <TouchableOpacity style={styles.boton} onPress={guardar} disabled={guardando}>
            {guardando ? (
              <ActivityIndicator color={colores.sobrePrimario} />
            ) : (
              <Text style={styles.botonTexto}>{textoBoton}</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

