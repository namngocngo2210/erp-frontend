// Dải ký tự dấu tổ hợp (combining diacritical marks) sinh ra sau khi normalize NFD.
const COMBINING_MARKS = new RegExp("[\\u0300-\\u036f]", "g");

/**
 * Chuẩn hoá chuỗi để so khớp tìm kiếm phía client: bỏ dấu tiếng Việt, quy đổi
 * đ/Đ về d, hạ chữ thường và gộp khoảng trắng. Nhờ vậy "kenh a" khớp "Kênh A".
 */
export function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(COMBINING_MARKS, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Khớp khi mọi token của `term` xuất hiện trong ít nhất một trường (AND theo
 * token). Các trường được nối bằng dấu phân cách nên một cụm từ không thể
 * "vắt" qua hai trường khác nhau.
 */
export function matchesSearchTerm(term: string, fields: Array<string | null | undefined>): boolean {
  const normalizedTerm = normalizeSearchText(term);
  if (!normalizedTerm) return true;

  const haystack = fields
    .filter((field): field is string => Boolean(field))
    .map(normalizeSearchText)
    .join(" | ");

  return normalizedTerm.split(" ").every((token) => haystack.includes(token));
}
