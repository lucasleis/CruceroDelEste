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
│   │   │   ├── trip.py          # Route, Trip, Seat, PriceTranche, Stop, CountryEnum, SeatLayout
│   │   │   ├── booking.py       # Booking (con contact_email), Passenger (con luggage_count), AdminUser, RefundRequest
│   │   │   └── __init__.py
│   │   ├── schemas/
│   │   │   ├── trips.py
│   │   │   ├── bookings.py
│   │   │   └── admin.py
│   │   ├── routers/
│   │   │   ├── trips.py
│   │   │   ├── bookings.py
│   │   │   ├── payments.py      # Webhook MercadoPago
│   │   │   ├── admin.py         # Login, price-tranches, bookings, refund-requests
│   │   │   └── admin_catalog.py # ABM de stops, routes, trips, seat-layouts
│   │   ├── services/
│   │   │   ├── pricing.py
│   │   │   ├── inventory.py
│   │   │   ├── booking.py
│   │   │   ├── payment.py
│   │   │   ├── http.py          # call_with_retry — backoff exponencial para 429 de MP
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
│   │       ├── test_admin_catalog.py
│   │       └── test_refund_requests.py
│   ├── alembic.ini
│   ├── pyproject.toml
│   ├── .env.example
│   └── Dockerfile
├── frontend-landing/            # Next.js — landing pública, SEO (a desarrollar)
├── frontend-admin/              # React + Vite — panel de administración (a desarrollar)
├── specs/                       # Documentación y especificaciones del proyecto
└── CLAUDE.md
```

Arquitectura en tres capas: **routers → services → models**. Los services contienen toda la lógica de negocio y son testeables sin base de datos. Los routers solo parsean HTTP y devuelven respuestas. Sin repositorios abstractos, sin CQRS, sin sagas.

**Importante**: todo el código backend vive dentro de `/backend/`. Los paths de archivos en este documento son relativos a `/backend/` salvo que se indique lo contrario.

---

## Arquitectura frontend (decisión 24/06/2026)

**Monorepo con dos proyectos frontend separados** (LLE-70):

| App | Tecnología | Dominio producción | Propósito |
|---|---|---|---|
| `frontend-landing/` | Next.js | `expresorioparana.com` | Landing pública, SEO, innovación visual |
| `frontend-admin/` | React + Vite | `admin.expresorioparana.com` | Panel de gestión operativa, analíticas |

**Stack del panel de admin:** React + Vite + shadcn/ui + Recharts + React Query (TanStack) + React Router v6.

**CORS en producción:** ambos orígenes deben estar en `CORS_ORIGINS`. Ver LLE-71 (pre-deploy checklist).

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
- `app/config.py` — pydantic-settings con `@model_validator`; campo `cors_origins: list[str]` con default `["http://localhost:3000", "http://31.97.25.173"]`
- `app/database.py` — async engine, sessionmaker, Base, get_db
- `app/limiter.py` — instancia global de `slowapi.Limiter` con `get_remote_address`
- `app/deps.py` — get_current_admin con PyJWT (HS256, iss+aud), re-exporta get_db
- `app/errors.py` — todas las excepciones del proyecto (SeatUnavailableError, NotFoundError, InvalidWebhookSignature, PaymentProcessingError, PaymentConfigError, NoPriceTranche) y register_exception_handlers. `NoPriceTranche` → 500 `"no_price_tranche_available"`. `app/exceptions.py` eliminado.
- `app/services/pricing.py` — get_current_price, NoPriceTranche
- `app/services/inventory.py` — get_available_seats, reserve_seats, mark_seats_sold
- `app/services/booking.py` — create_booking (con parámetro `contact_email`), confirm_booking, expire_booking, mark_booking_refunded, create_refund_request, InternationalRouteRequiredError
- `app/services/payment.py` — verify_webhook_signature, get_payment, create_preference, create_refund. SDK retry interno desactivado (`max_retries=0`). `create_refund` envía `X-Idempotency-Key` por llamada. Tres calls wrapeadas con `call_with_retry`.
- `app/services/http.py` — `call_with_retry`: async, backoff exponencial con jitter, reintenta solo en 429, max 3 reintentos (4 intentos totales), loguea warning al agotar reintentos, lanza `PaymentProcessingError(status_code=429)`.
- `app/routers/payments.py` — POST /webhooks/mercadopago; POST /webhooks/chargebacks; selectinload chain extendido con `Route.origin_stop` y `Route.destination_stop`
- `app/services/email.py` — send_confirmation_email, send_reminder_email, send_feedback_email. FROM: `no-reply@expresorioparana.com`. Subjects: "Expreso Río Paraná". `_context_for()` usa `trip.route.origin_stop.name` / `trip.route.destination_stop.name`.
- `templates/email/confirmation.html` + `confirmation.txt`
- `templates/email/reminder.html` + `reminder.txt`
- `templates/email/feedback.html` + `feedback.txt`
- `app/schemas/trips.py` — StopRead, RouteRead (nested origin_stop/destination_stop), SeatRead, TripRead
- `app/schemas/bookings.py` — PassengerCreate (con `luggage_count: int = 0`), PassengerRead (con `luggage_count: int`), BookingCreate (con `contact_email: EmailStr` requerido), BookingRead (con `contact_email: str`), BookingCreateResponse (con `contact_email: str`), RefundRequestCreate, RefundRequestRead
- `app/schemas/admin.py` — AdminLoginRequest, AdminLoginResponse, PriceTrancheCreate, PriceTrancheRead, AdminBookingRead (con `contact_email: str`), SeatLayoutRead, StopCreate, StopUpdate, RouteCreate, TripCreate, TripUpdate, AdminTripRead
- `app/routers/trips.py` — GET /trips, GET /trips/{id}/seats, GET /stops, GET /stops/{id}/valid-destinations
- `app/routers/bookings.py` — POST /bookings (con validación AR↔PY, pasa `contact_email` a service y a MP payer), GET /bookings/{id}, POST /bookings/{id}/refund-request (acepta `contact_email` además de emails de pasajeros). Orden correcto: `create_refund` (MP) → `mark_booking_refunded` (DB) → `commit`.
- `app/routers/admin.py` — POST /admin/login (con rate limiting 10/min), GET /admin/bookings, GET/POST/DELETE /admin/trips/{id}/price-tranches, GET /admin/refund-requests
- `app/routers/admin_catalog.py` — GET /admin/seat-layouts; CRUD /admin/stops; CRUD /admin/routes; CRUD /admin/trips (con auto-generación de seats desde SeatLayout)
- `app/main.py` — FastAPI con lifespan, CORSMiddleware (orígenes desde `settings.cors_origins`), slowapi middleware, exception handlers, routers. title: "Expreso Río Paraná API".
- `tasks/__init__.py` — vacío
- `tasks/reminders.py` — AsyncIOScheduler, SQLAlchemyJobStore, tres jobs; selectinload chain extendido con `Route.origin_stop` y `Route.destination_stop`
- `pyproject.toml` — dependencias (incluye slowapi>=0.1.9), hatchling, pytest config con env vars fake
- `Dockerfile` — python:3.12-slim, single-stage, appuser, --workers 1
- `.dockerignore`
- `.env.example` — incluye `CORS_ORIGINS` y `TEST_DATABASE_URL` documentados
- `tests/conftest.py` — mock autouse de Resend; env vars via pytest-env en pyproject.toml
- `tests/unit/__init__.py` — vacío
- `tests/unit/test_payment_signature.py` — 14 tests de verify_webhook_signature
- `tests/unit/test_schemas.py` — 29 tests: BookingCreate y PriceTrancheCreate
- `tests/integration/__init__.py` — vacío
- `tests/integration/conftest.py` — PostgresContainer con fallback a `TEST_DATABASE_URL`; TRUNCATE autouse (incluye `stops` y `seat_layouts`); mock autouse SDK MercadoPago
- `tests/integration/test_pricing.py` — 8 tests
- `tests/integration/test_inventory.py` — 16 tests
- `tests/integration/test_booking_service.py` — 10 tests
- `tests/integration/test_trips_router.py` — 20 tests
- `tests/integration/test_bookings_router.py` — 13 tests
- `tests/integration/test_payments_router.py` — 12 tests
- `tests/integration/test_admin_router.py` — 24 tests
- `tests/integration/test_admin_catalog.py` — 37 tests: seat-layouts (4), stops CRUD (9), routes CRUD (8), trips CRUD (16)
- `tests/integration/test_refund_requests.py` — 11 tests
- `migrations/versions/c9d4e2f1_add_refunded_and_refund_requests.py` — tabla `refund_requests`
- `migrations/versions/a3d5e8f1_add_luggage_count_to_passengers.py` — `luggage_count` en `passengers`
- `migrations/versions/b7c3a1d2_add_stops_table.py` — tabla `stops`; refactor `routes` a FKs
- `migrations/versions/f3a9c7d5_add_trip_indexes.py` — merge migration + índices en `trips`
- `migrations/versions/e5b8c3a2_add_contact_email_to_bookings.py` — `contact_email` en `bookings`
- `migrations/versions/d4b1f9e2_add_seat_layouts.py` — tabla `seat_layouts`; FK nullable `seat_layout_id` en `trips`
- `app/models/trip.py` — `CountryEnum`, `Stop`, `Route`, `Trip` (con FK `seat_layout_id`), `SeatLayout`
- `app/models/booking.py` — `Booking` (con `contact_email`), `Passenger` (con `luggage_count`), `AdminUser`, `RefundRequest`, `Chargeback`, `ChargebackStatusEnum`

### Bugs críticos resueltos (branch `claude/vibrant-cori-71dm2`)

- ✅ Bug 1 — Race `expire_bookings_job` vs webhook
- ✅ Bug 2 — Email de confirmación nunca se enviaba
- ✅ Bug 3 — `datetime.utcnow` deprecated
- ✅ Bug 4 — JWT sin `require exp`

### Bugs críticos resueltos (branch `claude/inspiring-edison-WJqep`)

- ✅ Bug [1.1–1.7] — ver historial de branches

### Fixes de seguridad resueltos (branch `claude/determined-bardeen-xTt1N`)

- ✅ [2.2] Rate limiting en `POST /admin/login`
- ✅ [2.3] JWT sin `iss`/`aud`

> ⚠️ Los valores `"crucero-admin"` y `"crucero-admin-api"` en los claims JWT deberán actualizarse cuando se defina el nombre final del sistema.

### Bugs críticos resueltos (branch de #014)

- ✅ LLE-68 — `email.py` referenciaba `Route.origin`/`Route.destination` eliminados en #012

### Bugs críticos resueltos (branch `claude/review-payments-bookings-tm37v3`)

- ✅ LLE-87 — `app/services/http.py` creado: `call_with_retry` con backoff exponencial para 429. `app/services/payment.py`: tres calls MP wrapeadas, SDK retry interno desactivado (`max_retries=0`), `X-Idempotency-Key` en `create_refund`.
- ✅ LLE-83 — Orden corregido en `app/routers/bookings.py`: `create_refund` (MP) antes de `mark_booking_refunded` (DB).
- ✅ LLE-89 — Cerrado sin cambios. Riesgo de row lock contention ya mitigado por LLE-82: `mark_booking_refunded` no realiza I/O externo mientras mantiene el lock.

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
El cliente vende simultáneamente por su sistema SOR, Plataforma 10 y Central de Pasajes. Sin sincronización con SOR, puede venderse el mismo asiento dos veces. No está definido si SOR tiene API. Acción requerida antes del lanzamiento.

### 🔴 Riesgo alto — Validación AR↔PY sin integración con SOR
La regla AR↔PY puede ser bypasseada si los asientos no están sincronizados con SOR.

### 🟡 Riesgo medio — Norma de trazabilidad de equipaje (Resolución ST N° 4/2026)
**Norma vigente desde el 14 de marzo de 2026.** Identificador: RESOL-2026-4-APN-ST#MEC. Publicada en el Boletín Oficial el 13/01/2026. Fiscaliza la CNRT.

Exige vinculación inequívoca entre cada equipaje y el pasajero propietario. No prescribe un mecanismo específico — los operadores eligen libremente (QR, registro digital en ticketing, etiqueta física, etc.). El equipaje sin identificación no puede ser ingresado a la unidad.

El campo `luggage_count` en `Passenger` **no es suficiente** para cumplir la norma — se requiere vinculación nominal, no solo conteo. El módulo de Control de Pasajeros (QR, LLE-26) es el lugar natural para implementarlo.

⚠️ No se encontró prórroga publicada. Si el cliente afirma estar gestionando una, debe verificarse con documentación oficial. El plazo de notificación a la CNRT del mecanismo adoptado ya venció. Ver LLE-24 para acciones pendientes.

---

## Deuda técnica conocida

1. ✅ `Booking` sin `contact_email` — RESUELTO.
2. `send_reminder_email` / `send_feedback_email` retornan `None` — cambiar a `-> bool`.
3. `selectinload` obligatorio para `email.py`: incluir `route.origin_stop` y `route.destination_stop`. Ya aplicado en `payments.py` y `reminders.py`.
4. ✅ Idempotencia de emails de confirmación — RESUELTO.
5. `create_booking()` no retorna desglose de precios por tipo — N+1 queries.
6. `SeatNotAvailable` vs `SeatUnavailableError` — unificar (LLE-65).
7. `GET /admin/bookings` sin paginación — LIMIT 500.
8. Known gap en tests: desglose por tipo de asiento no validado.
9. `DELETE /admin/trips/{id}/price-tranches/{id}` sin validación de uso activo.
10. ✅ CORS — RESUELTO. `CORSMiddleware` con `settings.cors_origins`. ⚠️ Actualizar `CORS_ORIGINS` antes de producción (LLE-71).
11. ✅ Índice compuesto `Trip(status, departure_at)` — RESUELTO.
12. `if admin_id is None` redundante en `app/deps.py`.
13. `_DUMMY_HASH` se computa en cada import.
14. `BookingNotFound` y `SeatNotAvailable` sin handlers (LLE-65).
15. Doble lógica de resolución de tramo activo.
16. `expire_bookings_job` carga objetos `Booking` completos.
17. ✅ Índice `Trip.route_id` — RESUELTO.
18. `GET /bookings/{booking_id}` expone PII sin autenticación (LLE-56, #035).
19. `test_login_rate_limit_blocks_after_10_attempts` frágil ante orden de ejecución.
20. `BookingCreate._passengers_match_seats` valida orden duplicado con `create_booking`.
21. ✅ Validación AR↔PY cubierta por tests — RESUELTO.
22. Claims JWT con nombre "crucero-admin" — actualizar al definir nombre final.
23. `RefundRequest.id` — asimetría default Python vs server_default DB.
24. Race condition en `create_refund_request_endpoint` — aceptable para MVP.
25. `HTTP_422_UNPROCESSABLE_ENTITY` deprecada en Starlette 1.3 (LLE-64).
26. `TEST_DATABASE_URL` en conftest — no setear en CI/CD de producción (LLE-66).
27. Gap de cobertura — rendering de templates de email no testeado (LLE-69).
28. Numeración de asientos provisional: `C01`…`Cnn` / `S01`…`Snn`. `Seat.seat_number` es `String(4)` — máximo 4 caracteres. ⚠️ Si los planos del cliente usan formato tipo `1A`, `2B` (5 chars), requiere migración. Confirmar cuando lleguen los planos (LLE-63).
29. `GET /admin/trips` sin paginación — aceptable con ~2500 trips/año.
30. `mp_chargeback_id` en tabla `chargebacks` es nullable. MP no siempre lo provee en el webhook inicial. Si en el futuro se necesita reconciliar chargebacks con el objeto chargeback de MP, implementar llamada a `GET /v1/chargebacks?payment_id={id}` en el handler.
31. Tests de `test_bookings_router.py` y `test_refund_requests.py` no cubren el orden MP-antes-DB en el flujo de reembolso — el mock de MP no valida secuencia de llamadas.

---

## Decisiones de diseño aprobadas

### #012 — Tabla `stops` y lógica AR↔PY

- Tabla `stops` separada de `Route`.
- `Stop` global; `Route` usa FKs `origin_stop_id` / `destination_stop_id`.
- `RouteRead` expone `origin_stop: StopRead` y `destination_stop: StopRead`.
- `CountryEnum` en `app/models/trip.py`: valores `AR` y `PY`. Tipo Postgres: `country_code`.
- Validación AR↔PY en `app/services/booking.py`: `InternationalRouteRequiredError` → 422.
- `GET /trips` filtra strings contra `Stop.name` via join.
- `GET /stops/{stop_id}/valid-destinations`: 200 lista | 404 | lista vacía.
- Migración atómica `b7c3a1d2`.

### #013 — Índices en Trip

- `idx_trips_status_departure_at`: compuesto `(status, departure_at)`.
- `idx_trips_route_id`: simple sobre FK.
- Declarados en `Trip.__table_args__` y en migración.
- Merge migration `f3a9c7d5`.

### #014 — contact_email en Booking

- Campo `contact_email`. NOT NULL con backfill. Requerido en `BookingCreate`.
- Expuesto en `BookingRead`, `BookingCreateResponse`, `AdminBookingRead`.
- Usado como payer email en MercadoPago.
- Refund-request acepta `contact_email` además de passenger emails.
- `contact_email` como parámetro en `create_booking`.

### #016 — Catálogo admin

- `SeatLayout`: tabla separada, `name` UNIQUE, `total_cama >0`, `total_semi_cama >=0`. Layouts los carga el desarrollador.
- FK `seat_layout_id` en `Trip`: nullable en DB, requerido en `TripCreate`.
- Auto-generación de seats al crear Trip: numeración `C01`…`Cnn` / `S01`…`Snn` (provisional).
- CRUD stops: bloquear DELETE y PATCH de `country` si tiene routes (409 `stop_in_use`).
- CRUD routes: sin PATCH; bloquear DELETE si tiene trips (409 `route_in_use`).
- CRUD trips: bloquear cancelación con bookings confirmadas; bloquear DELETE con bookings.
- Router separado: `app/routers/admin_catalog.py`.
- `AdminTripRead` separado de `TripRead`.

### #036 — CORS

- `CORSMiddleware` en `app/main.py` antes de todos los routers.
- Orígenes configurables via `CORS_ORIGINS` (comma-separated env var).
- Default desarrollo: `http://localhost:3000,http://31.97.25.173`.
- Producción: `https://expresorioparana.com,https://admin.expresorioparana.com` (LLE-71).
- `allow_credentials: True`, methods: GET/POST/PATCH/DELETE/OPTIONS, headers: Authorization/Content-Type.

### app/services/http.py — call_with_retry

- Async, acepta `fn: Callable[[], Awaitable[dict]]`.
- Reintenta solo en `status == 429`. Todas las demás respuestas retornan inmediatamente.
- Backoff: `base_delay * 2^attempt + random.uniform(0, 1)`. Default: `max_retries=3`, `base_delay=1.0`.
- Total de intentos: `max_retries + 1` (loop de reintentos + intento final fuera del loop).
- Al agotar reintentos: `logger.warning(...)` + `raise PaymentProcessingError(status_code=429)`.

### app/services/payment.py — MercadoPago

- `_REQUEST_OPTIONS`: `connection_timeout=30.0`, `max_retries=0` (SDK retry interno desactivado — el retry lo maneja `call_with_retry`).
- `create_refund`: genera `idempotency_key = str(uuid.uuid4())` antes del retry loop; lo pasa via `RequestOptions(custom_headers={"X-Idempotency-Key": idempotency_key})`. Key capturado por closure en el lambda — mismo key en todos los reintentos.
- `verify_webhook_signature`: manifest `"id:{data_id.lower()};[request-id:{x_request_id};]ts:{ts};"`. Ventana 120s/600s.
- `get_payment`: `external_reference` como UUID → 502 si inválido. `round()` para amount.

### app/routers/bookings.py — flujo de reembolso

- Orden correcto: `create_refund` (MP) → `mark_booking_refunded` (DB) → `db.commit()`.
- El `db.commit()` previo que persiste `RefundRequest` se mantiene independiente.

### Tests — arquitectura de la suite

- Unit: funciones puras. Integration: Postgres real via testcontainers (fallback `TEST_DATABASE_URL`).
- TRUNCATE: `seat_layouts, stops, passengers, bookings, seats, price_tranches, trips, routes, admin_users RESTART IDENTITY CASCADE`.
- Mock MP: `preference.create` → 201, `payment.get` → approved, `payment().refunds` → 201.
- Patrón identity map: `await db.expire_all()` post-commit.
- Gap: `_context_for()` y Jinja2 no se ejecutan (Resend mockeado). Ver deuda #27.
- Gap: tests de reembolso no validan secuencia MP-antes-DB. Ver deuda #31.

### app/services/email.py

- FROM: `no-reply@expresorioparana.com`. Destinatarios: iterar `booking.passengers`.
- `_context_for()`: `trip.route.origin_stop.name` / `trip.route.destination_stop.name`.
- `send_confirmation_email`: 3 intentos, lanza `EmailDeliveryError` si falla.
- `send_reminder/feedback_email`: log WARNING, nunca relanzar.

### app/routers/payments.py — webhook

NUNCA devolver 4xx. Casos: ok (200) | invalid_signature (200) | malformed_payload (200) | booking_not_found (200) | error (500).

### app/routers/trips.py

- GET /trips: filtros `origin`, `destination` (strings → `Stop.name`), `departure_date`; scheduled + futuro; orden `departure_at ASC`.
- GET /trips/{id}/seats: filtros `seat_type`, `status`; 404; orden `seat_number ASC`.
- GET /stops: todas las paradas.
- GET /stops/{id}/valid-destinations: país opuesto; 404.

### app/routers/admin.py

- POST /admin/login: bcrypt, 401 `invalid_credentials`. Rate limit: 10/minuto.
- GET /admin/bookings: filtros `booking_status`, `trip_id`. LIMIT 500.
- GET/POST/DELETE /admin/trips/{id}/price-tranches: validación solapamiento + lock advisory.
- GET /admin/refund-requests: filtros `window_valid`, `booking_id`. LIMIT 500.

### app/routers/admin_catalog.py

- GET /admin/seat-layouts: lista todos, orden `name ASC`.
- POST/PATCH/DELETE /admin/stops.
- GET/POST/DELETE /admin/routes.
- GET/GET{id}/POST/PATCH/DELETE /admin/trips.

### app/limiter.py / app/deps.py / tasks/reminders.py

- `limiter = Limiter(key_func=get_remote_address)`.
- JWT: `iss="crucero-admin"`, `aud="crucero-admin-api"`. Requiere `["exp", "sub", "iss", "aud"]`.
- Reminders: dos sesiones. Selectinload incluye `Route.origin_stop` y `Route.destination_stop`.
- `apscheduler>=3.10,<4.0`. `--workers 1`.

### app/services/inventory.py / app/services/booking.py

- `reserve_seats`: `.with_for_update(nowait=True)`.
- `mark_seats_sold`: `.with_for_update()` sin nowait.
- `create_refund_request`: `flush()` para ID. No hace commit.
- `mark_booking_refunded`: guard idempotente. Solo opera sobre DB — sin I/O externo mientras mantiene el lock.
