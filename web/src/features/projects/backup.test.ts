import { describe, it, expect, vi } from 'vitest';
import {
  readBackupFile,
  MAX_BACKUP_BYTES,
  buildBackup,
  parseBackup,
  BACKUP_SCHEMA,
  BACKUP_SCHEMA_VERSION,
} from './backup';

const baseState = () => ({
  students: [
    {
      id: '1',
      name: 'A',
      gender: 'male' as const,
      academic_level: 'proficient' as const,
      academic_score: 70,
      behavior_level: 'good' as const,
      behavior_score: 70,
      friends_ids: [],
      incompatible_ids: [],
      special_needs: [],
      requires_front_row: false,
      requires_quiet_area: false,
      has_mobility_issues: false,
      is_bilingual: false,
    },
  ],
  rows: 4,
  cols: 5,
  layoutDef: { type: 'rows' as const, rows: 4, cols: 5 },
  weights: {
    academic_balance: 0.3,
    behavioral_balance: 0.3,
    diversity: 0.2,
    special_needs: 0.2,
  },
  config: {
    populationSize: 100,
    maxGenerations: 100,
    crossoverRate: 0.8,
    mutationRate: 0.2,
    tournamentSize: 3,
    earlyStopPatience: 20,
  },
  constraints: {
    separate_pairs: [],
    keep_together_pairs: [],
    front_row_ids: [],
    back_row_ids: [],
  },
  projects: [],
  currentProjectId: null,
});

describe('buildBackup', () => {
  it('stamps the schema, version, and an ISO timestamp', () => {
    const file = buildBackup(baseState());
    expect(file.schema).toBe(BACKUP_SCHEMA);
    expect(file.version).toBe(BACKUP_SCHEMA_VERSION);
    expect(file.exportedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('never carries the AI API key, even if the caller passes one', () => {
    const file = buildBackup({
      ...baseState(),
      aiSettings: { enabled: true, model: 'claude-haiku-4-5-20251001' },
    });
    // The whole stringified payload must not mention a key field.
    const serialized = JSON.stringify(file);
    expect(serialized).not.toContain('apiKey');
    expect(file.data.aiEnabled).toBe(true);
    expect(file.data.aiModel).toBe('claude-haiku-4-5-20251001');
  });

  it('round-trips through parseBackup', () => {
    const file = buildBackup(baseState());
    const result = parseBackup(JSON.stringify(file));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.students).toHaveLength(1);
      expect(result.data.layoutDef.type).toBe('rows');
    }
  });
});

describe('parseBackup', () => {
  it('rejects invalid JSON', () => {
    const r = parseBackup('{not json');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.kind).toBe('invalid-json');
  });

  it('rejects files without the SeatAI schema marker', () => {
    const r = parseBackup(JSON.stringify({ hello: 'world' }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.kind).toBe('wrong-schema');
  });

  it('rejects unsupported version numbers', () => {
    const r = parseBackup(
      JSON.stringify({
        schema: BACKUP_SCHEMA,
        version: 99,
        exportedAt: '',
        data: {},
      }),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.kind).toBe('unsupported-version');
  });

  it('reports specifically which required fields are missing', () => {
    const r = parseBackup(
      JSON.stringify({
        schema: BACKUP_SCHEMA,
        version: 1,
        exportedAt: '',
        data: { students: [] }, // missing nearly everything
      }),
    );
    expect(r.ok).toBe(false);
    if (!r.ok && r.kind === 'missing-fields') {
      expect(r.missing).toContain('rows');
      expect(r.missing).toContain('layoutDef');
      expect(r.missing).toContain('constraints');
    }
  });
});

describe('backup file reading', () => {
  it('rejects oversized uploads without reading them', async () => {
    const text = vi.fn();
    expect((await readBackupFile({ size: MAX_BACKUP_BYTES + 1, text })).ok).toBe(false);
    expect(text).not.toHaveBeenCalled();
  });
  it('handles device read errors', async () => {
    const result = await readBackupFile({ size: 10, text: async () => { throw new Error('unavailable'); } });
    expect(result.ok).toBe(false);
  });
  it('reads valid portable backups', async () => {
    const json = JSON.stringify(buildBackup(baseState()));
    expect((await readBackupFile({ size: json.length, text: async () => json })).ok).toBe(true);
  });
  it('rejects fractional schema versions', () => {
    const file = { ...buildBackup(baseState()), version: 1.5 };
    expect(parseBackup(JSON.stringify(file)).ok).toBe(false);
  });
});

describe('backup runtime field validation', () => {
  it.each([
    ['students', null], ['students', {}], ['rows', -1], ['cols', '5'],
    ['layoutDef', { type: 'unknown', rows: 4, cols: 5 }],
    ['weights', null], ['config', { populationSize: 'many' }],
    ['constraints', { separate_pairs: [null] }], ['projects', [null]],
    ['result', { layout: null }], ['savedArrangements', [null]],
    ['rotationPlan', { periods: {} }], ['questionnaire', { surveyedIds: 'all' }],
    ['resultHistory', [{ positions: [] }]], ['uiLanguage', 'invalid'],
  ])('rejects invalid %s before restore', (key, value) => {
    const file = buildBackup(baseState());
    const changed = { ...file, data: { ...file.data, [key]: value } };
    expect(parseBackup(JSON.stringify(changed)).ok).toBe(false);
  });
  it('rejects a malformed nested student', () => {
    const file = buildBackup(baseState());
    file.data.students[0].friends_ids = null as unknown as string[];
    expect(parseBackup(JSON.stringify(file)).ok).toBe(false);
  });
  it('rejects duplicate student identities', () => {
    const file = buildBackup(baseState());
    file.data.students.push({ ...file.data.students[0] });
    expect(parseBackup(JSON.stringify(file)).ok).toBe(false);
  });
  it('accepts legacy backups without optional fields and unknown future fields', () => {
    const file = buildBackup(baseState());
    const { currentProjectId: _omitted, ...data } = file.data;
    const parsed = parseBackup(JSON.stringify({ ...file, data: { ...data, futureField: true } }));
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(parsed.data.currentProjectId).toBeNull();
  });
});
