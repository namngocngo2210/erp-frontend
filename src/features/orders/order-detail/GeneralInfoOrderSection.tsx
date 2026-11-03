import { useMemo } from "react";
import { ExternalLink } from "lucide-react";

import { ERow, InfoRow } from "../order-detail-shared";
import { fmtDate } from "../order-detail-format";
import type { OrderRow, OrderSource, OrderVat } from "../order-types";
import { ORDER_SOURCE_OPTIONS, OrderSourceBadge } from "../order-source";
import { ORDER_VAT_OPTIONS, OrderVatBadge } from "../vat";
import { getBranchOptionsForChannel, type KiotVietOption } from "../use-orders-data";
import { staffOptionsForChannel, withSelectedStaffOption } from "../channel-staff";

const ORDER_TYPE_OPTIONS = [
  { label: "Bình thường", value: "normal" },
  { label: "Không trả lại", value: "no_return" },
  { label: "Có trả lại", value: "has_return" },
];

type Props = {
  order: OrderRow;
  patch: (p: Partial<OrderRow>) => void;
  t: (k: string, f?: string) => string;
  kiotvietOptions: KiotVietOption[];
  channels?: Array<{ code: string; name: string }>;
  channelStaffByCode: Record<string, Array<{ id: number; name: string }>>;
  canAssignSale: boolean;
};

/** Nhóm "Đơn hàng" trong khối Thông tin đơn hàng. */
export function GeneralInfoOrderSection({
  order,
  patch,
  t,
  kiotvietOptions,
  channels,
  channelStaffByCode,
  canAssignSale,
}: Props) {
  const kvOptions = useMemo(
    () => kiotvietOptions.map((o) => ({ value: String(o.id), label: o.name })),
    [kiotvietOptions],
  );
  const channelOptions = useMemo(
    () => (channels || []).map((c) => ({ value: c.code, label: c.name })),
    [channels],
  );

  const branchOptions = useMemo(() => {
    const kvId = Number(order.kiotviet_channel_id ?? 0);
    if (!kvId) return [];
    return getBranchOptionsForChannel(kiotvietOptions.find((o) => o.id === kvId));
  }, [order.kiotviet_channel_id, kiotvietOptions]);

  const handleKiotVietChange = (option: { value: string; label: string } | null) => {
    const newId = option?.value ? Number(option.value) : undefined;
    const newName = option?.label ?? "";
    // Tự điền chi nhánh mặc định của kênh để hiện ngay, đồng bộ với form tạo đơn.
    const kv = newId ? kiotvietOptions.find((o) => o.id === newId) : undefined;
    patch({
      kiotviet_channel_id: newId,
      kiotviet_name: newName,
      branch_id: kv?.branch_id || "",
    });
  };

  const handleBranchChange = (option: { value: string; label: string } | null) => {
    patch({ branch_id: option?.value || "" });
  };

  // Nhân viên đang gán luôn phải có option, kể cả khi không nằm trong danh sách BE trả
  // về (đã nghỉ / khác phòng ban) — nếu không ô select hiện "—" như thể đơn chưa gán.
  const staffOptions = useMemo(
    () =>
      withSelectedStaffOption(
        staffOptionsForChannel(channelStaffByCode, order.channel_code).map((u) => ({
          value: String(u.id),
          label: u.name,
        })),
        order.staff_id,
        order.staff_name,
      ),
    [channelStaffByCode, order.channel_code, order.staff_id, order.staff_name],
  );

  return (
    <section className="pb-3 border-b border-border/50">
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Đơn hàng
      </h4>
      <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
        <ERow
          stacked
          label="Kênh bán hàng"
          rawValue={order.channel_code || ""}
          display={
            <span className="text-sm font-medium">
              {order.channel_name || order.channel_code || "—"}
            </span>
          }
          type="select"
          options={channelOptions}
          // Đổi kênh KHÔNG đụng tới nhân viên: danh sách nhân viên không phụ thuộc
          // kênh (xem buildChannelStaffByCode). Trước đây reset `staff_id: null` mà
          // giữ nguyên `staff_name` nên UI vẫn hiện tên sale cũ trong khi giá trị
          // chờ lưu đã rỗng → bấm Lưu là mất sale không rõ lý do.
          onSave={(v) => {
            const selected = channelOptions.find((o) => o.value === String(v)) || null;
            patch({
              channel_code: selected?.value || "",
              channel_name: selected?.label || "",
            });
          }}
        />
        <ERow
          stacked
          label="Kênh KiotViet"
          rawValue={order.kiotviet_channel_id != null ? String(order.kiotviet_channel_id) : ""}
          type="select"
          options={kvOptions}
          onSave={(v) => {
            const selected = kvOptions.find((o) => o.value === String(v)) || null;
            handleKiotVietChange(selected);
          }}
        />
        <ERow
          stacked
          label="Chi nhánh"
          rawValue={order.branch_id != null ? String(order.branch_id) : ""}
          type="select"
          options={branchOptions}
          onSave={(v) => {
            const selected = branchOptions.find((o) => o.value === String(v)) || null;
            handleBranchChange(selected);
          }}
        />
        <ERow
          stacked
          label="Nhân sự"
          rawValue={order.staff_id != null ? String(order.staff_id) : ""}
          display={<span className="text-sm font-medium">{order.staff_name || "—"}</span>}
          type="select"
          options={staffOptions}
          // Đổi sale = đổi người ăn doanh số → quyền riêng, không đi chung orders:edit.
          // Backend vốn đã 403 ở PATCH, nhưng nếu FE cho sửa thì lúc Lưu cả payload
          // pending bị đánh rớt theo — phải khoá ngay từ ô nhập, khớp cột sale inline.
          disabled={!canAssignSale}
          disabledHint="Bạn không có quyền đổi sale phụ trách đơn"
          onSave={(v) => {
            // Patch kèm staff_name (từ label option) để hiển thị ngay,
            // đồng bộ với cách "Kênh bán hàng"/"Kênh KiotViet" cập nhật
            // field tên đi kèm id — nếu chỉ patch staff_id, ô display vẫn
            // hiện tên cũ cho tới khi Lưu (backend trả lại staff_name mới).
            const selected = staffOptions.find((o) => o.value === String(v)) || null;
            patch({
              staff_id: v ? Number(v) : null,
              staff_name: selected?.label ?? null,
            });
          }}
        />
        <ERow
          stacked
          label="Nguồn đơn"
          rawValue={order.order_source ?? ""}
          display={<OrderSourceBadge source={order.order_source} />}
          type="select"
          options={ORDER_SOURCE_OPTIONS}
          onSave={(v) => patch({ order_source: v ? (String(v) as OrderSource) : null })}
        />
        <ERow
          stacked
          label="VAT"
          rawValue={order.vat ?? ""}
          display={<OrderVatBadge vat={order.vat} />}
          type="select"
          options={ORDER_VAT_OPTIONS}
          onSave={(v) => patch({ vat: v ? (String(v) as OrderVat) : null })}
        />
        <ERow
          stacked
          label="Đã xuất VAT"
          rawValue={order.is_export_vat ?? false}
          type="toggle"
          toggleLabels={{ on: "Đã xuất", off: "Chưa xuất" }}
          onSave={(v) => patch({ is_export_vat: Boolean(v) })}
        />
        <ERow
          stacked
          label="Link hóa đơn VAT"
          rawValue={order.vat_link ?? ""}
          display={
            order.vat_link ? (
              <span className="inline-flex min-w-0 items-center gap-1.5">
                {/* Click vào text để sửa; icon để mở link (chặn propagation). */}
                <span className="min-w-0 truncate text-sm font-medium text-primary underline underline-offset-2">
                  {order.vat_link}
                </span>
                <a
                  href={order.vat_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  title="Mở link hóa đơn"
                  className="shrink-0 text-primary hover:text-primary/80"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </span>
            ) : undefined
          }
          onSave={(v) => patch({ vat_link: String(v) })}
        />
        <ERow
          stacked
          label={t("orders.columns.orderType", "Loại đơn hàng")}
          rawValue={order.order_type ?? "normal"}
          display={
            <span className="text-sm font-medium">
              {t(`orderType.${order.order_type || "normal"}`, order.order_type || "normal")}
            </span>
          }
          type="select"
          options={ORDER_TYPE_OPTIONS}
          onSave={(v) => patch({ order_type: v ? String(v) : "normal" })}
        />
        <InfoRow stacked label="Chủ kênh" value={order.channel_owner} />
        <ERow
          stacked
          label="Ngày tạo"
          rawValue={order.created_at ?? ""}
          display={<span className="text-sm font-medium">{fmtDate(order.created_at)}</span>}
          type="datetime"
          onSave={(v) => {
            const iso = String(v);
            if (!iso) return;
            patch({ created_at: iso });
          }}
        />
      </div>
    </section>
  );
}
