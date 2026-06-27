"use client"

import { useState } from "react"
import { CityInput } from "@/components/search/CityInput"
import { DateInput } from "@/components/search/DateInput"
import { TripTypeSelector } from "@/components/search/TripTypeSelector"

type TripType = "round-trip" | "one-way"

export default function SearchPage() {
  const [origin, setOrigin] = useState("")
  const [destination, setDestination] = useState("")
  const [tripType, setTripType] = useState<TripType>("round-trip")
  const [departureDate, setDepartureDate] = useState<Date | undefined>(undefined)
  const [returnDate, setReturnDate] = useState<Date | undefined>(undefined)

  return (
    <div style={{ background: "white", padding: "48px" }}>
      <h1
        className="mb-8 text-2xl font-bold"
        style={{ fontFamily: "var(--font-display)" }}
      >
        SearchBar Components
      </h1>

      <h2
        className="mb-4 text-lg font-bold"
        style={{ fontFamily: "var(--font-display)" }}
      >
        TripTypeSelector
      </h2>
      <div className="mb-10">
        <TripTypeSelector value={tripType} onChange={setTripType} />
      </div>

      <div className="flex gap-8 mb-10">
        <CityInput
          label="Origen"
          placeholder="Elegí ciudad"
          value={origin}
          onChange={setOrigin}
          icon="pin"
        />
        <CityInput
          label="Destino"
          placeholder="Elegí destino"
          value={destination}
          onChange={setDestination}
          icon="arrows"
        />
      </div>

      <h2
        className="mb-4 text-lg font-bold"
        style={{ fontFamily: "var(--font-display)" }}
      >
        DateInput
      </h2>
      <div className="flex gap-8">
        <DateInput
          label="Fecha de ida"
          value={departureDate}
          onChange={setDepartureDate}
          mode={tripType}
        />
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
      </div>
    </div>
  )
}
