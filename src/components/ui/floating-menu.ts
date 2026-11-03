import * as React from "react";

/** Khoảng cách giữa ô chọn và menu, và lề tối thiểu với mép viewport (px). */
const GAP = 4;
const VIEWPORT_MARGIN = 8;

/**
 * Vị trí `position: fixed` cho menu render qua portal vào `document.body`, neo theo
 * `anchorRef`. Portal để menu không bị cắt bởi ancestor `overflow` (Dialog/Sheet cuộn,
 * ô bảng) — thay cho `menuPortalTarget=document.body` + `menuPosition="fixed"` của
 * react-select. Tự lật lên trên khi phía dưới không đủ chỗ; cập nhật khi cuộn/resize.
 */
export function useFloatingMenuStyle(
  open: boolean,
  anchorRef: React.RefObject<HTMLElement | null>,
  menuRef: React.RefObject<HTMLElement | null>,
): React.CSSProperties | null {
  const [style, setStyle] = React.useState<React.CSSProperties | null>(null);

  const update = React.useCallback(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const menuHeight = menuRef.current?.offsetHeight ?? 0;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const openUp = menuHeight > 0 && spaceBelow < menuHeight + GAP && spaceAbove > spaceBelow;
    const width = rect.width;
    const left = Math.max(
      VIEWPORT_MARGIN,
      Math.min(rect.left, window.innerWidth - width - VIEWPORT_MARGIN),
    );
    setStyle({
      position: "fixed",
      left,
      width,
      ...(openUp ? { bottom: window.innerHeight - rect.top + GAP } : { top: rect.bottom + GAP }),
    });
  }, [anchorRef, menuRef]);

  React.useLayoutEffect(() => {
    if (!open) {
      setStyle(null);
      return;
    }
    update();
    // Đo lại sau khi menu đã mount (biết chiều cao thật để quyết định lật lên).
    const frame = requestAnimationFrame(update);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, update]);

  return style;
}

/** Gom option theo `group` (giữ thứ tự xuất hiện đầu tiên); option không có group đứng riêng. */
export function groupByKey<T extends { group?: string }>(
  options: readonly T[],
): Array<{ group?: string; options: T[] }> {
  const sections: Array<{ group?: string; options: T[] }> = [];
  const byGroup = new Map<string, { group?: string; options: T[] }>();
  for (const option of options) {
    const key = option.group ?? "";
    let section = byGroup.get(key);
    if (!section) {
      section = { group: option.group, options: [] };
      byGroup.set(key, section);
      sections.push(section);
    }
    section.options.push(option);
  }
  return sections;
}

/** Cuộn option đang active vào vùng nhìn thấy của listbox (jsdom không có scrollIntoView). */
export function scrollOptionIntoView(listbox: HTMLElement | null, optionId: string | undefined) {
  if (!listbox || !optionId) return;
  const el = listbox.ownerDocument.getElementById(optionId);
  if (el && typeof el.scrollIntoView === "function") el.scrollIntoView({ block: "nearest" });
}
