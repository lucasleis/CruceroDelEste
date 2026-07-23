export function CtaFinalSection() {
  return (
    <section
      style={{
        background: "var(--sn-color-primary-container)",
        width: "100%",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          maxWidth: "var(--sn-container-max)",
          margin: "0 auto",
          padding: "var(--sn-section-gap) var(--sn-gutter)",
          position: "relative",
          zIndex: 1,
        }}
      >
        <div
          style={{
            maxWidth: "700px",
            display: "flex",
            flexDirection: "column",
            gap: "var(--sn-stack-lg)",
          }}
        >
          <div>
            <h2
              style={{
                fontFamily: "var(--sn-font-serif)",
                fontSize: "var(--sn-text-headline-xl-size)",
                fontWeight: "var(--sn-text-headline-xl-weight)",
                lineHeight: "var(--sn-text-headline-xl-line-height)",
                letterSpacing: "var(--sn-text-headline-xl-letter-spacing)",
                margin: 0,
              }}
            >
              <span style={{ display: "block", color: "var(--sn-color-on-background)" }}>
                TU PRÓXIMO CAPÍTULO
              </span>
              <span style={{ display: "block", color: "var(--sn-color-secondary-container)" }}>
                COMIENZA EN RUTA.
              </span>
            </h2>

            <div
              style={{
                width: "128px",
                height: "4px",
                background: "var(--sn-color-secondary-container)",
                marginTop: "var(--sn-stack-md)",
              }}
            />
          </div>

          <p
            style={{
              fontFamily: "var(--sn-font-sans)",
              fontSize: "var(--sn-text-body-lg-size)",
              lineHeight: "var(--sn-text-body-lg-line-height)",
              color: "var(--sn-color-on-surface-variant)",
              margin: 0,
            }}
          >
            Asegurá tu lugar en nuestra flota de vanguardia. Experiencia, seguridad y
            confort en cada kilómetro que recorremos juntos.
          </p>

          <div
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              gap: "var(--sn-gutter)",
            }}
          >
            <button
              style={{
                background: "var(--sn-color-secondary-container)",
                color: "var(--sn-color-on-background)",
                fontFamily: "var(--sn-font-serif)",
                fontSize: "var(--sn-text-headline-md-size)",
                fontWeight: "var(--sn-text-headline-md-weight)",
                padding: "var(--sn-stack-md) var(--sn-stack-lg)",
                border: "none",
                cursor: "pointer",
              }}
            >
              RESERVAR AHORA
            </button>

            <span
              style={{
                fontFamily: "var(--sn-font-sans)",
                fontSize: "var(--sn-text-label-caps-size)",
                fontWeight: "var(--sn-text-label-caps-weight)",
                letterSpacing: "var(--sn-text-label-caps-letter-spacing)",
                color: "var(--sn-color-outline)",
                textTransform: "uppercase",
              }}
            >
              Aceptamos todos los medios de pago
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
