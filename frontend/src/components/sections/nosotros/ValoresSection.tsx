const iconProps = {
  width: 40,
  height: 40,
  viewBox: "0 0 40 40",
  fill: "none",
  stroke: "var(--sn-color-on-surface)",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
}

const values = [
  {
    title: "SEGURIDAD",
    description: "Tu tranquilidad es nuestra prioridad.",
    icon: (
      <svg {...iconProps}>
        <path d="M20 5l12 5v9c0 8-5.5 14-12 16-6.5-2-12-8-12-16v-9l12-5z" />
        <path d="M14.5 20l4 4 7-7.5" />
      </svg>
    ),
  },
  {
    title: "PUNTUALIDAD",
    description: "Cumplimos el tiempo que te prometemos.",
    icon: (
      <svg {...iconProps}>
        <circle cx="20" cy="20" r="14" />
        <path d="M20 12v8l6 4" />
      </svg>
    ),
  },
  {
    title: "COMPROMISO",
    description: "Hacemos lo que decimos, siempre.",
    icon: (
      <svg {...iconProps}>
        <path d="M5 20l6-4 4 2 4-2 6 4" />
        <path d="M15 18l-3-5 3-3 5 2 5-2 3 3-3 5" />
        <path d="M17 15l3 3 3-3" />
      </svg>
    ),
  },
  {
    title: "INNOVACIÓN",
    description: "Evolucionamos para ofrecerte lo mejor.",
    icon: (
      <svg {...iconProps}>
        <path d="M20 6a9 9 0 0 0-5 16.5c1 0.7 1.5 1.5 1.5 2.5v1h7v-1c0-1 0.5-1.8 1.5-2.5A9 9 0 0 0 20 6z" />
        <path d="M17 30h6" />
        <path d="M17.5 33h5" />
      </svg>
    ),
  },
  {
    title: "CONECTIVIDAD",
    description: "Unimos personas, acercamos mundos.",
    icon: (
      <svg {...iconProps}>
        <circle cx="20" cy="20" r="14" />
        <ellipse cx="20" cy="20" rx="6" ry="14" />
        <path d="M6 20h28" />
        <path d="M8.5 13h23" />
        <path d="M8.5 27h23" />
      </svg>
    ),
  },
]

export function ValoresSection() {
  return (
    <section
      style={{
        background: "var(--sn-color-primary-container)",
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
        <div
          style={{
            width: "65%",
            display: "flex",
            flexDirection: "row",
            gap: "12px",
          }}
        >
          {values.map((value, index) => (
            <div
              key={value.title}
              style={{
                borderRight:
                  index < values.length - 1
                    ? "1px solid var(--sn-color-outline-variant)"
                    : "none",
                paddingRight: index < values.length - 1 ? "16px" : 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
              }}
            >
              {value.icon}
              <p
                style={{
                  fontFamily: "var(--sn-font-sans)",
                  fontSize: "var(--sn-text-label-caps-size)",
                  fontWeight: "var(--sn-text-label-caps-weight)",
                  letterSpacing: "var(--sn-text-label-caps-letter-spacing)",
                  color: "var(--sn-color-on-surface)",
                  marginTop: "var(--sn-stack-md)",
                  marginBottom: 0,
                  textTransform: "uppercase",
                }}
              >
                {value.title}
              </p>
              <p
                style={{
                  fontFamily: "var(--sn-font-sans)",
                  fontSize: "13px",
                  lineHeight: "var(--sn-text-body-md-line-height)",
                  color: "var(--sn-color-on-surface-variant)",
                  marginTop: "var(--sn-stack-sm)",
                  marginBottom: 0,
                }}
              >
                {value.description}
              </p>
            </div>
          ))}
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
            width: "35%",
            paddingLeft: "var(--sn-gutter)",
            alignSelf: "center",
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
            Lo que nos define
          </p>

          <h2
            style={{
              fontFamily: "var(--sn-font-serif)",
              fontSize: "var(--sn-text-headline-md-size)",
              fontWeight: "var(--sn-text-headline-md-weight)",
              lineHeight: "var(--sn-text-headline-md-line-height)",
              marginBottom: "var(--sn-stack-md)",
              marginTop: 0,
            }}
          >
            <span style={{ display: "block", color: "var(--sn-color-on-surface)" }}>
              Más que transporte.
            </span>
            <span style={{ display: "block", color: "var(--sn-color-secondary-container)" }}>
              Un compromiso.
            </span>
          </h2>

          <p
            style={{
              fontFamily: "var(--sn-font-sans)",
              fontSize: "var(--sn-text-body-md-size)",
              lineHeight: "var(--sn-text-body-md-line-height)",
              color: "var(--sn-color-on-surface-variant)",
              margin: 0,
            }}
          >
            Desde 1982, estos valores guían cada decisión, cada ruta y cada
            pasajero.
          </p>
        </div>
      </div>
    </section>
  )
}
