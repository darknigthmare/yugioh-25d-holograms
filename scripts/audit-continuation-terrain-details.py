#!/usr/bin/env python3
"""Render preserved source / baseline 5971495 / adapted sculptures at three angles for six further Terrains.

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
from PIL import Image, ImageChops

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'docs/audits/artifacts/continuation-terrain-details-2026-10-08'
BASELINE = '5971495fb9425b96416b5e07bfeb6d28ec9bd43c'
CARDS = [
    {'cardId': '7617062', 'name': 'Ghostrick Museum', 'target': [0, 15, -31], 'fov': 60, 'position': [0, 22, 16], 'background': '#344957'},
    {'cardId': '15388353', 'name': 'Nouvelles Restaurant \"At Table\"', 'target': [0, 13, -30], 'fov': 54, 'position': [0, 18, 13], 'background': '#51445e'},
    {'cardId': '49370016', 'name': 'P.U.N.K. JAM Extreme Session', 'target': [0, 15, -33], 'fov': 60, 'position': [0, 19, 11], 'background': '#352e58'},
    {'cardId': '63492244', 'name': 'Trickstar Light Arena', 'target': [0, 14, -29], 'fov': 61, 'position': [0, 20, 14], 'background': '#445546'},
    {'cardId': '51208046', 'name': 'Trickstar Live Stage', 'target': [0, 14, -31], 'fov': 60, 'position': [0, 19, 11], 'background': '#543356'},
    {'cardId': '35371948', 'name': 'Trickstar Light Stage', 'target': [0, 12, -29], 'fov': 60, 'position': [0, 18, 12], 'background': '#3f6153'}
]

ANGULAR = [('front', 0), ('left', -24), ('right', 24)]

HTML = '''<!doctype html><html lang="fr"><meta charset="utf-8"><title>Détails des terrains : source / avant / après</title>
<style>body{margin:0;padding:18px;background:#122031;color:#e8f1f8;font:16px system-ui}h1{font-size:24px}h2{margin:12px 0}p{max-width:1500px;color:#c1d0da}section{margin:20px 0}.cols{display:grid;grid-template-columns:repeat(3,600px);gap:10px}figure{margin:0;background:#243246;border:1px solid #577083;border-radius:7px;padding:7px}img{width:100%;aspect-ratio:1;object-fit:contain;display:block}figcaption{padding:7px 0;font-size:15px}</style>
<h1>Détails de six Terrains — 8 octobre 2026</h1><p>Illustrations exactes inchangées ; volumes avant le lot (5971495) / sculptures adaptées après le lot.<br>Mêmes caméra, éclairage et exposition pour chaque paire. Ces captures isolent la géométrie et ne certifient ni 1:1 spatial intégral, ni parcours de duel.</p><main></main>
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
 const tracked=new Map(),bounded={...FIELD_GEOMETRY_THREE};
 for(const name of ['MeshStandardMaterial','BufferGeometry','BoxGeometry','DodecahedronGeometry','ConeGeometry','CylinderGeometry','IcosahedronGeometry','TorusGeometry','SphereGeometry','InstancedMesh']){
  const Base=bounded[name];bounded[name]=class extends Base{constructor(...args){super(...args);tracked.set(this,{kind:name,count:0});this.addEventListener('dispose',()=>tracked.get(this).count++);}};
 }
 const group=factory(bounded,getFieldEnvironmentForCardId(card.cardId));
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
 dispose(group);dispose(group);
 result.disposal={allocated:tracked.size,allExactlyOnce:[...tracked.values()].every(v=>v.count===1),byKind:Object.fromEntries([...new Set([...tracked.values()].map(v=>v.kind))].map(kind=>[kind,[...tracked.values()].filter(v=>v.kind===kind).length])),childrenRemaining:group.children.length,rendererGeometriesRemaining:renderer.info.memory.geometries};
 if(!result.disposal.allExactlyOnce||result.disposal.childrenRemaining||result.disposal.rendererGeometriesRemaining)throw Error('resource disposal failed '+card.cardId);
 scene.clear();return result;
};
for(const card of cards){
 const section=document.createElement('section');section.id='card-'+card.cardId;
 const h=document.createElement('h2');h.textContent=card.name+' — '+card.cardId;section.append(h);
 for(const angle of angles){
  const old=capture(card,angle,beforeCreate),after=capture(card,angle,create),cols=document.createElement('div');cols.className='cols';
  for(const [url,label]of [['/environments/field-art/'+card.cardId+'.jpg','Illustration source inchangée'],[old.png,'Avant 5971495 · '+angle[0]+' · '+old.preMergePrimitives+' primitives / '+old.drawCalls+' appels'],[after.png,'Détails adaptés · '+angle[0]+' · '+after.preMergePrimitives+' primitives / '+after.drawCalls+' appels']]){
   const figure=document.createElement('figure'),img=document.createElement('img'),cap=document.createElement('figcaption');img.src=url;cap.textContent=label;figure.append(img,cap);cols.append(figure);
  }section.append(cols);results.push({cardId:card.cardId,angle:angle[0],before:old,after});
 }document.querySelector('main').append(section);
}
await Promise.all([...document.images].map(image=>image.decode()));
window.detailAudit={results,complete:results.length===18,imageCount:document.images.length};
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
pending = ['FieldEnvironmentGeometry.js']
while pending:
    filename = pending.pop()
    if filename in baseline_files:
        continue
    data = original('src/ui/' + filename)
    baseline_files[filename] = data
    pending += [name.decode() for name in re.findall(rb"from './([A-Za-z0-9]+\.js)'", data) if name.decode() not in baseline_files]


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
    baseline_dir = OUT / 'baseline-5971495'
    baseline_dir.mkdir(exist_ok=True)
    for name, data in baseline_files.items():
        (baseline_dir / name).write_bytes(data)
    dependency_paths = [ROOT / factory_path, ROOT / 'src/ui/FieldGeometryThree.js', ROOT / 'src/ui/FieldEnvironmentRegistry.js', ROOT / 'src/ui/FieldReferenceDetailGeometry.js', ROOT / 'src/ui/FieldContinuationStageDetails.js']
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
            assert capture['complete'] and capture['imageCount'] == 54 and not errors, errors
            report['measurements'] = capture['results']
            for entry in report['measurements']:
                assert entry['before']['camera'] == entry['after']['camera']
                assert entry['after']['detail'] is not None
                assert entry['before']['detail'] is None
                assert entry['after']['preMergePrimitives'] > entry['before']['preMergePrimitives']
                for version in ['before', 'after']:
                    png = base64.b64decode(entry[version].pop('png').split(',', 1)[1])
                    name = f'{entry["cardId"]}-{entry["angle"]}-{version}.png'
                    (OUT / name).write_bytes(png)
                    entry[version]['capture'] = {'path': str((OUT / name).relative_to(ROOT)), 'sha256': digest(png), 'bytes': len(png)}
                before_image = Image.open(OUT / f'{entry["cardId"]}-{entry["angle"]}-before.png').convert('RGB')
                after_image = Image.open(OUT / f'{entry["cardId"]}-{entry["angle"]}-after.png').convert('RGB')
                assert before_image.size == after_image.size
                differences = list(ImageChops.difference(before_image, after_image).getdata())
                changed_pixels = sum(max(pixel) > 8 for pixel in differences)
                entry['pixelComparison'] = {'sameDimensions': True, 'threshold': 'at least one RGB channel differs by more than 8/255',
                    'changedPixels': changed_pixels, 'changedFraction': changed_pixels / len(differences),
                    'meanAbsoluteChannelDifference': sum(sum(pixel) for pixel in differences) / (len(differences) * 3),
                    'sourceSimilarityScore': False}
                assert changed_pixels > 200, 'no perceptible detail in the camera pair'
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
        preservation_runner = ROOT / 'scripts/audit-continuation-terrain-preservation.mjs'
        subprocess.run(['node', str(preservation_runner)], cwd=ROOT, check=True, capture_output=True, text=True)
        preservation_path = OUT / 'preservation.json'
        preservation = json.loads(preservation_path.read_text())
        assert preservation['ok'] and preservation['intentionallyDetailedCount'] == len(CARDS)
        report['preservation'] = {'path': str(preservation_path.relative_to(ROOT)), **fingerprint(preservation_path),
            'sourceCount': preservation['sourceCount'], 'unchangedGeometryCount': preservation['unchangedGeometryCount'],
            'intentionallyDetailedCount': preservation['intentionallyDetailedCount'], 'sourceJpegsIntact': preservation['sourceJpegsIntact'],
            'runner': {'path': str(preservation_runner.relative_to(ROOT)), **fingerprint(preservation_runner)}}
        report['ok'] = True
    finally:
        (OUT / 'report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
        server.shutdown(); server.server_close()
    print(json.dumps({'ok': report['ok'], 'cardCount': len(CARDS), 'anglePairs': len(report['measurements']), 'captures': 36, 'comparisonBoards': 6, 'baseline': BASELINE}))


if __name__ == '__main__':
    main()
