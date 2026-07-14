import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AppRouter from "@/router";

// ProtectedRoute / RootRedirect guard the whole admin panel. We render the real
// router tree at a given URL and assert what the user actually lands on, based
// solely on the presence of a token in localStorage.

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppRouter />
    </MemoryRouter>,
  );
}

describe("protección de rutas del admin", () => {
  it("redirige al login cuando se entra a una ruta protegida sin token", () => {
    // arrange: sin token (setup limpia localStorage)

    // act
    renderAt("/viajes");

    // assert: aterriza en el LoginPage
    expect(screen.getByText("Panel de administración")).toBeInTheDocument();
  });

  it("redirige al login ante una ruta desconocida sin token", () => {
    // arrange: sin token

    // act
    renderAt("/ruta-que-no-existe");

    // assert
    expect(screen.getByText("Panel de administración")).toBeInTheDocument();
  });

  it("desde la raíz con token redirige al dashboard, no al login", () => {
    // arrange
    localStorage.setItem("admin_token", "valid.token");

    // act
    renderAt("/");

    // assert: RootRedirect lleva al dashboard (placeholder + link del sidebar,
    // de ahí el getAllByText) y NO muestra el login.
    expect(screen.getAllByText("Dashboard").length).toBeGreaterThan(0);
    expect(screen.queryByText("Panel de administración")).not.toBeInTheDocument();
  });

  it("desde la raíz sin token redirige al login", () => {
    // arrange: sin token

    // act
    renderAt("/");

    // assert
    expect(screen.getByText("Panel de administración")).toBeInTheDocument();
  });
});
