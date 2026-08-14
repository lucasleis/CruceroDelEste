> Este archivo es el briefing global del monorepo. Cada sub-proyecto tiene su propio CLAUDE.md con instrucciones específicas. Leer este archivo primero, luego el CLAUDE.md del directorio en el que vayas a trabajar.

---

## Qué es este proyecto

Sistema de venta de pasajes online para **Expreso Río Paraná**, empresa argentina de transporte internacional con más de 50 años operando rutas a Paraguay. El objetivo es una plataforma propia que complemente los canales actuales (Plataforma 10, Central de Pasajes), permitiendo venta directa con control total sobre precios, datos y experiencia de usuario.

> ⚠️ El proyecto fue originalmente presupuestado para **Crucero del Este** (BA–Rosario). A partir de la segunda reunión el cliente confirmó que el proyecto es para **Expreso Río Paraná** (BA–Asunción, servicio internacional). Toda referencia a Crucero del Este en código, variables o comentarios debe ser reemplazada por Expreso Río Paraná.

---

## Estructura del monorepo

```
CruceroDelEste/           ← nombre del repo (histórico, no modificar)
├── backend/              ← FastAPI + PostgreSQL. Ver backend/CLAUDE.md
├── frontend/             ← Next.js, sitio público + flujo de compra. Ver frontend/AGENTS.md
├── frontend-admin/       ← React + Vite, panel de administración. Ver frontend-admin/CLAUDE.md
├── specs/                ← Documentación del proyecto
│   ├── Crucero Del Este - Presupuesto.docx
│   └── Crucero del Este - Modulos Extras.txt
└── CLAUDE.md             ← este archivo
```

---

## Frontend — Componentes de travel

Ubicados en `frontend/src/components/travel/`.

| Componente | Archivo | Descripción |
|------------|---------|-------------|
| AmenityBadge | AmenityBadge.tsx | Ícono de servicio a bordo. Modos: icon-only (Tooltip shadcn), icon-label. Variantes: wifi, ac, usb, bathroom, entertainment |
| SeatTypeBadge | SeatTypeBadge.tsx | Pill badge de clase de asiento. Variantes: cama (azul sólido), semi-cama (aqua sólido), ejecutivo (outline) |
| TripCard | TripCard.tsx | Card de resultado de búsqueda. Consume AmenityBadge y SeatTypeBadge. Borde izquierdo por disponibilidad: aqua >10, primary 5-10, accent 1-4 + badge urgencia. priceFrom acepta null |
| FilterPanel | FilterPanel.tsx | Panel de filtros de búsqueda. |
| SearchSummaryBar | SearchSummaryBar.tsx | Barra de resumen de búsqueda activa. onEditClick delegado a la página padre |
| CityInput | CityInput.tsx | Selector de origen/destino. Recibe stops como prop (no fetchea). Valores prefijados: "stop:Nombre" o "province:Nombre". Props: allowedStopIds, onStopSelected, onProvinceSelected |

Si alguna descripción de arriba menciona si algo está conectado, wireado o pendiente, no confíes en eso — es justo el tipo de afirmación que este archivo no debe llevar. Verificá contra el código o contra el Document de Linear (ver abajo).

---

## Frontend — Páginas

| Página | Ruta | Archivo | Descripción |
|--------|------|---------|-------------|
| Resultados | /resultados | app/resultados/page.tsx | Fetch GET /trips, mapea TripRead a TripCard. Soporta query param `destinationId`: resuelve el stop via GET /stops, pre-llena destino en SearchSummaryBar y fetch de viajes. Flag `destinationResolved` evita llamada espuria antes de resolución. |

---

## Frontend — Tipos compartidos

Ubicados en `frontend/src/types/`.

| Archivo | Exporta | Descripción |
|---------|---------|-------------|
| trips.ts | StopRead | Forma de una parada devuelta por GET /stops. Importar desde aquí, no desde componentes. |

---

## Backend — Servicio de email

`backend/app/services/email.py` — servicio Resend con Jinja2. Templates en `backend/templates/email/` (path correcto — NO usar `backend/app/email_templates/`).

Qué variables de contexto inyecta cada template hoy, cuál es la semántica de error real de cada función de envío, y si está o no wireado al flujo de compra: no lo copies acá. Leé `_context_for()` en `app/services/email.py` directamente — son diez líneas y no mienten nunca. Una copia en este archivo sí puede mentir, y ya mintió cuatro veces en esta misma sección.

---

## Proceso de trabajo

Este proyecto usa un flujo de tres capas: **Claude** (arquitectura y revisión) → **Claude Code** (implementación) → **Lucas** (aprobación y merge).

### Flujo estándar por ticket

1. Claude genera un prompt optimizado para Claude Code
2. Lucas ejecuta el prompt en Claude Code
3. Claude Code propone — no implementa sin aprobación explícita
4. Lucas pega la propuesta en el chat con Claude
5. Claude evalúa críticamente la propuesta (no rubber-stamping)
6. Si hay problemas: Claude los señala y corrige el prompt
7. Si está bien: Lucas aprueba y Claude Code implementa
8. Lucas revisa el código generado antes de commitear a main
9. Claude actualiza Linear y CLAUDE.md

### Reglas del proceso

- **Propuesta antes de código** — Claude Code siempre anuncia qué va a hacer y espera aprobación explícita antes de escribir una línea
- **Scope quirúrgico** — cada prompt tiene un scope acotado, sin refactoring fuera del ticket
- **Validar antes de implementar** — confirmar que los endpoints existen, que los bugs son reales, que los archivos están donde se espera
- **Un ticket a la vez** — no se mezclan cambios de distintos tickets en una misma sesión
- **Claude Code nunca mergea a main** — Lucas revisa y commitea manualmente
- **Preguntar antes de asumir** — si algo es ambiguo, Claude Code se detiene y consulta
- **Sin infraestructura sin autorización** — si Claude Code necesita un servicio externo para completar una tarea (Docker, Postgres, Redis, etc.) y no está disponible en el entorno, debe detenerse y preguntar explícitamente: "No tengo Docker disponible. ¿Querés que levante un Postgres local, o preferís que reporte solo los unit tests?" No instala ni levanta servicios por su cuenta.

### Cómo arrancar una conversación nueva

Decile a Claude: "Leé CLAUDE.md y continuamos. El próximo paso es [descripción breve]."

Claude va a leer el archivo, entender las convenciones del proyecto, y pedir el estado actual al Document de Linear antes de proponer nada.

### Prompt de arranque para conversación nueva

Copiar y pegar al inicio de cada conversación nueva:

---

Leé el documento "CLAUDE.md" del proyecto "Expresio Rio Parana" en Linear. Ese documento tiene todo el contexto: stack, reglas de negocio, componentes construidos y proceso de trabajo.

Una vez leído:

Buscá los tickets del proyecto "Expresio Rio Parana" en estado Todo o In Progress, analizá dependencias y bloqueantes, y proponé el próximo paso con justificación.

Si no podés acceder a Linear, indicalo y pedile a Lucas que pegue el contenido de CLAUDE.md manualmente.

No arranques a implementar nada hasta que Lucas apruebe explícitamente el paso propuesto.

---

---

## Reglas globales — NUNCA violarlas

- **Nunca mergear a `main` directamente.** Todo el trabajo va en branches. El merge a main lo hace Lucas a mano después de revisar.
- **Un ticket por sesión.** Scope acotado, revisión antes de avanzar.
- **Antes de escribir código:** anunciá qué vas a implementar, listá las decisiones de diseño que necesitás tomar, esperá aprobación explícita.
- **Después de cada archivo completado:** output `✅ [nombre del archivo] — [descripción en una línea]`.
- **Si encontrás algo ambiguo o no especificado:** detenete y consultá. No asumas.
- **Si necesitás infraestructura no disponible:** detenete y consultá. No instales ni levantes servicios por tu cuenta (ver "Sin infraestructura sin autorización" en Reglas del proceso).

---

## Datos del negocio

| Campo | Valor |
|-------|-------|
| Empresa | Expreso Río Paraná |
| Ruta principal | Buenos Aires ↔ Asunción (Paraguay) |
| Duración | 15–17 horas |
| Tipo de servicio | Internacional |
| Canales actuales | SOR (interno), Plataforma 10, Central de Pasajes |
| Target de lanzamiento | Octubre / Noviembre 2026 |

---

## Regla de negocio crítica — AR↔PY

Los servicios son internacionales. **No se puede vender un tramo dentro del mismo país** (cabotaje extranjero prohibido). Cada parada está etiquetada con su país (`AR` o `PY`). Si el origen es Argentina, el destino solo puede ser Paraguay, y viceversa. Esta regla se valida tanto en frontend como en backend.

Esta regla también está enforced en el frontend: al seleccionar un origen en SearchBar, el dropdown de destino filtra automáticamente las paradas del país opuesto. Si el origen es una parada específica, se llama GET /stops/{id}/valid-destinations. Si el origen es una provincia, se filtra en memoria por country opuesto.

---

## Linear

- **Team:** Lleis
- **Project:** Expresio Rio Parana (sin acento — requerido por la API)
- **Prefijo de tickets:** LLE-
- **Lucas (user ID):** `3a547502-c723-4bbb-a05d-b4165f836768`
- **Estados:** Done, Todo, In Progress, Backlog, Canceled
- **Prioridades:** 1=urgente, 2=alto, 3=medio, 4=bajo

---

## Dónde está el estado del proyecto

Este archivo no lleva estado de código: qué está hecho, qué falta, resultado de suites, riesgos activos, roadmap de módulos futuros, situación de cada componente. Todo eso vive en el **Document de Linear `017e9e10-f516-4f1d-8fee-8a08e7cbd03c`** ("CLAUDE.md — Expreso Río Paraná · Monorepo", proyecto Expresio Rio Parana, sección Resources de la Overview). Es la fuente — no lo dupliques acá. Ese Document también lista el resto de la documentación histórica (auditorías, bugs resueltos, features por área).

Si este archivo y Linear se contradicen, gana Linear. Si Linear y el código se contradicen, gana el código.

---

## Variables de entorno requeridas

| Variable | Proyecto | Descripción |
|----------|----------|-------------|
| NEXT_PUBLIC_API_URL | frontend/ | URL base del backend. Ejemplo: http://localhost:8000. Definir en .env.local (no commitear) |
