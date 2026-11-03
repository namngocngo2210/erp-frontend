import { apiGet, apiPut, type components } from "@/api/typed";

export type ProductComponentRow = components["schemas"]["ProductComponentRow"];
/** Derive từ schema `ProductComponentInput` (trước đây khai tay trùng shape). */
export type ProductComponentInput = components["schemas"]["ProductComponentInput"];

export async function getProductComponents(productId: number): Promise<ProductComponentRow[]> {
  return apiGet(
    `/api/orders/products/${productId}/components` as "/api/orders/products/{product_id}/components",
  );
}

export async function putProductComponents(
  productId: number,
  rows: ProductComponentInput[],
): Promise<ProductComponentRow[]> {
  return apiPut(
    `/api/orders/products/${productId}/components` as "/api/orders/products/{product_id}/components",
    { components: rows },
  );
}
