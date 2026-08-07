import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/contexts/AuthContext";
import LoginPage from "@/pages/LoginPage";

// The network layer (api/auth -> axios) is mocked: we are testing the page's
// own behaviour (call setAuthenticated + navigate on success, show error on
// failure), not the HTTP call itself. Session state lives in a httpOnly
// cookie the browser manages — LoginPage never touches localStorage
// (LLE-334), which is asserted directly below via a spy.
const loginMock = vi.fn();
vi.mock("@/api/auth", () => ({
  login: (email: string, password: string) => loginMock(email, password),
  // AuthProvider calls getMe on mount to verify the session; always reject in
  // these tests since LoginPage doesn't depend on the auth state.
  getMe: vi.fn().mockRejectedValue(new Error("Unauthorized")),
  logout: vi.fn().mockResolvedValue(undefined),
}));

// Capture navigation without a real browser history.
const navigateMock = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>(
    "react-router-dom"
  );
  return { ...actual, useNavigate: () => navigateMock };
});

function renderLogin() {
  // AuthProvider calls useQueryClient() (LLE-342 — clears the cache on
  // logout), so it needs a QueryClientProvider ancestor same as in main.tsx.
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MemoryRouter>
          <LoginPage />
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  );
}

async function fillAndSubmit(email: string, password: string) {
  const user = userEvent.setup();
  await user.clear(screen.getByLabelText("Email"));
  await user.type(screen.getByLabelText("Email"), email);
  await user.clear(screen.getByLabelText("Contraseña"));
  await user.type(screen.getByLabelText("Contraseña"), password);
  await user.click(screen.getByRole("button", { name: /ingresar/i }));
}

describe("LoginPage", () => {
  beforeEach(() => {
    loginMock.mockReset();
    navigateMock.mockReset();
  });

  it("navega al dashboard cuando las credenciales son válidas", async () => {
    // arrange: login succeeds (the real POST /admin/login sets a httpOnly
    // cookie server-side — nothing for the client to persist).
    loginMock.mockResolvedValue({ ok: true });
    renderLogin();

    // act
    await fillAndSubmit("admin@example.com", "secret123");

    // assert: redirección al panel
    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith("/dashboard", { replace: true });
    });
  });

  it("muestra un mensaje de error y no navega cuando el login falla", async () => {
    // arrange: la API rechaza (401 → excepción)
    loginMock.mockRejectedValue(new Error("401"));
    renderLogin();

    // act
    await fillAndSubmit("admin@example.com", "wrong-password");

    // assert: mensaje de error visible, sin navegación
    expect(await screen.findByText("Email o contraseña incorrectos.")).toBeInTheDocument();
    expect(navigateMock).not.toHaveBeenCalledWith("/dashboard", { replace: true });
  });

  it("nunca lee ni escribe localStorage, en ningún punto de su ciclo de vida", async () => {
    // La sesión vive enteramente en una cookie httpOnly manejada por el
    // browser; la lógica de redirect-si-ya-autenticado vive en el router
    // (RootRedirect / ProtectedRoute — ver router.test.tsx), no en esta
    // página. Este test prueba activamente que LoginPage no toca
    // localStorage: ni al montar, ni en un submit exitoso, ni en uno fallido.
    const getItemSpy = vi.spyOn(Storage.prototype, "getItem");
    const setItemSpy = vi.spyOn(Storage.prototype, "setItem");

    loginMock.mockResolvedValue({ ok: true });
    renderLogin();
    await waitFor(() => {
      expect(screen.getByLabelText("Email")).toBeInTheDocument();
    });
    expect(getItemSpy).not.toHaveBeenCalled();
    expect(setItemSpy).not.toHaveBeenCalled();

    await fillAndSubmit("admin@example.com", "secret123");
    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith("/dashboard", { replace: true });
    });
    expect(getItemSpy).not.toHaveBeenCalled();
    expect(setItemSpy).not.toHaveBeenCalled();

    loginMock.mockRejectedValue(new Error("401"));
    await fillAndSubmit("admin@example.com", "wrong-password");
    await screen.findByText("Email o contraseña incorrectos.");
    expect(getItemSpy).not.toHaveBeenCalled();
    expect(setItemSpy).not.toHaveBeenCalled();

    getItemSpy.mockRestore();
    setItemSpy.mockRestore();
  });
});
