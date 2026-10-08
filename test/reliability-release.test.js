import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);

test('production headers forbid script injection, framing and sensitive browser capabilities', async () => {
  const config = JSON.parse(await readFile(new URL('vercel.json', root), 'utf8'));
  const headers = new Map(config.headers.find(rule => rule.source === '/(.*)').headers.map(header => [header.key.toLowerCase(), header.value]));
  const directives = new Map(headers.get('content-security-policy').split(';').map(value => {
    const [name, ...sources] = value.trim().split(/\s+/);
    return [name, sources];
  }));
  assert.deepEqual(directives.get('script-src'), ["'self'", "'wasm-unsafe-eval'"]);
  assert.ok(!directives.get('script-src').some(source => ["'unsafe-eval'", "'unsafe-inline'", '*'].includes(source)),
    'native WASM compilation must not enable JavaScript eval or inline scripts');
  assert.deepEqual(directives.get('object-src'), ["'none'"]);
  assert.deepEqual(directives.get('frame-ancestors'), ["'none'"]);
  assert.deepEqual(directives.get('base-uri'), ["'self'"]);
  assert.deepEqual(directives.get('form-action'), ["'self'"]);
  assert.deepEqual(directives.get('connect-src'), ["'self'", 'https://db.ygoprodeck.com']);
  assert.equal(headers.get('x-content-type-options'), 'nosniff');
  assert.equal(headers.get('x-frame-options'), 'DENY');
  assert.match(headers.get('permissions-policy'), /camera=\(\)/);
  assert.match(headers.get('permissions-policy'), /microphone=\(\)/);
  assert.match(headers.get('permissions-policy'), /geolocation=\(\)/);
});

test('lockfile uses registry artifacts with integrity hashes and matches direct dependencies', async () => {
  const packageJson = JSON.parse(await readFile(new URL('package.json', root), 'utf8'));
  const lock = JSON.parse(await readFile(new URL('package-lock.json', root), 'utf8'));
  assert.deepEqual(lock.packages[''].dependencies, packageJson.dependencies);
  assert.deepEqual(lock.packages[''].devDependencies, packageJson.devDependencies);
  for (const [path, dependency] of Object.entries(lock.packages)) {
    if (!path) continue;
    assert.match(dependency.resolved, /^https:\/\/registry\.npmjs\.org\//, path);
    assert.match(dependency.integrity, /^sha512-[A-Za-z0-9+/]+=*$/, path);
  }
});

test('CI is read-only, SHA-pinned, time-bounded and runs audit plus complete release checks', async () => {
  const workflow = await readFile(new URL('.github/workflows/ci.yml', root), 'utf8');
  assert.match(workflow, /permissions:\s*contents: read/);
  assert.match(workflow, /persist-credentials: false/);
  assert.match(workflow, /timeout-minutes: 15/);
  assert.match(workflow, /node-version: '24'/);
  assert.match(workflow, /run: npm ci/);
  assert.match(workflow, /run: npm run audit:security/);
  assert.match(workflow, /run: npm run check/);
  const actions = [...workflow.matchAll(/uses:\s*(\S+)/g)].map(match => match[1]);
  assert.equal(actions.length, 2);
  assert.ok(actions.every(action => /@[a-f0-9]{40}$/.test(action)));
  assert.doesNotMatch(workflow, /pull_request_target|workflow_run|write-all|secrets\./);
});
