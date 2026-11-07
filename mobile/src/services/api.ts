import * as SecureStore from "expo-secure-store";
import { router } from "expo-router";

export const BASE_URL = "http://192.168.100.6:3000";

// BORRA LA SESION GUARDADA Y VUELVE AL LOGIN
export async function cerrarSesion() {
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