"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { BlueButton } from "@/components/core/BlueButton";
import { getTrip, getTripSeats } from "@/api";
import type { TripRead, SeatRead } from "@/types/trips";

type Floor = "alta" | "baja";

const PLANTA_ALTA: (string | null | { label: string })[][] = [
  ["3", "4", { label: "TV" }, "2", "1"],
  [{ label: "E" }, { label: "E" }, null, "6", "5"],
  [{ label: "C" }, { label: "C" }, null, "8", "7"],
  ["9", "10", null, "12", "11"],
  ["13", "14", { label: "TV" }, "16", "15"],
  ["17", "18", null, "20", "19"],
  ["21", "22", null, "24", "23"],
  ["25", "26", null, "28", "27"],
  ["29", "30", { label: "TV" }, "32", "31"],
  ["35", "36", null, "34", "33"],
  ["39", "40", null, "38", "37"],
  ["43", "44", null, "42", "41"],
  ["59", "60", null, "46", "45"],
];

const PLANTA_BAJA: (string | null | { label: string })[][] = [
  [{ label: "E" }, { label: "TV" }, { label: "B" }, { label: "B" }],
  ["51", null, "50", "49"],
  ["52", null, "54", "53"],
  ["55", null, "58", "57"],
  ["56", null, "48", "47"],
];

function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return isMobile;
}

interface AsientosContentProps {
  tripId: string;
}

export function AsientosContent({ tripId }: AsientosContentProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isMobile = useIsMobile();

  const passengersParam = Number(searchParams.get("passengers"));
  const passengerCount =
    Number.isFinite(passengersParam) && passengersParam > 0
      ? Math.floor(passengersParam)
      : null;

  useEffect(() => {
    if (passengerCount === null) {
      toast.error("No pudimos recuperar tu búsqueda. Buscá tu viaje de nuevo.");
      router.push("/resultados");
    }
  }, [passengerCount, router]);

  const [seats, setSeats] = useState<SeatRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFloor, setActiveFloor] = useState<Floor>("alta");
  const [selected, setSelected] = useState<string[]>([]);
  const [trip, setTrip] = useState<TripRead | null>(null);
  const [tripLoading, setTripLoading] = useState(true);
  const [tripError, setTripError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchTrip() {
      setTripLoading(true);
      setTripError(null);
      try {
        const data = await getTrip(tripId);
        if (!cancelled) {
          setTrip(data);
        }
      } catch (error) {
        console.error("[AsientosContent] trip fetch error:", error);
        if (!cancelled) {
          setTripError("error");
        }
      } finally {
        if (!cancelled) {
          setTripLoading(false);
        }
      }
    }

    fetchTrip();

    return () => {
      cancelled = true;
    };
  }, [tripId]);

  useEffect(() => {
    let cancelled = false;

    async function fetchSeats() {
      setLoading(true);
      setError(null);
      try {
        const data = await getTripSeats(tripId);
        if (!cancelled) {
          setSeats(data);
        }
      } catch (error) {
        console.error("[AsientosContent] seats fetch error:", error);
        if (!cancelled) {
          setError("error");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchSeats();

    return () => {
      cancelled = true;
    };
  }, [tripId]);

  // trip.seat_layout_supported es null en GET /trips (list) y solo se
  // calcula en GET /trips/{id} — que es lo que consume esta página. Tratamos
  // false/null/undefined todos como "no soportado" (fail-closed).
  const layoutUnsupported = trip !== null && !trip.seat_layout_supported;

  const seatsByNumber = new Map(seats.map((seat) => [seat.seat_number, seat]));

  function formatDateTime(iso: string): string {
    const date = new Date(iso);
    const datePart = date
      .toLocaleDateString("es-AR", {
        timeZone: "America/Argentina/Buenos_Aires",
        weekday: "short",
        day: "2-digit",
        month: "short",
      })
      .replace(".", "");
    const timePart = date.toLocaleTimeString("es-AR", {
      timeZone: "America/Argentina/Buenos_Aires",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    });
    return `${datePart} · ${timePart}`;
  }

  function seatTypeLabel(seatType: SeatRead["seat_type"]): string {
    return seatType === "cama" ? "Cama Ejecutivo" : "Semi Cama";
  }

  function seatPrice(seatType: SeatRead["seat_type"]): number | null {
    if (!trip) return null;
    return seatType === "cama" ? trip.current_price_cama : trip.current_price_semi_cama;
  }

  const selectedSeatDetails = selected.map((seatNumber) => {
    const seat = seatsByNumber.get(seatNumber);
    const price = seat ? seatPrice(seat.seat_type) : null;
    return { seatNumber, seat, price };
  });

  const total = selectedSeatDetails.reduce((sum, { price }) => sum + (price ?? 0), 0);

  function toggleSeat(seatNumber: string) {
    const seat = seatsByNumber.get(seatNumber);
    if (!seat || seat.status !== "available") return;

    setSelected((prev) => {
      if (prev.includes(seatNumber)) {
        return prev.filter((s) => s !== seatNumber);
      }
      if (passengerCount !== null && prev.length >= passengerCount) {
        return [...prev.slice(1), seatNumber];
      }
      return [...prev, seatNumber];
    });
  }

  function handleContinuar() {
    // Inalcanzable en la práctica: el useEffect de arriba redirige a
    // /resultados antes de que el usuario pueda llegar a este botón sin un
    // passengerCount válido. Guarda defensiva + narrowing de TS.
    if (passengerCount === null) return;

    if (selected.length !== passengerCount) {
      toast.error(`Seleccioná exactamente ${passengerCount} asiento${passengerCount === 1 ? "" : "s"} para continuar.`);
      return;
    }

    const params = new URLSearchParams();
    params.set("seats", selected.join(","));
    params.set("seat_ids", selected.map((n) => seatsByNumber.get(n)?.id ?? "").join(","));
    params.set("passengers", String(passengerCount));
    router.push(`/compra/${tripId}?${params.toString()}`);
  }

  function renderGrid(grid: (string | null | { label: string })[][]) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {grid.map((row, rowIndex) => (
          <div
            key={rowIndex}
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${row.length}, 36px)`,
              gap: "8px",
            }}
          >
            {row.map((cell, colIndex) => {
              if (cell === null) {
                return <div key={colIndex} style={{ width: "36px", height: "36px" }} />;
              }

              if (typeof cell === "object") {
                return (
                  <div
                    key={colIndex}
                    style={{
                      width: "36px",
                      height: "36px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.65rem",
                      color: "var(--color-text-muted)",
                      background: "transparent",
                      border: "1px dashed var(--color-border)",
                      borderRadius: "var(--radius-sm)",
                      cursor: "default",
                    }}
                  >
                    {cell.label}
                  </div>
                );
              }

              const seatNumber = cell;
              const seat = seatsByNumber.get(seatNumber);
              const isOccupied = !seat || seat.status !== "available";
              const isSelected = selected.includes(seatNumber);

              const seatStyle: React.CSSProperties = isSelected
                ? {
                    background: "var(--color-primary)",
                    color: "var(--color-white)",
                    border: "1px solid var(--color-primary)",
                    cursor: "pointer",
                  }
                : isOccupied
                ? {
                    background: "var(--color-text-muted)",
                    opacity: 0.35,
                    color: "var(--color-white)",
                    border: "1px solid var(--color-text-muted)",
                    cursor: "default",
                  }
                : {
                    background: "var(--color-surface)",
                    color: "var(--color-text-primary)",
                    border: "1px solid var(--color-border)",
                    cursor: "pointer",
                  };

              return (
                <button
                  key={colIndex}
                  type="button"
                  onClick={() => toggleSeat(seatNumber)}
                  disabled={isOccupied}
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "var(--radius-sm)",
                    fontFamily: "var(--font-body)",
                    fontWeight: 600,
                    fontSize: "13px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: `all var(--duration-base) var(--ease-out)`,
                    ...seatStyle,
                  }}
                >
                  {seatNumber}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    );
  }

  const mutedTextStyle: React.CSSProperties = {
    textAlign: "center",
    color: "var(--color-text-muted)",
    fontFamily: "var(--font-body)",
    padding: "48px 0",
  };

  if (passengerCount === null) {
    // El useEffect de arriba ya disparó el redirect a /resultados — no
    // renderizamos el selector de asientos (sin tope) mientras eso ocurre.
    return null;
  }

  return (
    <div style={{
      background: "var(--color-surface)",
      minHeight: "100vh",
      padding: isMobile ? "16px" : "24px",
      paddingBottom: isMobile ? "96px" : "24px",
    }}>
      <div style={{
        display: "flex",
        flexDirection: isMobile ? "column" : "row",
        gap: "24px",
        maxWidth: "1200px",
        margin: "0 auto",
        alignItems: "flex-start",
      }}>
      <div style={{ flex: "1", minWidth: 0, display: "flex", flexDirection: "column", gap: "16px" }}>
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
            Seleccioná tus asientos
          </h1>
          {passengerCount !== null && (
            <p
              style={{
                fontFamily: "var(--font-body)",
                color: "var(--color-text-muted)",
                fontSize: "14px",
                margin: 0,
              }}
            >
              {selected.length} de {passengerCount} asientos seleccionados
            </p>
          )}
        </div>

        {loading && <p style={mutedTextStyle}>Cargando asientos...</p>}

        {!loading && !tripLoading && layoutUnsupported && (
          <p style={mutedTextStyle}>
            Este viaje usa una configuración de asientos no soportada.
            Contactanos para completar tu compra.
          </p>
        )}

        {!loading && !layoutUnsupported && error && (
          <p style={mutedTextStyle}>
            No se pudieron cargar los asientos. Intentá de nuevo más tarde.
          </p>
        )}

        {!loading && !layoutUnsupported && !error && seats.length === 0 && (
          <p style={mutedTextStyle}>No hay asientos disponibles para este viaje.</p>
        )}

        {!loading && !layoutUnsupported && !error && seats.length > 0 && (
          <>
            <div
              style={{
                background: "var(--color-white)",
                boxShadow: "var(--shadow-sm)",
                borderRadius: "var(--radius-md)",
                padding: "20px",
                display: "flex",
                flexDirection: "column",
                gap: "20px",
              }}
            >
              <div style={{ display: "flex", gap: "24px", borderBottom: "1px solid var(--color-border)" }}>
                <button
                  type="button"
                  onClick={() => setActiveFloor("alta")}
                  style={{
                    background: "transparent",
                    border: "none",
                    borderBottom: activeFloor === "alta" ? "2px solid var(--color-primary)" : "2px solid transparent",
                    color: activeFloor === "alta" ? "var(--color-primary)" : "var(--color-text-muted)",
                    fontFamily: "var(--font-body)",
                    fontWeight: 700,
                    fontSize: "14px",
                    padding: "0 0 12px 0",
                    cursor: "pointer",
                  }}
                >
                  Planta Alta (Semi Cama)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFloor("baja")}
                  style={{
                    background: "transparent",
                    border: "none",
                    borderBottom: activeFloor === "baja" ? "2px solid var(--color-primary)" : "2px solid transparent",
                    color: activeFloor === "baja" ? "var(--color-primary)" : "var(--color-text-muted)",
                    fontFamily: "var(--font-body)",
                    fontWeight: 700,
                    fontSize: "14px",
                    padding: "0 0 12px 0",
                    cursor: "pointer",
                  }}
                >
                  Planta Baja (Cama Ejecutivo)
                </button>
              </div>

              <div style={isMobile ? { display: "flex", justifyContent: "center" } : undefined}>
                {renderGrid(activeFloor === "alta" ? PLANTA_ALTA : PLANTA_BAJA)}
              </div>
            </div>
          </>
        )}
      </div>

      <div style={{ width: isMobile ? "100%" : "320px", flexShrink: isMobile ? undefined : 0 }}>
        <div
          style={{
            background: "var(--color-white)",
            boxShadow: "var(--shadow-sm)",
            borderRadius: "12px",
            padding: "20px",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          <h2
            style={{
              fontFamily: "var(--font-body)",
              color: "var(--color-text-primary)",
              fontSize: "16px",
              fontWeight: 600,
              margin: 0,
            }}
          >
            Resumen
          </h2>

          {tripLoading && (
            <p style={{ fontFamily: "var(--font-body)", color: "var(--color-text-muted)", fontSize: "14px", margin: 0 }}>
              Cargando...
            </p>
          )}

          {!tripLoading && (tripError || !trip) && (
            <p style={{ fontFamily: "var(--font-body)", color: "var(--color-text-muted)", fontSize: "14px", margin: 0 }}>
              No se pudo cargar la información del viaje.
            </p>
          )}

          {!tripLoading && trip && (
            <>
              <div style={{ borderTop: "1px solid var(--color-border)" }} />

              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <p style={{ fontFamily: "var(--font-body)", color: "var(--color-text-primary)", fontSize: "14px", fontWeight: 600, margin: 0 }}>
                  {trip.route.origin_stop.name} → {trip.route.destination_stop.name}
                </p>
                <p style={{ fontFamily: "var(--font-body)", color: "var(--color-text-muted)", fontSize: "13px", margin: 0 }}>
                  Salida: {formatDateTime(trip.departure_at)}
                </p>
                <p style={{ fontFamily: "var(--font-body)", color: "var(--color-text-muted)", fontSize: "13px", margin: 0 }}>
                  Llegada: {formatDateTime(trip.arrival_at)}
                </p>
              </div>

              <div style={{ borderTop: "1px solid var(--color-border)" }} />

              {selectedSeatDetails.length === 0 ? (
                <p style={{ fontFamily: "var(--font-body)", color: "var(--color-text-muted)", fontSize: "14px", margin: 0 }}>
                  Ningún asiento seleccionado
                </p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {selectedSeatDetails.map(({ seatNumber, seat, price }) => (
                    <div
                      key={seatNumber}
                      style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--font-body)", fontSize: "13px", color: "var(--color-text-primary)" }}
                    >
                      <span>
                        {seatNumber} — {seat ? seatTypeLabel(seat.seat_type) : ""}
                      </span>
                      <span>{price !== null ? `$${price.toLocaleString("es-AR")}` : "Sin precio"}</span>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ borderTop: "1px solid var(--color-border)" }} />

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontFamily: "var(--font-body)", color: "var(--color-text-primary)", fontSize: "14px" }}>Total</span>
                <span style={{ fontFamily: "var(--font-display)", color: "var(--color-text-primary)", fontSize: "20px", fontWeight: 600 }}>
                  ${total.toLocaleString("es-AR")}
                </span>
              </div>
            </>
          )}
        </div>

        {!loading && !layoutUnsupported && !error && seats.length > 0 && (
          <div style={isMobile ? {
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            padding: "12px 16px",
            background: "var(--color-white)",
            borderTop: "1px solid var(--color-border)",
            zIndex: 50,
          } : {
            marginTop: "16px",
            width: "100%",
          }}>
            <BlueButton
              variant="blue"
              onClick={handleContinuar}
              disabled={selected.length === 0}
              arrow
              style={{ width: "100%" }}
            >
              Continuar
            </BlueButton>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
