"use client";

import type { CSSProperties } from "react";
import { TripCard } from "@/components/travel/TripCard";

const sectionHeadingStyle: CSSProperties = {
  fontFamily: "var(--font-display)",
  color: "var(--color-text-primary)",
  fontWeight: 600,
  fontSize: "14px",
  marginBottom: "8px",
};

export default function DsTravelPage() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "32px",
        padding: "32px",
        maxWidth: "960px",
        margin: "0 auto",
      }}
    >
      <h1
        style={{
          fontFamily: "var(--font-display)",
          color: "var(--color-text-primary)",
          fontWeight: 700,
          fontSize: "24px",
        }}
      >
        Design System — TripCard
      </h1>

      <div>
        <div style={sectionHeadingStyle}>Alta disponibilidad</div>
        <TripCard
          departureTime="21:30"
          departureDate="2026-07-08"
          arrivalTime="14:15"
          arrivalDate="2026-07-09"
          origin="Retiro"
          destination="Asunción"
          durationMinutes={1005}
          isDirect={true}
          seatTypes={["cama"]}
          amenities={["wifi", "ac", "usb"]}
          priceFrom={45000}
          availableSeats={18}
          onSelect={() => {}}
        />
      </div>

      <div>
        <div style={sectionHeadingStyle}>Disponibilidad media</div>
        <TripCard
          departureTime="19:00"
          departureDate="2026-07-08"
          arrivalTime="11:30"
          arrivalDate="2026-07-09"
          origin="Retiro"
          destination="Asunción"
          durationMinutes={990}
          isDirect={true}
          seatTypes={["semi-cama"]}
          amenities={["ac", "bathroom"]}
          priceFrom={38000}
          availableSeats={7}
          onSelect={() => {}}
        />
      </div>

      <div>
        <div style={sectionHeadingStyle}>Últimos asientos</div>
        <TripCard
          departureTime="22:45"
          departureDate="2026-07-08"
          arrivalTime="15:20"
          arrivalDate="2026-07-09"
          origin="Retiro"
          destination="Asunción"
          durationMinutes={995}
          isDirect={false}
          seatTypes={["cama", "ejecutivo"]}
          amenities={["wifi", "ac", "usb", "bathroom", "entertainment"]}
          priceFrom={52000}
          availableSeats={3}
          onSelect={() => {}}
        />
      </div>
    </div>
  );
}
