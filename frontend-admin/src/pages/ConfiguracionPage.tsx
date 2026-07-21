import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pencil, Trash2, ChevronUp, ChevronDown, ListOrdered } from "lucide-react";
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
import { getStops, createStop, deleteStop, updateStop } from "@/api/stops";
import { getRoutes, createRoute, deleteRoute, getRouteStops, addRouteStop, removeRouteStop, reorderRouteStops } from "@/api/routes";
import type { CountryEnum, StopRead, RouteRead, RouteStopRead } from "@/types/trips";

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
  const [province, setProvince] = useState("");
  const [saving, setSaving] = useState(false);

  const [stopToEdit, setStopToEdit] = useState<StopRead | null>(null);
  const [editName, setEditName] = useState("");
  const [editCountry, setEditCountry] = useState<CountryEnum | "">("");
  const [editProvince, setEditProvince] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  const [routeToDelete, setRouteToDelete] = useState<RouteRead | null>(null);
  const [createRouteOpen, setCreateRouteOpen] = useState(false);
  const [originStopId, setOriginStopId] = useState("");
  const [destinationStopId, setDestinationStopId] = useState("");
  const [routeError, setRouteError] = useState<string | null>(null);
  const [savingRoute, setSavingRoute] = useState(false);

  const [manageStopsRoute, setManageStopsRoute] = useState<RouteRead | null>(null);
  const [addStopId, setAddStopId] = useState("");
  const [addStopOrder, setAddStopOrder] = useState<number | "">("");
  const [addingStop, setAddingStop] = useState(false);
  const [addStopError, setAddStopError] = useState<string | null>(null);

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

  const routeStopsQuery = useQuery({
    queryKey: ["admin", "routes", manageStopsRoute?.id, "stops"],
    queryFn: () => getRouteStops(manageStopsRoute!.id),
    enabled: !!manageStopsRoute,
  });
  const routeStops = routeStopsQuery.data ?? [];

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
    setProvince("");
  }

  async function handleCreateSubmit() {
    if (!name || !country) return;
    setSaving(true);
    try {
      await createStop({ name, country, province: province || undefined });
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

  async function handleConfirmEditStop() {
    if (!stopToEdit) return;
    setEditSaving(true);
    try {
      await updateStop(stopToEdit.id, {
        name: editName.trim(),
        country: editCountry || undefined,
        province: editProvince.trim() || undefined,
      });
      toast.success("Parada actualizada");
      queryClient.invalidateQueries({ queryKey: ["admin", "stops"] });
      setStopToEdit(null);
    } catch (error) {
      const status = (error as { response?: { status?: number } })?.response
        ?.status;
      if (status === 409) {
        toast.error("Ya existe una parada con ese nombre.");
      } else {
        toast.error("Error al actualizar la parada.");
      }
    } finally {
      setEditSaving(false);
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

  async function handleAddStop() {
    if (!manageStopsRoute || !addStopId || addStopOrder === "") return;
    setAddingStop(true);
    setAddStopError(null);
    try {
      await addRouteStop(manageStopsRoute.id, { stop_id: addStopId, order: Number(addStopOrder) });
      queryClient.invalidateQueries({ queryKey: ["admin", "routes", manageStopsRoute.id, "stops"] });
      setAddStopId("");
      setAddStopOrder("");
    } catch (error) {
      const status = (error as { response?: { status?: number; data?: { detail?: string } } })?.response;
      if (status?.status === 409 && status?.data?.detail === "stop_already_in_route") {
        setAddStopError("Esa parada ya está en la ruta.");
      } else if (status?.status === 409 && status?.data?.detail === "order_already_taken") {
        setAddStopError("Ese número de orden ya está usado.");
      } else {
        setAddStopError("Error al agregar la parada.");
      }
    } finally {
      setAddingStop(false);
    }
  }

  async function handleRemoveStop(stopId: string) {
    if (!manageStopsRoute) return;
    try {
      await removeRouteStop(manageStopsRoute.id, stopId);
      queryClient.invalidateQueries({ queryKey: ["admin", "routes", manageStopsRoute.id, "stops"] });
    } catch {
      toast.error("Error al eliminar la parada de la ruta.");
    }
  }

  async function handleMoveStop(stopId: string, direction: "up" | "down") {
    if (!manageStopsRoute) return;
    const sorted = [...routeStops].sort((a, b) => a.order - b.order);
    const idx = sorted.findIndex((s) => s.stop_id === stopId);
    if (direction === "up" && idx === 0) return;
    if (direction === "down" && idx === sorted.length - 1) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    const newOrder = [...sorted];
    [newOrder[idx], newOrder[swapIdx]] = [newOrder[swapIdx], newOrder[idx]];
    try {
      await reorderRouteStops(manageStopsRoute.id, newOrder.map((s) => s.stop_id));
      queryClient.invalidateQueries({ queryKey: ["admin", "routes", manageStopsRoute.id, "stops"] });
    } catch {
      toast.error("Error al reordenar las paradas.");
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
                <TableHead className="bg-[#E8EBFA] text-xs font-medium uppercase tracking-wide text-[#4A4A6A]">Provincia</TableHead>
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
                      {stop.province ?? "—"}
                    </TableCell>
                    <TableCell className="py-3 text-sm text-neutral-900">
                      {COUNTRY_LABEL[stop.country]}
                    </TableCell>
                    <TableCell className="py-3">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-neutral-600"
                        onClick={() => {
                          setStopToEdit(stop);
                          setEditName(stop.name);
                          setEditCountry(stop.country);
                          setEditProvince(stop.province ?? "");
                        }}
                      >
                        <Pencil className="size-4" />
                      </Button>
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
                        className="text-neutral-600"
                        onClick={() => setManageStopsRoute(route)}
                      >
                        <ListOrdered className="size-4" />
                      </Button>
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

            <div className="space-y-1.5">
              <label
                htmlFor="stop-province"
                className="text-sm font-medium text-neutral-600"
              >
                Provincia
              </label>
              <Input
                id="stop-province"
                value={province}
                onChange={(e) => setProvince(e.target.value)}
                maxLength={100}
                placeholder="Ej: Buenos Aires"
              />
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
        open={stopToEdit !== null}
        onOpenChange={(open) => {
          if (!open) setStopToEdit(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar parada</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="edit-stop-name"
                className="text-sm font-medium text-neutral-600"
              >
                Nombre
              </label>
              <Input
                id="edit-stop-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
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
                value={editCountry}
                onValueChange={(value) => setEditCountry(value as CountryEnum)}
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

            <div className="space-y-1.5">
              <label
                htmlFor="edit-stop-province"
                className="text-sm font-medium text-neutral-600"
              >
                Provincia
              </label>
              <Input
                id="edit-stop-province"
                value={editProvince}
                onChange={(e) => setEditProvince(e.target.value)}
                maxLength={100}
                placeholder="Ej: Buenos Aires"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setStopToEdit(null)}>
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmEditStop}
              disabled={!editName || !editCountry || editSaving}
            >
              {editSaving ? "Guardando..." : "Guardar"}
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
                onValueChange={(value) => setOriginStopId(value ?? "")}
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
                onValueChange={(value) => setDestinationStopId(value ?? "")}
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

      <Dialog
        open={manageStopsRoute !== null}
        onOpenChange={(open) => {
          if (!open) {
            setManageStopsRoute(null);
            setAddStopId("");
            setAddStopOrder("");
            setAddStopError(null);
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Paradas — {manageStopsRoute?.origin_stop.name} → {manageStopsRoute?.destination_stop.name}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {routeStopsQuery.isLoading && (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
              </div>
            )}

            {!routeStopsQuery.isLoading && routeStops.length === 0 && (
              <p className="text-sm text-neutral-600">Sin paradas intermedias.</p>
            )}

            {!routeStopsQuery.isLoading && routeStops.length > 0 && (
              <ol className="space-y-1">
                {[...routeStops].sort((a, b) => a.order - b.order).map((stop, idx, arr) => (
                  <li key={stop.stop_id} className="flex items-center gap-2 text-sm text-neutral-900">
                    <span className="w-6 text-right text-neutral-400 shrink-0">{stop.order + 1}.</span>
                    <span className="flex-1">{stop.name}</span>
                    <span className="text-xs text-neutral-500">{stop.country}</span>
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
                      onClick={() => handleRemoveStop(stop.stop_id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </li>
                ))}
              </ol>
            )}

            <div className="border-t pt-4 space-y-3">
              <p className="text-sm font-medium text-neutral-600">Agregar parada</p>
              <Select value={addStopId} onValueChange={(value) => setAddStopId(value ?? "")}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleccionar parada" />
                </SelectTrigger>
                <SelectContent>
                  {stops.map((stop) => (
                    <SelectItem key={stop.id} value={stop.id}>
                      {stop.name} ({stop.country})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={0}
                  placeholder="Orden (0 = primero)"
                  value={addStopOrder}
                  onChange={(e) => setAddStopOrder(e.target.value === "" ? "" : Number(e.target.value))}
                  className="w-40"
                />
                <Button
                  onClick={handleAddStop}
                  disabled={!addStopId || addStopOrder === "" || addingStop}
                  size="sm"
                >
                  {addingStop ? "Agregando..." : "Agregar"}
                </Button>
              </div>
              {addStopError && <p className="text-sm text-[#E87B7B]">{addStopError}</p>}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setManageStopsRoute(null)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
