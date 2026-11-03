import { useEffect, useMemo, useState } from "react";
import { Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { LogoSpinner } from "@/components/ui/logo-spinner";
import { PaginationPages } from "@/components/ui/pagination";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import {
  type BlocklistEntry,
  type BlocklistReason,
  useAddBlocklistEntry,
  useBlocklist,
  useDeleteBlocklistEntry,
  useUpdateBlocklistReason,
} from "@/features/blocklist/queries";
import { LANDING_TABS, type LandingTabKey } from "@/features/orders/landing-tabs";
import { formatDateTimeVi, formatNumber } from "@/lib/format";
import { useConfirm } from "@/hooks/use-confirm";

const REASON_LABELS: Record<BlocklistReason, string> = {
  spam: "Spam",
  bomb: "Bom hàng",
  blacklist: "Đưa vào blacklist",
  duplicate_abuse: "Trùng lặp",
  other: "Khác",
};

type Props = {
  activeTab: LandingTabKey;
  onTabChange: (next: LandingTabKey) => void;
};

const PAGE_SIZE = 50;

export function BlocklistPage({ activeTab, onTabChange }: Props) {
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [reasonFilter, setReasonFilter] = useState<BlocklistReason | "all">("all");
  const [page, setPage] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<{ phone: string; reason: BlocklistReason; notes: string }>({
    phone: "",
    reason: "blacklist",
    notes: "",
  });
  const [formError, setFormError] = useState<string>("");

  const listQuery = useBlocklist({
    q: search || undefined,
    reason: reasonFilter === "all" ? undefined : reasonFilter,
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  });
  const items = listQuery.data?.items ?? [];
  const total = listQuery.data?.total ?? 0;
  const loading = listQuery.isPending;

  // Toast mỗi lần tải danh sách thất bại.
  useEffect(() => {
    if (!listQuery.isError) return;
    console.error("[blocklist:load]", listQuery.error);
    toast.error("Không tải được danh sách chặn.");
    // errorUpdatedAt: toast lại nếu retry/refetch tiếp tục lỗi.
  }, [listQuery.isError, listQuery.errorUpdatedAt, listQuery.error]);

  const addMutation = useAddBlocklistEntry();
  const deleteMutation = useDeleteBlocklistEntry();
  const confirm = useConfirm();
  const updateReasonMutation = useUpdateBlocklistReason();
  const submitting = addMutation.isPending;

  const handleSubmit = async () => {
    setFormError("");
    if (!form.phone.trim()) {
      setFormError("Vui lòng nhập số điện thoại.");
      return;
    }
    try {
      await addMutation.mutateAsync({
        phone: form.phone.trim(),
        reason: form.reason,
        notes: form.notes.trim(),
      });
      toast.success("Đã thêm số vào blocklist.");
      setDialogOpen(false);
      setForm({ phone: "", reason: "blacklist", notes: "" });
      setPage(0);
    } catch (err) {
      const message = (err as { message?: string })?.message || "Không thể thêm.";
      setFormError(message);
    }
  };

  const handleDelete = async (entry: BlocklistEntry) => {
    const ok = await confirm({
      title: `Xoá số ${entry.phone_normalized} khỏi blocklist?`,
      destructive: true,
    });
    if (!ok) return;
    try {
      await deleteMutation.mutateAsync(entry.id);
      toast.success("Đã xoá.");
    } catch (err) {
      console.error("[blocklist:delete]", err);
      toast.error("Không xoá được.");
    }
  };

  const handleUpdateReason = async (entry: BlocklistEntry, nextReason: BlocklistReason) => {
    try {
      await updateReasonMutation.mutateAsync({ id: entry.id, reason: nextReason });
    } catch (err) {
      console.error("[blocklist:update]", err);
      toast.error("Cập nhật thất bại.");
    }
  };

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total]);

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <div className="mb-1.5 flex flex-wrap items-center gap-1">
        {LANDING_TABS.map((tab) => {
          const isActive = tab.key === activeTab;
          return (
            <button
              key={tab.key}
              type="button"
              className={`inline-flex h-8 items-center rounded-md border px-2.5 text-xs font-medium transition-colors ${
                isActive
                  ? "border-primary bg-primary text-primary-foreground shadow-xs"
                  : "border-border bg-background text-foreground hover:bg-accent"
              }`}
              onClick={() => {
                if (!isActive) onTabChange(tab.key);
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="rounded-lg border border-border bg-card p-2 shadow-xs sm:p-2.5">
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <div className="relative w-40 sm:w-64">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-8 pl-8 text-sm"
              placeholder="Tìm theo số hoặc ghi chú"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setPage(0);
                  setSearch(searchInput);
                }
              }}
            />
          </div>
          <Select
            value={reasonFilter}
            onValueChange={(value) => {
              setPage(0);
              setReasonFilter(value as BlocklistReason | "all");
            }}
          >
            <SelectTrigger className="h-8 w-40 text-xs">
              <SelectValue placeholder="Tất cả lý do" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả lý do</SelectItem>
              {Object.entries(REASON_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            className="ml-auto inline-flex h-8 items-center gap-1.5 px-2.5 text-xs"
            onClick={() => setDialogOpen(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            Thêm số
          </Button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-card shadow-xs">
        <div className="min-h-0 flex-1 overflow-auto">
          <table data-slot="table" className="w-full caption-bottom text-sm">
            <thead className="sticky top-0 z-10 bg-muted">
              <tr className="border-b border-border">
                <th className="px-3 py-2 text-left font-semibold">Số điện thoại</th>
                <th className="px-3 py-2 text-left font-semibold">Lý do</th>
                <th className="px-3 py-2 text-left font-semibold">Ghi chú</th>
                <th className="px-3 py-2 text-left font-semibold">Người thêm</th>
                <th className="px-3 py-2 text-left font-semibold">Thời gian</th>
                <th className="px-3 py-2 text-right font-semibold">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center">
                    <LogoSpinner label="Đang tải..." className="mx-auto" />
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">
                    Chưa có số nào trong blocklist.
                  </td>
                </tr>
              ) : (
                items.map((entry) => (
                  <tr key={entry.id} className="border-b border-border/60 hover:bg-accent/40">
                    <td className="px-3 py-2 font-mono">{entry.phone_normalized}</td>
                    <td className="px-3 py-2">
                      <Select
                        value={entry.reason}
                        onValueChange={(v) => handleUpdateReason(entry, v as BlocklistReason)}
                      >
                        <SelectTrigger className="h-8 w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(REASON_LABELS).map(([key, label]) => (
                            <SelectItem key={key} value={key}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{entry.notes || "—"}</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {entry.created_by_username || "—"}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {formatDateTimeVi(entry.created_at)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => handleDelete(entry)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-border bg-muted/20 px-2.5 py-1.5 text-sm">
          <span className="text-muted-foreground">Tổng: {formatNumber(total)} số</span>
          <PaginationPages
            page={page + 1}
            totalPages={totalPages}
            onPageChange={(next) => setPage(next - 1)}
          />
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Thêm số vào blocklist</DialogTitle>
            <DialogDescription>
              Số điện thoại nằm trong blocklist sẽ bị reject ở mọi luồng ingest.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div>
              <label className="text-sm font-medium">Số điện thoại</label>
              <Input
                className="mt-1"
                placeholder="0912345678"
                value={form.phone}
                onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Lý do</label>
              <Select
                value={form.reason}
                onValueChange={(v) =>
                  setForm((prev) => ({ ...prev, reason: v as BlocklistReason }))
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(REASON_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Ghi chú</label>
              <Textarea
                className="mt-1"
                rows={3}
                value={form.notes}
                onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
              />
            </div>
            {formError && <p className="text-sm text-destructive">{formError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting}>
              Huỷ
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Đang thêm..." : "Thêm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
