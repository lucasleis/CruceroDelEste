"use client";

import Image from "next/image";
import Link from "next/link";

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const InstagramIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
);

const WhatsAppIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.149-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
  </svg>
);

interface DrawerLink {
  label: string;
  href: string;
  icon: string;
}

const NAV_LINKS: DrawerLink[] = [
  { label: "Destinos", href: "/destinos", icon: "map" },
  { label: "Estado del viaje", href: "/estado-viaje", icon: "directions_bus" },
  { label: "Mis reservas", href: "/mis-reservas", icon: "confirmation_number" },
  { label: "Preguntas frecuentes", href: "/preguntas-frecuentes", icon: "help" },
];

const EMPRESA_LINKS: DrawerLink[] = [
  { label: "Nosotros", href: "/nosotros", icon: "groups" },
  { label: "Servicios", href: "/nosotros#servicios", icon: "star" },
  { label: "Contacto", href: "/nosotros#contacto", icon: "mail" },
];

const LEGAL_LINKS: DrawerLink[] = [
  { label: "Términos y condiciones", href: "#", icon: "description" },
  { label: "Política de privacidad", href: "#", icon: "shield" },
  { label: "Botón de arrepentimiento", href: "/arrepentimiento", icon: "lock" },
];

const sectionLabelStyle: React.CSSProperties = {
  fontSize: "11px",
  fontWeight: 600,
  letterSpacing: "0.15em",
  textTransform: "uppercase",
  color: "var(--color-primary)",
  marginBottom: "12px",
  display: "block",
  fontFamily: "var(--font-body)",
};

const linkRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "16px",
  padding: "14px 0",
  borderBottom: "1px solid var(--color-border)",
  textDecoration: "none",
  color: "var(--color-navy)",
  fontSize: "14px",
  fontWeight: 500,
  fontFamily: "var(--font-body)",
};

function DrawerLinkRow({ link, onClose }: { link: DrawerLink; onClose: () => void }) {
  return (
    <Link href={link.href} onClick={onClose} style={linkRowStyle}>
      <span
        className="material-symbols-outlined"
        style={{ fontSize: "22px", color: "var(--color-primary)", flexShrink: 0 }}
      >
        {link.icon}
      </span>
      <span>{link.label}</span>
      <span style={{ marginLeft: "auto", color: "var(--color-primary)" }}>›</span>
    </Link>
  );
}

export function MobileDrawer({ isOpen, onClose }: MobileDrawerProps) {
  return (
    <>
      {isOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 199,
          }}
          onClick={onClose}
        />
      )}

      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          height: "100%",
          width: "80vw",
          maxWidth: "360px",
          background: "var(--color-surface)",
          zIndex: 200,
          display: "flex",
          flexDirection: "column",
          transform: isOpen ? "translateX(0%)" : "translateX(100%)",
          transition: "transform 300ms cubic-bezier(0.22, 1, 0.36, 1)",
          pointerEvents: isOpen ? "auto" : "none",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 24px",
            display: "flex",
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: "1px solid var(--color-border)",
          }}
        >
          <Image src="/assets/logo-rioparana.png" alt="Expreso Río Paraná" height={36} width={144} />
          <button onClick={onClose}>
            <span className="material-symbols-outlined" style={{ color: "var(--color-navy)" }}>
              close
            </span>
          </button>
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
          <span style={sectionLabelStyle}>NAVEGACIÓN</span>
          {NAV_LINKS.map((link) => (
            <DrawerLinkRow key={link.label} link={link} onClose={onClose} />
          ))}

          <div style={{ margin: "20px 0" }} />

          <span style={sectionLabelStyle}>EMPRESA</span>
          {EMPRESA_LINKS.map((link) => (
            <DrawerLinkRow key={link.label} link={link} onClose={onClose} />
          ))}

          <div style={{ margin: "20px 0" }} />

          <span style={sectionLabelStyle}>LEGAL</span>
          {LEGAL_LINKS.map((link) => (
            <DrawerLinkRow key={link.label} link={link} onClose={onClose} />
          ))}
        </div>

        {/* Footer */}
        <div
          style={{
            borderTop: "1px solid var(--color-border)",
            padding: "20px 24px",
            display: "flex",
            flexDirection: "row",
            gap: "20px",
          }}
        >
          <a href="#" style={{ color: "var(--color-navy)", opacity: 0.6 }}>
            <InstagramIcon />
          </a>
          <a href="#" style={{ color: "var(--color-navy)", opacity: 0.6 }}>
            <WhatsAppIcon />
          </a>
        </div>
      </div>
    </>
  );
}
