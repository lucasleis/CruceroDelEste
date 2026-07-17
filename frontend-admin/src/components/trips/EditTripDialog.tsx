import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { updateTrip } from "@/api/trips";
import type { AdminTripRead, TripStatusEnum } from "@/types/trips";
import { TRIP_STATUS_LABEL } from "@/lib/tripUtils";

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

interface EditTripDialogProps {
  tripId: string;
  trip: AdminTripRead;
  onSuccess: () => void;
}

export function EditTripDialog({ tripId, trip, onSuccess }: EditTripDialogProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [editDepartureDate, setEditDepartureDate] = useState("");
  const [editDepartureTime, setEditDepartureTime] = useState("");
  const [editArrivalDate, setEditArrivalDate] = useState("");
  const [editArrivalTime, setEditArrivalTime] = useState("");
  const [editStatus, setEditStatus] = useState<TripStatusEnum | "">("");
  const [editError, setEditError] = useState<string | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  function openEditDialog() {
    setEditDepartureDate(toBaDate(trip.departure_at));
    setEditDepartureTime(toBaTime(trip.departure_at));
    setEditArrivalDate(toBaDate(trip.arrival_at));
    setEditArrivalTime(toBaTime(trip.arrival_at));
    setEditStatus(trip.status);
    setEditError(null);
    setEditOpen(true);
  }

  function resetEditForm() {
    setEditDepartureDate(toBaDate(trip.departure_at));
    setEditDepartureTime(toBaTime(trip.departure_at));
    setEditArrivalDate(toBaDate(trip.arrival_at));
    setEditArrivalTime(toBaTime(trip.arrival_at));
    setEditStatus(trip.status);
    setEditError(null);
  }

  async function handleEditSubmit() {
    if (
      !editDepartureDate ||
      !editDepartureTime ||
      !editArrivalDate ||
      !editArrivalTime ||
      !editStatus
    ) {
      return;
    }

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
      onSuccess();
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

  return (
    <>
      <Button variant="outline" size="sm" onClick={openEditDialog}>
        Editar viaje
      </Button>

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
    </>
  );
}
