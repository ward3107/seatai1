# SeatAI

> AI-powered classroom seating optimization platform

![SeatAI](https://img.shields.io/badge/version-1.0.0-blue)
![Rust](https://img.shields.io/badge/rust-1.70%2B-orange)
![React](https://img.shields.io/badge/react-18-blue)
![License](https://img.shields.io/badge/license-MIT-green)

High-performance classroom seating arrangement tool that uses genetic algorithms to find optimal student placements based on academic balance, behavioral compatibility, diversity, and special needs.

## Features

- ⚡ **Fast Optimization** - Genetic algorithm for optimal seating arrangements
- 🎨 **Beautiful UI** - Smooth animations with Framer Motion
- 💾 **Offline First** - Works without internet, data stored locally
- 📱 **Responsive** - Works on desktop and mobile
- 📤 **Export** - PDF and image export capabilities
- 🔧 **Configurable** - Adjustable weights and algorithm parameters
- 🌐 **RTL Support** - Right-to-left layout for Hebrew and Arabic

---

## Screenshots

### Main Interface

<!-- TODO: Add screenshot of main classroom interface -->
*The main classroom interface showing the seating grid, student list, and optimization panel.*

### Student Management

<!-- TODO: Add screenshot of student form -->
*Student form with all fields for academic, behavioral, and special needs data.*

### Optimization Results

<!-- TODO: Add screenshot of metrics panel -->
*Optimization results showing fitness scores and objective breakdown.*

### Export Options

<!-- TODO: Add screenshot of export dialog -->
*PDF and image export options for sharing seating arrangements.*

### Multi-Language Support

<!-- TODO: Add screenshot of RTL layout -->
*Right-to-left layout for Hebrew and Arabic languages.*

---

*Note: Screenshots will be added soon. To capture screenshots:*
1. *Run the app: `cd web && npm run dev`*
2. *Open http://localhost:5173 in your browser*
3. *Use screenshot tool or Snipping Tool (Windows)*

## Quick Start

### Prerequisites

1. **Rust** - Install from [rustup.rs](https://rustup.rs)
2. **wasm-pack** - Run: `cargo install wasm-pack`
3. **Node.js 18+** - Install from [nodejs.org](https://nodejs.org)

### Installation

```bash
# Clone or navigate to project
cd seatai

# Install frontend dependencies
cd web
npm install

# Build WASM core
cd ../core
wasm-pack build --target web --out-dir ../web/src/wasm

# Start development server
cd ../web
npm run dev
```

Open **http://localhost:5173** in your browser.

## How It Works

### The Algorithm

SeatAI uses a **genetic algorithm** to optimize seating arrangements:

```
1. CREATE POPULATION
   └─ Generate 100 random seat arrangements

2. EVOLUTION LOOP (100 generations)
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

| Objective | Weight | Description |
|-----------|--------|-------------|
| Academic Balance | 30% | Minimizes variance in rows for peer tutoring |
| Behavioral Balance | 30% | Avoids incompatible pairs, considers friend dynamics |
| Diversity | 20% | Gender and language/cultural diversity within rows |
| Special Needs | 20% | Front row priority, accessibility requirements |

## Architecture

```
seatai/
├── core/              # Rust + WASM algorithm
│   ├── src/
│   │   ├── models/    # Data structures
│   │   ├── algorithms/# Genetic algorithm
│   │   └── fitness/   # Fitness functions
│   └── Cargo.toml
│
├── web/               # React frontend
│   ├── src/
│   │   ├── app/       # App shell & routing
│   │   ├── features/  # Feature-based UI components
│   │   ├── core/      # State, WASM loader, storage
│   │   ├── hooks/     # Custom React hooks
│   │   ├── types/     # TypeScript definitions
│   │   └── utils/     # Utility functions
│   └── package.json
│
├── docs/              # Documentation
├── CLAUDE.md          # AI assistant guidelines
├── PLAN.md            # Detailed project plan
└── README.md          # This file
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Algorithm | TypeScript (Genetic Algorithm) |
| Optional (Future) | Rust + WebAssembly (planned) |
| Frontend | React 18 + TypeScript |
| Build | Vite 5 |
| State | Zustand + Immer |
| Styling | TailwindCSS 3 |
| Animation | Framer Motion 11 |
| Drag & Drop | @dnd-kit 6 |
| Storage | IndexedDB (Dexie.js 4) |
| Export | jsPDF + html2canvas |
| Testing | Vitest |
| Language Support | RTL for Hebrew/Arabic |

## Performance

Current TypeScript implementation:

| Students | Optimization Time | Browser |
|----------|-------------------|---------|
| 30 | ~50ms | Chrome M1 |
| 100 | ~200ms | Chrome M1 |
| 500 | ~800ms | Chrome M1 |

*WASM implementation (planned) expected to be 10-50x faster*

## Configuration

### Objective Weights

Adjust the importance of each optimization objective:

```typescript
const weights = {
  academic_balance: 0.3,    // 0.0 - 1.0
  behavioral_balance: 0.3,  // 0.0 - 1.0
  diversity: 0.2,           // 0.0 - 1.0
  special_needs: 0.2        // 0.0 - 1.0
};
```

### Algorithm Parameters

```typescript
const config = {
  populationSize: 100,      // More = better results, slower
  maxGenerations: 100,      // More = better results, slower
  crossoverRate: 0.8,       // 0.0 - 1.0
  mutationRate: 0.2,        // 0.0 - 1.0
  earlyStopPatience: 20     // Stop if no improvement
};
```

## API

### TypeScript Optimizer API

```typescript
import { ClassroomOptimizer } from './core/optimizer';

// Create optimizer
const optimizer = new ClassroomOptimizer(students, rows, cols);

// Set weights (optional)
optimizer.setWeights({
  academic_balance: 0.3,
  behavioral_balance: 0.3,
  diversity: 0.2,
  special_needs: 0.2
});

// Run optimization
const result = optimizer.optimize();
```

### Web Worker (Recommended for large classes)

```typescript
import OptimizerWorker from './workers/optimizer.worker?worker';

const worker = new OptimizerWorker();
worker.postMessage({ students, rows, cols, weights });
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
  friends_ids: string[];       // IDs of friends
  incompatible_ids: string[];  // IDs of students to avoid
  requires_front_row: boolean;
  requires_quiet_area: boolean;
  has_mobility_issues: boolean;
  primary_language?: string;
}
```

## Future Roadmap

### ✅ Completed
- [x] PDF export
- [x] Image export
- [x] Print view
- [x] CSV import
- [x] Drag-and-drop seat editing
- [x] Multi-class project management
- [x] Onboarding experience
- [x] Optimization explanation panel
- [x] RTL support (Hebrew/Arabic)

### 🚧 Planned Features
- [ ] Full i18n translations (currently English UI only)
- [ ] WASM optimization core (10-50x faster)
- [ ] Multiple layout types (clusters, U-shape)
- [ ] Shareable links
- [ ] Backend sync (optional)
- [ ] Smart rotation engine
- [ ] Behavioral prediction
- [ ] Longitudinal tracking

For detailed plans, see [docs/FUTURE_PLANS.md](docs/FUTURE_PLANS.md)

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

For AI assistants working on this project, see [CLAUDE.md](CLAUDE.md) for project context and conventions.

## License

MIT License - See [LICENSE](LICENSE) file for details.

---

Built with ❤️ using Rust, WebAssembly, and React
