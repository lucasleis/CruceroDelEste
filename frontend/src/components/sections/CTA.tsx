import Image from "next/image"
import { Heading } from "@/components/core/Heading"
import { BodyText } from "@/components/core/BodyText"
import { CTANewsletterWrapper } from "./CTANewsletterWrapper"

export function CTA() {
  return (
    <section
      style={{
        width: "100%",
        position: "relative",
        overflow: "hidden",
        minHeight: "340px",
        borderRadius: "20px",
        display: "flex",
        alignItems: "center",
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
          padding: "40px 48px",
          display: "flex",
          flexDirection: "column",
          gap: "20px",
          width: "50%",
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

        <div style={{ maxWidth: "320px" }}>
          <CTANewsletterWrapper />
        </div>
      </div>
    </section>
  )
}
