export type PortalWarranty = {
  serial: string;
  code: string;
  product_sku: string;
  product_name: string;
  activated_at: string;
  expires_at: string;
  days_left: number;
  months: number;
};

export type PortalOrderItem = { sku: string; name: string; quantity: number };

export type PortalJourneyEvent = { at: string; label: string; group: string };

export type ActivateResponse = { warranty: PortalWarranty };

export type TrackOrder = {
  order_code: string;
  invoice_code: string;
  shipping_code: string;
  created_at: string;
  status: number;
  status_label: string;
  customer_name: string;
  phone: string;
  province: string;
  items: PortalOrderItem[];
};

/** Một đơn duy nhất khớp điều kiện tra cứu → trả kèm hành trình. */
export type TrackDetailResponse = {
  order: TrackOrder;
  journey: { results: PortalJourneyEvent[]; source: string };
};

/**
 * Nhiều đơn khớp (tra bằng SĐT) → chỉ danh sách tóm tắt, KHÔNG có hành trình:
 * backend dựng hành trình tốn thêm query cho từng đơn nên chỉ dựng khi khách đã
 * chọn một đơn cụ thể. `truncated` = còn đơn cũ hơn bị cắt khỏi danh sách.
 */
export type TrackListResponse = { orders: TrackOrder[]; truncated: boolean };

export type TrackResponse = TrackDetailResponse | TrackListResponse;

export function isTrackList(data: TrackResponse): data is TrackListResponse {
  return "orders" in data;
}
