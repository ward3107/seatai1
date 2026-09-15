import { createRotationPlan } from '../core/rotationPlanner';
import type { RotationPlanInput } from '../core/rotationPlanner';
import type { RotationPlan } from '../types';

type InMessage = { type: 'generate'; reqId: number; input: RotationPlanInput };

type OutMessage =
  | { type: 'progress'; reqId: number; current: number; total: number }
  | { type: 'result'; reqId: number; plan: RotationPlan | null }
  | { type: 'error'; reqId: number; error: string };

self.onmessage = async (event: MessageEvent<InMessage>) => {
  const { reqId, input } = event.data;
  try {
    const plan = await createRotationPlan(input, {
      onProgress: (current, total) => {
        self.postMessage({ type: 'progress', reqId, current, total } satisfies OutMessage);
      },
    });
    self.postMessage({ type: 'result', reqId, plan } satisfies OutMessage);
  } catch (error) {
    self.postMessage({
      type: 'error',
      reqId,
      error: error instanceof Error ? error.message : 'generation-failed',
    } satisfies OutMessage);
  }
};
