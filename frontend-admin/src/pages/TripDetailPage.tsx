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
import { getAdminTrip, getSeatLayouts } from "@/api/trips";
import {
  getPriceTranches,
  createPriceTranche,
  deletePriceTranche,
} from "@/api/priceTranches";
import type { PriceTrancheRead, SeatTypeEnum, TripStatusEnum } from "@/types/trips";

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

const SEAT_TYPE_LABEL: Record<SeatTypeEnum, string> = {
  cama: "Cama",
  semi_cama: "Semi Cama",
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
        <Badge className={status.className}>{status.label}</Badge>
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
    </div>
  );
}
