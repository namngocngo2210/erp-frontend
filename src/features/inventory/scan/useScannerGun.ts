import { useEffect, useRef, useState } from "react";

// Phát hiện súng quét HID (keyboard-wedge): súng "gõ" cực nhanh rồi Enter, khác
// hẳn người gõ tay. Bắt ở cấp document nên ăn dù focus đang ở nút/dropdown.
const FAST_GAP_MS = 50; // khoảng cách tối đa giữa 2 phím để coi là "súng"
const MIN_LEN = 3; // độ dài tối thiểu của mã
const ACTIVE_MS = 4000; // badge "đang hoạt động" sáng bao lâu sau mỗi lần quét

function isEditableTarget(): boolean {
  const el = document.activeElement as HTMLElement | null;
  if (!el) return false;
  return el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable === true;
}

/**
 * Nghe nhịp gõ toàn trang để nhận diện súng quét.
 * - `enabled`: chỉ nghe khi true (vd dialog đang mở).
 * - `onScan`: gọi khi nhận một lần quét súng VÀ focus KHÔNG ở ô nhập (tránh bắn
 *   đôi với input đang tự xử lý Enter).
 * Trả về `{ active }` để hiển thị badge.
 */
export function useScannerGun({
  enabled,
  onScan,
}: {
  enabled: boolean;
  onScan: (code: string) => void;
}) {
  const [active, setActive] = useState(false);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;
  const bufRef = useRef("");
  const lastAtRef = useRef(0);
  const clearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled) return;

    function handler(e: KeyboardEvent) {
      if (e.ctrlKey || e.metaKey || e.altKey || e.isComposing) return;

      if (e.key === "Enter") {
        const code = bufRef.current;
        bufRef.current = "";
        if (code.length >= MIN_LEN) {
          setActive(true);
          if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
          clearTimerRef.current = setTimeout(() => setActive(false), ACTIVE_MS);
          if (!isEditableTarget()) onScanRef.current(code);
        }
        return;
      }

      if (e.key.length !== 1) return; // bỏ phím không in được (Shift, Arrow…)

      const now = Date.now();
      if (now - lastAtRef.current > FAST_GAP_MS) {
        bufRef.current = ""; // gap lớn = gõ tay → bắt đầu chuỗi mới
      }
      bufRef.current += e.key;
      lastAtRef.current = now;
    }

    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [enabled]);

  useEffect(
    () => () => {
      if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
    },
    [],
  );

  return { active };
}
