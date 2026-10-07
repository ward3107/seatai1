import type { Membership, SchoolCommand, SchoolContext, SchoolGateway, SchoolWorkspace } from './types';
import { SchoolApiError } from './api';

type Translator = (key: string) => string;
const SCHOOL = 'demo-school';
const now = () => new Date().toISOString();
const id = () => crypto.randomUUID();

/** Isolated, disposable sample data. This gateway never reads a local roster or contacts a server. */
export function createDemoGateway(t: Translator): SchoolGateway {
  const seededAt = now();
  const workspace: SchoolWorkspace = {
    school: { id: SCHOOL, name: t('school.demoSchool'), notice: t('school.demoNotice') },
    classes: [
      { id: 'demo-class-1', name: t('school.demoClass1'), studentCount: 3, updatedAt: seededAt,
        students: ['demoStudent1', 'demoStudent2', 'demoStudent3'].map((key, i) => ({ id: `demo-student-${i + 1}`, name: t(`school.${key}`), localRef: `demo-${i + 1}` })),
        snapshot: { rows: 2, cols: 2, positions: [{ localRef: 'demo-1', row: 0, col: 0 }, { localRef: 'demo-2', row: 0, col: 1 }, { localRef: 'demo-3', row: 1, col: 0 }] } },
      { id: 'demo-class-2', name: t('school.demoClass2'), studentCount: 2, students: [], updatedAt: seededAt },
    ],
    referrals: [{ id: 'demo-case', classId: 'demo-class-1', studentId: 'demo-student-1', studentName: t('school.demoStudent1'), title: t('school.demoCaseTitle'), detail: t('school.demoCaseDetail'), status: 'in_progress', createdAt: seededAt }],
    recommendations: [{ id: 'demo-recommendation', referralId: 'demo-case', body: t('school.demoRecommendation'), goal: t('school.demoGoal'), reviewDate: new Date().toISOString().slice(0, 10), createdAt: seededAt }],
    outcomes: [], privateNotes: [{ id: 'demo-private', referralId: 'demo-case', body: t('school.demoPrivateNote'), createdAt: seededAt }],
    members: [
      { id: 'demo-teacher', displayName: t('school.teacher'), role: 'teacher', active: true, expiresAt: null, classIds: ['demo-class-1'] },
      { id: 'demo-counselor', displayName: t('school.counselor'), role: 'counselor', active: true, expiresAt: null, classIds: ['demo-class-1'] },
      { id: 'demo-principal', displayName: t('school.principal'), role: 'principal', active: true, expiresAt: null, classIds: [] },
    ], audit: [], summary: { classes: 2, students: 5, newCases: 0, activeCases: 1, resolvedCases: 0, followUps: 1 },
  };
  const memberships: Membership[] = ['teacher', 'counselor', 'principal'].map(role => ({ schoolId: SCHOOL, schoolName: workspace.school.name, role: role as Membership['role'], displayName: t(`school.${role}`) }));
  function allowedClass(context: SchoolContext, classId: string) {
    return workspace.members.some(m => m.role === context.role && m.active && (!m.expiresAt || new Date(m.expiresAt).getTime() > Date.now()) && m.classIds.includes(classId));
  }
  function validate(context: SchoolContext) {
    if (context.schoolId !== SCHOOL || !workspace.members.some(m => m.role === context.role && m.active && (!m.expiresAt || new Date(m.expiresAt).getTime() > Date.now()))) throw new SchoolApiError('forbidden');
  }
  return {
    async bootstrap() { return { available: true, signedIn: true, memberships: structuredClone(memberships) }; },
    async workspace(context) {
      validate(context);
      const result = structuredClone(workspace);
      if (context.role !== 'principal') result.classes = result.classes.filter(c => allowedClass(context, c.id));
      if (context.role === 'principal') {
        result.classes = result.classes.map(c => ({ ...c, students: [], snapshot: undefined }));
        result.referrals = []; result.recommendations = []; result.outcomes = []; result.privateNotes = [];
      } else {
        result.referrals = result.referrals.filter(r => allowedClass(context, r.classId));
        const visible = new Set(result.referrals.map(r => r.id));
        result.recommendations = result.recommendations.filter(r => visible.has(r.referralId));
        result.outcomes = result.outcomes.filter(o => visible.has(o.referralId));
        result.privateNotes = context.role === 'counselor' ? result.privateNotes.filter(n => visible.has(n.referralId)) : [];
        result.members = []; result.audit = [];
      }
      const cases = context.role === 'principal' ? workspace.referrals : result.referrals;
      result.summary = {
        classes: result.classes.length, students: result.classes.reduce((sum, c) => sum + c.studentCount, 0),
        newCases: cases.filter(r => r.status === 'new').length, activeCases: cases.filter(r => r.status === 'in_progress').length,
        resolvedCases: cases.filter(r => r.status === 'resolved').length,
        followUps: new Set(workspace.recommendations.filter(rec => rec.reviewDate <= new Date().toISOString().slice(0, 10) && cases.some(c => c.id === rec.referralId && c.status !== 'resolved')).map(r => r.referralId)).size,
      };
      return result;
    },
    async command(context, command: SchoolCommand) {
      validate(context);
      // Sample mode intentionally keeps student creation/import outside the demonstration.
      if (command.action === 'publish_class' || command.action === 'grant_member') throw new SchoolApiError('demo_only');
      if (command.action === 'revoke_member') {
        if (context.role !== 'principal') throw new SchoolApiError('forbidden');
        const member = workspace.members.find(m => m.id === command.payload.memberId);
        if (!member || member.role === 'principal') throw new SchoolApiError('invalid_request');
        member.active = false;
      } else if (command.action === 'create_referral') {
        const { classId, studentId, title, detail } = command.payload;
        if (context.role !== 'teacher' || !allowedClass(context, classId)) throw new SchoolApiError('forbidden');
        const student = workspace.classes.find(c => c.id === classId)?.students.find(s => s.id === studentId);
        if (!student) throw new SchoolApiError('forbidden');
        workspace.referrals.unshift({ id: id(), classId, studentId, studentName: student.name, title, detail, status: 'new', createdAt: now() });
      } else {
        const ref = workspace.referrals.find(r => r.id === command.payload.referralId);
        if (!ref || !allowedClass(context, ref.classId)) throw new SchoolApiError('forbidden');
        if (command.action === 'outcome') {
          if (context.role !== 'teacher') throw new SchoolApiError('forbidden');
          workspace.outcomes.unshift({ id: id(), referralId: ref.id, body: command.payload.body, createdAt: now() });
        } else {
          if (context.role !== 'counselor') throw new SchoolApiError('forbidden');
          if (command.action === 'recommend') {
            workspace.recommendations.unshift({ id: id(), ...command.payload, createdAt: now() }); ref.status = 'in_progress';
          } else if (command.action === 'private_note') workspace.privateNotes.unshift({ id: id(), ...command.payload, createdAt: now() });
          else if (command.action === 'set_status') ref.status = command.payload.status;
        }
      }
      workspace.audit.unshift({ id: id(), action: command.action, createdAt: now() });
    },
  };
}
