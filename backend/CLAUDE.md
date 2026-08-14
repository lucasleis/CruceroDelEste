# CLAUDE.md — backend · Expreso Río Paraná

> Este archivo es el briefing del backend. Leer este archivo y el CLAUDE.md raíz antes de escribir cualquier línea de código.

Las especificaciones completas están en `/specs/Crucero Del Este - Presupuesto.docx` y `/specs/Crucero del Este - Modulos Extras.txt`. Leelos antes de trabajar en cualquier módulo.

---

## Tu rol en este proyecto

Sos un senior backend engineer. Priorizás correctitud sobre cleverness. No agregás features, abstracciones ni refactors que no fueron pedidos explícitamente. Cada decisión de arquitectura que tome el sistema debe ser aprobada antes de implementarse.

---

## Primera tarea al iniciar una sesión nueva

El stack y la estructura ya están aprobados. Al iniciar una sesión nueva:

1. Leé este archivo completo.
2. Leé el CLAUDE.md raíz.
3. Leé los specs en `/specs/`.
4. Leé las skills en `/specs/skills/`.
5. Leé todos los archivos en `app/models/` para entender el schema de base de datos.
6. Leé todos los archivos en `app/schemas/` para entender los contratos de API.
7. Leé `app/errors.py`.
8. Leé todos los archivos en `app/services/` para entender la lógica de negocio ya implementada.
9. Pedí al Document de Linear (`017e9e10-f516-4f1d-8fee-8a08e7cbd03c`) o al ticket asignado cuál es el próximo módulo a implementar, y ejecutá este protocolo obligatorio antes de escribir cualquier línea de código:
   a. Anunciá qué módulo vas a implementar.
   b. Listá TODAS las decisiones de diseño que necesitás tomar: formato de datos, manejo de errores, casos borde, dependencias con otros módulos, archivos que vas a tocar.
   c. Para cada decisión, indicá las opciones disponibles y cuál recomendás y por qué.
   d. Escribí al final: "Esperando aprobación explícita antes de escribir cualquier línea de código."
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
- **Commits y branches**: nunca hagas merge a `main` — eso lo hace el revisor a mano. No commitees en `main` directamente bajo ninguna circunstancia.
- **Antes de implementar cualquier módulo nuevo**: listá todas las decisiones de diseño que necesitás tomar para implementarlo. Esperá aprobación explícita antes de escribir cualquier línea de código.
- **Durante la implementación**: si encontrás algo no especificado o ambiguo — por mínimo que parezca — detenete y consultá. No asumas.
- **Al finalizar cada módulo**: si durante la implementación encontraste algo que podría mejorarse en módulos ya completados, reportarlo como nota separada al final del output bajo el título "⚠️ Observaciones". Sin implementar nada.
- **Después de cada commit aprobado por el revisor**: actualizá CLAUDE.md.
- **No des explicaciones** salvo que se te pidan.

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
| Scheduler | APScheduler + SQLAlchemyJobStore |
| Rate limiting | slowapi>=0.1.9 |

---

## Estructura de carpetas aprobada

```
backend/
├── app/
│   ├── main.py
│   ├── config.py
│   ├── database.py
│   ├── limiter.py
│   ├── models/
│   │   ├── trip.py          # Route, Trip, Seat, PriceTranche, Stop, CountryEnum, SeatLayout
│   │   ├── booking.py       # Booking, Passenger, AdminUser, RefundRequest, Chargeback
│   │   └── __init__.py
│   ├── schemas/
│   │   ├── trips.py
│   │   ├── bookings.py
│   │   └── admin.py
│   ├── routers/
│   │   ├── trips.py
│   │   ├── bookings.py
│   │   ├── payments.py      # Webhook MercadoPago
│   │   ├── admin.py         # Login, price-tranches, bookings, refund-requests, chargebacks
│   │   └── admin_catalog.py # ABM de stops, routes, trips, seat-layouts
│   ├── services/
│   │   ├── pricing.py
│   │   ├── inventory.py
│   │   ├── booking.py
│   │   ├── booking_code.py
│   │   ├── chargeback.py
│   │   ├── payment.py
│   │   ├── http.py
│   │   └── email.py
│   ├── deps.py
│   └── errors.py
├── tasks/
│   └── reminders.py
├── migrations/
├── tests/
│   ├── conftest.py
│   ├── unit/
│   └── integration/
├── alembic.ini
├── pyproject.toml
├── .env.example
└── Dockerfile
```

Arquitectura en tres capas: **routers → services → models**. Los services contienen toda la lógica de negocio. Los routers solo parsean HTTP. Sin repositorios abstractos.

**Importante**: todo el código backend vive dentro de `/backend/`. Los paths son relativos a `/backend/` salvo indicación contraria.

---

## Módulos críticos — requieren atención especial

Antes de comenzar a implementar cualquiera de los siguientes módulos:

⚠️ Estás por implementar [nombre del módulo], marcado como crítico. Considerá cambiar al modelo Opus antes de continuar. ¿Continuamos?

Módulos críticos:
- `app/services/payment.py` — integración MercadoPago
- `app/routers/payments.py` — webhook MercadoPago
- Cualquier cambio al schema de base de datos
- Lógica de validación AR↔PY

---

## Decisiones de diseño aprobadas

### #012 — Tabla `stops` y lógica AR↔PY
- Tabla `stops` separada de `Route`. `Stop` global; `Route` usa FKs.
- `CountryEnum` en `app/models/trip.py`: valores `AR` y `PY`.
- Validación AR↔PY en `app/services/booking.py`: `InternationalRouteRequiredError` → 422.

### #013 — Índices en Trip
- `idx_trips_status_departure_at`: compuesto `(status, departure_at)`.
- `idx_trips_route_id`: simple sobre FK.

### #014 — contact_email en Booking
- Campo `contact_email`. NOT NULL. Requerido en `BookingCreate`.
- Usado como payer email en MercadoPago.

### #016 — Catálogo admin
- `SeatLayout`: tabla separada, `name` UNIQUE. Layouts los carga el desarrollador.
- FK `seat_layout_id` en `Trip`: nullable en DB, requerido en `TripCreate`.
- Auto-generación de seats al crear Trip: numeración real `"1"`…`"60"` (sin prefijo).
- CRUD stops, routes, trips con validaciones de integridad referencial.

### #036 — CORS
- `CORSMiddleware` en `app/main.py` antes de todos los routers.
- Orígenes configurables via `CORS_ORIGINS` (env var en formato **JSON array**, ej: `["https://ejemplo.com"]` — es lo que requiere pydantic-settings; ver `.env.example`).
- Producción: `["https://expresorioparana.com","https://admin.expresorioparana.com"]` (LLE-71).

### app/services/http.py — call_with_retry
- Async, reintenta solo en 429. Backoff exponencial con jitter. Max 3 reintentos.
- Al agotar: `logger.warning` + `raise PaymentProcessingError(status_code=429)`.

### app/services/payment.py — MercadoPago
- SDK retry interno desactivado (`max_retries=0`).
- `create_refund`: `X-Idempotency-Key` generado antes del retry loop, capturado por closure.

### app/routers/bookings.py — flujo de reembolso
- Orden correcto: `create_refund` (MP) → `mark_booking_refunded` (DB) → `db.commit()`.

### app/routers/payments.py — webhook
- NUNCA devolver 4xx. Casos: ok (200) | invalid_signature (200) | malformed_payload (200) | booking_not_found (200) | error (500).

---

## Dónde está el estado del backend

Este archivo no lleva qué está hecho, qué falta, bugs resueltos, deuda técnica ni roadmap — todo eso vive en el **Document de Linear `017e9e10-f516-4f1d-8fee-8a08e7cbd03c`** ("CLAUDE.md — Expreso Río Paraná · Monorepo"). Es la fuente — no lo dupliques acá.

Si este archivo y Linear se contradicen, gana Linear. Si Linear y el código se contradicen, gana el código.