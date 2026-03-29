/**
 * Optimization Web Worker
 *
 * Loads the WASM module once, then handles "optimize" messages off the
 * main thread so the UI never freezes during long GA runs.
 */

import type { OptimizationResult } from '../types';

type InMessage = {
  type: 'optimize';
  students: unknown;
  rows: number;
  cols: number;
  weights: unknown;
  config: unknown;
  constraints: unknown;
};

type OutMessage =
  | { type: 'ready' }
  | { type: 'result'; result: OptimizationResult }
  | { type: 'error'; error: string };

let wasm: typeof import('../wasm/seatai_core') | null = null;

async function ensureWasm() {
  if (wasm) return wasm;
  const mod = await import('../wasm/seatai_core.js');
  await mod.default(); // initialise WASM binary
  wasm = mod;
  return wasm;
}

// Initialise WASM immediately so it's warm before the first optimize call
ensureWasm()
  .then(() => self.postMessage({ type: 'ready' } satisfies OutMessage))
  .catch((err) =>
    self.postMessage({
      type: 'error',
      error: `WASM init failed: ${err instanceof Error ? err.message : err}`,
    } satisfies OutMessage)
  );

self.onmessage = async (e: MessageEvent<InMessage>) => {
  const { type, students, rows, cols, weights, config, constraints } = e.data;
  if (type !== 'optimize') return;

  try {
    const mod = await ensureWasm();

    const optimizer = new mod.ClassroomOptimizer(students, rows, cols);
    optimizer.setWeights(weights);
    optimizer.setConfig(config);
    optimizer.setConstraints(constraints);

    const result = optimizer.optimize() as OptimizationResult;

    self.postMessage({ type: 'result', result } satisfies OutMessage);
  } catch (err) {
    self.postMessage({
      type: 'error',
      error: err instanceof Error ? err.message : 'Optimization failed',
    } satisfies OutMessage);
  }
};
