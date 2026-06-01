/**
 * Backup file format for the entire app state.
 *
 * SeatAI stores everything in IndexedDB, so a teacher who clears their
 * browser loses all rosters and projects. The backup file is a single
 * portable JSON they can email to themselves, drop on a shared drive,
 * or hand off to a colleague.
 *
 * The format is versioned: bumps to SCHEMA_VERSION go alongside an
 * upgrade function in parseBackup. The current writer is the only one
 * that emits version 1.
 *
 * What's intentionally **not** in the backup:
 *   - aiSettings.apiKey  — backups get shared. Never export credentials.
 *   - Transient UI state (locked seats, selection, heat-map mode, zoom).
 *     A backup is data; the UI session that opens it picks its own view.
 */

import type {
  Student,
  ObjectiveWeights,
  GeneticConfig,
  SeatingConstraints,
  ClassProject,
  OptimizationResult,
  RotationPlan,
  SavedArrangement,
} from '../../types';
import type { LayoutDef } from '../../core/layouts';

export const BACKUP_SCHEMA = 'seatai-backup' as const;
export const BACKUP_SCHEMA_VERSION = 1 as const;

export interface BackupData {
  students: Student[];
  rows: number;
  cols: number;
  layoutDef: LayoutDef;
  weights: ObjectiveWeights;
  config: GeneticConfig;
  constraints: SeatingConstraints;
  avoidRecentNeighbors?: boolean;
  projects: ClassProject[];
  currentProjectId: string | null;
  result?: OptimizationResult | null;
  resultHistory?: Array<{
    timestamp: string;
    positions: Record<string, { row: number; col: number }>;
  }>;
  /** Optional saved term rotation plan. */
  rotationPlan?: RotationPlan | null;
  /** Optional named seating arrangements saved within the class. */
  savedArrangements?: SavedArrangement[];
  /** Optional UI preferences. The restoring browser can choose to keep
   *  its own — we treat them as suggestions rather than requirements. */
  uiLanguage?: 'en' | 'he' | 'ar' | 'ru';
  uiScale?: 'sm' | 'md' | 'lg';
  theme?: 'light' | 'dark' | 'system';
  /** AI integration: settings minus the secret. The key is deliberately
   *  omitted so backups can be shared safely. */
  aiEnabled?: boolean;
  aiModel?: string;
}

export interface BackupFile {
  schema: typeof BACKUP_SCHEMA;
  version: number;
  exportedAt: string;
  data: BackupData;
}

/** Snapshot whatever the caller passes (typically pulled from the store)
 *  into a backup-ready object. Strips the API key and any transient UI. */
export function buildBackup(state: {
  students: Student[];
  rows: number;
  cols: number;
  layoutDef: LayoutDef;
  weights: ObjectiveWeights;
  config: GeneticConfig;
  constraints: SeatingConstraints;
  avoidRecentNeighbors?: boolean;
  projects: ClassProject[];
  currentProjectId: string | null;
  result?: OptimizationResult | null;
  resultHistory?: Array<{
    timestamp: string;
    positions: Record<string, { row: number; col: number }>;
  }>;
  rotationPlan?: RotationPlan | null;
  savedArrangements?: SavedArrangement[];
  uiLanguage?: 'en' | 'he' | 'ar' | 'ru';
  uiScale?: 'sm' | 'md' | 'lg';
  theme?: 'light' | 'dark' | 'system';
  aiSettings?: { enabled: boolean; model: string };
}): BackupFile {
  return {
    schema: BACKUP_SCHEMA,
    version: BACKUP_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    data: {
      students: state.students,
      rows: state.rows,
      cols: state.cols,
      layoutDef: state.layoutDef,
      weights: state.weights,
      config: state.config,
      constraints: state.constraints,
      avoidRecentNeighbors: state.avoidRecentNeighbors,
      projects: state.projects,
      currentProjectId: state.currentProjectId,
      result: state.result,
      resultHistory: state.resultHistory,
      rotationPlan: state.rotationPlan,
      savedArrangements: state.savedArrangements,
      uiLanguage: state.uiLanguage,
      uiScale: state.uiScale,
      theme: state.theme,
      aiEnabled: state.aiSettings?.enabled,
      aiModel: state.aiSettings?.model,
    },
  };
}

export type ParseError =
  | { ok: false; kind: 'invalid-json'; message: string }
  | { ok: false; kind: 'wrong-schema'; message: string }
  | { ok: false; kind: 'unsupported-version'; message: string; version: number }
  | { ok: false; kind: 'missing-fields'; message: string; missing: string[] };

export type ParseResult =
  | { ok: true; data: BackupData; exportedAt: string }
  | ParseError;

/** Parse + validate a backup JSON string. Returns a discriminated result
 *  so the UI can show targeted error messages without throwing. */
export function parseBackup(json: string): ParseResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (e) {
    return {
      ok: false,
      kind: 'invalid-json',
      message: e instanceof Error ? e.message : 'Could not parse JSON',
    };
  }

  if (
    !parsed ||
    typeof parsed !== 'object' ||
    (parsed as { schema?: unknown }).schema !== BACKUP_SCHEMA
  ) {
    return {
      ok: false,
      kind: 'wrong-schema',
      message: 'Not a SeatAI backup file',
    };
  }

  const file = parsed as Partial<BackupFile>;
  const version = typeof file.version === 'number' ? file.version : 0;
  if (version < 1 || version > BACKUP_SCHEMA_VERSION) {
    return {
      ok: false,
      kind: 'unsupported-version',
      message: `Backup version ${version} is not supported by this app`,
      version,
    };
  }

  const data = file.data as Partial<BackupData> | undefined;
  const required: (keyof BackupData)[] = [
    'students',
    'rows',
    'cols',
    'layoutDef',
    'weights',
    'config',
    'constraints',
    'projects',
  ];
  const missing = required.filter((k) => data?.[k] === undefined);
  if (!data || missing.length > 0) {
    return {
      ok: false,
      kind: 'missing-fields',
      message: `Backup is missing required fields: ${missing.join(', ')}`,
      missing,
    };
  }

  return {
    ok: true,
    data: data as BackupData,
    exportedAt: file.exportedAt ?? '',
  };
}
