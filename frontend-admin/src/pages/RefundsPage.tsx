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
import { getRefundRequests } from "@/api/refunds";
import { formatDate } from "@/lib/tripUtils";

const FILTERS: { label: string; value: "all" | "valid" }[] = [
  { label: "Todas", value: "all" },
  { label: "Dentro del plazo", value: "valid" },
];

export default function RefundsPage() {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState<"all" | "valid">("all");

  const refundsQuery = useQuery({
    queryKey: ["admin", "refunds", { windowValid: activeFilter }],
    queryFn: () =>
      activeFilter === "all"
        ? getRefundRequests()
        : getRefundRequests({ window_valid: true }),
  });

  const refunds = refundsQuery.data ?? [];

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-semibold text-neutral-900">Reembolsos</h1>

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
                Reserva
              </TableHead>
              <TableHead className="bg-[#E8EBFA] text-xs font-medium uppercase tracking-wide text-[#4A4A6A]">
                Email
              </TableHead>
              <TableHead className="bg-[#E8EBFA] text-xs font-medium uppercase tracking-wide text-[#4A4A6A]">
                Fecha
              </TableHead>
              <TableHead className="bg-[#E8EBFA] text-xs font-medium uppercase tracking-wide text-[#4A4A6A]">
                Plazo
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {refundsQuery.isLoading &&
              Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={index}>
                  <TableCell className="py-3" colSpan={5}>
                    <Skeleton className="h-6 w-full" />
                  </TableCell>
                </TableRow>
              ))}

            {!refundsQuery.isLoading && refunds.length === 0 && (
              <TableRow>
                <TableCell className="py-3" colSpan={5}>
                  <p className="text-center text-sm text-neutral-600">
                    No hay solicitudes de reembolso.
                  </p>
                </TableCell>
              </TableRow>
            )}

            {!refundsQuery.isLoading &&
              refunds.map((refund) => (
                <TableRow key={refund.id}>
                  <TableCell
                    className="py-3 font-mono text-xs text-neutral-900"
                    title={refund.id}
                  >
                    {refund.id.slice(0, 8)}
                  </TableCell>
                  <TableCell className="py-3">
                    <button
                      type="button"
                      className="cursor-pointer font-mono text-xs text-primary underline"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/reservas/${refund.booking_id}`);
                      }}
                    >
                      {refund.booking_id.slice(0, 8)}
                    </button>
                  </TableCell>
                  <TableCell className="py-3 text-sm text-neutral-900">
                    {refund.email_used}
                  </TableCell>
                  <TableCell className="py-3 text-sm text-neutral-900">
                    {formatDate(refund.requested_at)}
                  </TableCell>
                  <TableCell className="py-3">
                    <Badge
                      className={
                        refund.window_valid
                          ? "bg-[#E8F5EE] text-[#6BBF8E]"
                          : "bg-[#FDEAEA] text-[#E87B7B]"
                      }
                    >
                      {refund.window_valid ? "Dentro del plazo" : "Vencido"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
