import { type FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LogoSpinner } from "@/components/ui/logo-spinner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { LeaveType } from "@/features/ess/ess-types";
import { useCreateMyLeave, useMyLeave } from "@/features/ess/queries";

const STATUS_LABEL: Record<string, string> = {
  pending: "Chờ duyệt",
  approved: "Đã duyệt",
  rejected: "Từ chối",
  cancelled: "Đã huỷ",
};
const TYPE_LABEL: Record<string, string> = {
  annual: "Phép năm",
  sick: "Nghỉ ốm",
  unpaid: "Không lương",
  other: "Khác",
};

export default function MyLeavePage() {
  const { data, isLoading } = useMyLeave();
  const create = useCreateMyLeave();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    leave_type: "annual" as LeaveType,
    start_date: "",
    end_date: "",
    reason: "",
  });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    await create.mutateAsync(form);
    setOpen(false);
    setForm({ leave_type: "annual", start_date: "", end_date: "", reason: "" });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-lg font-semibold">Nghỉ phép</h1>
        <Button size="sm" onClick={() => setOpen((v) => !v)}>
          {open ? "Đóng" : "Tạo đơn"}
        </Button>
      </div>

      {open && (
        <form onSubmit={submit} className="space-y-3 rounded-lg border border-border bg-card p-3">
          <Select
            value={form.leave_type}
            onValueChange={(value) => setForm({ ...form, leave_type: value as LeaveType })}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="annual">Phép năm</SelectItem>
              <SelectItem value="sick">Nghỉ ốm</SelectItem>
              <SelectItem value="unpaid">Không lương</SelectItem>
              <SelectItem value="other">Khác</SelectItem>
            </SelectContent>
          </Select>
          <Input
            type="date"
            value={form.start_date}
            onChange={(e) => setForm({ ...form, start_date: e.target.value })}
            required
          />
          <Input
            type="date"
            value={form.end_date}
            onChange={(e) => setForm({ ...form, end_date: e.target.value })}
            required
          />
          <Input
            placeholder="Lý do"
            value={form.reason}
            onChange={(e) => setForm({ ...form, reason: e.target.value })}
          />
          {create.isError && (
            <p className="text-sm text-destructive">Gửi đơn thất bại. Vui lòng thử lại.</p>
          )}
          <Button type="submit" className="h-11 w-full" disabled={create.isPending}>
            {create.isPending ? "Đang gửi…" : "Gửi đơn"}
          </Button>
        </form>
      )}

      {isLoading && (
        <div className="flex justify-center py-10">
          <LogoSpinner size={32} label="Đang tải..." />
        </div>
      )}
      {data && data.length === 0 && (
        <p className="text-sm text-muted-foreground">Chưa có đơn nghỉ.</p>
      )}
      <ul className="space-y-2">
        {data?.map((item) => (
          <li key={item.id} className="rounded-lg border border-border bg-card px-3 py-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{TYPE_LABEL[item.leave_type]}</span>
              <span className="text-xs text-muted-foreground">{STATUS_LABEL[item.status]}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {item.start_date} → {item.end_date} ({item.days} ngày)
            </p>
            {item.reason && <p className="text-xs">{item.reason}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}
