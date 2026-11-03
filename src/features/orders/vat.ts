import { createElement, type HTMLAttributes } from "react";

import { Badge } from "@/components/ui/badge";
import type { OrderVat } from "@/features/orders/order-types";
import { cn } from "@/lib/utils";

// Hình thức xuất hoá đơn VAT — khớp OrderVat.choices ở backend (apps/orders/models.py).
export const ORDER_VATS: readonly OrderVat[] = ["individual", "company", "no"];

export const ORDER_VAT_LABELS: Record<OrderVat, string> = {
  individual: "Cá nhân",
  company: "Công ty",
  no: "Không xuất",
};

export const ORDER_VAT_OPTIONS: Array<{ value: OrderVat; label: string }> = ORDER_VATS.map(
  (value) => ({
    value,
    label: ORDER_VAT_LABELS[value],
  }),
);

export function orderVatBadgeClass(vat?: OrderVat | null): string {
  const map: Record<OrderVat, string> = {
    individual: "bg-blue-100 text-blue-700 border-blue-300",
    company: "bg-violet-100 text-violet-700 border-violet-300",
    no: "bg-slate-100 text-slate-700 border-slate-300",
  };
  return vat
    ? (map[vat] ?? "bg-slate-100 text-slate-700 border-slate-300")
    : "bg-slate-100 text-slate-700 border-slate-300";
}

export function OrderVatBadge({
  vat,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement> & { vat?: OrderVat | null }) {
  const label = vat ? (ORDER_VAT_LABELS[vat] ?? vat) : "—";
  return createElement(
    Badge,
    {
      variant: "outline",
      className: cn("w-fit whitespace-nowrap", orderVatBadgeClass(vat), className),
      ...props,
    },
    label,
  );
}
