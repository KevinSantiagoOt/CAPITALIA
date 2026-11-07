import { useState, useEffect, useMemo } from "react";
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
import * as SecureStore from "expo-secure-store";
import { api } from "@/services/api";
import { useTema } from "@/theme/tema";
import { crearEstilosFormulario } from "@/theme/formulario";
import { useBarraClara } from "@/theme/barra-estado";

type Perfil = { id: string; nombre: string; email: string };

export default function PerfilScreen() {
  const { colores } = useTema();
  const styles = useMemo(() => crearEstilosFormulario(colores), [colores]);
  useBarraClara();

  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    api<Perfil>("/api/perfil")
      .then((perfil) => {
        setNombre(perfil.nombre);
        setEmail(perfil.email);
      })
      .catch((error) => console.log("Error cargando perfil:", error))
      .finally(() => setLoading(false));
  }, []);

  const guardar = async () => {
    if (!nombre.trim() || !email.trim()) {
      Alert.alert("Faltan datos", "El nombre y el correo son obligatorios");
      return;
    }

    setGuardando(true);
    try {
      const perfil = await api<Perfil>("/api/perfil", {
        method: "PUT",
        body: { nombre: nombre.trim(), email: email.trim() },
      });
      // El saludo de Inicio usa el nombre guardado en el celular
      await SecureStore.setItemAsync("userName", perfil.nombre);
      Alert.alert("Perfil actualizado", "Tus datos se guardaron.", [{ text: "OK", onPress: () => router.back() }]);
    } catch (error) {
      Alert.alert("Error", error instanceof Error ? error.message : "No se pudo guardar");
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
        <Text style={styles.titulo}>Mi perfil</Text>
        <View style={{ width: 70 }} />
      </View>

      {loading ? (
        <ActivityIndicator size="large" style={{ marginTop: 40 }} />
      ) : (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <ScrollView style={styles.hoja} contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
            <Text style={styles.label}>Nombre</Text>
            <TextInput
              style={styles.input}
              value={nombre}
              onChangeText={setNombre}
              autoCapitalize="words"
              placeholderTextColor={colores.textoTenue}
            />

            <Text style={styles.label}>Correo</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholderTextColor={colores.textoTenue}
            />
            <Text style={styles.ayuda}>Es el correo con el que inicias sesión.</Text>

            <TouchableOpacity style={styles.boton} onPress={guardar} disabled={guardando}>
              {guardando ? <ActivityIndicator color={colores.sobrePrimario} /> : <Text style={styles.botonTexto}>Guardar cambios</Text>}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

