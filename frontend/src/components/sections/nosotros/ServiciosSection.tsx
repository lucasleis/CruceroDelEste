export default function ServiciosSection() {
  return (
    <section className="py-20 bg-[#f9f9f9]">
      <div className="max-w-[1280px] mx-auto px-10">
        <h2 className="font-serif text-2xl leading-8 font-semibold text-[#1a1c1c] mb-12 border-l-4 border-[#e3000f] pl-4">
          Nuestros servicios, tu comodidad
        </h2>
        <div className="grid grid-cols-4 gap-6">
          <div className="col-span-2 bg-[#f3f3f3] p-8 border border-[#b5ecf1] flex flex-col justify-between">
            <div className="material-symbols-outlined text-[#132691] text-4xl mb-4">history</div>
            <div>
              <h3 className="font-serif text-2xl leading-8 font-semibold mb-2 text-black">Décadas de Trayectoria</h3>
              <p className="font-['Manrope'] text-[#454653]">
                Desde nuestros inicios, hemos priorizado la seguridad y la puntualidad como los pilares fundamentales de cada kilómetro recorrido.
              </p>
            </div>
          </div>

          <div className="col-span-2 flex gap-6">
            <div className="group relative bg-[#132691] text-white p-8 flex flex-col justify-center items-center text-center overflow-hidden cursor-default flex-1 min-w-0 [transition:flex-grow_400ms_ease] hover:[flex-grow:3]">
              <div className="material-symbols-outlined text-4xl mb-2 transition-opacity duration-300 group-hover:opacity-0">
                airline_seat_flat
              </div>
              <div className="text-[13px] tracking-widest uppercase whitespace-nowrap transition-opacity duration-300 group-hover:opacity-0">
                Servicio Cama
              </div>
              <div className="absolute inset-0 bg-[#132691]/95 p-6 flex items-center justify-center text-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <p className="text-sm leading-relaxed">
                  Butacas 100% reclinables pensadas para viajes largos, con máximo espacio y privacidad para descansar de punta a punta del trayecto.
                </p>
              </div>
            </div>

            <div className="group relative bg-[#e3000f] text-white p-8 flex flex-col justify-center items-center text-center overflow-hidden cursor-default flex-1 min-w-0 [transition:flex-grow_400ms_ease] hover:[flex-grow:3]">
              <div className="material-symbols-outlined text-4xl mb-2 transition-opacity duration-300 group-hover:opacity-0">
                airline_seat_recline_normal
              </div>
              <div className="text-[13px] tracking-widest uppercase whitespace-nowrap transition-opacity duration-300 group-hover:opacity-0">
                Servicio Semi-Cama
              </div>
              <div className="absolute inset-0 bg-[#e3000f]/95 p-6 flex items-center justify-center text-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <p className="text-sm leading-relaxed">
                  Butacas reclinables con un excelente equilibrio entre confort y precio, ideales para quienes buscan una opción práctica sin resignar comodidad.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
