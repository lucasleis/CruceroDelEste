import apiClient from "./client";
import type { AdminBookingRead } from "@/types/trips";

export async function getBookings(params?: {
  booking_status?: string;
  trip_id?: string;
}): Promise<AdminBookingRead[]> {
  const response = await apiClient.get<AdminBookingRead[]>("/admin/bookings", {
    params,
  });
  return response.data;
}

export async function getBooking(id: string): Promise<AdminBookingRead> {
  const response = await apiClient.get<AdminBookingRead>(
    `/admin/bookings/${id}`
  );
  return response.data;
}
