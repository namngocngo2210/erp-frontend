export type SecondsFill = "floor" | "ceil";

/**
 * Chuẩn hoá chuỗi người dùng nhập về "HH:MM:SS" định dạng 24h, hoặc "" nếu trống/không hợp lệ.
 *
 * Chấp nhận gõ nhanh: "9" → 09:00:ss, "930"/"0930" → 09:30:ss, "9:5" → 09:05:ss,
 * "21:30" → 21:30:ss, "17:29:59" → 17:29:59 (giây gõ tường minh được tôn trọng).
 *
 * Giây KHÔNG gõ sẽ được điền theo ``fillSeconds``:
 *   - "floor" (mặc định) → :00  — dùng cho giờ BẮT ĐẦU ca.
 *   - "ceil"            → :59  — dùng cho giờ KẾT THÚC ca (phủ trọn phút đó).
 *
 * Giờ 0–23, phút/giây 0–59; ngoài khoảng ⇒ "". Dùng cho ô nhập giờ 24h không phụ
 * thuộc locale trình duyệt (thay cho <input type="time"> vốn hiển thị 12h/24h theo
 * ngôn ngữ trình duyệt).
 */
export function normalizeTime24(raw: string, opts?: { fillSeconds?: SecondsFill }): string {
  const fill = opts?.fillSeconds === "ceil" ? "59" : "00";
  const s = (raw ?? "").trim();
  if (!s) return "";

  let hourPart: string;
  let minutePart: string;
  let secondPart: string | null = null; // null = người dùng không gõ giây

  if (s.includes(":")) {
    const parts = s.split(":");
    if ((parts[0] ?? "").trim() === "") return ""; // bắt buộc có phần giờ, tránh ":30"
    hourPart = parts[0];
    minutePart = parts[1] || "0";
    if (parts.length >= 3) secondPart = parts[2] || "0";
  } else {
    const digits = s.replace(/\D/g, "");
    if (!digits) return "";
    if (digits.length <= 2) {
      hourPart = digits;
      minutePart = "0";
    } else if (digits.length <= 4) {
      hourPart = digits.slice(0, -2); // HMM / HHMM
      minutePart = digits.slice(-2);
    } else {
      hourPart = digits.slice(0, -4); // HMMSS / HHMMSS
      minutePart = digits.slice(-4, -2);
      secondPart = digits.slice(-2);
    }
  }

  const h = Number(hourPart);
  const m = Number(minutePart);
  const sec = secondPart === null ? null : Number(secondPart);
  if (!Number.isInteger(h) || !Number.isInteger(m)) return "";
  if (sec !== null && !Number.isInteger(sec)) return "";
  if (h < 0 || h > 23 || m < 0 || m > 59) return "";
  if (sec !== null && (sec < 0 || sec > 59)) return "";

  const ss = sec === null ? fill : String(sec).padStart(2, "0");
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${ss}`;
}
