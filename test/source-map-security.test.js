import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));

// Exercise the exact source-map dependency resolved by PostCSS. A subprocess
// bounds regressions that would otherwise block the test runner's event loop.
function checkPostcssSourceMap(source) {
  const temporaryDirectory = mkdtempSync(join(tmpdir(), 'ygo-source-map-security-'));
  const reportPath = join(temporaryDirectory, 'completed.json');
  try {
    const result = spawnSync(process.execPath, ['--max-old-space-size=96', '-e', `
    const assert = require('node:assert/strict');
    const { createRequire } = require('node:module');
    const postcss = require('postcss');
    const requireFromPostcss = createRequire(require.resolve('postcss'));
    const { SourceMapConsumer, SourceNode } = requireFromPostcss('source-map-js');
    const basicMap = {
      version: 3, sources: ['original.css'], sourcesContent: ['a { color: red; }'],
      names: [], mappings: 'AAAA'
    };
    const indexedMap = (line, map = basicMap) => ({
      version: 3, sections: [{ offset: { line, column: 0 }, map }]
    });
    ${source}
    require('node:fs').writeFileSync(${JSON.stringify(reportPath)}, JSON.stringify({ completed: true }));
    `], {
      cwd: projectRoot,
      stdio: ['ignore', 'pipe', 'pipe'],
      encoding: 'utf8',
      timeout: 5_000,
      killSignal: 'SIGKILL',
      maxBuffer: 64 * 1024
    });
    assert.ifError(result.error);
    assert.equal(result.status, 0, result.stderr || `dependency check exited with ${result.signal}`);
    assert.deepEqual(JSON.parse(readFileSync(reportPath, 'utf8')), { completed: true });
  } finally {
    rmSync(temporaryDirectory, { recursive: true, force: true });
  }
}

test('GHSA-68fv-2mgg-jv7q: oversized and nested indexed offsets are rejected before conversion', () => {
  checkPostcssSourceMap(`
    assert.throws(() => new SourceMapConsumer(indexedMap(1e12)), /offset/i);
    assert.throws(() => new SourceMapConsumer(indexedMap(5e6, indexedMap(5e6, indexedMap(5e6)))), /offset/i);
    for (const invalid of [-1, 1.5, Infinity, NaN, '1']) {
      assert.throws(() => new SourceMapConsumer(indexedMap(invalid)));
    }
  `);
});

test('GHSA-68fv-2mgg-jv7q: a valid large indexed offset cannot expand a tiny generated source into millions of nodes', () => {
  checkPostcssSourceMap(`
    const generated = 'a { color: red; }\\n';
    const node = SourceNode.fromStringWithSourceMap(generated, new SourceMapConsumer(indexedMap(1e7)));
    assert.equal(node.toString(), generated);
    assert.ok(node.children.length < 10, 'conversion must skip lines beyond the end of the generated source');
  `);
});

test('PostCSS still transforms ordinary CSS and preserves the previous source map after the security update', () => {
  checkPostcssSourceMap(`
    const original = 'a { color: red; }';
    const result = postcss([root => root.walkDecls(declaration => { declaration.value = 'blue'; })])
      .process(original, {
        from: 'generated.css', to: 'output.css',
        map: { prev: basicMap, inline: false, annotation: false }
      });
    assert.equal(result.css, 'a { color: blue; }');
    const map = result.map.toJSON();
    assert.ok(map.sourcesContent.includes(original));
    assert.match(new SourceMapConsumer(map).originalPositionFor({ line: 1, column: 0 }).source, /original\\.css$/);
  `);
});
