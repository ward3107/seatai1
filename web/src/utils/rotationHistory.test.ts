import { describe, it, expect } from 'vitest';
import {
  getNeighborHistory,
  getRecentPairPenalties,
  getRotationStats,
  relativeTime,
} from './rotationHistory';
import type { LayoutDef } from '../core/layouts';

const layout3x3: LayoutDef = { type: 'rows', rows: 3, cols: 3 };

const positionsAt = (entries: Array<[string, number, number]>) =>
  Object.fromEntries(entries.map(([id, row, col]) => [id, { row, col }]));

describe('getNeighborHistory', () => {
  it('returns [] when history is empty', () => {
    expect(getNeighborHistory('a', layout3x3, [])).toEqual([]);
  });

  it('returns [] when the student is absent from every snapshot', () => {
    const history = [
      {
        timestamp: '2026-05-01T10:00:00Z',
        positions: positionsAt([
          ['b', 0, 0],
          ['c', 0, 1],
        ]),
      },
    ];
    expect(getNeighborHistory('a', layout3x3, history)).toEqual([]);
  });

  it('reports an adjacent neighbor from a single snapshot', () => {
    const history = [
      {
        timestamp: '2026-05-10T09:00:00Z',
        positions: positionsAt([
          ['a', 0, 0],
          ['b', 0, 1], // direct right neighbor
          ['c', 2, 2], // far away
        ]),
      },
    ];
    const result = getNeighborHistory('a', layout3x3, history);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      otherId: 'b',
      lastAdjacentAt: '2026-05-10T09:00:00Z',
      timesAdjacent: 1,
    });
  });

  it('does not include non-adjacent students', () => {
    const history = [
      {
        timestamp: '2026-05-10T09:00:00Z',
        positions: positionsAt([
          ['a', 0, 0],
          ['b', 2, 2], // opposite corner, definitely not adjacent
        ]),
      },
    ];
    expect(getNeighborHistory('a', layout3x3, history)).toEqual([]);
  });

  it('never includes the queried student as their own neighbor', () => {
    const history = [
      {
        timestamp: '2026-05-10T09:00:00Z',
        positions: positionsAt([
          ['a', 1, 1],
          ['b', 1, 0],
        ]),
      },
    ];
    const result = getNeighborHistory('a', layout3x3, history);
    expect(result.find((r) => r.otherId === 'a')).toBeUndefined();
  });

  it('accumulates timesAdjacent across multiple snapshots', () => {
    const history = [
      // newest-first per the store's invariant
      {
        timestamp: '2026-05-12T09:00:00Z',
        positions: positionsAt([['a', 0, 0], ['b', 0, 1]]),
      },
      {
        timestamp: '2026-05-11T09:00:00Z',
        positions: positionsAt([['a', 0, 0], ['b', 0, 1]]),
      },
      {
        timestamp: '2026-05-10T09:00:00Z',
        positions: positionsAt([['a', 0, 0], ['b', 0, 1]]),
      },
    ];
    const result = getNeighborHistory('a', layout3x3, history);
    expect(result).toHaveLength(1);
    expect(result[0].timesAdjacent).toBe(3);
  });

  it('keeps the most recent timestamp when neighbors repeat (newest-first iteration)', () => {
    const history = [
      // Store invariant: newest first
      {
        timestamp: '2026-05-12T09:00:00Z',
        positions: positionsAt([['a', 0, 0], ['b', 0, 1]]),
      },
      {
        timestamp: '2026-05-01T09:00:00Z',
        positions: positionsAt([['a', 0, 0], ['b', 0, 1]]),
      },
    ];
    const result = getNeighborHistory('a', layout3x3, history);
    expect(result[0].lastAdjacentAt).toBe('2026-05-12T09:00:00Z');
  });

  it('handles snapshots whose positions have drifted off the current layout', () => {
    // Pretend a previous snapshot was taken on a 5x5 layout; the (4,4)
    // seat doesn't exist on a 3x3, so the helper should silently skip it.
    const history = [
      {
        timestamp: '2026-04-01T09:00:00Z',
        positions: positionsAt([['a', 4, 4], ['b', 4, 3]]),
      },
      {
        timestamp: '2026-05-10T09:00:00Z',
        positions: positionsAt([['a', 0, 0], ['b', 0, 1]]),
      },
    ];
    const result = getNeighborHistory('a', layout3x3, history);
    expect(result).toHaveLength(1);
    expect(result[0].timesAdjacent).toBe(1);
    expect(result[0].lastAdjacentAt).toBe('2026-05-10T09:00:00Z');
  });

  it('returns multiple neighbors from a single snapshot', () => {
    // Center seat (1,1) has up to 8 neighbors on a 3x3 grid; assert at
    // least the four cardinal ones are reported.
    const history = [
      {
        timestamp: '2026-05-10T09:00:00Z',
        positions: positionsAt([
          ['a', 1, 1],
          ['n', 0, 1],
          ['s', 2, 1],
          ['e', 1, 2],
          ['w', 1, 0],
        ]),
      },
    ];
    const result = getNeighborHistory('a', layout3x3, history);
    const ids = result.map((r) => r.otherId).sort();
    expect(ids).toEqual(['e', 'n', 's', 'w']);
  });
});

describe('getRecentPairPenalties', () => {
  it('returns {} for empty history', () => {
    expect(getRecentPairPenalties(layout3x3, [])).toEqual({});
  });

  it('weights the most recent run at 1 and keys the pair canonically', () => {
    const history = [
      {
        timestamp: '2026-05-12T09:00:00Z',
        positions: positionsAt([['b', 0, 1], ['a', 0, 0]]),
      },
    ];
    const p = getRecentPairPenalties(layout3x3, history);
    // Key is sorted regardless of seating order: "a|b", not "b|a".
    expect(p).toEqual({ 'a|b': 1 });
  });

  it('decays older runs (0.5^index)', () => {
    const history = [
      // newest: a/b NOT adjacent
      {
        timestamp: '2026-05-12T09:00:00Z',
        positions: positionsAt([['a', 0, 0], ['b', 2, 2]]),
      },
      // one run back: a/b adjacent → 0.5^1
      {
        timestamp: '2026-05-11T09:00:00Z',
        positions: positionsAt([['a', 0, 0], ['b', 0, 1]]),
      },
    ];
    const p = getRecentPairPenalties(layout3x3, history);
    expect(p['a|b']).toBeCloseTo(0.5, 5);
  });

  it('accumulates across runs and caps at 1', () => {
    const adjacent = {
      timestamp: '2026-05-12T09:00:00Z',
      positions: positionsAt([['a', 0, 0], ['b', 0, 1]]),
    };
    // Same pair adjacent in 4 consecutive runs: 1 + .5 + .25 + .125 > 1 → capped.
    const history = [adjacent, adjacent, adjacent, adjacent];
    const p = getRecentPairPenalties(layout3x3, history);
    expect(p['a|b']).toBe(1);
  });

  it('honors the maxSnapshots window', () => {
    const adjacent = {
      timestamp: '2026-05-12T09:00:00Z',
      positions: positionsAt([['a', 0, 0], ['b', 0, 1]]),
    };
    const history = [adjacent, adjacent, adjacent];
    // Only look at the single most recent snapshot.
    const p = getRecentPairPenalties(layout3x3, history, { maxSnapshots: 1 });
    expect(p['a|b']).toBe(1);
  });

  it('ignores non-adjacent pairs', () => {
    const history = [
      {
        timestamp: '2026-05-12T09:00:00Z',
        positions: positionsAt([['a', 0, 0], ['b', 2, 2]]),
      },
    ];
    expect(getRecentPairPenalties(layout3x3, history)).toEqual({});
  });
});

describe('relativeTime', () => {
  const NOW = new Date('2026-05-17T12:00:00Z');

  it('returns null for null input', () => {
    expect(relativeTime(null, NOW)).toBeNull();
  });

  it('returns null for unparseable input', () => {
    expect(relativeTime('not-a-date', NOW)).toBeNull();
  });

  it('"just now" for < 60 seconds', () => {
    const iso = new Date(NOW.getTime() - 30_000).toISOString();
    expect(relativeTime(iso, NOW)).toBe('just now');
  });

  it('"N min ago" for the minute range', () => {
    const iso = new Date(NOW.getTime() - 5 * 60_000).toISOString();
    expect(relativeTime(iso, NOW)).toBe('5 min ago');
  });

  it('"N hr ago" for the hour range', () => {
    const iso = new Date(NOW.getTime() - 3 * 60 * 60_000).toISOString();
    expect(relativeTime(iso, NOW)).toBe('3 hr ago');
  });

  it('"N d ago" for the day range', () => {
    const iso = new Date(NOW.getTime() - 5 * 24 * 60 * 60_000).toISOString();
    expect(relativeTime(iso, NOW)).toBe('5 d ago');
  });

  it('"N mo ago" past 30 days', () => {
    const iso = new Date(NOW.getTime() - 70 * 24 * 60 * 60_000).toISOString();
    expect(relativeTime(iso, NOW)).toBe('2 mo ago');
  });

  it('clamps future dates to "just now" (no negative seconds)', () => {
    const iso = new Date(NOW.getTime() + 5 * 60_000).toISOString();
    expect(relativeTime(iso, NOW)).toBe('just now');
  });
});

describe('getRotationStats', () => {
  // Two students in a 1x2 layout (the only pair) sit adjacent every period.
  const layout1x2: LayoutDef = { type: 'rows', rows: 1, cols: 2 };

  it('reports zero pairs for an empty plan', () => {
    expect(getRotationStats(layout3x3, [])).toEqual({
      uniquePairs: 0,
      repeatPairings: 0,
      periods: 0,
    });
  });

  it('counts a single period with no repeats', () => {
    const stats = getRotationStats(layout3x3, [
      { positions: positionsAt([['a', 0, 0], ['b', 0, 1], ['c', 0, 2]]) },
    ]);
    // a-b and b-c are adjacent; a-c is not (cols 0 and 2 in a row layout).
    expect(stats.uniquePairs).toBe(2);
    expect(stats.repeatPairings).toBe(0);
    expect(stats.periods).toBe(1);
  });

  it('flags a repeated pairing across periods', () => {
    const stats = getRotationStats(layout1x2, [
      { positions: positionsAt([['a', 0, 0], ['b', 0, 1]]) },
      { positions: positionsAt([['a', 0, 1], ['b', 0, 0]]) }, // same pair, swapped seats
    ]);
    expect(stats.uniquePairs).toBe(1);
    expect(stats.repeatPairings).toBe(1); // the pair repeated in period 2
    expect(stats.periods).toBe(2);
  });

  it('rewards a rotation that freshens neighbours', () => {
    // 1x3 row: period 1 pairs (a,b)+(b,c); period 2 pairs (b,a)... we instead
    // rotate so the previously-apart pair (a,c) becomes adjacent.
    const layout1x3: LayoutDef = { type: 'rows', rows: 1, cols: 3 };
    const stats = getRotationStats(layout1x3, [
      { positions: positionsAt([['a', 0, 0], ['b', 0, 1], ['c', 0, 2]]) }, // a-b, b-c
      { positions: positionsAt([['b', 0, 0], ['a', 0, 1], ['c', 0, 2]]) }, // b-a (repeat), a-c (new)
    ]);
    // pairs seen: a-b (both periods), b-c (p1), a-c (p2) => 3 unique, 1 repeat
    expect(stats.uniquePairs).toBe(3);
    expect(stats.repeatPairings).toBe(1);
  });
});
