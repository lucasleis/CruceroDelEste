# Estado del Proyecto — Expreso Río Paraná
**Sistema de Venta de Pasajes Online**  
**Última actualización:** Junio 2026  
**Desarrollador:** Lucas (Nivalis)  
**Contacto principal cliente:** SPK_2  
**Referente operativo:** SPK_3 (dueño)

---

## Estado general

| Ítem | Estado |
|------|--------|
| Presupuesto entregado | ✅ Entregado (08/04/2026) |
| Aprobación del cliente | ✅ Confirmada verbalmente |
| Seña / inicio formal | ⏳ Pendiente |
| Inicio de desarrollo | ⏳ Pendiente |
| Target de lanzamiento | Octubre / Noviembre 2026 |

---

## Cambio de entidad — Importante

El proyecto fue originalmente presupuestado para **Crucero del Este**. A partir de la segunda reunión, el cliente confirmó que el proyecto es para **Expreso Río Paraná**, empresa madre del grupo.

- Crucero del Este tiene un solo servicio (Buenos Aires–Rosario) con un bus que probablemente sea reasignado a Paraguay.
- Expreso Río Paraná opera rutas internacionales a Paraguay hace más de 50 años.
- El presupuesto fue aceptado con este cambio implícito. Confirmar si hay ajustes necesarios.

---

## Alcance definido — MVP

### Incluido en el presupuesto original ($3.000.000)

| Módulo | Descripción | Estado |
|--------|-------------|--------|
| Landing Page | Hero, Sobre Nosotros, Mapa de Rutas, Horarios, Servicios, Contacto, Ayuda | Diseño pendiente de materiales del cliente |
| Selector de asientos | Layout visual interactivo, 2 pisos (Cama / Semi Cama), estados por asiento | A desarrollar |
| Sistema de compra | Flujo completo + MercadoPago + Modo | A desarrollar |
| Pricing dinámico | Hasta 5 tramos por tipo de asiento, configurables desde admin | A desarrollar |
| Notificaciones por email | 3 templates: confirmación, recordatorio, feedback post-viaje | A desarrollar |
| Panel de administración | Login, gestión de precios, listado de ventas (solo lectura) | A desarrollar |
| Diseño UI/UX | 2–3 propuestas de estilo, responsive | Pendiente de brief del cliente |

### Agregado en reunión 2 (a incorporar o presupuestar por separado)

| Ítem | Descripción | Decisión pendiente |
|------|-------------|-------------------|
| Botón de arrepentimiento | Obligación legal argentina. Debe estar en el MVP | Incluir en MVP |
| Lógica de multi-paradas internacional | Regla AR↔PY obligatoria por regulación binacional | Incluir en MVP — revisar impacto en presupuesto |
| Gestión de trayectos desde el admin | El cliente quiere poder agregar/editar paradas y trayectos sin el desarrollador | Evaluar si entra en MVP o módulo extra |
| Email de cross-selling | El email de confirmación sugiere comprar el tramo de vuelta | Incluir en diseño del template existente |
| Datos obligatorios: mail y teléfono | Campo obligatorio en formulario de compra | Incluir en MVP |
| Reembolso vía redirección | Botón que redirige a MercadoPago/Modo para gestionar devolución | Incluir en MVP |

---

## Módulos extra cotizados (fuera del MVP original)

### Módulo QR — Control de Pasajeros
**Precio:** $450.000  
**Tiempo estimado:** 5 días

Incluye:
- Generación de QR único por pasaje y adjunto al mail
- Lógica de estados del pasaje (válido / reembolsado / abordado)
- Interfaz del validador (web y móvil)
- Detección de QR duplicado / ya usado
- Testing y ajustes

**Estado:** Interés confirmado. Pendiente de aprobación formal.

### Módulo Tracking GPS

**Opción A — App en celular del chofer:** $500.000
- Ventaja: sin hardware extra
- Desventaja: depende del dispositivo del chofer (batería, señal, que no cierre la app)

**Opción B — Dispositivo GPS dedicado:** $310.000 (desarrollo) + hardware a cargo del cliente (USD 30–80 por unidad + SIM)
- Ventaja: autónomo, más confiable, no depende del chofer
- Recomendación del desarrollador: **Opción B**

**Estado:** Cliente inclinado por Opción B. Confirmación pendiente con el dueño.

---

## Módulos futuros (roadmap — sin precio definido aún)

| Módulo | Descripción |
|--------|-------------|
| Gestión de Reservas | Reservar sin pago inmediato, con gestión del estado |
| Gestión de Ventas avanzada | Cancelación, reembolso y modificación desde el admin |
| Sistema de puntos / millas | Fidelización de pasajeros frecuentes |
| Notificaciones por WhatsApp | Requiere WhatsApp Business API |
| QR en unidades (físico) | Código QR en el micro que redirige a la web de compra |
| Seguridad y antifraude | Prevención de reventa, validación de pagos |
| Integración con SOR / Plataforma 10 | Sincronización de asientos en tiempo real (ver riesgos) |

---

## Riesgos activos

### 🔴 Riesgo alto — Doble venta de asientos
El cliente vende simultáneamente por su sistema SOR, Plataforma 10 y Central de Pasajes. Si la nueva web no está sincronizada con SOR, puede venderse el mismo asiento dos veces.

- No está definido si SOR tiene API.
- No está presupuestada ninguna integración.
- **Acción requerida:** Investigar capacidades técnicas de SOR antes de lanzar el MVP.

### 🔴 Riesgo alto — Cambio de entidad sin revisión de presupuesto
El presupuesto fue hecho para Crucero del Este (BA–Rosario, sin complejidad internacional). El proyecto real es Expreso Río Paraná (BA–Asunción, servicio internacional, lógica de paradas binacional).

- La complejidad es mayor.
- Algunos ítems del presupuesto pueden necesitar revisión.

### 🟡 Riesgo medio — Disponibilidad del dueño
El dueño está en medio de un conflicto societario interno. Las decisiones clave (tracking, presupuesto final, assets de marca) pueden demorarse.

- El interlocutor real es SPK_2.
- Prever demoras en la provisión de materiales.

### 🟡 Riesgo medio — Norma de trazabilidad de equipaje
Norma gubernamental reciente que exige vincular cada ticket de equipaje al pasaje del pasajero nominalmente. Por ahora aplica solo al control físico, pero podría impactar el módulo de QR.

- El modelo de datos del pasaje debería contemplar este campo desde el inicio.

---

## Forma de pago acordada

| Cuota | Porcentaje | Monto |
|-------|------------|-------|
| Seña (inicio del proyecto) | 30% | $900.000 |
| Al 50% del desarrollo | 30% | $900.000 |
| Contra entrega final | 40% | $1.200.000 |
| **Total MVP** | | **$3.000.000** |

Servicio mensual post-lanzamiento: **$60.000/mes** (revisable cada 6 meses).

---

## Información clave del negocio (útil para diseño)

- **Posicionamiento:** Empresa innovadora. Primeros en Starlink, primeros en semi cama, primeros en cama 180°.
- **Diferencial frente a P10/Central:** Precio más bajo por venta directa (sin comisión) y posibilidad de descuentos y atención personalizada.
- **Target:** Pasajeros a destinos sin vuelo disponible (Encarnación, pueblos de Paraguay) y segmentos de menor poder adquisitivo.
- **Viajes principales:** Buenos Aires → Asunción, 15–17 horas. Servicios nocturnos.
- **Competidores directos en Paraguay:** Crucero del Norte, Crucero del Sur, Expresso Paraguay (todos del mismo grupo). Competencia interna entre empresas.
- **Referencias de diseño:** FlixBus, Pixxus (buses) — Iberia (aerolínea).

---

## Historial de reuniones

| Reunión | Fecha | Resumen |
|---------|-------|---------|
| Reunión 1 | Abril 2026 | Presentación del proyecto, definición del MVP, entrega de presupuesto |
| Reunión 2 | Junio 2026 | Confirmación de aprobación, cambio a Expreso Río Paraná, definición de lógica de paradas, módulos extra de QR y tracking |
