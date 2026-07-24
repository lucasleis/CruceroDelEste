"use client";

import { useState } from "react";

const destinations = [
  "Rosario", "Córdoba", "Mar del Plata", "San Luis", "Mendoza",
  "Resistencia", "Corrientes", "Santa Fe", "Paraná", "Eldorado",
  "Oberá", "Ituzaingó", "Santo Tomé", "Mercedes", "Curuzú Cuatiá",
  "Paso de los Libres", "Goya", "Villa María", "Río Cuarto", "San Rafael",
];

export default function NetworkGrid() {
  const [query, setQuery] = useState("");

  const filteredDestinations = destinations.filter((city) =>
    city.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <section className="py-20 max-w-[1280px] mx-auto px-16 bg-[#f9f9f9]">
      <div className="flex justify-between items-end mb-12 gap-6">
        <div className="max-w-2xl">
          <h2 className="text-[32px] leading-10 tracking-tight font-semibold text-[#132691] mb-2">
            Nuestra Red Completa
          </h2>
          <p className="text-base leading-6 text-gray-600">
            Conectamos más de 40 ciudades en todo el país con puntualidad y dedicación. Encontrá tu terminal local en nuestra extensa red de paradas.
          </p>
        </div>
        <div className="relative w-80">
          <input
            className="w-full bg-white text-gray-500 border border-gray-300 focus:border-[#132691] focus:ring-1 focus:ring-[#132691] rounded-lg py-3 pl-10 pr-4 text-base outline-none transition-all"
            placeholder="Buscar paradas intermedias..."
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-lg">
            🔍
          </span>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-4">
        {filteredDestinations.map((city) => (
          <div
            key={city}
            className="bg-white text-black border border-gray-200 p-4 rounded-lg hover:shadow-lg hover:border-[#132691]/20 transition-all cursor-pointer group flex justify-between items-center"
          >
            <span className="text-lg font-medium text-[#1a1c1c] group-hover:text-[#132691] transition-colors">
              {city}
            </span>
            <span className="text-gray-400 opacity-0 group-hover:opacity-100 group-hover:text-[#e3000f] transition-all">
              ›
            </span>
          </div>
        ))}
      </div>

      <div className="mt-12 p-12 bg-[#e8eef7] rounded-xl border border-[#132691]/10 flex items-center justify-between">
        <div>
          <h3 className="text-2xl leading-8 font-semibold text-[#132691] mb-2">
            ¿No encontrás tu destino?
          </h3>
          <p className="text-base leading-6 text-gray-600">
            Nuestra red de rutas se expande cada temporada. Contactá a nuestro servicio de atención al cliente para chárteres especiales o viajes grupales.
          </p>
        </div>
        <button className="border-2 border-[#132691] text-[#132691] px-8 py-3 rounded-lg text-sm font-semibold tracking-wide hover:bg-[#132691] hover:text-white transition-all">
          Contactar Ventas
        </button>
      </div>
    </section>
  );
}
