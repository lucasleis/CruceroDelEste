const items = [
  { title: "SEMI CAMA", subtitle: "Primeros en la ruta" },
  { title: "CAMA 180°", subtitle: "Primeros en la ruta" },
  { title: "STARLINK", subtitle: "Primeros en la ruta" },
]

export function PionerosSection() {
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
          display: "flex",
        }}
      >
        <div style={{ width: "55%" }}>
          <p
            style={{
              fontFamily: "var(--sn-font-sans)",
              fontSize: "var(--sn-text-label-caps-size)",
              fontWeight: "var(--sn-text-label-caps-weight)",
              letterSpacing: "var(--sn-text-label-caps-letter-spacing)",
              color: "var(--sn-color-on-primary)",
              marginBottom: "var(--sn-stack-md)",
              textTransform: "uppercase",
            }}
          >
            Pioneros en la ruta
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
              Siempre un paso
            </span>
            <span style={{ display: "block", color: "var(--sn-color-secondary-container)" }}>
              adelante.
            </span>
          </h2>

          <p
            style={{
              fontFamily: "var(--sn-font-sans)",
              fontSize: "var(--sn-text-body-lg-size)",
              lineHeight: "var(--sn-text-body-lg-line-height)",
              color: "var(--sn-color-on-primary)",
              maxWidth: "400px",
            }}
          >
            No solo conectamos destinos — redefinimos cómo se viaja.
          </p>
        </div>

        <div
          style={{
            width: "1px",
            alignSelf: "stretch",
            background: "var(--sn-color-secondary-container)",
          }}
        />

        <div
          style={{
            width: "45%",
            alignSelf: "center",
            paddingLeft: "var(--sn-gutter)",
            display: "flex",
            flexDirection: "column",
            gap: "var(--sn-stack-lg)",
          }}
        >
          {items.map((item) => (
            <div key={item.title}>
              <div
                style={{
                  width: "40px",
                  height: "2px",
                  background: "var(--sn-color-secondary-container)",
                  marginBottom: "var(--sn-stack-sm)",
                }}
              />
              <p
                style={{
                  fontFamily: "var(--sn-font-sans)",
                  fontSize: "var(--sn-text-headline-md-size)",
                  fontWeight: "var(--sn-text-label-caps-weight)",
                  letterSpacing: "normal",
                  color: "var(--sn-color-on-primary)",
                  marginBottom: "4px",
                  marginTop: 0,
                }}
              >
                {item.title}
              </p>
              <p
                style={{
                  fontFamily: "var(--sn-font-sans)",
                  fontSize: "var(--sn-text-body-lg-size)",
                  color: "var(--sn-color-outline)",
                  margin: 0,
                }}
              >
                {item.subtitle}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
