import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ArrepentimientoContent } from "../ArrepentimientoContent";

// LLE-337: el endpoint real de POST /bookings/{id}/refund-request nunca
// devuelve 404 ni 409 — colapsa "booking no existe" y "booking no
// confirmado" en un único 403 a propósito (evita enumeración de bookings).
// Estos tests confirman que un 403 real resulta en el mensaje dedicado
// (no_confirmed_or_missing), y que 500/502 siguen cayendo al mensaje
// genérico de error, tal como se decidió explícitamente para este ticket.

const refundRequestMock = vi.fn();

vi.mock("@/api", () => ({
  refundRequest: (...args: unknown[]) => refundRequestMock(...args),
}));

function jsonResponse(status: number, body: unknown = {}): Response {
  return {
    status,
    json: async () => body,
  } as Response;
}

const VALID_BOOKING_ID = "3a547502-c723-4bbb-a05d-b4165f836768";

async function submitForm() {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Número de reserva"), VALID_BOOKING_ID);
  await user.type(screen.getByLabelText("Email de la compra"), "ana@example.com");
  await user.click(screen.getByRole("button", { name: /solicitar cancelación/i }));
}

describe("ArrepentimientoContent — branching de status code", () => {
  it("403 real del backend renderiza el mensaje dedicado, no el genérico", async () => {
    refundRequestMock.mockResolvedValueOnce(jsonResponse(403, { detail: "forbidden" }));
    render(<ArrepentimientoContent />);

    await submitForm();

    await waitFor(() => {
      expect(screen.getByText("No pudimos procesar la solicitud")).toBeInTheDocument();
    });
    expect(
      screen.getByText(
        "No encontramos una reserva confirmada con esos datos. Verificá el número de reserva y el email ingresados."
      )
    ).toBeInTheDocument();
    expect(screen.queryByText("Ocurrió un error")).not.toBeInTheDocument();
  });

  it("429 (rate limit) sigue renderizando el mensaje de rate_limited", async () => {
    refundRequestMock.mockResolvedValueOnce(jsonResponse(429));
    render(<ArrepentimientoContent />);

    await submitForm();

    await waitFor(() => {
      expect(screen.getByText("Demasiados intentos")).toBeInTheDocument();
    });
  });

  it.each([500, 502])(
    "%i cae al mensaje genérico de error (decisión explícita del ticket)",
    async (status) => {
      refundRequestMock.mockResolvedValueOnce(jsonResponse(status, { detail: "internal_server_error" }));
      render(<ArrepentimientoContent />);

      await submitForm();

      await waitFor(() => {
        expect(screen.getByText("Ocurrió un error")).toBeInTheDocument();
      });
    }
  );
});
