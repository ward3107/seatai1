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

export const dexieStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    try {
      const entry = await db.kv.get(name);
      return entry?.value ?? null;
    } catch {
      // Fall back gracefully if IndexedDB is unavailable (e.g. private mode iOS)
      return localStorage.getItem(name);
    }
  },

  setItem: async (name: string, value: string): Promise<void> => {
    try {
      await db.kv.put({ key: name, value });
    } catch {
      localStorage.setItem(name, value);
    }
  },

  removeItem: async (name: string): Promise<void> => {
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
