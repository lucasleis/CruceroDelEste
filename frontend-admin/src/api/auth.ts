import apiClient from "./client";

export interface LoginResponse {
  access_token: string;
  token_type: string;
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  const response = await apiClient.post<LoginResponse>("/admin/login", {
    email,
    password,
  });
  return response.data;
}
