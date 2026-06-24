# CLAUDE.md — Expreso Río Paraná · Sistema de Venta de Pasajes Online

> Este archivo es el briefing permanente del proyecto. Leelo completo antes de escribir cualquier línea de código o proponer cualquier estructura.

---

## Qué es este proyecto

Sistema de venta de pasajes online para **Expreso Río Paraná**, empresa argentina de transporte internacional con más de 50 años operando rutas a Paraguay. El objetivo es una plataforma propia que complemente los canales actuales (Plataforma 10, Central de Pasajes), permitiendo venta directa con control total sobre precios, datos y experiencia de usuario.

> ⚠️ El proyecto fue originalmente presupuestado para **Crucero del Este** (BA–Rosario). A partir de la segunda reunión el cliente confirmó que el proyecto es para **Expreso Río Paraná** (BA–Asunción, servicio internacional). El presupuesto fue aceptado con este cambio implícito. Toda referencia a Crucero del Este en código, variables o comentarios debe ser reemplazada por Expreso Río Paraná.

Las especificaciones completas están en `/specs/Crucero Del Este - Presupuesto.pdf` y `/specs/Crucero del Este - Modulos Extras.txt`. Leelos antes de trabajar en cualquier módulo.

---

## Tu rol en este proyecto

Sos un senior backend engineer. Priorizás correctitud sobre cleverness. No agregás features, abstracciones ni refactors que no fueron pedidos explícitamente. Cada decisión de arquitectura que tome el sistema debe ser aprobada antes de implementarse.

---

## Primera tarea al iniciar una sesión nueva

El stack y la estructura ya están aprobados. Al iniciar una sesión nueva:

1. Leé este archivo completo.
2. Leé los specs en `/specs/`.
3. Leé las skills en `/specs/skills/`.
4. Leé todos los archivos en `app/models/` para entender el schema de base de datos.
5. Leé todos los archivos en `app/schemas/` para entender los contratos de API.
6. Leé `app/errors.py`.
7. Leé todos los archivos en `app/services/` para entender la lógica de negocio ya implementada.
8. Identificá el primer ítem de "Próximo a implementar" y ejecutá este
   protocolo obligatorio antes de escribir cualquier línea de código:
   a. Anunciá qué módulo vas a implementar.
   b. Listá TODAS las decisiones de diseño que necesitás tomar:
      formato de datos, manejo de errores, casos borde, dependencias
      con otros módulos, archivos que vas a tocar.
   c. Para cada decisión, indicá las opciones disponibles y cuál recomendás
      y por qué.
   d. Escribí al final: "Esperando aprobación explícita antes de escribir
      cualquier línea de código."
   No avances hasta recibir respuesta.

No leas `app/routers/` completo al inicio — leé solo el router en el que vayas a trabajar. No leas `tests/`, `tasks/`, `pyproject.toml` ni `Dockerfile` salvo que el ítem a implementar lo requiera.

---

## Alcance del MVP (backend)

### Incluido

- **Inventario de asientos**: rutas con dos tipos de asiento (Cama / Semi Cama), cada uno con hasta 5 tramos de precio dinámico definidos por pasajes vendidos (no por tiempo). Cama y Semi Cama tienen tramos independientes.
- **Lógica de multi-paradas internacional (regla AR↔PY)**: cada parada está etiquetada con su país (`AR` o `PY`). Si el origen es Argentina, el destino solo puede ser Paraguay, y viceversa. No se puede vender un tramo interno dentro del mismo país (cabotaje extranjero prohibido). El selector de destino filtra dinámicamente según el país del origen seleccionado.
- **Flujo de compra**: selección de origen/destino → selección de asientos → datos del pasajero → pago → confirmación.
- **Integración MercadoPago**: tarjetas de crédito, débito y billeteras virtuales. Las comisiones (0,8%–6,6%) corren por cuenta del cliente, el sistema NO las calcula ni las aplica.
- **Notificaciones por email**: 3 templates transaccionales — confirmación de compra (inmediata), recordatorio de viaje (antes de la fecha), feedback post-viaje. Usar Resend en plan gratuito.
- **API del panel de administración**: endpoints con autenticación para configurar tramos de precio, gestionar trayectos/paradas/orígenes/destinos, y listar ventas (solo lectura).
- **Botón de arrepentimiento + reembolso propio**: pantalla propia (sin login) que valida la ventana legal (Resolución 424/2020: 10 días desde la compra Y más de 24hs antes de la salida — ambas condiciones deben cumplirse). Si la solicitud es válida, el sistema ejecuta el reembolso vía API de MercadoPago (`create_refund`) y libera los asientos. Toda solicitud (válida o no) queda registrada en `refund_requests`, devolviendo su `id` como código de trámite en la respuesta. Casos fuera de ventana se exponen vía `GET /admin/refund-requests` para seguimiento manual.
- **Datos obligatorios del pasajero**: mail y teléfono son campos obligatorios en el formulario de compra.

### Explícitamente fuera del alcance de este MVP

- Generación y validación de QR
- Tracking GPS
- Reserva sin pago inmediato
- Cancelaciones y reembolsos gestionados internamente
- Módulo antifraude
- Pagos en efectivo (Rapipago, Pago Fácil) — solo tarjetas y billeteras virtuales
- Integración con SOR / Plataforma 10 / Central de Pasajes (ver riesgos)
- Notificaciones por WhatsApp (requiere WhatsApp Business API — módulo futuro)

---

## Datos iniciales del negocio

| Campo | Valor |
|---|---|
| Ruta inicial | Buenos Aires ↔ Asunción (Paraguay) |
| Duración del viaje | 15 a 17 horas |
| Tipo de servicio | Internacional |
| Precio base Cama | A confirmar con el cliente |
| Precio base Semi Cama | A confirmar con el cliente |
| Tramos de precio | Hasta 5 por tipo de asiento, definidos por `[min_vendidos, max_vendidos, precio]` |

### Paradas de la ruta principal (ejemplo orientativo — confirmar con el cliente)

| Parada | País |
|---|---|
| La Plata | AR |
| Retiro (Buenos Aires) | AR |
| Liniers | AR |
| Posadas | AR |
| Encarnación | PY |
| [pueblos intermedios] | PY |
| Asunción | PY |

> ⚠️ La regla de negocio obliga a que origen y destino sean de países distintos. Implementar validación tanto en frontend (filtro dinámico del selector) como en backend (validación al crear booking).

---

## Reglas de trabajo — NUNCA violarlas

- **No escribas código sin que el stack y la estructura de carpetas estén aprobados.**
- **No agregues nada fuera del alcance listado arriba**, aunque parezca obvio o útil.
- **Después de completar cada archivo o módulo**, output: `✅ [nombre del archivo] — [descripción en una línea]`
- **Detente y preguntá antes de**: modificar el schema de base de datos, cambiar el flujo de pago, o agregar cualquier feature no listada explícitamente.
- **Commits y branches**: podés commitear y pushear libremente en tu branch de sesión. Nunca hagas merge a `main` — eso lo hace el revisor a mano. No commitees en `main` directamente bajo ninguna circunstancia.
- **Antes de implementar cualquier módulo nuevo**: listá todas las decisiones de diseño que necesitás tomar para implementarlo (formato de datos, manejo de errores, comportamiento ante casos borde, dependencias con otros módulos). Esperá aprobación explícita antes de escribir cualquier línea de código.
- **Durante la implementación**: si encontrás algo no especificado o ambiguo — por mínimo que parezca — detenete y consultá. No asumas. No implementes la opción que te parezca más razonable. La consulta debe incluir: qué decisión necesitás tomar, qué opciones ves, y cuál recomendás y por qué. Esperá respuesta antes de continuar.
- **Al finalizar cada módulo**: si durante la implementación encontraste algo que podría mejorarse en módulos ya completados (bug potencial, inconsistencia, deuda técnica), reportarlo como nota separada al final del output bajo el título "⚠️ Observaciones". Sin implementar nada, sin abrir PRs, sin modificar archivos existentes.
- **Después de cada commit aprobado por el revisor**: actualizá CLAUDE.md — mové el ítem resuelto de "Próximo a implementar" a la sección "Bugs críticos resueltos" con una línea que describa el cambio aplicado y el archivo modificado. Commitear el CLAUDE.md actualizado en el mismo branch.
- **No des explicaciones** salvo que se te pidan.

---

## Módulos futuros (roadmap — no implementar ahora)

Estos módulos están documentados en `/specs/Crucero del Este - Modulos Extras.txt` y se cotizarán e implementarán como módulos independientes post-MVP:

- Control de pasajeros con QR (generación, validación, estados: válido / reembolsado / abordado) — **$450.000 — 5 días estimados**
- Tracking GPS en tiempo real — Opción A: app en celular del chofer ($500.000), Opción B: dispositivo GPS dedicado con SIM propia ($310.000, recomendada). **Cliente inclinado por Opción B — confirmación pendiente con el dueño.**
- Gestión avanzada de ventas (cancelaciones, reembolsos con lógica de porcentajes)
- Sistema multi-paradas avanzado (hoy está la regla AR↔PY básica en el MVP)
- Seguridad y antifraude
- Pagos en efectivo — si se incorpora en el futuro, el router `app/routers/payments.py` requiere revisión porque hoy ignora `payment.status == "pending"` silenciosamente
- Notificaciones por WhatsApp (requiere WhatsApp Business API)
- Sistema de puntos / millas para pasajeros frecuentes
- Integración con SOR / Plataforma 10 (sincronización de asientos en tiempo real — ver riesgos)

---

## Stack aprobado

| Componente | Elección |
|---|---|
| Runtime | Python 3.12 |
| Framework | FastAPI |
| Base de datos | PostgreSQL |
| ORM + migraciones | SQLAlchemy 2 (async) + Alembic |
| SDK de pagos | mercadopago (SDK oficial Python) |
| SDK de email | Resend (resend-python) |
| Config | pydantic-settings |
| Testing | pytest + pytest-asyncio |
| Scheduler | APScheduler + SQLAlchemyJobStore — jobs persistidos en PostgreSQL, sobreviven reinicios |
| Rate limiting | slowapi>=0.1.9 |

---

## Estructura de carpetas aprobada

```
ExpresRioParana/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── limiter.py           # Instancia global de slowapi Limiter
│   │   ├── models/
│   │   │   ├── trip.py          # Route, Trip, Seat, PriceTranche
│   │   │   ├── booking.py       # Booking, Passenger, AdminUser, RefundRequest
│   │   │   └── __init__.py
│   │   ├── schemas/
│   │   │   ├── trips.py
│   │   │   ├── bookings.py
│   │   │   └── admin.py
│   │   ├── routers/
│   │   │   ├── trips.py
│   │   │   ├── bookings.py
│   │   │   ├── payments.py      # Webhook MercadoPago
│   │   │   └── admin.py
│   │   ├── services/
│   │   │   ├── pricing.py
│   │   │   ├── inventory.py
│   │   │   ├── booking.py
│   │   │   ├── payment.py
│   │   │   └── email.py
│   │   ├── deps.py
│   │   └── errors.py
│   ├── tasks/
│   │   └── reminders.py         # APScheduler con SQLAlchemyJobStore
│   ├── migrations/
│   ├── tests/
│   │   ├── conftest.py          # env vars fake + mock Resend autouse
│   │   ├── unit/
│   │   │   ├── __init__.py
│   │   │   ├── test_payment_signature.py
│   │   │   └── test_schemas.py
│   │   └── integration/
│   │       ├── __init__.py
│   │       ├── conftest.py      # Postgres container + engine + TRUNCATE + AsyncClient
│   │       ├── test_pricing.py
│   │       ├── test_inventory.py
│   │       ├── test_booking_service.py
│   │       ├── test_trips_router.py
│   │       ├── test_bookings_router.py
│   │       ├── test_payments_router.py
│   │       ├── test_admin_router.py
│   │       └── test_refund_requests.py
│   ├── alembic.ini
│   ├── pyproject.toml
│   ├── .env.example
│   └── Dockerfile
├── frontend/                    # A desarrollar en fase siguiente
├── specs/                       # Documentación y especificaciones del proyecto
└── CLAUDE.md
```

Arquitectura en tres capas: **routers → services → models**. Los services contienen toda la lógica de negocio y son testeables sin base de datos. Los routers solo parsean HTTP y devuelven respuestas. Sin repositorios abstractos, sin CQRS, sin sagas.

**Importante**: todo el código backend vive dentro de `/backend/`. Los paths de archivos en este documento son relativos a `/backend/` salvo que se indique lo contrario.

---

## Skills de referencia

Antes de implementar cualquier módulo, leé las siguientes skills ubicadas en `/specs/skills/`:

- `api-design-principles/SKILL.md` — aplicar siempre al diseñar endpoints
- `architecture-patterns/SKILL.md` — aplicar al estructurar servicios y capas

Las carpetas de referencias dentro de cada skill también están disponibles. Usarlas cuando implementes el módulo correspondiente.

---

## Estado actual del proyecto

### Completado y aprobado

- `migrations/versions/6a04bf7f_initial_schema.py` — schema completo: ENUMs, 7 tablas, índices, downgrade
- `app/models/trip.py` — Route, Trip, Seat, PriceTranche
- `app/models/booking.py` — Booking, Passenger, AdminUser
- `app/models/__init__.py`
- `app/config.py` — pydantic-settings con `@model_validator`
- `app/database.py` — async engine, sessionmaker, Base, get_db
- `app/limiter.py` — instancia global de `slowapi.Limiter` con `get_remote_address`
- `app/deps.py` — get_current_admin con PyJWT (HS256, iss+aud), re-exporta get_db
- `app/errors.py` — todas las excepciones del proyecto (SeatUnavailableError, NotFoundError, InvalidWebhookSignature, PaymentProcessingError, PaymentConfigError) y register_exception_handlers. `app/exceptions.py` eliminado.
- `app/services/pricing.py` — get_current_price, NoPriceTranche
- `app/services/inventory.py` — get_available_seats, reserve_seats, mark_seats_sold
- `app/services/booking.py` — create_booking, confirm_booking, expire_booking
- `app/services/payment.py` — verify_webhook_signature, get_payment, create_preference
- `app/routers/payments.py` — POST /webhooks/mercadopago
- `app/services/email.py` — send_confirmation_email, send_reminder_email, send_feedback_email
- `templates/email/confirmation.html` + `confirmation.txt`
- `templates/email/reminder.html` + `reminder.txt`
- `templates/email/feedback.html` + `feedback.txt`
- `app/schemas/trips.py` — RouteRead, SeatRead, TripRead
- `app/schemas/bookings.py` — PassengerCreate, PassengerRead, BookingCreate, BookingRead, BookingCreateResponse
- `app/schemas/admin.py` — AdminLoginRequest, AdminLoginResponse, PriceTrancheCreate, PriceTrancheRead, AdminBookingRead
- `app/routers/trips.py` — GET /trips, GET /trips/{id}/seats
- `app/routers/bookings.py` — POST /bookings, GET /bookings/{id}
- `app/routers/admin.py` — POST /admin/login (con rate limiting 10/min), GET /admin/bookings, GET/POST/DELETE /admin/trips/{id}/price-tranches
- `app/main.py` — FastAPI con lifespan, slowapi middleware, exception handlers, routers
- `tasks/__init__.py` — vacío
- `tasks/reminders.py` — AsyncIOScheduler, SQLAlchemyJobStore, tres jobs
- `pyproject.toml` — dependencias (incluye slowapi>=0.1.9), hatchling, pytest config con env vars fake
- `Dockerfile` — python:3.12-slim, single-stage, appuser, --workers 1
- `.dockerignore`
- `.env.example`
- `tests/conftest.py` — mock autouse de Resend; env vars via pytest-env en pyproject.toml
- `tests/unit/__init__.py` — vacío
- `tests/unit/test_payment_signature.py` — 14 tests de verify_webhook_signature
- `tests/unit/test_schemas.py` — 27 tests de BookingCreate y PriceTrancheCreate
- `tests/integration/__init__.py` — vacío
- `tests/integration/conftest.py` — PostgresContainer, sync engine para create_all, TRUNCATE autouse, AsyncSession, AsyncClient con override get_db, mock autouse SDK MercadoPago
- `tests/integration/test_pricing.py` — 8 tests de get_current_price
- `tests/integration/test_inventory.py` — 16 tests de reserve_seats, release_expired_reservations, mark_seats_sold
- `tests/integration/test_booking_service.py` — 9 tests de create_booking, confirm_booking, expire_booking
- `tests/integration/test_trips_router.py` — 14 tests: GET /trips (lista vacía, shape, filtros origin/destination/fecha, exclusión pasados/cancelados, conteo disponibles) y GET /trips/{id}/seats (404, lista vacía, shape, filtros tipo/estado, orden)
- `tests/integration/test_bookings_router.py` — 11 tests: POST /bookings (201 shape, 404 trip, 409 trip_not_available por status y fecha, 409 seat_unavailable reserved/sold/inexistente, 500 sin tramo, 502 MP) y GET /bookings/{id} (200 shape, 404)
- `tests/integration/test_payments_router.py` — 12 tests: firma inválida, booking not found, idempotencia (con `expire_all()` antes del assert final), happy path con verificación DB, payment no-approved (pending/rejected), MP API error 500, malformed payload, firma con x-request-id
- `tests/integration/test_admin_router.py` — 24 tests: POST /admin/login (credenciales válidas/inválidas, token, rate limit 429), auth compartida (403 sin header, 401 token inválido), GET /admin/bookings (shape, filtros status/trip_id), GET/POST/DELETE /admin/trips/{id}/price-tranches (shape, orden, 409 overlap, adyacentes no conflictúan, seat_type diferente no conflictúa, 204 sin body, tranche de otro trip → 404)
- `migrations/versions/c9d4e2f1_add_refunded_and_refund_requests.py` — `ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'refunded'`; tabla `refund_requests` con FK a bookings, índice en booking_id
- `app/models/booking.py` — `refunded` agregado a `BookingStatusEnum`; modelo `RefundRequest`; relación `refund_requests` en `Booking`
- `app/models/__init__.py` — exporta `RefundRequest`
- `app/schemas/bookings.py` — `RefundRequestCreate` (email), `RefundRequestRead`
- `app/errors.py` — `RefundWindowExpiredError` con `refund_request_id`; handler → 422 `{detail, refund_request_id}`
- `app/services/booking.py` — `create_refund_request` (flush para obtener ID), `mark_booking_refunded` (guard idempotente)
- `app/services/payment.py` — `create_refund`: llama `sdk.payment().refunds()`, `PaymentProcessingError` si no 200/201
- `app/routers/bookings.py` — `POST /bookings/{id}/refund-request`: persist-first (commit #1), valida ventana legal (10 días desde `confirmed_at` Y >24hs antes de `departure_at`), 422 si expirada o llama a MercadoPago + commit #2
- `tests/integration/conftest.py` — `refund_requests` en `_TABLES` (primero, hija de bookings), mock default `payment().refunds()` → 201
- `tests/integration/test_refund_requests.py` — 9 tests: happy path, window expired por 10 días, window expired por <24hs a la salida, 404, 409 × 3 estados, 422 email, 502 MP

### Completado (branch `claude/admiring-clarke-n1e1s2`)

- `migrations/versions/b7c3a1d2_add_stops_table.py` — ENUM `country_code` (AR/PY); tabla `stops` (id, name unique, country, created_at); refactor de `routes`: columnas `origin`/`destination` reemplazadas por FK `origin_stop_id`/`destination_stop_id`; índices y UniqueConstraint actualizados.
- `app/models/trip.py` — `CountryEnum` (AR/PY), modelo `Stop` con relaciones `origin_routes`/`destination_routes`; `Route` refactorizado a FKs `origin_stop_id`/`destination_stop_id` con relationships.
- `app/models/__init__.py` — exporta `Stop` y `CountryEnum`.
- `app/schemas/trips.py` — `StopRead` (id, name, country); `RouteRead` actualizado a nested `origin_stop`/`destination_stop` de tipo `StopRead`.
- `app/services/booking.py` — `InternationalRouteRequiredError` (excepción de dominio, sin handler global); `create_booking` recibe `origin_country`/`destination_country` y valida AR↔PY.
- `app/routers/trips.py` — selectinload chain para cargar stops; filtros por nombre de stop (string-based); nuevo `stops_router` con `GET /stops` y `GET /stops/{stop_id}/valid-destinations`.
- `app/routers/bookings.py` — carga trip con selectinload de stops; pasa países al service; captura `InternationalRouteRequiredError` → 422; `NoPriceTranche` re-raise convertido a `HTTPException(500)` explícito.
- `app/main.py` — registra `stops_router`.
- `tests/integration/conftest.py` — `stops` agregado a `_TABLES`; soporte `TEST_DATABASE_URL` para entornos sin Docker.
- `tests/integration/test_trips_router.py` — reescrito: helpers con get-or-create stops; asserts actualizados a `route["origin_stop"]["name"]`; 6 tests nuevos de `/stops` y `/stops/{id}/valid-destinations`.
- `tests/integration/test_bookings_router.py` — fixtures actualizados a rutas AR↔PY; 2 tests nuevos (422 mismo país, PY→AR aceptada).
- `tests/integration/test_booking_service.py` — fixtures actualizados; test nuevo `test_create_booking_same_country_raises`.
- `tests/integration/test_payments_router.py` — fixtures actualizados a rutas AR↔PY.
- `tests/integration/test_admin_router.py` — fixtures actualizados a rutas AR↔PY.
- `tests/integration/test_refund_requests.py` — fixtures actualizados a rutas AR↔PY.
- `tests/integration/test_pricing.py` — fixtures actualizados a rutas AR↔PY.
- `tests/integration/test_inventory.py` — fixtures actualizados a rutas AR↔PY; segunda ruta en test de trip-cross-check usa stops distintos.

### Bugs críticos resueltos (branch `claude/vibrant-cori-71dm2`)

- ✅ **Bug 1 — Race `expire_bookings_job` vs webhook** (`app/services/booking.py`) — guard en `expire_booking`: retorna early si `status != pending_payment`, dentro del lock `FOR UPDATE`.
- ✅ **Bug 2 — Email de confirmación nunca se enviaba** (`app/routers/payments.py`) — Step 12 implementado: re-fetch post-commit con `selectinload(Booking.passengers → Passenger.seat)` y `selectinload(Booking.trip → Trip.route)`, llamada a `send_confirmation_email`, `EmailDeliveryError` capturado con WARNING.
- ✅ **Bug 3 — `datetime.utcnow` deprecated** (`app/models/trip.py`, `app/models/booking.py`) — 7 ocurrencias reemplazadas por `default=lambda: datetime.now(timezone.utc)`.
- ✅ **Bug 4 — JWT sin `require exp`** (`app/deps.py`) — `options={"require": ["exp", "sub"]}` agregado a `jwt.decode`. Tokens sin `exp` o sin `sub` rechazados con 401.

### Bugs críticos resueltos (branch `claude/inspiring-edison-WJqep`)

- ✅ **Bug [1.1] — Orphan de preferencia MP cuando `db.commit()` falla** (`app/routers/bookings.py`) — `await db.commit()` movido a antes de `create_preference`; bloque `except PaymentProcessingError` extendido con `expire_booking(db, booking.id)` + `await db.commit()` para liberar seats en caso de fallo de MP; `expire_booking` agregado al import de `app.services.booking`.
- ✅ **Bug [1.2] — Email de confirmación nunca se reenvía tras retry de MP** (`app/routers/payments.py`) — `except EmailDeliveryError` reemplazado por `except Exception` en Step 12; el mensaje de log actualizado a `error=%s`.
- ✅ **Bug [1.3] — Webhook: `data_id` y `payment_id` no se cross-checkean** (`app/routers/payments.py`) — validación `if payment_id != data_id` agregada dentro del try de Step 5, antes de Step 6; retorna `_IGN_MALFORMED` si difieren. Import de `EmailDeliveryError` eliminado (quedó muerto tras el fix).
- ✅ **Bug [1.4] — Race en creación concurrente de price tranches sin filas previas** (`app/routers/admin.py`) — `pg_advisory_xact_lock(hashtext(:key))` insertado después del 404-check y antes del SELECT `with_for_update()`, serializando escrituras concurrentes por `trip_id`.
- ✅ **Bug [1.5] — `release_expired_reservations` libera seats sin marcar booking como `expired`** (`app/services/inventory.py`) — función eliminada completamente; imports `timedelta` y `settings` también eliminados.
- ✅ **Bug [1.6] — `confirm_booking` no valida estado previo** (`app/services/booking.py`) — guard `if booking.status != pending_payment: return booking` agregado después de `_get_booking`, simétrico al de `expire_booking`.
- ✅ **Bug [1.7] — `reserve_seats` reporta `seat_ids[0]` en contención de lock** (`app/services/inventory.py`) — `except OperationalError` ahora filtra por `pgcode == '55P03'`; cualquier otro `OperationalError` se propaga con `raise` desnudo.

### Fixes de seguridad resueltos (branch `claude/determined-bardeen-xTt1N`)

- ✅ **[2.2] — Rate limiting en `POST /admin/login`** (`app/routers/admin.py`, `app/main.py`, `app/limiter.py`, `pyproject.toml`) — slowapi agregado como dependencia; `app/limiter.py` creado como módulo independiente para evitar import circular; endpoint decorado con `@limiter.limit("10/minute")`; handler `RateLimitExceeded` registrado en `main.py`; test `test_login_rate_limit_blocks_after_10_attempts` agregado a `test_admin_router.py`.
- ✅ **[2.3] — JWT sin `iss`/`aud`** (`app/routers/admin.py`, `app/deps.py`) — payload de `jwt.encode` incluye `iss="crucero-admin"` y `aud="crucero-admin-api"`; `jwt.decode` valida `audience`, `issuer` y requiere `["exp", "sub", "iss", "aud"]`.

> ⚠️ Los valores `"crucero-admin"` y `"crucero-admin-api"` en los claims JWT deberán actualizarse a los valores correspondientes de Expreso Río Paraná cuando se defina el nombre final del sistema.

### Próximo a implementar

No hay módulos pendientes definidos actualmente.

---

## Módulos críticos — requieren atención especial

Antes de comenzar a implementar cualquiera de los siguientes módulos, DETENTE y avisá con este mensaje exacto antes de escribir cualquier código:

⚠️ Estás por implementar [nombre del módulo], marcado como crítico. Considerá cambiar al modelo Opus antes de continuar. ¿Continuamos?

Módulos críticos:
- `app/services/payment.py` — integración MercadoPago
- `app/routers/payments.py` — webhook MercadoPago
- Cualquier cambio al schema de base de datos
- Lógica de validación AR↔PY (regla de negocio crítica con implicancias legales)

---

## Riesgos activos del proyecto

### 🔴 Riesgo alto — Doble venta de asientos
El cliente vende simultáneamente por su sistema SOR, Plataforma 10 y Central de Pasajes. Si la nueva web no está sincronizada con SOR, puede venderse el mismo asiento dos veces.

- No está definido si SOR tiene API.
- No está presupuestada ninguna integración.
- **Acción requerida antes del lanzamiento:** investigar capacidades técnicas de SOR.

### 🔴 Riesgo alto — Validación AR↔PY sin integración con SOR
La regla que impide vender tramos internos dentro de un mismo país puede ser bypasseada si los asientos no están sincronizados con SOR. Un pasajero podría comprar en la web un tramo que SOR ya vendió como parte de un servicio interno.

### 🟡 Riesgo medio — Norma de trazabilidad de equipaje
Norma gubernamental (aprox. abril 2026) que exige vincular cada ticket de equipaje al pasaje del pasajero nominalmente. Por ahora aplica solo al control físico, pero podría impactar el módulo de QR.

- El modelo de datos del pasaje debería contemplar un campo para vinculación de equipaje desde el inicio para evitar refactoring posterior.

---

## Deuda técnica conocida

1. **`Booking` sin `buyer_email`**: resolver con `contact_email` al implementar gestión avanzada de reservas — requiere migración.
2. **`send_reminder_email` / `send_feedback_email` retornan `None`**: cambiar firma a `-> bool`; solo flaggear `sent=True` cuando el envío fue exitoso (hoy se marca `True` aunque todos los envíos fallen).
3. **`selectinload` obligatorio para `email.py`**: cargar `booking.passengers`, `booking.trip`, `booking.trip.route`, `passenger.seat` antes de llamar a cualquier `send_*`.
4. ✅ **Idempotencia de emails de confirmación — RESUELTO**: guard en `app/routers/payments.py:120-122` — `if booking.status == BookingStatusEnum.confirmed: return JSONResponse(_OK)` — antes de step 11 (`confirm_booking`) y step 12 (`send_confirmation_email`). Un segundo webhook para el mismo booking retorna en step 10 sin confirmar ni enviar email. Cubierto por `test_webhook_idempotency_two_posts_confirm_booking_once` (`tests/integration/test_payments_router.py`): verifica estado en DB y que `mp_payment_id` no se sobreescribe; la garantía de no-reenvío de email es estructural (el return en step 10 nunca alcanza step 12).
5. **`create_booking()` no retorna desglose de precios por tipo**: workaround en router via `get_current_price()` — genera N+1 queries. Fix: retornar `(booking, prices_by_type)` desde el service.
6. **`SeatNotAvailable` vs `SeatUnavailableError`**: dos excepciones casi homónimas. Unificar en pasada futura.
7. **`GET /admin/bookings` sin paginación**: LIMIT 500 hardcodeado. Agregar cuando el volumen lo requiera.
8. **Known gap en tests**: desglose por tipo de asiento en `create_booking` no validado. Comentario en `test_booking_service.py`: `# KNOWN GAP: seat type breakdown not validated — see CLAUDE.md`
9. **`DELETE /admin/trips/{id}/price-tranches/{id}` sin validación de uso activo**: admin puede borrar el tramo que cubre el `sold_count` actual, dejando el trip sin precio vigente. Fix: rechazar con 409 si el tramo cubre el sold_count vigente.
10. **CORS ausente en `app/main.py`**: agregar `CORSMiddleware` antes de conectar el frontend. Orígenes permitidos a definir con el cliente.
11. **Índice compuesto faltante en `Trip(status, departure_at)`**: `GET /trips` filtra y ordena por ambos. Sin índice, full scan al crecer. Agregar en próxima migración.
12. **`if admin_id is None` redundante en `app/deps.py`**: con `require: ["sub"]`, PyJWT lanza `MissingRequiredClaimError` antes de llegar a ese check. Inofensivo; limpiar en pasada futura.
13. **`_DUMMY_HASH` se computa en cada import** (`app/routers/admin.py`): bcrypt con cost factor 12 tarda ~250ms en import-time. Hardcodear un hash pre-computado como constante.
14. **`NoPriceTranche`, `BookingNotFound`, `SeatNotAvailable` sin handlers registrados** (`app/errors.py`): propagan como 500 genérico. Agregar handlers explícitos con códigos y `detail` semánticos.
15. **Doble lógica de resolución de tramo activo** (`app/services/pricing.py` y `app/routers/trips.py`): predicado `min_sold <= sold_count < max_sold` duplicado. Extraer función compartida.
16. **`expire_bookings_job` carga objetos Booking completos** (`tasks/reminders.py`): solo usa `booking.id`. Cambiar a `select(Booking.id)` como los otros dos jobs.
17. **`Trip` sin índice en `route_id`** (`app/models/trip.py`): Postgres no crea índice automático en FK. Agregar `Index("idx_trips_route_id", "route_id")` en próxima migración.
18. **`GET /bookings/{booking_id}` expone PII sin autenticación** (`app/routers/bookings.py`): retorna DNI/email/teléfono de pasajeros. Posible incumplimiento Ley 25.326. Evaluar vista mínima o verificación por email/DNI. **Alcance adicional (LLE-40)**: el campo `status` también se expone — cualquiera que conozca el `booking_id` puede determinar si una compra fue reembolsada (`status: "refunded"`). El scope de #035 (LLE-56, Sem 9) debe contemplar tanto los campos de PII de pasajeros como la visibilidad del estado de la reserva.
19. **`test_login_rate_limit_blocks_after_10_attempts` es frágil ante orden de ejecución** (`tests/integration/test_admin_router.py`): slowapi usa contadores en memoria compartida por proceso. Si se agregan tests de login antes de este en el mismo módulo, el contador puede acumularse y disparar el 429 antes de los 10 intentos previstos. El test debe permanecer al final del archivo y ser el único que dispara 10+ requests a `/admin/login`.
20. **`BookingCreate._passengers_match_seats` valida orden pero `create_booking` también** — verificación duplicada entre schema y service. Inofensivo; unificar en pasada futura dejando la validación solo en el service.
21. **Validación AR↔PY no cubierta por tests**: la lógica de filtrado de paradas por país necesita tests de integración específicos una vez implementada en el router/service correspondiente.
22. **Claims JWT con nombre "crucero-admin"**: los valores `iss` y `aud` en los tokens JWT todavía usan el nombre del proyecto anterior. Actualizar cuando se defina el nombre final del sistema.
23. **`RefundRequest.id` — asimetría entre default Python y server_default DB** (`app/models/booking.py:96`, `migrations/versions/c9d4e2f1`): el modelo declara `default=uuid.uuid4` (sin `server_default`); la migración crea la columna con `server_default=gen_random_uuid()`. Fuente de verdad: Python. El `server_default` en la DB es letra muerta en todos los flujos conocidos — el único camino de creación es `create_refund_request()` en `app/services/booking.py` vía ORM. No remover el `server_default` de la DB para no generar una migración innecesaria. **Restricción**: cualquier INSERT directo futuro en `refund_requests` (scripts de seed, migraciones de datos) debe generar el `id` explícitamente — no puede depender del `server_default` como fallback porque el modelo ORM no lo declara y SQLAlchemy no lo usará.
24. **Race condition en `create_refund_request_endpoint`**: si dos requests concurrentes llegan para el mismo `booking_id`, ambos pasan la validación `status == confirmed` y persisten su propio `RefundRequest` (ambos con `window_valid=True`) antes de que `mark_booking_refunded` tome el lock `FOR UPDATE`. El primero en tomar el lock ejecuta `create_refund` contra MercadoPago; el segundo encuentra `status != confirmed` en el guard y no llama a `create_refund`. Resultado: dos filas en `refund_requests` (ambas válidas), pero un solo reembolso real ejecutado. Aceptable para el MVP — bajo volumen y bajísima probabilidad de dos solicitudes simultáneas para la misma booking. Si se quiere prevenir el doble registro, habría que mover el lock `FOR UPDATE` a *antes* del primer commit (persist del `RefundRequest`), lo cual requiere repensar la transacción (hoy son dos commits separados).

---

## Decisiones de diseño aprobadas

### #012 — Tabla `stops` y lógica AR↔PY

- **Tabla `stops` separada de `Route`** (confirmado 14/06): no agregar campo `country` a `Route`. La entidad `Stop` es independiente y soporta el sistema de multi-paradas futuro.
- **La relación exacta entre `Stop`, `Route` y `Trip`** debe ser propuesta por Claude Code en el protocolo de decisiones y aprobada antes de implementar. No asumir el diseño.
- **Validación en backend obligatoria**: `POST /bookings` debe rechazar con 422 `international_route_required` si origen y destino son del mismo país. Esta es la única validación que cuenta desde el punto de vista legal — la validación de frontend es solo UX.
- **Fixtures de tests afectados**: `test_bookings_router.py`, `test_booking_service.py` y `test_payments_router.py` usan `Route(origin="Buenos Aires", destination="Rosario")` — ruta doméstica AR→AR que se vuelve inválida. Actualizar todos a rutas AR↔PY válidas al implementar este módulo.
- **Migración Alembic obligatoria** siguiendo el patrón de `migrations/versions/`.

### Tests — arquitectura de la suite

**Scope split:**
- Unit tests: funciones puras sin DB — `verify_webhook_signature` y validadores Pydantic.
- Integration tests: todo lo que toca SQLAlchemy corre contra Postgres real via testcontainers.

**DB strategy:**
- Un contenedor Postgres por sesión de pytest (scope=`session`).
- Tablas creadas con `Base.metadata.create_all` via sync engine.
- Entre tests: `TRUNCATE passengers, bookings, seats, price_tranches, trips, routes, admin_users RESTART IDENTITY CASCADE`. No usar rollback — los routers hacen `await db.commit()` explícito.

**conftest split:**
- `tests/conftest.py`: solo mock autouse de Resend. Sin imports de app, sin DB.
- `tests/integration/conftest.py`: container, engine, sesión, AsyncClient con override get_db, mock autouse SDK MercadoPago.

**Mock del SDK MercadoPago:**
- `patch("app.services.payment._sdk", mock_sdk)` en `tests/integration/conftest.py`.
- Default del mock: `preference.create` devuelve `{"status": 201, "response": {"id": "fake-preference-id", "init_point": "https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=fake"}}`.
- Default del mock: `payment.get` devuelve `{"status": 200, "response": {"id": 123456789, "status": "approved", "external_reference": None, "transaction_amount": 24500.0}}`.
- Default del mock: `payment().refunds` devuelve `{"status": 201, "response": {"id": 12345678}}`.
- Tests de webhook que necesiten `external_reference` específico sobreescriben `mock_mp_sdk.payment.return_value.get.return_value` completo antes del POST.

**Patrón identity map en tests de integración:**
- Después de cualquier POST que haga `db.commit()` en el router, agregar `await db.expire_all()` antes del `select()` final en el test. Sin esto, SQLAlchemy puede devolver el objeto cacheado en lugar del estado real post-commit.

**Casos obligatorios en test_payments_router.py (ya implementados):**
- Webhook con firma inválida → 200 `{"status": "ignored", "reason": "invalid_signature"}`
- Webhook con `payment_id` desconocido → 200 `{"status": "ignored", "reason": "booking_not_found"}`
- Idempotencia: dos POSTs consecutivos con el mismo `payment_id` → exactamente una booking confirmada.

**Pricing — confirmación de alcance (14/06)**
- El ajuste manual de precios por parte del cliente ("a mano, según demanda/competencia") se resuelve completamente con el modelo y endpoints ya implementados: el admin edita los PriceTranche de un trip puntual vía POST/DELETE /admin/trips/{id}/price-tranches. No se requiere override de precio fijo por trip ni cambios al schema.
- Si en el futuro el cliente pide reglas automáticas (ej. ajuste por proximidad a la fecha del viaje independiente del sold_count), se evalúa como módulo nuevo extendiendo estos endpoints — no implementar preventivamente.

### app/services/payment.py — verify_webhook_signature

```
manifest = "id:{data_id.lower()};[request-id:{x_request_id};]ts:{ts};"
```

- `data_id` lowercase antes de insertar en manifest
- Si `x_request_id` es None o vacío: omitir del manifest
- `data_id` de `request.query_params["data.id"]` — NUNCA del body
- `hmac.compare_digest` (timing-safe) — no modificar
- Ventana de replay: 120s pasado, 600s futuro

### app/services/payment.py — get_payment

- `external_reference` validado como UUID. Si inválido: `PaymentProcessingError` con `status_code=502`.
- `transaction_amount` convertido con `round()` — no `int()`.

### app/services/payment.py — create_refund

- `create_refund(mp_payment_id)`: llama a `sdk.payment().refunds(mp_payment_id, {}, _REQUEST_OPTIONS)`. Si `status` no está en `(200, 201)`, levanta `PaymentProcessingError`.
- El caller (`app/routers/bookings.py`) es responsable de actualizar el estado de la booking después de un retorno exitoso.

### app/services/email.py

| Decisión | Valor |
|---|---|
| FROM | `no-reply@expresorioparana.com` |
| Destinatarios | Un email por pasajero — iterar `booking.passengers` |
| Templates | HTML + txt, Jinja2 con `StrictUndefined` |
| `EmailDeliveryError` | Definida en `email.py` |

- `send_confirmation_email`: 3 intentos por pasajero, itera todos aunque alguno falle, lanza `EmailDeliveryError` si hay fallos.
- `send_reminder_email` / `send_feedback_email`: log WARNING por fallo, nunca relanzar.

### app/routers/payments.py — Contrato HTTP del webhook

| Caso | HTTP | Body |
|---|---|---|
| Firma válida + pago procesado | 200 | `{"status": "ok"}` |
| Firma inválida | 200 | `{"status": "ignored", "reason": "invalid_signature"}` |
| Payload malformado | 200 | `{"status": "ignored", "reason": "malformed_payload"}` |
| Booking no encontrado | 200 | `{"status": "ignored", "reason": "booking_not_found"}` |
| Error interno | 500 | `{"status": "error"}` |

**NUNCA devolver 4xx.**

Orden obligatorio: extraer data_id → x_request_id → verify_signature → parsear body → get_payment → check approved → SELECT FOR UPDATE booking → check confirmed → confirm_booking → return ok.

### app/routers/trips.py

- GET /trips: filtros opcionales `origin`, `destination`, `departure_date`; implícitos `status==scheduled`, `departure_at>=now()`; orden `departure_at ASC`; counts y precios en queries únicas sin N+1.
- GET /trips/{id}/seats: filtros opcionales `seat_type`, `status`; 404 si trip inexistente (`{"detail": "not_found"}`); lista vacía si sin asientos; response `list[SeatRead]` plano; orden `seat_number ASC`.

### app/routers/bookings.py

- POST /bookings: 404 trip inexistente, 409 `trip_not_available` (cancelado o pasado), 409 `seat_unavailable` con `seat_id` (seat no disponible o no pertenece al trip), 500 sin tramo de precio, 502 `payment_gateway_error` error MP.
- POST /bookings: validar que origen y destino del booking sean de países distintos (regla AR↔PY) — 422 `international_route_required` si origen y destino son del mismo país.
- GET /bookings/{id}: público, selectinload passengers, 404 si inexistente.
- `_SEAT_TYPE_TITLES` tiene assert de cobertura al nivel de módulo: falla en startup si el dict no cubre todos los valores de `SeatTypeEnum`, evitando KeyError silencioso en producción.

### app/routers/bookings.py — POST /{booking_id}/refund-request

- Endpoint público, sin autenticación. Body: `{"email": "..."}` (`RefundRequestCreate`).
- Identificación del solicitante: el email enviado debe coincidir (case-insensitive) con el de **cualquiera** de los pasajeros de la booking (`Passenger.email`). No hay distinción comprador/acompañante en el modelo actual (ver deuda técnica #1, `buyer_email`).
- Precondiciones: 404 si booking inexistente; 409 `booking_not_refundable` si `status != confirmed`; 422 `email_not_found` si el email no coincide con ningún pasajero.
- **Cálculo de `window_valid`** — requiere **ambas** condiciones (Resolución 424/2020):
  1. `now <= booking.confirmed_at + timedelta(days=10)`
  2. `now <= booking.trip.departure_at - timedelta(hours=24)`

  Si `confirmed_at` es `None`, o cualquiera de las dos condiciones falla, `window_valid = False`.
- **Flujo persist-first** (dos commits):
  1. Se crea y persiste `RefundRequest` (commit #1) con `window_valid` ya calculado — esto ocurre **siempre**, sea válida o no la solicitud, para garantizar que toda solicitud tenga un `id` recuperable como código de trámite (cumplimiento del requisito de informar el trámite dentro de 24hs, satisfecho en el mismo ciclo request/response).
  2. Si `window_valid == False` → `RefundWindowExpiredError(refund_req.id)` → handler devuelve 422 `{"detail": "refund_window_expired", "refund_request_id": "..."}`.
  3. Si `window_valid == True` → valida `mp_payment_id` no nulo (500 si lo es, caso de corrupción de datos) → `mark_booking_refunded` (libera asientos vía `_release_booking_seats`, marca `status = refunded`) → `create_refund(mp_payment_id)` → 502 `payment_gateway_error` si MP falla → commit #2.
- Response 201 en éxito: `RefundRequestRead` (incluye `id` como código de trámite).
- `_REFUND_WINDOW_DAYS = 10` hardcodeado a nivel de módulo — consistente con el patrón del proyecto; mover a `settings` si el cliente necesita ajustarlo en el futuro.

### app/routers/admin.py

- POST /admin/login: bcrypt, mismo 401 `invalid_credentials` para email y password incorrectos. `_DUMMY_HASH` calculado al nivel de módulo; cuando el email no existe se ejecuta `_pwd_context.verify` contra el dummy antes de lanzar 401, eliminando timing attack por short-circuit. Rate limit: 10 requests/minuto por IP vía slowapi.
- GET /admin/bookings: filtros `booking_status` y `trip_id`, LIMIT 500, orden `created_at DESC`, selectinload passengers.
- GET /admin/trips/{id}/price-tranches: 404 si trip inexistente, orden `seat_type ASC, min_sold ASC` (orden de enum Postgres: `cama` < `semi_cama`).
- POST /admin/trips/{id}/price-tranches: 404 trip, validación solapamiento explícita con `min_sold < existing.max_sold AND max_sold > existing.min_sold` (rangos adyacentes no solapan) usando `.with_for_update()` para serializar escrituras concurrentes → 409 `tranche_overlap`, 201 en éxito.
- DELETE /admin/trips/{id}/price-tranches/{tranche_id}: 404 trip o tranche (incluyendo tranche de otro trip), 204 sin body en éxito.
- GET /admin/refund-requests: lista **todas** las solicitudes de reembolso (válidas y rechazadas — `window_valid` distingue el resultado, no filtra qué se persiste). Filtros opcionales `window_valid` y `booking_id`, LIMIT 500, orden `requested_at DESC`.
- Panel admin debe permitir gestión autónoma de trayectos, paradas, orígenes y destinos (sin depender del desarrollador para cada cambio). Endpoints a definir antes de implementar.

### app/limiter.py

- Módulo independiente sin dependencias del resto de la app — evita import circular entre `main.py` y `admin.py`.
- `limiter = Limiter(key_func=get_remote_address)` — instancia global importada por `main.py` y `admin.py`.
- `main.py` registra `app.state.limiter = limiter` y el handler `RateLimitExceeded`.

### app/deps.py — JWT con iss/aud

- Tokens emitidos con `iss="crucero-admin"` y `aud="crucero-admin-api"`.
- `jwt.decode` valida `audience="crucero-admin-api"`, `issuer="crucero-admin"` y requiere `["exp", "sub", "iss", "aud"]`.

### tasks/reminders.py

- `AsyncIOScheduler` + `SQLAlchemyJobStore` con `sync_database_url`.
- `register_jobs()` llamada después de `scheduler.start()` en lifecycle.
- expire_bookings: IntervalTrigger(minutes=1), misfire_grace_time=60s.
- send_reminders / send_feedback: IntervalTrigger(hours=1), misfire_grace_time=3600s.
- Ventana reminder: `departure_at` entre now y now+24h.
- Ventana feedback: `arrival_at <= now - 2h`.
- Patrón dos sesiones: primera sesión selecciona solo `Booking.id` (sin selectinload); segunda sesión hace refetch completo con `selectinload(Booking.passengers, Passenger.seat, Booking.trip, Trip.route)` antes de llamar al service de email, luego commit.
- Commit por booking individual con try/except — loop nunca se corta.

### pyproject.toml + Dockerfile

- `pytest-env`: variables fake en `[tool.pytest.ini_options] env = [...]` — no en conftest.
- `apscheduler>=3.10,<4.0` — upper bound explícito.
- `--workers 1` obligatorio en Dockerfile — APScheduler no soporta múltiples workers.

### app/services/inventory.py

- `reserve_seats`: `.with_for_update(nowait=True)` — si el lock no está disponible, SQLAlchemy lanza `OperationalError` que se captura y relanza como `SeatNotAvailable(seat_ids[0])`, resultando en 409 inmediato para el segundo comprador en vez de bloqueo por timeout.
- `mark_seats_sold` conserva `.with_for_update()` sin nowait — semántica distinta: el webhook ya tiene el booking, no hay contención entre compradores.

### app/services/booking.py — refunds

- `create_refund_request(db, booking_id, email_used, window_valid)`: crea y `flush()`ea un `RefundRequest` (necesario para obtener el `id` antes del commit). No hace commit — responsabilidad del caller.
- `mark_booking_refunded(db, booking_id)`: guard idempotente — si `booking.status != confirmed`, retorna sin modificar. Si es `confirmed`, lo pasa a `refunded` y libera los asientos vía `_release_booking_seats` (mismo mecanismo que el resto del flujo de liberación, sin decremento explícito de `sold_count` — se deriva en tiempo real del estado de `seats`).
