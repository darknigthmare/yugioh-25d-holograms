#!/usr/bin/env python3
"""Inspect the actual short-lived summon renderer, without card textures.

This gallery verifies presentation only. It does not replace native rules tests.
Requires external Python Playwright and Chromium; adds no app dependencies.
"""
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
OUT = ROOT / 'docs/audits/artifacts/native-summon-effects-2026-10-07'
HTML = '''<!doctype html><html lang="fr"><meta charset="utf-8">
<title>Effets des procédures d’invocation</title><style>
body{margin:0;padding:24px;background:#101827;color:#e1eeff;font:15px system-ui}
h1{font-size:23px}p{color:#b1c5da}main{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}
figure{margin:0;padding:12px;border:1px solid #33506b;background:#142438;border-radius:8px}
img{width:100%;display:block;aspect-ratio:1;background:#101827}figcaption{margin-top:8px}
small{display:block;color:#a5bfd3}</style>
<h1>Sept procédures : effets publics distincts</h1>
<p>Rendu isolé du code applicatif aux instants 30 % et 65 %. Aucune texture de carte.
<br>Ces captures vérifient la présentation ; les procédures légales sont éprouvées séparément avec le moteur natif.</p>
<main></main><script type="importmap">{"imports":{"three":"/node_modules/three/build/three.module.js"}}</script>
<script type="module">
import * as THREE from 'three';
import {createCombatVisualEffect} from '/src/ui/CombatVisualEffects.js';
import {createPublicCombatVisual} from '/src/ui/PublicDuelVisuals.js';
const renderer = new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
renderer.setSize(400,400);renderer.setPixelRatio(1);renderer.setClearColor('#101827');
const camera=new THREE.PerspectiveCamera(40,1,.1,30);camera.position.set(0,3.4,6.5);camera.lookAt(0,1,0);
const scene=new THREE.Scene();const details=[];
for(const [procedure,label] of [['fusion','Fusion'],['synchro','Synchro'],['xyz','Xyz'],['link','Lien'],['ritual','Rituel'],['pendulum','Pendule'],['flip','Flip']]){
 const visual=createPublicCombatVisual({type:'summon',target:'player',zoneType:'main',zoneIndex:0,
   nativeSummonConfirmed:true,summonType:procedure,card:{id:'23995346',type:'Fusion Monster'}},{},()=>[0,0,0]);
 const effect=createCombatVisualEffect(visual);scene.add(effect.group);
 const frames=[];
 for(const progress of [.3,.65]){
  effect.update(progress);renderer.render(scene,camera);
  const figure=document.createElement('figure'),img=document.createElement('img'),caption=document.createElement('figcaption'),small=document.createElement('small');
  img.src=renderer.domElement.toDataURL('image/png');caption.textContent=label+' — '+Math.round(progress*100)+' %';
  small.textContent=effect.profile.shape+' · '+renderer.info.render.calls+' appels';caption.append(small);figure.append(img,caption);document.querySelector('main').append(figure);
  frames.push({progress,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles});
 }
 effect.dispose();
 details.push({procedure,profile:effect.profile.id,shape:effect.profile.shape,frames,
   remainingGeometries:renderer.info.memory.geometries,remainingTextures:renderer.info.memory.textures});
}
await Promise.all([...document.images].map(img=>img.decode()));
window.effectAudit={details,images:document.images.length};
renderer.dispose();renderer.forceContextLoss();document.documentElement.dataset.auditReady='true';
</script></html>'''


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        path = urlsplit(self.path).path
        if path == '/':
            data, mime = HTML.encode(), 'text/html'
        elif path == '/favicon.ico':
            self.send_response(204); self.end_headers(); return
        elif re.fullmatch(r'/(src/ui/[A-Za-z0-9]+\.js|node_modules/three/build/[a-z.]+\.js)', path):
            file = ROOT / path.lstrip('/')
            if not file.is_file():
                self.send_error(404); return
            data, mime = file.read_bytes(), mimetypes.guess_type(str(file))[0]
        else:
            self.send_error(404); return
        self.send_response(200); self.send_header('Content-Type', mime)
        self.end_headers(); self.wfile.write(data)

    def log_message(self, *_):
        pass


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    errors, failures = [], []
    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(executable_path='/usr/bin/chromium',
                args=['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
            page = browser.new_page(viewport={'width': 1420, 'height': 1000})
            page.on('pageerror', lambda error: errors.append(str(error)))
            page.on('requestfailed', lambda request: failures.append(request.url))
            page.goto(f'http://127.0.0.1:{server.server_port}/', wait_until='networkidle')
            page.wait_for_selector('html[data-audit-ready="true"]', timeout=30000)
            report = page.evaluate('window.effectAudit')
            report.update({'pageErrors': errors, 'failedRequests': failures,
                'proofScope': 'isolated-presentation; native procedures verified separately'})
            assert report['images'] == 14
            assert len({row['shape'] for row in report['details']}) == 7
            assert all(row['remainingGeometries'] == row['remainingTextures'] == 0 for row in report['details'])
            assert max(frame['drawCalls'] for row in report['details'] for frame in row['frames']) <= 20
            assert not errors and not failures
            page.screenshot(path=str(OUT / 'summon-procedures.jpg'), full_page=True, type='jpeg', quality=86)
            browser.close()
        report['ok'] = True
        report['sourceHashes'] = {path: hashlib.sha256((ROOT / path).read_bytes()).hexdigest()
            for path in ['src/ui/CombatVisualEffects.js', 'src/ui/CombatVisualProfiles.js', 'src/ui/PublicDuelVisuals.js']}
        (OUT / 'report.json').write_text(json.dumps(report, indent=2, ensure_ascii=False) + '\n')
        print(json.dumps({'ok': True, 'procedures': 7, 'frames': 14, 'pageErrors': 0,
            'maxDrawCalls': max(frame['drawCalls'] for row in report['details'] for frame in row['frames'])}))
    finally:
        server.shutdown(); server.server_close()


if __name__ == '__main__':
    main()
