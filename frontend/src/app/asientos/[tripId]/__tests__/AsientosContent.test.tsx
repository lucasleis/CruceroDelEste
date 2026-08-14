import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AsientosContent } from "../AsientosContent";
import { getTrip, getTripSeats } from "@/api";

// LLE-336: cuando ?passengers falta o es inválido, AsientosContent debe
// redirigir a /resultados en vez de renderizar un selector sin tope de
// asientos. Este test cubre solo esa lógica nueva — cobertura general del
// componente (fetch de trip/seats, selección, etc.) es scope de LLE-358.

const pushMock = vi.fn();
const toastErrorMock = vi.fn();
const toastInfoMock = vi.fn();

// mockSearchParams: prefijo "mock" requerido por vitest para poder
// referenciarla dentro del factory de vi.mock (hoisting).
let mockSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
  useSearchParams: () => mockSearchParams,
}));

// LLE-370: mock parcial de sonner — solo lista los métodos de `toast` que
// AsientosContent usa hoy (error, info). Si el componente empieza a llamar
// otro método (toast.warning, toast.success, ...), este mock no lo va a
// tener y el test va a explotar con
// "TypeError: toast.<método> is not a function" — el error apunta acá, no
// al cambio que lo causó.
//
// Evaluamos derivarlo del sonner real con vi.importActual + un Proxy que
// envuelve cada método existente en un spy, para que cualquier método real
// quede cubierto automáticamente y un typo (ej. toast.warn, que no existe)
// siga explotando igual que en producción. Funciona — se probó con un
// Proxy + Map cacheando los spies por nombre de método — pero se descartó
// por legibilidad: hoy hay un solo componente con toasts, y el costo de
// leer un Proxy+Map para entender este mock supera al de extenderlo a mano
// mientras eso siga siendo cierto. Revisar cuando haya un segundo
// componente testeado con toasts.
vi.mock("sonner", () => ({
  toast: {
    error: (...args: unknown[]) => toastErrorMock(...args),
    info: (...args: unknown[]) => toastInfoMock(...args),
  },
}));

// El objeto de trip vive dentro del factory (no como const externa) porque
// vi.mock se hoistea por encima de las declaraciones top-level del archivo.
vi.mock("@/api", () => ({
  getTrip: vi.fn().mockResolvedValue({
    id: "trip-1",
    route: {
      id: "route-1",
      origin_stop: { id: "stop-ar", name: "Retiro", country: "AR", province: null, created_at: "" },
      destination_stop: { id: "stop-py", name: "Asunción", country: "PY", province: null, created_at: "" },
    },
    departure_at: "2026-09-01T10:00:00Z",
    arrival_at: "2026-09-01T20:00:00Z",
    status: "scheduled",
    available_seats_count: 10,
    current_price_cama: 20000,
    current_price_semi_cama: 15000,
  }),
  getTripSeats: vi.fn().mockResolvedValue([]),
}));

describe("AsientosContent — ?passengers ausente/inválido (LLE-336)", () => {
  beforeEach(() => {
    pushMock.mockReset();
    toastErrorMock.mockReset();
  });

  it("redirige a /resultados y no renderiza el selector cuando falta ?passengers", async () => {
    mockSearchParams = new URLSearchParams(); // sin "passengers"

    const { container } = render(<AsientosContent tripId="trip-1" />);

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/resultados");
    });
    expect(toastErrorMock).toHaveBeenCalledWith(
      "No pudimos recuperar tu búsqueda. Buscá tu viaje de nuevo."
    );
    // El componente retorna null mientras el redirect está en curso — no
    // debe flashear el selector de asientos sin tope.
    expect(container).toBeEmptyDOMElement();
  });

  it("redirige a /resultados cuando ?passengers no es un número válido", async () => {
    mockSearchParams = new URLSearchParams("passengers=abc");

    render(<AsientosContent tripId="trip-1" />);

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/resultados");
    });
  });

  it("redirige a /resultados cuando ?passengers es 0", async () => {
    mockSearchParams = new URLSearchParams("passengers=0");

    render(<AsientosContent tripId="trip-1" />);

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/resultados");
    });
  });

  it("NO redirige cuando ?passengers es válido", async () => {
    mockSearchParams = new URLSearchParams("passengers=2");

    render(<AsientosContent tripId="trip-1" />);

    // Le damos tiempo a los effects a correr; el redirect no debe dispararse.
    await waitFor(() => {
      expect(toastErrorMock).not.toHaveBeenCalled();
    });
    expect(pushMock).not.toHaveBeenCalled();
  });
});

describe("AsientosContent — formatDateTime en medianoche (LLE-374)", () => {
  beforeEach(() => {
    pushMock.mockReset();
    toastErrorMock.mockReset();
  });

  it("muestra 00:00, no 24:00, cuando la salida es medianoche en hora argentina", async () => {
    mockSearchParams = new URLSearchParams("passengers=1");
    vi.mocked(getTrip).mockResolvedValueOnce({
      id: "trip-1",
      route: {
        id: "route-1",
        origin_stop: { id: "stop-ar", name: "Retiro", country: "AR", province: null, created_at: "" },
        destination_stop: { id: "stop-py", name: "Asunción", country: "PY", province: null, created_at: "" },
      },
      // 03:00Z = 00:00 en America/Argentina/Buenos_Aires (-03:00).
      departure_at: "2026-01-01T03:00:00Z",
      arrival_at: "2026-01-01T13:00:00Z",
      status: "scheduled",
      available_seats_count: 10,
      current_price_cama: 20000,
      current_price_semi_cama: 15000,
    });

    const { container } = render(<AsientosContent tripId="trip-1" />);

    await waitFor(() => {
      expect(container.textContent).toContain("00:00");
    });
    expect(container.textContent).not.toContain("24:00");
  });
});

// LLE-355 (Bug 1): al tope de pasajeros, un click en un asiento nuevo debía
// reemplazar en silencio la selección más vieja. Ahora se bloquea y se avisa
// con toast.info — el usuario tiene que deseleccionar uno primero.
describe("AsientosContent — tope de asientos (LLE-355)", () => {
  beforeEach(() => {
    pushMock.mockReset();
    toastErrorMock.mockReset();
    toastInfoMock.mockReset();
    mockSearchParams = new URLSearchParams("passengers=2");
    vi.mocked(getTrip).mockResolvedValue({
      id: "trip-1",
      route: {
        id: "route-1",
        origin_stop: { id: "stop-ar", name: "Retiro", country: "AR", province: null, created_at: "" },
        destination_stop: { id: "stop-py", name: "Asunción", country: "PY", province: null, created_at: "" },
      },
      departure_at: "2026-09-01T10:00:00Z",
      arrival_at: "2026-09-01T20:00:00Z",
      status: "scheduled",
      available_seats_count: 10,
      current_price_cama: 20000,
      current_price_semi_cama: 15000,
      // seat_layout_supported: solo GET /trips/{id} lo calcula (no la lista).
      // Sin esto layoutUnsupported queda true y el grid no se renderiza.
      seat_layout_supported: true,
    });
    vi.mocked(getTripSeats).mockResolvedValue([
      { id: "seat-1", seat_number: "1", seat_type: "cama", status: "available" },
      { id: "seat-2", seat_number: "2", seat_type: "cama", status: "available" },
      { id: "seat-3", seat_number: "3", seat_type: "cama", status: "available" },
    ]);
  });

  it("bloquea el click al tope: no reemplaza la selección más vieja y avisa con toast.info", async () => {
    render(<AsientosContent tripId="trip-1" />);
    const user = userEvent.setup();

    // esperar a que el grid esté montado (asiento "1" visible como botón)
    const seat1 = await screen.findByRole("button", { name: "1" });
    const seat2 = await screen.findByRole("button", { name: "2" });
    const seat3 = await screen.findByRole("button", { name: "3" });

    // llegar al tope: 2 de 2
    await user.click(seat1);
    await user.click(seat2);

    // act: click en un tercer asiento, distinto a los ya elegidos
    await user.click(seat3);

    // assert: la selección no cambió — "1" y "2" siguen elegidos, "3" no
    // entró. Lo verificamos por estilo (background primario = seleccionado),
    // que es el único indicador visible de selección en este componente.
    expect(seat1).toHaveStyle({ background: "var(--color-primary)" });
    expect(seat2).toHaveStyle({ background: "var(--color-primary)" });
    expect(seat3).not.toHaveStyle({ background: "var(--color-primary)" });

    // el aviso salió, no un error, y dice cómo salir
    expect(toastErrorMock).not.toHaveBeenCalled();
    expect(toastInfoMock).toHaveBeenCalledWith(
      "Ya seleccionaste tus 2 asientos. Tocá uno para deseleccionarlo si querés cambiarlo."
    );
  });

  it("deseleccionar uno y clickear otro sí funciona (el usuario tiene salida)", async () => {
    render(<AsientosContent tripId="trip-1" />);
    const user = userEvent.setup();

    const seat1 = await screen.findByRole("button", { name: "1" });
    const seat2 = await screen.findByRole("button", { name: "2" });
    const seat3 = await screen.findByRole("button", { name: "3" });

    await user.click(seat1);
    await user.click(seat2);
    // deseleccionar "1"
    await user.click(seat1);
    // ahora hay lugar: "3" debe poder seleccionarse
    await user.click(seat3);

    expect(seat1).not.toHaveStyle({ background: "var(--color-primary)" });
    expect(seat2).toHaveStyle({ background: "var(--color-primary)" });
    expect(seat3).toHaveStyle({ background: "var(--color-primary)" });
    expect(toastInfoMock).not.toHaveBeenCalled();
  });
});
