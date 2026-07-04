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

export interface PriceTrancheRead {
  id: string;
  trip_id: string;
  seat_type: SeatTypeEnum;
  min_sold: number;
  max_sold: number;
  price: number;
  created_at: string;
}

export interface PriceTrancheCreate {
  seat_type: SeatTypeEnum;
  min_sold: number;
  max_sold: number;
  price: number;
}

export type BookingStatusEnum =
  | "pending_payment"
  | "confirmed"
  | "expired"
  | "refunded";

export interface PassengerRead {
  id: string;
  seat_id: string;
  first_name: string;
  last_name: string;
  dni: string;
  email: string;
  phone: string | null;
  luggage_count: number;
}

export interface AdminBookingRead {
  id: string;
  trip_id: string;
  status: BookingStatusEnum;
  contact_email: string;
  total_amount: number;
  mp_preference_id: string | null;
  mp_payment_id: string | null;
  expires_at: string;
  confirmed_at: string | null;
  reminder_sent: boolean;
  feedback_sent: boolean;
  created_at: string;
  passengers: PassengerRead[];
}

export interface RefundRequestRead {
  id: string;
  booking_id: string;
  requested_at: string;
  email_used: string;
  window_valid: boolean;
}
