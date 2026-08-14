# CLAUDE.md — frontend-admin · Expreso Río Paraná

> Panel de administración interno. Leer este archivo y el CLAUDE.md raíz antes de escribir cualquier línea de código.

---

## Tu rol en este proyecto

Sos un senior frontend engineer. Implementás lo que se te pide, sin más. No agregás features, abstracciones ni refactors no solicitados. Cada propuesta de cambio debe ser aprobada antes de implementarse.

---

## Stack

| Componente | Elección |
|------------|----------|
| Framework | React 18 + Vite |
| Lenguaje | TypeScript |
| Routing | React Router v6 |
| Estado servidor | TanStack React Query v5 |
| UI components | shadcn/ui |
| Estilos | Tailwind CSS v4 |
| Toasts | Sonner (richColors activado) |
| HTTP client | Axios (via `src/api/client.ts`) |

---

## Setup de entorno

Ver `/DEVELOPMENT.md` — sección "3. Setup del frontend-admin".

Variable de entorno requerida:
```
VITE_API_BASE_URL=http://localhost:8000
```

> ⚠️ Vite HMR puede fallar en tomar cambios. Usar Ctrl+Shift+R (hard refresh) como fallback. Si persiste, reiniciar el dev server.

---

## Primera tarea al iniciar una sesión nueva

1. Leer este archivo completo.
2. Leer el CLAUDE.md raíz.
3. Leer `src/types/trips.ts` — tipos TypeScript del proyecto.
4. Leer `src/lib/tripUtils.ts` — constantes y helpers compartidos.
5. Leer `frontend-admin/ADMIN_DESIGN.md` — design system, paleta, componentes.
6. Identificar el ticket a implementar y anunciar qué vas a hacer antes de escribir código.

No leer todos los archivos de `src/pages/` ni `src/api/` al inicio — leer solo los relevantes al ticket.

---

## Estructura de carpetas

```
frontend-admin/
├── src/
│   ├── api/              ← funciones de llamada a la API, una por dominio
│   │   ├── client.ts     ← instancia axios, withCredentials:true (cookie httpOnly) + redirect a /login en 401
│   │   ├── auth.ts
│   │   ├── bookings.ts
│   │   ├── chargebacks.ts
│   │   ├── priceTranches.ts
│   │   ├── refunds.ts
│   │   ├── routes.ts
│   │   ├── stops.ts
│   │   └── trips.ts
│   ├── components/
│   │   ├── AdminLayout.tsx   ← layout con sidebar
│   │   ├── Sidebar.tsx       ← navegación principal
│   │   └── ui/               ← componentes shadcn/ui
│   ├── lib/
│   │   └── tripUtils.ts      ← STATUS_BADGE, BOOKING_STATUS_BADGE, SEAT_TYPE_LABEL,
│   │                            TRIP_STATUS_LABEL, dateFormatter, formatDate
│   ├── pages/
│   │   ├── LoginPage.tsx
│   │   ├── TripsPage.tsx         ← /viajes
│   │   ├── TripDetailPage.tsx    ← /viajes/:tripId
│   │   ├── ConfiguracionPage.tsx ← /configuracion (Catálogo: stops + routes)
│   │   ├── BookingsPage.tsx      ← /reservas
│   │   ├── BookingDetailPage.tsx ← /reservas/:bookingId
│   │   ├── RefundsPage.tsx       ← /reembolsos
│   │   └── ChargebacksPage.tsx   ← /contracargos
│   ├── types/
│   │   └── trips.ts          ← todos los tipos TypeScript del proyecto
│   ├── main.tsx              ← QueryClientProvider + BrowserRouter + Toaster
│   └── router.tsx            ← todas las rutas con ProtectedRoute + AdminLayout
├── ADMIN_DESIGN.md           ← design system (fuente de verdad de diseño)
├── CLAUDE.md                 ← este archivo
└── .env.example
```

---

## Convenciones de código

- **Páginas** en `src/pages/` — un componente por archivo, export default.
- **API calls** en `src/api/` — nunca inline en componentes. Seguir el patrón de `src/api/trips.ts`.
- **Tipos TypeScript** en `src/types/trips.ts` — reflejan exactamente los schemas del backend. No redefinir tipos en otros archivos.
- **Constantes compartidas** en `src/lib/tripUtils.ts` — STATUS_BADGE, formatDate, etc. No duplicar en páginas individuales.
- **Nombres:** PascalCase para componentes, camelCase para hooks y utils.

---

## Patrones establecidos — seguir siempre

### API client
```ts
import apiClient from "./client";
// apiClient es una instancia axios con withCredentials:true — la sesión
// viaja en una cookie httpOnly (admin_token), no hay token en JS-accessible
// storage. El interceptor de response redirige a /login en 401. (LLE-334)
```

### React Query
```ts
// Query keys siguen este formato:
["admin", "trips"]                          // listado
["admin", "trips", tripId]                  // detalle
["admin", "trips", tripId, "price-tranches"] // sub-recurso
["admin", "bookings", { status: filter }]   // con filtro
```

### Manejo de errores de API
```ts
const status = (error as { response?: { status?: number } })?.response?.status;
if (status === 409) { /* conflicto */ }
```

### Timezone
Todas las fechas se muestran en `America/Buenos_Aires`. Usar `formatDate` de `tripUtils.ts`. Para construir ISO strings al enviar al backend: `${date}T${time}:00-03:00`.

### SelectValue con label resuelto
Los `Select` de shadcn muestran el value crudo. Usar este patrón para mostrar el label:
```tsx
<SelectValue>
  {selectedId ? items.find(i => i.id === selectedId)?.name : "Seleccionar"}
</SelectValue>
```

---

## Design system — resumen ejecutivo

Ver `ADMIN_DESIGN.md` para la especificación completa. Puntos críticos:

- **Paleta:** primary `#6B7FD4`, danger `#E87B7B`, success `#6BBF8E`, neutral-900 `#1A1A2E`
- **Layout:** `max-w-6xl mx-auto px-6 py-8`
- **Table headers:** `className="bg-[#E8EBFA] text-xs font-medium uppercase tracking-wide text-[#4A4A6A]"`
- **Table rows:** `py-3` mínimo
- **shadcn/ui instalados:** Button, Table, Dialog, Badge, Input, Select, Skeleton, Sonner
- **NUNCA** construir equivalentes de shadcn desde cero

---

## Rutas del admin panel

El sidebar muestra: Dashboard, Viajes, Reservas, Reembolsos, Contracargos, Catálogo — ver `src/router.tsx` y `src/components/Sidebar.tsx` para las rutas exactas y cuáles están implementadas vs. placeholder.

---

## Endpoints del backend — referencia rápida

El invariante de superficie HTTP del backend (cuántos endpoints hay, públicos vs. protegidos) se puede recalcular en cualquier momento — no le creas a la tabla de abajo sin correr esto en `backend/`:

```
grep -rhoE "^@(router|stops_router)\.(get|post|put|patch|delete)\(" app/routers/*.py | wc -l
```

Base URL: `VITE_API_BASE_URL` (default: `http://localhost:8000`)

### Auth
- `POST /admin/login` → `{ ok: true }` (setea cookie httpOnly `admin_token`; el body no lleva el token — LLE-334)

### Trips
- `GET /admin/trips` → `AdminTripRead[]`
- `GET /admin/trips/:id` → `AdminTripRead`
- `POST /admin/trips` → `AdminTripRead`
- `PATCH /admin/trips/:id` → `AdminTripRead`
- `DELETE /admin/trips/:id` → 204

### Price Tranches
- `GET /admin/trips/:id/price-tranches` → `PriceTrancheRead[]`
- `POST /admin/trips/:id/price-tranches` → `PriceTrancheRead`
- `DELETE /admin/trips/:id/price-tranches/:trancheId` → 204

### Catálogo
- `GET /stops` → `StopRead[]` ⚠️ endpoint público, no /admin/stops
- `POST /admin/stops` → `StopRead`
- `DELETE /admin/stops/:id` → 204
- `GET /admin/routes` → `RouteRead[]`
- `POST /admin/routes` → `RouteRead`
- `DELETE /admin/routes/:id` → 204
- `GET /admin/seat-layouts` → `SeatLayoutRead[]`

### Reservas
- `GET /admin/bookings` → `AdminBookingRead[]` (filtros: booking_status, trip_id)
- `GET /admin/bookings/:id` → `AdminBookingRead`

### Reembolsos
- `GET /admin/refund-requests` → `RefundRequestRead[]` (filtros: booking_id, window_valid)

### Contracargos
- `GET /admin/chargebacks` → `ChargebackRead[]` (filtros: status, booking_id)

---

## Errores de API conocidos

| Endpoint | Status | Detail | Mensaje UI |
|----------|--------|--------|------------|
| DELETE /admin/trips/:id | 409 | trip_has_bookings | "No se puede eliminar: el viaje tiene reservas asociadas." |
| PATCH /admin/trips/:id | 409 | trip_has_confirmed_bookings | "No se puede cancelar: el viaje tiene reservas confirmadas." |
| DELETE /admin/stops/:id | 409 | stop_in_use | "No se puede eliminar: la parada está siendo usada en una ruta." |
| POST /admin/stops | 409 | stop_name_conflict | "Ya existe una parada con ese nombre." |
| DELETE /admin/routes/:id | 409 | route_in_use | "No se puede eliminar: la ruta tiene viajes asociados." |
| POST /admin/routes | 409 | route_already_exists | "Esta ruta ya existe." |
| POST /admin/routes | 422 | international_route_required | "La ruta debe ser internacional (AR ↔ PY)." |
| POST /admin/trips | 422 | departure_in_past | "La fecha de salida no puede ser en el pasado." |
| POST /admin/trips | 422 | arrival_before_departure | "La llegada debe ser posterior a la salida." |
| POST /admin/trips/:id/price-tranches | 409 | tranche_overlap | "Este tramo se superpone con uno existente." |

---

## Dónde está el estado del admin panel

Este archivo no lleva qué pantallas están implementadas, deuda técnica ni estado de cada ruta — todo eso vive en el **Document de Linear `017e9e10-f516-4f1d-8fee-8a08e7cbd03c`** ("CLAUDE.md — Expreso Río Paraná · Monorepo"). Es la fuente — no lo dupliques acá.

Si este archivo y Linear se contradicen, gana Linear. Si Linear y el código se contradicen, gana el código.