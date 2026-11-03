import { apiGet, apiPost, type components } from "@/api/typed";

/**
 * Types sinh từ hợp đồng OpenAPI (`schema.d.ts`, regen bằng `npm run gen:api`).
 * Payload Order/Add là DictField passthrough phía BE (Best validate) — FE build
 * object theo tài liệu Best V3, xem `best-order-form.ts`.
 */
export type BestAccount = components["schemas"]["BestAccount"];
export type BestShipment = components["schemas"]["BestShipment"];
export type CreateBestShipmentRequest = components["schemas"]["CreateShipmentRequest"];

/** GET /api/best-express/accounts — danh sách tài khoản Best (không chứa secret). */
export async function listBestAccounts(): Promise<BestAccount[]> {
  return apiGet("/api/best-express/accounts");
}

/**
 * POST /api/best-express/shipments — tạo vận đơn thật phía Best.
 * Operation chỉ khai `201` — `apiPost` nay suy được kiểu từ nhánh 201.
 */
export async function createBestShipment(body: CreateBestShipmentRequest): Promise<BestShipment> {
  return apiPost("/api/best-express/shipments", body);
}
