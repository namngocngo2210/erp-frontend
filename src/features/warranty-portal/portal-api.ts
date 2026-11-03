import type { ActivateResponse, TrackResponse } from "./types";

const BASE = "/api/warranty-portal";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");

  // eslint-disable-next-line no-restricted-globals -- portal domain has no /api/users/token/refresh route; fetchJson would call it and break
  const response = await fetch(`${BASE}${path}`, { ...init, headers });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const error = Object.assign(
      new Error((body?.detail as string) ?? "Có lỗi xảy ra, vui lòng thử lại."),
      { status: response.status, code: body?.code as string | undefined },
    );
    throw error;
  }
  return body as T;
}

export async function activate(payload: {
  keyword: string;
  phone: string;
}): Promise<ActivateResponse> {
  return request<ActivateResponse>("/activate", {
    method: "POST",
    body: JSON.stringify({ ...payload, channel: "web" }),
  });
}

/**
 * Từ bản sửa đổi 24/08 chỉ cần MỘT trong `shipping_code`/`phone`. `order_code`
 * dùng riêng cho bước khách chọn một đơn từ danh sách trả về khi tra bằng SĐT.
 */
export async function track(payload: {
  shipping_code?: string;
  order_code?: string;
  phone?: string;
}): Promise<TrackResponse> {
  return request<TrackResponse>("/track", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
