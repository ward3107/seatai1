import { useState, useCallback } from 'react';
import { useStore } from '../core/store';
import { ClassroomOptimizer, ROTATION_STRENGTH } from '../core/optimizer';
import { slotCount } from '../core/layouts';
import { getRecentPairPenalties } from '../utils/rotationHistory';
import type { RotationPeriod, RotationPlan } from '../types';

/** Rotation avoidance pushes harder inside the planner than it does for a
 *  single "freshen" run — we want each period to deliberately differ from
 *  every earlier one in the same term, not just nudge away from them. */
const PLANNER_STRENGTH = Math.max(ROTATION_STRENGTH, 0.6);

/** How many periods a single plan may hold. Kept small: a term is a
 *  handful of arrangements, and each one runs the full optimizer. */
export const MIN_PERIODS = 2;
export const MAX_PERIODS = 8;

/**
 * Generates a term rotation plan: a sequence of seating charts where each
 * period is optimized to avoid the neighbour pairings of every earlier
 * period in the plan. Reuses the existing optimizer + pair-penalty machinery.
 *
 * Generation runs on the main thread (one optimize() per period, each
 * sub-second for typical classes) with a yield between periods so the
 * progress indicator can paint. This keeps the planner independent of the
 * shared optimization worker, which only handles one in-flight run.
 */
export function useRotationPlanner() {
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const setRotationPlan = useStore((s) => s.setRotationPlan);

  const generatePlan = useCallback(
    async (count: number, periodLabel: string): Promise<RotationPlan | null> => {
      const periods = Math.min(MAX_PERIODS, Math.max(MIN_PERIODS, Math.round(count)));
      const { students, layoutDef, weights, config, constraints } = useStore.getState();

      if (students.length < 2) {
        setError('need-students');
        return null;
      }
      const seats = slotCount(layoutDef);
      if (students.length > seats) {
        setError('too-many-students');
        return null;
      }

      setError(null);
      setGenerating(true);
      setProgress({ current: 0, total: periods });

      try {
        const built: RotationPeriod[] = [];
        // Snapshots of already-generated periods, newest-first, in the shape
        // getRecentPairPenalties expects.
        const history: Array<{
          timestamp: string;
          positions: Record<string, { row: number; col: number }>;
        }> = [];

        for (let i = 0; i < periods; i++) {
          setProgress({ current: i + 1, total: periods });
          // Let React paint the progress update before the synchronous run.
          await new Promise((r) => setTimeout(r, 0));

          const penalties =
            history.length > 0
              ? getRecentPairPenalties(layoutDef, history, {
                  maxSnapshots: history.length,
                  // Weight earlier periods almost as much as recent ones so
                  // the plan spreads pairings across the whole term.
                  decay: 0.85,
                })
              : {};

          const optimizer = new ClassroomOptimizer(students, layoutDef);
          optimizer.setWeights(weights);
          optimizer.setConfig(config);
          optimizer.setConstraints(constraints);
          optimizer.setRotationAvoidance(penalties, history.length > 0 ? PLANNER_STRENGTH : 0);
          const result = optimizer.optimize();

          built.push({
            id: `period_${Date.now()}_${i}`,
            label: `${periodLabel} ${i + 1}`,
            result,
            createdAt: new Date().toISOString(),
          });

          const positions: Record<string, { row: number; col: number }> = {};
          for (const [id, p] of Object.entries(result.student_positions)) {
            positions[id] = { row: p.row, col: p.col };
          }
          history.unshift({ timestamp: new Date().toISOString(), positions });
        }

        const plan: RotationPlan = {
          id: `plan_${Date.now()}`,
          createdAt: new Date().toISOString(),
          periods: built,
        };
        setRotationPlan(plan);
        return plan;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'generation-failed');
        return null;
      } finally {
        setGenerating(false);
        setProgress(null);
      }
    },
    [setRotationPlan],
  );

  return { generating, progress, error, generatePlan };
}
