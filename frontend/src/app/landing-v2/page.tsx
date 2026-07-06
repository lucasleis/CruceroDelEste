import { Hero } from "@/components/sections/Hero"
import { Destinos } from "@/components/sections/Destinos"
import { Beneficios } from "@/components/sections/Beneficios"
import { NosotrosV2 } from "@/components/sections/NosotrosV2"
import { CTA } from "@/components/sections/CTA"
import { Arrepentimiento } from "@/components/sections/Arrepentimiento"
import { Footer } from "@/components/sections/Footer"

export default function LandingV2() {
  return (
    <main>
      <Hero />
      <Destinos />
      <Beneficios />
      <NosotrosV2 />
      <CTA />
      <Arrepentimiento />
      <Footer />
    </main>
  )
}
