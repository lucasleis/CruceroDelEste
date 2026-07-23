export default function LegadoSection() {
  return (
    <section className="py-32 px-16 bg-[#f9f9f9]">
      <div className="max-w-[1200px] mx-auto grid grid-cols-5 gap-8 items-start">
        <div className="col-span-2">
          <span className="text-[13px] leading-[1.2] tracking-[0.2em] font-semibold text-[#7e7576] uppercase block mb-4">
            DESDE 1982
          </span>
          <h2 className="font-serif text-[42px] leading-tight text-black">
            Un legado de confianza en el Mercosur.
          </h2>
        </div>
        <div className="col-span-3">
          <p className="font-['Manrope'] text-lg font-light leading-relaxed text-[#5e5e5e] mb-8">
            Expreso Río Paraná nace en 1982 con el compromiso de acortar distancias en el corazón de Sudamérica. Con más de cuatro décadas de historia, nos hemos consolidado como el puente confiable entre Argentina y Paraguay.
          </p>
          <p className="font-['Manrope'] text-base leading-relaxed text-[#5e5e5e]/80">
            Nuestra ruta principal conecta <strong>Asunción y Buenos Aires</strong>, pasando por puntos clave como Encarnación y Posadas. Con presencia en la Terminal de Ómnibus de Asunción (Boletería 54) y en Retiro, estamos siempre cerca de tu próximo destino.
          </p>
        </div>
      </div>
    </section>
  );
}
