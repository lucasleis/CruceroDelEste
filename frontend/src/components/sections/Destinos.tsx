import { Heading } from "@/components/core/Heading"
import { Subheading } from "@/components/core/Subheading"
import { BodyText } from "@/components/core/BodyText"
import { BlueButton } from "@/components/core/BlueButton"
import { DestinationCardV2 } from "@/components/travel/DestinationCardV2"

const BusIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="7" width="20" height="13" rx="2" />
    <path d="M17 7V5a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v2" />
    <line x1="12" y1="12" x2="12" y2="12" />
    <line x1="7" y1="12" x2="7" y2="12" />
    <line x1="17" y1="12" x2="17" y2="12" />
  </svg>
)

const CARDS = [
  { city: "Buenos Aires", description: "Capital de Argentina", price: 18000, fromCity: "Buenos Aires", image: "/secciones/Destinos-Dest1.jpg" },
  { city: "Asunción", description: "Capital de Paraguay", price: 16500, fromCity: "Asunción", image: "/secciones/Destinos-Dest2.jpg" },
  { city: "Concordia", description: "Entre Ríos, Argentina", price: 9800, fromCity: "Concordia", image: "/secciones/Destinos-Dest3.jpg" },
  { city: "Ciudad del Este", description: "Alto Paraná, Paraguay", price: 14200, fromCity: "Ciudad del Este", image: "/secciones/Destinos-Dest4.jpg" },
]

export function Destinos() {
  return (
    <section style={{ width: "100%", background: "white", paddingTop: "64px", paddingBottom: "64px", paddingLeft: "32px", paddingRight: "32px" }}>
      <div style={{ maxWidth: "1280px", margin: "0 auto" }}>

        {/* Header */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            gap: "8px",
            marginBottom: "40px",
          }}
        >
          <Heading as="h2" size="md" color="navy">Destinos para cada viaje</Heading>
          <Subheading color="muted" size="sm">Conectamos ciudades, acercamos personas.</Subheading>
        </div>

        {/* Cards row */}
        <div style={{ display: "flex", gap: "24px", justifyContent: "center", marginBottom: "32px" }}>
          {CARDS.map((card) => (
            <DestinationCardV2 key={card.city} {...card} />
          ))}
        </div>

        <hr style={{ border: "none", borderTop: "1px solid var(--color-border)", margin: "0 0 24px 0" }} />

        {/* Bottom bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 24px",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-lg)",
            background: "var(--color-surface)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ color: "var(--color-primary)", display: "flex" }}>
              <BusIcon />
            </span>
            <BodyText color="body" size="sm">Explorá más destinos y encontrá tu próximo viaje.</BodyText>
          </div>

          <BlueButton variant="navy" arrow={true}>Ver todos los destinos</BlueButton>
        </div>

      </div>
    </section>
  )
}
