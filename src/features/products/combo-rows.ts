import type { ProductComponentInput } from "@/lib/api/product-components";

/** Dòng đang sửa trong bảng thành phần — `component_id: null` = dòng mới chưa chọn sản phẩm. */
export interface ComboRow {
  /**
   * ID ổn định của DÒNG (không phải của sản phẩm) — dùng làm `key` thay vì
   * index. `SearchableSelect` nhớ nhãn vừa chọn qua một ref NỘI BỘ (gắn với
   * chính instance component, không phải với data). Nếu key theo index, xoá
   * một dòng ở giữa làm React tái dùng instance cũ cho dữ liệu mới (dòng phía
   * sau dồn lên) — ref cũ còn giữ nhãn của dòng ĐÃ XOÁ, không khớp `value` mới
   * nên `SearchableSelect` rơi về placeholder dù `component_id` vẫn đúng.
   * Key theo `id` ổn định giữ đúng cặp (instance, dữ liệu) qua mọi lần xoá.
   */
  id: number;
  component_id: number | null;
  quantity: number;
  /**
   * Nhãn hiển thị cho dòng đã có sẵn từ GET (chỉ SKU) — `SearchableSelect` dùng
   * search server-side nên chưa chắc đã "thấy" sản phẩm này trong kết quả tìm
   * gần nhất; dòng người dùng tự chọn thì widget tự nhớ nhãn nội bộ sau khi
   * chọn, không cần field này.
   */
  initialLabel?: string;
}

// Bộ đếm id dòng ở phạm vi module: id chỉ cần DUY NHẤT trong một danh sách và
// KHÔNG bao giờ được tái sử dụng, một biến tăng dần là đủ. Cố tình không dùng
// `useRef` rồi gọi trong updater của `setRows` như bản trước: updater chạy
// trong pha render, mutate ref ở đó là vi phạm Rules of React (React có quyền
// gọi lại updater) — đúng loại bẫy mà React Compiler khuếch đại.
let nextRowId = 0;

export function makeComboRow(init: Partial<ComboRow> = {}): ComboRow {
  return { id: nextRowId++, component_id: null, quantity: 1, ...init };
}

/**
 * Validate phía client trước khi gọi API. BE đã chặn đủ (quantity < 1, trùng
 * sản phẩm, chọn chính nó, combo lồng combo) — đây chỉ để báo lỗi sớm, không
 * phải lớp bảo vệ duy nhất. Trả về thông báo lỗi, hoặc `null` nếu hợp lệ.
 */
export function validateComboRows(rows: readonly ComboRow[]): string | null {
  const selected = rows.filter((row) => row.component_id != null);

  for (const row of selected) {
    if (!(row.quantity >= 1)) return "Số lượng phải từ 1 trở lên.";
  }

  const seen = new Set<number>();
  for (const row of selected) {
    const id = row.component_id as number;
    if (seen.has(id)) return "Sản phẩm này đã có trong danh sách.";
    seen.add(id);
  }

  return null;
}

/** Bỏ các dòng chưa chọn sản phẩm rồi rút gọn về payload của API. */
export function comboRowsToPayload(rows: readonly ComboRow[]): ProductComponentInput[] {
  return rows
    .filter((row) => row.component_id != null)
    .map((row) => ({ component_id: row.component_id as number, quantity: row.quantity }));
}
