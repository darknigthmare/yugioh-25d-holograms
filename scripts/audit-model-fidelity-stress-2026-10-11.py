#!/usr/bin/env python3
"""Compare a fixed 12-hologram / 2-duellist scene before and after refinement.

The heaviest candidate IDs are selected once from the frozen gallery report,
then reused for both sources, both viewports and the same lighting/camera.
This synthetic public-model fixture does not start a Game or claim a legal
board combination. SwiftShader measurements are controlled software rendering
comparisons, not a hardware mobile FPS guarantee.
"""
import argparse
import hashlib
import importlib.util
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('fidelity_geometry',ROOT/'scripts/audit-model-fidelity-2026-10-11.py')
geometry=importlib.util.module_from_spec(spec);spec.loader.exec_module(geometry)
HTML='''<!doctype html><html lang="fr"><meta charset="utf-8"><link rel="icon" href="data:,"><title>Charge visuelle de modèles publics</title><style>body{margin:0;background:#101925;color:#e8f1ff;font:14px system-ui}header{height:68px;padding:12px;box-sizing:border-box}h1{font-size:18px;margin:0 0 5px}p{font-size:11px;margin:0}canvas{display:block}</style><header><h1 id="phase"></h1><p>Fixture synthétique : 12 hologrammes + 2 duellistes · ombres réelles · mêmes IDs et caméra avant/après</p></header><canvas></canvas></html>'''
RENDER='''async(options)=>{
 const T=await import('/node_modules/.vite/deps/three.js');const {createHologramMonsterModel}=await import('/src/ui/HologramMonsterModels.js');const {createHologramPoseAnimation}=await import('/src/ui/HologramPoseAnimation.js');const {createDuelistAvatarModel}=await import('/src/ui/DuelistAvatarModels.js');
 const renderer=new T.WebGLRenderer({canvas:document.querySelector('canvas'),antialias:true,preserveDrawingBuffer:true});renderer.setSize(options.width,options.height);renderer.setPixelRatio(1);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
 document.querySelector('#phase').textContent=options.phase+' — '+options.width+' px, comparaison SwiftShader';
 const scene=new T.Scene();scene.background=new T.Color('#15243a');scene.add(new T.HemisphereLight('#ebf4ff','#6b7b8a',2));const light=new T.DirectionalLight('#fff0da',3);light.position.set(-7,18,14);light.castShadow=true;light.shadow.mapSize.set(1024,1024);Object.assign(light.shadow.camera,{left:-22,right:22,top:28,bottom:-15});scene.add(light);
 const camera=new T.PerspectiveCamera(38,options.width/options.height,.1,140);camera.position.set(18,22,32);camera.lookAt(0,1,0);camera.updateMatrixWorld();
 const floor=new T.Mesh(new T.PlaneGeometry(22,38),new T.MeshStandardMaterial({color:'#283b51',roughness:.9}));floor.rotation.x=-Math.PI/2;floor.position.y=-.1;floor.receiveShadow=true;scene.add(floor);
 const entries=[],avatars=[],actions=[];const constructionStart=performance.now();
 for(let i=0;i<options.monsterIds.length;i++){const id=options.monsterIds[i],m=createHologramMonsterModel({id});if(i<10)m.position.set((i%5-2)*2.25,0,i<5?3.4:-3.4);else m.position.set((i-10.5)*4.5,0,0);m.rotation.y=i<5?Math.PI:0;scene.add(m);actions.push(createHologramPoseAnimation(m,{kind:'attack'}));entries.push({id,kind:'hologram',model:m});}
 for(let i=0;i<options.avatarIds.length;i++){const id=options.avatarIds[i],a=createDuelistAvatarModel(id,{owner:i?'opponent':'player',reducedMotion:false});a.group.position.set(i?0:-3.4,0,i?-15.1:14.2);a.group.rotation.y=i?0:2.73;a.update(0);scene.add(a.group);avatars.push(a);entries.push({id,kind:'avatar',model:a.group});}
 const buildMs=performance.now()-constructionStart,attributes=[],modelMeasures=[];let geometryBytes=0,triangles=0;
 for(const entry of entries){let count=0,calls=0;entry.model.traverse(o=>{if(!o.geometry)return;calls++;count+=(o.geometry.index?o.geometry.index.count:o.geometry.attributes.position.count)/3;for(const [name,a]of Object.entries(o.geometry.attributes)){geometryBytes+=a.array.byteLength;attributes.push({geometry:o.geometry,name,array:a.array,version:a.version,bytes:new Uint8Array(a.array.buffer,a.array.byteOffset,a.array.byteLength).slice()});}});triangles+=count;modelMeasures.push({id:entry.id,kind:entry.kind,triangles:count,materialBatches:calls});}
 const gl=renderer.getContext(),memory=()=>({geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures,programs:renderer.info.programs.length});
 const frames=[];for(let i=0;i<25;i++){const start=performance.now();actions.forEach(a=>a.update((i%10)/10));avatars.forEach(a=>{a.update(i/30)});renderer.render(scene,camera);gl.finish();if(i>=5)frames.push({milliseconds:performance.now()-start,calls:renderer.info.render.calls,triangles:renderer.info.render.triangles});}
 const stableAttributes=attributes.every(a=>a.geometry.attributes[a.name].array===a.array&&a.geometry.attributes[a.name].version===a.version&&new Uint8Array(a.array.buffer,a.array.byteOffset,a.array.byteLength).every((v,i)=>a.bytes[i]===v));
 actions.forEach(a=>a.dispose());avatars.forEach(a=>{a.resetPose();a.update(0,{reducedMotion:true})});renderer.render(scene,camera);gl.finish();const allocated=memory();
 entries.filter(e=>e.kind==='hologram').forEach(e=>{e.model.traverse(o=>o.geometry?.dispose());const materials=new Set();e.model.traverse(o=>{if(o.material)materials.add(o.material)});materials.forEach(m=>m.dispose());});avatars.forEach(a=>a.dispose());floor.geometry.dispose();floor.material.dispose();light.shadow.dispose();const afterDispose=memory();
 window.__fidelityStressDispose=()=>{renderer.dispose();renderer.forceContextLoss();delete window.__fidelityStressDispose;};
 return {modelMeasures,modelCount:entries.length,modelTriangles:triangles,geometryBytes,buildMs,frames,stableAttributes,allocated,afterDispose,camera:{position:camera.position.toArray(),target:[0,1,0],fov:38},webglVersion:gl.getParameter(gl.VERSION)};
}'''

def pin(path):return {'bytes':path.stat().st_size,'sha256':hashlib.sha256(path.read_bytes()).hexdigest()}

def main():
 parser=argparse.ArgumentParser(description=__doc__)
 parser.add_argument('--baseline-url',required=True)
 parser.add_argument('--candidate-url',required=True)
 parser.add_argument('--baseline-root',type=Path,required=True)
 parser.add_argument('--candidate-root',type=Path,default=ROOT)
 parser.add_argument('--candidate-gallery-report',type=Path,required=True)
 parser.add_argument('--output',type=Path,required=True)
 args=parser.parse_args();args.output.mkdir(parents=True,exist_ok=True)
 gallery=json.loads(args.candidate_gallery_report.read_text());assert gallery['ok'],'Candidate gallery must be frozen and successful.'
 all_models=[m for s in gallery['sets']for m in s['measurements']]
 monster_ids=[m['id']for m in sorted((m for m in all_models if m['kind']!='avatar'),key=lambda m:(-m['triangles'],m['id']))[:12]]
 avatar_ids=[m['id']for m in sorted((m for m in all_models if m['kind']=='avatar'),key=lambda m:(-m['triangles'],m['id']))[:2]]
 report={'scope':__doc__,'driver':{'path':str(Path(__file__)),**pin(Path(__file__))},'galleryReport':{'path':str(args.candidate_gallery_report),**pin(args.candidate_gallery_report)},'selectedMonsterIds':monster_ids,'selectedAvatarIds':avatar_ids,'paths':[],'errors':[]}
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
  for phase,url,source in [('before',args.baseline_url,args.baseline_root),('after',args.candidate_url,args.candidate_root)]:
   pins_before=geometry.pins(source)
   for width,height in [(1280,832),(390,776)]:
    page=browser.new_page(viewport={'width':width,'height':height+68},device_scale_factor=1,has_touch=width<600)
    page.route('**/favicon.ico',lambda route:route.fulfill(status=204));page.on('pageerror',lambda e:report['errors'].append(str(e)));page.on('console',lambda m:report['errors'].append(m.text)if m.type=='error'else None)
    page.goto(url.rstrip('/')+'/package.json');page.set_content(HTML);data=page.evaluate(RENDER,{'phase':phase,'width':width,'height':height,'monsterIds':monster_ids,'avatarIds':avatar_ids})
    page.screenshot(path=str(args.output/f'{phase}-heavy-scene-{width}.png'));page.evaluate('window.__fidelityStressDispose()');page.close()
    times=sorted(frame['milliseconds']for frame in data['frames']);data['timing']={'medianMs':(times[9]+times[10])/2,'p95Ms':times[18],'samples':len(times),'method':'25 actual renders with gl.finish(), first5excluded; CPU submission plus synchronized SwiftShader completion'}
    item={'phase':phase,'width':width,**data};report['paths'].append(item);print(json.dumps({'phase':phase,'width':width,'triangles':data['modelTriangles'],'calls':data['frames'][0]['calls'],'medianMs':data['timing']['medianMs'],'afterDispose':data['afterDispose']}),flush=True)
   pins_after=geometry.pins(source);report[phase+'SourcePinsBefore']=pins_before;report[phase+'SourcePinsAfter']=pins_after;assert pins_before==pins_after
  browser.close()
 report['ok']=not report['errors'] and len(report['paths'])==4 and all(p['modelCount']==14 and p['stableAttributes'] and p['afterDispose']['geometries']==0 and p['afterDispose']['textures']==0 for p in report['paths'])
 report['ratios']={str(width):next(p for p in report['paths']if p['phase']=='after'and p['width']==width)['modelTriangles']/next(p for p in report['paths']if p['phase']=='before'and p['width']==width)['modelTriangles'] for width in [1280,390]}
 (args.output/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print(json.dumps({'ok':report['ok'],'errors':report['errors'],'triangleRatios':report['ratios']}),flush=True)
 assert report['ok']

if __name__=='__main__':main()
