# Performance Audit — CruceroDelEste

> Auditoría de solo lectura del monorepo (backend FastAPI/PostgreSQL, frontend público Next.js, frontend-admin React+Vite).
> Fecha: 2026-07-21. Ningún archivo fue modificado.
>
> **Notas de alcance**
> - **MercadoPago**: la integración de pagos (`app/services/payment.py`, `app/routers/payments.py`) está presente y fue auditada a nivel de contrato de interfaz y consultas a DB. Las credenciales productivas siguen pendientes del cliente, pero el código es accesible.
> - **SOR / Sisorg**: no existe ninguna referencia en el código (`grep` sobre `backend/`, `frontend/`, `frontend-admin/` sin resultados). Módulo **pendiente de credenciales / no integrado** — nada que auditar todavía.
> - Los tamaños de tabla son proyecciones: `bookings`, `passengers`, `seats` y `trips` crecen sin techo en producción; `stops`, `routes`, `seat_layouts` son catálogo casi estático.

---

## 1. Indexes

### 1.1 `bookings.mp_payment_id` sin índice — usado por el webhook de contracargos
- **Archivo**: `backend/app/routers/payments.py` (línea 249-251, `chargebacks_webhook`) · modelo `backend/app/models/booking.py:47-48`
- **Problema**: `select(Booking).where(Booking.mp_payment_id == data_id)` filtra por `mp_payment_id`, columna sin índice. `bookings` es una de las tablas de mayor crecimiento; cada contracargo dispara un **sequential scan** completo. La confirmación de pago (`confirm_booking`) además setea este campo en cada venta, así que la selectividad es alta y el scan se agrava con el volumen.
- **Impacto**: **medio-alto**. Frecuencia de hit baja (contracargos), pero costo O(n) sobre la tabla más grande, y ocurre dentro de un webhook de MercadoPago con presupuesto de latencia acotado (MP reintenta ante lentitud/5xx).
- **Fix**: agregar índice parcial (la mayoría de las filas tienen `mp_payment_id IS NULL` hasta confirmarse):
  ```python
  Index("idx_bookings_mp_payment_id", "mp_payment_id",
        postgresql_where=Column("mp_payment_id").isnot(None))
  ```
  Migración Alembic equivalente con `op.create_index(..., postgresql_where=sa.text("mp_payment_id IS NOT NULL"))`.

### 1.2 `routes.destination_stop_id` sin índice propio
- **Archivo**: modelo `backend/app/models/trip.py:67-78` · usos en `backend/app/routers/admin_catalog.py:143-149` (`update_stop`), `:175-182` (`delete_stop`) y `backend/app/routers/trips.py:58-65` (filtro de destino en `list_trips`)
- **Problema**: el único índice que cubre las FK de `routes` es el `UniqueConstraint("origin_stop_id", "destination_stop_id")` (`models/trip.py:75`). Un índice compuesto sirve como prefijo para `origin_stop_id`, **pero no para `destination_stop_id` solo**. Los checks de "parada en uso" (`WHERE origin_stop_id = :id OR destination_stop_id = :id`) y el filtro de búsqueda por destino no pueden usarlo para la rama de destino → seq scan sobre `routes`.
- **Impacto**: **medio**. `routes` es chico hoy, pero el check corre en cada alta/baja/edición de parada y el filtro de destino en cada búsqueda pública. Barato de resolver.
- **Fix**: `Index("idx_routes_destination_stop", "destination_stop_id")` (y opcionalmente `idx_routes_origin_stop` explícito si se prefiere no depender del prefijo del unique).

### 1.3 Falta índice parcial para los cron de recordatorio/feedback
- **Archivo**: `backend/tasks/reminders.py:81-90` (`send_reminders_job`) y `:128-136` (`send_feedback_job`) · modelo `backend/app/models/booking.py:60-69`
- **Problema**: ambos jobs filtran `Booking.status == confirmed AND reminder_sent/feedback_sent == False` con JOIN a `Trip` por ventana temporal. Existe `idx_bookings_status` (solo `status`), pero **el conjunto de `confirmed` crece sin techo** (nunca se archiva). Cada corrida (recordatorios cada 1 h, feedback cada 1 h) re-escanea todas las reservas confirmadas para descartar las ya notificadas.
- **Impacto**: **medio**. Costo por operación crece linealmente con las ventas históricas; frecuencia fija (horaria) y perpetua.
- **Fix**: índices parciales que mantengan el working set mínimo:
  ```python
  Index("idx_bookings_pending_reminder", "trip_id",
        postgresql_where=text("status = 'confirmed' AND reminder_sent = false"))
  Index("idx_bookings_pending_feedback", "trip_id",
        postgresql_where=text("status = 'confirmed' AND feedback_sent = false"))
  ```

### 1.4 `trips.seat_layout_id` sin índice (bajo)
- **Archivo**: modelo `backend/app/models/trip.py:163`
- **Problema**: FK sin índice (Postgres no indexa FKs automáticamente). Hoy no hay ninguna query que filtre `trips` por `seat_layout_id`, así que el impacto es teórico (borrar un `seat_layout` requeriría un scan de `trips`, pero no existe endpoint de borrado de layouts).
- **Impacto**: **bajo**. Se incluye por completitud referencial; agregarlo es defensivo y barato.
- **Fix (opcional)**: `Index("idx_trips_seat_layout_id", "seat_layout_id")`.

### 1.5 Índices ya correctos (verificados, no requieren acción)
- `idx_seats_trip_status (trip_id, status)` cubre `_available_counts`, `_count_sold`, `get_available_seats`.
- `idx_bookings_trip`, `idx_bookings_status`, `idx_bookings_expires` (parcial) cubren `expire_bookings_job` y filtros de admin.
- `idx_passengers_booking`, `UniqueConstraint(seat_id)` cubren `_seat_ids_for_booking` y el join de pasajero↔asiento.
- `idx_price_tranches_trip_type`, `idx_route_stops_route_id`, `idx_trip_stop_overrides_trip_id`, `idx_seat_layout_seats_layout` correctos.

✅ Sección 1 completada — 4 hallazgos (1 medio-alto, 2 medios, 1 bajo)

---

## 2. Cache

### 2.1 `GET /stops` se consulta en cada carga del home
- **Archivo**: `frontend/src/components/search/SearchBar.tsx:67-94` (`useEffect` → `getStops`), montado desde `frontend/src/components/sections/Hero.tsx:138` → `frontend/src/app/page.tsx`
- **Problema**: el `SearchBar` vive en el Hero de la home (la página de mayor tráfico) y hace `fetch(/stops)` en cada montaje. `stops` es catálogo casi estático (cambia solo cuando un admin da de alta/baja una parada). No hay ninguna capa de cache: cada visita al home pega al backend.
- **Impacto**: **alto** por frecuencia (home = máximo volumen de hits). Costo por operación bajo, pero multiplicado por todo el tráfico anónimo.
- **Fix**:
  - Cliente/SSR: mover la carga de `stops` a un fetch con cache de Next (`fetch(url, { next: { revalidate: 3600 } })`) o resolverlo en el server component y pasarlo como prop, en vez del `useEffect` en cliente.
  - Backend: agregar `Cache-Control: public, max-age=...` a `GET /stops` y `GET /stops/{id}/valid-destinations`.
  - Invalidación: TTL largo (horas); invalidar/revalidar ante mutaciones en `POST/PATCH/DELETE /admin/stops`.
  - Nivel recomendado: **cliente (Next fetch cache) + HTTP header**, TTL 1 h.

### 2.2 `QueryClient` del admin sin `staleTime` → refetch de datos casi estáticos
- **Archivo**: `frontend-admin/src/main.tsx:10` (`new QueryClient()`)
- **Problema**: sin `defaultOptions`, React Query usa `staleTime: 0`: toda query se considera stale y refetcha en cada montaje y en cada focus de ventana. `getSeatLayouts` (`["admin","seat-layouts"]`) y `getRoutes` son prácticamente inmutables y se consultan desde `TripsPage`, `TripDetailPage`, `EditTripDialog`, `CreateBatchTripsDialog`, etc. Navegar entre pantallas re-consulta catálogo que no cambió.
- **Impacto**: **medio-alto**. Frecuencia alta (cada navegación/refocus del panel), costo por request bajo pero evitable por completo.
- **Fix**: definir defaults y elevar el TTL de catálogo:
  ```ts
  new QueryClient({ defaultOptions: { queries: {
    staleTime: 30_000, refetchOnWindowFocus: false } } })
  ```
  y para `seat-layouts`/`routes` un `staleTime` mayor (p. ej. 5-10 min) por query. Invalidación: ya se hace `invalidateQueries` en las mutaciones correspondientes, así que subir `staleTime` es seguro.

### 2.3 Disponibilidad y precios recalculados por request en el listado público
- **Archivo**: `backend/app/routers/trips.py:191-255` (`_available_counts`, `_current_prices`), invocados desde `list_trips` (`:85-86`) y `get_trip` (`:118-119`)
- **Problema**: cada `GET /trips` y `GET /trips/{id}` recomputa conteo de asientos disponibles y resolución de tramo de precio con agregaciones sobre `seats`. El docstring de `list_trip_seats` (`:140-145`) ya aclara que el dato "no garantiza disponibilidad al momento de compra", así que **para el listado** es aceptable un cache corto.
- **Impacto**: **medio**. Alta frecuencia en resultados de búsqueda; las queries ya están batcheadas por `IN (trip_ids)` (no son N+1), pero se repiten idénticas entre usuarios que buscan lo mismo.
- **Fix**: cache de corta duración (TTL 10-30 s) del resultado de `list_trips` por combinación de filtros, a nivel app (p. ej. `functools`/Redis) o `Cache-Control` breve. **No cachear en el flujo de compra**: `create_booking`/`get_current_price` deben leer conteos frescos (riesgo activo de doble venta — ver CLAUDE.md). Invalidación por TTL corto, sin invalidación explícita.

### 2.4 `TripDetailPage` re-consulta un trip que ya está en el cache del listado
- **Archivo**: `frontend-admin/src/pages/TripDetailPage.tsx:32-36` vs. `frontend-admin/src/pages/TripsPage.tsx:74-77`
- **Problema**: `getAdminTrips()` ya trae el `AdminTripRead` completo (incluye `route` y `price_tranches_summary`); al entrar al detalle se hace `getAdminTrip(id)` con otra query key, ignorando el dato ya cacheado.
- **Impacto**: **bajo**. Un request extra por navegación a detalle.
- **Fix**: sembrar el detalle desde el listado con `initialData`/`placeholderData` leyendo `queryClient.getQueryData(["admin","trips"])`, dejando que refetchee en background.

✅ Sección 2 completada — 4 hallazgos (1 alto, 1 medio-alto, 1 medio, 1 bajo)

---

## 3. Payloads

### 3.1 `GET /admin/bookings` devuelve pasajeros completos (PII) para mostrar solo un conteo
- **Archivo**: schema `backend/app/schemas/admin.py:171-187` (`AdminBookingRead.passengers`) · endpoint `backend/app/routers/admin.py:113-133` · consumo `frontend-admin/src/pages/BookingsPage.tsx:123` (`booking.passengers.length`)
- **Problema**: el listado carga `selectinload(Booking.passengers)` y serializa la lista completa de `PassengerRead` (nombre, apellido, DNI, email, teléfono) por cada una de hasta **500** reservas (`.limit(500)`), pero la tabla del listado usa únicamente `passengers.length`. Es payload grande + exposición innecesaria de PII en tránsito.
- **Impacto**: **alto**. Pantalla principal del panel, crece con las ventas; payload y (de)serialización proporcionales a pasajeros×reservas.
- **Fix**: schema de listado liviano sin `passengers`, con un `passenger_count: int` calculado por agregación (`func.count`) o subquery, y quitar el `selectinload`. Reservar `AdminBookingRead` completo para `GET /admin/bookings/{id}`.

### 3.2 `CompraContent` re-descarga todos los asientos solo para mapear número→id
- **Archivo**: `frontend/src/app/compra/[tripId]/CompraContent.tsx:111-144`
- **Problema**: para armar el body del `POST /bookings` necesita los `seat_id`, así que hace `fetch(/trips/{tripId}/seats)` y trae los ~60 `SeatRead` completos para construir un mapa `seat_number → id`. `AsientosContent` (paso anterior) **ya tenía** esos `SeatRead` con sus ids, pero reenvía solo los `seat_number` por query string (`AsientosContent.tsx:178-183`), forzando el re-fetch.
- **Impacto**: **medio**. Ocurre en cada compra; trae payload completo cuando bastan los ids de los asientos seleccionados. Es también una llamada duplicada (ver 4.1).
- **Fix**: pasar los `seat_id` seleccionados por query string desde `AsientosContent` y eliminar el fetch de `CompraContent`. Si se quiere conservar el fetch por robustez, proyectar solo `id, seat_number`.

### 3.3 `TripRead` incluye `available_seats_count` que el paso de asientos no usa
- **Archivo**: schema `backend/app/schemas/trips.py:35-53` · consumo `frontend/src/app/asientos/[tripId]/AsientosContent.tsx:59-87` (usa `trip.route` y `current_price_*`, no `available_seats_count`)
- **Problema**: `getTrip` (usado por la pantalla de asientos) ejecuta `_available_counts` para poblar `available_seats_count`, campo que esa vista no consume (la disponibilidad real la da `GET /trips/{id}/seats`).
- **Impacto**: **bajo**. Una agregación de más por carga de la pantalla de asientos.
- **Fix**: bajo prioridad; si se separa el contrato, un `TripSummaryRead` sin conteos para esta vista evita la query. No justifica romper el contrato hoy.

✅ Sección 3 completada — 3 hallazgos (1 alto, 1 medio, 1 bajo)

---

## 4. Rendering

### 4.1 Llamada duplicada a `GET /trips/{id}/seats` en el flujo de compra
- **Archivo**: `frontend/src/app/asientos/[tripId]/AsientosContent.tsx:89-117` y `frontend/src/app/compra/[tripId]/CompraContent.tsx:111-144`
- **Problema**: el mismo endpoint se consume dos veces en pasos consecutivos del mismo flujo (selección de asientos → datos de pasajeros), sin cache compartido entre páginas (el frontend público no usa React Query).
- **Impacto**: **medio**. Un round-trip extra garantizado por compra.
- **Fix**: propagar los `seat_id` por query param desde `AsientosContent` (que ya los tiene) y eliminar el segundo fetch. Ver 3.2.

### 4.2 `ResultadosContent` recomputa filtros y props de card en cada render; `TripCard` no está memoizado
- **Archivo**: `frontend/src/app/resultados/ResultadosContent.tsx:201` (`applyFilters` inline), `:70-110` (`mapTripToCardProps`), `:276-284` (map a `TripCard`) · componente `frontend/src/components/travel/TripCard.tsx`
- **Problema**: `filteredTrips = applyFilters(trips, filters)` y `mapTripToCardProps(trip)` (que además construye arrays nuevos de `amenities`/`seatTypes` por card) corren en cada render. Al togglear un filtro se re-mapea toda la lista y **todos** los `TripCard` se re-renderizan porque reciben objetos/arrays nuevos y no hay `React.memo`.
- **Impacto**: **medio** (crece con la cantidad de resultados). No hay `useMemo`/`useCallback` en el frontend público salvo el carousel de shadcn.
- **Fix**: `const filteredTrips = useMemo(() => applyFilters(trips, filters), [trips, filters])`; memoizar el mapeo; envolver `TripCard` en `React.memo`. Las `amenities` hardcodeadas (`:100-106`) pueden ser una constante módulo-nivel para no re-crear el array.

### 4.3 `TripsPage` reconstruye y ordena `routeGroups` en cada render
- **Archivo**: `frontend-admin/src/pages/TripsPage.tsx:223-242`
- **Problema**: el `reduce` que agrupa viajes por ruta + el `forEach(...).sort(...)` corren en cada render, incluyendo renders disparados por estado no relacionado (abrir diálogos, `expandedRoutes`, `tripToDelete`, etc.). Con muchos viajes (creación en serie genera decenas) es trabajo repetido en cada interacción.
- **Impacto**: **medio**. Crece con el volumen de viajes; el panel no usa `useMemo` en ningún lado.
- **Fix**: `const routeGroups = useMemo(() => { ... }, [trips])`.

### 4.4 Borrado en lote de viajes con requests seriales
- **Archivo**: `frontend-admin/src/pages/TripsPage.tsx:123-139` (`handleBatchDelete`)
- **Problema**: `for (const trip of futureTrips) { await deleteTrip(trip.id) }` ejecuta N `DELETE` en serie. Para una ruta con muchos viajes futuros, la latencia total es N × RTT.
- **Impacto**: **medio**. Operación admin puntual, pero puede tornarse lenta con series largas.
- **Fix**: `Promise.all` con concurrencia acotada (chunks de ~5-8) preservando la recolección de `skipped` por 409. (Nota: el **alta** en serie de `CreateBatchTripsDialog.tsx:198-218` es intencionalmente secuencial para mostrar progreso y frenar ante error — dejar como está.)

### 4.5 `BookingsPage`: hasta 500 filas sin paginación ni virtualización
- **Archivo**: `frontend-admin/src/pages/BookingsPage.tsx:107-139` · backend `backend/app/routers/admin.py:120-126` (`.limit(500)`, sin paginación — deuda conocida #4)
- **Problema**: la tabla renderiza todas las reservas devueltas (tope defensivo 500) en un solo DOM sin virtualización. A medida que se acerca al tope, el render y el payload (ver 3.1) escalan.
- **Impacto**: **medio**, creciente con las ventas.
- **Fix**: paginación server-side (`limit`/`offset` o keyset por `created_at`) + virtualización de filas (o simplemente paginar la UI). Complementa 3.1.

### 4.6 `Map` recomputado por render en `AsientosContent` (bajo)
- **Archivo**: `frontend/src/app/asientos/[tripId]/AsientosContent.tsx:119` (`seatsByNumber = new Map(...)`)
- **Problema**: el `Map` de ~60 asientos se reconstruye en cada render (selección de asiento, cambio de piso). Volumen chico y acotado.
- **Impacto**: **bajo**.
- **Fix**: `useMemo(() => new Map(...), [seats])`. Menor.

✅ Sección 4 completada — 6 hallazgos (4 medios, 2 bajos)

---

## 5. Top Bottlenecks

Priorizados por **frecuencia de hit × costo por operación × volumen esperado en producción**.

### #1 — `GET /stops` sin cache en el home
- **Archivo/módulo**: `frontend/src/components/search/SearchBar.tsx:67-94` (+ backend `GET /stops`)
- **Impacto**: **alto**. La home es la página de mayor tráfico; cada visita anónima dispara un fetch de catálogo estático. Frecuencia máxima × dato inmutable = desperdicio puro y carga base innecesaria sobre el backend.
- **Fix**: cachear en el server component / Next fetch cache (`revalidate: 3600`) + `Cache-Control` en el endpoint; revalidar ante mutaciones de `/admin/stops`. (Sección 2.1)

### #2 — `GET /admin/bookings`: PII completa + 500 filas sin paginar
- **Archivo/módulo**: `backend/app/routers/admin.py:113-133` + `backend/app/schemas/admin.py:171-187` + `frontend-admin/src/pages/BookingsPage.tsx`
- **Impacto**: **alto**. Pantalla central del panel, crece con las ventas. Serializa pasajeros completos (DNI/email/teléfono) de hasta 500 reservas para renderizar solo un conteo, y la tabla no vira­liza. Payload, DB y render escalan juntos.
- **Fix**: schema de listado sin `passengers` + `passenger_count` agregado; paginación server-side + virtualización. (Secciones 3.1 y 4.5)

### #3 — Refetch de catálogo casi estático en el panel (`staleTime: 0`)
- **Archivo/módulo**: `frontend-admin/src/main.tsx:10` (afecta `seat-layouts`, `routes`, `trips`)
- **Impacto**: **medio-alto**. Cada navegación y cada refocus del panel re-consulta `seat-layouts`/`routes` (inmutables). Frecuencia altísima durante una sesión de trabajo del admin.
- **Fix**: `defaultOptions.queries.staleTime` global + `staleTime` alto por query de catálogo + `refetchOnWindowFocus: false`. La invalidación explícita ya existe en las mutaciones. (Sección 2.2)

### #4 — Sequential scan de `bookings.mp_payment_id` en el webhook de contracargos
- **Archivo/módulo**: `backend/app/routers/payments.py:249-251`
- **Impacto**: **medio-alto**. Seq scan O(n) sobre la tabla de mayor crecimiento, dentro de un webhook de MercadoPago con presupuesto de latencia acotado. Frecuencia baja pero costo creciente e imparable.
- **Fix**: índice parcial `idx_bookings_mp_payment_id ... WHERE mp_payment_id IS NOT NULL`. (Sección 1.1)

### #5 — Cron de recordatorio/feedback re-escanea todas las reservas confirmadas
- **Archivo/módulo**: `backend/tasks/reminders.py:81-90` y `:128-136`
- **Impacto**: **medio**, creciente y perpetuo. Corre cada hora; el conjunto de `confirmed` nunca se archiva, así que el costo por corrida sube linealmente con las ventas históricas para encontrar las pocas no notificadas.
- **Fix**: índices parciales `WHERE status='confirmed' AND reminder_sent=false` (y feedback) sobre `trip_id`. (Sección 1.3)

✅ Sección 5 completada — 5 bottlenecks priorizados
