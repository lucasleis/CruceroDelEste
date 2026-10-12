# Inventario propio — CruceroDelEste (Expreso Río Paraná)

Inventario descriptivo del código tal como está en `HEAD` a la fecha de este documento. Sin juicio de valor, sin propuesta de arquitectura. Cada afirmación está anclada a un archivo y símbolo concretos.

Alcance leído: `backend/app/routers/`, `backend/app/models/`, `backend/app/schemas/` (nombres, no contenido completo), `backend/app/services/`, y estructura de `frontend/` y `frontend-admin/` (sin leer componentes UI en detalle — son consumidores de los endpoints ya listados, no superficie propia adicional).

---

## 1. Catálogo — paradas, rutas y layouts de asiento

**Archivos:** `backend/app/routers/admin_catalog.py`, `backend/app/models/trip.py` (`Stop`, `Route`, `RouteStop`, `TripStopOverride`, `SeatLayout`, `SeatLayoutSeat`)

Modela paradas (`Stop`, con `country: AR|PY` y `province`), rutas entre dos paradas (`Route`, único par origen/destino), el orden de paradas intermedias de una ruta (`RouteStop`), y un override de ese orden por viaje puntual (`TripStopOverride`). `SeatLayout`/`SeatLayoutSeat` definen una plantilla de butacas (cantidad de `cama`/`semi_cama`, numeración, orden de despliegue) que se usa para generar las `Seat` reales de un `Trip` al crearlo.

Endpoints (todos bajo `/admin`, autenticados con `get_current_admin`):
- `GET /admin/seat-layouts`
- `POST /admin/stops`, `PATCH /admin/stops/{id}`, `DELETE /admin/stops/{id}`
- `GET/POST /admin/routes`, `GET /admin/routes/{id}/stops`, `POST/DELETE /admin/routes/{id}/stops/{stop_id}`, `PUT /admin/routes/{id}/stops/reorder`, `DELETE /admin/routes/{id}`
- `GET /admin/trips/{id}/stops`, `POST /admin/trips/{id}/stops/initialize`, `DELETE /admin/trips/{id}/stops/{stop_id}`, `PUT /admin/trips/{id}/stops/reorder`

Reglas de negocio en el código: `create_route` rechaza rutas con `origin.country == destination.country` (422 `international_route_required`); `update_stop`/`delete_stop` rechazan cambios que rompan rutas existentes (409 `stop_in_use`).

## 2. Catálogo — viajes (trips) y asientos administrativos

**Archivos:** `backend/app/routers/admin_catalog.py`, `backend/app/models/trip.py` (`Trip`, `Seat`)

CRUD de `Trip` (`route_id`, `seat_layout_id`, `departure_at`, `arrival_at`, `status: scheduled|completed|cancelled`). Al crear un `Trip`, se instancian todas las `Seat` copiando la plantilla del `SeatLayout` asociado. Incluye bloqueo/desbloqueo manual de un asiento puntual (`PATCH /admin/trips/{id}/seats/{seat_number}`, transición `available↔blocked`) y consulta de asientos de un viaje con su estado.

Endpoints: `GET/POST /admin/trips`, `GET/PATCH/DELETE /admin/trips/{id}`, `GET /admin/trips/{id}/seats`, `PATCH /admin/trips/{id}/seats/{seat_number}`.

Reglas: no se puede cancelar un `Trip` con bookings `confirmed` (409); no se puede borrar un `Trip` con cualquier booking asociado (409); no se puede borrar una `Route` con trips asociados (409).

## 3. Tarifas dinámicas por tramo (price tranches)

**Archivos:** `backend/app/services/pricing.py`, `backend/app/routers/admin.py` (endpoints), `backend/app/models/trip.py` (`PriceTranche`)

Cada `Trip` tiene hasta 5 tramos de precio por tipo de asiento (`cama`/`semi_cama`), definidos por `[min_sold, max_sold, price]` sobre la cantidad de asientos ya vendidos de ese tipo (no por tiempo). `get_current_price()` calcula el precio vigente contando `Seat` en estado `sold` y buscando el tramo que cubre ese conteo. `add_price_tranche()` valida: tope de 5 tramos, que el tramo no exceda la capacidad del `SeatLayout`, que no haya solapamiento entre tramos, que el primer tramo arranque en 0, y que no haya huecos entre tramos consecutivos — usando un lock advisory de Postgres (`pg_advisory_xact_lock`) para serializar altas concurrentes sobre el mismo `trip_id`.

Endpoints: `GET/POST /admin/trips/{id}/price-tranches`, `DELETE /admin/trips/{id}/price-tranches/{tranche_id}`.

## 4. Búsqueda e inventario de viajes (cara pública)

**Archivos:** `backend/app/routers/trips.py`

`GET /trips`: filtra por `origin`/`destination` (nombre exacto de `Stop`) o `origin_province`/`destination_province`, y `departure_date`; sin `departure_date` acota a los próximos 14 días. Devuelve, por viaje, cantidad de asientos disponibles y precio vigente por tipo de asiento (calculado inline, no reutiliza `pricing.py` — tiene su propia lógica de agregación SQL en `_available_counts`/`_current_prices`). `GET /trips/{id}`: detalle de un viaje, incluye `seat_layout_supported` (compara contra un nombre de layout hardcodeado, `SUPPORTED_SEAT_LAYOUT_NAME = "Standard - 2 Pisos"`, único soportado hoy por el frontend). `GET /trips/{id}/seats`: lista de asientos de un viaje con filtro opcional por tipo/estado — el propio docstring advierte que no es fuente de verdad de disponibilidad al momento de compra.

`GET /stops`: lista todas las paradas (con header de cache HTTP `max-age=300`). `GET /stops/{id}/valid-destinations`: dado un origen, devuelve las paradas del país opuesto (implementación de la regla AR↔PY del lado destino).

## 5. Bloqueo de asientos (reserva temporal) e inventario transaccional

**Archivos:** `backend/app/services/inventory.py`, `backend/app/models/trip.py` (`Seat.status`, `Seat.reserved_at`), `backend/tasks/reminders.py` (`expire_bookings_job`)

`reserve_seats()` toma un lock de fila (`FOR UPDATE NOWAIT`) sobre los `Seat` pedidos; si hay contención de lock (Postgres `55P03`) o algún asiento no está `available`, levanta `SeatUnavailableError`. Al reservar, pasa el asiento a `reserved` y setea `reserved_at`. `mark_seats_sold()` transiciona `reserved→sold` (usado al confirmar pago); si algún asiento no está en `reserved`, levanta `SeatAlreadyReleasedError`.

**Mecanismo de expiración (verificado):** no es un lock con TTL nativo (ni a nivel Postgres ni Redis) — es un poller. `expire_bookings_job()` (`tasks/reminders.py`) corre cada 1 minuto vía APScheduler (`IntervalTrigger(minutes=1)`, `misfire_grace_time=60`), consulta todos los `Booking` en `pending_payment` con `expires_at <= now`, y por cada uno llama a `expire_booking()` (`services/booking.py`), que libera los asientos asociados (`available`, `reserved_at=None`) y pasa el booking a `expired`. `bookings.expires_at` se fija una sola vez al crear el booking (`now + booking_expiry_minutes`, ver módulo 6) y no se recalcula por asiento — el "lock" real vive a nivel booking, no a nivel `Seat` individual, con hasta ~1 minuto de demora entre el vencimiento nominal y la liberación efectiva.

## 6. Reservas y flujo de compra (bookings)

**Archivos:** `backend/app/routers/bookings.py`, `backend/app/services/booking.py`, `backend/app/services/booking_code.py`, `backend/app/models/booking.py` (`Booking`, `Passenger`)

`POST /bookings`: valida que el `Trip` esté `scheduled` y no haya salido; arma pasajeros desde el body; llama a `create_booking()` que (a) valida la regla AR↔PY (`InternationalRouteRequiredError` → 422), (b) reserva los asientos, (c) calcula el total y arma los `items` para MercadoPago vía `pricing.get_current_price`, (d) genera un `booking_code` único legible (formato `ERP-XXXX-XXXX`, alfabeto de 32 símbolos sin caracteres ambiguos, `booking_code.py`), (e) persiste `Booking` + `Passenger`s. Después crea la preferencia de pago en MercadoPago; si falla, expira la reserva y libera los asientos.

`GET /bookings/{id}`: requiere un `token` HMAC firmado con `secret_key` (`generate_confirmation_token`), con ventana de validez de 60 min después de `confirmed_at`.

`Booking.status`: `pending_payment|confirmed|expired|refunded`. `confirm_booking()`/`expire_booking()`/`mark_booking_refunded()` en `services/booking.py` son las transiciones de estado, cada una idempotente (revisa el estado actual antes de actuar).

## 7. Cobro — integración MercadoPago

**Archivos:** `backend/app/services/payment.py`, `backend/app/services/http.py`, `backend/app/routers/payments.py`

`create_preference()`: arma un Checkout Pro de MP con items, `external_reference` = `booking_id`, `notification_url` propia y `back_urls` (incluye el token de confirmación en la URL de éxito). `get_payment()`: consulta un pago por ID. `create_refund()`: reembolso total con `X-Idempotency-Key` generado por request. Todas las llamadas SDK son síncronas y se envuelven en `asyncio.to_thread`; reintentos propios solo ante HTTP 429 (`http.call_with_retry`, backoff exponencial + jitter, máx. 3 intentos).

Webhook `POST /webhooks/mercadopago`: verifica firma HMAC-SHA256 propia (`verify_webhook_signature`, con ventana de replay de -120s/+600s), confirma el pago real contra la API de MP (no confía en el payload del webhook), usa `SELECT ... FOR UPDATE` sobre el `Booking` para idempotencia ante entregas duplicadas, y dispara el email de confirmación. Nunca devuelve 4xx (siempre 200, salvo error transitorio propio → 500) para evitar reintentos de MP por causas no recuperables.

Webhook `POST /webhooks/chargebacks`: mismo esquema de firma; distingue `type=payment/action=payment.updated` de `type=stop_delivery_op` (alerta de fraude pre-contracargo); hace upsert de `Chargeback` según `status_detail` del pago (mapea a `ChargebackStatusEnum: in_process|settled|reimbursed`) — `backend/app/services/chargeback.py`.

## 8. Reembolsos ("botón de arrepentimiento")

**Archivos:** `backend/app/routers/bookings.py` (`create_refund_request_endpoint`), `backend/app/services/booking.py`, `backend/app/models/booking.py` (`RefundRequest`)

`POST /bookings/{booking_code}/refund-request`: sin login. Valida formato del código con regex, busca el booking, exige que el email coincida con algún pasajero o el `contact_email`. Calcula `window_valid` aplicando la Resolución 424/2020 (dentro de 10 días de `confirmed_at` **y** más de 24hs antes de `departure_at` — ambas condiciones). Siempre persiste un `RefundRequest` (válido o no), devolviendo su `id` como código de trámite. Si la ventana es válida, ejecuta `create_refund()` contra MP y libera los asientos vía `mark_booking_refunded()`. Todas las respuestas de error de autorización/no encontrado devuelven el mismo 403 genérico (anti-enumeración de códigos válidos).

`GET /admin/refund-requests`: listado admin (filtra por `booking_id`/`window_valid`), sin paginación, límite defensivo de 500.

## 9. Contracargos (chargebacks) — sólo lectura admin

**Archivo:** `backend/app/routers/admin.py` (`list_chargebacks`)

`GET /admin/chargebacks`: listado filtrable por `status`/`booking_id`, sin paginación, límite 500. La escritura ocurre solo vía el webhook (módulo 7).

## 10. Notificaciones por email

**Archivos:** `backend/app/services/email.py`, `backend/tasks/reminders.py` (`send_reminders_job`, `send_feedback_job`), `backend/app/main.py` (`lifespan`)

Tres templates transaccionales vía Resend + Jinja2 (`templates/email/`): confirmación de compra (`send_confirmation_email`, disparada desde el webhook de pago — módulo 7), recordatorio de viaje y feedback post-viaje. Recordatorio y feedback los disparan sendos jobs de APScheduler (`send_reminders_job`, `send_feedback_job`, ambos `IntervalTrigger(hours=1)`, `misfire_grace_time=3600`), registrados por `register_jobs()` — invocado en el `lifespan` de `app/main.py` justo después de `scheduler.start()`. `send_reminders_job` selecciona bookings `confirmed` con `reminder_sent=False` cuyo viaje sale dentro de las próximas 24hs; `send_feedback_job` selecciona bookings `confirmed` con `feedback_sent=False` cuyo viaje llegó hace más de 2hs. Ambos jobs solo marcan el flag (`reminder_sent`/`feedback_sent`) en `True` si el envío fue exitoso para todos los pasajeros — si falló alguno, lo loguea como WARNING y lo deja para reintentar en el próximo ciclo (cada 1h), sin backoff propio. El scheduler persiste sus jobs en Postgres vía `SQLAlchemyJobStore` (`sync_database_url`).

Semántica de error asimétrica: confirmación reintenta 3 veces por pasajero y levanta `EmailDeliveryError` si alguno falla (el caller la loggea como WARNING sin re-lanzar); recordatorio/feedback loguean y tragan el error por pasajero, devolviendo `bool` de éxito global. Variables de contexto exactas: ver `_context_for()` en el archivo — no se listan acá por instrucción explícita de CLAUDE.md del proyecto.

## 11. Equipaje

**Archivo:** `backend/app/models/booking.py` (`Passenger.luggage_count`)

No es un módulo separado: es un campo entero (`luggage_count`, default 0) en `Passenger`, capturado en `PassengerData`/`BookingCreate`. No hay tabla ni endpoint propio de equipaje, ni lógica de límites/tarifas por equipaje en el código leído.

## 12. Autenticación admin

**Archivo:** `backend/app/routers/admin.py` (`login`, `logout`, `me`), `backend/app/models/booking.py` (`AdminUser`)

Login por email/password (`bcrypt` vía `passlib`, con hash dummy constante-tiempo cuando el usuario no existe, para no filtrar existencia por timing). Emite JWT propio (`HS256`, `iss=crucero-admin`, `aud=crucero-admin-api`) en cookie `httponly`/`secure` (en producción)/`samesite=strict`. No hay roles ni permisos diferenciados — un solo tipo de usuario admin.

## 13. Listado y detalle de ventas (admin, solo lectura)

**Archivo:** `backend/app/routers/admin.py` (`list_bookings`, `get_booking`)

`GET /admin/bookings`: paginado (`skip`/`limit`), filtra por `status`/`trip_id`, incluye conteo de pasajeros vía subquery correlacionada. `GET /admin/bookings/{id}`: detalle con pasajeros. Sin mutación — el módulo 6 es dueño de las transiciones de estado de booking.

## 14. Estados del pasaje / booking y sus transiciones

**Archivos:** `backend/app/models/booking.py` (`BookingStatusEnum`), `backend/app/services/booking.py` (`confirm_booking`, `expire_booking`, `mark_booking_refunded`), `backend/app/models/trip.py` (`SeatStatusEnum`)

`BookingStatusEnum`: `pending_payment → confirmed → refunded`, o `pending_payment → expired`. No hay transición de vuelta desde `expired`, `refunded` o `confirmed` salvo las explícitas de abajo. Cada función de transición en `services/booking.py` es idempotente: relee el booking con `SELECT ... FOR UPDATE` y, si el estado actual no es el esperado como punto de partida, devuelve el booking sin modificar (no levanta error):

- `create_booking()` (módulo 6): crea en `pending_payment`.
- `confirm_booking()`: `pending_payment → confirmed`; no-op si no está en `pending_payment`. Marca `mark_seats_sold()` y `confirmed_at`. Invocada solo desde el webhook de pago (módulo 7).
- `expire_booking()`: `pending_payment → expired`; no-op si no está en `pending_payment`. Libera los asientos reservados. Invocada desde `expire_bookings_job` (módulo 5) y, puntualmente, desde `create_booking_endpoint` si falla la creación de la preferencia de pago (módulo 6).
- `mark_booking_refunded()`: `confirmed → refunded`; no-op si no está en `confirmed`. Libera los asientos vendidos. Invocada desde `create_refund_request_endpoint` (módulo 8), después de que MP confirma el reembolso.

En paralelo, `SeatStatusEnum` (`available|reserved|sold|blocked`) transiciona por asiento, no por booking: `available→reserved` (`reserve_seats`, al crear el booking), `reserved→sold` (`mark_seats_sold`, al confirmar), `reserved→available` (liberación, por expiración o reembolso), y `available↔blocked` (bloqueo manual admin, módulo 2 — independiente del ciclo de vida de un booking). No existe una tabla ni un log de auditoría de historial de transiciones (ni de `Booking.status` ni de `Seat.status`) en el código leído — el estado actual es la única fuente, sin histórico persistido.

---

## Frontend — resumen de cara al inventario

**`frontend/`** (Next.js, sitio público): consume 1:1 los endpoints públicos de arriba. Páginas relevantes: `resultados` (módulo 4, `GET /trips`), `asientos/[tripId]` (módulos 4/5), `compra/[tripId]` (módulo 6), `confirmacion` (módulo 6, token HMAC), `arrepentimiento` (módulo 8). No expone superficie de API propia — es puramente cliente del backend ya inventariado. Componentes de dominio en `frontend/src/components/travel/` (`TripCard`, `SeatTypeBadge`, `AmenityBadge`, `CityInput`, etc.) son presentación sobre esos mismos datos, sin lógica de negocio adicional relevante para este mapeo.

**`frontend-admin/`** (React + Vite, panel admin): clientes API en `src/api/` (`auth.ts`, `bookings.ts`, `chargebacks.ts`, `priceTranches.ts`, `refunds.ts`, `routes.ts`, `stops.ts`, `trips.ts`) — mapean 1:1 a los routers `admin.py`/`admin_catalog.py` (módulos 1–3, 9, 12–13). Páginas: `LoginPage`, `TripsPage`/`TripDetailPage`/`CreateBatchTripsDialog`, `BookingsPage`/`BookingDetailPage`, `ChargebacksPage`, `RefundsPage`, `ConfiguracionPage`. Sin superficie de API propia adicional al backend.

---

## Fuera de alcance del MVP (según `backend/CLAUDE.md`, no implementado — mencionado para referencia, no inventariado como código)

QR, tracking GPS, reserva sin pago inmediato, cancelaciones/reembolsos gestionados internamente (existe el propio, no vía SISORG), antifraude, pagos en efectivo, integración SOR/Plataforma 10/Central de Pasajes, notificaciones WhatsApp.

---

