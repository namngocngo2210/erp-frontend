/**
 * Conversions between an ISO timestamp and the value an `<input type="datetime-local">`
 * expects (`YYYY-MM-DDTHH:mm`, local time). Dedupes the identical copies that lived
 * in OrdersTable / order-detail-shared.
 */

/** ISO (or anything Date-parseable) → `YYYY-MM-DDTHH:mm` local, or "" if invalid/empty. */
export function isoToDatetimeLocal(value: unknown): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** A datetime-local string → ISO 8601 (UTC), or "" if invalid/empty. */
export function datetimeLocalToIso(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const d = new Date(trimmed);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString();
}

/**
 * Ngày hôm nay theo giờ LOCAL dạng `YYYY-MM-DD`. KHÔNG dùng
 * `new Date().toISOString().slice(0, 10)` — đó là ngày theo UTC, sai trước
 * 07:00 giờ VN (UTC+7).
 */
export function todayLocalDate(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}
