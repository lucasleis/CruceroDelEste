import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronDown, ChevronLeft, ChevronUp, Trash2 } from "lucide-react";
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
import {
  getAdminTrip,
  getRouteStops,
  getSeatLayouts,
  updateTrip,
  getTripSeats,
  updateSeatStatus,
  type AdminSeatRead,
} from "@/api/trips";
import {
  getPriceTranches,
  createPriceTranche,
  deletePriceTranche,
} from "@/api/priceTranches";
import type {
  PriceTrancheRead,
  SeatTypeEnum,
  TripStatusEnum,
} from "@/types/trips";
import {
  STATUS_BADGE,
  formatDate,
  SEAT_TYPE_LABEL,
  TRIP_STATUS_LABEL,
} from "@/lib/tripUtils";

function toBaDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-CA", {
    timeZone: "America/Buenos_Aires",
  });
}

function computeAllGaps(
  tranches: PriceTrancheRead[],
  seatType: "cama" | "semi_cama",
  total: number
): { from: number; to: number }[] {
  if (total === 0) return [];

  const relevant = tranches
    .filter((t) => t.seat_type === seatType)
    .sort((a, b) => a.min_sold - b.min_sold);

  const gaps: { from: number; to: number }[] = [];
  let expected = 1;

  for (const t of relevant) {
    if (t.min_sold > expected) {
      gaps.push({ from: expected, to: t.min_sold - 1 });
    }
    expected = Math.max(expected, t.max_sold + 1);
  }

  if (expected <= total) {
    gaps.push({ from: expected, to: total });
  }

  return gaps;
}

function toBaTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", {
    timeZone: "America/Buenos_Aires",
    hour: "2-digit",
    minute: "2-digit",
  });
}

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

  const [stopsOpen, setStopsOpen] = useState(false);
  const [camaOpen, setCamaOpen] = useState(false);
  const [semiCamaOpen, setSemiCamaOpen] = useState(false);

  const [seatsOpen, setSeatsOpen] = useState(false);
  const [seats, setSeats] = useState<AdminSeatRead[]>([]);
  const [seatsLoading, setSeatsLoading] = useState(false);
  const [seatsError, setSeatsError] = useState<string | null>(null);
  const [updatingSeat, setUpdatingSeat] = useState<string | null>(null);

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
      const detail = (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      if (detail === "tranche_overlap") {
        toast.error("Este rango se superpone con un tramo existente.");
      } else if (detail === "tranche_limit_exceeded") {
        toast.error("Ya hay 5 tramos configurados para este tipo de asiento.");
      } else if (detail === "tranche_exceeds_seat_capacity") {
        toast.error("El rango supera la cantidad de asientos disponibles para este tipo.");
      } else if (detail === "tranche_gap") {
        toast.error("Hay un hueco entre este tramo y el anterior.");
      } else if (detail === "trip_has_no_seat_layout") {
        toast.error("Este viaje no tiene un layout de asientos asignado.");
      } else if (detail === "tranche_must_start_at_zero") {
        toast.error("El primer tramo debe arrancar desde 0 asientos vendidos.");
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

  async function handleOpenSeats() {
    setSeatsOpen(true);
    setSeatsLoading(true);
    setSeatsError(null);
    try {
      const data = await getTripSeats(tripId as string);
      setSeats(data);
    } catch {
      setSeatsError("No se pudieron cargar los asientos.");
    } finally {
      setSeatsLoading(false);
    }
  }

  async function handleToggleSeat(seat: AdminSeatRead) {
    if (seat.status === "reserved" || seat.status === "sold") return;
    const newStatus = seat.status === "blocked" ? "available" : "blocked";
    setUpdatingSeat(seat.seat_number);
    try {
      const updated = await updateSeatStatus(tripId as string, seat.seat_number, newStatus);
      setSeats((prev) =>
        prev.map((s) => (s.seat_number === updated.seat_number ? updated : s))
      );
    } catch {
      toast.error("No se pudo actualizar el asiento.");
    } finally {
      setUpdatingSeat(null);
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
  const camaTotal = layout?.total_cama ?? 0;
  const semiCamaTotal = layout?.total_semi_cama ?? 0;
  const camaGaps = computeAllGaps(tranches, "cama", camaTotal);
  const semiCamaGaps = computeAllGaps(tranches, "semi_cama", semiCamaTotal);
  const camaTransches = tranches
    .filter((t) => t.seat_type === "cama")
    .sort((a, b) => a.min_sold - b.min_sold);
  const semiCamaTranches = tranches
    .filter((t) => t.seat_type === "semi_cama")
    .sort((a, b) => a.min_sold - b.min_sold);

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

        {camaGaps.length > 0 && (
          <div className="mt-3 rounded-md border border-[#E87B7B] bg-[#FBEAEA] px-4 py-3">
            <p className="text-sm text-[#E87B7B]">Cama Ejecutivo — faltan tramos en:</p>
            <ul className="mt-1 space-y-0.5">
              {camaGaps.map((g, i) => (
                <li key={i} className="text-sm text-[#E87B7B]">
                  Asientos {g.from} – {g.to}
                </li>
              ))}
            </ul>
          </div>
        )}

        {semiCamaGaps.length > 0 && (
          <div className="mt-3 rounded-md border border-[#E87B7B] bg-[#FBEAEA] px-4 py-3">
            <p className="text-sm text-[#E87B7B]">Semi Cama — faltan tramos en:</p>
            <ul className="mt-1 space-y-0.5">
              {semiCamaGaps.map((g, i) => (
                <li key={i} className="text-sm text-[#E87B7B]">
                  Asientos {g.from} – {g.to}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-4">
          <Table>
            <TableHeader
              className="cursor-pointer select-none"
              onClick={() => setCamaOpen((prev) => !prev)}
            >
              <TableRow>
                <TableHead
                  colSpan={2}
                  className="bg-[#E8EBFA] text-xs font-medium uppercase tracking-wide text-[#4A4A6A]"
                >
                  Cama Ejecutivo ({camaTransches.length})
                </TableHead>
                <TableHead className="bg-[#E8EBFA] text-xs font-medium uppercase tracking-wide text-[#4A4A6A] text-right">
                  {camaOpen ? (
                    <ChevronUp className="size-3.5 ml-auto" />
                  ) : (
                    <ChevronDown className="size-3.5 ml-auto" />
                  )}
                </TableHead>
              </TableRow>
            </TableHeader>
            {camaOpen && (
              <TableBody>
                {camaTransches.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3}>
                      <p className="text-center text-sm text-neutral-600">
                        Sin tramos configurados.
                      </p>
                    </TableCell>
                  </TableRow>
                )}
                {camaTransches.map((tranche) => (
                  <TableRow key={tranche.id}>
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
            )}
          </Table>
        </div>

        <div className="mt-4">
          <Table>
            <TableHeader
              className="cursor-pointer select-none"
              onClick={() => setSemiCamaOpen((prev) => !prev)}
            >
              <TableRow>
                <TableHead
                  colSpan={2}
                  className="bg-[#E8EBFA] text-xs font-medium uppercase tracking-wide text-[#4A4A6A]"
                >
                  Semi Cama ({semiCamaTranches.length})
                </TableHead>
                <TableHead className="bg-[#E8EBFA] text-xs font-medium uppercase tracking-wide text-[#4A4A6A] text-right">
                  {semiCamaOpen ? (
                    <ChevronUp className="size-3.5 ml-auto" />
                  ) : (
                    <ChevronDown className="size-3.5 ml-auto" />
                  )}
                </TableHead>
              </TableRow>
            </TableHeader>
            {semiCamaOpen && (
              <TableBody>
                {semiCamaTranches.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3}>
                      <p className="text-center text-sm text-neutral-600">
                        Sin tramos configurados.
                      </p>
                    </TableCell>
                  </TableRow>
                )}
                {semiCamaTranches.map((tranche) => (
                  <TableRow key={tranche.id}>
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
            )}
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

          {seatsLoading && (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
            </div>
          )}

          {seatsError && (
            <p className="text-sm text-[#E87B7B]">{seatsError}</p>
          )}

          {!seatsLoading && !seatsError && seats.length > 0 && (
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
                        const isUpdating = updatingSeat === seat.seat_number;
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
                        const isUpdating = updatingSeat === seat.seat_number;
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
