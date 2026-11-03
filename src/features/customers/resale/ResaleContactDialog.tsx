import type { Dispatch, SetStateAction } from "react";
import { PhoneCall } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { ResaleTrackingRow } from "@/lib/api/customers";
import { CONTACT_CHANNELS, CUSTOMER_STATUSES, contactCount, formatDate } from "../resale-format";
import type { ResaleContactForm } from "./resale-tracking-state";

type Props = {
  row: ResaleTrackingRow | null;
  form: ResaleContactForm;
  setForm: Dispatch<SetStateAction<ResaleContactForm>>;
  saving: boolean;
  onClose: () => void;
  onSubmit: () => Promise<void>;
};

export function ResaleContactDialog({ row, form, setForm, saving, onClose, onSubmit }: Props) {
  return (
    <Dialog open={!!row} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-130">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <PhoneCall className="h-4 w-4 text-primary" />
            Ghi nhận liên hệ
          </DialogTitle>
        </DialogHeader>
        {row && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {row.recipient.name || row.customer.full_name} -{" "}
              {row.recipient.phone || row.customer.phone} · Sale: {row.sale_staff_name || "-"}
            </p>
            <div>
              <p className="mb-2 text-sm font-medium">Lịch sử liên hệ ({contactCount(row)} lần)</p>
              <div className="max-h-28 space-y-2 overflow-auto rounded-md bg-muted/50 p-3 text-xs">
                {(row.contact_logs || []).length === 0 ? (
                  <p className="text-muted-foreground">Chưa có lịch sử liên hệ</p>
                ) : (
                  row.contact_logs
                    ?.slice(-3)
                    .reverse()
                    .map((log, index) => (
                      <div key={`${log.created_at || "contact"}-${index}`} className="flex gap-2">
                        <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-teal-600" />
                        <div>
                          <div>
                            {log.channel || "Liên hệ"}
                            {log.result ? ` - ${log.result}` : ""}
                          </div>
                          <div className="text-muted-foreground">
                            {formatDate(log.created_at || null)}
                            {log.customer_status ? ` · ${log.customer_status}` : ""}
                          </div>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>
            <div className="border-t pt-3">
              <p className="mb-2 text-sm font-medium">Ghi nhận liên hệ mới</p>
              <div className="space-y-3">
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
                  <label className="mb-1 block text-sm text-muted-foreground">
                    Kết quả cuộc gọi
                  </label>
                  <Textarea
                    value={form.result}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, result: event.target.value }))
                    }
                    placeholder="VD: Khách hài lòng với SP, hỏi thêm về MSC06..."
                    className="min-h-19"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-muted-foreground">
                    Trạng thái khách
                  </label>
                  <Select
                    value={form.customer_status}
                    onValueChange={(value) =>
                      setForm((prev) => ({ ...prev, customer_status: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CUSTOMER_STATUSES.map((item) => (
                        <SelectItem key={item} value={item}>
                          {item}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Hủy
          </Button>
          <Button onClick={() => onSubmit().catch(() => null)} disabled={saving}>
            Lưu lịch sử
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
