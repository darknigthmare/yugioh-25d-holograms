#!/usr/bin/env python3
"""Render preserved source / baseline 251fec / adapted sculptures at three angles.

Uses one actual Chromium WebGL renderer and the production bounded namespace.
No build, card engine, private state or QA hook is involved.
"""
import base64
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
OUT = ROOT / 'docs/audits/artifacts/field-detail-wave-2026-10-08'
BASELINE = '251fec0197ed85e40bca2af03e4431db1fef11e5'
CARDS = [
    {'cardId': '67616300', 'name': 'Chicken Game', 'target': [0, 11, -20], 'fov': 64, 'position': [0, 24, 22], 'background': '#354446'},
    {'cardId': '81380218', 'name': 'Chorus of Sanctuary', 'target': [0, 13, -33], 'fov': 52, 'position': [0, 19, 5], 'background': '#6694ba'},
    {'cardId': '63883999', 'name': 'Archfiend Palabyrinth', 'target': [0, 17, -35], 'fov': 54, 'position': [0, 20, 12], 'background': '#353c54'}
]
ANGULAR = [('front', 0), ('left', -24), ('right', 24)]

HTML = '''<!doctype html><html lang="fr"><meta charset="utf-8"><title>Détails des terrains : source / avant / après</title>
<style>body{margin:0;padding:18px;background:#122031;color:#e8f1f8;font:16px system-ui}h1{font-size:24px}h2{margin:12px 0}p{max-width:1500px;color:#c1d0da}section{margin:20px 0}.cols{display:grid;grid-template-columns:repeat(3,600px);gap:10px}figure{margin:0;background:#243246;border:1px solid #577083;border-radius:7px;padding:7px}img{width:100%;aspect-ratio:1;object-fit:contain;display:block}figcaption{padding:7px 0;font-size:15px}</style>
<h1>Détails de trois Terrains — 8 octobre 2026</h1><p>Illustrations exactes inchangées ; volumes avant le lot (251fec) / sculptures adaptées après le lot.<br>Mêmes caméra, éclairage et exposition pour chaque paire. Ces captures isolent la géométrie et ne certifient ni 1:1 spatial intégral, ni parcours de duel.</p><main></main>
<script type="importmap">{"imports":{"three":"/node_modules/three/build/three.module.js"}}</script>
<script type="module">
import * as THREE from 'three';
import {FIELD_GEOMETRY_THREE} from '/src/ui/FieldGeometryThree.js';
import {createFieldEnvironmentGeometry as create,disposeFieldEnvironmentGeometry as dispose,FIELD_ENVIRONMENT_GEOMETRY_BUDGET as budget} from '/src/ui/FieldEnvironmentGeometry.js';
import {createFieldEnvironmentGeometry as beforeCreate} from '/baseline/FieldEnvironmentGeometry.js';
import {getFieldEnvironmentForCardId} from '/src/ui/FieldEnvironmentRegistry.js';
const cards=__CARDS__,angles=__ANGLES__,results=[];
const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
renderer.setPixelRatio(1);renderer.setSize(600,600);renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.95;
const capture=(card,angle,factory)=>{
 const group=factory(FIELD_GEOMETRY_THREE,getFieldEnvironmentForCardId(card.cardId));
 const scene=new THREE.Scene();scene.background=new THREE.Color(card.background);scene.add(group);
 scene.add(new THREE.HemisphereLight(0xf2f5ff,0x62637a,1.5));
 const key=new THREE.DirectionalLight(0xfff0d8,2);key.position.set(8,28,16);scene.add(key);
 const camera=new THREE.PerspectiveCamera(card.fov,1,.1,200);
 camera.position.set(card.position[0]+angle[1],card.position[1],card.position[2]);camera.lookAt(...card.target);
 renderer.render(scene,camera);
 const result={png:renderer.domElement.toDataURL('image/png'),preMergePrimitives:group.userData.referencePrimitiveCount??group.userData.meshCount,
   gpuInstanceCount:group.userData.meshCount,drawCalls:renderer.info.render.calls,materials:group.userData.materialCount,
   triangles:renderer.info.render.triangles,bounds:group.userData.bounds,detail:group.userData.referenceDetail??null,
   camera:{position:camera.position.toArray(),target:card.target,fov:card.fov,matrixWorld:camera.matrixWorld.toArray(),projection:camera.projectionMatrix.toArray()}};
 if(result.preMergePrimitives>budget.maxPrimitiveCount||result.drawCalls>budget.maxDrawCallCount||result.materials>budget.maxMaterialCount)throw Error('GPU budget exceeded '+card.cardId);
 dispose(group);scene.clear();return result;
};
for(const card of cards){
 const section=document.createElement('section');section.id='card-'+card.cardId;
 const h=document.createElement('h2');h.textContent=card.name+' — '+card.cardId;section.append(h);
 for(const angle of angles){
  const old=capture(card,angle,beforeCreate),after=capture(card,angle,create),cols=document.createElement('div');cols.className='cols';
  for(const [url,label]of [['/environments/field-art/'+card.cardId+'.jpg','Illustration source inchangée'],[old.png,'Avant 251fec · '+angle[0]+' · '+old.preMergePrimitives+' primitives / '+old.drawCalls+' appels'],[after.png,'Détails adaptés · '+angle[0]+' · '+after.preMergePrimitives+' primitives / '+after.drawCalls+' appels']]){
   const figure=document.createElement('figure'),img=document.createElement('img'),cap=document.createElement('figcaption');img.src=url;cap.textContent=label;figure.append(img,cap);cols.append(figure);
  }section.append(cols);results.push({cardId:card.cardId,angle:angle[0],before:old,after});
 }document.querySelector('main').append(section);
}
await Promise.all([...document.images].map(image=>image.decode()));
window.detailAudit={results,complete:results.length===9,imageCount:document.images.length};
renderer.dispose();renderer.forceContextLoss();document.documentElement.dataset.auditReady='true';
</script></html>'''.replace('__CARDS__', json.dumps(CARDS)).replace('__ANGLES__', json.dumps(ANGULAR))


def digest(data):
    return hashlib.sha256(data).hexdigest()


def original(path):
    return subprocess.check_output(['git', 'show', f'{BASELINE}:{path}'], cwd=ROOT)


def fingerprint(path):
    data = path.read_bytes()
    return {'bytes': len(data), 'sha256': digest(data)}


baseline_files = {}
factory_path = 'src/ui/FieldEnvironmentGeometry.js'
baseline_files['FieldEnvironmentGeometry.js'] = original(factory_path)
for name in re.findall(rb"from './(FieldEnvironment[A-Za-z]+References\.js)'", baseline_files['FieldEnvironmentGeometry.js']):
    filename = name.decode()
    baseline_files[filename] = original('src/ui/' + filename)


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        path = urlsplit(self.path).path
        if path == '/':
            data, mime = HTML.encode(), 'text/html'
        elif path.startswith('/baseline/') and path.split('/')[-1] in baseline_files:
            data, mime = baseline_files[path.split('/')[-1]], 'text/javascript'
        elif path == '/favicon.ico':
            self.send_response(204); self.end_headers(); return
        elif re.fullmatch(r'/(src/(?:ui|core)/[A-Za-z0-9]+\.js|node_modules/three/build/[a-z.]+\.js|environments/field-art/\d+\.jpg)', path):
            file = ROOT / ('public' + path if path.startswith('/environments/') else path[1:])
            if not file.is_file():
                self.send_error(404); return
            data, mime = file.read_bytes(), mimetypes.guess_type(str(file))[0]
        else:
            self.send_error(404); return
        self.send_response(200); self.send_header('Content-Type', mime); self.end_headers(); self.wfile.write(data)

    def log_message(self, *_):
        pass


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    baseline_dir = OUT / 'baseline-251fec'
    baseline_dir.mkdir(exist_ok=True)
    for name, data in baseline_files.items():
        (baseline_dir / name).write_bytes(data)
    dependency_paths = [ROOT / factory_path, ROOT / 'src/ui/FieldGeometryThree.js', ROOT / 'src/ui/FieldEnvironmentRegistry.js', ROOT / 'src/ui/FieldReferenceDetailGeometry.js']
    dependency_paths += [ROOT / 'src/ui' / name for name in baseline_files if name != 'FieldEnvironmentGeometry.js']
    before_hashes = {str(path.relative_to(ROOT)): fingerprint(path) for path in dependency_paths}
    sources = []
    for card in CARDS:
        path = ROOT / f'public/environments/field-art/{card["cardId"]}.jpg'
        data = path.read_bytes()
        assert data == original(str(path.relative_to(ROOT))), 'source JPG changed'
        sources.append({**card, 'assetPath': str(path.relative_to(ROOT)), 'sourceUrl': f'https://images.ygoprodeck.com/images/cards_cropped/{card["cardId"]}.jpg', **fingerprint(path), 'baselineBytesIdentical': True})
    report = {'auditDate': '2026-10-08', 'baselineCommit': BASELINE, 'method': 'intact source JPG / real Chromium WebGL baseline / adapted sculpture, three identical-camera angle pairs per card',
              'sourceImageEdits': False, 'gameOrQaHookInstantiated': False, 'baselineFiles': {name: {'bytes': len(data), 'sha256': digest(data)} for name, data in baseline_files.items()},
              'dependencies': before_hashes, 'runner': fingerprint(Path(__file__)), 'sources': sources, 'ok': False}
    server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
            page = browser.new_page(viewport={'width': 1870, 'height': 900}, device_scale_factor=1)
            errors = []
            page.on('pageerror', lambda error: errors.append(str(error)))
            page.on('response', lambda response: errors.append(f'{response.status}: {urlsplit(response.url).path}') if response.status >= 400 else None)
            page.goto(f'http://127.0.0.1:{server.server_port}/')
            page.wait_for_function("document.documentElement.dataset.auditReady === 'true'", timeout=120000)
            capture = page.evaluate('window.detailAudit')
            assert capture['complete'] and capture['imageCount'] == 27 and not errors, errors
            report['measurements'] = capture['results']
            for entry in report['measurements']:
                assert entry['before']['camera'] == entry['after']['camera']
                for version in ['before', 'after']:
                    png = base64.b64decode(entry[version].pop('png').split(',', 1)[1])
                    name = f'{entry["cardId"]}-{entry["angle"]}-{version}.png'
                    (OUT / name).write_bytes(png)
                    entry[version]['capture'] = {'path': str((OUT / name).relative_to(ROOT)), 'sha256': digest(png), 'bytes': len(png)}
            report['comparisonBoards'] = []
            for card in CARDS:
                page.evaluate('(id)=>document.querySelectorAll("section").forEach(section=>section.hidden=section.id!=="card-"+id)', card['cardId'])
                name = f'{card["cardId"]}-source-before-after-three-angles.jpg'
                page.screenshot(path=str(OUT / name), full_page=True, type='jpeg', quality=94)
                report['comparisonBoards'].append({'cardId': card['cardId'], 'path': str((OUT / name).relative_to(ROOT)), **fingerprint(OUT / name)})
            page.evaluate('()=>document.querySelectorAll("section").forEach(section=>section.hidden=false)')
            gallery = page.evaluate('''async()=>{
              for(const img of document.images)if(!img.src.startsWith('data:')){
                const blob=await(await fetch(img.src)).blob();img.src=await new Promise(resolve=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.readAsDataURL(blob);});
              }document.querySelectorAll('script').forEach(script=>script.remove());return '<!doctype html>'+document.documentElement.outerHTML;
            }''')
            (OUT / 'gallery.html').write_text(gallery)
            report['gallery'] = {'path': str((OUT / 'gallery.html').relative_to(ROOT)), **fingerprint(OUT / 'gallery.html')}
            report['errors'] = errors
            browser.close()
        report['dependenciesUnchangedDuringCapture'] = before_hashes == {str(path.relative_to(ROOT)): fingerprint(path) for path in dependency_paths}
        assert report['dependenciesUnchangedDuringCapture']
        report['ok'] = True
    finally:
        (OUT / 'report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
        server.shutdown(); server.server_close()
    print(json.dumps({'ok': report['ok'], 'cardCount': len(CARDS), 'anglePairs': len(report['measurements']), 'captures': 18, 'comparisonBoards': 3, 'baseline': BASELINE}))


if __name__ == '__main__':
    main()
