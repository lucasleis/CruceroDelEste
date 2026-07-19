const features = [
  "ASIENTOS PREMIUM",
  "TOMAS DE CORRIENTE",
  "CLIMATIZACIÓN",
  "ENTRETENIMIENTO",
  "WIFI STARLINK",
  "SANITARIOS A BORDO",
]

export function FlotaSection() {
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
            width: "40%",
            flexShrink: 0,
            alignSelf: "center",
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
              marginTop: 0,
              textTransform: "uppercase",
            }}
          >
            NUESTRA FLOTA
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
              Diseñada para
            </span>
            <span style={{ display: "block", color: "var(--sn-color-secondary-container)" }}>
              el largo camino.
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
            Unidades modernas equipadas para que cada kilómetro sea cómodo.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "var(--sn-stack-md)",
            }}
          >
            {features.map((feature) => (
              <div
                key={feature}
                style={{
                  display: "flex",
                  flexDirection: "row",
                  gap: "8px",
                  alignItems: "center",
                }}
              >
                <span
                  style={{
                    width: "24px",
                    height: "2px",
                    background: "var(--sn-color-secondary-container)",
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontFamily: "var(--sn-font-sans)",
                    fontSize: "var(--sn-text-body-md-size)",
                    color: "var(--sn-color-on-surface)",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                  }}
                >
                  {feature}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            width: "60%",
            flexShrink: 0,
          }}
        >
          <img
            src="/assets/nosotros-page/flota-bus.png"
            alt="Flota Expreso Río Paraná"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "left center",
            }}
          />
        </div>
      </div>
    </section>
  )
}
