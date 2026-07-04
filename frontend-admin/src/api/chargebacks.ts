import apiClient from "./client";
import type { ChargebackRead } from "@/types/trips";

export async function getChargebacks(params?: {
  status?: string;
  booking_id?: string;
}): Promise<ChargebackRead[]> {
  const response = await apiClient.get<ChargebackRead[]>(
    "/admin/chargebacks",
    { params }
  );
  return response.data;
}
