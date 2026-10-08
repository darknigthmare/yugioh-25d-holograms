#!/usr/bin/env python3
"""Actual Chromium renders of the two Trap Monster models, compared with d549dbe."""
import argparse
import hashlib
import http.server
import json
import subprocess
import threading
from pathlib import Path
from urllib.parse import unquote, urlsplit
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
BASELINE = 'd549dbe'
DEPENDENCIES = ['src/ui/CombatVisualProfiles.js', 'src/ui/HologramReferenceAnatomy.js',
    'src/ui/HologramMonsterModels.js', 'src/ui/HologramPoseAnimation.js',
    'src/ui/FieldSpellReferenceArtPalettes.js', 'src/ui/FieldSpellEnvironmentCatalog.js',
    'scripts/audit-trap-monster-models.py']
IDS = ['26905245', '28649820']
HTML = '''<!doctype html><html lang="fr"><meta charset="utf-8"><title>Pièges devenus monstres — audit</title>
<style>*{box-sizing:border-box}body{margin:0;background:#101923;color:#e9eef4;font-family:Arial,sans-serif}header{padding:18px 22px}h1{font-size:22px;margin:0 0 8px}p{font-size:13px;color:#a9bed0;margin:0}.grid{display:grid;grid-template-columns:320px 440px 440px;gap:12px;padding:0 16px 18px}article{border:1px solid #3c4b5a;background:#172535;border-radius:9px;overflow:hidden}h2{font-size:15px;margin:14px 16px}.source{width:304px;height:304px;margin:8px;display:block}.model{width:438px;height:460px;display:block}footer{font-size:12px;color:#aec0cf;padding:13px;line-height:1.45}</style>
<script type="importmap">{"imports":{"three":"/node_modules/three/build/three.module.js","three/addons/":"/node_modules/three/examples/jsm/"}}</script>
<header><h1 id="title"></h1><p id="caption"></p></header><main class="grid"><article><h2>JPEG officiel de référence</h2><img class="source" id="source"><footer>Volumes réels interprétés à partir des motifs visibles. Profondeur et proportions adaptées.</footer></article><article id="before"><h2>Ancien modèle — d549dbe</h2></article><article id="after"><h2>Nouveau modèle</h2></article></main>
<script type="module">
import * as THREE from 'three';
import {createHologramMonsterModel as current} from '/src/ui/HologramMonsterModels.js';
import {createHologramPoseAnimation as currentPose} from '/src/ui/HologramPoseAnimation.js';
import {createHologramMonsterModel as previous} from '/__baseline__/src/ui/HologramMonsterModels.js';
import {createHologramPoseAnimation as previousPose} from '/__baseline__/src/ui/HologramPoseAnimation.js';
const id=new URL(location.href).searchParams.get('id');const card=id==='26905245'?{id,name:'Metal Reflect Slime',type:'Trap Monster',race:'Aqua',attribute:'WATER'}:{id,name:'Embodiment of Apophis',type:'Trap Monster',race:'Reptile',attribute:'EARTH'};
document.getElementById('title').textContent=card.name+' — '+id;
document.getElementById('source').src='/cards/cropped/'+id+'.jpg';
const views=[];
for(const [element,factory,animation]of[['before',previous,previousPose],['after',current,currentPose]]){
 const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setSize(438,460);renderer.setPixelRatio(1);renderer.setClearColor('#172535');renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;
 renderer.domElement.className='model';document.getElementById(element).append(renderer.domElement);
 const scene=new THREE.Scene();scene.add(new THREE.HemisphereLight('#e8f0ff','#1d2734',1.6));const key=new THREE.DirectionalLight('#fff7e8',2.3);key.position.set(-3,6,5);scene.add(key);const rim=new THREE.DirectionalLight('#9fceff',1.2);rim.position.set(3,3,-3);scene.add(rim);
 const model=factory(card);scene.add(model);const camera=new THREE.PerspectiveCamera(37,438/460,.1,80);const pose=animation(model,{kind:'attack'});
 const note=document.createElement('footer');note.textContent=model.userData.meshCount+' batches · '+model.userData.triangleCount+' triangles · '+model.userData.profile.id;document.getElementById(element).append(note);views.push({renderer,scene,model,camera,pose,element});
}
function draw(angle,progress){document.getElementById('caption').textContent='Même caméra et éclairage : '+angle+' · pose '+progress;for(const view of views){view.pose.update(progress);const a=angle==='front'?0:angle==='three-quarter'?.66:Math.PI/2;view.camera.position.set(Math.sin(a)*6.8,2.3,Math.cos(a)*6.8);view.camera.lookAt(0,1.6,0);view.renderer.render(view.scene,view.camera);}}
function measurements(){return views.map(v=>({version:v.element,profile:v.model.userData.profile,partNames:v.model.userData.partNames,triangles:v.model.userData.triangleCount,drawCalls:v.renderer.info.render.calls,renderTriangles:v.renderer.info.render.triangles,referenceArt:v.model.userData.referenceArt??null,textureMaps:v.model.children.filter(m=>m.material.map).length,joints:[...new Set(v.model.children.flatMap(m=>Array.from(m.geometry.attributes.hologramJoint.array)))],bounds:new THREE.Box3().setFromObject(v.model).min.toArray().concat(new THREE.Box3().setFromObject(v.model).max.toArray())}));}
function dispose(){return views.map(v=>{const geometries=new Set(),materials=new Set();v.model.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const m of [o.material,o.customDepthMaterial,o.customDistanceMaterial])if(m)materials.add(m)});let gd=0,md=0;for(const g of geometries)g.addEventListener('dispose',()=>gd++);for(const m of materials)m.addEventListener('dispose',()=>md++);v.pose.update(1);v.pose.dispose();v.scene.remove(v.model);for(const m of v.model.children){m.geometry.dispose();m.material.dispose()}v.renderer.render(v.scene,v.camera);const gpu={...v.renderer.info.memory};v.renderer.dispose();const programs=v.renderer.info.programs.length;v.renderer.forceContextLoss();return {version:v.element,geometryCount:geometries.size,geometryDisposals:gd,materialCount:materials.size,materialDisposals:md,gpuAfterRelease:gpu,programsAfterRendererDispose:programs,rigDisposed:v.model.userData.poseRig.disposed};});}
draw('front',0);window.audit={draw,measurements,dispose};window.auditReady=true;
</script></html>'''

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

class Server(http.server.ThreadingHTTPServer):
    daemon_threads = True

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)
    def log_message(self, *args):
        pass
    def do_GET(self):
        path=unquote(urlsplit(self.path).path)
        if path=='/__trap_models__':
            body=HTML.encode();self.send_response(200);self.send_header('Content-Type','text/html; charset=utf-8');self.send_header('Content-Length',str(len(body)));self.end_headers();self.wfile.write(body);return
        if path.startswith('/__baseline__/'):
            relative=path.removeprefix('/__baseline__/')
            if '..' in Path(relative).parts or not relative.startswith('src/'):
                self.send_error(400);return
            result=subprocess.run(['git','show',BASELINE+':'+relative],cwd=ROOT,capture_output=True)
            if result.returncode:
                self.send_error(404);return
            self.send_response(200);self.send_header('Content-Type','text/javascript; charset=utf-8');self.send_header('Content-Length',str(len(result.stdout)));self.end_headers();self.wfile.write(result.stdout);return
        if path.startswith('/cards/'):
            self.path='/public'+self.path
        if path=='/favicon.ico':
            self.send_response(204);self.end_headers();return
        super().do_GET()

def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--output-dir',default='docs/audits/artifacts/trap-monster-models-2026-10-08');args=parser.parse_args()
    output=ROOT/args.output_dir;output.mkdir(parents=True,exist_ok=True)
    sources={p:sha(ROOT/p) for p in DEPENDENCIES}
    arts={id:{kind:{'path':f'public/cards/{kind}/{id}.jpg','sha256':sha(ROOT/f'public/cards/{kind}/{id}.jpg')} for kind in ['cropped','reference']}for id in IDS}
    baseline=subprocess.check_output(['git','rev-parse',BASELINE],cwd=ROOT,text=True).strip()
    baseline_sources={p:hashlib.sha256(subprocess.check_output(['git','show',BASELINE+':'+p],cwd=ROOT)).hexdigest() for p in DEPENDENCIES if p.startswith('src/')}
    errors=[];failed=[];models=[];captures=[];disposals=[]
    server=Server(('127.0.0.1',0),Handler);thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
    try:
        with sync_playwright() as driver:
            browser=driver.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
            page=browser.new_page(viewport={'width':1260,'height':655},device_scale_factor=1)
            page.on('pageerror',lambda error:errors.append(str(error)))
            page.on('console',lambda message:errors.append(message.text)if message.type=='error'else None)
            page.on('requestfailed',lambda request:failed.append({'url':urlsplit(request.url).path,'failure':request.failure}))
            for id in IDS:
                page.goto(f'http://127.0.0.1:{server.server_port}/__trap_models__?id={id}');page.wait_for_function('window.auditReady === true');page.locator('#source').evaluate('(i)=>i.decode()')
                for angle in ['front','three-quarter','side']:
                    for progress,label in [(0,'rest'),(.4,'attack')]:
                        page.evaluate('([angle,p])=>window.audit.draw(angle,p)',[angle,progress]);path=output/f'{id}-{angle}-{label}.png';page.screenshot(path=str(path),full_page=True);captures.append({'cardId':id,'angle':angle,'pose':label,'path':str(path.relative_to(ROOT)),'sha256':sha(path)})
                        values=page.evaluate('window.audit.measurements()');models.append({'cardId':id,'angle':angle,'pose':label,'models':values})
                        after=next(v for v in values if v['version']=='after');assert after['drawCalls']<=5;assert after['triangles']<=6000;assert after['textureMaps']==0;assert after['renderTriangles']==after['triangles']
                release=page.evaluate('window.audit.dispose()');disposals.append({'cardId':id,'results':release})
                for d in release:
                    assert d['geometryDisposals']==d['geometryCount'];assert d['materialDisposals']==d['materialCount'];assert d['gpuAfterRelease']['geometries']==0;assert d['gpuAfterRelease']['textures']==0;assert d['programsAfterRendererDispose']==0;assert d['rigDisposed']
            browser.close()
    finally:
        server.shutdown();server.server_close()
    assert sources=={p:sha(ROOT/p)for p in DEPENDENCIES},'Source changed while capturing models'
    report={'generatedOn':'2026-10-08','baselineCommit':baseline,'baselineSourceFiles':baseline_sources,'browser':'Chromium / SwiftShader','sourceFiles':sources,'referenceArt':arts,'captures':captures,'measurements':models,'disposals':disposals,'browserErrors':errors,'failedRequests':failed,'fidelity':'source-adapted procedural anatomy; depth and proportions adapted, not integral spatial 1:1','limits':['The comparison renders the actual source modules under identical camera/light conditions.','Draw calls measure color rendering only; no shadow pass is configured.','The two models have no illustration texture or standee geometry.','The original JPEG artwork remains the authoritative appearance reference.','The Slime attack pose is a mechanical GPU-rig test only, not a legal duel attack: the official card cannot attack.']}
    (output/'measurements.json').write_text(json.dumps(report,indent=2)+'\n');assert not errors and not failed,(errors,failed)
    print(json.dumps({'models':2,'captures':len(captures),'maxDrawCalls':max(v['drawCalls']for m in models for v in m['models']if v['version']=='after'),'maxTriangles':max(v['triangles']for m in models for v in m['models']if v['version']=='after'),'browserErrors':errors,'failedRequests':failed,'sourceHashesStable':True}))

if __name__=='__main__':
    main()
