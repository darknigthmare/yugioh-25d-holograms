#!/usr/bin/env python3
"""Verify native Pendulum selection from Hand and face-up Extra through UI.

Run after building. A legal 40-card registration and the shared deterministic
crypto stream affect only isolated audit browsers. All card moves, targets,
selections and placements use rendered controls and unchanged official Lua.
No QA hook, native API injection, private opponent state or image editing.
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

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('native_ui_audit',ROOT/'scripts/audit-native-duel-ui.py')
ui=importlib.util.module_from_spec(spec);spec.loader.exec_module(ui)
CARDS=['16178681','20409757','97590747','5318639','94415058']
ODD_EYES=re.compile(r'Odd.Eyes|Yeux Impairs',re.I)
LA_JINN=re.compile(r'La Jinn',re.I)


def fixture():
    draft,_=ui.custom_deck_fixture()
    # The varied crypto stream performs the real initial shuffle. These input
    # positions become its opening five cards; the saved registration is never
    # reordered and no response is supplied to the native engine.
    for index,card in zip([11,14,18,4,25],CARDS):
        draft['main'][index]=card
    assert len(draft['main'])==40 and max(Counter(draft['main']).values())<=3
    return draft


def settle(page,timeout=30):
    deadline=time.monotonic()+timeout
    while time.monotonic()<deadline:
        if page.locator('#decision-modal').is_visible():
            title=page.locator('#decision-modal-title').inner_text()
            passing=page.locator('#decision-options .decision-choice-list button').filter(has_text=re.compile('PASSER LA PRIORITÉ'))
            if passing.count(): passing.click()
            elif title=='ACTIVER UN EFFET ?' and page.get_by_role('button',name='NON',exact=True).is_visible():
                page.get_by_role('button',name='NON',exact=True).click()
            else: raise AssertionError(f'Unexpected unresolved decision: {title}')
        elif page.locator('#btn-end-turn').is_enabled():
            return
        page.wait_for_timeout(100)
    raise AssertionError('Native action did not return to an actionable player Main Phase')


def activate(page,code,index):
    page.locator(f'#player-hand .card-entity[data-id="{code}"]').click()
    zone=page.locator(f'.player-s-zone[data-index="{index}"]')
    assert 'active-zone' in (zone.get_attribute('class') or ''),'Destination is not offered'
    zone.click()
    page.locator('#action-modal').wait_for(state='visible')
    action=page.locator('#btn-action-faceup')
    assert action.is_enabled()
    action.click()
    page.locator('#action-modal').wait_for(state='hidden')


def choose_card(page,pattern):
    candidates=page.locator('#decision-options .decision-card-option').filter(has_text=pattern)
    assert candidates.count()==1,f'Card is not uniquely offered: {pattern.pattern}'
    candidates.click()
    confirm=page.locator('#decision-options > button.btn-magenta')
    if confirm.count():
        assert confirm.is_enabled(),'Selected native target is not legal'
        confirm.click()


def run_view(page,url,view,out,draft):
    errors,failed,decision_trace=[],[],[]
    page.on('pageerror',lambda error:errors.append(str(error)[:600]))
    page.on('requestfailed',lambda request:failed.append(urlsplit(request.url).path) if '/native/' in request.url else None)
    page.add_init_script(ui.RNG_FIXTURE)
    page.add_init_script(f"localStorage.setItem('ygo_custom_deck',{json.dumps(json.dumps(draft))});")
    page.goto(url,wait_until='domcontentloaded')
    assert page.evaluate('typeof window.__YGO_QA__')=='undefined'
    page.locator('input[name="game-mode"][value="native"]').check()
    page.locator('[data-deck-id="custom"]').click()
    ui.wait_until(page,"() => document.querySelector('#builder-catalogue-status')?.textContent.includes('cartes avec règles natives')")
    assert page.locator('#deck-validity-badge').inner_text()=='Deck valide'
    assert page.locator('#deck-size-val').inner_text()=='Main: 40 / Extra: 1 / Side: 0'
    page.locator('#btn-start-duel').click()
    ui.wait_until(page,"() => !document.querySelector('#start-modal').checkVisibility() || [...document.querySelectorAll('#decision-options button')].some(button => button.checkVisibility())")
    first=page.get_by_role('button',name='JE COMMENCE',exact=True)
    assert first.is_visible(),'The fixed stream must offer the player the first-turn choice'
    first.click()
    page.locator('#start-modal').wait_for(state='hidden')
    page.wait_for_selector('#player-hand .card-entity')
    settle(page)
    opening=page.locator('#player-hand .card-entity').evaluate_all('(cards)=>cards.map(card=>card.dataset.id)')
    assert Counter(opening)==Counter(CARDS),f'Unexpected own opening: {opening}'
    assert page.evaluate('JSON.parse(localStorage.getItem("ygo_custom_deck"))')==draft
    view['checks']['exactFortyCardFixtureAndShuffledOpening']=True

    activate(page,'16178681',0);settle(page)
    activate(page,'20409757',4);settle(page)
    assert page.locator('.player-s-zone[data-index="0"] .card-entity[data-id="16178681"]').count()==1
    assert page.locator('.player-s-zone[data-index="4"] .card-entity[data-id="20409757"]').count()==1
    view['checks']['twoScalesActivatedViaControls']=True
    activate(page,'5318639',2)
    ui.wait_until(page,"() => document.querySelector('#decision-modal').checkVisibility() && document.querySelectorAll('#decision-options .decision-card-option').length>0")
    decision_trace.append({'stage':'MST target','title':page.locator('#decision-modal-title').inner_text(),
        'offered':page.locator('#decision-options .decision-card-option').all_inner_texts()})
    choose_card(page,ODD_EYES)
    settle(page)
    assert page.locator('.player-s-zone[data-index="0"] .card-entity').count()==0
    assert page.locator('#player-gy-count').inner_text()=='1','Only MST should reach the Graveyard'
    page.locator('#player-extra-zone').click()
    page.locator('#extra-deck-modal').wait_for(state='visible')
    odd=page.locator('#extra-deck-list .face-up-extra-card[data-id="16178681"]')
    assert odd.count()==1 and 'FACE RECTO' in odd.inner_text()
    assert page.locator('#extra-deck-list .native-extra-pendulum-action').count()==0,'No procedure with an absent low scale'
    page.locator('#close-extra-modal').click()
    view['checks']['mstDestroyedScaleMovedFaceUpToExtra']=True

    activate(page,'94415058',0);settle(page)
    assert page.locator('.player-s-zone[data-index="0"] .card-entity[data-id="94415058"]').count()==1
    page.locator('#player-extra-zone').click()
    page.locator('#extra-deck-modal').wait_for(state='visible')
    procedure=page.locator('#extra-deck-list .native-extra-pendulum-action')
    assert procedure.count()==1 and procedure.is_enabled()
    assert 'CHOISIR LES MONSTRES PENDULE' in procedure.inner_text()
    button_style=procedure.evaluate("""button => {
        const style=getComputedStyle(button),bounds=button.getBoundingClientRect();
        return {backgroundColor:style.backgroundColor,borderColor:style.borderColor,
            minHeight:style.minHeight,whiteSpace:style.whiteSpace,width:bounds.width,height:bounds.height};
    }""")
    assert button_style['height']>=44 and float(button_style['minHeight'].removesuffix('px'))>=44
    assert button_style['backgroundColor']=='rgba(255, 0, 204, 0.1)' and button_style['borderColor']=='rgb(255, 0, 204)'
    assert button_style['whiteSpace']=='normal'
    view['procedureButtonStyle']=button_style
    odd=page.locator('#extra-deck-list .face-up-extra-card[data-id="16178681"]')
    assert odd.count()==1 and 'CHOIX PENDULE' in odd.inner_text()
    page.screenshot(path=str(out/f'native-pendulum-extra-{view["width"]}.png'),animations='disabled')
    procedure.click()
    page.locator('#extra-deck-modal').wait_for(state='hidden')
    ui.wait_until(page,"() => document.querySelector('#decision-modal').checkVisibility()")
    view['checks']['extraModalStartsCoreProcedureWithoutPredeterminedUids']=True

    # The official procedure may emit a multi-selection or successive
    # add/remove prompts. Answer the two actual offered cards explicitly.
    multiple=page.locator('#decision-options .decision-card-option')
    if multiple.count():
        offered=multiple.all_inner_texts()
        assert any(ODD_EYES.search(label) for label in offered) and any(LA_JINN.search(label) for label in offered)
        decision_trace.append({'stage':'Pendulum candidates','offered':offered})
        page.screenshot(path=str(out/f'native-pendulum-choices-{view["width"]}.png'),animations='disabled')
        multiple.filter(has_text=LA_JINN).click()
        multiple.filter(has_text=ODD_EYES).click()
        confirm=page.locator('#decision-options > button.btn-magenta')
        assert confirm.is_enabled();confirm.click()
    else:
        for pattern in [LA_JINN,ODD_EYES]:
            ui.wait_until(page,"() => document.querySelectorAll('#decision-options .decision-choice-list button').length>0")
            offered=page.locator('#decision-options .decision-choice-list button').all_inner_texts()
            decision_trace.append({'stage':'Pendulum add/remove','offered':offered})
            if pattern==LA_JINN:
                assert any(ODD_EYES.search(label) for label in offered) and any(LA_JINN.search(label) for label in offered)
                page.screenshot(path=str(out/f'native-pendulum-choices-{view["width"]}.png'),animations='disabled')
            option=page.locator('#decision-options .decision-choice-list button').filter(has_text=pattern).filter(has_text=re.compile('^AJOUTER'))
            assert option.count()==1;option.click()
        ui.wait_until(page,"() => document.querySelector('#decision-modal').checkVisibility() && (document.querySelector('#decision-modal-title').textContent!=='CHOISIR LES MATÉRIELS' || [...document.querySelectorAll('#decision-options button')].some(button=>button.textContent==='CONFIRMER LES MATÉRIELS'))")
        confirm=page.get_by_role('button',name='CONFIRMER LES MATÉRIELS',exact=True)
        if confirm.is_visible():confirm.click()
    view['checks']['humanChoosesHandAndFaceUpExtraCandidates']=True

    placements=[]
    for _ in range(20):
        if page.locator('.player-m-zone .card-entity[data-id="97590747"]').count() and page.locator('.extra-m-zone .card-entity[data-id="16178681"]').count():
            settle(page);break
        ui.wait_until(page,"() => document.querySelector('#decision-modal').checkVisibility()")
        title=page.locator('#decision-modal-title').inner_text()
        if title=='CHOISIR LA ZONE':
            options=page.locator('#decision-options .decision-card-option')
            labels=options.all_inner_texts()
            mains=options.filter(has_text=re.compile(r'^Votre Zone Monstre [1-5]$'))
            selection=mains.first if mains.count() else options.filter(has_text=re.compile('Votre Zone Monstre Extra')).first
            assert selection.count(),'No legal Main or Extra zone offered'
            placements.append({'offered':labels,'selected':selection.inner_text()})
            selection.click();page.locator('#decision-options > button.btn-magenta').click()
        elif title=='CHOISIR LA POSITION':
            page.get_by_role('button',name='ATTAQUE FACE RECTO',exact=True).click()
        elif title=='RÉPONDRE À LA CHAÎNE':
            page.get_by_role('button',name='PASSER LA PRIORITÉ',exact=True).click()
        else: raise AssertionError(f'Unexpected summon decision: {title}')
    else: raise AssertionError('Pendulum native placement did not complete')
    assert page.locator('.player-m-zone .card-entity[data-id="97590747"]').count()==1
    assert page.locator('.extra-m-zone.player-controlled .card-entity[data-id="16178681"]').count()==1
    assert page.locator('.player-m-zone .card-entity[data-id="16178681"]').count()==0,'Face-up Extra must obey MR5'
    assert page.locator('#player-hand .card-entity').count()==0
    assert any('Extra' in entry['selected'] for entry in placements)
    view['checks']['nativeMr5HandToMainAndFaceUpExtraToExtraMonsterZone']=True
    view['placements']=placements
    page.locator('#player-extra-zone').click()
    page.locator('#extra-deck-modal').wait_for(state='visible')
    assert page.locator('#extra-deck-list .face-up-extra-card').count()==0
    assert page.locator('#extra-deck-list .native-extra-pendulum-action').count()==0
    page.locator('#close-extra-modal').click()
    pendulum=page.locator('#btn-pendulum-summon')
    assert not pendulum.is_visible() or not pendulum.is_enabled()
    view['checks']['oncePerTurnProcedureRemoved']=True
    view['checks']['opponentConcealment']=ui.verify_concealment(page)
    assert page.evaluate('document.body.scrollWidth<=innerWidth')
    assert page.evaluate('JSON.parse(localStorage.getItem("ygo_custom_deck"))')==draft
    page.screenshot(path=str(out/f'native-pendulum-board-{view["width"]}.png'),animations='disabled')
    csp=page.evaluate('window.__auditCspViolations || []')
    assert not errors and not failed and not csp,{'errors':errors,'failed':failed,'csp':csp}
    view.update(decisionTrace=decision_trace,pageErrors=errors,nativeRequestFailures=failed,cspViolations=csp)


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--dist',type=Path,default=ROOT/'dist')
    parser.add_argument('--output',type=Path,default=ROOT/'docs/audits/artifacts/native-pendulum-ui-2026-10-08')
    parser.add_argument('--audit-date',default='2026-10-08')
    args=parser.parse_args();args.output.mkdir(parents=True,exist_ok=True)
    headers=ui.production_headers();ui.AuditServer.headers_to_add=headers
    server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(ui.AuditServer,directory=str(args.dist)))
    threading.Thread(target=server.serve_forever,daemon=True).start()
    url=f'http://127.0.0.1:{server.server_port}'
    asset=re.search(r'src="([^"]+/index-[^"]+\.js)"',(args.dist/'index.html').read_text()).group(1)
    compiled_before=ui.compiled_fingerprints(args.dist)
    report={'ok':False,'generatedOn':args.audit_date,'target':'compiled production bundle','productionCsp':headers['Content-Security-Policy'],
        'auditSourceSha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
        'helperSourceSha256':hashlib.sha256((ROOT/'scripts/audit-native-duel-ui.py').read_bytes()).hexdigest(),
        'testedIndexAsset':asset,'testedIndexSha256':hashlib.sha256((args.dist/asset.lstrip('/')).read_bytes()).hexdigest(),
        'testedWasmSha256':hashlib.sha256((args.dist/'native/ocgcore.sync.wasm').read_bytes()).hexdigest(),'viewports':[]}
    page=None
    try:
        with sync_playwright() as p:
            browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,
                args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
            req=browser.new_context()
            served_before=ui.served_fingerprints(req.request,url);req.close()
            assert served_before==compiled_before,'HTTP assets differ from the compiled snapshot'
            report['compiledSnapshotBefore']=compiled_before
            report['servedResponseFingerprintsBefore']=served_before
            for width,height in [(1280,900),(390,844)]:
                context=browser.new_context(viewport={'width':width,'height':height},reduced_motion='reduce')
                page=context.new_page();page.set_default_timeout(30000)
                view={'width':width,'height':height,'checks':{}};report['viewports'].append(view)
                try:run_view(page,url,view,args.output,fixture())
                except Exception:
                    page.screenshot(path=str(args.output/f'failure-{width}.png'),animations='disabled')
                    if page.locator('#decision-modal').is_visible():
                        view['pendingDecision']={'title':page.locator('#decision-modal-title').inner_text(),
                            'offered':page.locator('#decision-options button').all_inner_texts()}
                    raise
                context.close()
            req=browser.new_context()
            served_after=ui.served_fingerprints(req.request,url);req.close()
            compiled_after=ui.compiled_fingerprints(args.dist)
            report['servedResponseFingerprintsAfter']=served_after
            report['compiledSnapshotAfter']=compiled_after
            assert compiled_before==compiled_after==served_before==served_after,'Build changed during the Pendulum audit'
            report['immutableCompiledSnapshot']=True
            browser.close()
        report['ok']=True
        report['captureSha256']={path.name:hashlib.sha256(path.read_bytes()).hexdigest()
                                for path in sorted(args.output.glob('native-*.png'))}
    except Exception as error:
        report['failure']={'type':type(error).__name__,'message':str(error)[:1500]};raise
    finally:
        (args.output/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
        server.shutdown();server.server_close()
    print(json.dumps(report,ensure_ascii=False))


if __name__=='__main__':main()
