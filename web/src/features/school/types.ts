export type SchoolRole = 'teacher' | 'counselor' | 'principal';
export type CaseStatus = 'new' | 'in_progress' | 'resolved';
export interface Membership { schoolId: string; schoolName: string; role: SchoolRole; displayName: string }
export interface SchoolContext { schoolId: string; role: SchoolRole }
export interface SchoolStudent { id: string; name: string; localRef: string }
export interface SeatingSnapshot { rows: number; cols: number; positions: { localRef: string; row: number; col: number }[] }
export interface SchoolClass { id: string; name: string; studentCount: number; students: SchoolStudent[]; snapshot?: SeatingSnapshot; updatedAt: string }
export interface Referral { id: string; classId: string; studentId: string; studentName: string; title: string; detail: string; status: CaseStatus; createdAt: string }
export interface Recommendation { id: string; referralId: string; body: string; goal: string; reviewDate: string; createdAt: string }
export interface Outcome { id: string; referralId: string; body: string; createdAt: string }
export interface PrivateNote { id: string; referralId: string; body: string; createdAt: string }
export interface StaffMember { id: string; displayName: string; role: SchoolRole; active: boolean; expiresAt: string | null; classIds: string[] }
export interface AuditEvent { id: string; action: string; createdAt: string }
export interface SchoolWorkspace {
  school: { id: string; name: string; notice: string };
  classes: SchoolClass[];
  referrals: Referral[];
  recommendations: Recommendation[];
  outcomes: Outcome[];
  privateNotes: PrivateNote[];
  members: StaffMember[];
  audit: AuditEvent[];
  summary: { students: number; classes: number; newCases: number; activeCases: number; resolvedCases: number; followUps: number };
}
export type SchoolCommand =
  | { action: 'publish_class'; payload: { name: string; students: { name: string; localRef: string }[]; snapshot: SeatingSnapshot; classId?: string } }
  | { action: 'create_referral'; payload: { classId: string; studentId: string; title: string; detail: string } }
  | { action: 'recommend'; payload: { referralId: string; body: string; goal: string; reviewDate: string } }
  | { action: 'private_note' | 'outcome'; payload: { referralId: string; body: string } }
  | { action: 'set_status'; payload: { referralId: string; status: CaseStatus } }
  | { action: 'grant_member'; payload: { email: string; displayName: string; role: SchoolRole; classIds: string[]; expiresAt: string | null } }
  | { action: 'revoke_member'; payload: { memberId: string } };
export interface SchoolGateway {
  bootstrap(): Promise<{ available: boolean; memberships: Membership[]; signedIn: boolean; mfaRequired?: boolean }>;
  workspace(context: SchoolContext): Promise<SchoolWorkspace>;
  command(context: SchoolContext, command: SchoolCommand): Promise<void>;
}
