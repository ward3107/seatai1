/**
 * @vitest-environment node
 *
 * Unit tests for the in-memory fallback path of the KV store (no KV env vars
 * configured, so it uses the per-instance map). Covers the two primitives:
 * single-use claim and TTL-windowed increment.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { claimOnce, incrWithTtl, __resetMemStore } from './kvStore';

describe('kvStore (in-memory fallback)', () => {
  beforeEach(() => {
    __resetMemStore();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
  });
  afterEach(() => vi.useRealTimers());

  describe('claimOnce', () => {
    it('returns true the first time and false on replay within the TTL', async () => {
      expect(await claimOnce('nonce:abc', 60_000)).toBe(true);
      expect(await claimOnce('nonce:abc', 60_000)).toBe(false);
      expect(await claimOnce('nonce:abc', 60_000)).toBe(false);
    });

    it('lets a key be claimed again once its TTL has elapsed', async () => {
      expect(await claimOnce('nonce:xyz', 60_000)).toBe(true);
      vi.advanceTimersByTime(60_001);
      expect(await claimOnce('nonce:xyz', 60_000)).toBe(true);
    });

    it('tracks distinct keys independently', async () => {
      expect(await claimOnce('a', 60_000)).toBe(true);
      expect(await claimOnce('b', 60_000)).toBe(true);
      expect(await claimOnce('a', 60_000)).toBe(false);
    });
  });

  describe('incrWithTtl', () => {
    it('counts up within the window', async () => {
      expect(await incrWithTtl('rl:ip', 60_000)).toBe(1);
      expect(await incrWithTtl('rl:ip', 60_000)).toBe(2);
      expect(await incrWithTtl('rl:ip', 60_000)).toBe(3);
    });

    it('resets the count once the window expires', async () => {
      expect(await incrWithTtl('rl:ip', 60_000)).toBe(1);
      expect(await incrWithTtl('rl:ip', 60_000)).toBe(2);
      vi.advanceTimersByTime(60_001);
      expect(await incrWithTtl('rl:ip', 60_000)).toBe(1);
    });
  });
});
