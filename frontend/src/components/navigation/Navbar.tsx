"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { BlueButton } from "@/components/core/BlueButton";

interface NavbarProps {
  transparent?: boolean;
  static?: boolean;
}

const NAV_LINKS = [
  { label: "Destinos", href: "/destinos" },
  { label: "Estado del viaje", href: "/estado-viaje" },
  { label: "Mis reservas", href: "/mis-reservas" },
  { label: "Preguntas frecuentes", href: "/preguntas-frecuentes" },
];

const HamburgerIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </svg>
)

export function Navbar({ transparent = true, static: isStatic = false }: NavbarProps) {
  const router = useRouter();
  const pathname = usePathname();

  const handleCTAClick = () => {
    if (pathname === "/") {
      document.getElementById("buscar")?.scrollIntoView({ behavior: "smooth" });
    } else {
      router.push("/#buscar");
    }
  };

  const background = transparent
    ? "rgba(0,0,0,0.20)"
    : "var(--color-primary)";

  const backdropFilter = transparent ? "blur(16px)" : undefined;

  return (
    <nav
      className={`site-navbar${isStatic ? " site-navbar-static" : ""}`}
      style={{ background, backdropFilter, WebkitBackdropFilter: backdropFilter }}
    >
      {/* Logo — siempre visible */}
      <Link href="/" style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
        <Image
          src="/assets/logo-rioparana.png"
          alt="Expreso Río Paraná"
          height={40}
          width={160}
          className="navbar-logo"
          priority
        />
      </Link>

      {/* Nav links — solo desktop */}
      <div className="navbar-links">
        {NAV_LINKS.map((link) => (
          <Link
            key={link.label}
            href={link.href}
            style={{
              fontFamily: "var(--font-body)",
              fontWeight: 500,
              color: "var(--color-white)",
              textDecoration: "none",
            }}
            className="navbar-link"
          >
            {link.label}
          </Link>
        ))}
      </div>

      {/* Right side — CTA + hamburger */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <BlueButton variant="blue" onClick={handleCTAClick} className="navbar-cta">
          Comprar pasajes
        </BlueButton>

        <button className="navbar-hamburger">
          <HamburgerIcon />
        </button>
      </div>

    </nav>
  );
}
