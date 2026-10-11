import asyncio, hashlib, json
from pathlib import Path
from playwright.async_api import async_playwright

OUTPUT=Path('/workspace/yugioh-token-models-2026-10-11/construct-refinement')
HTML='''<!doctype html><html><head><meta charset="utf-8"><style>*{box-sizing:border-box}body{margin:0;background:#101925;color:#eff5fb;font:14px system-ui}h1{margin:18px 25px 3px;font-size:24px}p{margin:0 25px 14px;color:#8ca6bc}canvas{display:block}#labels{position:absolute;top:80px;left:0;width:1280px;display:grid;grid-template-columns:repeat(4,320px);grid-auto-rows:320px;pointer-events:none}.label{align-self:end;text-align:center;padding:12px;background:linear-gradient(transparent,#101925);font-weight:700}.label small{display:block;color:#89c5d3;font-size:11px;margin-top:3px;font-weight:400}</style></head><body><h1>Jetons — corrections des constructions</h1><p>Références exactes inspectées : neuf modèles corrigés, rendu réel de la factory.</p><canvas></canvas><div id="labels"></div></body></html>'''

MODULE='''async (cards) => {
 const T=await import('/node_modules/.vite/deps/three.js');const {createHologramMonsterModel}=await import('/src/ui/HologramMonsterModels.js');
 const renderer=new T.WebGLRenderer({canvas:document.querySelector('canvas'),antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(1);renderer.setSize(1280,960);renderer.setScissorTest(true);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;
 const measurements=[];
 for(let index=0;index<cards.length;index++){
 const card=cards[index],row=Math.floor(index/4),column=index%4,model=createHologramMonsterModel({...card,id:String(card.id),type:'Token Monster',isToken:true,attribute:'EARTH'});
 const scene=new T.Scene();scene.background=new T.Color(index%2?'#142033':'#182a40');scene.add(new T.HemisphereLight('#ebf4ff','#6b7b8a',2));const light=new T.DirectionalLight('#fff0da',3);light.position.set(-4,9,12);scene.add(light);scene.add(model);
 const camera=new T.PerspectiveCamera(35,1,.1,100);camera.position.set(2,2.4,7);camera.lookAt(0,1,0);renderer.setViewport(column*320,(2-row)*320,320,320);renderer.setScissor(column*320,(2-row)*320,320,320);renderer.render(scene,camera);
 const label=document.createElement('div');label.className='label';label.textContent=card.name;const small=document.createElement('small');small.textContent=String(card.id);label.append(small);document.querySelector('#labels').append(label);
 measurements.push({id:card.id,name:card.name,profile:model.userData.profile,parts:model.userData.partNames,meshes:model.userData.meshCount,triangleCount:model.userData.triangleCount});model.traverse(mesh=>{mesh.geometry?.dispose();mesh.material?.dispose()});
 }renderer.dispose();return measurements;
}'''

async def main():
 OUTPUT.mkdir(exist_ok=True)
 async with async_playwright() as p:
  browser=await p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
  page=await browser.new_page(viewport={'width':1280,'height':1040},device_scale_factor=1)
  await page.goto('http://127.0.0.1:5198/package.json',wait_until='domcontentloaded')
  await page.set_content(HTML)
  measurements=await page.evaluate(MODULE,json.loads((OUTPUT/'final-cards.json').read_text()))
  await page.screenshot(path=str(OUTPUT/'construct-final-gallery.png'),full_page=True)
  (OUTPUT/'construct-final-gallery.json').write_text(json.dumps(measurements,ensure_ascii=False,indent=2)+'\n')
  sources=['src/ui/HologramMonsterModels.js','src/ui/CombatVisualProfiles.js','src/ui/HologramPoseAnimation.js']
  (OUTPUT/'construct-final-gallery-pins.json').write_text(json.dumps({source:hashlib.sha256((Path('/workspace/yugioh-25d-holograms')/source).read_bytes()).hexdigest()for source in sources},indent=2)+'\n')
  print(json.dumps({'tokens':len(measurements),'maxTriangles':max(m['triangleCount'] for m in measurements),'imageSha256':hashlib.sha256((OUTPUT/'construct-final-gallery.png').read_bytes()).hexdigest()}))
  await browser.close()

asyncio.run(main())
