import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import TripDetailPage from "@/pages/TripDetailPage";

// ─── API mocks ───────────────────────────────────────────────────────────────

const getAdminTripMock = vi.fn();
const getSeatLayoutsMock = vi.fn();
const getTripStopOverridesMock = vi.fn();
const initializeTripStopOverridesMock = vi.fn();
const deleteTripStopOverrideMock = vi.fn();
const reorderTripStopOverridesMock = vi.fn();

vi.mock("@/api/trips", () => ({
  getAdminTrip: (...args: unknown[]) => getAdminTripMock(...args),
  getSeatLayouts: () => getSeatLayoutsMock(),
  getTripStopOverrides: (...args: unknown[]) => getTripStopOverridesMock(...args),
  initializeTripStopOverrides: (...args: unknown[]) => initializeTripStopOverridesMock(...args),
  deleteTripStopOverride: (...args: unknown[]) => deleteTripStopOverrideMock(...args),
  reorderTripStopOverrides: (...args: unknown[]) => reorderTripStopOverridesMock(...args),
}));

const getPriceTranchesMock = vi.fn();
vi.mock("@/api/priceTranches", () => ({
  getPriceTranches: (...args: unknown[]) => getPriceTranchesMock(...args),
}));

// ─── Toast mock ───────────────────────────────────────────────────────────────

// vi.hoisted garantiza que las variables estén disponibles cuando vi.mock (hoisted) ejecuta
const { toastErrorMock, toastSuccessMock } = vi.hoisted(() => ({
  toastErrorMock: vi.fn(),
  toastSuccessMock: vi.fn(),
}));
vi.mock("sonner", () => ({
  toast: { error: toastErrorMock, success: toastSuccessMock },
}));

// ─── Child component mocks ───────────────────────────────────────────────────

vi.mock("@/components/trips/EditTripDialog", () => ({
  EditTripDialog: () => null,
}));
vi.mock("@/components/trips/PriceTrancheDialog", () => ({
  PriceTrancheDialog: () => null,
}));
vi.mock("@/components/trips/SeatsDialog", () => ({
  SeatsDialog: () => null,
}));

// ─── Navigation mock ─────────────────────────────────────────────────────────

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

const TRIP_ID = "trip-1";

function renderTripDetail() {
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <MemoryRouter initialEntries={[`/viajes/${TRIP_ID}`]}>
        <Routes>
          <Route path="/viajes/:tripId" element={<TripDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

// ─── Fixtures ────────────────────────────────────────────────────────────────

const LAYOUT = {
  id: "layout-1",
  name: "Layout Test",
  total_cama: 10,
  total_semi_cama: 20,
};

const TRIP = {
  id: TRIP_ID,
  route: {
    id: "route-a",
    origin_stop: { id: "s1", name: "Buenos Aires", country: "AR" },
    destination_stop: { id: "s2", name: "Asunción", country: "PY" },
  },
  seat_layout_id: "layout-1",
  departure_at: "2099-06-01T08:00:00-03:00",
  arrival_at: "2099-06-02T10:00:00-03:00",
  status: "scheduled" as const,
};

const STOP_1 = {
  stop_id: "stop-1",
  name: "Retiro",
  country: "AR",
  order: 0,
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("TripDetailPage", () => {
  beforeEach(() => {
    getAdminTripMock.mockReset();
    getSeatLayoutsMock.mockReset();
    getTripStopOverridesMock.mockReset();
    initializeTripStopOverridesMock.mockReset();
    deleteTripStopOverrideMock.mockReset();
    reorderTripStopOverridesMock.mockReset();
    getPriceTranchesMock.mockReset();
    navigateMock.mockReset();
    toastErrorMock.mockReset();
    toastSuccessMock.mockReset();

    getSeatLayoutsMock.mockResolvedValue([LAYOUT]);
    getPriceTranchesMock.mockResolvedValue([]);
    getTripStopOverridesMock.mockResolvedValue([]);
  });

  describe("Render y estado de error", () => {
    it("renderiza_detalle_del_viaje — muestra nombre de ruta y layout cuando la query resuelve", async () => {
      getAdminTripMock.mockResolvedValue(TRIP);

      renderTripDetail();

      await waitFor(() => {
        expect(screen.getByText("Buenos Aires → Asunción")).toBeInTheDocument();
      });

      expect(screen.getByText(/Layout Test/)).toBeInTheDocument();
      expect(getAdminTripMock).toHaveBeenCalledWith(TRIP_ID);
    });

    it("muestra_viaje_no_encontrado_si_query_falla — renderiza mensaje de error cuando getAdminTrip rechaza", async () => {
      getAdminTripMock.mockRejectedValue(new Error("404"));

      renderTripDetail();

      await waitFor(() => {
        expect(screen.getByText("Viaje no encontrado.")).toBeInTheDocument();
      });
    });
  });

  describe("Operaciones inline — paradas", () => {
    async function renderAndOpenStops(stops = [STOP_1]) {
      getAdminTripMock.mockResolvedValue(TRIP);
      getTripStopOverridesMock.mockResolvedValue(stops);

      const user = userEvent.setup();
      renderTripDetail();

      // Esperar que la página cargue (título visible)
      await waitFor(() => {
        expect(screen.getByText("Buenos Aires → Asunción")).toBeInTheDocument();
      });

      // Abrir el dialog de paradas (activa enabled: stopsOpen)
      await user.click(screen.getByRole("button", { name: "Ver paradas" }));

      return user;
    }

    it("inicializar_paradas_llama_endpoint_correcto — sin paradas cargadas, click en inicializar llama initializeTripStopOverrides", async () => {
      getAdminTripMock.mockResolvedValue(TRIP);
      getTripStopOverridesMock.mockResolvedValue([]); // sin paradas → muestra el botón inicializar
      initializeTripStopOverridesMock.mockResolvedValue(undefined);

      const user = userEvent.setup();
      renderTripDetail();

      await waitFor(() => {
        expect(screen.getByText("Buenos Aires → Asunción")).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: "Ver paradas" }));

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: "Inicializar desde la ruta" })
        ).toBeInTheDocument();
      });

      await user.click(
        screen.getByRole("button", { name: "Inicializar desde la ruta" })
      );

      await waitFor(() => {
        expect(initializeTripStopOverridesMock).toHaveBeenCalledTimes(1);
        expect(initializeTripStopOverridesMock).toHaveBeenCalledWith(TRIP_ID);
      });
    });

    it("error_al_inicializar_muestra_toast — initializeTripStopOverrides rechaza: aparece toast de error", async () => {
      getAdminTripMock.mockResolvedValue(TRIP);
      getTripStopOverridesMock.mockResolvedValue([]);
      initializeTripStopOverridesMock.mockRejectedValue(new Error("500"));

      const user = userEvent.setup();
      renderTripDetail();

      await waitFor(() => {
        expect(screen.getByText("Buenos Aires → Asunción")).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: "Ver paradas" }));

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: "Inicializar desde la ruta" })
        ).toBeInTheDocument();
      });

      await user.click(
        screen.getByRole("button", { name: "Inicializar desde la ruta" })
      );

      await waitFor(() => {
        expect(toastErrorMock).toHaveBeenCalledWith(
          "Error al inicializar las paradas."
        );
      });
    });

    it("eliminar_parada_llama_endpoint_correcto — click en eliminar parada llama deleteTripStopOverride con los ids correctos", async () => {
      deleteTripStopOverrideMock.mockResolvedValue(undefined);
      // Segunda llamada tras invalidateQueries
      getTripStopOverridesMock
        .mockResolvedValueOnce([STOP_1])
        .mockResolvedValue([]);

      const user = await renderAndOpenStops([STOP_1]);

      await waitFor(() => {
        expect(screen.getByText("Retiro")).toBeInTheDocument();
      });

      // Verificación explícita de estructura:
      // Los botones por <li> son siempre 3 (ChevronUp, ChevronDown, Trash2),
      // renderizados incondicionalmente — solo disabled cambia.
      // Con una sola parada: up(disabled), down(disabled), Trash2(enabled) → índice 2.
      const stopLi = screen.getByText("Retiro").closest("li")!;
      const buttons = within(stopLi).getAllByRole("button");
      expect(buttons).toHaveLength(3); // up, down, trash — siempre presentes
      const deleteButton = buttons[2]; // Trash2 es siempre el último

      await user.click(deleteButton);

      await waitFor(() => {
        expect(deleteTripStopOverrideMock).toHaveBeenCalledTimes(1);
        expect(deleteTripStopOverrideMock).toHaveBeenCalledWith(
          TRIP_ID,
          STOP_1.stop_id
        );
      });
    });

    it("error_al_eliminar_parada_muestra_toast — deleteTripStopOverride rechaza: aparece toast de error", async () => {
      deleteTripStopOverrideMock.mockRejectedValue(new Error("500"));
      getTripStopOverridesMock.mockResolvedValue([STOP_1]);

      const user = await renderAndOpenStops([STOP_1]);

      await waitFor(() => {
        expect(screen.getByText("Retiro")).toBeInTheDocument();
      });

      const stopLi = screen.getByText("Retiro").closest("li")!;
      const buttons = within(stopLi).getAllByRole("button");
      expect(buttons).toHaveLength(3);
      const deleteButton = buttons[2];

      await user.click(deleteButton);

      await waitFor(() => {
        expect(toastErrorMock).toHaveBeenCalledWith(
          "Error al eliminar la parada."
        );
      });
    });
  });
});
