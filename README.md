# SeatAI

> AI-powered classroom seating optimization platform

![SeatAI](https://img.shields.io/badge/version-1.0.0-blue)
![React](https://img.shields.io/badge/react-18-blue)
![TypeScript](https://img.shields.io/badge/typescript-5-blue)
![License](https://img.shields.io/badge/license-MIT-green)

Classroom seating arrangement tool that uses a genetic algorithm to find good
student placements based on academic balance, behavioral compatibility,
diversity, and special needs. Runs entirely in the browser — no server, no
sign-in, no internet required after first load.

## Features

- **Multi-layout** — rows, clusters, U-shape, circle, and custom variable-row layouts
- **Multi-start genetic optimizer** — runs in a Web Worker so the UI never freezes. Fast / Balanced / Best quality presets.
- **Drag-and-drop** — swap students by dragging, clicking, or keyboard arrows
- **Click any student** — opens an AI-reasoning drawer explaining why they were placed where they are: strengths, tradeoffs, neighbor analysis, rotation history
- **Optional LLM explanations** — opt-in, browser-direct integration using the teacher's own API key
- **Constraints** — front-row, back-row, keep-together, keep-apart, on-aisle, near-window, peer-mentor pairs
- **Student personalization** — photos and free-text teacher notes per student
- **CSV import + export** — including a downloadable template; export to CSV, JSON, PDF, image
- **Three sample classes** — Small / Standard / Large pre-built rosters for instant demo
- **Undo / redo** — every seating change is reversible (Ctrl+Z / Ctrl+Y)
- **Multi-class** — save and switch between classroom projects
- **Visual diff** — highlight which students moved between optimization runs
- **Rotation tracker** — see when each student last sat next to each of their neighbors
- **Light / dark / system theme** with adjustable text size
- **Offline-first PWA** — installable, data persists to IndexedDB
- **Mobile + tablet responsive** — sidebar collapses into a drawer on small screens
- **RTL** — Hebrew and Arabic layouts

---

## For schools & IT

SeatAI is built to be deployable inside a school with **zero data flowing
off the device**. The whole thing is a static web app — there is no
backend, no API to call, and no account to create.

### Data & privacy

- **Local-only.** Every roster, note, photo, and saved seating plan lives in
  the teacher's own browser via IndexedDB. Nothing is sent to a server.
- **No accounts.** No login, no email, no signup. Open the URL and you're
  working.
- **No tracking.** No analytics, no telemetry, no third-party scripts.
- **Optional AI explanations** are off by default. If a teacher turns them
  on, the API key they enter is stored only in their browser and the call
  goes **direct from their browser** to the LLM provider — SeatAI's host
  never sees the key or the prompt.
- **Backup.** Because the data lives on the device, teachers should use the
  built-in "Backup all data" button in the Projects panel periodically to
  keep an off-browser copy (a single `.json` they can email themselves or
  drop on a shared drive). The Restore button reads the same file back.

### Sharing charts safely

The print view has an **Anonymize (initials only)** toggle that swaps
every student's name for a first-initial before printing, for handing a
chart to a substitute, parent volunteer, or specialist who shouldn't see
the full roster.

### Deployment

The production build (`npm run build`) emits a `dist/` folder of plain
HTML, CSS, JS, and a service worker. Host it on anything that serves
static files — the school's own web server, an S3/Cloud bucket, Vercel
(`vercel.json` is included), GitHub Pages, or a USB drive. After the first
load the PWA cache means the app works fully offline; teachers can install
it as a desktop/tablet app from the browser address bar.

### Browser support floor

Locked at the build level: Chrome 98+, Edge 98+, Firefox 114+, Safari 15.4+,
iOS Safari 15.4+. School devices on those versions or newer will work.

### Languages

English, Hebrew (RTL), Arabic (RTL), and Russian — all four are
fully translated.

---

## Quick Start

### Prerequisites

- **Node.js 20+** — [nodejs.org](https://nodejs.org)

### Installation

```bash
cd web
npm install
npm run dev
```

Open **http://localhost:5173**.

### Build

```bash
cd web
npm run build         # production build → web/dist/
npm test              # run the test suite
npm run lint          # ESLint check
```

## Browser support

SeatAI is a modern, no-backend single-page app. It targets evergreen
browsers and requires features that are only available on recent
versions:

| Browser | Minimum version | Released |
|---|---|---|
| Chrome / Edge | 98 | Feb 2022 |
| Firefox | 114 | May 2023 |
| Safari (macOS / iOS / iPadOS) | 15.4 | Mar 2022 |
| Samsung Internet | 17 | 2022 |

These floors are encoded in `web/package.json` (`browserslist`) and the
Vite build target (`es2022`). The hard requirements driving them are
`structuredClone` (Safari 15.4+, FF 94+) and ES-module Web Workers
(Firefox 114+) used by the optimizer.

Internet Explorer and pre-Chromium Edge are not supported. The PWA
install prompt requires Chrome / Edge / Samsung Internet; Safari users
can still add to home screen via the share menu.

## How It Works

### The Algorithm

SeatAI uses a **genetic algorithm** to optimize seating:

```
1. CREATE POPULATION
   └─ Generate ~100 random seat arrangements

2. EVOLUTION LOOP (~100 generations)
   ├─ Evaluate each arrangement's "fitness"
   │   ├─ Academic balance (mixed abilities per row)
   │   ├─ Behavioral (avoid incompatible neighbors)
   │   ├─ Diversity (gender/language mix)
   │   └─ Special needs (front row requirements)
   ├─ Select best arrangements (tournament selection)
   ├─ Crossover (combine two arrangements)
   └─ Mutate (shuffle some seats)

3. RETURN best arrangement found
```

### Fitness Function

| Objective | Default weight | Description |
|-----------|---------------|-------------|
| Academic Balance | 30% | Minimizes variance in rows for peer tutoring |
| Behavioral Balance | 30% | Avoids incompatible pairs, considers friend dynamics |
| Diversity | 20% | Gender and language/cultural diversity within rows |
| Special Needs | 20% | Front-row priority, accessibility |

Weights are user-configurable.

### Layout System

The optimizer is layout-agnostic. Each layout (rows, clusters, U-shape,
circle, custom-rows) is a generator that produces a flat list of **slots** —
seat positions with logical row/col, render coordinates, and a precomputed
neighbor set. The genetic algorithm walks the slot list. Adding a new
layout is a single function in `web/src/core/layouts.ts`.

## Architecture

```
seatai/
├── web/                           # React + TypeScript frontend (all the code)
│   ├── src/
│   │   ├── app/                   # App shell
│   │   ├── features/              # Feature-based UI (classroom, students,
│   │   │                          # layout, projects, print, export, …)
│   │   ├── core/
│   │   │   ├── optimizer.ts       # Genetic algorithm
│   │   │   ├── layouts.ts         # Layout generators (rows / clusters / …)
│   │   │   ├── store/             # Zustand store
│   │   │   └── db.ts              # Dexie IndexedDB
│   │   ├── workers/               # optimizer.worker.ts
│   │   ├── hooks/                 # Custom React hooks
│   │   ├── types/                 # TypeScript definitions
│   │   ├── utils/                 # Helpers
│   │   └── locales/               # en / he / ar / ru
│   └── vite.config.ts
│
├── docs/                          # Long-form docs
├── CLAUDE.md                      # AI assistant guidelines
├── PLAN.md                        # Project plan
└── README.md                      # This file
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Algorithm | TypeScript (Genetic Algorithm, slot-based) |
| Frontend | React 18 + TypeScript |
| Build | Vite 5 |
| State | Zustand + Immer |
| Styling | TailwindCSS 3 |
| Animation | Framer Motion 11 |
| Drag & Drop | @dnd-kit 6 |
| Storage | IndexedDB (Dexie.js 4) |
| Export | jsPDF + html2canvas |
| Testing | Vitest |
| Language Support | RTL for Hebrew/Arabic, en/he/ar/ru locales |

## Performance

Current TypeScript implementation, running in a Web Worker:

| Students | Optimization Time | Browser |
|----------|-------------------|---------|
| 30 | ~50ms | Chrome M1 |
| 100 | ~200ms | Chrome M1 |
| 500 | ~800ms | Chrome M1 |

## Configuration

### Objective Weights

```typescript
const weights = {
  academic_balance: 0.3,
  behavioral_balance: 0.3,
  diversity: 0.2,
  special_needs: 0.2,
};
```

### Algorithm Parameters

```typescript
const config = {
  populationSize: 100,
  maxGenerations: 100,
  crossoverRate: 0.8,
  mutationRate: 0.2,
  tournamentSize: 3,
  earlyStopPatience: 20,
};
```

## API

### Optimizer

```typescript
import { ClassroomOptimizer } from './core/optimizer';
import type { LayoutDef } from './core/layouts';

const layout: LayoutDef = { type: 'rows', rows: 5, cols: 6 };
const optimizer = new ClassroomOptimizer(students, layout);
optimizer.setWeights({ academic_balance: 0.3, behavioral_balance: 0.3, diversity: 0.2, special_needs: 0.2 });
optimizer.setConstraints({ separate_pairs: [], keep_together_pairs: [], front_row_ids: [], back_row_ids: [] });
const result = optimizer.optimize();
```

### Web Worker (recommended for large classes)

```typescript
import OptimizerWorker from './workers/optimizer.worker?worker';

const worker = new OptimizerWorker();
worker.postMessage({ type: 'optimize', students, layoutDef, weights, config, constraints });
worker.onmessage = (e) => console.log(e.data.result);
```

### Student Data Model

```typescript
interface Student {
  id: string;
  name: string;
  gender: 'male' | 'female' | 'other';
  academic_score: number;      // 0-100
  academic_level: 'advanced' | 'proficient' | 'basic' | 'below_basic';
  behavior_score: number;      // 0-100
  behavior_level: 'excellent' | 'good' | 'average' | 'challenging';
  friends_ids: string[];
  incompatible_ids: string[];
  requires_front_row: boolean;
  requires_quiet_area: boolean;
  has_mobility_issues: boolean;
  primary_language?: string;
}
```

## Contributing

For AI assistants working on this project, see [CLAUDE.md](CLAUDE.md) for
project context and conventions.

## License

MIT License — see [LICENSE](LICENSE).
