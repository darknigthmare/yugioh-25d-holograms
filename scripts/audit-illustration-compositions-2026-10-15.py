#!/usr/bin/env python3
"""Independent source and public-DOM evidence for printed multi-subject artwork.

This source fixture uses the exported atlas-preview API without a Duel, engine,
application object or private QA hook. Each model is rendered as actual WebGL
geometry beside its unchanged reference scan. The compiled-public application
must be checked separately after the coordinator freezes and builds its source.
Normalized reference landmarks are independently inspected approximate points,
not a photogrammetric certificate or a claim that unseen geometry is 1:1.
"""
import argparse
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
ENTRIES = [
 {'id':'commemorative:YGLD-ENTKN','reference':'/tokens/commemorative/YGLD-ENTKN.png','crop':[123,267,882,1025], 'landmarks':[{'name':'Yami face','u':.513,'v':.373},{'name':'cards','u':.440,'v':.693},{'name':'Duel Disk','u':.768,'v':.723}]},
 {'id':'commemorative:LDK2-ENT01','reference':'/tokens/commemorative/LDK2-ENT01.png','crop':[52,122,426,497], 'landmarks':[{'name':'Yami face foreground','u':.695,'v':.488},{'name':'Dark Magician face rear left','u':.171,'v':.408},{'name':'upright card','u':.457,'v':.344},{'name':'Duel Disk','u':.703,'v':.803}]},
 {'id':'commemorative:LDK2-ENT02','reference':'/tokens/commemorative/LDK2-ENT02.png','crop':[52,122,426,497], 'landmarks':[{'name':'Kaiba face','u':.604,'v':.368},{'name':'Blue-Eyes head rear left','u':.179,'v':.269},{'name':'cyan breath focus','u':.174,'v':.523},{'name':'Duel Disk','u':.652,'v':.795}]},
 {'id':'commemorative:LDK2-ENT03','reference':'/tokens/commemorative/LDK2-ENT03.png','crop':[52,122,426,497], 'landmarks':[{'name':'Joey face','u':.644,'v':.403},{'name':'Red-Eyes head rear left','u':.275,'v':.373},{'name':'dragon luminous focus','u':.254,'v':.475},{'name':'Duel Disk','u':.837,'v':.828}]},
 {'id':'duel:43664495','reference':'/tokens/reviewed/43664495.png','crop':[120,285,937,1094], 'landmarks':[]},
 {'id':'duel:58371672','reference':'/tokens/reviewed/58371672.png','crop':[54,121,421,490], 'landmarks':[]},
]
ANGLES=[('front',0),('three-quarter',.7853981633974483),('profile',1.5707963267948966),('back',3.141592653589793)]
HTML='''<!doctype html><html lang="fr"><meta charset="utf-8"><link rel="icon" href="data:,"><title>Compositions illustrées : QA indépendante</title><style>*{box-sizing:border-box}body{margin:0;background:#102030;color:#f1f5ff;font:14px system-ui}h1{font-size:22px;margin:18px 24px 4px}p{margin:5px 24px 15px;color:#b9cee0}main{display:grid;grid-template-columns:600px 720px;gap:20px;margin:0 20px}.frame{position:relative;background:#0d1826}#reference{display:block;width:600px;height:600px}#stage{width:720px;height:720px}#stage canvas{display:block;width:100%;height:100%}#notes{padding:10px;white-space:pre-wrap;font:12px monospace;color:#b9cee0}figcaption{padding:10px 0}</style><h1></h1><p>Scan original à gauche · vraie géométrie WebGL à droite · positions observées dans le cadre illustré.</p><main><section><canvas id="reference" width="600" height="600"></canvas><figcaption>Cadre de l’illustration imprimée ; scan inchangé.</figcaption><div id="notes"></div></section><section><div id="stage" role="region" tabindex="0"></div><figcaption>Modèles procéduraux ; surfaces non visibles dans le scan inférées.</figcaption></section></main></html>'''
SETUP=r'''async entry => {
 const {createTokenModelAtlasPreview}=await import('/src/ui/TokenModelAtlasPreview.js');
 const {getTokenPresentationProfile}=await import('/src/ui/TokenMonsterProfiles.js');
 const transformed=await (await fetch('/src/ui/TokenModelAtlasPreview.js')).text();
 const threeUrl=transformed.match(/from\s+[\"']([^\"']*three\.js[^\"']*)[\"']/)?.[1];
 if(!threeUrl)throw Error('Transformed Three import not found');
 const T=await import(threeUrl);
 const profile=getTokenPresentationProfile(entry.id);
 if(!profile)throw Error('Unknown presentation '+entry.id);
 const stage=document.querySelector('#stage');
 const preview=await createTokenModelAtlasPreview(stage,profile,{isActive:()=>true});
 if(!preview?.model)throw Error('No geometry for '+entry.id);
 window.__illustrationFixture={preview,T,geometry:[],entry};
 const f=window.__illustrationFixture;
 preview.model.traverse(o=>{if(!o.isMesh)return;const attributes={};for(const[n,a]of Object.entries(o.geometry.attributes))attributes[n]={array:a.array,copy:new Uint8Array(a.array.buffer,a.array.byteOffset,a.array.byteLength).slice(),version:a.version};const ix=o.geometry.index;f.geometry.push({mesh:o,geometry:o.geometry,attributes,index:ix?{array:ix.array,copy:new Uint8Array(ix.array.buffer,ix.array.byteOffset,ix.array.byteLength).slice(),version:ix.version}:null});});
 const reference=new Image();reference.src=entry.reference;await reference.decode();const [x,y,x2,y2]=entry.crop;
 document.querySelector('#reference').getContext('2d').drawImage(reference,x,y,x2-x,y2-y,0,0,600,600);
 document.querySelector('h1').textContent=entry.id;
 document.querySelector('#notes').textContent='Repères indépendants approximatifs :\n'+entry.landmarks.map(l=>`${l.name}: (${l.u.toFixed(3)}, ${l.v.toFixed(3)})`).join('\n');
 return {profile,reference:{width:reference.naturalWidth,height:reference.naturalHeight,crop:entry.crop}};
}'''
MEASURE=r'''async angle=>{
 const f=window.__illustrationFixture,{preview:p,T}=f;
 p.angle=angle;p.render();p.model.updateMatrixWorld(true);p.camera.updateMatrixWorld(true);
 const hash=async data=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',data))].map(x=>x.toString(16).padStart(2,'0')).join('');
 const point=v=>{const a=v.clone().project(p.camera);return {u:(a.x+1)/2,v:(1-a.y)/2,depth:a.z};};
 const bounds=o=>{const b=new T.Box3().setFromObject(o);return b.isEmpty()?null:{min:b.min.toArray(),max:b.max.toArray(),center:point(b.getCenter(new T.Vector3()))};};
 const simple=v=>JSON.parse(JSON.stringify(v,(key,value)=>typeof value==='function'?undefined:value));
 const groups=[];p.model.traverse(o=>{if(o===p.model||o.isMesh)return;let triangles=0,meshes=0;const textureNames=[];o.traverse(c=>{if(!c.isMesh)return;meshes++;triangles+=(c.geometry.index?c.geometry.index.count:c.geometry.attributes.position.count)/3;for(const m of Array.isArray(c.material)?c.material:[c.material])if(m?.map)textureNames.push(m.map.name||m.map.source?.data?.src||'unnamed texture');});if(!meshes)return;const landmarks={};for(const[name,v]of Object.entries(o.userData?.illustrationLandmarks||{})){const xyz=Array.isArray(v)?v:v?.position||v?.local||null;if(xyz?.length===3)landmarks[name]=point(o.localToWorld(new T.Vector3(...xyz)));}groups.push({name:o.name,uuid:o.uuid,type:o.type,triangles,meshes,position:o.position.toArray(),scale:o.scale.toArray(),bounds:bounds(o),landmarks,userData:simple(o.userData),textureNames});});
 let triangles=0,normalCount=0,nonUnitNormals=0,nonFiniteValues=0,geometryBytes=0;const digests=[],meshes=[];
 for(const g of f.geometry){const geo=g.geometry;triangles+=(geo.index?geo.index.count:geo.attributes.position.count)/3;const row={name:g.mesh.name,attributes:{},material:[]};for(const[n,a]of Object.entries(geo.attributes)){geometryBytes+=a.array.byteLength;for(const x of a.array)if(!Number.isFinite(x))nonFiniteValues++;row.attributes[n]=await hash(new Uint8Array(a.array.buffer,a.array.byteOffset,a.array.byteLength));if(n==='normal')for(let i=0;i<a.count;i++){normalCount++;if(Math.abs(Math.hypot(a.getX(i),a.getY(i),a.getZ(i))-1)>.0002)nonUnitNormals++;}}if(geo.index){geometryBytes+=geo.index.array.byteLength;row.index=await hash(new Uint8Array(geo.index.array.buffer,geo.index.array.byteOffset,geo.index.array.byteLength));}for(const m of Array.isArray(g.mesh.material)?g.mesh.material:[g.mesh.material])row.material.push({type:m.type,map:!!m.map,alphaMap:!!m.alphaMap,transparent:m.transparent,depthTest:m.depthTest,opacity:m.opacity});digests.push(row);meshes.push({name:g.mesh.name,type:geo.type,triangles:(geo.index?geo.index.count:geo.attributes.position.count)/3,worldBounds:bounds(g.mesh),material:row.material});}
 const gl=p.renderer.getContext();p.render();const w=gl.drawingBufferWidth,h=gl.drawingBufferHeight,rgba=new Uint8Array(w*h*4);gl.readPixels(0,0,w,h,gl.RGBA,gl.UNSIGNED_BYTE,rgba);const background=[...rgba.slice(0,4)];let nonBackgroundPixels=0;for(let i=0;i<rgba.length;i+=4)if(Math.hypot(rgba[i]-background[0],rgba[i+1]-background[1],rgba[i+2]-background[2])>15)nonBackgroundPixels++;
 const stable=f.geometry.every(g=>g.mesh.geometry===g.geometry&&Object.entries(g.attributes).every(([n,a])=>g.geometry.attributes[n].array===a.array&&g.geometry.attributes[n].version===a.version&&new Uint8Array(a.array.buffer,a.array.byteOffset,a.array.byteLength).every((v,i)=>v===a.copy[i]))&&(!g.index||(g.geometry.index.array===g.index.array&&g.geometry.index.version===g.index.version&&new Uint8Array(g.index.array.buffer,g.index.array.byteOffset,g.index.array.byteLength).every((v,i)=>v===g.index.copy[i]))));
 return {angle,triangles,normalCount,nonUnitNormals,nonFiniteValues,geometryBytes,geometryHash:await hash(new TextEncoder().encode(JSON.stringify(digests))),bufferStable:stable,meshCount:meshes.length,groups,meshes,modelUserData:simple(p.model.userData),modelBounds:bounds(p.model),camera:{type:p.camera.type,position:p.camera.position.toArray(),projection:p.camera.projectionMatrix.toArray()},render:{calls:p.renderer.info.render.calls,triangles:p.renderer.info.render.triangles,nonBackgroundPixels,width:w,height:h,pixelSha256:await hash(rgba),background},memory:{...p.renderer.info.memory,programs:p.renderer.info.programs.length}};
}'''
SOLO=r'''options=>{const f=window.__illustrationFixture,p=f.preview;if(!f.soloOriginal)f.soloOriginal={children:p.model.children.map(o=>o.visible),floor:p.floor.visible};const candidates=p.model.children.map((o,i)=>({o,i})).filter(({o})=>o.userData.illustrationSubject||o.name.startsWith('token-illustration-effects-'));if(options.list)return candidates.map(({o,i})=>({index:i,name:o.userData.illustrationSubject||o.name,effect:!o.userData.illustrationSubject}));p.model.children.forEach((o,i)=>o.visible=options.index==null?f.soloOriginal.children[i]:i===options.index);p.floor.visible=options.index==null?f.soloOriginal.floor:false;p.renderer.render(p.scene,p.camera);const gl=p.renderer.getContext(),w=gl.drawingBufferWidth,h=gl.drawingBufferHeight,rgba=new Uint8Array(w*h*4);gl.readPixels(0,0,w,h,gl.RGBA,gl.UNSIGNED_BYTE,rgba);let pixels=0;for(let i=0;i<rgba.length;i+=4)if(Math.hypot(rgba[i]-rgba[0],rgba[i+1]-rgba[1],rgba[i+2]-rgba[2])>15)pixels++;return {geometryDrawCalls:p.renderer.info.render.calls,renderedTriangles:p.renderer.info.render.triangles,nonBackgroundPixels:pixels,width:w,height:h};}'''
DISPOSE=r'''()=>{const f=window.__illustrationFixture;const r=f.preview.renderer;f.preview.dispose();const remaining={...r.info.memory,programs:r.info.programs?.length??null};delete window.__illustrationFixture;return remaining;}'''


def pin(path):
 return {'bytes':path.stat().st_size,'sha256':hashlib.sha256(path.read_bytes()).hexdigest()}


def source_pins(root):
 return {str(p.relative_to(root)):pin(p)for p in sorted((root/'src').rglob('*'))if p.is_file()}


def public_dom(browser,base,out):
 page=browser.new_page(viewport={'width':1440,'height':1050},reduced_motion='reduce')
 page.goto(base,wait_until='domcontentloaded');page.locator('#btn-open-token-atlas').click();rows=[]
 for entry in ENTRIES:
  page.locator('#token-atlas-search').fill(entry['id']);page.locator(f'#token-atlas-list button[data-token-presentation-id="{entry["id"]}"]').click()
  stage=page.locator('#token-atlas-preview');stage.scroll_into_view_if_needed();page.wait_for_function('id=>document.querySelector("canvas[data-token-atlas-canvas]")?.dataset.tokenPresentationId===id',arg=entry['id']);page.wait_for_timeout(350)
  name=entry['id'].replace(':','-');page.locator('#token-atlas-detail').screenshot(path=str(out/(name+'-public-detail.png')),timeout=60000)
  rows.append(page.locator('#token-atlas-detail').evaluate('(e)=>({presentationId:e.dataset.tokenPresentationId,text:e.innerText,canvasLabel:e.querySelector("canvas")?.getAttribute("aria-label"),stageDataset:{...e.querySelector("#token-atlas-preview").dataset},reference:e.querySelector("#token-atlas-reference-image")?.getAttribute("src")})'))
 page.locator('#token-atlas-close').click();page.close();return rows


def main():
 ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('--base-url',required=True);ap.add_argument('--source-root',type=Path,default=ROOT);ap.add_argument('--phase',choices=['before','after'],required=True);ap.add_argument('--output',type=Path,required=True);ap.add_argument('--public-dom',action='store_true');ap.add_argument('--baseline-report',type=Path);a=ap.parse_args();a.output.mkdir(parents=True,exist_ok=True)
 refs={e['reference']:pin(a.source_root/'public'/e['reference'].lstrip('/'))for e in ENTRIES}
 report={'executedAtUtc':datetime.now(timezone.utc).isoformat(),'scope':__doc__,'phase':a.phase,'driver':pin(Path(__file__)),'sourceRoot':str(a.source_root),'sourcePinsBefore':source_pins(a.source_root),'referencesBefore':refs,'independentLandmarks':ENTRIES,'angles':[{'name':n,'yaw':v}for n,v in ANGLES],'errors':[],'httpErrors':[],'models':[]}
 with sync_playwright() as p:
  b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']);page=b.new_page(viewport={'width':1360,'height':850},device_scale_factor=1,reduced_motion='reduce');page.route('**/favicon.ico',lambda route:route.fulfill(status=204));page.on('pageerror',lambda e:report['errors'].append(str(e)));page.on('response',lambda r:report['httpErrors'].append({'url':r.url,'status':r.status})if r.status>=400 else None);page.goto(a.base_url.rstrip('/')+'/package.json',wait_until='domcontentloaded')
  for entry in ENTRIES:
   page.set_content(HTML);setup=page.evaluate(SETUP,entry);row={'id':entry['id'],**setup,'views':[]};
   for name,yaw in ANGLES:
    view=page.evaluate(MEASURE,yaw);view['name']=name;row['views'].append(view);page.screenshot(path=str(a.output/(entry['id'].replace(':','-')+'-'+name+'.png')),full_page=True)
    if name=='front':
     row['isolations']=[]
     for subject in page.evaluate(SOLO,{'list':True}):
      observation=page.evaluate(SOLO,{'index':subject['index']});safe=''.join(c if c.isalnum()else'-'for c in subject['name']);page.screenshot(path=str(a.output/(entry['id'].replace(':','-')+'-isolated-'+safe+'.png')),full_page=True);row['isolations'].append({**subject,**observation})
     page.evaluate(SOLO,{'index':None})
   row['afterDispose']=page.evaluate(DISPOSE);report['models'].append(row);print(json.dumps({'phase':a.phase,'id':entry['id'],'triangles':row['views'][0]['triangles'],'remaining':row['afterDispose']}),flush=True)
  page.close()
  if a.public_dom:report['publicDom']=public_dom(b,a.base_url,a.output)
  b.close()
 report['sourcePinsAfter']=source_pins(a.source_root);report['referencesAfter']={e['reference']:pin(a.source_root/'public'/e['reference'].lstrip('/'))for e in ENTRIES};views=[v for m in report['models']for v in m['views']]
 if a.baseline_report:
  old=json.loads(a.baseline_report.read_text());report['baselineReport']={'path':str(a.baseline_report),**pin(a.baseline_report)};prior={m['id']:m for m in old['models']};report['comparisons']=[{'id':m['id'],'beforeTriangles':prior[m['id']]['views'][0]['triangles'],'afterTriangles':m['views'][0]['triangles'],'geometryChanged':prior[m['id']]['views'][0]['geometryHash']!=m['views'][0]['geometryHash'],'beforeRootGroups':len(prior[m['id']]['views'][0]['groups']),'afterRootGroups':len(m['views'][0]['groups'])}for m in report['models']]
 report['isolatedSubjectsHavePixels']=all(x['geometryDrawCalls']>0 and x['renderedTriangles']>0 and x['nonBackgroundPixels']>20 for m in report['models']for x in m['isolations'])
 report['ok']=report['isolatedSubjectsHavePixels']and not report['errors']and not report['httpErrors']and report['sourcePinsBefore']==report['sourcePinsAfter']and report['referencesBefore']==report['referencesAfter']and len(views)==24 and all(v['bufferStable']and not v['nonFiniteValues']and not v['nonUnitNormals']and v['render']['calls']>1 and v['render']['nonBackgroundPixels']>100 for v in views)and all(m['afterDispose']['geometries']==0 and m['afterDispose']['textures']==0 for m in report['models'])
 (a.output/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print(json.dumps({'ok':report['ok'],'views':len(views),'errors':report['errors'],'httpErrors':report['httpErrors'],'report':str(a.output/'report.json')}),flush=True)
 assert report['ok']



def load_retained(name, path):
 import importlib.util
 spec=importlib.util.spec_from_file_location(name,path);module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module);return module


def install_composition_contract(driver):
 """Change only the explicit old avatar-only presentation contract in memory."""
 import inspect
 changes={
  'assert_atlas_detail': [("        assert 'Silhouette stylisée' in page.locator('#token-atlas-info').inner_text()", "        assert 'Personnages de l’illustration' in page.locator('#token-atlas-info').inner_text()\n        for subject in profile['illustratedCharacters']:\n            assert ILLUSTRATION_SUBJECT_LABELS.get(subject,subject) in page.locator('.token-atlas-subjects').inner_text()\n        assert page.locator('canvas[data-token-atlas-canvas]').get_attribute('data-token-model-kind') == 'illustration-composition'\n        assert page.locator('canvas[data-token-atlas-canvas]').get_attribute('data-token-subject-count') == str(len(profile['illustratedCharacters']))")],
  'atlas_all_presentations': [
   ("assert current.get_attribute('data-token-model-kind') == 'duelist-avatar'", "assert current.get_attribute('data-token-model-kind') == 'illustration-composition'\n                    assert current.get_attribute('data-token-subject-count') == str(len(profile['illustratedCharacters']))"),
   ("assert page.locator('#token-atlas-preview').get_attribute('data-token-pose') == 'portrait'", "assert page.locator('#token-atlas-preview').get_attribute('data-token-pose') == 'illustration'"),
   ("                label_prefix = 'Silhouette 3D du duelliste' if profile.get('modelKind') == 'duelist-avatar' else 'Modèle 3D du Jeton'\n                assert current.get_attribute('aria-label') == label_prefix + ' : ' + profile['name']", "                expected_label = 'Composition 3D de l’illustration : ' + ' et '.join(profile['illustratedCharacters']) if profile.get('modelKind') == 'duelist-avatar' else 'Modèle 3D du Jeton : ' + profile['name']\n                assert current.get_attribute('aria-label') == expected_label")]
 }
 driver.ILLUSTRATION_SUBJECT_LABELS={'Dark Magician':'Magicien Sombre','Blue-Eyes White Dragon':'Dragon Blanc aux Yeux Bleus','Red-Eyes Black Dragon':'Dragon Noir aux Yeux Rouges'}
 adaptations=[]
 for name,replacements in changes.items():
  old=inspect.getsource(getattr(driver,name));new=old
  for before,after in replacements:
   assert new.count(before)==1,(name,before);new=new.replace(before,after)
  exec(compile(new,'<illustration-public-contract-2026-10-15:'+name+'>','exec'),driver.__dict__)
  adaptations.append({'name':name,'beforeSha256':hashlib.sha256(old.encode()).hexdigest(),'afterSha256':hashlib.sha256(new.encode()).hexdigest(),'replacements':[{'before':x,'after':y}for x,y in replacements]})
 return adaptations


COMPOSITION_OBSERVERS=r'''(() => {
 const journal={clears:[],intersections:[],lastIntersection:null};globalThis.__ILLUSTRATION_PUBLIC_OBSERVATIONS__=journal;
 for(const C of [globalThis.WebGLRenderingContext,globalThis.WebGL2RenderingContext]){
  if(!C)continue;const old=C.prototype.clear;
  Object.defineProperty(C.prototype,'clear',{configurable:true,writable:true,value:function(...args){const result=Reflect.apply(old,this,args);if(this.canvas?.hasAttribute('data-token-atlas-canvas'))journal.clears.push({time:performance.now(),presentationId:this.canvas.dataset.tokenPresentationId,subjectCount:this.canvas.dataset.tokenSubjectCount});return result;}});
 }
 const Original=globalThis.IntersectionObserver;
 if(Original)globalThis.IntersectionObserver=class extends Original{constructor(callback,options){super(function(...args){for(const e of args[0])if(e.target.id==='token-atlas-preview'){const b=e.target.getBoundingClientRect();const row={time:performance.now(),isIntersecting:e.isIntersecting,intersectionRatio:e.intersectionRatio,box:{x:b.x,y:b.y,width:b.width,height:b.height},entryTime:e.time};journal.intersections.push(row);journal.lastIntersection=row;}return Reflect.apply(callback,this,args);},options);}};
})();'''


def composition_snapshot(page):
 return page.evaluate('()=>{const o=globalThis.__ILLUSTRATION_PUBLIC_OBSERVATIONS__;return {time:performance.now(),clearCount:o.clears.length,lastIntersection:o.lastIntersection}}')


def install_compiled_composition_checks(driver):
 historical=driver.atlas_checks
 driver.BOOTSTRAP=COMPOSITION_OBSERVERS+'\n'+driver.BOOTSTRAP
 def atlas_checks(page,item,output,records,all_presentations=False):
  historical(page,item,output,records,all_presentations=all_presentations)
  storage=driver.atlas_storage(page);page.locator('#btn-open-token-atlas').click();page.locator('#token-atlas-modal').wait_for(state='visible');by_id={r['presentationId']:r for r in records};observed=[]
  for e in ENTRIES:
   profile=by_id[e['id']];driver.find_atlas_presentation(page,item,profile);driver.assert_atlas_detail(page,profile,load_reference=True);stage=page.locator('#token-atlas-preview');stage.scroll_into_view_if_needed();page.emulate_media(reduced_motion='reduce');page.wait_for_timeout(350);name=e['id'].replace(':','-');suffix=str(item['width']);first=output/f'illustration-{name}-front-{suffix}.png';second=output/f'illustration-{name}-paused-{suffix}.png';rotated=output/f'illustration-{name}-rotated-{suffix}.png';restored=output/f'illustration-{name}-restored-{suffix}.png';stage.screenshot(path=str(first));page.wait_for_timeout(350);start=composition_snapshot(page);page.wait_for_timeout(350);end=composition_snapshot(page);assert end['clearCount']==start['clearCount'],(e['id'],start,end);stage.screenshot(path=str(second));page.wait_for_timeout(350);after_second=composition_snapshot(page);assert after_second['clearCount']==start['clearCount'],(e['id'],after_second);assert first.read_bytes()==second.read_bytes(),e['id'];stage.focus();page.keyboard.press('ArrowRight');page.wait_for_timeout(100);assert driver.atlas_angle(page)==23;assert composition_snapshot(page)['clearCount']>end['clearCount'];stage.screenshot(path=str(rotated));assert rotated.read_bytes()!=first.read_bytes(),e['id'];page.keyboard.press('Home');page.wait_for_timeout(350);assert driver.atlas_angle(page)==0;stage.screenshot(path=str(restored));assert restored.read_bytes()==first.read_bytes(),e['id'];observed.append({'presentationId':e['id'],'canvasLabel':page.locator('canvas[data-token-atlas-canvas]').get_attribute('aria-label'),'subjectCount':stage.get_attribute('data-token-subject-count'),'strictWindowMs':350,'pausedWindowStart':start,'pausedWindowEnd':end,'secondCaptureEnd':after_second,'zeroClearsWhilePaused':True,'unchangedPausedPixels':True,'rotationChangesPixels':True,'HomeRestoresExactPixels':True})
  stage.scroll_into_view_if_needed();page.wait_for_timeout(150);since=page.evaluate('performance.now()');page.set_viewport_size({'width':item['width'],'height':220});page.locator('.token-atlas-dialog').evaluate('e=>e.scrollTo(0,0)');page.wait_for_function('''since=>{const o=globalThis.__ILLUSTRATION_PUBLIC_OBSERVATIONS__.lastIntersection;const b=document.querySelector('#token-atlas-preview').getBoundingClientRect();return o&&o.time>since&&o.isIntersecting===false&&b.y>=innerHeight}''',arg=since,timeout=10000);off_start=composition_snapshot(page);page.wait_for_timeout(350);off_end=composition_snapshot(page);assert off_end['clearCount']==off_start['clearCount'];after_false=page.evaluate('since=>globalThis.__ILLUSTRATION_PUBLIC_OBSERVATIONS__.clears.filter(x=>x.time>=since)',off_start['lastIntersection']['time']);assert not after_false,after_false;page.set_viewport_size({'width':item['width'],'height':item['height']});stage.scroll_into_view_if_needed();page.wait_for_timeout(350);returned=composition_snapshot(page);assert returned['clearCount']>off_end['clearCount'];page.emulate_media(reduced_motion=item['reducedMotion']);page.locator('#token-atlas-close').click();assert page.locator('canvas[data-token-atlas-canvas]').count()==0;assert driver.atlas_storage(page)==storage;item['illustrationCompositionChecks']={'publicControlsOnly':True,'observations':observed,'strictOffscreenWindowMs':350,'offscreenWindowStart':off_start,'offscreenWindowEnd':off_end,'clearsAfterFreshNativeFalse':after_false,'visibleAgain':returned,'closedCanvasCount':0,'storageUnchanged':True,'journal':page.evaluate('globalThis.__ILLUSTRATION_PUBLIC_OBSERVATIONS__')}
 driver.atlas_checks=atlas_checks
 return {'name':'atlas_checks additional printed-scene verification','historicalFunctionRetained':True,'controls':'Public search, selection, keyboard rotation, Home, close; native IntersectionObserver and real viewport/modal scroll. No app/Game object or QA hook.','strictPause':'Each of six compositions: initial screenshot, 350 ms settlement, 350 ms zero-clear window, second capture then additional 350 ms zero-clear check; exact PNG equality; rotation changes pixels and Home restores exact pixels. Fresh native IntersectionObserver false and offscreen bounds precede separate strict 350 ms zero-clear window.'}


def compiled_main():
 import sys
 import traceback
 ap=argparse.ArgumentParser(description='Run retained compiled-browser drivers with explicit printed-scene contract adaptation.');ap.add_argument('--compiled',action='store_true');ap.add_argument('--scope',choices=['tokens','avatars'],required=True);ap.add_argument('--dist',type=Path,default=ROOT/'dist');ap.add_argument('--freeze',type=Path,required=True);ap.add_argument('--expected-entry-sha256',required=True);ap.add_argument('--output',type=Path,required=True);a=ap.parse_args();a.output.mkdir(parents=True,exist_ok=True);retained_path=ROOT/'scripts/audit-model-fidelity-browser-2026-10-11.py';retained=load_retained('illustration_retained_strict',retained_path);freeze=json.loads(a.freeze.read_text());assert freeze['source']and freeze['compiled'];recipe='scripts/audit-token-models-browser.py'if a.scope=='tokens'else'scripts/audit-duelist-avatar-motion-browser.py';driver=load_retained('illustration_compiled_'+a.scope,ROOT/recipe);before=retained.fingerprints();failed_before=retained.failed_avatar_fingerprints();report={'executedAtUtc':datetime.now(timezone.utc).isoformat(),'scope':a.scope,'phase':'compiled','driver':pin(Path(__file__)),'retainedStrictRecipe':{'path':str(retained_path.relative_to(ROOT)),'before':pin(retained_path)},'freeze':{'path':str(a.freeze),**pin(a.freeze)},'expectedEntrySha256':a.expected_entry_sha256,'historicalDriversBefore':before,'historicalAvatarFailureBefore':failed_before,'ok':False}
 if a.scope=='tokens':report['explicitContractAdaptations']=install_composition_contract(driver);report['additionalPublicCompositionRecipe']=install_compiled_composition_checks(driver)
 else:
  driver.ADDITIONAL_STATIC_ASSETS=sorted(freeze.get('additionalStaticAssets',{}));report['strictStudioObservers']=retained.install_public_studio_observations(driver);report['strictStudioPause']=retained.install_avatar_pause_recipe(driver)
 saved=sys.argv;sys.argv=[str(ROOT/recipe),'--phase','compiled','--stage','full','--dist',str(a.dist),'--freeze',str(a.freeze),'--expected-entry-sha256',a.expected_entry_sha256,'--output',str(a.output)];failure=None
 try:
  driver.main();actual=json.loads((a.output/'report.json').read_text());assert actual['ok'];report.update(ok=True,browserReport=pin(a.output/'report.json'),pathCount=len(actual['paths']),captureCount=len(list(a.output.glob('*.png'))))
 except BaseException as error:
  failure=error;report['failure']={'type':type(error).__name__,'message':str(error),'traceback':traceback.format_exc()}
 finally:
  sys.argv=saved;report['retainedStrictRecipe']['after']=pin(retained_path);report['historicalDriversAfter']=retained.fingerprints();report['historicalAvatarFailureAfter']=retained.failed_avatar_fingerprints();report['historicalDriversUnchanged']=report['historicalDriversBefore']==report['historicalDriversAfter']and report['retainedStrictRecipe']['before']==report['retainedStrictRecipe']['after'];report['historicalAvatarFailureUnchanged']=failed_before==report['historicalAvatarFailureAfter'];report['ok']=report['ok']and report['historicalDriversUnchanged']and report['historicalAvatarFailureUnchanged'];(a.output/'illustration-wrapper.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
 if failure:raise failure
 assert report['ok'];print(json.dumps({'ok':True,'scope':a.scope,'paths':report['pathCount'],'captures':report['captureCount'],'retainedDriversUnchanged':True}),flush=True)



def full_models_main():
 """Preserve the original 468-model factory/gallery and add explicit normals."""
 import sys
 recipe_path=ROOT/'scripts/audit-model-fidelity-2026-10-11.py';recipe=load_retained('illustration_all_models',recipe_path);before=pin(recipe_path);args=sys.argv[:];sys.argv=[args[0]]+[x for x in args[1:]if x!='--full-models'];source=Path(sys.argv[sys.argv.index('--source-root')+1])if '--source-root'in sys.argv else ROOT;out=Path(sys.argv[sys.argv.index('--output-dir')+1]);recipe.SOURCES=sorted(str(p.relative_to(source))for p in(source/'src').rglob('*')if p.is_file());old=" const T=await import('/node_modules/.vite/deps/three.js');";assert recipe.RENDER.count(old)==1;recipe.RENDER=recipe.RENDER.replace(old," const transformed=await(await fetch('/src/ui/HologramMonsterModels.js')).text();const threeUrl=transformed.match(/from\\s+[\\\"']([^\\\"']*three\\.js[^\\\"']*)[\\\"']/)?.[1];if(!threeUrl)throw Error('Transformed Three import not found');const T=await import(threeUrl);")
 line='  const totalTriangles=geometry.reduce((sum,g)=>sum+(g.geometry.index?g.geometry.index.count:g.geometry.attributes.position.count)/3,0);';assert recipe.RENDER.count(line)==1;recipe.RENDER=recipe.RENDER.replace(line,line+'''
  let normalCount=0,nonUnitNormals=0,maxNormalLengthError=0;
  for(const g of geometry){const a=g.geometry.attributes.normal;if(!a)continue;for(let i=0;i<a.count;i++){const length=Math.hypot(a.getX(i),a.getY(i),a.getZ(i));normalCount++;const error=Math.abs(length-1);maxNormalLengthError=Math.max(maxNormalLengthError,error);if(!Number.isFinite(length)||error>.0002)nonUnitNormals++;}}
''');recipe.RENDER=recipe.RENDER.replace('partCount:parts.length,triangles:totalTriangles,','partCount:parts.length,normalCount,nonUnitNormals,maxNormalLengthError,triangles:totalTriangles,');recipe.main();sys.argv=args;path=out/'report.json';r=json.loads(path.read_text());original_path=ROOT/'docs/audits/artifacts/model-fidelity-2026-10-11/before/report.json';original=json.loads(original_path.read_text());oldrows={v['key']:v for s in original['sets']for v in s['measurements']};rows=[v for s in r['sets']for v in s['measurements']];r['illustrationFullModelWrapper']={'path':str(Path(__file__).relative_to(ROOT)),**pin(Path(__file__))};r['retainedRecipe']={'path':str(recipe_path.relative_to(ROOT)),'before':before,'after':pin(recipe_path)};r['originalTriangleFixture']={'path':str(original_path.relative_to(ROOT)),**pin(original_path)};r['originalBudgetRatios']={v['key']:{'originalTriangles':oldrows[v['key']]['triangles'],'currentTriangles':v['triangles'],'ratio':v['triangles']/oldrows[v['key']]['triangles']}for v in rows};r['unitNormals']={'tolerance':.0002,'normalCount':sum(v['normalCount']for v in rows),'nonUnitNormals':sum(v['nonUnitNormals']for v in rows),'maximumLengthError':max(v['maxNormalLengthError']for v in rows)};r['ok']=r['ok']and before==pin(recipe_path)and r['unitNormals']['nonUnitNormals']==0 and all(v['ratio']<=5 for v in r['originalBudgetRatios'].values());path.write_text(json.dumps(r,ensure_ascii=False,indent=2)+'\n');print(json.dumps({'ok':r['ok'],'models':len(rows),'normalCount':r['unitNormals']['normalCount'],'maxOriginalRatio':max(v['ratio']for v in r['originalBudgetRatios'].values())}),flush=True);assert r['ok']


if __name__=='__main__':
 import sys
 compiled_main() if '--compiled' in sys.argv else full_models_main() if '--full-models' in sys.argv else main()
