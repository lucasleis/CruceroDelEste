export default function Hero() {
  return (
    <section className="relative w-full overflow-hidden h-[716px] md:h-[716px]" style={{ minHeight: "100svh" }}>
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/fondo-destinos.png')" }}
      />
      <div className="absolute inset-0 bg-gradient-to-b md:bg-gradient-to-r from-[#132691]/90 via-[#132691]/60 to-[#132691]/30 md:to-transparent" />
      <div className="relative h-full max-w-[1280px] mx-auto px-6 md:px-16 flex flex-col justify-end md:justify-center items-start text-white pb-12 md:pb-0">
        <h1 className="text-2xl md:text-5xl leading-tight md:leading-[56px] tracking-tight font-bold mb-4 max-w-2xl [text-shadow:0_2px_10px_rgba(0,0,0,0.5)]">
          Descubrí Argentina con Confort Premium
        </h1>
        <p className="text-sm md:text-lg leading-7 max-w-xl mb-8 md:mb-12 text-white/90">
          Viví el máximo nivel en viajes de larga distancia. Desde las bulliciosas calles de Buenos Aires hasta las majestuosas Cataratas del Iguazú.
        </p>
        <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
          <button className="w-full md:w-auto bg-[#e3000f] text-white px-6 py-3 rounded-full md:rounded-lg text-sm font-semibold tracking-wide hover:opacity-90 transition-all shadow-lg">
            Ver Rutas de la Flota
          </button>
          <button className="w-full md:w-auto bg-white/10 backdrop-blur-md border border-white/30 text-white px-6 py-3 rounded-full md:rounded-lg text-sm font-semibold tracking-wide hover:bg-white/20 transition-all">
            Conocer Más
          </button>
        </div>
      </div>
    </section>
  );
}
