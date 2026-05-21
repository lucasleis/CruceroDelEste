# CLAUDE.md — Crucero Del Este · Sistema de Venta de Pasajes Online

> Este archivo es el briefing permanente del proyecto. Leelo completo antes de escribir cualquier línea de código o proponer cualquier estructura.

---

## Qué es este proyecto

Sistema de venta de pasajes online para **Crucero Del Este**, empresa argentina de transporte de larga distancia. El objetivo es una plataforma propia que complemente los canales actuales (Plataforma 10, Central de Pasajes), permitiendo venta directa con control total sobre precios, datos y experiencia de usuario.

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
6. Leé `app/errors.py` y `app/exceptions.py`.
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
- **Flujo de compra**: selección de asientos → datos del pasajero → pago → confirmación.
- **Integración MercadoPago**: tarjetas de crédito, débito y billeteras virtuales. Las comisiones (0,8%–6,6%) corren por cuenta del cliente, el sistema NO las calcula ni las aplica.
- **Notificaciones por email**: 3 templates transaccionales — confirmación de compra (inmediata), recordatorio de viaje (antes de la fecha), feedback post-viaje. Usar Resend en plan gratuito.
- **API del panel de administración**: endpoints con autenticación para configurar tramos de precio y listar ventas (solo lectura).

### Explícitamente fuera del alcance de este MVP

- Generación y validación de QR
- Tracking GPS
- Sistema multi-paradas
- Reserva sin pago inmediato
- Cancelaciones y reembolsos
- Módulo antifraude
- Pagos en efectivo (Rapipago, Pago Fácil) — solo tarjetas y billeteras virtuales

---

## Datos iniciales del negocio

| Campo | Valor |
|---|---|
| Ruta inicial | Buenos Aires ↔ Rosario |
| Precio base Cama | $24.500 ARS |
| Precio base Semi Cama | $23.300 ARS |
| Tramos de precio | Hasta 5 por tipo de asiento, definidos por `[min_vendidos, max_vendidos, precio]` |

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
- **No des explicaciones** salvo que se te pidan.

---

## Módulos futuros (roadmap — no implementar ahora)

Estos módulos están documentados en `/specs/Crucero del Este - Modulos Extras.txt` y se cotizarán e implementarán como módulos independientes post-MVP:

- Control de pasajeros con QR (generación, validación, estados: válido / reembolsado / abordado)
- Tracking GPS en tiempo real — Opción A: app en celular del chofer ($500.000), Opción B: dispositivo GPS dedicado con SIM propia ($310.000, recomendada)
- Gestión avanzada de ventas (cancelaciones, reembolsos)
- Sistema multi-paradas
- Seguridad y antifraude
- Pagos en efectivo — si se incorpora en el futuro, el router `app/routers/payments.py` requiere revisión porque hoy ignora `payment.status == "pending"` silenciosamente

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

---

## Estructura de carpetas aprobada

```
CruceroDelEste/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── models/
│   │   │   ├── trip.py          # Route, Trip, Seat, PriceTranche
│   │   │   ├── booking.py       # Booking, Passenger, AdminUser
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
│   │       ├── test_trips_router.py      # pendiente
│   │       ├── test_bookings_router.py   # pendiente
│   │       ├── test_payments_router.py   # pendiente
│   │       └── test_admin_router.py      # pendiente
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
- `app/deps.py` — get_current_admin con PyJWT (HS256), re-exporta get_db
- `app/errors.py` — SeatUnavailableError (409), ValidationError (422), NotFoundError (404), handlers 404 y 500
- `app/exceptions.py` — InvalidWebhookSignature, PaymentProcessingError, PaymentConfigError
- `app/services/pricing.py` — get_current_price, NoPriceTranche
- `app/services/inventory.py` — get_available_seats, reserve_seats, release_expired_reservations, mark_seats_sold
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
- `app/routers/admin.py` — POST /admin/login, GET /admin/bookings, GET/POST/DELETE /admin/trips/{id}/price-tranches
- `app/main.py` — FastAPI con lifespan, exception handlers, routers
- `tasks/__init__.py` — vacío
- `tasks/reminders.py` — AsyncIOScheduler, SQLAlchemyJobStore, tres jobs
- `pyproject.toml` — dependencias, hatchling, pytest config con env vars fake
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

### Próximo a implementar (en este orden)

- `tests/integration/test_trips_router.py`
- `tests/integration/test_bookings_router.py`
- `tests/integration/test_payments_router.py`
- `tests/integration/test_admin_router.py`

---

## Módulos críticos — requieren atención especial

Antes de comenzar a implementar cualquiera de los siguientes módulos, DETENTE y avisá con este mensaje exacto antes de escribir cualquier código:

⚠️ Estás por implementar [nombre del módulo], marcado como crítico. Considerá cambiar al modelo Opus antes de continuar. ¿Continuamos?

Módulos críticos:
- `app/services/payment.py` — integración MercadoPago
- `app/routers/payments.py` — webhook MercadoPago
- Cualquier cambio al schema de base de datos

---

## Deuda técnica conocida

1. **`Booking` sin `buyer_email`**: resolver con `contact_email` al implementar gestión avanzada de reservas — requiere migración.
2. **`send_reminder_email` / `send_feedback_email` retornan `None`**: evaluar cambiar firma a `-> bool` o usar contadores.
3. **`selectinload` obligatorio para `email.py`**: cargar `booking.passengers`, `booking.trip`, `booking.trip.route`, `passenger.seat` antes de llamar a cualquier `send_*`.
4. **Idempotencia de emails de confirmación**: guard en paso 10 del webhook (`booking.status == "confirmed"`). Confirmado por test de integración en `test_payments_router.py`.
5. **`create_booking()` no retorna desglose de precios por tipo**: workaround en router via `get_current_price()`. Fix: retornar `(booking, prices_by_type)` desde el service.
6. **`SeatNotAvailable` vs `SeatUnavailableError`**: dos excepciones casi homónimas. Unificar en pasada futura.
7. **`db.refresh` con MissingGreenlet**: si aparece, reemplazar por re-select con `selectinload`.
8. **`GET /admin/bookings` sin paginación**: LIMIT 500 hardcodeado. Agregar cuando el volumen lo requiera.
9. **Known gap en tests**: desglose por tipo de asiento en `create_booking` no validado. Comentario en `test_booking_service.py`: `# KNOWN GAP: seat type breakdown not validated — see CLAUDE.md`

---

## Decisiones de diseño aprobadas

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
- Tests de webhook que necesiten `external_reference` específico sobreescriben `mock_mp_sdk.payment.return_value.get.return_value` antes del POST.

**Casos obligatorios en test_payments_router.py:**
- Webhook con firma inválida → 200 `{"status": "ignored", "reason": "invalid_signature"}`
- Webhook con `payment_id` desconocido → 200 `{"status": "ignored", "reason": "booking_not_found"}`
- Idempotencia: dos POSTs consecutivos con el mismo `payment_id` → exactamente una booking confirmada.

### app/services/payment.py — verify_webhook_signature

```
manifest = "id:{data_id.lower()};request-id:{x_request_id};ts:{ts};"
```

- `data_id` lowercase antes de insertar en manifest
- Si `x_request_id` es None: omitir del manifest
- `data_id` de `request.query_params["data.id"]` — NUNCA del body
- `hmac.compare_digest` (timing-safe) — no modificar

### app/services/payment.py — get_payment

- `external_reference` validado como UUID. Si inválido: `PaymentProcessingError` con `status_code=502`.
- `transaction_amount` convertido con `round()` — no `int()`.

### app/services/email.py

| Decisión | Valor |
|---|---|
| FROM | `no-reply@crucerodeleste.com` |
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

Orden obligatorio: extraer data_id → x_request_id → verify_signature → parsear body → get_payment → check approved → SELECT FOR UPDATE booking → check confirmed → confirm_booking → send_confirmation_email → return ok.

### app/routers/trips.py

- GET /trips: filtros opcionales `origin`, `destination`, `departure_date`; implícitos `status==scheduled`, `departure_at>=now()`; orden `departure_at ASC`; counts y precios en queries únicas sin N+1.
- GET /trips/{id}/seats: filtros opcionales `seat_type`, `status`; 404 si trip inexistente; lista vacía si sin asientos; response `list[SeatRead]` plano.

### app/routers/bookings.py

- POST /bookings: 404 trip inexistente, 409 trip no disponible, 409 seat no disponible, 500 sin tramo, 502 error MP. Rollback implícito garantizado.
- GET /bookings/{id}: público, selectinload passengers, 404 si inexistente.

### app/routers/admin.py

- POST /admin/login: bcrypt, mismo 401 para email y password incorrectos.
- GET /admin/bookings: filtros `booking_status` y `trip_id`, LIMIT 500, orden `created_at DESC`, selectinload passengers.
- GET /admin/trips/{id}/price-tranches: 404 si trip inexistente, orden `seat_type ASC, min_sold ASC`.
- POST /admin/trips/{id}/price-tranches: 404 trip, validación solapamiento explícita → 409 `tranche_overlap`, 201 en éxito.
- DELETE /admin/trips/{id}/price-tranches/{tranche_id}: 404 trip o tranche, 204 en éxito.

### tasks/reminders.py

- `AsyncIOScheduler` + `SQLAlchemyJobStore` con `sync_database_url`.
- `register_jobs()` llamada después de `scheduler.start()` en lifespan.
- expire_bookings: IntervalTrigger(minutes=1), misfire_grace_time=60s.
- send_reminders / send_feedback: IntervalTrigger(hours=1), misfire_grace_time=3600s.
- Ventana reminder: `departure_at` entre now y now+24h.
- Ventana feedback: `arrival_at <= now - 2h`.
- Patrón dos sesiones: primera para query+selectinload, segunda por booking para commit.
- Commit por booking individual con try/except — loop nunca se corta.

### pyproject.toml + Dockerfile

- `pytest-env`: variables fake en `[tool.pytest.ini_options] env = [...]` — no en conftest.
- `apscheduler>=3.10,<4.0` — upper bound explícito.
- `--workers 1` obligatorio en Dockerfile — APScheduler no soporta múltiples workers.
