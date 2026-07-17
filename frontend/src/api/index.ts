import type { StopRead, TripRead, SeatRead, BookingRead } from "@/types/trips"

const BASE_URL = process.env.NEXT_PUBLIC_API_URL

export async function getStops(): Promise<StopRead[]> {
  const response = await fetch(`${BASE_URL}/stops`)
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`)
  }
  return response.json()
}

export async function getValidDestinations(stopId: string): Promise<StopRead[]> {
  const response = await fetch(`${BASE_URL}/stops/${stopId}/valid-destinations`)
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`)
  }
  return response.json()
}

export async function searchTrips(params: {
  origin?: string
  originProvince?: string
  destination?: string
  destinationProvince?: string
  departureDate?: string
}): Promise<TripRead[]> {
  const query = new URLSearchParams()
  if (params.originProvince) query.set("origin_province", params.originProvince)
  else if (params.origin) query.set("origin", params.origin)
  if (params.destinationProvince) query.set("destination_province", params.destinationProvince)
  else if (params.destination) query.set("destination", params.destination)
  if (params.departureDate) query.set("departure_date", params.departureDate)

  const response = await fetch(`${BASE_URL}/trips?${query.toString()}`)
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`)
  }
  return response.json()
}

export async function getTrip(tripId: string): Promise<TripRead> {
  const response = await fetch(`${BASE_URL}/trips/${tripId}`)
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`)
  }
  return response.json()
}

export async function getTripSeats(tripId: string): Promise<SeatRead[]> {
  const response = await fetch(`${BASE_URL}/trips/${tripId}/seats`)
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`)
  }
  return response.json()
}

export async function getBooking(bookingId: string, token: string): Promise<BookingRead> {
  const response = await fetch(
    `${BASE_URL}/bookings/${bookingId}?token=${encodeURIComponent(token)}`
  )
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`)
  }
  return response.json()
}

export async function refundRequest(bookingId: string, email: string): Promise<Response> {
  return fetch(`${BASE_URL}/bookings/${bookingId}/refund-request`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  })
}
