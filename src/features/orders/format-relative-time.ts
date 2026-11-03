import { formatDateVi } from "@/lib/format";
export function formatRelativeTime(iso: string | null | undefined, now: Date = new Date()): string {
  if (!iso) return "—";
  const then = new Date(iso);
  if (isNaN(then.getTime())) return "—";
  const diffMs = now.getTime() - then.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Vừa xong";
  if (mins < 60) return `${mins}p trước`;
  const hours = Math.floor(mins / 60);
  if (hours < 24 && now.getDate() === then.getDate()) return `${hours}h trước`;
  const days = Math.floor(diffMs / 86400000);
  if (days <= 1) return "Hôm qua";
  if (days < 7) return `${days} ngày trước`;
  return formatDateVi(then);
}
