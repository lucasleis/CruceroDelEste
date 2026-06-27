"use client"

import { useState } from "react"
import { CityInput } from "@/components/search/CityInput"

export default function SearchPage() {
  const [origin, setOrigin] = useState("")
  const [destination, setDestination] = useState("")

  return (
    <div style={{ background: "white", padding: "48px" }}>
      <h1
        className="mb-8 text-2xl font-bold"
        style={{ fontFamily: "var(--font-display)" }}
      >
        SearchBar Components
      </h1>

      <div className="flex gap-8">
        <CityInput
          label="Origen"
          placeholder="Elegí ciudad"
          value={origin}
          onChange={setOrigin}
          icon="pin"
        />
        <CityInput
          label="Destino"
          placeholder="Elegí destino"
          value={destination}
          onChange={setDestination}
          icon="arrows"
        />
      </div>
    </div>
  )
}
