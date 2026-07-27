const VALORES = [
  {
    icon: 'verified_user',
    title: 'Seguridad',
    text: 'Protocolos rigurosos y capacitación constante de nuestros conductores.',
  },
  {
    icon: 'schedule',
    title: 'Puntualidad',
    text: 'Respeto absoluto por el tiempo de nuestros clientes en cada salida.',
  },
  {
    icon: 'nature_people',
    title: 'Sustentabilidad',
    text: 'Reducción activa de nuestra huella de carbono mediante flota eficiente.',
  },
  {
    icon: 'handshake',
    title: 'Integridad',
    text: 'Transparencia y honestidad en cada interacción con la comunidad.',
  },
];

export default function ValoresSection() {
  return (
    <section className="py-12 md:py-20 bg-white">
      <div className="max-w-[1280px] mx-auto px-6 md:px-10">
        <div className="flex flex-col md:flex-row md:justify-between md:items-end mb-8 md:mb-12 gap-3 md:gap-6">
          <div>
            <h2 className="font-serif text-2xl leading-8 font-semibold text-black mb-2">
              Nuestros Valores Core
            </h2>
            <div className="w-8 h-0.5 bg-[#e3000f]" />
          </div>
          <p className="font-['Manrope'] text-[#454653] max-w-lg">
            La brújula que guía nuestro camino hacia la excelencia operativa y humana.
          </p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {VALORES.map((valor) => (
            <div
              className="bg-[#b5ecf1] p-6 rounded-xl md:rounded-none group hover:bg-[#132691] hover:text-white transition-all duration-300"
              key={valor.title}
            >
              <div className="material-symbols-outlined mb-4 text-3xl text-black group-hover:text-white">{valor.icon}</div>
              <h4 className="font-bold mb-2 text-black group-hover:text-white">{valor.title}</h4>
              <p className="text-[15px] opacity-80 text-black group-hover:text-white">{valor.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
