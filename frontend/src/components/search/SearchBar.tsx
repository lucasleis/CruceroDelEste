"use client"

import { useEffect, useState } from "react"
import { TripTypeSelector } from "@/components/search/TripTypeSelector"
import { CityInput } from "@/components/search/CityInput"
import { DateInput } from "@/components/search/DateInput"
import { PassengerSelector } from "@/components/search/PassengerSelector"
import { BlueButton } from "@/components/core/BlueButton"
import { StopRead } from "@/types/trips"
import { getStops, getValidDestinations } from "@/api"

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

interface SearchBarInitialValues {
  initialOrigin?: string
  initialDestination?: string
  initialDepartureDate?: Date
  initialPassengers?: PassengerValue
  initialTripType?: "one-way" | "round-trip"
}

interface SearchBarProps {
  onSearch: (params: SearchParams) => void
  initialValues?: SearchBarInitialValues
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

export function SearchBar({ onSearch, initialValues }: SearchBarProps) {
  const [tripType, setTripType] = useState<TripType>(
    initialValues?.initialTripType ?? "round-trip"
  )
  const [origin, setOrigin] = useState(initialValues?.initialOrigin ?? "")
  const [destination, setDestination] = useState(initialValues?.initialDestination ?? "")
  const [departureDate, setDepartureDate] = useState<Date | undefined>(initialValues?.initialDepartureDate)
  const [returnDate, setReturnDate] = useState<Date | undefined>(undefined)
  const [passengers, setPassengers] = useState<PassengerValue>(
    initialValues?.initialPassengers ?? { adults: 1, children: 0, class: "cualquiera" }
  )

  const [stops, setStops] = useState<StopRead[]>([])
  const [loadingStops, setLoadingStops] = useState(true)
  const [errorStops, setErrorStops] = useState(false)

  const [allowedDestinationIds, setAllowedDestinationIds] = useState<Set<string> | undefined>(undefined)
  const [destinationFetchError, setDestinationFetchError] = useState<string | null>(null)

  const [originError, setOriginError] = useState(false)
  const [destinationError, setDestinationError] = useState(false)
  const [departureDateError, setDepartureDateError] = useState(false)
  const [returnDateError, setReturnDateError] = useState(false)

  const [isMobile, setIsMobile] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    function handleResize() {
      setIsMobile(window.innerWidth <= 960)
    }
    handleResize()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  useEffect(() => {
    let cancelled = false

    async function fetchStops() {
      setLoadingStops(true)
      setErrorStops(false)
      try {
        const data = await getStops()
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
    setDestinationFetchError(null)
    if (stop === null) return
    try {
      const destinations = await getValidDestinations(stop.id)
      setAllowedDestinationIds(new Set(destinations.map((d) => d.id)))
      setDestinationFetchError(null)
    } catch {
      setAllowedDestinationIds(new Set())
      setDestinationFetchError("No se pudieron cargar los destinos disponibles. Intentá de nuevo.")
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

  if (mounted && isMobile) {
    return (
      <div style={{ display: "flex", justifyContent: "center", width: "100%", boxSizing: "border-box" }}>
        <div style={{
          width: "100%",
          background: "white",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-md)",
          border: "1px solid var(--color-border)",
          padding: "8px",
          display: "flex",
          flexDirection: "column",
          gap: "0px",
        }}>
          {/* TripTypeSelector — ancho completo */}
          <div className="search-bar-mobile-trip-type" style={{ padding: "4px" }}>
            <TripTypeSelector value={tripType} onChange={handleTripTypeChange} />
          </div>

          {/* Origen + Destino — misma fila */}
          <div style={{
            borderTop: "1px solid var(--color-border)",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "0",
          }}>
            {/* Origen */}
            <div style={{ padding: "12px 12px 12px 16px", position: "relative", borderRight: "1px solid var(--color-border)" }}>
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
                <span style={{ display: "block", fontSize: "0.7rem", color: "#e53e3e", fontFamily: "var(--font-body)", marginTop: "4px" }}>
                  Seleccioná un origen
                </span>
              )}
            </div>

            {/* Destino */}
            <div style={{ padding: "12px 16px 12px 12px", position: "relative" }}>
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
                <span style={{ display: "block", fontSize: "0.7rem", color: "#e53e3e", fontFamily: "var(--font-body)", marginTop: "4px" }}>
                  Seleccioná un destino
                </span>
              )}
              {destinationFetchError && (
                <span style={{ display: "block", fontSize: "0.7rem", color: "var(--color-accent)", fontFamily: "var(--font-body)", marginTop: "4px" }}>
                  {destinationFetchError}
                </span>
              )}
            </div>
          </div>

          {/* Fechas — dos columnas */}
          <div style={{ borderTop: "1px solid var(--color-border)", padding: "12px 16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div style={{ position: "relative" }}>
              <DateInput
                label="Fecha de ida"
                value={departureDate}
                onChange={(date) => { setDepartureDate(date); if (date) setDepartureDateError(false) }}
                mode={tripType}
              />
              {departureDateError && (
                <span style={{ display: "block", fontSize: "0.7rem", color: "#e53e3e", fontFamily: "var(--font-body)", marginTop: "4px" }}>
                  Seleccioná una fecha
                </span>
              )}
            </div>
            {tripType === "round-trip" && (
              <div style={{ position: "relative" }}>
                <DateInput
                  label="Fecha de vuelta"
                  value={returnDate}
                  onChange={(date) => { setReturnDate(date); if (date) setReturnDateError(false) }}
                  mode={tripType}
                  minDate={departureDate}
                  defaultMonth={departureDate}
                />
                {returnDateError && (
                  <span style={{ display: "block", fontSize: "0.7rem", color: "#e53e3e", fontFamily: "var(--font-body)", marginTop: "4px" }}>
                    Seleccioná una fecha
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Pasajeros */}
          <div style={{ borderTop: "1px solid var(--color-border)", padding: "12px 16px", display: "flex", justifyContent: "center" }}>
            <PassengerSelector value={passengers} onChange={setPassengers} />
          </div>

          {/* Botón Buscar — ancho completo */}
          <div style={{ borderTop: "1px solid var(--color-border)", padding: "8px 4px 4px 4px" }}>
            <BlueButton
              variant="navy"
              leftIcon={<SearchIcon />}
              style={{ width: "100%", fontSize: "var(--text-sm)", padding: "14px 20px", borderRadius: "var(--radius-md)" }}
              onClick={handleSearchClick}
            >
              Buscar
            </BlueButton>
          </div>
        </div>
        <style>{`
          .search-bar-mobile-trip-type button {
            width: 100% !important;
            min-width: 0 !important;
          }
        `}</style>
      </div>
    )
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
        {destinationFetchError && (
          <span style={{
            position: "absolute",
            top: "calc(100% + 20px)",
            left: 0,
            display: "block",
            fontSize: "0.7rem",
            color: "var(--color-accent)",
            fontFamily: "var(--font-body)",
            whiteSpace: "nowrap",
          }}>
            {destinationFetchError}
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
