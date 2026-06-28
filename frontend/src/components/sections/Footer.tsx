import Image from "next/image"
import { Heading } from "@/components/core/Heading"

const ArrowUpRight = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="7" y1="17" x2="17" y2="7" />
    <polyline points="7 7 17 7 17 17" />
  </svg>
)

const InstagramIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
)

const COLUMNS = [
  {
    label: "PÁGINAS",
    links: ["Inicio", "Destinos", "Horarios", "Novedades", "Contacto"],
  },
  {
    label: "EMPRESA",
    links: ["Nosotros", "Flota", "Servicios", "Trabajá con nosotros"],
  },
  {
    label: "INFORMACIÓN",
    links: ["Tarifas", "Preguntas frecuentes", "Términos y condiciones", "Política de privacidad"],
  },
]

const WhatsAppIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.149-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
  </svg>
)

const SOCIALS = [
  { name: "Instagram", icon: <InstagramIcon /> },
  { name: "Whatsapp", icon: <WhatsAppIcon /> },
]

export function Footer() {
  return (
    <footer style={{ width: "100%", position: "relative", overflow: "hidden", background: "var(--color-navy-dark)", minHeight: "400px" }}>
      {/* Background image */}
      <Image
        src="/secciones/Footer.png"
        alt=""
        fill
        style={{ objectFit: "cover", objectPosition: "right center", zIndex: 0 }}
      />

      {/* Dark overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(to bottom, rgba(6,13,51,0.75) 0%, rgba(6,13,51,0.92) 50%, rgba(6,13,51,0.98) 100%)",
          zIndex: 1,
        }}
      />

      {/* Content */}
      <div
        style={{
          position: "relative",
          zIndex: 10,
          maxWidth: "1280px",
          margin: "0 auto",
          padding: "48px 32px 24px 32px",
          display: "flex",
          flexDirection: "column",
          gap: "48px",
        }}
      >
        {/* Top — Logo + Headline */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: "16px" }}>
          <Image src="/assets/logo-rioparana.png" alt="Expreso Río Paraná" height={56} width={220} />
          <Heading as="h2" size="lg" color="white" accentLine="acercamos destinos." accentColor="aqua">
            Conectamos personas,
          </Heading>
        </div>

        {/* Middle — Link grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 200px)",
            gap: "64px",
            justifyContent: "center",
            margin: "0 auto",
            width: "fit-content",
          }}
        >
          {COLUMNS.map((col) => (
            <div key={col.label} style={{ display: "flex", flexDirection: "column", gap: "12px", alignItems: "center", textAlign: "center" }}>
              <span
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.15em",
                  color: "var(--color-aqua)",
                }}
              >
                {col.label}
              </span>
              {col.links.map((link) => (
                <a key={link} href="#" className="footer-link">
                  {link}
                </a>
              ))}
            </div>
          ))}
        </div>

        {/* Bottom — Copyright + Social + Legal */}
        <div
          style={{
            borderTop: "1px solid rgba(255,255,255,0.15)",
            paddingTop: "20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          {/* Left */}
          <span
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "var(--text-sm)",
              color: "white",
              opacity: 0.6,
            }}
          >
            © 2026 Expreso Río Paraná. Todos los derechos reservados.
          </span>

          {/* Center — Socials */}
          <div style={{ display: "flex", flexDirection: "row", gap: "16px" }}>
            {SOCIALS.map(({ name, icon }) => (
              <a key={name} href="#" className="footer-social">
                {icon}
                {name}
                <ArrowUpRight />
              </a>
            ))}
          </div>

          {/* Right — Legal */}
          <div style={{ display: "flex", flexDirection: "row", gap: "16px", alignItems: "center" }}>
            <a href="#" className="footer-legal">Política de privacidad</a>
            <span style={{ color: "white", opacity: 0.4 }}>|</span>
            <a href="#" className="footer-legal">Términos y condiciones</a>
          </div>
        </div>
      </div>
    </footer>
  )
}
