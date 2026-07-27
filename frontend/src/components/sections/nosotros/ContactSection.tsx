const channels = [
  {
    icon: "call",
    label: "Atención al Cliente",
    value: "0800-444-7467",
    href: "tel:08004447467",
    description: "Soporte gratuito a nivel nacional.",
  },
  {
    icon: "mail",
    label: "Email",
    value: "info@rioparana.com",
    href: "mailto:info@rioparana.com",
    description: "Consultas institucionales y generales.",
  },
  {
    icon: "share",
    label: "Redes Sociales",
    value: "@expresorioparana",
    href: "#",
    description: "Seguinos en Instagram para novedades.",
  },
];

export default function ContactSection() {
  return (
    <section id="contacto" className="py-20">
      <div className="max-w-[1280px] mx-auto px-10">
        <h2 className="font-serif text-2xl font-semibold text-black border-l-4 border-[#e3000f] pl-4 mb-12">
          Contactanos
        </h2>
        <div className="flex flex-col gap-6 md:grid md:grid-cols-3 md:gap-8">
          {channels.map((channel) => (
            <div
              key={channel.label}
              className="flex flex-col items-center text-center gap-4 p-8 bg-[#f3f3f4] border border-[#99d0d5] rounded-lg hover:border-[#132691] transition-colors"
            >
              <div className="bg-[#132691] text-white p-6 flex items-center justify-center rounded-full">
                <span className="material-symbols-outlined text-4xl">{channel.icon}</span>
              </div>
              <div>
                <p className="text-xs font-semibold tracking-widest text-[#132691] uppercase mb-2">
                  {channel.label}
                </p>
                <a
                  className="text-2xl font-semibold text-[#1a1c1c] hover:text-[#e3000f] transition-colors"
                  href={channel.href}
                >
                  {channel.value}
                </a>
                <p className="text-[#454653] mt-2">{channel.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
