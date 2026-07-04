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
import { getRoutes, createRoute, deleteRoute } from "@/api/routes";
import type { CountryEnum, StopRead, RouteRead } from "@/types/trips";

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

  const [routeToDelete, setRouteToDelete] = useState<RouteRead | null>(null);
  const [createRouteOpen, setCreateRouteOpen] = useState(false);
  const [originStopId, setOriginStopId] = useState("");
  const [destinationStopId, setDestinationStopId] = useState("");
  const [routeError, setRouteError] = useState<string | null>(null);
  const [savingRoute, setSavingRoute] = useState(false);

  const stopsQuery = useQuery({
    queryKey: ["admin", "stops"],
    queryFn: getStops,
  });

  const stops = stopsQuery.data ?? [];

  const routesQuery = useQuery({
    queryKey: ["admin", "routes"],
    queryFn: getRoutes,
  });

  const routes = routesQuery.data ?? [];

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

  function resetRouteForm() {
    setOriginStopId("");
    setDestinationStopId("");
    setRouteError(null);
  }

  async function handleConfirmDeleteRoute() {
    if (!routeToDelete) return;
    try {
      await deleteRoute(routeToDelete.id);
      toast.success("Ruta eliminada");
      queryClient.invalidateQueries({ queryKey: ["admin", "routes"] });
    } catch (error) {
      const status = (error as { response?: { status?: number } })?.response
        ?.status;
      if (status === 409) {
        toast.error("No se puede eliminar: la ruta tiene viajes asociados.");
      } else {
        toast.error("Error al eliminar la ruta.");
      }
    } finally {
      setRouteToDelete(null);
    }
  }

  async function handleCreateRouteSubmit() {
    if (!originStopId || !destinationStopId) return;

    const origin = stops.find((s) => s.id === originStopId);
    const destination = stops.find((s) => s.id === destinationStopId);
    if (origin && destination && origin.country === destination.country) {
      setRouteError(
        "Las rutas deben ser internacionales (AR → PY o PY → AR)."
      );
      return;
    }
    setRouteError(null);

    setSavingRoute(true);
    try {
      await createRoute({
        origin_stop_id: originStopId,
        destination_stop_id: destinationStopId,
      });
      toast.success("Ruta creada");
      queryClient.invalidateQueries({ queryKey: ["admin", "routes"] });
      setCreateRouteOpen(false);
      resetRouteForm();
    } catch (error) {
      const status = (error as { response?: { status?: number } })?.response
        ?.status;
      if (status === 422) {
        toast.error("La ruta debe ser internacional (AR ↔ PY).");
      } else if (status === 409) {
        toast.error("Esta ruta ya existe.");
      } else {
        toast.error("Error al crear la ruta.");
      }
    } finally {
      setSavingRoute(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-semibold text-neutral-900">Catálogo</h1>

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
                <TableHead className="bg-[#E8EBFA] text-xs font-medium uppercase tracking-wide text-[#4A4A6A]">Nombre</TableHead>
                <TableHead className="bg-[#E8EBFA] text-xs font-medium uppercase tracking-wide text-[#4A4A6A]">País</TableHead>
                <TableHead className="bg-[#E8EBFA] text-xs font-medium uppercase tracking-wide text-[#4A4A6A]">Acciones</TableHead>
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

      <div className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-600">
            Rutas
          </h2>
          <Button size="sm" onClick={() => setCreateRouteOpen(true)}>
            Agregar ruta
          </Button>
        </div>

        <div className="mt-3">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="bg-[#E8EBFA] text-xs font-medium uppercase tracking-wide text-[#4A4A6A]">Origen</TableHead>
                <TableHead className="bg-[#E8EBFA] text-xs font-medium uppercase tracking-wide text-[#4A4A6A]">Destino</TableHead>
                <TableHead className="bg-[#E8EBFA] text-xs font-medium uppercase tracking-wide text-[#4A4A6A]">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {routesQuery.isLoading &&
                Array.from({ length: 3 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell className="py-3" colSpan={3}>
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                  </TableRow>
                ))}

              {!routesQuery.isLoading && routes.length === 0 && (
                <TableRow>
                  <TableCell className="py-3" colSpan={3}>
                    <p className="text-center text-sm text-neutral-600">
                      No hay rutas registradas.
                    </p>
                  </TableCell>
                </TableRow>
              )}

              {!routesQuery.isLoading &&
                routes.map((route) => (
                  <TableRow key={route.id}>
                    <TableCell className="py-3">
                      <div className="text-sm text-neutral-900">
                        {route.origin_stop.name}
                      </div>
                      <div className="text-xs text-neutral-600">
                        {COUNTRY_LABEL[route.origin_stop.country]}
                      </div>
                    </TableCell>
                    <TableCell className="py-3">
                      <div className="text-sm text-neutral-900">
                        {route.destination_stop.name}
                      </div>
                      <div className="text-xs text-neutral-600">
                        {COUNTRY_LABEL[route.destination_stop.country]}
                      </div>
                    </TableCell>
                    <TableCell className="py-3">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-[#E87B7B]"
                        onClick={() => setRouteToDelete(route)}
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

      <Dialog
        open={routeToDelete !== null}
        onOpenChange={(open) => {
          if (!open) setRouteToDelete(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Eliminar esta ruta?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-neutral-600">
            Esta acción no se puede deshacer.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRouteToDelete(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleConfirmDeleteRoute}>
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={createRouteOpen}
        onOpenChange={(open) => {
          setCreateRouteOpen(open);
          if (!open) resetRouteForm();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva ruta</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-neutral-600">
                Origen
              </label>
              <Select
                value={originStopId}
                onValueChange={(value) => setOriginStopId(value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {originStopId
                      ? stops.find((s) => s.id === originStopId)?.name + " (" + stops.find((s) => s.id === originStopId)?.country + ")"
                      : "Seleccionar parada"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {stops.map((stop) => (
                    <SelectItem key={stop.id} value={stop.id}>
                      {stop.name} ({stop.country})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-neutral-600">
                Destino
              </label>
              <Select
                value={destinationStopId}
                onValueChange={(value) => setDestinationStopId(value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {destinationStopId
                      ? stops.find((s) => s.id === destinationStopId)?.name + " (" + stops.find((s) => s.id === destinationStopId)?.country + ")"
                      : "Seleccionar parada"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {stops.map((stop) => (
                    <SelectItem key={stop.id} value={stop.id}>
                      {stop.name} ({stop.country})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {routeError && (
              <p className="text-sm text-[#E87B7B]">{routeError}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateRouteOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreateRouteSubmit}
              disabled={!originStopId || !destinationStopId || savingRoute}
            >
              {savingRoute ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
