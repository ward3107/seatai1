# SeatAI - Enterprise-Grade Classroom Seating Optimizer

## Project Overview

**SeatAI** is a high-performance classroom seating optimization platform that uses genetic algorithms to find optimal student placements. Built with Rust + WebAssembly for native-speed computation and React for a beautiful, responsive UI.

---

## Architecture

### System Design

```
┌─────────────────────────────────────────────────────────────┐
│                      FRONTEND (React)                        │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐        │
│  │  UI     │  │  State  │  │ Export  │  │  i18n   │        │
│  │ Layer   │  │ Manager │  │ Module  │  │ Module  │        │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘        │
│       │            │            │            │              │
│       └────────────┴─────┬──────┴────────────┘              │
│                          │                                   │
│                    ┌─────▼─────┐                            │
│                    │   API     │  ← Clean abstraction       │
│                    │  Adapter  │                            │
│                    └─────┬─────┘                            │
└──────────────────────────┼──────────────────────────────────┘
                           │
┌──────────────────────────┼──────────────────────────────────┐
│                     CORE (Rust/WASM)                         │
│                          │                                   │
│  ┌───────────────────────┼───────────────────────┐          │
│  │              OPTIMIZATION ENGINE               │          │
│  │  ┌─────────────┐  ┌─────────────┐  ┌───────┐ │          │
│  │  │  Genetic    │  │  Simulated  │  │  AI/  │ │          │
│  │  │  Algorithm  │  │  Annealing  │  │  ML   │ │          │
│  │  └─────────────┘  └─────────────┘  └───────┘ │          │
│  │         ↑               ↑               ↑     │          │
│  │  ┌─────────────────────────────────────────┐ │          │
│  │  │        PLUGIN SYSTEM (Trait-based)       │ │          │
│  │  │   - Custom fitness functions            │ │          │
│  │  │   - Custom constraint rules             │ │          │
│  │  │   - Custom optimization strategies      │ │          │
│  │  └─────────────────────────────────────────┘ │          │
│  └───────────────────────────────────────────────┘          │
│                          │                                   │
│  ┌───────────────────────┼───────────────────────┐          │
│  │              DATA MODELS (Serde)               │          │
│  │  Student │ Seat │ Layout │ Constraints │ Result│          │
│  └───────────────────────────────────────────────┘          │
└──────────────────────────────────────────────────────────────┘
```

### Scalability Strategy

| Level | Users | Strategy |
|-------|-------|----------|
| **Client-only** | 1 user | Pure WASM, localStorage |
| **Team** | 10-50 | IndexedDB sync, shareable links |
| **School** | 100-1000 | Optional backend (Firebase/Supabase) |
| **Enterprise** | 1000+ | Full backend with multi-tenancy |

---

## Project Structure

```
seatai/
├── core/                              # Rust Core (WASM)
│   ├── src/
│   │   ├── lib.rs                     # WASM exports
│   │   ├── engine/
│   │   │   ├── mod.rs
│   │   │   ├── optimizer.rs           # Main optimizer trait
│   │   │   └── registry.rs            # Algorithm registry
│   │   ├── algorithms/
│   │   │   ├── mod.rs
│   │   │   ├── genetic.rs             # Genetic algorithm
│   │   │   ├── simulated_annealing.rs # Alternative algorithm
│   │   │   └── greedy.rs              # Fast greedy approach
│   │   ├── fitness/
│   │   │   ├── mod.rs
│   │   │   ├── academic.rs            # Academic balance
│   │   │   ├── behavioral.rs          # Behavior compatibility
│   │   │   ├── diversity.rs           # Gender/language mix
│   │   │   ├── special_needs.rs       # Accessibility
│   │   │   └── custom.rs              # User-defined fitness
│   │   ├── constraints/
│   │   │   ├── mod.rs
│   │   │   ├── separation.rs          # Keep students apart
│   │   │   ├── proximity.rs           # Keep students together
│   │   │   └── zone.rs                # Zone-based constraints
│   │   ├── models/
│   │   │   ├── mod.rs
│   │   │   ├── student.rs
│   │   │   ├── classroom.rs
│   │   │   ├── layout.rs
│   │   │   └── result.rs
│   │   └── utils/
│   │       ├── math.rs
│   │       └── serialization.rs
│   ├── Cargo.toml
│   └── tests/
│       ├── test_genetic.rs
│       └── test_fitness.rs
│
├── web/                               # React Frontend
│   ├── src/
│   │   ├── app/
│   │   │   ├── App.tsx
│   │   │   ├── routes.tsx
│   │   │   └── layout.tsx
│   │   ├── features/                  # Feature-based organization
│   │   │   ├── classroom/
│   │   │   │   ├── ClassroomGrid.tsx
│   │   │   │   ├── SeatCard.tsx
│   │   │   │   ├── classroomSlice.ts
│   │   │   │   └── types.ts
│   │   │   ├── students/
│   │   │   │   ├── StudentList.tsx
│   │   │   │   ├── StudentForm.tsx
│   │   │   │   ├── studentsSlice.ts
│   │   │   │   └── types.ts
│   │   │   ├── optimization/
│   │   │   │   ├── OptimizationPanel.tsx
│   │   │   │   ├── MetricsDisplay.tsx
│   │   │   │   ├── optimizationSlice.ts
│   │   │   │   └── types.ts
│   │   │   ├── settings/
│   │   │   │   ├── SettingsPanel.tsx
│   │   │   │   ├── AlgorithmConfig.tsx
│   │   │   │   └── types.ts
│   │   │   └── export/
│   │   │       ├── ExportDialog.tsx
│   │   │       ├── PdfExporter.ts
│   │   │       └── ImageExporter.ts
│   │   ├── core/
│   │   │   ├── wasm/
│   │   │   │   ├── loader.ts
│   │   │   │   └── optimizer.ts
│   │   │   ├── store/
│   │   │   │   ├── index.ts
│   │   │   │   └── middleware.ts
│   │   │   ├── workers/
│   │   │   │   └── optimizer.worker.ts
│   │   │   └── storage/
│   │   │       ├── indexedDB.ts
│   │   │       └── sync.ts
│   │   ├── ui/                        # Reusable UI components
│   │   │   ├── Button/
│   │   │   ├── Card/
│   │   │   ├── Modal/
│   │   │   ├── Input/
│   │   │   ├── Select/
│   │   │   ├── Progress/
│   │   │   └── Toast/
│   │   ├── hooks/
│   │   │   ├── useOptimizer.ts
│   │   │   ├── useStudents.ts
│   │   │   ├── useStorage.ts
│   │   │   └── useExport.ts
│   │   ├── utils/
│   │   │   ├── sampleData.ts
│   │   │   ├── validation.ts
│   │   │   └── formatting.ts
│   │   ├── i18n/                      # Internationalization
│   │   │   ├── index.ts
│   │   │   └── locales/
│   │   │       ├── en.json
│   │   │       ├── he.json
│   │   │       └── ar.json
│   │   └── types/
│   │       └── global.d.ts
│   ├── public/
│   │   └── favicon.ico
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── tsconfig.json
│
├── backend/                           # OPTIONAL: Future backend
│   ├── src/
│   │   ├── api/
│   │   │   ├── routes/
│   │   │   ├── middleware/
│   │   │   └── validators/
│   │   ├── services/
│   │   │   ├── auth.ts
│   │   │   ├── sync.ts
│   │   │   └── analytics.ts
│   │   └── db/
│   │       ├── schema.ts
│   │       └── migrations/
│   └── package.json
│
├── shared/                            # Shared types & utilities
│   ├── types.ts
│   └── constants.ts
│
├── docs/                              # Documentation
│   ├── API.md
│   ├── ALGORITHMS.md
│   └── DEPLOYMENT.md
│
├── package.json                       # Root workspace
├── turbo.json                         # Turborepo config
├── README.md
└── LICENSE
```

---

## Tech Stack

| Layer | Technology | Justification |
|-------|------------|---------------|
| **Algorithm** | Rust + wasm-bindgen | 10-50x faster than JS, memory-safe |
| **Serialization** | serde + serde-wasm-bindgen | Zero-copy, type-safe |
| **Frontend** | React 18 + TypeScript | Best ecosystem, type safety |
| **Build** | Vite 5 | Fastest dev server, optimized builds |
| **State** | Zustand + Immer | Simple, performant, middleware support |
| **Styling** | TailwindCSS 3 | Utility-first, small bundle |
| **Animation** | Framer Motion | Best React animation library |
| **Storage** | Dexie.js (IndexedDB) | Async, IndexedDB wrapper |
| **Export** | jsPDF + html2canvas | PDF/image generation |
| **Monorepo** | Turborepo | Fast builds, caching |

---

## Implementation Phases

### Phase 1: Core Foundation ✅
**Goal: Working MVP with clean architecture**

| Task | Files | Status |
|------|-------|--------|
| Rust project setup | `core/Cargo.toml`, `lib.rs` | ✅ |
| Data models | `core/src/models/*.rs` | ✅ |
| Basic genetic algorithm | `core/src/algorithms/genetic.rs` | ✅ |
| Fitness functions | `core/src/fitness/*.rs` | ✅ |
| WASM bindings | `core/src/lib.rs` | ✅ |
| React project setup | `web/package.json`, `vite.config.ts` | ✅ |
| Basic UI shell | `web/src/app/*` | ✅ |
| WASM integration | `web/src/core/wasm/*` | ✅ |

**Deliverable**: Optimize 30 students in <50ms, display results

### Phase 2: Feature Complete ✅
**Goal: Production-ready UX**

| Task | Files | Status |
|------|-------|--------|
| Student management UI | `web/src/features/students/*` | ✅ |
| Classroom grid with animations | `web/src/features/classroom/*` | ✅ |
| Metrics visualization | `web/src/features/optimization/*` | ✅ |
| Settings panel | `web/src/features/settings/*` | ✅ |
| Local persistence | `web/src/core/store/*` | ✅ |
| Sample data | `web/src/utils/sampleData.ts` | ✅ |

**Deliverable**: Full CRUD for students, animated grid, persisted state

### Phase 3: Polish & Export (Next)
**Goal: Professional output**

| Task | Files | Priority |
|------|-------|----------|
| PDF export | `web/src/features/export/*` | High |
| Image export | `web/src/features/export/*` | High |
| UI polish & animations | All components | Medium |
| Error handling | All files | High |
| Loading states | All components | Medium |

### Phase 4: Advanced Features (Future)
**Goal: Enterprise readiness**

| Task | Files | Priority |
|------|-------|----------|
| Alternative algorithms | `core/src/algorithms/*.rs` | Medium |
| Custom constraints | `core/src/constraints/*.rs` | Medium |
| CSV import | `web/src/features/students/*` | Medium |
| Multiple layouts | `core/src/models/layout.rs` | Low |
| i18n support | `web/src/i18n/*` | Low |

### Phase 5: Backend (Future)
**Goal: Multi-user collaboration**

| Task | Files | Priority |
|------|-------|----------|
| Backend API | `backend/src/api/*` | Future |
| Authentication | `backend/src/services/auth.ts` | Future |
| Cloud sync | `backend/src/services/sync.ts` | Future |
| Analytics | `backend/src/services/analytics.ts` | Future |

---

## Extension Points (Plugin System)

### Rust Traits for Extensibility

```rust
// Plugin trait for custom algorithms
pub trait Optimizer {
    fn optimize(&mut self, students: &[Student], config: &Config) -> Result;
    fn name(&self) -> &str;
    fn parameters(&self) -> Vec<Parameter>;
}

// Plugin trait for custom fitness functions
pub trait FitnessFunction: Send + Sync {
    fn calculate(&self, arrangement: &[Seat], students: &[Student]) -> f64;
    fn name(&self) -> &str;
    fn weight(&self) -> f64;
}

// Plugin trait for constraints
pub trait Constraint: Send + Sync {
    fn evaluate(&self, arrangement: &[Seat]) -> f64;
    fn is_hard(&self) -> bool;
}
```

---

## Performance Targets

| Metric | Target |
|--------|--------|
| WASM bundle size | < 200KB |
| Initial load | < 1s |
| 30 students optimization | < 50ms |
| 100 students optimization | < 200ms |
| 500 students optimization | < 1s |
| Animation frame rate | 60fps |

---

## Scalability Matrix

| Scenario | Current Support | Future Support |
|----------|-----------------|----------------|
| Single teacher | ✅ Client-only | ✅ |
| School (50 teachers) | ✅ Local-first | ✅ + Optional backend |
| District (500+ teachers) | ⚠️ Needs backend | ✅ Supabase/Firebase |
| Multi-school district | ❌ | ✅ Full backend |
| White-label SaaS | ❌ | ✅ Tenant isolation |

---

## Getting Started

### Prerequisites

1. **Rust** - Install from https://rustup.rs
2. **wasm-pack** - Run: `cargo install wasm-pack`
3. **Node.js 18+** - Install from https://nodejs.org

### Commands

```bash
# Navigate to project
cd C:\Users\User\Documents\Projects\seatai

# Install frontend dependencies
cd web && npm install && cd ..

# Build WASM core
cd core && wasm-pack build --target web --out-dir ../web/src/wasm && cd ..

# Start development server
cd web && npm run dev

# Build for production
cd web && npm run build
```

### Development URLs

- **Frontend**: http://localhost:5173
- **API Status**: (Future) http://localhost:3000/api/status

---

## Testing Strategy

### Rust Unit Tests
```rust
#[cfg(test)]
mod tests {
    #[test]
    fn test_academic_balance() { ... }
    #[test]
    fn test_genetic_convergence() { ... }
}
```

### React Component Tests (Vitest)
```typescript
describe('ClassroomGrid', () => {
  it('renders all seats', () => {...})
  it('animates on optimization', () => {...})
})
```

### E2E Tests (Playwright)
- Add students flow
- Optimization flow
- Export flow

---

## Future Extensibility

### Easy to Add Later:

1. **New Algorithms** - Implement `Optimizer` trait
2. **New Fitness Functions** - Implement `FitnessFunction` trait
3. **New Constraints** - Implement `Constraint` trait
4. **New Layout Types** - Add to `LayoutType` enum
5. **New Export Formats** - Add exporter module
6. **Backend** - Add `backend/` directory, same types

### AI/ML Integration Path:

```rust
// Future: ML-based optimization
pub struct MLOptimizer {
    model: NeuralNetwork,
}

impl Optimizer for MLOptimizer {
    fn optimize(&mut self, students: &[Student], config: &Config) -> Result {
        // Use trained model for initial placement
        // Refine with genetic algorithm
    }
}
```

---

## Deployment Options

### Static Hosting (Recommended for MVP)
- **Vercel**: `vercel --prod`
- **Netlify**: Drag & drop `web/dist`
- **Cloudflare Pages**: Connect GitHub

### Full Stack (Future)
- **Railway**: Deploy with Docker
- **Render**: Auto-deploy from GitHub
- **Fly.io**: Global edge deployment

---

## License

MIT License - See LICENSE file for details.

---

## Summary

This architecture provides:
- ✅ **Scalability**: Client-first with optional backend
- ✅ **Flexibility**: Plugin-based algorithm system
- ✅ **Performance**: Rust/WASM for computation
- ✅ **Maintainability**: Feature-based organization
- ✅ **Extensibility**: Traits for custom behavior
- ✅ **Future-proof**: Clear upgrade paths
