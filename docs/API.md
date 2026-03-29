# SeatAI API Documentation

This document describes the SeatAI API for both TypeScript and WASM interfaces.

---

## Table of Contents

- [Overview](#overview)
- [TypeScript Types](#typescript-types)
- [ClassroomOptimizer API](#classroomoptimizer-api)
- [State Management API](#state-management-api)
- [Storage API](#storage-api)
- [Examples](#examples)

---

## Overview

SeatAI provides a TypeScript-based genetic algorithm optimization.

**Current Implementation:**
- **TypeScript optimizer** (`web/src/core/optimizer.ts`) - Fully functional genetic algorithm
- **Web worker support** for background optimization
- **Pure JavaScript** - no external dependencies for the algorithm

**Planned Enhancements:**
- **WASM module** from Rust core (`core/src/`) for 10-50x performance boost (optional)
- The same `ClassroomOptimizer` interface will be maintained

---

## TypeScript Types

### Student

```typescript
interface Student {
  id: string;                              // Unique identifier
  name: string;                            // Full display name
  gender: 'male' | 'female' | 'other';     // Gender for diversity calculation
  age?: number;                            // Optional age
  academic_level: 'advanced' | 'proficient' | 'basic' | 'below_basic';
  academic_score: number;                  // 0-100, academic performance
  behavior_level: 'excellent' | 'good' | 'average' | 'challenging';
  behavior_score: number;                  // 0-100, behavioral score
  friends_ids: string[];                   // IDs of preferred neighbors
  incompatible_ids: string[];              // IDs to avoid sitting near
  special_needs: SpecialNeed[];            // Special accommodations
  requires_front_row: boolean;             // Must sit in front rows
  requires_quiet_area: boolean;            // Needs low-distraction zone
  has_mobility_issues: boolean;            // Needs accessible seating
  primary_language?: string;               // Primary language
  is_bilingual: boolean;                   // Can help ESL students
}
```

### SpecialNeed

```typescript
interface SpecialNeed {
  type: string;                    // Type of special need
  description?: string;            // Additional details
  requires_front_seat: boolean;    // Needs front row access
  requires_support_buddy: boolean; // Needs peer support nearby
}
```

### ObjectiveWeights

```typescript
interface ObjectiveWeights {
  academic_balance: number;    // 0.0 - 1.0, default: 0.3
  behavioral_balance: number;  // 0.0 - 1.0, default: 0.3
  diversity: number;           // 0.0 - 1.0, default: 0.2
  special_needs: number;       // 0.0 - 1.0, default: 0.2
}
```

**Weights must sum to approximately 1.0** for balanced optimization.

### GeneticConfig

```typescript
interface GeneticConfig {
  populationSize: number;      // Number of arrangements per generation (default: 100)
  maxGenerations: number;      // Maximum generations to run (default: 100)
  crossoverRate: number;       // 0.0 - 1.0, crossover probability (default: 0.8)
  mutationRate: number;        // 0.0 - 1.0, mutation probability (default: 0.2)
  tournamentSize: number;      // Selection tournament size (default: 3)
  earlyStopPatience: number;   // Stop if no improvement for N generations (default: 20)
}
```

### SeatingConstraints

```typescript
interface SeatingConstraints {
  separate_pairs: [string, string][];      // Student pairs that must be separated
  keep_together_pairs: [string, string][]; // Student pairs that should stay together
  front_row_ids: string[];                 // Students requiring front row
  back_row_ids: string[];                  // Students assigned to back row
}
```

### OptimizationResult

```typescript
interface OptimizationResult {
  layout: ClassroomLayout;                  // Final seating arrangement
  student_positions: Record<string, SeatPosition>; // Map of student ID → position
  fitness_score: number;                    // Overall fitness (higher is better)
  objective_scores: ObjectiveScores;        // Breakdown by objective
  generations: number;                      // Generations executed
  computation_time_ms: number;              // Time taken for optimization
  warnings: string[];                       // Any warnings or issues
}
```

### ObjectiveScores

```typescript
interface ObjectiveScores {
  academic_balance: number;    // 0-100, academic distribution score
  behavioral_balance: number;  // 0-100, behavioral compatibility score
  diversity: number;           // 0-100, gender/language diversity score
  special_needs: number;       // 0-100, special needs accommodation score
}
```

### ClassroomLayout

```typescript
interface ClassroomLayout {
  layout_type: 'rows' | 'pairs' | 'clusters' | 'u-shape' | 'circle' | 'flexible';
  rows: number;               // Number of rows
  cols: number;               // Number of columns
  total_seats: number;        // Total seats (rows × cols)
  seats: Seat[];              // Array of all seats
}
```

### Seat

```typescript
interface Seat {
  position: SeatPosition;    // Position in classroom
  student_id?: string;       // Assigned student (empty if no student)
  is_empty: boolean;         // Whether seat is unoccupied
}
```

### SeatPosition

```typescript
interface SeatPosition {
  row: number;              // 0-indexed row number
  col: number;              // 0-indexed column number
  is_front_row: boolean;    // True if row === 0
  is_near_teacher: boolean; // True if row === 0
}
```

### ClassProject

```typescript
interface ClassProject {
  id: string;                      // Unique project ID
  name: string;                    // Project name
  createdAt: string;               // ISO timestamp
  updatedAt: string;               // ISO timestamp
  students: Student[];             // All students in class
  rows: number;                    // Classroom rows
  cols: number;                    // Classroom columns
  weights: ObjectiveWeights;       // Optimization weights
  config: GeneticConfig;           // Algorithm config
  constraints: SeatingConstraints; // Seating constraints
  result: OptimizationResult | null; // Latest optimization result
}
```

---

## ClassroomOptimizer API

### Constructor

```typescript
new ClassroomOptimizer(students: Student[], rows: number, cols: number)
```

Creates a new optimizer instance.

**Parameters:**
- `students` - Array of Student objects to arrange
- `rows` - Number of rows in classroom
- `cols` - Number of columns in classroom

**Example:**
```typescript
const optimizer = new ClassroomOptimizer(students, 5, 6);
```

### Methods

#### setWeights

```typescript
setWeights(weights: ObjectiveWeights): void
```

Set optimization objective weights.

**Example:**
```typescript
optimizer.setWeights({
  academic_balance: 0.4,
  behavioral_balance: 0.3,
  diversity: 0.2,
  special_needs: 0.1
});
```

#### setConfig

```typescript
setConfig(config: GeneticConfig): void
```

Set genetic algorithm configuration.

**Example:**
```typescript
optimizer.setConfig({
  populationSize: 150,
  maxGenerations: 200,
  crossoverRate: 0.8,
  mutationRate: 0.2,
  tournamentSize: 3,
  earlyStopPatience: 30
});
```

#### setConstraints

```typescript
setConstraints(constraints: SeatingConstraints): void
```

Set seating constraints.

**Example:**
```typescript
optimizer.setConstraints({
  separate_pairs: [['student1', 'student2']],  // Keep apart
  keep_together_pairs: [['student3', 'student4']], // Keep together
  front_row_ids: ['student5'],  // Must be in front
  back_row_ids: []  // No back row assignments
});
```

#### optimize

```typescript
optimize(): OptimizationResult
```

Run the optimization algorithm and return the best arrangement found.

**Returns:** OptimizationResult with the best seating arrangement

**Example:**
```typescript
const result = optimizer.optimize();

console.log(`Fitness: ${result.fitness_score}`);
console.log(`Time: ${result.computation_time_ms}ms`);
console.log(`Academic balance: ${result.objective_scores.academic_balance}%`);
```

---

## State Management API

SeatAI uses Zustand for global state management. The store is defined in `web/src/core/store/index.ts`.

### Store Slices

#### Classroom Slice

```typescript
interface ClassroomState {
  // State
  seats: Seat[];
  rows: number;
  cols: number;
  layout: ClassroomLayout | null;

  // Actions
  setSeats: (seats: Seat[]) => void;
  setLayout: (layout: ClassroomLayout) => void;
  updateSeat: (id: string, data: Partial<Seat>) => void;
  clearClassroom: () => void;
}
```

#### Students Slice

```typescript
interface StudentsState {
  // State
  students: Student[];
  selectedStudentId: string | null;

  // Actions
  setStudents: (students: Student[]) => void;
  addStudent: (student: Student) => void;
  updateStudent: (id: string, data: Partial<Student>) => void;
  removeStudent: (id: string) => void;
  setSelectedStudent: (id: string | null) => void;
}
```

#### Optimization Slice

```typescript
interface OptimizationState {
  // State
  isOptimizing: boolean;
  result: OptimizationResult | null;
  weights: ObjectiveWeights;
  config: GeneticConfig;
  constraints: SeatingConstraints;

  // Actions
  setWeights: (weights: ObjectiveWeights) => void;
  setConfig: (config: GeneticConfig) => void;
  setConstraints: (constraints: SeatingConstraints) => void;
  setResult: (result: OptimizationResult) => void;
  clearResult: () => void;
}
```

#### Projects Slice

```typescript
interface ProjectsState {
  // State
  projects: ClassProject[];
  currentProjectId: string | null;

  // Actions
  setProjects: (projects: ClassProject[]) => void;
  setCurrentProject: (id: string | null) => void;
  addProject: (project: ClassProject) => void;
  updateProject: (id: string, data: Partial<ClassProject>) => void;
  deleteProject: (id: string) => void;
}
```

### Usage Example

```typescript
import { useClassroomStore, useStudentsStore } from '@/core/store';

function MyComponent() {
  const seats = useClassroomStore(state => state.seats);
  const setSeats = useClassroomStore(state => state.setSeats);

  const students = useStudentsStore(state => state.students);
  const addStudent = useStudentsStore(state => state.addStudent);

  // Use state and actions
  return <div>{/* ... */}</div>;
}
```

---

## Storage API

SeatAI uses Dexie.js (IndexedDB wrapper) for offline storage. Database schema is defined in `web/src/core/db.ts`.

### Database Tables

#### students

Stored student records.

```typescript
interface StudentRecord {
  id: string;        // Primary key
  data: Student;     // Student object
  projectId: string; // Associated project
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
}
```

#### projects

Stored class projects.

```typescript
interface ProjectRecord {
  id: string;        // Primary key
  data: ClassProject; // Project object
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
}
```

#### results

Stored optimization results.

```typescript
interface ResultRecord {
  id: string;              // Primary key
  projectId: string;       // Associated project
  result: OptimizationResult;
  createdAt: string;       // ISO timestamp
}
```

### Usage Example

```typescript
import db from '@/core/db';

// Add a student
await db.students.add({
  id: 'student-123',
  data: studentObject,
  projectId: 'project-abc',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
});

// Get all students for a project
const students = await db.students
  .where('projectId')
  .equals('project-abc')
  .toArray();

// Update a student
await db.students.update('student-123', {
  data: updatedStudent,
  updatedAt: new Date().toISOString()
});

// Delete a student
await db.students.delete('student-123');
```

---

## Examples

### Basic Optimization

```typescript
import { ClassroomOptimizer } from '@/core/optimizer';

// Create students
const students = [
  {
    id: '1',
    name: 'Alice Johnson',
    gender: 'female',
    academic_score: 85,
    behavior_score: 90,
    academic_level: 'proficient',
    behavior_level: 'excellent',
    friends_ids: ['2'],
    incompatible_ids: [],
    special_needs: [],
    requires_front_row: false,
    requires_quiet_area: false,
    has_mobility_issues: false,
    is_bilingual: false
  },
  // ... more students
];

// Create optimizer
const optimizer = new ClassroomOptimizer(students, 5, 6);

// Set weights
optimizer.setWeights({
  academic_balance: 0.3,
  behavioral_balance: 0.3,
  diversity: 0.2,
  special_needs: 0.2
});

// Run optimization
const result = optimizer.optimize();

// Access results
console.log('Fitness score:', result.fitness_score);
console.log('Academic balance:', result.objective_scores.academic_balance);
console.log('Computation time:', result.computation_time_ms);
```

### With Constraints

```typescript
const optimizer = new ClassroomOptimizer(students, 5, 6);

// Set constraints
optimizer.setConstraints({
  separate_pairs: [
    ['student1', 'student2']  // Keep these apart
  ],
  keep_together_pairs: [
    ['student3', 'student4']  // Keep these together
  ],
  front_row_ids: [
    'student5',  // Needs front row
    'student6'   // Also needs front row
  ],
  back_row_ids: []
});

const result = optimizer.optimize();
```

### In a React Component

```typescript
import { useClassroomStore } from '@/core/store';
import { useOptimizer } from '@/hooks/useOptimizer';

function OptimizationPanel() {
  const students = useClassroomStore(state => state.students);
  const rows = useClassroomStore(state => state.rows);
  const cols = useClassroomStore(state => state.cols);
  const setResult = useClassroomStore(state => state.setResult);

  const { optimize, isOptimizing } = useOptimizer();

  const handleOptimize = async () => {
    const result = await optimize(students, rows, cols);
    setResult(result);
  };

  return (
    <button onClick={handleOptimize} disabled={isOptimizing}>
      {isOptimizing ? 'Optimizing...' : 'Optimize Seating'}
    </button>
  );
}
```

### Web Worker Usage

For better performance with large classrooms, use the web worker:

```typescript
import OptimizerWorker from '@/workers/optimizer.worker?worker';

const worker = new OptimizerWorker();

worker.postMessage({
  type: 'optimize',
  students,
  rows: 5,
  cols: 6,
  weights: { academic_balance: 0.3, behavioral_balance: 0.3, diversity: 0.2, special_needs: 0.2 }
});

worker.onmessage = (e) => {
  if (e.data.type === 'result') {
    const result = e.data.result;
    console.log('Optimization complete:', result);
  }
};
```

---

## Performance Considerations

- **Small classes** (< 30 students): Main thread is fine
- **Medium classes** (30-100 students): Consider web workers
- **Large classes** (100+ students): Always use web workers

**Recommended Config by Size:**

| Students | Population Size | Max Generations |
|----------|----------------|----------------|
| < 30     | 50             | 50             |
| 30-100   | 100            | 100            |
| 100+     | 150            | 150            |

---

*Last updated: 2026-03-29*
