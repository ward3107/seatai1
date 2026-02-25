import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type {
  Student,
  OptimizationResult,
  ObjectiveWeights,
  GeneticConfig,
  SeatingConstraints,
} from '../types';

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
          const index = state.students.findIndex((s) => s.id === id);
          if (index !== -1) {
            state.students[index] = { ...state.students[index], ...updates };
          }
        }),
      removeStudent: (id) =>
        set((state) => {
          state.students = state.students.filter((s) => s.id !== id);
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
      }),
    }
  )
);
