export type CountryEnum = "AR" | "PY";
export type SeatTypeEnum = "cama" | "semi_cama";
export type TripStatusEnum = "scheduled" | "completed" | "cancelled";

export interface StopRead {
  id: string;
  name: string;
  country: CountryEnum;
}

export interface RouteRead {
  id: string;
  origin_stop: StopRead;
  destination_stop: StopRead;
}

export interface SeatLayoutRead {
  id: string;
  name: string;
  total_cama: number;
  total_semi_cama: number;
  description: string | null;
}

export interface AdminTripRead {
  id: string;
  route: RouteRead;
  departure_at: string;
  arrival_at: string;
  status: TripStatusEnum;
  seat_layout_id: string | null;
  created_at: string;
}
