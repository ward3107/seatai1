// Student types
export type Gender = 'male' | 'female' | 'other';
export type AcademicLevel = 'advanced' | 'proficient' | 'basic' | 'below_basic';
export type BehaviorLevel = 'excellent' | 'good' | 'average' | 'challenging';
export type LayoutType =
  | 'rows'
  | 'pairs'
  | 'clusters'
  | 'u-shape'
  | 'circle'
  | 'custom-rows'
  | 'flexible';

export interface SpecialNeed {
  type: string;
  description?: string;
  requires_front_seat: boolean;
  requires_support_buddy: boolean;
}

export interface Student {
  id: string;
  name: string;
  gender: Gender;
  age?: number;
  academic_level: AcademicLevel;
  academic_score: number;
  behavior_level: BehaviorLevel;
  behavior_score: number;
  friends_ids: string[];
  incompatible_ids: string[];
  special_needs: SpecialNeed[];
  requires_front_row: boolean;
  requires_quiet_area: boolean;
  has_mobility_issues: boolean;
  primary_language?: string;
  is_bilingual: boolean;
  /** Optional teacher-supplied photo (data URL or absolute URL). Stays
   *  in IndexedDB with the rest of the roster — never uploaded anywhere. */
  photo_url?: string;
  /** Free-text teacher observation (e.g. "rough morning, lots of
   *  energy", "needs help with reading comprehension"). Persists with
   *  the student record. */
  notes?: string;
}

// Seating types
export interface SeatPosition {
  row: number;
  col: number;
  is_front_row: boolean;
  is_near_teacher: boolean;
  /** Normalized 0..1 render coordinate (only set for non-grid layouts). */
  x?: number;
  y?: number;
}

export interface Seat {
  position: SeatPosition;
  student_id?: string;
  is_empty: boolean;
}

export interface ClassroomLayout {
  layout_type: LayoutType;
  rows: number;
  cols: number;
  total_seats: number;
  seats: Seat[];
}

// Optimization types
export interface ObjectiveScores {
  academic_balance: number;
  behavioral_balance: number;
  diversity: number;
  special_needs: number;
}

export interface ObjectiveWeights {
  academic_balance: number;
  behavioral_balance: number;
  diversity: number;
  special_needs: number;
}

export interface OptimizationResult {
  layout: ClassroomLayout;
  student_positions: Record<string, SeatPosition>;
  fitness_score: number;
  objective_scores: ObjectiveScores;
  generations: number;
  computation_time_ms: number;
  warnings: string[];
  /** Algorithm used for optimization (if applicable) */
  algorithm?: 'genetic' | 'simulated_annealing' | 'greedy' | 'random_search';
}

export interface GeneticConfig {
  populationSize: number;
  maxGenerations: number;
  crossoverRate: number;
  mutationRate: number;
  tournamentSize: number;
  earlyStopPatience: number;
  /** Number of independent GA restarts. 1 = fastest, 3 = balanced
   *  (recommended), 5+ = highest quality for the same problem.
   *  Optional for back-compat with persisted projects from before
   *  multi-start landed. */
  multiStart?: number;
}

export interface SeatingConstraints {
  separate_pairs: [string, string][];
  keep_together_pairs: [string, string][];
  front_row_ids: string[];
  back_row_ids: string[];
  /** Students who must sit on an aisle / edge column for easy egress. */
  aisle_ids?: string[];
  /** Students who must sit near a window (left edge in our coordinate space). */
  near_window_ids?: string[];
  /** Mentor → mentee assignments; the mentee must be adjacent to the mentor. */
  peer_mentor_pairs?: [string, string][];
}

export interface ClassProject {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  students: Student[];
  rows: number;
  cols: number;
  /** Full layout definition (shape of the room). Optional for back-compat
   *  with projects saved before the multi-layout system — when absent the
   *  loader falls back to `{ type: 'rows', rows, cols }`. The runtime
   *  type is `LayoutDef` from `core/layouts`; declared loosely here to
   *  avoid a circular type dep with this `types` module. */
  layoutDef?: {
    type: 'rows' | 'clusters' | 'u-shape' | 'circle' | 'custom-rows';
    rows: number;
    cols: number;
    customRowSizes?: number[];
    clusterSize?: number;
    blockedCells?: { row: number; col: number; kind: 'desk' | 'obstacle' }[];
  };
  weights: ObjectiveWeights;
  config: GeneticConfig;
  constraints: SeatingConstraints;
  result: OptimizationResult | null;
}
