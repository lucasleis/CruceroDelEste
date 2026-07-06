import { ReactNode } from "react"

interface NosotrosCardV2Props {
  imageSrc: string
  imageAlt: string
  title: string
  description: ReactNode
}

export function NosotrosCardV2({ imageSrc, imageAlt, title, description }: NosotrosCardV2Props) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        gap: "20px",
      }}
    >
      <img
        src={imageSrc}
        alt={imageAlt}
        style={{
          width: "200px",
          height: "200px",
          borderRadius: "50%",
          objectFit: "cover",
          display: "block",
          margin: "0 auto",
        }}
      />

      <span
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 700,
          fontSize: "1.15rem",
          color: "var(--color-primary)",
          borderBottom: "2px solid var(--color-primary)",
          paddingBottom: "4px",
          display: "inline-block",
        }}
      >
        {title}
      </span>

      <p
        style={{
          fontFamily: "var(--font-body)",
          fontSize: "0.95rem",
          color: "var(--color-text-body)",
          lineHeight: 1.6,
          textAlign: "center",
          margin: 0,
        }}
      >
        {description}
      </p>
    </div>
  )
}
