import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { act } from "@testing-library/react";
import { ConfirmacionContent } from "../ConfirmacionContent";
import { getBooking } from "@/api";

// Primer uso de vi.useFakeTimers() en este repo.
//
// ConfirmacionContent usa setTimeout recursivo para el polling. Con fake
// timers, waitFor() interna de Testing Library también usa setTimeout para
// sus reintentos, así que nunca dispara y el test hace timeout. La solución
// correcta: usar act(async () => { ... }) para forzar que React procese los
// state updates y las promesas pendientes, SIN depender de setTimeout.
//
// Para los tests 9, 10, 11 getBooking resuelve/rechaza de forma inmediata
// (no hay setTimeout que esperar), así que act(async () => {}) con un
// pequeño flush de microtasks es suficiente.

let mockSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useSearchParams: () => mockSearchParams,
}));

vi.mock("@/api", () => ({
  getBooking: vi.fn(),
}));

function makeBookingRead(overrides: { status?: string } = {}) {
  return {
    id: "booking-1",
    booking_code: "ERP-7K3M-9QX2",
    status: "confirmed",
    contact_email: "ana@example.com",
    total_amount: 25000,
    trip: {
      id: "trip-1",
      route: {
        id: "route-1",
        origin_stop: { id: "s1", name: "Retiro", country: "AR" as const, province: null, created_at: "" },
        destination_stop: { id: "s2", name: "Asunción", country: "PY" as const, province: null, created_at: "" },
      },
      departure_at: "2026-09-01T10:00:00Z",
      arrival_at: "2026-09-02T03:00:00Z",
      status: "scheduled",
    },
    passengers: [
      {
        id: "p1",
        seat_id: "seat-1",
        first_name: "Ana",
        last_name: "García",
        dni: "12345678",
        email: "ana@example.com",
        phone: null,
      },
    ],
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────
// Tests sin polling — status distintos de "approved"
// ─────────────────────────────────────────────────────────

describe("ConfirmacionContent — status != approved (sin polling)", () => {
  beforeEach(() => {
    vi.mocked(getBooking).mockReset();
  });

  // test 7
  it("status=pending muestra 'Pago en proceso' sin llamar a getBooking", () => {
    mockSearchParams = new URLSearchParams("status=pending&payment_id=999");
    render(<ConfirmacionContent />);

    expect(screen.getByText("Pago en proceso")).toBeInTheDocument();
    expect(vi.mocked(getBooking)).not.toHaveBeenCalled();
  });

  // test 8
  it("status=failure muestra 'Hubo un problema con tu pago' sin llamar a getBooking", () => {
    mockSearchParams = new URLSearchParams("status=failure&payment_id=999");
    render(<ConfirmacionContent />);

    expect(screen.getByText("Hubo un problema con tu pago")).toBeInTheDocument();
    expect(vi.mocked(getBooking)).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────
// Tests con fake timers — status=approved → polling
// ─────────────────────────────────────────────────────────

describe("ConfirmacionContent — status=approved, polling (fake timers)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockSearchParams = new URLSearchParams(
      "status=approved&booking_id=booking-1&token=tok-abc&payment_id=mp-123"
    );
    vi.mocked(getBooking).mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // test 9
  it("muestra '¡Compra confirmada!' cuando el primer poll devuelve status confirmed", async () => {
    vi.mocked(getBooking).mockResolvedValueOnce(makeBookingRead({ status: "confirmed" }));

    render(<ConfirmacionContent />);

    // poll(0) llama getBooking que resuelve de inmediato (microtask).
    // act(async) vacía la cola de microtasks y fuerza el re-render de React.
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(screen.getByText("¡Compra confirmada!")).toBeInTheDocument();
    // El booking_code vive en un <p> junto con "Reserva Nº " — regex para
    // que getByText busque por contenido parcial del elemento padre.
    expect(screen.getByText(/ERP-7K3M-9QX2/)).toBeInTheDocument();
  });

  // test 10
  it("muestra 'Tu reserva venció' cuando el poll devuelve status expired", async () => {
    vi.mocked(getBooking).mockResolvedValueOnce(makeBookingRead({ status: "expired" }));

    render(<ConfirmacionContent />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(screen.getByText("Tu reserva venció")).toBeInTheDocument();
  });

  // test 11
  it("muestra '¡Compra registrada!' cuando getBooking lanza (token inválido/vencido)", async () => {
    vi.mocked(getBooking).mockRejectedValueOnce(new Error("401 Unauthorized"));

    render(<ConfirmacionContent />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(screen.getByText("¡Compra registrada!")).toBeInTheDocument();
    // Confirmar que NO se muestra el mensaje de "fallo de pago" (mensaje diferente).
    expect(screen.queryByText("Hubo un problema con tu pago")).not.toBeInTheDocument();
  });
});
