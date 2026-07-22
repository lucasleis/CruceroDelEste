import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import CreateBatchTripsDialog from "@/pages/CreateBatchTripsDialog";
import TripsPage from "@/pages/TripsPage";
import type { RouteRead, SeatLayoutRead, AdminTripRead } from "@/types/trips";

// ---------------------------------------------------------------------------
// Fake timers — fijados a 2030-06-15T12:00:00Z (AR = 09:00)
// Necesario para que getArgentinaToday() y handleBatchDelete() sean deterministas.
// ---------------------------------------------------------------------------

beforeAll(() => {
  vi.useFakeTimers({ now: new Date("2030-06-15T12:00:00Z") });
});

afterAll(() => {
  vi.useRealTimers();
});

// ---------------------------------------------------------------------------
// Mocks globales
// ---------------------------------------------------------------------------

const createTripMock = vi.fn();
const deleteTripMock = vi.fn();

vi.mock("@/api/trips", () => ({
  createTrip: (...args: unknown[]) => createTripMock(...args),
  deleteTrip: (...args: unknown[]) => deleteTripMock(...args),
  getAdminTrips: vi.fn(),
  getSeatLayouts: vi.fn(),
}));

vi.mock("@/api/routes", () => ({
  getRoutes: vi.fn(),
}));

const toastSuccessMock = vi.fn();
const toastErrorMock = vi.fn();

vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccessMock(...args),
    error: (...args: unknown[]) => toastErrorMock(...args),
  },
}));

// react-router-dom: useNavigate mockeado para TripsPage
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => vi.fn() };
});

// @tanstack/react-query: useQuery + useQueryClient (solo TripsPage los usa)
const useQueryMock = vi.fn();
vi.mock("@tanstack/react-query", () => ({
  useQuery: (...args: unknown[]) => useQueryMock(...args),
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));

// Radix Select → <select> nativo (igual que ConfiguracionPage.test.tsx)
vi.mock("@/components/ui/select", () => ({
  Select: ({
    value,
    onValueChange,
    children,
  }: {
    value: string;
    onValueChange: (v: string) => void;
    children: React.ReactNode;
  }) => (
    <select value={value} onChange={(e) => onValueChange(e.target.value)}>
      {children}
    </select>
  ),
  SelectTrigger: () => null,
  SelectValue: () => null,
  SelectContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectItem: ({ value, children }: { value: string; children: React.ReactNode }) => (
    <option value={value}>{children}</option>
  ),
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const ROUTE: RouteRead = {
  id: "route-1",
  origin_stop: { id: "s1", name: "Retiro", country: "AR", province: "Buenos Aires", created_at: "" },
  destination_stop: { id: "s2", name: "Asunción", country: "PY", province: "Central", created_at: "" },
  created_at: "",
};

const LAYOUT: SeatLayoutRead = {
  id: "layout-1",
  name: "Layout A",
  total_cama: 20,
  total_semi_cama: 20,
};

// ---------------------------------------------------------------------------
// Helpers — CreateBatchTripsDialog
// ---------------------------------------------------------------------------

function renderDialog(overrides: Partial<React.ComponentProps<typeof CreateBatchTripsDialog>> = {}) {
  const props: React.ComponentProps<typeof CreateBatchTripsDialog> = {
    open: true,
    onOpenChange: vi.fn(),
    routes: [ROUTE],
    seatLayouts: [LAYOUT],
    onSuccess: vi.fn(),
    ...overrides,
  };
  render(<CreateBatchTripsDialog {...props} />);
  return props;
}

/**
 * Llena el form con datos válidos y hace clic en "Continuar".
 * Usa fireEvent.change para evitar conflictos con fake timers en userEvent.
 *
 * Recurrencia: every_n_days, n=2 (default).
 * startDate=2030-06-20, endDate=2030-06-23 → 2 fechas: 2030-06-20 y 2030-06-22.
 */
async function fillAndClickContinuar() {
  const selects = screen.getAllByRole("combobox");
  // Orden en DOM: ruta (0), layout (1), recurrencia (2)
  fireEvent.change(selects[0], { target: { value: "route-1" } });
  fireEvent.change(selects[1], { target: { value: "layout-1" } });

  const timeInputs = document.querySelectorAll('input[type="time"]');
  fireEvent.change(timeInputs[0], { target: { value: "10:00" } });
  fireEvent.change(timeInputs[1], { target: { value: "14:00" } });

  fireEvent.change(selects[2], { target: { value: "every_n_days" } });

  const dateInputs = document.querySelectorAll('input[type="date"]');
  fireEvent.change(dateInputs[0], { target: { value: "2030-06-20" } });
  fireEvent.change(dateInputs[1], { target: { value: "2030-06-23" } });

  fireEvent.click(screen.getByRole("button", { name: /Continuar/ }));

  // Esperar que React renderice el step "confirm"
  await act(async () => {});
}

// ---------------------------------------------------------------------------
// Suite 1 — CreateBatchTripsDialog
// ---------------------------------------------------------------------------

describe("CreateBatchTripsDialog — wizard de creación en serie", () => {
  beforeEach(() => {
    createTripMock.mockReset();
    toastSuccessMock.mockReset();
  });

  it("wizard_muestra_progreso_durante_creacion_y_llama_createTrip_dos_veces", async () => {
    // El primer createTrip queda pendiente para capturar el step "creating".
    let resolveFirst!: () => void;
    createTripMock
      .mockReturnValueOnce(new Promise<void>((res) => { resolveFirst = res; }))
      .mockResolvedValue(undefined);

    const props = renderDialog();
    await fillAndClickContinuar();

    // Step "confirm"
    expect(screen.getByText(/Se van a crear/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Confirmar/ }));

    // Permitir que React procese setStep("creating") antes de que createTrip resuelva
    await act(async () => {});

    // Step "creating" — primer viaje en vuelo, progreso visible
    expect(screen.getByText(/Creando viaje 1 de 2/)).toBeInTheDocument();

    // Resolver el primer viaje y dejar completar el resto
    await act(async () => {
      resolveFirst();
      // Drenar la cadena de microtasks generada por for...of + await
      for (let i = 0; i < 5; i++) await Promise.resolve();
    });

    expect(createTripMock).toHaveBeenCalledTimes(2);
    expect(createTripMock).toHaveBeenCalledWith(
      expect.objectContaining({ departure_at: "2030-06-20T10:00:00-03:00" })
    );
    expect(createTripMock).toHaveBeenCalledWith(
      expect.objectContaining({ departure_at: "2030-06-22T10:00:00-03:00" })
    );
    expect(props.onSuccess).toHaveBeenCalled();
  });

  it("wizard_error_en_createTrip_muestra_step_error_y_llama_onSuccess", async () => {
    createTripMock.mockRejectedValue(new Error("500"));

    const props = renderDialog();
    await fillAndClickContinuar();

    fireEvent.click(screen.getByRole("button", { name: /Confirmar/ }));

    // Drenar microtasks: setStep("creating") → await createTrip (rechazado) → setStep("error")
    await act(async () => {
      for (let i = 0; i < 20; i++) await Promise.resolve();
    });

    expect(screen.getByText(/Error al crear el viaje del/)).toBeInTheDocument();
    expect(screen.getByText(/20\/06\/2030/)).toBeInTheDocument();
    // onSuccess se llama igual (para refrescar la lista con los viajes creados antes del error)
    expect(props.onSuccess).toHaveBeenCalled();
    // Solo intentó el primer viaje, luego cortó
    expect(createTripMock).toHaveBeenCalledTimes(1);
  });

  it("wizard_sin_campos_obligatorios_muestra_error_en_form_y_no_avanza", async () => {
    renderDialog();

    // Click Continuar sin llenar ningún campo
    fireEvent.click(screen.getByRole("button", { name: /Continuar/ }));
    await act(async () => {});

    expect(screen.getByText("Completá todos los campos obligatorios.")).toBeInTheDocument();
    expect(createTripMock).not.toHaveBeenCalled();
    // Sigue en step "form"
    expect(screen.getByRole("button", { name: /Continuar/ })).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Suite 2 — TripsPage batch delete
// ---------------------------------------------------------------------------

function makeTripForBatch(
  id: string,
  opts: { past?: boolean; cancelled?: boolean } = {}
): AdminTripRead {
  const departure = opts.past
    ? "2030-01-01T13:00:00.000Z" // antes del 2030-06-15T12:00:00Z fijado
    : "2030-07-01T13:00:00.000Z"; // después del tiempo fijado
  return {
    id,
    route: ROUTE,
    seat_layout: LAYOUT,
    departure_at: departure,
    arrival_at: "2030-07-02T05:00:00.000Z",
    status: opts.cancelled ? "cancelled" : "active",
    created_at: "",
    available_cama: 20,
    available_semi_cama: 20,
  } as unknown as AdminTripRead;
}

function setupTripsQuery(trips: AdminTripRead[]) {
  useQueryMock.mockImplementation(({ queryKey }: { queryKey: unknown[] }) => {
    if (queryKey[1] === "trips") return { data: trips, isLoading: false };
    if (queryKey[1] === "seat-layouts") return { data: [LAYOUT], isLoading: false };
    if (queryKey[1] === "routes") return { data: [ROUTE], isLoading: false };
    return { data: undefined, isLoading: false };
  });
}

describe("TripsPage — eliminación por lote (batch delete)", () => {
  beforeEach(() => {
    deleteTripMock.mockReset();
    useQueryMock.mockReset();
    toastSuccessMock.mockReset();
    toastErrorMock.mockReset();
  });

  it("batch_delete_elimina_todos_sin_conflicto", async () => {
    const trips = [
      makeTripForBatch("t1"),
      makeTripForBatch("t2"),
      makeTripForBatch("t3"),
    ];
    setupTripsQuery(trips);
    deleteTripMock.mockResolvedValue(undefined);

    render(<TripsPage />);

    fireEvent.click(screen.getByRole("button", { name: /Eliminar futuros/ }));
    await act(async () => {});

    fireEvent.click(screen.getByRole("button", { name: /^Eliminar$/ }));

    // handleBatchDelete usa Promise.all (microtasks), drenar sin setTimeout
    await act(async () => {
      for (let i = 0; i < 10; i++) await Promise.resolve();
    });

    expect(deleteTripMock).toHaveBeenCalledTimes(3);
    // Resultado en el dialog: 3 eliminados, sin salteados
    expect(screen.getByText(/Se eliminaron/)).toBeInTheDocument();
    expect(screen.queryByText(/No se pudieron eliminar/)).not.toBeInTheDocument();
  });

  it("batch_delete_saltea_trip_con_bookings_409", async () => {
    const trips = [makeTripForBatch("t1"), makeTripForBatch("t2")];
    setupTripsQuery(trips);

    deleteTripMock
      .mockResolvedValueOnce(undefined) // t1 eliminado
      .mockRejectedValueOnce(
        Object.assign(new Error(), {
          response: { status: 409, data: { detail: "trip_has_bookings" } },
        })
      ); // t2 salteado

    render(<TripsPage />);

    fireEvent.click(screen.getByRole("button", { name: /Eliminar futuros/ }));
    await act(async () => {});

    fireEvent.click(screen.getByRole("button", { name: /^Eliminar$/ }));

    await act(async () => {
      for (let i = 0; i < 10; i++) await Promise.resolve();
    });

    expect(deleteTripMock).toHaveBeenCalledTimes(2);
    // Dialog: 1 eliminado + mensaje de salteados
    expect(screen.getByText(/Se eliminaron/)).toBeInTheDocument();
    expect(screen.getByText(/No se pudieron eliminar/)).toBeInTheDocument();
  });

  it("batch_delete_ignora_trips_pasados_y_cancelados", async () => {
    const trips = [
      makeTripForBatch("past", { past: true }),
      makeTripForBatch("cancelled", { cancelled: true }),
      makeTripForBatch("future"),
    ];
    setupTripsQuery(trips);
    deleteTripMock.mockResolvedValue(undefined);

    render(<TripsPage />);

    fireEvent.click(screen.getByRole("button", { name: /Eliminar futuros/ }));
    await act(async () => {});

    fireEvent.click(screen.getByRole("button", { name: /^Eliminar$/ }));

    await act(async () => {
      for (let i = 0; i < 10; i++) await Promise.resolve();
    });

    // Solo el viaje futuro y no cancelado fue procesado
    expect(deleteTripMock).toHaveBeenCalledTimes(1);
    expect(deleteTripMock).toHaveBeenCalledWith("future");
  });
});
