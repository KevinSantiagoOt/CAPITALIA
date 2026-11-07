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
import { api } from "@/services/api";
import { useTema } from "@/theme/tema";
import { crearEstilosFormulario } from "@/theme/formulario";
import { useBarraClara } from "@/theme/barra-estado";

export default function ContrasenaScreen() {
  const { colores } = useTema();
  const styles = useMemo(() => crearEstilosFormulario(colores), [colores]);
  useBarraClara();

  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [guardando, setGuardando] = useState(false);

  const guardar = async () => {
    if (!actual || !nueva || !confirmar) {
      return Alert.alert("Faltan datos", "Llena los tres campos");
    }
    if (nueva.length < 6) {
      return Alert.alert("Contraseña muy corta", "La nueva contraseña debe tener al menos 6 caracteres");
    }
    if (nueva !== confirmar) {
      return Alert.alert("No coinciden", "La nueva contraseña y la confirmación no son iguales");
    }

    setGuardando(true);
    try {
      await api("/api/perfil/password", { method: "PUT", body: { actual, nueva } });
      Alert.alert("Contraseña actualizada", undefined, [{ text: "OK", onPress: () => router.back() }]);
    } catch (error) {
      Alert.alert("Error", error instanceof Error ? error.message : "No se pudo cambiar la contraseña");
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
        <Text style={styles.titulo}>Cambiar contraseña</Text>
        <View style={{ width: 70 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView style={styles.hoja} contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
          <Text style={styles.label}>Contraseña actual</Text>
          <TextInput style={styles.input} value={actual} onChangeText={setActual} secureTextEntry autoCapitalize="none" />

          <Text style={styles.label}>Nueva contraseña</Text>
          <TextInput style={styles.input} value={nueva} onChangeText={setNueva} secureTextEntry autoCapitalize="none" />
          <Text style={styles.ayuda}>Mínimo 6 caracteres.</Text>

          <Text style={styles.label}>Confirmar nueva contraseña</Text>
          <TextInput
            style={styles.input}
            value={confirmar}
            onChangeText={setConfirmar}
            secureTextEntry
            autoCapitalize="none"
          />

          <TouchableOpacity style={styles.boton} onPress={guardar} disabled={guardando}>
            {guardando ? <ActivityIndicator color={colores.sobrePrimario} /> : <Text style={styles.botonTexto}>Cambiar contraseña</Text>}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

