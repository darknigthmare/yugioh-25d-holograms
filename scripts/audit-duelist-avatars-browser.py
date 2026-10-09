#!/usr/bin/env python3
"""Real browser validation of public avatar selection and native duel continuity.

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
 'src/ui/DuelistAvatarPortrait.js','src/ui/DuelViewController.js','src/ui/RealDuelView.js','src/ui/RealDuelScene3D.js',
 'src/core/native/NativeDuelGame.js','public/native/ocgcore.sync.wasm','public/native/card-data.json','public/native/scripts.json']
RNG = """(() => {
 window.addEventListener('securitypolicyviolation', event => {
  (window.__avatarAuditCspViolations ||= []).push({directive:event.effectiveDirective,
   blocked:['eval','wasm-eval','inline'].includes(event.blockedURI)?event.blockedURI:'resource'});
 });
 let state=0x9e3779b9;
 Object.defineProperty(crypto,'getRandomValues',{value(view){
  if(view.length===1){view[0]=2;return view;}
  for(let i=0;i<view.length;i++){state^=state<<13;state^=state>>>17;state^=state<<5;view[i]=state>>>0;}
  return view;
 }});
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
    return fingerprints(paths,dist)

def http_fingerprints(request,base,local):
    out={}
    for path in local:
        response=request.get(base.rstrip('/')+'/'+path)
        assert response.status==200,(path,response.status)
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
    item.update(pageErrors=errors,nativeRequestFailures=failed,loaded=loaded)
    page.on('pageerror',lambda error:errors.append(str(error)[:600]))
    page.on('requestfailed',lambda request:failed.append(urlsplit(request.url).path) if '/native/' in request.url else None)
    page.on('response',lambda response:loaded.add(urlsplit(response.url).path) if response.status==200 else None)
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
    # Check real keyboard navigation after the browser reaches the help summary.
    summary=page.locator('.duelist-avatar-help summary')
    summary.focus()
    page.keyboard.press('Tab')
    item['tabAfterHelpSummary']=page.evaluate('({id:document.activeElement.id,inside:!!document.activeElement.closest("#duelist-avatar-modal"),tag:document.activeElement.tagName})')
    item.setdefault('findings',[])
    if not item['tabAfterHelpSummary']['inside']:
        item['findings'].append('Tab from the help summary escapes the avatar modal focus trap.')
    page.locator('#duelist-avatar-close').focus()
    page.keyboard.press('Shift+Tab')
    item['reverseTabInside']=page.evaluate('!!document.activeElement.closest("#duelist-avatar-modal")')
    assert item['reverseTabInside']
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
    item['reloadSelectionPersists']=True

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
    page.locator('input[name="ai-difficulty"][value="easy"]').check()
    page.locator('#btn-start-duel').click()
    ui.wait_until(page,'() => Boolean(document.querySelector("#player-hand .card-entity")) || [...document.querySelectorAll("#decision-options button")].some(b=>b.checkVisibility() && b.textContent.trim()==="JE COMMENCE")',timeout=90)
    first=page.get_by_role('button',name='JE COMMENCE',exact=True)
    if first.is_visible():first.click()
    page.locator('#start-modal').wait_for(state='hidden')
    page.wait_for_selector('#player-hand .card-entity')
    ui.await_player_main(page)
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
        index=ui.place_hand_card(page,code,'monster',True)
        ui.await_player_main(page)
        item['realNormalSummonAfterAvatarSwap']={'id':code,'index':index,'publicState':page.evaluate(PUBLIC_STATE)}
        screenshot(page,output,f'avatar-native-kaiba-after-summon-{item["width"]}')
    else:
        item['realNormalSummonAfterAvatarSwap']={'offeredOwnHandNormalMonster':False}
    item['nativeAssetsLoaded']=sorted(path for path in item['loaded'] if path.startswith('/native/'))
    assert {'/native/ocgcore.sync.wasm','/native/card-data.json','/native/scripts.json'}<=set(item['nativeAssetsLoaded'])
    assert page.evaluate('document.body.scrollWidth<=innerWidth')
    item['cspViolations']=page.evaluate('window.__avatarAuditCspViolations||[]')
    assert not item['cspViolations'] and not item['pageErrors'] and not item['nativeRequestFailures']
    item['ok']=True

def progression_checks(page,base,item,output,compiled):
    stats={'duels':2,'wins':0,'losses':2,'draws':0,'reasons':{'concession':2},'last':None}
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
    ui.await_player_main(page)
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
    screenshot(page,output,'avatar-earned-after-genuine-concession')
    page.reload(wait_until='domcontentloaded')
    page.locator('#duelist-avatar-open').click()
    choose(page,'tristan','Tristan')
    assert 'tristan' in profile(page)['earnedAvatarIds']
    item['genuinelyEarnedAvatarSelectableAfterReload']=True
    screenshot(page,output,'avatar-tristan-earned-selected')
    item['ok']=True

def exodia_fixture():
    text=(ROOT/'main.js').read_text().split('const PREMADE_DECKS = {',1)[1]
    part=text.split('kaiba: {',1)[1].split('main: [',1)[1].split(']',1)[0]
    main=[str(int(code)) for code in re.findall(r"'([0-9]+)'",part)]
    assert len(main)==40
    parts=['33396948','70903634','44519536','8124921','7902349']
    for index,code in zip([25,4,18,14,11],parts):main[index]=code
    draft={'main':main,'extra':['23995346','84013237','77637979'],'side':[]}
    assert max(Counter(main+draft['extra']).values())<=3
    assert all(main.count(code)==1 for code in parts)
    return draft

def genuine_win_checks(page,base,item,output,compiled):
    draft=exodia_fixture()
    item['preBootstrapFixture']={'ygo_custom_deck':draft,'description':'Legal Main 40 / Extra 3 / Side 0; five unique Exodia parts at the deterministic initial shuffle positions. No changes after Duel start.'}
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
    assert not item['pageErrors'] and not item['nativeRequestFailures']
    item['ok']=True

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--base-url')
    parser.add_argument('--dist',type=Path,default=ROOT/'dist')
    parser.add_argument('--expected-entry-sha256')
    parser.add_argument('--output',type=Path,required=True)
    parser.add_argument('--phase',choices=['source','compiled'],default='source')
    parser.add_argument('--only-genuine-win',action='store_true')
    args=parser.parse_args()
    args.output.mkdir(parents=True,exist_ok=True)
    compiled=args.phase=='compiled'
    server=None
    report={'ok':False,'date':'2026-10-09','executedAtUtc':datetime.now(timezone.utc).isoformat(),
     'driver':{'path':str(Path(__file__)),'bytes':Path(__file__).stat().st_size,'sha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest()},
     'scope':'Actual public DOM avatar selector and native Duel. No QA hook is called; no started Game is injected or mutated.',
     'phase':args.phase,'sourceBefore':fingerprints(SOURCE_PATHS),'paths':[]}
    if compiled:
        assert args.expected_entry_sha256,'Compiled validation requires root GO and frozen entry SHA.'
        local=dist_fingerprints(args.dist)
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
            for width,height,motion in ([] if args.only_genuine_win else [(1280,900,'no-preference'),(390,844,'reduce')]):
                context=browser.new_context(viewport={'width':width,'height':height},reduced_motion=motion)
                item={'width':width,'height':height,'reducedMotion':motion};report['paths'].append(item)
                page=context.new_page();start_page(page,base,item,compiled)
                try:
                    picker_checks(page,item,args.output);native_checks(page,item,args.output)
                except Exception:
                    screenshot(page,args.output,f'failure-public-dom-{width}')
                    item['failurePublicDom']=page.locator('body').inner_text()[-5500:]
                    raise
                item['loaded']=sorted(item['loaded']);context.close()
            if not args.only_genuine_win:
                context=browser.new_context(viewport={'width':1280,'height':900},reduced_motion='reduce')
                item={'width':1280,'height':900,'kind':'genuine-progress-from-pre-bootstrap-two-loss-fixture'};report['paths'].append(item)
                page=context.new_page();progression_checks(page,base,item,args.output,compiled)
                item['loaded']=sorted(item['loaded']);context.close()
            context=browser.new_context(viewport={'width':1280,'height':900},reduced_motion='reduce')
            item={'width':1280,'height':900,'kind':'genuine-native-exodia-win-from-legal-pre-bootstrap-deck'};report['paths'].append(item)
            page=context.new_page()
            try:
                genuine_win_checks(page,base,item,args.output,compiled)
            except Exception:
                screenshot(page,args.output,'failure-exodia-public-dom')
                item['failurePublicDom']=page.locator('body').inner_text()[-5500:]
                raise
            item['loaded']=sorted(item['loaded']);context.close()
            if compiled:
                context=browser.new_context();servedAfter=http_fingerprints(context.request,base,local);context.close()
                assert servedAfter==servedBefore==local==dist_fingerprints(args.dist)
                report.update(servedAfter=servedAfter,frozenCompiledAssetsUnchanged=True)
            report.update(ok=all(p.get('ok')for p in report['paths']) and not any(p.get('findings')for p in report['paths']),
              sourceAfter=fingerprints(SOURCE_PATHS),captures={p.name:{'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in sorted(args.output.glob('*.png'))})
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
