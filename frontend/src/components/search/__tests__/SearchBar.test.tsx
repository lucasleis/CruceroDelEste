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
