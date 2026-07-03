import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getAdminTrips, getSeatLayouts, deleteTrip } from "@/api/trips";
import type { AdminTripRead, TripStatusEnum } from "@/types/trips";

const STATUS_BADGE: Record<
  TripStatusEnum,
  { label: string; className: string }
> = {
  scheduled: {
    label: "Programado",
    className: "bg-[#E8EBFA] text-[#6B7FD4]",
  },
  completed: {
    label: "Completado",
    className: "bg-[#E8F5EE] text-[#6BBF8E]",
  },
  cancelled: {
    label: "Cancelado",
    className: "bg-[#FDEAEA] text-[#E87B7B]",
  },
};

const dateFormatter = new Intl.DateTimeFormat("es-AR", {
  timeZone: "America/Buenos_Aires",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function formatDate(iso: string): string {
  return dateFormatter.format(new Date(iso)).replace(",", "");
}

export default function TripsPage() {
  const queryClient = useQueryClient();
  const [tripToDelete, setTripToDelete] = useState<AdminTripRead | null>(null);

  const tripsQuery = useQuery({
    queryKey: ["admin", "trips"],
    queryFn: getAdminTrips,
  });

  const seatLayoutsQuery = useQuery({
    queryKey: ["admin", "seat-layouts"],
    queryFn: getSeatLayouts,
  });

  async function handleConfirmDelete() {
    if (!tripToDelete) return;
    try {
      await deleteTrip(tripToDelete.id);
      toast.success("Viaje eliminado");
      queryClient.invalidateQueries({ queryKey: ["admin", "trips"] });
    } catch (error) {
      const status = (error as { response?: { status?: number } })?.response
        ?.status;
      if (status === 409) {
        toast.error("No se puede eliminar: el viaje tiene reservas asociadas.");
      } else {
        toast.error("Error al eliminar el viaje.");
      }
    } finally {
      setTripToDelete(null);
    }
  }

  const trips = tripsQuery.data ?? [];
  const seatLayouts = seatLayoutsQuery.data ?? [];
  const isLoading = tripsQuery.isLoading || seatLayoutsQuery.isLoading;

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-neutral-900">Viajes</h1>
        <Button disabled title="Próximamente">
          Nuevo viaje
        </Button>
      </div>

      <div className="mt-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ruta</TableHead>
              <TableHead>Salida</TableHead>
              <TableHead>Llegada</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Layout</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={index}>
                  <TableCell className="py-3" colSpan={6}>
                    <Skeleton className="h-6 w-full" />
                  </TableCell>
                </TableRow>
              ))}

            {!isLoading && trips.length === 0 && (
              <TableRow>
                <TableCell className="py-3" colSpan={6}>
                  <p className="text-center text-sm text-neutral-600">
                    No hay viajes registrados.
                  </p>
                </TableCell>
              </TableRow>
            )}

            {!isLoading &&
              trips.map((trip) => {
                const status = STATUS_BADGE[trip.status];
                const layout = seatLayouts.find(
                  (l) => l.id === trip.seat_layout_id
                );

                return (
                  <TableRow key={trip.id}>
                    <TableCell className="py-3">
                      <div className="text-sm text-neutral-900">
                        {trip.route.origin_stop.name} →{" "}
                        {trip.route.destination_stop.name}
                      </div>
                      <div className="text-xs text-neutral-600">
                        {trip.route.origin_stop.country} →{" "}
                        {trip.route.destination_stop.country}
                      </div>
                    </TableCell>
                    <TableCell className="py-3 text-sm text-neutral-900">
                      {formatDate(trip.departure_at)}
                    </TableCell>
                    <TableCell className="py-3 text-sm text-neutral-900">
                      {formatDate(trip.arrival_at)}
                    </TableCell>
                    <TableCell className="py-3">
                      <Badge className={status.className}>{status.label}</Badge>
                    </TableCell>
                    <TableCell className="py-3 text-sm text-neutral-900">
                      {layout
                        ? `${layout.name} · ${layout.total_cama}C / ${layout.total_semi_cama}SC`
                        : "—"}
                    </TableCell>
                    <TableCell className="py-3">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-[#E87B7B]"
                        onClick={() => setTripToDelete(trip)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>
      </div>

      <Dialog
        open={tripToDelete !== null}
        onOpenChange={(open) => {
          if (!open) setTripToDelete(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              ¿Eliminar este viaje? Esta acción no se puede deshacer.
            </DialogTitle>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTripToDelete(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
