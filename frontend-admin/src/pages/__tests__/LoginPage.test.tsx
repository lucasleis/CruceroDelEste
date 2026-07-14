import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import LoginPage from "@/pages/LoginPage";

// The network layer (api/auth -> axios) is mocked: we are testing the page's
// behaviour (store token + navigate on success, show error on failure), not
// MercadoPago-style external HTTP. What we mock is only the `login` call.
const loginMock = vi.fn();
vi.mock("@/api/auth", () => ({
  login: (email: string, password: string) => loginMock(email, password),
}));

// Capture navigation without a real browser history.
const navigateMock = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>(
    "react-router-dom",
  );
  return { ...actual, useNavigate: () => navigateMock };
});

function renderLogin() {
  return render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>,
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
    // arrange
    loginMock.mockResolvedValue({ access_token: "jwt.token.value", token_type: "bearer" });
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

  it("redirige al dashboard si ya existe un token al montar la página", async () => {
    // arrange: sesión activa previa
    localStorage.setItem("admin_token", "existing.token");

    // act
    renderLogin();

    // assert: el efecto de montaje redirige sin necesidad de submit
    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith("/dashboard", { replace: true });
    });
    expect(loginMock).not.toHaveBeenCalled();
  });
});
