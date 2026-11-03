import { Badge } from "@/components/ui/badge";
import { ShippingCodeLink } from "@/features/orders/ShippingCodeLink";
import type { OrderColumnKey, OrderRow } from "@/features/orders/order-types";

import type { CellRenderer } from "./types";
import { formatDatePattern } from "@/lib/format";
import { NativeCellSelect } from "@/components/ui/native-cell-select";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────
// Cột vận chuyển / thời gian / loại đơn — giữ nguyên logic từ
// OrderCell cũ.
// ─────────────────────────────────────────────────────────────

/** dd/MM/yyyy HH:mm:ss theo giờ máy người dùng; giá trị rỗng/hỏng -> "-". */
function formatDateTimeCell(value: string | null | undefined): string {
  return formatDatePattern(value, "dd/MM/yyyy HH:mm:ss", { fallback: "-" });
}

export const LOGISTICS_CELL_RENDERERS: Partial<Record<OrderColumnKey, CellRenderer>> = {
  shipping_code: ({ row }) => (
    <ShippingCodeLink shippingCode={row.shipping_code} providerCode={row.shipping_provider} />
  ),

  status: ({ row, t }) => {
    const statusValue = String(row.status);
    const statusColors: Record<string, { bg: string; text: string }> = {
      "0": { bg: "bg-blue-100", text: "text-blue-700" }, // Mới
      "1": { bg: "bg-yellow-100", text: "text-yellow-700" }, // Chờ xử lý
      "2": { bg: "bg-blue-100", text: "text-blue-700" }, // Đang giao hàng
      "3": { bg: "bg-green-100", text: "text-green-700" }, // Giao thành công
      "4": { bg: "bg-orange-100", text: "text-orange-700" }, // Đang chuyển hoàn
      "5": { bg: "bg-gray-100", text: "text-gray-700" }, // Đã chuyển hoàn
      "6": { bg: "bg-red-100", text: "text-red-700" }, // Đã hủy
      "7": { bg: "bg-blue-100", text: "text-blue-700" }, // Đang lấy hàng
      "8": { bg: "bg-yellow-100", text: "text-yellow-700" }, // Chờ lấy lại
      "9": { bg: "bg-green-100", text: "text-green-700" }, // Đã lấy hàng
      "10": { bg: "bg-yellow-100", text: "text-yellow-700" }, // Chờ giao lại
      "11": { bg: "bg-yellow-100", text: "text-yellow-700" }, // Chờ chuyển hàng
      "12": { bg: "bg-yellow-100", text: "text-yellow-700" }, // Chờ chuyển hoàn lại
      "13": { bg: "bg-yellow-100", text: "text-yellow-700" }, // Chờ xác nhận hoàn
    };
    const colors = statusColors[statusValue] || { bg: "bg-gray-100", text: "text-gray-700" };
    return (
      <Badge className={`border-0 whitespace-nowrap ${colors.bg} ${colors.text}`}>
        {t(`status.${statusValue}`, statusValue)}
      </Badge>
    );
  },

  order_type: ({ row, t, onPatch, canEditField }) => {
    const canEdit = !!row.can_edit && !!onPatch && canEditField("order_type");
    const current = row.order_type || "normal";
    // Nhãn hiển thị: đủ 7 giá trị — đơn cũ trong DB vẫn có thể mang 4 giá trị
    // đã gỡ khỏi backend (same_product/different_product/purchase/warranty_return),
    // xoá nhãn sẽ làm bảng hiện mã thô cho các đơn đó.
    const allLabels: Record<string, string> = {
      normal: t("orderType.normal", "Bình thường"),
      no_return: t("orderType.no_return", "Không trả lại"),
      has_return: t("orderType.has_return", "Có trả lại"),
      same_product: t("orderType.same_product", "Cùng sản phẩm"),
      different_product: t("orderType.different_product", "Khác sản phẩm"),
      purchase: t("orderType.purchase", "Mua hàng"),
      warranty_return: t("orderType.warranty_return", "Trả bảo hành"),
    };
    if (!canEdit) {
      const label = allLabels[current] ?? current;
      return <span className="text-xs">{label}</span>;
    }
    // Lựa chọn khi sửa: chỉ 3 giá trị backend còn chấp nhận (order_type
    // ChoiceField đã thu hẹp), khác với bảng nhãn hiển thị ở trên.
    const editableOptions = [
      { value: "normal", label: allLabels.normal },
      { value: "no_return", label: allLabels.no_return },
      { value: "has_return", label: allLabels.has_return },
    ];
    // Đơn cũ có thể mang 1 trong 4 giá trị legacy đã gỡ khỏi backend. Không
    // option nào trong 3 giá trị trên khớp `value` của <select> → trình duyệt
    // chọn -1 và ô hiện trống; nếu sale vô ý chọn "Bình thường" thì giá trị cũ
    // bị ghi đè im lặng. Chèn thêm 1 option mang chính giá trị legacy đó,
    // disabled, để select hiện đúng nhãn mà không ai chọn lại được nó.
    const isLegacyValue = !editableOptions.some((opt) => opt.value === current);
    const selectOptions = isLegacyValue
      ? [{ value: current, label: allLabels[current] ?? current }, ...editableOptions]
      : editableOptions;
    return (
      <NativeCellSelect
        className="min-w-[120px]"
        value={current}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onChange={(e) => {
          e.stopPropagation();
          onPatch?.(row.id, { order_type: e.target.value } as Partial<OrderRow>);
        }}
      >
        {selectOptions.map((opt) => (
          <option
            key={opt.value}
            value={opt.value}
            disabled={isLegacyValue && opt.value === current}
          >
            {opt.label}
          </option>
        ))}
      </NativeCellSelect>
    );
  },

  created_at: ({ row }) => <span>{formatDateTimeCell(row.created_at)}</span>,

  // NULL với đơn chưa chốt và đơn không đi qua luồng CRM (đơn sàn / sync
  // KiotViet) — hiện "-" như mọi ô rỗng khác, KHÔNG rơi về ngày tạo.
  sales_closed_at: ({ row }) => <span>{formatDateTimeCell(row.sales_closed_at)}</span>,

  return_date: ({ row, onPatch, canEditField }) => {
    const canEdit = !!row.can_edit && !!onPatch && canEditField("return_date");
    const raw = row.return_date ?? "";
    const display = raw ? `${raw.slice(8, 10)}/${raw.slice(5, 7)}/${raw.slice(0, 4)}` : "-";
    if (!canEdit) {
      return <span>{display}</span>;
    }
    return (
      <input
        type="date"
        className="h-7 w-full min-w-[120px] cursor-pointer rounded border border-border bg-transparent px-1.5 text-xs focus:outline-hidden focus:ring-1 focus:ring-ring"
        value={raw}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onChange={(e) => {
          e.stopPropagation();
          const next = e.target.value || null;
          onPatch?.(row.id, { return_date: next } as Partial<OrderRow>);
        }}
      />
    );
  },

  fulfillment_warehouse: ({ row, warehouseOptions, onPatch, canEditField }) => {
    const current = row.fulfillment_warehouse ?? "";
    const canEdit = !!row.can_edit && !!onPatch && canEditField("fulfillment_warehouse");
    return (
      <NativeCellSelect
        className="min-w-[120px]"
        value={current === null ? "" : String(current)}
        disabled={!canEdit}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => {
          e.stopPropagation();
          const raw = e.target.value;
          const id = raw ? Number(raw) : null;
          const name = warehouseOptions.find((w) => w.id === id)?.name ?? null;
          onPatch?.(row.id, {
            fulfillment_warehouse: id,
            fulfillment_warehouse_name: name,
          } as Partial<OrderRow>);
        }}
      >
        <option value="">-</option>
        {warehouseOptions.map((w) => (
          <option key={w.id} value={String(w.id)}>
            {w.name}
          </option>
        ))}
      </NativeCellSelect>
    );
  },

  shipping_type: ({ row, t }) => {
    // Read-only: cờ do hệ thống gắn theo thao tác thật, không có ô sửa như order_type.
    const value = row.shipping_type;
    if (!value) return <span className="text-muted-foreground">—</span>;
    const styles: Record<string, string> = {
      shipment: "bg-sky-100 text-sky-700",
      direct: "bg-amber-100 text-amber-700",
    };
    return (
      <span className={`inline-flex rounded px-1.5 py-0.5 text-xs ${styles[value] ?? ""}`}>
        {t(`shippingType.${value}`, value)}
      </span>
    );
  },

  koc_order_type: ({ row, t, onPatch, canEditField }) => {
    // Nhãn nghiệp vụ đơn KOC — sửa được ngay trên lưới (giống order_type),
    // không phải mở trang chi tiết mới gán được như trước.
    const value = row.koc_order_type ?? "";
    const styles: Record<string, string> = {
      sample_gift: "bg-emerald-100 text-emerald-700",
      // violet thay vì sky — sky đã dùng cho shipping_type="shipment" và hai cột
      // này có thể hiện cùng lúc trên một hàng ở bảng KOC, trùng màu dễ đọc nhầm.
      renewal: "bg-violet-100 text-violet-700",
      recall: "bg-amber-100 text-amber-700",
    };
    const canEdit = !!row.can_edit && !!onPatch && canEditField("koc_order_type");
    if (!canEdit) {
      if (!value) return <span className="text-muted-foreground">—</span>;
      return (
        <span className={`inline-flex rounded px-1.5 py-0.5 text-xs ${styles[value] ?? ""}`}>
          {t(`kocOrderType.${value}`, value)}
        </span>
      );
    }
    // Giữ nguyên bảng màu của badge trên chính ô select để vẫn quét mắt được
    // theo màu — trang KOC lọc nhiều theo cột này.
    return (
      <NativeCellSelect
        aria-label={t("orders.columns.kocOrderType", "Loại đơn KOC")}
        className={cn("min-w-[120px]", styles[value])}
        value={value}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onChange={(e) => {
          e.stopPropagation();
          onPatch?.(row.id, {
            koc_order_type: e.target.value as OrderRow["koc_order_type"],
          } as Partial<OrderRow>);
        }}
      >
        <option value="">—</option>
        <option value="sample_gift">{t("kocOrderType.sample_gift", "Tặng mẫu")}</option>
        <option value="renewal">{t("kocOrderType.renewal", "Gia hạn")}</option>
        <option value="recall">{t("kocOrderType.recall", "Thu hồi")}</option>
      </NativeCellSelect>
    );
  },
};
