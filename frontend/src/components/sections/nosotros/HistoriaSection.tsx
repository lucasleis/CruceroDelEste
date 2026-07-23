'use client';

import { useEffect, useRef } from 'react';

const TIMELINE = [
  {
    year: '1982',
    title: 'Fundación',
    dotColor: 'bg-[#e3000f]',
    text: 'Iniciamos operaciones con una flota de 5 unidades, uniendo por primera vez Buenos Aires con las provincias del litoral bajo la premisa de la puntualidad absoluta.',
  },
  {
    year: '1995',
    title: 'Expansión Federal',
    dotColor: 'bg-[#132691]',
    text: 'Consolidación de rutas clave y renovación total de flota con tecnología alemana, introduciendo el concepto de servicio a bordo diferenciado.',
  },
  {
    year: '2010',
    title: 'La Era Digital',
    dotColor: 'bg-[#132691]',
    text: 'Primer sistema de tracking satelital en tiempo real disponible para el pasajero y digitalización completa de la venta de pasajes.',
  },
  {
    year: 'Hoy',
    title: 'Excelencia Sostenible',
    dotColor: 'bg-[#e3000f]',
    text: 'Liderazgo en el segmento Premium con unidades Euro 5 y un compromiso inquebrantable con la seguridad vial y el confort.',
  },
];

export default function HistoriaSection() {
  const dotRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('scale-125');
            setTimeout(() => entry.target.classList.remove('scale-125'), 500);
          }
        });
      },
      { threshold: 0.5 }
    );

    dotRefs.current.forEach((dot) => {
      if (dot) observer.observe(dot);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <section className="py-32 bg-white">
      <div className="max-w-[1280px] mx-auto px-10">
        <div className="grid grid-cols-12 gap-16 items-start">
          <div className="col-span-5 space-y-12 sticky top-32">
            <h2 className="font-serif text-5xl text-[#132691]">
              Cuatro Décadas de Trayectoria
            </h2>
            <p className="text-[#454653] text-xl leading-relaxed">
              Lo que comenzó como una visión familiar en las orillas del Paraná, se ha transformado en el estándar de oro del transporte terrestre argentino.
            </p>
            <div className="grid grid-cols-2 gap-8 pt-8 border-t border-[#132691]/10">
              <div>
                <div className="text-6xl font-bold text-[#132691] mb-2">50+</div>
                <div className="text-[13px] tracking-[0.2em] font-semibold uppercase text-[#e3000f]">
                  Años de Servicio
                </div>
              </div>
              <div>
                <div className="text-6xl font-bold text-[#132691] mb-2">1M+</div>
                <div className="text-[13px] tracking-[0.2em] font-semibold uppercase text-[#e3000f]">
                  Pasajeros/Año
                </div>
              </div>
            </div>
          </div>

          <div className="col-span-7 space-y-24 pl-16 border-l border-[#132691]/20">
            {TIMELINE.map((item, index) => (
              <div className="relative" key={item.year}>
                <div
                  className={`absolute -left-[41px] top-0 w-5 h-5 rounded-full border-4 border-white shadow-md transition-transform duration-300 ${item.dotColor}`}
                  ref={(el) => {
                    dotRefs.current[index] = el;
                  }}
                />
                <span className="text-[13px] tracking-[0.2em] font-semibold text-[#e3000f] mb-2 block">
                  {item.year}
                </span>
                <h3 className="font-serif text-3xl mb-4 text-[#1a1c1c]">{item.title}</h3>
                <p className="text-[#454653] text-lg">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
