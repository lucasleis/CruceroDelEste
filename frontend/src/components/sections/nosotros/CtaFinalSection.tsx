export default function CtaFinalSection() {
  return (
    <section className="relative py-24 bg-[#132691] text-white overflow-hidden">
      <div className="absolute top-0 right-0 w-1/3 h-full bg-[#e3000f] -skew-x-12 translate-x-1/2 opacity-20" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#b5ecf1] rounded-full blur-3xl opacity-10" />

      <div className="max-w-[1280px] mx-auto px-10 relative z-10">
        <div className="max-w-3xl space-y-10">
          <div className="space-y-4">
            <h2 className="font-serif text-[56px] leading-none tracking-[-0.01em] font-bold">
              <span className="block">TU PRÓXIMO CAPÍTULO</span>
              <span className="block text-[#8696ff]">COMIENZA EN RUTA.</span>
            </h2>
            <div className="h-2 w-32 bg-[#e3000f]" />
          </div>

          <p className="font-['Manrope'] text-lg font-light leading-relaxed text-white/80 max-w-xl">
            Asegurá tu lugar en nuestra flota de vanguardia. Experiencia, seguridad y confort en cada kilómetro que recorremos juntos.
          </p>

          <div className="flex gap-6 items-center">
            <button className="bg-[#e3000f] text-white px-10 py-5 font-serif text-2xl font-semibold hover:scale-105 active:scale-95 transition-all shadow-2xl flex items-center gap-3">
              RESERVAR AHORA
              <span className="material-symbols-outlined">confirmation_number</span>
            </button>
            <div className="flex items-center gap-4 text-white/60">
              <span className="material-symbols-outlined">credit_card</span>
              <span className="text-[13px] tracking-[0.2em] font-semibold uppercase">
                Aceptamos todos los medios de pago
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
