import { describe, expect, it } from 'vitest';
import { explainPlacement } from './explainPlacement';
import { SAMPLE_CLASSES } from './sampleData';
import type { OptimizationResult, SeatingConstraints } from '../types';
import { generateSlots, type LayoutDef } from '../core/layouts';

describe('explainPlacement current map', () => {
  it('reads the actual seat after a manual move even if cached positions disagree', () => {
    const student = { ...SAMPLE_CLASSES[0].students[0], friends_ids:[], incompatible_ids:[], special_needs:[], has_mobility_issues:false, requires_front_row:true };
    const layout: LayoutDef = { type:'rows', rows:2, cols:2, roomFeatures:[{id:'window',kind:'window',x:1,y:1}] };
    layout.roomFeatures![0].y = generateSlots(layout).find(s => s.row === 1 && s.col === 1)!.y;
    const result = {
      layout:{ seats:[{student_id:student.id, is_empty:false, position:{ row:1,col:1,is_front_row:false,is_near_teacher:false }}] },
      student_positions:{[student.id]:{row:0,col:0,is_front_row:true,is_near_teacher:true}},
    } as unknown as OptimizationResult;
    const constraints: SeatingConstraints = { separate_pairs:[],keep_together_pairs:[],front_row_ids:[],back_row_ids:[],near_window_ids:[student.id] };
    const explanation = explainPlacement(student,result,layout,[student],constraints);
    expect(explanation.slot?.row).toBe(1);
    expect(explanation.weaknesses.map(line => line.key)).toContain('explain.front_need_unmet');
    expect(explanation.reasons.map(line => line.key)).toContain('explain.window_by_rule');
    expect(explanation.weaknesses.map(line => line.key)).not.toContain('explain.window_unmet');
  });
});
