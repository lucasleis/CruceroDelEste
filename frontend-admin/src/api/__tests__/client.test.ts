import { describe, it, expect, beforeEach, afterEach } from "vitest";
import apiClient from "@/api/client";

// Session auth is a httpOnly cookie set by POST /admin/login and sent
// automatically by the browser via `withCredentials: true` — there is no
// token in JS-accessible storage. The only client-side logic left to test is
// the response interceptor's 401 handling (redirect to /login).

type RejectedResponse = (error: unknown) => Promise<unknown>;

function responseErrorInterceptor(): RejectedResponse {
  // axios stores registered handlers on the manager; index 0 is the one
  // client.ts registers.
  const handler = (apiClient.interceptors.response as unknown as {
    handlers: { rejected: RejectedResponse }[];
  }).handlers[0];
  return handler.rejected;
}

describe("apiClient", () => {
  it("no registra un interceptor de request (no hay token que inyectar)", () => {
    const requestHandlers = (apiClient.interceptors.request as unknown as {
      handlers: unknown[];
    }).handlers;

    expect(requestHandlers.filter(Boolean)).toHaveLength(0);
  });
});

describe("interceptor de response (manejo de 401)", () => {
  const originalLocation = window.location;

  beforeEach(() => {
    // jsdom no implementa navegación real; reemplazamos location por un objeto
    // con href escribible para poder observar la redirección.
    // @ts-expect-error location es read-only en la definición de lib.dom
    delete window.location;
    // @ts-expect-error asignamos un stub mínimo
    window.location = { href: "", pathname: "/viajes" } as Location;
  });

  afterEach(() => {
    // @ts-expect-error restauramos la location original
    window.location = originalLocation;
  });

  it("redirige a /login ante un 401", async () => {
    const error = { response: { status: 401 } };

    await expect(responseErrorInterceptor()(error)).rejects.toBe(error);

    expect(window.location.href).toBe("/login");
  });

  it("no redirige si ya está en /login", async () => {
    window.location.pathname = "/login";
    const error = { response: { status: 401 } };

    await expect(responseErrorInterceptor()(error)).rejects.toBe(error);

    expect(window.location.href).toBe("");
  });

  it("no redirige ante errores que no son 401", async () => {
    const error = { response: { status: 500 } };

    await expect(responseErrorInterceptor()(error)).rejects.toBe(error);

    expect(window.location.href).toBe("");
  });
});
