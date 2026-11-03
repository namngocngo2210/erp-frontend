/**
 * Normalise a list-ish API response into a plain array.
 *
 * The backend returns collections in a few shapes — a bare array, or an object
 * wrapping the rows under `results` / `items` / `data`. This helper unwraps all
 * of them so callers don't reimplement the same `Array.isArray(x.results)`
 * ladder (previously duplicated across features and api modules).
 */
export function extractListPayload<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === "object") {
    const objectPayload = payload as { results?: unknown; items?: unknown; data?: unknown };
    if (Array.isArray(objectPayload.results)) return objectPayload.results as T[];
    if (Array.isArray(objectPayload.items)) return objectPayload.items as T[];
    if (Array.isArray(objectPayload.data)) return objectPayload.data as T[];
  }
  return [];
}
