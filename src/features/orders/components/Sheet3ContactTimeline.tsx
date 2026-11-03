import { useEffect, useState } from "react";

import { LogoSpinner } from "@/components/ui/logo-spinner";
import { getOrderJourneyEvents } from "@/lib/api/orders";
import { formatRelativeTime } from "@/features/orders/format-relative-time";
import type { OrderJourneyEventRow } from "@/features/orders/order-types";

type Props = {
  /** Đơn cần xem timeline; null = chưa chọn. */
  orderId: number | null;
  /** Chỉ fetch khi panel đang mở để tránh gọi thừa. */
  active: boolean;
  now?: Date;
};

/**
 * Lịch sử hành trình của 1 đơn (gồm các lần "Ghi liên hệ"), fetch on-demand.
 * Các list view (board Tư vấn) cố tình không kèm journey events để query nhẹ.
 */
export function Sheet3ContactTimeline({ orderId, active, now = new Date() }: Props) {
  const [events, setEvents] = useState<OrderJourneyEventRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!active || orderId === null) return;
    let alive = true;
    setLoading(true);
    setError("");
    getOrderJourneyEvents(orderId)
      .then((rows) => {
        if (alive) setEvents(rows);
      })
      .catch(() => {
        if (alive) setError("Không tải được lịch sử liên hệ.");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [orderId, active]);

  return (
    <section className="mb-4 rounded-lg border border-border bg-card p-3">
      <h3 className="mb-2 text-sm font-semibold text-foreground">Lịch sử liên hệ</h3>
      {loading && (
        <div className="flex justify-center py-6">
          <LogoSpinner size={24} label="Đang tải..." className="mx-auto" />
        </div>
      )}
      {!loading && error && <div className="text-xs text-action-danger">{error}</div>}
      {!loading && !error && events.length === 0 && (
        <div className="text-xs text-muted-foreground">Chưa có lịch sử liên hệ.</div>
      )}
      {!loading && !error && events.length > 0 && (
        <ol className="space-y-2">
          {events.map((e) => (
            <li key={e.id} className="border-l-2 border-border pl-3 text-xs leading-relaxed">
              <div className="flex flex-wrap items-center gap-x-2 text-muted-foreground">
                <span className="font-medium text-foreground">
                  {e.event_type_label || e.event_type}
                </span>
                <span>{formatRelativeTime(e.created_at ?? null, now)}</span>
                {e.actor_name ? <span>· {e.actor_name}</span> : null}
              </div>
              {e.note ? <div className="text-foreground">{e.note}</div> : null}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
