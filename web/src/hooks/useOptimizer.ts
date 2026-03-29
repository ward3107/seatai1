import { useState, useCallback, useEffect, useRef } from 'react';
import { useStore } from '../core/store';
import type { OptimizationResult } from '../types';

type WorkerOut =
  | { type: 'ready' }
  | { type: 'result'; result: OptimizationResult }
  | { type: 'error'; error: string };

type PendingPromise = {
  resolve: (r: OptimizationResult | null) => void;
};

export function useOptimizer() {
  const [wasmReady, setWasmReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const pendingRef = useRef<PendingPromise | null>(null);

  const {
    students, rows, cols, weights, config, constraints,
    isOptimizing, setOptimizing, setResult,
  } = useStore();

  // ── Initialise worker ────────────────────────────────────────────────────
  const initWasm = useCallback(async () => {
    if (workerRef.current) return; // already running

    try {
      // Vite resolves `?worker` at build time into a Worker constructor
      const { default: WorkerCtor } = await import('../workers/optimizer.worker?worker');
      const worker: Worker = new WorkerCtor();

      worker.onmessage = (e: MessageEvent<WorkerOut>) => {
        const msg = e.data;

        if (msg.type === 'ready') {
          setWasmReady(true);
          setError(null);

        } else if (msg.type === 'result') {
          setResult(msg.result);
          setOptimizing(false);
          pendingRef.current?.resolve(msg.result);
          pendingRef.current = null;

        } else if (msg.type === 'error') {
          setError(msg.error);
          setOptimizing(false);
          pendingRef.current?.resolve(null);
          pendingRef.current = null;
        }
      };

      worker.onerror = (ev) => {
        const msg = ev.message ?? 'Worker crashed';
        setError(msg);
        setWasmReady(false);
        setOptimizing(false);
        pendingRef.current?.resolve(null);
        pendingRef.current = null;
        // Reset so initWasm() can create a fresh worker next time
        workerRef.current = null;
      };

      workerRef.current = worker;
    } catch (_err) {
      // Workers unavailable (e.g. very old browsers) — fall back to main thread
      try {
        const { loadWasm } = await import('../core/wasm/loader');
        await loadWasm();
        setWasmReady(true);
        setError(null);
      } catch (fallbackErr) {
        setError(fallbackErr instanceof Error ? fallbackErr.message : 'Failed to load optimizer');
      }
    }
  }, [setOptimizing, setResult]);

  // Create worker on mount; tear down on unmount
  useEffect(() => {
    initWasm();
    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, [initWasm]);

  // ── Run optimisation ─────────────────────────────────────────────────────
  const optimize = useCallback(async (): Promise<OptimizationResult | null> => {
    if (students.length < 2) {
      setError('Add at least 2 students');
      return null;
    }
    if (students.length > rows * cols) {
      setError(`Too many students (${students.length}) for available seats (${rows * cols})`);
      return null;
    }

    setOptimizing(true);
    setError(null);

    // ── Worker path ─────────────────────────────────────────────────────────
    if (workerRef.current && wasmReady) {
      return new Promise<OptimizationResult | null>((resolve) => {
        pendingRef.current = { resolve };
        workerRef.current!.postMessage({
          type: 'optimize',
          students,
          rows,
          cols,
          weights,
          config,
          constraints,
        });
      });
    }

    // ── Main-thread fallback (no worker / worker not ready yet) ─────────────
    try {
      const { loadWasm } = await import('../core/wasm/loader');
      const mod = await loadWasm();

      const optimizer = new mod.ClassroomOptimizer(students, rows, cols);
      optimizer.setWeights(weights);
      optimizer.setConfig(config);
      optimizer.setConstraints(constraints);

      const result = optimizer.optimize() as OptimizationResult;
      setResult(result);
      setOptimizing(false);
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Optimization failed';
      setError(msg);
      setOptimizing(false);
      return null;
    }
  }, [wasmReady, students, rows, cols, weights, config, constraints, setOptimizing, setResult]);

  return { wasmReady, isOptimizing, error, initWasm, optimize };
}
