# AUDIT_REPORT.md — Auditoría de código · Monorepo Expreso Río Paraná

> Auditoría estática de solo lectura (backend FastAPI, frontend landing Next.js, frontend-admin React+Vite).
> No se modificó ningún archivo de código fuente. Hallazgos agrupados por capa y luego por módulo.
> Documentos vivos leídos previamente: `CLAUDE.md` (raíz + backend + frontend-admin), `DEVELOPMENT.md`, `ADMIN_DESIGN.md`, `frontend/AGENTS.md`.
> Fecha: 2026-07-14.

---

## 1. Resumen ejecutivo

El código está, en general, por encima del promedio: hay locks pesimistas (`FOR UPDATE`, advisory locks), verificación de firma HMAC + replay window en webhooks, idempotencia en refunds y validación Pydantic sólida. La deuda conocida está bien documentada. Sin embargo, hay **tres riesgos de alto impacto que rompen la promesa central del producto (vender un asiento y cobrarlo bien):**

1. **Rate limit inefectivo en `POST /bookings/{id}/refund-request`** — el decorador `@limiter.limit` está por *encima* de `@router.post`, orden invertido respecto de `admin.py`. FastAPI registra la función sin envolver: el límite nunca se aplica. Endpoint de reembolso abusable / enumerable. (Capa 2/3)
2. **JWT de admin en `localStorage`** — robable por cualquier XSS. El propio brief de auditoría exige httpOnly cookie o memoria. Compromiso total del panel. (Capa 3)
3. **Pago aprobado después de la expiración = plata cobrada sin asiento** — `expire_bookings_job` libera asientos al vencer; si el webhook de MP llega después, `confirm_booking` ve `status != pending_payment` y retorna sin re-reservar ni alertar. El cliente pagó, no tiene asiento y el asiento puede haberse revendido. (Capa 3/4)

Complementan el cuadro: `GET /bookings/{id}` público expone PII (nombres, DNI, teléfonos) por UUID enumerable, el endpoint público de creación de reservas no tiene rate limit, y el DNI del formulario de compra solo acepta formato argentino en un servicio explícitamente internacional AR↔PY.

---

## 2. Hallazgos por capa

### ✅ Capa 1 — Higiene básica

| Archivo:línea | Severidad | Problema | Fix propuesto |
|---|---|---|---|
| frontend-admin/src/api/trips.ts:58 | Medio | `interface AdminSeatRead` se define en la capa `api/`, violando la convención de CLAUDE.md/ADMIN_DESIGN.md ("tipos en `src/types/trips.ts`, no redefinir en otros archivos"). Se importa desde `TripDetailPage`. | Mover `AdminSeatRead` a `src/types/trips.ts` y reexportar; alinear con el resto de tipos. |
| frontend-admin/src/pages/ChargebacksPage.tsx:25 | Bajo | `STATUS_BADGE` local duplica el patrón central de `tripUtils.ts` (deuda #5). | Mover `STATUS_BADGE` de chargebacks a `tripUtils.ts` junto a los otros badges. |
| backend/app/services/payment.py:157-159 | Bajo | Comentario muerto: describe redondeo de `transaction_amount`, pero `PaymentDetails` ya no tiene ese campo ni se redondea nada. | Eliminar el comentario obsoleto. |
| backend/app/errors.py:59 | Bajo | `PaymentConfigError` definida pero nunca usada ni levantada en ningún módulo. | Eliminar la clase o cablearla al validador de `config.py` que la docstring menciona. |
| backend/app/services/inventory.py:11 vs errors.py:10 | Bajo | `SeatNotAvailable` (inventory) y `SeatUnavailableError` (errors) coexisten para el mismo concepto (deuda #3 / LLE-65), naming inconsistente. | Unificar en una sola excepción con su handler; el router traduce una vez. |
| frontend-admin/src/pages/TripDetailPage.tsx:402 | Bajo | Typo `camaTransches` (debería ser `camaTranches`); inconsistente con `semiCamaTranches` en la línea siguiente. | Renombrar `camaTransches` → `camaTranches`. |
| frontend/src/app/{hero,navbar,footer,cta,travel,ds-travel,preview-*}/page.tsx | Bajo | Rutas de preview/desarrollo enviadas en el árbol de producción (AGENTS.md las marca "solo desarrollo, no producción"). | Excluir del build de producción o mover a un directorio no ruteado. |
| frontend/src/components/{sections/Nosotros,sections/NosotrosV2},{nosotros/NosotrosCard,NosotrosCardV2},{travel/DestinationCard,DestinationCardV2} | Bajo | Componentes versionados en paralelo (V1/V2); candidatos a código muerto una vez elegida la versión. | Confirmar cuál está en uso y borrar la variante huérfana. |
| backend/app/routers/admin.py:37 | Bajo | `_DUMMY_HASH = _pwd_context.hash("dummy")` se computa en cada import del módulo (deuda #7). | Computar perezosamente o mover a constante de arranque; costo de bcrypt en import time. |

✅ Capa 1 completada — 9 hallazgos.

---

### ✅ Capa 2 — Correctness y mantenibilidad

| Archivo:línea | Severidad | Problema | Fix propuesto |
|---|---|---|---|
| backend/app/routers/bookings.py:133-134 | **Alto** | `@limiter.limit("5/minute")` está **encima** de `@router.post(...)`. Al revés de `admin.py:40-41`. FastAPI registra la función interna sin el wrapper del limiter → el rate limit **no se aplica**. | Invertir el orden: `@router.post(...)` arriba, `@limiter.limit("5/minute")` debajo, tal como en `login`. |
| backend/app/services/email.py:143-168 + tasks/reminders.py:105-107 | Medio | `send_reminder_email` traga toda excepción y retorna `None`; el job igual setea `reminder_sent = True`. Un envío fallido marca el recordatorio como enviado → nunca se reintenta. Mismo patrón en feedback (deuda #1). | Que `send_reminder_email`/`send_feedback_email` retornen `bool` (o levanten); el job solo marca `*_sent=True` si el envío fue exitoso. |
| frontend/src/app/compra/[tripId]/CompraContent.tsx:136 | Medio | `handleContinuar` en éxito solo hace `console.log(...)`; el formulario de pasajeros no envía nada al backend ni navega a pago. Flujo de compra sin salida. | Cablear a `POST /bookings` (con `trip_id`, `seat_ids`, `passengers`, `contact_email`) y redirigir a `init_point`. Nota: `/pago` figura como pendiente. |
| frontend-admin/src/pages/TripDetailPage.tsx:100-368 | Medio | God component: ~1014 líneas, 20+ `useState`, 5 diálogos, lógica de tramos/asientos/edición mezclada (deuda #1). Difícil de mantener y testear. | Extraer `EditTripDialog`, `PriceTrancheDialog` y `SeatsDialog` a componentes propios con su estado. |
| frontend-admin/src/pages/TripDetailPage.tsx:128-368 | Medio | Los asientos se cargan y mutan con `useState` local (`seats`, `seatsLoading`, `handleToggleSeat` muta el array a mano), fuera del layer React Query usado para todo lo demás en la misma página. Estado servidor duplicado y desincronizable. | Migrar a `useQuery(["admin","trips",id,"seats"])` + `useMutation` con `invalidateQueries`, como el resto del admin. |
| frontend/src/components/search/SearchBar.tsx:127-132 | Medio | `handleOriginStopSelected` no chequea `res.ok` antes de `res.json()`, y el `catch {}` deja `allowedDestinationIds` en `undefined` sin feedback: ante un 4xx/5xx el filtro AR↔PY se abre a *todos* los destinos silenciosamente. | Verificar `res.ok`; ante error, mostrar estado y no habilitar destinos del mismo país. |
| frontend/src/app/{resultados/ResultadosContent,asientos/[tripId]/AsientosContent,confirmacion/ConfirmacionContent,arrepentimiento/ArrepentimientoContent}.tsx | Bajo | `catch {}` genérico que solo setea un flag booleano; se pierde el detalle del error (status/detail del backend) útil para el usuario y para debugging. | Capturar y discriminar por `status`/`detail` como hace el admin (`error.response.data.detail`). |
| backend/app/services/payment.py:148-155 | Bajo | `get_payment` levanta `PaymentProcessingError(502)` si `external_reference` no es UUID; pagos legítimos sin `external_reference` (creados fuera de este flujo) rompen el webhook de chargebacks que también llama `get_payment`. | Validar `external_reference` solo en el flujo que lo requiere (webhook de pago), no dentro de `get_payment` compartido. |

✅ Capa 2 completada — 8 hallazgos.

---

### ✅ Capa 3 — Riesgos de seguridad y datos

| Archivo:línea | Severidad | Problema | Fix propuesto |
|---|---|---|---|
| frontend-admin/src/api/client.ts:8, LoginPage.tsx:27, router.tsx:14,22 | **Alto** | JWT de admin guardado en `localStorage`. Cualquier XSS (dep comprometida, SVG, etc.) lo exfiltra y da acceso total al panel. El brief exige httpOnly cookie o memoria. | Emitir el token en cookie `httpOnly; Secure; SameSite=Strict` desde `/admin/login` y validarlo por cookie; o mantenerlo solo en memoria (Context) + refresh. Quitar todo `localStorage`. |
| backend/app/routers/bookings.py:197-218 | **Alto** | `GET /bookings/{id}` sin autenticación devuelve PII completa (nombres, DNI, email, teléfono, asiento) por UUID. UUID mitiga enumeración pero no autoriza; se filtra vía la página de confirmación y el link de MP (deuda #10 / LLE-56). | Requerir prueba de posesión (token firmado de un solo uso emitido al crear el booking) o restringir campos devueltos a los no sensibles. |
| backend/app/routers/bookings.py:133-134 | **Alto** | Rate limit de refund inefectivo (ver Capa 2). Con el endpoint sin límite real, se puede enumerar/spamear `refund-request` y sondear existencia de bookings por diferencia de respuestas (404 vs 409 vs 422). | Corregir el orden del decorador (Capa 2) y devolver la misma respuesta para "no existe" y "no refundable". |
| backend/app/routers/payments.py:126 + services/booking.py:106-123 + tasks/reminders.py:51-73 | **Alto** | Race pago-vs-expiración: si `expire_bookings_job` libera los asientos y luego llega el webhook aprobado, `confirm_booking` retorna temprano (status expired) → cliente cobrado, sin asiento, sin email, sin refund ni alerta. El fix conocido cubre el doble-confirm, no este caso. | En el webhook, si el pago está `approved` pero el booking está `expired`, re-intentar reservar los mismos asientos; si no hay disponibilidad, disparar refund automático (`create_refund`) + alerta al operador. |
| backend/app/routers/bookings.py:43-47 | Medio | `POST /bookings` (público) sin rate limiting: permite crear reservas ilimitadas, reservar (bloquear) inventario y generar preferencias de MP en masa → DoS de inventario y ruido en MP. | Agregar `@limiter.limit("N/minute")` (orden correcto) keyed por IP; considerar límite por `trip_id`. |
| backend/app/main.py:29 + config.py:32 | Medio | `allow_credentials=True` con auth por header `Authorization` (no cookies) — innecesario y amplía superficie; además el default de `cors_origins` incluye `http://31.97.25.173` (IP en HTTP plano). | Si se migra a cookie httpOnly, mantener credentials y fijar orígenes HTTPS explícitos; si no, poner `allow_credentials=False`. Quitar el IP HTTP del default en `config.py`. |
| frontend/src/app/compra/[tripId]/CompraContent.tsx:34 | Medio | `DNI_REGEX = /^\d{7,8}$/` solo acepta DNI argentino, en un servicio **internacional AR↔PY**; bloquea a pasajeros paraguayos (cédula con otro formato). Regla de negocio rota. | Relajar la validación a documento internacional (alfanumérico, longitud razonable) coherente con `dni: String(20)` del modelo; validar por país si corresponde. |
| backend/.env.example:15 / .env.example:7-8 | Bajo | `CORS_ORIGINS` de ejemplo y `NEXT_PUBLIC_API_URL`/`VITE_API_BASE_URL` traen hostnames/IPs de infra reales commiteados; el default productivo debe venir solo de entorno. | Dejar placeholders genéricos en `.env.example`; documentar valores reales fuera del repo. |

✅ Capa 3 completada — 8 hallazgos.

---

### ✅ Capa 4 — Arquitectura y escalabilidad

| Archivo:línea | Severidad | Problema | Fix propuesto |
|---|---|---|---|
| backend/tasks/reminders.py:20-46 + main.py:17-21 | Medio | APScheduler corre in-process dentro del `lifespan`. Con más de una réplica de backend, `expire_bookings_job` y los jobs de email corren en cada réplica → emails duplicados y contención en expiración. Único punto de falla si la réplica que lo corre cae. | Aislar el scheduler en un worker dedicado (una sola instancia) o usar leader-election / lock distribuido (`pg_advisory_lock`) por job antes de ejecutar. |
| backend/app/services/booking.py:142-167 + pricing.py:30-42 | Medio | El precio se calcula sobre `sold_count` (asientos `sold`), pero al reservar quedan en `reserved`. Múltiples compradores concurrentes en un mismo tramo se sirven todos al precio viejo hasta que se confirmen los pagos; el tramo no "avanza" con reservas en vuelo. Puede subvender en el borde del tramo. | Decisión de producto: si el tramo debe reflejar demanda en vuelo, contar `reserved`+`sold`; documentar explícitamente el comportamiento elegido. (Ver falso positivo relacionado.) |
| backend/app/routers/admin.py:156-240 | Medio | Lógica de negocio (overlap, gap, capacidad, "arranca en cero", advisory lock) vive en el router de `create_price_tranche`, contra la regla de CLAUDE.md backend ("routers solo parsean HTTP; services contienen la lógica"). | Extraer a `services/pricing.py` (p.ej. `add_price_tranche(...)`); el router solo traduce errores a HTTP. |
| backend/app/routers/payments.py:242-276 | Medio | El upsert de `Chargeback` (crear/actualizar, mapear `status_detail`→enum, idempotencia) está inline en el webhook. Lógica de dominio acoplada al parseo HTTP; difícil de testear sin simular request. | Mover a `services/` (`upsert_chargeback(...)`); el router solo orquesta verificación de firma + fetch + delega. |
| frontend/src/{components/search/SearchBar,app/resultados/ResultadosContent,app/asientos/[tripId]/AsientosContent,app/confirmacion/ConfirmacionContent,app/arrepentimiento/ArrepentimientoContent}.tsx | Medio | El landing no tiene capa de servicio: `fetch` crudo repartido en componentes, cada uno reconstruyendo `baseUrl` y su propio manejo de error. El admin sí tiene `src/api/` — inconsistencia arquitectónica entre frontends. | Crear `frontend/src/api/` (o `src/lib/api.ts`) con funciones por dominio (`getStops`, `getTrips`, `createBooking`, …) y un wrapper de fetch con base URL y errores unificados. |
| backend/app/services/booking.py:106-123 | Medio | `confirm_booking` no re-valida que los asientos sigan `reserved` antes de marcarlos `sold`; asume el invariante. Combinado con el race de Capa 3, puede marcar `sold` asientos ya liberados/revendidos. | Al confirmar, verificar que cada asiento esté en `reserved` para este booking; si no, abortar y disparar el flujo de refund/alerta. |

✅ Capa 4 completada — 6 hallazgos.

---

## 3. No tocar / falsos positivos

Código que a primera vista parece problemático pero es intencional (razón documentada en CLAUDE.md / DEVELOPMENT.md / ADMIN_DESIGN.md):

| Ítem | Por qué NO es un bug |
|---|---|
| Webhooks devuelven siempre 2xx (payments.py) | Decisión de diseño explícita: "NUNCA devolver 4xx" para evitar loops de reintento de MP. Solo 500 en fallas transitorias. (backend/CLAUDE.md · payments) |
| SDK MP con `max_retries=0` + `call_with_retry` propio (payment.py:42) | Intencional: el retry con backoff/jitter y solo en 429 se maneja en `services/http.py`. (backend/CLAUDE.md · http.py) |
| `create_refund` (MP) antes de `mark_booking_refunded` (DB) (bookings.py:180-192) | Orden aprobado explícitamente para no marcar refunded en DB si MP falla. (backend/CLAUDE.md · flujo de reembolso) |
| Precio calculado sobre asientos `sold`, no `reserved` (booking.py:148-153) | El comentario lo declara intencional ("tranches are evaluated at the moment of purchase"). Se lista en Capa 4 solo como decisión de producto a confirmar, no como defecto. |
| `X-Idempotency-Key` generado fuera del retry loop (payment.py:174-181) | Intencional vía closure para que los reintentos reusen la misma key. (backend/CLAUDE.md · payment.py) |
| `data_id.lower()` en el manifiesto de firma (payment.py:263) | Requerido por la documentación de MP para el cálculo del HMAC. |
| `GET /admin/bookings` / `refund-requests` / `chargebacks` con `.limit(500)` sin paginación (admin.py) | Deuda técnica conocida y aceptada para el MVP (#4). |
| `expire_bookings_job` carga objetos `Booking` completos (reminders.py:51-73) | Deuda conocida #9, aceptable para el volumen del MVP. |
| Nombre del repo `CruceroDelEste` y claims JWT "crucero-admin" | Histórico; CLAUDE.md indica no modificar el nombre del repo y actualizar claims al fijar nombre final (deuda #12). |
| shadcn/ui instalado pero sin usar en el landing | Reservado para frontend-admin por decisión explícita. (frontend/AGENTS.md) |
| Landing usa `useState` en vez de React Query | React Query es patrón del **admin**; el landing (Next.js) no lo adoptó por diseño. Solo se marca la ausencia de capa de servicio (Capa 4), no el uso de `useState`. |
