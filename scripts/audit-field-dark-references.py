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
OUT = ROOT / 'docs/audits/artifacts/field-dark-2026-10-07'
SELECTIONS = [['63883999', 'Archfiend Palabyrinth', [23, 25, 8], [0, 17, -34], 58], ['81788994', 'Curse of the Shadow Prison', [23, 20, 7], [0, 11, -34], 58], ['16625614', 'Dark Sanctuary', [22, 19, 8], [0, 15, -34], 60], ['84171830', 'Domain of the True Monarchs', [22, 23, 5], [0, 16, -37], 62], ['1050355', 'Dream Mirror of Terror', [24, 20, 6], [0, 14, -34], 55], ['70122149', 'Evil Eye Domain – Pareidolia', [23, 23, 8], [0, 17, -34], 58], ['13301895', 'Fallen Paradise', [22, 25, 12], [0, 16, -34], 58], ['99795159', 'Ghostrick Mansion', [22, 18, 0], [0, 8, -34], 52], ['33407125', 'Labrynth Labyrinth', [25, 25, 6], [0, 14, -34], 55], ['59160188', 'Lair of Darkness', [23, 19, 3], [0, 9, -34], 60], ['36890111', 'Mansion of the Dreadful Dolls', [23, 22, 5], [0, 15, -34], 60], ['43338320', 'Mementomictlan', [23, 19, -2], [0, 7, -34], 55], ['47355498', 'Necrovalley', [0, 15, 17], [0, 15, -35], 55], ['93729896', 'Nightmare Throne', [22, 19, 2], [0, 15, -34], 55], ['94585852', 'Pandemonium', [22, 22, 8], [0, 15, -34], 55], ['40005099', 'Shiranui Style Synthesis', [22, 24, 8], [0, 14, -34], 55], ['72043279', "Supreme King's Castle", [22, 20, 6], [0, 16, -34], 58], ['33017655', 'The Gates of Dark World', [23, 22, 6], [0, 14, -34], 55], ['62188962', 'Vampire Kingdom', [23, 22, 10], [0, 15, -34], 60], ['76871889', 'Vendread Nights', [24, 20, 8], [0, 14, -34], 55]]

HTML = '''<!doctype html><html lang="fr"><meta charset="utf-8">
<title>Terrains du lot sombre : sources et volumes</title><style>
body{margin:0;padding:20px;background:#101725;color:#edf2fb;font:16px system-ui}
h1{font-size:24px;margin:0 0 8px}p{color:#b5c5d9;margin:0 0 20px}h2{font-size:19px;margin:0 0 10px}
section{margin-bottom:26px}.cols{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
figure{margin:0;padding:8px;background:#1a2536;border:1px solid #31455e;border-radius:8px}
img{width:100%;aspect-ratio:1;object-fit:contain;display:block;background:radial-gradient(ellipse at top,#344858,#0c1624)}
figcaption{font-size:14px;padding-top:7px;color:#c5d6e6}.badge{font-size:12px;color:#b0d5c3}</style>
<h1>20 Terrains : illustration exacte / volumes précédents / nouveaux volumes</h1>
<p>Illustrations intactes · même lumière et même caméra avant/après · géométrie isolée.<br>
Les dimensions sont adaptées à la périphérie du duel. Les personnages et détails peints restent dans la source ; la 3D n'est pas une reproduction spatiale intégrale 1:1.</p><main></main>
<script type="importmap">{"imports":{"three":"/node_modules/three/build/three.module.js"}}</script>
<script type="module">
import * as THREE from 'three';
import {FIELD_GEOMETRY_THREE as applicationThree} from '/src/ui/FieldGeometryThree.js';
import {createFieldEnvironmentGeometry as create,disposeFieldEnvironmentGeometry as dispose} from '/src/ui/FieldEnvironmentGeometry.js';
import {createFieldEnvironmentGeometry as oldCreate} from '/baseline.js';
import {getFieldEnvironmentForCardId} from '/src/ui/FieldEnvironmentRegistry.js';
const selections=__SELECTIONS__;
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true});
renderer.setSize(600,600);renderer.setPixelRatio(1);renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.2;
const capture=(entry,factory)=>{
 const group=factory(applicationThree,getFieldEnvironmentForCardId(entry[0]));
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
 [before.url,'Ancien constructeur — 2bc79f1',before.primitives+' primitives · '+before.drawCalls+' appels · '+before.materials+' matériaux'],
 [after.url,'Volumes adaptés — nouveau lot',after.primitives+' primitives · '+after.drawCalls+' appels · '+after.materials+' matériaux']]){
  const f=document.createElement('figure'),img=document.createElement('img'),cap=document.createElement('figcaption'),stat=document.createElement('div');
  img.src=url;cap.textContent=label;stat.className='badge';stat.textContent=badge;cap.append(stat);f.append(img,cap);cols.append(f);
 }
 document.querySelector('main').append(section);
 details.push({cardId:entry[0],before:{...before,url:undefined},after:{...after,url:undefined}});
}
await Promise.all([...document.images].map(img=>img.decode()));
window.auditCapture={details,images:document.images.length,complete:document.images.length===60};
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
        elif path == '/baseline.js':
            data, mime = (OUT / 'baseline-2bc79f1.js').read_text().replace("from './", "from '/src/ui/").encode(), 'text/javascript'
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
    report = {'auditDate': '2026-10-07', 'baselineCommit': '2bc79f1',
        'description': 'Sources intactes et volumes périphériques isolés : dimensions adaptées, sans promesse de fidélité spatiale 1:1.',
        'moduleSha256': hashlib.sha256((ROOT / 'src/ui/FieldEnvironmentDarkReferences.js').read_bytes()).hexdigest(),
        'factorySha256': hashlib.sha256((ROOT / 'src/ui/FieldEnvironmentGeometry.js').read_bytes()).hexdigest(),
        'productionThreeSha256': hashlib.sha256((ROOT / 'src/ui/FieldGeometryThree.js').read_bytes()).hexdigest(),
        'testSha256': hashlib.sha256((ROOT / 'test/field-dark-references.test.js').read_bytes()).hexdigest(),
        'baselineSha256': hashlib.sha256((OUT / 'baseline-2bc79f1.js').read_bytes()).hexdigest(),
        'references': [{'cardId': e[0], 'name': e[1], 'camera': e[2], 'target': e[3], 'fov': e[4],
            'sourceUrl': f'https://images.ygoprodeck.com/images/cards_cropped/{e[0]}.jpg',
            'sha256': hashlib.sha256((ROOT / f'public/environments/field-art/{e[0]}.jpg').read_bytes()).hexdigest()} for e in SELECTIONS]}
    if args.capture:
        report['validation'] = {'directTests': []}
        for test_file in ['test/field-dark-references.test.js']:
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
                # Four browser-captured JPEG boards keep the audit compact.
                # Exact source JPG bytes and SHA-256 remain separately stored.
                report['capture']['artifacts'] = []
                for prefix, selection in [('dark-fortresses', SELECTIONS[:5]), ('dark-rooms', SELECTIONS[5:10]), ('dark-rituals', SELECTIONS[10:15]), ('dark-nightscapes', SELECTIONS[15:])]:
                    page.evaluate('(ids)=>document.querySelectorAll("section").forEach(s=>s.hidden=!ids.includes(s.id))', [f'card-{e[0]}' for e in selection])
                    artifact = f'field-{prefix}-2026-10-07.jpg'
                    page.screenshot(path=str(OUT / artifact), full_page=True, type='jpeg', quality=90)
                    report['capture']['artifacts'].append(f'docs/audits/artifacts/field-dark-2026-10-07/{artifact}')
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
                report['capture']['gallery'] = 'docs/audits/artifacts/field-dark-2026-10-07/gallery.html'
                report['capture']['gallerySha256'] = hashlib.sha256((OUT / 'gallery.html').read_bytes()).hexdigest()
                class GalleryImages(HTMLParser):
                    def __init__(self):
                        super().__init__(); self.images = []; self.scripts = 0
                    def handle_starttag(self, tag, attrs):
                        if tag == 'img': self.images.append(dict(attrs)['src'])
                        elif tag == 'script': self.scripts += 1
                parsed = GalleryImages(); parsed.feed(gallery)
                if len(parsed.images) != 60 or parsed.scripts:
                    raise RuntimeError('Self-contained gallery must contain 60 images and no active scripts')
                for i, entry in enumerate(SELECTIONS):
                    embedded = base64.b64decode(parsed.images[i * 3].split(',', 1)[1])
                    if embedded != (ROOT / f'public/environments/field-art/{entry[0]}.jpg').read_bytes():
                        raise RuntimeError(f'{entry[0]}: gallery source differs from the exact JPG')
                page.goto(f'http://127.0.0.1:{server.server_address[1]}/gallery.html')
                page.wait_for_function('document.images.length===60 && [...document.images].every(i=>i.complete && i.naturalWidth>0)', timeout=30000)
                report['capture']['galleryValidation'] = {'images': len(parsed.images), 'activeScripts': parsed.scripts,
                    'exactSourceJpgs': len(SELECTIONS), 'browserLoadedImages': page.evaluate('document.images.length'),
                    'captureDimensions': page.evaluate('[...document.images].filter((_,i)=>i%3!==0).map(i=>[i.naturalWidth,i.naturalHeight])'),
                    'errors': errors}
                browser.close()
        finally:
            server.shutdown(); server.server_close()
        report['capture']['artifactSha256'] = {name: hashlib.sha256((ROOT / name).read_bytes()).hexdigest() for name in report['capture']['artifacts']}
        report['validation']['actualMaxima'] = {metric: max(e['after'][metric] for e in report['capture']['details']) for metric in ['primitives', 'drawCalls', 'materials']}
        report['validation']['budgets'] = {'maxPrimitives': 220, 'maxDrawCalls': 18, 'maxMaterials': 10}
        if hashlib.sha256((ROOT / 'src/ui/FieldEnvironmentDarkReferences.js').read_bytes()).hexdigest() != report['moduleSha256']:
            raise RuntimeError('Dark module changed during capture; regenerate the proof for the final source')
    (OUT / 'report.json').write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps({'references': len(SELECTIONS), 'captured': report.get('capture', {}).get('images', 0),
        'errors': report.get('capture', {}).get('errors', [])}))


if __name__ == '__main__':
    main()
