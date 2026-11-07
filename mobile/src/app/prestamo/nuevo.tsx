import { router, useLocalSearchParams } from "expo-router";
import { api } from "@/services/api";
import PrestamoForm from "@/components/prestamo-form";

// Se abre de dos formas:
//  - Desde la pestaña Préstamos: sin parámetros, hay que elegir el deudor
//  - Desde el detalle de un deudor: con { deudorId, deudorNombre }, el deudor ya viene elegido
export default function NuevoPrestamoScreen() {
  const params = useLocalSearchParams<{ deudorId?: string; deudorNombre?: string }>();

  return (
    <PrestamoForm
      titulo="Nuevo préstamo"
      textoBoton="Guardar préstamo"
      deudorFijo={params.deudorId ? { id: params.deudorId, nombre: params.deudorNombre ?? "" } : undefined}
      onGuardar={async (datos) => {
        const respuesta = await api<{ id: string }>("/api/prestamos", { method: "POST", body: datos });
        // Reemplaza esta pantalla por el detalle: al darle atrás no vuelve al formulario
        router.replace(`/prestamo/${respuesta.id}`);
      }}
    />
  );
}
