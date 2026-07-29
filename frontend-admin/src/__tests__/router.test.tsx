import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import AppRouter from "@/router";

// AuthProvider calls getMe on mount to determine the initial auth state.
// Resolve when a token is present in localStorage, reject otherwise — this
// mirrors what the real API module does.
vi.mock("@/api/auth", () => ({
  getMe: vi.fn(() =>
    localStorage.getItem("admin_token")
      ? Promise.resolve({ id: "1", email: "admin@test.com" })
      : Promise.reject(new Error("Unauthorized")),
  ),
  logout: vi.fn().mockResolvedValue(undefined),
}));

// ProtectedRoute / RootRedirect guard the whole admin panel. We render the real
// router tree at a given URL and assert what the user actually lands on, based
// solely on the presence of a token in localStorage.

function renderAt(path: string) {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={[path]}>
        <AppRouter />
      </MemoryRouter>
    </AuthProvider>,
  );
}

describe("protección de rutas del admin", () => {
  it("redirige al login cuando se entra a una ruta protegida sin token", async () => {
    // arrange: sin token (setup limpia localStorage)

    // act
    renderAt("/viajes");

    // assert: aterriza en el LoginPage
    await waitFor(() => {
      expect(screen.getByText("Panel de administración")).toBeInTheDocument();
    });
  });

  it("redirige al login ante una ruta desconocida sin token", async () => {
    // arrange: sin token

    // act
    renderAt("/ruta-que-no-existe");

    // assert
    await waitFor(() => {
      expect(screen.getByText("Panel de administración")).toBeInTheDocument();
    });
  });

  it("desde la raíz con token redirige al dashboard, no al login", async () => {
    // arrange
    localStorage.setItem("admin_token", "valid.token");

    // act
    renderAt("/");

    // assert: RootRedirect lleva al dashboard (placeholder + link del sidebar,
    // de ahí el getAllByText) y NO muestra el login.
    await waitFor(() => {
      expect(screen.getAllByText("Dashboard").length).toBeGreaterThan(0);
    });
    expect(screen.queryByText("Panel de administración")).not.toBeInTheDocument();
  });

  it("desde la raíz sin token redirige al login", async () => {
    // arrange: sin token

    // act
    renderAt("/");

    // assert
    await waitFor(() => {
      expect(screen.getByText("Panel de administración")).toBeInTheDocument();
    });
  });
});
