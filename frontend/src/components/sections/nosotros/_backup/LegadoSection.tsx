export function LegadoSection() {
  return (
    <section
      style={{
        background: "var(--sn-color-background)",
        width: "100%",
      }}
    >
      <div
        style={{
          maxWidth: "var(--sn-container-max)",
          margin: "0 auto",
          padding: "var(--sn-section-gap) var(--sn-gutter)",
          display: "grid",
          gridTemplateColumns: "2fr 3fr",
          gap: "var(--sn-gutter)",
          alignItems: "start",
        }}
      >
        <div>
          <p
            style={{
              fontFamily: "var(--sn-font-sans)",
              fontSize: "var(--sn-text-label-caps-size)",
              fontWeight: "var(--sn-text-label-caps-weight)",
              letterSpacing: "var(--sn-text-label-caps-letter-spacing)",
              color: "var(--sn-color-outline)",
              marginBottom: "var(--sn-stack-md)",
              marginTop: 0,
              textTransform: "uppercase",
            }}
          >
            DESDE 1982
          </p>

          <h2
            style={{
              fontFamily: "var(--sn-font-serif)",
              fontSize: "var(--sn-text-headline-lg-size)",
              fontWeight: "var(--sn-text-headline-lg-weight)",
              lineHeight: "var(--sn-text-headline-lg-line-height)",
              color: "var(--sn-color-on-background)",
              margin: 0,
            }}
          >
            Un legado de confianza en el Mercosur.
          </h2>
        </div>

        <div>
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
            Expreso Río Paraná nace en 1982 con el compromiso de acortar distancias en el
            corazón de Sudamérica. Con más de cuatro décadas de historia, nos hemos
            consolidado como el puente confiable entre Argentina y Paraguay.
          </p>

          <p
            style={{
              fontFamily: "var(--sn-font-sans)",
              fontSize: "var(--sn-text-body-md-size)",
              lineHeight: "var(--sn-text-body-md-line-height)",
              color: "var(--sn-color-outline)",
              margin: 0,
            }}
          >
            Nuestra ruta principal conecta{" "}
            <strong style={{ color: "var(--sn-color-on-surface-variant)" }}>
              Asunción y Buenos Aires
            </strong>
            , pasando por puntos clave como Encarnación y Posadas. Con presencia en la
            Terminal de Ómnibus de Asunción (Boletería 54) y en Retiro, estamos siempre
            cerca de tu próximo destino.
          </p>
        </div>
      </div>
    </section>
  )
}
