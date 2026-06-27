"use client";

import { ButtonHTMLAttributes, ReactNode, useState } from "react";

type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
}

const sizeStyles: Record<Size, React.CSSProperties> = {
  sm: { padding: "8px 16px", fontSize: "14px" },
  md: { padding: "12px 24px", fontSize: "16px" },
  lg: { padding: "16px 32px", fontSize: "18px" },
};

const variantBase: Record<Variant, React.CSSProperties> = {
  primary: {
    background: "var(--color-accent)",
    color: "var(--color-white)",
    border: "none",
  },
  secondary: {
    background: "var(--color-primary)",
    color: "var(--color-white)",
    border: "none",
  },
  ghost: {
    background: "transparent",
    color: "var(--color-primary)",
    border: "1px solid var(--color-primary)",
  },
};

const variantHover: Record<Variant, React.CSSProperties> = {
  primary: { background: "#b80010" },
  secondary: { background: "#0f1f74" },
  ghost: { background: "var(--color-primary)", color: "var(--color-white)" },
};

const variantActive: Record<Variant, React.CSSProperties> = {
  primary: { background: "#950d0d" },
  secondary: { background: "#0a1650" },
  ghost: { background: "#0a1650", color: "var(--color-white)" },
};

export function Button({
  variant = "primary",
  size = "md",
  children,
  disabled,
  style,
  ...rest
}: ButtonProps) {
  const [hovered, setHovered] = useState(false);
  const [active, setActive] = useState(false);

  const interactionStyle: React.CSSProperties =
    !disabled && active
      ? { ...variantActive[variant], transform: "translateY(0px)" }
      : !disabled && hovered
      ? { ...variantHover[variant], transform: "translateY(-1px)" }
      : {};

  const disabledStyle: React.CSSProperties = disabled
    ? { opacity: 0.5, cursor: "not-allowed", pointerEvents: "none" }
    : {};

  return (
    <button
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setActive(false); }}
      onMouseDown={() => setActive(true)}
      onMouseUp={() => setActive(false)}
      style={{
        fontFamily: "var(--font-display)",
        fontWeight: 700,
        fontStyle: "italic",
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        borderRadius: "var(--radius-pill)",
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        transition: `all var(--duration-base) var(--ease-out)`,
        boxShadow: "none",
        lineHeight: 1,
        ...variantBase[variant],
        ...sizeStyles[size],
        ...interactionStyle,
        ...disabledStyle,
        ...style,
      }}
      {...rest}
    >
      {children}
    </button>
  );
}
