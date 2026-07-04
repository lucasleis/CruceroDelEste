import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getStops, createStop, deleteStop } from "@/api/stops";
import type { CountryEnum, StopRead } from "@/types/trips";

const COUNTRY_LABEL: Record<CountryEnum, string> = {
  AR: "Argentina",
  PY: "Paraguay",
};

export default function ConfiguracionPage() {
  const queryClient = useQueryClient();
  const [stopToDelete, setStopToDelete] = useState<StopRead | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [country, setCountry] = useState<CountryEnum | "">("");
  const [saving, setSaving] = useState(false);

  const stopsQuery = useQuery({
    queryKey: ["admin", "stops"],
    queryFn: getStops,
  });

  const stops = stopsQuery.data ?? [];

  async function handleConfirmDelete() {
    if (!stopToDelete) return;
    try {
      await deleteStop(stopToDelete.id);
      toast.success("Parada eliminada");
      queryClient.invalidateQueries({ queryKey: ["admin", "stops"] });
    } catch (error) {
      const status = (error as { response?: { status?: number } })?.response
        ?.status;
      if (status === 409) {
        toast.error(
          "No se puede eliminar: la parada está siendo usada en una ruta."
        );
      } else {
        toast.error("Error al eliminar la parada.");
      }
    } finally {
      setStopToDelete(null);
    }
  }

  function resetForm() {
    setName("");
    setCountry("");
  }

  async function handleCreateSubmit() {
    if (!name || !country) return;
    setSaving(true);
    try {
      await createStop({ name, country });
      toast.success("Parada creada");
      queryClient.invalidateQueries({ queryKey: ["admin", "stops"] });
      setCreateOpen(false);
      resetForm();
    } catch (error) {
      const status = (error as { response?: { status?: number } })?.response
        ?.status;
      if (status === 409) {
        toast.error("Ya existe una parada con ese nombre.");
      } else {
        toast.error("Error al crear la parada.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-semibold text-neutral-900">Configuración</h1>

      <div className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-600">
            Paradas
          </h2>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            Agregar parada
          </Button>
        </div>

        <div className="mt-3">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>País</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stopsQuery.isLoading &&
                Array.from({ length: 3 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell className="py-3" colSpan={3}>
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                  </TableRow>
                ))}

              {!stopsQuery.isLoading && stops.length === 0 && (
                <TableRow>
                  <TableCell className="py-3" colSpan={3}>
                    <p className="text-center text-sm text-neutral-600">
                      No hay paradas registradas.
                    </p>
                  </TableCell>
                </TableRow>
              )}

              {!stopsQuery.isLoading &&
                stops.map((stop) => (
                  <TableRow key={stop.id}>
                    <TableCell className="py-3 text-sm text-neutral-900">
                      {stop.name}
                    </TableCell>
                    <TableCell className="py-3 text-sm text-neutral-900">
                      {COUNTRY_LABEL[stop.country]}
                    </TableCell>
                    <TableCell className="py-3">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-[#E87B7B]"
                        onClick={() => setStopToDelete(stop)}
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
        open={stopToDelete !== null}
        onOpenChange={(open) => {
          if (!open) setStopToDelete(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Eliminar esta parada?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-neutral-600">
            Esta acción no se puede deshacer.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStopToDelete(null)}>
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
          if (!open) resetForm();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva parada</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="stop-name"
                className="text-sm font-medium text-neutral-600"
              >
                Nombre
              </label>
              <Input
                id="stop-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={100}
                placeholder="Ej: Retiro"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-neutral-600">
                País
              </label>
              <Select
                value={country}
                onValueChange={(value) => setCountry(value as CountryEnum)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleccionar país" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AR">Argentina</SelectItem>
                  <SelectItem value="PY">Paraguay</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleCreateSubmit}
              disabled={!name || !country || saving}
            >
              {saving ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
