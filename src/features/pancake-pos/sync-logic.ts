import type { PancakePosStatus, PancakePosSyncMode, PancakePosSyncRun } from "@/lib/api/pancakePos";

/** Logic thuần của trang Pancake POS (test bằng vitest, không cần render). */

export const MAX_SKUS = 200;

/** Ô nhập SKU: tách theo dấu phẩy/khoảng trắng/xuống dòng, bỏ trống, khử trùng (không phân biệt hoa thường). */
export function parseSkuList(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of text.split(/[\s,;]+/)) {
    const sku = raw.trim();
    if (!sku || seen.has(sku.toUpperCase())) continue;
    seen.add(sku.toUpperCase());
    out.push(sku);
  }
  return out;
}

/** "" → không giới hạn; số nguyên dương → giới hạn; còn lại → lỗi (null). */
export function parseLimit(text: string): number | undefined | null {
  const value = text.trim();
  if (!value) return undefined;
  if (!/^\d+$/.test(value)) return null;
  const n = Number(value);
  return n > 0 ? n : null;
}

export type RunState = "running" | "failed" | "warning" | "done";

export function runState(
  run: Pick<PancakePosSyncRun, "finished_at" | "fatal" | "conflicts" | "errors">,
): RunState {
  if (!run.finished_at) return "running";
  if (run.fatal) return "failed";
  if ((run.conflicts ?? 0) > 0 || (run.errors ?? 0) > 0) return "warning";
  return "done";
}

/**
 * Lý do KHÔNG được bấm chạy (khoá i18n), `null` = được chạy. Dry-run chỉ cần key +
 * shop (BE cho chạy khi cờ tắt); đồng bộ ghi cần thêm PANCAKE_POS_ENABLED.
 */
export function blockReason(
  status: PancakePosStatus | undefined,
  mode: PancakePosSyncMode,
): string | null {
  if (!status) return "pancakePos.block.loading";
  if (status.active_run_id) return "pancakePos.block.running";
  if (!status.api_key_set) return "pancakePos.block.noKey";
  if (!status.shop_id) return "pancakePos.block.noShop";
  if (mode === "full" && !status.enabled) return "pancakePos.block.disabled";
  return null;
}

/** Có lượt nào đang chạy (để bật polling). */
export function hasRunningRun(
  runs: Pick<PancakePosSyncRun, "finished_at">[] | undefined,
  status?: PancakePosStatus,
): boolean {
  return Boolean(status?.active_run_id) || (runs ?? []).some((run) => !run.finished_at);
}

/** Lý do loại (mã BE) → sắp theo số lượng giảm dần. */
export function sortedReasons(ineligible: Record<string, number> | undefined): [string, number][] {
  return Object.entries(ineligible ?? {}).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}
