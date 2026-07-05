import apiClient from "./client";
import type { CountryEnum, StopRead } from "@/types/trips";

export async function getStops(): Promise<StopRead[]> {
  const response = await apiClient.get<StopRead[]>("/stops");
  return response.data;
}

export async function createStop(data: {
  name: string;
  country: CountryEnum;
  province?: string;
}): Promise<StopRead> {
  const response = await apiClient.post<StopRead>("/admin/stops", data);
  return response.data;
}

export async function deleteStop(id: string): Promise<void> {
  await apiClient.delete(`/admin/stops/${id}`);
}
