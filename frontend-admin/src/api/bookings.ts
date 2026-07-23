import apiClient from "./client";
import type {
  AdminBookingRead,
  AdminBookingListItem,
  PaginatedResponse,
} from "@/types/trips";

export async function getBookings(params?: {
  booking_status?: string;
  trip_id?: string;
  skip?: number;
  limit?: number;
}): Promise<PaginatedResponse<AdminBookingListItem>> {
  const response = await apiClient.get<PaginatedResponse<AdminBookingListItem>>(
    "/admin/bookings",
    { params }
  );
  return response.data;
}

export async function getBooking(id: string): Promise<AdminBookingRead> {
  const response = await apiClient.get<AdminBookingRead>(
    `/admin/bookings/${id}`
  );
  return response.data;
}
