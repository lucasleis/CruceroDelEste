"use client"

import { ReactNode } from "react"

interface NosotrosCardProps {
  title: string
  description: string
  icon: ReactNode
  showDivider: boolean
}

export function NosotrosCard({ title, description, icon, showDivider }: NosotrosCardProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        padding: "24px 16px",
        gap: "12px",
        height: "100%",
        borderRight: showDivider ? "1px solid var(--color-border)" : undefined,
      }}
    >
      {/* Icon circle */}
      <div
        style={{
          width: "72px",
          height: "72px",
          borderRadius: "50%",
          background: "var(--color-primary)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
        }}
      >
        {icon}
      </div>

      {/* Title */}
      <span
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 800,
          fontSize: "var(--text-xl)",
          color: "var(--color-navy)",
          lineHeight: 1.2,
        }}
      >
        {title}
      </span>

      {/* Red divider */}
      <div
        style={{
          width: "32px",
          height: "3px",
          background: "var(--color-accent)",
          margin: "4px auto",
        }}
      />

      {/* Description */}
      <p
        style={{
          fontFamily: "var(--font-body)",
          fontSize: "var(--text-sm)",
          color: "var(--color-text-body)",
          lineHeight: 1.6,
          marginTop: "4px",
        }}
      >
        {description}
      </p>
    </div>
  )
}
