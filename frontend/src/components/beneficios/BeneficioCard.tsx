import { ReactNode } from "react"
import { Heading } from "@/components/core/Heading"
import { BodyText } from "@/components/core/BodyText"

interface BeneficioCardProps {
  imageSrc: string
  imageAlt: string
  icon: ReactNode
  title: string
  description: string
}

export function BeneficioCard({ imageSrc, imageAlt, icon, title, description }: BeneficioCardProps) {
  return (
    <div
      style={{
        background: "var(--color-white)",
        borderRadius: "var(--radius-md)",
        boxShadow: "var(--shadow-sm)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <img
        src={imageSrc}
        alt={imageAlt}
        style={{
          width: "100%",
          height: "160px",
          objectFit: "cover",
          borderRadius: "var(--radius-md) var(--radius-md) 0 0",
          display: "block",
        }}
      />

      {/* Content area */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          padding: "20px 20px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          <span
            style={{
              display: "inline-flex",
              color: "var(--color-primary)",
              width: "28px",
              height: "28px",
            }}
          >
            {icon}
          </span>
        </div>

        <Heading as="h3" size="sm" color="navy">
          {title}
        </Heading>

        <BodyText color="body" size="md">
          {description}
        </BodyText>
      </div>
    </div>
  )
}
