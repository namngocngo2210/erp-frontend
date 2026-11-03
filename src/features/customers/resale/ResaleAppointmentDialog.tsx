import type { Dispatch, SetStateAction } from "react";
import { CalendarClock } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { ResaleTrackingRow } from "@/lib/api/customers";
import { APPOINTMENT_PURPOSES, CONTACT_CHANNELS, formatDate } from "../resale-format";
import type { ResaleAppointmentForm } from "./resale-tracking-state";

type Props = {
  row: ResaleTrackingRow | null;
  form: ResaleAppointmentForm;
  setForm: Dispatch<SetStateAction<ResaleAppointmentForm>>;
  saving: boolean;
  onClose: () => void;
  onSubmit: () => Promise<void>;
};

export function ResaleAppointmentDialog({ row, form, setForm, saving, onClose, onSubmit }: Props) {
  return (
    <Dialog open={!!row} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-130">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <CalendarClock className="h-4 w-4 text-primary" />
            Đặt lịch hẹn gọi hỏi thăm
          </DialogTitle>
        </DialogHeader>
        {row && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {row.recipient.name || row.customer.full_name} -{" "}
              {row.recipient.phone || row.customer.phone} · Sale: {row.sale_staff_name || "-"}
            </p>
            {row.appointment?.appointment_at && (
              <div className="rounded-md bg-muted/50 p-3 text-xs">
                <div className="font-medium">Lịch hẹn hiện tại</div>
                <div className="text-muted-foreground">
                  {formatDate(row.appointment.appointment_at)} -{" "}
                  {row.appointment.note || row.appointment.purpose}
                </div>
              </div>
            )}
            <div>
              <label className="mb-1 block text-sm text-muted-foreground">Ngày & giờ hẹn gọi</label>
              <Input
                type="datetime-local"
                value={form.appointment_at}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, appointment_at: event.target.value }))
                }
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-muted-foreground">Kênh liên hệ</label>
              <Select
                value={form.channel}
                onValueChange={(value) => setForm((prev) => ({ ...prev, channel: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONTACT_CHANNELS.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-sm text-muted-foreground">Mục tiêu cuộc gọi</label>
              <Select
                value={form.purpose}
                onValueChange={(value) => setForm((prev) => ({ ...prev, purpose: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {APPOINTMENT_PURPOSES.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-sm text-muted-foreground">Ghi chú chuẩn bị</label>
              <Textarea
                value={form.note}
                onChange={(event) => setForm((prev) => ({ ...prev, note: event.target.value }))}
                placeholder="VD: Khách đang dùng BNC02, hỏi thêm về MSC06..."
                className="min-h-19"
              />
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Hủy
          </Button>
          <Button onClick={() => onSubmit().catch(() => null)} disabled={saving}>
            Lưu lịch hẹn
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
