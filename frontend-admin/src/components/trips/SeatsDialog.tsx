import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getTripSeats, updateSeatStatus } from "@/api/trips";
import type { AdminSeatRead, AdminTripRead } from "@/types/trips";

interface SeatsDialogProps {
  tripId: string;
  trip: AdminTripRead;
}

export function SeatsDialog({ tripId, trip }: SeatsDialogProps) {
  const queryClient = useQueryClient();
  const [seatsOpen, setSeatsOpen] = useState(false);

  const seatsQuery = useQuery({
    queryKey: ["admin", "trips", tripId, "seats"],
    queryFn: () => getTripSeats(tripId),
    enabled: !!tripId && seatsOpen,
  });

  const toggleSeatMutation = useMutation({
    mutationFn: ({
      seatNumber,
      status,
    }: {
      seatNumber: string;
      status: "blocked" | "available";
    }) => updateSeatStatus(tripId, seatNumber, status),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "trips", tripId, "seats"],
      });
    },
    onError: () => toast.error("No se pudo actualizar el asiento."),
  });

  function handleOpenSeats() {
    setSeatsOpen(true);
  }

  function handleToggleSeat(seat: AdminSeatRead) {
    if (seat.status === "reserved" || seat.status === "sold") return;
    const newStatus = seat.status === "blocked" ? "available" : "blocked";
    toggleSeatMutation.mutate({ seatNumber: seat.seat_number, status: newStatus });
  }

  const seats = seatsQuery.data ?? [];

  return (
    <>
      <Button variant="outline" size="sm" onClick={handleOpenSeats}>
        Ver asientos
      </Button>

      <Dialog open={seatsOpen} onOpenChange={setSeatsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Asientos — {trip.route.origin_stop.name} → {trip.route.destination_stop.name}
            </DialogTitle>
          </DialogHeader>

          {seatsQuery.isLoading && (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
            </div>
          )}

          {seatsQuery.isError && (
            <p className="text-sm text-[#E87B7B]">No se pudieron cargar los asientos.</p>
          )}

          {!seatsQuery.isLoading && !seatsQuery.isError && seats.length > 0 && (
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
                        const isUpdating =
                          toggleSeatMutation.isPending &&
                          toggleSeatMutation.variables?.seatNumber === seat.seat_number;
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
                        const isUpdating =
                          toggleSeatMutation.isPending &&
                          toggleSeatMutation.variables?.seatNumber === seat.seat_number;
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
    </>
  );
}
