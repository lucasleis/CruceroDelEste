const stops = [
  "BUENOS AIRES — RETIRO",
  "POSADAS, MISIONES",
  "ENCARNACIÓN, PARAGUAY",
  "ASUNCIÓN — TERMINAL TOA",
]

export function RutasSection() {
  return (
    <section
      style={{
        background: "var(--sn-color-primary-container)",
        width: "100%",
      }}
    >
      <div
        style={{
          display: "flex",
          width: "100%",
        }}
      >
        <div
          style={{
            width: "55%",
            flexShrink: 0,
          }}
        >
          <img
            src="/assets/nosotros-page/mapa-rutas.png"
            alt="Mapa de rutas Expreso Río Paraná"
            style={{
              width: "100%",
              height: "100%",
              minHeight: "400px",
              objectFit: "cover",
              objectPosition: "center",
              display: "block",
            }}
          />
        </div>

        <div
          style={{
            width: "45%",
            flexShrink: 0,
            alignSelf: "center",
            paddingTop: "var(--sn-section-gap)",
            paddingBottom: "var(--sn-section-gap)",
            paddingLeft: "var(--sn-gutter)",
            paddingRight: "max(var(--sn-gutter), calc((100vw - var(--sn-container-max)) / 2))",
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
              marginTop: 0,
              textTransform: "uppercase",
            }}
          >
            NUESTRAS RUTAS
          </p>

          <h2
            style={{
              fontFamily: "var(--sn-font-serif)",
              fontSize: "var(--sn-text-headline-lg-size)",
              fontWeight: "var(--sn-text-headline-lg-weight)",
              lineHeight: "var(--sn-text-headline-lg-line-height)",
              marginBottom: "var(--sn-stack-md)",
              marginTop: 0,
            }}
          >
            <span style={{ display: "block", color: "var(--sn-color-on-surface)" }}>
              De Buenos Aires
            </span>
            <span style={{ display: "block", color: "var(--sn-color-secondary-container)" }}>
              a Asunción.
            </span>
          </h2>

          <p
            style={{
              fontFamily: "var(--sn-font-sans)",
              fontSize: "var(--sn-text-body-lg-size)",
              lineHeight: "var(--sn-text-body-lg-line-height)",
              color: "var(--sn-color-on-surface-variant)",
              marginBottom: "var(--sn-stack-lg)",
              marginTop: 0,
            }}
          >
            Más de 1.000 km con la seguridad y puntualidad que nos caracterizan.
          </p>

          <div>
            {stops.map((stop, index) => (
              <div
                key={stop}
                style={{
                  display: "flex",
                  flexDirection: "row",
                  gap: "12px",
                  alignItems: "center",
                  marginBottom: index < stops.length - 1 ? "var(--sn-stack-sm)" : 0,
                }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="var(--sn-color-secondary-container)"
                  strokeWidth="1.5"
                >
                  <circle cx="8" cy="8" r="6" />
                </svg>
                <span
                  style={{
                    fontFamily: "var(--sn-font-sans)",
                    fontSize: "var(--sn-text-body-md-size)",
                    color: "var(--sn-color-on-surface)",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                  }}
                >
                  {stop}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
