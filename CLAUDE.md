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
│   │   │   ├── trip.py          # Route, Trip, Seat, PriceTranche, Stop, CountryEnum
│   │   │   ├── booking.py       # Booking, Passenger (con luggage_count), AdminUser, RefundRequest
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
│   │       ├── conftest.py      # Postgres container + engine + TRUNCATE + AsyncClient; soporta TEST_DATABASE_URL para entornos sin Docker
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
- `app/errors.py` — todas las excepciones del proyecto (SeatUnavailableError, NotFoundError, InvalidWebhookSignature, PaymentProcessingError, PaymentConfigError, NoPriceTranche) y register_exception_handlers. `NoPriceTranche` → 500 `"no_price_tranche_available"`. `app/exceptions.py` eliminado.
- `app/services/pricing.py` — get_current_price, NoPriceTranche
- `app/services/inventory.py` — get_available_seats, reserve_seats, mark_seats_sold
- `app/services/booking.py` — create_booking, confirm_booking, expire_booking, InternationalRouteRequiredError
- `app/services/payment.py` — verify_webhook_signature, get_payment, create_preference
- `app/routers/payments.py` — POST /webhooks/mercadopago
- `app/services/email.py` — send_confirmation_email, send_reminder_email, send_feedback_email. FROM: `no-reply@expresorioparana.com`. Subjects: "Expreso Río Paraná".
- `templates/email/confirmation.html` + `confirmation.txt`
- `templates/email/reminder.html` + `reminder.txt`
- `templates/email/feedback.html` + `feedback.txt`
- `app/schemas/trips.py` — StopRead, RouteRead (nested origin_stop/destination_stop), SeatRead, TripRead
- `app/schemas/bookings.py` — PassengerCreate (con `luggage_count: int = 0`), PassengerRead (con `luggage_count: int`), BookingCreate, BookingRead, BookingCreateResponse, RefundRequestCreate, RefundRequestRead
- `app/schemas/admin.py` — AdminLoginRequest, AdminLoginResponse, PriceTrancheCreate, PriceTrancheRead, AdminBookingRead
- `app/routers/trips.py` — GET /trips, GET /trips/{id}/seats, GET /stops, GET /stops/{id}/valid-destinations
- `app/routers/bookings.py` — POST /bookings (con validación AR↔PY), GET /bookings/{id}, POST /bookings/{id}/refund-request
- `app/routers/admin.py` — POST /admin/login (con rate limiting 10/min), GET /admin/bookings, GET/POST/DELETE /admin/trips/{id}/price-tranches, GET /admin/refund-requests
- `app/main.py` — FastAPI con lifespan, slowapi middleware, exception handlers, routers (incluye stops_router). title: "Expreso Río Paraná API".
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
- `tests/integration/conftest.py` — PostgresContainer con fallback a `TEST_DATABASE_URL` para entornos sin Docker; sync engine para create_all; TRUNCATE autouse (incluye `stops`); AsyncSession; AsyncClient con override get_db; mock autouse SDK MercadoPago
- `tests/integration/test_pricing.py` — 8 tests de get_current_price (fixtures actualizados a rutas AR↔PY)
- `tests/integration/test_inventory.py` — 16 tests de reserve_seats, mark_seats_sold (fixtures actualizados a rutas AR↔PY)
- `tests/integration/test_booking_service.py` — 10 tests: create_booking, confirm_booking, expire_booking + test_create_booking_same_country_raises
- `tests/integration/test_trips_router.py` — 20 tests: GET /trips, GET /trips/{id}/seats, GET /stops, GET /stops/{id}/valid-destinations
- `tests/integration/test_bookings_router.py` — 13 tests: POST /bookings (incluye 422 mismo país, PY→AR aceptada), GET /bookings/{id}
- `tests/integration/test_payments_router.py` — 12 tests (fixtures actualizados a rutas AR↔PY)
- `tests/integration/test_admin_router.py` — 24 tests (fixtures actualizados a rutas AR↔PY)
- `tests/integration/test_refund_requests.py` — 9 tests (fixtures actualizados a rutas AR↔PY)
- `migrations/versions/c9d4e2f1_add_refunded_and_refund_requests.py` — `ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'refunded'`; tabla `refund_requests` con FK a bookings, índice en booking_id
- `migrations/versions/a3d5e8f1_add_luggage_count_to_passengers.py` — columna `luggage_count INTEGER NOT NULL DEFAULT 0` en tabla `passengers`; downgrade elimina la columna. ⚠️ Esta migración bifurcaba desde `c9d4e2f1` en paralelo con `b7c3a1d2` — resuelta con merge migration `f3a9c7d5`.
- `migrations/versions/b7c3a1d2_add_stops_table.py` — ENUM `country_code` (AR/PY); tabla `stops` (id, name unique, country, created_at); refactor de `routes`: columnas `origin`/`destination` reemplazadas por FK `origin_stop_id`/`destination_stop_id`; índices y UniqueConstraint actualizados
- `migrations/versions/f3a9c7d5_add_trip_indexes.py` — merge migration: consolida branches `a3d5e8f1` y `b7c3a1d2` en único head; agrega `idx_trips_status_departure_at` (compuesto `status, departure_at`) e `idx_trips_route_id` (simple `route_id`) a la tabla `trips`; downgrade elimina ambos índices
- `app/models/trip.py` — `CountryEnum` (AR/PY), modelo `Stop` con relaciones `origin_routes`/`destination_routes`; `Route` refactorizado a FKs `origin_stop_id`/`destination_stop_id` con relationships; `Trip` con `__table_args__` declarando `idx_trips_status_departure_at` e `idx_trips_route_id`
- `app/models/booking.py` — `Booking`, `Passenger` (con `luggage_count = Column(Integer, nullable=False, default=0)`), `AdminUser`, `RefundRequest`; `refunded` en `BookingStatusEnum`; relación `refund_requests` en `Booking`
- `app/models/__init__.py` — exporta `Stop`, `CountryEnum`, `RefundRequest`

### Bugs críticos resueltos (branch `claude/vibrant-cori-71dm2`)

- ✅ **Bug 1 — Race `expire_bookings_job` vs webhook** (`app/services/booking.py`) — guard en `expire_booking`: retorna early si `status != pending_payment`, dentro del lock `FOR UPDATE`.
- ✅ **Bug 2 — Email de confirmación nunca se enviaba** (`app/routers/payments.py`) — Step 12 implementado: re-fetch post-commit con selectinload, llamada a `send_confirmation_email`, `EmailDeliveryError` capturado con WARNING.
- ✅ **Bug 3 — `datetime.utcnow` deprecated** (`app/models/trip.py`, `app/models/booking.py`) — 7 ocurrencias reemplazadas por `default=lambda: datetime.now(timezone.utc)`.
- ✅ **Bug 4 — JWT sin `require exp`** (`app/deps.py`) — `options={"require": ["exp", "sub"]}` agregado a `jwt.decode`.

### Bugs críticos resueltos (branch `claude/inspiring-edison-WJqep`)

- ✅ **Bug [1.1] — Orphan de preferencia MP cuando `db.commit()` falla** (`app/routers/bookings.py`)
- ✅ **Bug [1.2] — Email de confirmación nunca se reenvía tras retry de MP** (`app/routers/payments.py`)
- ✅ **Bug [1.3] — Webhook: `data_id` y `payment_id` no se cross-checkean** (`app/routers/payments.py`)
- ✅ **Bug [1.4] — Race en creación concurrente de price tranches sin filas previas** (`app/routers/admin.py`)
- ✅ **Bug [1.5] — `release_expired_reservations` libera seats sin marcar booking como `expired`** (`app/services/inventory.py`)
- ✅ **Bug [1.6] — `confirm_booking` no valida estado previo** (`app/services/booking.py`)
- ✅ **Bug [1.7] — `reserve_seats` reporta `seat_ids[0]` en contención de lock** (`app/services/inventory.py`)

### Fixes de seguridad resueltos (branch `claude/determined-bardeen-xTt1N`)

- ✅ **[2.2] — Rate limiting en `POST /admin/login`** — slowapi, `@limiter.limit("10/minute")`, handler `RateLimitExceeded`.
- ✅ **[2.3] — JWT sin `iss`/`aud`** — `iss="crucero-admin"`, `aud="crucero-admin-api"` en encode y decode.

> ⚠️ Los valores `"crucero-admin"` y `"crucero-admin-api"` en los claims JWT deberán actualizarse a los valores correspondientes de Expreso Río Paraná cuando se defina el nombre final del sistema.

### Próximo a implementar

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
Norma gubernamental (aprox. abril 2026) que exige vincular cada ticket de equipaje al pasaje del pasajero nominalmente. El campo `luggage_count` ya existe en `Passenger` (migración `a3d5e8f1`), pero la norma requiere vinculación nominal (nombre + número de boleto), no solo conteo. El módulo de Control de Pasajeros (QR) deberá contemplar esto.

---

## Deuda técnica conocida

1. **`Booking` sin `buyer_email`**: resolver con `contact_email` al implementar gestión avanzada de reservas — requiere migración.
2. **`send_reminder_email` / `send_feedback_email` retornan `None`**: cambiar firma a `-> bool`; solo flaggear `sent=True` cuando el envío fue exitoso.
3. **`selectinload` obligatorio para `email.py`**: cargar `booking.passengers`, `booking.trip`, `booking.trip.route`, `passenger.seat` antes de llamar a cualquier `send_*`.
4. ✅ **Idempotencia de emails de confirmación — RESUELTO**: guard en `app/routers/payments.py:120-122`.
5. **`create_booking()` no retorna desglose de precios por tipo**: workaround en router via `get_current_price()` — genera N+1 queries.
6. **`SeatNotAvailable` vs `SeatUnavailableError`**: dos excepciones casi homónimas. Unificar antes de resolver deuda #14 restante (LLE-65).
7. **`GET /admin/bookings` sin paginación**: LIMIT 500 hardcodeado. Agregar cuando el volumen lo requiera.
8. **Known gap en tests**: desglose por tipo de asiento en `create_booking` no validado. Comentario en `test_booking_service.py`: `# KNOWN GAP: seat type breakdown not validated — see CLAUDE.md`
9. **`DELETE /admin/trips/{id}/price-tranches/{id}` sin validación de uso activo**: admin puede borrar el tramo que cubre el `sold_count` actual. Fix: rechazar con 409.
10. **CORS ausente en `app/main.py`**: agregar `CORSMiddleware` antes de conectar el frontend. Orígenes a definir con el cliente.
11. ✅ **Índice compuesto `Trip(status, departure_at)` — RESUELTO**: `idx_trips_status_departure_at` agregado en migración `f3a9c7d5`.
12. **`if admin_id is None` redundante en `app/deps.py`**: inofensivo; limpiar en pasada futura.
13. **`_DUMMY_HASH` se computa en cada import** (`app/routers/admin.py`): bcrypt ~250ms en import-time. Hardcodear un hash pre-computado.
14. **`BookingNotFound` y `SeatNotAvailable` sin handlers registrados** (`app/errors.py`): propagan como 500 genérico (LLE-65). ~~`NoPriceTranche`~~ resuelto: handler registrado → 500 `"no_price_tranche_available"`.
15. **Doble lógica de resolución de tramo activo** (`app/services/pricing.py` y `app/routers/trips.py`): extraer función compartida.
16. **`expire_bookings_job` carga objetos Booking completos** (`tasks/reminders.py`): cambiar a `select(Booking.id)`.
17. ✅ **Índice `Trip.route_id` — RESUELTO**: `idx_trips_route_id` agregado en migración `f3a9c7d5`.
18. **`GET /bookings/{booking_id}` expone PII sin autenticación**: posible incumplimiento Ley 25.326. Scope de LLE-56 (#035) contempla PII de pasajeros y visibilidad del campo `status`.
19. **`test_login_rate_limit_blocks_after_10_attempts` es frágil ante orden de ejecución**: debe permanecer al final de `test_admin_router.py`.
20. **`BookingCreate._passengers_match_seats` valida orden pero `create_booking` también**: verificación duplicada. Unificar en pasada futura.
21. ✅ **Validación AR↔PY cubierta por tests — RESUELTO**: tests implementados en `test_bookings_router.py` y `test_booking_service.py` (branch `claude/admiring-clarke-n1e1s2`).
22. **Claims JWT con nombre "crucero-admin"**: actualizar cuando se defina el nombre final del sistema.
23. **`RefundRequest.id` — asimetría entre default Python y server_default DB**: cualquier INSERT directo futuro en `refund_requests` debe generar el `id` explícitamente.
24. **Race condition en `create_refund_request_endpoint`**: dos requests concurrentes pueden generar dos filas en `refund_requests` pero un solo reembolso. Aceptable para el MVP.
25. **`HTTP_422_UNPROCESSABLE_ENTITY` deprecada en Starlette 1.3** (`app/errors.py`): reemplazar por `HTTP_422_UNPROCESSABLE_CONTENT` (LLE-64). Sin impacto en producción, genera warnings en tests.
26. **`TEST_DATABASE_URL` en conftest** (`tests/integration/conftest.py`): al configurar CI/CD, asegurarse de que esta variable no esté seteada en entornos de producción o staging. Documentar en `.env.example` (LLE-66).

---

## Decisiones de diseño aprobadas

### #012 — Tabla `stops` y lógica AR↔PY

- **Tabla `stops` separada de `Route`** (confirmado 14/06).
- **`Stop` global, `Route` usa FKs `origin_stop_id` / `destination_stop_id`**: columnas string `origin`/`destination` eliminadas de `routes`.
- **`RouteRead` expone `origin_stop: StopRead` y `destination_stop: StopRead`**: el frontend necesita `country` para el filtrado dinámico.
- **`CountryEnum` en `app/models/trip.py`**: valores `AR` y `PY`. Tipo Postgres: `country_code`.
- **Validación AR↔PY en `app/services/booking.py`**: `InternationalRouteRequiredError` (excepción de dominio, sin handler global). El router carga las relaciones, pasa `origin_country`/`destination_country` al service, captura la excepción y devuelve 422 `international_route_required`.
- **`GET /trips` mantiene filtros string** (`origin`, `destination`): filtran contra `Stop.name` via join. Contrato del endpoint no cambiado.
- **`GET /stops/{stop_id}/valid-destinations`**: 200 lista | 404 `not_found` si el stop no existe | lista vacía si no hay destinos del país opuesto.
- **Migración Alembic atómica** (`b7c3a1d2`).

### #013 — Índices en Trip

- **`idx_trips_status_departure_at`**: índice compuesto `(status, departure_at)` — filtro de igualdad primero, luego rango/orden.
- **`idx_trips_route_id`**: índice simple sobre FK `route_id` — Postgres no los crea automáticamente.
- **Declarados en `Trip.__table_args__`** además de la migración — consistente con el patrón de `Seat` y `PriceTranche`.
- **Merge migration `f3a9c7d5`**: consolida los dos heads que existían (`a3d5e8f1` y `b7c3a1d2`, ambos bifurcando desde `c9d4e2f1`).

### Tests — arquitectura de la suite

**Scope split:**
- Unit tests: funciones puras sin DB.
- Integration tests: todo lo que toca SQLAlchemy corre contra Postgres real via testcontainers.

**DB strategy:**
- Un contenedor Postgres por sesión de pytest (scope=`session`). Fallback a `TEST_DATABASE_URL` si Docker no está disponible.
- Tablas creadas con `Base.metadata.create_all` via sync engine.
- Entre tests: `TRUNCATE stops, passengers, bookings, seats, price_tranches, trips, routes, admin_users RESTART IDENTITY CASCADE`.

**conftest split:**
- `tests/conftest.py`: solo mock autouse de Resend.
- `tests/integration/conftest.py`: container con fallback TEST_DATABASE_URL, engine, sesión, AsyncClient, mock autouse SDK MercadoPago.

**Mock del SDK MercadoPago:**
- `patch("app.services.payment._sdk", mock_sdk)` en `tests/integration/conftest.py`.
- Default: `preference.create` → `{"status": 201, "response": {"id": "fake-preference-id", "init_point": "https://..."}}`.
- Default: `payment.get` → `{"status": 200, "response": {"id": 123456789, "status": "approved", "external_reference": None, "transaction_amount": 24500.0}}`.
- Default: `payment().refunds` → `{"status": 201, "response": {"id": 12345678}}`.

**Patrón identity map:** después de cualquier POST que haga `db.commit()`, agregar `await db.expire_all()` antes del `select()` final.

**Pricing — confirmación de alcance (14/06):** el ajuste manual de precios se resuelve con los endpoints ya implementados. No se requiere override de precio fijo por trip ni cambios al schema.

### app/services/payment.py — verify_webhook_signature

```
manifest = "id:{data_id.lower()};[request-id:{x_request_id};]ts:{ts};"
```

- `data_id` de `request.query_params["data.id"]` — NUNCA del body
- `hmac.compare_digest` (timing-safe) — no modificar
- Ventana de replay: 120s pasado, 600s futuro

### app/services/payment.py — get_payment

- `external_reference` validado como UUID. Si inválido: `PaymentProcessingError` con `status_code=502`.
- `transaction_amount` convertido con `round()` — no `int()`.

### app/services/payment.py — create_refund

- `create_refund(mp_payment_id)`: llama a `sdk.payment().refunds(mp_payment_id, {}, _REQUEST_OPTIONS)`. Si `status` no está en `(200, 201)`, levanta `PaymentProcessingError`.

### app/services/email.py

| Decisión | Valor |
|---|---|
| FROM | `no-reply@expresorioparana.com` |
| Destinatarios | Un email por pasajero — iterar `booking.passengers` |
| Templates | HTML + txt, Jinja2 con `StrictUndefined` |

- `send_confirmation_email`: 3 intentos por pasajero, lanza `EmailDeliveryError` si hay fallos.
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

### app/routers/trips.py

- GET /trips: filtros opcionales `origin`, `destination` (strings, filtran contra `Stop.name`), `departure_date`; implícitos `status==scheduled`, `departure_at>=now()`; orden `departure_at ASC`.
- GET /trips/{id}/seats: filtros opcionales `seat_type`, `status`; 404 si trip inexistente; orden `seat_number ASC`.
- GET /stops: devuelve todas las paradas con id, name, country.
- GET /stops/{stop_id}/valid-destinations: paradas del país opuesto; 404 si stop no existe; lista vacía si no hay destinos válidos.

### app/routers/bookings.py

- POST /bookings: 404 trip inexistente, 409 `trip_not_available`, 409 `seat_unavailable`, 422 `international_route_required`, 500 sin tramo de precio, 502 `payment_gateway_error`.
- GET /bookings/{id}: público, selectinload passengers, 404 si inexistente.
- `_SEAT_TYPE_TITLES` tiene assert de cobertura al nivel de módulo.

### app/routers/bookings.py — POST /{booking_id}/refund-request

- Endpoint público. Body: `{"email": "..."}`.
- Email debe coincidir (case-insensitive) con el de cualquier pasajero de la booking.
- 404 si booking inexistente; 409 `booking_not_refundable`; 422 `email_not_found`.
- **`window_valid`** requiere ambas condiciones (Resolución 424/2020): `now <= confirmed_at + 10d` Y `now <= departure_at - 24h`.
- **Flujo persist-first** (dos commits): persiste `RefundRequest` siempre → 422 si `window_valid==False` → reembolso MP → commit #2.
- Response 201: `RefundRequestRead`. `_REFUND_WINDOW_DAYS = 10` hardcodeado.

### app/routers/admin.py

- POST /admin/login: bcrypt, 401 `invalid_credentials`. Rate limit: 10/minuto por IP.
- GET /admin/bookings: filtros `booking_status` y `trip_id`, LIMIT 500, orden `created_at DESC`.
- GET/POST/DELETE /admin/trips/{id}/price-tranches: con validación solapamiento y lock advisory.
- GET /admin/refund-requests: filtros `window_valid` y `booking_id`, LIMIT 500, orden `requested_at DESC`.
- Panel admin permite gestión autónoma de trayectos, paradas, orígenes y destinos.

### app/limiter.py

- Módulo independiente. `limiter = Limiter(key_func=get_remote_address)`.

### app/deps.py — JWT con iss/aud

- `iss="crucero-admin"`, `aud="crucero-admin-api"`. Requiere `["exp", "sub", "iss", "aud"]`.

### tasks/reminders.py

- `AsyncIOScheduler` + `SQLAlchemyJobStore` con `sync_database_url`.
- expire_bookings: IntervalTrigger(minutes=1). send_reminders / send_feedback: IntervalTrigger(hours=1).
- Ventana reminder: `departure_at` entre now y now+24h. Ventana feedback: `arrival_at <= now - 2h`.
- Patrón dos sesiones: primera selecciona solo `Booking.id`; segunda hace refetch completo con selectinload.

### pyproject.toml + Dockerfile

- `pytest-env`: variables fake en `[tool.pytest.ini_options] env = [...]` — no en conftest.
- `apscheduler>=3.10,<4.0` — upper bound explícito.
- `--workers 1` obligatorio en Dockerfile.

### app/services/inventory.py

- `reserve_seats`: `.with_for_update(nowait=True)` — 409 inmediato en contención.
- `mark_seats_sold`: `.with_for_update()` sin nowait.

### app/services/booking.py — refunds

- `create_refund_request`: crea y `flush()`ea un `RefundRequest`. No hace commit.
- `mark_booking_refunded`: guard idempotente — si `status != confirmed`, retorna sin modificar.
