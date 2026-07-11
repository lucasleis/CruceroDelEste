"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BlueButton } from "@/components/core/BlueButton";

type SeatApiStatus = "available" | "reserved" | "sold" | "blocked";

interface SeatRead {
  id: string;
  seat_number: string;
  seat_type: "cama" | "semi_cama";
  status: SeatApiStatus;
}

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

interface AsientosContentProps {
  tripId: string;
}

export function AsientosContent({ tripId }: AsientosContentProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const passengersParam = Number(searchParams.get("passengers"));
  const passengerCount =
    Number.isFinite(passengersParam) && passengersParam > 0
      ? Math.floor(passengersParam)
      : null;

  const [seats, setSeats] = useState<SeatRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFloor, setActiveFloor] = useState<Floor>("alta");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;

    async function fetchSeats() {
      setLoading(true);
      setError(null);
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL;
        const url = `${baseUrl}/trips/${tripId}/seats`;
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }
        const data: SeatRead[] = await response.json();
        if (!cancelled) {
          setSeats(data);
        }
      } catch {
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

  const seatsByNumber = new Map(seats.map((seat) => [seat.seat_number, seat]));

  function toggleSeat(seatNumber: string) {
    const seat = seatsByNumber.get(seatNumber);
    if (!seat || seat.status !== "available") return;

    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(seatNumber)) {
        next.delete(seatNumber);
      } else {
        next.add(seatNumber);
      }
      return next;
    });
  }

  function handleContinuar() {
    const params = new URLSearchParams();
    params.set("seats", Array.from(selected).join(","));
    if (passengerCount !== null) {
      params.set("passengers", String(passengerCount));
    }
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
              gridTemplateColumns: `repeat(${row.length}, 48px)`,
              gap: "8px",
            }}
          >
            {row.map((cell, colIndex) => {
              if (cell === null) {
                return <div key={colIndex} style={{ width: "48px", height: "48px" }} />;
              }

              if (typeof cell === "object") {
                return (
                  <div
                    key={colIndex}
                    style={{
                      width: "48px",
                      height: "48px",
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
              const isSelected = selected.has(seatNumber);

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
                    width: "48px",
                    height: "48px",
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

  return (
    <div style={{ background: "var(--color-surface)", minHeight: "100vh", padding: "24px" }}>
      <div style={{ maxWidth: "720px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "16px" }}>
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
              {selected.size} de {passengerCount} asientos seleccionados
            </p>
          )}
        </div>

        {loading && <p style={mutedTextStyle}>Cargando asientos...</p>}

        {!loading && error && (
          <p style={mutedTextStyle}>
            No se pudieron cargar los asientos. Intentá de nuevo más tarde.
          </p>
        )}

        {!loading && !error && seats.length === 0 && (
          <p style={mutedTextStyle}>No hay asientos disponibles para este viaje.</p>
        )}

        {!loading && !error && seats.length > 0 && (
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

              {renderGrid(activeFloor === "alta" ? PLANTA_ALTA : PLANTA_BAJA)}
            </div>

            <BlueButton variant="blue" onClick={handleContinuar} disabled={selected.size === 0} arrow>
              Continuar
            </BlueButton>
          </>
        )}
      </div>
    </div>
  );
}
