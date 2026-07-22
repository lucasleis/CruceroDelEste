import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ResultadosContent } from "../ResultadosContent";

const mockPush = vi.hoisted(() => vi.fn());
const mockBack = vi.hoisted(() => vi.fn());
const mockSearchParamsGet = vi.hoisted(() => vi.fn());
const mockSearchTrips = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, back: mockBack }),
  useSearchParams: () => ({ get: mockSearchParamsGet }),
}));

vi.mock("@/api", () => ({
  searchTrips: mockSearchTrips,
}));

vi.mock("@/components/travel/TripCard", () => ({
  TripCard: ({ onSelect }: { onSelect: () => void }) => (
    <button onClick={onSelect}>TripCard</button>
  ),
}));

vi.mock("@/components/travel/FilterPanel", () => ({
  FilterPanel: ({ onFilterChange }: { onFilterChange: (f: unknown) => void }) => (
    <button
      onClick={() =>
        onFilterChange({ seatTypes: ["cama"], departurePeriods: [], amenities: [] })
      }
    >
      Filtrar
    </button>
  ),
}));

// TRIP_1 tiene cama y semi-cama; TRIP_2 solo semi-cama (current_price_cama: null).
// applyFilters con seatTypes: ["cama"] evalúa trip.current_price_cama !== null,
// por lo que TRIP_2 queda excluido sin necesidad de chequear available_seats_count.
const TRIP_1 = {
  id: "trip-1",
  current_price_cama: 50000,
  current_price_semi_cama: 30000,
  departure_at: "2026-08-01T20:00:00Z",
  arrival_at: "2026-08-02T13:00:00Z",
  route: {
    origin_stop: { name: "Retiro" },
    destination_stop: { name: "Asunción" },
  },
  available_seats_count: 10,
};

const TRIP_2 = {
  id: "trip-2",
  current_price_cama: null,
  current_price_semi_cama: 25000,
  departure_at: "2026-08-01T22:00:00Z",
  arrival_at: "2026-08-02T15:00:00Z",
  route: {
    origin_stop: { name: "Retiro" },
    destination_stop: { name: "Asunción" },
  },
  available_seats_count: 5,
};

function setupRender({ trips = [TRIP_1, TRIP_2] }: { trips?: object[] } = {}) {
  mockSearchTrips.mockResolvedValue(trips);
  mockSearchParamsGet.mockImplementation((key: string) => {
    const params: Record<string, string> = {
      origin: "Retiro",
      destination: "Asunción",
      date: "2026-08-01",
      passengers: "2",
      origin_province: "",
      destination_province: "",
    };
    return params[key] ?? null;
  });
  render(<ResultadosContent />);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ResultadosContent — fetch y estados", () => {
  it("renderiza_tripcard_por_cada_resultado", async () => {
    setupRender({ trips: [TRIP_1, TRIP_2] });

    const cards = await screen.findAllByRole("button", { name: "TripCard" });

    expect(cards).toHaveLength(2);
  });

  it("muestra_estado_vacio_sin_resultados", async () => {
    setupRender({ trips: [] });

    await screen.findByText("No encontramos viajes para esta búsqueda.");
  });

  it("muestra_error_de_red", async () => {
    mockSearchTrips.mockRejectedValue(new Error("network"));
    mockSearchParamsGet.mockImplementation((key: string) => {
      const params: Record<string, string> = {
        origin: "Retiro",
        destination: "Asunción",
        date: "2026-08-01",
        passengers: "2",
        origin_province: "",
        destination_province: "",
      };
      return params[key] ?? null;
    });
    render(<ResultadosContent />);

    await screen.findByText("Ocurrió un error al buscar viajes. Intentá de nuevo.");
  });
});

describe("ResultadosContent — filtros", () => {
  it("filtros_eliminan_trips_que_no_coinciden", async () => {
    const user = userEvent.setup();
    // TRIP_1 tiene current_price_cama; TRIP_2 no. El filtro seatTypes: ["cama"]
    // excluye TRIP_2 porque applyFilters chequea trip.current_price_cama !== null.
    setupRender({ trips: [TRIP_1, TRIP_2] });

    await screen.findAllByRole("button", { name: "TripCard" });

    await user.click(screen.getByRole("button", { name: "Filtrar" }));

    const cards = screen.getAllByRole("button", { name: "TripCard" });
    expect(cards).toHaveLength(1);
    expect(
      screen.queryByText("Ningún viaje coincide con los filtros aplicados."),
    ).not.toBeInTheDocument();
  });
});
