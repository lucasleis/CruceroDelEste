"use client"

import Image from "next/image"
import { useState } from "react"

interface DestinationCardV2Props {
  image: string
  city: string
  description: string
  price: number
  fromCity: string
}

export function DestinationCardV2({
  image,
  city,
  description,
  price,
  fromCity,
}: DestinationCardV2Props) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      style={{
        display: "inline-flex",
        flexDirection: "column",
        width: "220px",
        gap: "10px",
        cursor: "pointer",
        transform: hovered ? "translateY(-3px)" : "translateY(0)",
        transition: "transform var(--duration-base) var(--ease-out)",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Image */}
      <div
        style={{
          height: "280px",
          position: "relative",
          borderRadius: "var(--radius-md)",
          overflow: "hidden",
        }}
      >
        <Image
          src={image}
          alt={city}
          fill
          style={{
            objectFit: "cover",
            transform: hovered ? "scale(1.06)" : "scale(1)",
            transition: `transform var(--duration-slow) var(--ease-out)`,
          }}
        />

        {/* Badge */}
        <div
          style={{
            position: "absolute",
            top: "10px",
            left: "10px",
            background: "rgba(30, 40, 100, 0.7)",
            backdropFilter: "blur(6px)",
            borderRadius: "var(--radius-pill)",
            padding: "5px 12px",
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
      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
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

        <div style={{ marginTop: "4px", fontFamily: "var(--font-body)", fontSize: "var(--text-sm)" }}>
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
