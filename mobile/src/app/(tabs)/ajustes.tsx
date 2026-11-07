import { useState, useCallback, useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api, cerrarSesion } from "@/services/api";
import { useTema, Preferencia } from "@/theme/tema";
import { Colores } from "@/theme/colores";
import { useBarraClara } from "@/theme/barra-estado";
import { iniciales } from "@/utils/texto";

type Perfil = { id: string; nombre: string; email: string };

const OPCIONES_TEMA: { valor: Preferencia; texto: string }[] = [
  { valor: "sistema", texto: "Automático" },
  { valor: "claro", texto: "Claro" },
  { valor: "oscuro", texto: "Oscuro" },
];

export default function AjustesScreen() {
  const { colores, preferencia, cambiarPreferencia } = useTema();
  const styles = useMemo(() => crearEstilos(colores), [colores]);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  useBarraClara();

  // Recarga al volver (ej. después de editar el perfil)
  useFocusEffect(
    useCallback(() => {
      api<Perfil>("/api/perfil")
        .then(setPerfil)
        .catch((error) => console.log("Error cargando perfil:", error));
    }, [])
  );

  const confirmarCierre = () => {
    Alert.alert("Cerrar sesión", "¿Seguro que quieres cerrar sesión?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Cerrar sesión", style: "destructive", onPress: cerrarSesion },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Fondo de la hoja en la mitad de abajo: al estirar la lista hacia arriba no asoma la banda negra */}
      <View style={styles.fondoInferior} />

      {/* Banda oscura: solo el título */}
      <View style={styles.banda}>
        <Text style={styles.titulo}>Ajustes</Text>
      </View>

      <ScrollView style={styles.hoja} contentContainerStyle={styles.hojaContenido}>
        {/* CUENTA: tocar el perfil abre "Mi perfil" */}
        <Text style={styles.seccion}>Cuenta</Text>
        <View style={styles.grupo}>
          <TouchableOpacity style={styles.perfil} onPress={() => router.push("/cuenta/perfil")}>
            <View style={styles.avatar}>
              <Text style={styles.avatarTexto}>{perfil ? iniciales(perfil.nombre) : ""}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.nombre} numberOfLines={1}>
                {perfil?.nombre ?? ""}
              </Text>
              <Text style={styles.email} numberOfLines={1}>
                {perfil?.email ?? ""}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colores.iconoTenue} />
          </TouchableOpacity>
        </View>

        {/* PREFERENCIAS: el cambio se aplica al instante y queda guardado en el celular */}
        <Text style={styles.seccion}>Preferencias</Text>
        <View style={styles.grupo}>
          <View style={styles.fila}>
            <Ionicons name="moon" size={18} color={colores.texto} style={styles.filaIcono} />
            <Text style={styles.filaTexto}>Apariencia</Text>
          </View>
          <View style={styles.apariencia}>
            {OPCIONES_TEMA.map((opcion) => {
              const activa = opcion.valor === preferencia;
              return (
                <TouchableOpacity
                  key={opcion.valor}
                  style={[styles.opcionTema, activa && styles.opcionTemaActiva]}
                  onPress={() => cambiarPreferencia(opcion.valor)}
                >
                  <Text style={[styles.opcionTemaTexto, activa && styles.opcionTemaTextoActiva]}>
                    {opcion.texto}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
        <Text style={styles.ayuda}>Automático usa el mismo modo que tu celular.</Text>

        {/* SEGURIDAD */}
        <Text style={styles.seccion}>Seguridad</Text>
        <View style={styles.grupo}>
          <TouchableOpacity style={styles.fila} onPress={() => router.push("/cuenta/contrasena")}>
            <Ionicons name="lock-closed" size={18} color={colores.texto} style={styles.filaIcono} />
            <Text style={styles.filaTexto}>Contraseña</Text>
            <Ionicons name="chevron-forward" size={18} color={colores.iconoTenue} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={[styles.grupo, styles.fila, styles.cerrarSesion]} onPress={confirmarCierre}>
          <Ionicons name="log-out-outline" size={20} color={colores.peligro} style={styles.filaIcono} />
          <Text style={[styles.filaTexto, styles.cerrarSesionTexto]}>Cerrar sesión</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const crearEstilos = (c: Colores) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.banda },
    fondoInferior: { position: "absolute", left: 0, right: 0, bottom: 0, height: "50%", backgroundColor: c.hoja },

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
    },
    hojaContenido: { padding: 16, paddingTop: 20, paddingBottom: 40 },

    // GRUPOS (tarjetas grises como en los Ajustes del iPhone)
    seccion: {
      fontSize: 13,
      fontWeight: "700",
      letterSpacing: 0.5,
      color: c.textoTenue,
      textTransform: "uppercase",
      marginBottom: 8,
      marginTop: 8,
      marginLeft: 4,
    },
    grupo: { backgroundColor: c.neutroSuave, borderRadius: 16, marginBottom: 16, overflow: "hidden" },
    fila: { flexDirection: "row", alignItems: "center", paddingVertical: 16, paddingHorizontal: 16 },
    filaIcono: { width: 30 },
    filaTexto: { flex: 1, fontSize: 16, fontWeight: "600", color: c.texto },

    // PERFIL
    perfil: { flexDirection: "row", alignItems: "center", padding: 14, gap: 14 },
    avatar: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: c.destacada,
      justifyContent: "center",
      alignItems: "center",
    },
    avatarTexto: { color: c.sobreBanda, fontSize: 20, fontWeight: "bold" },
    nombre: { fontSize: 17, fontWeight: "bold", color: c.texto },
    email: { fontSize: 14, color: c.textoSecundario, marginTop: 2 },

    // APARIENCIA
    apariencia: { flexDirection: "row", gap: 4, paddingHorizontal: 12, paddingBottom: 12, marginTop: -4 },
    opcionTema: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: "center", backgroundColor: c.hoja },
    opcionTemaActiva: { backgroundColor: c.primario },
    opcionTemaTexto: { fontWeight: "600", color: c.textoSecundario },
    opcionTemaTextoActiva: { color: c.sobrePrimario },
    ayuda: { fontSize: 13, color: c.textoTenue, marginLeft: 4, marginTop: -8, marginBottom: 16 },

    // CERRAR SESION
    cerrarSesion: { marginTop: 12 },
    cerrarSesionTexto: { color: c.peligro },
  });
