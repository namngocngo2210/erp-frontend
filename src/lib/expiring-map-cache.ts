/**
 * Tiny TTL + LRU helpers over a plain `Map`, used for in-memory client caches
 * (e.g. address-catalog lookups). Generic and side-effect-free beyond the Map
 * passed in, so they unit-test without React. Extracted from use-orders-data.ts.
 */

export type ExpiringMapEntry<T> = {
  value: T;
  expiresAt: number;
};

/** Drop every entry whose TTL has elapsed. */
export function pruneExpiredMapEntries<T>(
  cache: Map<string, ExpiringMapEntry<T>>,
  now = Date.now(),
): void {
  for (const [key, entry] of cache.entries()) {
    if (entry.expiresAt <= now) {
      cache.delete(key);
    }
  }
}

/** Return a still-fresh value (touching it for LRU order), or null if missing/expired. */
export function getFreshMapEntryValue<T>(
  cache: Map<string, ExpiringMapEntry<T>>,
  key: string,
  now = Date.now(),
): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= now) {
    cache.delete(key);
    return null;
  }
  // Touch entry to keep Map insertion order as lightweight LRU.
  cache.delete(key);
  cache.set(key, entry);
  return entry.value;
}

/** Insert/refresh an entry with a TTL, evicting the oldest while over `maxEntries`. */
export function setMapCacheWithLimit<T>(
  cache: Map<string, ExpiringMapEntry<T>>,
  key: string,
  value: T,
  ttlMs: number,
  maxEntries: number,
  now = Date.now(),
): void {
  cache.delete(key);
  cache.set(key, { value, expiresAt: now + ttlMs });
  while (cache.size > maxEntries) {
    const oldestKey = cache.keys().next().value;
    if (!oldestKey) break;
    cache.delete(oldestKey);
  }
}
