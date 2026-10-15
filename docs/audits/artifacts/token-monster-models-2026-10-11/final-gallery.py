import asyncio, hashlib, json, math
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path('/workspace/yugioh-25d-holograms')
OUT=Path('/workspace/yugioh-token-models-2026-10-11/final')
SOURCES=['src/ui/HologramMonsterModels.js','src/ui/CombatVisualProfiles.js','src/ui/TokenMonsterModelProfiles.js','src/ui/HologramTokenModels.js','src/ui/HologramTokenGeometry.js','src/ui/HologramTokenCreatureModels.js','src/ui/HologramTokenConstructModels.js','src/ui/HologramTokenSpiritModels.js','src/ui/HologramTokenBotanicalModels.js','src/ui/HologramTokenIllustratedExceptions.js','src/ui/HologramPoseAnimation.js']
HTML='''<!doctype html><html><head><meta charset="utf-8"><link rel="icon" href="data:,"><style>*{box-sizing:border-box}body{margin:0;background:#101925;color:#eff5fb;font:14px system-ui}h1{margin:18px 25px 3px;font-size:24px}p{margin:0 25px 14px;color:#8ca6bc}canvas{display:block}#labels{position:absolute;top:80px;left:0;width:1600px;display:grid;grid-template-columns:repeat(5,320px);grid-auto-rows:320px;pointer-events:none}.label{align-self:end;text-align:center;padding:12px;background:linear-gradient(transparent,#101925);font-weight:700}.label small{display:block;color:#89c5d3;font-size:11px;margin-top:3px;font-weight:400}</style></head><body><h1>Jetons — anatomies dédiées, WebGL réel</h1><p id="subtitle"></p><canvas></canvas><div id="labels"></div></body></html>'''
MODULE='''async (options)=>{
 const T=await import('/node_modules/.vite/deps/three.js');const {createHologramMonsterModel}=await import('/src/ui/HologramMonsterModels.js');const {createHologramPoseAnimation}=await import('/src/ui/HologramPoseAnimation.js');
 const renderer=new T.WebGLRenderer({canvas:document.querySelector('canvas'),antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(1);renderer.setSize(1600,1600);renderer.setScissorTest(true);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;
 const measurements=[];document.querySelector('#subtitle').textContent=options.label;
 for(let index=0;index<options.cards.length;index++){
 const card=options.cards[index],row=Math.floor(index/5),column=index%5,model=createHologramMonsterModel({id:String(card.id),type:'Token Monster',isToken:true});
 const scene=new T.Scene();scene.background=new T.Color(index%2?'#142033':'#182a40');scene.add(new T.HemisphereLight('#ebf4ff','#6b7b8a',2));const light=new T.DirectionalLight('#fff0da',3);light.position.set(-4,9,12);scene.add(light);scene.add(model);
 const camera=new T.PerspectiveCamera(35,1,.1,100);camera.position.set(2,2.4,7);camera.lookAt(0,1,0);renderer.setViewport(column*320,(4-row)*320,320,320);renderer.setScissor(column*320,(4-row)*320,320,320);renderer.render(scene,camera);
 const calls=renderer.info.render.calls,triangles=renderer.info.render.triangles;
 const label=document.createElement('div');label.className='label';label.textContent=card.name;const small=document.createElement('small');small.textContent=card.id+' · '+model.userData.profile.tokenAnatomy;label.append(small);document.querySelector('#labels').append(label);
 const buffers=model.children.map(m=>[m.geometry,m.geometry.attributes.position.array,m.geometry.attributes.position.version]);const anim=createHologramPoseAnimation(model,{kind:'attack'});anim.update(.48);renderer.render(scene,camera);const bufferStable=model.children.every((m,i)=>m.geometry===buffers[i][0]&&m.geometry.attributes.position.array===buffers[i][1]&&m.geometry.attributes.position.version===buffers[i][2]);anim.dispose();renderer.render(scene,camera);
 measurements.push({id:card.id,name:card.name,profileId:model.userData.profile.id,anatomy:model.userData.profile.tokenAnatomy,meshes:model.userData.meshCount,triangleCount:model.userData.triangleCount,gpuCalls:calls,gpuTriangles:triangles,bufferStable,referenceImageId:model.userData.profile.tokenVisual.referenceImageId,parts:model.userData.partNames});model.traverse(mesh=>{mesh.geometry?.dispose();mesh.material?.dispose()});
 }const remainingGeometries=renderer.info.memory.geometries,remainingTextures=renderer.info.memory.textures,remainingPrograms=renderer.info.programs.length,webglVersion=renderer.getContext().getParameter(renderer.getContext().VERSION);renderer.dispose();return {measurements,remainingGeometries,remainingTextures,remainingPrograms,webglVersion};
}'''
def pins():return {s:hashlib.sha256((ROOT/s).read_bytes()).hexdigest() for s in SOURCES}
async def main():
 cards=json.loads((OUT/'cards.json').read_text());old=json.loads((OUT.parent/'before/cards.json').read_text());byid={c['id']:c for c in cards}
 families={}
 for card in cards:families.setdefault(card['anatomy'],card)
 sets=[('after-gallery',[byid[str(c['id'])] for c in old],'Même sélection de 25 codes que la capture avant.'),('anatomies-01',list(families.values())[:25],'Familles 1 à 25 sur 42.'),('anatomies-02',list(families.values())[25:],'Familles 26 à 42 sur 42.')]
 printed=[c for c in cards if c['reference']]
 for i in range(0,len(cards),25):sets.append((f'all-tokens-{i//25+1:02}',cards[i:i+25],'240 codes natifs exacts ; modèles stylisés, références et limites documentées.'))
 result={'beforePins':pins(),'sets':[],'errors':[]}
 async with async_playwright() as p:
  browser=await p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
  page=await browser.new_page(viewport={'width':1600,'height':1680},device_scale_factor=1)
  page.on('pageerror',lambda e:result['errors'].append(str(e)))
  page.on('console',lambda m:result['errors'].append(m.text) if m.type=='error' else None)
  await page.route('**/favicon.ico',lambda route:route.fulfill(status=204))
  await page.goto('http://127.0.0.1:5198/package.json',wait_until='domcontentloaded')
  for name,cs,label in sets:
   await page.set_content(HTML)
   data=await page.evaluate(MODULE,{'cards':cs,'label':label})
   await page.screenshot(path=str(OUT/f'{name}.png'),full_page=True)
   result['sets'].append({'name':name,**data});print(json.dumps({'gallery':name,'models':len(cs),'remaining':data['remainingGeometries']}),flush=True)
  await browser.close()
 result['afterPins']=pins();(OUT/'webgl-audit.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
 print(json.dumps({'errors':result['errors'],'stablePins':result['beforePins']==result['afterPins'],'sets':len(result['sets'])}),flush=True)
asyncio.run(main())
