import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useStore } from '../core/store';
import { sampleStudents } from '../utils/sampleData';
import { useOptimizer } from './useOptimizer';
import type { OptimizationResult } from '../types';
const workers = vi.hoisted(() => ({ instances: [] as {
  onmessage: ((e: { data: unknown }) => void) | null;
  onerror: ((e: Event) => void) | null;
  onmessageerror: ((e: Event) => void) | null;
  postMessage: ReturnType<typeof vi.fn>;
  terminate: ReturnType<typeof vi.fn>;
}[] }));
vi.mock('../workers/optimizer.worker?worker', () => ({ default: class {
  onmessage = null; onerror = null; onmessageerror = null;
  postMessage = vi.fn(); terminate = vi.fn();
  constructor() { workers.instances.push(this); }
} }));
beforeEach(() => {
  workers.instances = [];
  const initial = useStore.getInitialState();
  useStore.setState({ ...initial, students: sampleStudents.slice(0, 4),
    layoutDef: { type: 'rows', rows: 2, cols: 3 }, rows: 2, cols: 3,
    config: { ...initial.config, populationSize: 10, maxGenerations: 10, earlyStopPatience: 3 },
    uiLanguage: 'en', result: null, isOptimizing: false, lockedSeats: [],
  });
});
async function setup() {
  const hook = renderHook(() => useOptimizer());
  await waitFor(() => expect(workers.instances).toHaveLength(1));
  return { ...hook, worker: workers.instances[0] };
}
describe('optimizer lifecycle recovery', () => {
  it('recovers a crashed worker with the same engine and clears the busy state', async () => {
    const { result, worker } = await setup();
    let running!: Promise<OptimizationResult | null>;
    act(() => { running = result.current.optimize(); });
    await act(async () => { worker.onerror!(new Event('error')); expect(await running).not.toBeNull(); });
    expect(worker.terminate).toHaveBeenCalledOnce();
    expect(useStore.getState().result?.layout.seats.filter(s => s.student_id)).toHaveLength(4);
    expect(result.current.isOptimizing).toBe(false);
    expect(result.current.error).toBeNull();
  });
  it('recovers a postMessage clone failure without a stranded promise', async () => {
    const { result, worker } = await setup();
    worker.postMessage.mockImplementation(() => { throw new DOMException('Clone failed', 'DataCloneError'); });
    await act(async () => { expect(await result.current.optimize()).not.toBeNull(); });
    expect(result.current.isOptimizing).toBe(false);
  });
  it('recovers an unreadable worker reply', async () => {
    const { result, worker } = await setup();
    let running!: Promise<OptimizationResult | null>;
    act(() => { running = result.current.optimize(); });
    await act(async () => { worker.onmessageerror!(new Event('messageerror')); await running; });
    expect(result.current.error).toBeNull();
    expect(result.current.isOptimizing).toBe(false);
  });
  it('does not apply a superseded worker result', async () => {
    const { result, worker } = await setup();
    let first!: Promise<OptimizationResult | null>;
    act(() => { first = result.current.optimize(); });
    const oldReply = worker.onmessage!;
    await act(async () => { const second = result.current.optimize(); expect(await first).toBeNull(); await second; });
    const current = useStore.getState().result;
    act(() => { oldReply({ data: { type: 'result', reqId: 1, result: null } }); });
    expect(useStore.getState().result).toBe(current);
  });
  it('settles a pending request and stops the worker on unmount', async () => {
    const { result, worker, unmount } = await setup();
    let pending!: Promise<OptimizationResult | null>;
    act(() => { pending = result.current.optimize(); });
    unmount();
    expect(await pending).toBeNull();
    expect(worker.terminate).toHaveBeenCalledOnce();
    expect(useStore.getState().isOptimizing).toBe(false);
  });
  it('discards a result when the classroom was edited during the run', async () => {
    const { result, worker } = await setup();
    let pending!: Promise<OptimizationResult | null>;
    act(() => { pending = result.current.optimize(); });
    await act(async () => {
      useStore.getState().setLayoutDef({ type: 'rows', rows: 3, cols: 3 });
      worker.onmessage!({ data: { type: 'result', reqId: 1, result: {} } });
      expect(await pending).toBeNull();
    });
    expect(useStore.getState().result).toBeNull();
    expect(result.current.isOptimizing).toBe(false);
  });

  it('validates the current roster at invocation', async () => {
    const { result, worker } = await setup();
    act(() => { useStore.setState({ students: [] }); });
    await act(async () => { expect(await result.current.optimize()).toBeNull(); });
    expect(worker.postMessage).not.toHaveBeenCalled();
    expect(result.current.error).toMatch(/at least 2 students/i);
  });
  it('preserves a manual seating edit made during a run', async () => {
    const { result, worker } = await setup();
    let pending!: Promise<OptimizationResult | null>;
    act(() => { pending = result.current.optimize(); });
    const manualResult = { layout: { seats: [] } } as unknown as OptimizationResult;
    await act(async () => {
      useStore.setState({ result: manualResult });
      worker.onmessage!({ data: { type: 'result', reqId: 1, result: {} } });
      expect(await pending).toBeNull();
    });
    expect(useStore.getState().result).toBe(manualResult);
  });
  it('preserves a seat lock changed during a run', async () => {
    const { result, worker } = await setup();
    let pending!: Promise<OptimizationResult | null>;
    act(() => { pending = result.current.optimize(); });
    await act(async () => {
      useStore.setState({ lockedSeats: ['0-0'] });
      worker.onmessage!({ data: { type: 'result', reqId: 1, result: {} } });
      expect(await pending).toBeNull();
    });
    expect(useStore.getState().lockedSeats).toEqual(['0-0']);
    expect(result.current.isOptimizing).toBe(false);
  });
});
