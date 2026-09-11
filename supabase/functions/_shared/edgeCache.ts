// Simple per-instance in-memory response cache for API-Football backed
// edge functions. Keeps identical requests from re-hitting the provider
// (and burning the daily quota) within a short TTL window.

interface Entry {
  at: number;
  ttl: number;
  payload: unknown;
}

const store = new Map<string, Entry>();
const inflight = new Map<string, Promise<unknown>>();

export function getCached<T>(key: string): T | null {
  const hit = store.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > hit.ttl) {
    store.delete(key);
    return null;
  }
  return hit.payload as T;
}

export function setCached(key: string, payload: unknown, ttlMs: number) {
  store.set(key, { at: Date.now(), ttl: ttlMs, payload });
  // Keep memory bounded per instance.
  if (store.size > 500) {
    const oldest = [...store.entries()].sort((a, b) => a[1].at - b[1].at)[0];
    if (oldest) store.delete(oldest[0]);
  }
}

/**
 * Cache-aside helper with in-flight de-duplication:
 * concurrent requests for the same key share a single upstream fetch.
 */
export async function cached<T>(key: string, ttlMs: number, produce: () => Promise<T>): Promise<T> {
  const hit = getCached<T>(key);
  if (hit !== null) return hit;

  const existing = inflight.get(key) as Promise<T> | undefined;
  if (existing) return existing;

  const p = (async () => {
    const value = await produce();
    setCached(key, value, ttlMs);
    return value;
  })().finally(() => inflight.delete(key));

  inflight.set(key, p);
  return p;
}
