/**
 * Hợp đồng dữ liệu của <ColumnManager> — dùng chung cho mọi trang danh sách
 * (Orders, Warranty, Customers, dialog xuất Excel).
 *
 * Component KHÔNG tự đọc/ghi localStorage và không giữ state cột: trang sở hữu
 * state, ColumnManager chỉ trình bày. Nhờ vậy mỗi trang giữ nguyên cơ chế lưu
 * riêng (key localStorage khác nhau, hoặc không lưu) mà vẫn dùng chung UI.
 */

/** Một cột chọn được. `label` có thể là i18n key hoặc text thô — xem `translate`. */
export type ColumnManagerOption<K extends string = string> = {
  key: K;
  label: string;
  /** Khoá nhóm, phải khớp một phần tử trong `groups`. */
  group: string;
  /**
   * false = cột cố định, luôn hiện và không tắt được (vd nhóm "Định danh" của
   * Customers). Mặc định true.
   */
  hideable?: boolean;
};

export type ColumnManagerGroup = {
  key: string;
  label: string;
};

/** Bộ cột dựng sẵn theo vai trò. Khai báo trong code, không lưu ở đâu cả. */
export type ColumnManagerPreset<K extends string = string> = {
  key: string;
  label: string;
  columns: K[];
};

/** Hàm dịch của trang. Trang nào dùng label text thô thì bỏ trống. */
export type ColumnManagerTranslate = (key: string, fallback?: string) => string;
