#!/usr/bin/env python3
"""Run preserved public-browser recipes on the coordinator's new frozen build.

The original drivers are imported unchanged. The historical avatar driver's
static asset list comes from this build's freeze. Its studio pause recipe
captures once and settles before starting the strict zero-draw observation
window. All original source/HTTP/CSP/native checks remain active. No build,
application object, QA hook or post-bootstrap Game mutation is introduced.
"""
import argparse
import hashlib
import importlib.util
import inspect
import json
from pathlib import Path
import sys
from datetime import datetime, timezone

ROOT=Path(__file__).resolve().parents[1]
DEPENDENCIES=[
 'scripts/audit-token-models-browser.py',
 'scripts/audit-duelist-avatar-motion-browser.py',
 'scripts/audit-native-duel-ui.py',
 'scripts/audit-continuation-models-ui.py',
 'scripts/audit-native-duel-views.py']

def pin(path):
 return {'bytes':path.stat().st_size,'sha256':hashlib.sha256(path.read_bytes()).hexdigest()}

def fingerprints():
 return {name:pin(ROOT/name)for name in DEPENDENCIES}

def failed_avatar_fingerprints():
 base=ROOT/'docs/audits/artifacts/model-fidelity-2026-10-11'
 return {str(path.relative_to(ROOT)):pin(path)for name in ['browser-compiled-avatars','browser-compiled-avatars-retry-2026-10-13']for path in sorted((base/name).rglob('*'))if path.is_file()}

def install_public_studio_observations(driver):
 original=driver.RNG
 observers=r'''(() => {
 const observations={intersections:[],resizes:[],clears:[],lastStudioIntersection:null};
 globalThis.__MODEL_FIDELITY_PUBLIC_OBSERVATIONS__=observations;
 for(const [name,kind] of [['IntersectionObserver','intersections'],['ResizeObserver','resizes']]){
  const Original=globalThis[name];if(!Original)continue;
  globalThis[name]=class extends Original {
   constructor(callback,options){
    super(function(...args){
     for(const entry of args[0]){
      if(entry.target.id!=='duelist-avatar-preview-stage')continue;
      const rect=entry.target.getBoundingClientRect();
      const observation={time:performance.now(),targetId:entry.target.id,kind,
       isIntersecting:entry.isIntersecting,intersectionRatio:entry.intersectionRatio,
       box:{x:rect.x,y:rect.y,width:rect.width,height:rect.height},entryTime:entry.time};
      observations[kind].push(observation);
      if(kind==='intersections')observations.lastStudioIntersection=observation;
     }
     return Reflect.apply(callback,this,args);
    },options);
   }
  };
 }
})();'''
 clear_line="if(this.canvas?.hasAttribute('data-duelist-avatar-canvas'))console.debug('AVATAR_MOTION_STUDIO_FRAME:'+JSON.stringify({time:performance.now(),avatarId:this.canvas.closest('#duelist-avatar-detail')?.dataset.duelistAvatarId,canvasLabel:this.canvas.getAttribute('aria-label')}));"
 assert original.count(clear_line)==1,'Historical WebGL observation recipe changed.'
 observed_clear="""if(this.canvas?.hasAttribute('data-duelist-avatar-canvas')){
 const observation={time:performance.now(),avatarId:this.canvas.closest('#duelist-avatar-detail')?.dataset.duelistAvatarId,canvasLabel:this.canvas.getAttribute('aria-label')};
 globalThis.__MODEL_FIDELITY_PUBLIC_OBSERVATIONS__.clears.push(observation);
 console.debug('AVATAR_MOTION_STUDIO_FRAME:'+JSON.stringify(observation));
}"""
 driver.RNG=observers+'\n'+original.replace(clear_line,observed_clear)
 return {'name':'pre-bootstrap public studio observations','historicalInitScriptSha256':hashlib.sha256(original.encode()).hexdigest(),
  'currentInitScriptSha256':hashlib.sha256(driver.RNG.encode()).hexdigest(),
  'scope':'Only the public studio canvas clear calls and public stage intersection/resize entries are recorded. Observer callbacks delegate the original this, complete arguments and return; WebGL clear delegates the original this, arguments and return. No callback or draw is suppressed.',
  'counterAuthority':'Synchronous browser-side clear array length; transported Python console messages remain evidence, not the idle-window counter.'}

def studio_snapshot(page):
 return page.evaluate('''() => {const o=globalThis.__MODEL_FIDELITY_PUBLIC_OBSERVATIONS__;return {time:performance.now(),clearCount:o.clears.length,lastIntersection:o.lastStudioIntersection}}''')

def install_avatar_pause_recipe(driver):
 historical=driver.studio_motion_checks
 def studio_motion_checks(page,item,output):
  stage=page.locator('#duelist-avatar-preview-stage')
  stage.scroll_into_view_if_needed()
  page.emulate_media(reduced_motion='reduce');page.wait_for_timeout(350)
  before_capture=studio_snapshot(page)
  stage.screenshot(path=str(output/f'avatar-studio-reduced-static-a-{item["width"]}.png'))
  # The capture may bring the element into view and dispatch observer work.
  # Let that input settle before observing a fixed period without an input.
  page.wait_for_timeout(350)
  paused_window_start=studio_snapshot(page);paused=paused_window_start['clearCount'];page.wait_for_timeout(350)
  paused_window_end=studio_snapshot(page)
  assert paused_window_end['clearCount']==paused,(paused,paused_window_end)
  stage.screenshot(path=str(output/f'avatar-studio-reduced-static-b-{item["width"]}.png'))
  page.wait_for_timeout(350)
  second_capture_end=studio_snapshot(page)
  assert second_capture_end['clearCount']==paused,(paused,second_capture_end)
  a=output/f'avatar-studio-reduced-static-a-{item["width"]}.png';b=output/f'avatar-studio-reduced-static-b-{item["width"]}.png'
  assert a.read_bytes()==b.read_bytes(),'Reduced-motion studio pixels changed without an input.'
  page.emulate_media(reduced_motion='no-preference');page.wait_for_timeout(400)
  resumed=studio_snapshot(page)['clearCount'];assert resumed>paused,(paused,resumed)
  offscreen_input_time=page.evaluate('performance.now()')
  page.set_viewport_size({'width':item['width'],'height':220})
  page.locator('.duelist-avatar-dialog').evaluate('e=>e.scrollTo(0,0)')
  page.wait_for_function('''since => {const o=globalThis.__MODEL_FIDELITY_PUBLIC_OBSERVATIONS__.lastStudioIntersection;const box=document.querySelector('#duelist-avatar-preview-stage').getBoundingClientRect();return o?.targetId==='duelist-avatar-preview-stage' && o.time>since && o.isIntersecting===false && box.y>=innerHeight}''',arg=offscreen_input_time,timeout=10000)
  box=stage.bounding_box();assert box and box['y']>=220,box
  offscreen_window_start=studio_snapshot(page);offscreen=offscreen_window_start['clearCount'];page.wait_for_timeout(350)
  offscreen_window_end=studio_snapshot(page)
  assert offscreen_window_end['clearCount']==offscreen,(offscreen,offscreen_window_end)
  clears_after_false=page.evaluate('since=>globalThis.__MODEL_FIDELITY_PUBLIC_OBSERVATIONS__.clears.filter(e=>e.time>=since)',offscreen_window_start['lastIntersection']['time'])
  assert not clears_after_false,clears_after_false
  page.set_viewport_size({'width':item['width'],'height':item['height']})
  stage.scroll_into_view_if_needed();page.wait_for_timeout(350)
  returned=studio_snapshot(page)['clearCount'];assert returned>offscreen,(offscreen,returned)
  page.emulate_media(reduced_motion=item['reducedMotion']);page.wait_for_timeout(100)
  item['studioPauseResume']={'preBootstrapInstrumentation':'Original WebGL clear methods and native observer callbacks delegate the same this/args/return. Only the public studio canvas and stage are observed. No Game or application object accessed.',
   'recipe':'Initial stage capture, fixed 350 ms settlement, then a fixed 350 ms strict zero-clear window; second capture and an additional 350 ms strict zero-clear check; exact PNG byte comparison. Offscreen observation starts after a fresh public IntersectionObserver false event and an offscreen bounding box. Synchronous browser clear counters, no redraw tolerance.',
   'counterAuthority':'Browser synchronous observation journal; Python console transport is retained separately.',
   'firstCaptureDrawCountBefore':before_capture['clearCount'],'firstCaptureSettledDrawCount':paused,'firstCaptureSettledClearDelta':paused-before_capture['clearCount'],
   'pausedWindowStart':paused_window_start,'pausedWindowEnd':paused_window_end,'secondCaptureEnd':second_capture_end,
   'offscreenWindowStart':offscreen_window_start,'offscreenWindowEnd':offscreen_window_end,'clearCallsAfterFreshObserverFalse':clears_after_false,
   'strictObservationWindowMs':350,'strictObservationClearDelta':0,'strictSecondCaptureClearDelta':0,
   'reducedMotionDrawCount':paused,'unchangedReducedMotionPixels':True,'resumedDrawCount':resumed,'offscreenDrawCount':offscreen,'offscreenPaused':True,'visibleAgainDrawCount':returned,'originalPreferenceRestored':item['reducedMotion']}
  item['publicStudioObservationJournal']=page.evaluate('globalThis.__MODEL_FIDELITY_PUBLIC_OBSERVATIONS__')
 driver.studio_motion_checks=studio_motion_checks
 return {'name':'studio_motion_checks','historicalSourceSha256':hashlib.sha256(inspect.getsource(historical).encode()).hexdigest(),
  'currentSourceSha256':hashlib.sha256(inspect.getsource(studio_motion_checks).encode()).hexdigest(),
  'purpose':'Observe an idle pause after the screenshot input has settled. The old failure is preserved; the short diagnostic did not reproduce its extra redraw, so no exact observer cause is claimed.',
  'changes':['Take the initial stage capture before fixing the idle draw count.','Allow a fixed 350 ms for initial capture observer work.','Require exactly zero synchronous browser clear calls over the next fixed 350 ms.','Keep exact PNG bytes equal and the resume/visible-again assertions.','Add a strict zero-clear assertion following the second capture; no numerical tolerance.','Replace the offscreen 300 ms timer with a fresh native IntersectionObserver false entry and a public offscreen bounding box; then observe a strict 350 ms zero-draw window.','Reject every clear whose browser timestamp follows that false event.','Preserve the complete original Python console observations as separate evidence.'],
  'diagnostics':{str(path.relative_to(ROOT)):pin(path)for path in [ROOT/'docs/audits/artifacts/model-fidelity-2026-10-11/studio-pause-diagnostic-2026-10-13/report.json',ROOT/'docs/audits/artifacts/model-fidelity-2026-10-11/studio-offscreen-diagnostic-retry-2026-10-13/report.json',ROOT/'docs/audits/artifacts/model-fidelity-2026-10-11/studio-observer-transport-diagnostic-2026-10-13/report.json']}}

def main():
 parser=argparse.ArgumentParser(description=__doc__)
 parser.add_argument('--scope',choices=['tokens','avatars'],required=True)
 parser.add_argument('--dist',type=Path,default=ROOT/'dist')
 parser.add_argument('--freeze',type=Path,required=True)
 parser.add_argument('--expected-entry-sha256',required=True)
 parser.add_argument('--output',type=Path,required=True)
 args=parser.parse_args()
 freeze=json.loads(args.freeze.read_text());assert freeze['source'] and freeze['compiled']
 args.output.mkdir(parents=True,exist_ok=True)
 before=fingerprints()
 failed_before=failed_avatar_fingerprints()
 recipe='scripts/audit-token-models-browser.py' if args.scope=='tokens' else 'scripts/audit-duelist-avatar-motion-browser.py'
 spec=importlib.util.spec_from_file_location('fidelity_'+args.scope,ROOT/recipe)
 driver=importlib.util.module_from_spec(spec);spec.loader.exec_module(driver)
 adaptation=None
 if args.scope=='avatars':
  adaptation={'name':'ADDITIONAL_STATIC_ASSETS','historical':driver.ADDITIONAL_STATIC_ASSETS,'current':sorted(freeze.get('additionalStaticAssets',{})),
   'purpose':'Include this build\'s entire frozen static pool in the unchanged strict before/after local and HTTP fingerprint checks.'}
  driver.ADDITIONAL_STATIC_ASSETS=adaptation['current']
  adaptation['publicStudioObservations']=install_public_studio_observations(driver)
  adaptation['studioMotionCheck']=install_avatar_pause_recipe(driver)
 report={'scope':args.scope,'executedAtUtc':datetime.now(timezone.utc).isoformat(),
  'wrapper':{'path':str(Path(__file__)),**pin(Path(__file__))},'originalDriver':{'path':recipe,**before[recipe]},
  'freeze':{'path':str(args.freeze),**pin(args.freeze)},'expectedEntrySha256':args.expected_entry_sha256,
  'driverDependenciesBefore':before,'historicalAvatarFailureBefore':failed_before,'declaredRecipeAdaptation':adaptation,'ok':False}
 saved_argv=sys.argv
 sys.argv=[str(ROOT/recipe),'--phase','compiled','--stage','full','--dist',str(args.dist),'--freeze',str(args.freeze),'--expected-entry-sha256',args.expected_entry_sha256,'--output',str(args.output)]
 failure=None
 try:
  driver.main()
  actual=json.loads((args.output/'report.json').read_text());assert actual['ok'],actual.get('error')
  report.update(ok=True,originalReport=pin(args.output/'report.json'),browserPathCount=len(actual['paths']),captureCount=len(list(args.output.glob('*.png'))))
 except BaseException as error:
  failure=error;report['failure']={'type':type(error).__name__,'message':str(error)[:1200]}
 finally:
  sys.argv=saved_argv;report['driverDependenciesAfter']=fingerprints()
  report['preservedHistoricalDrivers']=before==report['driverDependenciesAfter']
  report['historicalAvatarFailureAfter']=failed_avatar_fingerprints()
  report['preservedHistoricalAvatarFailure']=failed_before==report['historicalAvatarFailureAfter']
  report['ok']=report['ok'] and report['preservedHistoricalDrivers'] and report['preservedHistoricalAvatarFailure']
  (args.output/'fidelity-wrapper.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
 if failure:raise failure
 assert report['ok']
 print(json.dumps({'scope':args.scope,'ok':report['ok'],'paths':report['browserPathCount'],'captures':report['captureCount'],'historicalDriversUnchanged':report['preservedHistoricalDrivers']}),flush=True)

if __name__=='__main__':main()
