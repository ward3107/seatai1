/**
 * Optimization Web Worker
 *
 * Runs the genetic algorithm off the main thread so the UI never freezes
 * during long optimization runs. The run is chunked (optimizeAsync) so the
 * worker's message queue stays live mid-run: progress is streamed out and
 * a 'cancel' message can interrupt the search, returning the best-so-far.
 */

import type { Student, ObjectiveWeights, GeneticConfig, SeatingConstraints, OptimizationResult } from '../types';
import { ClassroomOptimizer } from '../core/optimizer';
import type { LayoutDef } from '../core/layouts';

type InMessage =
  | {
      type: 'optimize';
      students: Student[];
      rows: number;
      cols: number;
      layoutDef?: LayoutDef;
      weights: ObjectiveWeights;
      config: GeneticConfig;
      constraints: SeatingConstraints;
      /** Rotation avoidance: pair-key → penalty weight (from getRecentPairPenalties). */
      recentPairPenalties?: Record<string, number>;
      /** Strength of the rotation penalty; 0 disables it. */
      avoidRecentStrength?: number;
    }
  | { type: 'cancel' };

type OutMessage =
  | { type: 'ready' }
  | { type: 'progress'; generation: number; totalGenerations: number; bestFitness: number }
  | { type: 'result'; result: OptimizationResult; cancelled?: boolean }
  | { type: 'error'; error: string };

// Set when a 'cancel' message arrives mid-run; polled by the optimizer via
// shouldStop between generation chunks. Reset at the start of each run.
let cancelRequested = false;

// Signal ready immediately (no WASM to load)
self.postMessage({ type: 'ready' } satisfies OutMessage);

self.onmessage = async (e: MessageEvent<InMessage>) => {
  const msg = e.data;

  if (msg.type === 'cancel') {
    cancelRequested = true;
    return;
  }
  if (msg.type !== 'optimize') return;

  const {
    students, rows, cols, layoutDef, weights, config, constraints,
    recentPairPenalties, avoidRecentStrength,
  } = msg;
  cancelRequested = false;

  try {
    const optimizer = layoutDef
      ? new ClassroomOptimizer(students, layoutDef)
      : new ClassroomOptimizer(students, rows, cols);
    optimizer.setWeights(weights);
    optimizer.setConfig(config);
    optimizer.setConstraints(constraints);
    if (avoidRecentStrength && recentPairPenalties) {
      optimizer.setRotationAvoidance(recentPairPenalties, avoidRecentStrength);
    }

    // optimizeAsync yields the event loop between generation chunks, which
    // is what lets the 'cancel' handler above run mid-optimization.
    const result = await optimizer.optimizeAsync({
      // Already throttled by the optimizer (~every 10 generations).
      onProgress: ({ generation, totalGenerations, bestFitness }) => {
        self.postMessage({
          type: 'progress', generation, totalGenerations, bestFitness,
        } satisfies OutMessage);
      },
      shouldStop: () => cancelRequested,
    });

    self.postMessage({
      type: 'result',
      result,
      // Back-compat: only present (true) when the run was cut short.
      cancelled: cancelRequested || undefined,
    } satisfies OutMessage);
  } catch (err) {
    self.postMessage({
      type: 'error',
      error: err instanceof Error ? err.message : 'Optimization failed',
    } satisfies OutMessage);
  }
};
