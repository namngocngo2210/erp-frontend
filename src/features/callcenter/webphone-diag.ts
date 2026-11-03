/**
 * Nhật ký chẩn đoán tổng đài — ring buffer trong bộ nhớ tab (không gửi đi đâu).
 * Ghi mọi message iframe ↔ app, log console của SDK trong iframe, vai tab
 * (chủ/phụ), thao tác liên tab. Nút "Sao chép nhật ký" trên khung Tổng đài copy
 * ra clipboard để dán cho dev — thay cho việc nhờ sale bật DevTools mức Verbose.
 * DevTools: `__webphoneLog()` trả cùng nội dung.
 */

const MAX_ENTRIES = 400;
const MAX_DETAIL_CHARS = 600;

type Entry = { t: string; kind: string; detail?: string };

const entries: Entry[] = [];
let role: "leader" | "follower" | "unknown" = "unknown";

function stringify(detail: unknown): string | undefined {
  if (detail === undefined) return undefined;
  if (typeof detail === "string") return detail.slice(0, MAX_DETAIL_CHARS);
  try {
    return JSON.stringify(detail).slice(0, MAX_DETAIL_CHARS);
  } catch {
    return String(detail).slice(0, MAX_DETAIL_CHARS);
  }
}

export function diagSetRole(next: "leader" | "follower") {
  role = next;
  diagRecord(`role:${next}`);
}

export function diagRecord(kind: string, detail?: unknown) {
  entries.push({ t: new Date().toISOString(), kind, detail: stringify(detail) });
  if (entries.length > MAX_ENTRIES) entries.splice(0, entries.length - MAX_ENTRIES);
}

/** Text nhiều dòng để dán vào chat/issue. */
export function diagSnapshot(): string {
  const header = [
    `# webphone log — role=${role} — ${new Date().toISOString()}`,
    `# url=${typeof location !== "undefined" ? location.pathname : ""} ua=${
      typeof navigator !== "undefined" ? navigator.userAgent : ""
    }`,
  ];
  const lines = entries.map((e) => `${e.t} ${e.kind}${e.detail ? " " + e.detail : ""}`);
  return [...header, ...lines].join("\n");
}

export function diagEntryCount(): number {
  return entries.length;
}

/** Test-only. */
export function diagReset() {
  entries.splice(0, entries.length);
  role = "unknown";
}

/** Sao chép nhật ký; trả về false nếu trình duyệt không cho dùng clipboard. */
export async function diagCopyToClipboard(): Promise<boolean> {
  const text = diagSnapshot();
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* rơi xuống fallback */
  }
  // Fallback: in ra console để copy tay từ DevTools.
  console.warn(text);
  return false;
}

if (typeof window !== "undefined") {
  (window as unknown as { __webphoneLog?: () => string }).__webphoneLog = diagSnapshot;
}
