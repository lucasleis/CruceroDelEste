# AGENTS.md — frontend (Next.js · sitio público + flujo de compra)

> Leer CLAUDE.md en la raíz del monorepo primero. Este archivo agrega las reglas específicas del frontend público.

---

## Stack

- Next.js App Router, TypeScript
- Tailwind v4 instalado y en uso en todo el proyecto — usar clases de utilidad de Tailwind
- Estilos: Tailwind + CSS custom properties de src/styles/tokens.css donde aplique
- Cero npm packages nuevos sin aprobación explícita de Lucas
- shadcn/ui está instalado pero se reserva para frontend-admin. NUNCA usarlo en el frontend público.

---

## Patrón obligatorio: server component + client component

Toda página con hooks o interactividad sigue este patrón sin excepción:

- page.tsx — server component, wrappea el client component en Suspense
- *Content.tsx — client component con "use client", contiene toda la lógica

Referencia: src/app/resultados/page.tsx + src/app/resultados/ResultadosContent.tsx

Este patrón es obligatorio porque useSearchParams() requiere Suspense boundary en Next.js App Router.

---

## Estructura de carpetas relevante

src/
├── app/                    ← rutas del flujo de compra y páginas de contenido
├── components/
│   ├── core/               ← componentes base: BlueButton, Heading, BodyText, etc.
│   ├── navigation/         ← Navbar
│   ├── search/             ← SearchBar, CityInput, DateInput, PassengerSelector, TripTypeSelector
│   ├── travel/             ← TripCard, FilterPanel, SearchSummaryBar, SeatTypeBadge, AmenityBadge
│   ├── sections/           ← secciones de landing: Hero, Nosotros, Beneficios, etc.
│   └── ui/                 ← shadcn/ui (NO usar en frontend público)
├── styles/
│   └── tokens.css          ← única fuente de verdad para colores, tipografía, sombras, radios
└── types/
    └── trips.ts            ← StopRead y tipos compartidos. Importar desde aquí, no desde componentes.

Qué rutas existen hoy dentro de `app/` y en qué estado está cada una: no lo listes acá, se desactualiza. Mirá el directorio o el Document de Linear (ver abajo).

---

## El pago no es una página de este frontend

`/compra/[tripId]` termina en un redirect (`window.location.href = data.init_point`) al checkout hosteado de MercadoPago. El pago en sí ocurre ahí, no en una ruta propia. **No va a existir una ruta `/pago` en este frontend** — no es que esté pendiente, es que no aplica a esta arquitectura. Si estás buscando dónde se maneja el pago, es el punto donde se pide `init_point` al backend y se redirige, no una página nueva a construir.

Navegación entre pasos del flujo vía query params:
- /asientos/[tripId]?passengers=2
- /compra/[tripId]?seats=1A,2B&passengers=2

---

## Componentes clave — resumen rápido

TripCard — components/travel/TripCard.tsx — Card de resultado. Borde izquierdo por disponibilidad. priceFrom acepta null.
FilterPanel — components/travel/FilterPanel.tsx — Panel de filtros de búsqueda.
SearchSummaryBar — components/travel/SearchSummaryBar.tsx — Barra de resumen de búsqueda activa
CityInput — components/search/CityInput.tsx — Selector origen/destino. Recibe stops como prop. Filtra AR↔PY.
BlueButton — components/core/BlueButton.tsx — Botón primario. Variantes: navy, blue. Usar para acciones principales.

---

## Regla de negocio crítica — AR↔PY

No se puede vender un tramo dentro del mismo país (cabotaje extranjero prohibido). Cada parada tiene country: "AR" | "PY". Si el origen es AR, el destino solo puede ser PY, y viceversa.

Enforced en:
- CityInput — filtrado dinámico en dropdown de destino
- SearchBar — llama GET /stops/{id}/valid-destinations al seleccionar origen
- Backend — validación en el endpoint de trips

---

## Endpoints del backend que consume el frontend

GET /stops — SearchBar, carga todas las paradas al montar
GET /stops/{id}/valid-destinations — SearchBar, filtra destinos válidos al seleccionar origen
GET /trips — ResultadosContent, búsqueda de viajes con filtros
GET /trips/{tripId}/seats — AsientosContent, lista de asientos con estado y tipo

Base URL: process.env.NEXT_PUBLIC_API_URL (definir en .env.local, no commitear)

---

## Reglas del proceso

- Propuesta antes de código — anunciá qué vas a hacer y esperá aprobación explícita
- Un ticket por sesión — scope acotado
- No toques archivos fuera del scope del ticket
- Después de cada archivo: ✅ [nombre] — [descripción en una línea]
- Si algo es ambiguo: detenete y consultá. No asumas.
- Claude Code nunca mergea a main — Lucas revisa y commitea manualmente

---

## Dónde está el estado del frontend

Este archivo no lleva qué páginas están construidas, qué componentes están conectados, ni el detalle de implementaciones puntuales (selector de asientos, etc.) — todo eso vive en el **Document de Linear `017e9e10-f516-4f1d-8fee-8a08e7cbd03c`** ("CLAUDE.md — Expreso Río Paraná · Monorepo"). Es la fuente — no lo dupliques acá.

Si este archivo y Linear se contradicen, gana Linear. Si Linear y el código se contradicen, gana el código.
