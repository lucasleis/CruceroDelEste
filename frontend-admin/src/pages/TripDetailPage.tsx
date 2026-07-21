import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronUp, ChevronDown, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getAdminTrip, getSeatLayouts, getTripStopOverrides, initializeTripStopOverrides, deleteTripStopOverride, reorderTripStopOverrides } from "@/api/trips";
import { toast } from "sonner";
import { getPriceTranches } from "@/api/priceTranches";
import { EditTripDialog } from "@/components/trips/EditTripDialog";
import { PriceTrancheDialog } from "@/components/trips/PriceTrancheDialog";
import { SeatsDialog } from "@/components/trips/SeatsDialog";
import type { TripStatusEnum } from "@/types/trips";
import { STATUS_BADGE, formatDate } from "@/lib/tripUtils";

export default function TripDetailPage() {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [stopsOpen, setStopsOpen] = useState(false);
  const [initializingStops, setInitializingStops] = useState(false);

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

  const tripStopsQuery = useQuery({
    queryKey: ["admin", "trips", tripId, "stops"],
    queryFn: () => getTripStopOverrides(tripId as string),
    enabled: !!tripId && stopsOpen,
  });
  const tripStops = tripStopsQuery.data ?? [];
  const hasOverrides = tripStops.length > 0;

  const isLoading =
    tripQuery.isLoading || tranchesQuery.isLoading || seatLayoutsQuery.isLoading;

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

  async function handleInitializeStops() {
    if (!tripId) return;
    setInitializingStops(true);
    try {
      await initializeTripStopOverrides(tripId);
      queryClient.invalidateQueries({ queryKey: ["admin", "trips", tripId, "stops"] });
    } catch {
      toast.error("Error al inicializar las paradas.");
    } finally {
      setInitializingStops(false);
    }
  }

  async function handleDeleteStop(stopId: string) {
    if (!tripId) return;
    try {
      await deleteTripStopOverride(tripId, stopId);
      queryClient.invalidateQueries({ queryKey: ["admin", "trips", tripId, "stops"] });
    } catch {
      toast.error("Error al eliminar la parada.");
    }
  }

  async function handleMoveStop(stopId: string, direction: "up" | "down") {
    if (!tripId) return;
    const sorted = [...tripStops].sort((a, b) => a.order - b.order);
    const idx = sorted.findIndex((s) => s.stop_id === stopId);
    if (direction === "up" && idx === 0) return;
    if (direction === "down" && idx === sorted.length - 1) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    const newOrder = [...sorted];
    [newOrder[idx], newOrder[swapIdx]] = [newOrder[swapIdx], newOrder[idx]];
    try {
      await reorderTripStopOverrides(tripId, newOrder.map((s) => s.stop_id));
      queryClient.invalidateQueries({ queryKey: ["admin", "trips", tripId, "stops"] });
    } catch {
      toast.error("Error al reordenar las paradas.");
    }
  }

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
          <SeatsDialog tripId={tripId as string} trip={trip} />
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

          {tripStopsQuery.isLoading && (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          )}

          {!tripStopsQuery.isLoading && tripStops.length === 0 && (
            <p className="text-sm text-neutral-600">Sin paradas registradas.</p>
          )}

          {!tripStopsQuery.isLoading && tripStops.length > 0 && (
            <ol className="space-y-1 max-h-80 overflow-y-auto">
              {[...tripStops].sort((a, b) => a.order - b.order).map((stop, idx, arr) => (
                <li key={stop.stop_id} className="flex items-center gap-2 text-sm text-neutral-900">
                  <span className="text-neutral-400 w-6 text-right shrink-0">{stop.order + 1}.</span>
                  <span className="flex-1">{stop.name}</span>
                  <Badge className={stop.country === "AR" ? "bg-blue-100 text-blue-700" : "bg-red-100 text-red-700"}>
                    {stop.country}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    disabled={idx === 0}
                    onClick={() => handleMoveStop(stop.stop_id, "up")}
                  >
                    <ChevronUp className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    disabled={idx === arr.length - 1}
                    onClick={() => handleMoveStop(stop.stop_id, "down")}
                  >
                    <ChevronDown className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-[#E87B7B]"
                    onClick={() => handleDeleteStop(stop.stop_id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </li>
              ))}
            </ol>
          )}

          {!tripStopsQuery.isLoading && !hasOverrides && (
            <div className="border-t pt-3">
              <Button
                size="sm"
                variant="outline"
                onClick={handleInitializeStops}
                disabled={initializingStops}
              >
                {initializingStops ? "Inicializando..." : "Inicializar desde la ruta"}
              </Button>
              <p className="mt-1 text-xs text-neutral-500">
                Copia las paradas de la ruta para este viaje y permite editarlas de forma independiente.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setStopsOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
