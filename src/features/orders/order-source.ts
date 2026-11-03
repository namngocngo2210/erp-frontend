import { createElement, type HTMLAttributes } from "react";

import { Badge } from "@/components/ui/badge";
import type { OrderSource } from "@/features/orders/order-types";
import { cn } from "@/lib/utils";

// Danh sách nguồn đơn chọn được ở form. "kol" cũ được thay bằng "koc"; nhãn "kol"
// vẫn giữ trong ORDER_SOURCE_LABELS để hiển thị đúng cho đơn cũ.
export const ORDER_SOURCES: readonly OrderSource[] = [
  "landing",
  "koc",
  "zalo",
  "messenger",
  "hotline",
  "shopee",
  "tiktok",
];

// Nguồn legacy: không cho chọn mới ở form nhưng backend vẫn có trong OrderSource
// choices → payload create/patch phải round-trip, không được drop.
export const LEGACY_ORDER_SOURCES: readonly OrderSource[] = ["kol"];

/** Mọi giá trị order_source hợp lệ với backend (form + legacy). Dùng cho sanitize payload. */
export const VALID_ORDER_SOURCES: readonly OrderSource[] = [
  ...ORDER_SOURCES,
  ...LEGACY_ORDER_SOURCES,
];

export const ORDER_SOURCE_LABELS: Record<OrderSource, string> = {
  landing: "Landing",
  kol: "KOL",
  zalo: "Zalo",
  messenger: "Messenger",
  hotline: "Hotline",
  koc: "KOC",
  shopee: "Shopee",
  tiktok: "TikTok",
};

export const ORDER_SOURCE_OPTIONS: Array<{ value: OrderSource; label: string }> = ORDER_SOURCES.map(
  (value) => ({
    value,
    label: ORDER_SOURCE_LABELS[value],
  }),
);

export function orderSourceBadgeClass(source?: OrderSource | null): string {
  const map: Record<OrderSource, string> = {
    landing: "bg-blue-100 text-blue-700 border-blue-300",
    kol: "bg-violet-100 text-violet-700 border-violet-300",
    zalo: "bg-sky-100 text-sky-700 border-sky-300",
    messenger: "bg-indigo-100 text-indigo-700 border-indigo-300",
    hotline: "bg-emerald-100 text-emerald-700 border-emerald-300",
    koc: "bg-amber-100 text-amber-700 border-amber-300",
    shopee: "bg-orange-100 text-orange-700 border-orange-300",
    tiktok: "bg-zinc-100 text-zinc-800 border-zinc-400",
  };
  return source
    ? (map[source] ?? "bg-slate-100 text-slate-700 border-slate-300")
    : "bg-slate-100 text-slate-700 border-slate-300";
}

export function OrderSourceBadge({
  source,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement> & { source?: OrderSource | null }) {
  const label = source ? (ORDER_SOURCE_LABELS[source] ?? source) : "—";
  return createElement(
    Badge,
    {
      variant: "outline",
      className: cn("w-fit whitespace-nowrap", orderSourceBadgeClass(source), className),
      ...props,
    },
    label,
  );
}
