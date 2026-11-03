import type {
  InitialStockDiff,
  PancakePosInitialStockStatus,
  PancakePosStatus,
} from "@/lib/api/pancakePos";

/** Logic thuần của thẻ Tồn đầu kỳ (test bằng vitest, không cần render). */

/**
 * Lý do KHÔNG được chạy thử (khoá i18n), `null` = được. Chạy thử chỉ cần key + shop +
 * ít nhất một kho đã ghép, và không có lượt tồn đầu kỳ nào đang chạy.
 */
export function dryRunBlockReason(
  status: PancakePosStatus | undefined,
  stock: PancakePosInitialStockStatus | undefined,
): string | null {
  if (!status || !stock) return "pancakePos.block.loading";
  if (stock.active_run_id) return "pancakePos.block.running";
  if (!status.api_key_set) return "pancakePos.block.noKey";
  if (!status.shop_id) return "pancakePos.block.noShop";
  if (!stock.warehouse_links) return "pancakePos.stock.block.noWarehouses";
  return null;
}

/**
 * Lý do KHÔNG được ghi thật. Ngoài điều kiện chạy thử: cần cờ ghi bật và lượt chạy
 * thử gần nhất thành công, còn hạn (≤ 30 phút — BE tính `apply_deadline`, FE so với `now`).
 */
export function applyBlockReason(
  status: PancakePosStatus | undefined,
  stock: PancakePosInitialStockStatus | undefined,
  now: Date = new Date(),
): string | null {
  const base = dryRunBlockReason(status, stock);
  if (base) return base;
  if (!status?.enabled) return "pancakePos.block.disabled";
  const dry = stock?.latest_dry_run;
  if (!dry) return "pancakePos.stock.block.noDryRun";
  if (dry.fatal) return "pancakePos.stock.block.dryRunFailed";
  if (!stock?.apply_allowed || !stock.apply_deadline) return "pancakePos.stock.block.dryRunExpired";
  if (new Date(stock.apply_deadline).getTime() <= now.getTime()) {
    return "pancakePos.stock.block.dryRunExpired";
  }
  return null;
}

/** Số phút còn lại để ghi theo lượt chạy thử (làm tròn lên, tối thiểu 0). */
export function minutesLeft(deadline: string | null | undefined, now: Date = new Date()): number {
  if (!deadline) return 0;
  const ms = new Date(deadline).getTime() - now.getTime();
  return ms > 0 ? Math.ceil(ms / 60_000) : 0;
}

function csvCell(value: string | number | null | undefined): string {
  const text = value === null || value === undefined ? "" : String(value);
  // Chặn công thức Excel (CSV injection) và escape theo RFC 4180.
  const safe = /^[=+\-@\t\r]/.test(text) && !/^-?\d+$/.test(text) ? `'${text}` : text;
  return /[",\n\r;]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/** BOM UTF-8 — Excel mới nhận đúng tiếng Việt. */
const BOM = "\uFEFF";

export const CSV_HEADER = [
  "sku",
  "warehouse",
  "crm_qty",
  "push_qty",
  "pancake_qty",
  "delta",
  "variation_id",
] as const;

/** Bảng lệch → CSV (BOM UTF-8 để Excel đọc đúng tiếng Việt). */
export function diffsToCsv(diffs: InitialStockDiff[]): string {
  const lines = [CSV_HEADER.join(",")];
  for (const d of diffs) {
    lines.push(
      [d.sku, d.warehouse_name, d.crm_qty, d.push_qty, d.pancake_qty, d.delta, d.variation_id]
        .map(csvCell)
        .join(","),
    );
  }
  return `${BOM}${lines.join("\r\n")}\r\n`;
}

/** Lọc bảng lệch theo SKU/kho (không phân biệt hoa thường). */
export function filterDiffs(diffs: InitialStockDiff[], query: string): InitialStockDiff[] {
  const q = query.trim().toLowerCase();
  if (!q) return diffs;
  return diffs.filter(
    (d) => d.sku.toLowerCase().includes(q) || d.warehouse_name.toLowerCase().includes(q),
  );
}
