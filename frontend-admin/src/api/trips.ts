import apiClient from "./client";
import type {
  AdminTripRead,
  RouteStopRead,
  SeatLayoutRead,
  TripStatusEnum,
} from "@/types/trips";

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

export async function updateTrip(
  id: string,
  data: {
    departure_at?: string;
    arrival_at?: string;
    status?: TripStatusEnum;
  }
): Promise<AdminTripRead> {
  const response = await apiClient.patch<AdminTripRead>(
    `/admin/trips/${id}`,
    data
  );
  return response.data;
}

export async function deleteTrip(id: string): Promise<void> {
  await apiClient.delete(`/admin/trips/${id}`);
}

export async function getSeatLayouts(): Promise<SeatLayoutRead[]> {
  const response = await apiClient.get<SeatLayoutRead[]>("/admin/seat-layouts");
  return response.data;
}

export async function getRouteStops(routeId: string): Promise<RouteStopRead[]> {
  const response = await apiClient.get<RouteStopRead[]>(`/admin/routes/${routeId}/stops`);
  return response.data;
}

export interface AdminSeatRead {
  id: string;
  seat_number: string;
  seat_type: "cama" | "semi_cama";
  status: "available" | "reserved" | "sold" | "blocked";
}

export async function getTripSeats(tripId: string): Promise<AdminSeatRead[]> {
  const response = await apiClient.get<AdminSeatRead[]>(`/admin/trips/${tripId}/seats`);
  return response.data;
}

export async function updateSeatStatus(
  tripId: string,
  seatNumber: string,
  status: "blocked" | "available"
): Promise<AdminSeatRead> {
  const response = await apiClient.patch<AdminSeatRead>(
    `/admin/trips/${tripId}/seats/${seatNumber}`,
    { status }
  );
  return response.data;
}
