import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { getBooking } from "@/api/bookings";
import { formatDate, BOOKING_STATUS_BADGE } from "@/lib/tripUtils";

export default function BookingDetailPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();

  const bookingQuery = useQuery({
    queryKey: ["admin", "bookings", bookingId],
    queryFn: () => getBooking(bookingId as string),
    enabled: !!bookingId,
  });

  if (bookingQuery.isError) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex flex-col items-center gap-4 py-16">
          <p className="text-sm text-neutral-600">Reserva no encontrada.</p>
          <Button variant="outline" onClick={() => navigate("/reservas")}>
            Volver a Reservas
          </Button>
        </div>
      </div>
    );
  }

  if (bookingQuery.isLoading || !bookingQuery.data) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-8">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="mt-6 h-24 w-full" />
        <Skeleton className="mt-6 h-48 w-full" />
      </div>
    );
  }

  const booking = bookingQuery.data;
  const status = BOOKING_STATUS_BADGE[booking.status];

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => navigate("/reservas")}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <h1 className="text-2xl font-semibold text-neutral-900">
            Reserva <span className="font-mono">{booking.id.slice(0, 8)}</span>
          </h1>
        </div>
        <Badge className={status.className}>{status.label}</Badge>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-600">
            Email de contacto
          </p>
          <p className="mt-1 text-sm text-neutral-900">
            {booking.contact_email}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-600">
            Total
          </p>
          <p className="mt-1 text-sm text-neutral-900">
            $ {booking.total_amount.toLocaleString("es-AR")}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-600">
            Creada
          </p>
          <p className="mt-1 text-sm text-neutral-900">
            {formatDate(booking.created_at)}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-600">
            Confirmada
          </p>
          <p className="mt-1 text-sm text-neutral-900">
            {booking.confirmed_at ? formatDate(booking.confirmed_at) : "—"}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-600">
            Vence
          </p>
          <p className="mt-1 text-sm text-neutral-900">
            {formatDate(booking.expires_at)}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-600">
            Pago MP
          </p>
          <p className="mt-1 text-sm text-neutral-900">
            {booking.mp_payment_id ?? "—"}
          </p>
        </div>
      </div>

      <div className="mt-10">
        <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-600">
          Pasajeros
        </h2>

        <div className="mt-3">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="bg-[#E8EBFA] text-xs font-medium uppercase tracking-wide text-[#4A4A6A]">
                  Nombre
                </TableHead>
                <TableHead className="bg-[#E8EBFA] text-xs font-medium uppercase tracking-wide text-[#4A4A6A]">
                  DNI
                </TableHead>
                <TableHead className="bg-[#E8EBFA] text-xs font-medium uppercase tracking-wide text-[#4A4A6A]">
                  Email
                </TableHead>
                <TableHead className="bg-[#E8EBFA] text-xs font-medium uppercase tracking-wide text-[#4A4A6A]">
                  Teléfono
                </TableHead>
                <TableHead className="bg-[#E8EBFA] text-xs font-medium uppercase tracking-wide text-[#4A4A6A]">
                  Equipaje
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {booking.passengers.map((passenger) => (
                <TableRow key={passenger.id}>
                  <TableCell className="py-3 text-sm text-neutral-900">
                    {passenger.first_name} {passenger.last_name}
                  </TableCell>
                  <TableCell className="py-3 text-sm text-neutral-900">
                    {passenger.dni}
                  </TableCell>
                  <TableCell className="py-3 text-sm text-neutral-900">
                    {passenger.email}
                  </TableCell>
                  <TableCell className="py-3 text-sm text-neutral-900">
                    {passenger.phone ?? "—"}
                  </TableCell>
                  <TableCell className="py-3 text-sm text-neutral-900">
                    {passenger.luggage_count} bulto(s)
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
