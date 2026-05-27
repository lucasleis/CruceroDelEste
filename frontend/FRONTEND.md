# Frontend — Crucero Del Este

Arquitectura completa del frontend. Indica qué endpoints de backend ya existen para cada página y qué falta desarrollar.

---

## Índice

- [Sitio Público](#sitio-público)
- [Panel de Administración](#panel-de-administración)
- [Endpoints del Backend](#endpoints-del-backend)
- [Pendientes del Backend](#pendientes-del-backend)

---

## Sitio Público

### `/` — Landing

**Secciones:**
- Hero con buscador: origen, destino, fecha *(sin campo pasajeros — el backend no lo requiere en esta etapa)*
- Destinos / rutas populares — cards estáticas con las rutas más frecuentes
- Propuesta de valor — precio directo, sin intermediarios, pricing dinámico
- CTA secundario → `/trips`

**Backend necesario:**
- `GET /routes` ✗ — *Ver [Pendientes del Backend](#pendientes-del-backend)*

---

### `/trips` — Listado de viajes

**Secciones:**
- Filtros pre-populados desde la URL (origen, destino, fecha)
- Card por viaje:
  - Ruta (origen → destino)
  - Fecha y hora de salida / llegada estimada
  - Precio actual Cama y Semi Cama
  - Asientos disponibles
  - Badge de urgencia si quedan pocos asientos (umbral a definir, ej: < 5)
- Estado vacío con CTA para modificar búsqueda

**Backend disponible:**
- `GET /trips?origin=&destination=&departure_date=` ✓
  - Devuelve: `id`, `route`, `departure_at`, `arrival_at`, `status`, `available_seats_count`, `current_price_cama`, `current_price_semi_cama`

---

### `/trips/:id` — Detalle del viaje

**Secciones:**
- Resumen del viaje: ruta, fecha/hora salida y llegada
- Toggle Cama / Semi Cama con precio actual de cada tipo
- Mapa visual de asientos filtrado por tipo seleccionado
  - Estados por asiento: `available`, `reserved`, `sold`
- Panel sticky: asientos seleccionados + precio total + CTA "Reservar"

**Backend disponible:**
- `GET /trips/:id/seats?seat_type=&status=` ✓
  - Devuelve: `seat_number`, `seat_type`, `status`

**Advertencia — no existe `GET /trips/:id`:**
El detalle del viaje no tiene endpoint propio. El objeto completo sólo está disponible en el listado. Opciones:
1. Guardar el objeto en estado al navegar desde `/trips` *(frágil: no funciona con URL directa)*
2. Agregar `GET /trips/:id` al backend *(recomendado — ver [Pendientes del Backend](#pendientes-del-backend))*

---

### `/checkout` — Reserva y pago

**Secciones:**
- Resumen del viaje y asientos seleccionados
- Formulario de pasajeros — un bloque por asiento con: nombre, apellido, DNI, email, teléfono
- Timer de 15 minutos visible desde el momento en que se crea la reserva (`expires_at`)
- CTA "Ir a pagar" → redirige a `init_point` de MercadoPago

**Flujo real:**
1. Usuario completa formulario
2. Frontend hace `POST /bookings` → recibe `expires_at` e `init_point`
3. Timer arranca con el `expires_at` recibido
4. Redirect a MercadoPago

**Backend disponible:**
- `POST /bookings` ✓
  - Requiere: `trip_id`, `seat_ids[]`, `passengers[]` (uno por asiento: `seat_id`, `first_name`, `last_name`, `dni`, `email`, `phone`)
  - Devuelve: `id`, `trip_id`, `status`, `total_amount`, `expires_at`, `passengers[]`, `init_point`

---

### `/booking/success` — Pago procesado

MercadoPago redirige a esta URL tras el intento de pago.

**Secciones:**
- Mensaje: "Tu pago está siendo procesado. Recibirás un email de confirmación en minutos."
- Consulta de estado con `GET /bookings/:id` para confirmar si ya está `confirmed`
- CTA "Volver al inicio"

**Por qué no mostrar "¡Confirmado!" de inmediato:** la confirmación real la dispara el webhook de MercadoPago, no el redirect. El redirect llega antes que el webhook. Mostrar confirmación prematura genera llamados al negocio cuando el email tarda.

**Backend disponible:**
- `GET /bookings/:id` ✓
  - Devuelve: `status` (`pending` / `confirmed` / `expired`), datos de la reserva

---

### `/booking/failure` — Pago fallido

**Secciones:**
- Mensaje claro sin tecnicismos
- CTA: volver al viaje o reintentar con los mismos datos si es posible

---

### `/booking/pending` — Pago pendiente

Para pagos en efectivo (Rapipago, Pago Fácil, etc.)

**Secciones:**
- Explicación: "Tenés X horas para pagar. Te enviamos un email con las instrucciones."
- Número de reserva visible

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

Contexto separado del sitio público. Requiere autenticación JWT en cada request.

---

### `/admin/login`

**Secciones:**
- Formulario: email + contraseña
- Sin registro público, sin "olvidé mi contraseña" (MVP)

**Backend disponible:**
- `POST /admin/login` ✓
  - Devuelve: `access_token`, `token_type`

---

### `/admin` — Dashboard

**Secciones:**
- Acceso rápido a las secciones del panel
- Reservas recientes (`GET /admin/bookings` con filtros)

**Nota:** no hay endpoints de métricas (ingresos del día, ocupación total). Para KPIs reales se necesitan endpoints nuevos — ver [Pendientes del Backend](#pendientes-del-backend).

---

### `/admin/bookings` — Gestión de reservas

**Secciones:**
- Filtros: por estado (`pending` / `confirmed` / `expired`) y por viaje
- Tabla: ID booking, viaje, fecha de creación, estado, monto total
- Detalle expandible por booking: datos de cada pasajero (nombre, apellido, DNI, email, teléfono, número de asiento)

**Backend disponible:**
- `GET /admin/bookings?booking_status=&trip_id=` ✓
  - Devuelve lista de bookings con pasajeros incluidos
  - Límite defensivo de 500 registros (sin paginación en MVP)

---

### `/admin/trips/:id/pricing` — Tramos de precio

**Secciones:**
- Tabla de tramos por tipo (Cama / Semi Cama): rango vendidos → precio
- Indicador del tramo activo: cuántos asientos vendidos hay ahora y en qué tramo está
- Formulario para agregar tramo: tipo, `min_sold`, `max_sold`, precio
- Acción eliminar tramo

**Backend disponible:**
- `GET /admin/trips/:id/price-tranches` ✓
- `POST /admin/trips/:id/price-tranches` ✓
  - Requiere: `seat_type`, `min_sold`, `max_sold`, `price`
  - Valida solapamiento de rangos (devuelve `409 tranche_overlap`)
- `DELETE /admin/trips/:id/price-tranches/:tranche_id` ✓

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
| `POST` | `/webhooks/mercadopago` | Recibir notificación de pago de MercadoPago | — |

---

## Pendientes del Backend

Endpoints que el frontend necesita y que aún no están implementados.

### Prioridad alta — bloquean funcionalidad core

**`GET /routes`** o **`GET /trips/origins`** + **`GET /trips/destinations`**

- Necesario para: buscador del home con dropdowns
- Sin esto: campo de texto libre que puede no matchear exactamente con los valores de la DB (mayúsculas, tildes, espacios)
- Sugerencia: devolver lista de strings únicos de `Route.origin` y `Route.destination`

---

**`GET /trips/:id`**

- Necesario para: que `/trips/:id` funcione con URL directa (bookmark, compartir link, recarga)
- Sin esto: la página sólo funciona si el usuario navegó desde el listado y el objeto está en estado
- Podría reusar la misma lógica de `GET /trips` filtrando por ID

---

### Prioridad media — bloquean el panel admin completo

**`GET /admin/trips`** — Listar todos los viajes

- Necesario para: filtro por viaje en `/admin/bookings` y navegación al pricing de cada viaje
- Sin esto: no se puede seleccionar un viaje en los filtros de reservas sin conocer el UUID de antemano

---

**`POST /admin/trips`** — Crear viaje

- Necesario para: gestión operativa básica desde el panel
- Campos mínimos: `route_id`, `departure_at`, `arrival_at`

---

**`PUT /admin/trips/:id`** — Editar viaje

- Necesario para: corregir horarios, cambiar estado (`scheduled` → `cancelled`)

---

### Prioridad baja — post MVP

**`GET /admin/metrics`** o similar

- Necesario para: KPIs en el dashboard (ingresos del día, ocupación por viaje)
- Sin esto: el dashboard es sólo navegación, sin valor informativo

---

**`GET /admin/trips/:id/seats`** con visión admin

- El endpoint público de seats ya existe, pero para el panel puede necesitar más datos (quién reservó cada asiento)

---

## Notas de implementación

- **Sin login de pasajeros:** no hay modelo de usuario pasajero en el backend. No implementar "Mi cuenta" ni historial de compras en el MVP.
- **Sin cancelaciones:** el roadmap lo contempla pero no hay backend. No exponer en la UI.
- **Paginación:** `GET /admin/bookings` tiene límite de 500 sin paginación. Anotarlo para cuando el volumen crezca.
- **MercadoPago redirect URLs:** el backend usa `FRONTEND_URL` para armar los redirects de success/failure/pending. Las rutas `/booking/success`, `/booking/failure` y `/booking/pending` deben coincidir exactamente con lo configurado en esa variable de entorno.
