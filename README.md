# Crucero Del Este
Sistema de venta de pasajes online para Crucero Del Este, empresa argentina de transporte de larga distancia. Plataforma propia que complementa los canales actuales (Plataforma 10, Central de Pasajes) con venta directa, pricing dinámico y control total sobre precios, datos y experiencia de usuario.
---
## Estructura del repositorio
```
CruceroDelEste/
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
GET  /trips                  # Listar viajes disponibles
GET  /trips/{id}/seats       # Ver asientos y precios actuales
POST /bookings               # Reservar asientos (15 min para pagar)
  → Preferencia MercadoPago creada
  → Redirect al checkout de MercadoPago
POST /payments/webhook       # MercadoPago notifica el pago
  → Booking confirmada
  → Email de confirmación enviado
  → Asientos marcados como vendidos
```
### Pricing dinámico
Cada tipo de asiento (Cama / Semi Cama) tiene hasta 5 tramos de precio definidos por cantidad de pasajes vendidos. Los tramos son independientes por tipo y configurables desde el panel de administración.
| Tramo | Vendidos | Precio |
|---|---|---|
| 1 | 0 – 10 | $24.500 |
| 2 | 11 – 25 | $26.000 |
| 3 | 26 – 40 | $28.500 |
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
docker build -t crucero-backend .
docker run --env-file .env -p 8000:8000 crucero-backend
```
---
## Roadmap
Módulos planificados post-MVP (ver `/specs/` para detalle y precios):
- **Control de pasajeros** — QR único por pasaje, validación al embarque, registro de no-shows
- **Tracking GPS** — Dispositivo GPS dedicado con SIM, posición en tiempo real para el pasajero
- **Gestión avanzada de ventas** — Cancelaciones, reembolsos, modificaciones
- **Sistema multi-paradas** — Múltiples puntos de ascenso y descenso
- **Seguridad y antifraude** — Detección de reventa, validación de pagos
---
## Notas operativas
- Las comisiones de MercadoPago (0,8% – 6,6% según método de pago) corren por cuenta del cliente y no son calculadas por el sistema.
- El dominio y los costos del procesador de pagos son responsabilidad del cliente.
---
## Flujo de trabajo con IA
Este proyecto usa dos contextos de trabajo con IA de forma complementaria:
### Claude (planning y prompts)
Se usa para revisar código, tomar decisiones de arquitectura, y construir los prompts que se le pasan a Claude Code. **No ejecuta código ni hace commits.**
Prompt para iniciar una sesión nueva de planning o revisión:
```
Tengo un proyecto en desarrollo llamado Crucero Del Este — sistema de venta
de pasajes online para una empresa de transporte argentina.
El contexto completo está en el CLAUDE.md del repo y en los archivos de /specs/.
Te voy a compartir lo que necesito revisar o decidir hoy.
```
### Claude Code (ejecución y desarrollo)
Se usa con el repo linkeado para escribir código, correr comandos y hacer commits. Lee el `CLAUDE.md` al inicio de cada sesión para retomar el contexto sin necesidad de repetir nada.
Prompt para iniciar una sesión nueva de desarrollo:
```
Read CLAUDE.md and continue.
```
**Regla general:** las decisiones de arquitectura y la revisión de código se toman en Claude antes de ejecutar en Claude Code. Claude Code implementa lo que ya fue aprobado.
