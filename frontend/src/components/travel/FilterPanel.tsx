"use client";

import { AmenityBadge } from "@/components/travel/AmenityBadge";

type SeatType = "cama" | "semi-cama" | "ejecutivo";
type DeparturePeriod = "morning" | "afternoon" | "night";
type AmenityType = "wifi" | "ac" | "usb" | "bathroom" | "entertainment";

export interface FilterState {
  seatTypes: SeatType[];
  departurePeriods: DeparturePeriod[];
  amenities: AmenityType[];
}

interface FilterPanelProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  className?: string;
}

const SEAT_OPTIONS: { value: SeatType; label: string }[] = [
  { value: "cama", label: "Cama" },
  { value: "semi-cama", label: "Semi Cama" },
  { value: "ejecutivo", label: "Ejecutivo" },
];

const PERIOD_OPTIONS: { value: DeparturePeriod; label: string }[] = [
  { value: "morning", label: "Mañana (05:00 - 12:00)" },
  { value: "afternoon", label: "Tarde (12:00 - 18:00)" },
  { value: "night", label: "Noche (18:00 - 05:00)" },
];

const AMENITY_OPTIONS: AmenityType[] = [
  "wifi",
  "ac",
  "usb",
  "bathroom",
  "entertainment",
];

const sectionTitleStyle: React.CSSProperties = {
  fontFamily: "var(--font-display)",
  color: "var(--color-text-primary)",
  fontWeight: 700,
  fontSize: "0.85rem",
  textTransform: "uppercase",
  marginBottom: "12px",
};

const dividerStyle: React.CSSProperties = {
  border: "none",
  borderTop: "1px solid var(--color-border)",
  margin: "16px 0",
};

const rowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  marginBottom: "10px",
};

const labelStyle: React.CSSProperties = {
  fontFamily: "var(--font-body)",
  color: "var(--color-text-body)",
  fontSize: "14px",
  flex: 1,
};

const checkboxStyle: React.CSSProperties = {
  accentColor: "var(--color-primary)",
  width: "16px",
  height: "16px",
  cursor: "pointer",
};

export function FilterPanel({ filters, onFilterChange, className }: FilterPanelProps) {
  const { seatTypes, departurePeriods, amenities } = filters;

  function toggle<T>(list: T[], value: T, key: keyof FilterState) {
    const next = list.includes(value)
      ? list.filter((item) => item !== value)
      : [...list, value];
    onFilterChange({ ...filters, [key]: next });
  }

  function handleClear() {
    onFilterChange({ seatTypes: [], departurePeriods: [], amenities: [] });
  }

  return (
    <div
      className={className}
      style={{
        background: "var(--color-white)",
        boxShadow: "var(--shadow-sm)",
        borderRadius: "var(--radius-md)",
        padding: "24px",
        width: "280px",
      }}
    >
      <h3 style={sectionTitleStyle}>Tipo de asiento</h3>
      {SEAT_OPTIONS.map((option) => (
        <label key={option.value} style={rowStyle}>
          <input
            type="checkbox"
            style={checkboxStyle}
            checked={seatTypes.includes(option.value)}
            onChange={() => toggle(seatTypes, option.value, "seatTypes")}
          />
          <span style={labelStyle}>{option.label}</span>
        </label>
      ))}

      <hr style={dividerStyle} />

      <h3 style={sectionTitleStyle}>Horario de salida</h3>
      {PERIOD_OPTIONS.map((option) => (
        <label key={option.value} style={rowStyle}>
          <input
            type="checkbox"
            style={checkboxStyle}
            checked={departurePeriods.includes(option.value)}
            onChange={() =>
              toggle(departurePeriods, option.value, "departurePeriods")
            }
          />
          <span style={labelStyle}>{option.label}</span>
        </label>
      ))}

      <hr style={dividerStyle} />

      <h3 style={sectionTitleStyle}>Servicios abordo</h3>
      {AMENITY_OPTIONS.map((amenity) => (
        <label key={amenity} style={rowStyle}>
          <input
            type="checkbox"
            style={checkboxStyle}
            checked={amenities.includes(amenity)}
            onChange={() => toggle(amenities, amenity, "amenities")}
          />
          <AmenityBadge type={amenity} mode="icon-label" />
        </label>
      ))}

      <button
        type="button"
        onClick={handleClear}
        style={{
          width: "100%",
          background: "transparent",
          color: "var(--color-text-muted)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-sm)",
          fontFamily: "var(--font-body)",
          fontSize: "14px",
          padding: "10px 16px",
          marginTop: "20px",
          cursor: "pointer",
        }}
      >
        Limpiar filtros
      </button>
    </div>
  );
}
