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
import { getChargebacks } from "@/api/chargebacks";
import type { ChargebackStatusEnum } from "@/types/trips";
import { formatDate } from "@/lib/tripUtils";

const FILTERS: { label: string; value: ChargebackStatusEnum | "all" }[] = [
  { label: "Todos", value: "all" },
  { label: "En proceso", value: "in_process" },
  { label: "Resuelto a favor", value: "reimbursed" },
  { label: "Resuelto en contra", value: "settled" },
];

const STATUS_BADGE: Record<
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

export default function ChargebacksPage() {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState<
    ChargebackStatusEnum | "all"
  >("all");

  const chargebacksQuery = useQuery({
    queryKey: ["admin", "chargebacks", { status: activeFilter }],
    queryFn: () =>
      activeFilter === "all"
        ? getChargebacks()
        : getChargebacks({ status: activeFilter }),
  });

  const chargebacks = chargebacksQuery.data ?? [];

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-semibold text-neutral-900">Contracargos</h1>

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
                Pago MP
              </TableHead>
              <TableHead className="bg-[#E8EBFA] text-xs font-medium uppercase tracking-wide text-[#4A4A6A]">
                Estado
              </TableHead>
              <TableHead className="bg-[#E8EBFA] text-xs font-medium uppercase tracking-wide text-[#4A4A6A]">
                Vencimiento doc.
              </TableHead>
              <TableHead className="bg-[#E8EBFA] text-xs font-medium uppercase tracking-wide text-[#4A4A6A]">
                Fecha
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {chargebacksQuery.isLoading &&
              Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={index}>
                  <TableCell className="py-3" colSpan={6}>
                    <Skeleton className="h-6 w-full" />
                  </TableCell>
                </TableRow>
              ))}

            {!chargebacksQuery.isLoading && chargebacks.length === 0 && (
              <TableRow>
                <TableCell className="py-3" colSpan={6}>
                  <p className="text-center text-sm text-neutral-600">
                    No hay contracargos.
                  </p>
                </TableCell>
              </TableRow>
            )}

            {!chargebacksQuery.isLoading &&
              chargebacks.map((chargeback) => {
                const status = STATUS_BADGE[chargeback.status];
                return (
                  <TableRow key={chargeback.id}>
                    <TableCell
                      className="py-3 font-mono text-xs text-neutral-900"
                      title={chargeback.id}
                    >
                      {chargeback.id.slice(0, 8)}
                    </TableCell>
                    <TableCell className="py-3">
                      <button
                        type="button"
                        className="cursor-pointer font-mono text-xs text-primary underline"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/reservas/${chargeback.booking_id}`);
                        }}
                      >
                        {chargeback.booking_id.slice(0, 8)}
                      </button>
                    </TableCell>
                    <TableCell className="py-3 font-mono text-xs text-neutral-900">
                      {chargeback.mp_payment_id}
                    </TableCell>
                    <TableCell className="py-3">
                      <Badge className={status.className}>{status.label}</Badge>
                    </TableCell>
                    <TableCell className="py-3 text-sm text-neutral-900">
                      {chargeback.date_documentation_deadline
                        ? formatDate(chargeback.date_documentation_deadline)
                        : "—"}
                    </TableCell>
                    <TableCell className="py-3 text-sm text-neutral-900">
                      {formatDate(chargeback.created_at)}
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
