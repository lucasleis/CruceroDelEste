import type { BookingStatusEnum, ChargebackStatusEnum, SeatTypeEnum, TripStatusEnum } from "@/types/trips";

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

export const BOOKING_STATUS_BADGE: Record<
  BookingStatusEnum,
  { label: string; className: string }
> = {
  confirmed: { label: "Confirmada", className: "bg-[#E8F5EE] text-[#6BBF8E]" },
  pending_payment: {
    label: "Pago pendiente",
    className: "bg-[#FEF9C3] text-[#854D0E]",
  },
  expired: { label: "Vencida", className: "bg-[#F4F5FB] text-neutral-600" },
  refunded: { label: "Reembolsada", className: "bg-[#E8EBFA] text-[#6B7FD4]" },
};

export const SEAT_TYPE_LABEL: Record<SeatTypeEnum, string> = {
  cama: "Cama",
  semi_cama: "Semi Cama",
};

export const CHARGEBACK_STATUS_BADGE: Record<
  ChargebackStatusEnum,
  { label: string; className: string }
> = {
  in_process: {
    label: "En proceso",
    className: "bg-[#FEF9C3] text-[#854D0E]",
  },
  settled: {
    label: "Resuelto en contra",
    className: "bg-[#FDEAEA] text-[#E87B7B]",
  },
  reimbursed: {
    label: "Resuelto a favor",
    className: "bg-[#E8F5EE] text-[#6BBF8E]",
  },
};

export const TRIP_STATUS_LABEL: Record<TripStatusEnum, string> = Object.fromEntries(
  Object.entries(STATUS_BADGE).map(([k, v]) => [k, v.label])
) as Record<TripStatusEnum, string>;
