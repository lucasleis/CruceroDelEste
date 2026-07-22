import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ConfiguracionPage from "@/pages/ConfiguracionPage";

// sonner
const toastErrorMock = vi.fn();
vi.mock("sonner", () => ({
  toast: { error: (...args: unknown[]) => toastErrorMock(...args), success: vi.fn() },
}));

// @tanstack/react-query — controlamos los datos devueltos sin QueryClientProvider
const useQueryMock = vi.fn();
vi.mock("@tanstack/react-query", () => ({
  useQuery: (...args: unknown[]) => useQueryMock(...args),
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));

// API de paradas
const deleteStopMock = vi.fn();
vi.mock("@/api/stops", () => ({
  getStops: vi.fn(),
  createStop: vi.fn(),
  deleteStop: (...args: unknown[]) => deleteStopMock(...args),
  updateStop: vi.fn(),
}));

// API de rutas
const createRouteMock = vi.fn();
vi.mock("@/api/routes", () => ({
  getRoutes: vi.fn(),
  createRoute: (...args: unknown[]) => createRouteMock(...args),
  deleteRoute: vi.fn(),
  getRouteStops: vi.fn(),
  addRouteStop: vi.fn(),
  removeRouteStop: vi.fn(),
  reorderRouteStops: vi.fn(),
}));

// Radix UI Select es problemático en jsdom: reemplazamos con <select> nativo
// para poder usar userEvent.selectOptions y testear la lógica sin depender del portal
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

// --- fixtures ---

const STOP_AR = { id: "ar-1", name: "Retiro", country: "AR", province: "Buenos Aires", created_at: "" };
const STOP_PY = { id: "py-1", name: "Asunción", country: "PY", province: "Central", created_at: "" };
const MOCK_STOPS = [STOP_AR, STOP_PY];

// --- helpers ---

function setupQueries() {
  useQueryMock.mockImplementation(({ queryKey }: { queryKey: unknown[] }) => {
    if (queryKey[1] === "stops") return { data: MOCK_STOPS, isLoading: false };
    // rutas directas (queryKey[3] sería "stops" para routeStops sub-query)
    if (queryKey[1] === "routes" && queryKey[3] !== "stops") return { data: [], isLoading: false };
    return { data: undefined, isLoading: false };
  });
}

beforeEach(() => {
  toastErrorMock.mockReset();
  deleteStopMock.mockReset();
  createRouteMock.mockReset();
  useQueryMock.mockReset();
});

// ---------------------------------------------------------------------------
// Validación AR↔PY client-side
// ---------------------------------------------------------------------------

describe("ConfiguracionPage — validación AR↔PY client-side", () => {
  it("validacion_arpy_rechaza_mismo_pais", async () => {
    const user = userEvent.setup();
    setupQueries();
    render(<ConfiguracionPage />);

    // abrir dialog de crear ruta
    await user.click(screen.getByRole("button", { name: /Agregar ruta/ }));

    // seleccionar origen AR y destino AR (mismo país — debe disparar error inline)
    const [originSelect, destinationSelect] = screen.getAllByRole("combobox");
    await user.selectOptions(originSelect, "ar-1");
    await user.selectOptions(destinationSelect, "ar-1");

    await user.click(screen.getByRole("button", { name: /Guardar/ }));

    expect(
      screen.getByText("Las rutas deben ser internacionales (AR → PY o PY → AR)."),
    ).toBeInTheDocument();
    expect(createRouteMock).not.toHaveBeenCalled();
  });

  it("validacion_arpy_permite_internacional", async () => {
    const user = userEvent.setup();
    setupQueries();
    createRouteMock.mockResolvedValue({ id: "route-new" });
    render(<ConfiguracionPage />);

    await user.click(screen.getByRole("button", { name: /Agregar ruta/ }));

    const [originSelect, destinationSelect] = screen.getAllByRole("combobox");
    await user.selectOptions(originSelect, "ar-1");
    await user.selectOptions(destinationSelect, "py-1");

    await user.click(screen.getByRole("button", { name: /Guardar/ }));

    expect(
      screen.queryByText("Las rutas deben ser internacionales (AR → PY o PY → AR)."),
    ).not.toBeInTheDocument();
    expect(createRouteMock).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// Manejo de errores 409
// ---------------------------------------------------------------------------

describe("ConfiguracionPage — manejo de 409", () => {
  it("error_409_stop_in_use", async () => {
    const user = userEvent.setup();
    setupQueries();
    deleteStopMock.mockRejectedValue(
      Object.assign(new Error(), { response: { status: 409 } }),
    );
    render(<ConfiguracionPage />);

    // la fila de Retiro tiene 2 buttons: [0] editar, [1] eliminar
    const row = screen.getByText("Retiro").closest("tr");
    const deleteBtn = within(row ?? document.body).getAllByRole("button")[1];
    await user.click(deleteBtn);

    // dialog de confirmación
    expect(screen.getByText("¿Eliminar esta parada?")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Eliminar/ }));

    expect(toastErrorMock).toHaveBeenCalledWith(
      "No se puede eliminar: la parada está siendo usada en una ruta.",
    );
  });

  it("error_409_route_already_exists", async () => {
    const user = userEvent.setup();
    setupQueries();
    createRouteMock.mockRejectedValue(
      Object.assign(new Error(), { response: { status: 409 } }),
    );
    render(<ConfiguracionPage />);

    await user.click(screen.getByRole("button", { name: /Agregar ruta/ }));

    // origen AR + destino PY → pasa validación client-side → llama API → 409
    const [originSelect, destinationSelect] = screen.getAllByRole("combobox");
    await user.selectOptions(originSelect, "ar-1");
    await user.selectOptions(destinationSelect, "py-1");

    await user.click(screen.getByRole("button", { name: /Guardar/ }));

    expect(toastErrorMock).toHaveBeenCalledWith("Esta ruta ya existe.");
  });
});
