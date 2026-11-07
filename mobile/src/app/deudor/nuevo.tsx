import { router } from "expo-router";
import { api } from "@/services/api";
import DeudorForm from "@/components/deudor-form";

export default function NuevoDeudorScreen() {
  return (
    <DeudorForm
      titulo="Nuevo deudor"
      textoBoton="Guardar deudor"
      onGuardar={async (datos) => {
        await api("/api/deudores", { method: "POST", body: datos });
        router.back();
      }}
    />
  );
}
