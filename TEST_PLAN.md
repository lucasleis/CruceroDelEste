# TEST_PLAN.md — Expreso Río Paraná

Plan de testing del monorepo. Cubre backend (FastAPI/pytest), landing (Next.js/Vitest)
y admin (React+Vite/Vitest). Generado tras un inventario completo de la suite existente
y un análisis de gaps de cobertura.

---

## 1. Resumen

### Tests existentes (antes de esta sesión)

| Módulo | Framework | Archivos | Tests | Estado |
|--------|-----------|----------|-------|--------|
| Backend | pytest + testcontainers (Postgres real) | 11 | **205** | Todos válidos, 0 placeholders |
| Landing | — | 0 | 0 | Sin tooling ni tests |
| Admin | — | 0 | 0 | Sin tooling ni tests |

El backend ya tenía cobertura muy alta: routers (trips, bookings, payments, admin,
admin_catalog), servicios (booking, pricing, inventory), webhooks de MercadoPago +
firma HMAC, chargebacks, refunds y validación de schemas Pydantic.

### Tests implementados en esta sesión

Se priorizó **cobertura real de regresión** sobre líneas: los gaps críticos/altos que
ningún test cubría.

| Módulo | Archivo nuevo | Tests | Qué cubre |
|--------|---------------|-------|-----------|
| Backend | `backend/tests/integration/test_concurrency.py` | 2 | 🔴 Race condition de reserva de asiento ("doble venta"): lock `FOR UPDATE NOWAIT` bajo dos transacciones concurrentes + carrera real con `asyncio.gather` (exactamente una gana) |
| Backend | `backend/tests/integration/test_reminders_jobs.py` | 2 | 🟠 `expire_bookings_job`: expira reservas vencidas y libera sus asientos; no toca las vigentes |
| Admin | `frontend-admin/src/lib/__tests__/tripUtils.test.ts` | 7 | 🟠 `formatDate` (timezone America/Buenos_Aires, cruce de día, sin coma) + mapas de badges/labels |
| Admin | `frontend-admin/src/api/__tests__/client.test.ts` | 4 | 🔴 Interceptores axios: inyección de JWT en el request; en 401 borra token y redirige a `/login`; no toca sesión en otros errores |
| Admin | `frontend-admin/src/__tests__/router.test.tsx` | 4 | 🔴 `ProtectedRoute`/`RootRedirect`: sin token redirige a login; con token va al dashboard |
| Admin | `frontend-admin/src/pages/__tests__/LoginPage.test.tsx` | 3 | 🟠 Login: éxito guarda token y navega; fallo muestra error sin token; ya-logueado redirige al montar |
| Landing | `frontend/src/components/travel/__tests__/TripCard.test.tsx` | 12 | 🟠 Borde por disponibilidad (aqua/primary/accent), badge de urgencia, `priceFrom` null, duración, escala, fecha de llegada, `onSelect` |
| Landing | `frontend/src/components/search/__tests__/CityInput.test.tsx` | 5 | 🔴 Enforcement AR↔PY vía `allowedStopIds` (solo país opuesto), emisión de `stop:Nombre` + callbacks, búsqueda mín. 3 letras |
| Landing | `frontend/src/components/search/__tests__/SearchBar.test.tsx` | 2 | 🟠 Validación bloquea `onSearch` con campos vacíos; origen AR filtra destino a solo PY (integración) |

**Total implementado: 41 tests** (4 backend + 18 admin + 19 landing).

Estado de ejecución:
- **Admin: 18/18 pasando** (verificado en esta sesión — `vitest run`).
- **Landing: 19/19 pasando** (verificado en esta sesión — `vitest run`).
- **Backend: escritos contra los modelos/servicios reales y verificados por sintaxis.**
  No se pudieron *ejecutar* en este entorno porque no hay Docker/Postgres ni el venv de
  Python 3.12 (igual que toda la suite de integración existente, que requiere el contenedor
  Postgres). Correr en el entorno de desarrollo con Docker según DEVELOPMENT.md.

### Tests pendientes

Ver la tabla de la sección 2. Los gaps de severidad **media/baja** y los altos con fuerte
dependencia de infraestructura (flujo de compra E2E, React Query end-to-end) no se
implementaron en esta sesión y quedan planificados.

---

## 2. Tabla de tests pendientes (media/baja severidad + no implementados)

| Módulo | Qué testear | Severidad | Framework sugerido | Tiempo estimado |
|--------|-------------|-----------|--------------------|-----------------|
| Backend | `create_refund_request` → rama 500 `internal_server_error` (mp_payment_id ausente) | Media | pytest + AsyncClient | 0.5 h |
| Backend | `send_reminders_job`: envía recordatorio a reservas confirmadas con salida en 24h y marca `reminder_sent` | Media | pytest (patch `AsyncSessionLocal` + mock `send_reminder_email`) | 1.5 h |
| Backend | `send_feedback_job`: envía feedback tras cutoff y no reenvía | Media | pytest (mismo patrón que arriba) | 1.5 h |
| Backend | `services/email.py`: armado del payload de Resend (asunto, destinatario, plantilla) | Baja | pytest + mock `resend.Emails.send` | 1 h |
| Backend | Batch creation de trips si existiera endpoint de backend (hoy el "batch" es loop cliente) — confirmar diseño | Baja | pytest | **Ambiguo — requiere confirmación** |
| Landing | Flujo de compra E2E: `AsientosContent` → `CompraContent` → `ConfirmacionContent` (selección de asiento → pago → confirmación) | Alta | Vitest + RTL + mock `fetch`/MSW, o Playwright para E2E real | 4–6 h |
| Landing | `AsientosContent`: render del mapa de asientos, selección/deselección, límite por cantidad de pasajeros | Alta | Vitest + RTL | 2 h |
| Landing | `SearchBar`: estados de carga/error de `fetchStops` (placeholder "Cargando..."/"Error al cargar", input deshabilitado) | Media | Vitest + RTL + mock `fetch` | 1 h |
| Landing | `ResultadosContent`: mapeo de `TripRead` → props de `TripCard`, estado vacío, error de red | Media | Vitest + RTL + mock `fetch` | 1.5 h |
| Landing | `SearchBar`: `one-way` no exige fecha de vuelta; `round-trip` sí | Media | Vitest + RTL | 0.5 h |
| Admin | React Query en `TripsPage`/`BookingsPage`: cache por query key, refetch, estados de error/loading | Media | Vitest + RTL + `QueryClientProvider` de test + mock axios | 3 h |
| Admin | `CreateBatchTripsDialog`: creación en lote (loop de POST /trips) + agrupación por ruta + batch delete | Media | Vitest + RTL + mock `apiClient` | 2 h |
| Admin | CRUD de trips/tranches en `TripDetailPage`: crear/editar (diff logic del PATCH)/eliminar, manejo de 409 | Media | Vitest + RTL + mock `apiClient` | 3 h |
| Admin | `ConfiguracionPage`: validación AR↔PY client-side al crear rutas + manejo de 409 (`stop_in_use`, `route_already_exists`) | Media | Vitest + RTL + mock `apiClient` | 2 h |

### Comportamiento ambiguo (requiere confirmación antes de testear)

- **Batch creation de trips**: en `frontend-admin` existe `CreateBatchTripsDialog`, pero no
  se encontró un endpoint de backend `POST /admin/trips/batch`. Aparenta ser un loop cliente
  sobre `POST /admin/trips`. Confirmar si debe existir lógica de batch en el backend antes de
  escribir tests de integración para ella.
- **Permisos por rol**: el código de admin sólo distingue "autenticado vs no autenticado"
  (un único tipo de admin). No hay roles. No se testean permisos por rol porque no existen;
  si se agregan, este plan debe actualizarse.

---

## 3. Correr la suite completa

### Backend (pytest)

Requiere Docker (Postgres vía testcontainers) y Python 3.12. Ver `DEVELOPMENT.md` §2.

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
pip install bcrypt==4.0.1

# Opción A — testcontainers levanta Postgres automáticamente (necesita Docker):
pytest

# Opción B — apuntar a un Postgres ya corriendo (sin testcontainers):
TEST_DATABASE_URL=postgresql://crucero:crucero@localhost:5432/crucerodeleste_test pytest

# Sólo los tests nuevos de esta sesión:
pytest tests/integration/test_concurrency.py tests/integration/test_reminders_jobs.py -v

# Sólo unit tests (no requieren DB):
pytest tests/unit -v
```

### Landing (Vitest)

```bash
cd frontend
npm install          # instala vitest + testing-library (ya en devDependencies)
npm test             # vitest run (una pasada)
npm run test:watch   # modo watch
```

### Admin (Vitest)

```bash
cd frontend-admin
npm install
npm test
npm run test:watch
```

---

## 4. Antes de cada PR — checklist mínimo

Correr según qué módulo tocaste. Si un PR cruza módulos, correr los checklists de todos.

### Tocaste `backend/`
- [ ] `cd backend && pytest` (verde, con Docker corriendo)
- [ ] Si tocaste reserva/inventario/asientos → confirmá que `test_concurrency.py` pasa (guarda anti doble-venta)
- [ ] Si tocaste `tasks/reminders.py` o expiración → `pytest tests/integration/test_reminders_jobs.py`
- [ ] Si agregaste/cambiaste un endpoint → test de status codes + validación de input + rama de error
- [ ] Si tocaste webhooks/pagos → `pytest tests/integration/test_payments_router.py tests/unit/test_payment_signature.py`

### Tocaste `frontend/` (landing)
- [ ] `cd frontend && npm test` (verde)
- [ ] Si tocaste `SearchBar`/`CityInput` → confirmá que el enforcement AR↔PY sigue pasando (regla de negocio crítica)
- [ ] Si tocaste `TripCard` → confirmá señales de disponibilidad/urgencia/precio
- [ ] `npm run build` (Next.js compila sin errores de tipos)

### Tocaste `frontend-admin/` (admin)
- [ ] `cd frontend-admin && npm test` (verde)
- [ ] Si tocaste `api/client.ts` o `router.tsx` → confirmá interceptores JWT + protección de rutas (seguridad)
- [ ] Si tocaste `tripUtils.ts` → confirmá `formatDate` (timezone) + mapas de badges
- [ ] `npm run build` (`tsc -b` sin errores)

### Siempre
- [ ] No se agregaron tests que sólo verifican "existe" o "retorna no-nulo" (cobertura falsa)
- [ ] Los mocks se limitan a servicios externos reales (MercadoPago, Resend/SMTP, red) y están documentados en el propio test
- [ ] Cada test nuevo tiene arrange / act / assert separados y un nombre que describe el comportamiento esperado
