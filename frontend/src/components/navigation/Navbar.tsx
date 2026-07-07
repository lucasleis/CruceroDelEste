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
  { label: "Destinos", href: "/#destinos" },
  { label: "Estado del viaje", href: "/estado-viaje" },
  { label: "Mis reservas", href: "/mis-reservas" },
  { label: "Preguntas frecuentes", href: "/preguntas-frecuentes" },
];

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
      style={{
        position: isStatic ? "relative" : "fixed",
        top: isStatic ? undefined : "16px",
        left: isStatic ? undefined : "50%",
        transform: isStatic ? undefined : "translateX(-50%)",
        width: "90%",
        maxWidth: "1280px",
        zIndex: 50,
        height: "clamp(52px, 6vw, 72px)",
        padding: "0 clamp(16px, 3vw, 40px)",
        borderRadius: "var(--radius-md)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background,
        backdropFilter,
        WebkitBackdropFilter: backdropFilter,
      }}
    >
      <Link href="/" style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
        <Image
          src="/assets/logo-rioparana.png"
          alt="Expreso Río Paraná"
          height={40}
          width={160}
          style={{ width: "auto", height: "clamp(28px, 3vw, 40px)" }}
          priority
        />
      </Link>

      <div style={{ display: "flex", alignItems: "center", gap: "clamp(16px, 2.5vw, 40px)" }}>
        {NAV_LINKS.map((link) => (
          <Link
            key={link.label}
            href={link.href}
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "clamp(12px, 1.2vw, 15px)",
              fontWeight: 500,
              color: "#000000",
              textDecoration: "none",
            }}
            className="navbar-link"
          >
            {link.label}
          </Link>
        ))}
      </div>

      <BlueButton variant="blue" onClick={handleCTAClick}>
        Comprar pasajes
      </BlueButton>

      <style>{`
        .navbar-link:hover {
          text-decoration: underline;
          text-underline-offset: 4px;
        }
      `}</style>
    </nav>
  );
}
