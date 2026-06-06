# Expreso Río Paraná

Sistema de venta de pasajes online para **Expreso Río Paraná**, empresa argentina de transporte internacional con más de 50 años operando rutas a Paraguay. Plataforma propia que complementa los canales actuales (Plataforma 10, Central de Pasajes) con venta directa, pricing dinámico y control total sobre precios, datos y experiencia de usuario.

> ℹ️ El proyecto fue originalmente presupuestado para Crucero del Este. A partir de la segunda reunión el cliente confirmó que el proyecto es para Expreso Río Paraná. Cualquier referencia a Crucero del Este en el código es deuda técnica pendiente de actualizar.

---

## Estructura del repositorio

```
ExpresRioParana/
├── backend/        # API REST — Python + FastAPI
├── frontend/       # Interfaz web — a desarrollar en fase siguiente
├── specs/          # Especificaciones, presupuesto y skills de referencia
├── CLAUDE.md       # Briefing permanente del proyecto para Claude Code
└── README.md
```

---

## Backend

### Stack

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

### Arquitectura

Monolito en tres capas: **routers → services → models**.

```
backend/app/
├── routers/      # HTTP only — parseo de requests y respuestas
├── services/     # Lógica de negocio — testeable sin DB ni HTTP
├── models/       # SQLAlchemy ORM — fuente de verdad del schema
├── schemas/      # Pydantic DTOs — request / response
├── deps.py       # Dependencias compartidas (auth, db session)
└── errors.py     # Exception handlers globales
```

Sin repositorios abstractos, sin CQRS, sin sagas. Los services reciben `AsyncSession` directamente y los callers son responsables del commit.

### Setup

**Requisitos:** Python 3.12+, PostgreSQL 15+, cuenta en [Resend](https://resend.com), credenciales de MercadoPago.

```bash
cd backend
cp .env.example .env   # completar con los valores reales
pip install -e ".[dev]"
alembic upgrade head
uvicorn app.main:app --reload
```

Documentación interactiva disponible en `http://localhost:8000/docs`.

### Variables de entorno

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

### Flujo de compra

```
GET  /trips                  # Listar viajes disponibles (filtrado por país de origen/destino)
GET  /trips/{id}/seats       # Ver asientos y precios actuales
POST /bookings               # Reservar asientos (15 min para pagar)
  → Validación regla AR↔PY (origen y destino deben ser de países distintos)
  → Preferencia MercadoPago creada
  → Redirect al checkout de MercadoPago
POST /payments/webhook       # MercadoPago notifica el pago
  → Booking confirmada
  → Email de confirmación enviado
  → Asientos marcados como vendidos
```

### Regla de negocio internacional (AR↔PY)

Los servicios son exclusivamente internacionales. El sistema impide la venta de tramos de cabotaje:

- Si el origen es Argentina → el destino solo puede ser Paraguay.
- Si el origen es Paraguay → el destino solo puede ser Argentina.
- No se puede vender un tramo interno dentro del mismo país.

Esta validación existe tanto en el frontend (filtro dinámico del selector) como en el backend (validación al crear el booking).

### Pricing dinámico

Cada tipo de asiento (Cama / Semi Cama) tiene hasta 5 tramos de precio definidos por cantidad de pasajes vendidos. Los tramos son independientes por tipo y configurables desde el panel de administración.

| Tramo | Vendidos | Precio |
|---|---|---|
| 1 | 0 – 10 | A definir |
| 2 | 11 – 25 | A definir |
| 3 | 26 – 40 | A definir |

### Notificaciones por email

| Template | Cuándo |
|---|---|
| Confirmación de compra | Inmediatamente después del pago |
| Recordatorio de viaje | 24 horas antes de la salida |
| Feedback post-viaje | 2 horas después de la llegada estimada |

Los jobs son persistidos en PostgreSQL vía APScheduler — sobreviven reinicios del proceso.

### Testing

```bash
cd backend
pytest tests/unit/         # Sin DB
pytest tests/integration/  # Requiere DB de test
pytest                     # Todo
```

### Docker

```bash
cd backend
docker build -t expresorioparana-backend .
docker run --env-file .env -p 8000:8000 expresorioparana-backend
```

---

## Roadmap

Módulos planificados post-MVP (ver `/specs/` para detalle y precios):

- **Control de pasajeros** — QR único por pasaje, validación al embarque, registro de no-shows — **$450.000 / 5 días**
- **Tracking GPS** — Dispositivo GPS dedicado con SIM, posición en tiempo real para el pasajero — **$310.000 + hardware (cliente)** *(recomendado sobre app de chofer)*
- **Gestión avanzada de ventas** — Cancelaciones, reembolsos con lógica de porcentajes, modificaciones
- **Sistema multi-paradas avanzado** — Paradas adicionales más allá de la regla AR↔PY básica
- **Seguridad y antifraude** — Detección de reventa, validación de pagos
- **Notificaciones por WhatsApp** — Requiere WhatsApp Business API
- **Sistema de puntos / millas** — Fidelización de pasajeros frecuentes
- **Integración con SOR** — Sincronización de asientos en tiempo real con el sistema interno del cliente *(riesgo activo — ver CLAUDE.md)*

---

## Notas operativas

- Las comisiones de MercadoPago (0,8% – 6,6% según método de pago) corren por cuenta del cliente y no son calculadas por el sistema.
- El dominio y los costos del procesador de pagos son responsabilidad del cliente.
- El cliente vende simultáneamente por SOR, Plataforma 10 y Central de Pasajes. Sin integración con SOR, existe riesgo de doble venta de asientos. Esta integración está fuera del alcance del MVP actual.

---

## Flujo de trabajo con IA

Este proyecto usa dos contextos de trabajo con IA de forma complementaria:

### Claude (planning y prompts)

Se usa para revisar código, tomar decisiones de arquitectura, y construir los prompts que se le pasan a Claude Code. **No ejecuta código ni hace commits.**

Prompt para iniciar una sesión nueva de planning o revisión:

```
Tengo un proyecto en desarrollo: Expreso Río Paraná — sistema de venta de 
pasajes online para una empresa de transporte internacional Argentina-Paraguay.

Contexto del proyecto: CLAUDE.md en la raíz del repo y archivos en /specs/.

Tu rol en esta conversación:
- Actuar como mentor técnico y revisor de código
- Analizar código, decisiones de arquitectura y outputs de Claude Code
- Identificar problemas, bugs, o malas prácticas antes de aprobar
- Generar prompts corregidos con /prompt-master cuando algo necesite ajuste
- NO escribir código directamente ni hacer commits

Cómo vamos a trabajar:
1. Te voy a pasar outputs de Claude Code (código, decisiones, propuestas)
2. Vos los analizás y me decís si están bien o tienen problemas
3. Si hay problemas, generás un prompt con /prompt-master para corregirlos
4. Yo llevo ese prompt a Claude Code y te traigo el resultado

Estilo de respuesta esperado:
- Veredicto directo en la primera línea: "Está bien", "No está OK", 
  "Hay un problema antes de aprobar", sin preámbulo
- Si está bien: confirmarlo en una línea y dar el prompt para continuar
- Si hay problemas: numerarlos con título, explicar el riesgo concreto, 
  y entregar el prompt corregido listo para copiar
- Ante código: pedir solo la función o sección relevante, no el archivo 
  completo. Evaluar contra criterios explícitos
- Sin halagos, sin frases de cortesía, sin explicaciones que no fueron pedidas
- El prompt para el siguiente paso siempre viene incluido en la respuesta

Empezamos cuando quieras. ¿Qué necesitás revisar hoy?
```

### Claude Code (ejecución y desarrollo)

Se usa con el repo linkeado para escribir código, correr comandos y hacer commits. Lee el `CLAUDE.md` al inicio de cada sesión para retomar el contexto sin necesidad de repetir nada.

Prompt para iniciar una sesión nueva de desarrollo:

```
Read CLAUDE.md and continue.
```

**Regla general:** las decisiones de arquitectura y la revisión de código se toman en Claude antes de ejecutar en Claude Code. Claude Code implementa lo que ya fue aprobado.
