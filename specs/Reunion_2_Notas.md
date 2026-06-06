# Notas — Segunda Reunión con el Cliente
**Proyecto:** Sistema de Venta de Pasajes Online  
**Fecha de reunión:** Junio 2026  
**Participantes:** Lucas (desarrollador), SPK_2 (contacto principal), SPK_3 (dueño / referente operativo)

---

## 1. Cambio de entidad cliente

El proyecto **ya no es para Crucero del Este sino para Expreso Río Paraná**.

- Crucero del Este tiene un solo servicio (Buenos Aires–Rosario) con un único bus, y ese bus probablemente sea reasignado a rutas de Paraguay en julio o fin de año.
- Expreso Río Paraná es la empresa madre, con más de 50 años operando rutas internacionales a Paraguay.
- El cambio implica: nuevo logo, nueva identidad visual, dominio diferente, rutas completamente distintas.
- Ya existe una página web de Expreso Río Paraná hecha por empleados en Paraguay, pero es deficiente. El cliente la va a compartir como referencia.
- El .com del dominio podría estar tomado por la empresa. La idea es usar `.com` para Argentina y `.com.py` para Paraguay cuando corresponda.

**Impacto:** Revisar todos los ítems del presupuesto que hacen referencia a identidad visual, templates de mail y rutas. El trayecto inicial ya no es Buenos Aires–Rosario sino Buenos Aires–Asunción (viajes de 15 a 17 horas, servicio internacional).

---

## 2. Lógica de multi-paradas — Regla de negocio crítica

La lógica de paradas es más compleja de lo que aparece en el presupuesto. No se trata de múltiples paradas opcionales genéricas: hay una **regla de negocio obligatoria** derivada de la regulación internacional.

**La regla es:**
- Si el origen es una ciudad de Argentina → el destino solo puede ser una ciudad de Paraguay.
- Si el origen es una ciudad de Paraguay → el destino solo puede ser una ciudad de Argentina.
- No se puede vender un tramo interno dentro de Paraguay ni dentro de Argentina en los servicios internacionales (sería cabotaje extranjero, lo cual está prohibido y podría implicar sanciones).

**Implementación sugerida en la reunión:**
- Etiquetar cada parada con su país: por ejemplo `Retiro (AR)`, `Encarnación (PY)`, `Asunción (PY)`.
- El selector de destino debe filtrar dinámicamente: si el usuario elige un origen AR, solo muestra destinos PY, y viceversa.

**Impacto técnico:** Esto afecta la arquitectura del selector de origen/destino, la validación en backend y el modelo de datos de trayectos. Es un requisito del MVP, no un módulo futuro.

---

## 3. Botón de arrepentimiento — Obligación legal argentina

Existe legislación argentina vigente que **obliga a todos los e-commerce a incluir un botón de arrepentimiento** que permita al usuario cancelar la compra. Es equivalente al que usan plataformas de venta de entradas para eventos.

- No es opcional.
- No está incluido en el presupuesto actual.
- Debe estar en el MVP para evitar exposición legal del cliente.

**Impacto:** Agregar como ítem al alcance del MVP. No es un desarrollo complejo, pero debe estar correctamente implementado y visible.

---

## 4. Sistema de reembolso — Alcance real más acotado

El cliente quiere que los usuarios puedan gestionar devoluciones desde la plataforma. Sin embargo, lo que quedó definido en la reunión es una **redirección a MercadoPago o Modo** para que el usuario gestione el reembolso desde esas plataformas.

- Esto es significativamente más simple que construir un sistema propio de cancelación y reembolso.
- El sistema interno avanzado de cancelación/reembolso (con lógica de porcentajes según anticipación, etc.) sigue siendo un módulo futuro.
- Dejar explícito en el alcance para evitar expectativas incorrectas.

---

## 5. Norma de trazabilidad de pasajeros y equipaje

El gobierno argentino publicó recientemente (aproximadamente abril de este año) una norma que exige que **cada ticket de equipaje esté vinculado nominalmente al pasaje del pasajero** (nombre y apellido, número de boleto).

- Por el momento, esto aplica al control físico en el embarque, no a la web de venta.
- El cliente está gestionando una prórroga con el gobierno para seguir usando sus sistemas actuales.
- Sin embargo, **si el modelo de datos del pasaje no contempla la vinculación de equipaje desde el inicio, habrá que refactorizar** cuando se desarrolle el módulo de Control de Pasajeros (QR).

**Impacto:** No afecta el MVP directamente, pero sí el diseño del modelo de datos. Vale la pena dejar el campo preparado.

---

## 6. Integración con sistemas existentes (SOR / Plataforma 10)

Este es el punto de mayor riesgo operativo del proyecto y no fue resuelto en la reunión.

El cliente vende pasajes simultáneamente a través de:
- Su propio sistema interno (SOR)
- Plataforma 10
- Central de Pasajes

Cuando alguien compra por Plataforma 10, ese asiento se da de baja en SOR. Si la nueva web no está sincronizada con SOR, **puede venderse el mismo asiento dos veces**.

El desarrollador (Lucas) reconoció que en algún momento va a necesitar acceder al sistema SOR para sincronizar los asientos. Pero esto no fue definido ni presupuestado.

**Preguntas abiertas que hay que resolver:**
- ¿SOR tiene API disponible?
- ¿Quién es el proveedor de SOR y tiene documentación?
- ¿El cliente puede gestionar acceso para integración?
- ¿Se sincroniza en tiempo real o por polling?

**Riesgo:** Si no se resuelve, la doble venta es inevitable. Esto generó problemas reputacionales al cliente en el pasado con Plataforma 10.

---

## 7. Panel de administración — Alcance más amplio de lo presupuestado

El cliente expresó necesitar que desde el panel de admin puedan **gestionar trayectos, paradas, orígenes y destinos** por sí mismos, sin depender del desarrollador para cada cambio.

Ejemplo concreto: agregar una nueva parada, cambiar precios en Día del Padre o Día de la Madre, crear un nuevo trayecto.

El presupuesto actual contempla:
- Gestión de precios (tramos dinámicos)
- Listado de ventas (solo lectura)

**No contempla:** gestión de trayectos ni paradas. Esto puede tener impacto en el tiempo de desarrollo.

---

## 8. Datos obligatorios del pasajero

Quedó definido que **mail y teléfono son campos obligatorios** en el formulario de compra.

- El mail es necesario para enviar el pasaje y las notificaciones.
- El teléfono es necesario para poder contactar al pasajero ante inconvenientes (cancelaciones, demoras, etc.).
- El cliente reconoció que puede haber pasajeros mayores sin mail, pero la lógica del sistema requiere ambos para funcionar correctamente.
- Alternativa discutida: si no tiene mail, se le podría enviar el QR por SMS o WhatsApp, pero eso requiere una integración adicional (WhatsApp Business API).

---

## 9. Tracking GPS — Estado pendiente de confirmación

El cliente está inclinado por la **Opción B (dispositivo GPS dedicado)**, pero necesita confirmar con el dueño.

- El Starlink instalado en los micros **no es una alternativa confiable** para tracking: no funciona en galpones ni siempre en terminales con techo sólido.
- El tracking GPS tiene que ser independiente del Starlink.
- El cliente también mencionó que le gustaría que el pasajero reciba **notificaciones automáticas** cuando el bus se demora o sufre un inconveniente (potencialmente vía WhatsApp o notificación push).

**Acción pendiente:** El cliente va a hablar con el dueño esta semana y confirmar la opción.

---

## 10. Emails post-compra — Lógica de cross-selling

Se discutió la posibilidad de usar los emails de confirmación como herramienta de cross-selling. Ejemplo: si alguien compra el tramo de ida, el email de confirmación le sugiere que también compre el tramo de vuelta con un descuento.

Esto no es un módulo nuevo sino una extensión del template de email de confirmación ya presupuestado. Pero hay que diseñarlo con esa lógica desde el principio.

---

## 11. Posible integración futura con Plataforma 10

El cliente mencionó que están explorando un acuerdo con Plataforma 10 (ahora de capitales israelíes) para hacer publicidad cruzada: que Plataforma 10 haga publicidad dentro de los micros a cambio de mayor visibilidad de la empresa en su plataforma.

Esto no afecta el desarrollo actual, pero es contexto relevante para entender que **la relación con Plataforma 10 no es de competencia directa sino de coexistencia**. El objetivo de la web propia es captar venta directa sin comisión, no reemplazar a Plataforma 10.

---

## 12. Timing y condiciones del cliente

- El target de lanzamiento es **octubre/noviembre 2026**, para coincidir con el inicio de la temporada alta (viajes a Paraguay por el verano y fiestas).
- El dueño está atravesando un conflicto societario interno importante y tiene la atención dividida. El interlocutor real del proyecto es SPK_2.
- Los materiales (logos, fotos, textos) probablemente lleguen tarde. El cliente sugirió empezar con lo que haya disponible en la web actual.
- El Dropbox con assets que fue compartido anteriormente expiró. Hay que pedirle al cliente que lo comparta nuevamente.

---

## 13. Identidad y posicionamiento de la empresa

Contexto útil para el diseño de la landing:

- La empresa se posiciona como **innovadora dentro del rubro**. Fueron los primeros en instalar Starlink en sus micros, los primeros en hacer semi cama (años 90), los primeros en ofrecer camas 180 grados.
- El diferencial principal frente a Plataforma 10 y Central de Pasajes es **el precio más bajo por venta directa** (sin comisión de intermediario) y la posibilidad de hacer descuentos, cupones y atención personalizada.
- El target no es el segmento de avión. Es la gente que viaja a destinos donde el avión no llega (Encarnación, pueblos de Paraguay) y segmentos de menor poder adquisitivo.
- Los viajes de Paraguay son de 15 a 17 horas. El Starlink y el entretenimiento a bordo son diferenciales importantes para viajes largos.
- En el futuro les interesa explorar un sistema de puntos o millas para pasajeros frecuentes.

---

## Pendientes y próximos pasos

| # | Tarea | Responsable | Estado |
|---|-------|-------------|--------|
| 1 | Confirmar opción de tracking GPS con el dueño | Cliente | Pendiente |
| 2 | Compartir link de la web actual de Expreso Río Paraná | Cliente | Pendiente |
| 3 | Reenviar Dropbox con logos e imágenes | Cliente | Pendiente |
| 4 | Completar el formulario de identidad de marca | Cliente | Pendiente |
| 5 | Investigar si SOR tiene API para sincronización de asientos | Desarrollador | Pendiente |
| 6 | Revisar presupuesto en función del cambio de entidad y nuevos módulos | Desarrollador | Pendiente |
| 7 | Pasar datos para inicio formal del proyecto (seña) | Cliente | Pendiente |
| 8 | Pasarle al cliente info sobre la norma de trazabilidad de equipaje | Desarrollador | Pendiente |
