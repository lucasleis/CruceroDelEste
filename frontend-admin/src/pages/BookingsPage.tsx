import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getBookings } from "@/api/bookings";
import type { BookingStatusEnum } from "@/types/trips";
import { formatDate } from "@/lib/tripUtils";

const STATUS_BADGE: Record<
  BookingStatusEnum,
  { label: string; className: string }
> = {
  confirmed: {
    label: "Confirmada",
    className: "bg-[#E8F5EE] text-[#6BBF8E]",
  },
  pending_payment: {
    label: "Pago pendiente",
    className: "bg-[#FEF9C3] text-[#854D0E]",
  },
  expired: {
    label: "Vencida",
    className: "bg-[#F4F5FB] text-neutral-600",
  },
  refunded: {
    label: "Reembolsada",
    className: "bg-[#E8EBFA] text-[#6B7FD4]",
  },
};

const FILTERS: { label: string; value: BookingStatusEnum | "all" }[] = [
  { label: "Todas", value: "all" },
  { label: "Confirmadas", value: "confirmed" },
  { label: "Pendientes de pago", value: "pending_payment" },
  { label: "Vencidas", value: "expired" },
  { label: "Reembolsadas", value: "refunded" },
];

export default function BookingsPage() {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState<BookingStatusEnum | "all">(
    "all"
  );

  const bookingsQuery = useQuery({
    queryKey: ["admin", "bookings", { status: activeFilter }],
    queryFn: () =>
      activeFilter === "all"
        ? getBookings()
        : getBookings({ booking_status: activeFilter }),
  });

  const bookings = bookingsQuery.data ?? [];

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-semibold text-neutral-900">Reservas</h1>

      <div className="mt-4 flex gap-2">
        {FILTERS.map((filter) => (
          <button
            key={filter.value}
            type="button"
            onClick={() => setActiveFilter(filter.value)}
            className={`rounded-lg px-3 py-1.5 text-sm ${
              activeFilter === filter.value
                ? "bg-primary-light font-medium text-primary"
                : "text-neutral-600"
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="bg-[#E8EBFA] text-xs font-medium uppercase tracking-wide text-[#4A4A6A]">
                ID
              </TableHead>
              <TableHead className="bg-[#E8EBFA] text-xs font-medium uppercase tracking-wide text-[#4A4A6A]">
                Pasajeros
              </TableHead>
              <TableHead className="bg-[#E8EBFA] text-xs font-medium uppercase tracking-wide text-[#4A4A6A]">
                Email
              </TableHead>
              <TableHead className="bg-[#E8EBFA] text-xs font-medium uppercase tracking-wide text-[#4A4A6A]">
                Total
              </TableHead>
              <TableHead className="bg-[#E8EBFA] text-xs font-medium uppercase tracking-wide text-[#4A4A6A]">
                Estado
              </TableHead>
              <TableHead className="bg-[#E8EBFA] text-xs font-medium uppercase tracking-wide text-[#4A4A6A]">
                Fecha
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bookingsQuery.isLoading &&
              Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={index}>
                  <TableCell className="py-3" colSpan={6}>
                    <Skeleton className="h-6 w-full" />
                  </TableCell>
                </TableRow>
              ))}

            {!bookingsQuery.isLoading && bookings.length === 0 && (
              <TableRow>
                <TableCell className="py-3" colSpan={6}>
                  <p className="text-center text-sm text-neutral-600">
                    No hay reservas.
                  </p>
                </TableCell>
              </TableRow>
            )}

            {!bookingsQuery.isLoading &&
              bookings.map((booking) => {
                const status = STATUS_BADGE[booking.status];
                return (
                  <TableRow
                    key={booking.id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/reservas/${booking.id}`)}
                  >
                    <TableCell
                      className="py-3 font-mono text-xs text-neutral-900"
                      title={booking.id}
                    >
                      {booking.id.slice(0, 8)}
                    </TableCell>
                    <TableCell className="py-3 text-sm text-neutral-900">
                      {booking.passengers.length} pasajero(s)
                    </TableCell>
                    <TableCell className="py-3 text-sm text-neutral-900">
                      {booking.contact_email}
                    </TableCell>
                    <TableCell className="py-3 text-sm text-neutral-900">
                      $ {booking.total_amount.toLocaleString("es-AR")}
                    </TableCell>
                    <TableCell className="py-3">
                      <Badge className={status.className}>{status.label}</Badge>
                    </TableCell>
                    <TableCell className="py-3 text-sm text-neutral-900">
                      {formatDate(booking.created_at)}
                    </TableCell>
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
