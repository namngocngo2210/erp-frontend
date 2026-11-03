import type { components } from "@/api/typed";

/**
 * Derive từ hợp đồng OpenAPI (WP6.2 T5) — schema đã có đủ WarrantyClaim /
 * WarrantyClaimOrder / WarrantyClaimListResponse / OrderSearchResult.
 * Giữ nguyên tên type export (nhiều component đang import).
 */

/** 1..12 — derive qua field `status` để không phụ thuộc tên enum sinh tự động. */
export type WarrantyClaimStatus = components["schemas"]["WarrantyClaim"]["status"];

/** Bộ trạng thái phiếu theo flow CSKH — thứ tự mảng là thứ tự flow (mã 12 thêm sau). */
export const WARRANTY_STATUS_OPTIONS: { value: WarrantyClaimStatus; label: string }[] = [
  { value: 1, label: "Đợi khách XN" },
  { value: 2, label: "Chờ tạo đơn" },
  { value: 3, label: "Chờ vận chuyển" },
  // Mã 12 thêm sau, xếp theo flow ngay sau "Chờ vận chuyển".
  { value: 12, label: "Đang vận chuyển" },
  { value: 4, label: "Đang sửa chữa" },
  { value: 5, label: "Chờ chốt phương án" },
  { value: 6, label: "Chờ tạo đơn gửi lại" },
  { value: 7, label: "Đang gửi lại khách" },
  { value: 8, label: "Xin feedback" },
  { value: 9, label: "Hoàn thành" },
  { value: 10, label: "Thất lạc" },
  { value: 11, label: "Hủy" },
];

export type OrderSearchResult = components["schemas"]["OrderSearchResult"];

export type WarrantyClaimOrder = components["schemas"]["WarrantyClaimOrder"];

export type WarrantyClaim = components["schemas"]["WarrantyClaim"];

export type WarrantyJourney = components["schemas"]["WarrantyJourney"];

/**
 * Payload update/create hành trình — alias thẳng schema Write của backend
 * (`PatchedWarrantyJourneyWrite`, mọi field optional). KHÔNG tự derive từ
 * `WarrantyJourney` (read type): read type khiến mọi field `readonly` (form
 * không gán được `patch.receiver_name = ...` → TS2540) và 7 field enum thiếu
 * `BlankEnum` nên không set về `""` để bỏ chọn được (TS2322).
 */
export type WarrantyJourneyPayload = components["schemas"]["PatchedWarrantyJourneyWrite"];

/**
 * Payload create/patch phiếu — giữ local (KHÔNG alias `WarrantyClaimWrite`):
 * shape mới chỉ còn 3 field cấp phiếu, phần nghiệp vụ chi tiết đã chuyển
 * xuống `WarrantyJourneyPayload` theo từng hành trình.
 */
export interface WarrantyClaimPayload {
  order_id?: number;
  customer_report_date?: string | null;
  activation_date?: string | null;
  warranty_months?: number;
  status?: WarrantyClaimStatus;
}

export interface WarrantyClaimListParams {
  q?: string;
  status?: WarrantyClaimStatus | null;
  limit: number;
  offset: number;
}

export type WarrantyClaimListResponse = components["schemas"]["WarrantyClaimListResponse"];
