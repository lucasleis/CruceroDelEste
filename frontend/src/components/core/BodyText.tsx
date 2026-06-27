import { ReactNode } from "react";

type Size = "lg" | "md" | "sm";
type Color = "body" | "navy" | "muted" | "white";
type As = "p" | "span" | "div";

interface BodyTextProps {
  children: ReactNode;
  size?: Size;
  color?: Color;
  as?: As;
}

const sizeStyles: Record<Size, React.CSSProperties> = {
  lg: { fontSize: "1.125rem", lineHeight: 1.625 },
  md: { fontSize: "1rem", lineHeight: 1.625 },
  sm: { fontSize: "0.875rem", lineHeight: 1.625 },
};

const colorMap: Record<Color, string> = {
  body: "#374151",
  navy: "#0a1656",
  muted: "#6b7280",
  white: "#ffffff",
};

export function BodyText({ children, size = "md", color = "body", as: Tag = "p" }: BodyTextProps) {
  return (
    <Tag
      style={{
        fontFamily: "var(--font-body)",
        fontWeight: 400,
        color: colorMap[color],
        margin: 0,
        ...sizeStyles[size],
      }}
    >
      {children}
    </Tag>
  );
}
