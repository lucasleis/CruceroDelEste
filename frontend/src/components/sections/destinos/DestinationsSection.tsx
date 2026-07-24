import DestinationCard from "./DestinationCard";

const destinations = [
  {
    image: "/BuenosAires.jpg",
    category: "CIUDAD CAPITAL",
    title: "Buenos Aires",
    description:
      'El "París de Sudamérica" te espera. Disfrutá de teatro de clase mundial, cafés históricos y el apasionado ritmo del Tango. Nuestra terminal en Retiro te conecta con el corazón de la ciudad con llegadas cada hora.',
    ctaText: "VER HORARIOS",
    ctaType: "link" as const,
    imageSide: "left" as const,
    scheme: "light" as const,
  },
  {
    image: "/Asuncion.jpg",
    category: "CAPITAL BINACIONAL",
    title: "Asunción",
    description:
      "Descubrí la capital paraguaya, cuna de historia colonial y cultura guaraní. Recorré la Costanera de Asunción y su casco histórico a orillas del Río Paraguay.",
    ctaText: "Reservá Tu Aventura",
    ctaType: "button" as const,
    imageSide: "right" as const,
    scheme: "dark" as const,
  },
  {
    image: "/Posadas.jpg",
    category: "ENCANTO RIBEREÑO",
    title: "Posadas",
    description:
      "La puerta de entrada a la selva misionera. Disfrutá de un paseo al atardecer por la Costanera o explorá las cercanas ruinas jesuíticas. Un centro de tranquilidad y cultura regional en la frontera con Paraguay.",
    ctaText: "VER HORARIOS",
    ctaType: "link" as const,
    imageSide: "left" as const,
    scheme: "light" as const,
  },
];

export default function DestinationsSection() {
  return (
    <>
      {destinations.map((destination) => (
        <DestinationCard key={destination.title} {...destination} />
      ))}
    </>
  );
}
