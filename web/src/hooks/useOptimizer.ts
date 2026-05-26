import { useState, useCallback, useEffect, useRef } from 'react';
import { useStore } from '../core/store';
import { ClassroomOptimizer, ROTATION_STRENGTH } from '../core/optimizer';
import { slotCount } from '../core/layouts';
import { getRecentPairPenalties } from '../utils/rotationHistory';
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

  const students = useStore((s) => s.students);
  const rows = useStore((s) => s.rows);
  const cols = useStore((s) => s.cols);
  const layoutDef = useStore((s) => s.layoutDef);
  const weights = useStore((s) => s.weights);
  const config = useStore((s) => s.config);
  const constraints = useStore((s) => s.constraints);
  const avoidRecentNeighbors = useStore((s) => s.avoidRecentNeighbors);
  const resultHistory = useStore((s) => s.resultHistory);
  const isOptimizing = useStore((s) => s.isOptimizing);
  const setOptimizing = useStore((s) => s.setOptimizing);
  const setResult = useStore((s) => s.setResult);

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
    const seats = slotCount(layoutDef);
    if (students.length > seats) {
      setError(`Too many students (${students.length}) for available seats (${seats})`);
      return null;
    }

    setOptimizing(true);
    setError(null);

    // Rotation avoidance is opt-in and only meaningful once we have past
    // runs to compare against. Compute the pair-penalty table here so both
    // the worker and the main-thread fallback share it.
    const recentPairPenalties =
      avoidRecentNeighbors && resultHistory.length > 0
        ? getRecentPairPenalties(layoutDef, resultHistory)
        : {};
    const avoidRecentStrength = avoidRecentNeighbors ? ROTATION_STRENGTH : 0;

    // Use worker if available
    if (workerRef.current) {
      return new Promise<OptimizationResult | null>((resolve) => {
        pendingRef.current = { resolve };
        workerRef.current!.postMessage({
          type: 'optimize',
          students,
          rows,
          cols,
          layoutDef,
          weights,
          config,
          constraints,
          recentPairPenalties,
          avoidRecentStrength,
        });
      });
    }

    // Fallback: worker didn't load (older browser, blocked by sandbox, etc.).
    // Run on the main thread so the user still gets a result — UI will block briefly.
    try {
      const optimizer = new ClassroomOptimizer(students, layoutDef);
      optimizer.setWeights(weights);
      optimizer.setConfig(config);
      optimizer.setConstraints(constraints);
      optimizer.setRotationAvoidance(recentPairPenalties, avoidRecentStrength);
      const result = await Promise.resolve().then(() => optimizer.optimize());
      setResult(result);
      setOptimizing(false);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Optimization failed');
      setOptimizing(false);
      return null;
    }
  }, [students, rows, cols, layoutDef, weights, config, constraints, avoidRecentNeighbors, resultHistory, setOptimizing, setResult]);

  return { wasmReady, isOptimizing, error, initWasm, optimize };
}
