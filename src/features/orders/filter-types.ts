/**
 * Kiểu option dùng chung cho mọi ô lọc dạng select ở trang đơn hàng.
 *
 * Tách khỏi component để các file KHÔNG dựng UI (hook handler, chip bar, thanh lọc
 * trang Vận đơn) import được kiểu mà không kéo theo component UI.
 */
export type FilterSelectOption = {
  value: string;
  label: string;
};
