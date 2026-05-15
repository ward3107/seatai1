import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { dexieStorage } from '../db';
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
import type { LayoutDef } from '../layouts';

export type HeatMapMode = 'none' | 'academic' | 'behavior' | 'gender' | 'conflicts';
export type ViewMode = 'rows' | 'pairs' | 'clusters' | '3d';

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

  /**
   * Layout definition (shape of the classroom). Drives both the optimizer
   * and the renderer. Defaults to `{ type: 'rows', rows, cols }` so
   * existing projects keep working.
   */
  layoutDef: LayoutDef;
  setLayoutDef: (def: LayoutDef) => void;

  // Optimization
  isOptimizing: boolean;
  result: OptimizationResult | null;
  /** Student positions from the previous optimization run, captured the
   *  moment a NEW result arrives. Used for the "show what moved"
   *  highlight. Cleared when result itself is cleared. */
  previousPositions: Record<string, { row: number; col: number }> | null;
  showMovementDiff: boolean;
  setOptimizing: (value: boolean) => void;
  setResult: (result: OptimizationResult | null) => void;
  setShowMovementDiff: (v: boolean) => void;

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
  showTimeline: boolean;             // show optimization timeline panel

  /** Student whose detail drawer is currently open, or null. */
  detailsTargetStudentId: string | null;
  setDetailsTarget: (id: string | null) => void;

  toggleLockSeat: (seatKey: string) => void;
  setHeatMapMode: (mode: HeatMapMode) => void;
  setZoomLevel: (level: number) => void;
  setViewMode: (mode: ViewMode) => void;
  setSelectedSeat: (key: string | null) => void;
  setShowRelations: (show: boolean) => void;
  setShowTimeline: (show: boolean) => void;

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

  // UI scale ("sm" | "md" | "lg") — lets teachers bump text size up for
  // readability without changing browser zoom.
  uiScale: 'sm' | 'md' | 'lg';
  setUiScale: (scale: 'sm' | 'md' | 'lg') => void;

  // Whether the results stack (metrics + explanation) starts collapsed so
  // the seating map dominates the viewport.
  resultsCollapsed: boolean;
  setResultsCollapsed: (v: boolean) => void;

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
  // 3 independent starts strikes a good balance: noticeably better
  // results than 1 (especially on conflict-heavy classes), still
  // sub-second for typical 30-student rosters.
  multiStart: 3,
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
      setRows: (rows) => {
        // Route through setLayoutDef so the result-invalidation logic runs.
        const { layoutDef, setLayoutDef } = useStore.getState();
        setLayoutDef({ ...layoutDef, rows });
      },
      setCols: (cols) => {
        const { layoutDef, setLayoutDef } = useStore.getState();
        setLayoutDef({ ...layoutDef, cols });
      },

      layoutDef: { type: 'rows', rows: 4, cols: 5 },
      setLayoutDef: (def) =>
        set((state) => {
          // Clear any stale optimization result when the shape of the room
          // changes — the old seat positions no longer match the new
          // layout, so showing them in the new renderer would look broken.
          // Changes that only adjust rows/cols within the same layout type
          // also invalidate the result because the seat count differs.
          const prev = state.layoutDef;
          const shapeChanged =
            prev.type !== def.type ||
            prev.rows !== def.rows ||
            prev.cols !== def.cols ||
            prev.clusterSize !== def.clusterSize ||
            JSON.stringify(prev.customRowSizes ?? []) !==
              JSON.stringify(def.customRowSizes ?? []);
          state.layoutDef = def;
          state.rows = def.rows;
          state.cols = def.cols;
          if (shapeChanged) {
            state.result = null;
            state.lockedSeats = [];
            state.selectedSeatKey = null;
          }
        }),

      // Optimization
      isOptimizing: false,
      result: null,
      previousPositions: null,
      showMovementDiff: false,
      setOptimizing: (value) =>
        set((state) => {
          state.isOptimizing = value;
        }),
      setResult: (result) =>
        set((state) => {
          // Capture the previous run's positions so the UI can highlight
          // who moved between optimizations. Only swap in when a NEW result
          // arrives (not when clearing) so a layout-change wipe doesn't
          // drop the prior baseline.
          if (result && state.result) {
            state.previousPositions = state.result.student_positions;
          } else if (!result) {
            state.previousPositions = null;
          }
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

      detailsTargetStudentId: null,
      setDetailsTarget: (id) =>
        set((state) => { state.detailsTargetStudentId = id; }),

      showRelations: false,
      showTimeline: false,

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
      setShowTimeline: (show) =>
        set((state) => {
          state.showTimeline = show;
        }),

      // Swap two students and push to undo history
      swapStudents: (seatKeyA, seatKeyB) =>
        set((state) => {
          if (!state.result || seatKeyA === seatKeyB) return;

          // Snapshot current result for undo
          const snapshot = structuredClone(current(state.result)) as OptimizationResult;
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
          const currentSnapshot = structuredClone(current(state.result)) as OptimizationResult;
          state.historyFuture = [currentSnapshot, ...state.historyFuture].slice(0, 20);
          state.history = state.history.slice(0, -1);
          state.result = previousResult;
        }),

      redo: () =>
        set((state) => {
          if (state.historyFuture.length === 0 || !state.result) return;
          const nextResult = state.historyFuture[0];
          const currentSnapshot = structuredClone(current(state.result)) as OptimizationResult;
          state.history = [...state.history, currentSnapshot].slice(-20);
          state.historyFuture = state.historyFuture.slice(1);
          state.result = nextResult;
        }),

      // UI Language
      uiLanguage: 'en',
      setUiLanguage: (lang) =>
        set((state) => { state.uiLanguage = lang; }),

      // UI scale
      uiScale: 'md',
      setUiScale: (scale) =>
        set((state) => { state.uiScale = scale; }),

      // Collapsed results stack
      resultsCollapsed: false,
      setResultsCollapsed: (v) =>
        set((state) => { state.resultsCollapsed = v; }),

      setShowMovementDiff: (v) =>
        set((state) => { state.showMovementDiff = v; }),

      // Projects
      projects: [],
      currentProjectId: null,

      saveProject: (name) =>
        set((state) => {
          const now = new Date().toISOString();
          const existing = state.projects.find((p: ClassProject) => p.id === state.currentProjectId);
          // Build the persistable snapshot once. Uses structuredClone (faster
          // than JSON round-trip) for nested arrays/objects. `layoutDef` is
          // included so circle / cluster / U-shape projects survive reload.
          const snapshot = {
            students: structuredClone(current(state.students)),
            rows: state.rows,
            cols: state.cols,
            layoutDef: structuredClone(current(state.layoutDef)),
            weights: { ...state.weights },
            config: { ...state.config },
            constraints: structuredClone(current(state.constraints)),
            result: state.result ? structuredClone(current(state.result)) : null,
          };
          if (existing) {
            Object.assign(existing, snapshot, { name, updatedAt: now });
          } else {
            const id = `proj_${Date.now()}`;
            state.projects.push({
              id,
              name,
              createdAt: now,
              updatedAt: now,
              ...snapshot,
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
          // Pre-multi-layout projects have no layoutDef — fall back to a
          // 'rows' layout reconstructed from rows/cols so they still load.
          state.layoutDef = p.layoutDef ?? { type: 'rows', rows: p.rows, cols: p.cols };
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
      storage: createJSONStorage(() => dexieStorage),
      partialize: (state) => ({
        students: state.students,
        rows: state.rows,
        cols: state.cols,
        layoutDef: state.layoutDef,
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
        uiScale: state.uiScale,
        resultsCollapsed: state.resultsCollapsed,
      }),
    }
  )
);
