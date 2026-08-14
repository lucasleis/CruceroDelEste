import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SearchBar } from "@/components/search/SearchBar";
import { getStops, getValidDestinations } from "@/api";
import type { StopRead } from "@/types/trips";

vi.mock("@/components/search/TripTypeSelector", () => ({
  TripTypeSelector: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <button
      data-testid="trip-type-toggle"
      onClick={() => onChange(value === "round-trip" ? "one-way" : "round-trip")}
    >
      {value}
    </button>
  ),
}))

vi.mock("@/components/search/DateInput", () => ({
  DateInput: ({ label, onChange }: { label: string; onChange: (d: Date | undefined) => void }) => (
    <button
      aria-label={label}
      type="button"
      onClick={() => onChange(new Date("2026-09-15T12:00:00"))}
    />
  ),
}))

// SearchBar carga el catálogo de paradas via getStops/getValidDestinations
// (src/api/index.ts). Mockeamos la capa de servicio en vez de fetch global:
// getStops() cachea a nivel de módulo entre llamadas reales, lo que rompía
// el aislamiento entre tests cuando se mockeaba fetch (LLE-358). Mockear el
// módulo de servicio evita depender de esa caché por completo — cada test
// controla su propio getStops/getValidDestinations independientemente.
vi.mock("@/api", () => ({
  getStops: vi.fn(),
  getValidDestinations: vi.fn(),
}))

const mockedGetStops = vi.mocked(getStops);
const mockedGetValidDestinations = vi.mocked(getValidDestinations);

const STOPS: StopRead[] = [
  { id: "ar-1", name: "Buenos Aires", country: "AR", province: "Buenos Aires", created_at: "" },
  { id: "py-1", name: "Asunción", country: "PY", province: "Central", created_at: "" },
  { id: "py-2", name: "Encarnación", country: "PY", province: "Itapúa", created_at: "" },
];

describe("SearchBar — validación de búsqueda", () => {
  beforeEach(() => {
    mockedGetStops.mockResolvedValue(STOPS);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("no dispara onSearch y muestra errores cuando faltan origen, destino y fecha", async () => {
    // arrange: catálogo cargado, sin selección del usuario
    const onSearch = vi.fn();
    render(<SearchBar onSearch={onSearch} />);
    await waitFor(() => expect(getStops).toHaveBeenCalled());
    const user = userEvent.setup();

    // act: buscar sin completar nada
    await user.click(screen.getByRole("button", { name: /buscar/i }));

    // assert: la búsqueda se bloquea y aparecen los mensajes de validación
    expect(onSearch).not.toHaveBeenCalled();
    expect(screen.getByText("Seleccioná un origen")).toBeInTheDocument();
    expect(screen.getByText("Seleccioná un destino")).toBeInTheDocument();
  });

  it("al elegir un origen argentino, el destino solo ofrece paradas de Paraguay", async () => {
    // arrange
    const onSearch = vi.fn();
    render(<SearchBar onSearch={onSearch} />);
    const user = userEvent.setup();

    // act: abrir el input de Origen y elegir la provincia argentina "Buenos Aires"
    await user.click(screen.getByText("Origen"));
    // el dropdown de origen muestra la provincia AR una vez que getStops resuelve
    await user.click(await screen.findByText("Buenos Aires", { selector: "div" }));

    // abrir el input de Destino
    await user.click(screen.getByText("Destino"));

    // assert: el destino ofrece Paraguay y oculta las paradas argentinas
    expect(screen.getByText("Paraguay")).toBeInTheDocument();
    expect(screen.getByText(/Asunción/)).toBeInTheDocument();
    expect(screen.queryByText("Argentina")).not.toBeInTheDocument();
  });
});

describe("SearchBar — estados de carga/error de fetchStops", () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it("getStops pendiente → el input de Origen queda deshabilitado y no se abre", async () => {
    // getStops nunca resuelve — loadingStops permanece true
    mockedGetStops.mockReturnValue(new Promise(() => {}));
    const onSearch = vi.fn();
    render(<SearchBar onSearch={onSearch} />);

    // CityInput muestra el placeholder "Cargando..." mientras loadingStops=true
    // (se renderiza siempre, no solo con el dropdown abierto) — es el estado
    // de carga en sí, no una inferencia a partir de un dropdown vacío
    expect(screen.getAllByText("Cargando...")).toHaveLength(2);

    // intentar abrir el dropdown de origen (toggleOpen() es no-op cuando disabled=true)
    await userEvent.setup().click(screen.getByText("Origen"));

    // el dropdown no llegó a montarse: su input de búsqueda no existe en el DOM
    expect(screen.queryByPlaceholderText("Buscar parada...")).not.toBeInTheDocument();
  });

  it("fetchStops falla → el componente renderiza sin lanzar excepción", async () => {
    mockedGetStops.mockRejectedValue(new Error("network error"));
    const onSearch = vi.fn();

    // no debe lanzar durante el render ni el efecto
    render(<SearchBar onSearch={onSearch} />);

    // el componente sigue en pie — los labels están presentes y el estado de
    // error se refleja en el placeholder que CityInput muestra
    expect(screen.getByText("Origen")).toBeInTheDocument();
    expect(screen.getByText("Destino")).toBeInTheDocument();
    // errorStops se refleja en el placeholder de ambos CityInput (Origen y Destino)
    expect(await screen.findAllByText("Error al cargar")).toHaveLength(2);
  });

  it("getValidDestinations falla → destino bloqueado, no se abre a todos", async () => {
    mockedGetStops.mockResolvedValue(STOPS);
    mockedGetValidDestinations.mockRejectedValue(new Error("gateway error"));

    const onSearch = vi.fn();
    render(<SearchBar onSearch={onSearch} />);
    const user = userEvent.setup();

    // abrir origen y seleccionar la parada AR "Buenos Aires" (stop:, no provincia)
    await user.click(screen.getByText("Origen"));
    await user.click(await screen.findByText("└ Buenos Aires"));

    // esperar a que getValidDestinations falle y el estado se actualice —
    // el mensaje de error visible es la evidencia de que el catch corrió
    expect(
      await screen.findByText(/No se pudieron cargar los destinos disponibles/)
    ).toBeInTheDocument();

    // abrir el dropdown de destino
    await user.click(screen.getByText("Destino"));

    // el Set vacío debe bloquear todos los destinos — ninguna parada visible
    expect(screen.queryByText("Argentina")).not.toBeInTheDocument();
    expect(screen.queryByText("Paraguay")).not.toBeInTheDocument();
    expect(screen.queryByText(/Asunción/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Encarnación/)).not.toBeInTheDocument();
  });
});

// LLE-355 (Bug 2): handleOriginStopSelected no tenía token de cancelación.
// Dos cambios de origen en vuelo podían resolver fuera de orden y dejar
// allowedDestinationIds correspondiendo al origen viejo. El test controla
// el orden de resolución a mano (resolve guardado, no setTimeout) para no
// depender de timing real — la misma lección de LLE-373.
describe("SearchBar — carrera al cambiar el origen (LLE-355)", () => {
  const STOPS_TWO_ORIGINS: StopRead[] = [
    ...STOPS,
    { id: "ar-2", name: "La Plata", country: "AR", province: "Buenos Aires", created_at: "" },
  ];

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("resuelve el origen B antes que el A → allowedDestinationIds corresponde a B, no a A", async () => {
    mockedGetStops.mockResolvedValue(STOPS_TWO_ORIGINS);

    const resolvers: Record<string, (value: StopRead[]) => void> = {};
    mockedGetValidDestinations.mockImplementation(
      (originId: string) =>
        new Promise<StopRead[]>((resolve) => {
          resolvers[originId] = resolve;
        })
    );

    const onSearch = vi.fn();
    render(<SearchBar onSearch={onSearch} />);
    const user = userEvent.setup();

    // seleccionar origen A: "Buenos Aires" (ar-1)
    await user.click(screen.getByText("Origen"));
    await user.click(await screen.findByText("└ Buenos Aires"));

    // seleccionar origen B: "La Plata" (ar-2) — sin esperar a que A resuelva
    await user.click(screen.getByText("Origen"));
    await user.click(await screen.findByText("└ La Plata"));

    // ambas requests están en vuelo
    expect(mockedGetValidDestinations).toHaveBeenCalledTimes(2);
    expect(resolvers["ar-1"]).toBeDefined();
    expect(resolvers["ar-2"]).toBeDefined();

    // orden invertido: B (la última selección) resuelve primero, A después
    await act(async () => {
      resolvers["ar-2"]([STOPS[1]]); // B → solo Asunción
    });
    await act(async () => {
      resolvers["ar-1"]([STOPS[1], STOPS[2]]); // A → Asunción + Encarnación, llega tarde
    });

    // abrir destino: debe reflejar lo que trajo B, no lo que trajo A
    await user.click(screen.getByText("Destino"));
    expect(screen.getByText(/Asunción/)).toBeInTheDocument();
    expect(screen.queryByText(/Encarnación/)).not.toBeInTheDocument();
  });
});

describe("SearchBar — validación one-way vs round-trip", () => {
  beforeEach(() => {
    mockedGetStops.mockResolvedValue(STOPS);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("round-trip sin fecha de vuelta → onSearch no llamado", async () => {
    // arrange: estado inicial es round-trip
    const onSearch = vi.fn();
    render(<SearchBar onSearch={onSearch} />);
    const user = userEvent.setup();

    // seleccionar origen: provincia "Buenos Aires" (AR)
    await user.click(screen.getByText("Origen"));
    await user.click(await screen.findByText("Buenos Aires", { selector: "div" }));

    // seleccionar destino: provincia "Central" (PY)
    await user.click(screen.getByText("Destino"));
    await user.click(screen.getByText("Central"));

    // poner fecha de ida (mock llama onChange con una fecha fija)
    await user.click(screen.getByRole("button", { name: "Fecha de ida" }));

    // act: buscar sin fecha de vuelta
    await user.click(screen.getByRole("button", { name: /buscar/i }));

    // assert: la búsqueda se bloquea por falta de fecha de vuelta
    expect(onSearch).not.toHaveBeenCalled();
  });

  it("one-way sin fecha de vuelta → onSearch sí llamado", async () => {
    // arrange
    const onSearch = vi.fn();
    render(<SearchBar onSearch={onSearch} />);
    const user = userEvent.setup();

    // cambiar a one-way
    await user.click(screen.getByTestId("trip-type-toggle"));

    // seleccionar origen: provincia "Buenos Aires" (AR)
    await user.click(screen.getByText("Origen"));
    await user.click(await screen.findByText("Buenos Aires", { selector: "div" }));

    // seleccionar destino: provincia "Central" (PY)
    await user.click(screen.getByText("Destino"));
    await user.click(screen.getByText("Central"));

    // poner fecha de ida
    await user.click(screen.getByRole("button", { name: "Fecha de ida" }));

    // act: buscar sin fecha de vuelta
    await user.click(screen.getByRole("button", { name: /buscar/i }));

    // assert: en one-way la fecha de vuelta no es requerida → onSearch se dispara
    expect(onSearch).toHaveBeenCalledTimes(1);
  });
});
