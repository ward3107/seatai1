// Student types
export type Gender = 'male' | 'female' | 'other';
export type AcademicLevel = 'advanced' | 'proficient' | 'basic' | 'below_basic';
export type BehaviorLevel = 'excellent' | 'good' | 'average' | 'challenging';
export type LayoutType = 'rows' | 'pairs' | 'clusters' | 'u-shape' | 'circle' | 'flexible';

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
}

// Seating types
export interface SeatPosition {
  row: number;
  col: number;
  is_front_row: boolean;
  is_near_teacher: boolean;
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
}

export interface GeneticConfig {
  populationSize: number;
  maxGenerations: number;
  crossoverRate: number;
  mutationRate: number;
  tournamentSize: number;
  earlyStopPatience: number;
}

export interface SeatingConstraints {
  separate_pairs: [string, string][];
  keep_together_pairs: [string, string][];
  front_row_ids: string[];
  back_row_ids: string[];
}

export interface ClassProject {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  students: Student[];
  rows: number;
  cols: number;
  weights: ObjectiveWeights;
  config: GeneticConfig;
  constraints: SeatingConstraints;
  result: OptimizationResult | null;
}
