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

  describe('claimOnce with a configured-but-erroring KV backend', () => {
    beforeEach(() => {
      process.env.KV_REST_API_URL = 'https://kv.test';
      process.env.KV_REST_API_TOKEN = 'tok';
      // Every KV REST call fails, simulating a KV outage.
      vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('KV down'); }));
    });
    afterEach(() => {
      delete process.env.KV_REST_API_URL;
      delete process.env.KV_REST_API_TOKEN;
      vi.unstubAllGlobals();
    });

    it('non-strict falls back to the in-memory claim (availability)', async () => {
      expect(await claimOnce('nonce:soft', 60_000)).toBe(true);
    });

    it('strict fails closed by throwing instead of downgrading (no fail-open)', async () => {
      await expect(claimOnce('nonce:hard', 60_000, { strict: true })).rejects.toThrow(/KV down/);
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
