"use client"

import Image from "next/image"
import { useRouter } from "next/navigation"
import { Heading } from "@/components/core/Heading"
import { Subheading } from "@/components/core/Subheading"
import { FeatureItem } from "@/components/core/FeatureItem"
import { Navbar } from "@/components/navigation/Navbar"
import { SearchBar } from "@/components/search/SearchBar"

const ShieldIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
)

const ClockIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
)

export function Hero() {
  const router = useRouter()

  function handleSearch(value: {
    origin: string
    destination: string
    departureDate: Date | undefined
    passengers: { adults: number; children: number }
  }) {
    const date = value.departureDate?.toISOString().split("T")[0]
    if (!date) return
    const passengers = value.passengers.adults + value.passengers.children
    router.push(
      `/resultados?origin=${value.origin}&destination=${value.destination}&date=${date}&passengers=${passengers}`
    )
  }

  return (
    <section style={{ width: "100%", minHeight: "80vh", position: "relative", overflow: "hidden" }}>
      {/* Background image */}
      <Image
        src="/secciones/Hero.png"
        alt=""
        fill
        priority
        style={{ objectFit: "cover", objectPosition: "center", zIndex: 0 }}
      />

      {/* Overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(to right, rgba(6,13,51,0.55) 0%, rgba(6,13,51,0) 100%)",
          zIndex: 1,
        }}
      />

      {/* Navbar */}
      <div style={{ position: "relative", zIndex: 20 }}>
        <Navbar />
      </div>

      {/* Content */}
      <div
        style={{
          position: "absolute",
          zIndex: 10,
          left: "8%",
          top: "50%",
          transform: "translateY(-50%)",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
          maxWidth: "520px",
        }}
      >
        <Heading as="h1" size="xl" color="white">
          Pasajes baratos, comprá y viajá más.
        </Heading>

        <Subheading color="white" size="md">
          Conectamos Argentina y Paraguay cada día con vos.
        </Subheading>

        <FeatureItem color="white" icon={<ShieldIcon />}>
          Compra 100% segura
        </FeatureItem>

        <FeatureItem color="white" icon={<ClockIcon />}>
          Más de 60 años conectando destinos
        </FeatureItem>
      </div>

      {/* SearchBar */}
      <div
        style={{
          position: "absolute",
          bottom: "32px",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 20,
        }}
      >
        <SearchBar onSearch={handleSearch} />
      </div>
    </section>
  )
}
