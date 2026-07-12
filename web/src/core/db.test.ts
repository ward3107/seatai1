/**
 * Tests for the Dexie storage adapter + localStorage migration.
 *
 * jsdom has no IndexedDB, so rather than pull in a fake we drive `db.kv`
 * through spies: an in-memory Map stands in for the happy path, and
 * throwing spies exercise the localStorage fallback. That covers the branches
 * that actually matter — graceful degradation and one-time migration — without
 * a real IndexedDB.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { db, dexieStorage, migrateFromLocalStorage, flushPendingWrites, __clearPendingWrites } from './db';

// Dexie's table methods return a PromiseExtended; the spies return plain
// Promises, so cast each spy to a loose mock to keep TS happy.
const spy = (method: 'get' | 'put' | 'delete') =>
  vi.spyOn(db.kv, method) as unknown as ReturnType<typeof vi.fn>;

/** Back db.kv with a Map so the adapter's Dexie path works in jsdom. */
function stubKvWithMap(initial: Record<string, string> = {}) {
  const store = new Map<string, string>(Object.entries(initial));
  spy('get').mockImplementation(async (k: string) =>
    store.has(k) ? { key: k, value: store.get(k)! } : undefined,
  );
  spy('put').mockImplementation(async (e: { key: string; value: string }) => {
    store.set(e.key, e.value);
    return e.key;
  });
  spy('delete').mockImplementation(async (k: string) => {
    store.delete(k);
  });
  return store;
}

/** Make every db.kv call throw, forcing the localStorage fallback. */
function stubKvThrows() {
  const boom = () => { throw new Error('IndexedDB unavailable'); };
  spy('get').mockImplementation(boom);
  spy('put').mockImplementation(boom);
  spy('delete').mockImplementation(boom);
}

beforeEach(() => {
  __clearPendingWrites();
  localStorage.clear();
});
afterEach(() => vi.restoreAllMocks());

describe('dexieStorage (Dexie path)', () => {
  it('round-trips set → get → remove', async () => {
    const store = stubKvWithMap();
    expect(await dexieStorage.getItem('seatai')).toBeNull();

    // A buffered write is readable immediately (pending-value read)…
    await dexieStorage.setItem('seatai', '{"a":1}');
    expect(await dexieStorage.getItem('seatai')).toBe('{"a":1}');
    // …and lands in Dexie once flushed.
    await flushPendingWrites();
    expect(store.get('seatai')).toBe('{"a":1}');
    expect(await dexieStorage.getItem('seatai')).toBe('{"a":1}');

    await dexieStorage.removeItem('seatai');
    expect(await dexieStorage.getItem('seatai')).toBeNull();
  });

  it('coalesces rapid writes to the same key into one flush', async () => {
    const store = stubKvWithMap();
    const putSpy = db.kv.put as unknown as ReturnType<typeof vi.fn>;
    await dexieStorage.setItem('seatai', 'a');
    await dexieStorage.setItem('seatai', 'b');
    await dexieStorage.setItem('seatai', 'c');
    expect(putSpy).not.toHaveBeenCalled(); // nothing written yet — debounced
    await flushPendingWrites();
    expect(putSpy).toHaveBeenCalledTimes(1); // only the final value is written
    expect(store.get('seatai')).toBe('c');
  });

  it('does not touch localStorage on the happy path', async () => {
    stubKvWithMap();
    await dexieStorage.setItem('seatai', 'v');
    await flushPendingWrites();
    expect(localStorage.getItem('seatai')).toBeNull();
  });
});

describe('dexieStorage (localStorage fallback)', () => {
  it('reads and writes localStorage when IndexedDB throws', async () => {
    stubKvThrows();
    await dexieStorage.setItem('seatai', 'fallback-value');
    await flushPendingWrites();
    expect(localStorage.getItem('seatai')).toBe('fallback-value');
    expect(await dexieStorage.getItem('seatai')).toBe('fallback-value');

    await dexieStorage.removeItem('seatai');
    expect(localStorage.getItem('seatai')).toBeNull();
    expect(await dexieStorage.getItem('seatai')).toBeNull();
  });
});

describe('migrateFromLocalStorage', () => {
  it('copies a legacy value into Dexie and clears localStorage', async () => {
    const store = stubKvWithMap();
    localStorage.setItem('seatai', 'legacy-data');

    await migrateFromLocalStorage('seatai');

    expect(store.get('seatai')).toBe('legacy-data');
    expect(localStorage.getItem('seatai')).toBeNull();
  });

  it('is a no-op when Dexie already has the key (keeps localStorage intact)', async () => {
    const store = stubKvWithMap({ seatai: 'already-here' });
    localStorage.setItem('seatai', 'legacy-data');
    const putSpy = db.kv.put as unknown as ReturnType<typeof vi.fn>;
    putSpy.mockClear();

    await migrateFromLocalStorage('seatai');

    expect(store.get('seatai')).toBe('already-here'); // unchanged
    expect(putSpy).not.toHaveBeenCalled();
    expect(localStorage.getItem('seatai')).toBe('legacy-data'); // left as fallback
  });

  it('does nothing when there is no legacy value', async () => {
    stubKvWithMap();
    const putSpy = db.kv.put as unknown as ReturnType<typeof vi.fn>;
    putSpy.mockClear();

    await migrateFromLocalStorage('seatai');

    expect(putSpy).not.toHaveBeenCalled();
  });

  it('swallows errors and leaves localStorage untouched', async () => {
    stubKvThrows();
    localStorage.setItem('seatai', 'legacy-data');

    await expect(migrateFromLocalStorage('seatai')).resolves.toBeUndefined();
    expect(localStorage.getItem('seatai')).toBe('legacy-data');
  });
});
