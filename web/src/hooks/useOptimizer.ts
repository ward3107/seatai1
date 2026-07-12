import { useState, useCallback, useEffect, useRef } from 'react';
import { useStore } from '../core/store';
import { ClassroomOptimizer, ROTATION_STRENGTH } from '../core/optimizer';
import { slotCount, generateSlots } from '../core/layouts';
import { getRecentPairPenalties } from '../utils/rotationHistory';
import { useLanguage } from './useLanguage';
import type { OptimizationResult, ClassroomLayout } from '../types';
import type { LayoutDef } from '../core/layouts';

/**
 * Turn the teacher's locked seats into optimizer pins. A lock means "the
 * student currently sitting here stays here"; we resolve each locked seat
 * key ("row-col") to its slot index in the current layout and the student
 * the previous result placed there. Locked-but-empty seats yield no pin.
 */
function buildPinned(
  lockedSeats: string[],
  result: { layout: ClassroomLayout } | null,
  layoutDef: LayoutDef,
): [number, string][] {
  if (!result || lockedSeats.length === 0) return [];
  const slotIndexByPos = new Map<string, number>();
  for (const slot of generateSlots(layoutDef)) {
    slotIndexByPos.set(`${slot.row}-${slot.col}`, slot.index);
  }
  const studentByPos = new Map<string, string>();
  for (const seat of result.layout.seats) {
    if (seat.student_id) {
      studentByPos.set(`${seat.position.row}-${seat.position.col}`, seat.student_id);
    }
  }
  const pins: [number, string][] = [];
  for (const key of lockedSeats) {
    const slotIdx = slotIndexByPos.get(key);
    const sid = studentByPos.get(key);
    if (slotIdx !== undefined && sid) pins.push([slotIdx, sid]);
  }
  return pins;
}

type WorkerOut =
  | { type: 'ready' }
  | { type: 'progress'; generation: number; totalGenerations: number; bestFitness: number }
  | { type: 'result'; result: OptimizationResult; cancelled?: boolean }
  | { type: 'error'; error: string };

type PendingPromise = {
  resolve: (r: OptimizationResult | null) => void;
};

/** Live progress of the in-flight optimization; null when idle. */
export type OptimizerProgress = {
  generation: number;
  totalGenerations: number;
  bestFitness: number;
};

export function useOptimizer() {
  const [wasmReady, setWasmReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<OptimizerProgress | null>(null);
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
  const result = useStore((s) => s.result);
  const lockedSeats = useStore((s) => s.lockedSeats);
  const isOptimizing = useStore((s) => s.isOptimizing);
  const setOptimizing = useStore((s) => s.setOptimizing);
  const setResult = useStore((s) => s.setResult);
  const { t } = useLanguage();

  // ── Initialize (just mark ready - worker will run optimizations) ─────────────
  // `isCancelled` lets the mount effect signal that the component unmounted
  // while the dynamic worker import was still in flight — otherwise the import
  // resolves after cleanup ran, creates a Worker, and stores it with nothing
  // left to terminate it (a leaked worker on fast mount/unmount).
  const initWasm = useCallback(async (isCancelled: () => boolean = () => false) => {
    if (loadedRef.current) return;
    loadedRef.current = true;

    // The optimizer is ready (TypeScript implementation always works via worker)
    setWasmReady(true);
    if (import.meta.env.DEV) console.log('✅ Optimizer ready');

    // Try to set up the worker for better performance
    try {
      const { default: WorkerCtor } = await import('../workers/optimizer.worker?worker');
      if (isCancelled()) return; // unmounted mid-import — don't create a worker
      const worker: Worker = new WorkerCtor();

      worker.onmessage = (e: MessageEvent<WorkerOut>) => {
        const msg = e.data;

        if (msg.type === 'ready') {
          if (import.meta.env.DEV) console.log('✅ Worker ready');

        } else if (msg.type === 'progress') {
          setProgress({
            generation: msg.generation,
            totalGenerations: msg.totalGenerations,
            bestFitness: msg.bestFitness,
          });

        } else if (msg.type === 'result') {
          // A cancelled run still delivers the best-so-far plan.
          setResult(msg.result);
          setOptimizing(false);
          setProgress(null);
          pendingRef.current?.resolve(msg.result);
          pendingRef.current = null;

        } else if (msg.type === 'error') {
          setError(msg.error);
          setOptimizing(false);
          setProgress(null);
          pendingRef.current?.resolve(null);
          pendingRef.current = null;
        }
      };

      worker.onerror = (ev) => {
        console.warn('Worker error:', ev.message);
        // A worker crash must not strand the UI: resolve any in-flight
        // optimisation and clear the spinner, otherwise `isOptimizing`
        // stays true forever and the Optimize button never re-enables.
        setError(ev.message || 'Optimization worker crashed');
        setOptimizing(false);
        setProgress(null);
        pendingRef.current?.resolve(null);
        pendingRef.current = null;
        workerRef.current = null;
      };

      workerRef.current = worker;
    } catch (workerErr) {
      console.warn('Worker not available:', workerErr);
    }
  }, [setResult, setOptimizing, setError]);

  // Create worker on mount; tear down on unmount
  useEffect(() => {
    let cancelled = false;
    initWasm(() => cancelled);
    return () => {
      cancelled = true;
      workerRef.current?.terminate();
      workerRef.current = null;
      // Allow a genuine remount (e.g. StrictMode's mount→unmount→mount) to
      // re-create the worker, since this init was torn down.
      loadedRef.current = false;
    };
  }, [initWasm]);

  // ── Run optimisation ─────────────────────────────────────────────────────
  const optimize = useCallback(async (): Promise<OptimizationResult | null> => {
    if (students.length < 2) {
      setError(t('app.add_two_students'));
      return null;
    }
    const seats = slotCount(layoutDef);
    if (students.length > seats) {
      setError(t('app.too_many_students', { students: students.length, seats }));
      return null;
    }

    setOptimizing(true);
    setError(null);
    setProgress(null);

    // Rotation avoidance is opt-in and only meaningful once we have past
    // runs to compare against. Compute the pair-penalty table here so both
    // the worker and the main-thread fallback share it.
    const recentPairPenalties =
      avoidRecentNeighbors && resultHistory.length > 0
        ? getRecentPairPenalties(layoutDef, resultHistory)
        : {};
    const avoidRecentStrength = avoidRecentNeighbors ? ROTATION_STRENGTH : 0;

    // Locked seats are kept in place; the GA only rearranges the rest.
    const pinned = buildPinned(lockedSeats, result, layoutDef);

    // Use worker if available
    if (workerRef.current) {
      // If a run is already in flight, the worker will deliver only ONE more
      // 'result' and it resolves whichever promise is current. Resolve the
      // previous caller now (with null) so its `await optimize()` doesn't hang
      // forever when a second run replaces it.
      pendingRef.current?.resolve(null);
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
          pinned,
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
      if (pinned.length > 0) optimizer.setPinned(new Map(pinned));
      const out = await Promise.resolve().then(() => optimizer.optimize());
      setResult(out);
      setOptimizing(false);
      return out;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Optimization failed');
      setOptimizing(false);
      return null;
    }
  }, [students, rows, cols, layoutDef, weights, config, constraints, avoidRecentNeighbors, resultHistory, result, lockedSeats, setOptimizing, setResult, t]);

  // ── Cancel an in-flight run ───────────────────────────────────────────────
  // Asks the worker to stop early; it replies with a normal 'result'
  // message carrying the best plan found so far. No-op when nothing is
  // running (or on the main-thread fallback path, which can't be cancelled).
  const cancel = useCallback(() => {
    if (!pendingRef.current || !workerRef.current) return;
    workerRef.current.postMessage({ type: 'cancel' });
  }, []);

  return { wasmReady, isOptimizing, error, initWasm, optimize, progress, cancel };
}
