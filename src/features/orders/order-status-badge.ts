/**
 * Tailwind badge classes for an order status code (0–12). Single source of truth;
 * dedupes the map/switch copies that lived in order-detail-shared
 * (same colours, the class-string order is irrelevant to Tailwind).
 */

const STATUS_BADGE_CLASSES: Record<number, string> = {
  0: "bg-slate-100 text-slate-700 border-slate-300",
  1: "bg-blue-100 text-blue-700 border-blue-300",
  2: "bg-amber-100 text-amber-700 border-amber-300",
  3: "bg-emerald-100 text-emerald-700 border-emerald-300",
  4: "bg-violet-100 text-violet-700 border-violet-300",
  5: "bg-cyan-100 text-cyan-700 border-cyan-300",
  6: "bg-rose-100 text-rose-700 border-rose-300",
  7: "bg-orange-100 text-orange-700 border-orange-300",
  8: "bg-lime-100 text-lime-700 border-lime-300",
  9: "bg-teal-100 text-teal-700 border-teal-300",
  10: "bg-fuchsia-100 text-fuchsia-700 border-fuchsia-300",
  11: "bg-indigo-100 text-indigo-700 border-indigo-300",
  12: "bg-pink-100 text-pink-700 border-pink-300",
};

const DEFAULT_STATUS_BADGE = STATUS_BADGE_CLASSES[0];

export function statusBadgeClass(status: number | string | undefined): string {
  return STATUS_BADGE_CLASSES[Number(status)] ?? DEFAULT_STATUS_BADGE;
}
