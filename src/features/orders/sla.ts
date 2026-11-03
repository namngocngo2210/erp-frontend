export const SHEET_SLA_MINUTES = 30;

type SlaRow = { created_at?: string | null; contact_count?: number | null };

/** Đơn "chưa gọi" (contact_count = 0) và tạo quá 30 phút → vi phạm SLA. */
export function isSlaBreached(row: SlaRow, now: Date = new Date()): boolean {
  if ((row.contact_count ?? 0) > 0) return false;
  if (!row.created_at) return false;
  const created = new Date(row.created_at);
  if (isNaN(created.getTime())) return false;
  const mins = (now.getTime() - created.getTime()) / 60000;
  return mins > SHEET_SLA_MINUTES;
}
