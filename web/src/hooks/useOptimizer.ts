import { useState, useCallback, useEffect, useRef } from 'react';
import { useStore } from '../core/store';
import { ClassroomOptimizer, ROTATION_STRENGTH } from '../core/optimizer';
import { slotCount } from '../core/layouts';
import { getRecentPairPenalties } from '../utils/rotationHistory';
import { useLanguage } from './useLanguage';
import type { OptimizationResult } from '../types';
import { buildPinned } from '../utils/pinnedSeats';

export type OptimizerProgress = { generation: number; totalGenerations: number; bestFitness: number };
type Input = {
  students: ReturnType<typeof useStore.getState>['students'];
  layoutDef: ReturnType<typeof useStore.getState>['layoutDef'];
  weights: ReturnType<typeof useStore.getState>['weights'];
  config: ReturnType<typeof useStore.getState>['config'];
  constraints: ReturnType<typeof useStore.getState>['constraints'];
  recentPairPenalties: Record<string, number>;
  avoidRecentStrength: number;
  pinned: [number, string][];
};
type WorkerOut =
  | { type: 'ready' }
  | { type: 'progress'; reqId: number } & OptimizerProgress
  | { type: 'result'; reqId: number; result: OptimizationResult }
  | { type: 'error'; reqId: number; error: string };
type Pending = {
  reqId: number;
  input: Input;
  currentResult: OptimizationResult | null;
  lockedSeats: string[];
  resolve: (result: OptimizationResult | null) => void;
  cancelled: boolean;
  fallback: boolean;
  timer?: ReturnType<typeof setTimeout>;
};

/** A failed worker falls back to a yielding local run of the same engine.
 * Every completion is scoped to its request, including timeout/cancel/unmount. */
export function useOptimizer() {
  const [wasmReady, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<OptimizerProgress | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const pendingRef = useRef<Pending | null>(null);
  const reqIdRef = useRef(0);
  const mountedRef = useRef(false);
  const isOptimizing = useStore(s => s.isOptimizing);
  const { t } = useLanguage();
  const tRef = useRef(t);
  tRef.current = t;

  const finish = useCallback((pending: Pending, result: OptimizationResult | null, failed = false) => {
    clearTimeout(pending.timer);
    if (pendingRef.current !== pending) return;
    pendingRef.current = null;
    if (mountedRef.current) {
      const state = useStore.getState();
      // Edits made while a run is in flight invalidate that run's snapshot.
      if (state.students !== pending.input.students || state.layoutDef !== pending.input.layoutDef ||
          state.config !== pending.input.config || state.weights !== pending.input.weights ||
          state.constraints !== pending.input.constraints || state.result !== pending.currentResult ||
          state.lockedSeats !== pending.lockedSeats) result = null;
      try { if (result) state.setResult(result); }
      catch { result = null; failed = true; }
      useStore.getState().setOptimizing(false);
      setProgress(null);
      if (failed) setError(tRef.current('workspace.engine_error'));
    }
    pending.resolve(result);
  }, []);

  const runFallback = useCallback(async (pending: Pending) => {
    if (pendingRef.current !== pending || pending.fallback) return;
    pending.fallback = true;
    clearTimeout(pending.timer);
    const input = pending.input;
    const started = performance.now();
    try {
      const engine = new ClassroomOptimizer(input.students, input.layoutDef);
      engine.setWeights(input.weights);
      engine.setConfig(input.config);
      engine.setConstraints(input.constraints);
      engine.setRotationAvoidance(input.recentPairPenalties, input.avoidRecentStrength);
      if (input.pinned.length) engine.setPinned(new Map(input.pinned));
      const result = await engine.optimizeAsync({
        shouldStop: () => pending.cancelled || pendingRef.current !== pending || performance.now() - started > 30_000,
        onProgress: value => {
          if (mountedRef.current && pendingRef.current === pending) setProgress(value);
        },
      });
      finish(pending, result);
    } catch {
      finish(pending, null, true);
    }
  }, [finish]);

  const discardWorker = useCallback(() => {
    const worker = workerRef.current;
    workerRef.current = null;
    if (worker) {
      worker.onmessage = null;
      worker.onerror = null;
      worker.onmessageerror = null;
      worker.terminate();
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    setReady(true); // the same TypeScript engine works without Worker support
    let disposed = false;
    void import('../workers/optimizer.worker?worker').then(({ default: WorkerCtor }) => {
      if (disposed) return;
      const worker: Worker = new WorkerCtor();
      workerRef.current = worker;
      worker.onmessage = (event: MessageEvent<WorkerOut>) => {
        const msg = event.data;
        if (msg.type === 'ready') return;
        const pending = pendingRef.current;
        if (!pending || msg.reqId !== pending.reqId || pending.fallback) return;
        if (msg.type === 'progress') setProgress(msg);
        else if (msg.type === 'result') finish(pending, msg.result);
        else if (msg.type === 'error') {
          discardWorker();
          void runFallback(pending);
        }
      };
      const failedWorker = (event: Event) => {
        event.preventDefault();
        discardWorker();
        const pending = pendingRef.current;
        if (pending) void runFallback(pending);
      };
      worker.onerror = failedWorker;
      worker.onmessageerror = failedWorker;
    }).catch(() => { /* worker import blocked; use the local engine on demand */ });
    return () => {
      disposed = true;
      mountedRef.current = false;
      discardWorker();
      const pending = pendingRef.current;
      pendingRef.current = null;
      if (pending) {
        pending.cancelled = true;
        clearTimeout(pending.timer);
        pending.resolve(null);
        useStore.getState().setOptimizing(false);
      }
    };
  }, [finish, runFallback, discardWorker]);

  const optimize = useCallback(async (): Promise<OptimizationResult | null> => {
    const state = useStore.getState();
    if (state.students.length < 2) { setError(tRef.current('app.add_two_students')); return null; }
    const capacity = slotCount(state.layoutDef);
    if (state.students.length > capacity) {
      setError(tRef.current('app.too_many_students', { students: state.students.length, seats: capacity }));
      return null;
    }
    const previous = pendingRef.current;
    if (previous) {
      previous.cancelled = true;
      clearTimeout(previous.timer);
      previous.resolve(null);
      // Start a fresh worker lifecycle after superseding a worker run. This
      // avoids sharing cancellation state with two concurrent async searches.
      if (!previous.fallback) discardWorker();
    }
    state.setOptimizing(true);
    setError(null);
    setProgress(null);
    return new Promise(resolve => {
      const pending: Pending = {
        reqId: ++reqIdRef.current, resolve, cancelled: false, fallback: false,
        currentResult: state.result, lockedSeats: state.lockedSeats,
        input: {
          students: state.students, layoutDef: state.layoutDef, weights: state.weights,
          config: state.config, constraints: state.constraints,
          recentPairPenalties: state.avoidRecentNeighbors ? getRecentPairPenalties(state.layoutDef, state.resultHistory) : {},
          avoidRecentStrength: state.avoidRecentNeighbors ? ROTATION_STRENGTH : 0,
          pinned: buildPinned(state.lockedSeats, state.result, state.layoutDef),
        },
      };
      pendingRef.current = pending;
      const worker = workerRef.current;
      if (!worker) { void runFallback(pending); return; }
      // Also recover a worker that loads but never returns a result.
      pending.timer = setTimeout(() => {
        if (pendingRef.current !== pending) return;
        discardWorker();
        void runFallback(pending);
      }, 30_000);
      try { worker.postMessage({ type: 'optimize', reqId: pending.reqId, ...pending.input }); }
      catch { discardWorker(); void runFallback(pending); }
    });
  }, [discardWorker, runFallback]);

  const cancel = useCallback(() => {
    const pending = pendingRef.current;
    if (!pending) return;
    pending.cancelled = true;
    if (!pending.fallback) workerRef.current?.postMessage({ type: 'cancel' });
  }, []);

  return { wasmReady, isOptimizing, error, optimize, progress, cancel };
}
