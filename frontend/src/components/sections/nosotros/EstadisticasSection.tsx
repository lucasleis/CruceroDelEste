const stats = [
  { number: "1982", suffix: null, label: "AÑO DE FUNDACIÓN" },
  { number: "+500K", suffix: null, label: "PASAJEROS" },
  { number: "1.032", suffix: " km", label: "RUTA PRINCIPAL" },
  { number: "3", suffix: " países", label: "COBERTURA" },
]

export function EstadisticasSection() {
  return (
    <section
      style={{
        background: "#f5f0eb",
        width: "100%",
      }}
    >
      <div
        style={{
          maxWidth: "var(--sn-container-max)",
          margin: "0 auto",
          padding: "var(--sn-section-gap) var(--sn-gutter)",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <p
            style={{
              fontFamily: "var(--sn-font-sans)",
              fontSize: "var(--sn-text-label-caps-size)",
              fontWeight: "var(--sn-text-label-caps-weight)",
              letterSpacing: "var(--sn-text-label-caps-letter-spacing)",
              color: "var(--sn-color-on-primary)",
              marginBottom: "var(--sn-stack-md)",
              marginTop: 0,
              textTransform: "uppercase",
            }}
          >
            EXPRESO EN NÚMEROS
          </p>

          <h2
            style={{
              fontFamily: "var(--sn-font-serif)",
              fontSize: "var(--sn-text-headline-lg-size)",
              fontWeight: "var(--sn-text-headline-lg-weight)",
              lineHeight: "var(--sn-text-headline-lg-line-height)",
              marginBottom: "var(--sn-stack-lg)",
              marginTop: 0,
            }}
          >
            <span style={{ display: "block", color: "var(--sn-color-on-primary)" }}>
              Décadas de viajes.
            </span>
            <span style={{ display: "block", color: "var(--sn-color-secondary-container)" }}>
              Números que hablan.
            </span>
          </h2>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "row",
            justifyContent: "space-between",
          }}
        >
          {stats.map((stat, index) => (
            <div
              key={stat.label}
              style={{
                paddingRight: index < stats.length - 1 ? "var(--sn-gutter)" : 0,
                borderRight:
                  index < stats.length - 1
                    ? "1px solid var(--sn-color-outline-variant)"
                    : "none",
              }}
            >
              <div
                style={{
                  fontFamily: "var(--sn-font-serif)",
                  fontSize: "var(--sn-text-stat-number-size)",
                  fontWeight: "var(--sn-text-stat-number-weight)",
                  lineHeight: "var(--sn-text-stat-number-line-height)",
                  color: "var(--sn-color-on-primary)",
                }}
              >
                {stat.number}
                {stat.suffix && <span style={{ fontSize: "28px" }}>{stat.suffix}</span>}
              </div>

              <div
                style={{
                  width: "32px",
                  height: "2px",
                  background: "var(--sn-color-secondary-container)",
                  marginTop: "var(--sn-stack-sm)",
                  marginBottom: "var(--sn-stack-sm)",
                }}
              />

              <p
                style={{
                  fontFamily: "var(--sn-font-sans)",
                  fontSize: "var(--sn-text-label-caps-size)",
                  fontWeight: "var(--sn-text-label-caps-weight)",
                  letterSpacing: "var(--sn-text-label-caps-letter-spacing)",
                  color: "var(--sn-color-on-primary)",
                  margin: 0,
                  textTransform: "uppercase",
                }}
              >
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
