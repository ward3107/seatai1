import type { Membership, SchoolCommand, SchoolContext, SchoolGateway, SchoolWorkspace } from './types';

export class SchoolApiError extends Error {
  constructor(public code: string) { super(code); }
}

/** School responses and credentials never enter IndexedDB, localStorage or the service-worker cache. */
export async function schoolRequest<T>(action: string, args: Record<string, unknown> = {}): Promise<T> {
  const response = await fetch('/api/school', {
    method: 'POST', credentials: 'same-origin', cache: 'no-store',
    headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...args }),
  });
  let data: unknown;
  try { data = await response.json(); } catch { throw new SchoolApiError('unavailable'); }
  if (!response.ok) throw new SchoolApiError((data as { error?: string }).error ?? 'unavailable');
  return data as T;
}

export const cloudGateway: SchoolGateway = {
  bootstrap: () => schoolRequest<{ available: boolean; memberships: Membership[]; signedIn: boolean; mfaRequired?: boolean }>('bootstrap'),
  workspace: context => schoolRequest<SchoolWorkspace>('workspace', { context }),
  command: async (context: SchoolContext, command: SchoolCommand) => {
    await schoolRequest('command', { context, command });
  },
};
