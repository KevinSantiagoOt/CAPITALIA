import { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import * as SecureStore from "expo-secure-store";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "@/services/api";
import Filtro from "@/components/filtro";
import { useTema } from "@/theme/tema";
import { Colores } from "@/theme/colores";
import { useBarraClara } from "@/theme/barra-estado";
import { iniciales } from "@/utils/texto";

type PrestamoResumen = {
  id: string;
  estado: string;
};

type Deudor = {
  id: string;
  nombre: string;
  cedula: string;
  prestamos: PrestamoResumen[];
};

export default function DeudoresScreen() {
  const { colores } = useTema();
  const styles = useMemo(() => crearEstilos(colores), [colores]);
  useBarraClara();

  const [deudores, setDeudores] = useState<Deudor[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  // "todos" = los que no están archivados
  const [vista, setVista] = useState<"todos" | "archivados">("todos");

  const cargarDeudores = useCallback(async () => {
    try {
      const userId = await SecureStore.getItemAsync("userId");
      const query = vista === "archivados" ? "?archivados=true" : "";
      const data = await api<Deudor[]>(`/api/alldeudores/${userId}${query}`);
      setDeudores(data);
    } catch (error) {
      console.log("Error cargando deudores:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [vista]);

  const cambiarVista = (nueva: "todos" | "archivados") => {
    if (nueva === vista) return;
    setLoading(true);
    setVista(nueva);
  };

  // Recarga cada vez que vuelves a esta pestaña (ej. después de crear un deudor)
  useFocusEffect(
    useCallback(() => {
      cargarDeudores();
    }, [cargarDeudores])
  );

  const onRefresh = () => {
    setRefreshing(true);
    cargarDeudores();
  };


  // En la lista solo va el nombre y cuántas deudas tiene; el resto está en el detalle
  const renderDeudor = ({ item }: { item: Deudor }) => {
    // Solo cuentan los préstamos activos: los pagados ya no son deuda
    const deudas = item.prestamos.filter((p) => p.estado === "activo").length;

    return (
      <TouchableOpacity style={styles.card} onPress={() => router.push(`/deudor/${item.cedula}`)}>
        <View style={styles.avatar}>
          <Text style={styles.avatarTexto}>{iniciales(item.nombre)}</Text>
        </View>
        <Text style={styles.nombre} numberOfLines={1}>
          {item.nombre}
        </Text>
        <View style={[styles.badge, deudas === 0 && styles.badgeAlDia]}>
          <Text style={[styles.badgeText, deudas === 0 && styles.badgeTextAlDia]}>
            {deudas === 0 ? "Sin deudas" : `${deudas} deuda${deudas > 1 ? "s" : ""}`}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colores.iconoTenue} />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Banda oscura: solo el título */}
      <View style={styles.banda}>
        <Text style={styles.titulo}>Deudores</Text>
      </View>

      {/* Hoja redondeada con el selector y la lista */}
      <View style={styles.hoja}>
        <Filtro
          opciones={[
            { valor: "todos", texto: "Todos" },
            { valor: "archivados", texto: "Archivados" },
          ]}
          seleccionado={vista}
          onCambio={cambiarVista}
        />

        {loading ? (
          <ActivityIndicator size="large" style={{ marginTop: 40 }} />
        ) : (
          <FlatList
            data={deudores}
            keyExtractor={(item) => item.id}
            renderItem={renderDeudor}
            contentContainerStyle={styles.lista}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            ListEmptyComponent={
              <Text style={styles.vacio}>
                {vista === "archivados" ? "No hay deudores archivados" : "No hay deudores registrados"}
              </Text>
            }
            ListFooterComponent={
              vista === "todos" ? (
                <TouchableOpacity style={styles.botonNuevo} onPress={() => router.push("/deudor/nuevo")}>
                  <Ionicons name="add" size={22} color={colores.texto} />
                  <Text style={styles.botonNuevoTexto}>Nuevo deudor</Text>
                </TouchableOpacity>
              ) : undefined
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const crearEstilos = (c: Colores) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.banda },

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
      overflow: "hidden",
    },
    lista: { padding: 16, paddingBottom: 32 },

    card: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      backgroundColor: c.tarjeta,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.separador,
      padding: 14,
      marginBottom: 10,
    },
    avatar: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: c.neutroSuave,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarTexto: { fontSize: 14, fontWeight: "bold", color: c.texto },
    nombre: { flex: 1, fontSize: 16, fontWeight: "bold", color: c.texto },
    badge: { backgroundColor: c.avisoSuave, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    badgeText: { color: c.aviso, fontSize: 12, fontWeight: "600" },
    badgeAlDia: { backgroundColor: c.exitoSuave },
    badgeTextAlDia: { color: c.exito },

    // BOTON PUNTEADO "+ NUEVO DEUDOR"
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

    vacio: { textAlign: "center", marginTop: 40, marginBottom: 20, color: c.textoTenue },
  });
