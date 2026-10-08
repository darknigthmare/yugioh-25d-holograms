#!/usr/bin/env python3
"""Capture original / archived previous geometry / adapted reference volumes.

Requires externally installed Python Playwright and Chromium. No runtime
dependencies are changed. Uses a single sequentially reused WebGL renderer.
"""
import argparse
import base64
import hashlib
import json
import mimetypes
import re
import subprocess
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'docs/audits/artifacts/field-ritual-2026-10-07'
SELECTIONS = [['17782288', 'Angelechy Problem', [23, 5, 8], [0, 14, -34], 55], ['59048135', 'Augmented Heraldry', [23, 22, 8], [0, 15, -34], 55], ['80749819', 'Call of the Forgotten', [0, 6, -4], [0, 4, -39], 45], ['69039982', 'Crusadia Revival', [23, 22, 8], [0, 15, -34], 55], ['81380218', 'Chorus of Sanctuary', [23, 22, 8], [0, 15, -34], 55], ['23213239', 'Danger! Disturbance! Disorder!', [22, 23, 4], [0, 8, -34], 55], ['12397569', 'Divine Domain Baatistina', [23, 22, 8], [0, 15, -34], 55], ['53639887', 'Divine Temple of the Snake-Eye', [23, 22, 8], [0, 15, -34], 55], ['71817640', 'Dragonic Pendulum', [23, 22, 8], [0, 15, -34], 55], ['7917970', 'Dragunity Divine Wind', [23, 22, 8], [0, 15, -34], 55], ['92223430', 'Elborz, the Sacred Lands of Simorgh', [22, 23, 4], [0, 8, -34], 55], ['39730727', 'Flawless Perfection of the Tenyi', [23, 22, 8], [0, 15, -34], 55], ['40089744', 'Gateway to Chaos', [23, 22, 8], [0, 15, -34], 55], ['50186558', 'Guardragon Shield', [23, 22, 8], [0, 15, -34], 55], ['17255673', 'Heavenly Gate of the Mikanko', [23, 22, 8], [0, 15, -34], 55], ['81777047', 'Luminous Spark', [23, 22, 8], [0, 15, -34], 55], ['71650854', 'Magical Mid-Breaker Field', [23, 22, 8], [0, 15, -34], 55], ['27564031', 'Malefic World', [23, 22, 8], [0, 15, -34], 55], ['68337209', 'Maliss in Underground', [23, 22, 8], [0, 15, -34], 55], ['84504242', 'Megalith Portal', [23, 2, 8], [0, 14, -34], 55], ['269012', 'Mound of the Bound Creator', [23, 22, 8], [0, 17, -34], 55], ['885016', 'Multi-Universe', [23, 22, 8], [0, 15, -34], 55], ['62314831', 'New World - Amritara', [23, 22, 8], [0, 15, -34], 55], ['60946968', 'Otherworld - The "A" Zone', [23, 22, 8], [0, 15, -34], 55], ['51669847', 'Plundered Power Patron Plane - Vidolia', [23, 22, 8], [0, 15, -34], 55], ['77584012', 'Pseudo Space', [23, 22, 8], [0, 15, -34], 55], ['79698395', 'Realm of Danger!', [22, 23, 4], [0, 8, -34], 55], ['45778932', 'Rising Air Current', [23, 22, 8], [0, 15, -34], 55], ['24793135', 'Sacred Scrolls of the Gizmek Legend', [23, 22, 8], [0, 15, -34], 55], ['30336082', 'Sangen Summoning', [23, 22, 8], [0, 15, -34], 55], ['1127737', 'Sargasso the D.D. Battlefield', [23, 22, 8], [0, 15, -34], 55], ['48015771', 'Summon Over', [23, 22, 8], [0, 15, -34], 55], ['9597987', 'Tenchi Kaimei', [22, 23, 4], [0, 8, -34], 55], ['77946022', 'Tenyinfinity', [23, 22, 8], [0, 15, -34], 55], ['56433456', 'The Sanctuary in the Sky', [23, 22, 8], [0, 15, -34], 55], ['48179391', 'The Seal of Orichalcos', [23, 22, 8], [0, 15, -34], 55], ['45943516', 'War Rock Mountain', [23, 22, 8], [0, 15, -34], 55], ['4398189', 'Witch of the White Forest', [23, 22, 8], [0, 15, -34], 55], ['61654098', 'World Legacy Discovery', [23, 22, 8], [0, 15, -34], 55], ['67831115', 'World Legacy in Shadow', [22, 23, 4], [0, 8, -34], 55], ['35546670', 'World Legacy Scars', [22, 23, 4], [0, 8, -34], 55], ['25163979', "World Legacy's Nightmare", [22, 23, 4], [0, 8, -34], 55], ['59197169', 'Yami', [23, 22, 8], [0, 15, -34], 55], ['65861210', 'Fallen Paradise of the Sacred Beasts', [23, 22, 8], [0, 15, -34], 55], ['43236494', "Fairy Tale Prologue: Journey's Dawn", [23, 22, 8], [0, 16, -34], 55]]

HTML = '''<!doctype html><html lang="fr"><meta charset="utf-8">
<title>Terrains du lot Ritual : sources et volumes</title><style>
body{margin:0;padding:20px;background:#101725;color:#edf2fb;font:16px system-ui}
h1{font-size:24px;margin:0 0 8px}p{color:#b5c5d9;margin:0 0 20px}h2{font-size:19px;margin:0 0 10px}
section{margin-bottom:26px}.cols{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
figure{margin:0;padding:8px;background:#1a2536;border:1px solid #31455e;border-radius:8px}
img{width:100%;aspect-ratio:1;object-fit:contain;display:block;background:radial-gradient(ellipse at top,#344858,#0c1624)}
figcaption{font-size:14px;padding-top:7px;color:#c5d6e6}.badge{font-size:12px;color:#b0d5c3}</style>
<h1>45 Terrains : illustration exacte / volumes précédents / nouveaux volumes</h1>
<p>Illustrations intactes · même lumière et même caméra avant/après · géométrie isolée.<br>
Les dimensions sont adaptées à la périphérie du duel. Les personnages et détails peints restent dans la source ; la 3D n'est pas une reproduction spatiale intégrale 1:1.</p><main></main>
<script type="importmap">{"imports":{"three":"/node_modules/three/build/three.module.js"}}</script>
<script type="module">
import * as THREE from 'three';
import {FIELD_GEOMETRY_THREE as applicationThree} from '/src/ui/FieldGeometryThree.js';
import {createFieldEnvironmentGeometry as create,disposeFieldEnvironmentGeometry as dispose} from '/src/ui/FieldEnvironmentGeometry.js';
import {createFieldEnvironmentGeometry as oldCreate} from '/baseline/src/ui/FieldEnvironmentGeometry.js';
import {getFieldEnvironmentForCardId} from '/src/ui/FieldEnvironmentRegistry.js';
import {getFieldEnvironmentForCardId as getOldEnvironment} from '/baseline/src/ui/FieldEnvironmentRegistry.js';
const selections=__SELECTIONS__;
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true});
renderer.setSize(600,600);renderer.setPixelRatio(1);renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.2;
const capture=(entry,factory)=>{
 const group=factory(applicationThree,(factory===oldCreate?getOldEnvironment:getFieldEnvironmentForCardId)(entry[0]));
 const scene=new THREE.Scene();scene.add(group);scene.add(new THREE.HemisphereLight(0xf2f5ff,0x616574,2.1));
 const key=new THREE.DirectionalLight(0xfff5e7,2.4);key.position.set(8,28,10);scene.add(key);
 const camera=new THREE.PerspectiveCamera(entry[4],1,0.1,180);camera.position.set(...entry[2]);camera.lookAt(...entry[3]);
 renderer.render(scene,camera);
 const result={url:renderer.domElement.toDataURL('image/png'),primitives:group.userData.meshCount,
 drawCalls:renderer.info.render.calls,materials:group.userData.materialCount,triangles:renderer.info.render.triangles};
 dispose(group);scene.clear();return result;
};
const details=[];
for(const entry of selections){
 const section=document.createElement('section');section.id='card-'+entry[0];
 const title=document.createElement('h2');title.textContent=entry[1]+' — '+entry[0];section.append(title);
 const cols=document.createElement('div');cols.className='cols';section.append(cols);
 const before=capture(entry,oldCreate),after=capture(entry,create);
 for(const [url,label,badge] of [
 ['/environments/field-art/'+entry[0]+'.jpg','Illustration source intacte','JPG original, proportions conservées'],
 [before.url,'Ancien constructeur — ba6c62a',before.primitives+' primitives · '+before.drawCalls+' appels · '+before.materials+' matériaux'],
 [after.url,'Volumes adaptés — nouveau lot',after.primitives+' primitives · '+after.drawCalls+' appels · '+after.materials+' matériaux']]){
  const f=document.createElement('figure'),img=document.createElement('img'),cap=document.createElement('figcaption'),stat=document.createElement('div');
  img.src=url;cap.textContent=label;stat.className='badge';stat.textContent=badge;cap.append(stat);f.append(img,cap);cols.append(f);
 }
 document.querySelector('main').append(section);
 details.push({cardId:entry[0],before:{...before,url:undefined},after:{...after,url:undefined}});
}
await Promise.all([...document.images].map(img=>img.decode()));
window.auditCapture={details,images:document.images.length,complete:document.images.length===135};
renderer.dispose();renderer.forceContextLoss();document.documentElement.dataset.auditReady='true';
</script></html>'''.replace('__SELECTIONS__', json.dumps(SELECTIONS))


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        path = urlsplit(self.path).path
        if path == '/':
            data, mime = HTML.encode(), 'text/html'
        elif path == '/gallery.html':
            data, mime = (OUT / 'gallery.html').read_bytes(), 'text/html'
        elif path == '/favicon.ico':
            self.send_response(204); self.end_headers(); return
        elif re.fullmatch(r'/baseline/src/(?:ui|core)/[A-Za-z0-9]+\.js', path):
            data, mime = (OUT / 'baseline-ba6c62a' / path.removeprefix('/baseline/')).read_bytes(), 'text/javascript'
        elif re.fullmatch(r'/(src/(?:ui|core)/[A-Za-z0-9]+\.js|node_modules/three/build/[a-z.]+\.js|environments/field-art/\d+\.jpg)', path):
            file = ROOT / (f'public{path}' if path.startswith('/environments/') else path[1:])
            if not file.is_file():
                self.send_error(404); return
            data = file.read_bytes(); mime = mimetypes.guess_type(str(file))[0]
        else:
            self.send_error(404); return
        self.send_response(200); self.send_header('Content-Type', mime); self.end_headers(); self.wfile.write(data)

    def log_message(self, *_):
        pass


def main():
    parser = argparse.ArgumentParser(); parser.add_argument('--capture', action='store_true'); args = parser.parse_args()
    OUT.mkdir(parents=True, exist_ok=True)
    baseline_manifest=json.loads((OUT/'baseline-ba6c62a-manifest.json').read_text())
    for path, expected in baseline_manifest['files'].items():
        if hashlib.sha256((OUT/'baseline-ba6c62a'/path).read_bytes()).hexdigest()!=expected:
            raise RuntimeError(f'Archived baseline module differs from pinned bytes: {path}')
    geometry_paths=[ROOT/'src/ui/FieldEnvironmentGeometry.js',ROOT/'src/ui/FieldGeometryThree.js',*sorted((ROOT/'src/ui').glob('FieldEnvironment*References.js'))]
    geometry_hashes={str(path.relative_to(ROOT)):hashlib.sha256(path.read_bytes()).hexdigest() for path in geometry_paths}
    report = {'auditDate': '2026-10-07', 'baselineCommit': 'ba6c62aa6b3db8f15efad52e3ee8d5fcd143b601',
        'auditScriptSha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
        'geometryModulesSha256':geometry_hashes,
        'description': 'Sources intactes et volumes périphériques isolés : dimensions adaptées, sans promesse de fidélité spatiale 1:1.',
        'moduleSha256': hashlib.sha256((ROOT / 'src/ui/FieldEnvironmentRitualReferences.js').read_bytes()).hexdigest(),
        'factorySha256': hashlib.sha256((ROOT / 'src/ui/FieldEnvironmentGeometry.js').read_bytes()).hexdigest(),
        'productionThreeSha256': hashlib.sha256((ROOT / 'src/ui/FieldGeometryThree.js').read_bytes()).hexdigest(),
        'testSha256': hashlib.sha256((ROOT / 'test/field-ritual-references.test.js').read_bytes()).hexdigest(),
        'baselineSha256': hashlib.sha256((OUT / 'baseline-ba6c62a/src/ui/FieldEnvironmentGeometry.js').read_bytes()).hexdigest(),
        'baselineModules': json.loads((OUT / 'baseline-ba6c62a-manifest.json').read_text()),
        'references': [{'cardId': e[0], 'name': e[1], 'camera': e[2], 'target': e[3], 'fov': e[4],
            'sourceUrl': f'https://images.ygoprodeck.com/images/cards_cropped/{e[0]}.jpg',
            'sha256': hashlib.sha256((ROOT / f'public/environments/field-art/{e[0]}.jpg').read_bytes()).hexdigest()} for e in SELECTIONS]}
    if args.capture:
        report['validation'] = {'directTests': []}
        for test_file in ['test/field-ritual-references.test.js']:
            result = subprocess.run(['node', test_file], cwd=ROOT, capture_output=True, text=True)
            if result.returncode:
                raise RuntimeError(f'{test_file}:\n{result.stdout}\n{result.stderr}')
            passed = re.search(r'\bpass (\d+)', result.stdout)
            report['validation']['directTests'].append({'file': test_file, 'pass': int(passed.group(1)) if passed else None, 'exitCode': result.returncode})
        server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
        threading.Thread(target=server.serve_forever, daemon=True).start()
        try:
            with sync_playwright() as p:
                browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True,
                    args=['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
                page = browser.new_page(viewport={'width': 1440, 'height': 1000}, device_scale_factor=1)
                errors = []; page.on('pageerror', lambda error: errors.append(str(error)))
                page.on('response', lambda response: errors.append(f'{response.status}: {urlsplit(response.url).path}') if response.status >= 400 else None)
                page.goto(f'http://127.0.0.1:{server.server_address[1]}/')
                page.wait_for_function("document.documentElement.dataset.auditReady === 'true'", timeout=60000)
                report['capture'] = page.evaluate('window.auditCapture'); report['capture']['errors'] = errors
                if errors or not report['capture']['complete']:
                    raise RuntimeError(f'WebGL capture failed: {errors}')
                # Nine browser-captured JPEG boards keep the audit compact.
                # Exact source JPG bytes and SHA-256 remain separately stored.
                report['capture']['artifacts'] = []
                for prefix, selection in [(f'ritual-{i+1:02}', SELECTIONS[i*5:(i+1)*5]) for i in range(9)]:
                    page.evaluate('(ids)=>document.querySelectorAll("section").forEach(s=>s.hidden=!ids.includes(s.id))', [f'card-{e[0]}' for e in selection])
                    artifact = f'field-{prefix}-2026-10-07.jpg'
                    page.screenshot(path=str(OUT / artifact), full_page=True, type='jpeg', quality=90)
                    report['capture']['artifacts'].append(f'docs/audits/artifacts/field-ritual-2026-10-07/{artifact}')
                page.evaluate('()=>document.querySelectorAll("section").forEach(s=>s.hidden=false)')
                # Embed the exact source bytes beside captured before/after PNGs,
                # producing a self-contained gallery with no live renderer.
                gallery = page.evaluate("""async()=>{
                  for(const img of document.images) if(!img.src.startsWith('data:')){
                    const blob=await (await fetch(img.src)).blob();
                    img.src=await new Promise(resolve=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.readAsDataURL(blob);});
                  }
                  document.querySelectorAll('script').forEach(s=>s.remove());
                  return '<!doctype html>'+document.documentElement.outerHTML;
                }""")
                (OUT / 'gallery.html').write_text(gallery)
                report['capture']['gallery'] = 'docs/audits/artifacts/field-ritual-2026-10-07/gallery.html'
                report['capture']['gallerySha256'] = hashlib.sha256((OUT / 'gallery.html').read_bytes()).hexdigest()
                class GalleryImages(HTMLParser):
                    def __init__(self):
                        super().__init__(); self.images = []; self.scripts = 0
                    def handle_starttag(self, tag, attrs):
                        if tag == 'img': self.images.append(dict(attrs)['src'])
                        elif tag == 'script': self.scripts += 1
                parsed = GalleryImages(); parsed.feed(gallery)
                if len(parsed.images) != 135 or parsed.scripts:
                    raise RuntimeError('Self-contained gallery must contain 135 images and no active scripts')
                for i, entry in enumerate(SELECTIONS):
                    embedded = base64.b64decode(parsed.images[i * 3].split(',', 1)[1])
                    if embedded != (ROOT / f'public/environments/field-art/{entry[0]}.jpg').read_bytes():
                        raise RuntimeError(f'{entry[0]}: gallery source differs from the exact JPG')
                page.goto(f'http://127.0.0.1:{server.server_address[1]}/gallery.html')
                page.wait_for_function('document.images.length===135 && [...document.images].every(i=>i.complete && i.naturalWidth>0)', timeout=30000)
                report['capture']['galleryValidation'] = {'images': len(parsed.images), 'activeScripts': parsed.scripts,
                    'exactSourceJpgs': len(SELECTIONS), 'browserLoadedImages': page.evaluate('document.images.length'),
                    'captureDimensions': page.evaluate('[...document.images].filter((_,i)=>i%3!==0).map(i=>[i.naturalWidth,i.naturalHeight])'),
                    'errors': errors}
                browser.close()
        finally:
            server.shutdown(); server.server_close()
        for path, expected in geometry_hashes.items():
            if hashlib.sha256((ROOT/path).read_bytes()).hexdigest()!=expected:
                raise RuntimeError(f'Production geometry changed during capture: {path}; recapture the final integrated source')
        report['capture']['artifactSha256'] = {name: hashlib.sha256((ROOT / name).read_bytes()).hexdigest() for name in report['capture']['artifacts']}
        report['validation']['actualMaxima'] = {metric: max(e['after'][metric] for e in report['capture']['details']) for metric in ['primitives', 'drawCalls', 'materials']}
        assert report['validation']['actualMaxima']['primitives'] <= 220
        assert report['validation']['actualMaxima']['drawCalls'] <= 18
        assert report['validation']['actualMaxima']['materials'] <= 10
        report['validation']['budgets'] = {'maxPrimitives': 220, 'maxDrawCalls': 18, 'maxMaterials': 10}
        if hashlib.sha256((ROOT / 'src/ui/FieldEnvironmentRitualReferences.js').read_bytes()).hexdigest() != report['moduleSha256']:
            raise RuntimeError('Ritual module changed during capture; regenerate the proof for the final source')
    (OUT / 'report.json').write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps({'references': len(SELECTIONS), 'captured': report.get('capture', {}).get('images', 0),
        'errors': report.get('capture', {}).get('errors', [])}))


if __name__ == '__main__':
    main()
