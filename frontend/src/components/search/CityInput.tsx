"use client"

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

const CITIES: Record<string, string[]> = {
  Argentina: ["Concordia", "Paraná", "Santa Fe", "Rosario", "Buenos Aires", "Corrientes", "Posadas"],
  Paraguay: ["Asunción", "Encarnación", "Ciudad del Este"],
  Brasil: ["Foz do Iguaçu"],
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
}

export function CityInput({ label, value, onChange, icon }: CityInputProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger style={{ border: "none", background: "none", padding: 0, paddingRight: "4px", height: "auto", width: "100%", cursor: "pointer", boxShadow: "none" }} className="[&>svg]:ml-2">
        <div style={{ display: "flex", flexDirection: "column", gap: "2px", textAlign: "left" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            {icon === "pin" ? <PinIcon /> : <ArrowsIcon />}
            <span style={{ fontFamily: "var(--font-body)", fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--color-text-muted)" }}>
              {label}
            </span>
          </div>
          <SelectValue placeholder="" />
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
        {Object.entries(CITIES).map(([country, cities], i) => (
          <span key={country}>
            {i > 0 && <SelectSeparator />}
            <SelectGroup>
              <SelectLabel
                className="text-xs uppercase tracking-wide"
                style={{
                  fontFamily: "var(--font-body)",
                  color: "var(--color-text-muted)",
                }}
              >
                {country}
              </SelectLabel>
              {cities.map((city) => (
                <SelectItem
                  key={city}
                  value={city}
                  className="text-sm"
                  style={{
                    fontFamily: "var(--font-body)",
                    color: "var(--color-navy)",
                  }}
                >
                  {city}
                </SelectItem>
              ))}
            </SelectGroup>
          </span>
        ))}
      </SelectContent>
    </Select>
  )
}
