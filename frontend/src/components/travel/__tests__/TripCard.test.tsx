import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TripCard } from "@/components/travel/TripCard";

// TripCard encodes the search-result business signals: seat-availability tiers
// drive the left border colour, low stock flips the card into an urgency badge,
// and a missing price must degrade gracefully. We assert the user-visible
// output for each branch with plain props (no mocking needed).

type Props = React.ComponentProps<typeof TripCard>;

function makeProps(overrides: Partial<Props> = {}): Props {
  return {
    departureTime: "22:00",
    departureDate: "15 mar",
    arrivalTime: "13:00",
    arrivalDate: "16 mar",
    origin: "Buenos Aires",
    destination: "Asunción",
    durationMinutes: 900,
    isDirect: true,
    seatTypes: ["cama"],
    amenities: ["wifi"],
    priceFrom: 24500,
    availableSeats: 20,
    onSelect: vi.fn(),
    ...overrides,
  };
}

function borderColorOf(container: HTMLElement): string {
  const card = container.firstElementChild as HTMLElement;
  return card.style.borderLeft;
}

describe("TripCard — señal de disponibilidad (borde izquierdo)", () => {
  it("usa el color aqua cuando hay más de 10 asientos", () => {
    // arrange / act
    const { container } = render(<TripCard {...makeProps({ availableSeats: 11 })} />);

    // assert
    expect(borderColorOf(container)).toContain("var(--color-aqua)");
  });

  it("usa el color primary cuando hay entre 5 y 10 asientos", () => {
    // arrange / act
    const { container } = render(<TripCard {...makeProps({ availableSeats: 5 })} />);

    // assert
    expect(borderColorOf(container)).toContain("var(--color-primary)");
  });

  it("usa el color accent cuando quedan 4 o menos asientos", () => {
    // arrange / act
    const { container } = render(<TripCard {...makeProps({ availableSeats: 4 })} />);

    // assert
    expect(borderColorOf(container)).toContain("var(--color-accent)");
  });
});

describe("TripCard — badge de urgencia", () => {
  it("muestra 'Últimos N' cuando quedan 4 o menos asientos", () => {
    // arrange / act
    render(<TripCard {...makeProps({ availableSeats: 3 })} />);

    // assert
    expect(screen.getByText("Últimos 3")).toBeInTheDocument();
    expect(screen.queryByText(/asientos disponibles/)).not.toBeInTheDocument();
  });

  it("muestra el conteo normal cuando hay más de 4 asientos", () => {
    // arrange / act
    render(<TripCard {...makeProps({ availableSeats: 12 })} />);

    // assert
    expect(screen.getByText("12 asientos disponibles")).toBeInTheDocument();
    expect(screen.queryByText(/Últimos/)).not.toBeInTheDocument();
  });
});

describe("TripCard — precio", () => {
  it("formatea el precio con separador de miles es-AR cuando priceFrom tiene valor", () => {
    // arrange / act
    render(<TripCard {...makeProps({ priceFrom: 24500 })} />);

    // assert: es-AR usa punto como separador de miles
    expect(screen.getByText("$24.500")).toBeInTheDocument();
  });

  it("muestra 'Sin precio' cuando priceFrom es null", () => {
    // arrange / act
    render(<TripCard {...makeProps({ priceFrom: null })} />);

    // assert
    expect(screen.getByText("Sin precio")).toBeInTheDocument();
    expect(screen.queryByText(/^\$/)).not.toBeInTheDocument();
  });
});

describe("TripCard — otros comportamientos", () => {
  it("formatea la duración en horas y minutos", () => {
    // arrange / act: 905 min = 15h 5m
    render(<TripCard {...makeProps({ durationMinutes: 905 })} />);

    // assert
    expect(screen.getByText("15h 5m")).toBeInTheDocument();
  });

  it("omite los minutos cuando la duración es exacta en horas", () => {
    // arrange / act: 900 min = 15h
    render(<TripCard {...makeProps({ durationMinutes: 900 })} />);

    // assert
    expect(screen.getByText("15h")).toBeInTheDocument();
  });

  it("indica 'Con escala' cuando el viaje no es directo", () => {
    // arrange / act
    render(<TripCard {...makeProps({ isDirect: false })} />);

    // assert
    expect(screen.getByText("Con escala")).toBeInTheDocument();
  });

  it("no repite la fecha de llegada cuando coincide con la de salida", () => {
    // arrange / act: misma fecha en salida y llegada
    render(
      <TripCard {...makeProps({ departureDate: "15 mar", arrivalDate: "15 mar" })} />,
    );

    // assert: la fecha "15 mar" aparece una sola vez (la de salida)
    expect(screen.getAllByText("15 mar")).toHaveLength(1);
  });

  it("invoca onSelect al hacer click en 'Ver asientos'", async () => {
    // arrange
    const onSelect = vi.fn();
    render(<TripCard {...makeProps({ onSelect })} />);

    // act
    await userEvent.setup().click(screen.getByRole("button", { name: /ver asientos/i }));

    // assert
    expect(onSelect).toHaveBeenCalledTimes(1);
  });
});
