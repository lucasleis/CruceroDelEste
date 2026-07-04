# CLAUDE.md — Expreso Río Paraná · Monorepo

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
├── frontend-landing/     ← Next.js, landing pública SEO (a desarrollar)
├── frontend-admin/       ← React + Vite, panel de administración. Ver frontend-admin/CLAUDE.md
├── specs/                ← Documentación del proyecto
│   ├── Crucero Del Este - Presupuesto.pdf
│   └── Crucero del Este - Modulos Extras.txt
└── CLAUDE.md             ← este archivo
```

---

## Reglas globales — NUNCA violarlas

- **Nunca mergear a `main` directamente.** Todo el trabajo va en branches. El merge a main lo hace Lucas a mano después de revisar.
- **Un ticket por sesión.** Scope acotado, revisión antes de avanzar.
- **Antes de escribir código:** anunciá qué vas a implementar, listá las decisiones de diseño que necesitás tomar, esperá aprobación explícita.
- **Después de cada archivo completado:** output `✅ [nombre del archivo] — [descripción en una línea]`.
- **Si encontrás algo ambiguo o no especificado:** detenete y consultá. No asumas.

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

---

## Riesgos activos

### 🔴 Doble venta de asientos
El cliente vende simultáneamente por SOR, Plataforma 10 y Central de Pasajes. Sin sincronización con SOR, puede venderse el mismo asiento dos veces. No está definido si SOR tiene API. Acción requerida antes del lanzamiento.

### 🟡 Norma de trazabilidad de equipaje (RESOL-2026-4-APN-ST#MEC)
Exige vinculación nominal entre cada equipaje y el pasajero. El campo `luggage_count` actual no es suficiente. El módulo de Control de Pasajeros (QR) es el lugar natural para implementarlo. No afecta el MVP directamente.

### 🟡 Disponibilidad del cliente
El dueño está en un conflicto societario interno. El interlocutor real del proyecto es SPK_2. Prever demoras en materiales (logos, fotos, textos, datos de flota).

---

## Módulos futuros (no implementar ahora)

- Control de pasajeros con QR — $450.000, 5 días estimados
- Tracking GPS — Opción B recomendada (dispositivo dedicado, $310.000 desarrollo + hardware cliente)
- Gestión avanzada de ventas (cancelaciones con lógica de porcentajes)
- Notificaciones por WhatsApp (requiere WhatsApp Business API)
- Sistema de puntos / millas
- Integración con SOR / Plataforma 10
- Viajes recurrentes (LLE-117 — bloqueado por decisiones de producto)

---

## Linear

- **Team:** Lleis
- **Project:** Expresio Rio Parana (sin acento — requerido por la API)
- **Prefijo de tickets:** LLE-
- **Lucas (user ID):** `3a547502-c723-4bbb-a05d-b4165f836768`
- **Estados:** Done, Todo, Backlog, Canceled
- **Prioridades:** 1=urgente, 2=alto, 3=medio, 4=bajo