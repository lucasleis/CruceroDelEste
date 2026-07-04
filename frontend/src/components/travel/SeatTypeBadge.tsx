"use client";

type SeatType = "cama" | "semi-cama" | "ejecutivo";

interface SeatTypeBadgeProps {
  type: SeatType;
  className?: string;
}

const seatLabel: Record<SeatType, string> = {
  cama: "Cama",
  "semi-cama": "Semi Cama",
  ejecutivo: "Ejecutivo",
};

const seatStyle: Record<SeatType, React.CSSProperties> = {
  cama: {
    background: "var(--color-primary)",
    color: "var(--color-white)",
    border: "none",
  },
  "semi-cama": {
    background: "var(--color-aqua)",
    color: "var(--color-navy)",
    border: "none",
  },
  ejecutivo: {
    background: "transparent",
    color: "var(--color-text-muted)",
    border: "1px solid var(--color-border)",
  },
};

export function SeatTypeBadge({ type, className }: SeatTypeBadgeProps) {
  return (
    <span
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "6px 14px",
        borderRadius: "var(--radius-pill)",
        fontFamily: "var(--font-display)",
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.04em",
        fontSize: "12px",
        lineHeight: 1,
        ...seatStyle[type],
      }}
    >
      {seatLabel[type]}
    </span>
  );
}
