import apiClient from "./client";
import type { RouteRead } from "@/types/trips";

export async function getRoutes(): Promise<RouteRead[]> {
  const response = await apiClient.get<RouteRead[]>("/admin/routes");
  return response.data;
}

export async function createRoute(data: {
  origin_stop_id: string;
  destination_stop_id: string;
}): Promise<RouteRead> {
  const response = await apiClient.post<RouteRead>("/admin/routes", data);
  return response.data;
}

export async function deleteRoute(id: string): Promise<void> {
  await apiClient.delete(`/admin/routes/${id}`);
}
