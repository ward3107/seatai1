import { describe, expect, it } from 'vitest';
import { emptyAnswers, reviewedSurveyPatch } from './surveyMapping';
import { SAMPLE_CLASSES } from '../../utils/sampleData';

describe('teacher approval of student reports', () => {
  it('preserves teacher needs and omits relationships when the phone did not ask about peers', () => {
    const student = { ...SAMPLE_CLASSES[0].students[0], requires_front_row:true, requires_quiet_area:true, friends_ids:['existing-peer'] };
    const patch = reviewedSurveyPatch(student, emptyAnswers(), false);
    expect(patch.requires_front_row).toBe(true);
    expect(patch.requires_quiet_area).toBe(true);
    expect(patch).not.toHaveProperty('friends_ids');
    expect(patch).not.toHaveProperty('academic_score');
    expect(patch).not.toHaveProperty('behavior_score');
  });
  it('applies nominated peers only when those questions were included and reviewed', () => {
    const student = SAMPLE_CLASSES[0].students[0];
    const patch = reviewedSurveyPatch(student, { ...emptyAnswers(), seatmates:['new-peer','new-peer',student.id] }, true);
    expect(patch.friends_ids).toEqual(['new-peer']);
  });
});
