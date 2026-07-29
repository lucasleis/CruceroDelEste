import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import LoginPage from "@/pages/LoginPage";

// The network layer (api/auth -> axios) is mocked: we are testing the page's
// behaviour (store token + navigate on success, show error on failure), not
// MercadoPago-style external HTTP. What we mock is only the `login` call.
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
  return render(
    <AuthProvider>
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    </AuthProvider>,
  );
}

async function fillAndSubmit(email: string, password: string) {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Email"), email);
  await user.type(screen.getByLabelText("Contraseña"), password);
  await user.click(screen.getByRole("button", { name: /ingresar/i }));
}

describe("LoginPage", () => {
  beforeEach(() => {
    loginMock.mockReset();
    navigateMock.mockReset();
  });

  it("guarda el token y navega al dashboard cuando las credenciales son válidas", async () => {
    // arrange: login succeeds and the real auth module would persist the token;
    // the mock simulates that side-effect so we can assert on localStorage.
    loginMock.mockImplementation(async () => {
      localStorage.setItem("admin_token", "jwt.token.value");
      return { access_token: "jwt.token.value", token_type: "bearer" };
    });
    renderLogin();

    // act
    await fillAndSubmit("admin@example.com", "secret123");

    // assert: token persistido y redirección al panel
    await waitFor(() => {
      expect(localStorage.getItem("admin_token")).toBe("jwt.token.value");
    });
    expect(navigateMock).toHaveBeenCalledWith("/dashboard", { replace: true });
  });

  it("muestra un mensaje de error y no guarda token cuando el login falla", async () => {
    // arrange: la API rechaza (401 → excepción)
    loginMock.mockRejectedValue(new Error("401"));
    renderLogin();

    // act
    await fillAndSubmit("admin@example.com", "wrong-password");

    // assert: mensaje de error visible, sin token ni navegación
    expect(await screen.findByText("Email o contraseña incorrectos.")).toBeInTheDocument();
    expect(localStorage.getItem("admin_token")).toBeNull();
    expect(navigateMock).not.toHaveBeenCalledWith("/dashboard", { replace: true });
  });

  it("muestra el formulario aunque ya exista un token guardado (la redirección la maneja el router)", async () => {
    // The redirect-when-already-authenticated behaviour lives at the router level
    // (RootRedirect / ProtectedRoute), not in LoginPage itself.  This test verifies
    // that LoginPage renders the form without crashing when a token is present.
    localStorage.setItem("admin_token", "existing.token");

    renderLogin();

    await waitFor(() => {
      expect(screen.getByLabelText("Email")).toBeInTheDocument();
    });
    expect(loginMock).not.toHaveBeenCalled();
  });
});
