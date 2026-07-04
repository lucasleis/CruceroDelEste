import apiClient from "./client";
import type { AdminTripRead, SeatLayoutRead } from "@/types/trips";

export async function getAdminTrips(): Promise<AdminTripRead[]> {
  const response = await apiClient.get<AdminTripRead[]>("/admin/trips");
  return response.data;
}

export async function getAdminTrip(id: string): Promise<AdminTripRead> {
  const response = await apiClient.get<AdminTripRead>(`/admin/trips/${id}`);
  return response.data;
}

export async function createTrip(data: {
  route_id: string;
  seat_layout_id: string;
  departure_at: string;
  arrival_at: string;
}): Promise<AdminTripRead> {
  const response = await apiClient.post<AdminTripRead>("/admin/trips", data);
  return response.data;
}

export async function deleteTrip(id: string): Promise<void> {
  await apiClient.delete(`/admin/trips/${id}`);
}

export async function getSeatLayouts(): Promise<SeatLayoutRead[]> {
  const response = await apiClient.get<SeatLayoutRead[]>("/admin/seat-layouts");
  return response.data;
}
