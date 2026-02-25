# SeatAI

> AI-powered classroom seating optimization platform

![SeatAI](https://img.shields.io/badge/version-1.0.0-blue)
![Rust](https://img.shields.io/badge/rust-1.70%2B-orange)
![React](https://img.shields.io/badge/react-18-blue)
![License](https://img.shields.io/badge/license-MIT-green)

High-performance classroom seating arrangement tool that uses genetic algorithms to find optimal student placements based on academic balance, behavioral compatibility, diversity, and special needs.

## Features

- ⚡ **Blazing Fast** - Rust + WebAssembly for native-speed optimization (10-50x faster than JS)
- 🎨 **Beautiful UI** - Smooth animations with Framer Motion
- 💾 **Offline First** - Works without internet, data stored locally
- 📱 **Responsive** - Works on desktop and mobile
- 📤 **Export** - PDF and image export capabilities
- 🔧 **Configurable** - Adjustable weights and algorithm parameters

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
│   │   ├── features/  # UI components
│   │   ├── core/      # State, WASM loader
│   │   └── hooks/     # Custom hooks
│   └── package.json
│
├── PLAN.md            # Detailed project plan
└── README.md          # This file
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Algorithm | Rust + wasm-bindgen |
| Frontend | React 18 + TypeScript |
| Build | Vite 5 |
| State | Zustand |
| Styling | TailwindCSS + Framer Motion |
| Storage | IndexedDB (Dexie.js) |
| Export | jsPDF + html2canvas |

## Performance

| Students | Optimization Time |
|----------|-------------------|
| 30 | < 50ms |
| 100 | < 200ms |
| 500 | < 1s |

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

### Rust/WASM API

```javascript
import init, { ClassroomOptimizer } from './wasm/seatai_core';

// Initialize
await init();

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

- [ ] PDF export
- [ ] Image export
- [ ] CSV import
- [ ] Multiple layout types (pairs, clusters, U-shape)
- [ ] Drag-and-drop seat editing
- [ ] Shareable links
- [ ] Backend sync (optional)
- [ ] Multi-language support

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `npm test`
5. Submit a pull request

## License

MIT License - See [LICENSE](LICENSE) file for details.

---

Built with ❤️ using Rust, WebAssembly, and React
