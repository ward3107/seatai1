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
  const loadedRef = useRef(false);

  const {
    students, rows, cols, weights, config, constraints,
    isOptimizing, setOptimizing, setResult,
  } = useStore();

  // ── Initialize (just mark ready - worker will run optimizations) ─────────────
  const initWasm = useCallback(async () => {
    if (loadedRef.current) return;
    loadedRef.current = true;

    // The optimizer is ready (TypeScript implementation always works via worker)
    setWasmReady(true);
    console.log('✅ Optimizer ready');

    // Try to set up the worker for better performance
    try {
      const { default: WorkerCtor } = await import('../workers/optimizer.worker?worker');
      const worker: Worker = new WorkerCtor();

      worker.onmessage = (e: MessageEvent<WorkerOut>) => {
        const msg = e.data;

        if (msg.type === 'ready') {
          console.log('✅ Worker ready');

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
        console.warn('Worker error:', ev.message);
        workerRef.current = null;
      };

      workerRef.current = worker;
    } catch (workerErr) {
      console.warn('Worker not available:', workerErr);
    }
  }, [setResult, setOptimizing]);

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

    // Use worker if available
    if (workerRef.current) {
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

    // Fallback: run on main thread (shouldn't happen with our worker)
    setError('Worker not available. Please refresh the page.');
    setOptimizing(false);
    return null;
  }, [students, rows, cols, weights, config, constraints, setOptimizing, setResult]);

  return { wasmReady, isOptimizing, error, initWasm, optimize };
}
