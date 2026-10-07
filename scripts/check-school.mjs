// Public deployment check only: no credentials, cookies, pupil queries or writes.
const target = new URL(process.argv[2] ?? 'https://seatai1-web.vercel.app');
if (target.protocol !== 'https:') throw new Error('Use the HTTPS deployment URL.');
const endpoint = new URL('/api/school', target);
const request = (body, origin = target.origin) => fetch(endpoint, {
  method: 'POST', headers: { 'Content-Type': 'application/json', Origin: origin },
  body: JSON.stringify(body), signal: AbortSignal.timeout(20_000), redirect: 'error',
});
const bootstrap = await request({ action: 'bootstrap' });
const data = await bootstrap.json();
if (!bootstrap.ok || data.signedIn !== false || data.memberships?.length !== 0) throw new Error('Unexpected unauthenticated bootstrap response.');
if (!bootstrap.headers.get('cache-control')?.includes('no-store')) throw new Error('School responses must not be cached.');
const forged = await request({ action: 'bootstrap' }, 'https://untrusted.example');
if (forged.status !== 403) throw new Error('Cross-origin request was not denied.');
const protectedRequest = await request({ action: 'workspace', context: { schoolId: '00000000-0000-4000-8000-000000000001', role: 'principal' } });
if (protectedRequest.status !== (data.available ? 401 : 503)) throw new Error('Unauthenticated workspace was not denied.');
process.stdout.write(JSON.stringify({ endpoint: endpoint.href, configured: data.available, signedOut: true, noCache: true, crossOriginDenied: true, workspaceDenied: true }) + '\n');
