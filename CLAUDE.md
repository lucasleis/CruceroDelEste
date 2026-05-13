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
- **No des explicaciones** salvo que se te pidan.

---

## Módulos futuros (roadmap — no implementar ahora)

Estos módulos están documentados en `/specs/Crucero del Este - Modulos Extras.txt` y se cotizarán e implementarán como módulos independientes post-MVP:

- Control de pasajeros con QR (generación, validación, estados: válido / reembolsado / abordado)
- Tracking GPS en tiempo real — Opción A: app en celular del chofer ($500.000), Opción B: dispositivo GPS dedicado con SIM propia ($310.000, recomendada)
- Gestión avanzada de ventas (cancelaciones, reembolsos)
- Sistema multi-paradas
- Seguridad y antifraude

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
├── app/
│   ├── main.py
│   ├── config.py
│   ├── database.py
│   ├── models/
│   │   ├── trip.py          # Route, Trip, Seat, PriceTranche
│   │   ├── booking.py       # Booking, Passenger, AdminUser
│   │   └── __init__.py
│   ├── schemas/
│   │   ├── trips.py
│   │   ├── bookings.py
│   │   └── admin.py
│   ├── routers/
│   │   ├── trips.py
│   │   ├── bookings.py
│   │   ├── payments.py      # Webhook MercadoPago
│   │   └── admin.py
│   ├── services/
│   │   ├── pricing.py
│   │   ├── inventory.py
│   │   ├── booking.py
│   │   ├── payment.py
│   │   └── email.py
│   ├── deps.py
│   └── errors.py
├── tasks/
│   └── reminders.py         # APScheduler con SQLAlchemyJobStore
├── migrations/
├── tests/
│   ├── unit/
│   └── integration/
├── alembic.ini
├── pyproject.toml
├── .env.example
└── Dockerfile
```

Arquitectura en tres capas: **routers → services → models**. Los services contienen toda la lógica de negocio y son testeables sin base de datos. Los routers solo parsean HTTP y devuelven respuestas. Sin repositorios abstractos, sin CQRS, sin sagas.

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
- `app/config.py` — pydantic-settings, falla en arranque si falta variable de entorno
- `app/database.py` — async engine con pool_pre_ping, echo condicional al entorno, sessionmaker, Base, get_db
- `app/deps.py` — get_current_admin con PyJWT (HS256), re-exporta get_db
- `app/errors.py` — SeatUnavailableError (409), ValidationError (422), 404, 500
- `app/services/pricing.py` — get_current_price, lanza NoPriceTranche si ningún tramo cubre el sold count
- `app/services/inventory.py` — get_available_seats, reserve_seats (SELECT FOR UPDATE), release_expired_reservations (SKIP LOCKED), mark_seats_sold
- `app/services/booking.py` — create_booking (validate → price sin lock → reserve con lock), confirm_booking, expire_booking

### Próximo a implementar (en este orden)

- `app/services/payment.py` — wrapper MercadoPago: crear preferencia, validar webhook
- `app/services/email.py` — wrapper Resend: 3 templates transaccionales
- `app/schemas/trips.py`, `bookings.py`, `admin.py`
- `app/routers/trips.py` — GET /trips, GET /trips/{id}/seats
- `app/routers/bookings.py` — POST /bookings, GET /bookings/{id}
- `app/routers/payments.py` — POST /payments/webhook
- `app/routers/admin.py` — endpoints admin con auth JWT
- `app/main.py` — FastAPI app, registro de routers, startup
- `tasks/reminders.py` — APScheduler con SQLAlchemyJobStore
- `tests/unit/` y `tests/integration/`
- `pyproject.toml` + `Dockerfile`

---

## Primera tarea al iniciar una sesión nueva

El stack y la estructura ya están aprobados. Leé este archivo, los specs en `/specs/` y las skills en `/specs/skills/`. Luego continuá con el primer ítem de "Próximo a implementar" sin preguntar.

---

## Módulos críticos — requieren atención especial

Antes de comenzar a implementar cualquiera de los siguientes módulos, DETENTE y avisá con este mensaje exacto antes de escribir cualquier código:

⚠️ Estás por implementar [nombre del módulo], marcado como crítico. Considerá cambiar al modelo Opus antes de continuar. ¿Continuamos?

Módulos críticos:
- `app/services/payment.py` — integración MercadoPago
- `app/routers/payments.py` — webhook MercadoPago
- Cualquier cambio al schema de base de datos
