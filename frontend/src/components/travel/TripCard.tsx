"use client";

import { useState, useEffect, memo } from "react";
import { ArrowRight, Clock } from "lucide-react";
import { SeatTypeBadge } from "@/components/travel/SeatTypeBadge";
import { AmenityBadge } from "@/components/travel/AmenityBadge";

type SeatType = "cama" | "semi-cama" | "ejecutivo";
type AmenityType = "wifi" | "ac" | "usb" | "bathroom" | "entertainment";

interface TripCardProps {
  departureTime: string;
  departureDate: string;
  arrivalTime: string;
  arrivalDate?: string;
  origin: string;
  destination: string;
  durationMinutes: number;
  isDirect: boolean;
  seatTypes: SeatType[];
  amenities: AmenityType[];
  priceFrom: number | null;
  availableSeats: number;
  onSelect: () => void;
  className?: string;
}

const priceFormatter = new Intl.NumberFormat("es-AR");

function formatDuration(durationMinutes: number): string {
  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;
  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
}

function getBorderColor(availableSeats: number): string {
  if (availableSeats > 10) return "var(--color-aqua)";
  if (availableSeats >= 5) return "var(--color-primary)";
  return "var(--color-accent)";
}

function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return isMobile;
}

export const TripCard = memo(function TripCard({
  departureTime,
  departureDate,
  arrivalTime,
  arrivalDate,
  origin,
  destination,
  durationMinutes,
  isDirect,
  seatTypes,
  amenities,
  priceFrom,
  availableSeats,
  onSelect,
  className,
}: TripCardProps) {
  const isUrgent = availableSeats <= 4;
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <div
        className={className}
        style={{
          display: "flex",
          flexDirection: "column",
          background: "var(--color-white)",
          boxShadow: "var(--shadow-sm)",
          borderRadius: "var(--radius-md)",
          borderLeft: `4px solid ${getBorderColor(availableSeats)}`,
          overflow: "hidden",
        }}
      >
        {/* Fila superior: horarios + info */}
        <div style={{ display: "flex" }}>
          {/* Columna horarios — igual que desktop */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "16px 12px",
              minWidth: "80px",
            }}
          >
            <span style={{ fontFamily: "var(--font-display)", color: "var(--color-primary)", fontWeight: 700, fontSize: "1.25rem", lineHeight: 1, alignSelf: "flex-start" }}>
              {departureTime}
            </span>
            <span style={{ fontFamily: "var(--font-body)", color: "var(--color-accent)", fontSize: "0.65rem", marginTop: "4px", alignSelf: "flex-start" }}>
              {departureDate}
            </span>
            <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "transparent", border: "1px solid var(--color-border)", margin: "6px 0" }} />
            <div style={{ width: "1px", height: "20px", background: "var(--color-border)" }} />
            <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--color-primary)", margin: "6px 0" }} />
            <span style={{ fontFamily: "var(--font-display)", color: "var(--color-primary)", fontWeight: 700, fontSize: "1.25rem", lineHeight: 1, alignSelf: "flex-start" }}>
              {arrivalTime}
            </span>
            {arrivalDate && arrivalDate !== departureDate && (
              <span style={{ fontFamily: "var(--font-body)", color: "var(--color-accent)", fontSize: "0.65rem", marginTop: "4px", alignSelf: "flex-start" }}>
                {arrivalDate}
              </span>
            )}
          </div>

          {/* Columna info */}
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-start",
              gap: "6px",
              padding: "16px 12px",
              paddingTop: "20px",
              borderLeft: "1px solid var(--color-border)",
              minWidth: 0,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontFamily: "var(--font-display)", color: "var(--color-text-primary)", fontWeight: 600, fontSize: "14px", flexWrap: "wrap" }}>
              <span>{origin}</span>
              <ArrowRight size={14} color="var(--color-text-primary)" />
              <span>{destination}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontFamily: "var(--font-body)", color: "var(--color-text-muted)", fontSize: "var(--text-xs)" }}>
              <Clock size={12} color="var(--color-text-muted)" />
              <span>{formatDuration(durationMinutes)}</span>
              <span>&bull;</span>
              <span>{isDirect ? "Directo" : "Con escala"}</span>
            </div>
            <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
              {seatTypes.map((seatType) => (
                <SeatTypeBadge key={seatType} type={seatType} />
              ))}
            </div>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {amenities.map((amenity) => (
                <AmenityBadge key={amenity} type={amenity} mode="icon-only" />
              ))}
            </div>
          </div>
        </div>

        {/* Fila inferior: precio + botón */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
            padding: "12px 16px",
            borderTop: "1px solid var(--color-border)",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
            <span style={{ fontFamily: "var(--font-body)", color: "var(--color-text-muted)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Desde
            </span>
            {priceFrom !== null ? (
              <span style={{ fontFamily: "var(--font-display)", color: "var(--color-text-primary)", fontWeight: 700, fontSize: "20px" }}>
                ${priceFormatter.format(priceFrom)}
              </span>
            ) : (
              <span style={{ fontFamily: "var(--font-body)", color: "var(--color-text-muted)", fontSize: "16px" }}>
                Sin precio
              </span>
            )}
            {isUrgent ? (
              <span style={{ display: "inline-flex", alignItems: "center", background: "var(--color-accent)", color: "var(--color-white)", borderRadius: "var(--radius-pill)", fontFamily: "var(--font-display)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", fontSize: "11px", padding: "3px 8px" }}>
                Últimos {availableSeats}
              </span>
            ) : (
              <span style={{ fontFamily: "var(--font-body)", color: "var(--color-text-muted)", fontSize: "11px" }}>
                {availableSeats} disponibles
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={onSelect}
            style={{
              background: "var(--color-accent)",
              color: "var(--color-white)",
              border: "none",
              borderRadius: "var(--radius-sm)",
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: "13px",
              padding: "10px 16px",
              cursor: "pointer",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            Ver asientos &rarr;
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={className}
      style={{
        display: "flex",
        background: "var(--color-white)",
        boxShadow: "var(--shadow-sm)",
        borderRadius: "var(--radius-md)",
        borderLeft: `4px solid ${getBorderColor(availableSeats)}`,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px",
          minWidth: "100px",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-display)",
            color: "var(--color-primary)",
            fontWeight: 700,
            fontSize: "1.5rem",
            lineHeight: 1,
            alignSelf: "flex-start",
          }}
        >
          {departureTime}
        </span>
        <span
          style={{
            fontFamily: "var(--font-body)",
            color: "var(--color-accent)",
            fontSize: "0.7rem",
            marginTop: "4px",
            alignSelf: "flex-start",
          }}
        >
          {departureDate}
        </span>

        <div
          style={{
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            background: "transparent",
            border: "1px solid var(--color-border)",
            margin: "6px 0",
          }}
        />
        <div
          style={{
            width: "1px",
            height: "24px",
            background: "var(--color-border)",
          }}
        />
        <div
          style={{
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            background: "var(--color-primary)",
            margin: "6px 0",
          }}
        />

        <span
          style={{
            fontFamily: "var(--font-display)",
            color: "var(--color-primary)",
            fontWeight: 700,
            fontSize: "1.5rem",
            lineHeight: 1,
            alignSelf: "flex-start",
          }}
        >
          {arrivalTime}
        </span>
        {arrivalDate && arrivalDate !== departureDate && (
          <span
            style={{
              fontFamily: "var(--font-body)",
              color: "var(--color-accent)",
              fontSize: "0.7rem",
              marginTop: "4px",
              alignSelf: "flex-start",
            }}
          >
            {arrivalDate}
          </span>
        )}
      </div>

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: "8px",
          padding: "20px 16px",
          borderLeft: "1px solid var(--color-border)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontFamily: "var(--font-display)",
            color: "var(--color-text-primary)",
            fontWeight: 600,
            fontSize: "16px",
          }}
        >
          <span>{origin}</span>
          <ArrowRight size={16} color="var(--color-text-primary)" />
          <span>{destination}</span>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            fontFamily: "var(--font-body)",
            color: "var(--color-text-muted)",
            fontSize: "13px",
          }}
        >
          <Clock size={14} color="var(--color-text-muted)" />
          <span>{formatDuration(durationMinutes)}</span>
          <span>&bull;</span>
          <span>{isDirect ? "Directo" : "Con escala"}</span>
        </div>

        <div style={{ display: "flex", gap: "6px" }}>
          {seatTypes.map((seatType) => (
            <SeatTypeBadge key={seatType} type={seatType} />
          ))}
        </div>

        <div style={{ display: "flex", gap: "8px" }}>
          {amenities.map((amenity) => (
            <AmenityBadge key={amenity} type={amenity} mode="icon-only" />
          ))}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "flex-end",
          gap: "6px",
          padding: "20px",
          minWidth: "200px",
          borderLeft: "1px solid var(--color-border)",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-body)",
            color: "var(--color-text-muted)",
            fontSize: "12px",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          Desde
        </span>
        {priceFrom !== null ? (
          <span
            style={{
              fontFamily: "var(--font-display)",
              color: "var(--color-text-primary)",
              fontWeight: 700,
              fontSize: "24px",
            }}
          >
            ${priceFormatter.format(priceFrom)}
          </span>
        ) : (
          <span
            style={{
              fontFamily: "var(--font-body)",
              color: "var(--color-text-muted)",
              fontSize: "24px",
            }}
          >
            Sin precio
          </span>
        )}

        {isUrgent ? (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              background: "var(--color-accent)",
              color: "var(--color-white)",
              borderRadius: "var(--radius-pill)",
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              fontSize: "12px",
              padding: "4px 12px",
            }}
          >
            Últimos {availableSeats}
          </span>
        ) : (
          <span
            style={{
              fontFamily: "var(--font-body)",
              color: "var(--color-text-muted)",
              fontSize: "13px",
            }}
          >
            {availableSeats} asientos disponibles
          </span>
        )}

        <button
          type="button"
          onClick={onSelect}
          style={{
            width: "100%",
            background: "var(--color-accent)",
            color: "var(--color-white)",
            border: "none",
            borderRadius: "var(--radius-sm)",
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: "14px",
            padding: "10px 16px",
            marginTop: "8px",
            cursor: "pointer",
          }}
        >
          Ver asientos &rarr;
        </button>
      </div>
    </div>
  );
});
