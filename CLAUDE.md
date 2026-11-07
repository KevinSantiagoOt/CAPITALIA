# Capitalia: contexto del proyecto

Este archivo es un resumen para que Claude entienda el proyecto desde el primer momento: qué es, cómo está armado, qué se hizo, qué falta y cómo trabajar con Kevin. Fecha del resumen: 6 de noviembre de 2026.

## 1. Qué es Capitalia

App para que el papá de Kevin administre los préstamos que hace a otras personas (deudores). Kevin la construye y la necesitan rápido.

- El **backend ya está completo** y funcionando.
- El frontend se hizo primero en React web (carpeta `Frontend/`), pero se decidió **rehacerlo desde cero como app móvil**, porque el papá la va a usar desde el celular. Solo había login y la pantalla principal, así que se perdió muy poco. `Frontend/` no se usa por ahora.
- La app móvil usa **React Native con Expo y Expo Router**, y habla con el mismo backend y la misma base de datos.

## 2. Cómo trabajar con Kevin

- **Idioma:** español, tono cálido y cercano.
- **Nivel:** sabe React y lo básico de desarrollo, pero **nunca había programado para móvil**. Al explicar, aclara lo específico de React Native (View, Text, StyleSheet, Expo Router, SecureStore).
- **Método de trabajo:** **Claude hace los cambios directamente en el código** (tiene acceso total al repo). Kevin no quiere hacerlos a mano. Después de cada cambio, explica bien qué se cambió, en qué archivo y por qué.
- **Para depurar:** los procesos (backend, Metro/Expo) corren en Warp, no dentro de Claude Code. Pide el mensaje de error tal cual o una captura en vez de adivinar.
- **Ritmo:** paso por paso, comprobando que algo funciona antes de pasar a lo siguiente. Si dice "espera", no avances.
- **Cómo corre el proyecto (en Warp):** backend con `npx ts-node src/index.ts`, que **no se recarga solo**: tras cambiar el backend hay que pedirle a Kevin que lo reinicie (o sugerir `npm run dev`, que usa nodemon). Mobile con `npx expo start -c`. Para probar cambios del backend sin esperar, se puede levantar una copia con `PORT=3001` y apagarla al terminar.
- **Entorno:** Windows, terminal Warp, editor VS Code, Insomnia para probar la API, Git con repo en GitHub (`KevinSantiagoOt/CAPITALIA`, rama `master`), celular iPhone con Expo Go.

## 3. Estructura del repo

```
capitalia/
├── backend/        # API (no tocar sin pedirlo)
├── Frontend/       # app web React antigua, solo referencia
└── mobile/         # app móvil (Expo + Expo Router), aquí se trabaja
    └── src/
        ├── app/
        │   ├── _layout.tsx          # SafeAreaProvider + Stack (headerShown: false)
        │   ├── index.tsx            # decide: hay token -> /(tabs)/home, no -> /login
        │   ├── login.tsx
        │   ├── (tabs)/
        │   │   ├── _layout.tsx      # 3 pestañas: Inicio, Préstamos, Deudores
        │   │   ├── home.tsx         # Dashboard
        │   │   ├── prestamos.tsx
        │   │   └── deudores.tsx
        │   ├── prestamo/[id].tsx    # detalle de préstamo + cuotas
        │   └── deudor/[cedula].tsx  # detalle de deudor + sus préstamos
        └── services/
            └── api.ts               # función central de peticiones
```

El backend es TypeScript con handlers estilo Express (`Request`, `Response`) y **Prisma** como ORM. Corre en el puerto 3000.

## 4. API (backend)

Base URL en desarrollo: `http://<IP-local-del-PC>:3000`. **`localhost` no funciona desde el celular.** Todas las rutas, salvo login y registro, necesitan `Authorization: Bearer <token>`: el middleware `backend/src/middleware/auth.ts` lo verifica y deja el id en `res.locals.usuarioId`. **Los controladores siempre usan ese id**, nunca el `:usuarioId` de la URL (que se ignora) ni uno del body, y en rutas por id comprueban que el registro sea del usuario (si no, 404). Así Wilfer y Kevin nunca ven lo del otro.

| Acción | Método y ruta |
|---|---|
| Login | `POST /api/auth/login` con `{ email, password }`, devuelve `{ token, nombre, id }` |
| Todos los préstamos | `GET /api/prestamos/usuario/:userId` |
| Préstamos activos | `GET /api/prestamosactivos/usuario/:userId` |
| Un préstamo | `GET /api/prestamos/:id` (incluye `deudor`, `cuotas`, `documentos`) |
| Actualizar cuota | `PUT /api/cuotas/:id` con `{ fechaVencimiento, pagado }` |
| Todos los deudores | `GET /api/alldeudores/:userId` (cada uno con `prestamos` anidados) |
| Un deudor | `GET /api/deudores/cedula/:cedula` (busca por **cédula**, no por id) |
| Cuotas vencidas | `GET /api/cuotas/prestamo/:userId/vencidas` (con `prestamo.deudor` anidado) |
| Cuotas del mes | `GET /api/cuotas/prestamo/:userId/vencenpronto` (ya incluye `prestamo.deudor`; se arregló el handler `getInstallmentsDueThisMonth` con `include`) |

Existen además en Insomnia, aún sin conectar en la app: crear, eliminar y ver cuotas pendientes, pagadas y todas; crear, actualizar y eliminar deudor; ingresar, modificar y eliminar préstamo; subida de documentos. Antes de usarlas, revisa la URL y el body exactos en `backend/src/routes/` y `backend/src/controllers/`.

**Formas de los datos:** los montos vienen como **string** (`"2000000"`), los ids son UUID, las fechas son ISO.
- Préstamo: `id, montoCapital, tasaInteres, fechaInicio, fechaFinPlazo (null si es indefinido), estado ("activo"...), deudorId, usuarioId, deudor, cuotas, documentos`
- Cuota: `id, montoInteres, fechaVencimiento, pagado, fechaPago, prestamoId`
- Deudor: `id, nombre, cedula, telefono, direccion, usuarioId, prestamos`

Guardado en `expo-secure-store` tras el login: `userToken`, `userName`, `userId`.

## 5. Reglas de negocio

- Las cuotas cobran **solo interés mensual**; el capital se devuelve aparte.
- **Cada mes que pasa debe tener su cuota, se haya pagado o no la anterior** (decidido el 6 nov 2026; reemplaza la regla vieja de "al pagar una se genera la siguiente", que escondía meses sin pagar).
- Esto lo hace `syncInstallments(usuarioId)` en `backend/src/services/installmentService.ts`: para cada préstamo **activo** toma la última cuota (o `fechaInicio` si no tiene) y crea las que falten, mes a mes. **Con fecha fin: todas hasta `fechaFinPlazo`. Sin fecha fin: las vencidas más la próxima por vencer** (así un préstamo nuevo siempre muestra su primera cuota). El resumen de `prestamo/nuevo.tsx` replica esta regla; si cambia una, cambiar la otra. Interés = `montoCapital × tasaInteres / 100`. Se llama al inicio de las rutas de cuotas vencidas, cuotas del mes, préstamos del usuario, préstamos activos y préstamo por id.
- Al marcar una cuota como pagada sin enviar `fechaPago`, el backend guarda la fecha de hoy.
- El préstamo sigue activo hasta que el deudor devuelve el capital completo; entonces pasa a inactivo. **El cierre del préstamo aún no está implementado.**
- Los préstamos tienen **documentos**: las "letras", que son el documento de compromiso firmado por ambas partes. Suelen ser PDFs escaneados o fotos.
- La app es **principalmente para Wilfer**. Abrirla a más prestamistas queda para más adelante; por eso la cédula del deudor sigue siendo **única en toda la tabla** (no por prestamista). Cambiarlo a `@@unique([cedula, usuarioId])` se decidirá cuando se amplíe.
- Usuarios en la BD: hay **dos prestamistas reales, Wilfer (el papá) y Kevin Otalvaro**. Cada uno debe ver solo sus deudores, préstamos y cuotas; nunca cruzarlos. Carlos Mendoza y Ana Gómez son de prueba; los préstamos de 2024 son de Carlos.

## 6. Lo que ya funciona

- Login con sesión persistente y cierre de sesión.
- Navegación por pestañas: Inicio, Préstamos, Deudores.
- Dashboard: saludo, contadores de cuotas vencidas y del mes, listas con nombre del deudor, tocables hacia el detalle del préstamo; se recarga al volver a la pestaña (`useFocusEffect`).
- Préstamos: lista con filtro Activos/Todos, badge de cuotas vencidas, detalle con cuotas y botón "Marcar pagada".
- Deudores: lista con total prestado y detalle con sus préstamos, enlazado al detalle de préstamo.
- `services/api.ts` creado: guarda `BASE_URL`, agrega el token y maneja el 401 (limpia sesión y manda a `/login`).
- **Todas las pantallas usan `api()`** (home, préstamos, deudores y los dos detalles). `login.tsx` usa `fetch` directo pero toma `BASE_URL` de `api.ts`, así que la IP vive en un solo lugar.

## 7. Estado actual: subida a Expo SDK 58 (en curso)

El Expo Go del iPhone de Kevin se actualizó y **solo soporta SDK 58**, así que el proyecto, que estaba en SDK 57, hay que subirlo.

Hecho hasta ahora:
1. `npx expo install expo@^58.0.0 --fix` subió `expo`, pero falló con `ERESOLVE` (conflicto entre `expo-router` y `expo-symbols`).
2. Se resolvió con `npx expo install --fix -- --legacy-peer-deps`. Los 24 paquetes quedaron alineados con SDK 58.
3. `BASE_URL` en `api.ts` ya apunta a `192.168.100.6` (la IP que mostró Metro).

**Siguiente paso inmediato:**
1. Correr `npx expo-doctor@latest` y revisar lo que reporte.
2. Arrancar con `npx expo start -c`, escanear el QR y confirmar que la app abre.
3. Revisar si los encabezados de iOS en las pantallas de detalle cambiaron de aspecto.
4. Si las listas no cargan, correr `ipconfig` y actualizar `BASE_URL` en `api.ts` (es el único lugar).

No correr `npm audit fix --force`: puede romper el proyecto.

## 8. Lo que falta, en orden

1. **Terminar y verificar el upgrade a SDK 58** (sección 7). Kevin pidió comprobar que funciona antes de seguir.
2. ~~Migrar el resto de pantallas a `api()`~~ (hecho el 6 nov 2026). **No migrar `login.tsx`**: ahí un 401 significa contraseña incorrecta y `api()` lo trataría como sesión vencida.
3. **Crear, editar y eliminar deudores**, luego **préstamos**. Deudores ya está completo: crear (`deudor/nuevo.tsx`), editar (`deudor/editar.tsx`, recibe `cedula` por params) y eliminar (desde el detalle), con el formulario compartido en `components/deudor-form.tsx`. **No se puede eliminar ni archivar un deudor con préstamos activos** (409). Sin activos sí se puede eliminar, pero la BD borra en cascada sus préstamos cerrados y cuotas, y la app lo avisa en la confirmación. **Archivar** (`PUT /api/deudores/:id/archivar` con `{ archivado }`) lo oculta de la lista sin borrar nada; `GET /api/alldeudores/:userId?archivados=true` trae los archivados, y la pestaña Deudores tiene el selector Todos/Archivados. **Crear préstamo** ya está (`prestamo/nuevo.tsx`): se abre desde el + de la pestaña Préstamos (elige deudor en un modal con buscador) o desde "+ Nuevo préstamo" en el detalle del deudor (params `deudorId`, `deudorNombre`). Fechas con `@react-native-community/datetimepicker`; se envían como "AAAA-MM-DD" y el backend las convierte a `Date`. Para préstamos viejos se crean todas las cuotas desde el inicio y **Wilfer marca a mano las que ya pagó** (decisión de Kevin). Falta editar/eliminar préstamo y registrar la devolución del capital.
- **Fechas en pantalla:** las de la BD son `@db.Date` (medianoche UTC). Al formatearlas usar `timeZone: "UTC"`, o en Colombia se ven un día antes.
4. **Subir documentos (letras)** desde el detalle del préstamo, con `expo-document-picker` y `expo-image-picker`.
5. **Lógica de negocio en el backend** (sección 5): ~~generación automática de cuotas~~ (hecho el 6 nov 2026); falta el cierre de préstamo al devolver el capital.
6. **Llevar a producción:** desplegar el backend en un servidor con URL fija (Railway, Render o Fly.io), cambiar `BASE_URL` en `api.ts`, y generar el build con `eas build` para que el papá instale la app sin Expo Go.

## 9. Lecciones y trampas ya vividas

- **Expo Router necesita un `_layout.tsx` propio.** El de la plantilla (con `AppTabs` y splash animado) dejaba la pantalla en blanco; se reemplazó por un `Stack` simple.
- **No poner dos rutas dinámicas distintas en la misma carpeta.** Un `[cedula].tsx` quedó por error dentro de `prestamo/` junto a `[id].tsx` y mostraba la pantalla equivocada. Cada entidad va en su propia carpeta.
- **Pantallas pegadas arriba:** necesitan `SafeAreaProvider` en el `_layout.tsx` raíz **y** usar de verdad `<SafeAreaView edges={["top"]}>`. Importarlo sin usarlo no hace nada.
- **Errores de tipos con `router.push`/`replace`** ("not assignable to parameter") se quitan creando el archivo de la ruta y reiniciando con `npx expo start -c`.
- **Tipos en `catch`:** `error` es `unknown`; usar `error instanceof Error ? error.message : "..."`.
- **El endpoint de cuotas vencidas** puede devolver préstamos o cuotas sin ciertos campos anidados; usar encadenado opcional (`cuota.prestamo?.deudor?.nombre ?? "Deudor"`) y `cuotas?: Cuota[]`.
- **Claves de SecureStore:** siempre `userToken` (no `token`).
- **La IP local puede cambiar** si el router reasigna direcciones; el celular y el PC deben estar en la misma WiFi.
- **Instalar paquetes Expo** con `npx expo install`, no con `npm install` a secas.
- **Cambios en la BD:** no hay carpeta de migraciones; se usa `npx prisma db push`. Antes, revisar el SQL con `npx prisma migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma --script` y confirmar con Kevin. `prisma generate` falla con `EPERM` si el backend está corriendo (Windows bloquea el `.dll` del motor): hay que detenerlo primero.
- **En pruebas con datos reales, buscar por id y no por cédula:** Kevin edita los datos desde la app mientras prueba, y una cédula vieja da falsos errores.
