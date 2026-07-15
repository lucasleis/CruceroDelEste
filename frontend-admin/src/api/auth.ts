import apiClient from "./client";

export interface LoginResponse {
  access_token: string;
  token_type: string;
}

export interface MeResponse {
  id: string;
  email: string;
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  const response = await apiClient.post<LoginResponse>("/admin/login", {
    email,
    password,
  });
  return response.data;
}

export async function logout(): Promise<void> {
  await apiClient.post("/admin/logout");
}

export async function getMe(): Promise<MeResponse> {
  const response = await apiClient.get<MeResponse>("/admin/me");
  return response.data;
}
