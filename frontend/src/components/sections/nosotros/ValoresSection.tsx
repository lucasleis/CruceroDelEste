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
    <section className="py-20 bg-white">
      <div className="max-w-[1280px] mx-auto px-10">
        <div className="flex flex-row justify-between items-end mb-12 gap-6">
          <h2 className="font-serif text-2xl leading-8 font-semibold text-black">
            Nuestros Valores Core
          </h2>
          <p className="font-['Manrope'] text-[#454653] max-w-lg">
            La brújula que guía nuestro camino hacia la excelencia operativa y humana.
          </p>
        </div>
        <div className="grid grid-cols-4 gap-4">
          {VALORES.map((valor) => (
            <div
              className="bg-[#b5ecf1] p-6 group hover:bg-[#132691] hover:text-white transition-all duration-300"
              key={valor.title}
            >
              <div className="material-symbols-outlined mb-4 text-3xl text-black group-hover:text-white">{valor.icon}</div>
              <h4 className="font-bold mb-2 text-black group-hover:text-white">{valor.title}</h4>
              <p className="text-sm opacity-80 text-black group-hover:text-white">{valor.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
