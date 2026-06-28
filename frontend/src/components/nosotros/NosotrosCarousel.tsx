"use client"

import { useEffect, useRef, useState } from "react"
import Autoplay from "embla-carousel-autoplay"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel"
import { NosotrosCard } from "./NosotrosCard"

const CARDS = [
  {
    number: "01",
    title: "Seguridad ante todo",
    description:
      "Unidades modernas, mantenimiento constante y protocolos que garantizan tu tranquilidad en cada viaje.",
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <polyline points="9 12 11 14 15 10" />
      </svg>
    ),
  },
  {
    number: "02",
    title: "Confort que se siente",
    description:
      "Asientos amplios, climatización, baño a bordo y servicios pensados para tu bienestar.",
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    ),
  },
  {
    number: "03",
    title: "Experiencias que conectan",
    description:
      "Más que llegar, se trata del viaje. Disfrutá cada momento con entretenimiento y atención de calidad.",
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M8 14s1.5 2 4 2 4-2 4-2" />
        <line x1="9" y1="9" x2="9.01" y2="9" />
        <line x1="15" y1="9" x2="15.01" y2="9" />
      </svg>
    ),
  },
  {
    number: "04",
    title: "Compromiso que nos mueve",
    description:
      "Un equipo apasionado que trabaja cada día para superar tus expectativas y acompañarte siempre.",
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    number: "05",
    title: "Puntualidad que respetamos",
    description:
      "Salidas y llegadas a tiempo, porque sabemos que tu tiempo es lo más valioso.",
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
  {
    number: "06",
    title: "Rutas que nos unen",
    description:
      "Conectamos Argentina, Paraguay y Brasil con frecuencias diarias para que siempre tengas un viaje disponible.",
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="10" r="3" />
        <path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 14 8 14s8-8.75 8-14a8 8 0 0 0-8-8z" />
      </svg>
    ),
  },
]

export function NosotrosCarousel() {
  const autoplay = useRef(Autoplay({ delay: 3000, stopOnInteraction: false }))
  const [api, setApi] = useState<CarouselApi>()
  const [visibleIndexes, setVisibleIndexes] = useState<number[]>([0, 1, 2])

  useEffect(() => {
    if (!api) return
    const update = () => {
      const inView = api.slidesInView()
      setVisibleIndexes(inView)
    }
    update()
    api.on("select", update)
    api.on("reInit", update)
  }, [api])

  return (
    <div style={{ position: "relative", width: "100%" }}>
      <Carousel
        plugins={[autoplay.current]}
        opts={{ loop: true }}
        className="w-full overflow-visible"
        setApi={setApi}
      >
        <div style={{ margin: "0 48px" }}>
          <CarouselContent>
            {CARDS.map((card, index) => (
              <CarouselItem key={card.number} className="basis-1/3">
                <NosotrosCard
                  {...card}
                  showDivider={
                    visibleIndexes.length > 0 &&
                    index !== visibleIndexes[visibleIndexes.length - 1]
                  }
                />
              </CarouselItem>
            ))}
          </CarouselContent>
        </div>
        <CarouselPrevious className="carousel-prev-btn" style={{ left: 0 }} />
        <CarouselNext className="carousel-next-btn" style={{ right: 0 }} />
      </Carousel>
    </div>
  )
}
