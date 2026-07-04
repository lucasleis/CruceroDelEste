import type { TripStatusEnum } from "@/types/trips";

export const STATUS_BADGE: Record<
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

export const dateFormatter = new Intl.DateTimeFormat("es-AR", {
  timeZone: "America/Buenos_Aires",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export function formatDate(iso: string): string {
  return dateFormatter.format(new Date(iso)).replace(",", "");
}
