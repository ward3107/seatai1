# Changelog

All notable changes to SeatAI will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Planned
- WASM core implementation for performance
- Additional layout types (U-shape, clusters)
- Behavioral prediction engine
- Longitudinal tracking
- Smart rotation scheduler
- Parent portal
- Student collaboration features
- Backend sync (optional)

---

## [1.0.0] - 2026-03-29

### Added

#### Core Features
- Genetic algorithm optimization for classroom seating
- Fitness functions: academic balance, behavioral compatibility, diversity, special needs
- Configurable objective weights and algorithm parameters
- Constraint system: separate pairs, keep together pairs, front/back row assignments
- Web worker support for background optimization

#### Student Management
- Full CRUD operations for students
- Student form with comprehensive attributes
- Sample data generator (30 realistic students)
- CSV import functionality
- Student list with filtering and search

#### Classroom Visualization
- Interactive classroom grid with drag-and-drop seat swapping
- Visual seat cards with student information
- Relationship overlay showing friends (green) and conflicts (red)
- Hover info popups with detailed student data
- Grid controls for layout, zoom, and view options

#### Optimization Features
- Real-time optimization with progress feedback
- Metrics panel showing objective scores
- Explanation panel showing why students were placed where they are
- Multiple arrangement modes support
- Configurable algorithm parameters (population, generations, mutation rate, etc.)

#### Export & Print
- PDF export for substitute teachers
- Image export (PNG) for sharing
- Print-optimized view with clean layout
- Export with customizable options

#### Project Management
- Multi-class project support
- Project creation, editing, deletion
- Project switching
- Persistent project storage

#### User Experience
- Onboarding flow for first-time users
- Internationalization support (i18n)
- Language selector
- Responsive design for mobile and desktop
- Smooth animations with Framer Motion
- Loading states and error handling
- Undo/redo support for manual seat changes

#### Data Persistence
- IndexedDB storage via Dexie.js
- Offline-first architecture
- Automatic state persistence
- Seating history tracking

#### Technical
- TypeScript implementation of genetic algorithm
- Zustand + Immer for state management
- Feature-based code organization
- Web worker for optimization
- Comprehensive TypeScript types
- Testing setup with Vitest

#### Documentation
- README with quick start guide
- API documentation
- Algorithm documentation
- Deployment guide
- Architecture documentation
- Contribution guidelines
- AI assistant guidelines (CLAUDE.md)

### Changed
- Migrated from planned Rust/WASM to TypeScript implementation
- Updated architecture to reflect feature-based organization
- Improved documentation structure

### Technical Details
- **Build Tool:** Vite 5
- **Frontend:** React 18 + TypeScript 5.5
- **State:** Zustand 4 + Immer 10
- **Styling:** TailwindCSS 3
- **Animation:** Framer Motion 11
- **Drag & Drop:** @dnd-kit 6
- **Storage:** Dexie.js 4
- **Export:** jsPDF 2.5, html2canvas 1.4
- **Testing:** Vitest 2

---

## [0.2.0] - 2025-02-XX (from git history)

### Added
- Pairs layout support
- Onboarding screen
- Web worker for optimization
- Print view
- Back-row Google Analytics integration

### Changed
- Improved UI/UX
- Performance optimizations

---

## [0.1.0] - Earlier Development

### Added
- Initial project setup
- Basic genetic algorithm
- Simple classroom grid
- Student data model
- Optimization metrics display

---

## Format Reference

### Types of Changes
- `Added` - New features
- `Changed` - Changes in existing functionality
- `Deprecated` - Soon-to-be removed features
- `Removed` - Removed features
- `Fixed` - Bug fixes
- `Security` - Security vulnerability fixes

---

## Links

- [Git Repository](https://github.com/your-org/seatai)
- [Issue Tracker](https://github.com/your-org/seatai/issues)
- [Documentation](README.md)

---

*For detailed plans, see [docs/FUTURE_PLANS.md](docs/FUTURE_PLANS.md)*
