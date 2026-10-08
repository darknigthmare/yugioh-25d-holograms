#!/usr/bin/env python3
"""Capture 20 unchanged sources, previous props and reconstructed aquatic.

Uses the actual integrated geometry factory with its production Three whitelist.
The archived baseline is the exact 2bc79f1 geometry factory, retaining
the earlier named props and family fallback. One WebGL renderer is reused.
"""
import argparse
import hashlib
import json
import mimetypes
from pathlib import Path
import re
import threading
import subprocess
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlsplit

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'docs/audits/artifacts/field-aquatic-2026-10-07'
BASELINE_COMMIT = "2bc79f1"
SELECTIONS = [
  [
    "38391684",
    "Atlantis, City of the Sea Dragon",
    [
      9,
      13,
      -4
    ],
    [
      0,
      9,
      -33
    ],
    66
  ],
  [
    "62200831",
    "Gunkan Sushipyard Seaside Supper Spot",
    [
      18,
      22,
      -6
    ],
    [
      0,
      7,
      -33
    ],
    68
  ],
  [
    "34103656",
    "Lemuria, the Forgotten City",
    [
      10,
      14,
      -8
    ],
    [
      0,
      8,
      -33
    ],
    68
  ],
  [
    "26534688",
    "Magellanica, the Deep Sea City",
    [
      8,
      13,
      -4
    ],
    [
      0,
      10,
      -34
    ],
    68
  ],
  [
    "91027843",
    "Marincess Battle Ocean",
    [
      2,
      13,
      -4
    ],
    [
      0,
      12,
      -29
    ],
    72
  ],
  [
    "60448701",
    "Ogdoadic Origin",
    [
      9,
      12,
      -7
    ],
    [
      0,
      10,
      -35
    ],
    73
  ],
  [
    "2819435",
    "Pacifis, the Phantasm City",
    [
      8,
      15,
      -8
    ],
    [
      0,
      10,
      -33
    ],
    73
  ],
  [
    "93031067",
    "Plunder Patroll Shipyarrrd",
    [
      12,
      12,
      -7
    ],
    [
      0,
      9,
      -31
    ],
    72
  ],
  [
    "77103950",
    "Primeval Planet Perlereino",
    [
      2,
      12,
      -4
    ],
    [
      0,
      11,
      -34
    ],
    70
  ],
  [
    "69408987",
    "Spider Web",
    [
      2,
      10,
      -7
    ],
    [
      0,
      10,
      -31
    ],
    72
  ],
  [
    "34225426",
    "Tearlaments Perlegia",
    [
      9,
      9,
      -5
    ],
    [
      0,
      4,
      -30
    ],
    68
  ],
  [
    "8794055",
    "The Most Distant, Deepest Depths",
    [
      0,
      12,
      -7
    ],
    [
      0,
      12,
      -34
    ],
    72
  ],
  [
    "22702055",
    "Umi",
    [
      10,
      14,
      -6
    ],
    [
      0,
      1,
      -31
    ],
    68
  ],
  [
    "82999629",
    "Umiiruka",
    [
      9,
      8,
      -7
    ],
    [
      0,
      3,
      -31
    ],
    68
  ],
  [
    "2084239",
    "Wetlands",
    [
      3,
      7,
      -6
    ],
    [
      0,
      4,
      -31
    ],
    68
  ],
  [
    "94317736",
    "Hidden Springs of the Far East",
    [
      7,
      13,
      -6
    ],
    [
      0,
      4,
      -31
    ],
    67
  ],
  [
    "92107604",
    "Runick Fountain",
    [
      8,
      11,
      -4
    ],
    [
      0,
      9,
      -33
    ],
    69
  ],
  [
    "5697558",
    "The Hidden City",
    [
      10,
      15,
      -2
    ],
    [
      0,
      10,
      -35
    ],
    70
  ],
  [
    "89264428",
    "Ursarctic Big Dipper",
    [
      10,
      19,
      -7
    ],
    [
      0,
      5,
      -33
    ],
    69
  ],
  [
    "4215636",
    "Shrine of Mist Valley",
    [
      9,
      13,
      -5
    ],
    [
      0,
      8,
      -31
    ],
    68
  ]
]

HTML = '''<!doctype html><html lang="fr"><meta charset="utf-8"><title>Sources aquatiques et volumes</title><style>
body{margin:0;padding:18px;background:#101725;color:#edf2fb;font:16px system-ui}h1{font-size:25px;margin:0 0 8px}
p{color:#b8c6d9;margin:0 0 20px}h2{font-size:19px;margin:0 0 9px}section{margin-bottom:22px}
.cols{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}figure{margin:0;padding:8px;background:#1b2638;border:1px solid #334962;border-radius:8px}
img{width:100%;aspect-ratio:1;object-fit:contain;display:block;background:radial-gradient(ellipse at top,#344858,#0c1624)}
figcaption{font-size:14px;padding-top:6px;color:#c8d7e8}.badge{font-size:12px;color:#bad6c4}</style>
<h1>20 Terrains aquatiques : source / avant / volumes reconstruits</h1>
<p>Sources JPG intactes · même caméra et même lumière avant/après · constructeur Three de production.<br>
Volumétrie adaptée à la périphérie du duel, sans promesse de reproduction spatiale intégrale 1:1. Les personnages restent dans l’illustration.</p><main></main>
<script type="importmap">{"imports":{"three":"/node_modules/three/build/three.module.js"}}</script><script type="module">
import * as THREE from 'three';
import {FIELD_GEOMETRY_THREE} from '/src/ui/FieldGeometryThree.js';
import {createFieldEnvironmentGeometry as create,disposeFieldEnvironmentGeometry as dispose} from '/src/ui/FieldEnvironmentGeometry.js';
import {createFieldEnvironmentGeometry as beforeCreate} from '/baseline.js';
import {getFieldEnvironmentForCardId} from '/src/ui/FieldEnvironmentRegistry.js';
const selections=__SELECTIONS__;
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true});
renderer.setSize(600,600);renderer.setPixelRatio(1);renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.2;
const details=[];
const capture=(entry,factory)=>{
 const group=factory(FIELD_GEOMETRY_THREE,getFieldEnvironmentForCardId(entry[0]));
 const scene=new THREE.Scene();scene.add(group);scene.add(new THREE.HemisphereLight(0xf2f5ff,0x616574,2.1));
 const key=new THREE.DirectionalLight(0xfff5e7,2.4);key.position.set(8,28,10);scene.add(key);
 const camera=new THREE.PerspectiveCamera(entry[4],1,0.1,180);camera.position.set(...entry[2]);camera.lookAt(...entry[3]);
 renderer.render(scene,camera);
 const result={url:renderer.domElement.toDataURL('image/png'),primitives:group.userData.meshCount,
   drawCalls:renderer.info.render.calls,materials:group.userData.materialCount,triangles:renderer.info.render.triangles,
   fidelity:group.userData.fidelity,landmark:group.userData.landmark};
 dispose(group);scene.clear();result.geometriesAfterDisposal=renderer.info.memory.geometries;return result;
};
for(const entry of selections){
 const section=document.createElement('section');section.id='card-'+entry[0];
 const title=document.createElement('h2');title.textContent=entry[1]+' — '+entry[0];section.append(title);
 const cols=document.createElement('div');cols.className='cols';section.append(cols);
 const before=capture(entry,beforeCreate),after=capture(entry,create);
 for(const [url,label,stat] of [
   ['/environments/field-art/'+entry[0]+'.jpg','Illustration source conservée','JPG original, proportions intactes'],
   [before.url,'Géométrie précédente — commit 2bc79f1',before.primitives+' primitives · '+before.drawCalls+' appels · '+before.materials+' matériaux'],
   [after.url,'Volumes reconstruits et adaptés',after.primitives+' primitives · '+after.drawCalls+' appels · '+after.materials+' matériaux']]){
   const figure=document.createElement('figure'),img=document.createElement('img'),caption=document.createElement('figcaption'),badge=document.createElement('div');
   img.src=url;caption.textContent=label;badge.className='badge';badge.textContent=stat;caption.append(badge);figure.append(img,caption);cols.append(figure);
 }
 document.querySelector('main').append(section);
 details.push({cardId:entry[0],before:{...before,url:undefined},after:{...after,url:undefined}});
}
await Promise.all([...document.images].map(img=>img.decode()));
window.auditCapture={details,images:document.images.length,complete:document.images.length===60,rendererCount:1,
 memoryScope:'renderer.info.memory.geometries after each disposal; GPU allocations beyond Three tracking not measured'};
renderer.dispose();renderer.forceContextLoss();document.documentElement.dataset.auditReady='true';
</script></html>'''.replace('__SELECTIONS__', json.dumps(SELECTIONS))


def archive_baseline():
    original = subprocess.run(['git','show',f'{BASELINE_COMMIT}:src/ui/FieldEnvironmentGeometry.js'],
        cwd=ROOT,check=True,capture_output=True).stdout
    (OUT / 'baseline-2bc79f1-original.js').write_bytes(original)
    source = original.decode()
    assert 'createAquaticReferenceGeometry' not in source, 'Baseline must precede this lot'
    dependencies = OUT / 'baseline-dependencies'
    dependencies.mkdir(exist_ok=True)
    for name in re.findall(r'from [\'\"]\./([^\'\"]+)[\'\"]', source):
        archived = subprocess.run(['git','show',f'{BASELINE_COMMIT}:src/ui/{name}'],
            cwd=ROOT,check=True,capture_output=True).stdout
        (dependencies / name).write_bytes(archived)
    source = re.sub(r'from [\'\"]\./([^\'\"]+)[\'\"]', r"from '/baseline-deps/\1'", source)
    path = OUT / 'baseline-2bc79f1-served.js'
    path.write_text(source)
    return path


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        path = urlsplit(self.path).path
        if path == '/':
            data, mime = HTML.encode(), 'text/html'
        elif path == '/favicon.ico':
            self.send_response(204); self.end_headers(); return
        elif path == '/baseline.js':
            data, mime = (OUT / 'baseline-2bc79f1-served.js').read_bytes(), 'text/javascript'
        elif re.fullmatch(r'/baseline-deps/[A-Za-z0-9]+\.js',path):
            data, mime = (OUT / 'baseline-dependencies' / path.rsplit('/',1)[1]).read_bytes(), 'text/javascript'
        elif re.fullmatch(r'/(src/(?:ui|core)/[A-Za-z0-9]+\.js|node_modules/three/build/[a-z.]+\.js|environments/field-art/\d+\.jpg)', path):
            file = ROOT / (f'public{path}' if path.startswith('/environments/') else path[1:])
            if not file.is_file():
                self.send_error(404); return
            data, mime = file.read_bytes(), mimetypes.guess_type(str(file))[0]
        else:
            self.send_error(404); return
        self.send_response(200); self.send_header('Content-Type', mime); self.end_headers(); self.wfile.write(data)

    def log_message(self, *_args):
        pass


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--capture', action='store_true')
    args = parser.parse_args()
    OUT.mkdir(parents=True, exist_ok=True)
    baseline = archive_baseline()
    report = {'auditDate':'2026-10-07', 'referenceCount':20,
        'baselineCommit':BASELINE_COMMIT,
        'baselineMethod':'Exact git-show 2bc79f1 factory and five reference dependencies archived intact; only factory import URLs rewritten for the static server.',
        'baselineOriginalSha256':hashlib.sha256((OUT / 'baseline-2bc79f1-original.js').read_bytes()).hexdigest(),
        'baselineDependencies':[{'file':path.name,'sha256':hashlib.sha256(path.read_bytes()).hexdigest()}
            for path in sorted((OUT / 'baseline-dependencies').glob('*.js'))],
        'geometryScope':'Source shapes reconstructed as adapted peripheral volumes; no full spatial 1:1 claim; source characters retained unchanged.',
        'moduleSha256':hashlib.sha256((ROOT / 'src/ui/FieldEnvironmentAquaticReferences.js').read_bytes()).hexdigest(),
        'testSha256':hashlib.sha256((ROOT / 'test/field-aquatic-references.test.js').read_bytes()).hexdigest(),
        'factorySha256':hashlib.sha256((ROOT / 'src/ui/FieldEnvironmentGeometry.js').read_bytes()).hexdigest(),
        'baselineSha256':hashlib.sha256(baseline.read_bytes()).hexdigest(),
        'references':[{'cardId':entry[0],'name':entry[1],'camera':entry[2],'target':entry[3],'fov':entry[4],
            'sourceUrl':f'https://images.ygoprodeck.com/images/cards_cropped/{entry[0]}.jpg',
            'sourceSha256':hashlib.sha256((ROOT / f'public/environments/field-art/{entry[0]}.jpg').read_bytes()).hexdigest()} for entry in SELECTIONS]}
    for reference in report['references']:
        original = subprocess.run(['git','show',f"{BASELINE_COMMIT}:public/environments/field-art/{reference['cardId']}.jpg"],
            cwd=ROOT,check=True,capture_output=True).stdout
        reference['baselineSourceSha256']=hashlib.sha256(original).hexdigest()
        reference['sourceUnchangedFromBaseline']=reference['sourceSha256']==reference['baselineSourceSha256']
        assert reference['sourceUnchangedFromBaseline'],reference['cardId']
    if args.capture:
        server=ThreadingHTTPServer(('127.0.0.1',0),Handler)
        threading.Thread(target=server.serve_forever,daemon=True).start()
        try:
            with sync_playwright() as playwright:
                browser=playwright.chromium.launch(executable_path='/usr/bin/chromium',headless=True,
                    args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
                page=browser.new_page(viewport={'width':1440,'height':1000},device_scale_factor=1)
                errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
                page.on('response',lambda response:errors.append(f'{response.status}: {urlsplit(response.url).path}') if response.status>=400 else None)
                page.goto(f'http://127.0.0.1:{server.server_port}')
                page.wait_for_function("() => document.documentElement.dataset.auditReady === 'true'",timeout=60000)
                report['capture']=page.evaluate('window.auditCapture');report['capture']['errors']=errors
                assert report['capture']['complete'] and not errors, errors
                for detail in report['capture']['details']:
                    after=detail['after']
                    assert after['primitives']<=220 and after['drawCalls']<=18 and after['materials']<=10, detail
                    assert after['geometriesAfterDisposal']==0, detail
                report['capture']['artifacts']=[]
                report['capture']['artifactSha256']={}
                for index in range(5):
                    selected=SELECTIONS[index*4:index*4+4]
                    page.evaluate('(ids)=>document.querySelectorAll("section").forEach(section=>section.hidden=!ids.includes(section.id))',[f'card-{entry[0]}' for entry in selected])
                    page.evaluate('window.scrollTo(0,0)')
                    path=OUT / f'aquatic-source-before-after-{index+1}.jpg'
                    page.screenshot(path=str(path),full_page=True,type='jpeg',quality=90)
                    report['capture']['artifacts'].append(str(path.relative_to(ROOT)))
                    report['capture']['artifactSha256'][path.name]=hashlib.sha256(path.read_bytes()).hexdigest()
                assert report['moduleSha256']==hashlib.sha256((ROOT/'src/ui/FieldEnvironmentAquaticReferences.js').read_bytes()).hexdigest(), 'Module changed during capture'
                assert report['factorySha256']==hashlib.sha256((ROOT/'src/ui/FieldEnvironmentGeometry.js').read_bytes()).hexdigest(), 'Factory changed during capture'
                browser.close()
        finally:
            server.shutdown();server.server_close()
    (OUT/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps({'references':20,'images':report.get('capture',{}).get('images',0),'errors':report.get('capture',{}).get('errors',[])}))


if __name__=='__main__':
    main()
