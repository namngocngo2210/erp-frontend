/**
 * Dò phần tử tràn ngang viewport — CHỈ chạy ở dev (main.tsx import động trong nhánh
 * `import.meta.env.DEV`, nên không vào bundle prod).
 *
 * Trước đây `html, body { overflow-x: hidden }` cắt mất phần tràn, bug layout bị
 * giấu khỏi cả mắt lẫn DevTools. Bỏ lớp che đó rồi thì cần một chỗ báo sớm: phần tử
 * nào vượt mép viewport mà không nằm trong vùng cuộn ngang hợp lệ
 * (`overflow-x: auto|scroll`) sẽ được `console.warn` một lần.
 */

const SCROLLABLE = new Set(["auto", "scroll"]);
/** Sai số làm tròn subpixel (px). */
const TOLERANCE = 1;
const DEBOUNCE_MS = 500;

type StyleOf = (el: Element) => Pick<CSSStyleDeclaration, "overflowX" | "pointerEvents">;

/** Có tổ tiên (không tính chính nó) là vùng cuộn ngang hợp lệ không. */
function insideHorizontalScroller(el: Element, styleOf: StyleOf, cache: Map<Element, boolean>) {
  const chain: Element[] = [];
  let node = el.parentElement;
  let result = false;
  while (node && node !== document.body && node !== document.documentElement) {
    const cached = cache.get(node);
    if (cached !== undefined) {
      result = cached;
      break;
    }
    chain.push(node);
    if (SCROLLABLE.has(styleOf(node).overflowX)) {
      result = true;
      break;
    }
    node = node.parentElement;
  }
  for (const item of chain) cache.set(item, result);
  return result;
}

/**
 * Hàm thuần: trả các phần tử NGOÀI CÙNG vượt `[0, viewportWidth]` theo trục ngang,
 * bỏ qua phần tử trang trí (`pointer-events: none`) và phần tử nằm trong vùng cuộn ngang.
 */
export function findOverflowingElements(
  root: Element,
  viewportWidth: number,
  styleOf: StyleOf = (el) => getComputedStyle(el),
): Element[] {
  const cache = new Map<Element, boolean>();
  const hits: Element[] = [];
  for (const el of root.querySelectorAll("*")) {
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) continue;
    if (rect.right <= viewportWidth + TOLERANCE && rect.left >= -TOLERANCE) continue;
    if (styleOf(el).pointerEvents === "none") continue;
    if (insideHorizontalScroller(el, styleOf, cache)) continue;
    // Chỉ giữ phần tử ngoài cùng: con của phần tử đã tràn chỉ là hệ quả.
    if (hits.some((hit) => hit.contains(el))) continue;
    hits.push(el);
  }
  return hits;
}

/** Nhãn ngắn gọn để đọc trong console: `div.flex.gap-2 < section#x`. */
export function describeElement(el: Element): string {
  const parts: string[] = [];
  let node: Element | null = el;
  for (let depth = 0; node && depth < 3; depth += 1) {
    const id = node.id ? `#${node.id}` : "";
    const classes = [...node.classList]
      .slice(0, 3)
      .map((name) => `.${name}`)
      .join("");
    parts.push(`${node.tagName.toLowerCase()}${id}${classes}`);
    node = node.parentElement;
  }
  return parts.join(" < ");
}

/** Gắn observer, quét lại (debounce) khi kích thước hoặc DOM đổi. Trả hàm gỡ. */
export function startOverflowDetector(): () => void {
  const warned = new Set<string>();
  let timer: ReturnType<typeof setTimeout> | undefined;

  const scan = () => {
    const viewportWidth = document.documentElement.clientWidth;
    for (const el of findOverflowingElements(document.body, viewportWidth)) {
      const label = describeElement(el);
      if (warned.has(label)) continue;
      warned.add(label);
      const rect = el.getBoundingClientRect();
      console.warn(
        `[overflow] ${label} tràn ngang viewport (${Math.round(rect.left)}→${Math.round(rect.right)} / ${viewportWidth}px)`,
        el,
      );
    }
  };
  const schedule = () => {
    clearTimeout(timer);
    timer = setTimeout(scan, DEBOUNCE_MS);
  };

  const resize = new ResizeObserver(schedule);
  resize.observe(document.documentElement);
  const mutation = new MutationObserver(schedule);
  mutation.observe(document.body, { childList: true, subtree: true });
  schedule();

  return () => {
    clearTimeout(timer);
    resize.disconnect();
    mutation.disconnect();
  };
}
