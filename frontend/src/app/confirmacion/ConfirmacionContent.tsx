"use client";

/*
 * URLs de prueba local:
 *
 * Aprobado (requiere booking real en DB):
 * http://localhost:3000/confirmacion?status=approved&external_reference=27b21b15-4fed-4d26-b38c-8c6fa8bf9419&payment_id=123
 *
 * Pendiente:
 * http://localhost:3000/confirmacion?status=pending&payment_id=123
 *
 * Fallo:
 * http://localhost:3000/confirmacion?status=failure&payment_id=123
 */

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

interface StopRead {
  id: string;
  name: string;
  country: string;
}

interface RouteRead {
  id: string;
  origin_stop: StopRead;
  destination_stop: StopRead;
}

interface TripSummary {
  id: string;
  route: RouteRead;
  departure_at: string;
  arrival_at: string;
  status: string;
}

interface PassengerRead {
  id: string;
  seat_id: string;
  first_name: string;
  last_name: string;
  dni: string;
  email: string;
  phone: string | null;
}

interface BookingRead {
  id: string;
  trip: TripSummary;
  status: string;
  contact_email: string;
  total_amount: number;
  passengers: PassengerRead[];
}

function toArDateTime(iso: string): string {
  return new Date(iso).toLocaleString("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

const cardStyle: React.CSSProperties = {
  background: "var(--color-white)",
  boxShadow: "var(--shadow-sm)",
  borderRadius: "var(--radius-md)",
  padding: "20px",
  display: "flex",
  flexDirection: "column",
  gap: "8px",
};

const CheckIcon = () => (
  <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="var(--color-white)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" fill="var(--color-primary)" stroke="none" />
    <path d="M8 12.5l2.5 2.5L16 9.5" />
  </svg>
);

const ClockIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 7v5l3 2" />
  </svg>
);

const XIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M9 9l6 6M15 9l-6 6" />
  </svg>
);

export function ConfirmacionContent() {
  const searchParams = useSearchParams();

  const status = searchParams.get("status") ?? "";
  const externalReference = searchParams.get("booking_id") ?? searchParams.get("external_reference") ?? "";
  const paymentId = searchParams.get("payment_id") ?? "";
  const token = searchParams.get("token") ?? "";

  const [booking, setBooking] = useState<BookingRead | null>(null);
  const [loading, setLoading] = useState(status === "approved");
  const [fetchError, setFetchError] = useState(false);

  useEffect(() => {
    if (status !== "approved") return;

    window.history.replaceState({}, "", "/confirmacion");

    let cancelled = false;

    async function fetchBooking() {
      setLoading(true);
      setFetchError(false);
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL;
        const response = await fetch(
          `${baseUrl}/bookings/${externalReference}?token=${encodeURIComponent(token)}`
        );
        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }
        const data: BookingRead = await response.json();
        if (!cancelled) {
          setBooking(data);
        }
      } catch {
        if (!cancelled) {
          setFetchError(true);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchBooking();

    return () => {
      cancelled = true;
    };
  }, [status, externalReference, token]);

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
          maxWidth: "860px",
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        {status === "approved" && loading && (
          <div style={cardStyle}>
            <p
              style={{
                fontFamily: "var(--font-body)",
                color: "var(--color-text-muted)",
                textAlign: "center",
                margin: 0,
              }}
            >
              Cargando tu comprobante...
            </p>
          </div>
        )}

        {status === "approved" && !loading && fetchError && (
          <div style={cardStyle}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
              <XIcon />
              <h1
                style={{
                  fontFamily: "var(--font-display)",
                  color: "var(--color-accent)",
                  fontWeight: 700,
                  fontSize: "28px",
                  textAlign: "center",
                  margin: 0,
                }}
              >
                ¡Compra registrada!
              </h1>
              <p
                style={{
                  fontFamily: "var(--font-body)",
                  color: "var(--color-text-muted)",
                  fontSize: "16px",
                  textAlign: "center",
                  margin: 0,
                }}
              >
                En breve vas a recibir un email con los datos de tu pasaje. Si no llega en 10 minutos, contactá a soporte con el ID de pago.
              </p>
              {paymentId && (
                <p
                  style={{
                    fontFamily: "var(--font-body)",
                    color: "var(--color-text-muted)",
                    fontSize: "14px",
                    textAlign: "center",
                    margin: 0,
                    marginTop: "12px",
                  }}
                >
                  ID de pago: {paymentId}
                </p>
              )}
            </div>
          </div>
        )}

        {status === "approved" && !loading && !fetchError && booking && (
          <>
            <div style={{ ...cardStyle, alignItems: "center", textAlign: "center" }}>
              <CheckIcon />
              <h1
                style={{
                  fontFamily: "var(--font-display)",
                  color: "var(--color-text-primary)",
                  fontWeight: 700,
                  fontSize: "32px",
                  margin: 0,
                }}
              >
                ¡Compra confirmada!
              </h1>
              <p
                style={{
                  fontFamily: "var(--font-body)",
                  color: "var(--color-text-muted)",
                  fontSize: "16px",
                  margin: 0,
                }}
              >
                Tu pasaje fue enviado a {booking.contact_email}
              </p>
              <p
                style={{
                  fontFamily: "var(--font-body)",
                  color: "var(--color-text-body)",
                  fontSize: "14px",
                  margin: 0,
                  marginTop: "12px",
                }}
              >
                Reserva Nº {booking.id.slice(0, 8).toUpperCase()}
              </p>
            </div>

            <div style={{ ...cardStyle, padding: "24px 28px" }}>
              <h2
                style={{
                  fontFamily: "var(--font-display)",
                  color: "var(--color-text-primary)",
                  fontWeight: 700,
                  fontSize: "18px",
                  margin: 0,
                }}
              >
                Datos del viaje
              </h2>
              <p
                style={{
                  fontFamily: "var(--font-body)",
                  color: "var(--color-text-primary)",
                  fontWeight: 600,
                  fontSize: "16px",
                  margin: 0,
                }}
              >
                {booking.trip.route.origin_stop.name} → {booking.trip.route.destination_stop.name}
              </p>
              <p style={{ margin: 0 }}>
                <span
                  style={{
                    fontFamily: "var(--font-body)",
                    color: "var(--color-text-muted)",
                    fontSize: "15px",
                  }}
                >
                  Salida:{" "}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-body)",
                    color: "var(--color-text-body)",
                    fontSize: "15px",
                  }}
                >
                  {toArDateTime(booking.trip.departure_at)}
                </span>
              </p>
              <p style={{ margin: 0 }}>
                <span
                  style={{
                    fontFamily: "var(--font-body)",
                    color: "var(--color-text-muted)",
                    fontSize: "15px",
                  }}
                >
                  Llegada:{" "}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-body)",
                    color: "var(--color-text-body)",
                    fontSize: "15px",
                  }}
                >
                  {toArDateTime(booking.trip.arrival_at)}
                </span>
              </p>
            </div>

            {booking.passengers.map((passenger, index) => (
              <div key={passenger.id} style={{ ...cardStyle, padding: "24px 28px" }}>
                <h2
                  style={{
                    fontFamily: "var(--font-display)",
                    color: "var(--color-text-primary)",
                    fontWeight: 700,
                    fontSize: "18px",
                    margin: 0,
                  }}
                >
                  Pasajero {index + 1}
                </h2>
                <p
                  style={{
                    fontFamily: "var(--font-body)",
                    color: "var(--color-text-primary)",
                    fontWeight: 600,
                    fontSize: "16px",
                    margin: 0,
                  }}
                >
                  {passenger.first_name} {passenger.last_name}
                </p>
                <p style={{ margin: 0 }}>
                  <span
                    style={{
                      fontFamily: "var(--font-body)",
                      color: "var(--color-text-muted)",
                      fontSize: "13px",
                    }}
                  >
                    DNI:{" "}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-body)",
                      color: "var(--color-text-body)",
                      fontSize: "15px",
                    }}
                  >
                    {passenger.dni}
                  </span>
                </p>
                <p style={{ margin: 0 }}>
                  <span
                    style={{
                      fontFamily: "var(--font-body)",
                      color: "var(--color-text-muted)",
                      fontSize: "13px",
                    }}
                  >
                    Email:{" "}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-body)",
                      color: "var(--color-text-body)",
                      fontSize: "15px",
                    }}
                  >
                    {passenger.email}
                  </span>
                </p>
              </div>
            ))}
          </>
        )}

        {status === "pending" && (
          <div style={cardStyle}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
              <ClockIcon />
              <h1
                style={{
                  fontFamily: "var(--font-display)",
                  color: "var(--color-text-primary)",
                  fontWeight: 700,
                  fontSize: "28px",
                  textAlign: "center",
                  margin: 0,
                }}
              >
                Pago en proceso
              </h1>
              <p
                style={{
                  fontFamily: "var(--font-body)",
                  color: "var(--color-text-muted)",
                  fontSize: "16px",
                  textAlign: "center",
                  margin: 0,
                }}
              >
                Tu pago está siendo procesado. Te avisaremos por email cuando se confirme.
              </p>
              {paymentId && (
                <p
                  style={{
                    fontFamily: "var(--font-body)",
                    color: "var(--color-text-muted)",
                    fontSize: "14px",
                    textAlign: "center",
                    margin: 0,
                    marginTop: "12px",
                  }}
                >
                  ID de pago: {paymentId}
                </p>
              )}
            </div>
          </div>
        )}

        {status !== "approved" && status !== "pending" && (
          <div style={cardStyle}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
              <XIcon />
              <h1
                style={{
                  fontFamily: "var(--font-display)",
                  color: "var(--color-accent)",
                  fontWeight: 700,
                  fontSize: "28px",
                  textAlign: "center",
                  margin: 0,
                }}
              >
                Hubo un problema con tu pago
              </h1>
              <p
                style={{
                  fontFamily: "var(--font-body)",
                  color: "var(--color-text-muted)",
                  fontSize: "16px",
                  textAlign: "center",
                  margin: 0,
                }}
              >
                Por favor intentá de nuevo o contactá a soporte.
              </p>
              {paymentId && (
                <p
                  style={{
                    fontFamily: "var(--font-body)",
                    color: "var(--color-text-muted)",
                    fontSize: "14px",
                    textAlign: "center",
                    margin: 0,
                    marginTop: "12px",
                  }}
                >
                  ID de pago: {paymentId}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
