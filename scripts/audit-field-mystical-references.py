#!/usr/bin/env python3
"""Capture intact source JPGs and before/after mystical reference geometry.

Use --capture for real Chromium rendering. One reused WebGL renderer and
identical per-card camera/light isolate the geometry changes. No source image
is edited and no game, private cards or development QA hook is instantiated.
"""
import argparse
import hashlib
import json
import mimetypes
import re
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'docs/audits/artifacts'
BASELINE = OUT / 'field-mystical-baseline-2026-10-07.js'
SELECTIONS = [
    ['94243005', 'Chaos Zone', [0,11,0], [0,11,-32], 72],
    ['33550694', 'Fusion Gate', [0,10,0], [0,9,-32], 72],
    ['42015635', 'Neo Space', [0,11,0], [0,11,-32], 72],
    ['87902575', 'Future Visions', [0,11,0], [0,11,-32], 72],
    ['20720928', 'Metaphys Factor', [0,11,0], [0,11,-32], 72],
    ['34822850', 'Void Expansion', [0,11,0], [0,11,-32], 72],
    ['33900648', 'Clear World', [0,12,0], [0,12,-32], 72],
    ['69296555', 'Array of Revealing Light', [0,17,-4], [0,3,-31], 72],
    ['58406094', 'Starry Knight Sky', [0,11,0], [0,11,-32], 72],
    ['675319', 'Zodiac Sign', [0,11,0], [0,11,-32], 72],
    ['27813661', 'Sky Iris', [0,11,0], [0,11,-32], 72],
    ['69217334', 'Breaking of the World', [0,11,0], [0,11,-32], 72],
    ['95856586', 'Zexal Field', [0,11,0], [0,11,-32], 72],
    ['4545854', 'Xyz Territory', [0,11,0], [0,11,-32], 72],
]

HTML = '''<!doctype html><html lang="fr"><meta charset="utf-8">
<title>Terrains mystiques : sources et géométrie</title><style>
body{margin:0;padding:20px;background:#101725;color:#edf2fb;font:16px system-ui}
h1{font-size:24px;margin:0 0 8px}p{color:#b5c5d9;margin:0 0 20px}h2{font-size:19px;margin:0 0 10px}
section{margin-bottom:26px}.cols{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
figure{margin:0;padding:8px;background:#1a2536;border:1px solid #31455e;border-radius:8px}
img{width:100%;aspect-ratio:1;object-fit:contain;display:block;background:radial-gradient(ellipse at top,#344858,#0c1624)}
figcaption{font-size:14px;padding-top:7px;color:#c5d6e6}.badge{font-size:12px;color:#b0d5c3}</style>
<h1>14 Terrains mystiques : source intacte / géométrie précédente / nouveaux repères</h1>
<p>Même caméra et même lumière avant/après · aucune modification des illustrations.<br>
Les courbes, éclats et volumes sont adaptés à la périphérie du duel. Les personnages restent dans l'illustration ; aucune reproduction complète de personnages n'est annoncée.</p><main></main>
<script type="importmap">{"imports":{"three":"/node_modules/three/build/three.module.js"}}</script>
<script type="module">
import * as THREE from 'three';
import {FIELD_GEOMETRY_THREE} from '/src/ui/FieldGeometryThree.js';
import {createFieldEnvironmentGeometry as create,disposeFieldEnvironmentGeometry as dispose} from '/src/ui/FieldEnvironmentGeometry.js';
import {createFieldEnvironmentGeometry as oldCreate} from '/baseline.js';
import {getFieldEnvironmentForCardId} from '/src/ui/FieldEnvironmentRegistry.js';
const selections=__SELECTIONS__;
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true});
renderer.setSize(600,600);renderer.setPixelRatio(1);renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.2;
const capture=(entry,factory)=>{
 const group=factory(FIELD_GEOMETRY_THREE,getFieldEnvironmentForCardId(entry[0]));
 const scene=new THREE.Scene();scene.add(group);scene.add(new THREE.HemisphereLight(0xf2f5ff,0x616574,2.1));
 const key=new THREE.DirectionalLight(0xfff5e7,2.4);key.position.set(8,28,10);scene.add(key);
 const camera=new THREE.PerspectiveCamera(entry[4],1,0.1,180);camera.position.set(...entry[2]);camera.lookAt(...entry[3]);
 renderer.render(scene,camera);
 const result={url:renderer.domElement.toDataURL('image/png'),primitives:group.userData.referencePrimitiveCount??group.userData.meshCount,
 drawCalls:renderer.info.render.calls,materials:group.userData.materialCount,triangles:renderer.info.render.triangles,
 fidelity:group.userData.fidelity,bounds:group.userData.bounds};
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
 [before.url,'Avant le lot mystique',before.primitives+' primitives · '+before.drawCalls+' appels · '+before.materials+' matériaux'],
 [after.url,'Repères issus de la source',after.primitives+' primitives · '+after.drawCalls+' appels · '+after.materials+' matériaux']]){
  const f=document.createElement('figure'),img=document.createElement('img'),cap=document.createElement('figcaption'),stat=document.createElement('div');
  img.src=url;cap.textContent=label;stat.className='badge';stat.textContent=badge;cap.append(stat);f.append(img,cap);cols.append(f);
 }
 document.querySelector('main').append(section);
 details.push({cardId:entry[0],before:{...before,url:undefined},after:{...after,url:undefined}});
}
await Promise.all([...document.images].map(img=>img.decode()));
window.auditCapture={details,images:document.images.length,complete:document.images.length===42};
renderer.dispose();renderer.forceContextLoss();document.documentElement.dataset.auditReady='true';
</script></html>'''.replace('__SELECTIONS__',json.dumps(SELECTIONS))


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        path=urlsplit(self.path).path
        if path=='/':
            data,mime=HTML.encode(),'text/html'
        elif path=='/favicon.ico':
            self.send_response(204);self.end_headers();return
        elif path=='/baseline.js':
            # Preserve the archived baseline bytes. Only resolve its relative
            # imports against the unchanged reference modules when serving it.
            data=BASELINE.read_text().replace("from './FieldEnvironment", "from '/src/ui/FieldEnvironment").encode()
            mime='text/javascript'
        elif re.fullmatch(r'/(src/(?:ui|core)/[A-Za-z0-9]+\.js|node_modules/three/build/[a-z.]+\.js|environments/field-art/\d+\.jpg)',path):
            file=ROOT/(f'public{path}' if path.startswith('/environments/') else path[1:])
            if not file.is_file():
                self.send_error(404);return
            data=file.read_bytes();mime=mimetypes.guess_type(str(file))[0]
        else:
            self.send_error(404);return
        self.send_response(200);self.send_header('Content-Type',mime);self.end_headers();self.wfile.write(data)

    def log_message(self,*_):
        pass


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--capture',action='store_true');args=parser.parse_args()
    OUT.mkdir(parents=True,exist_ok=True)
    report={'auditDate':'2026-10-07','referenceCount':len(SELECTIONS),
        'description':'Intact source JPGs and adapted peripheral geometry; characters retained in illustration.',
        'moduleSha256':hashlib.sha256((ROOT/'src/ui/FieldEnvironmentMysticalReferences.js').read_bytes()).hexdigest(),
        'baselineSha256':hashlib.sha256(BASELINE.read_bytes()).hexdigest(),
        'references':[{'cardId':e[0],'name':e[1],'camera':e[2],'target':e[3],'fov':e[4],
            'sourceUrl':f'https://images.ygoprodeck.com/images/cards_cropped/{e[0]}.jpg',
            'sha256':hashlib.sha256((ROOT/f'public/environments/field-art/{e[0]}.jpg').read_bytes()).hexdigest()} for e in SELECTIONS]}
    if args.capture:
        server=ThreadingHTTPServer(('127.0.0.1',0),Handler)
        threading.Thread(target=server.serve_forever,daemon=True).start()
        try:
            with sync_playwright() as p:
                browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,
                    args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
                page=browser.new_page(viewport={'width':1440,'height':1000},device_scale_factor=1)
                errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
                page.on('response',lambda response:errors.append(f'{response.status}: {urlsplit(response.url).path}') if response.status>=400 else None)
                page.goto(f'http://127.0.0.1:{server.server_address[1]}/')
                page.wait_for_function("document.documentElement.dataset.auditReady === 'true'",timeout=60000)
                report['capture']=page.evaluate('window.auditCapture');report['capture']['errors']=errors
                assert report['capture']['complete'] and not errors,f'WebGL capture failed: {errors}'
                for entry in report['capture']['details']:
                    assert entry['after']['drawCalls']<=18,entry
                    assert entry['after']['materials']<=10,entry
                    assert entry['after']['primitives']<=220,entry
                    assert entry['after']['fidelity']=='reference-informed-geometry',entry
                report['capture']['artifacts']=[]
                for i,selection in enumerate([SELECTIONS[:4],SELECTIONS[4:8],SELECTIONS[8:11],SELECTIONS[11:]]):
                    page.evaluate('(ids)=>document.querySelectorAll("section").forEach(s=>s.hidden=!ids.includes(s.id))',[f'card-{e[0]}' for e in selection])
                    artifact=f'field-mystical-board-{i+1}-2026-10-07.jpg'
                    page.screenshot(path=str(OUT/artifact),full_page=True,type='jpeg',quality=92)
                    report['capture']['artifacts'].append(f'docs/audits/artifacts/{artifact}')
                browser.close()
        finally:
            server.shutdown();server.server_close()
    (OUT/'field-mystical-2026-10-07.json').write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps({'references':len(SELECTIONS),'captured':report.get('capture',{}).get('images',0),
        'errors':report.get('capture',{}).get('errors',[])}))


if __name__=='__main__':
    main()
