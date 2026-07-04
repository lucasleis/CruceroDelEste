import apiClient from "./client";
import type { PriceTrancheCreate, PriceTrancheRead } from "@/types/trips";

export async function getPriceTranches(
  tripId: string
): Promise<PriceTrancheRead[]> {
  const response = await apiClient.get<PriceTrancheRead[]>(
    `/admin/trips/${tripId}/price-tranches`
  );
  return response.data;
}

export async function createPriceTranche(
  tripId: string,
  data: PriceTrancheCreate
): Promise<PriceTrancheRead> {
  const response = await apiClient.post<PriceTrancheRead>(
    `/admin/trips/${tripId}/price-tranches`,
    data
  );
  return response.data;
}

export async function deletePriceTranche(
  tripId: string,
  trancheId: string
): Promise<void> {
  await apiClient.delete(`/admin/trips/${tripId}/price-tranches/${trancheId}`);
}
