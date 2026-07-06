import {
  ShieldCheck,
  Armchair,
  CirclePlay,
  UsersRound,
  Clock,
  MapPin,
} from "lucide-react"
import { Heading } from "@/components/core/Heading"
import { BeneficioCard } from "@/components/beneficios/BeneficioCard"

const ICON_SIZE = 28

const BENEFICIOS = [
  {
    imageSrc: "/assets/beneficios/seguridad.jpg",
    imageAlt: "Seguridad ante todo",
    icon: <ShieldCheck size={ICON_SIZE} />,
    title: "Seguridad ante todo",
    description:
      "Unidades modernas, mantenimiento constante y protocolos que garantizan tu tranquilidad en cada viaje.",
  },
  {
    imageSrc: "/assets/beneficios/confort.jpg",
    imageAlt: "Confort que se siente",
    icon: <Armchair size={ICON_SIZE} />,
    title: "Confort que se siente",
    description:
      "Asientos amplios, climatización, baño a bordo y servicios pensados para tu bienestar.",
  },
  {
    imageSrc: "/assets/beneficios/experiencia.jpg",
    imageAlt: "Experiencias que conectan",
    icon: <CirclePlay size={ICON_SIZE} />,
    title: "Experiencias que conectan",
    description:
      "Más que llegar, se trata del viaje. Disfrutá cada momento con entretenimiento y atención de calidad.",
  },
  {
    imageSrc: "/assets/beneficios/compromiso.jpg",
    imageAlt: "Compromiso que nos mueve",
    icon: <UsersRound size={ICON_SIZE} />,
    title: "Compromiso que nos mueve",
    description:
      "Un equipo apasionado que trabaja cada día para superar tus expectativas y acompañarte siempre.",
  },
  {
    imageSrc: "/assets/beneficios/puntualidad.jpg",
    imageAlt: "Puntualidad que respetamos",
    icon: <Clock size={ICON_SIZE} />,
    title: "Puntualidad que respetamos",
    description:
      "Salidas y llegadas a tiempo, porque sabemos que tu tiempo es lo más valioso.",
  },
  {
    imageSrc: "/assets/beneficios/rutas.jpg",
    imageAlt: "Rutas que nos unen",
    icon: <MapPin size={ICON_SIZE} />,
    title: "Rutas que nos unen",
    description:
      "Conectamos Argentina y Paraguay con frecuencias diarias para que siempre tengas un viaje disponible.",
  },
]

export function Beneficios() {
  return (
    <section
      style={{
        width: "100%",
        background: "var(--color-surface)",
        paddingTop: "64px",
        paddingBottom: "64px",
        paddingLeft: "32px",
        paddingRight: "32px",
      }}
    >
      <div style={{ maxWidth: "1280px", margin: "0 auto" }}>

        {/* Header */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            marginBottom: "48px",
          }}
        >
          <Heading as="h2" size="xl" color="navy">
            Beneficios de viajar con{" "}
            <strong style={{ fontWeight: 900, color: "var(--color-primary)" }}>
              Expreso Rioparana
            </strong>
          </Heading>
        </div>

        {/* Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "20px",
          }}
        >
          {BENEFICIOS.map((beneficio) => (
            <BeneficioCard key={beneficio.title} {...beneficio} />
          ))}
        </div>

      </div>
    </section>
  )
}
