import type { FoxiaResaleState, FoxiaResaleStats } from "@/lib/api/foxia-resale";
import { LogoSpinner } from "@/components/ui/logo-spinner";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";

const STATE_TEXT: Record<FoxiaResaleState, { tone: StatusTone; label: string; hint: string }> = {
  ready: {
    tone: "success",
    label: "Đang chia",
    hint: "Lượt kế tiếp (mỗi phút) sẽ chia và đẩy cơ hội sang Foxia.",
  },
  disabled: {
    tone: "neutral",
    label: "Đang tắt",
    hint: "Bật FOXIA_PUSH_ENABLED và FOXIA_RESALE_PUSH_ENABLED ở Cài đặt hệ thống.",
  },
  bad_since: {
    tone: "danger",
    label: "Sai cấu hình",
    hint: "FOXIA_RESALE_PUSH_SINCE không đúng định dạng YYYY-MM-DD.",
  },
  outside_shift: {
    tone: "warning",
    label: "Ngoài giờ ca",
    hint: "Cơ hội chờ tới ca kế tiếp mới được chia.",
  },
  no_resale_config: {
    tone: "warning",
    label: "Chưa cấu hình cột Resale",
    hint: "Ca hiện tại chưa có ai ở cột Resale — cơ hội đang chờ. Điền cột Resale ở bảng bên dưới.",
  },
};

const STATUS_LABELS: Array<{ key: string; label: string }> = [
  { key: "ok", label: "Thành công" },
  { key: "failed", label: "Thất bại" },
  { key: "no_opportunity", label: "Foxia không tạo cơ hội" },
  { key: "pending", label: "Đang đẩy" },
  { key: "skipped_duplicate", label: "Trùng SĐT trong ngày" },
  { key: "skipped_no_phone", label: "Không có SĐT" },
];

interface Props {
  date: string;
  data: FoxiaResaleStats | undefined;
  loading: boolean;
  error: string | null;
}

/** Khối "Cơ hội resale" trên trang Chia đơn — thuần hiển thị, dữ liệu do trang truyền vào. */
export function ResaleStatsPanel({ date, data, loading, error }: Props) {
  const state = data ? STATE_TEXT[data.state as FoxiaResaleState] : undefined;
  const assigned = data?.by_staff.reduce((sum, row) => sum + row.total, 0) ?? 0;

  return (
    <section className="space-y-3 rounded border p-4" aria-label="Cơ hội resale Foxia">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold text-sky-900">Cơ hội resale (đơn giao thành công)</h2>
        {state && <StatusBadge tone={state.tone}>{state.label}</StatusBadge>}
      </div>
      {loading && !data && <LogoSpinner />}
      {error && <div className="text-sm text-action-danger">{error}</div>}
      {data && (
        <>
          {state && <p className="text-sm text-muted-foreground">{state.hint}</p>}
          <div className="flex flex-wrap gap-4 text-sm">
            <div>
              Đang chờ chia: <strong data-testid="resale-waiting">{data.waiting}</strong>
            </div>
            <div>
              Đã chia ngày {date}: <strong data-testid="resale-assigned">{assigned}</strong>
            </div>
            {STATUS_LABELS.map((s) => (
              <div key={s.key} className="text-muted-foreground">
                {s.label}: <span className="font-medium">{data.by_status[s.key] ?? 0}</span>
              </div>
            ))}
          </div>
          <div className="overflow-x-auto">
            <table data-slot="table" className="w-full min-w-[480px] text-sm border rounded">
              <thead className="bg-sky-50 text-sky-900">
                <tr>
                  <th className="text-left p-2">Nhân viên resale</th>
                  <th className="text-right p-2">Đã chia</th>
                  <th className="text-right p-2">Thành công</th>
                  <th className="text-right p-2">Thất bại</th>
                  <th className="text-right p-2">Đang đẩy</th>
                </tr>
              </thead>
              <tbody>
                {data.by_staff.map((row) => (
                  <tr key={row.user_id} className="border-t">
                    <td className="p-2">{row.display_name}</td>
                    <td className="p-2 text-right">{row.total}</td>
                    <td className="p-2 text-right">{row.ok}</td>
                    <td className="p-2 text-right">{row.failed}</td>
                    <td className="p-2 text-right">{row.pending}</td>
                  </tr>
                ))}
                {data.by_staff.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-muted-foreground">
                      Chưa chia cơ hội resale nào trong ngày.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
