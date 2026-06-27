import { ReactNode } from "react";

type Size = "xl" | "lg" | "md" | "sm";
type Color = "white" | "navy" | "blue";
type As = "h1" | "h2" | "h3" | "h4";
type AccentColor = "red" | "aqua";

interface HeadingProps {
  children: ReactNode;
  size?: Size;
  color?: Color;
  as?: As;
  accentDot?: boolean;
  accentLine?: string;
  accentColor?: AccentColor;
}

const accentColorMap: Record<AccentColor, string> = {
  red: "var(--color-accent)",
  aqua: "var(--color-aqua)",
};

const sizeStyles: Record<Size, React.CSSProperties> = {
  xl: { fontSize: "clamp(2.5rem, 5vw, 3.75rem)", lineHeight: 1.1 },
  lg: { fontSize: "clamp(2rem, 4vw, 3rem)", lineHeight: 1.1 },
  md: { fontSize: "clamp(1.75rem, 3vw, 2.25rem)", lineHeight: 1.15 },
  sm: { fontSize: "clamp(1.5rem, 2.5vw, 1.875rem)", lineHeight: 1.2 },
};

const colorMap: Record<Color, string> = {
  white: "var(--color-white)",
  navy: "var(--color-navy)",
  blue: "var(--color-primary)",
};

export function Heading({ children, size = "xl", color = "white", as: Tag = "h1", accentDot = false, accentLine, accentColor = "red" }: HeadingProps) {
  return (
    <Tag
      style={{
        fontFamily: "var(--font-display)",
        fontWeight: 800,
        fontStyle: "normal",
        textTransform: "none",
        letterSpacing: "-0.02em",
        color: colorMap[color],
        margin: 0,
        ...sizeStyles[size],
      }}
    >
      <span style={{ display: "block" }}>
        {children}
        {accentDot && <span style={{ color: accentColorMap[accentColor] }}>.</span>}
      </span>
      {accentLine && (
        <span style={{ display: "block", color: accentColorMap[accentColor] }}>{accentLine}</span>
      )}
    </Tag>
  );
}
