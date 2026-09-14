/** Runtime checks for portable, untrusted backup data. Unknown fields are
 * tolerated for forward compatibility; known fields must have safe shapes. */
type Check = (value: unknown) => boolean;
const str: Check = v => typeof v === 'string';
const bool: Check = v => typeof v === 'boolean';
const num: Check = v => typeof v === 'number' && Number.isFinite(v);
const integer: Check = v => num(v) && Number.isInteger(v) && (v as number) >= 0;
const positive: Check = v => integer(v) && (v as number) > 0;
const ratio: Check = v => num(v) && (v as number) >= 0 && (v as number) <= 1;
const oneOf = (...values: unknown[]): Check => v => values.includes(v);
const optional = (check: Check): Check => v => v === undefined || check(v);
const nullable = (check: Check): Check => v => v === null || check(v);
const array = (check: Check): Check => v => Array.isArray(v) && v.every(check);
const record = (check: Check): Check => v => isObject(v) && Object.values(v).every(check);
const isObject = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v);
const object = (fields: Record<string, Check>): Check => v => isObject(v) && Object.entries(fields).every(([key, check]) => check(v[key]));
const strings = array(str);
const pair: Check = v => Array.isArray(v) && v.length === 2 && v.every(str);
const dimensions = { rows: positive, cols: positive };
const position = object({ row: integer, col: integer, is_front_row: bool, is_near_teacher: bool, x: optional(num), y: optional(num) });
const scores = object({ academic_balance: num, behavioral_balance: num, diversity: num, special_needs: num });
const layoutType = oneOf('rows', 'clusters', 'u-shape', 'circle', 'custom-rows');
const layout = object({
  ...dimensions, type: layoutType, customRowSizes: optional(array(integer)), clusterSize: optional(positive),
  blockedCells: optional(array(object({ row: integer, col: integer, kind: oneOf('desk', 'obstacle') }))),
});
const student = object({
  id: v => str(v) && (v as string).length > 0, name: str, gender: oneOf('male', 'female', 'other'),
  academic_level: oneOf('advanced', 'proficient', 'basic', 'below_basic'), academic_score: num,
  behavior_level: oneOf('excellent', 'good', 'average', 'challenging'), behavior_score: num,
  friends_ids: strings, incompatible_ids: strings,
  special_needs: array(object({ type: str, description: optional(str), requires_front_seat: bool, requires_support_buddy: bool })),
  requires_front_row: bool, requires_quiet_area: bool, has_mobility_issues: bool, is_bilingual: bool,
  age: optional(num), primary_language: optional(str), photo_url: optional(str), notes: optional(str),
});
const uniqueArray = (check: Check): Check => v => array(check)(v) &&
  new Set((v as Record<string, unknown>[]).map(x => x.id)).size === (v as unknown[]).length;
const config = object({
  populationSize: positive, maxGenerations: positive, crossoverRate: ratio, mutationRate: ratio,
  tournamentSize: positive, earlyStopPatience: positive, multiStart: optional(positive),
  timeLimitMs: optional(num), examMode: optional(bool), seed: optional(num),
});
const constraints = object({
  separate_pairs: array(pair), keep_together_pairs: array(pair), front_row_ids: strings, back_row_ids: strings,
  aisle_ids: optional(strings), near_window_ids: optional(strings), peer_mentor_pairs: optional(array(pair)), hard: optional(record(bool)),
});
const result = object({
  layout: object({ ...dimensions, layout_type: oneOf('rows', 'pairs', 'clusters', 'u-shape', 'circle', 'custom-rows', 'flexible'),
    total_seats: integer, seats: array(object({ position, student_id: optional(str), is_empty: bool })) }),
  student_positions: record(position), fitness_score: num, objective_scores: scores,
  generations: integer, computation_time_ms: num, warnings: strings, unmet_hard_rules: optional(integer),
  stop_reason: optional(oneOf('generations', 'converged', 'time', 'cancelled')),
  algorithm: optional(oneOf('genetic', 'simulated_annealing', 'greedy', 'random_search')),
});
const questionnaire = object({ consentAck: bool, surveyedIds: strings, skipPeers: bool, peerSurveyEnabled: optional(bool), simpleMode: optional(bool) });
const rotation = object({ id: str, createdAt: str, periods: uniqueArray(object({ id: str, label: str, result, createdAt: str })) });
const arrangements = uniqueArray(object({ id: str, name: str, createdAt: str, result }));
const history = array(object({ timestamp: str, positions: record(object({ row: integer, col: integer })) }));
const shared = {
  ...dimensions, students: uniqueArray(student), weights: scores, config, constraints,
  rotationPlan: optional(nullable(rotation)), savedArrangements: optional(arrangements),
  questionnaire: optional(questionnaire), resultHistory: optional(history), avoidRecentNeighbors: optional(bool),
};
const project = object({ ...shared, id: str, name: str, createdAt: str, updatedAt: str, layoutDef: optional(layout), result: nullable(result) });
export const validBackupData = object({
  ...shared, layoutDef: layout, projects: uniqueArray(project), currentProjectId: optional(nullable(str)), result: optional(nullable(result)),
  uiLanguage: optional(oneOf('en', 'he', 'ar', 'ru')), uiScale: optional(oneOf('sm', 'md', 'lg')),
  theme: optional(oneOf('light', 'dark', 'system')), aiEnabled: optional(bool), aiModel: optional(str),
});
