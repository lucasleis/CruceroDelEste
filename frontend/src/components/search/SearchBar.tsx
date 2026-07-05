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
  originStop?: string
  originProvince?: string
  destinationStop?: string
  destinationProvince?: string
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
  <div style={{ width: 1, height: 32, background: "var(--color-border)", flexShrink: 0, margin: "0 clamp(8px, 1.5vw, 16px)" }} />
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

  function parseCityValue(value: string): { stop?: string; province?: string } {
    if (value.startsWith("province:")) return { province: value.slice(9) }
    if (value.startsWith("stop:")) return { stop: value.slice(5) }
    return {}
  }

  function handleSearchClick() {
    const originParsed = parseCityValue(origin)
    const destinationParsed = parseCityValue(destination)
    onSearch({
      tripType,
      originStop: originParsed.stop,
      originProvince: originParsed.province,
      destinationStop: destinationParsed.stop,
      destinationProvince: destinationParsed.province,
      departureDate,
      returnDate,
      passengers,
    })
  }

  return (
    <div style={{ display: "flex", justifyContent: "center", width: "100%" }}>
    <div
      className="items-center"
      style={{
        display: "inline-flex",
        minWidth: "clamp(600px, 85vw, 1100px)",
        fontSize: "clamp(11px, 1.1vw, 14px)",
        padding: "clamp(8px, 1vw, 16px) clamp(12px, 2vw, 24px)",
        background: "white",
        boxShadow: "var(--shadow-md)",
        borderRadius: "var(--radius-lg)",
      }}
    >
      <TripTypeSelector value={tripType} onChange={handleTripTypeChange} />

      <Divider />

      <div style={{ minWidth: 0, flex: 1 }}>
        <CityInput label="Origen" value={origin} onChange={setOrigin} icon="pin" />
      </div>
      <div style={{ width: "12px", flexShrink: 0 }} />
      <div style={{ minWidth: 0, flex: 1 }}>
        <CityInput label="Destino" value={destination} onChange={setDestination} icon="arrows" />
      </div>

      <Divider />

      <div style={{ minWidth: 0, flex: 1 }}>
        <DateInput label="Fecha de ida" value={departureDate} onChange={setDepartureDate} mode={tripType} />
      </div>
      {tripType === "round-trip" && (
        <div style={{ minWidth: 0, flex: 1 }}>
          <DateInput
            label="Fecha de vuelta"
            value={returnDate}
            onChange={setReturnDate}
            mode={tripType}
            minDate={departureDate}
            defaultMonth={departureDate}
          />
        </div>
      )}

      <Divider />

      <div style={{ minWidth: 0, flex: 1 }}>
        <PassengerSelector value={passengers} onChange={setPassengers} />
      </div>

      <div style={{ marginLeft: "clamp(8px, 1.5vw, 16px)", flexShrink: 0 }}>
        <BlueButton
          variant="navy"
          leftIcon={<SearchIcon />}
          style={{ fontSize: "14px", padding: "10px 20px" }}
          onClick={handleSearchClick}
        >
          Buscar
        </BlueButton>
      </div>
    </div>
    </div>
  )
}
