type DestinationCardProps = {
  image: string;
  category: string;
  title: string;
  description: string;
  ctaText: string;
  ctaType: "link" | "button";
  imageSide: "left" | "right";
  scheme: "light" | "dark";
};

export default function DestinationCard({
  image,
  category,
  title,
  description,
  ctaText,
  ctaType,
  imageSide,
  scheme,
}: DestinationCardProps) {
  const isDark = scheme === "dark";

  const imageBlock = (
    <div className="relative overflow-hidden h-full">
      <img src={image} alt={title} className="w-full h-full object-cover" />
    </div>
  );

  const textBlock = (
    <div
      className={`flex flex-col justify-center px-24 py-12 h-full ${
        isDark ? "bg-[#132691] text-white" : "bg-white text-[#1a1c1c]"
      }`}
    >
      <span
        className={`text-sm font-semibold tracking-widest mb-2 ${
          isDark ? "text-[#ffb4aa]" : "text-[#e3000f]"
        }`}
      >
        {category}
      </span>
      <h2
        className={`text-5xl leading-[56px] tracking-tight font-bold mb-4 ${
          isDark ? "text-white" : "text-[#132691]"
        }`}
      >
        {title}
      </h2>
      <p
        className={`text-lg leading-relaxed mb-12 ${
          isDark ? "text-white/80" : "text-gray-600"
        }`}
      >
        {description}
      </p>
      {ctaType === "link" ? (
        <a
          className="inline-flex items-center gap-2 w-fit text-[#132691] text-sm font-semibold tracking-wide group"
          href="#"
        >
          {ctaText}
          <span className="group-hover:translate-x-1 transition-transform">→</span>
        </a>
      ) : (
        <button className="w-fit bg-[#e3000f] text-white px-8 py-3 rounded-lg text-sm font-semibold tracking-wide hover:opacity-90 transition-all">
          {ctaText}
        </button>
      )}
    </div>
  );

  return (
    <section className="relative h-[600px] w-full flex items-center overflow-hidden">
      <div className="absolute inset-0 grid grid-cols-2">
        {imageSide === "left" ? (
          <>
            {imageBlock}
            {textBlock}
          </>
        ) : (
          <>
            {textBlock}
            {imageBlock}
          </>
        )}
      </div>
    </section>
  );
}
