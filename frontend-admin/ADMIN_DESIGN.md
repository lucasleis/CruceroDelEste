# ADMIN_DESIGN.md — Panel de Administración · Expreso Río Paraná

> Fuente de verdad de diseño para `frontend-admin/`. Leer antes de crear cualquier componente o página.

## Producto

Panel interno para operadores de Expreso Río Paraná. Permite administrar todas las variables operativas: viajes (origen, destino, horarios, asientos), precios por tramo, reservas, solicitudes de reembolso y contracargos.

## Principios de UX

- **Claridad ante todo**: cada acción debe ser obvia sin necesidad de explicación
- **Una tarea por pantalla**: no sobrecargar vistas con múltiples flujos
- **Feedback inmediato**: toda acción destructiva pide confirmación, toda operación muestra estado (loading, éxito, error)
- **Densidad moderada**: tablas con padding generoso (py-3 mínimo por fila), nunca comprimir información

## Paleta de colores

Derivada de la identidad de Expreso Río Paraná en tono pastel para uso prolongado en pantalla.

| Token | Hex | Uso |
|-------|-----|-----|
| primary | #6B7FD4 | Botones primarios, links, highlights |
| primary-light | #E8EBFA | Fondos de secciones activas, badges |
| danger | #E87B7B | Acciones destructivas, errores |
| danger-light | #FDEAEA | Fondos de alertas de error |
| success | #6BBF8E | Confirmaciones, estados positivos |
| success-light | #E8F5EE | Fondos de alertas de éxito |
| neutral-900 | #1A1A2E | Texto principal |
| neutral-600 | #4A4A6A | Texto secundario |
| neutral-100 | #F4F5FB | Fondo general de la app |
| white | #FFFFFF | Cards, modales, tablas |

## Tipografía

- Font: Inter (Google Fonts)
- Títulos de página: `text-2xl font-semibold text-neutral-900`
- Subtítulos / labels de sección: `text-sm font-medium text-neutral-600 uppercase tracking-wide`
- Cuerpo / celdas de tabla: `text-sm text-neutral-900`
- Texto secundario / metadata: `text-xs text-neutral-600`

## Componentes base (shadcn/ui)

Usar siempre estos componentes. Nunca construir equivalentes desde cero.

- **Button** — variantes: default (primary), destructive (danger), outline, ghost
- **Table** — para listados de viajes, reservas, contracargos
- **Dialog** — para confirmaciones destructivas y formularios de creación
- **Badge** — para estados (booking_status, trip_status, chargeback_status)
- **Input / Select / DatePicker** — para formularios
- **Toast (Sonner)** — para feedback de operaciones
- **Skeleton** — para estados de carga

## Layout general

- Sidebar fijo a la izquierda (240px) con navegación principal
- Área de contenido: `max-w-6xl mx-auto px-6 py-8`
- Header por página: título a la izquierda + acción primaria a la derecha (ej: "Nuevo viaje")

## Badges de estado

| Valor API | Color |
|-----------|-------|
| trip: scheduled | Azul (primary-light) |
| trip: completed | Verde (success-light) |
| trip: cancelled | Rojo (danger-light) |
| booking: confirmed | Verde |
| booking: pending_payment | Amarillo |
| booking: expired | Gris |
| chargeback: in_process | Amarillo |
| chargeback: settled | Verde |
| chargeback: reimbursed | Azul |

## Convenciones de código

- Cada página en `src/pages/` es un componente React independiente
- Llamados a la API van en `src/api/`, nunca inline en componentes
- Tipos TypeScript en `src/types/` reflejan exactamente los schemas del backend
- Nombres: PascalCase para componentes, camelCase para hooks y utils
