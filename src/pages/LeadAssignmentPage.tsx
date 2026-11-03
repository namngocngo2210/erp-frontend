import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { CopyPlus, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  type LeadAssignmentDay,
  type LeadAssignmentStaff,
  type MatrixSheetKey,
  type SheetKey,
  type ShiftKey,
  type ShiftWindow,
} from "@/lib/api/lead-assignment";
import { ResaleStatsPanel } from "@/features/lead-assignment/components/ResaleStatsPanel";
import {
  useCopyLeadAssignmentDay,
  useDeleteLeadAssignmentDay,
  useFoxiaResaleStats,
  useLeadAssignmentDay,
  useLeadAssignmentStaff,
  useSaveLeadAssignment,
  useSaveShiftWindows,
  useShiftWindows,
  useTransferOrders,
  useWorkload,
} from "@/features/lead-assignment/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LogoSpinner } from "@/components/ui/logo-spinner";
import { PageHeader } from "@/components/ui/page-header";
import { TimeField24 } from "@/components/ui/time-field-24";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useConfirm } from "@/hooks/use-confirm";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { pathFromSection } from "@/lib/routes";

const SHEETS: Array<{ key: SheetKey; label: string }> = [
  { key: "sheet1", label: "Landing xác nhận đơn" },
  { key: "sheet2", label: "Messenger xác nhận đơn" },
  { key: "sheet3", label: "Tư vấn" },
];

// Cột ma trận phân bổ: 3 sheet Landing + Resale (cơ hội Foxia từ đơn giao thành công).
const MATRIX_SHEETS: Array<{ key: MatrixSheetKey; label: string }> = [
  ...SHEETS,
  { key: "resale", label: "Resale (đơn giao thành công)" },
];

const SHIFTS: Array<{ key: ShiftKey; label: string }> = [
  { key: "morning", label: "Sáng" },
  { key: "afternoon", label: "Chiều" },
  { key: "evening", label: "Tối" },
];

function shiftLabel(key: ShiftKey | null): string {
  if (!key) return "";
  return SHIFTS.find((s) => s.key === key)?.label ?? key;
}

interface Row {
  user_id: number;
  weights: Record<MatrixSheetKey, number>;
}

const EMPTY_WEIGHTS: Record<MatrixSheetKey, number> = {
  sheet1: 0,
  sheet2: 0,
  sheet3: 0,
  resale: 0,
};

function dayToRows(data: LeadAssignmentDay): Row[] {
  return data.rows.map((r) => ({
    user_id: r.user_id,
    weights: {
      sheet1: r.cells.sheet1.weight,
      sheet2: r.cells.sheet2.weight,
      sheet3: r.cells.sheet3.weight,
      resale: r.cells.resale?.weight ?? 0,
    },
  }));
}

function todayIso(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export default function LeadAssignmentPage() {
  // Ngày dùng chung cho cả phần "tải & chuyển đơn" lẫn ma trận phân bổ.
  const [date, setDate] = useState(todayIso());
  const [shift, setShift] = useState<ShiftKey>("morning");
  const initializedShift = useRef(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Khung giờ của 3 ca làm việc (cấu hình chung, không gắn theo ngày/ca đang xem).
  const [windows, setWindows] = useState<ShiftWindow[]>([]);

  const [tSheet, setTSheet] = useState<SheetKey>("sheet1");
  const [fromId, setFromId] = useState<number | "">("");
  const [toId, setToId] = useState<number | "">("");
  const [count, setCount] = useState(1);
  const [transferMsg, setTransferMsg] = useState<string | null>(null);

  // Danh sách nhân viên phòng Sale do BE lọc sẵn (endpoint /lead-assignment/staff).
  const staffQuery = useLeadAssignmentStaff();
  const staffUsers = staffQuery.data ?? [];

  const dayQuery = useLeadAssignmentDay(date, shift);
  const workloadQuery = useWorkload(tSheet, date);
  const workload = workloadQuery.data?.items ?? [];
  const windowsQuery = useShiftWindows();
  const resaleStatsQuery = useFoxiaResaleStats(date);
  const currentShift = windowsQuery.data?.current_shift ?? null;

  const saveDayMutation = useSaveLeadAssignment();
  const deleteDayMutation = useDeleteLeadAssignmentDay();
  const confirm = useConfirm();
  const copyDayMutation = useCopyLeadAssignmentDay();
  const saveWindowsMutation = useSaveShiftWindows();
  const transferMutation = useTransferOrders();

  const saving =
    saveDayMutation.isPending || deleteDayMutation.isPending || copyDayMutation.isPending;
  const savingWindows = saveWindowsMutation.isPending;

  const colTotal = (sheet: MatrixSheetKey) => rows.reduce((s, r) => s + (r.weights[sheet] || 0), 0);

  // Đồng bộ ma trận editable từ dữ liệu server (đổi ngày/ca hoặc sau khi lưu).
  useEffect(() => {
    const data = dayQuery.data;
    if (!data) return;
    // Lần tải đầu tiên: mặc định ca đang xem theo ca hiện tại của hệ thống.
    // Sau đó tôn trọng lựa chọn thủ công của người dùng (initializedShift = true).
    if (!initializedShift.current) {
      initializedShift.current = true;
      // current_shift có thể null (ngoài giờ làm việc) → giữ ca mặc định, không tự đổi.
      if (data.current_shift && data.current_shift !== data.shift) {
        // setShift sẽ trigger query với ca đúng, không apply data cũ.
        setShift(data.current_shift);
        return;
      }
    }
    setRows(dayToRows(data));
  }, [dayQuery.data]);

  // Đồng bộ khung giờ editable từ dữ liệu server (load lần đầu / sau khi lưu).
  useEffect(() => {
    if (windowsQuery.data) setWindows(windowsQuery.data.windows);
  }, [windowsQuery.data]);

  const loadError =
    dayQuery.error instanceof Error
      ? dayQuery.error.message
      : dayQuery.error
        ? "Lỗi tải cấu hình"
        : null;

  function addRow() {
    const used = new Set(rows.map((r) => r.user_id));
    const next = staffUsers.find((u) => !used.has(u.id));
    if (!next) return;
    setRows([...rows, { user_id: next.id, weights: { ...EMPTY_WEIGHTS } }]);
  }
  function setCell(idx: number, sheet: MatrixSheetKey, val: number) {
    setRows(
      rows.map((r, i) => (i === idx ? { ...r, weights: { ...r.weights, [sheet]: val } } : r)),
    );
  }
  function removeRow(idx: number) {
    setRows(rows.filter((_, i) => i !== idx));
  }

  async function save() {
    setError(null);
    try {
      // Response được ghi vào cache trong onSuccess → effect đồng bộ apply rows.
      await saveDayMutation.mutateAsync({
        date,
        shift,
        rows: rows.map((r) => ({ user_id: r.user_id, weights: r.weights })),
      });
      // Cảnh báo (không chặn lưu) khi một cột có cấu hình nhưng tổng ≠ 100%.
      const offCols = SHEETS.filter((s) => {
        const t = colTotal(s.key);
        return t > 0 && t !== 100;
      }).map((s) => s.label);
      if (offCols.length > 0) {
        toast.warning(`Đã lưu, nhưng tổng cột chưa đủ 100%: ${offCols.join(", ")}.`);
      } else {
        toast.success(`Đã lưu phân bổ ca ${shiftLabel(shift)} ngày ${date}.`);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Lưu thất bại";
      setError(msg);
      toast.error(msg);
    }
  }

  async function clearDay() {
    const ok = await confirm({
      title: `Xoá TOÀN BỘ cấu hình phân bổ của ngày ${date}?`,
      description:
        "Cả 3 ca sáng/chiều/tối. Sau khi xoá, đơn mới trong ngày này sẽ KHÔNG được chia tự động.",
      destructive: true,
    });
    if (!ok) return;
    setError(null);
    try {
      // mutateAsync resolve sau khi ma trận refetch xong (invalidate trong onSuccess).
      await deleteDayMutation.mutateAsync(date);
      toast.success(`Đã xoá toàn bộ cấu hình ngày ${date}.`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Xoá thất bại";
      setError(msg);
      toast.error(msg);
    }
  }

  async function copyDay() {
    setError(null);
    try {
      // mutateAsync resolve sau khi ma trận refetch xong (invalidate trong onSuccess).
      const res = await copyDayMutation.mutateAsync(date);
      toast.success(
        `Đã copy ${res.copied} dòng cấu hình từ ngày ${res.source_date} sang ngày ${res.date}.`,
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Copy cấu hình thất bại";
      setError(msg);
      toast.error(msg);
    }
  }

  function setWindowTime(s: ShiftKey, field: "start_time" | "end_time", val: string) {
    setWindows((prev) => prev.map((w) => (w.shift === s ? { ...w, [field]: val } : w)));
  }

  async function saveWindows() {
    try {
      // Response ghi vào cache trong onSuccess → effect đồng bộ windows/current_shift.
      await saveWindowsMutation.mutateAsync({
        windows: windows.map((w) => ({
          shift: w.shift,
          // Rỗng = ca tắt (gửi null cho cả hai để BE xoá dòng).
          start_time: w.start_time || null,
          end_time: w.end_time || null,
        })),
      });
      toast.success("Đã lưu khung giờ ca làm việc.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lưu khung giờ thất bại.");
    }
  }

  async function doTransfer() {
    if (fromId === "" || toId === "" || fromId === toId) return;
    setTransferMsg(null);
    try {
      const res = await transferMutation.mutateAsync({
        sheet: tSheet,
        from_user_id: Number(fromId),
        to_user_id: Number(toId),
        count,
        date,
      });
      // Workload được invalidate/refetch nền trong onSuccess của mutation.
      setTransferMsg(`Đã chuyển ${res.transferred_count} đơn.`);
    } catch (e) {
      setTransferMsg(e instanceof Error ? e.message : "Chuyển thất bại");
    }
  }

  return (
    <div className="p-4 sm:p-6 space-y-4">
      {/* Header: tiêu đề + bộ lọc ngày dùng chung cho cả trang */}
      <PageHeader
        title="Chia đơn tự động"
        actions={
          <label className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Ngày</span>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-44"
            />
          </label>
        }
      />

      {/* NỬA TRÊN: khung giờ làm việc + tải & chuyển đơn */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Khung giờ làm việc */}
        <section className="space-y-3 rounded border p-4">
          <h2 className="text-lg font-semibold text-sky-900">Khung giờ làm việc</h2>
          <p className="text-sm text-muted-foreground">
            Khung giờ dùng để xác định "ca hiện tại". Không cần phủ kín 24h — đơn vào{" "}
            <strong>ngoài giờ làm việc sẽ không được chia tự động</strong>. Giờ kết thúc{" "}
            <strong>bao trọn cả phút đó</strong> (11:59 = tới 11:59:59), nên đặt ca liền nhau bằng
            cách cho giờ kết thúc ca trước sớm hơn giờ bắt đầu ca sau 1 phút (vd 11:59 rồi 12:00).
            Được phép <strong>1 ca cuộn qua đêm</strong> (giờ bắt đầu sau giờ kết thúc, vd 21:30 →
            11:59). Để trống cả 2 ô của một ca để <strong>tắt ca</strong> đó.
          </p>
          <div className="rounded border divide-y">
            {windows.map((w) => (
              <div key={w.shift} className="flex items-center gap-3 p-3">
                <span className="w-16 shrink-0 text-sm font-medium text-sky-900">{w.label}</span>
                {/* Cặp giờ co giãn trên màn hẹp thay vì xuống dòng lệch hàng. */}
                <div className="flex min-w-0 flex-1 items-center gap-2 sm:flex-none">
                  <TimeField24
                    className="min-w-0 flex-1 sm:w-32 sm:flex-none"
                    aria-label={`Giờ bắt đầu ca ${w.label}`}
                    value={w.start_time ?? ""}
                    onChange={(val) => setWindowTime(w.shift, "start_time", val)}
                  />
                  <span className="text-muted-foreground">–</span>
                  <TimeField24
                    className="min-w-0 flex-1 sm:w-32 sm:flex-none"
                    fillSeconds="ceil"
                    aria-label={`Giờ kết thúc ca ${w.label}`}
                    value={w.end_time ?? ""}
                    onChange={(val) => setWindowTime(w.shift, "end_time", val)}
                  />
                </div>
              </div>
            ))}
            {windows.length === 0 && (
              <div className="flex justify-center py-12">
                <LogoSpinner label="Đang tải..." />
              </div>
            )}
          </div>
          <Button onClick={saveWindows} disabled={savingWindows || windows.length === 0}>
            {savingWindows ? "Đang lưu..." : "Lưu khung giờ"}
          </Button>
        </section>

        {/* Tải & chuyển đơn */}
        <section className="space-y-3 rounded border p-4">
          <h2 className="text-lg font-semibold text-sky-900">Tải &amp; chuyển đơn</h2>
          <div className="flex items-center gap-2">
            <span className="text-sm">Sheet:</span>
            <Select value={tSheet} onValueChange={(value) => setTSheet(value as SheetKey)}>
              <SelectTrigger className="w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SHEETS.map((s) => (
                  <SelectItem key={s.key} value={s.key}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-muted-foreground">
            Số đơn đang chờ (chưa có trạng thái sale) được tạo trong ngày <strong>{date}</strong>.
          </p>
          <div className="overflow-x-auto">
            <table data-slot="table" className="w-full text-sm border rounded">
              <thead className="bg-sky-50 text-sky-900">
                <tr>
                  <th className="text-left p-2">Nhân viên</th>
                  <th className="text-right p-2 w-32">Đơn đang chờ</th>
                </tr>
              </thead>
              <tbody>
                {workload.map((it) => (
                  <tr key={it.user_id} className="border-t transition-colors hover:bg-muted/50">
                    <td className="p-2">{it.display_name || it.username}</td>
                    <td className="p-2 text-right">{it.pending_count}</td>
                  </tr>
                ))}
                {workload.length === 0 && (
                  <tr>
                    <td colSpan={2} className="p-4 text-center text-muted-foreground">
                      Không có đơn chờ.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <label className="text-sm">
              Từ NV
              <Select
                value={fromId === "" ? "" : String(fromId)}
                onValueChange={(value) => setFromId(value ? Number(value) : "")}
              >
                <SelectTrigger className="ml-1 inline-flex w-48">
                  <SelectValue placeholder="--" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">--</SelectItem>
                  {workload.map((it) => (
                    <SelectItem key={it.user_id} value={String(it.user_id)}>
                      {it.display_name || it.username} ({it.pending_count})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <label className="text-sm">
              Đến NV
              <Select
                value={toId === "" ? "" : String(toId)}
                onValueChange={(value) => setToId(value ? Number(value) : "")}
              >
                <SelectTrigger className="ml-1 inline-flex w-48">
                  <SelectValue placeholder="--" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">--</SelectItem>
                  {staffUsers.map((u) => (
                    <SelectItem key={u.id} value={String(u.id)}>
                      {u.display_name || u.username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <label className="text-sm">
              Số lượng
              <Input
                type="number"
                min={1}
                className="w-24 ml-1 inline-block"
                value={count}
                onChange={(e) => setCount(Math.max(1, Number(e.target.value) || 1))}
              />
            </label>
            <Button onClick={doTransfer} disabled={fromId === "" || toId === "" || fromId === toId}>
              Chuyển
            </Button>
            {transferMsg && <span className="text-sm text-muted-foreground">{transferMsg}</span>}
          </div>
        </section>
      </div>

      <ResaleStatsPanel
        date={date}
        data={resaleStatsQuery.data}
        loading={resaleStatsQuery.isLoading}
        error={resaleStatsQuery.error ? "Không tải được thống kê cơ hội resale" : null}
      />

      {/* NỬA DƯỚI: phân bổ % theo ca (ma trận NV × sheet) */}
      <section className="space-y-3 rounded border p-4">
        <h2 className="text-lg font-semibold text-sky-900">Phân bổ % theo ca</h2>
        <div className="flex flex-wrap items-center gap-2">
          {SHIFTS.map((s) => (
            <Button
              key={s.key}
              variant={shift === s.key ? "default" : "outline"}
              size="sm"
              aria-pressed={shift === s.key}
              onClick={() => setShift(s.key)}
            >
              {s.label}
            </Button>
          ))}
          <span className="text-sm text-muted-foreground">
            {currentShift
              ? `Ca hiện tại: ${shiftLabel(currentShift)}`
              : "Hiện đang ngoài giờ làm việc"}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          % nhận đơn của từng nhân viên trong mỗi sheet (chia theo cột, mỗi cột nên = 100%). Ô 0 =
          không nhận. Cấu hình áp dụng riêng cho ca <strong>{shiftLabel(shift)}</strong> ngày{" "}
          <strong>{date}</strong> và <strong>có hiệu lực ngay sau khi lưu</strong> cho các đơn mới.
        </p>
        {/* Minh bạch: một đơn chỉ được chia tự động khi thoả mọi điều kiện dưới đây. */}
        <div className="rounded border border-action-info/30 bg-action-info/10 p-3 text-xs text-action-info">
          <div className="font-medium">
            Vì sao "có đơn được chia, có đơn không"? Đơn chỉ tự chia khi:
          </div>
          <ul className="mt-1 list-disc pl-5 space-y-0.5">
            <li>Đơn chưa có nhân viên phụ trách (đơn đã gán sẵn sẽ giữ nguyên).</li>
            <li>
              Đơn thuộc 1 trong 3 sheet (đủ Tên/SĐT/Địa chỉ + đúng nguồn). Đơn thiếu thông tin hoặc
              sai nguồn sẽ không được chia.
            </li>
            <li>Đơn vào trong khung giờ ca đang bật (ngoài giờ làm việc → không chia).</li>
            <li>
              Cột <strong>Resale</strong>: chia cơ hội resale Foxia từ đơn vừa giao thành công (luôn
              chia, không giữ sale chốt đơn gốc). Ngoài ca hoặc ca chưa cấu hình cột này, cơ hội chờ
              tới ca kế tiếp. Chỉ nhân viên đã khai Foxia ID mới nhận được.
            </li>
            <li>
              Sheet tương ứng <strong>của đúng ngày &amp; ca lúc đơn tới</strong> đã được cấu hình
              (cột có người, tổng &gt; 0). Sang ngày mới phải cấu hình lại.
            </li>
          </ul>
        </div>
        {currentShift && currentShift !== shift && (
          <div className="rounded border border-action-warning/30 bg-action-warning/10 p-3 text-sm text-action-warning">
            Bạn đang sửa ca <strong>{shiftLabel(shift)}</strong> nhưng hệ thống đang ở ca{" "}
            <strong>{shiftLabel(currentShift)}</strong>. Đơn tạo ngay bây giờ sẽ chia theo cấu hình
            ca <strong>{shiftLabel(currentShift)}</strong>, không phải ca bạn đang xem.
          </div>
        )}
        {(error ?? loadError) && (
          <div className="text-sm text-action-danger">{error ?? loadError}</div>
        )}
        <ResaleEligibility staff={staffUsers} />
        <div className="overflow-x-auto">
          <table data-slot="table" className="w-full min-w-[640px] text-sm border rounded">
            <thead className="bg-sky-50 text-sky-900">
              <tr>
                <th className="text-left p-2">Nhân viên</th>
                {MATRIX_SHEETS.map((s) => (
                  <th key={s.key} className="text-center p-2 w-44">
                    {s.label}
                  </th>
                ))}
                <th className="p-2 w-12"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => (
                <tr key={r.user_id} className="border-t">
                  <td className="p-2">
                    <SearchableSelect
                      aria-label={`Nhân viên dòng ${idx + 1}`}
                      className="min-w-40"
                      value={String(r.user_id)}
                      onChange={(value) =>
                        setRows(
                          rows.map((rr, i) => (i === idx ? { ...rr, user_id: Number(value) } : rr)),
                        )
                      }
                      options={staffUsers
                        .filter(
                          (u) => u.id === r.user_id || !rows.some((rr) => rr.user_id === u.id),
                        )
                        .map((u) => ({ value: String(u.id), label: u.display_name || u.username }))}
                    />
                  </td>
                  {MATRIX_SHEETS.map((s) => {
                    // Cơ hội resale gán sale bên Foxia bằng Foxia ID — thiếu ID thì khoá ô
                    // (BE cũng chặn lưu), trừ khi ô đang có số cũ để người dùng còn xoá về 0.
                    const lacksFoxiaId =
                      s.key === "resale" &&
                      staffUsers.find((u) => u.id === r.user_id)?.has_foxia_id === false;
                    return (
                      <td key={s.key} className="p-2 text-center">
                        <Input
                          type="number"
                          min={0}
                          className="w-24 mx-auto text-right"
                          aria-label={`${s.label} dòng ${idx + 1}`}
                          title={lacksFoxiaId ? "Nhân viên chưa khai Foxia ID" : undefined}
                          disabled={lacksFoxiaId && !r.weights[s.key]}
                          value={r.weights[s.key]}
                          onChange={(e) =>
                            setCell(idx, s.key, Math.max(0, Number(e.target.value) || 0))
                          }
                        />
                        {lacksFoxiaId && (
                          <div className="mt-1 text-xs text-action-warning">Chưa có Foxia ID</div>
                        )}
                      </td>
                    );
                  })}
                  <td className="p-2 text-right">
                    <button onClick={() => removeRow(idx)} aria-label="Xoá">
                      <Trash2 className="h-4 w-4 text-action-danger" />
                    </button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td
                    colSpan={MATRIX_SHEETS.length + 2}
                    className="p-4 text-center text-muted-foreground"
                  >
                    Chưa cấu hình.
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="border-t bg-slate-50 font-medium">
                <td className="p-2">Tổng cột</td>
                {MATRIX_SHEETS.map((s) => (
                  <td
                    key={s.key}
                    className={`p-2 text-center ${colTotal(s.key) === 100 ? "text-action-success" : "text-action-warning"}`}
                  >
                    {colTotal(s.key)}%
                  </td>
                ))}
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={addRow} disabled={rows.length >= staffUsers.length}>
            <Plus className="h-4 w-4 mr-1" /> Thêm nhân viên
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? "Đang lưu..." : "Lưu"}
          </Button>
          <Button variant="outline" onClick={copyDay} disabled={saving}>
            <CopyPlus className="h-4 w-4 mr-1" /> Copy cấu hình ngày gần nhất
          </Button>
          <Button
            variant="outline"
            className="ml-auto border-action-danger/30 text-action-danger hover:bg-action-danger/10"
            onClick={clearDay}
            disabled={saving}
          >
            <Trash2 className="h-4 w-4 mr-1" /> Xoá cấu hình ngày này
          </Button>
        </div>
      </section>
    </div>
  );
}

/**
 * Ai nhận được cơ hội resale: cột Resale chỉ nhận nhân viên có Foxia ID dạng số
 * (Foxia gán cơ hội bằng id đó). Hiện thẳng trên trang thay vì chỉ khoá ô — người
 * cấu hình cần biết vì sao không nhập được và sửa ở đâu.
 */
function ResaleEligibility({ staff }: { staff: LeadAssignmentStaff[] }) {
  if (staff.length === 0) return null;
  const name = (u: LeadAssignmentStaff) => u.display_name || u.username;
  const ready = staff.filter((u) => u.has_foxia_id).map(name);
  const missing = staff.filter((u) => !u.has_foxia_id).map(name);
  return (
    <div className="rounded border border-action-info/30 bg-action-info/10 p-3 text-xs text-action-info space-y-1">
      <div>
        <span className="font-medium">Nhận được cơ hội Resale (đã có Foxia ID):</span>{" "}
        {ready.length ? ready.join(", ") : "chưa có ai"}
      </div>
      {missing.length > 0 && (
        <div>
          <span className="font-medium">Chưa có Foxia ID (ô Resale bị khoá):</span>{" "}
          {missing.join(", ")}. Khai tại{" "}
          <Link to={pathFromSection("users")} className="underline">
            Cài đặt → Người dùng
          </Link>{" "}
          → Sửa → Foxia ID, rồi tải lại trang này.
        </div>
      )}
    </div>
  );
}
