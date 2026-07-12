/**
 * Dexie (IndexedDB) database for SeatAI.
 *
 * Provides an async key-value store that replaces localStorage as the
 * Zustand persist backend, removing the 5 MB browser limit that would
 * otherwise cap the number of classes a teacher can save.
 */
import Dexie from 'dexie';
import type { StateStorage } from 'zustand/middleware';

// ─── Schema ────────────────────────────────────────────────────────────────

interface KVEntry {
  key: string;
  value: string;
}

class SeatAIDatabase extends Dexie {
  kv!: Dexie.Table<KVEntry, string>;

  constructor() {
    super('seatai-db-v1');
    this.version(1).stores({
      kv: 'key',
    });
  }
}

export const db = new SeatAIDatabase();

// ─── Zustand StateStorage adapter ──────────────────────────────────────────

// Persisted state bundles the (potentially large) `projects` blob together with
// frequently-toggled view prefs (zoom, heat-map, view mode). Zustand persists
// on any change to a persisted field, so without coalescing, one zoom click
// JSON-stringifies and writes every saved class. Debounce writes per key and
// flush on hide so rapid toggles collapse into a single write. The trade-off:
// a change made < DEBOUNCE_MS before an unexpected crash isn't durable — fine
// for a local convenience tool, and the hide-flush covers normal navigation.
const WRITE_DEBOUNCE_MS = 400;
const pendingWrites = new Map<string, string>();
const flushTimers = new Map<string, ReturnType<typeof setTimeout>>();

async function flushKey(name: string): Promise<void> {
  const timer = flushTimers.get(name);
  if (timer) {
    clearTimeout(timer);
    flushTimers.delete(name);
  }
  if (!pendingWrites.has(name)) return;
  const value = pendingWrites.get(name)!;
  pendingWrites.delete(name);
  try {
    await db.kv.put({ key: name, value });
  } catch {
    try {
      localStorage.setItem(name, value);
    } catch {
      /* storage unavailable — best effort */
    }
  }
}

function flushAll(): void {
  for (const name of [...pendingWrites.keys()]) void flushKey(name);
}

/** Await all buffered writes (test hook / explicit flush). */
export async function flushPendingWrites(): Promise<void> {
  await Promise.all([...pendingWrites.keys()].map((name) => flushKey(name)));
}

/** Drop buffered writes without persisting them (test isolation hook). */
export function __clearPendingWrites(): void {
  for (const timer of flushTimers.values()) clearTimeout(timer);
  flushTimers.clear();
  pendingWrites.clear();
}

// Persist any buffered write before the tab goes away.
if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', flushAll);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushAll();
  });
}

export const dexieStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    // A not-yet-flushed write is the freshest value — return it so a read that
    // races a debounced write doesn't see a stale entry.
    if (pendingWrites.has(name)) return pendingWrites.get(name)!;
    try {
      const entry = await db.kv.get(name);
      if (entry) return entry.value;
      // Dexie has no entry yet. This is the first read after an upgrade from
      // the old localStorage backend: `migrateFromLocalStorage` runs
      // fire-and-forget at startup, so Zustand's async hydration can win the
      // race and read Dexie before the migration write lands. Falling back to
      // any legacy localStorage value here prevents a one-load "all my classes
      // vanished" flash; the migration then copies it into Dexie and clears it.
      return localStorage.getItem(name);
    } catch {
      // Fall back gracefully if IndexedDB is unavailable (e.g. private mode iOS)
      return localStorage.getItem(name);
    }
  },

  setItem: async (name: string, value: string): Promise<void> => {
    // Buffer the latest value and (re)arm a trailing flush; rapid successive
    // writes to the same key collapse into one Dexie put.
    pendingWrites.set(name, value);
    const existing = flushTimers.get(name);
    if (existing) clearTimeout(existing);
    flushTimers.set(name, setTimeout(() => void flushKey(name), WRITE_DEBOUNCE_MS));
  },

  removeItem: async (name: string): Promise<void> => {
    pendingWrites.delete(name);
    const timer = flushTimers.get(name);
    if (timer) {
      clearTimeout(timer);
      flushTimers.delete(name);
    }
    try {
      await db.kv.delete(name);
    } catch {
      localStorage.removeItem(name);
    }
  },
};

// ─── One-time migration: localStorage → Dexie ──────────────────────────────

/**
 * If the old localStorage key exists and Dexie has no entry for it yet,
 * copy the data over and remove the original.  Call this once on app start.
 */
export async function migrateFromLocalStorage(key: string): Promise<void> {
  try {
    const existing = await db.kv.get(key);
    if (existing) return; // Already migrated

    const legacy = localStorage.getItem(key);
    if (!legacy) return;

    await db.kv.put({ key, value: legacy });
    localStorage.removeItem(key);
  } catch {
    // Ignore — keeps old localStorage data intact as fallback
  }
}
