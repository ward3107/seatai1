import { ClassroomOptimizer, ROTATION_STRENGTH } from './optimizer';
import type { LayoutDef } from './layouts';
import { getRecentPairPenalties } from '../utils/rotationHistory';
import type {
  GeneticConfig,
  ObjectiveWeights,
  RotationPeriod,
  RotationPlan,
  SeatingConstraints,
  Student,
} from '../types';

/** Rotation avoidance is deliberately stronger inside a multi-period plan. */
export const PLANNER_STRENGTH = Math.max(ROTATION_STRENGTH, 0.6);

export interface RotationPlanInput {
  periods: number;
  periodLabel: string;
  students: Student[];
  layoutDef: LayoutDef;
  weights: ObjectiveWeights;
  config: GeneticConfig;
  constraints: SeatingConstraints;
  pinned: [number, string][];
}

export interface RotationPlanCallbacks {
  onProgress?: (current: number, total: number) => void;
  shouldStop?: () => boolean;
}

/**
 * Build a complete term plan. This function contains no React or Worker APIs,
 * so the worker and the graceful main-thread fallback execute identical logic.
 */
export async function createRotationPlan(
  input: RotationPlanInput,
  callbacks: RotationPlanCallbacks = {},
): Promise<RotationPlan | null> {
  const built: RotationPeriod[] = [];
  const history: Array<{
    timestamp: string;
    positions: Record<string, { row: number; col: number }>;
    layoutDef: LayoutDef;
  }> = [];
  const planStartedAt = Date.now();

  for (let i = 0; i < input.periods; i++) {
    if (callbacks.shouldStop?.()) return null;
    callbacks.onProgress?.(i + 1, input.periods);

    const penalties =
      history.length > 0
        ? getRecentPairPenalties(input.layoutDef, history, {
            maxSnapshots: history.length,
            decay: 0.85,
          })
        : {};

    const optimizer = new ClassroomOptimizer(input.students, input.layoutDef);
    optimizer.setWeights(input.weights);
    optimizer.setConfig(input.config);
    optimizer.setConstraints(input.constraints);
    optimizer.setPinned(new Map(input.pinned));
    optimizer.setRotationAvoidance(
      penalties,
      history.length > 0 ? PLANNER_STRENGTH : 0,
    );
    const result = await optimizer.optimizeAsync({
      shouldStop: callbacks.shouldStop,
    });
    if (callbacks.shouldStop?.()) return null;

    const createdAt = new Date().toISOString();
    built.push({
      id: `period_${planStartedAt}_${i}`,
      label: `${input.periodLabel} ${i + 1}`,
      result,
      createdAt,
    });

    const positions: Record<string, { row: number; col: number }> = {};
    for (const [id, position] of Object.entries(result.student_positions)) {
      positions[id] = { row: position.row, col: position.col };
    }
    history.unshift({ timestamp: createdAt, positions, layoutDef: input.layoutDef });
  }

  return {
    id: `plan_${planStartedAt}`,
    createdAt: new Date(planStartedAt).toISOString(),
    periods: built,
  };
}
