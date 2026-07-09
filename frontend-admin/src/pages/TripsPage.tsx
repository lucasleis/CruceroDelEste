import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getAdminTrips, getSeatLayouts, deleteTrip, createTrip } from "@/api/trips";
import { getRoutes } from "@/api/routes";
import type { AdminTripRead } from "@/types/trips";
import { STATUS_BADGE, formatDate } from "@/lib/tripUtils";
import CreateBatchTripsDialog from "./CreateBatchTripsDialog";

export default function TripsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tripToDelete, setTripToDelete] = useState<AdminTripRead | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [seriesOpen, setSeriesOpen] = useState(false);
  const [routeId, setRouteId] = useState("");
  const [seatLayoutId, setSeatLayoutId] = useState("");
  const [departureDate, setDepartureDate] = useState("");
  const [departureTime, setDepartureTime] = useState("");
  const [arrivalDate, setArrivalDate] = useState("");
  const [arrivalTime, setArrivalTime] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const tripsQuery = useQuery({
    queryKey: ["admin", "trips"],
    queryFn: getAdminTrips,
  });

  const seatLayoutsQuery = useQuery({
    queryKey: ["admin", "seat-layouts"],
    queryFn: getSeatLayouts,
  });

  const routesQuery = useQuery({
    queryKey: ["admin", "routes"],
    queryFn: getRoutes,
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

  function resetCreateForm() {
    setRouteId("");
    setSeatLayoutId("");
    setDepartureDate("");
    setDepartureTime("");
    setArrivalDate("");
    setArrivalTime("");
    setFormError(null);
  }

  async function handleCreateSubmit() {
    if (
      !routeId ||
      !seatLayoutId ||
      !departureDate ||
      !departureTime ||
      !arrivalDate ||
      !arrivalTime
    ) {
      return;
    }

    const departureAt = `${departureDate}T${departureTime}:00-03:00`;
    const arrivalAt = `${arrivalDate}T${arrivalTime}:00-03:00`;

    if (new Date(departureAt).getTime() < Date.now()) {
      setFormError("La fecha de salida no puede ser en el pasado.");
      return;
    }
    if (new Date(arrivalAt).getTime() <= new Date(departureAt).getTime()) {
      setFormError("La llegada debe ser posterior a la salida.");
      return;
    }
    setFormError(null);

    setSaving(true);
    try {
      await createTrip({
        route_id: routeId,
        seat_layout_id: seatLayoutId,
        departure_at: departureAt,
        arrival_at: arrivalAt,
      });
      toast.success("Viaje creado");
      queryClient.invalidateQueries({ queryKey: ["admin", "trips"] });
      setCreateOpen(false);
      resetCreateForm();
    } catch (error) {
      const detail = (
        error as { response?: { status?: number; data?: { detail?: string } } }
      )?.response;
      if (detail?.status === 422 && detail.data?.detail === "departure_in_past") {
        toast.error("La fecha de salida no puede ser en el pasado.");
      } else if (
        detail?.status === 422 &&
        detail.data?.detail === "arrival_before_departure"
      ) {
        toast.error("La llegada debe ser posterior a la salida.");
      } else {
        toast.error("Error al crear el viaje.");
      }
    } finally {
      setSaving(false);
    }
  }

  const trips = tripsQuery.data ?? [];
  const seatLayouts = seatLayoutsQuery.data ?? [];
  const routes = routesQuery.data ?? [];
  const isLoading = tripsQuery.isLoading || seatLayoutsQuery.isLoading;

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-neutral-900">Viajes</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setSeriesOpen(true)}>
            Viajes en serie
          </Button>
          <Button onClick={() => setCreateOpen(true)}>Nuevo viaje</Button>
        </div>
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
                  <TableRow
                    key={trip.id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/viajes/${trip.id}`)}
                  >
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
                        onClick={(e) => {
                          e.stopPropagation();
                          setTripToDelete(trip);
                        }}
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

      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) resetCreateForm();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo viaje</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-neutral-600">
                Ruta
              </label>
              <Select value={routeId} onValueChange={(value) => setRouteId(value)}>
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {routeId
                      ? (() => {
                          const route = routes.find((r) => r.id === routeId);
                          return route
                            ? `${route.origin_stop.name} (${route.origin_stop.country}) → ${route.destination_stop.name} (${route.destination_stop.country})`
                            : "Seleccionar ruta";
                        })()
                      : "Seleccionar ruta"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {routes.map((route) => (
                    <SelectItem key={route.id} value={route.id}>
                      {route.origin_stop.name} ({route.origin_stop.country}) →{" "}
                      {route.destination_stop.name} ({route.destination_stop.country})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-neutral-600">
                Layout
              </label>
              <Select
                value={seatLayoutId}
                onValueChange={(value) => setSeatLayoutId(value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {seatLayoutId
                      ? (() => {
                          const layout = seatLayouts.find(
                            (l) => l.id === seatLayoutId
                          );
                          return layout
                            ? `${layout.name} · ${layout.total_cama}C / ${layout.total_semi_cama}SC`
                            : "Seleccionar layout";
                        })()
                      : "Seleccionar layout"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {seatLayouts.map((layout) => (
                    <SelectItem key={layout.id} value={layout.id}>
                      {layout.name} · {layout.total_cama}C / {layout.total_semi_cama}SC
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-neutral-600">
                Salida
              </label>
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={departureDate}
                  onChange={(e) => setDepartureDate(e.target.value)}
                  required
                />
                <Input
                  type="time"
                  value={departureTime}
                  onChange={(e) => setDepartureTime(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-neutral-600">
                Llegada
              </label>
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={arrivalDate}
                  onChange={(e) => setArrivalDate(e.target.value)}
                  required
                />
                <Input
                  type="time"
                  value={arrivalTime}
                  onChange={(e) => setArrivalTime(e.target.value)}
                  required
                />
              </div>
            </div>

            {formError && <p className="text-sm text-[#E87B7B]">{formError}</p>}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleCreateSubmit}
              disabled={
                !routeId ||
                !seatLayoutId ||
                !departureDate ||
                !departureTime ||
                !arrivalDate ||
                !arrivalTime ||
                saving
              }
            >
              {saving ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <CreateBatchTripsDialog
        open={seriesOpen}
        onOpenChange={setSeriesOpen}
        routes={routes}
        seatLayouts={seatLayouts}
        onSuccess={() =>
          queryClient.invalidateQueries({ queryKey: ["admin", "trips"] })
        }
      />
    </div>
  );
}
