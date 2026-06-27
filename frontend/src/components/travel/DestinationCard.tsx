"use client"

import Image from "next/image"

interface DestinationCardProps {
  image?: string
  city?: string
  description?: string
  price?: number
  fromCity?: string
}

export function DestinationCard({
  image = "/secciones/Destinos-Dest1.jpg",
  city = "Buenos Aires",
  description = "Capital de Argentina",
  price = 18000,
  fromCity = "Concordia",
}: DestinationCardProps) {
  return (
    <div
      style={{
        display: "inline-flex",
        flexDirection: "column",
        width: "220px",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-md)",
        overflow: "hidden",
        boxShadow: "var(--shadow-sm)",
        background: "white",
        cursor: "pointer",
        transition: `transform var(--duration-base) var(--ease-out), box-shadow var(--duration-base) var(--ease-out)`,
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget
        el.style.transform = "translateY(-3px)"
        el.style.boxShadow = "var(--shadow-md)"
        const img = el.querySelector<HTMLElement>(".dest-card-img")
        if (img) img.style.transform = "scale(1.06)"
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget
        el.style.transform = ""
        el.style.boxShadow = "var(--shadow-sm)"
        const img = el.querySelector<HTMLElement>(".dest-card-img")
        if (img) img.style.transform = ""
      }}
    >
      {/* Image */}
      <div style={{ height: "180px", position: "relative", overflow: "hidden" }}>
        <Image
          src={image}
          alt={city}
          fill
          className="dest-card-img"
          style={{
            objectFit: "cover",
            transition: `transform var(--duration-slow) var(--ease-out)`,
          }}
        />

        {/* Badge */}
        <div
          style={{
            position: "absolute",
            top: "10px",
            left: "10px",
            background: "rgba(0,0,0,0.55)",
            backdropFilter: "blur(6px)",
            borderRadius: "var(--radius-pill)",
            padding: "4px 10px",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="2" y="7" width="20" height="13" rx="2" />
            <path d="M17 7V5a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v2" />
            <line x1="12" y1="12" x2="12" y2="12" />
            <line x1="7" y1="12" x2="7" y2="12" />
            <line x1="17" y1="12" x2="17" y2="12" />
          </svg>
          <span
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "var(--text-xs)",
              fontWeight: 500,
              color: "white",
            }}
          >
            Desde {fromCity}
          </span>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: "12px", display: "flex", flexDirection: "column", gap: "4px" }}>
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 800,
            fontSize: "var(--text-lg)",
            color: "var(--color-navy)",
          }}
        >
          {city}
        </span>

        <span
          style={{
            fontFamily: "var(--font-body)",
            fontSize: "var(--text-xs)",
            color: "var(--color-text-muted)",
          }}
        >
          {description}
        </span>

        {/* Price row */}
        <div style={{ marginTop: "8px", fontFamily: "var(--font-body)", fontSize: "var(--text-sm)" }}>
          <span style={{ color: "var(--color-text-muted)" }}>Desde $ </span>
          <span style={{ color: "var(--color-navy)", fontWeight: 600 }}>
            {price.toLocaleString("es-AR")}
          </span>
          <span style={{ color: "var(--color-text-muted)" }}> / Por persona</span>
        </div>
      </div>
    </div>
  )
}
