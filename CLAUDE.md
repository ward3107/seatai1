# SeatAI — Claude Code Context

## Project Overview

**SeatAI** is an AI-powered classroom seating optimization platform. A
genetic algorithm searches for student placements that balance academic
ability, behavior, diversity, and special needs. Runs entirely in the
browser — no server, no sign-in, IndexedDB for persistence.

**Repository:** `C:\Users\Waseem\Documents\seatai\seatai1`
**Version:** 1.0.0
**License:** MIT

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Algorithm** | TypeScript | Genetic algorithm, slot-based |
| **Frontend** | React 18 + TypeScript | UI |
| **Build** | Vite 5 | Dev server + production builds |
| **State** | Zustand + Immer | Global store with persisted slices |
| **Styling** | TailwindCSS 3 | Utility-first |
| **Animation** | Framer Motion 11 | Layout animations |
| **Drag & Drop** | @dnd-kit 6 | Accessible drag-drop |
| **Storage** | Dexie.js 4 | IndexedDB wrapper |
| **Export** | jsPDF + html2canvas | PDF + image export |
| **Testing** | Vitest | Unit tests (currently 281 tests) |
| **i18n** | en / he / ar / ru | RTL supported; minimal translation system |

---

## Project Structure

```
seatai/
├── web/                      # Vite app — all the code lives here
│   ├── src/
│   │   ├── app/              # App shell
│   │   ├── components/       # Shared UI (ErrorBoundary, LanguageSelector, …)
│   │   ├── features/         # FEATURE-BASED organization ⭐
│   │   │   ├── classroom/    # ClassroomGrid, Classroom3D, SeatCard, …
│   │   │   ├── students/     # Student management
│   │   │   ├── layout/       # LayoutPanel (rows / clusters / U / circle / custom)
│   │   │   ├── constraints/  # Front/back/keep-together rules
│   │   │   ├── optimization/ # Metrics + explanation
│   │   │   ├── settings/     # Algorithm configuration
│   │   │   ├── export/       # PDF / image export
│   │   │   ├── import/       # CSV import
│   │   │   ├── projects/     # Multi-class project management
│   │   │   ├── print/        # Print view
│   │   │   └── onboarding/   # First-run experience
│   │   ├── core/
│   │   │   ├── optimizer.ts  # Genetic algorithm (slot-based)
│   │   │   ├── layouts.ts    # Layout generators
│   │   │   ├── store/        # Zustand store
│   │   │   └── db.ts         # Dexie IndexedDB
│   │   ├── hooks/            # Custom React hooks
│   │   ├── workers/          # optimizer.worker.ts
│   │   ├── types/            # TypeScript definitions
│   │   ├── utils/            # Helpers
│   │   ├── locales/          # en / he / ar / ru
│   │   └── main.tsx          # Entry point
│   ├── package.json
│   └── vite.config.ts
│
├── docs/                     # Long-form docs
├── CLAUDE.md                 # This file
├── README.md
├── PLAN.md
└── package.json              # Root workspace (delegates to web/)
```

---

## Code Organization Patterns

### Feature-Based Structure ⭐

`web/src/features/` is organized by **feature**, not by file type. Each
feature folder contains its own components, hooks, and types.

When adding a new feature:
1. Create `web/src/features/<feature>/`.
2. Co-locate components, hooks, types.
3. Export from `index.ts` if needed.

### Layout System

Layouts (rows, clusters, U-shape, circle, custom-rows) are produced by
`web/src/core/layouts.ts`. Every layout generator returns a flat list of
**Slots**:

```typescript
interface Slot {
  index: number;       // chromosome position
  row: number;         // logical row (0 = front)
  col: number;         // logical column
  x: number;           // normalized 0..1 render coord
  y: number;           // normalized 0..1 render coord
  isFront: boolean;
  isBack: boolean;
  neighbors: number[]; // precomputed neighbor slot indices
}
```

The optimizer is layout-agnostic — it walks the slot list and reads
`slot.neighbors`. Adding a new layout is a single function.

### State Management with Zustand

Global state lives in `web/src/core/store/index.ts` with `immer`
middleware. The store is persisted to IndexedDB via a custom Dexie
storage adapter (`dexieStorage`). Patterns:

- Use `immer` for immutable updates.
- Keep state minimal — derive values in selectors.
- Setters for shape-changing fields (`setLayoutDef`, `setRows`,
  `setCols`) clear `result` so stale optimizations don't render in a
  new room shape.

---

## Important Conventions

### Naming
- **Components:** PascalCase (`ClassroomGrid.tsx`)
- **Hooks:** camelCase with `use` prefix (`useOptimizer.ts`)
- **Utils:** camelCase (`seatingUtils.ts`)
- **Types:** PascalCase
- **Constants:** UPPER_SNAKE_CASE

### File Naming
- **Components:** `<Name>.tsx`
- **Hooks:** `use<Name>.ts`
- **Tests:** `<name>.test.ts(x)` co-located

### Import Order
```typescript
// 1. React & libraries
import { useState } from 'react';
// 2. Internal components
import { SeatCard } from './SeatCard';
// 3. Hooks
import { useOptimizer } from '@/hooks/useOptimizer';
// 4. Stores
import { useStore } from '@/core/store';
// 5. Types (use `import type`)
import type { Student } from '@/types';
// 6. Utils
import { formatName } from '@/utils/sampleData';
```

### TypeScript
- Use `type` for simple aliases, `interface` for object shapes.
- Shared types in `web/src/types/global.d.ts`.
- Use `import type` for type-only imports.

---

## Development Workflow

### Start dev server

```bash
cd web
npm install
npm run dev
```

Open **http://localhost:5173**.

### Tests / lint / build

```bash
cd web
npm test              # Vitest
npm run lint          # ESLint
npm run build         # Production build → web/dist/
```

The root `package.json` also forwards `npm run dev` / `build` / `test` /
`lint` to the `web/` workspace.

---

## Common Tasks

### Adding a new layout type

1. Add a generator function in `web/src/core/layouts.ts` that returns
   `Slot[]`.
2. Add the type literal to `LayoutType` and a case to the
   `generateSlots` switch.
3. Add the preset to `web/src/features/layout/LayoutPanel.tsx` with an
   icon, name, and description.
4. Add locale strings to `web/src/locales/{en,he,ar,ru}.json` under
   `layout.<key>` and `layout.<key>_desc`.
5. Add tests to `web/src/core/layouts.test.ts`.

### Adding to state

1. Define types in `web/src/types/global.d.ts`.
2. Add field + setter to the store in `web/src/core/store/index.ts`.
3. If persistable, add to the `partialize` config.
4. If part of a project, add to `ClassProject` and the
   `saveProject`/`loadProject` snapshot.

---

## Performance Considerations

- **Heavy work runs in a Web Worker** (`workers/optimizer.worker.ts`)
  to keep the UI responsive.
- **3D view, PrintView, and OptimizationTimeline are code-split** via
  `React.lazy` so they only fetch on demand.
- **State updates are batched** via Zustand + Immer.
- **IndexedDB** is used for offline persistence.

---

## Deployment

### Production Build

```bash
cd web
npm run build
# Output in web/dist/
```

### Vercel

The repo has a `vercel.json` at the root that sets the build command to
`cd web && npm install && npm run build` and the output directory to
`web/dist`. Push the branch and Vercel picks it up.

---

## Testing Approach

- Unit tests with Vitest + Testing Library, co-located with source.
- 281 tests currently passing. Run with `npm test` from `web/`.

---

## Important Files

| File | Purpose |
|------|---------|
| `web/src/core/store/index.ts` | Global state |
| `web/src/core/db.ts` | IndexedDB schema |
| `web/src/core/optimizer.ts` | Genetic algorithm (slot-based) |
| `web/src/core/layouts.ts` | Layout generators (rows / clusters / U / circle / custom) |
| `web/src/workers/optimizer.worker.ts` | Worker entry point |
| `web/src/features/layout/LayoutPanel.tsx` | Layout picker UI |
| `web/src/features/classroom/ClassroomGrid.tsx` | Seating grid (row-based + absolute renderers) |
| `web/src/types/global.d.ts` | Shared TypeScript types |

---

## Gotchas

### Layout changes clear `result`

Switching layout type (or changing rows/cols/cluster size/custom rows)
clears `result`, `lockedSeats`, and `selectedSeatKey` — the old seat
positions no longer match the new shape. The user has to click Optimize
again. This is intentional.

### `viewMode` vs `layoutDef.type`

`viewMode` is the **view** (`rows` | `pairs` | `clusters` | `3d`) —
purely visual. `layoutDef.type` is the **room shape** (`rows` |
`clusters` | `u-shape` | `circle` | `custom-rows`) — determines the
underlying seat positions used by the optimizer. Don't conflate them.

### Non-grid layouts use absolute positioning

For `clusters` / `u-shape` / `circle`, ClassroomGrid switches to an
absolute-positioned renderer driven by each seat's normalized `x`/`y`.
The same approach is used in PrintView. `rows` and `custom-rows` keep
the original row-based renderer.

### Drag & Drop

- @dnd-kit `DragOverlay` already moves a copy with the cursor — **do
  not** also apply `CSS.Translate` to the original element, or you'll
  see two ghosts.

### TypeScript

- Use `import type` for type-only imports.
- Use `// @ts-ignore` sparingly.

---

## Related Documentation

- `README.md` — overview & quick start
- `PLAN.md` — architecture plan (some of this is aspirational; check
  the current code first)
- `docs/FUTURE_PLANS.md` — roadmap
- `docs/API.md` — API documentation
- `docs/ALGORITHMS.md` — algorithm details

---

*Last updated: 2026-05-14*
