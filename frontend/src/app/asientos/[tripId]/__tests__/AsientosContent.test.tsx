import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { AsientosContent } from "../AsientosContent";
import { getTrip } from "@/api";

// LLE-336: cuando ?passengers falta o es inválido, AsientosContent debe
// redirigir a /resultados en vez de renderizar un selector sin tope de
// asientos. Este test cubre solo esa lógica nueva — cobertura general del
// componente (fetch de trip/seats, selección, etc.) es scope de LLE-358.

const pushMock = vi.fn();
const toastErrorMock = vi.fn();

// mockSearchParams: prefijo "mock" requerido por vitest para poder
// referenciarla dentro del factory de vi.mock (hoisting).
let mockSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
  useSearchParams: () => mockSearchParams,
}));

vi.mock("sonner", () => ({
  toast: {
    error: (...args: unknown[]) => toastErrorMock(...args),
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
      expect(container.textContent).toContain("99:99");
    });
    expect(container.textContent).not.toContain("24:00");
  });
});
