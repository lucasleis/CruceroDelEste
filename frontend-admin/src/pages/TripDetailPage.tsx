import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronLeft, Trash2 } from "lucide-react";
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
import { getAdminTrip, getSeatLayouts, updateTrip } from "@/api/trips";
import {
  getPriceTranches,
  createPriceTranche,
  deletePriceTranche,
} from "@/api/priceTranches";
import type { PriceTrancheRead, SeatTypeEnum, TripStatusEnum } from "@/types/trips";
import { STATUS_BADGE, formatDate } from "@/lib/tripUtils";

const TRIP_STATUS_LABEL: Record<TripStatusEnum, string> = {
  scheduled: "Programado",
  completed: "Completado",
  cancelled: "Cancelado",
};

function toBaDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-CA", {
    timeZone: "America/Buenos_Aires",
  });
}

function toBaTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", {
    timeZone: "America/Buenos_Aires",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const SEAT_TYPE_LABEL: Record<SeatTypeEnum, string> = {
  cama: "Cama",
  semi_cama: "Semi Cama",
};

export default function TripDetailPage() {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [trancheToDelete, setTrancheToDelete] =
    useState<PriceTrancheRead | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [seatType, setSeatType] = useState<SeatTypeEnum | "">("");
  const [minSold, setMinSold] = useState("");
  const [maxSold, setMaxSold] = useState("");
  const [price, setPrice] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editDepartureDate, setEditDepartureDate] = useState("");
  const [editDepartureTime, setEditDepartureTime] = useState("");
  const [editArrivalDate, setEditArrivalDate] = useState("");
  const [editArrivalTime, setEditArrivalTime] = useState("");
  const [editStatus, setEditStatus] = useState<TripStatusEnum | "">("");
  const [editError, setEditError] = useState<string | null>(null);
  const [editSaving, setEditSaving] = useState(false);

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

  const isLoading =
    tripQuery.isLoading || tranchesQuery.isLoading || seatLayoutsQuery.isLoading;

  function resetForm() {
    setSeatType("");
    setMinSold("");
    setMaxSold("");
    setPrice("");
    setFormError(null);
  }

  async function handleConfirmDeleteTranche() {
    if (!trancheToDelete || !tripId) return;
    try {
      await deletePriceTranche(tripId, trancheToDelete.id);
      toast.success("Tramo eliminado");
      queryClient.invalidateQueries({
        queryKey: ["admin", "trips", tripId, "price-tranches"],
      });
    } catch {
      toast.error("Error al eliminar el tramo.");
    } finally {
      setTrancheToDelete(null);
    }
  }

  async function handleCreateSubmit() {
    if (!tripId || !seatType || !minSold || !maxSold || !price) return;

    const minSoldNum = Number(minSold);
    const maxSoldNum = Number(maxSold);
    const priceNum = Number(price);

    if (maxSoldNum <= minSoldNum) {
      setFormError("El valor máximo debe ser mayor al mínimo.");
      return;
    }
    if (priceNum <= 0) {
      setFormError("El precio debe ser mayor a 0.");
      return;
    }
    setFormError(null);

    setSaving(true);
    try {
      await createPriceTranche(tripId, {
        seat_type: seatType,
        min_sold: minSoldNum,
        max_sold: maxSoldNum,
        price: priceNum,
      });
      toast.success("Tramo creado");
      queryClient.invalidateQueries({
        queryKey: ["admin", "trips", tripId, "price-tranches"],
      });
      setCreateOpen(false);
      resetForm();
    } catch (error) {
      const status = (error as { response?: { status?: number } })?.response
        ?.status;
      if (status === 409) {
        toast.error("Este tramo se superpone con uno existente.");
      } else {
        toast.error("Error al crear el tramo.");
      }
    } finally {
      setSaving(false);
    }
  }

  function openEditDialog() {
    if (!tripQuery.data) return;
    const trip = tripQuery.data;
    setEditDepartureDate(toBaDate(trip.departure_at));
    setEditDepartureTime(toBaTime(trip.departure_at));
    setEditArrivalDate(toBaDate(trip.arrival_at));
    setEditArrivalTime(toBaTime(trip.arrival_at));
    setEditStatus(trip.status);
    setEditError(null);
    setEditOpen(true);
  }

  function resetEditForm() {
    if (!tripQuery.data) return;
    const trip = tripQuery.data;
    setEditDepartureDate(toBaDate(trip.departure_at));
    setEditDepartureTime(toBaTime(trip.departure_at));
    setEditArrivalDate(toBaDate(trip.arrival_at));
    setEditArrivalTime(toBaTime(trip.arrival_at));
    setEditStatus(trip.status);
    setEditError(null);
  }

  async function handleEditSubmit() {
    if (
      !tripId ||
      !tripQuery.data ||
      !editDepartureDate ||
      !editDepartureTime ||
      !editArrivalDate ||
      !editArrivalTime ||
      !editStatus
    ) {
      return;
    }

    const trip = tripQuery.data;
    const newDepartureAt = `${editDepartureDate}T${editDepartureTime}:00-03:00`;
    const newArrivalAt = `${editArrivalDate}T${editArrivalTime}:00-03:00`;

    if (new Date(newArrivalAt).getTime() <= new Date(newDepartureAt).getTime()) {
      setEditError("La llegada debe ser posterior a la salida.");
      return;
    }
    setEditError(null);

    const originalDepartureDate = toBaDate(trip.departure_at);
    const originalDepartureTime = toBaTime(trip.departure_at);
    const originalArrivalDate = toBaDate(trip.arrival_at);
    const originalArrivalTime = toBaTime(trip.arrival_at);

    const payload: {
      departure_at?: string;
      arrival_at?: string;
      status?: TripStatusEnum;
    } = {};

    if (
      editDepartureDate !== originalDepartureDate ||
      editDepartureTime !== originalDepartureTime
    ) {
      payload.departure_at = newDepartureAt;
    }
    if (
      editArrivalDate !== originalArrivalDate ||
      editArrivalTime !== originalArrivalTime
    ) {
      payload.arrival_at = newArrivalAt;
    }
    if (editStatus !== trip.status) {
      payload.status = editStatus;
    }

    if (Object.keys(payload).length === 0) {
      setEditOpen(false);
      return;
    }

    setEditSaving(true);
    try {
      await updateTrip(tripId, payload);
      toast.success("Viaje actualizado");
      queryClient.invalidateQueries({ queryKey: ["admin", "trips", tripId] });
      queryClient.invalidateQueries({ queryKey: ["admin", "trips"] });
      setEditOpen(false);
    } catch (error) {
      const detail = (
        error as { response?: { status?: number; data?: { detail?: string } } }
      )?.response;
      if (detail?.status === 422 && detail.data?.detail === "arrival_before_departure") {
        toast.error("La llegada debe ser posterior a la salida.");
      } else if (
        detail?.status === 409 &&
        detail.data?.detail === "trip_has_confirmed_bookings"
      ) {
        toast.error("No se puede cancelar: el viaje tiene reservas confirmadas.");
      } else {
        toast.error("Error al actualizar el viaje.");
      }
    } finally {
      setEditSaving(false);
    }
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
          <Button variant="outline" size="sm" onClick={openEditDialog}>
            Editar viaje
          </Button>
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

      <div className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-600">
            Tramos de precio
          </h2>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            Agregar tramo
          </Button>
        </div>

        <div className="mt-3">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="bg-[#E8EBFA] text-xs font-medium uppercase tracking-wide text-[#4A4A6A]">
                  Tipo
                </TableHead>
                <TableHead className="bg-[#E8EBFA] text-xs font-medium uppercase tracking-wide text-[#4A4A6A]">
                  Pasajes vendidos
                </TableHead>
                <TableHead className="bg-[#E8EBFA] text-xs font-medium uppercase tracking-wide text-[#4A4A6A]">
                  Precio
                </TableHead>
                <TableHead className="bg-[#E8EBFA] text-xs font-medium uppercase tracking-wide text-[#4A4A6A]">
                  Acciones
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tranches.length === 0 && (
                <TableRow>
                  <TableCell className="py-3" colSpan={4}>
                    <p className="text-center text-sm text-neutral-600">
                      No hay tramos configurados.
                    </p>
                  </TableCell>
                </TableRow>
              )}

              {tranches.map((tranche) => (
                <TableRow key={tranche.id}>
                  <TableCell className="py-3 text-sm text-neutral-900">
                    {SEAT_TYPE_LABEL[tranche.seat_type]}
                  </TableCell>
                  <TableCell className="py-3 text-sm text-neutral-900">
                    {tranche.min_sold} – {tranche.max_sold}
                  </TableCell>
                  <TableCell className="py-3 text-sm text-neutral-900">
                    $ {tranche.price.toLocaleString("es-AR")}
                  </TableCell>
                  <TableCell className="py-3">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-[#E87B7B]"
                      onClick={() => setTrancheToDelete(tranche)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog
        open={trancheToDelete !== null}
        onOpenChange={(open) => {
          if (!open) setTrancheToDelete(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Eliminar este tramo?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-neutral-600">
            Esta acción no se puede deshacer.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTrancheToDelete(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleConfirmDeleteTranche}>
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo tramo de precio</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-neutral-600">
                Tipo de asiento
              </label>
              <Select
                value={seatType}
                onValueChange={(value) => setSeatType(value as SeatTypeEnum)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {seatType ? SEAT_TYPE_LABEL[seatType] : "Seleccionar tipo"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cama">Cama</SelectItem>
                  <SelectItem value="semi_cama">Semi Cama</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-neutral-600">
                Desde (pasajes vendidos)
              </label>
              <Input
                type="number"
                min={0}
                value={minSold}
                onChange={(e) => setMinSold(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-neutral-600">
                Hasta (pasajes vendidos)
              </label>
              <Input
                type="number"
                min={1}
                value={maxSold}
                onChange={(e) => setMaxSold(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-neutral-600">
                Precio (ARS)
              </label>
              <Input
                type="number"
                min={1}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
              />
            </div>

            {formError && (
              <p className="text-sm text-[#E87B7B]">{formError}</p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleCreateSubmit}
              disabled={!seatType || !minSold || !maxSold || !price || saving}
            >
              {saving ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) resetEditForm();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar viaje</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-neutral-600">
                Salida
              </label>
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={editDepartureDate}
                  onChange={(e) => setEditDepartureDate(e.target.value)}
                  required
                />
                <Input
                  type="time"
                  value={editDepartureTime}
                  onChange={(e) => setEditDepartureTime(e.target.value)}
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
                  value={editArrivalDate}
                  onChange={(e) => setEditArrivalDate(e.target.value)}
                  required
                />
                <Input
                  type="time"
                  value={editArrivalTime}
                  onChange={(e) => setEditArrivalTime(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-neutral-600">
                Estado
              </label>
              <Select
                value={editStatus}
                onValueChange={(value) => setEditStatus(value as TripStatusEnum)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {editStatus ? TRIP_STATUS_LABEL[editStatus] : "Seleccionar estado"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduled">Programado</SelectItem>
                  <SelectItem value="completed">Completado</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {editError && <p className="text-sm text-[#E87B7B]">{editError}</p>}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleEditSubmit}
              disabled={
                !editDepartureDate ||
                !editDepartureTime ||
                !editArrivalDate ||
                !editArrivalTime ||
                !editStatus ||
                editSaving
              }
            >
              {editSaving ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
