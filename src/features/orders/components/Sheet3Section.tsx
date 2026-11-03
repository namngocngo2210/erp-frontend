import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getCrmCatalogs } from "@/lib/api/orders";
import type { OrderRow } from "@/features/orders/order-types";
import { type CrmCatalogPayload } from "@/features/orders/BlockCrmRating";
import { Sheet3AssessmentPanel } from "./Sheet3AssessmentPanel";
import { swallowError } from "@/lib/errors";
import { useConfirm } from "@/hooks/use-confirm";

type ReasonOption = { code: string; label: string };

type Props = {
  rows: OrderRow[];
  /** Đơn đang mở panel chăm sóc CRM (null = đóng). Điều khiển từ OrdersPage. */
  openOrderId: number | null;
  onClose: () => void;
  onLogContact?: (
    orderId: number,
    payload: {
      outcome?: string;
      transcript?: string;
      sales_status?: string;
      not_closed_reason?: string;
    },
  ) => Promise<void>;
  onCloseCase?: (orderId: number, reason?: string) => Promise<void>;
  onPatchOrder: (id: number, payload: Partial<OrderRow>, silent?: boolean) => Promise<void>;
  onNavigateToDetail: (orderId: number) => void;
};

function toDatetimeLocal(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function Sheet3Section({
  rows,
  openOrderId,
  onClose,
  onLogContact,
  onCloseCase,
  onPatchOrder,
  onNavigateToDetail,
}: Props) {
  const confirm = useConfirm();
  const [reasonOptions, setReasonOptions] = useState<ReasonOption[]>([]);
  const [salesStatusOptions, setSalesStatusOptions] = useState<ReasonOption[]>([]);
  const [crmCatalog, setCrmCatalog] = useState<CrmCatalogPayload | null>(null);

  // Track id (not snapshot) so the panel reflects live row data after save.
  const assessmentRow =
    openOrderId === null ? null : (rows.find((r) => r.id === openOrderId) ?? null);

  const [contactRow, setContactRow] = useState<OrderRow | null>(null);
  const [transcript, setTranscript] = useState("");
  const [contactStatus, setContactStatus] = useState("");
  const [contactReason, setContactReason] = useState("");

  const [scheduleRow, setScheduleRow] = useState<OrderRow | null>(null);
  const [scheduleAt, setScheduleAt] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await getCrmCatalogs<CrmCatalogPayload>();
        if (!active) return;
        setCrmCatalog(data);
        setReasonOptions(data.not_closed_reason_options ?? []);
        setSalesStatusOptions(data.sales_status_options ?? []);
      } catch (err) {
        /* giữ rỗng nếu lỗi */
        swallowError(err, "orders.sheet3.crmCatalog");
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const openContact = (row: OrderRow) => {
    setContactRow(row);
    setTranscript("");
    setContactStatus(row.crm?.sales_status_code ?? "");
    setContactReason(row.crm?.not_closed_reason_code ?? "");
  };

  const submitContact = async () => {
    if (!contactRow || !onLogContact) return;
    await onLogContact(contactRow.id, {
      outcome: contactStatus || "logged",
      transcript: transcript.trim(),
      sales_status: contactStatus || undefined,
      not_closed_reason: contactReason || undefined,
    });
    setContactRow(null);
  };

  const openSchedule = (row: OrderRow) => {
    setScheduleRow(row);
    setScheduleAt(toDatetimeLocal(row.crm?.next_followup_at));
  };

  const submitSchedule = async () => {
    if (!scheduleRow || !scheduleAt) return;
    const iso = new Date(scheduleAt).toISOString();
    await onPatchOrder(scheduleRow.id, {
      crm: { ...scheduleRow.crm, next_followup_at: iso, sales_status_code: "scheduled" },
    });
    setScheduleRow(null);
  };

  const handleCloseCase = async (row: OrderRow) => {
    if (!onCloseCase) return;
    const ok = await confirm({
      title: `Đóng case khách "${row.name || row.phone}"?`,
      description: "Đơn sẽ chuyển sang archive (win-back).",
      confirmText: "Đóng case",
    });
    if (!ok) return;
    await onCloseCase(row.id, row.crm?.not_closed_reason_code ?? undefined);
  };

  return (
    <>
      <Sheet3AssessmentPanel
        open={assessmentRow !== null}
        onOpenChange={(next) => {
          if (!next) onClose();
        }}
        order={assessmentRow}
        crmCatalog={crmCatalog}
        onSave={(id, payload) => onPatchOrder(id, payload, false)}
        onLogContact={openContact}
        onSchedule={openSchedule}
        onCloseCase={handleCloseCase}
        onConvert={(row) => onNavigateToDetail(row.id)}
      />

      {/* Dialog Ghi liên hệ */}
      <Dialog open={!!contactRow} onOpenChange={(o) => !o && setContactRow(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ghi liên hệ — {contactRow?.name || contactRow?.phone}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Nội dung / kết quả</label>
              <Textarea
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder="Tóm tắt cuộc gọi…"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Trạng thái sale</label>
                <Select value={contactStatus} onValueChange={setContactStatus}>
                  <SelectTrigger className="h-9 w-full">
                    <SelectValue placeholder="— Giữ nguyên —" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">— Giữ nguyên —</SelectItem>
                    {salesStatusOptions.map((o) => (
                      <SelectItem key={o.code} value={o.code}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Lý do chưa chốt</label>
                <Select value={contactReason} onValueChange={setContactReason}>
                  <SelectTrigger className="h-9 w-full">
                    <SelectValue placeholder="— Không đổi —" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">— Không đổi —</SelectItem>
                    {reasonOptions.map((o) => (
                      <SelectItem key={o.code} value={o.code}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setContactRow(null)}>
              Huỷ
            </Button>
            <Button onClick={submitContact}>Lưu liên hệ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Đặt hẹn */}
      <Dialog open={!!scheduleRow} onOpenChange={(o) => !o && setScheduleRow(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Đặt hẹn — {scheduleRow?.name || scheduleRow?.phone}</DialogTitle>
          </DialogHeader>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Thời gian hẹn</label>
            <input
              type="datetime-local"
              className="h-9 w-full rounded border border-border bg-background px-2 text-sm"
              value={scheduleAt}
              onChange={(e) => setScheduleAt(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScheduleRow(null)}>
              Huỷ
            </Button>
            <Button onClick={submitSchedule} disabled={!scheduleAt}>
              Lưu hẹn
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
