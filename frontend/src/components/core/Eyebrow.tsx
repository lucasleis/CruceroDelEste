import { ReactNode } from "react";

type Color = "red" | "navy" | "white";

interface EyebrowProps {
  children: ReactNode;
  color?: Color;
}

const colorMap: Record<Color, string> = {
  red: "var(--color-accent)",
  navy: "var(--color-navy)",
  white: "var(--color-white)",
};

export function Eyebrow({ children, color = "red" }: EyebrowProps) {
  return (
    <p
      style={{
        fontFamily: "var(--font-body)",
        fontSize: "0.75rem",
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "0.15em",
        color: colorMap[color],
        margin: 0,
      }}
    >
      {children}
    </p>
  );
}
