# WASM Build Guide

This guide explains how to build the WebAssembly (WASM) module for SeatAI, which provides 10-50x performance improvement over the TypeScript implementation.

---

## Prerequisites

### Install Rust

**Windows:**
1. Download rustup-init.exe from https://rustup.rs
2. Run the installer
3. Restart your terminal
4. Verify: `rustc --version` and `cargo --version`

**macOS/Linux:**
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env
```

### Install wasm-pack

```bash
cargo install wasm-pack
```

Verify: `wasm-pack --version`

---

## Building WASM

### Development Build (Faster, Larger)

```bash
cd core
wasm-pack build --target web --out-dir ../web/src/wasm --dev
```

**Use when:** Actively developing Rust code

### Production Build (Smaller, Optimized)

```bash
cd core
wasm-pack build --target web --out-dir ../web/src/wasm --release
```

**Use when:** Preparing for production deployment

---

## File Output

After building, you'll see these files in `web/src/wasm/`:

```
web/src/wasm/
├── seatai_core_bg.wasm       # Compiled WASM binary (~150KB)
├── seatai_core.js            # JavaScript glue code
├── seatai_core_bg.wasm.d.ts   # TypeScript definitions
└── seatai_core_bg.wasm.d.ts.map  # Source map
```

---

## Troubleshooting

### "wasm-pack: command not found"

**Solution:** Install wasm-pack
```bash
cargo install wasm-pack
```

### Build fails with "error: linking with cc failed"

**Solution:** Install C build tools
- **Windows:** Install Visual Studio Build Tools
- **macOS:** `xcode-select --install`
- **Linux:** `sudo apt install build-essential`

### WASM file too large

**Solution:** Use release mode
```bash
wasm-pack build --target web --out-dir ../web/src/wasm --release
```

### TypeScript errors after build

**Solution:** Regenerate types
```bash
wasm-pack build --target web --out-dir ../web/src/wasm --dev --no-typescript
# Then manually edit .d.ts file if needed
```

---

## Integration

The hybrid loader automatically detects if WASM is built and falls back to TypeScript:

```typescript
import { loadWasm, isWasmLoaded } from './core/wasm/loader';

// Load optimizer (WASM or TS)
const { ClassroomOptimizer } = await loadWasm();

// Check which implementation is being used
if (isWasmLoaded()) {
  console.log('Using fast WASM optimizer');
} else {
  console.log('Using TypeScript optimizer');
}
```

---

## Performance Comparison

| Students | TS (ms) | WASM (ms) | Speedup |
|----------|---------|-----------|---------|
| 30 | ~50 | ~5 | 10x |
| 100 | ~200 | ~10 | 20x |
| 500 | ~800 | ~20 | 40x |

*Benchmarks on M1 MacBook Pro, Chrome browser*

---

## Development Workflow

### When Modifying Rust Code

1. Make changes to files in `core/src/`
2. Rebuild WASM: `cd core && wasm-pack build --target web --out-dir ../web/src/wasm --dev`
3. Refresh browser (HMR doesn't work for WASM)

### Hot Reload

WASM changes require full page reload. Consider using:
```bash
# Terminal 1: Watch WASM changes
cd core && cargo watch -x 'wasm-pack build --target web --out-dir ../web/src/wasm --dev'

# Terminal 2: Run dev server
cd web && npm run dev
```

---

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Build WASM

on: [push, pull_request]

jobs:
  build-wasm:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions-rs/toolchain@v1
        with:
          toolchain: stable
      - uses: jetli/wasm-pack-action@v0
      - run: cd core && wasm-pack build --target web --out-dir ../web/src/wasm
      - uses: actions/upload-artifact@v3
        with:
          name: wasm-build
          path: web/src/wasm/
```

---

*Last updated: 2026-03-29*
