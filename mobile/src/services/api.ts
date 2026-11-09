import * as SecureStore from "expo-secure-store";
import { router } from "expo-router";
import * as Notifications from "expo-notifications";

// La dirección del backend sale de EXPO_PUBLIC_API_URL:
// - En desarrollo, del archivo mobile/.env.local (la IP del PC, ej. http://192.168.100.6:3000)
// - En la app de la beta, de la configuración del build (la URL del servidor en internet)
// Si se cambia, reiniciar Expo con "npx expo start -c" para que la tome
export const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "";
if (!BASE_URL) console.error("Falta EXPO_PUBLIC_API_URL: créala en mobile/.env.local");

// BORRA LA SESION GUARDADA Y VUELVE AL LOGIN
// También borra los recordatorios programados: no deben sonar con datos de otra sesión
export async function cerrarSesion() {
  await Notifications.cancelAllScheduledNotificationsAsync();
  await SecureStore.deleteItemAsync("userToken");
  await SecureStore.deleteItemAsync("userName");
  await SecureStore.deleteItemAsync("userId");
  router.replace("/login");
}

type Options = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
};

export async function api<T = any>(path: string, options: Options = {}): Promise<T> {
  const token = await SecureStore.getItemAsync("userToken");

  // Los archivos (FormData) se envían tal cual: fetch arma solo el Content-Type multipart
  const esArchivo = options.body instanceof FormData;

  const response = await fetch(`${BASE_URL}${path}`, {
    method: options.method ?? "GET",
    headers: {
      ...(esArchivo ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: esArchivo ? (options.body as FormData) : options.body ? JSON.stringify(options.body) : undefined,
  });

  // Si el token venció o es inválido, limpiamos la sesión y volvemos al login
  if (response.status === 401) {
    await cerrarSesion();
    throw new Error("Sesión expirada");
  }

  // Algunas respuestas (como un DELETE) pueden venir sin cuerpo
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(data?.message || data?.error || "Error en la petición");
  }

  return data as T;
}