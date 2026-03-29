# SeatAI - Enterprise-Grade Classroom Seating Optimizer

> **Note:** This document describes the planned architecture. For current implementation status, see the actual codebase and README.md.

## Project Overview

**SeatAI** is a high-performance classroom seating optimization platform that uses genetic algorithms to find optimal student placements. Built with TypeScript + React for a beautiful, responsive UI, with planned Rust + WebAssembly for performance optimization.

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
├── core/                              # Rust Core (WASM) - Currently minimal
│   ├── src/
│   │   └── lib.rs                     # WASM exports (basic)
│   └── Cargo.toml
│
├── web/                               # React Frontend
│   ├── src/
│   │   ├── app/
│   │   │   └── App.tsx                # Main app component
│   │   ├── components/                # Shared UI components
│   │   │   ├── ErrorBoundary.tsx
│   │   │   └── LanguageSelector.tsx
│   │   ├── features/                  # Feature-based organization
│   │   │   ├── classroom/             # Classroom grid & seats
│   │   │   │   ├── ClassroomGrid.tsx
│   │   │   │   ├── SeatCard.tsx
│   │   │   │   ├── GridControls.tsx
│   │   │   │   └── RelationshipOverlay.tsx
│   │   │   ├── students/              # Student management
│   │   │   │   ├── StudentList.tsx
│   │   │   │   └── StudentForm.tsx
│   │   │   ├── optimization/          # Metrics & results
│   │   │   │   ├── MetricsPanel.tsx
│   │   │   │   └── ExplanationPanel.tsx
│   │   │   ├── settings/              # Configuration
│   │   │   │   └── SettingsPanel.tsx
│   │   │   ├── export/                # PDF/Image export
│   │   │   │   └── ExportButton.tsx
│   │   │   ├── import/                # CSV import
│   │   │   │   └── CsvImport.tsx
│   │   │   ├── projects/              # Multi-class projects
│   │   │   │   └── ProjectManager.tsx
│   │   │   ├── print/                 # Print view
│   │   │   │   └── PrintView.tsx
│   │   │   └── onboarding/            # First-run experience
│   │   │       └── OnboardingView.tsx
│   │   ├── core/                      # Core infrastructure
│   │   │   ├── wasm/
│   │   │   │   └── loader.ts          # WASM initialization
│   │   │   ├── store/
│   │   │   │   └── index.ts           # Zustand global store
│   │   │   ├── db.ts                  # Dexie IndexedDB schema
│   │   │   └── optimizer.ts           # TS genetic algorithm
│   │   ├── workers/                   # Web workers
│   │   │   └── optimizer.worker.ts    # Background optimization
│   │   ├── hooks/                     # Custom React hooks
│   │   │   ├── useOptimizer.ts
│   │   │   ├── useLanguage.ts
│   │   │   └── useSeatingHistory.ts
│   │   ├── types/                     # TypeScript definitions
│   │   │   ├── index.ts
│   │   │   └── global.d.ts
│   │   ├── utils/                     # Utility functions
│   │   │   ├── sampleData.ts
│   │   │   └── seatingUtils.ts
│   │   └── main.tsx                   # Entry point
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── tsconfig.json
│
├── docs/                              # Documentation
│   ├── API.md                         # API reference
│   ├── ALGORITHMS.md                  # Algorithm documentation
│   ├── DEPLOYMENT.md                  # Deployment guide
│   └── FUTURE_PLANS.md                # Future roadmap
│
├── CLAUDE.md                          # AI assistant guidelines
├── CONTRIBUTING.md                    # Contribution guidelines
├── README.md                          # Project overview
├── PLAN.md                            # This file - Architecture plan
└── package.json                       # Root workspace
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

> **Current Status:** The project has diverged from this original plan. The core is implemented in TypeScript (`web/src/core/optimizer.ts`) rather than Rust/WASM. Many features beyond Phase 2 have been implemented.

### Phase 1: Core Foundation ✅
**Goal: Working MVP with clean architecture**

| Task | Files | Status |
|------|-------|--------|
| Algorithm (TS implementation) | `web/src/core/optimizer.ts` | ✅ |
| Data models | `web/src/types/global.d.ts` | ✅ |
| Fitness functions | Built into optimizer.ts | ✅ |
| React project setup | `web/package.json`, `vite.config.ts` | ✅ |
| Basic UI shell | `web/src/app/App.tsx` | ✅ |
| WASM loader | `web/src/core/wasm/loader.ts` | ✅ (planned for future use) |

**Note:** Original plan called for Rust/WASM core; currently using TypeScript implementation.

### Phase 2: Feature Complete ✅
**Goal: Production-ready UX**

| Task | Files | Status |
|------|-------|--------|
| Student management UI | `web/src/features/students/*` | ✅ |
| Classroom grid with animations | `web/src/features/classroom/*` | ✅ |
| Metrics visualization | `web/src/features/optimization/*` | ✅ |
| Settings panel | `web/src/features/settings/*` | ✅ |
| Local persistence (Dexie) | `web/src/core/db.ts`, `web/src/core/store/*` | ✅ |
| Sample data | `web/src/utils/sampleData.ts` | ✅ |
| Web worker optimization | `web/src/workers/optimizer.worker.ts` | ✅ |

**Deliverable:** Full CRUD for students, animated grid, persisted state

### Phase 3: Polish & Export ✅
**Goal: Professional output**

| Task | Files | Status |
|------|-------|--------|
| PDF export | `web/src/features/export/ExportButton.tsx` | ✅ |
| Image export | `web/src/features/export/ExportButton.tsx` | ✅ |
| Print view | `web/src/features/print/PrintView.tsx` | ✅ |
| CSV import | `web/src/features/import/CsvImport.tsx` | ✅ |
| UI polish & animations | All components | ✅ |
| Error handling | `web/src/components/ErrorBoundary.tsx` | ✅ |
| Loading states | Various components | ✅ |

### Phase 4: Advanced Features ✅
**Goal: Enterprise readiness**

| Task | Files | Status |
|------|-------|--------|
| Multi-class projects | `web/src/features/projects/ProjectManager.tsx` | ✅ |
| Onboarding | `web/src/features/onboarding/OnboardingView.tsx` | ✅ |
| Explanation panel | `web/src/features/results/ExplanationPanel.tsx` | ✅ |
| i18n support | `web/src/hooks/useLanguage.ts` | ✅ |
| Seating history | `web/src/hooks/useSeatingHistory.ts` | ✅ |

### Phase 5: Backend (Future)
**Goal: Multi-user collaboration**

| Task | Files | Priority |
|------|-------|----------|
| Backend API | Not implemented | Future |
| Authentication | Not implemented | Future |
| Cloud sync | Not implemented | Future |
| Analytics | Not implemented | Future |

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
cd seatai

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
