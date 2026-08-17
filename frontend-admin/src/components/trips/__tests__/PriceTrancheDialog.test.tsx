import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PriceTrancheDialog } from "@/components/trips/PriceTrancheDialog";
import type { PriceTrancheRead } from "@/types/trips";

// ─── API mocks ───────────────────────────────────────────────────────────────

const deletePriceTrancheMock = vi.fn();
const createPriceTrancheMock = vi.fn();
vi.mock("@/api/priceTranches", () => ({
  deletePriceTranche: (...args: unknown[]) => deletePriceTrancheMock(...args),
  createPriceTranche: (...args: unknown[]) => createPriceTrancheMock(...args),
}));

// ─── Toast mock ───────────────────────────────────────────────────────────────

const { toastErrorMock, toastSuccessMock } = vi.hoisted(() => ({
  toastErrorMock: vi.fn(),
  toastSuccessMock: vi.fn(),
}));
vi.mock("sonner", () => ({
  toast: { error: toastErrorMock, success: toastSuccessMock },
}));

// ─── Fixtures ────────────────────────────────────────────────────────────────

const TRANCHE: PriceTrancheRead = {
  id: "tranche-1",
  seat_type: "cama",
  min_sold: 0,
  max_sold: 5,
  price: 10000,
};

const TRIP_ID = "trip-1";

function renderDialog() {
  const onSuccess = vi.fn();
  render(
    <PriceTrancheDialog
      tripId={TRIP_ID}
      tranches={[TRANCHE]}
      camaTotal={5}
      semiCamaTotal={0}
      onSuccess={onSuccess}
    />
  );
  return { onSuccess };
}

async function openDeleteConfirmation() {
  const { onSuccess } = renderDialog();
  const user = userEvent.setup();
  // Expande la tabla de Cama Ejecutivo para que la fila sea visible.
  await user.click(screen.getByText(/Cama Ejecutivo/));
  const deleteRowButton = screen.getByRole("button", { name: "Eliminar tramo" });
  await user.click(deleteRowButton);
  return { user, onSuccess };
}

// axios rechaza con un objeto que expone `.response.status` (AxiosError) —
// mismo shape que usa el interceptor real en client.ts y el que ya se usa
// para simular errores de axios en client.test.ts. No es un shape inventado.
function axiosErrorWithStatus(status: number) {
  return { response: { status } };
}

describe("PriceTrancheDialog — borrado de tramo", () => {
  beforeEach(() => {
    deletePriceTrancheMock.mockReset();
    createPriceTrancheMock.mockReset();
    toastErrorMock.mockReset();
    toastSuccessMock.mockReset();
  });

  it("no_dispara_segundo_DELETE_en_doble_click — la request queda en vuelo y el botón se deshabilita", async () => {
    let resolveDelete: () => void;
    const pending = new Promise<void>((resolve) => {
      resolveDelete = resolve;
    });
    deletePriceTrancheMock.mockReturnValue(pending);

    const { user } = await openDeleteConfirmation();

    const confirmButton = screen.getByRole("button", { name: "Eliminar" });
    await user.click(confirmButton);

    // El botón pasa a "Eliminando..." y disabled — un segundo click no
    // dispara un segundo DELETE porque el elemento ya no es clickeable.
    const confirmButtonInFlight = screen.getByRole("button", { name: /Eliminando/ });
    expect(confirmButtonInFlight).toBeDisabled();
    await user.click(confirmButtonInFlight);

    expect(deletePriceTrancheMock).toHaveBeenCalledTimes(1);

    resolveDelete!();
    await waitFor(() => expect(toastSuccessMock).toHaveBeenCalledTimes(1));
    expect(toastSuccessMock).toHaveBeenCalledWith("Tramo eliminado");
  });

  it("trata_404_como_exito — el tramo ya no existe, se muestra éxito y se refresca la lista", async () => {
    deletePriceTrancheMock.mockRejectedValue(axiosErrorWithStatus(404));

    const { user, onSuccess } = await openDeleteConfirmation();
    await user.click(screen.getByRole("button", { name: "Eliminar" }));

    await waitFor(() => expect(toastSuccessMock).toHaveBeenCalledTimes(1));
    expect(toastSuccessMock).toHaveBeenCalledWith("Tramo eliminado");
    expect(toastErrorMock).not.toHaveBeenCalled();
    expect(onSuccess).toHaveBeenCalled();
  });

  it("otros_errores_siguen_siendo_error — un 500 no se trata como éxito", async () => {
    deletePriceTrancheMock.mockRejectedValue(axiosErrorWithStatus(500));

    const { user, onSuccess } = await openDeleteConfirmation();
    await user.click(screen.getByRole("button", { name: "Eliminar" }));

    await waitFor(() => expect(toastErrorMock).toHaveBeenCalledTimes(1));
    expect(toastErrorMock).toHaveBeenCalledWith("Error al eliminar el tramo.");
    expect(toastSuccessMock).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
  });
});
