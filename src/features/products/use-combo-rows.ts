import { useCallback, useEffect, useState } from "react";

import {
  getProductComponents,
  putProductComponents,
  type ProductComponentInput,
} from "@/lib/api/product-components";

import { comboRowsToPayload, makeComboRow, type ComboRow } from "@/features/products/combo-rows";

/**
 * `saved` — đã ghi thay đổi. `unchanged` — danh sách y nguyên, không gọi API.
 * `skipped` — KHÔNG ghi vì chưa tải được danh sách hiện có (xem `loadFailed`);
 * bên gọi phải cảnh báo người dùng, đây là lần lưu KHÔNG trọn vẹn.
 */
export type ComboSaveResult = "saved" | "unchanged" | "skipped";

/** Chuẩn hoá để so sánh: bỏ dòng trống, sắp theo component_id (thứ tự dòng không mang nghĩa). */
function fingerprint(payload: readonly ProductComponentInput[]): string {
  return JSON.stringify([...payload].sort((a, b) => a.component_id - b.component_id));
}

/**
 * Quản lý danh sách thành phần combo cho form sản phẩm.
 *
 * `productId = null` là chế độ TẠO: chưa có id nên không GET, danh sách bắt đầu
 * rỗng và chỉ ghi khi người dùng thực sự khai. Truyền id là chế độ SỬA: GET
 * danh sách hiện có trước để `saveFor` biết cái gì đã đổi.
 *
 * Vì sao phải "biết cái gì đã đổi": API components ghi đè TRỌN danh sách. Form
 * sửa sản phẩm thì lần Lưu nào cũng chạy qua đây, kể cả khi người dùng chỉ đổi
 * cái tên — PUT vô điều kiện sẽ xoá-rồi-ghi-lại toàn bộ bảng thành phần mỗi
 * lần, và tệ hơn: nếu GET hỏng thì `rows` rỗng do TẢI THẤT BẠI chứ không phải
 * do combo không có thành phần, PUT lúc đó xoá sạch BOM hiện có không đường lùi.
 */
export function useComboRows(productId: number | null) {
  const [rows, setRows] = useState<ComboRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  // Ảnh chụp danh sách lúc vừa tải xong — mốc để biết người dùng có đổi gì không.
  const [baseline, setBaseline] = useState<ProductComponentInput[]>([]);

  useEffect(() => {
    if (productId == null) return;
    let cancelled = false;
    setRows([]);
    setBaseline([]);
    setLoadFailed(false);
    setLoading(true);
    getProductComponents(productId)
      .then((existing) => {
        if (cancelled) return;
        setRows(
          existing.map((row) =>
            makeComboRow({
              component_id: row.component_id,
              quantity: row.quantity,
              initialLabel: row.sku,
            }),
          ),
        );
        setBaseline(
          existing.map((row) => ({ component_id: row.component_id, quantity: row.quantity })),
        );
      })
      .catch(() => {
        if (!cancelled) setLoadFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [productId]);

  const payload = comboRowsToPayload(rows);
  const dirty = fingerprint(payload) !== fingerprint(baseline);

  const reset = useCallback(() => {
    setRows([]);
    setBaseline([]);
    setLoadFailed(false);
    setLoading(false);
  }, []);

  const saveFor = async (targetProductId: number): Promise<ComboSaveResult> => {
    if (loadFailed) return "skipped";
    if (!dirty) return "unchanged";
    await putProductComponents(targetProductId, payload);
    setBaseline(payload);
    return "saved";
  };

  return { rows, setRows, loading, loadFailed, dirty, reset, saveFor };
}
