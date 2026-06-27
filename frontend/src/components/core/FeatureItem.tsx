import { ReactNode } from "react";

type Color = "white" | "navy";

interface FeatureItemProps {
  children: ReactNode;
  icon?: ReactNode;
  color?: Color;
}

const textColorMap: Record<Color, string> = {
  white: "#ffffff",
  navy: "#374151",
};

export function FeatureItem({ children, icon, color = "white" }: FeatureItemProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
      }}
    >
      {icon && (
        <span
          style={{
            width: "20px",
            height: "20px",
            flexShrink: 0,
            color: textColorMap[color],
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {icon}
        </span>
      )}
      <span
        style={{
          fontFamily: "var(--font-body)",
          fontSize: "1rem",
          fontWeight: 400,
          color: textColorMap[color],
        }}
      >
        {children}
      </span>
    </div>
  );
}
