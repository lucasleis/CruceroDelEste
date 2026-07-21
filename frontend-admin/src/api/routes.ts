import apiClient from "./client";
import type { RouteRead, RouteStopRead } from "@/types/trips";

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

export async function getRouteStops(routeId: string): Promise<RouteStopRead[]> {
  const response = await apiClient.get<RouteStopRead[]>(`/admin/routes/${routeId}/stops`);
  return response.data;
}

export async function addRouteStop(routeId: string, data: { stop_id: string; order: number }): Promise<RouteStopRead[]> {
  const response = await apiClient.post<RouteStopRead[]>(`/admin/routes/${routeId}/stops`, data);
  return response.data;
}

export async function removeRouteStop(routeId: string, stopId: string): Promise<void> {
  await apiClient.delete(`/admin/routes/${routeId}/stops/${stopId}`);
}

export async function reorderRouteStops(routeId: string, stopIds: string[]): Promise<RouteStopRead[]> {
  const response = await apiClient.put<RouteStopRead[]>(`/admin/routes/${routeId}/stops/reorder`, { stop_ids: stopIds });
  return response.data;
}
