import json
import hashlib
from datetime import datetime, timezone
from pathlib import Path
from playwright.sync_api import sync_playwright
out=Path('/workspace/yugioh-token-models-2026-10-11/illustrated-exceptions')
root=Path('/workspace/yugioh-25d-holograms')
pinfiles=['src/ui/HologramTokenIllustratedExceptions.js','src/ui/HologramTokenGeometry.js','src/ui/TokenMonsterModelProfiles.js','src/ui/CombatVisualProfiles.js','src/ui/HologramPoseAnimation.js']
def pins(): return {x:hashlib.sha256((root/x).read_bytes()).hexdigest() for x in pinfiles}
before=pins()
codes=['93912846','49808197','75732623','8198621']
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 page=browser.new_page(viewport={'width':1600,'height':414},device_scale_factor=1)
 errors=[]
 page.on('pageerror',lambda err: errors.append(str(err)))
 page.goto('http://127.0.0.1:5208/package.json')
 page.set_content('''<html><head><style>*{box-sizing:border-box}body{margin:0;background:#12202d;color:#d9e9ed;font:14px Arial}h1{margin:0;padding:18px;height:62px;font-size:20px}#gallery{position:relative;height:352px}canvas{position:absolute;inset:0;width:1600px;height:352px}.tile{position:absolute;width:400px;height:352px;padding:8px;border:1px solid #334456}.tile img{position:absolute;left:8px;top:36px;width:176px;height:276px;object-fit:contain}.tile .name{position:absolute;bottom:8px;left:8px;color:#adc2ca;font-size:12px}.tile .title{font-size:13px}</style></head><body><h1>Quatre exceptions illustrées — référence locale / construction 3D stylisée</h1><div id="gallery"><canvas id="scene"></canvas></div><script type="module">window.proofReady=false;
import * as THREE from '/node_modules/.vite/deps/three.js';
import {mergeGeometries} from '/node_modules/three/examples/jsm/utils/BufferGeometryUtils.js';
import {buildTokenIllustratedExceptions} from '/src/ui/HologramTokenIllustratedExceptions.js';
import {TOKEN_MONSTER_MODEL_PROFILES} from '/src/ui/TokenMonsterModelProfiles.js';
const codes=__CODES__, metrics=[];
const renderer=new THREE.WebGLRenderer({canvas:document.querySelector('#scene'),alpha:true,antialias:true});renderer.setSize(1600,352);renderer.setPixelRatio(1);renderer.setScissorTest(true);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;
for(let i=0;i<codes.length;i++){
 const code=codes[i],profile={body:'#bbcdd9',accent:'#88bacc',hair:'#273845',eye:'#edfbff',...TOKEN_MONSTER_MODEL_PROFILES[code]}, batches=new Map(),names=[];
 const palette={body:profile.body,accent:profile.accent,dark:profile.hair,eye:profile.eye,glow:profile.accent};
 function register(name,g,material,tint){if(!g.index){g.setIndex([...Array(g.attributes.position.count).keys()]);}const c=new THREE.Color(tint||palette[material]),arr=new Float32Array(g.attributes.position.count*3);for(let j=0;j<arr.length;j+=3){arr[j]=c.r;arr[j+1]=c.g;arr[j+2]=c.b;}g.setAttribute('color',new THREE.BufferAttribute(arr,3));if(!batches.has(material))batches.set(material,[]);batches.get(material).push(g);names.push(name);}
 function part(name,g,material,pos,scale=[1,1,1],rot=[0,0,0],tint){const t=new THREE.Object3D();t.position.set(...pos);t.scale.set(...scale);t.rotation.set(...rot);t.updateMatrix();g.applyMatrix4(t.matrix);register(name,g,material,tint);}
 const sphere=(n,m,p,s,d=1,t)=>part(n,new THREE.IcosahedronGeometry(1,d),m,p,s,undefined,t);
 const box=(n,m,p,s,r,t)=>part(n,new THREE.BoxGeometry(1,1,1),m,p,s,r,t);
 const cone=(n,m,p,s,r,t)=>part(n,new THREE.ConeGeometry(1,1,10),m,p,s,r,t);
 const ring=(n,m,p,r,rotation=[Math.PI/2,0,0],tube=.025,t)=>part(n,new THREE.TorusGeometry(r,tube,5,28),m,p,[1,1,1],rotation,t);
 function rod(n,m,start,end,r=.075,er=r,tint){const a=new THREE.Vector3(...start),b=new THREE.Vector3(...end),d=b.clone().sub(a);const g=new THREE.CylinderGeometry(er,r,d.length(),8);g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),d.clone().normalize()));g.translate(...a.add(b).multiplyScalar(.5).toArray());register(n,g,m,tint);}
 buildTokenIllustratedExceptions(profile,{part,sphere,box,cone,ring,rod});
 const scene=new THREE.Scene(), group=new THREE.Group();scene.add(group);let triangles=0;
 for(const [material,geometries] of batches){const geometry=mergeGeometries(geometries);triangles+=geometry.index.count/3;const mat=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.66,metalness:material==='eye'?.12:0,side:THREE.DoubleSide});if(material==='glow'){mat.emissive=new THREE.Color('#e1983c');mat.emissiveIntensity=.8;}group.add(new THREE.Mesh(geometry,mat));geometries.forEach(g=>g.dispose());}
 scene.add(new THREE.HemisphereLight('#d8efff','#64745e',2));const light=new THREE.DirectionalLight('#fff1cf',3.5);light.position.set(-3,5,5);scene.add(light);const fill=new THREE.DirectionalLight('#87beef',1.1);fill.position.set(3,2,-4);scene.add(fill);
 const camera=new THREE.OrthographicCamera(-1.82,1.82,2.67,-2.67,.1,100);camera.position.set(2.3,3.2,6);camera.lookAt(0,1.53,0);camera.updateProjectionMatrix();
 const x=(i%4)*400,y=Math.floor(i/4)*352;renderer.setViewport(x+186,352-y-332,210,306);renderer.setScissor(x+186,352-y-332,210,306);renderer.setClearColor('#12202d',1);renderer.clear();renderer.render(scene,camera);
 const bounds=new THREE.Box3().setFromObject(group);metrics.push({code,anatomy:profile.tokenAnatomy,variant:profile.tokenVisual.variant,triangles,batches:batches.size,actualDrawCalls:renderer.info.render.calls,bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()},parts:names.length});
 const tile=document.createElement('div');tile.className='tile';tile.style.left=x+'px';tile.style.top=y+'px';tile.innerHTML=`<div class="title">${code} · ${profile.tokenVisual.variant}</div><img src="/tokens/reference/${profile.tokenVisual.referenceImageId}.jpg"><div class="name">${triangles} triangles · ${batches.size} lots · référence / modèle</div>`;document.querySelector('#gallery').append(tile);
}
window.proofMetrics={metrics,renderer:renderer.getContext().getParameter(renderer.getContext().VERSION),errors:[]};window.proofReady=true;
</script></body></html>'''.replace('__CODES__',json.dumps(codes)))
 page.wait_for_function('window.proofReady === true',timeout=60000)
 page.wait_for_function('Array.from(document.images).every(i=>i.complete)',timeout=60000)
 page.screenshot(path=str(out/'reference-model-gallery.png'),full_page=True)
 data=page.evaluate('window.proofMetrics')
 data['pageErrors']=errors
 data['scope']='Isolated constructor rendered with shared material batches; not full-duel integration.'
 data['createdAt']=datetime.now(timezone.utc).isoformat()
 data['before']=before
 data['after']=pins()
 data['unchanged']=data['before']==data['after']
 data['referenceSha256']={code:hashlib.sha256((root/'public/tokens/reference'/f'{code}.jpg').read_bytes()).hexdigest() for code in codes}
 (out/'reference-model-gallery.json').write_text(json.dumps(data,indent=2)+'\n')
 print(json.dumps({'samples':len(data['metrics']),'maxTriangles':max(x['triangles'] for x in data['metrics']),'maxDrawCalls':max(x['actualDrawCalls'] for x in data['metrics']),'errors':errors}))
 browser.close()
