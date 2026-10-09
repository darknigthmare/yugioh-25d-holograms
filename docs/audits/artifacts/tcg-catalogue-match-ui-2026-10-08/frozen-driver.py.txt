#!/usr/bin/env python3
"""Frozen strict TCG catalogue, lawful summons and genuine Match siding/restoration.

Requires coordinator GO and final entry SHA. Never builds. Only the isolated
saved Deck and initial RNG are installed before Duel start; subsequent actions
use visible production controls. Own registered Match Decks may be read from
local storage; opposing hidden hands and private engine/scene objects are not.
"""
import argparse
from collections import Counter
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

ROOT = Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('tcg_catalogue_model_helpers',ROOT/'scripts/audit-continuation-models-ui.py')
models=importlib.util.module_from_spec(spec);spec.loader.exec_module(models)
ui=models.ui
# Opening-method draws are deterministic without consuming the Deck shuffle
# stream. On Match reload the first-player choice is already saved: the same
# pre-start Deck stream remains valid when no opening draw occurs at all.
RNG_FIXTURE = """(() => {
  window.addEventListener('securitypolicyviolation', event => {
    (window.__auditCspViolations ||= []).push({directive:event.effectiveDirective,
      blocked:['eval','wasm-eval','inline'].includes(event.blockedURI)?event.blockedURI:'resource'});
  });
  let state=0x9e3779b9;
  Object.defineProperty(crypto,'getRandomValues',{value(view){
    if(view.length===1){view[0]=2;return view;}
    for(let index=0;index<view.length;index++){
      state^=state<<13;state^=state>>>17;state^=state<<5;view[index]=state>>>0;
    }
    return view;
  }});
})()"""


def fixture(kind):
    text=(ROOT/'main.js').read_text().split('const PREMADE_DECKS = {',1)[1]
    base=text.split('kaiba: {',1)[1].split('main: [',1)[1].split(']',1)[0]
    main=[str(int(code))for code in re.findall(r"'([0-9]+)'",base)]
    assert len(main)==40
    main=['15025844'if code=='83764718'else code for code in main]
    if kind=='tribute-revival':
        positions={25:'39552864',4:'43422537',18:'70095154',14:'81439173',11:'83764718',20:'89943723'}
        side=['72989439','14558127']
    elif kind=='bls-procedure':
        positions={25:'72989439',4:'81439173',18:'28985331',14:'70095154',11:'43422537',20:'46986414',24:'39552864'}
        side=['89943723']
    elif kind=='utopia-xyz':
        positions={25:'5053103',4:'43422537',18:'91152256',14:'81439173',11:'83764718'}
        side=['89943723']
    else:raise ValueError(kind)
    for index,code in positions.items():main[index]=code
    # Preset has three Battle Ox: avoid adding a fourth in the Xyz fixture.
    if kind=='utopia-xyz':
        excess=main.count('5053103')-3
        for index in range(40):
            if excess and index!=25 and main[index]=='5053103':main[index]='39552864';excess-=1
    draft={'main':main,'extra':['23995346','84013237','77637979'],'side':side}
    assert len(main)==40 and max(Counter(main+draft['extra']+side).values())<=3
    assert main.count('81439173')==1 and main.count('83764718')<=1
    return draft


def source_fingerprints():
    paths=[Path(__file__),ROOT/'scripts/audit-continuation-models-ui.py',ROOT/'scripts/audit-native-duel-ui.py',ROOT/'scripts/audit-native-duel-views.py',ROOT/'main.js',ROOT/'index.html',ROOT/'style.css',ROOT/'vercel.json']
    paths += [p for folder in ['src/core/native','src/core/tcg']for p in (ROOT/folder).glob('*.js')]
    paths += [ROOT/p for p in ['src/core/MatchEngine.js','src/ui/MatchController.js','src/ui/TCGMatchClock.js','src/ui/DeckBuilderRules.js','src/ui/HologramMonsterModels.js','src/ui/HologramPopularStapleModels.js','src/ui/HologramPopularGodModels.js','src/ui/CombatVisualProfiles.js','src/ui/PopularStapleReferenceArt.js','src/ui/PopularGodReferenceArt.js']]
    return {str(p.relative_to(ROOT)):{'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()}for p in sorted(set(paths))}


def public_state(page):
    return models.snapshot(page) | {'matchStatus':page.locator('#match-status').inner_text(),
        'nativeActionMenuEnabled':page.locator('#btn-native-actions').is_visible() and page.locator('#btn-native-actions').is_enabled()}


def stored_match(page):
    return page.evaluate("""() => {
      const outer=JSON.parse(localStorage.getItem('ygo_active_match_v1')||'null');if(!outer)return null;
      const payload=JSON.parse(outer.controller),state=payload.engine.state;
      const ids=deck=>deck?Object.fromEntries(['mainDeck','extraDeck','sideDeck'].map(section=>[section,deck[section].map(c=>String(c.id))])):null;
      return {outerVersion:outer.version,controllerVersion:payload.version,status:state.status,gameNumber:state.gameNumber,
        scores:state.scores,banlistId:state.banlistId,activeOwnDeck:ids(state.activeDecks.player),
        registeredOwnDeck:ids(state.registeredDecks.player),stagedOwnDeck:ids(payload.controller.stagedDecks.player),
        ownCardsHaveStableIds:state.registeredDecks.player.mainDeck.every(c=>/^\\d+$/.test(String(c.id))),
        firstPlayerDecision:payload.controller.pendingFirstPlayerDecision};
    }""")


def complete_decisions(page, report, wanted=None, wait_seconds=35, activate_effect=None):
    deadline=time.monotonic()+wait_seconds;selected=wanted is None;quiet=0
    while time.monotonic()<deadline:
        modal=page.locator('#decision-modal')
        if not modal.is_visible():
            if page.locator('#btn-end-turn').is_enabled():
                quiet+=1
                if quiet>=3:return
            page.wait_for_timeout(75);continue
        quiet=0
        title=page.locator('#decision-modal-title').inner_text()
        options=modal.locator('.decision-card-option').filter(visible=True)
        expected=options.filter(has_text=re.compile(wanted,re.I))if wanted and not selected else None
        confirm=page.locator('#decision-options .decision-confirm-button, #decision-options > button.btn-magenta').filter(visible=True)
        cancel=page.locator('#btn-decision-cancel')
        trigger=modal.locator('.decision-choice-list button').filter(has_text=re.compile(activate_effect,re.I))if activate_effect else None
        finish=modal.locator('.decision-choice-list button').filter(has_text=re.compile('CONFIRMER LES MATÉRIELS',re.I))
        material_add=modal.locator('.decision-choice-list button').filter(has_text=re.compile(r'^AJOUTER',re.I))if title=='CHOISIR LES MATÉRIELS'else None
        if trigger is not None and trigger.count():
            report.setdefault('decisions',[]).append({'title':title,'selectedOwnTrigger':trigger.first.inner_text()});trigger.first.click()
        elif finish.count():finish.first.click()
        elif material_add is not None and material_add.count():
            report.setdefault('decisions',[]).append({'title':title,'selectedPublicMaterial':material_add.first.inner_text()});material_add.first.click()
        elif expected is not None and expected.count():
            chosen=expected.first;report.setdefault('decisions',[]).append({'title':title,'selectedPublicCandidate':chosen.inner_text()});chosen.click();selected=True
        elif confirm.count() and confirm.first.is_enabled():confirm.first.click()
        elif cancel.is_visible() and cancel.is_enabled():cancel.click()
        elif options.count():
            available=options.locator('xpath=self::*[not(@aria-pressed) or @aria-pressed="false"]')
            assert available.count(),title+' has no unselected legal candidate'
            report.setdefault('decisions',[]).append({'title':title,'selectedRequiredCandidate':available.first.inner_text()});available.first.click()
        else:
            buttons=page.locator('#decision-options button:not([disabled])').filter(visible=True)
            assert buttons.count(),title
            report.setdefault('decisions',[]).append({'title':title,'selectedRequiredChoice':buttons.first.inner_text()});buttons.first.click()
        page.wait_for_timeout(75)
    raise AssertionError('Offered native decisions did not finish: '+str(report.get('decisions',[])[-5:]))


def native_action(page, label, report, wanted=None, activate_effect=None):
    assert page.locator('#btn-native-actions').is_enabled()
    page.locator('#btn-native-actions').click();page.locator('#decision-modal').wait_for(state='visible')
    choice=page.locator('#decision-options .decision-choice-list button').filter(has_text=re.compile(label,re.I))
    assert choice.count(),page.locator('#decision-options').inner_text()
    report.setdefault('actions',[]).append({'offeredNativeAction':choice.first.inner_text()})
    choice.first.click();complete_decisions(page,report,wanted,activate_effect=activate_effect)
    ui.await_player_main(page)


def start(page, base, draft, report, match=False):
    errors=[];failures=[];loaded=set()
    report.update(pageErrors=errors,nativeRequestFailures=failures,loaded=loaded)
    page.on('pageerror',lambda error:errors.append(str(error)[:500]))
    page.on('requestfailed',lambda request:failures.append(urlsplit(request.url).path)if '/native/'in request.url else None)
    page.on('response',lambda response:loaded.add(urlsplit(response.url).path)if response.status==200 else None)
    page.on('dialog',lambda dialog:dialog.accept()if dialog.type=='confirm'else dialog.dismiss())
    page.add_init_script(RNG_FIXTURE)
    page.add_init_script(f"if (!localStorage.getItem('ygo_custom_deck')) localStorage.setItem('ygo_custom_deck', {json.dumps(json.dumps(draft))});")
    response=page.goto(base,wait_until='domcontentloaded')
    assert response.header_value('content-security-policy')==ui.production_headers()['Content-Security-Policy']
    page.locator('input[name="game-mode"][value="strict"]').check()
    page.locator('input[name="ai-difficulty"][value="easy"]').check()
    if match:page.locator('input[name="duel-series"][value="match"]').check()
    page.locator('[data-deck-id="custom"]').click()
    ui.wait_until(page,"() => document.querySelector('#builder-catalogue-status')?.textContent.includes('TCG • liste Advanced complète')")
    assert page.locator('#deck-validity-badge').inner_text()=='Deck valide',page.locator('#deck-validity-badge').inner_text()
    report['strictCatalogueStatus']=page.locator('#builder-catalogue-status').inner_text()


def launch(page, report):
    page.locator('#btn-start-duel').click()
    ui.wait_until(page,"() => !document.querySelector('#start-modal').checkVisibility() || [...document.querySelectorAll('#decision-options button')].some(b=>b.checkVisibility())")
    first=page.get_by_role('button',name='JE COMMENCE',exact=True)
    if first.is_visible():first.click()
    page.locator('#start-modal').wait_for(state='hidden');page.wait_for_selector('#player-hand .card-entity')
    ui.await_player_main(page);report['opening']=public_state(page)
    assert report['opening']['nativeActionMenuEnabled'],report['opening']


def catalogue(page, output, report, draft):
    search=page.locator('#builder-card-search');search.fill('89943723')
    neos=page.locator('#library-cards-list [data-card-id="89943723"]');neos.wait_for(state='visible');assert neos.is_enabled()
    art=neos.evaluate("async e=>{const src=e.style.backgroundImage.match(/url\\([\"']?([^\"')]+)/)[1];const i=new Image();i.src=src;await i.decode();return{src,width:i.naturalWidth,height:i.naturalHeight}}")
    assert art['src']=='/cards/cropped/89943723.jpg' and art['width']>100
    page.locator('#builder-add-to-side').check();neos=page.locator('#library-cards-list [data-card-id="89943723"]');neos.click()
    own=page.evaluate('JSON.parse(localStorage.getItem("ygo_custom_deck"))')
    assert own['main']==draft['main'] and own['extra']==draft['extra'] and own['side']==draft['side']+['89943723']
    report['fullCatalogueAddedOutsideOriginal390']={'id':'89943723','sourceArtDecoded':art,'savedOwnDeck':own}
    page.screenshot(path=str(output/f'catalogue-neos-added-{report["width"]}.png'),animations='disabled')
    page.locator('#builder-add-to-side').uncheck();search.fill('55144522')
    forbidden=page.locator('#library-cards-list [data-card-id="55144522"]');forbidden.wait_for(state='visible')
    assert forbidden.is_disabled() and 'INTERDITE'in forbidden.inner_text()
    report['forbiddenVisibleButNotAddable']={'id':'55144522','disabled':forbidden.is_disabled(),'title':forbidden.get_attribute('title'),'text':forbidden.inner_text()}
    assert page.evaluate('JSON.parse(localStorage.getItem("ygo_custom_deck"))')==own
    page.screenshot(path=str(output/f'catalogue-pot-greed-refused-{report["width"]}.png'),animations='disabled')
    exclusions=[]
    for code,kind in [('64865','OCG-only'),('101402082','prerelease-unverified')]:
        search.fill(code);page.wait_for_timeout(150)
        assert page.locator(f'#library-cards-list [data-card-id="{code}"]').count()==0
        exclusions.append({'id':code,'kind':kind,'strictResultCount':0})
    report['regionalExclusions']=exclusions
    search.fill('');page.reload(wait_until='domcontentloaded');page.locator('[data-deck-id="custom"]').click()
    ui.wait_until(page,"() => document.querySelector('#builder-catalogue-status')?.textContent.includes('TCG • liste Advanced complète')")
    assert page.evaluate('JSON.parse(localStorage.getItem("ygo_custom_deck"))')==own
    assert page.locator('#deck-validity-badge').inner_text()=='Deck valide'
    report['catalogueReloadPreservesOutside390ById']=True
    return own


def capture_models(page, output, report, label, expected):
    models.switch_view(page,'real');ready=models.views.wait_real_projection(page)
    state=public_state(page);report.setdefault('stages',[]).append({'label':label,'state':state,'readiness':ready})
    for code,stats in expected.items():
        card=next(card for card in state['ownMonsters']if card['id']==code)
        assert card['modelRendered']and(card['atk'],card['def'])==(f'ATK {stats[0]}',f'DEF {stats[1]}'),card
    page.screenshot(path=str(output/f'{label}-{report["width"]}.png'),animations='disabled')
    # Inspect only our visible rendered card. Exact full JPEG must decode.
    for code in expected:
        anchor=page.locator(f'.card-zone[data-side="player"][data-zone-type="monster"] [data-id="{code}"]').first
        anchor.focus()
        report.setdefault('publicInspectorKeyboardFocus',[]).append({'id':code,'accessibleLabel':anchor.get_attribute('aria-label')})
        image=page.locator('#inspector-display img')
        ui.wait_until(page,"code=>{const i=document.querySelector('#inspector-display img');if(!i)return false;const u=new URL(i.src,location.href);return u.origin===location.origin&&u.pathname==='/cards/reference/'+code+'.jpg'}",code)
        image.evaluate('i=>i.decode()');assert image.evaluate('i=>i.complete&&i.naturalWidth>100')
        report.setdefault('inspectorImageFacts',[]).append(image.evaluate('i=>({path:new URL(i.src).pathname,width:i.naturalWidth,height:i.naturalHeight,complete:i.complete})'))
    report.setdefault('exactFullInspectorImagesDecoded',[]).extend(expected)


def tribute_revival(page, output, report):
    assert {c['id']for c in report['opening']['ownHand']}=={'39552864','43422537','70095154','81439173','83764718'}
    models.place_public_card(page,'39552864','monster',True,report,output);ui.await_player_main(page)
    models.activate_hand_spell(page,'43422537',report)
    native_action(page,r'^Invoquer Cyber Dragon',report,r'Sphère Mystique Lumineuse|Mystical Shine Ball')
    state=public_state(page);assert [c['id']for c in state['ownMonsters']]==['70095154']and state['ownGraveCount']==2
    page.locator('#player-graveyard-zone').click();page.locator('#public-zone-modal').wait_for(state='visible')
    assert page.locator('#public-zone-list [data-id="39552864"]').count()==1;page.locator('#btn-close-public-zone').click()
    report['cyberTributeThroughActualOfferedNormalProcedure']=True
    models.activate_hand_spell(page,'81439173',report,r'Elemental HERO Neos|Neos','89943723')
    models.activate_hand_spell(page,'83764718',report,r'Elemental HERO Neos|Neos','89943723')
    capture_models(page,output,report,'tcg-cyber-tribute-neos-revival',{'70095154':(2100,1600),'89943723':(2500,2000)})


def siding_restore(page, output, report, own):
    page.locator('#btn-reset').click();page.locator('#gameover-modal').wait_for(state='visible')
    report['concessionPublicUi']={'gameover':page.locator('#gameover-modal').inner_text(),'match':page.locator('#match-status').inner_text()}
    assert 'abandonné'in report['concessionPublicUi']['gameover'].lower()
    page.locator('#btn-restart-duel').click();page.locator('#side-deck-modal').wait_for(state='visible')
    before=stored_match(page);assert before and before['status']=='between_games'and before['scores']['opponent']==1 and before['scores']['player']==0
    page.locator('input[name="next-first-player"][value="player"]').check()
    # Neos is one copied CDB card outside the old illustrated390; swap its Main copy with BLS.
    index=own['main'].index('89943723')
    page.locator(f'.side-deck-card[data-section="mainDeck"][data-index="{index}"]').click()
    page.locator('.side-deck-card[data-section="sideDeck"][data-index="0"]').click()
    ui.wait_until(page,"() => document.querySelector('#side-deck-feedback')?.textContent.includes('échangées')")
    after=stored_match(page);assert after and after['stagedOwnDeck'],after
    assert after['firstPlayerDecision']['firstPlayerId']=='player',after['firstPlayerDecision']
    expected={'mainDeck':list(own['main']),'extraDeck':list(own['extra']),'sideDeck':list(own['side'])}
    expected['mainDeck'][index],expected['sideDeck'][0]=expected['sideDeck'][0],expected['mainDeck'][index]
    assert after['stagedOwnDeck']==expected,after
    assert Counter(sum(after['registeredOwnDeck'].values(),[]))==Counter(sum(expected.values(),[]))
    report['sideExchange']={'before':before,'after':after,'expectedOwnDeck':expected,'combinedMultisetPreserved':True}
    page.screenshot(path=str(output/f'match-sided-before-reload-{report["width"]}.png'),animations='disabled')
    page.reload(wait_until='domcontentloaded');page.locator('#side-deck-modal').wait_for(state='visible')
    assert 'Match restauré'in page.locator('#side-deck-feedback').inner_text()
    restored=stored_match(page);assert restored['stagedOwnDeck']==expected and restored['scores']==after['scores']
    assert restored['firstPlayerDecision']['firstPlayerId']=='player',restored['firstPlayerDecision']
    assert 'Black Luster'in page.locator(f'.side-deck-card[data-section="mainDeck"][data-index="{index}"]').inner_text()
    assert 'Neos'in page.locator('.side-deck-card[data-section="sideDeck"][data-index="0"]').inner_text()
    report['reloadPreservesLegalSideExchangeAndOutside390Ids']=True;report['restoredMatch']=restored
    page.screenshot(path=str(output/f'match-sided-restored-{report["width"]}.png'),animations='disabled')
    assert page.locator('#btn-start-next-duel').is_enabled();page.locator('#btn-start-next-duel').click()
    page.locator('#side-deck-modal').wait_for(state='hidden');page.wait_for_selector('#player-hand .card-entity');ui.await_player_main(page)
    state=public_state(page);assert re.search(r'\bduel\s*2\b',state['matchStatus'],re.I),state['matchStatus']
    assert page.locator('input[name="game-mode"][value="strict"]').is_checked()
    state['selectedStrictModeChecked']=True
    assert Counter(c['id']for c in state['ownHand'])==Counter(['39552864','43422537','70095154','81439173','83764718'])
    assert page.locator('#turn-status').inner_text().startswith('Votre tour')
    assert not page.locator('#btn-next-phase').is_visible(),'The restored first player must have no first-turn Battle Phase'
    assert stored_match(page)is None
    report['nativeDuel2AfterRealConcession']=state;report['nativeDuel2RestoredFirstPlayerChoice']=True
    page.screenshot(path=str(output/f'match-native-duel2-{report["width"]}.png'),animations='disabled')


def bls_procedure(page, output, report):
    assert {c['id']for c in report['opening']['ownHand']}=={'72989439','81439173','28985331','70095154','43422537'}
    models.activate_hand_spell(page,'81439173',report,r'Sphère Mystique Lumineuse|Mystical Shine Ball','39552864')
    native_action(page,r'^Invoquer Armageddon Knight',report,r'Magicien Sombre|Dark Magician',activate_effect=r'Armageddon Knight')
    page.locator('#player-graveyard-zone').click();page.locator('#public-zone-modal').wait_for(state='visible')
    assert page.locator('#public-zone-list [data-id="39552864"]').count()==1 and page.locator('#public-zone-list [data-id="46986414"]').count()==1
    page.locator('#btn-close-public-zone').click()
    native_action(page,r'^Invoquer spécialement Black Luster Soldier',report)
    page.locator('#player-banished-zone').click();page.locator('#public-zone-modal').wait_for(state='visible')
    banished=page.locator('#public-zone-list [data-id]').evaluate_all('(cards)=>cards.map(c=>c.dataset.id)')
    assert {'39552864','46986414'}<=set(banished),banished;page.locator('#btn-close-public-zone').click()
    report['blsActualNativeProcedureWithLightDarkBanish']={'banishedOwnPublicIds':banished,'procedure':'offered Special Summon, LIGHT and DARK in own GY'}
    capture_models(page,output,report,'tcg-bls-light-dark-native',{'72989439':(3000,2500)})


def utopia_xyz(page, output, report):
    assert {c['id']for c in report['opening']['ownHand']}=={'5053103','43422537','91152256','81439173','83764718'}
    native_action(page,r'^Invoquer (Battle Ox|Bœuf de Combat|Bœuf de Bataille)',report)
    models.activate_hand_spell(page,'43422537',report)
    native_action(page,r'^Invoquer (Celtic Guardian|Gardien Celte|Gardien Celtique)',report)
    before=public_state(page)
    assert Counter(c['id']for c in before['ownMonsters'])==Counter(['5053103','91152256']),before
    report['utopiaTwoPublicLevel4BeforeProcedure']=before
    decisions_before=len(report.get('decisions',[]))
    native_action(page,r'^Invoquer spécialement (Numéro 39|Number 39)',report)
    material_choices=[choice for choice in report.get('decisions',[])[decisions_before:]if 'selectedPublicMaterial'in choice]
    assert len(material_choices)==2,material_choices
    assert any(re.search(r'Battle Ox|Bœuf de Combat|Bœuf de Bataille',choice['selectedPublicMaterial'],re.I)for choice in material_choices),material_choices
    assert any(re.search(r'Celtic Guardian|Gardien Celte|Gardien Celtique',choice['selectedPublicMaterial'],re.I)for choice in material_choices),material_choices
    report['utopiaTwoActualPublicMaterialChoices']=material_choices
    capture_models(page,output,report,'tcg-utopia-native-xyz',{'84013237':(2500,2000)})
    assert len(public_state(page)['ownMonsters'])==1
    report['actualNativeXyzFromTwoLevel4Materials']=True


def finish(page, report):
    report['opponentConcealment']=ui.verify_concealment(page)
    report['productionQaHookAbsent']=page.evaluate('typeof window.__YGO_QA__')=='undefined'
    report['cspViolations']=page.evaluate('window.__auditCspViolations||[]')
    report['loadedHttpAssets']=sorted(report.pop('loaded'))
    for path in ['/native/ocgcore.sync.wasm','/native/card-data.json','/native/scripts.json']:assert path in report['loadedHttpAssets']
    assert report['productionQaHookAbsent']and not report['pageErrors']and not report['nativeRequestFailures']and not report['cspViolations']
    assert not re.search(r'moteur natif est arrêté|Lua error|RETRY',page.locator('#log-content').inner_text(),re.I)
    report['ok']=True


def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--expected-entry-sha256',required=True)
    parser.add_argument('--dist',type=Path,default=ROOT/'dist');parser.add_argument('--output',type=Path,default=ROOT/'docs/audits/artifacts/tcg-catalogue-match-ui-2026-10-08')
    parser.add_argument('--desktop-only',action='store_true');parser.add_argument('--skip-optional-models',action='store_true');args=parser.parse_args()
    local,essential=models.compiled_wave_fingerprints(args.dist)
    for code in ['70095154','89943723','84013237','72989439','14558127']:
      for kind in ['reference','cropped','small']:
        relative=f'cards/{kind}/{code}.jpg';body=(args.dist/relative).read_bytes();source=(ROOT/'public'/relative).read_bytes()
        assert body==source,'Compiled source JPEG differs: '+relative
        local[relative]={'bytes':len(body),'sha256':hashlib.sha256(body).hexdigest()}
    entry=next(path for path in local if re.fullmatch(r'assets/index-[^/]+\.js',path));assert local[entry]['sha256']==args.expected_entry_sha256
    args.output.mkdir(parents=True,exist_ok=True)
    assert not list(args.output.glob('*.png')),'Archive prior top-level captures before a new final run'
    sources=source_fingerprints()
    ui.AuditServer.headers_to_add=ui.production_headers()
    server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(ui.AuditServer,directory=str(args.dist)))
    threading.Thread(target=server.serve_forever,daemon=True).start();base=f'http://127.0.0.1:{server.server_port}'
    report={'ok':False,'generatedOn':'2026-10-08','expectedEntrySha256':args.expected_entry_sha256,'rngFixtureSha256':hashlib.sha256(RNG_FIXTURE.encode()).hexdigest(),'rngScope':'Pre-start deterministic initial crypto source; one-word opening choice returns player without consuming the Deck stream, allowing saved Match first-player restoration. Native later shuffles remain core-owned.','sourceDependenciesBefore':sources,'essentialBuildAssets':essential,'paths':[],
      'scope':'Real compiled strict TCG Advanced UI: full catalogue, forbidden/regional eligibility, actual native summon procedures, public surrender, lawful siding, reload and next native Duel.',
      'limitations':['Only the recorded duels and registered Decks are certified; not the entire card-interaction universe.','Public model flags, own stats and visible projections are checked; source geometry 1:1 and transient attack pixels are not claimed.','The Xyz procedure records the two own public field IDs and actual material choices; there is no separate DOM overlay list to inspect.','No Swiss clock path is certified by this driver.']}
    try:
      with sync_playwright() as driver:
        browser=driver.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        context=browser.new_context();before=models.fingerprints(context.request,base,local);context.close();assert before==local
        for width,height in [(1280,900)]+([]if args.desktop_only else[(390,844)]):
          context=browser.new_context(viewport={'width':width,'height':height});page=context.new_page();page.set_default_timeout(30000)
          item={'width':width,'height':height,'kind':'catalogue-tribute-revival-match','actions':[]};report['paths'].append(item)
          draft=fixture('tribute-revival');item['prestartSavedDeckFixture']=draft
          start(page,base,draft,item,match=True);own=catalogue(page,args.output,item,draft)
          launch(page,item);tribute_revival(page,args.output,item);siding_restore(page,args.output,item,own);finish(page,item);context.close()
        if not args.skip_optional_models:
          for kind,verify in [('bls-procedure',bls_procedure),('utopia-xyz',utopia_xyz)]:
            context=browser.new_context(viewport={'width':1280,'height':900});page=context.new_page();page.set_default_timeout(30000)
            item={'width':1280,'height':900,'kind':kind,'actions':[]};report['paths'].append(item)
            draft=fixture(kind);item['prestartSavedDeckFixture']=draft;start(page,base,draft,item);launch(page,item);verify(page,args.output,item);finish(page,item);context.close()
        context=browser.new_context();after=models.fingerprints(context.request,base,local);context.close()
        compiled_after=models.compiled_wave_fingerprints(args.dist)[0]
        for relative in local:
          if relative.startswith('cards/'):
            body=(args.dist/relative).read_bytes();compiled_after[relative]={'bytes':len(body),'sha256':hashlib.sha256(body).hexdigest()}
        assert before==after==local==compiled_after
        assert source_fingerprints()==sources
        report.update(ok=True,servedResponsesBefore=before,servedResponsesAfter=after,compiledBuildUnchanged=True,sourceDependenciesAfter=source_fingerprints(),captureSha256={p.name:hashlib.sha256(p.read_bytes()).hexdigest()for p in sorted(args.output.glob('*.png'))})
        browser.close()
    except Exception as error:
      report['failure']={'type':type(error).__name__,'message':str(error)[:1800]}
      for item in report['paths']:
        if isinstance(item.get('loaded'),set):item['loadedHttpAssets']=sorted(item.pop('loaded'))
      try:
        if 'page'in locals()and not page.is_closed():page.screenshot(path=str(args.output/'failure-public-dom.png'),animations='disabled',timeout=60000);report['failurePublicDom']=page.locator('body').inner_text()[-4000:]
      except Exception:pass
      raise
    finally:
      for item in report['paths']:
        if isinstance(item.get('loaded'),set):item['loadedHttpAssets']=sorted(item.pop('loaded'))
      (args.output/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');server.shutdown()
    print(json.dumps({'ok':report['ok'],'paths':len(report['paths']),'captures':len(report['captureSha256']),'entrySha256':args.expected_entry_sha256}))

if __name__=='__main__':main()
