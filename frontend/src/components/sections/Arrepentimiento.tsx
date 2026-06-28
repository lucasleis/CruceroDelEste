import { BodyText } from "@/components/core/BodyText"
import { BlueButton } from "@/components/core/BlueButton"

export function Arrepentimiento() {
  return (
    <section
      style={{
        width: "100%",
        background: "white",
        borderTop: "1px solid var(--color-border)",
        borderBottom: "1px solid var(--color-border)",
        paddingTop: "24px",
        paddingBottom: "24px",
        paddingLeft: "32px",
        paddingRight: "32px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "48px",
          maxWidth: "1280px",
          margin: "0 auto",
        }}
      >
        {/* Left — text block */}
        <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxWidth: "680px" }}>
          <BodyText color="navy" size="md" as="p">
            <span style={{ fontWeight: 600 }}>
              Podés cancelar tus compras* realizadas de forma online o telefónica dentro de un plazo máximo de 10 días desde la fecha que realizaste la compra.
            </span>
          </BodyText>
          <BodyText color="muted" size="sm">
            *Según Resolución 329/2020 ANAC no aplica para vuelos, se rigen por política de devolución informada en tu voucher
          </BodyText>
        </div>

        {/* Right — button */}
        <div style={{ flexShrink: 0 }}>
          <BlueButton variant="danger">Botón de arrepentimiento</BlueButton>
        </div>
      </div>
    </section>
  )
}
