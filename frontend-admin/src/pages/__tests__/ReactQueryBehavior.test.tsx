import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import BookingsPage from "@/pages/BookingsPage";
import TripsPage from "@/pages/TripsPage";

// ─── API mocks ───────────────────────────────────────────────────────────────

const getBookingsMock = vi.fn();
vi.mock("@/api/bookings", () => ({
  getBookings: (...args: unknown[]) => getBookingsMock(...args),
}));

const getAdminTripsMock = vi.fn();
const getSeatLayoutsMock = vi.fn();
const deleteTripMock = vi.fn();
const createTripMock = vi.fn();
vi.mock("@/api/trips", () => ({
  getAdminTrips: () => getAdminTripsMock(),
  getSeatLayouts: () => getSeatLayoutsMock(),
  deleteTrip: (...args: unknown[]) => deleteTripMock(...args),
  createTrip: (...args: unknown[]) => createTripMock(...args),
}));

const getRoutesMock = vi.fn();
vi.mock("@/api/routes", () => ({
  getRoutes: () => getRoutesMock(),
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock("@/pages/CreateBatchTripsDialog", () => ({
  default: () => null,
}));

const navigateMock = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>(
    "react-router-dom"
  );
  return { ...actual, useNavigate: () => navigateMock };
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
}

function renderBookings() {
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <MemoryRouter>
        <BookingsPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

function renderTrips() {
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <MemoryRouter>
        <TripsPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

// ─── Fixtures ────────────────────────────────────────────────────────────────

const ROUTE_A = {
  id: "route-a",
  origin_stop: { id: "s1", name: "Buenos Aires", country: "AR" },
  destination_stop: { id: "s2", name: "Asunción", country: "PY" },
};

const ROUTE_B = {
  id: "route-b",
  origin_stop: { id: "s3", name: "Rosario", country: "AR" },
  destination_stop: { id: "s4", name: "Encarnación", country: "PY" },
};

function makeTrip(id: string, route: typeof ROUTE_A, departureAt: string) {
  return {
    id,
    route,
    seat_layout_id: "layout-1",
    departure_at: departureAt,
    arrival_at: "2099-01-02T10:00:00-03:00",
    status: "scheduled" as const,
    price_tranches_summary: {
      cama: { is_complete: true, total: 2 },
      semi_cama: { is_complete: true, total: 4 },
    },
  };
}

const BOOKING_CONFIRMED = {
  id: "booking-aaa",
  status: "confirmed",
  contact_email: "juan@example.com",
  total_amount: 50000,
  passengers: [{ id: "p1" }],
  created_at: "2026-07-01T12:00:00-03:00",
};

const BOOKING_PENDING = {
  id: "booking-bbb",
  status: "pending_payment",
  contact_email: "maria@example.com",
  total_amount: 30000,
  passengers: [{ id: "p2" }],
  created_at: "2026-07-02T09:00:00-03:00",
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("BookingsPage — comportamiento de React Query", () => {
  beforeEach(() => {
    getBookingsMock.mockReset();
    navigateMock.mockReset();
  });

  it("bookings_fetch_inicial_con_filtro_all — llama getBookings sin parámetros y renderiza filas", async () => {
    getBookingsMock.mockResolvedValue([BOOKING_CONFIRMED, BOOKING_PENDING]);

    renderBookings();

    await waitFor(() => {
      expect(screen.getByText("juan@example.com")).toBeInTheDocument();
    });

    expect(getBookingsMock).toHaveBeenCalledTimes(1);
    expect(getBookingsMock).toHaveBeenCalledWith();
    expect(screen.getByText("maria@example.com")).toBeInTheDocument();
  });

  it("bookings_refetch_al_cambiar_filtro — click en Confirmadas llama getBookings con booking_status confirmed", async () => {
    getBookingsMock
      .mockResolvedValueOnce([BOOKING_CONFIRMED, BOOKING_PENDING])
      .mockResolvedValueOnce([BOOKING_CONFIRMED]);

    renderBookings();

    await waitFor(() => {
      expect(screen.getByText("juan@example.com")).toBeInTheDocument();
    });

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Confirmadas" }));

    await waitFor(() => {
      expect(getBookingsMock).toHaveBeenCalledWith({ booking_status: "confirmed" });
    });

    expect(screen.getByText("juan@example.com")).toBeInTheDocument();
    expect(screen.queryByText("maria@example.com")).not.toBeInTheDocument();
  });

  it("bookings_muestra_skeleton_durante_loading — no renderiza filas de datos mientras carga", async () => {
    getBookingsMock.mockReturnValue(new Promise(() => {}));

    renderBookings();

    expect(screen.queryByRole("cell", { name: /@/ })).not.toBeInTheDocument();
    expect(getBookingsMock).toHaveBeenCalledTimes(1);
  });
});

describe("TripsPage — comportamiento de React Query", () => {
  beforeEach(() => {
    getAdminTripsMock.mockReset();
    getSeatLayoutsMock.mockReset();
    getRoutesMock.mockReset();
    navigateMock.mockReset();

    getSeatLayoutsMock.mockResolvedValue([]);
    getRoutesMock.mockResolvedValue([]);
  });

  it("trips_renderiza_grupos_por_ruta — 2 trips de ruta A y 1 de ruta B generan 2 cabeceras de grupo", async () => {
    getAdminTripsMock.mockResolvedValue([
      makeTrip("t1", ROUTE_A, "2099-01-01T08:00:00-03:00"),
      makeTrip("t2", ROUTE_A, "2099-01-02T08:00:00-03:00"),
      makeTrip("t3", ROUTE_B, "2099-01-01T09:00:00-03:00"),
    ]);

    renderTrips();

    await waitFor(() => {
      expect(screen.getByText("Buenos Aires → Asunción")).toBeInTheDocument();
    });

    expect(screen.getByText("Rosario → Encarnación")).toBeInTheDocument();
    // Solo 2 cabeceras de grupo (los trips individuales están colapsados)
    expect(screen.getAllByText(/→/).length).toBe(2);
  });

  it("trips_muestra_loading_mientras_carga — no renderiza grupos mientras getAdminTrips no resuelve", async () => {
    getAdminTripsMock.mockReturnValue(new Promise(() => {}));

    renderTrips();

    expect(screen.queryByText("Buenos Aires → Asunción")).not.toBeInTheDocument();
    expect(getAdminTripsMock).toHaveBeenCalledTimes(1);
  });
});
