"use client"

import { ReactNode, useState } from "react"
import Link from "next/link"

interface NosotrosCardV2Props {
  imageSrc: string
  imageAlt: string
  title: string
  description: ReactNode
  href?: string
}

export function NosotrosCardV2({ imageSrc, imageAlt, title, description, href }: NosotrosCardV2Props) {
  const [isHovered, setIsHovered] = useState(false)

  const hoverHandlers = href
    ? {
        onMouseEnter: () => setIsHovered(true),
        onMouseLeave: () => setIsHovered(false),
      }
    : {}

  const image = (
    <div
      style={{
        overflow: "hidden",
        borderRadius: "50%",
        width: "200px",
        height: "200px",
        margin: "0 auto",
      }}
    >
      <img
        src={imageSrc}
        alt={imageAlt}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: "block",
          transition: "transform 0.3s ease",
          transform: href && isHovered ? "scale(1.08)" : undefined,
        }}
        {...hoverHandlers}
      />
    </div>
  )

  const titleSpan = (
    <span
      style={{
        fontFamily: "var(--font-display)",
        fontWeight: 700,
        fontSize: "1.15rem",
        color: href && isHovered ? "#e3000f" : "var(--color-primary)",
        borderBottom: "2px solid var(--color-primary)",
        paddingBottom: "4px",
        display: "inline-block",
      }}
      {...hoverHandlers}
    >
      {title}
    </span>
  )

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
      {href ? (
        <Link href={href} style={{ textDecoration: "none" }}>
          {image}
          {titleSpan}
        </Link>
      ) : (
        <>
          {image}
          {titleSpan}
        </>
      )}

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
