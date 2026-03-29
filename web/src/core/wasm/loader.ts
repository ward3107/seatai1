// Optimizer loader - hybrid TS/WASM implementation
import { loadOptimizer, getOptimizerInfo, ClassroomOptimizer } from './hybrid-loader';

export type OptimizerModule = {
  ClassroomOptimizer: new (...args: ConstructorParameters<typeof ClassroomOptimizer>) => InstanceType<typeof ClassroomOptimizer>;
};

let loaded = false;
let loadedModule: OptimizerModule | null = null;

/**
 * Load the optimizer (WASM if available, otherwise TypeScript)
 * @returns {OptimizerModule} The loaded optimizer module
 */
export async function loadWasm(): Promise<OptimizerModule> {
  if (!loaded) {
    const result = await loadOptimizer();
    loadedModule = { ClassroomOptimizer: result.Optimizer as any };
    loaded = true;
  }
  return loadedModule!;
}

/**
 * Check if WASM is being used
 * @returns {boolean} True if WASM optimizer is loaded
 */
export function isWasmLoaded(): boolean {
  return getOptimizerInfo().isWasm;
}

/**
 * Get information about the current optimizer
 * @returns {Object} Optimizer info { isWasm, name, performance }
 */
export function getOptimizerStats() {
  return getOptimizerInfo();
}

// Export directly for convenience
export { ClassroomOptimizer } from './hybrid-loader';
