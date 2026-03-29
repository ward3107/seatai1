// Hybrid loader - supports both TS and WASM implementations
// Falls back to TS if WASM is not available

import { ClassroomOptimizer as TSOptimizer } from '../optimizer';

let useWasm = false; // Will be true if WASM is successfully loaded
let wasmModule: any = null;
let wasmInitialized = false;

export type OptimizerClass = typeof TSOptimizer;

// Check if WASM build output exists
async function checkWasmExists(): Promise<boolean> {
  try {
    const response = await fetch('/src/wasm/seatai_core_bg.wasm', { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
}

// Try to load WASM module, fall back to TS
export async function loadOptimizer(): Promise<{
  Optimizer: OptimizerClass;
  isWasm: boolean;
}> {
  // Check if WASM files exist
  const wasmExists = await checkWasmExists();

  if (wasmExists && !wasmInitialized) {
    try {
      // Try to load WASM module
      const wasm = await import('../wasm/seatai_core') as any;

      // Initialize WASM module
      if (wasm.init && typeof wasm.init === 'function') {
        await wasm.init();
        wasmInitialized = true;
      }

      // Check for both named and default exports
      const OptimizerClass = wasm.ClassroomOptimizer || (wasm.default && wasm.default.ClassroomOptimizer);
      if (OptimizerClass) {
        useWasm = true;
        wasmModule = wasm;
        console.log('✅ Using WASM optimizer (10-50x faster)');
        return { Optimizer: OptimizerClass, isWasm: true };
      }
    } catch (error) {
      console.warn('⚠️ WASM load failed, falling back to TS:', error);
    }
  }

  // Fall back to TypeScript implementation
  if (!useWasm) {
    console.log('✅ Using TypeScript optimizer (WASM not available)');
  }

  return { Optimizer: TSOptimizer, isWasm: false };
}

// Get current optimizer info
export function getOptimizerInfo() {
  return {
    isWasm: useWasm,
    name: useWasm ? 'WASM (Rust)' : 'TypeScript',
    performance: useWasm ? '10-50x faster' : 'Standard'
  };
}

// Force WASM mode (if available)
export function setUseWasm(enabled: boolean): void {
  if (enabled && !wasmModule) {
    console.warn('WASM not available, ignoring setUseWasm(true)');
    return;
  }
  useWasm = enabled;
  if (!enabled) wasmInitialized = false;
}

// Export the TS optimizer directly for easier access
export { ClassroomOptimizer } from '../optimizer';
