import { HeroNosotros } from "@/components/sections/nosotros/HeroNosotros"
import { PionerosSection } from "@/components/sections/nosotros/PionerosSection"
import { ValoresSection } from "@/components/sections/nosotros/ValoresSection"
import { FlotaSection } from "@/components/sections/nosotros/FlotaSection"
import { RutasSection } from "@/components/sections/nosotros/RutasSection"
import { EstadisticasSection } from "@/components/sections/nosotros/EstadisticasSection"

export default function NosotrosPage() {
  return (
    <>
      <HeroNosotros />
      <PionerosSection />
      <ValoresSection />
      <FlotaSection />
      <RutasSection />
      <EstadisticasSection />
    </>
  )
}
