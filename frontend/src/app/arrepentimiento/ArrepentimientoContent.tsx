"use client";

import { FormEvent, useState } from "react";
import { Heading } from "@/components/core/Heading";
import { BodyText } from "@/components/core/BodyText";
import { BlueButton } from "@/components/core/BlueButton";

type ResultState =
  | { kind: "idle" }
  | { kind: "success"; refundRequestId: string }
  | { kind: "window_expired"; refundRequestId: string }
  | { kind: "email_not_found" }
  | { kind: "not_found" }
  | { kind: "not_refundable" }
  | { kind: "rate_limited" }
  | { kind: "error" };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const inputStyle: React.CSSProperties = {
  fontFamily: "var(--font-body)",
  fontSize: "1rem",
  padding: "12px 16px",
  borderRadius: "var(--radius-sm)",
  border: "1px solid var(--color-border)",
  color: "var(--color-text-primary)",
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  fontFamily: "var(--font-body)",
  fontSize: "0.875rem",
  fontWeight: 600,
  color: "var(--color-text-primary)",
};

function ResultBanner({ result }: { result: ResultState }) {
  if (result.kind === "idle") return null;

  const config: Record<Exclude<ResultState["kind"], "idle">, { bg: string; border: string; title: string; body: string }> = {
    success: {
      bg: "#f0fdf4",
      border: "#86efac",
      title: "Solicitud de cancelación confirmada",
      body: "Tu reembolso fue procesado. Vas a recibir un email de confirmación en las próximas horas.",
    },
    window_expired: {
      bg: "var(--color-surface)",
      border: "var(--color-border)",
      title: "Fuera del plazo legal",
      body: "Tu solicitud quedó registrada, pero la compra ya no está dentro del plazo de 10 días o faltan menos de 24 horas para la salida. Contactate con nuestra administración para evaluar tu caso.",
    },
    email_not_found: {
      bg: "#fef2f2",
      border: "#fecaca",
      title: "El email no coincide",
      body: "El email ingresado no corresponde a esta reserva. Verificá que sea el mismo con el que compraste o el de alguno de los pasajeros.",
    },
    not_found: {
      bg: "#fef2f2",
      border: "#fecaca",
      title: "Reserva no encontrada",
      body: "No encontramos ninguna reserva con ese número. Verificá que esté copiado correctamente.",
    },
    not_refundable: {
      bg: "#fef2f2",
      border: "#fecaca",
      title: "Esta reserva no puede cancelarse",
      body: "Esta reserva no está en un estado que permita solicitar un reembolso (ya fue cancelada, reembolsada o no está confirmada).",
    },
    rate_limited: {
      bg: "#fef2f2",
      border: "#fecaca",
      title: "Demasiados intentos",
      body: "Esperá unos minutos antes de volver a intentarlo.",
    },
    error: {
      bg: "#fef2f2",
      border: "#fecaca",
      title: "Ocurrió un error",
      body: "No pudimos procesar tu solicitud en este momento. Intentá nuevamente en unos minutos.",
    },
  };

  const { bg, border, title, body } = config[result.kind];
  const refundId = "refundRequestId" in result ? result.refundRequestId : null;

  return (
    <div
      style={{
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: "var(--radius-md)",
        padding: "20px 24px",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
      }}
    >
      <BodyText color="navy" size="md">
        <span style={{ fontWeight: 700 }}>{title}</span>
      </BodyText>
      <BodyText color="body" size="sm">
        {body}
      </BodyText>
      {refundId && (
        <BodyText color="muted" size="sm">
          Número de trámite: {refundId}
        </BodyText>
      )}
    </div>
  );
}

export function ArrepentimientoContent() {
  const [bookingId, setBookingId] = useState("");
  const [email, setEmail] = useState("");
  const [result, setResult] = useState<ResultState>({ kind: "idle" });
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);

    const trimmedId = bookingId.trim();
    const trimmedEmail = email.trim();

    if (!UUID_RE.test(trimmedId)) {
      setFormError("El número de reserva no tiene un formato válido.");
      return;
    }
    if (!trimmedEmail) {
      setFormError("Ingresá el email con el que realizaste la compra.");
      return;
    }

    setLoading(true);
    setResult({ kind: "idle" });

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/bookings/${trimmedId}/refund-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail }),
      });

      if (res.status === 201) {
        const data = await res.json();
        setResult({ kind: "success", refundRequestId: data.id });
        return;
      }

      if (res.status === 404) {
        setResult({ kind: "not_found" });
        return;
      }

      if (res.status === 409) {
        setResult({ kind: "not_refundable" });
        return;
      }

      if (res.status === 429) {
        setResult({ kind: "rate_limited" });
        return;
      }

      if (res.status === 422) {
        const data = await res.json();
        if (data.detail === "refund_window_expired") {
          setResult({ kind: "window_expired", refundRequestId: data.refund_request_id });
          return;
        }
        if (data.detail === "email_not_found") {
          setResult({ kind: "email_not_found" });
          return;
        }
      }

      setResult({ kind: "error" });
    } catch (error) {
      console.error("[ArrepentimientoContent] fetch error:", error);
      setResult({ kind: "error" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        maxWidth: "640px",
        margin: "0 auto",
        padding: "clamp(32px, 6vw, 64px) clamp(16px, 4vw, 24px)",
        display: "flex",
        flexDirection: "column",
        gap: "32px",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <Heading as="h1" size="md" color="navy">
          Botón de arrepentimiento
        </Heading>
        <BodyText color="body" size="md">
          Según la Resolución 424/2020 de la Secretaría de Comercio Interior, tenés derecho a cancelar tu compra
          y solicitar el reembolso total dentro del plazo legal.
        </BodyText>
      </div>

      <div
        style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-md)",
          padding: "20px 24px",
        }}
      >
        <BodyText color="navy" size="sm">
          <span style={{ fontWeight: 700 }}>Plazo legal aplicable: </span>
          hasta 24 horas antes de la salida del viaje o dentro de los 10 días desde la fecha de compra,
          lo que ocurra primero. Ambas condiciones deben cumplirse para que la cancelación sea procedente.
        </BodyText>
      </div>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <label htmlFor="bookingId" style={labelStyle}>
            Número de reserva
          </label>
          <input
            id="bookingId"
            type="text"
            value={bookingId}
            onChange={(e) => setBookingId(e.target.value)}
            placeholder="Ej: 3a547502-c723-4bbb-a05d-b4165f836768"
            style={inputStyle}
            required
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <label htmlFor="email" style={labelStyle}>
            Email de la compra
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@email.com"
            style={inputStyle}
            required
          />
        </div>

        {formError && (
          <BodyText color="body" size="sm">
            <span style={{ color: "var(--color-accent)", fontWeight: 600 }}>{formError}</span>
          </BodyText>
        )}

        <BlueButton type="submit" variant="danger" disabled={loading} style={{ width: "100%" }}>
          {loading ? "Enviando..." : "Solicitar cancelación"}
        </BlueButton>
      </form>

      <ResultBanner result={result} />
    </div>
  );
}
