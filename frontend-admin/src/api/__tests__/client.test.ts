import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type { InternalAxiosRequestConfig } from "axios";
import apiClient from "@/api/client";

// The axios interceptors are the real security surface of the admin panel:
// every request must carry the JWT, and any 401 must evict the session. We
// exercise the actual interceptor handlers registered on the axios instance —
// no network call, but the real logic runs.

type FulfilledRequest = (
  config: InternalAxiosRequestConfig,
) => InternalAxiosRequestConfig;
type RejectedResponse = (error: unknown) => Promise<unknown>;

function requestInterceptor(): FulfilledRequest {
  // axios stores registered handlers on the manager; index 0 is the one
  // client.ts registers.
  const handler = (apiClient.interceptors.request as unknown as {
    handlers: { fulfilled: FulfilledRequest }[];
  }).handlers[0];
  return handler.fulfilled;
}

function responseErrorInterceptor(): RejectedResponse {
  const handler = (apiClient.interceptors.response as unknown as {
    handlers: { rejected: RejectedResponse }[];
  }).handlers[0];
  return handler.rejected;
}

function makeConfig(): InternalAxiosRequestConfig {
  return { headers: {} } as InternalAxiosRequestConfig;
}

describe("interceptor de request (inyección de JWT)", () => {
  it("agrega el header Authorization Bearer cuando hay token en localStorage", () => {
    // arrange
    localStorage.setItem("admin_token", "abc.123.xyz");

    // act
    const config = requestInterceptor()(makeConfig());

    // assert
    expect(config.headers.Authorization).toBe("Bearer abc.123.xyz");
  });

  it("no agrega header Authorization cuando no hay token", () => {
    // arrange: sin token (setup limpia localStorage entre tests)

    // act
    const config = requestInterceptor()(makeConfig());

    // assert
    expect(config.headers.Authorization).toBeUndefined();
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
    window.location = { href: "" } as Location;
  });

  afterEach(() => {
    // @ts-expect-error restauramos la location original
    window.location = originalLocation;
  });

  it("borra el token y redirige a /login ante un 401", async () => {
    // arrange
    localStorage.setItem("admin_token", "expired.token");
    const error = { response: { status: 401 } };

    // act + assert: el interceptor re-propaga el error
    await expect(responseErrorInterceptor()(error)).rejects.toBe(error);

    // assert: sesión purgada y redirección disparada
    expect(localStorage.getItem("admin_token")).toBeNull();
    expect(window.location.href).toBe("/login");
  });

  it("no toca la sesión ni redirige ante errores que no son 401", async () => {
    // arrange
    localStorage.setItem("admin_token", "valid.token");
    const error = { response: { status: 500 } };

    // act
    await expect(responseErrorInterceptor()(error)).rejects.toBe(error);

    // assert: el token sobrevive y no hubo redirección
    expect(localStorage.getItem("admin_token")).toBe("valid.token");
    expect(window.location.href).toBe("");
  });
});
