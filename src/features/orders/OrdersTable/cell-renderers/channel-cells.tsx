import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { humanizeKiotVietError } from "@/features/orders/kiotviet-error";
import type { OrderColumnKey, OrderRow } from "@/features/orders/order-types";

import { hashBadge } from "../constants";
import type { CellRenderer } from "./types";
import { NativeCellSelect } from "@/components/ui/native-cell-select";

// ─────────────────────────────────────────────────────────────
// Cột kênh bán / KiotViet / sale phụ trách — phần lớn là select
// sửa inline, giữ nguyên logic case-by-case từ OrderCell cũ.
// ─────────────────────────────────────────────────────────────

export const CHANNEL_CELL_RENDERERS: Partial<Record<OrderColumnKey, CellRenderer>> = {
  kiotviet: ({ row, kiotvietOptions, onPatch, canEditField }) => {
    const kiotvietChannelId = row.kiotviet_channel_id;
    const kiotvietName = row.kiotviet_name;
    // Cột `kiotviet` tra quyền theo field API `kiotviet_channel_id`.
    const canEdit = !!row.can_edit && !!onPatch && canEditField("kiotviet_channel_id");
    const currentValue =
      kiotvietChannelId !== null && kiotvietChannelId !== undefined
        ? String(kiotvietChannelId)
        : "";
    const displayValue =
      kiotvietName ||
      (kiotvietChannelId !== null && kiotvietChannelId !== undefined
        ? String(kiotvietChannelId)
        : "-");
    const palette = currentValue ? hashBadge(currentValue) : null;
    if (!canEdit) {
      if (!currentValue) return <span className="text-sm text-muted-foreground">-</span>;
      return (
        // 1 dòng + "…": tên kênh dài bẻ 6–7 dòng ở màn hẹp (hàng cao ~120px); title hiện đủ tên.
        <Badge
          className={`max-w-48 border-0 ${palette?.bg ?? ""} ${palette?.text ?? ""}`}
          title={displayValue}
        >
          <span className="truncate">{displayValue}</span>
        </Badge>
      );
    }
    return (
      <NativeCellSelect
        className="min-w-[140px]"
        style={palette ? { backgroundColor: palette.selectBg } : undefined}
        value={currentValue}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onChange={(e) => {
          e.stopPropagation();
          const raw = e.target.value;
          const nextId = raw ? Number(raw) : null;
          const matched = kiotvietOptions.find((opt) => opt.id === nextId);
          onPatch?.(row.id, {
            kiotviet_channel_id: nextId,
            kiotviet_name: matched?.name ?? null,
            // Khi đổi channel KiotViet thì branch_id cũ có thể không còn hợp lệ
            branch_id: "",
          } as Partial<OrderRow>);
        }}
      >
        <option value="">-</option>
        {kiotvietOptions.map((opt) => (
          <option key={opt.id} value={String(opt.id)}>
            {opt.name}
          </option>
        ))}
      </NativeCellSelect>
    );
  },

  kiotviet_state: ({ row }) => {
    // Trạng thái xử lý job KiotViet (push / tạo hóa đơn / đồng bộ...). Dữ liệu
    // được serializer trả về và cập nhật realtime qua WebSocket. Mục đích: lỗi
    // push hiển thị bền vững theo dòng thay vì chỉ một toast thoáng qua.
    const isProcessing = !!row.is_kiotviet_processing;
    const jobStatus = String(row.latest_kiotviet_job_status ?? "")
      .trim()
      .toLowerCase();
    const jobError = String(row.latest_kiotviet_job_error ?? "").trim();

    if (jobStatus === "success") {
      return (
        <span
          className="inline-flex items-center gap-1 text-sm text-action-success"
          title="KiotViet: Thành công"
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          <span>Thành công</span>
        </span>
      );
    }

    if (jobStatus === "failed") {
      const humanizedError = jobError ? humanizeKiotVietError(jobError) : "";
      // Lỗi KiotViet hiển thị NGAY trong ô (không chỉ tooltip) — trang KOC
      // trước đây chỉ thấy chữ "Thất bại" trần, không biết lý do.
      return (
        <span
          className="inline-flex max-w-64 flex-col text-sm text-destructive"
          title={humanizedError ? `KiotViet: Thất bại - ${humanizedError}` : "KiotViet: Thất bại"}
        >
          <span className="inline-flex items-center gap-1">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            <span>Thất bại</span>
          </span>
          {humanizedError ? (
            <span className="line-clamp-2 whitespace-normal text-xs leading-snug text-destructive/90">
              {humanizedError}
            </span>
          ) : null}
        </span>
      );
    }

    if (jobStatus === "pending" || jobStatus === "running" || (isProcessing && !jobStatus)) {
      return (
        <span
          className="inline-flex items-center gap-1 text-sm text-muted-foreground"
          title="KiotViet: Đang xử lý"
        >
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span>Đang xử lý</span>
        </span>
      );
    }

    return <span className="text-sm text-muted-foreground">-</span>;
  },

  channel_owner: ({ row }) => {
    const channelOwner = row.channel_owner;
    if (!channelOwner) {
      return <span className="text-sm text-muted-foreground">-</span>;
    }
    const palette = hashBadge(String(channelOwner));
    return <Badge className={`border-0 ${palette.bg} ${palette.text}`}>{channelOwner}</Badge>;
  },

  branch_id: ({ row, kiotvietOptions, onPatch, canEditField }) => {
    const canEdit = !!row.can_edit && !!onPatch && canEditField("branch_id");
    const branchId = row.branch_id || "";
    const palette = branchId ? hashBadge(branchId) : null;
    // Lấy danh sách branch khả dụng từ kiotviet_channel hiện tại
    const kiotvietId = row.kiotviet_channel_id ?? null;
    const selected =
      kiotvietId != null ? kiotvietOptions.find((opt) => opt.id === Number(kiotvietId)) : undefined;
    const branchPool: string[] =
      selected?.branch_ids && selected.branch_ids.length > 0
        ? selected.branch_ids
        : selected?.branch_id
          ? [selected.branch_id]
          : [];
    if (!canEdit) {
      if (!branchId) return <span>-</span>;
      return (
        <Badge className={`border-0 ${palette?.bg ?? ""} ${palette?.text ?? ""}`}>{branchId}</Badge>
      );
    }
    return (
      <NativeCellSelect
        className="min-w-[110px]"
        style={palette ? { backgroundColor: palette.selectBg } : undefined}
        value={branchId}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onChange={(e) => {
          e.stopPropagation();
          onPatch?.(row.id, { branch_id: e.target.value } as Partial<OrderRow>);
        }}
      >
        <option value="">-</option>
        {branchPool.map((b) => (
          <option key={b} value={b}>
            {b}
          </option>
        ))}
        {/* Nếu branch hiện tại không nằm trong pool (legacy), vẫn cho hiển thị */}
        {branchId && !branchPool.includes(branchId) && <option value={branchId}>{branchId}</option>}
      </NativeCellSelect>
    );
  },

  channel_code: ({ row, channels, onPatch, canEditField }) => {
    const channelCode = row.channel_code || "";
    const channelName = row.channel_name;
    const displayValue = channelName || channelCode || "-";
    const canEdit =
      !!row.can_edit &&
      !!onPatch &&
      Array.isArray(channels) &&
      channels.length > 0 &&
      canEditField("channel_code");
    const palette = channelCode ? hashBadge(channelCode) : null;
    if (!canEdit) {
      if (!channelCode) return <span className="text-sm text-muted-foreground">-</span>;
      return (
        // 1 dòng + "…": tên kênh dài bẻ 6–7 dòng ở màn hẹp (hàng cao ~120px); title hiện đủ tên.
        <Badge
          className={`max-w-48 border-0 ${palette?.bg ?? ""} ${palette?.text ?? ""}`}
          title={displayValue}
        >
          <span className="truncate">{displayValue}</span>
        </Badge>
      );
    }
    return (
      <NativeCellSelect
        className="min-w-[160px]"
        style={palette ? { backgroundColor: palette.selectBg } : undefined}
        value={channelCode}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onChange={(e) => {
          e.stopPropagation();
          const nextCode = e.target.value;
          const matched = (channels ?? []).find((c) => c.code === nextCode);
          onPatch?.(row.id, {
            channel_code: nextCode,
            channel_name: matched?.name ?? "",
          } as Partial<OrderRow>);
        }}
      >
        <option value="">-</option>
        {(channels ?? []).map((c) => (
          <option key={c.code} value={c.code}>
            {c.name || c.code}
          </option>
        ))}
      </NativeCellSelect>
    );
  },

  staff: ({ row, channelStaffByCode, onPatch, canAssignSale }) => {
    const canEdit = !!row.can_edit && !!onPatch && canAssignSale;
    const staffList = channelStaffByCode[row.channel_code ?? ""] ?? channelStaffByCode[""] ?? [];
    const currentId = row.staff_id ?? null;
    const currentName = staffList.find((s) => s.id === currentId)?.name || row.staff_name || "";
    if (!canEdit) {
      return <span>{currentName || "-"}</span>;
    }
    return (
      <NativeCellSelect
        className="min-w-[130px]"
        value={currentId != null ? String(currentId) : ""}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onChange={(e) => {
          e.stopPropagation();
          const raw = e.target.value;
          const nextId = raw ? Number(raw) : null;
          const matched = staffList.find((s) => s.id === nextId);
          onPatch?.(row.id, {
            staff_id: nextId,
            staff_name: matched?.name ?? null,
          } as Partial<OrderRow>);
        }}
      >
        <option value="">-</option>
        {staffList.map((s) => (
          <option key={s.id} value={String(s.id)}>
            {s.name}
          </option>
        ))}
      </NativeCellSelect>
    );
  },
};
