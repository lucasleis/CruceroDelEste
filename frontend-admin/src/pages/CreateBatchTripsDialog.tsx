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
import { createTrip } from "@/api/trips";
import type { RouteRead, SeatLayoutRead } from "@/types/trips";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  routes: RouteRead[];
  seatLayouts: SeatLayoutRead[];
  onSuccess: () => void;
}

type RecurrenceType = "daily" | "weekly" | "every_n_days" | "";
type Step = "form" | "confirm" | "creating" | "error";

const WEEKLY_DAYS = [
  { label: "Lu", day: 1 },
  { label: "Ma", day: 2 },
  { label: "Mi", day: 3 },
  { label: "Ju", day: 4 },
  { label: "Vi", day: 5 },
  { label: "Sa", day: 6 },
  { label: "Do", day: 0 },
];

// Argentina is UTC-3, no DST
const AR_OFFSET_MS = -3 * 60 * 60 * 1000;

function getArgentinaToday(): string {
  return new Date(Date.now() + AR_OFFSET_MS).toISOString().slice(0, 10);
}

function getArgentinaMinutes(): number {
  const ar = new Date(Date.now() + AR_OFFSET_MS);
  return ar.getUTCHours() * 60 + ar.getUTCMinutes();
}

function addDays(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d + n);
  return [
    String(dt.getFullYear()),
    String(dt.getMonth() + 1).padStart(2, "0"),
    String(dt.getDate()).padStart(2, "0"),
  ].join("-");
}

function getDayOfWeek(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).getDay();
}

function formatDateShort(dateStr: string): string {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

export default function CreateBatchTripsDialog({
  open,
  onOpenChange,
  routes,
  seatLayouts,
  onSuccess,
}: Props) {
  const [step, setStep] = useState<Step>("form");
  const [seriesRouteId, setSeriesRouteId] = useState("");
  const [seriesSeatLayoutId, setSeriesSeatLayoutId] = useState("");
  const [departureTime, setDepartureTime] = useState("");
  const [arrivalTime, setArrivalTime] = useState("");
  const [arrivalNextDay, setArrivalNextDay] = useState(false);
  const [recurrence, setRecurrence] = useState<RecurrenceType>("");
  const [weeklyDays, setWeeklyDays] = useState<number[]>([]);
  const [everyNDays, setEveryNDays] = useState(2);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [generatedDates, setGeneratedDates] = useState<string[]>([]);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [errorInfo, setErrorInfo] = useState<{
    date: string;
    created: number;
    total: number;
  } | null>(null);

  function generateDates(): string[] {
    const dates: string[] = [];
    let current = startDate;

    while (current <= endDate) {
      if (recurrence === "daily") {
        dates.push(current);
        current = addDays(current, 1);
      } else if (recurrence === "weekly") {
        if (weeklyDays.includes(getDayOfWeek(current))) {
          dates.push(current);
        }
        current = addDays(current, 1);
      } else if (recurrence === "every_n_days") {
        dates.push(current);
        current = addDays(current, everyNDays);
      } else {
        break;
      }
    }

    return dates;
  }

  function toggleDay(day: number) {
    setWeeklyDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  }

  function handleGoToConfirm() {
    if (
      !seriesRouteId ||
      !seriesSeatLayoutId ||
      !departureTime ||
      !arrivalTime ||
      !recurrence ||
      !startDate ||
      !endDate
    ) {
      setFormError("Completá todos los campos obligatorios.");
      return;
    }

    if (recurrence === "weekly" && weeklyDays.length === 0) {
      setFormError("Seleccioná al menos un día de la semana.");
      return;
    }

    if (recurrence === "every_n_days" && everyNDays < 2) {
      setFormError("El intervalo de días debe ser al menos 2.");
      return;
    }

    if (endDate <= startDate) {
      setFormError("La fecha de fin debe ser posterior a la fecha de inicio.");
      return;
    }

    const todayAR = getArgentinaToday();

    if (startDate < todayAR) {
      setFormError("La fecha de inicio no puede ser en el pasado.");
      return;
    }

    if (startDate === todayAR) {
      const [h, m] = departureTime.split(":").map(Number);
      if (h * 60 + m < getArgentinaMinutes() + 30) {
        setFormError(
          "La hora de salida ya pasó para la fecha de inicio seleccionada."
        );
        return;
      }
    }

    const dates = generateDates();

    if (dates.length === 0) {
      setFormError(
        "La regla de recurrencia no genera ningún viaje en el rango seleccionado."
      );
      return;
    }

    setFormError(null);
    setGeneratedDates(dates);
    setStep("confirm");
  }

  async function handleCreateAll() {
    setStep("creating");
    setProgress({ current: 0, total: generatedDates.length });

    let created = 0;

    for (const date of generatedDates) {
      const arrivalDate = arrivalNextDay ? addDays(date, 1) : date;
      const departureAt = `${date}T${departureTime}:00-03:00`;
      const arrivalAt = `${arrivalDate}T${arrivalTime}:00-03:00`;

      try {
        await createTrip({
          route_id: seriesRouteId,
          seat_layout_id: seriesSeatLayoutId,
          departure_at: departureAt,
          arrival_at: arrivalAt,
        });
        created++;
        setProgress({ current: created, total: generatedDates.length });
      } catch {
        setErrorInfo({ date, created, total: generatedDates.length });
        setStep("error");
        onSuccess();
        return;
      }
    }

    onSuccess();
    toast.success(
      `${created} viaje${created !== 1 ? "s" : ""} creado${created !== 1 ? "s" : ""}`
    );
    handleClose();
  }

  function resetAll() {
    setStep("form");
    setSeriesRouteId("");
    setSeriesSeatLayoutId("");
    setDepartureTime("");
    setArrivalTime("");
    setArrivalNextDay(false);
    setRecurrence("");
    setWeeklyDays([]);
    setEveryNDays(2);
    setStartDate("");
    setEndDate("");
    setFormError(null);
    setGeneratedDates([]);
    setProgress({ current: 0, total: 0 });
    setErrorInfo(null);
  }

  function handleClose() {
    onOpenChange(false);
    resetAll();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen && step === "creating") return;
        if (!isOpen) handleClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Viajes en serie</DialogTitle>
        </DialogHeader>

        {step === "form" && (
          <>
            <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-1">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-neutral-600">
                  Ruta
                </label>
                <Select value={seriesRouteId} onValueChange={setSeriesRouteId}>
                  <SelectTrigger className="w-full">
                    <SelectValue>
                      {seriesRouteId
                        ? (() => {
                            const route = routes.find(
                              (r) => r.id === seriesRouteId
                            );
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
                        {route.destination_stop.name} (
                        {route.destination_stop.country})
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
                  value={seriesSeatLayoutId}
                  onValueChange={setSeriesSeatLayoutId}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue>
                      {seriesSeatLayoutId
                        ? (() => {
                            const layout = seatLayouts.find(
                              (l) => l.id === seriesSeatLayoutId
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
                        {layout.name} · {layout.total_cama}C /{" "}
                        {layout.total_semi_cama}SC
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-neutral-600">
                  Hora de salida
                </label>
                <Input
                  type="time"
                  value={departureTime}
                  onChange={(e) => setDepartureTime(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-neutral-600">
                  Hora de llegada
                </label>
                <Input
                  type="time"
                  value={arrivalTime}
                  onChange={(e) => setArrivalTime(e.target.value)}
                />
                <label className="flex cursor-pointer items-center gap-2 text-sm text-neutral-600">
                  <input
                    type="checkbox"
                    checked={arrivalNextDay}
                    onChange={(e) => setArrivalNextDay(e.target.checked)}
                    className="size-4 rounded border-neutral-300 accent-[#6B7FD4]"
                  />
                  Llega al día siguiente
                </label>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-neutral-600">
                  Regla de recurrencia
                </label>
                <Select
                  value={recurrence}
                  onValueChange={(v) => {
                    setRecurrence(v as RecurrenceType);
                    setWeeklyDays([]);
                    setEveryNDays(2);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue>
                      {recurrence === "daily"
                        ? "Todos los días"
                        : recurrence === "weekly"
                        ? "Días específicos de la semana"
                        : recurrence === "every_n_days"
                        ? "Cada N días"
                        : "Seleccionar regla"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Todos los días</SelectItem>
                    <SelectItem value="weekly">
                      Días específicos de la semana
                    </SelectItem>
                    <SelectItem value="every_n_days">Cada N días</SelectItem>
                  </SelectContent>
                </Select>

                {recurrence === "weekly" && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {WEEKLY_DAYS.map(({ label, day }) => (
                      <Button
                        key={day}
                        type="button"
                        size="sm"
                        variant={weeklyDays.includes(day) ? "default" : "outline"}
                        onClick={() => toggleDay(day)}
                      >
                        {label}
                      </Button>
                    ))}
                  </div>
                )}

                {recurrence === "every_n_days" && (
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-sm text-neutral-600">Cada</span>
                    <Input
                      type="number"
                      min={2}
                      step={1}
                      value={everyNDays}
                      onChange={(e) =>
                        setEveryNDays(
                          Math.max(2, parseInt(e.target.value, 10) || 2)
                        )
                      }
                      className="w-20"
                    />
                    <span className="text-sm text-neutral-600">días</span>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-neutral-600">
                  Fecha de inicio
                </label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-neutral-600">
                  Fecha de fin
                </label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>

              {formError && (
                <p className="text-sm text-[#E87B7B]">{formError}</p>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button onClick={handleGoToConfirm}>Continuar</Button>
            </DialogFooter>
          </>
        )}

        {step === "confirm" && (
          <>
            <p className="text-sm text-neutral-900">
              Se van a crear{" "}
              <span className="font-semibold">{generatedDates.length}</span>{" "}
              viaje{generatedDates.length !== 1 ? "s" : ""} entre el{" "}
              <span className="font-semibold">{formatDateShort(startDate)}</span>{" "}
              y el{" "}
              <span className="font-semibold">{formatDateShort(endDate)}</span>.
              ¿Confirmás?
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep("form")}>
                Cancelar
              </Button>
              <Button onClick={handleCreateAll}>Confirmar</Button>
            </DialogFooter>
          </>
        )}

        {step === "creating" && (
          <div className="space-y-3">
            <p className="text-sm text-neutral-900">
              Creando viaje {progress.current + 1} de {progress.total}...
            </p>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-100">
              <div
                className="h-full rounded-full bg-[#6B7FD4] transition-all duration-300"
                style={{
                  width: `${
                    progress.total > 0
                      ? (progress.current / progress.total) * 100
                      : 0
                  }%`,
                }}
              />
            </div>
          </div>
        )}

        {step === "error" && errorInfo && (
          <>
            <div className="space-y-1.5">
              <p className="text-sm text-[#E87B7B]">
                Error al crear el viaje del {formatDateShort(errorInfo.date)}.
              </p>
              <p className="text-sm text-neutral-600">
                Se crearon {errorInfo.created} de {errorInfo.total} viaje
                {errorInfo.total !== 1 ? "s" : ""} antes del error.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Cerrar
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
