const milestones = [
  {
    year: "1982",
    title: "Fundación",
    description:
      "Iniciamos operaciones con una flota de 5 unidades, uniendo por primera vez Buenos Aires con las provincias del litoral bajo la premisa de la puntualidad absoluta.",
    dotColor: "var(--sn-color-secondary-container)",
  },
  {
    year: "1995",
    title: "Expansión Federal",
    description:
      "Consolidación de rutas clave y renovación total de flota con tecnología alemana, introduciendo el concepto de servicio a bordo diferenciado.",
    dotColor: "var(--sn-color-primary)",
  },
  {
    year: "2010",
    title: "La Era Digital",
    description:
      "Primer sistema de tracking satelital en tiempo real disponible para el pasajero y digitalización completa de la venta de pasajes.",
    dotColor: "var(--sn-color-primary)",
  },
  {
    year: "Hoy",
    title: "Excelencia Sostenible",
    description:
      "Liderazgo en el segmento Premium con unidades Euro 5 y un compromiso inquebrantable con la seguridad vial y el confort.",
    dotColor: "var(--sn-color-secondary-container)",
  },
]

export function HistoriaSection() {
  return (
    <section
      style={{
        background: "var(--sn-color-surface-container-lowest)",
        width: "100%",
      }}
    >
      <div
        style={{
          maxWidth: "var(--sn-container-max)",
          margin: "0 auto",
          padding: "var(--sn-section-gap) var(--sn-gutter)",
          display: "grid",
          gridTemplateColumns: "5fr 7fr",
          gap: "var(--sn-gutter)",
          alignItems: "start",
        }}
      >
        <div
          style={{
            position: "sticky",
            top: "var(--sn-stack-lg)",
            display: "flex",
            flexDirection: "column",
            gap: "var(--sn-stack-lg)",
          }}
        >
          <h2
            style={{
              fontFamily: "var(--sn-font-serif)",
              fontSize: "var(--sn-text-headline-xl-size)",
              fontWeight: "var(--sn-text-headline-xl-weight)",
              lineHeight: "var(--sn-text-headline-xl-line-height)",
              letterSpacing: "var(--sn-text-headline-xl-letter-spacing)",
              color: "var(--sn-color-primary)",
              margin: 0,
            }}
          >
            Cuatro Décadas de Trayectoria
          </h2>

          <p
            style={{
              fontFamily: "var(--sn-font-sans)",
              fontSize: "var(--sn-text-body-lg-size)",
              lineHeight: "var(--sn-text-body-lg-line-height)",
              color: "var(--sn-color-on-surface-variant)",
              margin: 0,
            }}
          >
            Lo que comenzó como una visión familiar en las orillas del Paraná, se ha
            transformado en el estándar de oro del transporte terrestre argentino.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "var(--sn-gutter)",
              paddingTop: "var(--sn-stack-lg)",
              borderTop: "1px solid var(--sn-color-outline-variant)",
            }}
          >
            <div>
              <div
                style={{
                  fontFamily: "var(--sn-font-serif)",
                  fontSize: "var(--sn-text-stat-number-size)",
                  fontWeight: "var(--sn-text-stat-number-weight)",
                  lineHeight: "var(--sn-text-stat-number-line-height)",
                  color: "var(--sn-color-primary)",
                  marginBottom: "var(--sn-stack-sm)",
                }}
              >
                50+
              </div>
              <div
                style={{
                  fontFamily: "var(--sn-font-sans)",
                  fontSize: "var(--sn-text-label-caps-size)",
                  fontWeight: "var(--sn-text-label-caps-weight)",
                  letterSpacing: "var(--sn-text-label-caps-letter-spacing)",
                  color: "var(--sn-color-secondary-container)",
                  textTransform: "uppercase",
                }}
              >
                Años de Servicio
              </div>
            </div>

            <div>
              <div
                style={{
                  fontFamily: "var(--sn-font-serif)",
                  fontSize: "var(--sn-text-stat-number-size)",
                  fontWeight: "var(--sn-text-stat-number-weight)",
                  lineHeight: "var(--sn-text-stat-number-line-height)",
                  color: "var(--sn-color-primary)",
                  marginBottom: "var(--sn-stack-sm)",
                }}
              >
                1M+
              </div>
              <div
                style={{
                  fontFamily: "var(--sn-font-sans)",
                  fontSize: "var(--sn-text-label-caps-size)",
                  fontWeight: "var(--sn-text-label-caps-weight)",
                  letterSpacing: "var(--sn-text-label-caps-letter-spacing)",
                  color: "var(--sn-color-secondary-container)",
                  textTransform: "uppercase",
                }}
              >
                Pasajeros/Año
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--sn-section-gap)",
            paddingLeft: "var(--sn-gutter)",
            borderLeft: "1px solid var(--sn-color-outline-variant)",
          }}
        >
          {milestones.map((milestone) => (
            <div key={milestone.year} style={{ position: "relative" }}>
              <div
                style={{
                  position: "absolute",
                  left: "calc(var(--sn-gutter) * -1 - 10px)",
                  top: 0,
                  width: "20px",
                  height: "20px",
                  borderRadius: "var(--radius-pill, 999px)",
                  background: milestone.dotColor,
                  border: "4px solid var(--sn-color-surface-container-lowest)",
                }}
              />

              <span
                style={{
                  fontFamily: "var(--sn-font-sans)",
                  fontSize: "var(--sn-text-label-caps-size)",
                  fontWeight: "var(--sn-text-label-caps-weight)",
                  letterSpacing: "var(--sn-text-label-caps-letter-spacing)",
                  color: "var(--sn-color-secondary-container)",
                  display: "block",
                  marginBottom: "var(--sn-stack-sm)",
                  textTransform: "uppercase",
                }}
              >
                {milestone.year}
              </span>

              <h3
                style={{
                  fontFamily: "var(--sn-font-serif)",
                  fontSize: "var(--sn-text-headline-md-size)",
                  fontWeight: "var(--sn-text-headline-md-weight)",
                  lineHeight: "var(--sn-text-headline-md-line-height)",
                  color: "var(--sn-color-on-surface)",
                  margin: "0 0 var(--sn-stack-md) 0",
                }}
              >
                {milestone.title}
              </h3>

              <p
                style={{
                  fontFamily: "var(--sn-font-sans)",
                  fontSize: "var(--sn-text-body-lg-size)",
                  lineHeight: "var(--sn-text-body-lg-line-height)",
                  color: "var(--sn-color-on-surface-variant)",
                  margin: 0,
                }}
              >
                {milestone.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
