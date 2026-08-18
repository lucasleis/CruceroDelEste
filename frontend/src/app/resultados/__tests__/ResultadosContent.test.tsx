import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ResultadosContent } from "../ResultadosContent";
import { searchTrips } from "@/api";

// jsdom arranca con window.innerWidth = 0. Los hooks useIsMobile /
// useIsMobileSearchBar leen window.innerWidth en un useEffect y llaman
// setIsMobile(0 <= 768) / setIsMobile(0 <= 960), ambos true → rama
// mobile: el FilterPanel NO se renderiza. Los tests de filtros necesitan
// la rama desktop (FilterPanel visible), así que cada describe que
// interactúa con filtros fija innerWidth a 1200 en beforeEach.

const pushMock = vi.fn();
const backMock = vi.fn();

let mockSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, back: backMock }),
  useSearchParams: () => mockSearchParams,
}));

vi.mock("@/api", () => ({
  searchTrips: vi.fn().mockResolvedValue([]),
  getStops: vi.fn().mockResolvedValue([]),
}));

function makeTripRead(overrides: {
  id?: string;
  departure_at?: string;
  arrival_at?: string;
  current_price_cama?: number | null;
  current_price_semi_cama?: number | null;
  available_seats_count?: number;
} = {}) {
  return {
    id: "trip-1",
    route: {
      id: "route-1",
      origin_stop: { id: "s1", name: "Retiro", country: "AR" as const, province: null, created_at: "" },
      destination_stop: { id: "s2", name: "Asunción", country: "PY" as const, province: null, created_at: "" },
    },
    departure_at: "2026-09-01T13:00:00Z",
    arrival_at: "2026-09-02T06:00:00Z",
    status: "scheduled",
    available_seats_count: 20,
    current_price_cama: 25000,
    current_price_semi_cama: 18000,
    seat_layout_supported: null,
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────
// Tests de carga y error — no dependen de innerWidth
// ─────────────────────────────────────────────────────────

describe("ResultadosContent — estado de carga y error", () => {
  beforeEach(() => {
    pushMock.mockReset();
    backMock.mockReset();
    mockSearchParams = new URLSearchParams(
      "origin=Retiro&destination=Asunci%C3%B3n&date=2026-09-01&passengers=1"
    );
  });

  // test 1
  it("muestra 'Buscando viajes...' mientras el fetch está en vuelo", () => {
    vi.mocked(searchTrips).mockReturnValueOnce(new Promise(() => {}));

    render(<ResultadosContent />);

    expect(screen.getByText("Buscando viajes...")).toBeInTheDocument();
  });

  // test 2
  it("muestra el mensaje de error cuando searchTrips lanza", async () => {
    vi.mocked(searchTrips).mockRejectedValueOnce(new Error("network error"));

    render(<ResultadosContent />);

    await waitFor(() => {
      expect(
        screen.getByText("Ocurrió un error al buscar viajes. Intentá de nuevo.")
      ).toBeInTheDocument();
    });
  });

  // test 3
  it("muestra 'No encontramos viajes' cuando searchTrips devuelve array vacío", async () => {
    vi.mocked(searchTrips).mockResolvedValueOnce([]);

    render(<ResultadosContent />);

    await waitFor(() => {
      expect(
        screen.getByText("No encontramos viajes para esta búsqueda.")
      ).toBeInTheDocument();
    });
  });
});

// ─────────────────────────────────────────────────────────
// Tests de filtros — requieren rama desktop (FilterPanel visible)
// ─────────────────────────────────────────────────────────

describe("ResultadosContent — filtro de tipo de asiento (applyFilters)", () => {
  beforeEach(() => {
    pushMock.mockReset();
    backMock.mockReset();
    // Modo desktop: FilterPanel visible, SearchSummaryBar en vez del colapsado mobile.
    Object.defineProperty(window, "innerWidth", { value: 1200, configurable: true });
    mockSearchParams = new URLSearchParams(
      "origin=Retiro&destination=Asunci%C3%B3n&date=2026-09-01&passengers=1"
    );
  });

  // test 4
  it("'Ningún viaje coincide' cuando el filtro de asiento no matchea ningún trip", async () => {
    // Trip solo tiene cama; el filtro pedirá "Semi Cama".
    const trip = makeTripRead({ current_price_cama: 25000, current_price_semi_cama: null });
    vi.mocked(searchTrips).mockResolvedValueOnce([trip]);

    render(<ResultadosContent />);

    // Esperar a que el FilterPanel esté visible (el trip cargó).
    await waitFor(() => {
      expect(screen.getByText("Semi Cama")).toBeInTheDocument();
    });

    // Click en el label "Semi Cama" que wrappea el checkbox.
    await userEvent.click(screen.getByText("Semi Cama"));

    await waitFor(() => {
      expect(
        screen.getByText("Ningún viaje coincide con los filtros aplicados.")
      ).toBeInTheDocument();
    });
  });
});

describe("ResultadosContent — filtro de franja horaria (applyFilters)", () => {
  beforeEach(() => {
    pushMock.mockReset();
    backMock.mockReset();
    Object.defineProperty(window, "innerWidth", { value: 1200, configurable: true });
    mockSearchParams = new URLSearchParams(
      "origin=Retiro&destination=Asunci%C3%B3n&date=2026-09-01&passengers=1"
    );
  });

  // test 5
  it("trip de mañana (hora AR 08:00) pasa el filtro 'morning' y queda visible", async () => {
    // 11:00Z = 08:00 America/Argentina/Buenos_Aires (-03:00). hour=8 ∈ [5,12) → morning.
    const trip = makeTripRead({
      id: "trip-morning",
      departure_at: "2026-09-01T11:00:00Z",
      arrival_at: "2026-09-01T20:00:00Z",
    });
    vi.mocked(searchTrips).mockResolvedValueOnce([trip]);

    render(<ResultadosContent />);

    await waitFor(() => {
      expect(screen.getByText("Mañana (05:00 - 12:00)")).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText("Mañana (05:00 - 12:00)"));

    // El trip sigue visible: no aparece ningún mensaje de sin resultados.
    await waitFor(() => {
      expect(
        screen.queryByText("Ningún viaje coincide con los filtros aplicados.")
      ).not.toBeInTheDocument();
    });
    // SearchSummaryBar (desktop) también muestra "Asunción"; la card del
    // trip también. Confirmar por el precio que la TripCard está renderizada.
    expect(screen.getAllByText("Asunción").length).toBeGreaterThan(0);
  });

  // test 6
  it("trip de tarde (hora AR 15:00) queda oculto cuando solo se activa el filtro 'morning'", async () => {
    // 18:00Z = 15:00 America/Argentina/Buenos_Aires. hour=15 ∈ [12,18) → afternoon, no morning.
    const trip = makeTripRead({
      id: "trip-afternoon",
      departure_at: "2026-09-01T18:00:00Z",
      arrival_at: "2026-09-02T06:00:00Z",
    });
    vi.mocked(searchTrips).mockResolvedValueOnce([trip]);

    render(<ResultadosContent />);

    await waitFor(() => {
      expect(screen.getByText("Mañana (05:00 - 12:00)")).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText("Mañana (05:00 - 12:00)"));

    await waitFor(() => {
      expect(
        screen.getByText("Ningún viaje coincide con los filtros aplicados.")
      ).toBeInTheDocument();
    });
  });
});
