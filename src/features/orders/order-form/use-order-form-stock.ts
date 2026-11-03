import { useEffect, useMemo, useState } from "react";

import { getStockAvailability, type StockAvailabilityRow } from "@/lib/api/stock-availability";

type UseOrderFormStockArgs = {
  open: boolean;
  /** Kho xuất đang chọn trên form; null = chưa chọn. */
  warehouseId: number | null;
  /** SKU của các dòng hàng đang có trên form (đã khử trùng lặp). */
  skus: string[];
};

export type OrderFormStockState = {
  rows: StockAvailabilityRow[];
  loading: boolean;
  /**
   * Gọi API hỏng (kể cả 403 của người thiếu quyền `orders:view`). Giao diện ẨN
   * hẳn khối tồn thay vì báo lỗi: đây là thông tin phụ trợ, không được phép
   * chen ngang việc tạo đơn.
   */
  failed: boolean;
};

/**
 * Tồn BÁN ĐƯỢC của các sản phẩm trên form, theo kho xuất đang chọn.
 *
 * Dùng `useEffect` + `AbortController` chứ không phải react-query để đồng bộ với
 * phần còn lại của form đơn (danh sách kho, location KiotViet... đều nạp kiểu
 * này) — dialog nhờ vậy vẫn render được trong test mà không cần QueryClientProvider.
 */
export function useOrderFormStock({
  open,
  warehouseId,
  skus,
}: UseOrderFormStockArgs): OrderFormStockState {
  const [rows, setRows] = useState<StockAvailabilityRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  // Chuỗi ổn định thay cho mảng `skus` (tham chiếu đổi mỗi lần form render dù nội
  // dung không đổi) — hai chuỗi cùng nội dung luôn `===` nhau nên effect chỉ chạy
  // lại khi TẬP SKU thực sự đổi, không phải mỗi lần gõ số lượng hay giá.
  const skuKey = useMemo(() => skus.join(","), [skus]);

  useEffect(() => {
    if (!open || !warehouseId || !skuKey) {
      setRows([]);
      setLoading(false);
      setFailed(false);
      return;
    }
    const controller = new AbortController();
    let active = true;
    setLoading(true);
    setFailed(false);
    void (async () => {
      try {
        const data = await getStockAvailability(warehouseId, skuKey.split(","), {
          signal: controller.signal,
        });
        if (!active) return;
        setRows(data.items ?? []);
      } catch {
        // Bao gồm cả abort khi đổi kho liên tục: lượt fetch mới đã set lại state,
        // nhánh này chỉ chạy khi `active` còn true tức là lỗi thật.
        if (!active) return;
        setRows([]);
        setFailed(true);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
      controller.abort();
    };
  }, [open, warehouseId, skuKey]);

  return { rows, loading, failed };
}
