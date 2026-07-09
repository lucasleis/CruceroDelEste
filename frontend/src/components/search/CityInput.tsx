"use client"

import { useState, useRef, useEffect } from "react"
import { StopRead } from "@/types/trips"

type GroupedStops = Record<string, Record<string, StopRead[]>>

const COUNTRY_ORDER: Array<StopRead["country"]> = ["AR", "PY"]

const COUNTRY_LABELS: Record<StopRead["country"], string> = {
  AR: "Argentina",
  PY: "Paraguay",
}

const NO_PROVINCE_LABEL = "Otros"

function groupStops(stops: StopRead[], allowedStopIds?: Set<string>): GroupedStops {
  const grouped: GroupedStops = {}
  const filtered =
    allowedStopIds && allowedStopIds.size > 0
      ? stops.filter((stop) => allowedStopIds.has(stop.id))
      : stops
  for (const stop of filtered) {
    const province = stop.province ?? NO_PROVINCE_LABEL
    grouped[stop.country] ??= {}
    grouped[stop.country][province] ??= []
    grouped[stop.country][province].push(stop)
  }
  return grouped
}

const PinIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
    <circle cx="12" cy="10" r="3"/>
  </svg>
)

const ArrowsIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 16V4m0 0L3 8m4-4l4 4"/>
    <path d="M17 8v12m0 0l4-4m-4 4l-4-4"/>
  </svg>
)

interface CityInputProps {
  label: string
  placeholder?: string
  value: string
  onChange: (value: string) => void
  icon: "pin" | "arrows"
  stops: StopRead[]
  loadingStops?: boolean
  errorStops?: boolean
  allowedStopIds?: Set<string>
  onStopSelected?: (stop: StopRead | null) => void
  onProvinceSelected?: (country: "AR" | "PY") => void
}

export function CityInput({
  label,
  value,
  onChange,
  icon,
  stops,
  loadingStops,
  errorStops,
  allowedStopIds,
  onStopSelected,
  onProvinceSelected,
}: CityInputProps) {
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState("")
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const disabled = !!loadingStops || !!errorStops
  const placeholder = loadingStops ? "Cargando..." : errorStops ? "Error al cargar" : ""
  const displayValue = value.startsWith("province:")
    ? value.slice(9)
    : value.startsWith("stop:")
      ? value.slice(5)
      : ""

  const filteredStops =
    filter.length >= 3
      ? stops.filter((s) => s.name.toLowerCase().includes(filter.toLowerCase()))
      : stops
  const grouped = groupStops(filteredStops, allowedStopIds)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setFilter("")
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [open])

  function toggleOpen() {
    if (disabled) return
    setOpen((prev) => !prev)
  }

  function handleProvinceClick(country: "AR" | "PY", province: string) {
    const provinceValue = `province:${province}`
    onChange(provinceValue)
    onStopSelected?.(null)
    onProvinceSelected?.(country)
    setOpen(false)
    setFilter("")
  }

  function handleStopClick(stop: StopRead) {
    const stopValue = `stop:${stop.name}`
    onChange(stopValue)
    onStopSelected?.(stop)
    setOpen(false)
    setFilter("")
  }

  return (
    <div ref={containerRef} style={{ position: "relative", width: "100%" }}>
      <div
        onClick={toggleOpen}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "2px",
          textAlign: "left",
          cursor: disabled ? "default" : "pointer",
          opacity: disabled ? 0.6 : 1,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          {icon === "pin" ? <PinIcon /> : <ArrowsIcon />}
          <span style={{ fontFamily: "var(--font-body)", fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--color-text-muted)" }}>
            {label}
          </span>
        </div>
        <span style={{ fontFamily: "var(--font-body)", fontSize: "0.875rem", color: displayValue ? "var(--color-navy)" : "var(--color-text-muted)" }}>
          {displayValue || placeholder}
        </span>
      </div>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            left: 0,
            zIndex: 1000,
            background: "white",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-md)",
            boxShadow: "var(--shadow-md)",
            minWidth: "260px",
            maxHeight: "320px",
            overflowY: "auto",
            padding: "8px 0",
          }}
        >
          <div style={{ padding: "0 8px 4px" }}>
            <input
              ref={inputRef}
              type="text"
              placeholder="Buscar parada..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              style={{
                width: "100%",
                padding: "6px 10px",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-sm)",
                fontFamily: "var(--font-body)",
                fontSize: "0.875rem",
                color: "var(--color-text-primary)",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          {filter.length > 0 && filter.length < 3 && (
            <p
              style={{
                fontFamily: "var(--font-body)",
                fontSize: "0.75rem",
                color: "var(--color-text-muted)",
                padding: "4px 10px",
                margin: 0,
              }}
            >
              Ingresá al menos 3 letras para buscar
            </p>
          )}

          {filter.length >= 3 && Object.keys(grouped).length === 0 && (
            <p
              style={{
                fontFamily: "var(--font-body)",
                fontSize: "0.875rem",
                color: "var(--color-text-muted)",
                padding: "8px 10px",
                margin: 0,
              }}
            >
              No se encontraron paradas
            </p>
          )}

          {COUNTRY_ORDER.filter((country) => grouped[country]).map((country, i) => (
            <div key={country}>
              {i > 0 && <hr style={{ margin: "4px 0", border: "none", borderTop: "1px solid var(--color-border)" }} />}
              <div
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  color: "var(--color-text-muted)",
                  padding: "8px 16px 2px",
                }}
              >
                {COUNTRY_LABELS[country]}
              </div>
              {Object.entries(grouped[country])
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([province, provinceStops]) => {
                  const provinceValue = `province:${province}`
                  return (
                    <div key={province}>
                      <div
                        onClick={() => handleProvinceClick(country, province)}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(0,0,0,0.03)")}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                        style={{
                          fontFamily: "var(--font-body)",
                          fontSize: "0.875rem",
                          color: "var(--color-primary)",
                          fontWeight: 600,
                          padding: "4px 16px",
                          cursor: "pointer",
                        }}
                      >
                        {province}
                      </div>
                      {provinceStops.map((stop) => {
                        const stopValue = `stop:${stop.name}`
                        const isStopSelected = value === stopValue
                        return (
                          <div
                            key={stop.id}
                            onClick={() => handleStopClick(stop)}
                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(0,0,0,0.03)")}
                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                            style={{
                              fontFamily: "var(--font-body)",
                              fontSize: "0.875rem",
                              color: isStopSelected ? "var(--color-primary)" : "var(--color-navy)",
                              fontWeight: isStopSelected ? 600 : 400,
                              padding: "4px 16px 4px 32px",
                              cursor: "pointer",
                            }}
                          >
                            └ {stop.name}
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
