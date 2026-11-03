import type { ProductPageResponse } from "./product-types";

const BASE = "/api/warranty-portal";

/** Tách mã từ đường dẫn `/sp/<mã>`. Trả rỗng nếu không có mã. */
export function extractCodeFromPath(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length < 2 || segments[0].toLowerCase() !== "sp") return "";
  return segments[1].trim().toUpperCase();
}

export async function fetchProductPage(code: string): Promise<ProductPageResponse> {
  // eslint-disable-next-line no-restricted-globals -- portal domain has no /api/users/token/refresh route; fetchJson would call it and break
  const response = await fetch(`${BASE}/products/${encodeURIComponent(code)}`);
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw Object.assign(new Error((body?.detail as string) ?? "Có lỗi xảy ra, vui lòng thử lại."), {
      status: response.status,
      code: body?.code as string | undefined,
    });
  }
  return body as ProductPageResponse;
}
