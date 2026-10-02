import type { SurveyAnswers } from './surveyMapping';
export function validSurveyAnswers(value: unknown): value is SurveyAnswers {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const a = value as Record<string, unknown>;
  const fields = ['seatmates','helper','frontPreference','learningStyle','noise','belonging','teacherAttention','focusDifficulty','selfEfficacy','movement','visionDifficulty'];
  if (Object.keys(a).length !== fields.length || Object.keys(a).some(key => !fields.includes(key))) return false;
  if (!Array.isArray(a.seatmates) || a.seatmates.length > 3 || !a.seatmates.every(id => typeof id === 'string' && id.length <= 128)) return false;
  if (a.helper !== null && (typeof a.helper !== 'string' || a.helper.length > 128)) return false;
  if (![null, 'front', 'middle', 'back'].includes(a.frontPreference as never)) return false;
  if (![null, 'alone', 'pair', 'group'].includes(a.learningStyle as never)) return false;
  return ['noise','belonging','teacherAttention','focusDifficulty','selfEfficacy','movement','visionDifficulty'].every(key =>
    a[key] === null || (typeof a[key] === 'number' && Number.isInteger(a[key]) && a[key] >= 1 && a[key] <= 5));
}
