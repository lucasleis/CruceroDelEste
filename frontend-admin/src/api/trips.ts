import apiClient from "./client";
import type { AdminTripRead, SeatLayoutRead } from "@/types/trips";

export async function getAdminTrips(): Promise<AdminTripRead[]> {
  const response = await apiClient.get<AdminTripRead[]>("/admin/trips");
  return response.data;
}

export async function deleteTrip(id: string): Promise<void> {
  await apiClient.delete(`/admin/trips/${id}`);
}

export async function getSeatLayouts(): Promise<SeatLayoutRead[]> {
  const response = await apiClient.get<SeatLayoutRead[]>("/admin/seat-layouts");
  return response.data;
}
