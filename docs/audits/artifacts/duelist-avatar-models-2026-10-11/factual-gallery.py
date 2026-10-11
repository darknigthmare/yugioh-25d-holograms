import asyncio, hashlib, json
from pathlib import Path
from playwright.async_api import async_playwright
OUTPUT=Path('/workspace/yugioh-avatar-motion-2026-10-11')
HTML='''<!doctype html><html><head><meta charset="utf-8"><style>*{box-sizing:border-box}body{margin:0;background:#101925;color:#eff5fb;font:14px system-ui}h1{margin:18px 25px 4px;font-size:24px}p{margin:0 25px 15px;color:#b4c8d8}canvas{display:block}#labels{position:absolute;top:81px;left:0;width:1440px;display:grid;grid-template-columns:repeat(4,360px);grid-auto-rows:440px;pointer-events:none}.cell{position:relative}.label{position:absolute;bottom:0;left:0;right:0;text-align:center;padding:10px;background:linear-gradient(transparent,#101925);font-weight:700}.label small{display:block;color:#b8d8e2;font-size:12px;margin-top:4px;font-weight:400}.portrait{position:absolute;top:12px;left:12px;width:90px;height:108px;border:1px solid #355066;border-radius:8px;background:#172638}.portrait svg{width:100%;height:100%}</style></head><body><h1>Identités corrigées — mêmes profils canoniques en SVG et WebGL</h1><p>Avatars stylisés ; les formes animales sont des adaptations bipèdes de duellistes. Coiffes, bas, gants, cape et espèces sont explicites.</p><canvas></canvas><div id="labels"></div></body></html>'''
MODULE='''async () => {
 const T=await import('/node_modules/.vite/deps/three.js');
 const {createDuelistAvatarModel}=await import('/src/ui/DuelistAvatarModels.js');
 const {getDuelistAvatar}=await import('/src/content/DuelistAvatarCatalog.js');
 const {renderDuelistAvatarPortrait}=await import('/src/ui/DuelistAvatarPortrait.js');
 const ids=['playmaker','yudias','yuga','romin','luke','gakuto','zwijo','nyandestar','bochi','chupataro','girag','dr-faker'];
 const notes=['Armure verte · coiffe or · pointes rouges/mauves','Manteau blanc · casque noir · cape bleue','Veste rouge · shorts noirs · gants bleus','Haut noir · shorts rouges · leggings lavande','Haut noir · pantalon olive','Cheveux mauves au carré','Cheveux blonds · pointes mauves','Chat gris · étoile verte · oreilles · queue','Chien brun/blanc · oreilles dressées · collier','Apparence humaine · rose/vert · jean bleu','Carrure massive · chemise blanche ouverte','Robe complète · cheveux verts étoilés'];
 const renderer=new T.WebGLRenderer({canvas:document.querySelector('canvas'),antialias:true,preserveDrawingBuffer:true});
 renderer.setPixelRatio(1);renderer.setSize(1440,1320);renderer.setScissorTest(true);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;
 const models=[],measurements=[];
 for(let index=0;index<ids.length;index++){
  const row=Math.floor(index/4),column=index%4,id=ids[index],avatar=getDuelistAvatar(id),model=createDuelistAvatarModel(id);models.push(model);model.update(0,{reducedMotion:true});
  const scene=new T.Scene();scene.background=new T.Color(index%2?'#142033':'#182a40');
  scene.add(new T.HemisphereLight('#ebf4ff','#6b7b8a',2.0));const light=new T.DirectionalLight('#fff0da',3);light.position.set(-4,9,12);scene.add(light);scene.add(model.group);
  const camera=new T.PerspectiveCamera(33,360/440,.1,100);camera.position.set(6,5.6,18.5);camera.lookAt(0,3.6,0);camera.updateMatrixWorld();
  renderer.setViewport(column*360,(2-row)*440,360,440);renderer.setScissor(column*360,(2-row)*440,360,440);renderer.render(scene,camera);
  const cell=document.createElement('div');cell.className='cell';const label=document.createElement('div');label.className='label';label.textContent=avatar.name;const note=document.createElement('small');note.textContent=notes[index];label.append(note);const portrait=document.createElement('div');portrait.className='portrait';portrait.innerHTML=renderDuelistAvatarPortrait(id);cell.append(portrait,label);document.querySelector('#labels').append(cell);
  measurements.push({avatarId:id,visual:avatar.visual,drawCalls:model.group.userData.drawCalls,triangles:model.group.userData.triangles,parts:model.group.userData.partNames});
 }
 const memoryBefore={...renderer.info.memory};for(const model of models)model.dispose();const memoryAfter={...renderer.info.memory};renderer.dispose();return {measurements,memoryBefore,memoryAfter};
}'''
async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
  page=await browser.new_page(viewport={'width':1440,'height':1401},device_scale_factor=1)
  await page.goto('http://127.0.0.1:5198/package.json',wait_until='domcontentloaded');await page.set_content(HTML)
  measurements=await page.evaluate(MODULE)
  await page.screenshot(path=str(OUTPUT/'factual-gallery.png'),full_page=True)
  (OUTPUT/'factual-gallery.json').write_text(json.dumps(measurements,ensure_ascii=False,indent=2)+'\n')
  sources=['src/ui/DuelistAvatarModels.js','src/ui/DuelistAvatarGestures.js','src/ui/DuelistAvatarPortrait.js','src/content/DuelistAvatarCatalog.js']
  (OUTPUT/'factual-gallery-pins.json').write_text(json.dumps({source:hashlib.sha256((Path('/workspace/yugioh-25d-holograms')/source).read_bytes()).hexdigest()for source in sources},indent=2)+'\n')
  print(json.dumps({'models':len(measurements['measurements']),'memoryAfter':measurements['memoryAfter'],'imageSha256':hashlib.sha256((OUTPUT/'factual-gallery.png').read_bytes()).hexdigest()}))
  await browser.close()
asyncio.run(main())
