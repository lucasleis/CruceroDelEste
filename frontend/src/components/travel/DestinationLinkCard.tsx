import Link from "next/link"

interface DestinationLinkCardProps {
  stopId: string
  stopName: string
  country: "AR" | "PY"
  className?: string
}

export function DestinationLinkCard({ stopId, stopName, country, className }: DestinationLinkCardProps) {
  return (
    <Link
      href={`/resultados?destinationId=${stopId}`}
      className={className}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "4px",
        padding: "16px 20px",
        background: "white",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-md)",
        boxShadow: "var(--shadow-sm)",
        textDecoration: "none",
        cursor: "pointer",
        transition: "box-shadow 0.15s ease, border-color 0.15s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = "var(--shadow-md)"
        e.currentTarget.style.borderColor = "var(--color-primary)"
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "var(--shadow-sm)"
        e.currentTarget.style.borderColor = "var(--color-border)"
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-body)",
          fontSize: "1rem",
          fontWeight: 600,
          color: "var(--color-navy)",
        }}
      >
        {stopName}
      </span>
      <span
        style={{
          fontFamily: "var(--font-body)",
          fontSize: "0.75rem",
          color: "var(--color-text-muted)",
        }}
      >
        {country === "AR" ? "Argentina" : "Paraguay"}
      </span>
    </Link>
  )
}
