import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { current } from 'immer';
import type {
  Student,
  Seat,
  OptimizationResult,
  ObjectiveWeights,
  GeneticConfig,
  SeatingConstraints,
  ClassProject,
} from '../../types';

export type HeatMapMode = 'none' | 'academic' | 'behavior' | 'gender' | 'conflicts';
export type ViewMode = 'rows' | 'pairs' | 'clusters';

interface AppState {
  // Students
  students: Student[];
  addStudent: (student: Student) => void;
  updateStudent: (id: string, student: Partial<Student>) => void;
  removeStudent: (id: string) => void;
  setStudents: (students: Student[]) => void;

  // Layout config
  rows: number;
  cols: number;
  setRows: (rows: number) => void;
  setCols: (cols: number) => void;

  // Optimization
  isOptimizing: boolean;
  result: OptimizationResult | null;
  setOptimizing: (value: boolean) => void;
  setResult: (result: OptimizationResult | null) => void;

  // Weights
  weights: ObjectiveWeights;
  setWeights: (weights: ObjectiveWeights) => void;

  // Config
  config: GeneticConfig;
  setConfig: (config: GeneticConfig) => void;

  // Constraints
  constraints: SeatingConstraints;
  setConstraints: (constraints: SeatingConstraints) => void;

  // UI State
  selectedStudentId: string | null;
  setSelectedStudentId: (id: string | null) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;

  // --- Seating Map UI ---
  lockedSeats: string[];            // seat keys "row-col"
  heatMapMode: HeatMapMode;
  zoomLevel: number;
  viewMode: ViewMode;
  selectedSeatKey: string | null;   // for click-to-swap
  showRelations: boolean;

  toggleLockSeat: (seatKey: string) => void;
  setHeatMapMode: (mode: HeatMapMode) => void;
  setZoomLevel: (level: number) => void;
  setViewMode: (mode: ViewMode) => void;
  setSelectedSeat: (key: string | null) => void;
  setShowRelations: (show: boolean) => void;

  // Swap two seats (pushes to undo history)
  swapStudents: (seatKeyA: string, seatKeyB: string) => void;

  // Undo / Redo
  history: OptimizationResult[];
  historyFuture: OptimizationResult[];
  undo: () => void;
  redo: () => void;

  // UI Language
  uiLanguage: 'en' | 'he' | 'ar' | 'ru';
  setUiLanguage: (lang: 'en' | 'he' | 'ar' | 'ru') => void;

  // Projects
  projects: ClassProject[];
  currentProjectId: string | null;
  saveProject: (name: string) => void;
  loadProject: (id: string) => void;
  deleteProject: (id: string) => void;
  renameProject: (id: string, name: string) => void;
}

const defaultWeights: ObjectiveWeights = {
  academic_balance: 0.3,
  behavioral_balance: 0.3,
  diversity: 0.2,
  special_needs: 0.2,
};

const defaultConfig: GeneticConfig = {
  populationSize: 100,
  maxGenerations: 100,
  crossoverRate: 0.8,
  mutationRate: 0.2,
  tournamentSize: 3,
  earlyStopPatience: 20,
};

const defaultConstraints: SeatingConstraints = {
  separate_pairs: [],
  keep_together_pairs: [],
  front_row_ids: [],
  back_row_ids: [],
};

export const useStore = create<AppState>()(
  persist(
    immer((set) => ({
      // Students
      students: [],
      addStudent: (student) =>
        set((state) => {
          state.students.push(student);
        }),
      updateStudent: (id, updates) =>
        set((state) => {
          const index = state.students.findIndex((s: Student) => s.id === id);
          if (index !== -1) {
            state.students[index] = { ...state.students[index], ...updates };
          }
        }),
      removeStudent: (id) =>
        set((state) => {
          state.students = state.students.filter((s: Student) => s.id !== id);
        }),
      setStudents: (students) =>
        set((state) => {
          state.students = students;
        }),

      // Layout
      rows: 4,
      cols: 5,
      setRows: (rows) =>
        set((state) => {
          state.rows = rows;
        }),
      setCols: (cols) =>
        set((state) => {
          state.cols = cols;
        }),

      // Optimization
      isOptimizing: false,
      result: null,
      setOptimizing: (value) =>
        set((state) => {
          state.isOptimizing = value;
        }),
      setResult: (result) =>
        set((state) => {
          state.result = result;
          // New optimization clears undo history
          state.history = [];
          state.historyFuture = [];
        }),

      // Weights
      weights: defaultWeights,
      setWeights: (weights) =>
        set((state) => {
          state.weights = weights;
        }),

      // Config
      config: defaultConfig,
      setConfig: (config) =>
        set((state) => {
          state.config = config;
        }),

      // Constraints
      constraints: defaultConstraints,
      setConstraints: (constraints) =>
        set((state) => {
          state.constraints = constraints;
        }),

      // UI
      selectedStudentId: null,
      setSelectedStudentId: (id) =>
        set((state) => {
          state.selectedStudentId = id;
        }),
      sidebarOpen: true,
      setSidebarOpen: (open) =>
        set((state) => {
          state.sidebarOpen = open;
        }),

      // --- Seating Map UI ---
      lockedSeats: [],
      heatMapMode: 'none',
      zoomLevel: 1.0,
      viewMode: 'rows',
      selectedSeatKey: null,
      showRelations: false,

      toggleLockSeat: (seatKey) =>
        set((state) => {
          const idx = state.lockedSeats.indexOf(seatKey);
          if (idx === -1) {
            state.lockedSeats.push(seatKey);
          } else {
            state.lockedSeats.splice(idx, 1);
          }
        }),
      setHeatMapMode: (mode) =>
        set((state) => {
          state.heatMapMode = mode;
        }),
      setZoomLevel: (level) =>
        set((state) => {
          state.zoomLevel = Math.min(1.5, Math.max(0.6, level));
        }),
      setViewMode: (mode) =>
        set((state) => {
          state.viewMode = mode;
        }),
      setSelectedSeat: (key) =>
        set((state) => {
          state.selectedSeatKey = key;
        }),
      setShowRelations: (show) =>
        set((state) => {
          state.showRelations = show;
        }),

      // Swap two students and push to undo history
      swapStudents: (seatKeyA, seatKeyB) =>
        set((state) => {
          if (!state.result || seatKeyA === seatKeyB) return;

          // Snapshot current result for undo
          const snapshot = JSON.parse(JSON.stringify(current(state.result))) as OptimizationResult;
          state.history = [...state.history, snapshot].slice(-20);
          state.historyFuture = [];

          // Parse seat keys
          const [rowA, colA] = seatKeyA.split('-').map(Number);
          const [rowB, colB] = seatKeyB.split('-').map(Number);

          const seats = state.result.layout.seats;
          const seatA = seats.find(
            (s: Seat) => s.position.row === rowA && s.position.col === colA
          );
          const seatB = seats.find(
            (s: Seat) => s.position.row === rowB && s.position.col === colB
          );
          if (!seatA || !seatB) return;

          const studentIdA = seatA.student_id;
          const studentIdB = seatB.student_id;

          // Swap student IDs
          seatA.student_id = studentIdB;
          seatA.is_empty = studentIdB === undefined;
          seatB.student_id = studentIdA;
          seatB.is_empty = studentIdA === undefined;

          // Update student_positions map
          if (studentIdA !== undefined) {
            state.result.student_positions[studentIdA] = { ...seatB.position };
          }
          if (studentIdB !== undefined) {
            state.result.student_positions[studentIdB] = { ...seatA.position };
          }
        }),

      // Undo / Redo
      history: [],
      historyFuture: [],

      undo: () =>
        set((state) => {
          if (state.history.length === 0 || !state.result) return;
          const previousResult = state.history[state.history.length - 1];
          const currentSnapshot = JSON.parse(
            JSON.stringify(current(state.result))
          ) as OptimizationResult;
          state.historyFuture = [currentSnapshot, ...state.historyFuture].slice(0, 20);
          state.history = state.history.slice(0, -1);
          state.result = previousResult as any;
        }),

      redo: () =>
        set((state) => {
          if (state.historyFuture.length === 0 || !state.result) return;
          const nextResult = state.historyFuture[0];
          const currentSnapshot = JSON.parse(
            JSON.stringify(current(state.result))
          ) as OptimizationResult;
          state.history = [...state.history, currentSnapshot].slice(-20);
          state.historyFuture = state.historyFuture.slice(1);
          state.result = nextResult as any;
        }),

      // UI Language
      uiLanguage: 'en',
      setUiLanguage: (lang) =>
        set((state) => { state.uiLanguage = lang; }),

      // Projects
      projects: [],
      currentProjectId: null,

      saveProject: (name) =>
        set((state) => {
          const now = new Date().toISOString();
          const existing = state.projects.find((p: ClassProject) => p.id === state.currentProjectId);
          if (existing) {
            existing.name = name;
            existing.updatedAt = now;
            existing.students = JSON.parse(JSON.stringify(current(state.students)));
            existing.rows = state.rows;
            existing.cols = state.cols;
            existing.weights = { ...state.weights };
            existing.config = { ...state.config };
            existing.constraints = JSON.parse(JSON.stringify(current(state.constraints)));
            existing.result = state.result ? JSON.parse(JSON.stringify(current(state.result))) : null;
          } else {
            const id = `proj_${Date.now()}`;
            state.projects.push({
              id,
              name,
              createdAt: now,
              updatedAt: now,
              students: JSON.parse(JSON.stringify(current(state.students))),
              rows: state.rows,
              cols: state.cols,
              weights: { ...state.weights },
              config: { ...state.config },
              constraints: JSON.parse(JSON.stringify(current(state.constraints))),
              result: state.result ? JSON.parse(JSON.stringify(current(state.result))) : null,
            });
            state.currentProjectId = id;
          }
        }),

      loadProject: (id) =>
        set((state) => {
          const p = state.projects.find((proj: ClassProject) => proj.id === id);
          if (!p) return;
          state.currentProjectId = id;
          state.students = p.students;
          state.rows = p.rows;
          state.cols = p.cols;
          state.weights = p.weights;
          state.config = p.config;
          state.constraints = p.constraints;
          state.result = p.result;
          state.history = [];
          state.historyFuture = [];
        }),

      deleteProject: (id) =>
        set((state) => {
          state.projects = state.projects.filter((p: ClassProject) => p.id !== id);
          if (state.currentProjectId === id) state.currentProjectId = null;
        }),

      renameProject: (id, name) =>
        set((state) => {
          const p = state.projects.find((proj: ClassProject) => proj.id === id);
          if (p) {
            p.name = name;
            p.updatedAt = new Date().toISOString();
          }
        }),
    })),
    {
      name: 'seatai-storage',
      partialize: (state) => ({
        students: state.students,
        rows: state.rows,
        cols: state.cols,
        weights: state.weights,
        config: state.config,
        constraints: state.constraints,
        lockedSeats: state.lockedSeats,
        heatMapMode: state.heatMapMode,
        zoomLevel: state.zoomLevel,
        viewMode: state.viewMode,
        projects: state.projects,
        currentProjectId: state.currentProjectId,
        uiLanguage: state.uiLanguage,
      }),
    }
  )
);
