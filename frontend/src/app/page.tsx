import { Button } from "@/components/core/Button";
import { BlueButton } from "@/components/core/BlueButton";
import { NewsletterShowcase } from "@/components/core/NewsletterShowcase";
import { Heading } from "@/components/core/Heading";
import { Subheading } from "@/components/core/Subheading";
import { FeatureItem } from "@/components/core/FeatureItem";
import { Eyebrow } from "@/components/core/Eyebrow";
import { BodyText } from "@/components/core/BodyText";

const ShieldIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
);

const ClockIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
);

export default function TokenShowcase() {
  const colors = [
    { name: "primary", token: "--color-primary", label: "#132691" },
    { name: "accent", token: "--color-accent", label: "#e3000f" },
    { name: "aqua", token: "--color-aqua", label: "#a3dadf" },
    { name: "white", token: "--color-white", label: "#ffffff" },
    { name: "navy", token: "--color-navy", label: "#0a1656" },
    { name: "navy-dark", token: "--color-navy-dark", label: "#060d33" },
    { name: "surface", token: "--color-surface", label: "#f7f8fb" },
    { name: "border", token: "--color-border", label: "#e4e7ee" },
    { name: "text-primary", token: "--color-text-primary", label: "#0a1656" },
    { name: "text-body", token: "--color-text-body", label: "#374151" },
    { name: "text-muted", token: "--color-text-muted", label: "#6b7280" },
  ];

  const shadows = [
    { name: "xs", token: "--shadow-xs" },
    { name: "sm", token: "--shadow-sm" },
    { name: "md", token: "--shadow-md" },
    { name: "lg", token: "--shadow-lg" },
  ];

  const radii = [
    { name: "sm", token: "--radius-sm", label: "8px" },
    { name: "md", token: "--radius-md", label: "16px" },
    { name: "lg", token: "--radius-lg", label: "28px" },
    { name: "pill", token: "--radius-pill", label: "999px" },
  ];

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "var(--color-surface)",
        padding: "48px 32px",
        maxWidth: "960px",
        margin: "0 auto",
      }}
    >
      <h1
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 800,
          fontStyle: "italic",
          textTransform: "uppercase",
          fontSize: "48px",
          letterSpacing: "-0.02em",
          color: "var(--color-primary)",
          marginBottom: "8px",
        }}
      >
        Expreso Río Paraná
      </h1>
      <p
        style={{
          fontFamily: "var(--font-body)",
          fontSize: "16px",
          color: "var(--color-text-muted)",
          marginBottom: "64px",
        }}
      >
        Design System — Token Showcase
      </p>

      {/* Eyebrow + BodyText + accentDot showcase */}
      <section style={{ marginBottom: "64px" }}>
        <SectionTitle>Eyebrow · BodyText · accentDot</SectionTitle>

        <ShowcaseCard>
          {/* Eyebrow colors */}
          <RowLabel>Eyebrow — red, navy</RowLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <Eyebrow color="red">Sobre nosotros</Eyebrow>
            <Eyebrow color="navy">Sobre nosotros</Eyebrow>
          </div>

          {/* Eyebrow white on navy */}
          <RowLabel>Eyebrow — white</RowLabel>
          <div style={{ background: "var(--color-navy)", borderRadius: "var(--radius-sm)", padding: "16px 20px" }}>
            <Eyebrow color="white">Sobre nosotros</Eyebrow>
          </div>

          {/* BodyText sizes */}
          <RowLabel>BodyText — sizes (body)</RowLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <BodyText size="lg">Texto grande — Open Sans 400, 1.125rem</BodyText>
            <BodyText size="md">Texto mediano — Open Sans 400, 1rem</BodyText>
            <BodyText size="sm">Texto pequeño — Open Sans 400, 0.875rem</BodyText>
          </div>

          {/* BodyText colors */}
          <RowLabel>BodyText — navy, muted</RowLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <BodyText color="navy">Color navy — var(--color-navy)</BodyText>
            <BodyText color="muted">Color muted — var(--color-text-muted)</BodyText>
          </div>

          {/* BodyText white on navy */}
          <RowLabel>BodyText — white</RowLabel>
          <div style={{ background: "var(--color-navy)", borderRadius: "var(--radius-sm)", padding: "16px 20px" }}>
            <BodyText color="white">Color white — var(--color-white)</BodyText>
          </div>

          {/* Heading accentDot */}
          <RowLabel>Heading accentDot</RowLabel>
          <Heading size="lg" color="navy" accentDot>Conectamos destinos, acercamos personas</Heading>

          {/* Composed block */}
          <RowLabel>Composed block</RowLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px", maxWidth: "600px" }}>
            <Eyebrow>Sobre nosotros</Eyebrow>
            <Heading size="lg" color="navy" as="h2" accentDot>Conectamos destinos, acercamos personas</Heading>
            <hr style={{ border: "none", borderTop: "2px solid var(--color-aqua)", width: "40px", margin: 0 }} />
            <BodyText color="body">
              En Expreso Río Paraná llevamos más de 30 años conectando ciudades y acompañando historias. Trabajamos cada día para ofrecer un servicio seguro, confiable y cómodo, con la experiencia de siempre y la innovación que nos impulsa hacia el futuro.
            </BodyText>
          </div>
        </ShowcaseCard>
      </section>

      {/* Typography showcase */}
      <section style={{ marginBottom: "64px" }}>
        <SectionTitle>Typography</SectionTitle>

        {/* Heading — all sizes, white on navy */}
        <div
          style={{
            background: "var(--color-navy)",
            borderRadius: "var(--radius-md)",
            padding: "40px",
            display: "flex",
            flexDirection: "column",
            gap: "24px",
            marginBottom: "16px",
          }}
        >
          <RowLabel style={{ color: "rgba(255,255,255,0.4)" }}>Heading — accentColor aqua</RowLabel>
          <Heading size="xl" color="white" accentLine="acercamos destinos." accentColor="aqua">Conectamos personas,</Heading>

          <RowLabel style={{ color: "rgba(255,255,255,0.4)" }}>Heading — accentLine</RowLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <Heading size="xl" accentLine="Siempre juntos.">Tu destino, nuestra experiencia.</Heading>
            <BodyText color="white" size="sm">Te acercamos a lo que más importa. Viajes seguros, cómodos y confiables por todo el país.</BodyText>
          </div>

          <RowLabel style={{ color: "rgba(255,255,255,0.4)" }}>Heading — sizes (white)</RowLabel>
          <Heading size="xl">Viajá con Expreso Río Paraná</Heading>
          <Heading size="lg">Viajá con Expreso Río Paraná</Heading>
          <Heading size="md">Viajá con Expreso Río Paraná</Heading>
          <Heading size="sm">Viajá con Expreso Río Paraná</Heading>

          <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
            <RowLabel style={{ color: "rgba(255,255,255,0.4)" }}>Subheading — sizes (white)</RowLabel>
            <Subheading size="lg">Conectamos destinos a lo largo de la costa con comodidad y puntualidad.</Subheading>
            <Subheading size="md">Conectamos destinos a lo largo de la costa con comodidad y puntualidad.</Subheading>
            <Subheading size="sm">Conectamos destinos a lo largo de la costa con comodidad y puntualidad.</Subheading>
          </div>

          <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "24px", display: "flex", flexDirection: "column", gap: "12px" }}>
            <RowLabel style={{ color: "rgba(255,255,255,0.4)" }}>FeatureItem (white)</RowLabel>
            <FeatureItem icon={<ShieldIcon />}>Compra 100% segura</FeatureItem>
            <FeatureItem icon={<ClockIcon />}>Más de 60 años conectando destinos</FeatureItem>
          </div>
        </div>

        {/* Heading — color variants, on white */}
        <ShowcaseCard>
          <RowLabel>Heading — colors (navy, blue)</RowLabel>
          <Heading size="xl" color="navy">Viajá con Expreso Río Paraná</Heading>
          <Heading size="xl" color="blue">Viajá con Expreso Río Paraná</Heading>

          <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: "24px", display: "flex", flexDirection: "column", gap: "12px" }}>
            <RowLabel>Subheading — colors (navy, muted)</RowLabel>
            <Subheading color="navy">Conectamos destinos a lo largo de la costa con comodidad y puntualidad.</Subheading>
            <Subheading color="muted">Conectamos destinos a lo largo de la costa con comodidad y puntualidad.</Subheading>
          </div>
        </ShowcaseCard>
      </section>

      {/* Button showcase */}
      <section style={{ marginBottom: "64px" }}>
        <SectionTitle>Button</SectionTitle>
        <ShowcaseCard>
          <RowLabel>Variants</RowLabel>
          <Row>
            <Button variant="primary">Comprar pasaje</Button>
            <Button variant="secondary">Ver horarios</Button>
            <Button variant="ghost">Más información</Button>
          </Row>

          <RowLabel>Sizes — Primary</RowLabel>
          <Row>
            <Button size="sm">Pequeño</Button>
            <Button size="md">Mediano</Button>
            <Button size="lg">Grande</Button>
          </Row>

          <RowLabel>Disabled</RowLabel>
          <Row>
            <Button variant="primary" disabled>Comprar pasaje</Button>
            <Button variant="secondary" disabled>Ver horarios</Button>
            <Button variant="ghost" disabled>Más información</Button>
          </Row>
        </ShowcaseCard>
      </section>

      {/* BlueButton showcase */}
      <section style={{ marginBottom: "64px" }}>
        <SectionTitle>BlueButton</SectionTitle>
        <ShowcaseCard>
          <RowLabel>Blue variant</RowLabel>
          <Row>
            <BlueButton>Comprar pasajes</BlueButton>
            <BlueButton disabled>Comprar pasajes</BlueButton>
            <BlueButton icon="bus">Desde Concordia</BlueButton>
          </Row>

          <RowLabel>Navy variant</RowLabel>
          <Row>
            <BlueButton variant="navy">Ver destinos</BlueButton>
            <BlueButton variant="navy" arrow>Ver todos los destinos</BlueButton>
          </Row>

          <RowLabel>Danger variant</RowLabel>
          <Row>
            <BlueButton variant="danger">Botón de arrepentimiento</BlueButton>
          </Row>
        </ShowcaseCard>
      </section>

      {/* NewsletterInput showcase */}
      <section style={{ marginBottom: "64px" }}>
        <SectionTitle>NewsletterInput</SectionTitle>
        <NewsletterShowcase />
      </section>

      {/* Color palette */}
      <section style={{ marginBottom: "64px" }}>
        <SectionTitle>Color Palette</SectionTitle>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
          {colors.map((c) => (
            <div key={c.name} style={{ width: "136px" }}>
              <div
                style={{
                  background: `var(${c.token})`,
                  height: "72px",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--color-border)",
                  marginBottom: "8px",
                }}
              />
              <p
                style={{
                  fontFamily: "var(--font-body)",
                  fontWeight: 600,
                  fontSize: "12px",
                  color: "var(--color-text-primary)",
                  marginBottom: "2px",
                }}
              >
                {c.name}
              </p>
              <p
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: "11px",
                  color: "var(--color-text-muted)",
                }}
              >
                {c.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Type specimen */}
      <section style={{ marginBottom: "64px" }}>
        <SectionTitle>Typography</SectionTitle>
        <ShowcaseCard>
          <p
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "11px",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: "var(--color-text-muted)",
              marginBottom: "8px",
            }}
          >
            Display — Saira Semi Condensed 800 Italic Uppercase
          </p>
          <p
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 800,
              fontStyle: "italic",
              textTransform: "uppercase",
              fontSize: "40px",
              lineHeight: 1.1,
              color: "var(--color-primary)",
              marginBottom: "32px",
            }}
          >
            Viajá con nosotros
          </p>
          <p
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "11px",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: "var(--color-text-muted)",
              marginBottom: "8px",
            }}
          >
            Body — Open Sans 400
          </p>
          <p
            style={{
              fontFamily: "var(--font-body)",
              fontWeight: 400,
              fontSize: "16px",
              lineHeight: 1.7,
              color: "var(--color-text-body)",
              maxWidth: "560px",
            }}
          >
            Expreso Río Paraná conecta destinos a lo largo de la costa con comodidad, puntualidad y seguridad. Nuestros servicios están diseñados para ofrecerte la mejor experiencia de viaje.
          </p>
        </ShowcaseCard>
      </section>

      {/* Shadow scale */}
      <section style={{ marginBottom: "64px" }}>
        <SectionTitle>Shadow Scale</SectionTitle>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "24px" }}>
          {shadows.map((s) => (
            <div
              key={s.name}
              style={{
                background: "var(--color-white)",
                borderRadius: "var(--radius-md)",
                boxShadow: `var(${s.token})`,
                padding: "24px 32px",
                minWidth: "160px",
              }}
            >
              <p
                style={{
                  fontFamily: "var(--font-body)",
                  fontWeight: 600,
                  fontSize: "13px",
                  color: "var(--color-text-primary)",
                  marginBottom: "4px",
                }}
              >
                shadow-{s.name}
              </p>
              <p
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: "11px",
                  color: "var(--color-text-muted)",
                }}
              >
                {`var(${s.token})`}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Radius scale */}
      <section>
        <SectionTitle>Border Radius</SectionTitle>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", alignItems: "flex-end" }}>
          {radii.map((r) => (
            <div key={r.name} style={{ textAlign: "center" }}>
              <div
                style={{
                  background: "var(--color-primary)",
                  width: "96px",
                  height: "96px",
                  borderRadius: `var(${r.token})`,
                  marginBottom: "10px",
                }}
              />
              <p
                style={{
                  fontFamily: "var(--font-body)",
                  fontWeight: 600,
                  fontSize: "12px",
                  color: "var(--color-text-primary)",
                }}
              >
                radius-{r.name}
              </p>
              <p
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: "11px",
                  color: "var(--color-text-muted)",
                }}
              >
                {r.label}
              </p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2
      style={{
        fontFamily: "var(--font-display)",
        fontWeight: 700,
        fontStyle: "italic",
        textTransform: "uppercase",
        fontSize: "20px",
        letterSpacing: "0.06em",
        color: "var(--color-primary)",
        marginBottom: "20px",
        borderBottom: "1px solid var(--color-border)",
        paddingBottom: "10px",
      }}
    >
      {children}
    </h2>
  );
}

function ShowcaseCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: "var(--color-white)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-md)",
        padding: "32px",
        display: "flex",
        flexDirection: "column",
        gap: "24px",
      }}
    >
      {children}
    </div>
  );
}

function RowLabel({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <p
      style={{
        fontFamily: "var(--font-body)",
        fontSize: "11px",
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "0.1em",
        color: "var(--color-text-muted)",
        marginBottom: "-12px",
        ...style,
      }}
    >
      {children}
    </p>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", alignItems: "center" }}>
      {children}
    </div>
  );
}
