"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

const CalendarIcon = () => (
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
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
)

interface DateInputProps {
  mode?: "one-way" | "round-trip"
  label: string
  value: Date | undefined
  onChange: (date: Date | undefined) => void
  minDate?: Date | undefined
  defaultMonth?: Date | undefined
}

export function DateInput({ label, value, onChange, minDate, defaultMonth }: DateInputProps) {
  const [open, setOpen] = useState(false)
  const [currentMonth, setCurrentMonth] = useState<Date>(defaultMonth ?? new Date())

  useEffect(() => {
    if (defaultMonth) setCurrentMonth(defaultMonth)
  }, [defaultMonth])

  function handleSelect(date: Date | undefined) {
    if (date && date.getMonth() !== currentMonth.getMonth()) {
      setCurrentMonth(new Date(date.getFullYear(), date.getMonth(), 1))
    }
    onChange(date)
    setOpen(false)
  }

  function isDisabled(date: Date) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (date < today) return true
    if (minDate) {
      const min = new Date(minDate)
      min.setHours(0, 0, 0, 0)
      if (date < min) return true
    }
    return false
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="flex flex-col gap-0.5 text-left"
          style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}
        >
          <div className="flex items-center gap-1.5">
            <CalendarIcon />
            <span
              className="text-xs font-semibold uppercase tracking-wide"
              style={{ fontFamily: "var(--font-body)", color: "var(--color-text-muted)" }}
            >
              {label}
            </span>
          </div>
          <span
            className="text-sm font-medium"
            style={{
              fontFamily: "var(--font-body)",
              color: value ? "var(--color-navy)" : "var(--color-text-muted)",
              paddingLeft: "22px",
            }}
          >
            {value ? format(value, "d MMM yyyy", { locale: es }) : ""}
          </span>
        </button>
      </PopoverTrigger>

      <PopoverContent
        className="w-auto p-3 z-50"
        align="start"
        style={{
          background: "white",
          boxShadow: "var(--shadow-md)",
          borderRadius: "var(--radius-md)",
          border: "1px solid var(--color-border)",
          minWidth: "280px",
        }}
      >
        <Calendar
          mode="single"
          selected={value}
          onSelect={handleSelect}
          captionLayout="dropdown"
          disabled={isDisabled}
          showOutsideDays
          month={currentMonth}
          onMonthChange={setCurrentMonth}
          className="w-full [&_.rdp-day_button]:cursor-pointer [&_.rdp-day_button:disabled]:cursor-not-allowed [&_.rdp-day_button:disabled]:pointer-events-auto"
          style={{ width: "100%" }}
        />
      </PopoverContent>
    </Popover>
  )
}
