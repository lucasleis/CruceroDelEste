# AGENTS.md — frontend (Next.js · sitio público + flujo de compra)

> Leer CLAUDE.md en la raíz del monorepo primero. Este archivo agrega las reglas específicas del frontend público.

---

## Stack

- Next.js App Router, TypeScript
- Sin Tailwind. Sin módulos CSS. Sin clases externas.
- Estilos: inline styles únicamente + CSS custom properties de src/styles/tokens.css
- Cero hex hardcodeados — solo var(--color-*), var(--font-*), var(--shadow-*), var(--radius-*), var(--duration-*)
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
├── app/
│   ├── resultados/         ← página de resultados de búsqueda (construida)
│   ├── compra/[tripId]/    ← formulario de datos de pasajeros (construido)
│   ├── landing-v2/         ← landing v2 (construida)
│   └── [secciones de preview: hero, navbar, footer, etc.] ← solo desarrollo, no producción
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

---

## Flujo de compra (estado actual)

/resultados         → lista de viajes (construido)
/asientos/[tripId]  → selector de asientos (construido — LLE-145)
/compra/[tripId]    → formulario de datos de pasajeros (construido)
/pago               → integración MercadoPago (pendiente)
/confirmacion       → pantalla de confirmación (pendiente)

Navegación entre pasos vía query params:
- /asientos/[tripId]?passengers=2
- /compra/[tripId]?seats=1A,2B&passengers=2

---

## Componentes clave — resumen rápido

TripCard — components/travel/TripCard.tsx — Card de resultado. Borde izquierdo por disponibilidad. priceFrom acepta null.
FilterPanel — components/travel/FilterPanel.tsx — Visual completo, onFilterChange desconectada (LLE-126)
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

## Selector de asientos — implementado (LLE-145)

/asientos/[tripId] está implementado. Layout real del cliente cargado (Standard - 2 Pisos, 12 Cama Ejecutivo + 48 Semi Cama).

Componente: src/app/asientos/[tripId]/AsientosContent.tsx
- PLANTA_ALTA y PLANTA_BAJA hardcodeados como grids (string | null)[][]
- Fetch: GET /trips/{tripId}/seats con el mismo patrón de ResultadosContent.tsx
- Selección múltiple via useState<Set<string>>
- Navegación a /compra/[tripId]?seats=NUMBERS&passengers=N al confirmar

---

## Reglas del proceso

- Propuesta antes de código — anunciá qué vas a hacer y esperá aprobación explícita
- Un ticket por sesión — scope acotado
- No toques archivos fuera del scope del ticket
- Después de cada archivo: ✅ [nombre] — [descripción en una línea]
- Si algo es ambiguo: detenete y consultá. No asumas.
- Claude Code nunca mergea a main — Lucas revisa y commitea manualmente
