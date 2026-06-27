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
  placeholder: string
  value: string
  onChange: (value: string) => void
  icon: "pin" | "arrows"
}

export function CityInput({ label, placeholder, value, onChange, icon }: CityInputProps) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5" style={{ color: "var(--color-primary)" }}>
        {icon === "pin" ? <PinIcon /> : <ArrowsIcon />}
        <span
          className="text-xs font-semibold uppercase tracking-wide"
          style={{
            fontFamily: "var(--font-body)",
            color: "var(--color-text-muted)",
          }}
        >
          {label}
        </span>
      </div>

      <Select value={value} onValueChange={onChange}>
        <SelectTrigger
          className="h-auto w-full border-0 bg-transparent p-0 shadow-none ring-0 focus:ring-0 focus:ring-offset-0 [&>span]:line-clamp-1"
          style={{
            fontFamily: "var(--font-body)",
            fontSize: "0.875rem",
            fontWeight: 500,
            color: value ? "var(--color-navy)" : "var(--color-text-muted)",
          }}
        >
          <SelectValue
            placeholder={placeholder}
            style={{ color: "var(--color-text-muted)" }}
          />
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
    </div>
  )
}
