# SeatAI - Claude Code Context

## Project Overview

**SeatAI** is an AI-powered classroom seating optimization platform. It uses genetic algorithms (Rust + WebAssembly) to find optimal student placements based on academic balance, behavioral compatibility, diversity, and special needs.

**Repository:** `C:\Users\Waseem\Documents\seatai\seatai1`
**Version:** 1.0.0
**License:** MIT

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Algorithm** | TypeScript | Current implementation (genetic algorithm) |
| **Algorithm (Future)** | Rust + wasm-bindgen | Planned WASM boost (10-50x faster) |
| **Frontend** | React 18 + TypeScript | Modern, type-safe UI |
| **Build** | Vite 5 | Fast dev server, optimized production builds |
| **State** | Zustand + Immer | Simple, performant state management |
| **Styling** | TailwindCSS 3 | Utility-first styling |
| **Animation** | Framer Motion 11 | Smooth transitions and gestures |
| **Drag & Drop** | @dnd-kit 6 | Accessible drag-drop library |
| **Storage** | Dexie.js 4 | IndexedDB wrapper for offline persistence |
| **Export** | jsPDF + html2canvas | PDF and image export |
| **Testing** | Vitest | Fast unit testing (test coverage needed) |
| **i18n** | RTL support | Hebrew/Arabic RTL layout (translations planned) |

---

## Project Structure

```
seatai/
├── core/                    # Rust WASM library
│   ├── src/
│   │   ├── lib.rs          # WASM exports
│   │   └── ...
│   └── Cargo.toml
│
├── web/                     # React frontend
│   ├── src/
│   │   ├── app/            # App shell, routing
│   │   ├── components/     # Shared UI components
│   │   ├── features/       # FEATURE-BASED organization ⭐
│   │   │   ├── classroom/  # Classroom grid, seats, drag-drop
│   │   │   ├── students/   # Student management
│   │   │   ├── optimization/ # Metrics, explanation panel
│   │   │   ├── settings/   # Algorithm configuration
│   │   │   ├── export/     # PDF/Image export
│   │   │   ├── import/     # CSV import
│   │   │   ├── projects/   # Multi-class project management
│   │   │   ├── print/      # Print view
│   │   │   └── onboarding/ # First-run experience
│   │   ├── core/           # Core infrastructure
│   │   │   ├── wasm/       # WASM loader
│   │   │   ├── store/      # Zustand store
│   │   │   └── db.ts       # Dexie IndexedDB
│   │   ├── hooks/          # Custom React hooks
│   │   ├── types/          # TypeScript definitions
│   │   ├── utils/          # Utility functions
│   │   └── main.tsx        # Entry point
│   ├── package.json
│   └── vite.config.ts
│
├── docs/                    # Additional documentation
├── CLAUDE.md               # This file
├── README.md               # Project overview
├── PLAN.md                 # Architecture plan
└── package.json            # Root workspace
```

---

## Code Organization Patterns

### Feature-Based Structure ⭐ IMPORTANT

The `web/src/features/` directory is organized by **feature**, not by file type. Each feature folder contains its own components, hooks, types, and state.

**Example:**
```
web/src/features/classroom/
├── ClassroomGrid.tsx      # Main component
├── SeatCard.tsx           # Sub-component
├── GridControls.tsx       # Controls
└── RelationshipOverlay.tsx # Visualization
```

When adding new features:
1. Create a new folder under `web/src/features/`
2. Co-locate related components, hooks, and types
3. Export from an `index.ts` if needed

### State Management with Zustand

The app uses **Zustand** for global state, located in `web/src/core/store/`.

**Key patterns:**
- Use `immer` middleware for immutable updates
- Separate slices by domain (classroom, students, settings, projects)
- Keep state minimal - derive values in selectors
- Persist to IndexedDB via Dexie

**Example:**
```typescript
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

interface ClassroomState {
  seats: Seat[];
  updateSeat: (id: string, data: Partial<Seat>) => void;
}

export const useClassroomStore = create<ClassroomState>()(
  immer((set) => ({
    seats: [],
    updateSeat: (id, data) => set((state) => {
      const seat = state.seats.find(s => s.id === id);
      if (seat) Object.assign(seat, data);
    }),
  }))
);
```

### WASM Integration

WASM module is loaded asynchronously in `web/src/core/wasm/loader.ts`.

**Pattern:**
```typescript
import init, { ClassroomOptimizer } from '@/wasm/seatai_core';

// Initialize once
await init();

// Use in web worker for performance
const optimizer = new ClassroomOptimizer(students, config);
const result = optimizer.optimize();
```

---

## Important Conventions

### Naming
- **Components:** PascalCase (`ClassroomGrid.tsx`)
- **Hooks:** camelCase with `use` prefix (`useOptimizer.ts`)
- **Utils:** camelCase (`formatStudentName.ts`)
- **Types:** PascalCase for interfaces/types (`Student`, `ClassroomConfig`)
- **Constants:** UPPER_SNAKE_CASE (`MAX_STUDENTS`)

### File Naming
- **Components:** `<Name>.tsx` (e.g., `StudentForm.tsx`)
- **Hooks:** `use<Name>.ts` (e.g., `useOptimizer.ts`)
- **Types:** `types.ts` or `index.ts` in feature folders
- **Utils:** `<name>Utils.ts` (e.g., `seatingUtils.ts`)

### Import Order
```typescript
// 1. React & libraries
import { useState } from 'react';
import { motion } from 'framer-motion';

// 2. Internal components
import { SeatCard } from './SeatCard';

// 3. Hooks
import { useOptimizer } from '@/hooks/useOptimizer';

// 4. Stores
import { useClassroomStore } from '@/core/store';

// 5. Types
import type { Student } from '@/types';

// 6. Utils
import { formatName } from '@/utils/sampleData';
```

### TypeScript
- **Always** use TypeScript for new files
- Use `type` for simple types, `interface` for object shapes
- Export types used across features from `web/src/types/index.ts`
- Use `type` imports for type-only imports: `import type { Student }`

---

## Development Workflow

### Starting Development

```bash
# Terminal 1: Build WASM (watch mode)
cd core && wasm-pack build --target web --out-dir ../web/src/wasm --dev

# Terminal 2: Start dev server
cd web && npm run dev
```

**Dev server:** http://localhost:5173

### Building WASM

```bash
# Development build (faster, larger)
cd core && wasm-pack build --target web --out-dir ../web/src/wasm --dev

# Production build (smaller, optimized)
cd core && wasm-pack build --target web --out-dir ../web/src/wasm --release
```

### Testing

```bash
# Run tests (Vitest)
cd web && npm test

# Run with coverage
cd web && npm test -- --coverage

# Rust tests
cd core && cargo test
```

### Linting

```bash
# Web lint
cd web && npm run lint

# Rust clippy
cd core && cargo clippy
```

---

## Common Tasks

### Adding a New Feature

1. **Create feature folder:**
   ```bash
   mkdir web/src/features/my-feature
   ```

2. **Create component:**
   ```typescript
   // web/src/features/my-feature/MyFeature.tsx
   import { useState } from 'react';

   export function MyFeature() {
     return <div>...</div>;
   }
   ```

3. **Add route** (if needed) in `web/src/app/App.tsx`

4. **Export from index** (optional):
   ```typescript
   // web/src/features/my-feature/index.ts
   export { MyFeature } from './MyFeature';
   ```

### Adding to State

1. **Define types** in `web/src/types/index.ts`

2. **Add to store** in `web/src/core/store/`:
   ```typescript
   // Create new slice or add to existing
   export const useMyFeatureStore = create()(
     immer((set) => ({
       data: [],
       update: (item) => set((state) => { ... })
     }))
   );
   ```

3. **Persist to IndexedDB** (if needed):
   - Add table to `web/src/core/db.ts`
   - Add sync logic

### Working with WASM

- **WASM is loaded once** - don't reinitialize
- **Use web workers** for heavy computations
- **Handle async initialization** gracefully
- **Type definitions** are in `web/src/wasm/seatai_core.d.ts`

---

## Performance Considerations

- **WASM operations** run in web workers to avoid blocking UI
- **Large student lists** use virtualization patterns
- **Animations** use `layout` prop in Framer Motion for smooth transitions
- **State updates** are batched with Zustand + Immer
- **IndexedDB** is used for offline persistence

---

## Deployment

### Production Build

```bash
# Build WASM (release mode)
cd core && wasm-pack build --target web --out-dir ../web/src/wasm --release

# Build frontend
cd web && npm run build

# Output in web/dist/
```

### Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
cd web && vercel --prod
```

**Environment Variables:**
- None required for static deployment

---

## Testing Approach

### Unit Tests
- Component tests with Vitest + Testing Library
- Utility function tests
- Store/unit logic tests

### Integration Tests
- Feature flow tests (add student → optimize → export)
- WASM integration tests

### E2E Tests (Future)
- Playwright for full user flows

---

## Important Files

| File | Purpose |
|------|---------|
| `web/src/core/store/index.ts` | Global state management |
| `web/src/core/db.ts` | IndexedDB schema & operations |
| `web/src/core/optimizer.ts` | TypeScript genetic algorithm (CURRENT) |
| `web/src/core/wasm/loader.ts` | WASM loader (fallback to TS, WASM not built) |
| `web/src/workers/optimizer.worker.ts` | Background optimization |
| `web/src/types/index.ts` | Shared TypeScript types |
| `web/src/utils/sampleData.ts` | Sample student data |
| `core/src/` | Rust WASM implementation (exists, ~2500 lines, not integrated) |
| `core/src/lib.rs` | WASM exports |

---

## Gotchas & Common Issues

### Current Implementation
- **Optimizer is TypeScript-based** in `web/src/core/optimizer.ts`
- **Rust/WASM exists but is not built or used** - `core/` has ~2500 lines of Rust code
- **WASM loader falls back to TS** - see `web/src/core/wasm/loader.ts`
- To use WASM: run `wasm-pack build` in `core/` and update loader

### i18n Status
- **RTL support works** for Hebrew/Arabic
- **No translation system yet** - all UI strings are English hardcoded
- Translation files planned (see task list)

### State Persistence
- Zustand state resets on refresh - use IndexedDB for persistence
- Dexie operations are async - handle promises properly

### Drag & Drop
- @dnd-kit requires proper sensors setup
- Use `DndContext` wrapper for drag areas
- Handle drag end events to update state

### TypeScript
- WASM types are auto-generated - check `web/src/wasm/seatai_core.d.ts`
- Use `// @ts-ignore` sparingly
- Import types with `import type`

---

## Related Documentation

- `README.md` - Project overview & quick start
- `PLAN.md` - Detailed architecture plan
- `docs/FUTURE_PLANS.md` - Future feature roadmap
- `docs/API.md` - API documentation
- `docs/ALGORITHMS.md` - Algorithm details

---

*Last updated: 2026-03-29*
