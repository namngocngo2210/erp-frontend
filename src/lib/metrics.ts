/**
 * Generic metric/percentage formatting shared across report dashboards.
 * Pure functions — no React, no domain types — so any report page can reuse
 * them instead of redefining percent/short-number helpers locally.
 */

/** "12.3%" — or "—" when the denominator is non-positive. */
export function formatPercent(numerator: number, denominator: number): string {
  if (denominator <= 0) return "—";
  return `${((numerator / denominator) * 100).toFixed(1)}%`;
}

/** Raw percentage number, or null when the denominator is non-positive. */
export function percentValue(numerator: number, denominator: number): number | null {
  if (denominator <= 0) return null;
  return (numerator / denominator) * 100;
}

/** Percentage rounded to 1 decimal, 0 when the denominator is non-positive. */
export function safePercent(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return Number(((numerator / denominator) * 100).toFixed(1));
}

/** Compact currency/number label: 1.2B / 3.4M / 56K / raw. */
export function formatRevenueShort(value: number): string {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return String(value);
}
