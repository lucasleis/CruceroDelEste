import apiClient from "./client";
import type { RefundRequestRead } from "@/types/trips";

export async function getRefundRequests(params?: {
  booking_id?: string;
  window_valid?: boolean;
}): Promise<RefundRequestRead[]> {
  const response = await apiClient.get<RefundRequestRead[]>(
    "/admin/refund-requests",
    { params }
  );
  return response.data;
}
