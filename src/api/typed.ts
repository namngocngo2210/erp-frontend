/**
 * Typed API client (D9 — xem docs/tech-stack-evolution-2026.md).
 *
 * Type request/response được SINH TỰ ĐỘNG từ hợp đồng OpenAPI của backend
 * (`schema.d.ts`, regen bằng `npm run gen:api`). Đổi field ở BE → `tsc` đỏ ở FE.
 *
 * Cố ý KHÔNG dùng `openapi-fetch`: transport vẫn là {@link fetchJson} hiện có vì
 * nó đã gói toàn bộ logic auth (access token in-memory, refresh qua cookie
 * httpOnly, retry 401). openapi-fetch sẽ bỏ qua lớp này. Ở đây ta chỉ phủ TYPE
 * lên trên fetchJson, không thay hành vi runtime.
 */
import type { paths } from "./schema";
import { fetchJson } from "@/services/http";

export type { components, paths } from "./schema";

type HttpMethod = "get" | "post" | "put" | "patch" | "delete";

/**
 * Response JSON cho cặp (path, method) — suy ra từ hợp đồng OpenAPI.
 *
 * Ưu tiên nhánh `200`; nếu operation chỉ khai `201` (các endpoint create của
 * DRF) thì rơi xuống nhánh `201` — trước đây các case này suy ra `unknown`
 * nên hàng loạt module phải giữ `fetchJson` (xem ghi chú cũ ở
 * `bestExpress.ts`/`hr-attendance.ts`).
 */
type JsonResponse<P extends keyof paths, M extends HttpMethod> =
  paths[P] extends Record<M, { responses: infer R }>
    ? R extends { 200: { content: { "application/json": infer T } } }
      ? T
      : R extends { 201: { content: { "application/json": infer T } } }
        ? T
        : unknown
    : unknown;

/**
 * Bỏ các field `readonly` khỏi kiểu body: DRF khai `id`/`code`/`created_at`…
 * là read-only nhưng openapi-typescript vẫn sinh chúng REQUIRED trong schema
 * dùng làm requestBody (vd `KshipSenderAddress`), khiến mọi create/update đúng
 * hợp đồng vẫn đỏ tsc. Kỹ thuật so sánh `{readonly K}` với `{-readonly K}`.
 */
type IfEquals<X, Y, A, B> =
  (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2 ? A : B;
type WritableKeys<T> = {
  [K in keyof T]-?: IfEquals<{ [Q in K]: T[K] }, { -readonly [Q in K]: T[K] }, K, never>;
}[keyof T];
type Writable<T> = T extends object ? Pick<T, WritableKeys<T>> : T;

/** Request body JSON cho cặp (path, method) — đã bỏ field readonly. */
type JsonBody<P extends keyof paths, M extends HttpMethod> =
  paths[P] extends Record<M, { requestBody?: { content: { "application/json": infer B } } }>
    ? Writable<B>
    : never;

/** GET có type theo path OpenAPI. */
export async function apiGet<P extends Extract<keyof paths, string>>(
  path: P,
): Promise<JsonResponse<P, "get">> {
  return fetchJson(path) as Promise<JsonResponse<P, "get">>;
}

/** POST có type theo path OpenAPI: body và kết quả đều khớp hợp đồng. */
export async function apiPost<P extends Extract<keyof paths, string>>(
  path: P,
  body: JsonBody<P, "post">,
): Promise<JsonResponse<P, "post">> {
  return fetchJson(path, {
    method: "POST",
    body: JSON.stringify(body),
  }) as Promise<JsonResponse<P, "post">>;
}

/** PUT có type theo path OpenAPI. */
export async function apiPut<P extends Extract<keyof paths, string>>(
  path: P,
  body: JsonBody<P, "put">,
): Promise<JsonResponse<P, "put">> {
  return fetchJson(path, { method: "PUT", body: JSON.stringify(body) }) as Promise<
    JsonResponse<P, "put">
  >;
}

/** PATCH có type theo path OpenAPI. */
export async function apiPatch<P extends Extract<keyof paths, string>>(
  path: P,
  body: JsonBody<P, "patch">,
): Promise<JsonResponse<P, "patch">> {
  return fetchJson(path, { method: "PATCH", body: JSON.stringify(body) }) as Promise<
    JsonResponse<P, "patch">
  >;
}

/** DELETE có type theo path OpenAPI. */
export async function apiDelete<P extends Extract<keyof paths, string>>(
  path: P,
): Promise<JsonResponse<P, "delete">> {
  return fetchJson(path, { method: "DELETE" }) as Promise<JsonResponse<P, "delete">>;
}
