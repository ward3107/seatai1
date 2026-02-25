// WASM module loader
let wasmModule: typeof import('../../wasm/seatai_core') | null = null;
let wasmLoading: Promise<typeof import('../../wasm/seatai_core')> | null = null;

export async function loadWasm(): Promise<typeof import('../../wasm/seatai_core')> {
  if (wasmModule) {
    return wasmModule;
  }

  if (wasmLoading) {
    return wasmLoading;
  }

  wasmLoading = (async () => {
    try {
      // Dynamic import of the WASM module
      const module = await import('../../wasm/seatai_core.js');
      await module.default(); // Initialize WASM
      wasmModule = module;
      return module;
    } catch (error) {
      wasmLoading = null;
      throw new Error(`Failed to load WASM module: ${error}`);
    }
  })();

  return wasmLoading;
}

export function isWasmLoaded(): boolean {
  return wasmModule !== null;
}
