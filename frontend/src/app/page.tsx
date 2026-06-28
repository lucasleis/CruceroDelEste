import { Hero } from "@/components/sections/Hero"
import { Destinos } from "@/components/sections/Destinos"
import { Nosotros } from "@/components/sections/Nosotros"
import { CTA } from "@/components/sections/CTA"
import { Arrepentimiento } from "@/components/sections/Arrepentimiento"
import { Footer } from "@/components/sections/Footer"

export default function Home() {
  return (
    <main>
      <Hero />
      <Destinos />
      <Nosotros />
      <CTA />
      <Arrepentimiento />
      <Footer />
    </main>
  )
}
