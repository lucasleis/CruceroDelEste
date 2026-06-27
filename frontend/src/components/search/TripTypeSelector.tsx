"use client"

import { useState } from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

type TripType = "round-trip" | "one-way"

const TRIP_TYPES: { value: TripType; label: string }[] = [
  { value: "round-trip", label: "Ida y vuelta" },
  { value: "one-way", label: "Solo ida" },
]

interface TripTypeSelectorProps {
  value: TripType
  onChange: (value: TripType) => void
}

const ChevronIcon = ({ open }: { open: boolean }) => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{
      transform: open ? "rotate(180deg)" : "rotate(0deg)",
      transition: "transform 150ms ease",
    }}
  >
    <polyline points="6 9 12 15 18 9" />
  </svg>
)

const CheckIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="20 6 9 16 4 11" />
  </svg>
)

export function TripTypeSelector({ value, onChange }: TripTypeSelectorProps) {
  const [open, setOpen] = useState(false)
  const selected = TRIP_TYPES.find((t) => t.value === value)!

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center justify-between gap-8"
          style={{
            background: "var(--color-primary)",
            color: "white",
            fontFamily: "var(--font-body)",
            fontWeight: 500,
            fontSize: "0.875rem",
            borderRadius: "var(--radius-md)",
            padding: "0.5rem 1rem",
            minWidth: "160px",
            border: "none",
            outline: "none",
            cursor: "pointer",
          }}
        >
          {selected.label}
          <ChevronIcon open={open} />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        style={{
          background: "white",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-md)",
          boxShadow: "var(--shadow-md)",
          minWidth: "200px",
          padding: "8px",
        }}
      >
        {TRIP_TYPES.map((type) => {
          const isSelected = type.value === value
          return (
            <DropdownMenuItem
              key={type.value}
              onSelect={() => onChange(type.value)}
              className="flex items-center justify-between px-3 py-2 cursor-pointer"
              style={{
                fontFamily: "var(--font-body)",
                fontSize: "0.875rem",
                fontWeight: isSelected ? 600 : 400,
                color: "var(--color-navy)",
                borderRadius: "var(--radius-sm)",
              }}
            >
              {type.label}
              {isSelected && <CheckIcon />}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
