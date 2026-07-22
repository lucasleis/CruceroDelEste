"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { BlueButton } from "@/components/core/BlueButton";

interface PassengerForm {
  nombres: string;
  apellidos: string;
  dni: string;
  email: string;
  telefono: string;
}

type PassengerErrors = Partial<Record<keyof PassengerForm, string>>;

const EMPTY_PASSENGER: PassengerForm = {
  nombres: "",
  apellidos: "",
  dni: "",
  email: "",
  telefono: "",
};

const FIELD_LABELS: Record<keyof PassengerForm, string> = {
  nombres: "Nombres",
  apellidos: "Apellidos",
  dni: "DNI",
  email: "Email",
  telefono: "Teléfono",
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const DNI_REGEX = /^\d{6,9}$/;
const PHONE_REGEX = /^\+?\d{8,15}$/;

function validatePassenger(
  passenger: PassengerForm,
  index: number,
  allPassengers: PassengerForm[]
): PassengerErrors {
  const errors: PassengerErrors = {};
  (Object.keys(FIELD_LABELS) as (keyof PassengerForm)[]).forEach((field) => {
    const value = passenger[field].trim();
    if (!value) {
      errors[field] = `${FIELD_LABELS[field]} es obligatorio`;
      return;
    }
    if (field === "email" && !EMAIL_REGEX.test(value)) {
      errors[field] = "Email inválido";
    }
    if (field === "dni") {
      if (!DNI_REGEX.test(value)) {
        errors[field] = "DNI inválido (7 u 8 dígitos)";
      } else if (
        allPassengers.some((other, otherIndex) => otherIndex !== index && other.dni.trim() === value)
      ) {
        errors[field] = "Este DNI ya fue ingresado para otro pasajero";
      }
    }
    if (field === "telefono" && !PHONE_REGEX.test(value.replace(/[\s\-()]/g, ""))) {
      errors[field] = "Teléfono inválido";
    }
  });
  return errors;
}

const inputStyle: React.CSSProperties = {
  fontFamily: "var(--font-body)",
  fontSize: "14px",
  color: "var(--color-text-body)",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-sm)",
  padding: "10px 12px",
  width: "100%",
  outline: "none",
};

interface CompraContentProps {
  tripId: string;
}

export function CompraContent({ tripId }: CompraContentProps) {
  const searchParams = useSearchParams();

  const seats = (searchParams.get("seats") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const seatIds = (searchParams.get("seat_ids") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const passengerCountParam = Number(searchParams.get("passengers"));
  const passengerCount =
    Number.isFinite(passengerCountParam) && passengerCountParam > 0
      ? Math.floor(passengerCountParam)
      : 1;

  const [passengers, setPassengers] = useState<PassengerForm[]>(() =>
    Array.from({ length: passengerCount }, () => ({ ...EMPTY_PASSENGER }))
  );
  const [errors, setErrors] = useState<PassengerErrors[]>(() =>
    Array.from({ length: passengerCount }, () => ({}))
  );
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  function handleFieldChange(
    index: number,
    field: keyof PassengerForm,
    value: string
  ) {
    setPassengers((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      if (submitAttempted) {
        setErrors((prevErrors) => {
          const nextErrors = [...prevErrors];
          nextErrors[index] = validatePassenger(next[index], index, next);
          return nextErrors;
        });
      }
      return next;
    });
  }

  async function handleContinuar() {
    const nextErrors = passengers.map((passenger, index) =>
      validatePassenger(passenger, index, passengers)
    );
    setErrors(nextErrors);
    setSubmitAttempted(true);

    const hasErrors = nextErrors.some(
      (passengerErrors) => Object.keys(passengerErrors).length > 0
    );

    if (hasErrors) {
      return;
    }

    if (seatIds.some((id) => !id)) {
      setSubmitError("No pudimos resolver alguno de los asientos seleccionados. Volvé a intentar.");
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/bookings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trip_id: tripId,
          contact_email: passengers[0].email,
          seat_ids: seatIds,
          passengers: passengers.map((p, index) => ({
            seat_id: seatIds[index],
            first_name: p.nombres,
            last_name: p.apellidos,
            dni: p.dni,
            email: p.email,
            phone: p.telefono || null,
          })),
        }),
      });
      if (!res.ok) throw new Error(`status ${res.status}`);
      const data = await res.json();
      window.location.href = data.init_point;
    } catch (err) {
      console.error("[CompraContent] booking POST error:", err);
      setSubmitError("No pudimos confirmar la reserva. Intentá nuevamente.");
      setSubmitting(false);
    }
  }

  return (
    <div
      style={{
        background: "var(--color-surface)",
        minHeight: "100vh",
        padding: "24px",
      }}
    >
      <div
        style={{
          maxWidth: "720px",
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        <div
          style={{
            background: "var(--color-white)",
            boxShadow: "var(--shadow-sm)",
            borderRadius: "var(--radius-md)",
            padding: "20px",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          <h1
            style={{
              fontFamily: "var(--font-display)",
              color: "var(--color-text-primary)",
              fontWeight: 700,
              fontSize: "20px",
              margin: 0,
            }}
          >
            Datos de los pasajeros
          </h1>
          <p
            style={{
              fontFamily: "var(--font-body)",
              color: "var(--color-text-muted)",
              fontSize: "14px",
              margin: 0,
            }}
          >
            Asientos seleccionados: {seats.length > 0 ? seats.join(", ") : "—"}
            {" · "}
            Pasajeros: {passengerCount}
          </p>
        </div>

        {passengers.map((passenger, index) => {
          const passengerErrors = errors[index] ?? {};
          return (
            <div
              key={index}
              style={{
                background: "var(--color-white)",
                boxShadow: "var(--shadow-sm)",
                borderRadius: "var(--radius-md)",
                padding: "20px",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
              }}
            >
              <h2
                style={{
                  fontFamily: "var(--font-display)",
                  color: "var(--color-text-primary)",
                  fontWeight: 700,
                  fontSize: "16px",
                  margin: 0,
                }}
              >
                Pasajero {index + 1}
              </h2>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <span
                    style={{
                      fontFamily: "var(--font-body)",
                      color: "var(--color-text-body)",
                      fontSize: "13px",
                    }}
                  >
                    Nombres
                  </span>
                  <input
                    style={inputStyle}
                    value={passenger.nombres}
                    onChange={(e) => handleFieldChange(index, "nombres", e.target.value)}
                  />
                  {submitAttempted && passengerErrors.nombres && (
                    <span style={{ fontFamily: "var(--font-body)", color: "var(--color-accent)", fontSize: "12px" }}>
                      {passengerErrors.nombres}
                    </span>
                  )}
                </label>

                <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <span
                    style={{
                      fontFamily: "var(--font-body)",
                      color: "var(--color-text-body)",
                      fontSize: "13px",
                    }}
                  >
                    Apellidos
                  </span>
                  <input
                    style={inputStyle}
                    value={passenger.apellidos}
                    onChange={(e) => handleFieldChange(index, "apellidos", e.target.value)}
                  />
                  {submitAttempted && passengerErrors.apellidos && (
                    <span style={{ fontFamily: "var(--font-body)", color: "var(--color-accent)", fontSize: "12px" }}>
                      {passengerErrors.apellidos}
                    </span>
                  )}
                </label>

                <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <span
                    style={{
                      fontFamily: "var(--font-body)",
                      color: "var(--color-text-body)",
                      fontSize: "13px",
                    }}
                  >
                    DNI
                  </span>
                  <input
                    style={inputStyle}
                    value={passenger.dni}
                    onChange={(e) => handleFieldChange(index, "dni", e.target.value)}
                  />
                  {submitAttempted && passengerErrors.dni && (
                    <span style={{ fontFamily: "var(--font-body)", color: "var(--color-accent)", fontSize: "12px" }}>
                      {passengerErrors.dni}
                    </span>
                  )}
                </label>

                <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <span
                    style={{
                      fontFamily: "var(--font-body)",
                      color: "var(--color-text-body)",
                      fontSize: "13px",
                    }}
                  >
                    Teléfono
                  </span>
                  <input
                    type="tel"
                    style={inputStyle}
                    value={passenger.telefono}
                    onChange={(e) => handleFieldChange(index, "telefono", e.target.value)}
                  />
                  {submitAttempted && passengerErrors.telefono && (
                    <span style={{ fontFamily: "var(--font-body)", color: "var(--color-accent)", fontSize: "12px" }}>
                      {passengerErrors.telefono}
                    </span>
                  )}
                </label>

                <label
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "4px",
                    gridColumn: "1 / -1",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-body)",
                      color: "var(--color-text-body)",
                      fontSize: "13px",
                    }}
                  >
                    Email
                  </span>
                  <input
                    type="email"
                    style={inputStyle}
                    value={passenger.email}
                    onChange={(e) => handleFieldChange(index, "email", e.target.value)}
                  />
                  {submitAttempted && passengerErrors.email && (
                    <span style={{ fontFamily: "var(--font-body)", color: "var(--color-accent)", fontSize: "12px" }}>
                      {passengerErrors.email}
                    </span>
                  )}
                </label>
              </div>
            </div>
          );
        })}

        {submitError && (
          <p
            style={{
              fontFamily: "var(--font-body)",
              color: "var(--color-accent)",
              fontSize: "14px",
              margin: 0,
            }}
          >
            {submitError}
          </p>
        )}

        <BlueButton
          variant="blue"
          onClick={handleContinuar}
          arrow
          disabled={submitting}
        >
          {submitting ? "Procesando…" : "Continuar al pago"}
        </BlueButton>
      </div>
    </div>
  );
}
