import { Input } from "@/components/ui/input";
import { LogoSpinner } from "@/components/ui/logo-spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  WARRANTY_COLUMN_OPTIONS,
  columnDisplayValue,
  type WarrantyColumnKey,
} from "@/features/warranty-claims/warranty-claim-columns";
import {
  WARRANTY_STATUS_OPTIONS,
  type WarrantyClaim,
  type WarrantyClaimPayload,
  type WarrantyClaimStatus,
} from "@/features/warranty-claims/warranty-claim-types";
import { NativeCellSelect } from "@/components/ui/native-cell-select";

type Props = {
  rows: WarrantyClaim[];
  orderedColumns: WarrantyColumnKey[];
  lockedColumns: WarrantyColumnKey[];
  isLoading: boolean;
  onOpenDetail: (id: number) => void;
  /** Resolve `true` khi PATCH thành công (caller đã tự toast lỗi) — bảng dùng
   * kết quả để rollback input uncontrolled (ngày kích hoạt) khi thất bại. */
  onPatch: (id: number, patch: Partial<WarrantyClaimPayload>) => Promise<boolean>;
  selectedIds: Set<number>;
  onToggleRow: (id: number) => void;
  onToggleAll: () => void;
};

const KIND_BY_KEY = new Map(WARRANTY_COLUMN_OPTIONS.map((o) => [o.key, o.kind]));
const LABEL_BY_KEY = new Map(WARRANTY_COLUMN_OPTIONS.map((o) => [o.key, o.label]));

const stop = (e: React.SyntheticEvent) => e.stopPropagation();

export function WarrantyClaimsTable({
  rows,
  orderedColumns,
  lockedColumns,
  isLoading,
  onOpenDetail,
  onPatch,
  selectedIds,
  onToggleRow,
  onToggleAll,
}: Props) {
  const headerClass = "h-11 text-xs font-semibold uppercase tracking-wide text-muted-foreground";
  const colCount = orderedColumns.length + 1 || 1;
  // Cột hiển thị đầu tiên luôn dính (định danh phiếu); cột locked khác giữ hành vi cũ.
  const stickyClass = (key: WarrantyColumnKey, index: number) =>
    index === 0
      ? "sticky-col sticky-col-edge left-10"
      : lockedColumns.includes(key)
        ? "sticky-col left-10"
        : "";
  const allSelected = rows.length > 0 && rows.every((r) => selectedIds.has(r.id));

  const renderCell = (row: WarrantyClaim, key: WarrantyColumnKey) => {
    const kind = KIND_BY_KEY.get(key);
    if (kind === "status") {
      // NV chọn tay tự do đủ 12 trạng thái; PATCH sang Hoàn thành (9) được BE
      // stamp completed_at nên không cần chặn như bộ 3 trạng thái cũ.
      return (
        <NativeCellSelect
          className="w-auto bg-background"
          value={row.status}
          onClick={stop}
          onChange={(e) =>
            void onPatch(row.id, { status: Number(e.target.value) as WarrantyClaimStatus })
          }
        >
          {WARRANTY_STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </NativeCellSelect>
      );
    }
    if (kind === "date") {
      // Chỉ ngày kích hoạt sửa inline; ngày hết hạn / số ngày còn lại là dẫn xuất.
      return (
        <Input
          type="date"
          key={row.activation_date ?? ""}
          defaultValue={row.activation_date ?? ""}
          className="h-7 w-[140px]"
          onClick={stop}
          onBlur={(e) => {
            const value = e.target.value || null;
            if ((row.activation_date ?? null) === value) return;
            const input = e.target;
            void onPatch(row.id, { activation_date: value }).then((ok) => {
              // PATCH lỗi → trả input (uncontrolled, key không đổi) về giá trị
              // server, tránh hiển thị ngày chưa hề được lưu.
              if (!ok) input.value = row.activation_date ?? "";
            });
          }}
        />
      );
    }
    // readonly — block + max-w để truncate ăn trong bảng auto-layout (tránh
    // địa chỉ/SKU dài tràn đè cột kế bên); title để hover xem đầy đủ.
    const text = String(columnDisplayValue(row, key) ?? "");
    const expired = key === "warranty_days_left" && text === "Hết hạn";
    return (
      <span
        className={`block max-w-[240px] truncate ${expired ? "font-medium text-destructive" : "text-muted-foreground"}`}
        title={text}
      >
        {text}
      </span>
    );
  };

  const handleRowClick = (id: number) => {
    if ((window.getSelection()?.toString() ?? "") !== "") return;
    onOpenDetail(id);
  };

  return (
    <Table className="min-w-[860px] [&_td]:px-3 [&_th]:px-3">
      <TableHeader>
        <TableRow>
          <TableHead className={`${headerClass} sticky-col w-10 text-center`}>
            <input
              type="checkbox"
              className="size-4"
              checked={allSelected}
              ref={(el) => {
                if (el) el.indeterminate = !allSelected && selectedIds.size > 0;
              }}
              onChange={onToggleAll}
              aria-label="Chọn tất cả"
            />
          </TableHead>
          {orderedColumns.map((key, index) => (
            <TableHead
              key={key}
              // Cột checkbox w-10 đã chiếm sticky left-0 → cột đầu (định danh) và
              // cột locked neo left-10 (2.5rem) để không bị đè chồng khi cuộn ngang.
              className={`${headerClass} ${stickyClass(key, index)}`}
            >
              {LABEL_BY_KEY.get(key)}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading && rows.length === 0 ? (
          <TableRow>
            <TableCell colSpan={colCount} className="py-8">
              <div className="flex justify-center">
                <LogoSpinner label="Đang tải phiếu bảo hành" />
              </div>
            </TableCell>
          </TableRow>
        ) : rows.length === 0 ? (
          <TableRow>
            <TableCell colSpan={colCount} className="py-8 text-center text-muted-foreground">
              Chưa có phiếu bảo hành nào.
            </TableCell>
          </TableRow>
        ) : (
          rows.map((row) => (
            <TableRow
              key={row.id}
              className="cursor-pointer"
              onClick={() => handleRowClick(row.id)}
            >
              <TableCell className="sticky-col w-10 text-center" onClick={stop}>
                <input
                  type="checkbox"
                  className="size-4"
                  checked={selectedIds.has(row.id)}
                  onChange={() => onToggleRow(row.id)}
                  onClick={stop}
                  aria-label={`Chọn phiếu #${row.id}`}
                />
              </TableCell>
              {orderedColumns.map((key, index) => (
                <TableCell key={key} className={`max-w-[240px] ${stickyClass(key, index)}`}>
                  {renderCell(row, key)}
                </TableCell>
              ))}
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
