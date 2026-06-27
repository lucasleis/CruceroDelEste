"use client";

import { ButtonHTMLAttributes, ReactNode, useState } from "react";

const BusIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="7" width="20" height="13" rx="2"/><path d="M17 7V5a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v2"/><line x1="12" y1="12" x2="12" y2="12"/><line x1="7" y1="12" x2="7" y2="12"/><line x1="17" y1="12" x2="17" y2="12"/>
  </svg>
);

const ArrowIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
  </svg>
);

type Variant = "blue" | "navy" | "danger";

interface BlueButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: Variant;
  icon?: string;
  arrow?: boolean;
}

const variantStyles: Record<Variant, { base: string; hover: string; active: string; radius: string }> = {
  blue: {
    base: "var(--color-primary)",
    hover: "#0f1f74",
    active: "#0a1650",
    radius: "var(--radius-sm)",
  },
  navy: {
    base: "var(--color-navy)",
    hover: "var(--color-navy-dark)",
    active: "#040b28",
    radius: "var(--radius-pill)",
  },
  danger: {
    base: "var(--color-accent)",
    hover: "#b80010",
    active: "#9a000d",
    radius: "var(--radius-pill)",
  },
};

export function BlueButton({
  children,
  variant = "blue",
  icon,
  arrow = false,
  disabled,
  style,
  ...rest
}: BlueButtonProps) {
  const [hovered, setHovered] = useState(false);
  const [active, setActive] = useState(false);

  const v = variantStyles[variant];

  const interactionStyle: React.CSSProperties =
    !disabled && active
      ? { background: v.active, transform: "translateY(0px)" }
      : !disabled && hovered
      ? { background: v.hover, transform: "translateY(-1px)" }
      : {};

  return (
    <button
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setActive(false); }}
      onMouseDown={() => setActive(true)}
      onMouseUp={() => setActive(false)}
      style={{
        background: v.base,
        color: "var(--color-white)",
        fontFamily: "var(--font-body)",
        fontWeight: 700,
        fontSize: "16px",
        padding: "12px 24px",
        borderRadius: v.radius,
        border: "none",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        pointerEvents: disabled ? "none" : undefined,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
        transition: `all var(--duration-base) var(--ease-out)`,
        boxShadow: "none",
        lineHeight: 1,
        ...interactionStyle,
        ...style,
      }}
      {...rest}
    >
      {icon && <BusIcon />}
      {children}
      {arrow && <ArrowIcon />}
    </button>
  );
}
