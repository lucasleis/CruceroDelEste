import { BodyText } from "@/components/core/BodyText"
import { BlueButton } from "@/components/core/BlueButton"

export function Arrepentimiento() {
  return (
    <section
      style={{
        background: "white",
        borderTop: "1px solid var(--color-border)",
        borderBottom: "1px solid var(--color-border)",
        display: "flex",
        justifyContent: "center",
        padding: "clamp(16px, 2vw, 32px) clamp(16px, 4vw, 48px)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "clamp(16px, 3vw, 48px)",
          width: "clamp(500px, 85vw, 1100px)",
        }}
      >
        {/* Left — text block */}
        <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxWidth: "clamp(300px, 60%, 680px)" }}>
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
