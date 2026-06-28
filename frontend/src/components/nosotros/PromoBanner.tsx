import { ReactNode } from "react"

const DefaultIcon = () => (
  <div
    style={{
      width: "48px",
      height: "48px",
      border: "2px solid rgba(255,255,255,0.4)",
      borderRadius: "50%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    }}
  >
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  </div>
)

interface PromoBannerProps {
  icon?: ReactNode
  text?: string
  highlight?: string
}

export function PromoBanner({
  icon = <DefaultIcon />,
  text = "Miles de pasajeros eligen viajar con nosotros todos los días.",
  highlight = "¡Sumate a la experiencia Expreso Río Paraná!",
}: PromoBannerProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "24px",
        background: "var(--color-navy)",
        borderRadius: "var(--radius-lg)",
        padding: "24px 40px",
        width: "fit-content",
      }}
    >
      {icon}

      <div style={{ width: "1px", height: "40px", background: "var(--color-accent)", flexShrink: 0 }} />

      <p style={{ fontFamily: "var(--font-body)", fontSize: "1rem", color: "white", margin: 0 }}>
        {text}{" "}
        <span style={{ color: "var(--color-accent)", fontWeight: 700 }}>{highlight}</span>
      </p>
    </div>
  )
}
