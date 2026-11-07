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
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "@/services/api";

export default function NuevoDeudorScreen() {
  const [nombre, setNombre] = useState("");
  const [cedula, setCedula] = useState("");
  const [telefono, setTelefono] = useState("");
  const [direccion, setDireccion] = useState("");
  const [guardando, setGuardando] = useState(false);

  const guardar = async () => {
    if (!nombre.trim() || !cedula.trim()) {
      Alert.alert("Faltan datos", "El nombre y la cédula son obligatorios");
      return;
    }

    setGuardando(true);
    try {
      await api("/api/deudores", {
        method: "POST",
        body: {
          nombre: nombre.trim(),
          cedula: cedula.trim(),
          telefono: telefono.trim() || null,
          direccion: direccion.trim() || null,
        },
      });
      router.back();
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
        <Text style={styles.titulo}>Nuevo deudor</Text>
        <View style={{ width: 70 }} />
      </View>

      {/* Sube el formulario cuando aparece el teclado, para que no tape los campos */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
          <Text style={styles.label}>Nombre *</Text>
          <TextInput
            style={styles.input}
            value={nombre}
            onChangeText={setNombre}
            placeholder="Ej: Juan Pérez"
            placeholderTextColor="#999"
            autoCapitalize="words"
          />

          <Text style={styles.label}>Cédula *</Text>
          <TextInput
            style={styles.input}
            value={cedula}
            onChangeText={setCedula}
            placeholder="Solo números"
            placeholderTextColor="#999"
            keyboardType="number-pad"
          />

          <Text style={styles.label}>Teléfono</Text>
          <TextInput
            style={styles.input}
            value={telefono}
            onChangeText={setTelefono}
            placeholder="Ej: 3001234567"
            placeholderTextColor="#999"
            keyboardType="phone-pad"
          />

          <Text style={styles.label}>Dirección</Text>
          <TextInput
            style={styles.input}
            value={direccion}
            onChangeText={setDireccion}
            placeholder="Ej: Calle 10 #20-30"
            placeholderTextColor="#999"
          />

          <TouchableOpacity style={styles.boton} onPress={guardar} disabled={guardando}>
            {guardando ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.botonTexto}>Guardar deudor</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
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
  form: { padding: 16 },
  label: { fontSize: 14, fontWeight: "600", color: "#333", marginBottom: 6, marginTop: 10 },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
  },
  boton: {
    backgroundColor: "#2563eb",
    borderRadius: 10,
    padding: 16,
    alignItems: "center",
    marginTop: 28,
  },
  botonTexto: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});
