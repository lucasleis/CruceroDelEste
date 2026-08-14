import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CompraContent } from "../CompraContent";

// LLE-336: cuando la cantidad de seat_ids no coincide con la cantidad de
// formularios de pasajero (típicamente porque ?passengers venía ausente o
// inválido en /asientos y cayó al default), CompraContent debe detectarlo
// client-side y nunca llamar a createBooking. Este test cubre solo esa
// validación nueva — cobertura general del componente es scope de LLE-358.

let mockSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useSearchParams: () => mockSearchParams,
}));

const createBookingMock = vi.fn();

vi.mock("@/api", () => ({
  createBooking: (...args: unknown[]) => createBookingMock(...args),
}));

async function fillPassenger(index: number) {
  const user = userEvent.setup();
  const forms = screen.getAllByText(/^Pasajero \d+$/);
  expect(forms.length).toBeGreaterThan(index);

  // Los inputs no tienen id/label conectados por htmlFor, así que
  // navegamos por posición dentro de cada card de pasajero.
  const cards = document.querySelectorAll("h2");
  const card = cards[index]?.closest("div");
  if (!card) throw new Error(`No se encontró la card del pasajero ${index}`);

  const inputs = card.querySelectorAll("input");
  await user.type(inputs[0], "Ana"); // nombres
  await user.type(inputs[1], "García"); // apellidos
  await user.type(inputs[2], "12345678"); // dni
  await user.type(inputs[3], "+541122334455"); // telefono
  await user.type(inputs[4], "ana@example.com"); // email
}

describe("CompraContent — mismatch seat_ids/passengers (LLE-336)", () => {
  const originalLocation = window.location;

  beforeEach(() => {
    createBookingMock.mockReset();
  });

  afterEach(() => {
    // LLE-370: el test de abajo reemplaza window.location por un stub
    // plano para poder leer la redirección a MercadoPago (jsdom no
    // implementa navegación real). Sin restaurarlo, cualquier test que
    // se agregue después de este en el archivo hereda un
    // window.location sin origin/pathname/assign().
    Object.defineProperty(window, "location", {
      value: originalLocation,
      writable: true,
      configurable: true,
    });
  });

  it('muestra kind "invalid_selection" y nunca llama createBooking cuando las longitudes no coinciden', async () => {
    // 2 asientos elegidos, pero ?passengers ausente → CompraContent cae al
    // default de 1 formulario de pasajero. seatIds.length(2) !== passengers.length(1).
    mockSearchParams = new URLSearchParams({
      seats: "1A,2B",
      seat_ids: "11111111-1111-1111-1111-111111111111,22222222-2222-2222-2222-222222222222",
    });

    render(<CompraContent tripId="trip-1" />);

    await fillPassenger(0);

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /continuar al pago/i }));

    await waitFor(() => {
      expect(
        screen.getByText("Hubo un problema con los asientos seleccionados.")
      ).toBeInTheDocument();
    });
    expect(screen.getByText("Volvé a elegirlos para continuar.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /elegir asientos de nuevo/i })).toHaveAttribute(
      "href",
      "/asientos/trip-1"
    );
    expect(createBookingMock).not.toHaveBeenCalled();
  });

  it("llama createBooking cuando las longitudes coinciden", async () => {
    mockSearchParams = new URLSearchParams({
      seats: "1A",
      seat_ids: "11111111-1111-1111-1111-111111111111",
      passengers: "1",
    });
    createBookingMock.mockResolvedValue({
      status: 201,
      json: async () => ({ init_point: "https://mp.example.com/pay" }),
    });

    // jsdom no implementa navegación real — evitamos el error de "not implemented".
    // @ts-expect-error stub mínimo de location para observar la asignación.
    delete window.location;
    // @ts-expect-error idem
    window.location = { href: "" };

    render(<CompraContent tripId="trip-1" />);

    await fillPassenger(0);

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /continuar al pago/i }));

    await waitFor(() => {
      expect(createBookingMock).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(window.location.href).toBe("https://mp.example.com/pay");
    });
  });
});
