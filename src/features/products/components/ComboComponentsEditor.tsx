import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/ui/searchable-select";

import { makeComboRow, type ComboRow } from "@/features/products/combo-rows";
import { useProductSearch } from "@/features/products/queries";

const labelClass = "mb-1 block text-sm font-medium text-muted-foreground";

interface ComboComponentsEditorProps {
  rows: ComboRow[];
  onRowsChange: (rows: ComboRow[]) => void;
  /** Sản phẩm đang khai combo — loại khỏi kết quả tìm để không tự chọn chính nó. */
  excludeProductId?: number;
  disabled?: boolean;
}

/**
 * Bảng khai thành phần của một SKU combo — dùng chung cho dialog "Thành phần
 * combo" (sửa combo đã có) và form tạo sản phẩm (khai combo ngay lúc tạo).
 * Component thuần controlled: không tự gọi API, chỉ dựng UI và báo thay đổi lên
 * trên; bên gọi quyết định thời điểm GET/PUT.
 */
export function ComboComponentsEditor({
  rows,
  onRowsChange,
  excludeProductId,
  disabled,
}: ComboComponentsEditorProps) {
  // Nhãn CHỈ là SKU, không ghép tên: `name` ở catalog này là cả đoạn mô tả kỹ
  // thuật (vài trăm ký tự) nên nhãn ghép tràn khỏi ô chọn và đè lên các nút bên
  // dưới. SKU đã đủ định danh duy nhất, còn tìm kiếm vẫn chạy server-side theo
  // cả tên lẫn SKU nên không mất khả năng tra cứu theo tên.
  const searchProducts = useProductSearch();
  const searchProductOptions = async (q: string) => {
    const list = await searchProducts(q);
    return list
      .filter((p) => p.id !== excludeProductId)
      .map((p) => ({ value: String(p.id), label: p.sku }));
  };

  const updateRow = (index: number, patch: Partial<ComboRow>) => {
    onRowsChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  return (
    <div className="space-y-4">
      {rows.map((row, index) => (
        <div key={row.id} className="flex items-end gap-3">
          {/* `min-w-0`: không có nó thì flex item lấy `min-width: auto` theo nội
              dung, ô chọn phình ra thay vì co lại. */}
          <div className="min-w-0 flex-1">
            {index === 0 && <label className={labelClass}>Sản phẩm thành phần</label>}
            <SearchableSelect
              aria-label="Sản phẩm thành phần"
              disabled={disabled}
              value={row.component_id != null ? String(row.component_id) : ""}
              onChange={(value) => updateRow(index, { component_id: value ? Number(value) : null })}
              onSearch={searchProductOptions}
              selectedLabel={row.initialLabel}
              placeholder="-- Chọn sản phẩm --"
            />
          </div>
          <div className="w-32 shrink-0">
            {index === 0 && <label className={labelClass}>Số lượng</label>}
            <Input
              type="number"
              min={1}
              disabled={disabled}
              aria-label="Số lượng"
              value={Number.isNaN(row.quantity) ? "" : row.quantity}
              onChange={(event) => {
                const raw = event.target.value;
                updateRow(index, { quantity: raw === "" ? NaN : Number(raw) });
              }}
            />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-lg"
            disabled={disabled}
            aria-label="Xóa thành phần"
            onClick={() => onRowsChange(rows.filter((_, i) => i !== index))}
          >
            <Trash2 className="size-4" aria-hidden />
          </Button>
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        disabled={disabled}
        onClick={() => onRowsChange([...rows, makeComboRow()])}
      >
        <Plus className="mr-1 size-4" aria-hidden />
        Thêm thành phần
      </Button>
    </div>
  );
}
