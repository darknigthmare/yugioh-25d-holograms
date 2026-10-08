#!/usr/bin/env python3
"""Compare the isolated renderer before/after this wave using real public native events.

This is a presentation gallery, never a playable duel or an injected game state.
Native commands and their outcomes are archived by the companion Node runner.
"""
import hashlib
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import mimetypes
from pathlib import Path
import re
import threading
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'docs/audits/artifacts/effects-wave-2026-10-08'
NATIVE = json.loads((OUT / 'native-attacks.json').read_text())
HTML = '''<!doctype html><html lang="fr"><meta charset="utf-8">
<title>Comparaison des effets publics — 8 octobre 2026</title><style>
*{box-sizing:border-box}body{margin:0;padding:20px;background:#0b1422;color:#e3f0ff;font:15px system-ui}
h1{font-size:23px;margin:0 0 12px}p{max-width:1000px;color:#a8bed3;line-height:1.5}
section{border:1px solid #34506b;border-radius:8px;background:#101e30;padding:14px;margin:16px 0}
header{display:flex;gap:14px;align-items:center;margin-bottom:14px}header img{width:62px;height:62px;object-fit:cover;border-radius:4px}
h2{font-size:19px;margin:0 0 5px}small{color:#a7c5dd}.frames{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:10px}
figure{margin:0;border:1px solid #29405a;border-radius:4px;overflow:hidden}figure img{width:100%;display:block;aspect-ratio:3/2}
figcaption{padding:7px;font-size:12px;color:#c6dbee;background:#14283e}
@media(max-width:600px){body{padding:10px;font-size:13px}h1{font-size:20px}h2{font-size:16px}.frames{grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}section{padding:9px}figcaption{font-size:11px;padding:5px}}
</style><h1>Sept effets publics : comparaison avant / après</h1>
<p>Galerie isolée du module applicatif, aux instants 22 %, 50 % et 78 %. Les quatre attaques et leurs destructions proviennent de vraies commandes du moteur natif ; la réanimation et l’annulation proviennent des scénarios natifs référencés. Cette galerie ne certifie pas leur affichage dans l’interface de duel compilée : cet audit est séparé. Aucun état de jeu ni réponse moteur n’est injecté ici.</p>
<main></main><script type="importmap" nonce="effects-wave">{"imports":{"three":"/node_modules/three/build/three.module.js"}}</script>
<script type="module" src="/audit.js"></script></html>'''
JS = '''import * as THREE from 'three';
import {createCombatVisualEffect as after} from '/src/ui/CombatVisualEffects.js';
import {createCombatVisualEffect as before} from '/src/ui/CombatVisualEffectsBeforeWave.js';
import {createPublicCombatVisual} from '/src/ui/PublicDuelVisuals.js';
const cases=await (await fetch('/presentations.json')).json();
const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
renderer.setSize(480,320);renderer.setPixelRatio(1);renderer.setClearColor('#0b1422');
const camera=new THREE.PerspectiveCamera(43,1.5,.1,50),scene=new THREE.Scene(),details=[];
const round=value=>Math.round(value*1e6)/1e6;
const finite=values=>[...values].every(Number.isFinite);
function snapshot(effect){const rows=[];effect.group.updateMatrixWorld(true);effect.group.traverse(object=>{
 if(!object.geometry)return;const attributes=Object.values(object.geometry.attributes);
 rows.push({name:object.name,type:object.type,visible:object.visible,
  geometry:object.geometry.type,attributeValues:attributes.reduce((sum,a)=>sum+a.array.length,0),
  finiteAttributes:attributes.every(a=>finite(a.array)),texture:Boolean(object.material.map),
  matrix:object.matrixWorld.elements.map(round),
  ...(object.instanceMatrix?{instances:object.count,instanceMatrices:[...object.instanceMatrix.array].map(round)}:{}),
  drawRangeCount:Number.isFinite(object.geometry.drawRange.count)?object.geometry.drawRange.count:'all'});
 });return rows;}
for(const [index,item] of cases.entries()){
 const section=document.createElement('section');section.dataset.case=String(index);
 const header=document.createElement('header'),art=document.createElement('img'),title=document.createElement('div'),name=document.createElement('h2'),source=document.createElement('small');
 art.src='/public/cards/cropped/'+item.visual.card.id+'.jpg';art.alt='Illustration publique inspectée';
 name.textContent=item.label;source.textContent='Événement '+item.nativeEventType+' · '+item.sourceScenario;
 title.append(name,source);header.append(art,title);section.append(header);
 const frames=document.createElement('div');frames.className='frames';section.append(frames);document.querySelector('main').append(section);
 const sourcePoint=new THREE.Vector3(...item.visual.source),targetPoint=new THREE.Vector3(...(item.visual.target||item.visual.source));
 const center=item.visual.kind==='attack'?sourcePoint.clone().lerp(targetPoint,.5):sourcePoint;
 camera.position.copy(center).add(new THREE.Vector3(0,3.3,item.visual.kind==='attack'?10:6.4));camera.lookAt(center.clone().add(new THREE.Vector3(0,.6,0)));
 const variants={};
 for(const [label,factory] of [['Avant',before],['Après',after]]){
  const started=performance.now(),effect=factory(item.visual);scene.add(effect.group);
  const resources=new Set();effect.group.traverse(object=>{if(object.geometry)resources.add(object.geometry);if(object.material)resources.add(object.material);if(object.isInstancedMesh)resources.add(object);});
  const disposals=new Map([...resources].map(resource=>[resource,0]));
  for(const resource of resources)resource.addEventListener('dispose',()=>disposals.set(resource,disposals.get(resource)+1));
  const captured=[];
  for(const progress of [.22,.5,.78]){
   const updateStart=performance.now();effect.update(progress);const updateMs=performance.now()-updateStart;
   renderer.render(scene,camera);const figure=document.createElement('figure'),img=document.createElement('img'),caption=document.createElement('figcaption');
   figure.dataset.variant=label;figure.dataset.progress=String(progress);img.src=renderer.domElement.toDataURL('image/png');
   caption.textContent=label+' · '+Math.round(progress*100)+' % · '+renderer.info.render.calls+' appels';figure.append(img,caption);frames.append(figure);
   captured.push({progress,updateMs,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,objects:snapshot(effect)});
  }
  const duration=effect.duration,profile={...effect.profile},children=effect.group.children.length;
  effect.dispose();const doubleDispose=effect.dispose(),postDisposeUpdate=effect.update(.5);
  renderer.render(scene,camera);
  variants[label]={profile,duration,children,creationAndCaptureMs:performance.now()-started,frames:captured,
   resources:resources.size,eachResourceDisposedOnce:[...disposals.values()].every(count=>count===1),
   doubleDispose,postDisposeUpdate,remainingChildren:effect.group.children.length,remainingGeometries:renderer.info.memory.geometries,remainingTextures:renderer.info.memory.textures};
 }
 // Pair the same progress horizontally, including on a two-column phone.
 for(const progress of [.22,.5,.78])for(const label of ['Avant','Après'])frames.append(frames.querySelector('figure[data-variant="'+label+'"][data-progress="'+progress+'"]'));
 details.push({index,label:item.label,nativeEventType:item.nativeEventType,sourceScenario:item.sourceScenario,variants});
}
let identityReads=0;const hidden={isSetFaceDown:true,get id(){identityReads++;throw Error('Private identity accessed')}};
const rejected=createPublicCombatVisual({type:'attack-monster',attackerSide:'player',atkZoneType:'main',atkZoneIndex:0,defZoneType:'main',defZoneIndex:0,card:hidden},{});
const suppressed=after({hidden:true,get card(){identityReads++;throw Error('Private payload accessed')}});
const reduced=after({reducedMotion:true,get card(){identityReads++;throw Error('Suppressed payload accessed')}});
const privacy={identityReads,hiddenBoundaryRejected:rejected===null,hiddenGeometry:suppressed.group.children.length,reducedMotionGeometry:reduced.group.children.length};
suppressed.dispose();reduced.dispose();
await Promise.all([...document.images].map(img=>img.decode()));
window.effectsWaveAudit={scope:'isolated renderer comparison using actual public native event payloads',details,privacy,images:document.images.length,sceneChildren:scene.children.length};
renderer.dispose();renderer.forceContextLoss();document.documentElement.dataset.auditReady='true';'''


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def baseline_source():
    current = (ROOT / 'src/ui/CombatVisualEffects.js').read_text()
    value = current.replace("import { resolveCardSpecificVisualProfile, populateCardSpecificVisualEffect } from './CardSpecificVisualEffects.js';\n", '')
    start = value.index('export function createCombatVisualEffect(options = {}) {\n') + len('export function createCombatVisualEffect(options = {}) {\n')
    end = value.index('  const source =', start)
    value = value[:start] + '  const profile = resolveCombatVisualProfile(options);\n' + value[end:]
    start = value.index('  const specialized = populateCardSpecificVisualEffect(')
    end = value.index("  } else if (profile.shape === 'field-water') {", start) + len("  } else if (profile.shape === 'field-water') {")
    value = value[:start] + "  if (profile.shape === 'field-water') {" + value[end:]
    return value


BASELINE = baseline_source()


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        path = urlsplit(self.path).path
        if path == '/':
            data, mime = HTML.encode(), 'text/html'
        elif path == '/audit.js':
            data, mime = JS.encode(), 'text/javascript'
        elif path == '/presentations.json':
            data, mime = json.dumps(NATIVE['presentations']).encode(), 'application/json'
        elif path == '/src/ui/CombatVisualEffectsBeforeWave.js':
            data, mime = BASELINE.encode(), 'text/javascript'
        elif path == '/favicon.ico':
            self.send_response(204); self.end_headers(); return
        elif re.fullmatch(r'/(src/ui/[A-Za-z0-9]+\.js|node_modules/three/build/[a-z.]+\.js|public/cards/cropped/[0-9]+\.jpg)', path):
            file = ROOT / path.lstrip('/')
            if not file.is_file():
                self.send_error(404); return
            data, mime = file.read_bytes(), mimetypes.guess_type(str(file))[0]
        else:
            self.send_error(404); return
        self.send_response(200); self.send_header('Content-Type', mime)
        self.send_header('Content-Security-Policy', "default-src 'self'; script-src 'self' 'nonce-effects-wave'; style-src 'unsafe-inline'; img-src 'self' data:; connect-src 'self'")
        self.end_headers(); self.wfile.write(data)

    def log_message(self, *_):
        pass


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    sources = ['scripts/audit-effects-wave.py', 'src/ui/CombatVisualEffects.js', 'src/ui/CardSpecificVisualEffects.js',
               'src/ui/CombatVisualProfiles.js', 'src/ui/PublicDuelVisuals.js', 'src/core/native/NativeDuelVisualEvents.js',
               'docs/audits/artifacts/effects-wave-2026-10-08/native-attacks.json']
    hashes_before = {path: digest(ROOT / path) for path in sources}
    (OUT / 'CombatVisualEffects.before.js').write_text(BASELINE)
    server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    report = {'date': '2026-10-08', 'ok': False, 'scope': 'isolated presentation comparison; compiled UI integration audited separately',
              'nativeEvidenceSummary': NATIVE['summary'], 'sourceHashes': hashes_before,
              'beforeRenderer': {'path': str((OUT / 'CombatVisualEffects.before.js').relative_to(ROOT)),
                                 'sha256': digest(OUT / 'CombatVisualEffects.before.js'),
                                 'construction': 'Reverse only this wave’s scoped renderer dispatch and suppression changes; both variants use the same public events and current profile registry.'},
              'viewports': []}
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True,
                args=['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
            for width, height in [(1280, 900), (390, 844)]:
                context = browser.new_context(viewport={'width': width, 'height': height})
                page = context.new_page(); errors, failures = [], []
                page.on('pageerror', lambda error: errors.append(str(error)))
                page.on('requestfailed', lambda request: failures.append(urlsplit(request.url).path))
                page.goto(f'http://127.0.0.1:{server.server_port}', wait_until='networkidle')
                page.wait_for_selector('html[data-audit-ready="true"]', timeout=60000)
                view = page.evaluate('window.effectsWaveAudit'); view.update(width=width, height=height, pageErrors=errors, failedRequests=failures)
                assert len(view['details']) == 7 and view['images'] == 49
                assert view['privacy'] == {'identityReads': 0, 'hiddenBoundaryRejected': True, 'hiddenGeometry': 0, 'reducedMotionGeometry': 0}
                assert view['sceneChildren'] == 0 and not errors and not failures
                for row in view['details']:
                    for label, variant in row['variants'].items():
                        assert variant['eachResourceDisposedOnce'] and not variant['doubleDispose'] and not variant['postDisposeUpdate']
                        assert variant['remainingChildren'] == variant['remainingGeometries'] == variant['remainingTextures'] == 0
                        assert variant['children'] <= (12 if label == 'Après' else 18)
                        for frame in variant['frames']:
                            assert frame['drawCalls'] <= (12 if label == 'Après' else 18)
                            assert all(obj['finiteAttributes'] and not obj['texture'] for obj in frame['objects'])
                            assert all(all(isinstance(value, (float, int)) for value in obj['matrix']) for obj in frame['objects'])
                    page.locator(f'section[data-case="{row["index"]}"]').screenshot(path=str(OUT / f'comparison-{row["index"]}-{width}.png'))
                assert len({row['variants']['Après']['profile']['shape'] for row in view['details']}) == 7
                assert page.evaluate('document.body.scrollWidth<=innerWidth')
                page.screenshot(path=str(OUT / f'gallery-{width}.jpg'), full_page=True, type='jpeg', quality=88)
                report['viewports'].append(view); context.close()
            browser.close()
        hashes_after = {path: digest(ROOT / path) for path in sources}
        report['immutableSourceSnapshot'] = hashes_before == hashes_after
        assert hashes_before == hashes_after
        report['ok'] = True
        (OUT / 'render-comparison.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
        print(json.dumps({'ok': True, 'viewports': 2, 'publicEffects': 7, 'sampledFrames': 84,
                          'afterMaxDrawCalls': max(frame['drawCalls'] for view in report['viewports'] for row in view['details']
                                                   for frame in row['variants']['Après']['frames']),
                          'beforeMaxDrawCalls': max(frame['drawCalls'] for view in report['viewports'] for row in view['details']
                                                    for frame in row['variants']['Avant']['frames'])}))
    finally:
        server.shutdown(); server.server_close()


if __name__ == '__main__':
    main()
