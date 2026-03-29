# SeatAI Architecture

This document describes the current architecture of SeatAI.

---

## Table of Contents

- [System Overview](#system-overview)
- [Technology Stack](#technology-stack)
- [Architecture Diagram](#architecture-diagram)
- [Frontend Architecture](#frontend-architecture)
- [State Management](#state-management)
- [Data Flow](#data-flow)
- [Component Structure](#component-structure)
- [Performance Optimizations](#performance-optimizations)

---

## System Overview

SeatAI is a **client-side single-page application** for classroom seating optimization. The entire application runs in the browser with no server-side requirements.

### Key Characteristics

- **Static SPA** - No server-side runtime required
- **Offline-first** - Works without internet after initial load
- **Local storage** - All data persisted in browser via IndexedDB
- **Optimization in browser** - Genetic algorithm runs client-side
- **Export capabilities** - PDF and image export handled client-side

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        USER BROWSER                          │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                     REACT UI LAYER                      │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐ │ │
│  │  │ Features │  │ Shared   │  │ App      │  │ i18n   │ │ │
│  │  │ Modules  │  │ UI       │  │ Shell    │  │        │ │ │
│  │  └─────┬────┘  └─────┬────┘  └─────┬────┘  └───┬────┘ │ │
│  │        └───────────────┴─────────────┴──────────┘     │ │
│  │                          │                             │ │
│  │                   ┌──────▼──────┐                      │ │
│  │                   │ ZUSTAND     │  ← State Management  │ │
│  │                   │ STORE       │                      │ │
│  │                   └──────┬──────┘                      │ │
│  └──────────────────────────┼─────────────────────────────┘ │
│                             │                                │
│  ┌──────────────────────────▼─────────────────────────────┐ │
│  │                     SERVICE LAYER                       │ │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────────┐   │ │
│  │  │ Optimizer  │  │ Storage    │  │ Workers         │   │ │
│  │  │ (GA impl)  │  │ (Dexie)    │  │ (Web Workers)   │   │ │
│  │  └────────────┘  └────────────┘  └────────────────┘   │ │
│  └─────────────────────────────────────────────────────────┘ │
│                             │                                │
│  ┌──────────────────────────▼─────────────────────────────┐ │
│  │                   BROWSER APIS                          │ │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────────┐   │ │
│  │  │ IndexedDB  │  │ Web Worker│  │ File Export     │   │ │
│  │  └────────────┘  └────────────┘  │ (jsPDF/html2c.)│   │ │
│  │                                   └────────────────┘   │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## Technology Stack

| Layer | Technology | Purpose | Status |
|-------|------------|---------|--------|
| **Core Algorithm** | TypeScript | Genetic algorithm implementation | ✅ Current |
| **Core Algorithm** | Rust + WASM | High-performance optimization | ⚠️ Exists, not integrated |
| **UI Framework** | React 18 | Component-based UI | ✅ Active |
| **Build Tool** | Vite 5 | Fast development & optimized builds | ✅ Active |
| **State Management** | Zustand 4 + Immer 10 | Simple, performant state | ✅ Active |
| **Styling** | TailwindCSS 3 | Utility-first styling | ✅ Active |
| **Animation** | Framer Motion 11 | Smooth transitions | ✅ Active |
| **Drag & Drop** | @dnd-kit 6 | Accessible DnD library | ✅ Active |
| **Storage** | Dexie.js 4 | IndexedDB wrapper | ✅ Active |
| **Export** | jsPDF 2.5, html2canvas 1.4 | PDF/image generation | ✅ Active |
| **Testing** | Vitest 2 | Unit testing | ⚠️ Configured, no tests yet |
| **i18n** | Custom hook | RTL support for HE/AR | ⚠️ RTL only, no translations |
| **Language** | TypeScript 5.5 | Type safety |

---

## Architecture Diagram

### Project Structure

```
web/src/
├── app/                    # App shell
│   └── App.tsx            # Main application component
│
├── components/             # Shared UI components
│   ├── ErrorBoundary.tsx  # Error handling
│   └── LanguageSelector.tsx # Language switching
│
├── features/              # Feature-based modules ⭐
│   ├── classroom/         # Classroom visualization
│   │   ├── ClassroomGrid.tsx     # Main grid view
│   │   ├── SeatCard.tsx          # Individual seat
│   │   ├── GridControls.tsx      # Grid controls
│   │   └── RelationshipOverlay.tsx # Friend/conflict lines
│   │
│   ├── students/          # Student CRUD
│   │   ├── StudentList.tsx        # List view
│   │   └── StudentForm.tsx        # Add/edit form
│   │
│   ├── optimization/      # Results & metrics
│   │   ├── MetricsPanel.tsx       # Score breakdown
│   │   └── ExplanationPanel.tsx   # Optimization explanation
│   │
│   ├── settings/          # Configuration
│   │   └── SettingsPanel.tsx      # Weights & config UI
│   │
│   ├── export/            # Export functionality
│   │   └── ExportButton.tsx       # PDF/image export
│   │
│   ├── import/            # Import functionality
│   │   └── CsvImport.tsx          # CSV import
│   │
│   ├── projects/          # Multi-class projects
│   │   └── ProjectManager.tsx     # Project management
│   │
│   ├── print/             # Print view
│   │   └── PrintView.tsx          # Print-optimized layout
│   │
│   └── onboarding/        # First-run experience
│       └── OnboardingView.tsx    # Welcome/onboarding
│
├── core/                  # Core infrastructure
│   ├── wasm/              # WASM integration (future)
│   │   └── loader.ts              # WASM loader
│   │
│   ├── store/             # Global state
│   │   └── index.ts               # Zustand store
│   │
│   ├── db.ts              # IndexedDB schema (Dexie)
│   └── optimizer.ts       # Genetic algorithm implementation
│
├── workers/               # Web workers
│   └── optimizer.worker.ts        # Background optimization
│
├── hooks/                 # Custom React hooks
│   ├── useOptimizer.ts            # Optimization logic
│   ├── useLanguage.ts             # i18n
│   └── useSeatingHistory.ts       # History tracking
│
├── types/                 # TypeScript definitions
│   ├── index.ts                  # Type exports
│   └── global.d.ts               # Global type declarations
│
├── utils/                 # Utility functions
│   ├── sampleData.ts             # Sample student data
│   └── seatingUtils.ts           # Seating utilities
│
└── main.tsx               # Application entry point
```

---

## Frontend Architecture

### Component Hierarchy

```
App
├── ErrorBoundary
├── LanguageSelector
├── OnboardingView (conditional on first visit)
│
└── MainLayout
    ├── ProjectManager (multi-class switching)
    │
    ├── SplitView
    │   ├── Left Panel
    │   │   ├── StudentList
    │   │   │   └── StudentForm (add/edit)
    │   │   │
    │   │   ├── SettingsPanel
    │   │   │   ├── Weight sliders
    │   │   │   └── Algorithm config
    │   │   │
    │   │   └── OptimizationPanel
    │   │       ├── MetricsPanel (scores)
    │   │       ├── ExplanationPanel (why arranged this way)
    │   │       └── Optimize button
    │   │
    │   └── Right Panel
    │       ├── GridControls
    │       │   ├── Layout type selector
    │       │   ├── Zoom controls
    │       │   └── Export/Import buttons
    │       │
    │       └── ClassroomGrid
    │           ├── SeatCard (for each seat)
    │           │   └── Student info on hover
    │           └── RelationshipOverlay
    │               └── Friend/conflict lines
    │
    └── PrintView (separate route)
```

### Data Flow

```
User Action → Component → Zustand Store → Service Layer → Result → Update Store → Re-render
```

**Example: Optimize Seating**

1. User clicks "Optimize" button in `OptimizationPanel`
2. Component calls `useOptimizer` hook
3. Hook reads students/config from Zustand store
4. `ClassroomOptimizer` runs genetic algorithm
5. Result returned to hook
6. Hook updates Zustand store with result
7. Components re-render with new seating layout

---

## State Management

### Zustand Store Structure

The global store is divided into logical slices:

```typescript
interface RootState {
  // Classroom: seats, layout, dimensions
  classroom: ClassroomState

  // Students: list, CRUD operations
  students: StudentsState

  // Optimization: results, weights, config
  optimization: OptimizationState

  // Projects: multi-class management
  projects: ProjectsState

  // UI: loading states, modals, etc.
  ui: UIState
}
```

### State Persistence

| Data | Storage | TTL |
|------|---------|-----|
| Students | IndexedDB (via Dexie) | Permanent |
| Projects | IndexedDB (via Dexie) | Permanent |
| Current optimization result | IndexedDB | Permanent |
| UI state | Zustand memory | Session |

### Data Sync Flow

```
┌─────────────┐
│  Component  │
└──────┬──────┘
       │
       ├─→ Zustand Store (immediate)
       │       └─→ Component re-renders
       │
       └─→ IndexedDB (persisted)
               └─→ Available after refresh
```

---

## Component Structure

### Feature-Based Organization ⭐

SeatAI uses a **feature-based** structure rather than traditional layer-based organization:

**Traditional (NOT used):**
```
src/
├── components/
├── hooks/
├── services/
└── types/
```

**Feature-based (ACTUAL):**
```
src/features/my-feature/
├── MyFeature.tsx       # Component
├── hooks.ts            # Feature-specific hooks
├── types.ts            # Feature-specific types
└── utils.ts            # Feature-specific utils
```

**Benefits:**
- Co-located related code
- Easier to find feature implementations
- Clearer feature boundaries
- Simpler to add/remove features

---

## Performance Optimizations

### Web Workers

Optimization runs in a web worker to avoid blocking the UI:

```
Main Thread                Worker Thread
    │                           │
    ├─→ spawn worker            │
    │                           ├─→ receive students/config
    │                           ├─→ run genetic algorithm
    │                           │   (can take 100-500ms)
    │                           ├─→ postMessage(result)
    ├─← receive result           │
    └─→ update UI                │
```

### Virtualization (Future)

For large classrooms (100+ students), the grid will use virtualization:
- Only render visible seats
- Recycle seat components
- Reduce DOM nodes

### Lazy Loading

Features are code-split by route:
```typescript
const PrintView = lazy(() => import('@/features/print/PrintView'));
```

### WASM (Planned)

Future performance improvements:
- Core algorithm in Rust/WASM
- 10-50x faster than JavaScript
- Smaller bundle size

---

## Key Design Patterns

### 1. Feature Modules

Each feature is self-contained with its own components, hooks, and types.

### 2. Repository Pattern

`db.ts` provides a clean interface to IndexedDB:
```typescript
await db.students.add(student);
await db.students.where('projectId').equals(id).toArray();
```

### 3. Observer Pattern

Zustand store observes changes and notifies subscribers:
```typescript
const seats = useClassroomStore(state => state.seats);
```

### 4. Strategy Pattern

Genetic algorithm can be swapped for other optimization strategies (future).

### 5. Factory Pattern

Student creation, optimization, etc. use factory functions for consistency.

---

## Security Considerations

Since SeatAI is client-side only:

| Risk | Mitigation |
|------|------------|
| XSS from user input | Sanitize all inputs, use React's default escaping |
| Data leakage | All data local, no server transmission |
| CSRF | Not applicable (no server) |
| Injection | No SQL, validate CSV imports |

---

## Deployment Architecture

SeatAI is deployed as **static assets**:

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   GitHub    │────▶│   Vercel    │────▶│   CDN Edge  │
│  Repository │     │   Build     │     │  (Global)   │
└─────────────┘     └─────────────┘     └─────────────┘
                                                │
                                                ▼
                                         ┌─────────────┐
                                         │   Browser   │
                                         │ (Static SPA)│
                                         └─────────────┘
```

**Deployment Steps:**
1. Push to GitHub
2. Vercel auto-builds (`npm run build`)
3. Assets deployed to CDN
4. Users load from nearest edge

---

## Implementation Status

### Current State (v1.0.0)

| Component | Implementation | Notes |
|-----------|----------------|-------|
| Optimization Engine | TypeScript | Working, fast enough for <100 students |
| WASM Module | Rust code exists | Not built, not integrated |
| i18n/Translations | RTL support only | English UI, RTL layout for HE/AR |
| State Management | Zustand | Fully functional |
| Data Persistence | Dexie (IndexedDB) | Offline-first working |
| Testing | Vitest configured | 0 test files, needs coverage |
| CI/CD | None | No GitHub workflows |

### Planned Improvements (Hybrid Approach)

1. **WASM as Optional Boost**
   - Keep TypeScript as default
   - Build WASM from existing Rust code
   - Add performance toggle in settings
   - Fallback to TS if WASM fails

2. **Basic i18n Translations**
   - Create translation system
   - Add en.json, he.json, ar.json, ru.json
   - Translate key UI strings
   - Keep RTL support

3. **Critical Test Coverage**
   - Optimizer unit tests
   - Store tests
   - Key component tests
   - CI integration

---

## Future Architecture

### Planned Improvements

1. **WASM Core**
   - Port algorithm to Rust
   - Compile to WASM
   - 10-50x performance boost

2. **Backend (Optional)**
   - Cloud sync for projects
   - Multi-user collaboration
   - Analytics dashboard

3. **PWA Support**
   - Service worker for offline
   - App manifest
   - Install to desktop

4. **Plugin System**
   - Custom fitness functions
   - Custom constraints
   - Community extensions

---

*Last updated: 2026-03-29*
