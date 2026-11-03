export type PortalTabKey = "activate" | "track";

/**
 * Portal có hai lối vào khác nhau nên tab mở sẵn KHÔNG hardcode:
 *
 * - Khách tự gõ/bấm link trên web (kể cả redirect `/` → `/bao-hanh` của nginx)
 *   → mặc định tab "Vận đơn": người vào thẳng domain hầu hết là để hỏi đơn đang
 *   ở đâu.
 * - Nút "Kích hoạt bảo hành" nhúng ở Zalo OA trỏ tới `?tab=kich-hoat` → mở
 *   thẳng tab "Bảo hành", khách không phải bấm thêm một nhịp.
 *
 * Giá trị `?tab=` để tiếng Việt không dấu cho link dán ra ngoài đọc được; vẫn
 * nhận cả tên khoá tiếng Anh phòng khi ai đó dựng link theo `TabKey`.
 */
const TAB_PARAM: Record<PortalTabKey, string> = {
  activate: "kich-hoat",
  track: "van-don",
};

const PARAM_ALIASES: Record<string, PortalTabKey> = {
  "kich-hoat": "activate",
  activate: "activate",
  "van-don": "track",
  track: "track",
};

/** Không có `?tab=` hoặc giá trị lạ → coi như khách vào từ web. */
export const DEFAULT_PORTAL_TAB: PortalTabKey = "track";

/** `search` là `window.location.search` (có hoặc không có dấu `?` đều được). */
export function resolveEntryTab(search: string): PortalTabKey {
  const raw = new URLSearchParams(search).get("tab");
  if (!raw) return DEFAULT_PORTAL_TAB;
  return PARAM_ALIASES[raw.trim().toLowerCase()] ?? DEFAULT_PORTAL_TAB;
}

export function portalTabParam(tab: PortalTabKey): string {
  return TAB_PARAM[tab];
}
