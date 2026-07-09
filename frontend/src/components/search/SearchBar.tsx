"use client"

import { useEffect, useState } from "react"
import { TripTypeSelector } from "@/components/search/TripTypeSelector"
import { CityInput } from "@/components/search/CityInput"
import { DateInput } from "@/components/search/DateInput"
import { PassengerSelector } from "@/components/search/PassengerSelector"
import { BlueButton } from "@/components/core/BlueButton"
import { StopRead } from "@/types/trips"

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

  const [stops, setStops] = useState<StopRead[]>([])
  const [loadingStops, setLoadingStops] = useState(true)
  const [errorStops, setErrorStops] = useState(false)

  const [allowedDestinationIds, setAllowedDestinationIds] = useState<Set<string> | undefined>(undefined)

  const [originError, setOriginError] = useState(false)
  const [destinationError, setDestinationError] = useState(false)
  const [departureDateError, setDepartureDateError] = useState(false)
  const [returnDateError, setReturnDateError] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function fetchStops() {
      setLoadingStops(true)
      setErrorStops(false)
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL
        const response = await fetch(`${baseUrl}/stops`)
        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`)
        }
        const data: StopRead[] = await response.json()
        if (!cancelled) {
          setStops(data)
        }
      } catch {
        if (!cancelled) {
          setErrorStops(true)
        }
      } finally {
        if (!cancelled) {
          setLoadingStops(false)
        }
      }
    }

    fetchStops()

    return () => {
      cancelled = true
    }
  }, [])

  function handleTripTypeChange(value: TripType) {
    setTripType(value)
    if (value === "one-way") {
      setReturnDate(undefined)
      setReturnDateError(false)
    }
  }

  function parseCityValue(value: string): { stop?: string; province?: string } {
    if (value.startsWith("province:")) return { province: value.slice(9) }
    if (value.startsWith("stop:")) return { stop: value.slice(5) }
    return {}
  }

  function handleOriginChange(value: string) {
    setOrigin(value)
    if (value !== "") setOriginError(false)
    if (value === "") {
      setAllowedDestinationIds(undefined)
      setDestination("")
    }
  }

  async function handleOriginStopSelected(stop: StopRead | null) {
    setDestination("")
    setAllowedDestinationIds(undefined)
    if (stop === null) return
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/stops/${stop.id}/valid-destinations`)
      const destinations: StopRead[] = await res.json()
      setAllowedDestinationIds(new Set(destinations.map((d) => d.id)))
    } catch {
      setAllowedDestinationIds(undefined)
    }
  }

  function handleOriginProvinceSelected(country: "AR" | "PY") {
    setDestination("")
    const opposite = country === "AR" ? "PY" : "AR"
    const allowed = new Set(stops.filter((s) => s.country === opposite).map((s) => s.id))
    setAllowedDestinationIds(allowed)
  }

  function handleSearchClick() {
    const originParsed = parseCityValue(origin)
    const destinationParsed = parseCityValue(destination)

    const hasOrigin = !!(originParsed.stop || originParsed.province)
    const hasDestination = !!(destinationParsed.stop || destinationParsed.province)
    const hasDepartureDate = !!departureDate
    const hasReturnDate = tripType === "one-way" || !!returnDate

    setOriginError(!hasOrigin)
    setDestinationError(!hasDestination)
    setDepartureDateError(!hasDepartureDate)
    setReturnDateError(!hasReturnDate)

    if (!hasOrigin || !hasDestination || !hasDepartureDate || !hasReturnDate) return

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
        position: "relative",
        overflow: "visible",
        minWidth: "clamp(600px, 85vw, 1100px)",
        fontSize: "clamp(11px, 1.1vw, 14px)",
        padding: "clamp(8px, 1vw, 16px) clamp(12px, 2vw, 24px)",
        paddingBottom: "clamp(8px, 1vw, 16px)",
        background: "white",
        boxShadow: "var(--shadow-md)",
        borderRadius: "var(--radius-lg)",
      }}
    >
      <TripTypeSelector value={tripType} onChange={handleTripTypeChange} />

      <Divider />

      <div style={{ minWidth: 0, flex: 1, position: "relative" }}>
        <CityInput
          label="Origen"
          value={origin}
          onChange={handleOriginChange}
          icon="pin"
          stops={stops}
          loadingStops={loadingStops}
          errorStops={errorStops}
          onStopSelected={handleOriginStopSelected}
          onProvinceSelected={handleOriginProvinceSelected}
        />
        {originError && (
          <span style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            display: "block",
            fontSize: "0.7rem",
            color: "#e53e3e",
            fontFamily: "var(--font-body)",
            whiteSpace: "nowrap",
          }}>
            Seleccioná un origen
          </span>
        )}
      </div>
      <div style={{ width: "12px", flexShrink: 0 }} />
      <div style={{ minWidth: 0, flex: 1, position: "relative" }}>
        <CityInput
          label="Destino"
          value={destination}
          onChange={(value) => { setDestination(value); if (value !== "") setDestinationError(false) }}
          icon="pin-filled"
          stops={stops}
          loadingStops={loadingStops}
          errorStops={errorStops}
          allowedStopIds={allowedDestinationIds}
        />
        {destinationError && (
          <span style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            display: "block",
            fontSize: "0.7rem",
            color: "#e53e3e",
            fontFamily: "var(--font-body)",
            whiteSpace: "nowrap",
          }}>
            Seleccioná un destino
          </span>
        )}
      </div>

      <Divider />

      <div style={{ minWidth: 0, flex: 1, position: "relative" }}>
        <DateInput
          label="Fecha de ida"
          value={departureDate}
          onChange={(date) => { setDepartureDate(date); if (date) setDepartureDateError(false) }}
          mode={tripType}
        />
        {departureDateError && (
          <span style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            display: "block",
            fontSize: "0.7rem",
            color: "#e53e3e",
            fontFamily: "var(--font-body)",
            whiteSpace: "nowrap",
          }}>
            Seleccioná una fecha
          </span>
        )}
      </div>
      {tripType === "round-trip" && (
        <div style={{ minWidth: 0, flex: 1, position: "relative" }}>
          <DateInput
            label="Fecha de vuelta"
            value={returnDate}
            onChange={(date) => { setReturnDate(date); if (date) setReturnDateError(false) }}
            mode={tripType}
            minDate={departureDate}
            defaultMonth={departureDate}
          />
          {returnDateError && (
            <span style={{
              position: "absolute",
              top: "calc(100% + 4px)",
              left: 0,
              display: "block",
              fontSize: "0.7rem",
              color: "#e53e3e",
              fontFamily: "var(--font-body)",
              whiteSpace: "nowrap",
            }}>
              Seleccioná una fecha
            </span>
          )}
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
