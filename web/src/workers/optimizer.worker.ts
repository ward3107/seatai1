/**
 * Optimization Web Worker
 *
 * Runs the genetic algorithm off the main thread so the UI never freezes
 * during long optimization runs.
 */

import type { Student, ObjectiveWeights, GeneticConfig, SeatingConstraints, OptimizationResult } from '../types';
import { ClassroomOptimizer } from '../core/optimizer';

type InMessage = {
  type: 'optimize';
  students: Student[];
  rows: number;
  cols: number;
  weights: ObjectiveWeights;
  config: GeneticConfig;
  constraints: SeatingConstraints;
};

type OutMessage =
  | { type: 'ready' }
  | { type: 'result'; result: OptimizationResult }
  | { type: 'error'; error: string };

// Signal ready immediately (no WASM to load)
self.postMessage({ type: 'ready' } satisfies OutMessage);

self.onmessage = async (e: MessageEvent<InMessage>) => {
  const { type, students, rows, cols, weights, config, constraints } = e.data;
  if (type !== 'optimize') return;

  try {
    const optimizer = new ClassroomOptimizer(students, rows, cols);
    optimizer.setWeights(weights);
    optimizer.setConfig(config);
    optimizer.setConstraints(constraints);

    const result = optimizer.optimize();

    self.postMessage({ type: 'result', result } satisfies OutMessage);
  } catch (err) {
    self.postMessage({
      type: 'error',
      error: err instanceof Error ? err.message : 'Optimization failed',
    } satisfies OutMessage);
  }
};
