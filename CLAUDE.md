# Capitalia: contexto del proyecto

Este archivo es un resumen para que Claude entienda el proyecto desde el primer momento: qué es, cómo está armado, qué se hizo, qué falta y cómo trabajar con Kevin. Fecha del resumen: 6 de noviembre de 2026.

## 1. Qué es Capitalia

App para que el papá de Kevin administre los préstamos que hace a otras personas (deudores). Kevin la construye y la necesitan rápido.

- El **backend ya está completo** y funcionando.
- El frontend se hizo primero en React web (carpeta `Frontend/`), pero se decidió **rehacerlo desde cero como app móvil**, porque el papá la va a usar desde el celular. Solo había login y la pantalla principal, así que se perdió muy poco. `Frontend/` no se usa por ahora.
- La app móvil usa **React Native con Expo y Expo Router**, y habla con el mismo backend y la misma base de datos.

## 2. Cómo trabajar con Kevin

- **Idioma:** español, tono cálido y cercano.
- **Colores siempre del tema (modo claro/oscuro):** ninguna pantalla usa colores fijos (`"#fff"`). Se usa `const { colores } = useTema()` y `const styles = useMemo(() => crearEstilos(colores), [colores])`, con `crearEstilos = (c: Colores) => StyleSheet.create({...})`. Paletas en `theme/colores.ts`, proveedor en `theme/tema.tsx` (preferencia "sistema" / "claro" / "oscuro" guardada en SecureStore), estilos comunes de formularios en `theme/formulario.ts`, selector de listas en `components/filtro.tsx`. Todo texto necesita `color` explícito, o en modo oscuro sale negro sobre negro.
- **Diseño de las pantallas (nov 2026):** banda oscura arriba (`c.banda`, solo el título; en Inicio también "Capitalia", el saludo y el capital) y una "hoja" redondeada encima (`c.hoja`, `marginTop: -20`, radios de 28). Las pantallas con banda llaman `useBarraClara()` (`theme/barra-estado.ts`) para la hora en blanco. Tarjetas con borde fino `c.separador` y radio 16, círculo con iniciales (`utils/texto.ts`), botón punteado "+ Nuevo..." al final de las listas. Montos con la letra del sistema y `fontVariant: numerosMontos` (`theme/fuentes.ts`). El detalle del préstamo no muestra datos del deudor (están en Deudores). En Inicio, las tarjetas "Vencidas" y "Por cobrar" abren `cuotas/[tipo].tsx` (`tipo` = `vencidas` o `por-cobrar`); las listas de cuotas ya no van en Inicio.
- **Sin emojis en la app:** ningún texto de la interfaz lleva emojis ni símbolos decorativos (✓, →). Pedido de Kevin.
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

Base URL en desarrollo: `http://<IP-local-del-PC>:3000`, en `mobile/.env.local` como `EXPO_PUBLIC_API_URL` (no se sube a GitHub; tras cambiarla, `npx expo start -c`). **`localhost` no funciona desde el celular.** **No hay registro público** (se quitó el 8 nov 2026; los usuarios se crean con `npm run usuario`) y el login tiene límite de 10 intentos fallidos cada 15 min (`express-rate-limit` en `authRoutes.ts`). Todas las rutas, salvo el login, necesitan `Authorization: Bearer <token>`: el middleware `backend/src/middleware/auth.ts` lo verifica y deja el id en `res.locals.usuarioId`. **Los controladores siempre usan ese id**, nunca el `:usuarioId` de la URL (que se ignora) ni uno del body, y en rutas por id comprueban que el registro sea del usuario (si no, 404). Así Wilfer y Kevin nunca ven lo del otro.

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
- Esto lo hace `syncInstallments(usuarioId)` en `backend/src/services/installmentService.ts`: para cada préstamo **activo** toma la última cuota (o `fechaInicio` si no tiene) y crea las que falten, mes a mes. **Con fecha fin: todas hasta `fechaFinPlazo`. Sin fecha fin: las vencidas más una próxima sin pagar** (así un préstamo nuevo siempre muestra su primera cuota). Si esa próxima se marca pagada por adelantado, se crea la siguiente al recargar; si se desmarca, `updateInstallment` borra la siguiente sin pagar que había salido por ese pago (decidido el 8 nov 2026). El resumen de `prestamo/nuevo.tsx` replica esta regla; si cambia una, cambiar la otra. Interés = `montoCapital × tasaInteres / 100`. Se llama al inicio de las rutas de cuotas vencidas, cuotas del mes, préstamos del usuario, préstamos activos y préstamo por id.
- Al marcar una cuota como pagada, la app pregunta "¿Cuándo pagó?" (Hoy / Otra fecha, con `components/fecha-pago.tsx`, sin días futuros) y envía `fechaPago` como "AAAA-MM-DD"; el backend la convierte a `Date`. Sin `fechaPago`, el backend guarda la fecha de hoy.
- **Recordatorios (notificaciones locales, 9 nov 2026):** `services/notificaciones.ts` con `expo-notifications`. Cada vez que Inicio carga los préstamos activos (y tras marcar, cerrar, extender o eliminar en el detalle) se borran y se reprograman: cuota sin pagar el día antes, el día y 3 días después; plazo 7 días antes y el día; todo a las 8 a. m., máximo 60 (límite de iPhone). Tocar el aviso abre el préstamo (`(tabs)/_layout.tsx`). Interruptor en Ajustes (preferencia `notificaciones` = "no" en SecureStore); cerrar sesión los cancela. Push desde el servidor (Firebase) quedó para después si hace falta.
- **Cerrar préstamo** (`POST /api/prestamos/:id/cerrar` con `{ conservarPendientes }`): el deudor devolvió el capital. Se guarda la fecha en `prestamos.capital_devuelto` y se borran las cuotas futuras sin pagar. Si tenía cuotas vencidas sin pagar, la app pregunta: **conservarlas como deuda** (sigue `activo`, ya no se generan cuotas, y al pagar la última pasa solo a `pagado` vía `actualizarEstadoPorCuotas`) o **eliminarlas** (queda `pagado` de una vez). Decidido por Kevin el 6 nov 2026.
- **El préstamo termina cuando el deudor devuelve el capital, no cuando se acaban las cuotas.** Con fecha fin: al pasar la fecha sin capital devuelto, el préstamo queda en **"Plazo vencido"** y **no se generan más cuotas** hasta que Wilfer decida (opción A, elegida por Kevin): "Devolvió el capital" (cerrar) o "Extender el plazo" (`POST /api/prestamos/:id/extender` con `{ meses: 1|3|6 }` o `{ sinFecha: true }`). La regla está en `estadoPlazo()` de `utils/fechas.ts` ("vencido" / "hoy" / "pronto" ≤ 30 días). Se ve en la etiqueta de Préstamos, en la sección "Plazos vencidos" de Inicio y en el aviso del detalle.
- **Eliminar préstamo** es para registros hechos por error: borra el préstamo y todas sus cuotas.
- **Editar préstamo** (`prestamo/editar.tsx`, solo si está activo y sin capital devuelto): las cuotas pagadas nunca cambian. Monto/tasa → las cuotas sin pagar toman el nuevo interés. Fecha fin → se borran las sin pagar posteriores y la sincronización crea las que falten. Fecha de inicio → solo si no hay cuotas pagadas (la app la bloquea); se rehacen todas. El formulario de nuevo/editar está en `components/prestamo-form.tsx`.
- **Letras (documentos)** en Cloudinary, cuenta del correo exclusivo de Capitalia; claves `CLOUDINARY_*` en `backend/.env` (**nunca pedirlas en el chat**). Se suben como `authenticated` (privadas): `url_archivo` guarda el **public_id**, no un enlace, y el backend firma enlaces al devolver el préstamo (`conEnlaces`). Fotos como `image` (con miniatura); PDF como `raw` y se ven con `private_download_url` (caduca en 1 h), porque la cuenta gratis bloquea entregar PDF por enlace ("deny or ACL failure"). Al eliminar un préstamo o deudor se borran también sus archivos en Cloudinary. App: `components/letras.tsx` en el detalle del préstamo (cámara, galería o PDF; tocar una letra para Ver/Eliminar).
- **Desmarcar cuota**: tocar "Pagada ✓" en el detalle; el backend borra `fechaPago` y reabre el préstamo si se había cerrado solo.
- **"Vencida" = antes de hoy; "vence hoy" no es vencida.** En la app usar `utils/fechas.ts` (`estadoVencimiento`); en el backend comparar contra el inicio del día en UTC, nunca contra `new Date()`.
- Los préstamos tienen **documentos**: las "letras", que son el documento de compromiso firmado por ambas partes. Suelen ser PDFs escaneados o fotos.
- La app es **principalmente para Wilfer**. Abrirla a más prestamistas queda para más adelante; la cédula del deudor es **única por prestamista** (`@@unique([cedula, usuarioId])`, desde el 9 nov 2026): dos prestamistas pueden tener al mismo deudor y ninguno se entera del otro.
- Usuarios en la BD: hay **dos prestamistas reales, Wilfer (el papá) y Kevin Otalvaro**. Cada uno debe ver solo sus deudores, préstamos y cuotas; nunca cruzarlos. Los usuarios de prueba (Carlos Mendoza y Ana Gómez) se borraron el 7 nov 2026. Para cambiar una contraseña olvidada o crear un usuario: `npm run usuario` en `backend/` (`src/scripts/usuario.ts`, pide la contraseña sin mostrarla). Las contraseñas están cifradas con bcrypt y no se pueden leer.

## 6. Lo que ya funciona

- Login con sesión persistente y cierre de sesión.
- Navegación por pestañas: Inicio, Préstamos, Deudores.
- Dashboard: saludo, contadores de cuotas vencidas y del mes, listas con nombre del deudor, tocables hacia el detalle del préstamo; se recarga al volver a la pestaña (`useFocusEffect`).
- Préstamos: lista con filtro Activos/Todos, badge de cuotas vencidas, detalle con cuotas y botón "Marcar pagada".
- Deudores: lista con total prestado y detalle con sus préstamos, enlazado al detalle de préstamo.
- `services/api.ts` creado: guarda `BASE_URL`, agrega el token y maneja el 401 (limpia sesión y manda a `/login`).
- **Todas las pantallas usan `api()`** (home, préstamos, deudores y los dos detalles). `login.tsx` usa `fetch` directo pero toma `BASE_URL` de `api.ts`, que la lee de `EXPO_PUBLIC_API_URL`.

## 7. Estado actual: subida a Expo SDK 58 (en curso)

El Expo Go del iPhone de Kevin se actualizó y **solo soporta SDK 58**, así que el proyecto, que estaba en SDK 57, hay que subirlo.

Hecho hasta ahora:
1. `npx expo install expo@^58.0.0 --fix` subió `expo`, pero falló con `ERESOLVE` (conflicto entre `expo-router` y `expo-symbols`).
2. Se resolvió con `npx expo install --fix -- --legacy-peer-deps`. Los 24 paquetes quedaron alineados con SDK 58.
3. `BASE_URL` sale de `EXPO_PUBLIC_API_URL` en `mobile/.env.local` (hoy `http://192.168.100.6:3000`).

**Siguiente paso inmediato:**
1. Correr `npx expo-doctor@latest` y revisar lo que reporte.
2. Arrancar con `npx expo start -c`, escanear el QR y confirmar que la app abre.
3. Revisar si los encabezados de iOS en las pantallas de detalle cambiaron de aspecto.
4. Si las listas no cargan, correr `ipconfig` y actualizar `EXPO_PUBLIC_API_URL` en `mobile/.env.local` y reiniciar con `npx expo start -c`.

No correr `npm audit fix --force`: puede romper el proyecto.

## 8. Lo que falta, en orden

1. **Terminar y verificar el upgrade a SDK 58** (sección 7). Kevin pidió comprobar que funciona antes de seguir.
2. ~~Migrar el resto de pantallas a `api()`~~ (hecho el 6 nov 2026). **No migrar `login.tsx`**: ahí un 401 significa contraseña incorrecta y `api()` lo trataría como sesión vencida.
3. **Crear, editar y eliminar deudores**, luego **préstamos**. Deudores ya está completo: crear (`deudor/nuevo.tsx`), editar (`deudor/editar.tsx`, recibe `cedula` por params) y eliminar (desde el detalle), con el formulario compartido en `components/deudor-form.tsx`. **No se puede eliminar ni archivar un deudor con préstamos activos** (409). Sin activos sí se puede eliminar, pero la BD borra en cascada sus préstamos cerrados y cuotas, y la app lo avisa en la confirmación. **Archivar** (`PUT /api/deudores/:id/archivar` con `{ archivado }`) lo oculta de la lista sin borrar nada; `GET /api/alldeudores/:userId?archivados=true` trae los archivados, y la pestaña Deudores tiene el selector Todos/Archivados. **Crear préstamo** ya está (`prestamo/nuevo.tsx`): se abre desde el + de la pestaña Préstamos (elige deudor en un modal con buscador) o desde "+ Nuevo préstamo" en el detalle del deudor (params `deudorId`, `deudorNombre`). Fechas con `@react-native-community/datetimepicker`; se envían como "AAAA-MM-DD" y el backend las convierte a `Date`. Para préstamos viejos se crean todas las cuotas desde el inicio y **Wilfer marca a mano las que ya pagó** (decisión de Kevin). Falta editar/eliminar préstamo y registrar la devolución del capital.
- **Fechas en pantalla:** las de la BD son `@db.Date` (medianoche UTC). Al formatearlas usar `timeZone: "UTC"`, o en Colombia se ven un día antes.
4. **Subir documentos (letras)** desde el detalle del préstamo, con `expo-document-picker` y `expo-image-picker`.
5. **Lógica de negocio en el backend** (sección 5): ~~generación automática de cuotas~~ (hecho el 6 nov 2026); falta el cierre de préstamo al devolver el capital.
6. **Ajustes** (pestaña `(tabs)/ajustes.tsx`): perfil (`cuenta/perfil.tsx`, `PUT /api/perfil`), cambiar contraseña (`cuenta/contrasena.tsx`, `PUT /api/perfil/password`, exige la actual y responde 400, no 401, si es incorrecta) y cerrar sesión (`cerrarSesion()` en `services/api.ts`). Los correos se guardan en minúsculas y el login los normaliza. **Pendiente: modo claro/oscuro**, que requiere pasar todas las pantallas de colores fijos a un tema.
7. ~~Antes de producción: cerrar `POST /api/auth/register`~~ (hecho el 8 nov 2026, junto con el límite de intentos de login y el borrado de los archivos sin usar de la plantilla de Expo).
8. **Beta en producción (desde el 8 nov 2026):** Wilfer la usa en **Android** con un APK. Empezó con la base de datos **vacía** (los datos locales eran de prueba).
   - **Backend en Railway** (proyecto `authentic-balance`, servicio CAPITALIA, Root Directory `/backend`, se despliega solo al hacer push a `master`): `https://capitalia-production.up.railway.app`. Variables en Railway: `DATABASE_URL=${{Postgres.DATABASE_URL}}`, `JWT_SECRET` (distinto al local) y las `CLOUDINARY_*`. **Pre-deploy:** `npx prisma db push --skip-generate` (las tablas se actualizan solas al desplegar; si un cambio borraría datos, el despliegue falla). Healthcheck `/ping`. La base de datos **no tiene acceso público**.
   - **Crear usuarios o cambiar contraseñas en producción:** pestaña Console del servicio CAPITALIA en Railway, `$(ls -d /mise/installs/node/*/bin | head -1)/node dist/scripts/usuario.js` (en esa consola `node` no está en el PATH).
   - **App con EAS** (cuenta Expo `kevinsantiago0`, proyecto `@kevinsantiago0/capitalia`): `eas.json` perfil `preview` genera el APK con `EXPO_PUBLIC_API_URL` de Railway y canal `preview`. Build: `npx eas-cli@latest build -p android --profile preview` (desde `mobile/`).
   - **No cambiar nunca** `android.package` (`com.capitalia.app`) ni borrar el keystore en expo.dev: así cada APK nuevo se instala encima del anterior sin perder la sesión. Ícono: opción E "Préstamo que vuelve" (flechas y moneda con $), generado el 9 nov 2026 en `assets/images/` (incluye `notification-icon.png`); cambiarlo (o agregar paquetes nativos) requiere un build nuevo.
   - **Arreglos sin reinstalar (EAS Update):** `runtimeVersion` es la versión de la app (`version` en app.json, hoy 1.1.0). Subirla en cada APK que agregue paquetes nativos, para que ninguna actualización llegue a un APK que no la soporta. Al publicar, pasar la URL de Railway, porque `.env.local` apunta al PC: `EXPO_PUBLIC_API_URL=https://capitalia-production.up.railway.app npx eas-cli@latest update --channel preview`.
   - **Respaldos diarios** (Railway Backups exige el plan Pro): `src/scripts/respaldo.ts` + `services/respaldoService.ts` suben a Cloudinary (privado, raw) `capitalia/respaldos/respaldo-AAAA-MM-DD.json` con todas las tablas; se conservan los últimos 30 días y el más antiguo de cada mes. En Railway corre como servicio aparte con Cron. Restaurar: `npm run restaurar` (lista) / `npm run restaurar respaldo-AAAA-MM-DD` (pide escribir RESTAURAR y antes guarda `antes-de-restaurar-...`); en producción, desde la Console de Railway con `dist/scripts/restaurar.js` y la ruta completa de node. Para probar en el PC usar `RESPALDO_CARPETA=capitalia/respaldos-prueba`, nunca la carpeta real.
   - Pendiente: iPhone requiere la cuenta de Apple Developer (99 USD/año); opcional transferir el proyecto de Expo a la cuenta del correo de Capitalia.

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
- **Tema de la navegación en SDK 58:** `ThemeProvider`, `DarkTheme` y `DefaultTheme` se importan de `"expo-router"`, no de `"@react-navigation/native"`: expo-router trae su propia copia y la barra de pestañas ignora la otra. Además, la barra de pestañas recibe sus colores explícitos en `(tabs)/_layout.tsx`.
- **Subir archivos en SDK 58:** el `fetch` de Expo no acepta `{ uri, name, type }` en `FormData` ("Unsupported FormDataPart implementation"). Hay que adjuntar `{ name, type, bytes: () => new File(uri).bytes() }`, con `File` de `expo-file-system` (ver `components/letras.tsx`).
- **Cambios en la BD:** no hay carpeta de migraciones; se usa `npx prisma db push`. Antes, revisar el SQL con `npx prisma migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma --script` y confirmar con Kevin. `prisma generate` falla con `EPERM` si el backend está corriendo (Windows bloquea el `.dll` del motor): hay que detenerlo primero.
- **En pruebas con datos reales, buscar por id y no por cédula:** Kevin edita los datos desde la app mientras prueba, y una cédula vieja da falsos errores.
- **Railway (Railpack) no distingue mayúsculas en `package.json`:** un campo viejo `"Dependencies": [...]` lo confundió con `dependencies` e hizo fallar el despliegue, aunque npm lo ignoraba. Si un build de Railway falla en "Build image", leer el principio de los Build Logs.
- **Al firmar tokens de prueba con `node -e`**, usar `require('dotenv').config({ quiet: true })`: dotenv 17 imprime un mensaje en stdout que se mete en el token y da 400 o 401.
- **`db push` pide `--accept-data-loss` al agregar una regla de único** (aunque no borre nada, avisa que fallaría si hubiera repetidos). En Railway eso frena el pre-deploy: para ese despliegue se cambia temporalmente a `npx prisma db push --skip-generate --accept-data-loss` y luego se devuelve. Antes, comprobar que no hay repetidos. La BD local se creó con SQL a mano: sus reglas de único son *constraints*, no índices, y hay que quitarlas con `ALTER TABLE ... DROP CONSTRAINT` (`npx prisma db execute --stdin`).
