import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
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
import { formatDate, BOOKING_STATUS_BADGE } from "@/lib/tripUtils";

const PAGE_SIZE = 50;

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
  const [page, setPage] = useState(0);

  const bookingsQuery = useQuery({
    queryKey: ["admin", "bookings", { status: activeFilter, page }],
    queryFn: () =>
      getBookings({
        ...(activeFilter === "all" ? {} : { booking_status: activeFilter }),
        skip: page * PAGE_SIZE,
        limit: PAGE_SIZE,
      }),
  });

  const bookings = bookingsQuery.data?.items ?? [];
  const total = bookingsQuery.data?.total ?? 0;
  const hasNextPage = (page + 1) * PAGE_SIZE < total;

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-semibold text-neutral-900">Reservas</h1>

      <div className="mt-4 flex gap-2">
        {FILTERS.map((filter) => (
          <button
            key={filter.value}
            type="button"
            onClick={() => {
              setActiveFilter(filter.value);
              setPage(0);
            }}
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
                const status = BOOKING_STATUS_BADGE[booking.status];
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
                      {booking.passenger_count} pasajero(s)
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

      <div className="mt-4 flex items-center justify-between">
        <p className="text-sm text-neutral-600">{total} reserva(s) en total</p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
          >
            Anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!hasNextPage}
            onClick={() => setPage((p) => p + 1)}
          >
            Siguiente
          </Button>
        </div>
      </div>
    </div>
  );
}
