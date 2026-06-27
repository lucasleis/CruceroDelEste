"use client"

import { useState } from "react"
import { TripTypeSelector } from "@/components/search/TripTypeSelector"
import { CityInput } from "@/components/search/CityInput"
import { DateInput } from "@/components/search/DateInput"
import { PassengerSelector } from "@/components/search/PassengerSelector"
import { BlueButton } from "@/components/core/BlueButton"

type TripType = "round-trip" | "one-way"
type SeatClass = "cualquiera" | "semi-cama" | "cama"

interface PassengerValue {
  adults: number
  children: number
  class: SeatClass
}

interface SearchParams {
  tripType: TripType
  origin: string
  destination: string
  departureDate: Date | undefined
  returnDate: Date | undefined
  passengers: PassengerValue
}

interface SearchBarProps {
  onSearch: (params: SearchParams) => void
}

const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/>
    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
)

const Divider = () => (
  <div style={{ width: 1, height: 32, background: "var(--color-border)", flexShrink: 0, marginLeft: "0.75rem", marginRight: "0.75rem" }} />
)

export function SearchBar({ onSearch }: SearchBarProps) {
  const [tripType, setTripType] = useState<TripType>("round-trip")
  const [origin, setOrigin] = useState("")
  const [destination, setDestination] = useState("")
  const [departureDate, setDepartureDate] = useState<Date | undefined>(undefined)
  const [returnDate, setReturnDate] = useState<Date | undefined>(undefined)
  const [passengers, setPassengers] = useState<PassengerValue>({ adults: 1, children: 0, class: "cualquiera" })

  function handleTripTypeChange(value: TripType) {
    setTripType(value)
    if (value === "one-way") setReturnDate(undefined)
  }

  return (
    <div style={{ display: "flex", justifyContent: "center", width: "100%" }}>
    <div
      className="items-center px-4 py-3"
      style={{
        display: "inline-flex",
        background: "white",
        boxShadow: "var(--shadow-md)",
        borderRadius: "var(--radius-lg)",
      }}
    >
      <TripTypeSelector value={tripType} onChange={handleTripTypeChange} />

      <Divider />

      <CityInput label="Origen" placeholder="Elegí ciudad" value={origin} onChange={setOrigin} icon="pin" />
      <CityInput label="Destino" placeholder="Elegí destino" value={destination} onChange={setDestination} icon="arrows" />

      <Divider />

      <DateInput label="Fecha de ida" value={departureDate} onChange={setDepartureDate} mode={tripType} />
      {tripType === "round-trip" && (
        <DateInput
          label="Fecha de vuelta"
          value={returnDate}
          onChange={setReturnDate}
          mode={tripType}
          minDate={departureDate}
          defaultMonth={departureDate}
        />
      )}

      <Divider />

      <PassengerSelector value={passengers} onChange={setPassengers} />

      <div style={{ marginLeft: "0.75rem", flexShrink: 0 }}>
        <BlueButton
          variant="navy"
          leftIcon={<SearchIcon />}
          style={{ fontSize: "14px", padding: "10px 20px" }}
          onClick={() => onSearch({ tripType, origin, destination, departureDate, returnDate, passengers })}
        >
          Buscar
        </BlueButton>
      </div>
    </div>
    </div>
  )
}
