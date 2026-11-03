/**
 * Pure input normalisers for order forms / payloads. No types beyond primitives,
 * so they unit-test trivially. Extracted from use-orders-data.ts.
 */

// normalizePhone (chỉ giữ chữ số) đã gom về @/lib/phone dưới tên `phoneDigits`.

/**
 * VN-style grouped number: dots as thousand separators (every dot-group is exactly
 * 3 digits), optional decimal comma — "2.500.000", "2.500.000,5", "1.234,56".
 * The integer head must not start with 0 so "0.500" (0.5 kg) stays a decimal.
 */
const VN_GROUPED_PATTERN = /^(-?)([1-9]\d*(?:\.\d{3})+)(?:,(\d+))?$/;

/**
 * Normalise a free-typed decimal string: drop thousands separators / junk, keep one dot.
 *
 * Separator rules (đặc tả đầy đủ trong order-normalizers.test.ts):
 * - VN style — mọi nhóm sau dấu chấm đúng 3 chữ số → chấm là phân cách nghìn,
 *   phẩy (nếu có, đứng cuối) là thập phân: "2.500.000" → "2500000", "2.500.000,5" → "2500000.5".
 * - Ngược lại (US / legacy) — phẩy là phân cách nghìn (bỏ hết), dấu chấm là thập phân;
 *   nhiều dấu chấm gộp thành một phần thập phân ("1.2.3" → "1.23").
 */
export function normalizeDecimalInput(value: string): string {
  const cleaned = String(value || "").trim();
  if (!cleaned) return "";
  const compact = cleaned.replace(/[^\d.,-]/g, "");

  const vnGrouped = VN_GROUPED_PATTERN.exec(compact);
  if (vnGrouped) {
    const [, sign, groupedInteger, decimalPart] = vnGrouped;
    const integer = groupedInteger.replace(/\./g, "");
    return decimalPart ? `${sign}${integer}.${decimalPart}` : `${sign}${integer}`;
  }

  const withoutInvalidChars = compact.replace(/,/g, "").replace(/[^\d.-]/g, "");
  const negative = withoutInvalidChars.startsWith("-") ? "-" : "";
  const unsigned = withoutInvalidChars.replace(/-/g, "");
  const [integerPart = "", ...fractionParts] = unsigned.split(".");
  const fractionPart = fractionParts.join("");
  return fractionPart ? `${negative}${integerPart}.${fractionPart}` : `${negative}${integerPart}`;
}

/** Split a "LxWxH" dimensions string into a 3-tuple (accepts x / X / × / * separators). */
export function parseDimensions(value: string | undefined): [string, string, string] {
  const raw = String(value || "").trim();
  if (!raw) return ["", "", ""];
  const tokens = raw
    .split(/(?:x|X|×|\*)/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 3);
  return [tokens[0] || "", tokens[1] || "", tokens[2] || ""];
}

/** Coerce a gender input to 0 (female) / 1 (male) / null (cleared) / undefined (leave as-is). */
export function normalizeCustomerGenderForPatch(value: unknown): 0 | 1 | null | undefined {
  if (value === null || value === undefined || value === "") return null;
  if (value === 0 || value === "0") return 0;
  if (value === 1 || value === "1") return 1;

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "female") return 0;
    if (normalized === "male") return 1;
  }

  return undefined;
}
