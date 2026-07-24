export default function Hero() {
  return (
    <section className="relative h-[716px] w-full overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/fondo-destinos.png')" }}
      />

      <div className="absolute inset-0 bg-gradient-to-r from-[#132691]/90 via-[#132691]/30 to-transparent" />
      <div className="relative h-full max-w-[1280px] mx-auto px-16 flex flex-col justify-center items-start text-white">
        <h1 className="text-5xl leading-[56px] tracking-tight font-bold mb-4 max-w-2xl [text-shadow:0_2px_10px_rgba(0,0,0,0.5)]">
          Descubrí Argentina con Confort Premium
        </h1>
        <p className="text-lg leading-7 max-w-xl mb-12 text-white/90">
          Viví el máximo nivel en viajes de larga distancia. Desde las bulliciosas calles de Buenos Aires hasta las majestuosas Cataratas del Iguazú.
        </p>
        <div className="flex gap-4">
          <button className="bg-[#e3000f] text-white px-8 py-4 rounded-lg text-sm font-semibold tracking-wide hover:opacity-90 transition-all shadow-lg">
            Ver Rutas de la Flota
          </button>
          <button className="bg-white/10 backdrop-blur-md border border-white/30 text-white px-8 py-4 rounded-lg text-sm font-semibold tracking-wide hover:bg-white/20 transition-all">
            Conocer Más
          </button>
        </div>
      </div>
    </section>
  );
}
