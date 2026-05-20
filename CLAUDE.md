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
8. Luego continuá con el primer ítem de "Próximo a implementar" sin preguntar.

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
│   │   ├── unit/
│   │   └── integration/
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
- `app/config.py` — pydantic-settings con `@model_validator`: valida `backend_url` (URL absoluta, HTTPS obligatorio en producción), `mercadopago_webhook_secret` requerido, `sync_database_url` para APScheduler job store. Falla en arranque si falta variable de entorno.
- `app/database.py` — async engine con pool_pre_ping, echo condicional al entorno, sessionmaker, Base, get_db. Sesión NO auto-commitea — el router debe hacer `await db.commit()` explícito.
- `app/deps.py` — get_current_admin con PyJWT (HS256), re-exporta get_db
- `app/errors.py` — SeatUnavailableError (409), ValidationError (422), NotFoundError (404 fijo, sin parámetros), handlers genéricos 404 y 500
- `app/exceptions.py` — InvalidWebhookSignature, PaymentProcessingError (lleva status_code), PaymentConfigError
- `app/services/pricing.py` — get_current_price, lanza NoPriceTranche si ningún tramo cubre el sold count
- `app/services/inventory.py` — get_available_seats, reserve_seats (SELECT FOR UPDATE), release_expired_reservations (SKIP LOCKED), mark_seats_sold
- `app/services/booking.py` — create_booking (validate → price sin lock → reserve con lock), confirm_booking(db, booking_id, mp_payment_id), expire_booking
- `app/services/payment.py` — SDK oficial mercadopago (sincrónico), calls wrapped con asyncio.to_thread, timeouts (connection_timeout=30s), verify_webhook_signature, get_payment (valida external_reference como UUID, usa round() para transaction_amount), create_preference. Replay protection activa.
- `app/routers/payments.py` — POST /webhooks/mercadopago con contrato HTTP aprobado (ver sección dedicada abajo)
- `app/services/email.py` — wrapper Resend: 3 templates transaccionales con Jinja2. Ver decisiones de diseño aprobadas abajo.
- `templates/email/confirmation.html` + `confirmation.txt`
- `templates/email/reminder.html` + `reminder.txt`
- `templates/email/feedback.html` + `feedback.txt`
- `app/schemas/trips.py` — RouteRead, SeatRead, TripRead (con available_seats_count y precios como campos manuales, no del ORM)
- `app/schemas/bookings.py` — PassengerCreate, PassengerRead, BookingCreate (con validador de consistencia seat_ids ↔ passengers), BookingRead, BookingCreateResponse
- `app/schemas/admin.py` — AdminLoginRequest, AdminLoginResponse, PriceTrancheCreate (con validador max_sold > min_sold), PriceTrancheRead, AdminBookingRead
- `app/routers/trips.py` — GET /trips (filtros opcionales + filtros implícitos de status/fecha, available_counts en 1 query, precios con LEFT JOIN en 1 query), GET /trips/{id}/seats (filtros opcionales, 404 con NotFoundError, docstring de contrato)
- `app/routers/bookings.py` — POST /bookings (validación trip, reserva, preference MP, 201), GET /bookings/{id} público con selectinload
- `app/routers/admin.py` — POST /admin/login (bcrypt + JWT), GET /admin/bookings (filtros + LIMIT 500), GET/POST/DELETE /admin/trips/{id}/price-tranches (con validación de solapamiento)
- `app/main.py` — FastAPI() con lifespan (scheduler.start → register_jobs → yield → scheduler.shutdown) + register_exception_handlers + include_router para payments, bookings, trips y admin
- `tasks/__init__.py` — módulo vacío
- `tasks/reminders.py` — AsyncIOScheduler con SQLAlchemyJobStore, tres jobs: expire_bookings (1 min), send_reminders (1 h), send_feedback (1 h). Ver decisiones de diseño abajo.

### Próximo a implementar (en este orden)

- `tests/unit/` y `tests/integration/`
- `pyproject.toml` + `Dockerfile`

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

Estas limitaciones son conocidas y aceptadas. No implementar soluciones sin aprobación explícita.

1. **`Booking` sin `buyer_email`**: no existe un campo para el email de quien compra. Si el comprador no es pasajero (ej: padre que compra para sus hijos), no recibe ningún email de confirmación. Resolver cuando se implemente gestión avanzada de reservas agregando `contact_email` o `buyer_email` al modelo `Booking` — requiere migración.

2. **`send_reminder_email` / `send_feedback_email` retornan `None`**: el caller no puede distinguir éxito total de éxito parcial por valor de retorno. Los fallos parciales solo quedan en el log (WARNING). Resolver en `tasks/reminders.py` — evaluar cambiar firma a `-> bool` o usar contadores.

3. **`jinja2`, `resend`, `passlib[bcrypt]` y `apscheduler` no están en `pyproject.toml`**: agregar cuando se implemente `pyproject.toml + Dockerfile`.

4. **`selectinload` obligatorio para `email.py`**: cualquier caller de `send_confirmation_email`, `send_reminder_email` o `send_feedback_email` DEBE cargar `booking.passengers`, `booking.trip`, `booking.trip.route` y `passenger.seat` con `selectinload` antes de llamar. Async SQLAlchemy lanza `MissingGreenlet` en lazy-load fuera del contexto de sesión. Verificar en `routers/payments.py` cuando se implementen los tests de integración.

5. **Idempotencia de emails de confirmación**: el guard del paso 10 en el webhook (`booking.status == "confirmed"`) previene doble envío ante webhooks duplicados. Confirmar con test de integración cuando se implemente el módulo de tests.

6. **`create_booking()` no retorna desglose de precios por tipo**: el router llama a `get_current_price()` por tipo de asiento como workaround para construir los items de MercadoPago. Fix limpio: retornar `(booking, prices_by_type)` desde el service. Requiere tocar `services/booking.py`.

7. **`SeatNotAvailable` vs `SeatUnavailableError`**: dos excepciones casi homónimas — `app/services/inventory.SeatNotAvailable` (lanzada por services) y `app/errors.SeatUnavailableError` (con handler 409). El router traduce de una a otra. Unificar en pasada futura.

8. **`db.refresh(booking, attribute_names=["passengers"])`**: si aparece `MissingGreenlet` en tests, reemplazar por re-select explícito con `selectinload(Booking.passengers)`.

9. **`GET /admin/bookings` sin paginación**: LIMIT defensivo de 500 hardcodeado. Agregar paginación `limit`/`offset` cuando el volumen lo requiera.

---

## Decisiones de diseño aprobadas

### app/services/payment.py — verify_webhook_signature

Algoritmo oficial MercadoPago (verificado contra doc oficial):

```
manifest = "id:{data_id.lower()};request-id:{x_request_id};ts:{ts};"
```

Reglas obligatorias:
- `data_id` MUST ser lowercase antes de insertar en el manifest
- Si `x_request_id` es None o ausente, se omite del manifest (no se incluye `request-id:None;`)
- `data_id` se extrae de `request.query_params["data.id"]` — NUNCA del JSON body
- `x_request_id: str | None` — tipado correcto, puede no venir en el request
- Se usa `hmac.compare_digest` (timing-safe) — no modificar

### app/services/payment.py — get_payment

- `external_reference` se valida como UUID antes de retornar. Si está vacío o inválido: lanza `PaymentProcessingError` con `status_code=502`.
- `transaction_amount` se convierte con `round()` (no `int()`). MP devuelve float; el sistema trabaja en pesos enteros sin centavos.

### app/services/email.py — decisiones de diseño

| Decisión | Valor |
|---|---|
| FROM | `no-reply@crucerodeleste.com` |
| Destinatarios | Un email por pasajero en los 3 templates — iterar `booking.passengers` |
| Templates | HTML + texto plano, archivos en `/templates/email/`, Jinja2 con `StrictUndefined` |
| `EmailDeliveryError` | Definida en `email.py` (no en `exceptions.py`) |

**`send_confirmation_email`**:
- 3 intentos por pasajero (1 original + 2 reintentos inmediatos, sin sleep entre ellos)
- Itera TODOS los pasajeros aunque alguno falle — no corta el loop
- Acumula emails fallidos en lista `failed`
- Si `failed` no está vacío al final: lanza `EmailDeliveryError(failed)`
- Caller es el webhook handler — excepción propagada causa 500 → MP reintenta (comportamiento esperado)

**`send_reminder_email` / `send_feedback_email`**:
- Fallo por pasajero: log WARNING, continúa con el siguiente
- `reminder_sent` / `feedback_sent` solo se marcan `True` si Resend confirma envío exitoso
- Nunca relanzar excepción

**Contrato obligatorio del caller** (todos los `send_*`):
Cargar con `selectinload` antes de llamar: `booking.passengers`, `booking.trip`, `booking.trip.route`, `passenger.seat`. De lo contrario: `MissingGreenlet` en async SQLAlchemy.

**Prerequisito de deploy** (responsabilidad del cliente):
El dominio `crucerodeleste.com` debe estar verificado en Resend con los registros DNS correspondientes antes de que los emails puedan enviarse en producción.

### app/routers/payments.py — Contrato HTTP del webhook

Contrato aprobado (no modificar sin aprobación explícita):

| Caso | HTTP | Body |
|---|---|---|
| Firma válida + pago procesado | 200 | `{"status": "ok"}` |
| Firma inválida | 200 | `{"status": "ignored", "reason": "invalid_signature"}` |
| Payload malformado | 200 | `{"status": "ignored", "reason": "malformed_payload"}` |
| Booking no encontrado | 200 | `{"status": "ignored", "reason": "booking_not_found"}` |
| Error interno | 500 | `{"status": "error"}` |

**NUNCA devolver 4xx** — MercadoPago reintenta ante cualquier non-2xx, generando loops infinitos.

Orden de operaciones obligatorio (no reordenar):

```
1. Extraer data_id de request.query_params["data.id"]
2. Extraer x_request_id del header x-request-id (puede ser None)
3. Extraer ts y v1 del header x-signature parseando "ts=...,v1=..."
4. verify_webhook_signature(...) → si falla: return 200 ignored
5. Parsear JSON body → extraer payment_id de data.id
6. get_payment(payment_id) → verificar estado real con MercadoPago
7. Si payment.status != "approved" → return 200 ok sin tocar BD
8. SELECT FOR UPDATE booking WHERE id = payment.external_reference
9. Si booking no existe → return 200 ignored booking_not_found
10. Si booking.status == "confirmed" → return 200 ok (idempotencia)
11. confirm_booking(db, booking_id, mp_payment_id)
12. send_confirmation_email(booking)  ← cargar relaciones con selectinload antes de llamar
13. return 200 ok
```

El paso 12 requiere que el booking se cargue con `selectinload(Booking.passengers, Booking.trip, ...)` en el mismo query del paso 8. Verificar esto al implementar el router completo.

**Nota sobre idempotencia:** El `SELECT FOR UPDATE` en el paso 8 garantiza que dos webhooks concurrentes para el mismo booking no pasen el check del paso 10 al mismo tiempo. `confirm_booking` también hace su propio `SELECT FOR UPDATE` internamente — están en la misma transacción, no hay conflicto.

### Pagos en efectivo

Fuera de scope para el MVP. El router ignora `payment.status == "pending"` silenciosamente (return 200 ok). Si en el futuro se incorporan pagos en efectivo (Rapipago, Pago Fácil), el router requiere revisión completa del manejo de estado `pending`.

### app/routers/trips.py — decisiones de diseño

**GET /trips:**
- Filtros opcionales: `origin`, `destination`, `departure_date`
- Filtros implícitos (no configurables desde el cliente): `status == scheduled`, `departure_at >= now()` UTC
- Orden fijo: `departure_at ASC`. Sin paginación.
- `available_seats_count`: una query agregada con GROUP BY, mapeada en memoria. Sin N+1.
- `current_price_cama` / `current_price_semi_cama`: una sola query con LEFT OUTER JOIN sobre `price_tranches`. Sin loop de queries. Si no hay tramo aplicable: `None` + log WARNING con trip_id y seat_type.

**GET /trips/{id}/seats:**
- Filtros opcionales: `seat_type`, `status`. Sin filtro por defecto — devuelve todos los asientos.
- Trip inexistente → `raise NotFoundError()`
- Trip sin asientos → lista vacía `[]`
- Response: `list[SeatRead]` plano, sin wrapper
- Docstring de contrato: "Este response refleja el estado al momento de la consulta y no garantiza disponibilidad al momento de compra. No usar como fuente de verdad para confirmar una reserva."

### app/routers/bookings.py — decisiones de diseño

**POST /bookings:**
- Trip inexistente → `NotFoundError` (404)
- Trip con status != scheduled o departure_at en el pasado → 409 `trip_not_available`
- `SeatNotAvailable` → re-raise como `SeatUnavailableError` (409)
- `NoPriceTranche` → propagar como 500 + log ERROR
- `PaymentProcessingError` en create_preference → 502 + log ERROR. Sin commit → rollback implícito por context manager de get_db → seats vuelven a available.
- Items MP: un item por tipo de asiento (`title="Pasaje Cama"` / `"Pasaje Semi Cama"`, quantity=N, unit_price via `get_current_price()`).
- `payer_email` = `passengers[0].email` (deuda técnica #1 — no existe buyer_email).
- Flujo: flush → `db.get(Seat, id)` por identity map para counts_by_type → create_preference → mp_preference_id → commit → refresh → 201.
- Rollback implícito garantizado: `get_db` usa `async with AsyncSessionLocal() as session` — context manager hace rollback si no hubo commit.

**GET /bookings/{id}:**
- Endpoint público (sin JWT) — UUID v4 como seguridad implícita.
- Cargar con `selectinload(Booking.passengers)`.
- Booking inexistente → `NotFoundError` (404).
- Response: `BookingRead` (sin MP IDs ni flags admin).

### app/routers/admin.py — decisiones de diseño

**POST /admin/login:**
- Hash de contraseña: `passlib[bcrypt]` con `CryptContext(schemes=["bcrypt"], deprecated="auto")`.
- Mismo error 401 `invalid_credentials` para email inexistente y password incorrecta — nunca revelar cuál falló.
- JWT: `sub` = str(admin.id), `exp` = now + timedelta(minutes=settings.jwt_expiry_minutes). Firmado con `settings.secret_key` y HS256 — mismo atributo que usa `deps.get_current_admin`.

**GET /admin/bookings:**
- Filtros opcionales: `booking_status` (BookingStatusEnum), `trip_id` (UUID). Parámetro nombrado `booking_status` para evitar shadow de `fastapi.status`.
- LIMIT 500 hardcodeado, no expuesto como parámetro. Comentario en código: `# MVP: sin paginación, límite defensivo de 500`.
- Orden: `created_at DESC`.
- `selectinload(Booking.passengers)` obligatorio.

**GET /admin/trips/{trip_id}/price-tranches:**
- Trip inexistente → `NotFoundError` (404).
- Orden: `seat_type ASC`, `min_sold ASC`.

**POST /admin/trips/{trip_id}/price-tranches:**
- Trip inexistente → `NotFoundError` (404).
- Validación de solapamiento explícita antes de insertar: cargar tramos existentes del mismo `(trip_id, seat_type)` y verificar `new.min_sold < existing.max_sold AND new.max_sold > existing.min_sold`. Si solapa → 409 `tranche_overlap`. No depender de UniqueConstraint de DB (no cubre solapamientos complejos).
- Status 201 en éxito.

**DELETE /admin/trips/{trip_id}/price-tranches/{tranche_id}:**
- Trip inexistente → `NotFoundError` (404).
- Tranche inexistente o `tranche.trip_id != trip_id` → `NotFoundError` (404).
- Status 204 No Content.

### tasks/reminders.py — decisiones de diseño

**Scheduler:**
- `AsyncIOScheduler` de APScheduler 3.x — correcto para apps asyncio.
- `SQLAlchemyJobStore` con `settings.sync_database_url` (URL sincrónica `postgresql://...`). Jobs persistidos en PostgreSQL, sobreviven reinicios.
- `register_jobs()` es pública y se llama desde el lifespan de FastAPI, **después de `scheduler.start()`**. No se llama en tiempo de importación.

**Registro en lifespan (`app/main.py`):**
```python
scheduler.start()
register_jobs()   # después de start(), no antes
yield
scheduler.shutdown()
```

**Jobs:**

| Job | Trigger | `misfire_grace_time` | `replace_existing` |
|---|---|---|---|
| `expire_bookings_job` | `IntervalTrigger(minutes=1)` | 60 s | True |
| `send_reminders_job` | `IntervalTrigger(hours=1)` | 3600 s | True |
| `send_feedback_job` | `IntervalTrigger(hours=1)` | 3600 s | True |

**Ventanas de tiempo aprobadas:**
- Reminder: viajes con `departure_at` entre `now()` y `now() + 24 h`.
- Feedback: viajes con `arrival_at <= now() - 2 h`.

**Patrón de dos sesiones (reminder y feedback):**
Los jobs de reminder y feedback abren una primera sesión para la query con `selectinload` (carga eager de todas las relaciones requeridas por `email.py`). Luego, por cada booking, abren una segunda sesión para actualizar el flag y hacer commit. El objeto `booking` de la primera sesión ya está cerrado, pero las relaciones están cargadas en memoria — no hay `MissingGreenlet`. Rollback de la segunda sesión no afecta la primera (ya cerrada limpiamente).

**Commit por booking individual:**
Todos los jobs hacen commit por booking individual dentro de un `try/except`. Si un booking falla: log ERROR, rollback de esa sesión, continuar con el siguiente. El loop nunca se corta por un fallo individual.

**Manejo de errores:**
- `expire_bookings_job`: `expire_booking()` lanza → log ERROR + rollback + continuar.
- `send_reminders_job` / `send_feedback_job`: `send_*_email()` ya swallows errores por pasajero (log WARNING). El job captura errores a nivel booking (ej: error de DB al buscar) con log ERROR + rollback + continuar. El flag `reminder_sent` / `feedback_sent` solo se marca `True` si `send_*_email()` no lanzó excepción.
