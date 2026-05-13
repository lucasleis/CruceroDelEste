# CLAUDE.md — Crucero Del Este · Sistema de Venta de Pasajes Online

> Este archivo es el briefing permanente del proyecto. Leelo completo antes de escribir cualquier línea de código o proponer cualquier estructura.

---

## Qué es este proyecto

Sistema de venta de pasajes online para **Crucero Del Este**, empresa argentina de transporte de larga distancia. El objetivo es una plataforma propia que complemente los canales actuales (Plataforma 10, Central de Pasajes), permitiendo venta directa con control total sobre precios, datos y experiencia de usuario.

Las especificaciones completas están en `/specs/Crucero Del Este - Presupuesto.pdf` y `/specs/Crucero del Este - Modulos Extras.txt`. Leelos antes de trabajar en cualquier módulo.

---

## Tu rol en este proyecto

Sos un senior backend engineer. Priorizás correctitud sobre cleverness. No agregás features, abstracciones ni refactors que no fueron pedidos explícitamente. Cada decisión de arquitectura que tome el sistema debe ser aprobada antes de implementarse.

---

## Alcance del MVP (backend)

### Incluido

- **Inventario de asientos**: rutas con dos tipos de asiento (Cama / Semi Cama), cada uno con hasta 5 tramos de precio dinámico definidos por pasajes vendidos (no por tiempo). Cama y Semi Cama tienen tramos independientes.
- **Flujo de compra**: selección de asientos → datos del pasajero → pago → confirmación.
- **Integración MercadoPago**: tarjetas de crédito, débito y billeteras virtuales. Las comisiones (0,8%–6,6%) corren por cuenta del cliente, el sistema NO las calcula ni las aplica.
- **Notificaciones por email**: 3 templates transaccionales — confirmación de compra (inmediata), recordatorio de viaje (antes de la fecha), feedback post-viaje. Usar Resend o Brevo en plan gratuito.
- **API del panel de administración**: endpoints con autenticación para configurar tramos de precio y listar ventas (solo lectura).

### Explícitamente fuera del alcance de este MVP

- Generación y validación de QR
- Tracking GPS
- Sistema multi-paradas
- Reserva sin pago inmediato
- Cancelaciones y reembolsos
- Módulo antifraude

---

## Datos iniciales del negocio

| Campo | Valor |
|---|---|
| Ruta inicial | Buenos Aires ↔ Rosario |
| Precio base Cama | $24.500 ARS |
| Precio base Semi Cama | $23.300 ARS |
| Tramos de precio | Hasta 5 por tipo de asiento, definidos por `[min_vendidos, max_vendidos, precio]` |

---

## Reglas de trabajo — NUNCA violarlas

- **No escribas código sin que el stack y la estructura de carpetas estén aprobados.**
- **No agregues nada fuera del alcance listado arriba**, aunque parezca obvio o útil.
- **Después de completar cada archivo o módulo**, output: `✅ [nombre del archivo] — [descripción en una línea]`
- **Detente y preguntá antes de**: modificar el schema de base de datos, cambiar el flujo de pago, o agregar cualquier feature no listada explícitamente.
- **No des explicaciones** salvo que se te pidan.

---

## Módulos futuros (roadmap — no implementar ahora)

Estos módulos están documentados en `/specs/Crucero del Este - Modulos Extras.txt` y se cotizarán e implementarán como módulos independientes post-MVP:

- Control de pasajeros con QR (generación, validación, estados: válido / reembolsado / abordado)
- Tracking GPS en tiempo real — Opción A: app en celular del chofer ($500.000), Opción B: dispositivo GPS dedicado con SIM propia ($310.000, recomendada)
- Gestión avanzada de ventas (cancelaciones, reembolsos)
- Sistema multi-paradas
- Seguridad y antifraude

---

## Primera tarea al iniciar la sesión

Proponé el stack backend y la estructura de carpetas del proyecto. Incluí: lenguaje/runtime, framework, base de datos, ORM, SDK de pagos, SDK de email. Justificá cada elección en una oración. **Esperá aprobación antes de escribir cualquier código.**
