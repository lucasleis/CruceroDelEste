import Image from "next/image"
import { Heading } from "@/components/core/Heading"
import { BodyText } from "@/components/core/BodyText"
import { CTANewsletterWrapper } from "./CTANewsletterWrapper"

export function CTA() {
  return (
    <section
      style={{
        background: "white",
        display: "flex",
        justifyContent: "center",
        padding: "48px 32px",
      }}
    >
      {/* Card */}
      <div
        style={{
          position: "relative",
          overflow: "hidden",
          minHeight: "clamp(280px, 35vw, 420px)",
          borderRadius: "20px",
          display: "flex",
          alignItems: "center",
          width: "clamp(600px, 85vw, 1100px)",
          margin: "0 auto",
        }}
      >
        {/* Background image */}
        <Image
          src="/secciones/CTA.png"
          alt=""
          fill
          priority={false}
          style={{ objectFit: "cover", objectPosition: "center", zIndex: 0 }}
        />

        {/* White overlay */}
        <div style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,0.20)", zIndex: 1 }} />

        {/* Content */}
        <div
          style={{
            position: "relative",
            zIndex: 10,
            padding: "clamp(24px, 4vw, 48px) clamp(24px, 5vw, 64px)",
            display: "flex",
            flexDirection: "column",
            gap: "20px",
            width: "clamp(260px, 45%, 480px)",
          }}
        >
          <Heading as="h2" size="lg" color="navy" accentLine="Siempre juntos." accentColor="red">
            Tu destino, nuestra experiencia.
          </Heading>

          <BodyText color="navy" size="sm">
            Te acercamos a lo que más importa.
          </BodyText>

          <BodyText color="navy" size="sm">
            Viajes seguros, cómodos y confiables por todo el país.
          </BodyText>

          <div style={{ maxWidth: "clamp(240px, 30vw, 320px)" }}>
            <CTANewsletterWrapper />
          </div>
        </div>
      </div>
    </section>
  )
}
