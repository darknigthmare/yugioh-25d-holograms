#!/usr/bin/env node
/**
 * Deterministic geometry/budget audit and optional real WebGL comparisons.
 * node scripts/audit-field-geometry-2026-10-07.mjs [--capture]
 * Captures need playwright-core and Chromium, but add no runtime dependency.
 * PLAYWRIGHT_MODULE may select an installed absolute module path.
 * CHROMIUM_PATH may select the browser executable (default /usr/bin/chromium).
 */
import { createHash } from 'node:crypto';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { dirname, resolve, extname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as THREE from 'three';
import { createFieldEnvironmentGeometry, disposeFieldEnvironmentGeometry, FIELD_ENVIRONMENT_GEOMETRY_BUDGET } from '../src/ui/FieldEnvironmentGeometry.js';
import { getFieldEnvironmentForCardId } from '../src/ui/FieldEnvironmentRegistry.js';
import { FIELD_SPELL_ENVIRONMENT_CATALOG } from '../src/ui/FieldSpellEnvironmentCatalog.js';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputDirectory = resolve(projectRoot, 'docs/audits/artifacts');
const baselineCommit = '6c0232f';
const geometryFile = 'src/ui/FieldEnvironmentGeometry.js';
const selections = [
  ['18161786', 'Mystic Plasma Zone', [0, 16, 3], [0, 13, -34], 58],
  ['50913601', 'Mountain', [0, 22, 22], [0, 7, -30], 59],
  ['33407125', 'Labrynth Labyrinth', [0, 18, -2], [0, 8, -32], 65],
  ['19384334', 'Molten Destruction', [0, 16, -5], [0, 7, -34], 56],
  ['2084239', 'Wetlands', [0, 13, 25], [0, 2, -10], 65],
  ['56433456', 'The Sanctuary in the Sky', [0, 15, -7], [0, 6, -31], 63],
  ['63035430', 'Skyscraper', [0, 3, 24], [0, 15, -21], 68],
  ['87624166', 'Ancient Forest (unchanged)', [0, 4, 20], [0, 15, -18], 68]
].map(([cardId, name, camera, target, fov]) => ({ cardId, name, camera, target, fov }));
const sha256 = value => createHash('sha256').update(value).digest('hex');
const baselineSource = await readFile(resolve(outputDirectory, `field-geometry-baseline-${baselineCommit}.js`));
const geometrySource = await readFile(resolve(projectRoot, geometryFile));
const budget = FIELD_ENVIRONMENT_GEOMETRY_BUDGET;
const corridor = new THREE.Box3(new THREE.Vector3(...budget.playableCorridor.min), new THREE.Vector3(...budget.playableCorridor.max));
const metrics = [];
for (const entry of FIELD_SPELL_ENVIRONMENT_CATALOG) {
  const group = createFieldEnvironmentGeometry(THREE, getFieldEnvironmentForCardId(entry.cardId));
  const data = group.userData;
  let triangleCount = 0;
  if (data.drawCallCount > budget.maxDrawCallCount || data.materialCount > budget.maxMaterialCount || data.meshCount >= budget.maxPrimitiveCount) {
    throw new Error(`${entry.cardId}: GPU budget exceeded`);
  }
  group.traverse(object => {
    if (!object.isMesh) return;
    if (!object.isInstancedMesh) throw new Error('Static scenery must be instanced');
    triangleCount += (object.geometry.index?.count || object.geometry.attributes.position.count) / 3 * object.count;
    object.geometry.computeBoundingBox();
    const matrix = new THREE.Matrix4();
    for (let index = 0; index < object.count; index += 1) {
      object.getMatrixAt(index, matrix);
      const bounds = object.geometry.boundingBox.clone().applyMatrix4(matrix);
      if (bounds.intersectsBox(corridor)) throw new Error(`${entry.cardId}/${object.userData.instanceNames[index]} enters duel corridor`);
      if (Math.max(Math.abs(bounds.min.x), Math.abs(bounds.max.x), Math.abs(bounds.min.z), Math.abs(bounds.max.z)) >= budget.maxHorizontalExtent) {
        throw new Error(`${entry.cardId}: scenery exceeds horizon bounds`);
      }
    }
  });
  metrics.push({ cardId: entry.cardId, name: entry.name, primitives: data.meshCount,
    drawCalls: data.drawCallCount, materials: data.materialCount, triangles: triangleCount, bounds: data.bounds,
    fidelity: data.fidelity });
  disposeFieldEnvironmentGeometry(group);
}
const report = {
  auditDate: '2026-10-07', baselineCommit,
  geometrySourceSha256: sha256(geometrySource), baselineGeometrySha256: sha256(baselineSource),
  description: 'Unchanged source illustrations compared with isolated adapted peripheral geometry; no claim of complete spatial 1:1 reproduction.',
  budget, auditedCardCount: metrics.length,
  maxima: { primitives: Math.max(...metrics.map(m => m.primitives)),
    drawCalls: Math.max(...metrics.map(m => m.drawCalls)), materials: Math.max(...metrics.map(m => m.materials)),
    triangles: Math.max(...metrics.map(m => m.triangles)) },
  references: await Promise.all(selections.map(async entry => ({ ...entry,
    assetPath: `public/environments/field-art/${entry.cardId}.jpg`,
    sourceUrl: `https://images.ygoprodeck.com/images/cards_cropped/${entry.cardId}.jpg`,
    sha256: sha256(await readFile(resolve(projectRoot, `public/environments/field-art/${entry.cardId}.jpg`))),
    geometry: metrics.find(metric => metric.cardId === entry.cardId)
  }))),
  metrics
};
await mkdir(outputDirectory, { recursive: true });

if (process.argv.includes('--capture')) {
  const candidates = [process.env.PLAYWRIGHT_MODULE, 'playwright-core', '/opt/codex/cua_node/lib/node_modules/playwright-core/index.mjs'].filter(Boolean);
  let playwright;
  for (const candidate of candidates) {
    try { playwright = await import(candidate.startsWith('/') ? pathToFileURL(candidate) : candidate); break; } catch {}
  }
  if (!playwright) throw new Error('Install playwright-core outside this app or set PLAYWRIGHT_MODULE to its absolute module path. Numeric audit needs no browser package.');
  const html = `<!doctype html><html lang="fr"><meta charset="utf-8"><title>Comparaison des terrains — 7 octobre 2026</title>
  <style>body{margin:0;padding:24px;background:#101725;color:#ecf2fb;font:16px system-ui}h1{font-size:25px;margin:0 0 8px}p{color:#b4c4db;margin:0 0 22px}section{margin:0 0 26px}h2{font-size:20px;margin:0 0 10px}small{color:#aebed0} .cols{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}figure{margin:0;padding:10px;background:#1a2536;border:1px solid #31455e;border-radius:8px}img{width:100%;aspect-ratio:1;object-fit:contain;display:block;background:radial-gradient(ellipse at top,#30465a,#0b1421)}figcaption{font-size:14px;color:#c9d6e7;padding-top:8px;min-height:42px}.badge{font-size:12px;color:#9dcbb3}</style>
  <h1>Terrains : illustration exacte / volumes avant / volumes après</h1><p>8 sources intactes · géométrie périphérique isolée · éclairage neutre · cadrage propre à chaque référence, identique avant/après.<br>Les personnages et les détails peints restent dans l'illustration ; ces volumes adaptés ne constituent pas une reconstruction spatiale 1:1.</p><main></main>
  <script type="importmap">{"imports":{"three":"/node_modules/three/build/three.module.js"}}</script>
  <script type="module">
  import * as THREE from 'three';
  import {createFieldEnvironmentGeometry as current,disposeFieldEnvironmentGeometry} from '/src/ui/FieldEnvironmentGeometry.js';
  import {createFieldEnvironmentGeometry as before} from '/baseline.js';
  import {getFieldEnvironmentForCardId} from '/src/ui/FieldEnvironmentRegistry.js';
  const entries=${JSON.stringify(selections)};
  const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true});
  renderer.setSize(720,720);renderer.setPixelRatio(1);renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;
  const details=[];
  const render=(entry,create)=>{
    const scene=new THREE.Scene();const group=create(THREE,getFieldEnvironmentForCardId(entry.cardId));scene.add(group);
    scene.add(new THREE.HemisphereLight(0xf2f5ff,0x616574,2.1));
    const key=new THREE.DirectionalLight(0xfff5e7,2.4);key.position.set(8,28,10);scene.add(key);
    const camera=new THREE.PerspectiveCamera(entry.fov,1,0.1,180);camera.position.set(...entry.camera);camera.lookAt(...entry.target);
    renderer.render(scene,camera);
    const result={url:renderer.domElement.toDataURL('image/png'),primitives:group.userData.meshCount,
      draws:renderer.info.render.calls,materials:group.userData.materialCount,triangles:renderer.info.render.triangles};
    disposeFieldEnvironmentGeometry(group);scene.clear();return result;
  };
  for(const entry of entries){
    const section=document.createElement('section');section.id='card-'+entry.cardId;
    const title=document.createElement('h2');title.textContent=entry.name+' — '+entry.cardId;section.append(title);
    const columns=document.createElement('div');columns.className='cols';section.append(columns);
    const old=render(entry,before),next=render(entry,current);
    for(const [url,label,badge] of [
      ['/environments/field-art/'+entry.cardId+'.jpg','Illustration source intacte','JPG original, proportions conservées'],
      [old.url,'Volumes au commit ${baselineCommit}',old.primitives+' primitives · '+old.draws+' appels · '+old.materials+' matériaux'],
      [next.url,'Volumes après correction du 7 octobre',next.primitives+' primitives · '+next.draws+' appels · '+next.materials+' matériaux']]){
      const figure=document.createElement('figure');const image=document.createElement('img');image.src=url;
      const caption=document.createElement('figcaption');caption.textContent=label;
      const status=document.createElement('div');status.className='badge';status.textContent=badge;caption.append(status);
      figure.append(image,caption);columns.append(figure);
    }
    details.push({cardId:entry.cardId,before:{...old,url:undefined},after:{...next,url:undefined}});
    document.querySelector('main').append(section);
  }
  await Promise.all([...document.images].map(image=>image.decode()));
  renderer.dispose();renderer.forceContextLoss();window.auditCapture={details,images:document.images.length,complete:document.images.length===24};
  document.documentElement.dataset.auditReady='true';
  </script></html>`;
  const server = createServer(async (request, response) => {
    try {
      const path = new URL(request.url, 'http://localhost').pathname;
      if (path === '/favicon.ico') { response.writeHead(204); response.end(); return; }
      if (path === '/') { response.setHeader('Content-Type', 'text/html'); response.end(html); return; }
      if (path === '/baseline.js') { response.setHeader('Content-Type', 'text/javascript'); response.end(baselineSource); return; }
      if (!/^\/(?:src\/(?:ui|core)\/[A-Za-z0-9]+\.js|node_modules\/three\/build\/[a-z.]+\.js|environments\/field-art\/\d+\.jpg)$/.test(path)) {
        response.writeHead(404); response.end(); return;
      }
      const localPath = resolve(projectRoot, path.startsWith('/environments/') ? `public${path}` : `.${path}`);
      response.setHeader('Content-Type', extname(path) === '.jpg' ? 'image/jpeg' : 'text/javascript');
      response.end(await readFile(localPath));
    } catch { response.writeHead(404); response.end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await playwright.chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
      headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
    const errors = [];
    page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()}: ${response.url()}`); });
    page.on('pageerror', error => { errors.push(error.message); console.error(error.message); });
    page.on('console', message => { if (message.type() === 'error') { errors.push(message.text()); console.error(message.text()); } });
    await page.goto(`http://127.0.0.1:${server.address().port}/`);
    await page.waitForFunction(() => document.documentElement.dataset.auditReady === 'true', null, { timeout: 60000 });
    report.capture = await page.evaluate(() => window.auditCapture);
    report.capture.errors = errors;
    if (errors.length || !report.capture.complete) throw new Error(`Capture failed: ${JSON.stringify(errors)}`);
    await page.screenshot({ path: resolve(outputDirectory, 'field-geometry-comparison-2026-10-07.png'), fullPage: true });
    for (const entry of selections) {
      await page.locator(`#card-${entry.cardId}`).screenshot({ path: resolve(outputDirectory, `field-geometry-${entry.cardId}-2026-10-07.png`) });
    }
    report.capture.artifact = 'docs/audits/artifacts/field-geometry-comparison-2026-10-07.png';
  } finally {
    await browser?.close();
    await new Promise(resolve => server.close(resolve));
  }
}
await writeFile(resolve(outputDirectory, 'field-geometry-2026-10-07.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ auditedCards: report.auditedCardCount, maxima: report.maxima,
  capturedReferences: report.capture?.details.length || 0, captureErrors: report.capture?.errors || [] }));
