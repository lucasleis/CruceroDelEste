export default function ConfortSection() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-[1280px] mx-auto px-10 grid grid-cols-2 gap-16 items-center">
        <div className="relative group">
          <div className="absolute -inset-4 bg-[#b5ecf1] rounded-xl -rotate-2 z-0 group-hover:rotate-0 transition-transform" />
          <div className="relative h-96 w-full z-10 overflow-hidden">
            <img src="/bus-dentro.png" alt="Interior del bus" className="w-full h-full object-cover" />
          </div>
        </div>

        <div>
          <h2 className="font-serif text-2xl leading-8 font-semibold text-[#1a1c1c] mb-6">
            Confort de Vanguardia
          </h2>
          <p className="font-['Manrope'] text-lg font-light leading-relaxed mb-8 text-[#454653]">
            Viajar no es solo llegar; es disfrutar del trayecto. Nuestras unidades están equipadas con
            tecnología de confort de última generación, diseñadas para que cada minuto a bordo sea una
            experiencia de descanso.
          </p>
          <ul className="space-y-4">
            <li className="flex items-start gap-3">
              <svg className="w-6 h-6 shrink-0 text-[#e3000f]" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
                <path d="M8 12.5L10.5 15L16 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="font-['Manrope'] text-[#1a1c1c]">Butacas Cama y Semi-Cama reclinables 160°</span>
            </li>
            <li className="flex items-start gap-3">
              <svg className="w-6 h-6 shrink-0 text-[#e3000f]" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
                <path d="M8 12.5L10.5 15L16 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="font-['Manrope'] text-[#1a1c1c]">Climatización inteligente dual</span>
            </li>
            <li className="flex items-start gap-3">
              <svg className="w-6 h-6 shrink-0 text-[#e3000f]" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
                <path d="M8 12.5L10.5 15L16 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="font-['Manrope'] text-[#1a1c1c]">Servicio a bordo premium con catering</span>
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}
