import { CalendarClock } from "lucide-react";

import { ResaleTrackingRow } from "@/lib/api/customers";
import { formatCurrency, formatDate } from "@/features/customers/resale-format";

export function ContactHistory({ row }: { row: ResaleTrackingRow }) {
  const logs = Array.isArray(row.contact_logs) ? row.contact_logs.slice(-3).reverse() : [];
  const contacts = [
    { label: "Lần 1", value: row.contact_1_at },
    { label: "Lần 2", value: row.contact_2_at },
    { label: "Lần 3", value: row.contact_3_at },
  ].filter((item) => item.value);
  const latestOrders = row.order_assessment.slice(0, 2);

  if (contacts.length === 0 && logs.length === 0 && !row.appointment && latestOrders.length === 0) {
    return <span className="text-xs text-muted-foreground">Chưa có lịch sử</span>;
  }

  return (
    <div className="min-w-65 space-y-2">
      {logs.map((log, index) => (
        <div key={`${log.created_at || "log"}-${index}`} className="flex items-start gap-2">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-600" />
          <div>
            <div className="line-clamp-2 text-xs text-foreground">
              {log.channel || "Liên hệ"}
              {log.result ? ` - ${log.result}` : ""}
            </div>
            <div className="text-xs text-muted-foreground">
              {formatDate(log.created_at || null)}
              {log.customer_status ? ` · ${log.customer_status}` : ""}
            </div>
          </div>
        </div>
      ))}
      {row.appointment?.appointment_at && (
        <div className="flex items-start gap-2">
          <CalendarClock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <div>
            <div className="line-clamp-1 text-xs font-medium text-foreground">
              {formatDate(row.appointment.appointment_at)}
            </div>
            <div className="line-clamp-1 text-xs text-muted-foreground">
              {row.appointment.purpose || row.appointment.note || "Lịch hẹn"}
            </div>
          </div>
        </div>
      )}
      {contacts.map((item) => (
        <div key={item.label} className="flex items-start gap-2">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-600" />
          <div>
            <div className="text-xs text-foreground">{item.label}: đã liên hệ</div>
            <div className="text-xs text-muted-foreground">{formatDate(item.value)}</div>
          </div>
        </div>
      ))}
      {latestOrders.map((order) => {
        const note =
          order.assessment.sales_status ||
          order.assessment.customer_classification ||
          order.assessment.delivery_business_status ||
          order.assessment.note ||
          "Chưa có assessment";
        return (
          <div key={order.order_id} className="flex items-start gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground" />
            <div>
              <div className="line-clamp-2 text-xs text-muted-foreground">
                {order.order_code}: {note}
              </div>
              <div className="text-xs text-muted-foreground">
                {formatDate(order.created_at)} · {formatCurrency(order.total_amount)} đ
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
