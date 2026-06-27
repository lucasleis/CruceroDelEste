import { ReactNode } from "react";

type Size = "lg" | "md" | "sm";
type Color = "white" | "navy" | "muted";
type As = "p" | "h2" | "h3" | "h4";

interface SubheadingProps {
  children: ReactNode;
  size?: Size;
  color?: Color;
  as?: As;
}

const sizeStyles: Record<Size, React.CSSProperties> = {
  lg: { fontSize: "1.25rem", lineHeight: 1.625 },
  md: { fontSize: "1.125rem", lineHeight: 1.625 },
  sm: { fontSize: "1rem", lineHeight: 1.625 },
};

const colorMap: Record<Color, string> = {
  white: "#ffffff",
  navy: "#0a1656",
  muted: "#6b7280",
};

export function Subheading({ children, size = "md", color = "white", as: Tag = "p" }: SubheadingProps) {
  return (
    <Tag
      style={{
        fontFamily: "var(--font-body)",
        fontWeight: 600,
        color: colorMap[color],
        margin: 0,
        ...sizeStyles[size],
      }}
    >
      {children}
    </Tag>
  );
}
