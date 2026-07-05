"use client"

import { useState } from "react"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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

  const grouped = groupStops(stops, allowedStopIds)
  const placeholder = loadingStops ? "Cargando..." : errorStops ? "Error al cargar" : ""
  const displayValue = value.startsWith("province:")
    ? value.slice(9)
    : value.startsWith("stop:")
      ? value.slice(5)
      : ""

  function handleValueChange(newValue: string) {
    onChange(newValue)
    if (newValue === "") {
      onStopSelected?.(null)
      return
    }
    if (newValue.startsWith("stop:")) {
      const stopName = newValue.slice(5)
      const stop = stops.find((s) => s.name === stopName) ?? null
      onStopSelected?.(stop)
    }
  }

  return (
    <Select value={value} onValueChange={handleValueChange} open={open} onOpenChange={setOpen} disabled={!!loadingStops || !!errorStops}>
      <SelectTrigger style={{ border: "none", background: "none", padding: 0, paddingRight: "4px", height: "auto", width: "100%", cursor: "pointer", boxShadow: "none" }} className="[&>svg]:ml-2">
        <div style={{ display: "flex", flexDirection: "column", gap: "2px", textAlign: "left" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            {icon === "pin" ? <PinIcon /> : <ArrowsIcon />}
            <span style={{ fontFamily: "var(--font-body)", fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--color-text-muted)" }}>
              {label}
            </span>
          </div>
          <SelectValue placeholder={placeholder}>
            {displayValue || placeholder}
          </SelectValue>
        </div>
      </SelectTrigger>

      <SelectContent
        className="border"
        style={{
          background: "white",
          boxShadow: "var(--shadow-md)",
          borderColor: "var(--color-border)",
        }}
      >
        {COUNTRY_ORDER.filter((country) => grouped[country]).map((country, i) => (
          <span key={country}>
            {i > 0 && <SelectSeparator />}
            <SelectGroup>
              <SelectLabel
                className="text-xs uppercase tracking-wide pl-0"
                style={{
                  fontFamily: "var(--font-body)",
                  color: "var(--color-text-muted)",
                  paddingLeft: "0px",
                }}
              >
                {COUNTRY_LABELS[country]}
              </SelectLabel>
              {Object.entries(grouped[country])
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([province, provinceStops]) => {
                  const provinceValue = `province:${province}`
                  return (
                    <span key={province}>
                      <div
                        className="text-sm hover:underline hover:bg-black/[0.03]"
                        onClick={() => {
                          onChange(provinceValue)
                          onStopSelected?.(null)
                          onProvinceSelected?.(country)
                          setOpen(false)
                        }}
                        style={{
                          fontFamily: "var(--font-body)",
                          color: "var(--color-primary)",
                          fontWeight: 600,
                          paddingLeft: "16px",
                          cursor: "pointer",
                        }}
                      >
                        {province}
                      </div>
                      {provinceStops.map((stop) => {
                        const stopValue = `stop:${stop.name}`
                        const isStopSelected = value === stopValue
                        return (
                          <SelectItem
                            key={stop.id}
                            value={stopValue}
                            className="text-sm pl-0"
                            style={{
                              fontFamily: "var(--font-body)",
                              color: isStopSelected ? "var(--color-primary)" : "var(--color-navy)",
                              fontWeight: isStopSelected ? 600 : 400,
                              paddingLeft: 0,
                            }}
                          >
                            <span style={{ paddingLeft: "32px", display: "block" }}>└ {stop.name}</span>
                          </SelectItem>
                        )
                      })}
                    </span>
                  )
                })}
            </SelectGroup>
          </span>
        ))}
      </SelectContent>
    </Select>
  )
}
