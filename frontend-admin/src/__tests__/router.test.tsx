import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import AppRouter from "@/router";
import { getMe } from "@/api/auth";

// AuthProvider calls getMe on mount to determine the initial auth state.
// Session is a httpOnly cookie the browser sends automatically — there is no
// client-readable token, so each test controls the mocked getMe() resolution
// directly instead of touching localStorage (LLE-334).
vi.mock("@/api/auth", () => ({
  getMe: vi.fn(),
  logout: vi.fn().mockResolvedValue(undefined),
}));

const getMeMock = vi.mocked(getMe);

function mockAuthenticated() {
  getMeMock.mockResolvedValue({ id: "1", email: "admin@test.com" });
}

function mockUnauthenticated() {
  getMeMock.mockRejectedValue(new Error("Unauthorized"));
}

// ProtectedRoute / RootRedirect guard the whole admin panel. We render the real
// router tree at a given URL and assert what the user actually lands on, based
// on the session state resolved through getMe() — the real signal the app uses.

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
  beforeEach(() => {
    getMeMock.mockReset();
  });

  it("redirige al login cuando se entra a una ruta protegida sin sesión", async () => {
    mockUnauthenticated();

    renderAt("/viajes");

    await waitFor(() => {
      expect(screen.getByText("Panel de administración")).toBeInTheDocument();
    });
  });

  it("redirige al login ante una ruta desconocida sin sesión", async () => {
    mockUnauthenticated();

    renderAt("/ruta-que-no-existe");

    await waitFor(() => {
      expect(screen.getByText("Panel de administración")).toBeInTheDocument();
    });
  });

  it("desde la raíz con sesión válida redirige al dashboard, no al login", async () => {
    mockAuthenticated();

    renderAt("/");

    // RootRedirect lleva al dashboard (placeholder + link del sidebar, de ahí
    // el getAllByText) y NO muestra el login.
    await waitFor(() => {
      expect(screen.getAllByText("Dashboard").length).toBeGreaterThan(0);
    });
    expect(screen.queryByText("Panel de administración")).not.toBeInTheDocument();
  });

  it("desde la raíz sin sesión redirige al login", async () => {
    mockUnauthenticated();

    renderAt("/");

    await waitFor(() => {
      expect(screen.getByText("Panel de administración")).toBeInTheDocument();
    });
  });
});
