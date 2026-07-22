import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AsientosContent } from "../AsientosContent";

// "3" y "4" verificados en PLANTA_ALTA fila 0: ["3", "4", { label: "TV" }, "2", "1"]

const mockPush = vi.hoisted(() => vi.fn());
const mockSearchParamsGet = vi.hoisted(() => vi.fn());
const mockGetTrip = vi.hoisted(() => vi.fn());
const mockGetTripSeats = vi.hoisted(() => vi.fn());
const mockToastError = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => ({ get: mockSearchParamsGet }),
}));

vi.mock("@/api", () => ({
  getTrip: mockGetTrip,
  getTripSeats: mockGetTripSeats,
}));

vi.mock("sonner", () => ({
  toast: { error: mockToastError },
}));

const MOCK_TRIP = {
  route: {
    origin_stop: { name: "Retiro" },
    destination_stop: { name: "Asunción" },
  },
  departure_at: "2026-08-01T20:00:00Z",
  arrival_at: "2026-08-02T13:00:00Z",
  current_price_cama: 50000,
  current_price_semi_cama: 30000,
};

const SEAT_3 = { id: "uuid-seat-3", seat_number: "3", status: "available", seat_type: "semi_cama" };
const SEAT_4 = { id: "uuid-seat-4", seat_number: "4", status: "available", seat_type: "semi_cama" };

function setupRender({
  seats = [SEAT_3, SEAT_4],
  passengers = "2",
}: {
  seats?: object[];
  passengers?: string | null;
} = {}) {
  mockGetTrip.mockResolvedValue(MOCK_TRIP);
  mockGetTripSeats.mockResolvedValue(seats);
  mockSearchParamsGet.mockImplementation((key: string) =>
    key === "passengers" ? passengers : null,
  );
  render(<AsientosContent tripId="trip-1" />);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("AsientosContent — render del mapa", () => {
  it("renderiza_asientos_disponibles", async () => {
    setupRender();

    const btn3 = await screen.findByRole("button", { name: "3" });
    const btn4 = screen.getByRole("button", { name: "4" });

    expect(btn3).not.toBeDisabled();
    expect(btn4).not.toBeDisabled();
  });

  it("renderiza_asientos_ocupados_sin_interaccion", async () => {
    const user = userEvent.setup();
    setupRender({ seats: [{ ...SEAT_3, status: "reserved" }, SEAT_4] });

    const btn3 = await screen.findByRole("button", { name: "3" });
    expect(btn3).toBeDisabled();

    await user.click(btn3);

    expect(screen.getByText("0 de 2 asientos seleccionados")).toBeInTheDocument();
  });
});

describe("AsientosContent — selección y deselección", () => {
  it("selecciona_asiento_al_clickear", async () => {
    const user = userEvent.setup();
    setupRender();

    await screen.findByRole("button", { name: "3" });
    await user.click(screen.getByRole("button", { name: "3" }));

    expect(screen.getByText("1 de 2 asientos seleccionados")).toBeInTheDocument();
  });

  it("deselecciona_asiento_al_clickear_de_nuevo", async () => {
    const user = userEvent.setup();
    setupRender();

    await screen.findByRole("button", { name: "3" });
    await user.click(screen.getByRole("button", { name: "3" }));
    await user.click(screen.getByRole("button", { name: "3" }));

    expect(screen.getByText("0 de 2 asientos seleccionados")).toBeInTheDocument();
  });

  it("reemplaza_primer_seleccionado_si_se_supera_limite", async () => {
    const user = userEvent.setup();
    setupRender({ passengers: "1" });

    await screen.findByRole("button", { name: "3" });
    await user.click(screen.getByRole("button", { name: "3" }));
    await user.click(screen.getByRole("button", { name: "4" }));

    // con passengerCount=1 el segundo click reemplaza al primero; la selección sigue siendo 1
    expect(screen.getByText("1 de 1 asientos seleccionados")).toBeInTheDocument();
  });
});

describe("AsientosContent — handleContinuar", () => {
  it("handleContinuar_navega_con_seats_y_seat_ids", async () => {
    const user = userEvent.setup();
    setupRender({ passengers: "2" });

    await screen.findByRole("button", { name: "3" });
    await user.click(screen.getByRole("button", { name: "3" }));
    await user.click(screen.getByRole("button", { name: "4" }));
    await user.click(screen.getByRole("button", { name: /Continuar/ }));

    expect(mockPush).toHaveBeenCalledOnce();
    const [calledUrl] = mockPush.mock.calls[0] as [string];
    const params = new URLSearchParams(calledUrl.split("?")[1]);
    expect(params.get("seats")).toBe("3,4");
    expect(params.get("seat_ids")).toBe("uuid-seat-3,uuid-seat-4");
    expect(params.get("passengers")).toBe("2");
  });

  it("handleContinuar_muestra_toast_si_faltan_asientos", async () => {
    const user = userEvent.setup();
    setupRender({ passengers: "2" });

    await screen.findByRole("button", { name: "3" });
    await user.click(screen.getByRole("button", { name: "3" }));
    await user.click(screen.getByRole("button", { name: /Continuar/ }));

    expect(mockToastError).toHaveBeenCalledOnce();
    expect(mockPush).not.toHaveBeenCalled();
  });
});
