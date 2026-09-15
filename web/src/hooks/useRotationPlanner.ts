import { useCallback, useEffect, useRef, useState } from 'react';
import { useStore } from '../core/store';
import { createRotationPlan } from '../core/rotationPlanner';
import type { RotationPlanInput } from '../core/rotationPlanner';
import { buildPinned } from '../utils/pinnedSeats';
import { slotCount } from '../core/layouts';
import type { RotationPlan } from '../types';

export const MIN_PERIODS = 2;
export const MAX_PERIODS = 8;

type WorkerOut =
  | { type: 'progress'; reqId: number; current: number; total: number }
  | { type: 'result'; reqId: number; plan: RotationPlan | null }
  | { type: 'error'; reqId: number; error: string };

type PendingRun = {
  reqId: number;
  resolve: (plan: RotationPlan | null) => void;
  reject: (error: Error) => void;
};

/** Generate a multi-period plan in a dedicated worker so the UI remains usable. */
export function useRotationPlanner() {
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const pendingRef = useRef<PendingRun | null>(null);
  const reqIdRef = useRef(0);
  const mountedRef = useRef(true);

  const setRotationPlan = useStore((state) => state.setRotationPlan);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      workerRef.current?.terminate();
      pendingRef.current?.resolve(null);
      workerRef.current = null;
      pendingRef.current = null;
    };
  }, []);

  const finish = useCallback((plan: RotationPlan | null) => {
    if (plan) setRotationPlan(plan);
    if (mountedRef.current) {
      setGenerating(false);
      setProgress(null);
    }
    return plan;
  }, [setRotationPlan]);

  const runInWorker = useCallback(async (input: RotationPlanInput) => {
    const { default: WorkerConstructor } = await import('../workers/rotation.worker?worker');
    const worker: Worker = new WorkerConstructor();
    workerRef.current = worker;
    const reqId = ++reqIdRef.current;

    return new Promise<RotationPlan | null>((resolve, reject) => {
      pendingRef.current = { reqId, resolve, reject };
      worker.onmessage = (event: MessageEvent<WorkerOut>) => {
        const message = event.data;
        if (message.reqId !== pendingRef.current?.reqId) return;
        if (message.type === 'progress') {
          if (mountedRef.current) {
            setProgress({ current: message.current, total: message.total });
          }
          return;
        }

        worker.terminate();
        workerRef.current = null;
        pendingRef.current = null;
        if (message.type === 'error') {
          reject(new Error(message.error));
        } else {
          resolve(message.plan);
        }
      };
      worker.onerror = (event) => {
        worker.terminate();
        workerRef.current = null;
        pendingRef.current = null;
        reject(new Error(event.message || 'generation-failed'));
      };
      worker.postMessage({ type: 'generate', reqId, input });
    });
  }, []);

  const generatePlan = useCallback(async (
    count: number,
    periodLabel: string,
  ): Promise<RotationPlan | null> => {
    const periods = Math.min(MAX_PERIODS, Math.max(MIN_PERIODS, Math.round(count)));
    const state = useStore.getState();
    if (state.students.length < 2) {
      setError('need-students');
      return null;
    }
    if (state.students.length > slotCount(state.layoutDef)) {
      setError('too-many-students');
      return null;
    }

    const input: RotationPlanInput = {
      periods,
      periodLabel,
      students: state.students,
      layoutDef: state.layoutDef,
      weights: state.weights,
      config: state.config,
      constraints: state.constraints,
      pinned: buildPinned(state.lockedSeats, state.result, state.layoutDef),
    };
    setError(null);
    setGenerating(true);
    setProgress({ current: 0, total: periods });

    try {
      try {
        return finish(await runInWorker(input));
      } catch (workerError) {
        console.warn('Rotation worker unavailable; using async fallback:', workerError);
        const plan = await createRotationPlan(input, {
          onProgress: (current, total) => {
            if (mountedRef.current) setProgress({ current, total });
          },
        });
        return finish(plan);
      }
    } catch (generationError) {
      if (mountedRef.current) {
        setError(generationError instanceof Error ? generationError.message : 'generation-failed');
      }
      return finish(null);
    }
  }, [finish, runInWorker]);

  return { generating, progress, error, generatePlan };
}
