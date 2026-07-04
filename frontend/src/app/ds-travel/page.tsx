"use client"

import { AmenityBadge } from "@/components/travel/AmenityBadge"
import { SeatTypeBadge } from "@/components/travel/SeatTypeBadge"

const AMENITY_TYPES = ["wifi", "ac", "usb", "bathroom", "entertainment"] as const
const SEAT_TYPES = ["cama", "semi-cama", "ejecutivo"] as const

const groupTitleStyle: React.CSSProperties = {
  fontFamily: "var(--font-body)",
  fontSize: "var(--text-sm)",
  color: "var(--color-text-muted)",
  marginBottom: "16px",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
}

export default function DsTravelPage() {
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
        Design System — Travel Badges
      </h1>

      <h2 style={groupTitleStyle}>AmenityBadge — icon-label</h2>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
        {AMENITY_TYPES.map((type) => (
          <AmenityBadge key={type} type={type} mode="icon-label" />
        ))}
      </div>

      <h2 style={{ ...groupTitleStyle, marginTop: "48px" }}>
        AmenityBadge — icon-only
      </h2>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
        {AMENITY_TYPES.map((type) => (
          <AmenityBadge key={type} type={type} mode="icon-only" />
        ))}
      </div>

      <h2 style={{ ...groupTitleStyle, marginTop: "48px" }}>SeatTypeBadge</h2>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
        {SEAT_TYPES.map((type) => (
          <SeatTypeBadge key={type} type={type} />
        ))}
      </div>
    </div>
  )
}
