import { useEffect, useRef } from "react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyHandler = (...args: any[]) => unknown;

/**
 * Giữ identity ổn định cho một bộ handler (closure tạo mới mỗi render).
 *
 * App re-render mỗi khi UI state biến động (gõ profile, toggle sidebar...).
 * Các handler truyền vào là closure tạo mới mỗi render; nếu đưa thẳng vào
 * useMemo của data context thì object đổi identity liên tục → mọi page/grid
 * re-render. Hook này giữ closure mới nhất trong ref và expose wrapper ổn định
 * (identity không đổi) để data context chỉ đổi khi DATA đổi.
 *
 * Ref được cập nhật trong effect (không gán trong thân render — React Compiler
 * bail out toàn bộ memoization của component khi thấy ghi ref lúc render).
 * Effect không có dep array: chạy sau MỌI render nên ref luôn giữ closure mới
 * nhất. An toàn vì wrapper chỉ đọc ref.current lúc được GỌI (event time),
 * không đọc trong thân render.
 *
 * Lưu ý: bộ KEY của object handlers phải cố định giữa các render (wrapper chỉ
 * được tạo MỘT lần từ key của render đầu tiên).
 */
export function useStableHandlers<T extends Record<string, AnyHandler>>(handlers: T): T {
  const latestRef = useRef(handlers);
  useEffect(() => {
    latestRef.current = handlers;
  });

  // Wrappers tạo MỘT lần (identity ổn định), luôn gọi closure mới nhất qua ref.
  const stableRef = useRef<T | null>(null);
  if (stableRef.current === null) {
    const stable: Record<string, AnyHandler> = {};
    for (const key of Object.keys(handlers)) {
      stable[key] = (...args: unknown[]) => latestRef.current[key](...args);
    }
    stableRef.current = stable as T;
  }
  return stableRef.current;
}
