import { Navbar } from "@/components/navigation/Navbar"
import { Footer } from "@/components/sections/Footer"
import Hero from "@/components/sections/destinos/Hero"
import DestinationsSection from "@/components/sections/destinos/DestinationsSection"
import NetworkGrid from "@/components/sections/destinos/NetworkGrid"

export default function DestinosPage() {
  return (
    <main style={{ backgroundColor: '#f9f9f9' }}>
      <Navbar />
      <Hero />
      <DestinationsSection />
      <NetworkGrid />
      <Footer />
    </main>
  )
}