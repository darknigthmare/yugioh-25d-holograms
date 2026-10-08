#!/usr/bin/env python3
"""Capture original / archived previous geometry / adapted reference volumes.

Requires externally installed Python Playwright and Chromium. No runtime
dependencies are changed. Uses a single sequentially reused WebGL renderer.
"""
import argparse
import hashlib
import json
import mimetypes
import re
import subprocess
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'docs/audits/artifacts'
SELECTIONS = [['75041269', 'Clock Tower Prison', [23, 19, 1], [0, 14, -33], 52], ['72283691', 'Golden Castle of Stromberg', [20, 18, 0], [0, 13, -33], 55], ['39910367', 'Magical Citadel of Endymion', [18, 20, 2], [0, 14, -34], 60], ['80921533', 'Mausoleum of the Emperor', [19, 16, 0], [0, 10, -32], 52], ['24382602', 'Mausoleum of White', [17, 17, 0], [2, 12, -33], 55], ['34487429', 'Ancient City – Rainbow Ruins', [18, 18, -4], [0, 10, -36], 65], ['56111151', 'Kyoutou Waterfront', [21, 20, 0], [0, 13, -34], 55], ['19814508', 'U.A. Stadium', [20, 26, -1], [0, 7, -35], 55], ['12931061', 'U.A. Hyper Stadium', [20, 26, -1], [0, 9, -35], 55], ['77297908', 'Abyss Playhouse – Fantastic Theater', [21, 16, 0], [0, 9, -32], 55], ['33773528', 'Amazement Precious Park', [20, 26, 1], [0, 10, -34], 60], ['99543666', 'Despia, Theater of the Branded', [21, 22, 3], [0, 15, -35], 55], ['65589010', 'Dogmatika Nation', [22, 20, 2], [0, 15, -35], 55], ['95658967', 'Ritual Sanctuary', [18, 13, -1], [0, 8, -33], 55]]

HTML = '''<!doctype html><html lang="fr"><meta charset="utf-8">
<title>Terrains urbains et architecturaux : sources et volumes</title><style>
body{margin:0;padding:20px;background:#101725;color:#edf2fb;font:16px system-ui}
h1{font-size:24px;margin:0 0 8px}p{color:#b5c5d9;margin:0 0 20px}h2{font-size:19px;margin:0 0 10px}
section{margin-bottom:26px}.cols{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
figure{margin:0;padding:8px;background:#1a2536;border:1px solid #31455e;border-radius:8px}
img{width:100%;aspect-ratio:1;object-fit:contain;display:block;background:radial-gradient(ellipse at top,#344858,#0c1624)}
figcaption{font-size:14px;padding-top:7px;color:#c5d6e6}.badge{font-size:12px;color:#b0d5c3}</style>
<h1>14 Terrains : illustration exacte / volumes précédents / nouveaux volumes</h1>
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
 [before.url,'Ancien constructeur — de9cda6',before.primitives+' primitives · '+before.drawCalls+' appels · '+before.materials+' matériaux'],
 [after.url,'Volumes adaptés — nouveau lot',after.primitives+' primitives · '+after.drawCalls+' appels · '+after.materials+' matériaux']]){
  const f=document.createElement('figure'),img=document.createElement('img'),cap=document.createElement('figcaption'),stat=document.createElement('div');
  img.src=url;cap.textContent=label;stat.className='badge';stat.textContent=badge;cap.append(stat);f.append(img,cap);cols.append(f);
 }
 document.querySelector('main').append(section);
 details.push({cardId:entry[0],before:{...before,url:undefined},after:{...after,url:undefined}});
}
await Promise.all([...document.images].map(img=>img.decode()));
window.auditCapture={details,images:document.images.length,complete:document.images.length===42};
renderer.dispose();renderer.forceContextLoss();document.documentElement.dataset.auditReady='true';
</script></html>'''.replace('__SELECTIONS__', json.dumps(SELECTIONS))


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        path = urlsplit(self.path).path
        if path == '/':
            data, mime = HTML.encode(), 'text/html'
        elif path == '/favicon.ico':
            self.send_response(204); self.end_headers(); return
        elif path == '/baseline.js':
            data, mime = (OUT / 'field-urban-baseline-de9cda6.js').read_bytes(), 'text/javascript'
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
    report = {'auditDate': '2026-10-07', 'baselineCommit': 'de9cda6',
        'description': 'Sources intactes et volumes périphériques isolés : dimensions adaptées, sans promesse de fidélité spatiale 1:1.',
        'moduleSha256': hashlib.sha256((ROOT / 'src/ui/FieldEnvironmentUrbanReferences.js').read_bytes()).hexdigest(),
        'baselineSha256': hashlib.sha256((OUT / 'field-urban-baseline-de9cda6.js').read_bytes()).hexdigest(),
        'references': [{'cardId': e[0], 'name': e[1], 'camera': e[2], 'target': e[3], 'fov': e[4],
            'sourceUrl': f'https://images.ygoprodeck.com/images/cards_cropped/{e[0]}.jpg',
            'sha256': hashlib.sha256((ROOT / f'public/environments/field-art/{e[0]}.jpg').read_bytes()).hexdigest()} for e in SELECTIONS]}
    if args.capture:
        report['validation'] = {'directTests': []}
        for test_file in ['test/field-urban-references.test.js', 'test/field-environment-geometry.test.js']:
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
                # Three browser-captured JPEG boards keep the audit compact.
                # Exact source JPG bytes and SHA-256 remain separately stored.
                report['capture']['artifacts'] = []
                for prefix, selection in [('urban-castles', SELECTIONS[:5]), ('urban-stadiums', SELECTIONS[5:10]), ('urban-theaters', SELECTIONS[10:])]:
                    page.evaluate('(ids)=>document.querySelectorAll("section").forEach(s=>s.hidden=!ids.includes(s.id))', [f'card-{e[0]}' for e in selection])
                    artifact = f'field-{prefix}-2026-10-07.jpg'
                    page.screenshot(path=str(OUT / artifact), full_page=True, type='jpeg', quality=90)
                    report['capture']['artifacts'].append(f'docs/audits/artifacts/{artifact}')
                browser.close()
        finally:
            server.shutdown(); server.server_close()
        report['capture']['artifactSha256'] = {name: hashlib.sha256((ROOT / name).read_bytes()).hexdigest() for name in report['capture']['artifacts']}
        report['validation']['actualMaxima'] = {metric: max(e['after'][metric] for e in report['capture']['details']) for metric in ['primitives', 'drawCalls', 'materials']}
        report['validation']['budgets'] = {'maxPrimitives': 220, 'maxDrawCalls': 18, 'maxMaterials': 10}
    (OUT / 'field-urban-2026-10-07.json').write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps({'references': len(SELECTIONS), 'captured': report.get('capture', {}).get('images', 0),
        'errors': report.get('capture', {}).get('errors', [])}))


if __name__ == '__main__':
    main()
