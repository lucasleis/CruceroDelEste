# Crucero Del Este — Backend

Sistema de venta de pasajes online para Crucero Del Este, empresa argentina de transporte de larga distancia. Plataforma propia que complementa los canales actuales (Plataforma 10, Central de Pasajes) con venta directa, pricing dinámico y control total sobre datos y experiencia de usuario.

---

## Stack

| Componente | Tecnología |
|---|---|
| Runtime | Python 3.12 |
| Framework | FastAPI |
| Base de datos | PostgreSQL |
| ORM + migraciones | SQLAlchemy 2 (async) + Alembic |
| Pagos | MercadoPago (SDK oficial) |
| Email | Resend |
| Config | pydantic-settings |
| Testing | pytest + pytest-asyncio |
| Scheduler | APScheduler + SQLAlchemyJobStore |

---

## Arquitectura

Monolito en tres capas: **routers → services → models**.

```
app/
├── routers/      # HTTP only — parseo de requests y respuestas
├── services/     # Lógica de negocio — testeable sin DB ni HTTP
├── models/       # SQLAlchemy ORM — fuente de verdad del schema
├── schemas/      # Pydantic DTOs — request / response
├── deps.py       # Dependencias compartidas (auth, db session)
└── errors.py     # Exception handlers globales
```

Sin repositorios abstractos, sin CQRS, sin sagas. Los services reciben `AsyncSession` directamente y los callers son responsables del commit.

---

## Setup

### Requisitos

- Python 3.12+
- PostgreSQL 15+
- Un proyecto en [Resend](https://resend.com) (plan gratuito alcanza para el MVP)
- Credenciales de MercadoPago

### Variables de entorno

Copiá `.env.example` a `.env` y completá los valores:

```bash
cp .env.example .env
```

| Variable | Descripción |
|---|---|
| `DATABASE_URL` | `postgresql+asyncpg://user:pass@host/db` |
| `SECRET_KEY` | Clave para firma de JWT (mínimo 32 caracteres) |
| `MERCADOPAGO_ACCESS_TOKEN` | Access token de MercadoPago |
| `RESEND_API_KEY` | API key de Resend |
| `FRONTEND_URL` | URL del frontend (para redirects de MercadoPago) |
| `ENVIRONMENT` | `dev` o `prod` |
| `BOOKING_EXPIRY_MINUTES` | Minutos hasta expirar una reserva (default: 15) |
| `JWT_EXPIRY_MINUTES` | Duración del token admin (default: 60) |

### Instalación

```bash
pip install -e ".[dev]"
```

### Migraciones

```bash
alembic upgrade head
```

### Correr el servidor

```bash
uvicorn app.main:app --reload
```

La documentación interactiva queda disponible en `http://localhost:8000/docs`.

---

## Flujo de compra

```
GET /trips                        # Listar viajes disponibles
GET /trips/{id}/seats             # Ver asientos y precios actuales
POST /bookings                    # Reservar asientos (15 min para pagar)
  → MercadoPago preference creada
  → Redirect al checkout de MercadoPago
POST /payments/webhook            # MercadoPago notifica el pago
  → Booking confirmada
  → Email de confirmación enviado
  → Asientos marcados como vendidos
```

### Pricing dinámico

Cada tipo de asiento (Cama / Semi Cama) tiene hasta 5 tramos de precio definidos por cantidad de pasajes vendidos. Los tramos son independientes por tipo y configurables desde el panel de administración.

Ejemplo:

| Tramo | Vendidos | Precio |
|---|---|---|
| 1 | 0 – 10 | $24.500 |
| 2 | 11 – 25 | $26.000 |
| 3 | 26 – 40 | $28.500 |

---

## Panel de administración

Endpoints bajo `/admin/` protegidos con JWT. Permiten:

- Configurar tramos de precio por viaje y tipo de asiento
- Listar ventas y reservas (solo lectura)

---

## Notificaciones por email

3 templates transaccionales enviados vía Resend:

| Template | Cuándo |
|---|---|
| Confirmación de compra | Inmediatamente después del pago |
| Recordatorio de viaje | 24 horas antes de la fecha de salida |
| Feedback post-viaje | 2 horas después de la llegada estimada |

Los recordatorios son gestionados por APScheduler con jobs persistidos en PostgreSQL — sobreviven reinicios del proceso.

---

## Testing

```bash
# Unit tests (sin DB)
pytest tests/unit/

# Integration tests (requiere DB de test)
pytest tests/integration/

# Todo
pytest
```

---

## Docker

```bash
docker build -t crucero-del-este .
docker run --env-file .env -p 8000:8000 crucero-del-este
```

---

## Roadmap

Módulos planificados post-MVP (ver `/specs/` para detalle):

- **Control de pasajeros** — QR único por pasaje, validación al embarque, registro de no-shows
- **Tracking GPS** — Dispositivo GPS dedicado con SIM, posición en tiempo real para el pasajero
- **Gestión avanzada de ventas** — Cancelaciones, reembolsos, modificaciones
- **Sistema multi-paradas** — Múltiples puntos de ascenso y descenso
- **Seguridad y antifraude** — Detección de reventa, validación de pagos

---

## Notas operativas

- Las comisiones de MercadoPago (0,8% – 6,6% según método de pago) corren por cuenta del cliente y no son calculadas por el sistema.
- El dominio y los costos del procesador de pagos son responsabilidad del cliente.
- El servicio de hosting incluye monitoreo de uptime y backups automáticos.
