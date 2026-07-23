export function HeroNosotros() {
  return (
    <section
      style={{
        background: "var(--sn-color-primary-container)",
        width: "100%",
        minHeight: "520px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Decorativo: mapa de fondo */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/assets/nosotros-page/fondo-mapa-nos.png"
        alt=""
        style={{
          position: "absolute",
          top: 0,
          left: "30%",
          width: "70%",
          height: "100%",
          objectFit: "cover",
          objectPosition: "left center",
          opacity: 0.15,
          zIndex: 0,
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          alignItems: "stretch",
          width: "100%",
        }}
      >
        <div
          style={{
            width: "48%",
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            paddingTop: "var(--sn-section-gap)",
            paddingBottom: "var(--sn-section-gap)",
            paddingLeft: "max(var(--sn-gutter), calc((100vw - var(--sn-container-max)) / 2))",
            paddingRight: "var(--sn-gutter)",
          }}
        >
          <p
            style={{
              fontFamily: "var(--sn-font-sans)",
              fontSize: "var(--sn-text-label-caps-size)",
              fontWeight: "var(--sn-text-label-caps-weight)",
              letterSpacing: "var(--sn-text-label-caps-letter-spacing)",
              color: "var(--sn-color-on-surface-variant)",
              marginBottom: "var(--sn-stack-md)",
              textTransform: "uppercase",
            }}
          >
            Quiénes somos
          </p>

          <h1
            style={{
              fontFamily: "var(--sn-font-serif), 'Georgia', serif",
              fontSize: "clamp(var(--sn-text-headline-xl-size), 5.5vw, 48px)",
              fontWeight: "var(--sn-text-headline-xl-weight)",
              lineHeight: "var(--sn-text-headline-xl-line-height)",
              letterSpacing: "var(--sn-text-headline-xl-letter-spacing)",
              marginBottom: "var(--sn-stack-lg)",
              marginTop: 0,
            }}
          >
            <span style={{ display: "block", color: "var(--sn-color-on-surface)", whiteSpace: "nowrap" }}>
              Más de 60 años
            </span>
            <span style={{ display: "block", color: "var(--sn-color-secondary-container)", whiteSpace: "nowrap" }}>
              conectando destinos.
            </span>
          </h1>

          <p
            style={{
              fontFamily: "var(--sn-font-sans)",
              fontSize: "var(--sn-text-body-lg-size)",
              lineHeight: "var(--sn-text-body-lg-line-height)",
              color: "var(--sn-color-on-surface-variant)",
              maxWidth: "480px",
              marginBottom: "var(--sn-stack-lg)",
            }}
          >
            Una empresa argentina con décadas de trayectoria uniendo Argentina y
            Paraguay con seguridad y compromiso.
          </p>

          <ul
            style={{
              listStyle: "none",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
              margin: 0,
              padding: 0,
            }}
          >
            <li style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--sn-color-on-surface)"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 3l7 3v6c0 4.5-3 8.25-7 9-4-0.75-7-4.5-7-9V6l7-3z" />
                <path d="M9 12l2 2 4-4" />
              </svg>
              <span
                style={{
                  fontFamily: "var(--sn-font-sans)",
                  fontSize: "var(--sn-text-body-md-size)",
                  color: "var(--sn-color-on-surface)",
                }}
              >
                Empresa habilitada y regulada
              </span>
            </li>
            <li style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--sn-color-on-surface)"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 21s-7-6.5-7-11.5A7 7 0 0 1 19 9.5C19 14.5 12 21 12 21z" />
                <circle cx="12" cy="9.5" r="2.5" />
              </svg>
              <span
                style={{
                  fontFamily: "var(--sn-font-sans)",
                  fontSize: "var(--sn-text-body-md-size)",
                  color: "var(--sn-color-on-surface)",
                }}
              >
                Rutas Argentina · Paraguay
              </span>
            </li>
          </ul>
        </div>

        <div
          style={{
            width: "52%",
            flexShrink: 0,
            position: "relative",
            overflow: "visible",
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "flex-end",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/nosotros-page/bus.png"
            alt="Colectivo Expreso Río Paraná"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "right bottom",
              display: "block",
            }}
          />
        </div>
      </div>
    </section>
  )
}
