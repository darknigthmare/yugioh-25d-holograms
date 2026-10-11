import asyncio, hashlib, json
from pathlib import Path
from playwright.async_api import async_playwright

OUTPUT=Path('/workspace/yugioh-avatar-motion-2026-10-11')
HTML='''<!doctype html><html><head><meta charset="utf-8"><style>*{box-sizing:border-box}body{margin:0;background:#101925;color:#eff5fb;font:14px system-ui}h1{margin:18px 25px 3px;font-size:24px}p{margin:0 25px 14px;color:#8ca6bc}canvas{display:block}#labels{position:absolute;top:80px;left:0;width:1920px;display:grid;grid-template-columns:repeat(8,240px);grid-auto-rows:360px;pointer-events:none}.label{align-self:end;text-align:center;padding:12px;background:linear-gradient(transparent,#101925);font-weight:700}.label small{display:block;color:#89c5d3;font-size:11px;margin-top:3px;font-weight:400}</style></head><body><h1>Gestes des avatars — rig épaules, coudes, poignets et disque</h1><p>Corps entier rendu en WebGL · poses publiques · géométrie et matériaux partagés entre repos et geste</p><canvas></canvas><div id="labels"></div></body></html>'''

MODULE='''async () => {
 const T=await import('/node_modules/.vite/deps/three.js');
 const {createDuelistAvatarModel}=await import('/src/ui/DuelistAvatarModels.js');
 const {DUELIST_GESTURE_DURATIONS}=await import('/src/ui/DuelistAvatarGestures.js');
 const {getDuelistAvatar}=await import('/src/content/DuelistAvatarCatalog.js');
 const kinds=['idle','summon','casting','attack','damage','victory','defeat','draw'];
 const labels={idle:'Repos',summon:'Invocation',casting:'Effet',attack:'Attaque',damage:'Dégâts',victory:'Victoire',defeat:'Défaite',draw:'Nul'};
 const renderer=new T.WebGLRenderer({canvas:document.querySelector('canvas'),antialias:true,preserveDrawingBuffer:true});
 renderer.setPixelRatio(1);renderer.setSize(1920,1080);renderer.setScissorTest(true);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;
 const measurements=[];const models=[];const disposal=[];
 for(let row=0;row<3;row++)for(let column=0;column<8;column++){
  const id=['yugi','kaiba','jaden'][row],kind=kinds[column],avatar=getDuelistAvatar(id),model=createDuelistAvatarModel(id);
  models.push(model);model.update(0);if(kind!=='idle'){model.playGesture(kind);model.update(DUELIST_GESTURE_DURATIONS[kind]*0.38);}else model.update(0,{reducedMotion:true});
  const scene=new T.Scene();scene.background=new T.Color(column%2?'#142033':'#182a40');
  scene.add(new T.HemisphereLight('#ebf4ff','#6b7b8a',2.0));const light=new T.DirectionalLight('#fff0da',3);light.position.set(-4,9,12);scene.add(light);scene.add(model.group);
  const camera=new T.PerspectiveCamera(35,240/360,.1,100);camera.position.set(6,5,17.5);camera.lookAt(0,3.35,0);camera.updateMatrixWorld();
  renderer.setViewport(column*240,(2-row)*360,240,360);renderer.setScissor(column*240,(2-row)*360,240,360);renderer.render(scene,camera);
  let skeleton=null;model.group.traverse(object=>{if(object.isSkinnedMesh)skeleton=object.skeleton});
  const resource={avatarId:id,kind,boneTextureDisposals:0};skeleton.boneTexture.addEventListener('dispose',()=>{resource.boneTextureDisposals++});disposal.push(resource);
  const label=document.createElement('div');label.className='label';label.textContent=labels[kind];const small=document.createElement('small');small.textContent=avatar.name;label.append(small);document.querySelector('#labels').append(label);
  measurements.push({avatarId:id,kind,gesture:model.getGestureState(),drawCalls:model.group.userData.drawCalls,triangles:model.group.userData.triangles,bones:skeleton.bones.length,gpuBoneTextureAllocated:Boolean(skeleton.boneTexture),rig:Object.fromEntries(Object.entries(model.rig).map(([name,bone])=>[name,bone.rotation.toArray().slice(0,3)]))});
 }
 const memoryBefore={...renderer.info.memory};for(const model of models)model.dispose();const memoryAfter={...renderer.info.memory};renderer.dispose();return {measurements,disposal,memoryBefore,memoryAfter};
}'''

async def main():
 OUTPUT.mkdir(exist_ok=True)
 async with async_playwright() as p:
  browser=await p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
  page=await browser.new_page(viewport={'width':1920,'height':1160},device_scale_factor=1)
  await page.goto('http://127.0.0.1:5198/package.json',wait_until='domcontentloaded')
  await page.set_content(HTML)
  measurements=await page.evaluate(MODULE)
  await page.screenshot(path=str(OUTPUT/'gesture-gallery.png'),full_page=True)
  (OUTPUT/'gesture-gallery.json').write_text(json.dumps(measurements,ensure_ascii=False,indent=2)+'\n')
  sources=['src/ui/DuelistAvatarModels.js','src/ui/DuelistAvatarGestures.js','src/ui/DuelistAvatarPortrait.js','src/content/DuelistAvatarCatalog.js']
  (OUTPUT/'gesture-gallery-pins.json').write_text(json.dumps({source:hashlib.sha256((Path('/workspace/yugioh-25d-holograms')/source).read_bytes()).hexdigest()for source in sources},indent=2)+'\n')
  print(json.dumps({'poses':len(measurements['measurements']),'gpuBoneTextureAllocated':all(m['gpuBoneTextureAllocated']for m in measurements['measurements']),'boneTexturesDisposedOnce':all(m['boneTextureDisposals']==1 for m in measurements['disposal']),'memoryAfter':measurements['memoryAfter'],'imageSha256':hashlib.sha256((OUTPUT/'gesture-gallery.png').read_bytes()).hexdigest()}))
  await browser.close()

asyncio.run(main())
