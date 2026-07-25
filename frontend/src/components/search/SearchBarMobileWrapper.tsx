"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { SearchBar } from "@/components/search/SearchBar"

export function SearchBarMobileWrapper() {
  const router = useRouter()
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

  function handleSearch(value: {
    originStop?: string
    originProvince?: string
    destinationStop?: string
    destinationProvince?: string
    departureDate: Date | undefined
    passengers: { adults: number; children: number }
  }) {
    const date = value.departureDate?.toISOString().split("T")[0]
    if (!date) return
    if (!value.originStop && !value.originProvince) return
    if (!value.destinationStop && !value.destinationProvince) return

    const passengers = value.passengers.adults + value.passengers.children

    const originParam = value.originProvince
      ? `origin_province=${encodeURIComponent(value.originProvince)}`
      : `origin=${encodeURIComponent(value.originStop ?? "")}`

    const destinationParam = value.destinationProvince
      ? `destination_province=${encodeURIComponent(value.destinationProvince)}`
      : `destination=${encodeURIComponent(value.destinationStop ?? "")}`

    router.push(`/resultados?${originParam}&${destinationParam}&date=${date}&passengers=${passengers}`)
  }

  if (!mounted || !isMobile) return null

  return (
    <div style={{
      background: "white",
      padding: "0 16px 32px 16px",
      marginTop: "-24px",
    }}>
      <SearchBar onSearch={handleSearch} />
    </div>
  )
}
