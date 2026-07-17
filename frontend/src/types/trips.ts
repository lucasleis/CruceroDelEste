export interface StopRead {
  id: string
  name: string
  country: "AR" | "PY"
  province: string | null
  created_at: string
}

export interface RouteRead {
  id: string
  origin_stop: StopRead
  destination_stop: StopRead
}

export interface TripRead {
  id: string
  route: RouteRead
  departure_at: string
  arrival_at: string
  status: string
  available_seats_count: number
  current_price_cama: number | null
  current_price_semi_cama: number | null
}

export type SeatStatus = "available" | "reserved" | "sold" | "blocked"

export interface SeatRead {
  id: string
  seat_number: string
  seat_type: "cama" | "semi_cama"
  status: SeatStatus
}

export interface TripSummary {
  id: string
  route: RouteRead
  departure_at: string
  arrival_at: string
  status: string
}

export interface PassengerRead {
  id: string
  seat_id: string
  first_name: string
  last_name: string
  dni: string
  email: string
  phone: string | null
}

export interface BookingRead {
  id: string
  trip: TripSummary
  status: string
  contact_email: string
  total_amount: number
  passengers: PassengerRead[]
}
