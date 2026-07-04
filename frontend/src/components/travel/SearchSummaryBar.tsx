"use client";

import { Bus, ArrowRight, MapPin, Calendar, User, Pencil } from "lucide-react";

interface SearchSummaryBarProps {
  origin: string;
  destination: string;
  date: string;
  passengerCount: number;
  onEditClick: () => void;
  className?: string;
}

const dividerStyle: React.CSSProperties = {
  width: "1px",
  height: "20px",
  background: "var(--color-border)",
};

const routeTextStyle: React.CSSProperties = {
  fontFamily: "var(--font-display)",
  color: "var(--color-text-primary)",
  fontWeight: 600,
  fontSize: "15px",
};

const bodyTextStyle: React.CSSProperties = {
  fontFamily: "var(--font-body)",
  color: "var(--color-text-body)",
  fontSize: "14px",
};

export function SearchSummaryBar({
  origin,
  destination,
  date,
  passengerCount,
  onEditClick,
  className,
}: SearchSummaryBarProps) {
  return (
    <div
      className={className}
      style={{
        width: "100%",
        background: "var(--color-white)",
        boxShadow: "var(--shadow-sm)",
        padding: "16px 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Bus size={18} color="var(--color-text-primary)" />
          <span style={routeTextStyle}>{origin}</span>
        </div>

        <ArrowRight size={16} color="var(--color-text-muted)" />

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <MapPin size={18} color="var(--color-text-primary)" />
          <span style={routeTextStyle}>{destination}</span>
        </div>

        <div style={dividerStyle} />

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Calendar size={16} color="var(--color-text-body)" />
          <span style={bodyTextStyle}>{date}</span>
        </div>

        <div style={dividerStyle} />

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <User size={16} color="var(--color-text-body)" />
          <span style={bodyTextStyle}>
            {passengerCount} pasajero{passengerCount === 1 ? "" : "s"}
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={onEditClick}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          background: "transparent",
          color: "var(--color-primary)",
          border: "1px solid var(--color-primary)",
          borderRadius: "var(--radius-sm)",
          fontFamily: "var(--font-body)",
          fontSize: "14px",
          padding: "10px 16px",
          cursor: "pointer",
        }}
      >
        <Pencil size={14} color="var(--color-primary)" />
        Editar búsqueda
      </button>
    </div>
  );
}
