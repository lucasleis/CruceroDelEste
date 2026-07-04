"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SearchSummaryBar } from "@/components/travel/SearchSummaryBar";
import { FilterPanel } from "@/components/travel/FilterPanel";
import { TripCard } from "@/components/travel/TripCard";

type SeatType = "cama" | "semi-cama" | "ejecutivo";

interface StopRead {
  id: string;
  name: string;
  country: string;
}

interface RouteRead {
  id: string;
  origin_stop: StopRead;
  destination_stop: StopRead;
}

interface TripRead {
  id: string;
  route: RouteRead;
  departure_at: string;
  arrival_at: string;
  status: string;
  available_seats_count: number;
  current_price_cama: number | null;
  current_price_semi_cama: number | null;
}

const MONTH_LABELS = [
  "ENE",
  "FEB",
  "MAR",
  "ABR",
  "MAY",
  "JUN",
  "JUL",
  "AGO",
  "SEP",
  "OCT",
  "NOV",
  "DIC",
];

function toArTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function toArDateParts(iso: string): { day: string; month: string } {
  const formatted = new Date(iso).toLocaleDateString("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
  });
  const [, month, day] = formatted.split("-");
  return { day, month: MONTH_LABELS[Number(month) - 1] };
}

function toArDateLabel(iso: string): string {
  const { day, month } = toArDateParts(iso);
  return `${day} ${month}`;
}

function toArDateKey(iso: string): string {
  return new Date(iso).toLocaleDateString("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
  });
}

const searchDateFormatter = new Intl.DateTimeFormat("es-AR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

function formatSearchDate(dateParam: string): string {
  if (!dateParam) return "";
  const [year, month, day] = dateParam.split("-").map(Number);
  const formatted = searchDateFormatter.format(new Date(year, month - 1, day));
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

function mapTripToCardProps(trip: TripRead) {
  const seatTypes: SeatType[] = [];
  if (trip.current_price_cama !== null) seatTypes.push("cama");
  if (trip.current_price_semi_cama !== null) seatTypes.push("semi-cama");

  const prices = [trip.current_price_cama, trip.current_price_semi_cama].filter(
    (price): price is number => price !== null
  );

  const departureDateKey = toArDateKey(trip.departure_at);
  const arrivalDateKey = toArDateKey(trip.arrival_at);
  const durationMinutes = Math.round(
    (new Date(trip.arrival_at).getTime() -
      new Date(trip.departure_at).getTime()) /
      60000
  );

  return {
    departureTime: toArTime(trip.departure_at),
    departureDate: toArDateLabel(trip.departure_at),
    arrivalTime: toArTime(trip.arrival_at),
    arrivalDate:
      arrivalDateKey !== departureDateKey
        ? toArDateLabel(trip.arrival_at)
        : undefined,
    origin: trip.route.origin_stop.name,
    destination: trip.route.destination_stop.name,
    durationMinutes,
    isDirect: true,
    seatTypes,
    amenities: ["wifi", "ac", "usb", "bathroom", "entertainment"] as const,
    priceFrom: prices.length > 0 ? Math.min(...prices) : null,
    availableSeats: trip.available_seats_count,
  };
}

export default function ResultadosPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const origin = searchParams.get("origin") ?? "";
  const destination = searchParams.get("destination") ?? "";
  const date = searchParams.get("date") ?? "";
  const passengers = Number(searchParams.get("passengers") ?? "1");

  const [trips, setTrips] = useState<TripRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchTrips() {
      setLoading(true);
      setError(null);
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL;
        const url = `${baseUrl}/trips?origin=${encodeURIComponent(
          origin
        )}&destination=${encodeURIComponent(
          destination
        )}&departure_date=${encodeURIComponent(date)}`;
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }
        const data: TripRead[] = await response.json();
        if (!cancelled) {
          setTrips(data);
        }
      } catch {
        if (!cancelled) {
          setError("error");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchTrips();

    return () => {
      cancelled = true;
    };
  }, [origin, destination, date]);

  return (
    <div style={{ background: "var(--color-surface)", minHeight: "100vh" }}>
      <SearchSummaryBar
        origin={origin}
        destination={destination}
        date={formatSearchDate(date)}
        passengerCount={passengers}
        onEditClick={() => router.back()}
      />

      <div
        style={{
          display: "flex",
          gap: "24px",
          padding: "24px",
          alignItems: "flex-start",
        }}
      >
        <FilterPanel />

        <div style={{ display: "flex", flexDirection: "column", gap: "16px", flex: 1 }}>
          {loading && (
            <p
              style={{
                textAlign: "center",
                color: "var(--color-text-muted)",
                fontFamily: "var(--font-body)",
                padding: "48px 0",
              }}
            >
              Buscando viajes...
            </p>
          )}

          {!loading && error && (
            <p
              style={{
                textAlign: "center",
                color: "var(--color-accent)",
                fontFamily: "var(--font-body)",
                padding: "48px 0",
              }}
            >
              Ocurrió un error al buscar viajes. Intentá de nuevo.
            </p>
          )}

          {!loading && !error && trips.length === 0 && (
            <p
              style={{
                textAlign: "center",
                color: "var(--color-text-muted)",
                fontFamily: "var(--font-body)",
                padding: "48px 0",
              }}
            >
              No encontramos viajes para esta búsqueda.
            </p>
          )}

          {!loading &&
            !error &&
            trips.map((trip) => (
              <TripCard
                key={trip.id}
                {...mapTripToCardProps(trip)}
                onSelect={() => router.push(`/asientos/${trip.id}`)}
              />
            ))}
        </div>
      </div>
    </div>
  );
}
