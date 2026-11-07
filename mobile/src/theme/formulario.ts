import { StyleSheet } from "react-native";
import { Colores } from "./colores";

// ESTILOS COMUNES DE LOS FORMULARIOS (deudor, préstamo, perfil, contraseña)
// Mismo diseño que las demás pantallas: banda oscura con "Cancelar" y el título,
// y el formulario en la hoja redondeada (el ScrollView lleva style={styles.hoja})
export const crearEstilosFormulario = (c: Colores) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.banda },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 34,
    },
    cancelar: { color: c.sobreBandaTenue, fontSize: 16, width: 70 },
    titulo: { fontSize: 17, fontWeight: "bold", color: c.sobreBanda },
    hoja: {
      flex: 1,
      backgroundColor: c.hoja,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      marginTop: -20,
    },
    form: { padding: 20, paddingBottom: 40 },
    label: { fontSize: 14, fontWeight: "600", color: c.textoSecundario, marginBottom: 8, marginTop: 16 },
    input: {
      backgroundColor: c.tarjeta,
      color: c.texto,
      borderWidth: 1,
      borderColor: c.borde,
      borderRadius: 14,
      paddingHorizontal: 16,
      paddingVertical: 15,
      fontSize: 16,
    },
    inputFijo: { backgroundColor: c.inputFijo },
    ayuda: { fontSize: 13, color: c.textoSecundario, marginTop: 6 },
    boton: { backgroundColor: c.primario, borderRadius: 14, paddingVertical: 18, alignItems: "center", marginTop: 32 },
    botonTexto: { color: c.sobrePrimario, fontSize: 17, fontWeight: "600" },
  });
