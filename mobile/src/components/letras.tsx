import { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import * as WebBrowser from "expo-web-browser";
import { File } from "expo-file-system";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/services/api";

export type Documento = {
  id: string;
  tipo: "imagen" | "pdf";
  url: string; // enlace firmado (el de PDF caduca en 1 hora; se renueva al recargar el préstamo)
  miniatura: string | null;
  createdAt: string;
};

type Props = {
  prestamoId: string;
  documentos: Documento[];
  onCambio: () => void; // recarga el préstamo después de subir o eliminar
};

// SECCION "LETRAS": documentos firmados del préstamo (fotos o PDF), guardados en Cloudinary
export default function Letras({ prestamoId, documentos, onCambio }: Props) {
  const [subiendo, setSubiendo] = useState(false);

  const subir = async (archivo: { uri: string; name: string; type: string }) => {
    setSubiendo(true);
    try {
      // El fetch de Expo (SDK 58) no acepta el clásico { uri, name, type } de React Native:
      // cada archivo debe poder entregar sus bytes. Se leen del celular con expo-file-system
      const archivoLocal = new File(archivo.uri);
      const datos = new FormData();
      datos.append("archivo", {
        name: archivo.name,
        type: archivo.type,
        bytes: () => archivoLocal.bytes(),
      } as unknown as Blob);
      await api(`/api/prestamos/${prestamoId}/documentos`, { method: "POST", body: datos });
      onCambio();
    } catch (error) {
      Alert.alert("Error", error instanceof Error ? error.message : "No se pudo subir el archivo");
    } finally {
      setSubiendo(false);
    }
  };

  const tomarFoto = async () => {
    const permiso = await ImagePicker.requestCameraPermissionsAsync();
    if (!permiso.granted) {
      return Alert.alert("Sin permiso", "Activa el acceso a la cámara en Ajustes para tomar la foto.");
    }
    const resultado = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.7 });
    if (!resultado.canceled) {
      subir({ uri: resultado.assets[0].uri, name: "letra.jpg", type: "image/jpeg" });
    }
  };

  const elegirDeGaleria = async () => {
    const resultado = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.7 });
    if (!resultado.canceled) {
      const foto = resultado.assets[0];
      subir({ uri: foto.uri, name: foto.fileName ?? "letra.jpg", type: foto.mimeType ?? "image/jpeg" });
    }
  };

  const elegirPdf = async () => {
    const resultado = await DocumentPicker.getDocumentAsync({ type: "application/pdf", copyToCacheDirectory: true });
    if (!resultado.canceled) {
      const pdf = resultado.assets[0];
      subir({ uri: pdf.uri, name: pdf.name, type: "application/pdf" });
    }
  };

  const agregar = () => {
    Alert.alert("Agregar letra", "¿De dónde quieres agregarla?", [
      { text: "Tomar foto", onPress: tomarFoto },
      { text: "Elegir de la galería", onPress: elegirDeGaleria },
      { text: "Elegir PDF", onPress: elegirPdf },
      { text: "Cancelar", style: "cancel" },
    ]);
  };

  const eliminar = (documento: Documento) => {
    Alert.alert("Eliminar letra", "¿Seguro que quieres eliminar este documento? No se puede recuperar.", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          try {
            await api(`/api/documentos/${documento.id}`, { method: "DELETE" });
            onCambio();
          } catch (error) {
            Alert.alert("Error", error instanceof Error ? error.message : "No se pudo eliminar");
          }
        },
      },
    ]);
  };

  const opciones = (documento: Documento) => {
    Alert.alert(documento.tipo === "pdf" ? "Letra en PDF" : "Foto de la letra", undefined, [
      { text: "Ver", onPress: () => WebBrowser.openBrowserAsync(documento.url) },
      { text: "Eliminar", style: "destructive", onPress: () => eliminar(documento) },
      { text: "Cancelar", style: "cancel" },
    ]);
  };

  return (
    <View style={styles.contenedor}>
      <View style={styles.fila}>
        <Text style={styles.titulo}>Letras{documentos.length > 0 ? ` (${documentos.length})` : ""}</Text>
        <TouchableOpacity onPress={agregar} disabled={subiendo}>
          <Text style={styles.agregar}>+ Agregar</Text>
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.lista}>
        {documentos.length === 0 && !subiendo && <Text style={styles.vacio}>Sin letras adjuntas</Text>}

        {documentos.map((documento) => (
          <TouchableOpacity key={documento.id} style={styles.miniatura} onPress={() => opciones(documento)}>
            {documento.tipo === "imagen" && documento.miniatura ? (
              <Image source={{ uri: documento.miniatura }} style={styles.imagen} contentFit="cover" />
            ) : (
              <View style={styles.pdf}>
                <Ionicons name="document-text" size={32} color="#dc2626" />
                <Text style={styles.pdfTexto}>PDF</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}

        {subiendo && (
          <View style={[styles.miniatura, styles.cargando]}>
            <ActivityIndicator />
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { marginHorizontal: 12, marginBottom: 8 },
  fila: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginHorizontal: 4 },
  titulo: { fontSize: 16, fontWeight: "bold" },
  agregar: { color: "#2563eb", fontWeight: "600", fontSize: 14 },
  lista: { gap: 8, paddingVertical: 8, paddingHorizontal: 4 },
  vacio: { color: "#999", fontSize: 13, paddingVertical: 8 },
  miniatura: { width: 72, height: 72, borderRadius: 8, overflow: "hidden", backgroundColor: "#fff" },
  imagen: { width: "100%", height: "100%" },
  pdf: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fef2f2" },
  pdfTexto: { fontSize: 11, fontWeight: "700", color: "#dc2626", marginTop: 2 },
  cargando: { justifyContent: "center", alignItems: "center", backgroundColor: "#f3f4f6" },
});
