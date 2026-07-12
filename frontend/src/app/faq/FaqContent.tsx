"use client";

import { useState } from "react";

interface FaqItem {
  question: string;
  answer: string;
}

const FAQ_ITEMS: FaqItem[] = [
  {
    question: "¿Qué documentación necesito para cruzar la frontera?",
    answer:
      "Los ciudadanos argentinos y paraguayos pueden viajar con DNI o cédula de identidad vigente. Otras nacionalidades deben presentar pasaporte válido y, según el país de origen, visa correspondiente. Los menores de edad requieren documentación adicional (ver pregunta sobre menores). Es responsabilidad del pasajero contar con la documentación en regla al momento del embarque.",
  },
  {
    question: "¿Cuánto equipaje puedo llevar?",
    answer:
      "Cada pasajero puede despachar hasta dos valijas de un máximo de 23 kg cada una en la bodega del bus, más un bolso de mano de hasta 8 kg en cabina. El equipaje despachado se etiqueta al momento del embarque. Objetos de valor (documentos, electrónica, dinero) deben llevarse siempre en el equipaje de mano.",
  },
  {
    question: "¿Puedo cancelar mi pasaje y pedir un reembolso?",
    answer:
      "Sí. Si comprás online, tenés derecho al botón de arrepentimiento: podés solicitar el reembolso total dentro de los 10 días de la compra, siempre que falten más de 24 horas para la salida del viaje. Ambas condiciones deben cumplirse. La solicitud se hace desde nuestra web sin necesidad de usuario, ingresando el código de tu compra. Fuera de esa ventana, contactate con nuestra administración para evaluar tu caso.",
  },
  {
    question: "¿Cuánto dura el viaje entre Buenos Aires y Asunción?",
    answer:
      "El viaje dura entre 15 y 17 horas, dependiendo del tráfico y del tiempo de trámite en el paso fronterizo. Los horarios publicados son estimados: la hora de salida es exacta, pero la hora de llegada puede variar.",
  },
  {
    question: "¿Qué formas de pago aceptan?",
    answer:
      "En la compra online aceptamos tarjetas de crédito, tarjetas de débito y billeteras virtuales a través de MercadoPago. Por el momento no se aceptan pagos en efectivo (Rapipago, Pago Fácil) para compras web.",
  },
  {
    question: "¿Qué diferencia hay entre asiento Cama y Semi Cama?",
    answer:
      "El asiento Cama es más ancho y reclina casi por completo (aprox. 160°), ideal para dormir durante el viaje nocturno. El Semi Cama reclina parcialmente (aprox. 140°) y es la opción más económica. Ambos incluyen los servicios a bordo del coche.",
  },
  {
    question: "¿Qué pasa si el bus se atrasa o se cancela el servicio?",
    answer:
      "Si el servicio sufre demoras por causas operativas, de tráfico o migratorias, te mantendremos informado por email y teléfono. Si la empresa cancela el servicio, podés optar por ser reubicado en el próximo servicio disponible sin costo o solicitar el reembolso total del pasaje.",
  },
  {
    question: "¿Pueden viajar menores de edad solos?",
    answer:
      "Al tratarse de un viaje internacional, los menores de 18 años deben viajar acompañados por sus padres o un adulto responsable con la autorización legal correspondiente. Los menores que viajan con un solo padre/madre necesitan autorización del otro progenitor certificada según la normativa migratoria vigente. Recomendamos consultar los requisitos de Migraciones antes de comprar.",
  },
  {
    question: "¿Puedo viajar con mi mascota?",
    answer:
      "No está permitido el transporte de mascotas en nuestros servicios internacionales, ni en cabina ni en bodega, debido a las restricciones sanitarias del cruce de frontera. La única excepción son los perros de asistencia certificados, que viajan sin cargo junto al pasajero previa notificación al momento de la compra.",
  },
  {
    question: "¿Desde qué terminales salen los buses?",
    answer:
      "Los servicios parten desde la Terminal de Ómnibus de Retiro (Buenos Aires) y realizan paradas intermedias según el servicio. En Paraguay, el destino final es la Terminal de Ómnibus de Asunción, con paradas previas como Encarnación. Al comprar tu pasaje vas a ver el detalle de origen, destino y horario exacto.",
  },
  {
    question: "¿Cuándo tengo que presentarme para embarcar?",
    answer:
      "Te recomendamos estar en la plataforma de embarque al menos 45 minutos antes de la salida, con tu documentación y el comprobante de compra (impreso o en el celular). El bus parte puntualmente en el horario publicado.",
  },
  {
    question: "¿El bus tiene servicios a bordo?",
    answer:
      "Sí. Nuestros coches cuentan con aire acondicionado, baño, wifi (sujeto a cobertura en ruta) y puertos USB para cargar dispositivos. En los servicios nocturnos se realiza una pausa programada para cena en ruta.",
  },
];

function FaqAccordionItem({
  item,
  isOpen,
  onToggle,
}: {
  item: FaqItem;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      style={{
        backgroundColor: "var(--color-white)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-md)",
        boxShadow: isOpen ? "var(--shadow-sm)" : "var(--shadow-xs)",
        overflow: "hidden",
        transition: `box-shadow var(--duration-base) var(--ease-out)`,
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "16px",
          width: "100%",
          padding: "18px 20px",
          background: "none",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
          fontFamily: "var(--font-display)",
          fontSize: "17px",
          fontWeight: 600,
          color: "var(--color-text-primary)",
          lineHeight: 1.35,
        }}
      >
        <span>{item.question}</span>
        <span
          aria-hidden="true"
          style={{
            flexShrink: 0,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: "28px",
            height: "28px",
            borderRadius: "var(--radius-pill)",
            backgroundColor: isOpen
              ? "var(--color-primary)"
              : "var(--color-surface)",
            color: isOpen ? "var(--color-white)" : "var(--color-primary)",
            fontSize: "16px",
            fontWeight: 600,
            transform: isOpen ? "rotate(45deg)" : "rotate(0deg)",
            transition: `transform var(--duration-base) var(--ease-out), background-color var(--duration-base) var(--ease-out), color var(--duration-base) var(--ease-out)`,
          }}
        >
          +
        </span>
      </button>
      {isOpen && (
        <div
          style={{
            padding: "0 20px 20px",
            fontFamily: "var(--font-body)",
            fontSize: "15px",
            lineHeight: 1.65,
            color: "var(--color-text-body)",
          }}
        >
          {item.answer}
        </div>
      )}
    </div>
  );
}

export default function FaqContent() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <main
      style={{
        minHeight: "100vh",
        backgroundColor: "var(--color-surface)",
        padding: "48px 16px 80px",
      }}
    >
      <div style={{ maxWidth: "760px", margin: "0 auto" }}>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(28px, 5vw, 40px)",
            fontWeight: 700,
            color: "var(--color-text-primary)",
            textAlign: "center",
            margin: "0 0 12px",
          }}
        >
          Preguntas frecuentes
        </h1>
        <p
          style={{
            fontFamily: "var(--font-body)",
            fontSize: "16px",
            lineHeight: 1.6,
            color: "var(--color-text-muted)",
            textAlign: "center",
            margin: "0 0 40px",
          }}
        >
          Todo lo que necesitás saber antes de viajar entre Buenos Aires y
          Asunción.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {FAQ_ITEMS.map((item, index) => (
            <FaqAccordionItem
              key={item.question}
              item={item}
              isOpen={openIndex === index}
              onToggle={() =>
                setOpenIndex(openIndex === index ? null : index)
              }
            />
          ))}
        </div>
      </div>
    </main>
  );
}
