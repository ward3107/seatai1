// Exercise the emitted ESM in native Node, rather than a test bundler that
// silently resolves extensionless imports. No credentials or remote calls.
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdtemp, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import ts from 'typescript';

const root = fileURLToPath(new URL('../web/api/', import.meta.url));
const stage = await mkdtemp(join(tmpdir(), 'seatai-school-runtime-'));
const originalFetch = globalThis.fetch;
const originalUrl = process.env.SEATAI_SUPABASE_URL;
const originalKey = process.env.SEATAI_SUPABASE_PUBLISHABLE_KEY;
try {
  await writeFile(join(stage, 'package.json'), JSON.stringify({ type: 'module' }));
  for (const name of ['school', '_lib/httpTypes', '_lib/rateLimit', '_lib/kvStore']) {
    const source = await readFile(join(root, `${name}.ts`), 'utf8');
    const { outputText } = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } });
    const output = join(stage, `${name}.js`);
    await mkdir(dirname(output), { recursive: true });
    await writeFile(output, outputText);
  }
  delete process.env.SEATAI_SUPABASE_URL;
  delete process.env.SEATAI_SUPABASE_PUBLISHABLE_KEY;
  globalThis.fetch = async () => { throw new Error('Runtime check must not make network requests'); };
  const { default: handler } = await import(pathToFileURL(join(stage, 'school.js')).href);
  async function request(origin, action = 'bootstrap') {
    let status, body;
    const headers = {};
    const response = { setHeader(name, value) { headers[name] = value; }, status(value) { status = value; return this; }, json(value) { body = value; }, send(value) { body = value; } };
    await handler({ method: 'POST', headers: { host: 'runtime.example', origin, 'content-type': 'application/json' }, body: { action }, query: {} }, response);
    return { status, body, headers };
  }
  const bootstrap = await request('https://runtime.example');
  assert.equal(bootstrap.status, 200);
  assert.deepEqual(bootstrap.body, { available: false, memberships: [], signedIn: false });
  assert.match(bootstrap.headers['Cache-Control'], /no-store/);
  assert.equal((await request('https://untrusted.example')).status, 403);
  assert.equal((await request('https://runtime.example', 'workspace')).status, 503);
  process.stdout.write('School server ESM startup, disabled bootstrap and origin isolation passed.\n');
} finally {
  globalThis.fetch = originalFetch;
  if (originalUrl === undefined) delete process.env.SEATAI_SUPABASE_URL; else process.env.SEATAI_SUPABASE_URL = originalUrl;
  if (originalKey === undefined) delete process.env.SEATAI_SUPABASE_PUBLISHABLE_KEY; else process.env.SEATAI_SUPABASE_PUBLISHABLE_KEY = originalKey;
  await rm(stage, { recursive: true, force: true });
}
