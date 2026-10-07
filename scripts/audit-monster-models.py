#!/usr/bin/env python3
"""Render source illustrations beside the actual procedural modules on a local Vite server.

Requires Python Playwright and Chromium. No duel state or private card data is used.
Example: python scripts/audit-monster-models.py --base-url http://127.0.0.1:5173
"""
import argparse
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

AUDIT_HTML = """<!doctype html><html lang="fr"><meta charset="utf-8"><title>Audit des monstres</title>
<style>*{box-sizing:border-box}body{margin:0;background:#121b2d;color:#edf3fc;font-family:Arial,sans-serif}
header{padding:26px 32px 12px}h1{font-size:26px;margin:0 0 9px}p{margin:0;color:#adc0d7;font-size:14px}
#cards{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;padding:12px 24px 24px}
article{background:#19253a;border:1px solid #35465e;border-radius:12px;overflow:hidden}
h2{font-size:16px;padding:14px 14px 3px;margin:0}.source{height:150px;margin:12px auto 4px;display:block;border-radius:6px}
.label{font-size:11px;text-align:center;color:#a0b5cd}.model{width:100%;height:280px;display:block}
footer{font-size:12px;padding:8px 14px 14px;color:#aec4dc;line-height:1.5}.limits{padding:0 32px 20px;font-size:12px;color:#afc0d4}
</style><header><h1>Illustrations de référence et volumes de duel</h1><p>Audit du 7 octobre 2026 • rendu des vrais modules • interprétation procédurale, pas une copie 3D exacte.</p></header>
<main id="cards"></main><div class="limits">La carte originale reste la référence officielle. Anatomie simplifiée : formes sculptées procéduralement, aucun modèle officiel ou scan 3D. Les volumes restent limités à cinq batches de matériaux.</div>
<script type="module">
import * as THREE from '/node_modules/.vite/deps/three.js';
import {createHologramMonsterModel} from '/src/ui/HologramMonsterModels.js';
import {createHologramPoseAnimation} from '/src/ui/HologramPoseAnimation.js';
import {createCombatVisualEffect} from '/src/ui/CombatVisualEffects.js';
const entries=[['89631139','Dragon Blanc aux Yeux Bleus'],['74677422','Dragon Noir aux Yeux Rouges'],['46986414','Magicien Sombre'],['38033121','Magicienne des Ténèbres'],['20721928','Sparkman, HÉROS Élémentaire'],['68638985','Crapaud Slime'],['39552864','Sphère Mystique Lumineuse']];
const renderers=[];
const views=[];
const measurement=[];
for(const [id,label]of entries){
 const article=document.createElement('article');
 article.innerHTML=`<h2>${label}</h2><img class="source" src="/cards/cropped/${id}.jpg" alt="Illustration ${label}"><div class="label">Illustration locale d’origine</div>`;
 document.getElementById('cards').append(article);
 const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
 renderer.setSize(334,280); renderer.setPixelRatio(1);renderer.setClearColor('#19253a');
 renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 renderer.domElement.className='model';article.append(renderer.domElement);renderers.push(renderer);
 const scene=new THREE.Scene();scene.add(new THREE.HemisphereLight('#eef5ff','#263c55',1.6));
 const key=new THREE.DirectionalLight('#fff4ea',2.3);key.position.set(-3,6,5);key.castShadow=true;key.shadow.mapSize.set(512,512);scene.add(key);
 const rim=new THREE.DirectionalLight('#9ccaff',1.2);rim.position.set(3,3,-3);scene.add(rim);
 const model=createHologramMonsterModel({id});scene.add(model);
 const floor=new THREE.Mesh(new THREE.CircleGeometry(1.5,32),new THREE.MeshStandardMaterial({color:'#273952',roughness:0.75}));
 floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;scene.add(floor);
 const camera=new THREE.PerspectiveCamera(37,334/280,.1,80);
 camera.position.set(4.1,3.1,6.4);camera.lookAt(0,id==='68638985'||id==='39552864'?.72:1.38,0);
 const pose=createHologramPoseAnimation(model,{kind:/46986414|38033121/.test(id)?'casting':'attack'});
 const note=document.createElement('footer');note.textContent=`${model.userData.meshCount} batches · ${model.userData.triangleCount} triangles`;article.append(note);
 measurement.push({cardId:id,model:model.userData.profile.id,meshes:model.userData.meshCount,triangles:model.userData.triangleCount,reference:model.userData.referenceArt});
 views.push({scene,camera,renderer,pose,model});
}
const effects=document.createElement('article');effects.innerHTML='<h2>Effets des terrains</h2><div class="label" style="padding:20px">Sanctuaire : protection dorée<br>Gratte-Ciel : augmentation et chevrons<br>Forêt Ancienne : racines à la destruction</div>';
document.getElementById('cards').append(effects);
const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setSize(334,400);renderer.setClearColor('#19253a');renderer.domElement.className='model';renderer.domElement.style.height='400px';effects.append(renderer.domElement);renderers.push(renderer);
const scene=new THREE.Scene();const camera=new THREE.PerspectiveCamera(40,334/400,.1,80);camera.position.set(0,4.2,10);camera.lookAt(0,1.4,0);
const effectList=[];for(const [profile,x]of [['sanctuary-protection',-2],['skyscraper-boost',0],['ancient-forest-destruction',2]]){const effect=createCombatVisualEffect({profile,source:[x,0,0],target:[x,0,0]});scene.add(effect.group);effectList.push(effect)}
function draw(progress){for(const view of views){view.pose.update(progress);view.renderer.render(view.scene,view.camera)}for(const effect of effectList)effect.update(.42);renderer.render(scene,camera)}
draw(0);
views.forEach((view,index)=>{view.renderer.shadowMap.enabled=false;view.renderer.render(view.scene,view.camera);measurement[index].colorDrawCalls=view.renderer.info.render.calls-1;view.renderer.shadowMap.enabled=true});
draw(0);
window.auditModels={measurement,draw,renderers,views,effectList};
window.auditReady=true;
</script></html>"""

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--base-url', default='http://127.0.0.1:5173')
    parser.add_argument('--output-dir', default='docs/audits/artifacts')
    args = parser.parse_args()
    output = Path(args.output_dir)
    output.mkdir(parents=True, exist_ok=True)
    errors = []
    with sync_playwright() as driver:
        browser = driver.chromium.launch(executable_path='/usr/bin/chromium', headless=True,
            args=['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
        page = browser.new_page(viewport={'width': 1440, 'height': 1250}, device_scale_factor=1)
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.on('console', lambda message: errors.append(message.text) if message.type == 'error' else None)
        audit_url = args.base_url.rstrip('/') + '/__monster-model-audit__'
        page.route(audit_url, lambda route: route.fulfill(status=200, content_type='text/html', body=AUDIT_HTML))
        page.goto(audit_url)
        page.wait_for_function('window.auditReady === true')
        page.locator('.source').evaluate_all('(images)=>Promise.all(images.map(image=>image.decode()))')
        page.screenshot(path=str(output / 'monster-reference-rest-2026-10-07.png'), full_page=True)
        page.evaluate('window.auditModels.draw(.34)')
        page.screenshot(path=str(output / 'monster-reference-poses-2026-10-07.png'), full_page=True)
        measurement = page.evaluate('window.auditModels.measurement')
        gpu = page.evaluate('window.auditModels.renderers.map(renderer=>({programs:renderer.info.programs.length,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures}))')
        report = {'models': measurement, 'gpu': gpu, 'browserErrors': errors, 'fidelity': 'procedural-interpretation'}
        (output / 'monster-reference-measurements-2026-10-07.json').write_text(json.dumps(report, indent=2) + '\n')
        page.evaluate('for(const view of window.auditModels.views){view.pose.dispose();for(const mesh of view.model.children){mesh.geometry.dispose();mesh.material.dispose()}}for(const effect of window.auditModels.effectList)effect.dispose();for(const renderer of window.auditModels.renderers){renderer.dispose();renderer.forceContextLoss()}')
        browser.close()
    print(json.dumps(report, indent=2))
    if errors:
        raise SystemExit('Browser or WebGL errors in the model audit')

if __name__ == '__main__':
    main()
