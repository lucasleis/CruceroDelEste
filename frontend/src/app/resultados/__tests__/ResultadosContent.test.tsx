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

  // test B: filtro cama deja pasar trip con cama y bloquea trip sin cama
  //
  // Sabotaje de lógica: en applyFilters, cambiar
  //   if (seatType === "cama") return trip.current_price_cama !== null;
  // por
  //   if (seatType === "cama") return trip.current_price_cama === null;
  // Resultado: el trip con cama queda bloqueado y el sin cama pasa →
  //   "09:00" desaparece, "11:00" permanece → test falla.
  it("filtro 'Cama' deja pasar trip con cama y bloquea trip sin cama", async () => {
    // 12:00Z = 09:00 AR → departure time "09:00" en TripCard (trip con cama)
    // 14:00Z = 11:00 AR → departure time "11:00" en TripCard (trip solo semi-cama)
    const tripCama = makeTripRead({
      id: "t-cama",
      departure_at: "2026-09-01T12:00:00Z",
      arrival_at: "2026-09-01T22:00:00Z",
      current_price_cama: 25000,
      current_price_semi_cama: null,
    });
    const tripSemiCama = makeTripRead({
      id: "t-semi",
      departure_at: "2026-09-01T14:00:00Z",
      arrival_at: "2026-09-02T04:00:00Z",
      current_price_cama: null,
      current_price_semi_cama: 18000,
    });
    vi.mocked(searchTrips).mockResolvedValueOnce([tripCama, tripSemiCama]);

    render(<ResultadosContent />);

    await waitFor(() => {
      expect(screen.getByText("Cama")).toBeInTheDocument();
    });

    // Ambos trips visibles antes del filtro
    expect(screen.getAllByText("09:00").length).toBeGreaterThan(0);
    expect(screen.getAllByText("11:00").length).toBeGreaterThan(0);

    // "Cama" aparece también en el SeatTypeBadge de TripCard → usar el
    // checkbox por role para apuntar exclusivamente al FilterPanel.
    await userEvent.click(screen.getByRole("checkbox", { name: "Cama" }));

    await waitFor(() => {
      // Trip sin cama queda bloqueado — su departure time desaparece del DOM
      expect(screen.queryAllByText("11:00")).toHaveLength(0);
    });
    // Trip con cama sigue visible
    expect(screen.getAllByText("09:00").length).toBeGreaterThan(0);
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
    // trip también. Confirmar que la TripCard está renderizada.
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

  // test C: filtro noche — incluye 23:00 y 02:00 AR, excluye 06:00 AR (mañana)
  //
  // Sabotaje de lógica: en matchesPeriod, cambiar
  //   return hour >= 18 || hour < 5;   (night)
  // por
  //   return hour >= 18 && hour < 5;   (imposible → nunca noche)
  // Resultado: 23:00 (hour=23) y 02:00 (hour=2) dejan de ser noche →
  //   los tres trips quedan filtrados → "Ningún viaje coincide" aparece y
  //   el assert "06:00 ausente" se cumple por razón incorrecta → test falla.
  it("filtro 'Noche' incluye trips de 23:00 y 02:00 AR, excluye trip de 06:00 AR", async () => {
    // 02:00Z = 23:00 AR del 31/08. hour=23 ≥ 18 → noche ✓
    // 05:00Z = 02:00 AR del 01/09. hour=2  < 5  → noche ✓
    // 09:00Z = 06:00 AR del 01/09. hour=6 ∈ [5,12) → mañana ✗
    const tripNight23 = makeTripRead({
      id: "t-night23",
      departure_at: "2026-09-01T02:00:00Z",
      arrival_at: "2026-09-01T13:00:00Z",
    });
    const tripNight02 = makeTripRead({
      id: "t-night02",
      departure_at: "2026-09-01T05:00:00Z",
      arrival_at: "2026-09-01T15:00:00Z",
    });
    const tripMorning06 = makeTripRead({
      id: "t-morning06",
      departure_at: "2026-09-01T09:00:00Z",
      arrival_at: "2026-09-01T20:00:00Z",
    });
    vi.mocked(searchTrips).mockResolvedValueOnce([tripNight23, tripNight02, tripMorning06]);

    render(<ResultadosContent />);

    await waitFor(() => {
      expect(screen.getByText("Noche (18:00 - 05:00)")).toBeInTheDocument();
    });

    // Antes del filtro: el trip de mañana (06:00 AR) está en el DOM
    expect(screen.getAllByText("06:00").length).toBeGreaterThan(0);

    await userEvent.click(screen.getByText("Noche (18:00 - 05:00)"));

    await waitFor(() => {
      // 06:00 AR (mañana) ausente del DOM — excluido por filtro noche
      expect(screen.queryAllByText("06:00")).toHaveLength(0);
    });
    // 23:00 y 02:00 AR (noche) siguen visibles
    expect(screen.getAllByText("23:00").length).toBeGreaterThan(0);
    expect(screen.getAllByText("02:00").length).toBeGreaterThan(0);
  });

  // test D: trip excluido completamente ausente del DOM (ningún elemento)
  //
  // Sabotaje de lógica: cambiar en el render
  //   const cardProps = useMemo(() => filteredTrips.map(mapTripToCardProps), ...
  //   filteredTrips.map((trip, index) => (
  // por
  //   const cardProps = useMemo(() => trips.map(mapTripToCardProps), ...
  //   trips.map((trip, index) => (
  // Resultado: todos los trips se renderizan sin importar el filtro →
  //   "15:00" sigue en el DOM → test falla.
  it("un trip excluido por filtro no tiene ningún elemento en el DOM", async () => {
    // 11:00Z = 08:00 AR (mañana) — pasa el filtro morning
    // 18:00Z = 15:00 AR (tarde)  — queda excluido por el filtro morning
    const tripMorning = makeTripRead({
      id: "t-m",
      departure_at: "2026-09-01T11:00:00Z",
      arrival_at: "2026-09-01T20:00:00Z",
    });
    const tripAfternoon = makeTripRead({
      id: "t-a",
      departure_at: "2026-09-01T18:00:00Z",
      arrival_at: "2026-09-02T04:00:00Z",
    });
    vi.mocked(searchTrips).mockResolvedValueOnce([tripMorning, tripAfternoon]);

    render(<ResultadosContent />);

    await waitFor(() => {
      expect(screen.getByText("Mañana (05:00 - 12:00)")).toBeInTheDocument();
    });

    // Antes del filtro ambas departure times visibles
    expect(screen.getAllByText("08:00").length).toBeGreaterThan(0);
    expect(screen.getAllByText("15:00").length).toBeGreaterThan(0);

    await userEvent.click(screen.getByText("Mañana (05:00 - 12:00)"));

    await waitFor(() => {
      // Trip de tarde completamente ausente del DOM
      expect(screen.queryAllByText("15:00")).toHaveLength(0);
    });
    // Trip de mañana sigue presente
    expect(screen.getAllByText("08:00").length).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────
// Test E: dos ramas vacías distinguibles — desktop
// ─────────────────────────────────────────────────────────

describe("ResultadosContent — ramas vacías distinguibles (E)", () => {
  beforeEach(() => {
    pushMock.mockReset();
    backMock.mockReset();
    Object.defineProperty(window, "innerWidth", { value: 1200, configurable: true });
    mockSearchParams = new URLSearchParams(
      "origin=Retiro&destination=Asunci%C3%B3n&date=2026-09-01&passengers=1"
    );
  });

  // test E
  //
  // Sabotaje de lógica: en el bloque de trips vacíos sin filtro (trips.length === 0),
  // cambiar la condición a filteredTrips.length === 0. Esto colapsa las dos ramas:
  // cuando hay un trip y el filtro lo elimina, AMBOS bloques se activan (el primero
  // porque filteredTrips.length === 0, el segundo igual) y el segundo muestra
  // "Ningún viaje coincide" junto con el primero "No encontramos viajes" → la rama 2
  // del test falla porque queryByText("No encontramos viajes").not.toBeInDocument falla.
  it("sin trips → 'No encontramos viajes'; trips con filtro activo → 'Ningún viaje coincide'", async () => {
    // Rama 1: sin trips (trips.length === 0)
    vi.mocked(searchTrips).mockResolvedValueOnce([]);
    const { unmount } = render(<ResultadosContent />);
    await waitFor(() => {
      expect(
        screen.getByText("No encontramos viajes para esta búsqueda.")
      ).toBeInTheDocument();
      expect(
        screen.queryByText("Ningún viaje coincide con los filtros aplicados.")
      ).not.toBeInTheDocument();
    });
    unmount();

    // Rama 2: hay trips, pero el filtro los elimina todos (filteredTrips.length === 0)
    const trip = makeTripRead({ current_price_cama: 25000, current_price_semi_cama: null });
    vi.mocked(searchTrips).mockResolvedValueOnce([trip]);
    render(<ResultadosContent />);
    await waitFor(() => expect(screen.getByText("Semi Cama")).toBeInTheDocument());
    await userEvent.click(screen.getByText("Semi Cama"));
    await waitFor(() => {
      expect(
        screen.getByText("Ningún viaje coincide con los filtros aplicados.")
      ).toBeInTheDocument();
      expect(
        screen.queryByText("No encontramos viajes para esta búsqueda.")
      ).not.toBeInTheDocument();
    });
  });
});

// ─────────────────────────────────────────────────────────
// Test A: toArTime con medianoche — hourCycle h23 garantiza "00:00"
// ─────────────────────────────────────────────────────────

describe("ResultadosContent — formateo de medianoche (A)", () => {
  beforeEach(() => {
    pushMock.mockReset();
    backMock.mockReset();
    Object.defineProperty(window, "innerWidth", { value: 1200, configurable: true });
    mockSearchParams = new URLSearchParams(
      "origin=Retiro&destination=Asunci%C3%B3n&date=2026-01-01&passengers=1"
    );
  });

  // test A
  //
  // Sabotaje de lógica: en toArTime, cambiar
  //   hourCycle: "h23"
  // por
  //   hourCycle: "h24"
  // Resultado: medianoche se formatea como "24:00" en vez de "00:00" →
  //   container.textContent no contiene "00:00" y sí contiene "24:00" → test falla.
  it("trip con salida a medianoche AR muestra '00:00', no '24:00'", async () => {
    // 03:00Z = 00:00 America/Argentina/Buenos_Aires (UTC-3)
    const trip = makeTripRead({
      id: "t-midnight",
      departure_at: "2026-01-01T03:00:00Z",
      arrival_at: "2026-01-01T13:00:00Z",
    });
    vi.mocked(searchTrips).mockResolvedValueOnce([trip]);

    const { container } = render(<ResultadosContent />);

    await waitFor(() => {
      expect(container.textContent).toContain("00:00");
    });
    expect(container.textContent).not.toContain("24:00");
  });
});
