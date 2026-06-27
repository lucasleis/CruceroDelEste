"use client"

import { DestinationCard } from "@/components/travel/DestinationCard"
import { DestinationCardV2 } from "@/components/travel/DestinationCardV2"

const CARDS = [
  { city: "Buenos Aires", description: "Capital de Argentina", price: 18000 },
  { city: "Asunción", description: "Capital de Paraguay", price: 24000 },
  { city: "Rosario", description: "Ciudad del Litoral", price: 12000 },
  { city: "Posadas", description: "Puerta a las Cataratas", price: 15000 },
]

export default function TravelPage() {
  return (
    <div style={{ background: "white", padding: "48px" }}>
      <h1
        style={{
          fontFamily: "var(--font-display)",
          color: "var(--color-navy)",
          fontSize: "var(--text-2xl)",
          fontWeight: 800,
          marginBottom: "32px",
        }}
      >
        Travel Components
      </h1>

      <h2
        style={{
          fontFamily: "var(--font-body)",
          fontSize: "var(--text-sm)",
          color: "var(--color-text-muted)",
          marginBottom: "16px",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
        }}
      >
        DestinationCard
      </h2>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "16px" }}>
        {CARDS.map((card) => (
          <DestinationCard key={card.city} {...card} />
        ))}
      </div>

      <h2
        style={{
          fontFamily: "var(--font-body)",
          fontSize: "var(--text-sm)",
          color: "var(--color-text-muted)",
          marginTop: "48px",
          marginBottom: "16px",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
        }}
      >
        DestinationCardV2
      </h2>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "24px" }}>
        <DestinationCardV2
          city="Buenos Aires"
          description="Capital de Argentina"
          price={18000}
          fromCity="Buenos Aires"
          image="/secciones/Destinos-Dest1.jpg"
        />
        <DestinationCardV2
          city="Asunción"
          description="Capital de Paraguay"
          price={16500}
          fromCity="Asunción"
          image="/secciones/Destinos-Dest2.jpg"
        />
        <DestinationCardV2
          city="Concordia"
          description="Entre Ríos, Argentina"
          price={9800}
          fromCity="Concordia"
          image="/secciones/Destinos-Dest3.jpg"
        />
        <DestinationCardV2
          city="Ciudad del Este"
          description="Alto Paraná, Paraguay"
          price={14200}
          fromCity="Ciudad del Este"
          image="/secciones/Destinos-Dest4.jpg"
        />
      </div>
    </div>
  )
}
