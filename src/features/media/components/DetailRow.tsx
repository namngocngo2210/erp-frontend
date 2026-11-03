import type { ReactNode } from "react";

/**
 * Nhãn + giá trị 1 dòng thông tin đọc — dùng ở chế độ không có quyền sửa của
 * panel chi tiết (card Thông tin upload/marketing). Tách file riêng (thay vì
 * định nghĩa lại trong ContentDetailSheet) để 2 card cắm được mà không tạo
 * import vòng giữa panel và card.
 */
export function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[8rem_1fr] gap-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="min-w-0 break-words">{children}</span>
    </div>
  );
}
