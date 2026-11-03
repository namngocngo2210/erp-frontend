// eslint-disable-next-line no-restricted-imports -- nợ typed client (audit 2026-09-23 P1-2): còn 1 call fetchJson, migrate dần sang @/api/typed
import { fetchJson } from "@/services/http";
import type { components } from "@/api/typed";

const API_BASE = "/api/warranty";

/** Type derive từ hợp đồng OpenAPI (D9) — schema `WarrantyRegistration`. */
export type WarrantySource = components["schemas"]["WarrantyRegistrationSourceEnum"];

export type WarrantyPayload = Pick<
  components["schemas"]["WarrantyRegistration"],
  "source" | "invoice_code" | "full_name" | "phone"
> & {
  email: string;
  note: string;
};

export type WarrantyResponse = components["schemas"]["WarrantyRegistration"];

export async function submitWarranty(payload: WarrantyPayload): Promise<WarrantyResponse> {
  return fetchJson(API_BASE, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
