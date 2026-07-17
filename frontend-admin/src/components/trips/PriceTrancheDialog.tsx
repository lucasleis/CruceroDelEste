import { useState } from "react";
import { toast } from "sonner";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { createPriceTranche, deletePriceTranche } from "@/api/priceTranches";
import type { PriceTrancheRead, SeatTypeEnum } from "@/types/trips";
import { SEAT_TYPE_LABEL } from "@/lib/tripUtils";

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

interface PriceTrancheDialogProps {
  tripId: string;
  tranches: PriceTrancheRead[];
  camaTotal: number;
  semiCamaTotal: number;
  onSuccess: () => void;
}

export function PriceTrancheDialog({
  tripId,
  tranches,
  camaTotal,
  semiCamaTotal,
  onSuccess,
}: PriceTrancheDialogProps) {
  const [trancheToDelete, setTrancheToDelete] =
    useState<PriceTrancheRead | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [seatType, setSeatType] = useState<SeatTypeEnum | "">("");
  const [minSold, setMinSold] = useState("");
  const [maxSold, setMaxSold] = useState("");
  const [price, setPrice] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [camaOpen, setCamaOpen] = useState(false);
  const [semiCamaOpen, setSemiCamaOpen] = useState(false);

  const camaGaps = computeAllGaps(tranches, "cama", camaTotal);
  const semiCamaGaps = computeAllGaps(tranches, "semi_cama", semiCamaTotal);
  const camaTranches = tranches
    .filter((t) => t.seat_type === "cama")
    .sort((a, b) => a.min_sold - b.min_sold);
  const semiCamaTranches = tranches
    .filter((t) => t.seat_type === "semi_cama")
    .sort((a, b) => a.min_sold - b.min_sold);

  function resetForm() {
    setSeatType("");
    setMinSold("");
    setMaxSold("");
    setPrice("");
    setFormError(null);
  }

  async function handleConfirmDeleteTranche() {
    if (!trancheToDelete) return;
    try {
      await deletePriceTranche(tripId, trancheToDelete.id);
      toast.success("Tramo eliminado");
      onSuccess();
    } catch {
      toast.error("Error al eliminar el tramo.");
    } finally {
      setTrancheToDelete(null);
    }
  }

  async function handleCreateSubmit() {
    if (!seatType || !minSold || !maxSold || !price) return;

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
      onSuccess();
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

  return (
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
                Cama Ejecutivo ({camaTranches.length})
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
              {camaTranches.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3}>
                    <p className="text-center text-sm text-neutral-600">
                      Sin tramos configurados.
                    </p>
                  </TableCell>
                </TableRow>
              )}
              {camaTranches.map((tranche) => (
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
