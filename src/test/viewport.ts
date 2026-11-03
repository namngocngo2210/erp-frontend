/**
 * Giả lập viewport cho test.
 *
 * Stub `matchMedia` mặc định ở setup.ts luôn trả `matches: false` cho MỌI query.
 * Với `useMediaQuery` điều đó nghĩa là `TABLE_VIEWPORT_QUERY` (min-width) cũng
 * false → `ResponsiveList` mặc định render nhánh THẺ MOBILE trong test, kể cả khi
 * test đang muốn assert theo bảng desktop. Nên test nào chạm màn có ResponsiveList
 * đều phải tự chốt chiều viewport thay vì tin vào mặc định.
 *
 * Trước đây helper này bị chép nguyên si ở ScanDispatchDialog.viewport.test.tsx và
 * stock-as-of.test.tsx; gom về đây để mọi test dùng cùng một hành vi.
 */

/** matchMedia gốc do setup.ts cài — dùng để trả lại sau mỗi test. */
const ORIGINAL_MATCH_MEDIA = window.matchMedia;

function install(matches: (query: string) => boolean): void {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: (query: string) =>
      ({
        matches: matches(query),
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => true,
      }) as MediaQueryList,
  });
}

/**
 * Chốt viewport theo chiều của query: mobile khớp `max-width`, desktop khớp
 * `min-width`. Khớp đúng cặp TABLE_VIEWPORT_QUERY / MOBILE_VIEWPORT_QUERY
 * trong lib/constants/layout.ts.
 */
export function mockViewport(mobile: boolean): void {
  install((query) => (mobile ? query.includes("max-width") : query.includes("min-width")));
}

/**
 * Đánh giá query theo một chiều rộng cụ thể: mọi điều kiện `(min-width: Npx)` /
 * `(max-width: Npx)` trong query phải thoả. Query không có điều kiện độ rộng → false
 * (giữ hành vi stub mặc định cho `prefers-*`, `pointer`…).
 */
function matchesWidth(query: string, width: number): boolean {
  const conds = [...query.matchAll(/\((min|max)-width:\s*([\d.]+)px\)/g)];
  if (conds.length === 0) return false;
  return conds.every(([, kind, px]) =>
    kind === "min" ? width >= Number(px) : width <= Number(px),
  );
}

/**
 * Chốt viewport theo chiều rộng thật (px) — dùng khi cần phân biệt 3 vùng
 * mobile (<768) / tablet (768–1023, thẻ nhưng không camera) / bảng (≥1024).
 */
export function mockViewportWidth(width: number): void {
  install((query) => matchesWidth(query, width));
}

/**
 * Trả `matchMedia` về stub mặc định của setup.ts. Bắt buộc gọi trong afterEach —
 * override viewport rò sang test sau sẽ làm kết quả phụ thuộc thứ tự chạy.
 */
export function restoreViewport(): void {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: ORIGINAL_MATCH_MEDIA,
  });
}
