import { Heading } from "@/components/core/Heading"
import { BodyText } from "@/components/core/BodyText"
import { NosotrosCarousel } from "@/components/nosotros/NosotrosCarousel"
import { PromoBanner } from "@/components/nosotros/PromoBanner"

export function Nosotros() {
  return (
    <section style={{ width: "100%", background: "white", paddingTop: "80px", paddingBottom: "80px", paddingLeft: "32px", paddingRight: "32px" }}>
      <div style={{ maxWidth: "1280px", margin: "0 auto" }}>

        {/* Header */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            gap: "12px",
            marginBottom: "48px",
          }}
        >
          <span style={{ fontFamily: "var(--font-body)", fontSize: "0.85rem", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--color-accent)" }}>
            POR QUÉ ELEGIRNOS
          </span>
          <Heading as="h2" size="xl" color="navy">Viajes que van más allá</Heading>
          <div style={{ maxWidth: "520px" }}>
            <BodyText color="body" size="md">
              Nos enfocamos en cada detalle para que tu experiencia sea segura, cómoda y memorable.
            </BodyText>
          </div>
        </div>

        {/* Carousel */}
        <div style={{ marginBottom: "48px" }}>
          <NosotrosCarousel />
        </div>

        {/* PromoBanner */}
        <div style={{ display: "flex", justifyContent: "center" }}>
          <PromoBanner />
        </div>

      </div>
    </section>
  )
}
