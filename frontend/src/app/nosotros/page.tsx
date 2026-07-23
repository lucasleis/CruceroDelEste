import { Navbar } from "@/components/navigation/Navbar"
import { Footer } from "@/components/sections/Footer"
import HeroSection from "@/components/sections/nosotros/HeroSection"
import LegadoSection from "@/components/sections/nosotros/LegadoSection"
import ConfortSection from "@/components/sections/nosotros/ConfortSection"
import HistoriaSection from "@/components/sections/nosotros/HistoriaSection"
import ValoresSection from "@/components/sections/nosotros/ValoresSection"
import RedDestinosSection from "@/components/sections/nosotros/RedDestinosSection"
import ServiciosSection from "@/components/sections/nosotros/ServiciosSection"
import CtaFinalSection from "@/components/sections/nosotros/CtaFinalSection"

export default function NosotrosPage() {
  return (
    <>
      <Navbar />
      <HeroSection />
      <LegadoSection />
      <ConfortSection />
      <HistoriaSection />
      <ValoresSection />
      <RedDestinosSection />
      <ServiciosSection />
      <CtaFinalSection />
      <Footer />
    </>
  )
}