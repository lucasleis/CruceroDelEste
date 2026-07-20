import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SearchBar } from "@/components/search/SearchBar";
import type { StopRead } from "@/types/trips";

// SearchBar fetches the stop catalogue on mount. We mock global.fetch (the only
// external dependency) so the component logic — client-side validation and the
// AR↔PY opposite-country destination filtering — runs for real.

const STOPS: StopRead[] = [
  { id: "ar-1", name: "Buenos Aires", country: "AR", province: "Buenos Aires", created_at: "" },
  { id: "py-1", name: "Asunción", country: "PY", province: "Central", created_at: "" },
  { id: "py-2", name: "Encarnación", country: "PY", province: "Itapúa", created_at: "" },
];

function mockFetchOk(data: unknown) {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: async () => data,
  } as Response);
}

describe("SearchBar — validación de búsqueda", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", mockFetchOk(STOPS));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("no dispara onSearch y muestra errores cuando faltan origen, destino y fecha", async () => {
    // arrange: catálogo cargado, sin selección del usuario
    const onSearch = vi.fn();
    render(<SearchBar onSearch={onSearch} />);
    await waitFor(() => expect(fetch).toHaveBeenCalled());
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
    await waitFor(() => expect(fetch).toHaveBeenCalled());
    const user = userEvent.setup();

    // act: abrir el input de Origen y elegir la provincia argentina "Buenos Aires"
    await user.click(screen.getByText("Origen"));
    // el dropdown de origen muestra la provincia AR; la seleccionamos
    await user.click(screen.getByText("Buenos Aires", { selector: "div" }));

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
    vi.unstubAllGlobals();
  });

  it("fetchStops pendiente → paradas no visibles en el dropdown de origen", async () => {
    // fetch nunca resuelve — loadingStops permanece true
    vi.stubGlobal("fetch", vi.fn().mockReturnValue(new Promise(() => {})));
    const onSearch = vi.fn();
    render(<SearchBar onSearch={onSearch} />);

    // intentar abrir el dropdown de origen (disabled cuando loadingStops=true)
    await userEvent.setup().click(screen.getByText("Origen"));

    // no debe haber paradas ni encabezados de país en pantalla
    expect(screen.queryByText("Argentina")).not.toBeInTheDocument();
    expect(screen.queryByText("Paraguay")).not.toBeInTheDocument();
  });

  it("fetchStops falla → el componente renderiza sin lanzar excepción", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network error")));
    const onSearch = vi.fn();

    // no debe lanzar durante el render ni el efecto
    render(<SearchBar onSearch={onSearch} />);
    await waitFor(() => expect(fetch).toHaveBeenCalled());

    // el componente sigue en pie — los labels están presentes
    expect(screen.getByText("Origen")).toBeInTheDocument();
    expect(screen.getByText("Destino")).toBeInTheDocument();
  });

  it("getValidDestinations falla → destino bloqueado, no se abre a todos", async () => {
    // /stops → éxito; /stops/.../valid-destinations → falla
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        if (url.includes("valid-destinations")) {
          return Promise.reject(new Error("gateway error"));
        }
        return Promise.resolve({
          ok: true,
          json: async () => STOPS,
        } as Response);
      })
    );

    const onSearch = vi.fn();
    render(<SearchBar onSearch={onSearch} />);
    await waitFor(() => expect(fetch).toHaveBeenCalled());

    const user = userEvent.setup();

    // abrir origen y seleccionar la parada AR "Buenos Aires" (stop:, no provincia)
    await user.click(screen.getByText("Origen"));
    await user.click(screen.getByText("└ Buenos Aires"));

    // esperar a que getValidDestinations falle y el estado se actualice
    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining("valid-destinations"))
    );

    // abrir el dropdown de destino
    await user.click(screen.getByText("Destino"));

    // el Set vacío debe bloquear todos los destinos — ninguna parada visible
    expect(screen.queryByText("Argentina")).not.toBeInTheDocument();
    expect(screen.queryByText("Paraguay")).not.toBeInTheDocument();
    expect(screen.queryByText(/Asunción/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Encarnación/)).not.toBeInTheDocument();
  });
});
