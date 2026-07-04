"use client"

import { AmenityBadge } from "@/components/travel/AmenityBadge"
import { SeatTypeBadge } from "@/components/travel/SeatTypeBadge"
import { TripCard } from "@/components/travel/TripCard"
import { FilterPanel } from "@/components/travel/FilterPanel"
import { SearchSummaryBar } from "@/components/travel/SearchSummaryBar"

const AMENITY_TYPES = ["wifi", "ac", "usb", "bathroom", "entertainment"] as const
const SEAT_TYPES = ["cama", "semi-cama", "ejecutivo"] as const

const TRIP_CARDS = [
  {
    departureTime: "08:00",
    departureDate: "20 JUN",
    arrivalTime: "11:30",
    origin: "Buenos Aires (Retiro)",
    destination: "Rosario (Terminal)",
    durationMinutes: 210,
    isDirect: true,
    seatTypes: ["cama", "semi-cama"] as const,
    amenities: ["wifi", "ac", "usb"] as const,
    priceFrom: 43900,
    availableSeats: 18,
  },
  {
    departureTime: "14:30",
    departureDate: "20 JUN",
    arrivalTime: "03:30",
    arrivalDate: "21 JUN",
    origin: "Buenos Aires (Retiro)",
    destination: "Asunción (Terminal)",
    durationMinutes: 780,
    isDirect: false,
    seatTypes: ["semi-cama"] as const,
    amenities: ["wifi", "bathroom", "entertainment"] as const,
    priceFrom: 62500,
    availableSeats: 7,
  },
  {
    departureTime: "22:15",
    departureDate: "20 JUN",
    arrivalTime: "09:15",
    arrivalDate: "21 JUN",
    origin: "Buenos Aires (Retiro)",
    destination: "Posadas (Terminal)",
    durationMinutes: 660,
    isDirect: true,
    seatTypes: ["ejecutivo"] as const,
    amenities: ["wifi", "ac", "usb", "bathroom"] as const,
    priceFrom: 38900,
    availableSeats: 3,
  },
]

const groupTitleStyle: React.CSSProperties = {
  fontFamily: "var(--font-body)",
  fontSize: "var(--text-sm)",
  color: "var(--color-text-muted)",
  marginBottom: "16px",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
}

export default function DsTravelPage() {
  return (
    <div style={{ background: "white" }}>
      <SearchSummaryBar
        origin="Buenos Aires (Retiro)"
        destination="Asunción (Terminal)"
        date="Viernes 20 de junio, 2026"
        passengerCount={1}
        onEditClick={() => alert("Editar búsqueda")}
      />

      <div style={{ padding: "48px" }}>
      <h1
        style={{
          fontFamily: "var(--font-display)",
          color: "var(--color-navy)",
          fontSize: "var(--text-2xl)",
          fontWeight: 800,
          marginBottom: "32px",
        }}
      >
        Design System — Travel Badges
      </h1>

      <h2 style={groupTitleStyle}>AmenityBadge — icon-label</h2>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
        {AMENITY_TYPES.map((type) => (
          <AmenityBadge key={type} type={type} mode="icon-label" />
        ))}
      </div>

      <h2 style={{ ...groupTitleStyle, marginTop: "48px" }}>
        AmenityBadge — icon-only
      </h2>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
        {AMENITY_TYPES.map((type) => (
          <AmenityBadge key={type} type={type} mode="icon-only" />
        ))}
      </div>

      <h2 style={{ ...groupTitleStyle, marginTop: "48px" }}>SeatTypeBadge</h2>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
        {SEAT_TYPES.map((type) => (
          <SeatTypeBadge key={type} type={type} />
        ))}
      </div>

      <h2 style={{ ...groupTitleStyle, marginTop: "48px" }}>TripCard</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {TRIP_CARDS.map((trip) => (
          <TripCard
            key={trip.departureTime}
            {...trip}
            seatTypes={[...trip.seatTypes]}
            amenities={[...trip.amenities]}
            onSelect={() => alert(`Seleccionado: ${trip.origin} → ${trip.destination}`)}
          />
        ))}
      </div>

      <h2 style={{ ...groupTitleStyle, marginTop: "48px" }}>FilterPanel</h2>
      <div style={{ background: "var(--color-surface)", padding: "24px" }}>
        <FilterPanel />
      </div>
      </div>
    </div>
  )
}
