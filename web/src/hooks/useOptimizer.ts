import { useState, useCallback } from 'react';
import { loadWasm } from '../core/wasm/loader';
import { useStore } from '../core/store';
import type { OptimizationResult, Student } from '../types';

export function useOptimizer() {
  const [wasmReady, setWasmReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    students,
    rows,
    cols,
    weights,
    config,
    constraints,
    isOptimizing,
    setOptimizing,
    setResult,
  } = useStore();

  // Initialize WASM
  const initWasm = useCallback(async () => {
    try {
      await loadWasm();
      setWasmReady(true);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load optimizer');
      console.error('WASM load error:', err);
    }
  }, []);

  // Run optimization
  const optimize = useCallback(async (): Promise<OptimizationResult | null> => {
    if (!wasmReady) {
      await initWasm();
    }

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

    try {
      const wasm = await loadWasm();

      // Create optimizer - pass objects directly, not JSON strings
      const optimizer = new wasm.ClassroomOptimizer(
        students,
        rows,
        cols
      );

      // Set weights
      optimizer.setWeights(weights);

      // Set config
      optimizer.setConfig({
        populationSize: config.populationSize,
        maxGenerations: config.maxGenerations,
        crossoverRate: config.crossoverRate,
        mutationRate: config.mutationRate,
        tournamentSize: config.tournamentSize,
        earlyStopPatience: config.earlyStopPatience,
      });

      // Set constraints
      optimizer.setConstraints(constraints);

      // Run optimization - result is already a JavaScript object
      const result = optimizer.optimize() as OptimizationResult;

      setResult(result);
      setOptimizing(false);
      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Optimization failed';
      setError(errorMsg);
      setOptimizing(false);
      console.error('Optimization error:', err);
      return null;
    }
  }, [wasmReady, students, rows, cols, weights, config, constraints, setOptimizing, setResult, initWasm]);

  return {
    wasmReady,
    isOptimizing,
    error,
    initWasm,
    optimize,
  };
}
