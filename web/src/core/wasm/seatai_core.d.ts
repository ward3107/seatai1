// Type declarations for WASM module (when built)
// These will be replaced by actual generated types when WASM is built

export interface ClassroomOptimizer {
  optimize(students: any[], config: any): any;
}

export function init(): Promise<void>;

// Default export with ClassroomOptimizer
declare const seatai_core_default: {
  ClassroomOptimizer: typeof ClassroomOptimizer;
  init: typeof init;
};

export default seatai_core_default;