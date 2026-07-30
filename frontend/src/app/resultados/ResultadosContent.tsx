"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SlidersHorizontal, ArrowUpDown, Bus, Pencil } from "lucide-react";
import { SearchSummaryBar } from "@/components/travel/SearchSummaryBar";
import { FilterPanel, type FilterState } from "@/components/travel/FilterPanel";
import { TripCard } from "@/components/travel/TripCard";
import { SearchBar } from "@/components/search/SearchBar";
import { searchTrips, getStops } from "@/api";
import type { TripRead, StopRead } from "@/types/trips";

function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return isMobile;
}

function useIsMobileSearchBar(): boolean {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 960);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return isMobile;
}

function EmptyStateIllustration() {
  return (
    <svg
      width="200"
      height="180"
      viewBox="0 0 200 180"
      fill="none"
      style={{ display: "block", margin: "0 auto 24px" }}
    >
      <circle cx="90" cy="95" r="68" fill="#e8eaf0" />

      <circle cx="28" cy="60" r="9" fill="#c5cae9" />
      <circle cx="40" cy="53" r="12" fill="#c5cae9" />
      <circle cx="54" cy="58" r="9" fill="#c5cae9" />
      <rect x="28" y="58" width="35" height="11" fill="#c5cae9" />

      <circle cx="130" cy="42" r="6" fill="#c5cae9" />
      <circle cx="139" cy="37" r="8" fill="#c5cae9" />
      <circle cx="149" cy="41" r="6" fill="#c5cae9" />
      <rect x="130" y="41" width="25" height="8" fill="#c5cae9" />

      <rect x="52" y="28" width="72" height="124" rx="6" fill="white" stroke="var(--color-primary)" strokeWidth="2" />

      <circle cx="52" cy="90" r="8" fill="#e8eaf0" />

      <circle cx="124" cy="90" r="8" fill="#e8eaf0" />

      <line x1="60" y1="90" x2="116" y2="90" stroke="var(--color-primary)" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.35" />

      <rect x="64" y="40" width="48" height="38" rx="5" fill="white" stroke="var(--color-primary)" strokeWidth="2" />

      <rect x="69" y="47" width="10" height="8" rx="2" fill="var(--color-primary)" opacity="0.15" stroke="var(--color-primary)" strokeWidth="1.5" />
      <rect x="84" y="47" width="10" height="8" rx="2" fill="var(--color-primary)" opacity="0.15" stroke="var(--color-primary)" strokeWidth="1.5" />
      <rect x="99" y="47" width="8" height="8" rx="2" fill="var(--color-primary)" opacity="0.15" stroke="var(--color-primary)" strokeWidth="1.5" />

      <circle cx="73" cy="80" r="5" fill="white" stroke="var(--color-primary)" strokeWidth="2" />
      <circle cx="103" cy="80" r="5" fill="white" stroke="var(--color-primary)" strokeWidth="2" />

      <line x1="70" y1="106" x2="106" y2="106" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
      <line x1="78" y1="116" x2="98" y2="116" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" opacity="0.4" />

      <path
        d="M 124 75 Q 148 60 150 78"
        stroke="var(--color-primary)"
        strokeWidth="1.5"
        strokeDasharray="4 3"
        fill="none"
        opacity="0.6"
      />

      <path
        d="M152 64 C146 64 142 69 142 75 C142 82 152 94 152 94 C152 94 162 82 162 75 C162 69 158 64 152 64 Z"
        fill="var(--color-primary)"
      />

      <circle cx="152" cy="75" r="4" fill="white" />
    </svg>
  );
}

type SeatType = "cama" | "semi-cama" | "ejecutivo";

const HARDCODED_AMENITIES: ("wifi" | "ac" | "usb" | "bathroom" | "entertainment")[] = [
  "wifi",
  "ac",
  "usb",
  "bathroom",
  "entertainment",
];

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
    amenities: HARDCODED_AMENITIES,
    priceFrom: prices.length > 0 ? Math.min(...prices) : null,
    availableSeats: trip.available_seats_count,
  };
}

function getArHour(iso: string): number {
  return Number(toArTime(iso).split(":")[0]);
}

function matchesPeriod(hour: number, period: FilterState["departurePeriods"][number]): boolean {
  if (period === "morning") return hour >= 5 && hour < 12;
  if (period === "afternoon") return hour >= 12 && hour < 18;
  return hour >= 18 || hour < 5;
}

function applyFilters(trips: TripRead[], filters: FilterState): TripRead[] {
  return trips.filter((trip) => {
    if (filters.seatTypes.length > 0) {
      const matchesSeatType = filters.seatTypes.some((seatType) => {
        if (seatType === "cama") return trip.current_price_cama !== null;
        if (seatType === "semi-cama") return trip.current_price_semi_cama !== null;
        return false;
      });
      if (!matchesSeatType) return false;
    }

    if (filters.departurePeriods.length > 0) {
      const hour = getArHour(trip.departure_at);
      const matchesAnyPeriod = filters.departurePeriods.some((period) =>
        matchesPeriod(hour, period)
      );
      if (!matchesAnyPeriod) return false;
    }

    return true;
  });
}

export function ResultadosContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isMobile = useIsMobile();
  const isMobileSearchBar = useIsMobileSearchBar();

  const originStop = searchParams.get("origin") ?? "";
  const originProvince = searchParams.get("origin_province") ?? "";
  const destinationStop = searchParams.get("destination") ?? "";
  const destinationProvince = searchParams.get("destination_province") ?? "";
  const date = searchParams.get("date") ?? "";
  const passengers = Number(searchParams.get("passengers") ?? "1");
  const destinationId = searchParams.get("destinationId") ?? "";
  const tripType = (searchParams.get("tripType") ?? "one-way") as "one-way" | "round-trip";

  const [resolvedDestination, setResolvedDestination] = useState<StopRead | null>(null);
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [trips, setTrips] = useState<TripRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    seatTypes: [],
    departurePeriods: [],
    amenities: [],
  });

  useEffect(() => {
    let cancelled = false;

    async function fetchAll() {
      setLoading(true);
      setError(null);

      try {
        const stopsPromise = destinationId ? getStops() : Promise.resolve([] as StopRead[]);

        let resolvedDest: StopRead | null = null;

        if (destinationId) {
          const stops = await stopsPromise;
          if (cancelled) return;
          resolvedDest = stops.find((s) => s.id === destinationId) ?? null;
          setResolvedDestination(resolvedDest);
        }

        const effectiveDestination = resolvedDest?.name ?? destinationStop;
        const effectiveDestinationProvince = resolvedDest ? "" : destinationProvince;

        const data = await searchTrips({
          origin: originStop,
          originProvince,
          destination: effectiveDestination,
          destinationProvince: effectiveDestinationProvince,
          departureDate: date,
        });

        if (!cancelled) {
          setTrips(data);
        }
      } catch (error) {
        console.error("[ResultadosContent] fetch error:", error);
        if (!cancelled) {
          setError("error");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchAll();

    return () => {
      cancelled = true;
    };
  }, [originStop, originProvince, destinationStop, destinationProvince, date, destinationId]);

  const filteredTrips = useMemo(() => applyFilters(trips, filters), [trips, filters]);

  const cardProps = useMemo(() => filteredTrips.map(mapTripToCardProps), [filteredTrips]);

  const initialOrigin = originProvince
    ? `province:${originProvince}`
    : originStop
    ? `stop:${originStop}`
    : undefined;

  const initialDestination = (() => {
    if (resolvedDestination) return `stop:${resolvedDestination.name}`;
    if (destinationProvince) return `province:${destinationProvince}`;
    if (destinationStop) return `stop:${destinationStop}`;
    return undefined;
  })();

  const initialDepartureDate = (() => {
    if (!date) return undefined;
    const [year, month, day] = date.split("-").map(Number);
    return new Date(year, month - 1, day);
  })();

  const initialPassengers = { adults: passengers, children: 0, class: "cualquiera" as const };

  const collapsedSummary = (() => {
    const orig = initialOrigin?.replace(/^(stop:|province:)/, "") ?? "";
    const dest = initialDestination?.replace(/^(stop:|province:)/, "") ?? "";
    const dateLabel = initialDepartureDate
      ? initialDepartureDate.toLocaleDateString("es-AR", { day: "numeric", month: "short" })
      : "";
    const pax = `${passengers} pasajero${passengers === 1 ? "" : "s"}`;
    return [orig, dest].filter(Boolean).join(" → ") + (dateLabel ? ` · ${dateLabel}` : "") + ` · ${pax}`;
  })();

  function handleMobileSearch(value: {
    tripType?: "one-way" | "round-trip";
    originStop?: string;
    originProvince?: string;
    destinationStop?: string;
    destinationProvince?: string;
    departureDate: Date | undefined;
    passengers: { adults: number; children: number };
  }) {
    setSearchExpanded(false);
    const searchDate = value.departureDate?.toISOString().split("T")[0];
    if (!searchDate) return;
    if (!value.originStop && !value.originProvince) return;
    if (!value.destinationStop && !value.destinationProvince) return;

    const totalPassengers = value.passengers.adults + value.passengers.children;

    const originParam = value.originProvince
      ? `origin_province=${encodeURIComponent(value.originProvince)}`
      : `origin=${encodeURIComponent(value.originStop ?? "")}`;

    const destinationParam = value.destinationProvince
      ? `destination_province=${encodeURIComponent(value.destinationProvince)}`
      : `destination=${encodeURIComponent(value.destinationStop ?? "")}`;

    router.push(
      `/resultados?${originParam}&${destinationParam}&date=${searchDate}&passengers=${totalPassengers}&tripType=${value.tripType ?? "one-way"}`
    );
  }

  return (
    <div style={{ background: "var(--color-white)", minHeight: "100vh" }}>
      {isMobileSearchBar ? (
        <div style={{ padding: "16px 16px 8px 16px", display: "flex", flexDirection: "column", gap: "8px" }}>
          {/* Card colapsado — siempre visible, actúa como toggle */}
          <button
            type="button"
            onClick={() => setSearchExpanded((prev) => !prev)}
            style={{
              width: "100%",
              background: "#eef0f8",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-md)",
              boxShadow: "var(--shadow-sm)",
              padding: "12px 16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              cursor: "pointer",
              textAlign: "left",
              gap: "8px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
              <Bus size={16} color="var(--color-primary)" style={{ flexShrink: 0 }} />
              <span style={{
                fontFamily: "var(--font-body)",
                fontSize: "var(--text-sm)",
                color: "var(--color-text-primary)",
                fontWeight: 500,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}>
                {collapsedSummary}
              </span>
            </div>
            <Pencil size={14} color="var(--color-primary)" style={{ flexShrink: 0 }} />
          </button>

          {/* SearchBar — solo visible cuando expandido */}
          {searchExpanded && (
            <SearchBar
              onSearch={handleMobileSearch}
              initialValues={{
                initialOrigin,
                initialDestination,
                initialDepartureDate,
                initialPassengers,
                initialTripType: tripType,
              }}
            />
          )}
        </div>
      ) : (
        <SearchSummaryBar
          origin={originProvince || originStop}
          destination={resolvedDestination?.name ?? (destinationProvince || destinationStop)}
          date={formatSearchDate(date)}
          passengerCount={passengers}
          onEditClick={() => router.back()}
        />
      )}

      <div
        style={
          isMobile
            ? { display: "block", padding: "16px" }
            : { display: "flex", gap: "24px", padding: "24px", alignItems: "flex-start" }
        }
      >
        {isMobile ? (
          <div style={{ display: "flex", gap: "12px", marginBottom: "16px" }}>
            <button
              type="button"
              onClick={() => {}}
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                padding: "12px",
                background: "transparent",
                color: "var(--color-primary)",
                border: "1px solid var(--color-primary)",
                borderRadius: "var(--radius-sm)",
                fontFamily: "var(--font-body)",
                fontSize: "14px",
                cursor: "pointer",
              }}
            >
              <SlidersHorizontal size={16} />
              Filtros
            </button>
            <button
              type="button"
              onClick={() => {}}
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                padding: "12px",
                background: "transparent",
                color: "var(--color-primary)",
                border: "1px solid var(--color-primary)",
                borderRadius: "var(--radius-sm)",
                fontFamily: "var(--font-body)",
                fontSize: "14px",
                cursor: "pointer",
              }}
            >
              <ArrowUpDown size={16} />
              Ordenar
            </button>
          </div>
        ) : (
          <FilterPanel filters={filters} onFilterChange={setFilters} />
        )}

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
            isMobile ? (
              <div style={{ padding: "32px 16px" }}>
                <EmptyStateIllustration />
                <p
                  style={{
                    fontFamily: "var(--font-display)",
                    fontWeight: 700,
                    fontSize: "22px",
                    color: "var(--color-text-primary)",
                    textAlign: "center",
                    marginBottom: "8px",
                  }}
                >
                  No encontramos viajes para esta búsqueda.
                </p>
                <p
                  style={{
                    fontFamily: "var(--font-body)",
                    fontSize: "14px",
                    color: "var(--color-text-muted)",
                    textAlign: "center",
                    marginBottom: "32px",
                  }}
                >
                  Probá cambiando la fecha, el horario o quitando algunos filtros.
                </p>
                <button
                  type="button"
                  onClick={() => router.back()}
                  style={{
                    width: "100%",
                    padding: "16px",
                    background: "var(--color-primary)",
                    color: "var(--color-white)",
                    border: "none",
                    borderRadius: "var(--radius-sm)",
                    fontFamily: "var(--font-body)",
                    fontWeight: 600,
                    fontSize: "16px",
                    cursor: "pointer",
                    marginBottom: "12px",
                  }}
                >
                  Modificar búsqueda
                </button>
                <button
                  type="button"
                  onClick={() => setFilters({ seatTypes: [], departurePeriods: [], amenities: [] })}
                  style={{
                    width: "100%",
                    padding: "16px",
                    background: "transparent",
                    color: "var(--color-primary)",
                    border: "1px solid var(--color-primary)",
                    borderRadius: "var(--radius-sm)",
                    fontFamily: "var(--font-body)",
                    fontWeight: 600,
                    fontSize: "16px",
                    cursor: "pointer",
                  }}
                >
                  Limpiar filtros
                </button>
              </div>
            ) : (
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
            )
          )}

          {!loading && !error && trips.length > 0 && filteredTrips.length === 0 && (
            isMobile ? (
              <div style={{ padding: "32px 16px" }}>
                <EmptyStateIllustration />
                <p
                  style={{
                    fontFamily: "var(--font-display)",
                    fontWeight: 700,
                    fontSize: "22px",
                    color: "var(--color-text-primary)",
                    textAlign: "center",
                    marginBottom: "8px",
                  }}
                >
                  No encontramos viajes para esta búsqueda.
                </p>
                <p
                  style={{
                    fontFamily: "var(--font-body)",
                    fontSize: "14px",
                    color: "var(--color-text-muted)",
                    textAlign: "center",
                    marginBottom: "32px",
                  }}
                >
                  Probá quitando algunos filtros.
                </p>
                <button
                  type="button"
                  onClick={() => setFilters({ seatTypes: [], departurePeriods: [], amenities: [] })}
                  style={{
                    width: "100%",
                    padding: "16px",
                    background: "transparent",
                    color: "var(--color-primary)",
                    border: "1px solid var(--color-primary)",
                    borderRadius: "var(--radius-sm)",
                    fontFamily: "var(--font-body)",
                    fontWeight: 600,
                    fontSize: "16px",
                    cursor: "pointer",
                  }}
                >
                  Limpiar filtros
                </button>
              </div>
            ) : (
              <p
                style={{
                  textAlign: "center",
                  color: "var(--color-text-muted)",
                  fontFamily: "var(--font-body)",
                  padding: "48px 0",
                }}
              >
                Ningún viaje coincide con los filtros aplicados.
              </p>
            )
          )}

          {!loading &&
            !error &&
            filteredTrips.map((trip, index) => (
              <TripCard
                key={trip.id}
                {...cardProps[index]}
                onSelect={() => router.push(`/asientos/${trip.id}?passengers=${passengers}`)}
              />
            ))}
        </div>
      </div>
    </div>
  );
}
