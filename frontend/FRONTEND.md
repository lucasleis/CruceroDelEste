# Frontend — Crucero Del Este

Arquitectura completa del frontend con especificaciones por página para desarrollo con Claude Code.

**Stack:** Next.js con App Router
**State entre páginas:** URL params para `seat_ids`, re-fetch del viaje en checkout

---

## Índice

- [Decisiones de arquitectura](#decisiones-de-arquitectura)
- [Sitio Público](#sitio-público)
  - [`/` — Landing](#--landing)
  - [`/trips` — Listado de viajes](#trips--listado-de-viajes)
  - [`/trips/:id` — Detalle del viaje](#tripsid--detalle-del-viaje)
  - [`/checkout` — Reserva y pago](#checkout--reserva-y-pago)
  - [`/booking/success`](#bookingsuccess)
  - [`/booking/failure`](#bookingfailure)
  - [`/booking/pending`](#bookingpending)
  - [Páginas de soporte](#páginas-de-soporte)
- [Panel de Administración](#panel-de-administración)
  - [`/admin/login`](#adminlogin)
  - [`/admin` — Dashboard](#admin--dashboard)
  - [`/admin/bookings` — Gestión de reservas](#adminbookings--gestión-de-reservas)
  - [`/admin/trips` — Listado de viajes](#admintrips--listado-de-viajes)
  - [`/admin/trips/:id/pricing` — Tramos de precio](#admintripsidpricing--tramos-de-precio)
- [Endpoints del Backend](#endpoints-del-backend)
- [Pendientes del Backend](#pendientes-del-backend)

---

## Decisiones de arquitectura

- **Server Components por defecto.** Todo lo que no requiere interacción del usuario o estado local es Server Component.
- **Client Components acotados.** Solo donde hay interacción, estado local, o lectura de URL params en cliente.
- **State entre páginas vía URL params.** Los `seat_ids` viajan como query params de `/trips/:id` a `/checkout`. El viaje se re-fetchea en checkout. Más resiliente que sessionStorage y más fácil de debuggear.
- **Auth en middleware.** `middleware.ts` intercepta todas las rutas `/admin/*` y verifica el JWT. Si no hay token o expiró, redirect a `/admin/login`.
- **Fetching en paralelo.** Donde una página necesita múltiples endpoints, usar `Promise.all`.

---

## Sitio Público

---

### `/` — Landing

**Tipo:** Server Component como contenedor. El buscador es el único Client Component.

#### Componentes

**`<Hero>`** — Client Component
- Contiene el formulario de búsqueda
- Estado local: `origin`, `destination`, `date` (strings)
- `origin` y `destination`: `<select>` alimentados por `GET /routes` — no texto libre
- `date`: date picker, mínimo hoy, sin fecha pasada
- Al hacer submit: valida que los tres campos estén completos, luego navega a `/trips?origin=X&destination=Y&departure_date=Z`
- Sin llamada a la API al montar — los datos de rutas se fetchean en el Server Component padre y se pasan como props

**`<RouteCard>`** — Server Component
- Cards estáticas con rutas populares (contenido a definir en la reunión)
- Al hacer click navega a `/trips?origin=X&destination=Y` sin fecha (muestra todos los próximos)

**`<ValueProps>`** — Server Component
- Sección estática: 3–4 bullets de propuesta de valor
- Contenido a definir en la reunión

#### Fetching
En el Server Component raíz (`page.tsx`):
```
GET /routes → lista de { origin, destination } únicos
```
Se pasa al `<Hero>` como prop para poblar los selects.

#### Estados
- Si `GET /routes` falla: el Hero muestra campos de texto libre como fallback — no rompe la página
- No hay loading state visible — es Server Component, se resuelve antes de renderizar

#### Navegación
- Submit del buscador → `/trips?origin=&destination=&departure_date=`
- Click en RouteCard → `/trips?origin=&destination=`

---

### `/trips` — Listado de viajes

**Tipo:** Server Component como contenedor. Los filtros son Client Component.

#### Componentes

**`<FiltersBar>`** — Client Component
- Campos: origen, destino, fecha — pre-populados desde los query params de la URL
- `origin` y `destination`: `<select>` con las mismas rutas del `GET /routes`
- `date`: date picker, mínimo hoy
- Cada cambio actualiza la URL con `router.push` — no hay botón "Buscar", el cambio es inmediato
- El cambio de URL dispara un nuevo render del Server Component padre con los nuevos params

**`<TripList>`** — Server Component
- Recibe los query params, hace el fetch y renderiza las cards
- Si no hay resultados: estado vacío con mensaje y CTA para limpiar filtros

**`<TripCard>`** — Server Component
- Una por viaje. Contiene:
  - Ruta: origen → destino
  - Fecha y hora de salida / llegada estimada
  - Precio Cama y Semi Cama (ambos visibles si existen)
  - Asientos disponibles
  - Badge "Últimos X asientos" si `available_seats_count` < 5 (umbral a confirmar)
- Click en la card → `/trips/:id`

**`<TripCardSkeleton>`** — Client Component
- Placeholder visual mientras carga el listado
- Se usa con `<Suspense>` wrapeando `<TripList>`

#### Fetching
En `<TripList>` (Server Component):
```
GET /trips?origin=&destination=&departure_date=
```
Los tres params son opcionales. Sin ninguno, trae todos los viajes futuros.

#### Estados
- **Loading:** `<Suspense>` con `<TripCardSkeleton>` mientras resuelve el fetch
- **Sin resultados:** "No hay viajes disponibles para esa búsqueda" + botón "Ver todos los viajes" que limpia los filtros
- **Error de red:** mensaje genérico + botón de reintento

#### Navegación
- Viene desde: Hero del home (con params), RouteCard (con origen/destino), navbar
- Sale hacia: `/trips/:id` al hacer click en una card

---

### `/trips/:id` — Detalle del viaje

**Tipo:** Server Component como contenedor. El selector de asientos es Client Component.

#### Componentes

**`<TripSummary>`** — Server Component
- Ruta, fecha/hora de salida y llegada, duración estimada
- Datos vienen del objeto del viaje

**`<SeatTypeToggle>`** — Client Component
- Toggle Cama / Semi Cama
- Estado local: `selectedType` ('cama' | 'semi_cama')
- Muestra precio actual del tipo seleccionado
- Al cambiar filtra el mapa de asientos

**`<SeatMap>`** — Client Component
- Grid visual del colectivo
- Recibe todos los asientos como prop (fetcheados en el servidor)
- Filtra por `selectedType` en cliente — sin llamada adicional a la API
- Cada asiento tiene estado visual: disponible (clickeable), reservado (bloqueado), vendido (bloqueado)
- Estado local: `selectedSeats[]` — array de `seat_id`
- Al hacer click en un asiento disponible: lo agrega o quita del array
- Máximo de asientos seleccionables: a definir

**`<BookingSummary>`** — Client Component
- Panel sticky lateral (desktop) o bottom bar (mobile)
- Muestra: asientos seleccionados, precio por asiento, total
- CTA "Reservar" — deshabilitado si `selectedSeats` está vacío
- Al hacer click navega a `/checkout?trip_id=X&seat_ids=A,B,C`

#### Fetching
En el Server Component raíz (`page.tsx`), en paralelo:
```
GET /trips/:id        → datos del viaje (pendiente de implementar en backend)
GET /trips/:id/seats  → todos los asientos con estado
```
Los asientos se pasan como prop a `<SeatMap>`.

#### Estados
- **Loading:** Suspense con skeleton del mapa
- **Viaje no encontrado:** 404 con `notFound()` de Next.js
- **Todos los asientos ocupados:** mensaje visible, CTA deshabilitado, sugerencia de ver otros viajes
- **Asiento recién tomado:** si al crear la reserva un asiento ya no está disponible, el backend devuelve `409`. Mostrar error inline y refrescar el mapa.

#### Navegación
- Viene desde: `/trips` (card)
- Sale hacia: `/checkout?trip_id=X&seat_ids=A,B,C`

---

### `/checkout` — Reserva y pago

**Tipo:** Client Component completo. Maneja un flujo de dos fases con estado propio.

#### Fases

**Fase 1 — Formulario** (antes del `POST /bookings`)
- Lee `trip_id` y `seat_ids` de los query params de la URL
- Re-fetchea los datos del viaje con `GET /trips/:id`
- Usuario completa los datos de los pasajeros
- CTA: "Confirmar reserva"

**Fase 2 — Reserva creada** (después del `POST /bookings`)
- Timer activo con `expires_at` recibido en la respuesta
- CTA: "Ir a pagar" → redirect a `init_point` de MercadoPago

Estado local: `phase: 'form' | 'reserved'`. No son dos páginas distintas.

#### Componentes

**`<TripSummary>`** — presentacional
- Resumen del viaje y asientos seleccionados (read-only)
- Datos del re-fetch de `GET /trips/:id`

**`<PassengerForm>`** — Client Component
- Un bloque por asiento seleccionado (derivado de `seat_ids` en la URL)
- Campos por pasajero: nombre, apellido, DNI, email, teléfono
- Validación inline antes de hacer el POST
- Si hay un solo asiento, el email del pasajero es el email de contacto para el ticket

**`<BookingTimer>`** — Client Component
- Visible solo en Fase 2
- Countdown desde `expires_at` recibido en la respuesta del POST
- Al llegar a 0: mensaje "Tu reserva expiró" + CTA para volver a seleccionar asientos
- El timer corre en cliente, no hace polling al backend

**`<PriceSummary>`** — presentacional
- Detalle: asientos × precio + total
- Datos del re-fetch de `GET /trips/:id`

#### Fetching
Al montar (Fase 1):
```
GET /trips/:id  → re-fetch para tener datos frescos del viaje y precios
```

Al confirmar formulario:
```
POST /bookings
Body: { trip_id, seat_ids[], passengers[] }
Respuesta exitosa: { id, expires_at, init_point, ... } → pasa a Fase 2
```

#### Estados
- **Sin query params válidos** (URL directa sin seat_ids): redirect a `/trips`
- **Fase 1 — formulario incompleto:** CTA deshabilitado
- **Fase 1 — enviando POST:** CTA en loading, formulario bloqueado
- **Fase 2 — reserva activa:** timer corriendo, CTA "Ir a pagar"
- **Fase 2 — reserva expirada:** timer en 0, mensaje de expiración, CTA para volver
- **Error `409 seat_unavailable`:** mostrar qué asiento fue tomado + CTA para volver al mapa
- **Error `502 payment_gateway_error`:** mensaje genérico + opción de reintentar

#### Navegación
- Viene desde: `/trips/:id` con `?trip_id=X&seat_ids=A,B,C` en la URL
- Sale hacia: `init_point` (MercadoPago, externo)

---

### `/booking/success`

**Tipo:** Client Component. MercadoPago redirige acá con query params.

#### Query params recibidos de MercadoPago
- `payment_id`
- `status` (`approved`)
- `external_reference` → es el `booking_id`
- `merchant_order_id`

#### Componentes

**`<BookingStatus>`** — Client Component
- Al montar: hace `GET /bookings/:id` con el `external_reference` de la URL
- Polling cada 3 segundos hasta que `status === 'confirmed'`, máximo 5 intentos
- Si confirma: muestra número de reserva, resumen del viaje, aviso de email enviado, CTA "Volver al inicio"
- Si no confirma tras 5 intentos: "Tu pago fue recibido. El email puede demorar unos minutos." — no mostrar error

**Por qué polling:** el webhook de MercadoPago puede llegar después del redirect. Mostrar "confirmado" sin verificar genera inconsistencia.

#### Navegación
- Viene desde: MercadoPago (redirect externo)
- Sale hacia: `/`

---

### `/booking/failure`

**Tipo:** Client Component.

#### Componentes
- Mensaje claro: "El pago no fue procesado" — sin códigos de error técnicos
- CTA primario: "Volver a intentar" → `/trips/:id` con los mismos asientos si es posible (reconstruir desde `external_reference`)
- CTA secundario: "Ver otros viajes" → `/trips`

#### Navegación
- Viene desde: MercadoPago (redirect externo)

---

### `/booking/pending`

**Tipo:** Client Component. Para pagos en efectivo (Rapipago, Pago Fácil).

#### Componentes
- Mensaje: "Tenés X horas para completar el pago. Te enviamos las instrucciones por email."
- Número de reserva visible (desde `external_reference`)
- Sin CTA de reintento — el pago está en curso

#### Navegación
- Viene desde: MercadoPago (redirect externo)

---

### Páginas de soporte

| Ruta | Descripción | Prioridad |
|---|---|---|
| `/about` | Quiénes somos | Opcional MVP |
| `/contact` | Contacto | Opcional MVP |
| `/terms` | Términos y condiciones | **Requerido por MercadoPago** |
| `/privacy` | Política de privacidad | **Requerido por MercadoPago** |

---

## Panel de Administración

Contexto separado del sitio público. Todas las rutas `/admin/*` requieren JWT válido. El `middleware.ts` intercepta cada request y redirige a `/admin/login` si no hay token o expiró.

### Layout compartido (`/admin/layout.tsx`)
- Sidebar con links: Dashboard, Reservas, Viajes
- Header: nombre del admin logueado + botón logout
- Logout: elimina el JWT y redirige a `/admin/login`

---

### `/admin/login`

**Tipo:** Client Component completo. Ruta pública.

#### Componentes

**`<LoginForm>`** — Client Component
- Campos: email, contraseña
- Validación inline: ambos campos requeridos antes de habilitar submit
- Al hacer submit: `POST /admin/login`
- Respuesta exitosa: guarda el JWT, redirect a `/admin`
- Error `401`: mensaje "Email o contraseña incorrectos" inline bajo el formulario — no toast, no alert
- Sin "olvidé mi contraseña", sin registro

#### Fetching
```
POST /admin/login
Body: { email, password }
Respuesta: { access_token, token_type }
```

#### Auth — persistencia del JWT
- Guardar en `httpOnly cookie` si el backend lo permite, sino `localStorage`
- **Decisión a confirmar con el backend antes de implementar**

#### Estados
- **Enviando:** botón en loading, campos bloqueados
- **Error credenciales:** mensaje inline, campos desbloqueados
- **Error de red:** mensaje genérico + opción de reintentar
- **Ya autenticado:** redirect automático a `/admin` al montar

---

### `/admin` — Dashboard

**Tipo:** Server Component como contenedor.

#### Componentes

**`<RecentBookings>`** — Server Component
- Tabla con las últimas 10 reservas confirmadas
- Columnas: ID, viaje, pasajero principal, monto, fecha
- Link "Ver todas" → `/admin/bookings`

**`<QuickNav>`** — Server Component
- Cards de acceso rápido a Reservas y Viajes
- Estático, sin fetching

#### Fetching
```
GET /admin/bookings?booking_status=confirmed
Header: Authorization: Bearer {token}
→ tomar los primeros 10 resultados
```

#### Estados
- **Sin reservas recientes:** "No hay reservas confirmadas aún"
- **Error de fetch:** mensaje inline en el widget, no rompe toda la página

---

### `/admin/bookings` — Gestión de reservas

**Tipo:** Server Component como contenedor. Los filtros son Client Component.

#### Componentes

**`<BookingFilters>`** — Client Component
- Filtros: estado (`pending` / `confirmed` / `expired`) y viaje (select con lista de viajes)
- Cada cambio actualiza la URL con `router.push` → dispara nuevo fetch en servidor
- El select de viajes necesita `GET /admin/trips` — **bloqueado hasta que exista el endpoint**

**`<BookingsTable>`** — Server Component
- Recibe los query params, hace el fetch, renderiza la tabla
- Columnas: ID booking, viaje (origen → destino + fecha), fecha de creación, estado, monto total
- Badge de color por estado: verde (confirmed), amarillo (pending), gris (expired)
- Cada fila es expandible para ver el detalle de pasajeros

**`<PassengerDetail>`** — Client Component
- Panel expandible por fila
- Muestra por pasajero: nombre completo, DNI, email, teléfono, número de asiento, tipo de asiento
- Expandido/colapsado con estado local por fila

**`<BookingsTableSkeleton>`** — Client Component
- Placeholder mientras carga la tabla
- Usado con `<Suspense>`

#### Fetching
```
GET /admin/bookings?booking_status=&trip_id=
Header: Authorization: Bearer {token}
```

#### Estados
- **Loading:** Suspense con skeleton de tabla
- **Sin resultados:** "No hay reservas con estos filtros"
- **Error de red:** mensaje + botón reintento
- **Token expirado:** middleware redirige a `/admin/login`

---

### `/admin/trips` — Listado de viajes

**Tipo:** Server Component como contenedor.

> ⚠️ **Bloqueado.** Requiere `GET /admin/trips` — pendiente de implementar en el backend. No desarrollar hasta que el endpoint exista. Mostrar placeholder en sidebar.

#### Componentes (cuando el endpoint esté disponible)

**`<TripsList>`** — Server Component
- Tabla: ruta, fecha salida, estado, asientos vendidos / total, precio actual Cama / Semi Cama
- Cada fila tiene acciones: ir a pricing, ver asientos

#### Fetching
```
GET /admin/trips  ← PENDIENTE DE BACKEND
Header: Authorization: Bearer {token}
```

---

### `/admin/trips/:id/pricing` — Tramos de precio

**Tipo:** Client Component completo. Las operaciones de crear y eliminar requieren interacción y feedback inmediato.

#### Componentes

**`<PriceTrancheTable>`** — presentacional
- Tabla separada por tipo: Cama y Semi Cama
- Columnas: rango de vendidos (`min_sold` – `max_sold`), precio
- Indicador visual del tramo activo (el que aplica según vendidos actuales)
- Botón eliminar por fila → `DELETE /admin/trips/:id/price-tranches/:tranche_id`

**`<ActiveTrancheBadge>`** — presentacional
- Muestra: "X asientos vendidos — Tramo actual: $XX.XXX"
- Se calcula en cliente comparando vendidos actuales contra los rangos

**`<AddTrancheForm>`** — Client Component
- Campos: tipo (Cama / Semi Cama), `min_sold`, `max_sold`, precio
- Validación inline: `min_sold` < `max_sold`, precio > 0
- Al hacer submit: `POST /admin/trips/:id/price-tranches`
- Error `409 tranche_overlap`: mensaje inline "El rango se superpone con un tramo existente"
- Tras éxito: limpia el formulario y actualiza la tabla sin recargar la página

#### Fetching
Al montar, en paralelo:
```
GET /admin/trips/:id/price-tranches   → tramos configurados
GET /trips/:id/seats?status=sold      → contar vendidos actuales por tipo
Header: Authorization: Bearer {token}
```

Acciones:
```
POST   /admin/trips/:id/price-tranches
DELETE /admin/trips/:id/price-tranches/:tranche_id
```

#### Estados
- **Loading inicial:** skeleton de tabla
- **Tabla vacía:** "No hay tramos configurados. Agregá el primero."
- **Overlap error:** mensaje inline en el formulario
- **Eliminando:** fila en loading, botón deshabilitado
- **Sin tramo activo:** warning "Este viaje no tiene un tramo que cubra la cantidad actual de asientos vendidos"

---

## Endpoints del Backend

### Disponibles ✓

| Método | Ruta | Descripción | Auth |
|---|---|---|---|
| `POST` | `/admin/login` | Login admin, devuelve JWT | — |
| `GET` | `/admin/bookings` | Listar reservas con filtros | Admin |
| `GET` | `/admin/trips/:id/price-tranches` | Ver tramos de precio de un viaje | Admin |
| `POST` | `/admin/trips/:id/price-tranches` | Crear tramo de precio | Admin |
| `DELETE` | `/admin/trips/:id/price-tranches/:tranche_id` | Eliminar tramo | Admin |
| `GET` | `/trips` | Listar viajes con filtros y precios actuales | — |
| `GET` | `/trips/:id/seats` | Listar asientos de un viaje | — |
| `POST` | `/bookings` | Crear reserva y generar preferencia de pago | — |
| `GET` | `/bookings/:id` | Consultar estado de una reserva | — |
| `POST` | `/webhooks/mercadopago` | Recibir notificación de pago | — |

---

## Pendientes del Backend

### Prioridad alta — bloquean funcionalidad core

**`GET /routes`**
- Necesario para: buscador del home y filtros de `/trips` con dropdowns
- Sin esto: texto libre que puede no matchear con los valores de la DB (mayúsculas, tildes)
- Sugerencia: devolver lista de strings únicos de `Route.origin` y `Route.destination`

**`GET /trips/:id`**
- Necesario para: que `/trips/:id` y `/checkout` funcionen con URL directa
- Sin esto: la página solo funciona si el usuario navegó desde el listado y el objeto está en memoria
- Puede reusar la lógica de `GET /trips` filtrando por ID

### Prioridad media — bloquean el panel admin

**`GET /admin/trips`** — Listar todos los viajes
- Necesario para: filtro por viaje en `/admin/bookings` y navegación a pricing
- Sin esto: `/admin/trips` no se puede implementar y el filtro de bookings queda sin datos

**`POST /admin/trips`** — Crear viaje
- Campos mínimos: `route_id`, `departure_at`, `arrival_at`

**`PUT /admin/trips/:id`** — Editar viaje
- Necesario para: corregir horarios, cambiar estado (`scheduled` → `cancelled`)

### Prioridad baja — post MVP

**`GET /admin/metrics`**
- Necesario para: KPIs en el dashboard (ingresos del día, ocupación por viaje)
- Sin esto: el dashboard es solo navegación, sin valor informativo

---

## Notas de implementación

- **Sin login de pasajeros.** No hay modelo de usuario pasajero en el backend. No implementar "Mi cuenta" ni historial de compras en el MVP.
- **Sin cancelaciones.** El roadmap lo contempla pero no hay backend. No exponer en la UI.
- **Paginación.** `GET /admin/bookings` tiene límite de 500 sin paginación. Revisar cuando el volumen crezca.
- **MercadoPago redirect URLs.** El backend usa `FRONTEND_URL` para armar los redirects. Las rutas `/booking/success`, `/booking/failure` y `/booking/pending` deben coincidir exactamente con lo configurado en esa variable de entorno.
- **Persistencia del JWT.** Definir si se usa `httpOnly cookie` o `localStorage` antes de implementar el login. Impacta el middleware de autenticación.
