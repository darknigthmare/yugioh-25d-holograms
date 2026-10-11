#!/usr/bin/env python3
"""Real browser validation of the full-body avatar studio, collection transfer and public native gestures.

Never builds or mutates a started Game. Isolated profile/progression fixtures
are installed before bootstrap and identified separately from genuine results.
"""
import argparse
from collections import Counter
from datetime import datetime, timezone
import functools
import hashlib
from http.server import ThreadingHTTPServer
import importlib.util
import json
from pathlib import Path
import re
import threading
import time
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright

_candidate = Path(__file__).resolve().parents[1]
ROOT = _candidate if (_candidate/'package.json').is_file() else Path('/workspace/yugioh-25d-holograms')
spec = importlib.util.spec_from_file_location('avatar_native_ui', ROOT/'scripts/audit-native-duel-ui.py')
ui = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ui)
SERIES = {'dm':28, 'gx':28, '5ds':24, 'zexal':24, 'arc-v':28, 'vrains':20, 'sevens':20, 'go-rush':20}
SOURCE_PATHS = ['main.js','index.html','style.css','src/content/DuelistAvatarCatalog.js',
 'src/content/DuelistAvatarProgress.js','src/ui/DuelistAvatarModels.js','src/ui/DuelistAvatarPicker.js',
 'src/ui/DuelistAvatarGestures.js','src/ui/DuelistAvatarPreview3D.js','src/ui/DuelistAvatarPreviewLifecycle.js',
 'src/ui/DuelistAvatarPortrait.js','src/ui/DuelViewController.js','src/ui/RealDuelView.js','src/ui/RealDuelScene3D.js',
 'src/core/native/NativeDuelGame.js','public/native/ocgcore.sync.wasm','public/native/card-data.json','public/native/scripts.json',
 'public/cards/small/43422537.jpg']
ADDITIONAL_STATIC_ASSETS = ['cards/small/43422537.jpg']
RNG = """(() => {
 window.addEventListener('securitypolicyviolation', event => {
  console.debug('AVATAR_MOTION_CSP:'+JSON.stringify({directive:event.effectiveDirective,
   blocked:['eval','wasm-eval','inline'].includes(event.blockedURI)?event.blockedURI:'resource'}));
 });
 let state=0x9e3779b9;
 Object.defineProperty(crypto,'getRandomValues',{value(view){
  if(view.length===1){view[0]=2;return view;}
  for(let i=0;i<view.length;i++){state^=state<<13;state^=state>>>17;state^=state<<5;view[i]=state>>>0;}
  return view;
 }});
 // Browser drawing counter only: preserve the actual methods and observe
 // only the public studio canvas. No application object is exposed.
 for(const Constructor of [globalThis.WebGLRenderingContext,globalThis.WebGL2RenderingContext]){
  if(!Constructor)continue;const original=Constructor.prototype.clear;
  Object.defineProperty(Constructor.prototype,'clear',{configurable:true,writable:true,value:function(...args){
   const result=original.apply(this,args);
   if(this.canvas?.hasAttribute('data-duelist-avatar-canvas'))console.debug('AVATAR_MOTION_STUDIO_FRAME:'+JSON.stringify({time:performance.now(),avatarId:this.canvas.closest('#duelist-avatar-detail')?.dataset.duelistAvatarId,canvasLabel:this.canvas.getAttribute('aria-label')}));
   return result;
  }});
 }
 const observe=()=>{
  let last='';
  const read=()=>{
   const scene=document.querySelector('[data-real-duel-scene3d]');if(!scene)return;
   const data={player:scene.dataset.playerDuelistGesture||'idle',opponent:scene.dataset.opponentDuelistGesture||'idle',outcome:scene.dataset.duelistOutcome||'pending'};
   const text=JSON.stringify(data);if(text===last)return;last=text;
   console.debug('AVATAR_MOTION_GESTURE:'+text);
  };
  new MutationObserver(read).observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['data-player-duelist-gesture','data-opponent-duelist-gesture','data-duelist-outcome']});read();
 };
 if(document.documentElement)observe();else document.addEventListener('DOMContentLoaded',observe,{once:true});
})()"""
PUBLIC_STATE = """() => {
 const cards=sel=>[...document.querySelectorAll(sel)].map(c=>({id:c.dataset.id,uid:c.dataset.uid,
  atk:c.querySelector('.stat-badge.atk')?.textContent,def:c.querySelector('.stat-badge.def')?.textContent}));
 return {ownHand:cards('#player-hand .card-entity'),
  ownMonsters:cards('.card-zone[data-side="player"][data-zone-type="monster"] .card-entity'),
  playerLp:document.querySelector('#player-lp').textContent,
  opponentLp:document.querySelector('#opponent-lp').textContent,
  ownGraveCount:document.querySelector('#player-gy-count').textContent,
  opponentGraveCount:document.querySelector('#opponent-gy-count').textContent,
  phase:document.querySelector('.phase-step.active')?.id,
  publicLog:document.querySelector('#log-content').innerText};
}"""

def fingerprints(paths, root=ROOT):
    return {path:{'bytes':(root/path).stat().st_size,'sha256':hashlib.sha256((root/path).read_bytes()).hexdigest()} for path in paths}

def dist_fingerprints(dist):
    paths=['index.html']+[str(p.relative_to(dist)) for p in sorted((dist/'assets').glob('*')) if p.suffix in ('.js','.css')]
    paths+=['native/ocgcore.sync.wasm','native/card-data.json','native/scripts.json']
    paths+=ADDITIONAL_STATIC_ASSETS
    return fingerprints(paths,dist)

def http_fingerprints(request,base,local):
    out={}
    for path in local:
        response=request.get(base.rstrip('/')+'/'+path)
        assert response.status==200,(path,response.status)
        if path.endswith('.jpg'):assert response.headers.get('content-type','').split(';')[0]=='image/jpeg',(path,response.headers)
        body=response.body()
        out[path]={'bytes':len(body),'sha256':hashlib.sha256(body).hexdigest()}
    return out

def screenshot(page,output,label):
    page.screenshot(path=str(output/(label+'.png')),animations='disabled',timeout=60000)

def visible_ids(page):
    return page.locator('[data-duelist-avatar-preview]').evaluate_all('(elements)=>elements.map(e=>e.dataset.duelistAvatarPreview)')

def number_results(page):
    return int(re.match(r'\d+',page.locator('#duelist-avatar-results').inner_text()).group())

def profile(page):
    return page.evaluate('JSON.parse(localStorage.getItem("ygo_duelist_avatar_v1")||"null")')

def reset_filters(page):
    page.locator('#duelist-avatar-search').fill('')
    page.locator('#duelist-avatar-series').select_option('all')
    page.locator('#duelist-avatar-availability').select_option('all')

def choose(page,id,query):
    reset_filters(page)
    page.locator('#duelist-avatar-search').fill(query)
    page.locator(f'[data-duelist-avatar-preview="{id}"]').click()
    button=page.locator('#duelist-avatar-select')
    assert button.is_enabled(),page.locator('#duelist-avatar-detail').inner_text()
    button.focus()
    page.keyboard.press('Enter')
    ui.wait_until(page,'id=>JSON.parse(localStorage.getItem("ygo_duelist_avatar_v1")||"null")?.selectedAvatarId===id',id)
    ui.wait_until(page,'id=>document.activeElement.dataset.duelistAvatarPreview===id',id)
    assert button.is_disabled()

def start_page(page,base,item,compiled):
    errors=[];failed=[];loaded=set()
    item.update(pageErrors=errors,nativeRequestFailures=failed,loaded=loaded,cspViolations=[],gestureObservations=[],studioDrawCalls=[],browserConsoleErrors=[],browserConsoleErrorLocations=[],httpErrors=[])
    def console(message):
        if message.type=='error':
            item['browserConsoleErrors'].append(message.text[:1200])
            item['browserConsoleErrorLocations'].append({'text':message.text[:1200],'location':message.location})
        for prefix,key in [('AVATAR_MOTION_CSP:','cspViolations'),('AVATAR_MOTION_GESTURE:','gestureObservations'),('AVATAR_MOTION_STUDIO_FRAME:','studioDrawCalls')]:
            if message.text.startswith(prefix):
                item[key].append(json.loads(message.text[len(prefix):]))
    page.on('console',console)
    page.on('pageerror',lambda error:errors.append(str(error)[:600]))
    item['documentNavigations']=[]
    page.on('framenavigated',lambda frame:item['documentNavigations'].append(frame.url) if frame==page.main_frame else None)
    page.on('requestfailed',lambda request:failed.append(urlsplit(request.url).path) if '/native/' in request.url else None)
    def response_received(response):
        if response.status==200:loaded.add(urlsplit(response.url).path)
        elif response.status>=400:item['httpErrors'].append({'status':response.status,'url':response.url,'path':urlsplit(response.url).path,'resourceType':response.request.resource_type})
    page.on('response',response_received)
    page.on('dialog',lambda dialog:dialog.accept() if dialog.type=='confirm' else dialog.dismiss())
    page.add_init_script(RNG)
    response=page.goto(base,wait_until='domcontentloaded')
    assert response and response.status==200
    page.locator('#duelist-avatar-open').wait_for(state='visible')
    if compiled:
        assert response.header_value('content-security-policy')==ui.production_headers()['Content-Security-Policy']
        assert page.evaluate('typeof window.__YGO_QA__')=='undefined'
    item['debugHookAbsent']=page.evaluate('typeof window.__YGO_QA__')=='undefined'

def picker_checks(page,item,output):
    page.locator('#duelist-avatar-open').click()
    page.locator('#duelist-avatar-modal').wait_for(state='visible')
    assert number_results(page)==192
    assert page.locator('#duelist-avatar-collection-count').inner_text()=='11/192 disponibles'
    assert len(visible_ids(page))==24
    all_ids=[]
    for p in range(8):
        assert page.locator('#duelist-avatar-page').inner_text()==f'{p+1} / 8'
        ids=visible_ids(page);assert len(ids)==24
        all_ids+=ids
        if p<7:page.locator('#duelist-avatar-next').click()
    assert len(all_ids)==len(set(all_ids))==192
    assert page.locator('#duelist-avatar-next').is_disabled()
    item['all192ReachableThroughEightPages']=all_ids
    for series,count in SERIES.items():
        page.locator('#duelist-avatar-series').select_option(series)
        assert number_results(page)==count,(series,number_results(page))
    item['eightSeriesCounts']=SERIES
    reset_filters(page)
    page.locator('#duelist-avatar-search').fill('Atem')
    locked=page.locator('[data-duelist-avatar-preview="atem"]')
    assert locked.is_enabled()
    locked.click()
    assert page.locator('#duelist-avatar-detail').get_attribute('data-duelist-avatar-id')=='atem'
    assert page.locator('#duelist-avatar-select').is_disabled()
    assert '12 médailles' in page.locator('#duelist-avatar-detail').inner_text()
    assert '0 / 12' in page.locator('#duelist-avatar-detail').inner_text()
    before=profile(page)
    # Native disabled controls must refuse an activation from the keyboard.
    page.locator('#duelist-avatar-select').evaluate('e=>e.click()')
    assert profile(page)==before
    item['lockedInspectableAndNotSelectable']={'id':'atem','condition':page.locator('#duelist-avatar-detail').inner_text(),'profileUnchanged':True}
    page.locator('#duelist-avatar-detail').scroll_into_view_if_needed()
    if item['width']<600:
        page.locator('.duelist-avatar-dialog').evaluate('e=>e.scrollTo(0,0)')
    screenshot(page,output,f'avatar-locked-atem-{item["width"]}')
    reset_filters(page)
    page.locator('#duelist-avatar-availability').select_option('available')
    assert number_results(page)==11
    page.locator('#duelist-avatar-availability').select_option('locked')
    assert number_results(page)==181
    reset_filters(page)
    page.locator('#duelist-avatar-search').fill('Tea Gardner')
    assert visible_ids(page)==['tea']
    page.locator('#duelist-avatar-search').fill('Yûgi Mutô')
    assert 'yugi' in visible_ids(page) and set(visible_ids(page)) <= {'yugi','solomon'}
    item['accentedYugiSearchResults']=visible_ids(page)
    page.locator('#duelist-avatar-search').fill('Judai')
    assert visible_ids(page)==['jaden']
    item['accentAndJapaneseAliases']=True
    page.locator('#duelist-avatar-search').fill('aucun-personnage-xyz')
    assert number_results(page)==0 and page.locator('#duelist-avatar-empty').is_visible()
    page.locator('#duelist-avatar-clear').click()
    assert number_results(page)==192
    screenshot(page,output,f'avatar-roster-desktop-mobile-{item["width"]}')
    item['horizontalOverflow']=page.evaluate('({width:innerWidth,body:document.body.scrollWidth,dialog:document.querySelector(".duelist-avatar-dialog").scrollWidth,dialogClient:document.querySelector(".duelist-avatar-dialog").clientWidth})')
    assert item['horizontalOverflow']['body']<=item['width']
    assert item['horizontalOverflow']['dialog']<=item['horizontalOverflow']['dialogClient']+1
    focus_checks(page,item)
    choose(page,'jaden','Judai')
    item['keyboardSelectionRetainsFocusOnSelectedPortrait']=page.evaluate('document.activeElement.dataset.duelistAvatarPreview==="jaden"')
    assert item['keyboardSelectionRetainsFocusOnSelectedPortrait']
    assert page.locator('#player-label').get_attribute('data-avatar-id')=='jaden'
    assert 'JADEN' in page.locator('#player-label').inner_text()
    item['selectedFreeAvatar']=profile(page)
    if item['width']<600:
        page.locator('.duelist-avatar-dialog').evaluate('e=>e.scrollTo(0,0)')
    screenshot(page,output,f'avatar-jaden-selected-{item["width"]}')
    page.keyboard.press('Escape')
    page.locator('#duelist-avatar-modal').wait_for(state='hidden')
    assert page.locator('#start-modal').is_visible()
    ui.wait_until(page,'document.activeElement.id==="duelist-avatar-open"')
    item['escapeReturnsStartAndTrigger']=True
    page.reload(wait_until='domcontentloaded')
    page.locator('#duelist-avatar-open').wait_for(state='visible')
    assert profile(page)['selectedAvatarId']=='jaden'
    assert page.locator('#duelist-avatar-open [data-avatar-portrait="jaden"]').count()==1
    item['customDeckAfterPickerReload']=page.evaluate('JSON.parse(localStorage.getItem("ygo_custom_deck")||"null")')
    assert item['customDeckAfterPickerReload']==item['preBootstrapFixture']['ygo_custom_deck']
    item['reloadSelectionPersists']=True

def focus_checks(page,item):
    summary=page.locator('.duelist-avatar-help summary')
    details=page.locator('.duelist-avatar-help')
    if details.evaluate('e=>e.open'):summary.click()
    summary.focus();page.keyboard.press('Tab')
    closed=page.evaluate('({id:document.activeElement.id,inside:!!document.activeElement.closest("#duelist-avatar-modal"),tag:document.activeElement.tagName})')
    assert closed['id']=='duelist-avatar-close' and closed['inside'],closed
    summary.click()
    page.locator('#duelist-avatar-import').focus();page.keyboard.press('Tab')
    opened=page.evaluate('({id:document.activeElement.id,inside:!!document.activeElement.closest("#duelist-avatar-modal")})')
    assert opened['id']=='duelist-avatar-close' and opened['inside'],opened
    page.keyboard.press('Shift+Tab')
    reverse=page.evaluate('({id:document.activeElement.id,inside:!!document.activeElement.closest("#duelist-avatar-modal")})')
    assert reverse['id']=='duelist-avatar-import' and reverse['inside'],reverse
    summary.click()
    item['focusLoop']={'closedSummaryTab':closed,'openedLastImportTab':opened,'openedFirstCloseReverseTab':reverse,'hiddenFileInputExcluded':True}
    item['tabAfterHelpSummary']=closed;item['reverseTabInside']=True


def dismiss_public_decisions(page,limit=60):
    """Use visible public controls, including native multi-selection confirmation."""
    for _ in range(limit):
        modal=page.locator('#decision-modal')
        if not modal.is_visible():return
        confirm=page.locator('#decision-options .decision-confirm-button')
        cancel=page.locator('#btn-decision-cancel')
        if confirm.is_visible() and confirm.is_enabled():confirm.click()
        elif cancel.is_visible() and cancel.is_enabled():cancel.click()
        else:
            options=modal.locator('button:not([disabled])').filter(visible=True)
            assert options.count(),'Required native decision has no public legal choice.'
            options.first.click()
        page.wait_for_timeout(75)
    raise AssertionError('Public native decision sequence did not settle.')

def await_public_player_main(page):
    for _ in range(400):
        dismiss_public_decisions(page)
        if page.locator('#btn-end-turn').is_visible() and page.locator('#btn-end-turn').is_enabled():return
        page.wait_for_timeout(100)
    raise AssertionError('Native Duel did not return to an actionable player turn.')

def place_public_hand_card(page,code,zone_type,face_up):
    page.locator(f'#player-hand .card-entity[data-id="{code}"]').first.click()
    zones=page.locator(f'.card-zone[data-side="player"][data-zone-type="{zone_type}"].active-zone')
    assert zones.count(),f'No public legal {zone_type} destination.'
    zone=zones.first;index=zone.get_attribute('data-index');zone.click()
    page.locator('#action-modal').wait_for(state='visible')
    action=page.locator('#btn-action-faceup' if face_up else '#btn-action-facedown')
    assert action.is_enabled();action.click();page.locator('#action-modal').wait_for(state='hidden')
    dismiss_public_decisions(page)
    ui.wait_until(page,"""({zoneType,index})=>Boolean(document.querySelector(`.card-zone[data-side="player"][data-zone-type="${zoneType}"][data-index="${index}"] .card-entity`))""",{'zoneType':zone_type,'index':index})
    return index


def switch_real(page):
    for _ in range(4):
        if page.locator('#btn-toggle-view').get_attribute('data-view-mode')=='real':
            break
        page.locator('#btn-toggle-view').click()
        ui.wait_until(page,'document.querySelector("#btn-toggle-view").getAttribute("aria-busy")==="false"')
    assert page.locator('#btn-toggle-view').get_attribute('data-view-mode')=='real'
    ui.wait_until(page,'document.querySelector("[data-real-duel-scene3d]")?.dataset.webglAvailable==="true"')
    page.wait_for_timeout(800)

def native_checks(page,item,output):
    page.locator('[data-deck-id="custom"]').click()
    ui.wait_until(page,'document.querySelector("#builder-catalogue-status")?.textContent.includes("TCG • liste Advanced complète")',timeout=90)
    assert page.locator('#deck-validity-badge').inner_text()=='Deck valide'
    page.locator('input[name="ai-difficulty"][value="easy"]').check()
    page.locator('#btn-start-duel').click()
    ui.wait_until(page,'() => Boolean(document.querySelector("#player-hand .card-entity")) || [...document.querySelectorAll("#decision-options button")].some(b=>b.checkVisibility() && b.textContent.trim()==="JE COMMENCE")',timeout=90)
    first=page.get_by_role('button',name='JE COMMENCE',exact=True)
    if first.is_visible():first.click()
    page.locator('#start-modal').wait_for(state='hidden')
    page.wait_for_selector('#player-hand .card-entity')
    await_public_player_main(page)
    switch_real(page)
    scene=page.locator('[data-real-duel-scene3d]')
    assert scene.get_attribute('data-player-avatar-id')=='jaden'
    item['sceneBefore']=scene.evaluate('(e)=>({...e.dataset})')
    before=page.evaluate(PUBLIC_STATE)
    item['nativeStateBeforeAvatarSwap']=before
    screenshot(page,output,f'avatar-native-jaden-player-camera-{item["width"]}')
    page.locator('.real-duel-camera-button[data-camera-preset="overview"]').click()
    page.wait_for_timeout(750)
    screenshot(page,output,f'avatar-native-jaden-overview-{item["width"]}')
    page.locator('.real-duel-camera-button[data-camera-preset="player"]').click()
    page.wait_for_timeout(750)
    page.locator('#btn-settings').click()
    page.locator('#btn-settings-avatars').click()
    choose(page,'kaiba','Seto Kaiba')
    assert scene.get_attribute('data-player-avatar-id')=='kaiba'
    page.keyboard.press('Escape')
    assert page.locator('#settings-modal').is_visible()
    ui.wait_until(page,'document.activeElement.id==="btn-settings-avatars"')
    item['escapeReturnsSettingsAndTrigger']=True
    page.locator('#btn-close-settings').click()
    after=page.evaluate(PUBLIC_STATE)
    assert before==after,{'before':before,'after':after}
    item['nativeStateAfterAvatarSwap']=after
    item['nativeStatePreservedDuringHumanAvatarSwap']=True
    item['sceneAfter']=scene.evaluate('(e)=>({...e.dataset})')
    assert item['sceneAfter']['opponentAvatarId']==item['sceneBefore']['opponentAvatarId']
    screenshot(page,output,f'avatar-native-kaiba-player-camera-{item["width"]}')
    # Click an actual public card destination after swapping the avatar.
    rows={str(row[0]):row for row in json.loads((ROOT/'public/native/card-data.json').read_text())['rows']}
    code=ui.hand_id(page,rows,lambda row:row[4]==17 and 0<(int(row[7])&255)<=4)
    if code:
        index=place_public_hand_card(page,code,'monster',True)
        await_public_player_main(page)
        item['realNormalSummonAfterAvatarSwap']={'id':code,'index':index,'publicState':page.evaluate(PUBLIC_STATE)}
        screenshot(page,output,f'avatar-native-kaiba-after-summon-{item["width"]}')
    else:
        item['realNormalSummonAfterAvatarSwap']={'offeredOwnHandNormalMonster':False}
    item['nativeAssetsLoaded']=sorted(path for path in item['loaded'] if path.startswith('/native/'))
    assert {'/native/ocgcore.sync.wasm','/native/card-data.json','/native/scripts.json'}<=set(item['nativeAssetsLoaded'])
    assert page.evaluate('document.body.scrollWidth<=innerWidth')
    assert not item['cspViolations'] and not item['pageErrors'] and not item['nativeRequestFailures']
    item['ok']=True

def progression_checks(page,base,item,output,compiled):
    stats={'duels':2,'wins':0,'losses':2,'draws':0,'reasons':{'surrender':2},'last':None}
    item['preBootstrapFixture']={'ygo_duel_statistics':stats,'description':'Two completed losses before bootstrap; the next actual concession is counted by the production app.'}
    page.add_init_script(f'if(!localStorage.getItem("ygo_duel_statistics"))localStorage.setItem("ygo_duel_statistics",{json.dumps(json.dumps(stats))});')
    start_page(page,base,item,compiled)
    page.locator('#duelist-avatar-open').click()
    page.locator('#duelist-avatar-search').fill('Tristan')
    page.locator('[data-duelist-avatar-preview="tristan"]').click()
    assert page.locator('#duelist-avatar-select').is_disabled()
    assert '2 / 3' in page.locator('#duelist-avatar-detail').inner_text()
    page.keyboard.press('Escape')
    page.locator('input[name="ai-difficulty"][value="easy"]').check()
    page.locator('#btn-start-duel').click()
    ui.wait_until(page,'() => Boolean(document.querySelector("#player-hand .card-entity")) || [...document.querySelectorAll("#decision-options button")].some(b=>b.checkVisibility() && b.textContent.trim()==="JE COMMENCE")',timeout=90)
    first=page.get_by_role('button',name='JE COMMENCE',exact=True)
    if first.is_visible():first.click()
    page.locator('#start-modal').wait_for(state='hidden')
    page.wait_for_selector('#player-hand .card-entity')
    await_public_player_main(page)
    switch_real(page)
    page.locator('#btn-reset').click()
    page.locator('#gameover-modal').wait_for(state='visible')
    ui.wait_until(page,'JSON.parse(localStorage.getItem("ygo_duel_statistics"))?.duels===3')
    item['actualConcessionPublicResult']=page.locator('#gameover-modal').inner_text()
    item['statisticsAfterGenuineFinishedDuel']=page.evaluate('JSON.parse(localStorage.getItem("ygo_duel_statistics"))')
    item['earnedProfileAfterGenuineFinishedDuel']=profile(page)
    assert 'tristan' in item['earnedProfileAfterGenuineFinishedDuel']['earnedAvatarIds']
    assert item['statisticsAfterGenuineFinishedDuel']['duels']==3
    assert item['statisticsAfterGenuineFinishedDuel']['wins']==0
    assert item['statisticsAfterGenuineFinishedDuel']['losses']==3
    scene=page.locator('[data-real-duel-scene3d]')
    ui.wait_until(page,'document.querySelector("[data-real-duel-scene3d]")?.dataset.duelistOutcome==="opponent"')
    item['heldDefeatPose']=scene.evaluate('e=>({player:e.dataset.playerDuelistGesture,opponent:e.dataset.opponentDuelistGesture,outcome:e.dataset.duelistOutcome})')
    assert item['heldDefeatPose']=={'player':'defeat','opponent':'victory','outcome':'opponent'}
    page.wait_for_timeout(500)
    assert item['heldDefeatPose']==scene.evaluate('e=>({player:e.dataset.playerDuelistGesture,opponent:e.dataset.opponentDuelistGesture,outcome:e.dataset.duelistOutcome})')
    screenshot(page,output,'avatar-earned-after-genuine-concession')
    page.reload(wait_until='domcontentloaded')
    page.locator('#duelist-avatar-open').click()
    choose(page,'tristan','Tristan')
    assert 'tristan' in profile(page)['earnedAvatarIds']
    item['genuinelyEarnedAvatarSelectableAfterReload']=True
    screenshot(page,output,'avatar-tristan-earned-selected')
    _,item['genuineConcessionCollectionExport']=download_collection(page,output,'avatar-motion-concession-collection-download')
    item['ok']=True

def exodia_fixture():
    text=(ROOT/'main.js').read_text().split('const PREMADE_DECKS = {',1)[1]
    part=text.split('kaiba: {',1)[1].split('main: [',1)[1].split(']',1)[0]
    main=[str(int(code)) for code in re.findall(r"'([0-9]+)'",part)]
    assert len(main)==40
    parts=['33396948','70903634','44519536','8124921','7902349']
    for index,code in zip([25,4,18,14,11],parts):main[index]=code
    # Four parts open in hand. The final leg is drawn on the next player turn,
    # leaving time to open the real view through public controls before WIN.
    main[11]='15025844'
    main[24]='7902349'
    draft={'main':main,'extra':['23995346','84013237','77637979'],'side':[]}
    assert max(Counter(main+draft['extra']).values())<=3
    assert all(main.count(code)==1 for code in parts)
    return draft

def genuine_win_checks(page,base,item,output,compiled):
    draft=exodia_fixture()
    item['preBootstrapFixture']={'ygo_custom_deck':draft,'description':'Legal Main 40 / Extra 3 / Side 0; four unique Exodia parts open in hand, the final part is drawn on the next player turn. No changes after Duel start.'}
    page.add_init_script(f'if(!localStorage.getItem("ygo_custom_deck"))localStorage.setItem("ygo_custom_deck",{json.dumps(json.dumps(draft))});')
    start_page(page,base,item,compiled)
    page.locator('input[name="game-mode"][value="strict"]').check()
    page.locator('input[name="ai-difficulty"][value="easy"]').check()
    page.locator('[data-deck-id="custom"]').click()
    ui.wait_until(page,'document.querySelector("#builder-catalogue-status")?.textContent.includes("TCG • liste Advanced complète")',timeout=90)
    assert page.locator('#deck-validity-badge').inner_text()=='Deck valide'
    item['actualAdvancedDeckValidation']={'status':page.locator('#deck-validity-badge').inner_text(),'sizes':page.locator('#deck-size-val').inner_text(),'catalogue':page.locator('#builder-catalogue-status').inner_text()}
    page.locator('#btn-start-duel').click()
    ui.wait_until(page,'() => Boolean(document.querySelector("#player-hand .card-entity")) || [...document.querySelectorAll("#decision-options button")].some(b=>b.checkVisibility() && b.textContent.trim()==="JE COMMENCE")',timeout=90)
    first=page.get_by_role('button',name='JE COMMENCE',exact=True)
    if first.is_visible():first.click()
    page.wait_for_selector('#player-hand .card-entity')
    await_public_player_main(page)
    switch_real(page)
    screenshot(page,output,'avatar-motion-exodia-four-parts-before-turn')
    item['beforeFinalPartPublicHand']=page.locator('#player-hand .card-entity').evaluate_all('cards=>cards.map(c=>({id:c.dataset.id,uid:c.dataset.uid}))')
    assert len(set(c['id'] for c in item['beforeFinalPartPublicHand']) & {'33396948','70903634','44519536','8124921','7902349'})==4
    page.locator('#btn-end-turn').click()
    deadline=time.monotonic()+60
    while time.monotonic()<deadline and not page.locator('#gameover-modal').is_visible():
        dismiss_public_decisions(page)
        page.wait_for_timeout(80)
    item['afterNextDrawPublicState']=page.evaluate(PUBLIC_STATE)
    page.locator('#gameover-modal').wait_for(state='visible',timeout=45000)
    ui.wait_until(page,'JSON.parse(localStorage.getItem("ygo_duel_statistics")||"null")?.wins===1')
    item['genuineNativeExodiaResult']=page.locator('#gameover-modal').inner_text()
    item['winningPublicOwnHand']=page.locator('#player-hand .card-entity[data-id]').evaluate_all('(cards)=>cards.map(card=>({id:card.dataset.id,uid:card.dataset.uid}))')
    item['statisticsAfterGenuineNativeWin']=page.evaluate('JSON.parse(localStorage.getItem("ygo_duel_statistics"))')
    item['earnedProfileAfterGenuineNativeWin']=profile(page)
    assert item['statisticsAfterGenuineNativeWin']['duels']==1
    assert item['statisticsAfterGenuineNativeWin']['wins']==1
    assert item['statisticsAfterGenuineNativeWin']['losses']==0
    assert item['statisticsAfterGenuineNativeWin']['reasons'].get('exodia')==1
    assert 'mokuba' in item['earnedProfileAfterGenuineNativeWin']['earnedAvatarIds']
    assert 'Mokuba' in item['genuineNativeExodiaResult']
    scene=page.locator('[data-real-duel-scene3d]')
    ui.wait_until(page,'document.querySelector("[data-real-duel-scene3d]")?.dataset.duelistOutcome==="player"')
    item['heldVictoryPose']=scene.evaluate('e=>({player:e.dataset.playerDuelistGesture,opponent:e.dataset.opponentDuelistGesture,outcome:e.dataset.duelistOutcome})')
    assert item['heldVictoryPose']=={'player':'victory','opponent':'defeat','outcome':'player'}
    page.wait_for_timeout(500)
    assert item['heldVictoryPose']==scene.evaluate('e=>({player:e.dataset.playerDuelistGesture,opponent:e.dataset.opponentDuelistGesture,outcome:e.dataset.duelistOutcome})')
    screenshot(page,output,'avatar-earned-after-genuine-native-exodia-win')
    page.reload(wait_until='domcontentloaded')
    page.locator('#duelist-avatar-open').click()
    choose(page,'mokuba','Mokuba')
    assert profile(page)['selectedAvatarId']=='mokuba'
    assert 'mokuba' in profile(page)['earnedAvatarIds']
    item['genuinelyWonAvatarSelectableAndPersistentAfterReload']=True
    item['nativeAssetsLoaded']=sorted(path for path in item['loaded'] if path.startswith('/native/'))
    assert {'/native/ocgcore.sync.wasm','/native/card-data.json','/native/scripts.json'}<=set(item['nativeAssetsLoaded'])
    screenshot(page,output,'avatar-mokuba-earned-selected')
    _,item['genuineWinCollectionExport']=download_collection(page,output,'avatar-motion-exodia-collection-download')
    assert not item['pageErrors'] and not item['nativeRequestFailures']
    item['ok']=True

def preview_ready(page):
    ui.wait_until(page,'() => {const stage=document.querySelector("#duelist-avatar-preview-stage");return stage && !stage.hidden && stage.querySelectorAll("canvas[data-duelist-avatar-canvas]").length===1 && !document.querySelector("#duelist-avatar-rotate-right").disabled}',timeout=45)
    assert page.locator('canvas[data-duelist-avatar-canvas]').count()==1

def preview_angle(page):
    return int(page.locator('#duelist-avatar-preview-stage').get_attribute('data-duelist-avatar-angle'))

def studio_motion_checks(page,item,output):
    stage=page.locator('#duelist-avatar-preview-stage')
    stage.scroll_into_view_if_needed()
    page.emulate_media(reduced_motion='reduce');page.wait_for_timeout(350)
    paused=len(item['studioDrawCalls']);stage.screenshot(path=str(output/f'avatar-studio-reduced-static-a-{item["width"]}.png'))
    page.wait_for_timeout(350)
    assert len(item['studioDrawCalls'])==paused,(paused,len(item['studioDrawCalls']))
    stage.screenshot(path=str(output/f'avatar-studio-reduced-static-b-{item["width"]}.png'))
    a=output/f'avatar-studio-reduced-static-a-{item["width"]}.png';b=output/f'avatar-studio-reduced-static-b-{item["width"]}.png'
    assert a.read_bytes()==b.read_bytes(),'Reduced-motion studio pixels changed without an input.'
    page.emulate_media(reduced_motion='no-preference');page.wait_for_timeout(400)
    resumed=len(item['studioDrawCalls']);assert resumed>paused,(paused,resumed)
    # A real small browser viewport moves the studio below the scrollport.
    page.set_viewport_size({'width':item['width'],'height':220})
    page.locator('.duelist-avatar-dialog').evaluate('e=>e.scrollTo(0,0)')
    page.wait_for_timeout(300)
    box=stage.bounding_box();assert box and box['y']>=220,box
    offscreen=len(item['studioDrawCalls']);page.wait_for_timeout(350)
    assert len(item['studioDrawCalls'])==offscreen,(offscreen,len(item['studioDrawCalls']))
    page.set_viewport_size({'width':item['width'],'height':item['height']})
    stage.scroll_into_view_if_needed();page.wait_for_timeout(350)
    returned=len(item['studioDrawCalls']);assert returned>offscreen,(offscreen,returned)
    page.emulate_media(reduced_motion=item['reducedMotion']);page.wait_for_timeout(100)
    item['studioPauseResume']={'preBootstrapInstrumentation':'Original WebGL clear methods wrapped with the same this/args/return; observes only the public studio canvas. No Game or application object accessed.',
      'reducedMotionDrawCount':paused,'unchangedReducedMotionPixels':True,'resumedDrawCount':resumed,'offscreenDrawCount':offscreen,'offscreenPaused':True,'visibleAgainDrawCount':returned,'originalPreferenceRestored':item['reducedMotion']}


def studio_checks(page,item,output,all_roster=False):
    page.locator('#duelist-avatar-open').click()
    reset_filters(page)
    page.locator('[data-duelist-avatar-mode="3d"]').click()
    preview_ready(page)
    canvas=page.locator('canvas[data-duelist-avatar-canvas]').element_handle()
    stage=page.locator('#duelist-avatar-preview-stage')
    stage.scroll_into_view_if_needed()
    stage.focus();page.keyboard.press('ArrowRight')
    assert preview_angle(page)==23
    page.keyboard.press('ArrowLeft');assert preview_angle(page)==0
    page.locator('#duelist-avatar-rotate-left').click();leftAngle=preview_angle(page);assert leftAngle in (-22,-23)
    page.locator('#duelist-avatar-rotate-right').click();assert preview_angle(page)==0
    page.locator('#duelist-avatar-recenter').click();assert preview_angle(page)==0
    stage.scroll_into_view_if_needed()
    box=stage.bounding_box();assert box and box['width']>70 and box['height']>100
    x,y=box['x']+box['width']*.25,box['y']+box['height']*.5
    if item['width']<600:
        session=page.context.new_cdp_session(page)
        session.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':y}]})
        session.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':x+55,'y':y}]})
        session.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});session.detach()
    else:
        page.mouse.move(x,y);page.mouse.down();page.mouse.move(x+55,y,steps=8);page.mouse.up()
    assert preview_angle(page)!=0
    item['rotationInput']={'keyboardRight':23,'buttonsLeft':leftAngle,'nativeDragAngle':preview_angle(page),'touch':item['width']<600}
    stage.focus();page.keyboard.press('Home');assert preview_angle(page)==0
    item['studioPreviews']=[]
    iconic=[('yugi','Yugi'),('kaiba','Seto Kaiba'),('jaden','Judai'),('yusei','Yusei'),('yuma','Yuma'),('yuya','Yuya'),('playmaker','Playmaker'),('yuga','Yuga Ohdo'),('yudias','Yudias'),('atem','Atem')]
    for id,query in iconic:
        reset_filters(page);page.locator('#duelist-avatar-search').fill(query)
        card=page.locator(f'[data-duelist-avatar-preview="{id}"]');card.click()
        stage.scroll_into_view_if_needed();preview_ready(page)
        ui.wait_until(page,'id=>document.querySelector("#duelist-avatar-detail").dataset.duelistAvatarId===id',id)
        assert page.evaluate('original=>original===document.querySelector("canvas[data-duelist-avatar-canvas]")',canvas)
        item['studioPreviews'].append({'id':id,'canvasLabel':page.locator('canvas[data-duelist-avatar-canvas]').get_attribute('aria-label'),'canvasCount':1})
        if id=='atem':assert page.locator('#duelist-avatar-select').is_disabled()
        screenshot(page,output,f'avatar-studio-{id}-{item["width"]}')
    if all_roster:
        # Each avatar is still drawn by the real renderer. Only ambient motion
        # and browser smooth scrolling pause during this exhaustive traversal.
        # The ten iconic captures above retain the original browser preference.
        page.emulate_media(reduced_motion='reduce')
        reset_filters(page);ids=[];started=time.monotonic()
        print(json.dumps({'stage':'studio-all-192','completed':0,'total':192}),flush=True)
        for p in range(8):
            for id in visible_ids(page):
                drawOffset=len(item['studioDrawCalls'])
                page.locator(f'[data-duelist-avatar-preview="{id}"]').click()
                stage.scroll_into_view_if_needed();preview_ready(page)
                assert page.locator('#duelist-avatar-detail').get_attribute('data-duelist-avatar-id')==id
                assert page.evaluate('original=>original===document.querySelector("canvas[data-duelist-avatar-canvas]")',canvas)
                label=page.locator('canvas[data-duelist-avatar-canvas]').get_attribute('aria-label')
                deadline=time.monotonic()+10
                while time.monotonic()<deadline and not any(draw.get('avatarId')==id and draw.get('canvasLabel')==label for draw in item['studioDrawCalls'][drawOffset:]):
                    page.wait_for_timeout(20)
                assert any(draw.get('avatarId')==id and draw.get('canvasLabel')==label for draw in item['studioDrawCalls'][drawOffset:]),f'No actual studio render for {id}'
                ids.append(id)
                elapsed=time.monotonic()-started
                progress={'stage':'studio-all-192','completed':len(ids),'total':192,'lastAvatarId':id,'elapsedSeconds':round(elapsed,1),'estimatedRemainingSeconds':round(elapsed/len(ids)*(192-len(ids)),1)}
                (output/'progress.json').write_text(json.dumps(progress)+'\n')
                if len(ids)%24==0:print(json.dumps(progress),flush=True)
            if p<7:page.locator('#duelist-avatar-next').click()
        assert len(ids)==len(set(ids))==192
        item['all192RenderedInOneStudioCanvas']=ids
        item['all192DurationSeconds']=round(time.monotonic()-started,1)
        item['all192DrawingEvidence']={'observedAvatarIds':sorted({draw.get('avatarId') for draw in item['studioDrawCalls'] if draw.get('avatarId') in ids}),'freshDrawRequiredPerSelection':True,'sameCanvasRequiredPerSelection':True,'loopPreference':'reduce','iconicCapturesPreference':item['reducedMotion']}
        assert len(item['all192DrawingEvidence']['observedAvatarIds'])==192
        page.emulate_media(reduced_motion=item['reducedMotion'])
        assert page.evaluate('matchMedia("(prefers-reduced-motion: reduce)").matches')==(item['reducedMotion']=='reduce')
        item['all192DrawingEvidence']['originalPreferenceRestored']=True
    studio_motion_checks(page,item,output)
    print(json.dumps({'stage':'studio-pause-resume','width':item['width'],'ok':True}),flush=True)
    page.locator('#duelist-avatar-series').select_option('gx');preview_ready(page)
    page.locator('#duelist-avatar-availability').select_option('locked');preview_ready(page)
    assert page.locator('canvas[data-duelist-avatar-canvas]').count()==1
    page.locator('[data-duelist-avatar-mode="portrait"]').click()
    ui.wait_until(page,'document.querySelectorAll("canvas[data-duelist-avatar-canvas]").length===0')
    item['portraitDisposesCanvas']=True
    page.locator('[data-duelist-avatar-mode="3d"]').click();preview_ready(page)
    page.keyboard.press('Escape')
    ui.wait_until(page,'document.querySelectorAll("canvas[data-duelist-avatar-canvas]").length===0')
    item['closeDisposesCanvas']=True
    page.locator('#duelist-avatar-open').click()
    assert page.locator('[data-duelist-avatar-mode="portrait"]').get_attribute('aria-pressed')=='true'
    page.locator('[data-duelist-avatar-mode="3d"]').click();preview_ready(page)
    # An actual WebGL context loss exercises the visible recovery path before
    # any Duel starts. No app object or started Game is accessed.
    page.locator('canvas[data-duelist-avatar-canvas]').evaluate('canvas=>canvas.getContext("webgl2").getExtension("WEBGL_lose_context").loseContext()')
    ui.wait_until(page,'document.querySelector("[data-duelist-avatar-mode=portrait]").getAttribute("aria-pressed")==="true"')
    assert page.locator('canvas[data-duelist-avatar-canvas]').count()==0
    assert 'indisponible' in page.locator('#duelist-avatar-preview-status').inner_text()
    item['realContextLossRecoversPortrait']=True
    screenshot(page,output,f'avatar-studio-context-loss-fallback-{item["width"]}')
    reset_filters(page)
    page.keyboard.press('Escape')
    assert page.locator('#start-modal').is_visible()
    assert page.evaluate('document.body.scrollWidth<=innerWidth')
    assert not item['pageErrors'] and not item['cspViolations']

def download_collection(page,output,label):
    details=page.locator('.duelist-avatar-help')
    if details.get_attribute('open') is None:details.locator('summary').click()
    with page.expect_download() as pending:
        page.locator('#duelist-avatar-export').click()
    download=pending.value
    target=output/(label+'.json');download.save_as(target)
    assert download.failure() is None
    value=json.loads(target.read_text())
    assert value['version']==1 and isinstance(value['earnedAvatarIds'],list)
    return target,{'suggestedFilename':download.suggested_filename,'bytes':target.stat().st_size,'sha256':hashlib.sha256(target.read_bytes()).hexdigest(),'profile':value}

def import_file(page,path):
    details=page.locator('.duelist-avatar-help')
    if details.get_attribute('open') is None:details.locator('summary').click()
    with page.expect_file_chooser() as pending:page.locator('#duelist-avatar-import').click()
    pending.value.set_files(str(path))
    ui.wait_until(page,'() => {const s=document.querySelector("#duelist-avatar-transfer-status");return s.textContent && !s.textContent.includes("Import de la collection…") && !document.querySelector("#duelist-avatar-import").disabled}')
    return page.locator('#duelist-avatar-transfer-status').inner_text()

def transfer_checks(page,base,item,output,compiled,win_export,loss_export):
    earned=json.loads(loss_export.read_text())
    item['preBootstrapFixture']={'profileFromRealEarlierConcession':earned}
    page.add_init_script(f'if(!localStorage.getItem("ygo_duelist_avatar_v1"))localStorage.setItem("ygo_duelist_avatar_v1",{json.dumps(json.dumps(earned))});')
    start_page(page,base,item,compiled)
    # A genuine running Duel remains intact during collection transfer.
    page.locator('#btn-start-duel').click()
    ui.wait_until(page,'() => Boolean(document.querySelector("#player-hand .card-entity")) || [...document.querySelectorAll("#decision-options button")].some(b=>b.checkVisibility() && b.textContent.trim()==="JE COMMENCE")',timeout=90)
    first=page.get_by_role('button',name='JE COMMENCE',exact=True)
    if first.is_visible():first.click()
    page.wait_for_selector('#player-hand .card-entity');await_public_player_main(page)
    before=page.evaluate(PUBLIC_STATE)
    deck_before=page.evaluate('localStorage.getItem("ygo_custom_deck")')
    page.locator('#btn-settings').click();page.locator('#btn-settings-avatars').click()
    old_profile=profile(page)
    item['realFileImportStatus']=import_file(page,win_export)
    assert 'importée' in item['realFileImportStatus']
    merged=profile(page)
    assert set(old_profile['earnedAvatarIds'])<=set(merged['earnedAvatarIds'])
    assert 'mokuba' in merged['earnedAvatarIds'] and 'tristan' in merged['earnedAvatarIds']
    assert merged['selectedAvatarId']=='mokuba'
    item['mergedProfile']=merged
    saved_file,item['roundTripDownload']=download_collection(page,output,'avatar-motion-merged-collection-download')
    assert item['roundTripDownload']['profile']==merged
    invalid=[('null','null'),('malformed','{'),('unknown','{"version":1,"selectedAvatarId":"unknown","earnedAvatarIds":[]}'),('oversized',' '*64001)]
    item['refusedRealFiles']=[]
    for name,text in invalid:
        path=output/(f'avatar-motion-invalid-{name}.json');path.write_text(text)
        message=import_file(page,path)
        assert 'refusé' in message.lower() or '64' in message
        assert profile(page)==merged
        item['refusedRealFiles'].append({'kind':name,'bytes':path.stat().st_size,'message':message,'profilePreserved':True})
    screenshot(page,output,'avatar-motion-import-refused-preserves-collection')
    page.keyboard.press('Escape');page.locator('#btn-close-settings').click()
    assert page.evaluate(PUBLIC_STATE)==before
    assert page.evaluate('localStorage.getItem("ygo_custom_deck")')==deck_before
    item['nativePublicStateAndDeckPreservedByImportExport']=True
    item['opponentConcealment']=ui.verify_concealment(page)
    item['ok']=True

def storage_failure_checks(page,base,item,output,compiled,win_export):
    initial={'version':1,'selectedAvatarId':'yugi','earnedAvatarIds':[]}
    page.add_init_script(f'''(() => {{const write=Storage.prototype.setItem;write.call(localStorage,'ygo_duelist_avatar_v1',{json.dumps(json.dumps(initial))});Storage.prototype.setItem=function(key,value){{if(key==='ygo_duelist_avatar_v1')throw new DOMException('Isolated quota fixture','QuotaExceededError');return write.call(this,key,value);}};}})()''')
    item['preBootstrapFixture']={'avatarStorageWriteFailure':'QuotaExceededError for avatar key only; all other storage remains usable.'}
    start_page(page,base,item,compiled)
    page.locator('#duelist-avatar-open').click()
    message=import_file(page,win_export)
    assert 'session' in message and 'refusé' in message
    assert profile(page)==initial
    assert page.locator('#player-label').get_attribute('data-avatar-id')=='mokuba'
    _,item['inMemoryCollectionDownload']=download_collection(page,output,'avatar-motion-session-collection-download')
    assert item['inMemoryCollectionDownload']['profile']['selectedAvatarId']=='mokuba'
    assert 'mokuba' in item['inMemoryCollectionDownload']['profile']['earnedAvatarIds']
    item['storageFailureSessionStatus']=message
    screenshot(page,output,'avatar-motion-storage-refused-session-preserved')
    item['ok']=True

def fallback_focus_checks(page,base,item,output,compiled):
    item['preBootstrapFixture']={'description':'Browser DOM capability fixture: Element.prototype.checkVisibility is unavailable before bootstrap. No Game is started.'}
    page.add_init_script("Object.defineProperty(Element.prototype,'checkVisibility',{configurable:true,value:undefined});")
    start_page(page,base,item,compiled)
    page.locator('#duelist-avatar-open').click()
    item['fallbackFocusAtBothSizes']=[]
    for width,height in [(1280,900),(390,844)]:
        page.set_viewport_size({'width':width,'height':height});focus_checks(page,item)
        item['fallbackFocusAtBothSizes'].append({'width':width,'height':height,'focusLoop':item['focusLoop']})
    screenshot(page,output,'avatar-motion-focus-without-dom-checkvisibility-390')
    assert page.evaluate('typeof Element.prototype.checkVisibility')=='undefined'
    item['ok']=True


def unavailable_webgl_checks(page,base,item,output,compiled):
    item['browserCapabilityFixture']={'chromiumFlags':['--disable-webgl','--disable-3d-apis'],'scope':'Browser WebGL disabled before bootstrap; no application API patched.'}
    start_page(page,base,item,compiled)
    page.locator('#duelist-avatar-open').click()
    page.locator('#duelist-avatar-search').fill('Atem')
    page.locator('[data-duelist-avatar-preview="atem"]').click()
    page.locator('[data-duelist-avatar-mode="3d"]').click()
    ui.wait_until(page,'document.querySelector("#duelist-avatar-preview-status").textContent.includes("indisponible")')
    assert page.locator('[data-duelist-avatar-mode="portrait"]').get_attribute('aria-pressed')=='true'
    assert page.locator('canvas[data-duelist-avatar-canvas]').count()==0
    assert page.locator('#duelist-avatar-svg-preview svg').is_visible()
    assert page.locator('#duelist-avatar-select').is_disabled()
    item['noWebglFallback']={'status':page.locator('#duelist-avatar-preview-status').inner_text(),'portraitVisible':True,'canvasCount':0,'lockedStillRefused':True}
    screenshot(page,output,'avatar-motion-webgl-unavailable-portrait-fallback')
    assert not item['pageErrors'] and not item['cspViolations']
    item['ok']=True

def gesture_fixture():
    text=(ROOT/'main.js').read_text().split('const PREMADE_DECKS = {',1)[1]
    part=text.split('kaiba: {',1)[1].split('main: [',1)[1].split(']',1)[0]
    main=[str(int(code)) for code in re.findall(r"'([0-9]+)'",part)]
    main=['15025844' if code=='5053103' else '89943723' if code=='83764718' else code for code in main]
    for index,code in {25:'5053103',4:'43422537',18:'66602787',14:'81439173',11:'83764718'}.items():main[index]=code
    assert len(main)==40 and max(Counter(main).values())<=3 and main.count('83764718')==main.count('81439173')==1
    return {'main':main,'extra':['23995346','84013237','77637979'],'side':[]}

def gesture_checks(page,item,output):
    helper_spec=importlib.util.spec_from_file_location('avatar_motion_native_actions',ROOT/'scripts/audit-continuation-models-ui.py')
    actions=importlib.util.module_from_spec(helper_spec);helper_spec.loader.exec_module(actions)
    item.setdefault('actions',[])
    actions.activate_hand_spell(page,'43422537',item)
    place_public_hand_card(page,'66602787','monster',True);await_public_player_main(page)
    item['afterPublicSummonAndCasting']=page.evaluate(PUBLIC_STATE)
    screenshot(page,output,f'avatar-motion-summon-casting-{item["width"]}')
    if item['reducedMotion']=='reduce':
        assert not any(s[owner] in ('summon','casting','attack','damage') for s in item['gestureObservations'] for owner in ('player','opponent'))
        item['transientGesturesOmittedForReducedMotion']=True
        return
    page.locator('#btn-end-turn').click();await_public_player_main(page)
    before=page.evaluate(PUBLIC_STATE)
    if page.locator('#btn-next-phase').is_enabled():
        page.locator('#btn-next-phase').click()
        deadline=time.monotonic()+20
        while time.monotonic()<deadline:
            dismiss_public_decisions(page)
            if page.locator('#phase-battle').get_attribute('class') and 'active' in page.locator('#phase-battle').get_attribute('class'):break
            page.wait_for_timeout(50)
    attacker=page.locator('.card-zone[data-side="player"][data-zone-type="monster"] [data-id="5053103"]').first
    if attacker.count():
        attacker.click()
        target=page.locator('.card-zone[data-side="opponent"].can-target').first
        direct=page.locator('#btn-direct-attack')
        if target.count():target.click()
        elif direct.is_visible() and direct.is_enabled():direct.click()
        else:raise AssertionError('No public legal target or direct attack was offered.')
        dismiss_public_decisions(page)
        page.wait_for_timeout(1500)
    item['afterActualNativeBattle']=page.evaluate(PUBLIC_STATE)
    screenshot(page,output,f'avatar-motion-native-attack-damage-{item["width"]}')
    kinds={s[owner] for s in item['gestureObservations'] for owner in ('player','opponent')}
    item['observedGestureKinds']=sorted(kinds)
    assert {'summon','casting','attack','damage'}<=kinds,item['gestureObservations']
    assert (before['playerLp'],before['opponentLp'])!=(item['afterActualNativeBattle']['playerLp'],item['afterActualNativeBattle']['opponentLp']) or any(s['player']=='damage' for s in item['gestureObservations'])
    item['opponentConcealment']=ui.verify_concealment(page)

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--base-url')
    parser.add_argument('--dist',type=Path,default=ROOT/'dist')
    parser.add_argument('--expected-entry-sha256')
    parser.add_argument('--freeze',type=Path,default=Path('/workspace/yugioh-avatar-build-freeze-2026-10-11.json'))
    parser.add_argument('--output',type=Path,required=True)
    parser.add_argument('--phase',choices=['source','compiled'],default='source')
    parser.add_argument('--only-genuine-win',action='store_true')
    parser.add_argument('--stage',choices=['full','studio','gestures','win'],default='full')
    args=parser.parse_args()
    args.output.mkdir(parents=True,exist_ok=True)
    compiled=args.phase=='compiled'
    server=None
    report={'ok':False,'date':'2026-10-11','executedAtUtc':datetime.now(timezone.utc).isoformat(),
     'driver':{'path':str(Path(__file__)),'bytes':Path(__file__).stat().st_size,'sha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest()},
     'scope':'Actual public DOM avatar studio, real collection downloads and File uploads, native WASM gestures and outcomes. No QA hook or application object is called; no started Game is injected or mutated.',
     'driverDependenciesBefore':fingerprints(['scripts/audit-native-duel-ui.py','scripts/audit-continuation-models-ui.py','scripts/audit-native-duel-views.py']),
     'phase':args.phase,'sourceBefore':fingerprints(SOURCE_PATHS),'paths':[]}
    if compiled:
        assert args.expected_entry_sha256,'Compiled validation requires root GO and frozen entry SHA.'
        freeze=json.loads(args.freeze.read_text())
        frozenSourcesBefore=fingerprints(list(freeze['source']))
        assert frozenSourcesBefore==freeze['source'],'Application differs from root frozen sources before browser run.'
        report['rootFreeze']={'path':str(args.freeze),'bytes':args.freeze.stat().st_size,'sha256':hashlib.sha256(args.freeze.read_bytes()).hexdigest(),'sourceCount':len(freeze['source'])}
        report['allFrozenSourcesBefore']=frozenSourcesBefore
        local=dist_fingerprints(args.dist)
        assert all(local.get(path)==pin for path,pin in freeze['compiled'].items()),'Compiled assets differ from root freeze.'
        assert set(freeze['additionalStaticAssets'])==set(ADDITIONAL_STATIC_ASSETS),'Unexpected additional static assets.'
        assert all(local.get(path)==pin for path,pin in freeze['additionalStaticAssets'].items()),'Additional static assets differ from root freeze.'
        report['additionalStaticAssets']=freeze['additionalStaticAssets']
        entry=re.search(r'src="([^"]+/index-[^"]+\.js)"',(args.dist/'index.html').read_text()).group(1).lstrip('/')
        assert local[entry]['sha256']==args.expected_entry_sha256
        report.update(expectedEntrySha256=args.expected_entry_sha256,compiledAssets=local)
        ui.AuditServer.headers_to_add=ui.production_headers()
        server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(ui.AuditServer,directory=str(args.dist)))
        threading.Thread(target=server.serve_forever,daemon=True).start()
        base=f'http://127.0.0.1:{server.server_port}'
    else:
        assert args.base_url
        base=args.base_url
    report['baseUrl']=base
    page=None
    try:
        with sync_playwright() as playwright:
            browser=playwright.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
            if compiled:
                context=browser.new_context();servedBefore=http_fingerprints(context.request,base,local);context.close()
                assert servedBefore==local
                report['servedBefore']=servedBefore
            for width,height,motion in ([] if args.only_genuine_win or args.stage=='win' else [(1280,900,'no-preference'),(390,844,'reduce')]):
                context=browser.new_context(viewport={'width':width,'height':height},reduced_motion=motion,has_touch=width<600)
                item={'width':width,'height':height,'reducedMotion':motion};report['paths'].append(item)
                page=context.new_page()
                draft=gesture_fixture()
                item['preBootstrapFixture']={'ygo_custom_deck':draft,'description':'Legal isolated Main40/Extra3; fixture precedes bootstrap. Native gestures come only from later actual public controls.'}
                page.add_init_script(f'if(!localStorage.getItem("ygo_custom_deck"))localStorage.setItem("ygo_custom_deck",{json.dumps(json.dumps(draft))});')
                start_page(page,base,item,compiled)
                try:
                    picker_checks(page,item,args.output)
                    if args.stage!='gestures':studio_checks(page,item,args.output,all_roster=width==1280)
                    if args.stage!='studio':
                        native_checks(page,item,args.output);gesture_checks(page,item,args.output)
                    item['ok']=True
                    print(json.dumps({'stage':'completed-browser-path','width':width,'pathCount':len(report['paths'])}),flush=True)
                except Exception:
                    item['ok']=False
                    screenshot(page,args.output,f'failure-public-dom-{width}')
                    item['failurePublicDom']=page.locator('body').inner_text()[-5500:]
                    raise
                item['loaded']=sorted(item['loaded']);context.close()
            if not args.only_genuine_win and args.stage=='full':
                context=browser.new_context(viewport={'width':1280,'height':900},reduced_motion='reduce')
                item={'width':1280,'height':900,'kind':'genuine-progress-from-pre-bootstrap-two-loss-fixture'};report['paths'].append(item)
                page=context.new_page();progression_checks(page,base,item,args.output,compiled)
                item['loaded']=sorted(item['loaded']);context.close()
            if args.stage in ('full','win') or args.only_genuine_win:
                context=browser.new_context(viewport={'width':1280,'height':900},reduced_motion='reduce')
                item={'width':1280,'height':900,'kind':'genuine-native-exodia-win-from-legal-pre-bootstrap-deck'};report['paths'].append(item)
                page=context.new_page()
                try:
                    genuine_win_checks(page,base,item,args.output,compiled)
                except Exception:
                    item['ok']=False
                    screenshot(page,args.output,'failure-exodia-public-dom')
                    item['failurePublicDom']=page.locator('body').inner_text()[-5500:]
                    raise
                item['loaded']=sorted(item['loaded']);context.close()
            if args.stage=='full':
                win_export=args.output/'avatar-motion-exodia-collection-download.json'
                loss_export=args.output/'avatar-motion-concession-collection-download.json'
                for kind,check in [('real-download-and-file-import',transfer_checks),('storage-failure-session',storage_failure_checks)]:
                    context=browser.new_context(viewport={'width':1280,'height':900},reduced_motion='reduce')
                    item={'width':1280,'height':900,'kind':kind};report['paths'].append(item)
                    page=context.new_page()
                    try:
                        if check is transfer_checks:check(page,base,item,args.output,compiled,win_export,loss_export)
                        else:check(page,base,item,args.output,compiled,win_export)
                    except Exception:
                        item['ok']=False
                        screenshot(page,args.output,f'failure-{kind}')
                        item['failurePublicDom']=page.locator('body').inner_text()[-5500:]
                        raise
                    item['loaded']=sorted(item['loaded']);context.close()
                context=browser.new_context(viewport={'width':1280,'height':900},reduced_motion='reduce')
                item={'width':1280,'height':900,'kind':'real-focus-loop-without-checkvisibility'};report['paths'].append(item)
                page=context.new_page()
                try:fallback_focus_checks(page,base,item,args.output,compiled)
                except Exception:
                    screenshot(page,args.output,'failure-focus-fallback')
                    item['failurePublicDom']=page.locator('body').inner_text()[-5500:]
                    raise
                item['loaded']=sorted(item['loaded']);context.close()
                fallback_browser=playwright.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-webgl','--disable-3d-apis'])
                context=fallback_browser.new_context(viewport={'width':390,'height':844},reduced_motion='reduce')
                item={'width':390,'height':844,'kind':'genuine-browser-webgl-unavailable'};report['paths'].append(item)
                page=context.new_page()
                try:unavailable_webgl_checks(page,base,item,args.output,compiled)
                except Exception:
                    screenshot(page,args.output,'failure-webgl-unavailable')
                    item['failurePublicDom']=page.locator('body').inner_text()[-5500:]
                    raise
                item['loaded']=sorted(item['loaded']);context.close();fallback_browser.close()
            if compiled:
                context=browser.new_context();servedAfter=http_fingerprints(context.request,base,local);context.close()
                assert servedAfter==servedBefore==local==dist_fingerprints(args.dist)
                frozenSourcesAfter=fingerprints(list(freeze['source']))
                assert frozenSourcesAfter==frozenSourcesBefore==freeze['source']
                report.update(servedAfter=servedAfter,frozenCompiledAssetsUnchanged=True,allFrozenSourcesAfter=frozenSourcesAfter,allRootFrozenSourcesUnchanged=True)
            for path in report['paths']:
                path['expectedWebglCapabilityConsoleErrors']=[text for text in path.get('browserConsoleErrors',[]) if path.get('kind')=='genuine-browser-webgl-unavailable' and (text=='THREE.WebGLRenderer: Error creating WebGL context.' or (text.startswith('THREE.WebGLRenderer: A WebGL context could not be created.') and 'disabled by enterprise policy or commandline switch' in text))]
                if path.get('kind')=='genuine-browser-webgl-unavailable':
                    assert path['browserCapabilityFixture']['chromiumFlags']==['--disable-webgl','--disable-3d-apis']
                    assert len(path['expectedWebglCapabilityConsoleErrors'])==3,path['browserConsoleErrors']
                    assert path['expectedWebglCapabilityConsoleErrors'].count('THREE.WebGLRenderer: Error creating WebGL context.')==1
                    assert sum(text.startswith('THREE.WebGLRenderer: A WebGL context could not be created.') for text in path['expectedWebglCapabilityConsoleErrors'])==2
                path['unexpectedBrowserConsoleErrors']=[text for text in path.get('browserConsoleErrors',[]) if text not in path['expectedWebglCapabilityConsoleErrors']]
                assert not path.get('unexpectedBrowserConsoleErrors'),path['unexpectedBrowserConsoleErrors']
                assert not path.get('httpErrors'),path['httpErrors']
                assert not path.get('pageErrors') and not path.get('nativeRequestFailures') and not path.get('cspViolations'),path
            report.update(ok=all(p.get('ok')for p in report['paths']) and not any(p.get('findings')for p in report['paths']),
              sourceAfter=fingerprints(SOURCE_PATHS),driverDependenciesAfter=fingerprints(['scripts/audit-native-duel-ui.py','scripts/audit-continuation-models-ui.py','scripts/audit-native-duel-views.py']),captures={p.name:{'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in sorted(args.output.glob('*.png'))})
            if compiled:assert report['sourceBefore']==report['sourceAfter'],'Frozen application sources changed during the audit.'
            assert report['driverDependenciesBefore']==report['driverDependenciesAfter'],'Browser helpers changed during the audit.'
            report['driverAfter']={'path':str(Path(__file__)),'bytes':Path(__file__).stat().st_size,'sha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest()}
            assert report['driver']==report['driverAfter'],'Browser driver changed during the audit.'
            browser.close()
    except Exception as error:
        report['failure']={'type':type(error).__name__,'message':str(error)[:2000]}
        try:
            if page and not page.is_closed():
                screenshot(page,args.output,'failure-public-dom')
                report['failurePublicDom']=page.locator('body').inner_text()[-5500:]
        except Exception:pass
        raise
    finally:
        for item in report['paths']:
            if isinstance(item.get('loaded'),set):item['loaded']=sorted(item['loaded'])
        (args.output/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
        if server:server.shutdown()
    print(json.dumps({'ok':report['ok'],'paths':len(report['paths']),'captures':len(report['captures']),'findings':[p.get('findings',[])for p in report['paths']]}))

if __name__=='__main__':main()
