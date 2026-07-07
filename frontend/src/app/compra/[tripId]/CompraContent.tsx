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

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validatePassenger(passenger: PassengerForm): PassengerErrors {
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

  function handleFieldChange(
    index: number,
    field: keyof PassengerForm,
    value: string
  ) {
    setPassengers((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }

  function handleContinuar() {
    const nextErrors = passengers.map(validatePassenger);
    setErrors(nextErrors);
    setSubmitAttempted(true);

    const hasErrors = nextErrors.some(
      (passengerErrors) => Object.keys(passengerErrors).length > 0
    );

    if (!hasErrors) {
      console.log({ tripId, seats, passengers });
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

        <BlueButton variant="blue" onClick={handleContinuar} arrow>
          Continuar al pago
        </BlueButton>
      </div>
    </div>
  );
}
