import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getAdminTrip,
  getRouteStops,
  getSeatLayouts,
  getTripSeats,
  updateSeatStatus,
} from "@/api/trips";
import { getPriceTranches } from "@/api/priceTranches";
import { EditTripDialog } from "@/components/trips/EditTripDialog";
import { PriceTrancheDialog } from "@/components/trips/PriceTrancheDialog";
import type { AdminSeatRead, TripStatusEnum } from "@/types/trips";
import { STATUS_BADGE, formatDate } from "@/lib/tripUtils";

export default function TripDetailPage() {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [stopsOpen, setStopsOpen] = useState(false);

  const [seatsOpen, setSeatsOpen] = useState(false);

  const tripQuery = useQuery({
    queryKey: ["admin", "trips", tripId],
    queryFn: () => getAdminTrip(tripId as string),
    enabled: !!tripId,
  });

  const tranchesQuery = useQuery({
    queryKey: ["admin", "trips", tripId, "price-tranches"],
    queryFn: () => getPriceTranches(tripId as string),
    enabled: !!tripId,
  });

  const seatLayoutsQuery = useQuery({
    queryKey: ["admin", "seat-layouts"],
    queryFn: getSeatLayouts,
  });

  const routeStopsQuery = useQuery({
    queryKey: ["admin", "routes", tripQuery.data?.route?.id, "stops"],
    queryFn: () => getRouteStops(tripQuery.data!.route.id),
    enabled: !!tripQuery.data?.route?.id,
  });

  const seatsQuery = useQuery({
    queryKey: ["admin", "trips", tripId, "seats"],
    queryFn: () => getTripSeats(tripId as string),
    enabled: !!tripId && seatsOpen,
  });

  const toggleSeatMutation = useMutation({
    mutationFn: ({
      seatNumber,
      status,
    }: {
      seatNumber: string;
      status: "blocked" | "available";
    }) => updateSeatStatus(tripId as string, seatNumber, status),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "trips", tripId, "seats"],
      });
    },
    onError: () => toast.error("No se pudo actualizar el asiento."),
  });

  const isLoading =
    tripQuery.isLoading || tranchesQuery.isLoading || seatLayoutsQuery.isLoading;

  function handleOpenSeats() {
    setSeatsOpen(true);
  }

  function handleToggleSeat(seat: AdminSeatRead) {
    if (seat.status === "reserved" || seat.status === "sold") return;
    const newStatus = seat.status === "blocked" ? "available" : "blocked";
    toggleSeatMutation.mutate({ seatNumber: seat.seat_number, status: newStatus });
  }

  if (tripQuery.isError) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex flex-col items-center gap-4 py-16">
          <p className="text-sm text-neutral-600">Viaje no encontrado.</p>
          <Button variant="outline" onClick={() => navigate("/viajes")}>
            Volver a Viajes
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading || !tripQuery.data) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-8">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="mt-6 h-24 w-full" />
        <Skeleton className="mt-6 h-48 w-full" />
      </div>
    );
  }

  const trip = tripQuery.data;
  const tranches = tranchesQuery.data ?? [];
  const seatLayouts = seatLayoutsQuery.data ?? [];
  const status = STATUS_BADGE[trip.status];
  const layout = seatLayouts.find((l) => l.id === trip.seat_layout_id);
  const camaTotal = layout?.total_cama ?? 0;
  const semiCamaTotal = layout?.total_semi_cama ?? 0;
  const seats = seatsQuery.data ?? [];

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => navigate("/viajes")}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <h1 className="text-2xl font-semibold text-neutral-900">
            {trip.route.origin_stop.name} → {trip.route.destination_stop.name}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setStopsOpen(true)}>
            Ver paradas
          </Button>
          <Button variant="outline" size="sm" onClick={handleOpenSeats}>
            Ver asientos
          </Button>
          <EditTripDialog
            tripId={tripId as string}
            trip={trip}
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ["admin", "trips", tripId] });
              queryClient.invalidateQueries({ queryKey: ["admin", "trips"] });
            }}
          />
          <Badge className={status.className}>{status.label}</Badge>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-600">
            Salida
          </p>
          <p className="mt-1 text-sm text-neutral-900">
            {formatDate(trip.departure_at)}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-600">
            Llegada
          </p>
          <p className="mt-1 text-sm text-neutral-900">
            {formatDate(trip.arrival_at)}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-600">
            Layout
          </p>
          <p className="mt-1 text-sm text-neutral-900">
            {layout
              ? `${layout.name} · ${layout.total_cama}C / ${layout.total_semi_cama}SC`
              : "—"}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-600">
            Ruta
          </p>
          <p className="mt-1 text-sm text-neutral-900">
            {trip.route.origin_stop.country} → {trip.route.destination_stop.country}
          </p>
        </div>
      </div>

      <PriceTrancheDialog
        tripId={tripId as string}
        tranches={tranches}
        camaTotal={camaTotal}
        semiCamaTotal={semiCamaTotal}
        onSuccess={() => {
          queryClient.invalidateQueries({
            queryKey: ["admin", "trips", tripId, "price-tranches"],
          });
        }}
      />

      <Dialog open={stopsOpen} onOpenChange={setStopsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Paradas — {trip.route.origin_stop.name} → {trip.route.destination_stop.name}
            </DialogTitle>
          </DialogHeader>

          {routeStopsQuery.isLoading && (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          )}

          {!routeStopsQuery.isLoading && routeStopsQuery.data?.length === 0 && (
            <p className="text-sm text-neutral-600">Sin paradas registradas.</p>
          )}

          {!routeStopsQuery.isLoading && routeStopsQuery.data && routeStopsQuery.data.length > 0 && (
            <ol className="space-y-1 max-h-96 overflow-y-auto">
              {routeStopsQuery.data.map((stop) => (
                <li key={stop.stop_id} className="flex items-center gap-2 text-sm text-neutral-900">
                  <span className="text-neutral-400 w-6 text-right shrink-0">{stop.order + 1}.</span>
                  <span className="flex-1">{stop.name}</span>
                  <Badge className={stop.country === "AR" ? "bg-blue-100 text-blue-700" : "bg-red-100 text-red-700"}>
                    {stop.country}
                  </Badge>
                </li>
              ))}
            </ol>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setStopsOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={seatsOpen} onOpenChange={setSeatsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Asientos — {trip.route.origin_stop.name} → {trip.route.destination_stop.name}
            </DialogTitle>
          </DialogHeader>

          {seatsQuery.isLoading && (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
            </div>
          )}

          {seatsQuery.isError && (
            <p className="text-sm text-[#E87B7B]">No se pudieron cargar los asientos.</p>
          )}

          {!seatsQuery.isLoading && !seatsQuery.isError && seats.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 text-xs text-neutral-500">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-3 h-3 rounded-sm bg-neutral-100 border border-neutral-300" />
                  Disponible
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-3 h-3 rounded-sm bg-[#6B7FD4]" />
                  Reservado/Vendido
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-3 h-3 rounded-sm bg-neutral-400" />
                  Bloqueado
                </span>
              </div>

              {seats.filter((s) => s.seat_type === "cama").length > 0 && (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-neutral-500 mb-2">
                    Cama Ejecutivo
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {seats
                      .filter((s) => s.seat_type === "cama")
                      .map((seat) => {
                        const isOccupied = seat.status === "reserved" || seat.status === "sold";
                        const isBlocked = seat.status === "blocked";
                        const isUpdating =
                          toggleSeatMutation.isPending &&
                          toggleSeatMutation.variables?.seatNumber === seat.seat_number;
                        return (
                          <button
                            key={seat.seat_number}
                            disabled={isOccupied || isUpdating}
                            onClick={() => handleToggleSeat(seat)}
                            title={
                              isOccupied
                                ? "Ocupado"
                                : isBlocked
                                ? "Bloqueado — click para desbloquear"
                                : "Disponible — click para bloquear"
                            }
                            className={[
                              "w-9 h-9 rounded text-xs font-medium border transition-colors",
                              isOccupied
                                ? "bg-[#6B7FD4] text-white border-[#6B7FD4] cursor-not-allowed"
                                : isBlocked
                                ? "bg-neutral-400 text-white border-neutral-400 cursor-pointer hover:bg-neutral-500"
                                : "bg-neutral-100 text-neutral-700 border-neutral-300 cursor-pointer hover:bg-neutral-200",
                              isUpdating ? "opacity-50" : "",
                            ].join(" ")}
                          >
                            {seat.seat_number}
                          </button>
                        );
                      })}
                  </div>
                </div>
              )}

              {seats.filter((s) => s.seat_type === "semi_cama").length > 0 && (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-neutral-500 mb-2">
                    Semi Cama
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {seats
                      .filter((s) => s.seat_type === "semi_cama")
                      .map((seat) => {
                        const isOccupied = seat.status === "reserved" || seat.status === "sold";
                        const isBlocked = seat.status === "blocked";
                        const isUpdating =
                          toggleSeatMutation.isPending &&
                          toggleSeatMutation.variables?.seatNumber === seat.seat_number;
                        return (
                          <button
                            key={seat.seat_number}
                            disabled={isOccupied || isUpdating}
                            onClick={() => handleToggleSeat(seat)}
                            title={
                              isOccupied
                                ? "Ocupado"
                                : isBlocked
                                ? "Bloqueado — click para desbloquear"
                                : "Disponible — click para bloquear"
                            }
                            className={[
                              "w-9 h-9 rounded text-xs font-medium border transition-colors",
                              isOccupied
                                ? "bg-[#6B7FD4] text-white border-[#6B7FD4] cursor-not-allowed"
                                : isBlocked
                                ? "bg-neutral-400 text-white border-neutral-400 cursor-pointer hover:bg-neutral-500"
                                : "bg-neutral-100 text-neutral-700 border-neutral-300 cursor-pointer hover:bg-neutral-200",
                              isUpdating ? "opacity-50" : "",
                            ].join(" ")}
                          >
                            {seat.seat_number}
                          </button>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSeatsOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
