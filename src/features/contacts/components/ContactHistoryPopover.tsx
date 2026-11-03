import { useState, type ReactNode } from "react";
import { Loader2 } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { ContactActivityItem } from "@/lib/api/contacts";
import { useContactActivities } from "../queries";
import { ContactNoteDialog } from "./ContactNoteDialog";

type ContactHistoryPopoverProps = {
  customerId: number;
  customerName: string;
  /** Nội dung nút trigger (icon History) — popover tự vẽ khung nút, children chỉ là icon/label. */
  children: ReactNode;
};

function formatActivityTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(date.getHours())}:${pad(date.getMinutes())} ${pad(date.getDate())}/${pad(date.getMonth() + 1)}`;
}

function callDurationLabel(callMeta: ContactActivityItem["call_meta"]): string {
  const duration = callMeta && typeof callMeta.duration_s === "number" ? callMeta.duration_s : null;
  return duration !== null ? `Cuộc gọi ${duration}s` : "Cuộc gọi";
}

/**
 * Mô tả activity type="operation" (module contact_flow, xem operation_engine.py):
 * event="enter_start" (khách vào flow) / "apply_result" (ghi kết quả, đổi bước)
 * / "edit_due" (sửa giờ hẹn thủ công). call_meta shape khác nhau theo event —
 * key không khớp (thiếu event lạ/null) → fallback "—".
 */
function operationDescription(item: ContactActivityItem): string {
  const meta = item.call_meta;
  const event = meta && typeof meta.event === "string" ? meta.event : null;
  const asText = (value: unknown, fallback = "—") =>
    typeof value === "string" && value ? value : fallback;

  if (event === "enter_start") {
    return `Vào flow: ${asText(meta?.to_stage)}`;
  }
  if (event === "edit_due") {
    const dueAt = meta?.due_at;
    return `Sửa giờ hẹn: ${typeof dueAt === "string" ? formatActivityTime(dueAt) : "—"}`;
  }
  if (event === "apply_result") {
    const base = `${asText(meta?.from_stage)} —(${asText(meta?.result)})→ ${asText(meta?.to_stage)}`;
    const dueAt = meta?.due_at;
    return typeof dueAt === "string" ? `${base} · hẹn ${formatActivityTime(dueAt)}` : base;
  }
  return item.note || "—";
}

function activityDescription(item: ContactActivityItem): string {
  if (item.type === "status_change") {
    return `${item.from_label || "—"} → ${item.to_label || "—"}`;
  }
  if (item.type === "call") {
    const base = callDurationLabel(item.call_meta);
    return item.note ? `${base} — ${item.note}` : base;
  }
  if (item.type === "operation") {
    return operationDescription(item);
  }
  return item.note || "—";
}

function ActivityRow({ item }: { item: ContactActivityItem }) {
  return (
    <li className="border-b border-border/60 py-2 last:border-b-0">
      <div className="text-xs text-muted-foreground">
        {formatActivityTime(item.at)} · {item.actor_name}
      </div>
      <div className="text-sm text-foreground">{activityDescription(item)}</div>
    </li>
  );
}

/**
 * Popover timeline liên hệ của 1 KH — lazy: chỉ fetch activities khi đã mở
 * (customerId truyền vào useContactActivities = null lúc đóng). Footer "+ Ghi
 * chú" mở ContactNoteDialog lồng bên trong, dùng chung customerId.
 */
export function ContactHistoryPopover({
  customerId,
  customerName,
  children,
}: ContactHistoryPopoverProps) {
  const [open, setOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const activitiesQuery = useContactActivities(open ? customerId : null);
  const items = activitiesQuery.data?.items ?? [];

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          className={buttonVariants({ variant: "outline", size: "icon-sm" })}
          aria-label="Lịch sử liên hệ"
          title={`Lịch sử liên hệ — ${customerName}`}
        >
          {children}
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" side="bottom">
          <div className="max-h-72 overflow-y-auto px-3 py-2">
            {activitiesQuery.isLoading ? (
              <div className="flex items-center justify-center py-6 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            ) : items.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Chưa có lịch sử liên hệ
              </p>
            ) : (
              <ul>
                {items.map((item, index) => (
                  <ActivityRow key={`${item.type}-${item.at}-${index}`} item={item} />
                ))}
              </ul>
            )}
          </div>
          <div className="border-t border-border p-2">
            <button
              type="button"
              className="w-full rounded-md px-2 py-1.5 text-left text-sm font-medium text-primary hover:bg-accent"
              onClick={() => {
                // Đóng popover TRƯỚC khi mở dialog: PopoverContent có zIndex 9999
                // inline còn Dialog chỉ z-50 — không đóng thì dialog chìm dưới
                // popover (mirror KshipNotePresetPicker). Dialog là sibling của
                // Popover nên không bị unmount khi popover đóng.
                setOpen(false);
                setNoteOpen(true);
              }}
            >
              + Ghi chú
            </button>
          </div>
        </PopoverContent>
      </Popover>
      <ContactNoteDialog customerId={customerId} open={noteOpen} onOpenChange={setNoteOpen} />
    </>
  );
}
