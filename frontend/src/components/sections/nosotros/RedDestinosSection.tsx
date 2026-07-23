export default function RedDestinosSection() {
  return (
    <section className="py-20 bg-[#e8e8e8] relative">
      <div className="max-w-[1280px] mx-auto px-10 grid grid-cols-5 gap-12 items-center">
        <div className="col-span-2">
          <h2 className="font-serif text-2xl leading-8 font-semibold text-[#1a1c1c] mb-6">
            Nuestra Red de Destinos
          </h2>
          <p className="font-['Manrope'] text-[#454653] mb-8">
            Cubrimos las rutas más importantes del país, uniendo centros urbanos con parajes naturales de inigualable belleza. Donde el camino nos lleve, nosotros vamos con vos.
          </p>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-white border-l-4 border-[#132691]">
              <span className="text-black font-bold">Buenos Aires - Corrientes</span>
              <span className="material-symbols-outlined text-black">east</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-white border-l-4 border-[#e3000f]">
              <span className="text-black font-bold">Rosario - Posadas</span>
              <span className="material-symbols-outlined text-black">east</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-white border-l-4 border-[#132691]">
              <span className="text-black font-bold">Retiro - Paso de los Libres</span>
              <span className="material-symbols-outlined text-black">east</span>
            </div>
          </div>
        </div>

        <div className="col-span-3 h-[500px] bg-[#dadada] relative overflow-hidden group">
          <div
            className="absolute inset-0 grayscale group-hover:grayscale-0 transition-all duration-700 bg-cover bg-center"
            style={{ backgroundImage: "url('/mapa.png')" }}
          />
          <div className="absolute bottom-6 right-6 bg-[#132691] p-4 text-white shadow-xl">
            <div className="text-[13px] tracking-tighter uppercase">Cobertura Federal</div>
            <div className="text-2xl font-bold">200+ Puntos</div>
          </div>
        </div>
      </div>
    </section>
  );
}
