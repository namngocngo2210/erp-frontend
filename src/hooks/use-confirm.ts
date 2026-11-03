import { createContext, useContext, type ReactNode } from "react";

export interface ConfirmOptions {
  title: ReactNode;
  description?: ReactNode;
  /** Nhãn nút xác nhận — mặc định "Xác nhận" (hoặc "Xóa" khi `destructive`). */
  confirmText?: string;
  cancelText?: string;
  /** Thao tác phá huỷ/không hoàn tác → nút xác nhận màu destructive. */
  destructive?: boolean;
}

export type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

export const ConfirmContext = createContext<ConfirmFn | null>(null);

// Thiếu provider chỉ báo lỗi lúc GỌI (không phải lúc render) — component vẫn
// render được trong test không bọc provider, còn lời gọi thật thì hỏng rõ ràng.
const missingProvider: ConfirmFn = () =>
  Promise.reject(new Error("useConfirm() cần <ConfirmProvider> ở gốc cây component"));

/**
 * Hộp thoại xác nhận thay `window.confirm` — trả `Promise<boolean>`:
 * `if (!(await confirm({ title, destructive: true }))) return;`
 */
export function useConfirm(): ConfirmFn {
  return useContext(ConfirmContext) ?? missingProvider;
}
