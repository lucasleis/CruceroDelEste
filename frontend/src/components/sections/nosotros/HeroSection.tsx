export default function HeroSection() {
  return (
    <section className="relative flex items-center justify-center py-20 px-6 min-h-[600px] overflow-hidden">
      <div className="absolute inset-0 z-0">
        <img
          alt="Background bus"
          className="w-full h-full object-cover"
          src="/micro-ruta-nos.png"
        />
        <div className="absolute inset-0 bg-[#132691]/40" />
      </div>
      <div className="relative z-20 max-w-7xl mx-auto w-full flex flex-row items-center justify-between text-white px-6">
        <div className="max-w-2xl text-left">
          <div className="inline-block bg-[#e3000f] px-3 py-1 mb-8 text-xs font-bold tracking-widest uppercase rounded-sm">
            SOBRE NOSOTROS
          </div>
          <h1 className="text-6xl font-bold mb-6 leading-[1.1]">
            Excelencia en Movimiento a Través del Paraná
          </h1>
          <p className="text-xl mb-10 leading-relaxed opacity-90">
            Un legado de décadas conectando personas, sueños y destinos con la precisión técnica y el calor humano que solo Expreso Río Paraná puede ofrecer.
          </p>
          <div>
            <a
              className="inline-block bg-[#e3000f] text-white px-10 py-4 text-lg font-bold rounded-[4px] shadow-lg hover:bg-red-700 transform hover:-translate-y-1 transition-all duration-200"
              href="#"
            >
              Comprar Pasajes
            </a>
          </div>
        </div>
        <div className="w-1/3">
          <img
            alt="Expreso Río Paraná Logo"
            className="w-full h-auto"
            src="/ExpresoRioParana-Logo.png"
          />
        </div>
      </div>
    </section>
  );
}
