import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CityInput } from "@/components/search/CityInput";
import type { StopRead } from "@/types/trips";

// CityInput is where the AR↔PY rule is *visually* enforced on the destination
// field: SearchBar computes the set of opposite-country stop ids and hands it in
// as `allowedStopIds`. This test drives the real dropdown and verifies the user
// can only ever pick a stop from that allowed set.

const STOPS: StopRead[] = [
  { id: "ar-1", name: "Buenos Aires", country: "AR", province: "Buenos Aires", created_at: "" },
  { id: "ar-2", name: "Rosario", country: "AR", province: "Santa Fe", created_at: "" },
  { id: "py-1", name: "Asunción", country: "PY", province: "Central", created_at: "" },
  { id: "py-2", name: "Encarnación", country: "PY", province: "Itapúa", created_at: "" },
];

function renderDestination(
  overrides: Partial<React.ComponentProps<typeof CityInput>> = {},
) {
  return render(
    <CityInput
      label="Destino"
      value=""
      onChange={vi.fn()}
      icon="pin"
      stops={STOPS}
      {...overrides}
    />,
  );
}

describe("CityInput — enforcement AR↔PY via allowedStopIds", () => {
  it("solo muestra paradas del país permitido cuando allowedStopIds está seteado", async () => {
    // arrange: origen argentino → destinos permitidos = solo Paraguay
    const allowed = new Set(["py-1", "py-2"]);
    renderDestination({ allowedStopIds: allowed });
    const user = userEvent.setup();

    // act: abrir el dropdown
    await user.click(screen.getByText("Destino"));

    // assert: aparecen los stops de PY y NO los de AR
    expect(screen.getByText("Paraguay")).toBeInTheDocument();
    expect(screen.getByText(/Asunción/)).toBeInTheDocument();
    expect(screen.getByText(/Encarnación/)).toBeInTheDocument();
    expect(screen.queryByText("Argentina")).not.toBeInTheDocument();
    expect(screen.queryByText(/Buenos Aires/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Rosario/)).not.toBeInTheDocument();
  });

  it("muestra todos los países cuando no hay allowedStopIds", async () => {
    // arrange
    renderDestination();
    const user = userEvent.setup();

    // act
    await user.click(screen.getByText("Destino"));

    // assert
    expect(screen.getByText("Argentina")).toBeInTheDocument();
    expect(screen.getByText("Paraguay")).toBeInTheDocument();
  });

  it("emite el valor 'stop:Nombre' y notifica onStopSelected al elegir una parada", async () => {
    // arrange
    const onChange = vi.fn();
    const onStopSelected = vi.fn();
    renderDestination({
      allowedStopIds: new Set(["py-1", "py-2"]),
      onChange,
      onStopSelected,
    });
    const user = userEvent.setup();
    await user.click(screen.getByText("Destino"));

    // act: seleccionar Asunción
    await user.click(screen.getByText(/Asunción/));

    // assert: valor prefijado + callback con el stop completo
    expect(onChange).toHaveBeenCalledWith("stop:Asunción");
    expect(onStopSelected).toHaveBeenCalledWith(
      expect.objectContaining({ id: "py-1", country: "PY" }),
    );
  });
});

describe("CityInput — búsqueda", () => {
  it("pide al menos 3 letras antes de filtrar", async () => {
    // arrange
    renderDestination();
    const user = userEvent.setup();
    await user.click(screen.getByText("Destino"));

    // act: escribir menos de 3 letras
    await user.type(screen.getByPlaceholderText("Buscar parada..."), "As");

    // assert
    expect(screen.getByText("Ingresá al menos 3 letras para buscar")).toBeInTheDocument();
  });

  it("filtra por nombre a partir de 3 letras", async () => {
    // arrange
    renderDestination();
    const user = userEvent.setup();
    await user.click(screen.getByText("Destino"));

    // act
    await user.type(screen.getByPlaceholderText("Buscar parada..."), "Asu");

    // assert: solo Asunción coincide
    expect(screen.getByText(/Asunción/)).toBeInTheDocument();
    expect(screen.queryByText(/Rosario/)).not.toBeInTheDocument();
  });
});
