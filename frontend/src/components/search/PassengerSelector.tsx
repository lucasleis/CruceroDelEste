"use client"

import { useState } from "react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type SeatClass = "cualquiera" | "semi-cama" | "cama"

interface PassengerValue {
  adults: number
  children: number
  class: SeatClass
}

interface PassengerSelectorProps {
  value: PassengerValue
  onChange: (value: PassengerValue) => void
}

const CLASS_LABELS: Record<SeatClass, string> = {
  cualquiera: "Cualquiera",
  "semi-cama": "Semi Cama",
  cama: "Cama",
}

const PersonIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ color: "var(--color-primary)", flexShrink: 0 }}
  >
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
)

const MinusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
)

const PlusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
)

interface CounterRowProps {
  label: string
  sublabel: string
  count: number
  min?: number
  onDecrement: () => void
  onIncrement: () => void
}

function CounterRow({ label, sublabel, count, min = 0, onDecrement, onIncrement }: CounterRowProps) {
  const buttonBase: React.CSSProperties = {
    width: 28,
    height: 28,
    borderRadius: "50%",
    border: "1px solid var(--color-border)",
    background: "none",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    color: "var(--color-navy)",
    transition: `background var(--duration-base) var(--ease-out)`,
    flexShrink: 0,
  }

  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-col">
        <span style={{ fontFamily: "var(--font-body)", fontWeight: 500, fontSize: "0.875rem", color: "var(--color-navy)" }}>
          {label}
        </span>
        <span style={{ fontFamily: "var(--font-body)", fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
          {sublabel}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={onDecrement}
          disabled={count <= min}
          style={{
            ...buttonBase,
            opacity: count <= min ? 0.3 : 1,
            cursor: count <= min ? "not-allowed" : "pointer",
          }}
          onMouseEnter={e => { if (count > min) (e.currentTarget as HTMLButtonElement).style.background = "var(--color-surface)" }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "none" }}
        >
          <MinusIcon />
        </button>
        <span style={{ fontFamily: "var(--font-body)", fontWeight: 500, fontSize: "0.875rem", color: "var(--color-navy)", minWidth: 16, textAlign: "center" }}>
          {count}
        </span>
        <button
          onClick={onIncrement}
          style={buttonBase}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "var(--color-surface)" }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "none" }}
        >
          <PlusIcon />
        </button>
      </div>
    </div>
  )
}

function getValueString(value: PassengerValue): string {
  const total = value.adults + value.children
  const personLabel = total === 1 ? "1 persona" : `${total} personas`
  return `${personLabel}, ${CLASS_LABELS[value.class]}`
}

export function PassengerSelector({ value, onChange }: PassengerSelectorProps) {
  const [open, setOpen] = useState(false)

  return (
    <div style={{ position: "relative", zIndex: 50 }}>
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="flex flex-col gap-0.5 text-left"
          style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}
        >
          <div className="flex items-center gap-1.5">
            <PersonIcon />
            <span
              className="text-xs font-semibold uppercase tracking-wide"
              style={{ fontFamily: "var(--font-body)", color: "var(--color-text-muted)" }}
            >
              Pasajeros y clase
            </span>
          </div>
          <span
            className="text-sm font-medium"
            style={{ fontFamily: "var(--font-body)", color: "var(--color-navy)", paddingLeft: "22px" }}
          >
            {getValueString(value)}
          </span>
        </button>
      </PopoverTrigger>

      <PopoverContent
        className="z-[100]"
        align="start"
        style={{
          minWidth: "280px",
          padding: "16px",
          background: "white",
          position: "relative",
          zIndex: 50,
          boxShadow: "var(--shadow-md)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-md)",
        }}
      >
        <div className="flex flex-col gap-4">
          <CounterRow
            label="Mayores"
            sublabel="12 años o más"
            count={value.adults}
            min={1}
            onDecrement={() => onChange({ ...value, adults: value.adults - 1 })}
            onIncrement={() => onChange({ ...value, adults: value.adults + 1 })}
          />

          <div style={{ height: 1, background: "var(--color-border)" }} />

          <CounterRow
            label="Menores"
            sublabel="Hasta 11 años"
            count={value.children}
            min={0}
            onDecrement={() => onChange({ ...value, children: value.children - 1 })}
            onIncrement={() => onChange({ ...value, children: value.children + 1 })}
          />

          <div style={{ height: 1, background: "var(--color-border)" }} />

          <div className="flex flex-col gap-1.5">
            <span
              className="text-xs font-semibold uppercase tracking-wide"
              style={{ fontFamily: "var(--font-body)", color: "var(--color-text-muted)" }}
            >
              Clase
            </span>
            <Select
              value={value.class}
              onValueChange={(v) => onChange({ ...value, class: v as SeatClass })}
            >
              <SelectTrigger
                className="w-full"
                style={{ border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", cursor: "pointer" }}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent style={{ zIndex: 200, background: "white" }} className="z-[200] bg-white">
                <SelectItem value="cualquiera">Cualquiera</SelectItem>
                <SelectItem value="semi-cama">Semi Cama</SelectItem>
                <SelectItem value="cama">Cama</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => setOpen(false)}
              style={{
                background: "var(--color-primary)",
                color: "white",
                fontFamily: "var(--font-body)",
                fontWeight: 500,
                fontSize: "0.875rem",
                borderRadius: "var(--radius-md)",
                padding: "0.5rem 1.25rem",
                border: "none",
                cursor: "pointer",
              }}
            >
              Aplicar
            </button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
    </div>
  )
}
