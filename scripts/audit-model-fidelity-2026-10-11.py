#!/usr/bin/env python3
"""Controlled real-WebGL galleries for the model fidelity refinement wave.

This isolated source audit never builds or starts the application. The baseline
must be immutable and is served separately from the candidate. Camera settings
are recorded in the before report and reused verbatim for after captures. The
original artwork and catalogue portrait are labelled separately from the model.
"""
import argparse
import hashlib
import json
from pathlib import Path
import time
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
SOURCES = [
 'src/ui/HologramMonsterModels.js','src/ui/CombatVisualProfiles.js',
 'src/ui/HologramPoseAnimation.js','src/ui/HologramReferenceAnatomy.js',
 'src/ui/HologramPopularGodModels.js','src/ui/HologramPopularStapleModels.js',
 'src/ui/HologramTokenModels.js','src/ui/HologramTokenGeometry.js',
 'src/ui/HologramTokenCreatureModels.js','src/ui/HologramTokenConstructModels.js',
 'src/ui/HologramTokenBotanicalModels.js','src/ui/HologramTokenSpiritModels.js',
 'src/ui/HologramTokenIllustratedExceptions.js','src/ui/TokenMonsterModelProfiles.js',
 'src/ui/DuelistAvatarModels.js','src/ui/DuelistAvatarGestures.js',
 'src/ui/DuelistAvatarPortrait.js','src/content/DuelistAvatarCatalog.js']
HTML = '''<!doctype html><html lang="fr"><meta charset="utf-8"><link rel="icon" href="data:,"><title>Audit fidélité des modèles</title>
<style>*{box-sizing:border-box}body{margin:0;background:#101925;color:#eff5fb;font:14px system-ui}h1{margin:16px 24px 4px;font-size:24px}p{margin:0 24px 12px;color:#b3c5da;height:21px}canvas{display:block}#labels{position:absolute;top:82px;left:0;width:1500px;display:grid;grid-template-columns:repeat(5,300px);grid-auto-rows:300px;pointer-events:none}.cell{position:relative;height:300px}.label{position:absolute;bottom:0;left:0;right:0;text-align:center;padding:8px;background:linear-gradient(transparent,#101925);font-weight:700;font-size:12px}.label small{display:block;color:#aad7e1;font-size:10px;margin-top:3px;font-weight:400}.reference{position:absolute;top:8px;right:8px;width:75px;height:75px;border:1px solid #637686;border-radius:5px;object-fit:cover;background:#172638}.portrait{position:absolute;top:8px;right:8px;width:58px;height:70px;border:1px solid #637686;border-radius:5px;background:#172638}.portrait svg{width:100%;height:100%}.refnote{position:absolute;top:87px;right:6px;font-size:8px;color:#bacbd5;width:79px;text-align:center}</style>
<h1 id="title"></h1><p id="subtitle"></p><canvas></canvas><div id="labels"></div></html>'''
INVENTORY = '''async()=>{
 const {SUPPORTED_HOLOGRAM_MODEL_IDS,resolveHologramMonsterProfile}=await import('/src/ui/CombatVisualProfiles.js');
 const {DUELIST_AVATARS}=await import('/src/content/DuelistAvatarCatalog.js');
 const entries=SUPPORTED_HOLOGRAM_MODEL_IDS.map(id=>{const p=resolveHologramMonsterProfile({id});return {kind:p.family==='token'?'token':'monster',id,name:p.family==='token'?p.tokenVisual.nativeName:p.id,reference:p.referenceArt||null,anatomy:p.tokenAnatomy||p.anatomy||p.family};});
 return [...entries,...DUELIST_AVATARS.map(a=>({kind:'avatar',id:a.id,name:a.name,anatomy:a.visual.hairStyle,reference:null}))];
}'''
RENDER = '''async (options)=>{
 const T=await import('/node_modules/.vite/deps/three.js');
 const {createHologramMonsterModel}=await import('/src/ui/HologramMonsterModels.js');
 const {createHologramPoseAnimation}=await import('/src/ui/HologramPoseAnimation.js');
 const {createDuelistAvatarModel}=await import('/src/ui/DuelistAvatarModels.js');
 const {renderDuelistAvatarPortrait}=await import('/src/ui/DuelistAvatarPortrait.js');
 const renderer=new T.WebGLRenderer({canvas:document.querySelector('canvas'),antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(1);renderer.setSize(1500,1500);renderer.setScissorTest(true);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;
 document.querySelector('#title').textContent=options.phase+' — '+options.label;
 document.querySelector('#subtitle').textContent='Lumières, pose et caméra contrôlées · illustrations originales et portraits du catalogue distingués · volumes procéduraux';
 const measurements=[];
 const hex=async values=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',values))].map(v=>v.toString(16).padStart(2,'0')).join('');
 const memory=()=>({geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures,programs:renderer.info.programs.length});
 for(let index=0;index<options.entries.length;index++){
  const entry=options.entries[index],row=Math.floor(index/5),column=index%5;
  const buildStart=performance.now();const avatar=entry.kind==='avatar'?createDuelistAvatarModel(entry.id,{reducedMotion:true}):null;
  const model=avatar?avatar.group:createHologramMonsterModel({id:entry.id});if(avatar)avatar.update(0,{reducedMotion:true});const buildMs=performance.now()-buildStart;
  const scene=new T.Scene();scene.background=new T.Color(index%2?'#142033':'#182a40');scene.add(new T.HemisphereLight('#ebf4ff','#6b7b8a',2));const light=new T.DirectionalLight('#fff0da',3);light.position.set(-4,9,12);scene.add(light);const rim=new T.DirectionalLight('#a2c9ff',.7);rim.position.set(5,5,-5);scene.add(rim);scene.add(model);
  model.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(model),size=bounds.getSize(new T.Vector3()),center=bounds.getCenter(new T.Vector3());
  const key=entry.kind+':'+entry.id,oldCamera=options.cameras?.[key];const distance=Math.max(size.x,size.y,size.z)*2.08;
  const cameraSpec=oldCamera||{position:[center.x+distance*.24,center.y+distance*.12,center.z+distance],target:center.toArray(),fov:34};
  const camera=new T.PerspectiveCamera(cameraSpec.fov,1,.05,200);camera.position.set(...cameraSpec.position);camera.lookAt(...cameraSpec.target);camera.updateMatrixWorld();
  const geometry=[];let finite=true,geometryBytes=0;
  model.traverse(o=>{if(!o.isMesh)return;const attributes={};for(const [name,attr]of Object.entries(o.geometry.attributes)){if(!Array.from(attr.array).every(Number.isFinite))finite=false;geometryBytes+=attr.array.byteLength;attributes[name]={array:attr.array,bytes:new Uint8Array(attr.array.buffer,attr.array.byteOffset,attr.array.byteLength).slice(),version:attr.version,itemSize:attr.itemSize};}geometry.push({mesh:o,geometry:o.geometry,attributes});});
  const hashes=[];for(const g of geometry){const attrs={};for(const [name,attr]of Object.entries(g.attributes))attrs[name]=await hex(new Uint8Array(attr.array.buffer,attr.array.byteOffset,attr.array.byteLength));hashes.push(attrs);}
  const totalTriangles=geometry.reduce((sum,g)=>sum+(g.geometry.index?g.geometry.index.count:g.geometry.attributes.position.count)/3,0);
  renderer.setViewport(column*300,(4-row)*300,300,300);renderer.setScissor(column*300,(4-row)*300,300,300);const renderStart=performance.now();renderer.render(scene,camera);const firstRenderMs=performance.now()-renderStart;
  const calls=renderer.info.render.calls,gpuTriangles=renderer.info.render.triangles,allocated=memory();
  const frameTimes=[];for(let frame=0;frame<4;frame++){const start=performance.now();renderer.render(scene,camera);renderer.getContext().finish();frameTimes.push(performance.now()-start);}
  let action=null;
  if(avatar){avatar.playGesture('summon');avatar.update(.01,{reducedMotion:false});avatar.update(.52,{reducedMotion:false});renderer.render(scene,camera);avatar.clearGesture();avatar.resetPose();avatar.update(0,{reducedMotion:true});}
  else{action=createHologramPoseAnimation(model,{kind:'attack'});action.update(.48);renderer.render(scene,camera);action.dispose();}
  const bufferStable=geometry.every(g=>g.mesh.geometry===g.geometry&&Object.entries(g.attributes).every(([name,a])=>g.geometry.attributes[name].array===a.array&&g.geometry.attributes[name].version===a.version&&new Uint8Array(a.array.buffer,a.array.byteOffset,a.array.byteLength).every((value,index)=>a.bytes[index]===value)));
  renderer.render(scene,camera);
  const cell=document.createElement('div');cell.className='cell';const label=document.createElement('div');label.className='label';label.textContent=entry.name||entry.id;const sub=document.createElement('small');sub.textContent=entry.id+' · '+entry.anatomy+' · '+Math.round(totalTriangles)+' triangles';label.append(sub);cell.append(label);
  if(entry.reference){const reference=document.createElement('img');reference.className='reference';reference.src=entry.reference;reference.alt='Illustration originale '+entry.id;cell.append(reference);const note=document.createElement('div');note.className='refnote';note.textContent='Illustration originale';cell.append(note);}
  else if(avatar){const portrait=document.createElement('div');portrait.className='portrait';portrait.innerHTML=renderDuelistAvatarPortrait(entry.id);cell.append(portrait);const note=document.createElement('div');note.className='refnote';note.textContent='Portrait catalogue';cell.append(note);}
  document.querySelector('#labels').append(cell);
  const parts=model.userData.partNames||[];
  if(avatar)avatar.dispose();else{model.traverse(o=>o.geometry?.dispose());const materials=new Set();model.traverse(o=>{if(o.material)materials.add(o.material);});materials.forEach(m=>m.dispose());}
  measurements.push({key,id:entry.id,kind:entry.kind,anatomy:entry.anatomy,partNames:parts,partCount:parts.length,triangles:totalTriangles,gpuTriangles,gpuCalls:calls,geometryBytes,geometryHash:await hex(new TextEncoder().encode(JSON.stringify(hashes))),bufferStable,finite,camera:cameraSpec,bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()},buildMs,firstRenderMs,steadyFrameMs:frameTimes,allocated,afterDispose:memory()});
 }
 await Promise.all([...document.querySelectorAll('img.reference')].map(img=>img.decode()));
 const remaining=memory(),webglVersion=renderer.getContext().getParameter(renderer.getContext().VERSION);window.__fidelityDisposeRenderer=()=>{renderer.dispose();renderer.forceContextLoss();delete window.__fidelityDisposeRenderer;};return {measurements,remaining,webglVersion};
}'''

def pins(root):
 return {name:{'bytes':(root/name).stat().st_size,'sha256':hashlib.sha256((root/name).read_bytes()).hexdigest()} for name in SOURCES}

def main():
 parser=argparse.ArgumentParser(description=__doc__)
 parser.add_argument('--base-url',required=True)
 parser.add_argument('--source-root',type=Path,default=ROOT)
 parser.add_argument('--output-dir',type=Path,required=True)
 parser.add_argument('--phase',choices=['before','after'],required=True)
 parser.add_argument('--baseline-report',type=Path)
 args=parser.parse_args();out=args.output_dir;out.mkdir(parents=True,exist_ok=True)
 before=pins(args.source_root);report={'phase':args.phase,'scope':'isolated source WebGL; not a compiled Duel; SwiftShader timing is a controlled comparison, not a hardware mobile FPS guarantee','driver':{'path':str(Path(__file__)),'bytes':Path(__file__).stat().st_size,'sha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest()},'sourcePinsBefore':before,'errors':[],'httpErrors':[],'sets':[],'cameras':{}}
 cameras=json.loads(args.baseline_report.read_text())['cameras'] if args.baseline_report else {}
 if args.phase=='after' and not args.baseline_report:parser.error('--baseline-report is required for after')
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
  page=browser.new_page(viewport={'width':1500,'height':1582},device_scale_factor=1)
  page.on('pageerror',lambda e:report['errors'].append(str(e)))
  page.on('console',lambda m:report['errors'].append(m.text) if m.type=='error' else None)
  page.on('response',lambda r:report['httpErrors'].append({'status':r.status,'url':r.url}) if r.status>=400 else None)
  page.route('**/favicon.ico',lambda route:route.fulfill(status=204))
  page.goto(args.base_url.rstrip('/')+'/package.json',wait_until='domcontentloaded')
  entries=page.evaluate(INVENTORY)
  counts={kind:sum(e['kind']==kind for e in entries)for kind in ('token','avatar','monster')}
  assert counts=={'token':240,'avatar':192,'monster':36},counts
  report['counts']=counts
  for kind in ('token','avatar','monster'):
   group=[e for e in entries if e['kind']==kind]
   for start in range(0,len(group),25):
    label=f'{kind}s-{start//25+1:02}';page.set_content(HTML)
    data=page.evaluate(RENDER,{'phase':args.phase,'label':label,'entries':group[start:start+25],'cameras':cameras})
    page.screenshot(path=str(out/(label+'.png')),full_page=True)
    page.evaluate('window.__fidelityDisposeRenderer()')
    report['sets'].append({'name':label,**data})
    for row in data['measurements']:report['cameras'][row['key']]=row['camera']
    print(json.dumps({'phase':args.phase,'gallery':label,'models':len(data['measurements']),'remaining':data['remaining']}),flush=True)
  browser.close()
 report['sourcePinsAfter']=pins(args.source_root);report['stableSources']=before==report['sourcePinsAfter']
 rows=[r for s in report['sets']for r in s['measurements']]
 report['ok']=report['stableSources'] and not report['errors'] and not report['httpErrors'] and len(rows)==468 and all(r['finite'] and r['bufferStable'] and r['afterDispose']['geometries']==0 and r['afterDispose']['textures']==0 for r in rows)
 if args.baseline_report:
  old={r['key']:r for s in json.loads(args.baseline_report.read_text())['sets'] for r in s['measurements']}
  report['budgetRatios']={r['key']:{'beforeTriangles':old[r['key']]['triangles'],'afterTriangles':r['triangles'],'ratio':r['triangles']/old[r['key']]['triangles'],'sameCamera':old[r['key']]['camera']==r['camera'],'geometryChanged':old[r['key']]['geometryHash']!=r['geometryHash']} for r in rows}
  report['ok']=report['ok'] and all(v['ratio']<=5 and v['sameCamera'] for v in report['budgetRatios'].values())
 (out/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
 print(json.dumps({'ok':report['ok'],'counts':report['counts'],'sourceStable':report['stableSources'],'errors':report['errors'],'reportSha256':hashlib.sha256((out/'report.json').read_bytes()).hexdigest()}),flush=True)
 if not report['ok']:raise SystemExit(1)

if __name__=='__main__':main()
