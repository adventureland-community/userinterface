/**
 * Bound Map cache keyed by id, invalidated when a fingerprint changes.
 * Drops the oldest entry when full (insertion order).
 */

export type FpCache<T> = {
  get: (id: string, fp: string) => T | undefined;
  set: (id: string, fp: string, value: T) => void;
  delete: (id: string) => void;
};

export function createFpCache<T>(max: number): FpCache<T> {
  const map = new Map<string, { fp: string; value: T }>();
  return {
    get(id: string, fp: string): T | undefined {
      const hit = map.get(id);
      if (hit && hit.fp === fp) return hit.value;
      return undefined;
    },
    set(id: string, fp: string, value: T): void {
      if (map.size >= max && !map.has(id)) {
        const oldest = map.keys().next().value;
        if (oldest != null) map.delete(oldest);
      }
      map.set(id, { fp, value });
    },
    delete(id: string): void {
      map.delete(id);
    },
  };
}
