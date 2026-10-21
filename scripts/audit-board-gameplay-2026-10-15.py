#!/usr/bin/env python3
"""Exercise spatial native duel choices through actual production-browser controls.

A legal local custom Deck and deterministic RNG affect only isolated browsers.
No engine/debug hook, response injection, opposing hand read or publication.
Build before running. Screenshots/reports default outside the repository.
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
spec=importlib.util.spec_from_file_location('native_ui',ROOT/'scripts/audit-native-duel-ui.py')
ui=importlib.util.module_from_spec(spec);spec.loader.exec_module(ui)


def fixture():
    draft,_=ui.custom_deck_fixture()
    for index,code in zip([11,14,18,4,25],['97590747','5318639','16178681','14087893','80921533']):
        draft['main'][index]=code
    assert len(draft['main'])==40 and max(Counter(draft['main']).values())<=3
    return draft


def visible(page,selector):
    return page.locator(selector).count()>0 and page.locator(selector).first.is_visible()


def click(page,selector,mobile=False):
    target=page.locator(selector).first
    target.tap() if mobile else target.click()


def dock_title(page):
    return page.locator('#board-decision-title').inner_text() if visible(page,'#board-decision-prompt') else ''


def wait_dock(page,title=None):
    ui.wait_until(page,"title=>{const e=document.querySelector('#board-decision-prompt');return e?.checkVisibility()&&(!title||document.querySelector('#board-decision-title')?.textContent===title)}",title)


def settle(page,trace,mobile=False,timeout=45):
    """Pass only offered optional priorities; never decide a required card/zone."""
    deadline=time.monotonic()+timeout
    while time.monotonic()<deadline:
        if visible(page,'#board-decision-prompt'):
            title=dock_title(page)
            options=page.locator('#board-decision-prompt button').all_inner_texts()
            trace.append({'title':title,'options':options})
            passing=page.locator('#board-decision-prompt button').filter(has_text=re.compile('^PASSER LA PRIORITÉ$'))
            if passing.count():passing.first.tap() if mobile else passing.first.click()
            elif visible(page,'.board-decision-cancel'):click(page,'.board-decision-cancel',mobile)
            elif title in ['ACTIVER OU CONFIRMER ?','ACTIVER UN EFFET ?']:
                no=page.locator('#board-decision-prompt button').filter(has_text=re.compile('^NON$'))
                assert no.count(),{'title':title,'options':options}
                no.first.tap() if mobile else no.first.click()
            else:raise AssertionError(f'Unexpected required spatial decision: {title}: {options}')
        elif page.locator('#decision-modal').is_visible():
            title=page.locator('#decision-modal-title').inner_text()
            passing=page.locator('#decision-options button').filter(has_text=re.compile('^PASSER LA PRIORITÉ$'))
            cancel=page.locator('#btn-decision-cancel')
            if passing.count():passing.first.tap() if mobile else passing.first.click()
            elif cancel.is_visible() and cancel.is_enabled():cancel.tap() if mobile else cancel.click()
            else:raise AssertionError(f'Unexpected required modal: {title}')
        elif page.locator('#btn-end-turn').is_enabled() or ('active' in (page.locator('#phase-battle').get_attribute('class') or '').split() and page.locator('#btn-next-phase').is_enabled()):return
        page.wait_for_timeout(100)
    raise AssertionError('No actionable player phase after passing legal priorities')


def place(page,code,zone_type,mobile,trace):
    click(page,f'#player-hand .card-entity[data-id="{code}"]',mobile)
    zone=page.locator(f'.card-zone[data-side="player"][data-zone-type="{zone_type}"].active-zone').first
    assert zone.count(),'No offered destination'
    zone.tap() if mobile else zone.click()
    page.locator('#action-modal').wait_for(state='visible')
    assert page.locator('#action-modal').get_attribute('aria-modal')!='true','Action choice must keep the board interactive'
    click(page,'#btn-action-faceup',mobile)
    page.locator('#action-modal').wait_for(state='hidden')
    settle(page,trace,mobile)


def facts(page):
    return page.evaluate("""()=>({title:document.querySelector('#board-decision-title')?.textContent,
      status:document.querySelector('#turn-status')?.textContent,modal:document.querySelector('#decision-modal').checkVisibility(),
      targets:[...document.querySelectorAll('.board-decision-target')].map(e=>({tag:e.tagName,
        side:e.dataset.side??e.closest('[data-side]')?.dataset.side,zone:e.dataset.zoneType,
        handIndex:e.dataset.handIndex,label:e.dataset.boardDecisionLabel,selected:e.classList.contains('board-decision-selected')})),
      options:[...document.querySelectorAll('#board-decision-prompt button')].map(b=>({label:b.textContent,disabled:b.disabled})),
      handCount:document.querySelectorAll('#player-hand .card-entity').length,
      gy:Number(document.querySelector('#player-gy-count').textContent),
      ownField:Boolean(document.querySelector('.card-zone[data-side=player][data-zone-type=field] .card-entity')),
      bodyOverflow:document.body.scrollWidth>innerWidth,
      qaHook:typeof window.__YGO_QA__,battleClickTargets:window.__auditBattleClicks,publicLog:[...document.querySelectorAll('#log-content .log-entry')].slice(-10).map(e=>e.textContent),lp:{player:document.querySelector('#player-lp').textContent,opponent:document.querySelector('#opponent-lp').textContent}})""")


def capture(page,out,name,report):
    page.screenshot(path=str(out/f'{name}-{report["width"]}.png'),animations='disabled')
    report['stages'].append({'stage':name,**facts(page),'concealment':ui.verify_concealment(page)})


def run(page,url,out,report,draft):
    mobile=report['width']<500
    errors=[];failed=[];trace=[]
    report.update(pageErrors=errors,nativeRequestFailures=failed,trace=trace,checks={},stages=[])
    page.on('pageerror',lambda error:errors.append(str(error)[:600]))
    page.on('requestfailed',lambda request:failed.append(urlsplit(request.url).path) if '/native/' in request.url else None)
    page.add_init_script(ui.RNG_FIXTURE)
    page.add_init_script(f"localStorage.setItem('ygo_custom_deck',{json.dumps(json.dumps(draft))});")
    response=page.goto(url,wait_until='domcontentloaded')
    assert response.header_value('content-security-policy')==ui.production_headers()['Content-Security-Policy']
    page.locator('input[name="game-mode"][value="native"]').check()
    click(page,'[data-deck-id="custom"]',mobile)
    ui.wait_until(page,"()=>!document.querySelector('#btn-start-duel').disabled",timeout=60)
    assert page.locator('#deck-validity-badge').inner_text()=='Deck valide'
    click(page,'#btn-start-duel',mobile)
    page.get_by_role('button',name='JE COMMENCE',exact=True).click()
    page.locator('#start-modal').wait_for(state='hidden')
    page.wait_for_selector('#player-hand .card-entity');settle(page,trace,mobile)
    assert page.evaluate('typeof window.__YGO_QA__')=='undefined'
    capture(page,out,'opening',report)
    place(page,'97590747','monster',mobile,trace)
    place(page,'80921533','field',mobile,trace)
    capture(page,out,'main-with-monster-field',report)
    assert page.locator('.player-m-zone .card-entity[data-id="97590747"]').count()==1
    report['checks']['summonAndFieldThroughRealControls']=True

    # The formerly fullscreen End Phase list must now decorate the actual Hand.
    click(page,'#btn-end-turn',mobile);wait_dock(page,'RÉPONDRE À LA CHAÎNE')
    assert not page.locator('#decision-modal').is_visible()
    mst='#player-hand .card-entity[data-id="5318639"]'
    assert 'board-decision-target' in page.locator(mst).get_attribute('class')
    assert page.locator('#btn-end-turn').is_disabled()
    assert page.locator('#btn-next-phase').is_disabled()
    capture(page,out,'end-turn-spatial-chain',report)
    report['checks']['endPhaseCardsSelectableWithoutModalAndPhaseButtonsSuspended']=True
    click(page,mst,mobile)

    # Activating from the real Hand may ask for a native Spell destination.
    deadline=time.monotonic()+30
    placements=[]
    while time.monotonic()<deadline:
        wait_dock(page)
        title=dock_title(page)
        if title=='CHOISIR LES CARTES':break
        if title=='CHOISIR LA ZONE':
            zones=page.locator('.card-zone.board-decision-target')
            assert zones.count(),'Native zone choice must highlight real playmat slots'
            before=facts(page)
            page.keyboard.press('Escape')
            assert dock_title(page)==title,'Required placement consumed by Escape'
            assert page.locator('.board-decision-confirm').is_disabled()
            zones.first.tap() if mobile else zones.first.click()
            assert page.locator('.board-decision-confirm').is_enabled()
            placements.append(before)
            capture(page,out,'native-spell-zone-selected',report)
            click(page,'.board-decision-confirm',mobile)
        else:raise AssertionError(f'Unexpected MST activation choice: {title}')
    else:raise AssertionError('Native MST target did not appear')
    report['nativePlacements']=placements
    field='.card-zone[data-side="player"][data-zone-type="field"]'
    assert 'board-decision-target' in page.locator(field).get_attribute('class')
    assert page.locator('.board-decision-confirm').is_disabled()
    before=facts(page)
    page.keyboard.press('Escape')
    assert dock_title(page)=='CHOISIR LES CARTES','Required card selection consumed by Escape'
    click(page,'.player-m-zone .card-entity[data-id="97590747"]',mobile)
    assert facts(page)['gy']==before['gy'],'Non-target click submitted a native response'
    assert page.locator('.board-decision-confirm').is_disabled()
    click(page,field,mobile)
    assert page.locator(field).get_attribute('aria-pressed')=='true'
    assert page.locator('.board-decision-confirm').is_enabled()
    click(page,field,mobile)
    assert page.locator('.board-decision-confirm').is_disabled(),'Selection must be reversible before confirmation'
    if mobile:click(page,field,True)
    else:page.locator(field).focus();page.keyboard.press('Enter')
    assert page.locator('.board-decision-confirm').is_enabled()
    capture(page,out,'required-target-selected',report)
    report['checks']['requiredCardTargetRealZoneKeyboardTouchNonTargetBlockedAndReversible']=True
    click(page,'.board-decision-confirm',mobile)

    # Preserve an explicit conventional list for users who choose it.
    wait_dock(page,'RÉPONDRE À LA CHAÎNE')
    click(page,'.board-decision-fallback',mobile)
    page.locator('#decision-modal').wait_for(state='visible')
    assert not visible(page,'#board-decision-prompt')
    capture(page,out,'explicit-list-fallback',report)
    passing=page.locator('#decision-options button').filter(has_text=re.compile('^PASSER LA PRIORITÉ$'))
    assert passing.count()==1
    passing.tap() if mobile else passing.click()
    settle(page,trace,mobile)
    assert int(page.locator('#player-gy-count').inner_text())>=2,'MST and its actual Field target must reach the Graveyard'
    assert page.locator(field+' .card-entity').count()==0
    assert page.locator('#player-hand .card-entity[data-id="5318639"]').count()==0
    assert page.locator('#player-hand .card-entity').count()==3,'AI turn must complete and return with the next legal Draw'
    report['checks']['explicitListFallbackAndNativeMstResolutionThenAiTurnAndDraw']=True
    capture(page,out,'next-turn-after-native-resolution',report)

    # Enter Battle through the normal phase control. Only a live own attacker
    # and actual offered public target may be used; no opponent hand read.
    click(page,'#btn-next-phase',mobile);settle(page,trace,mobile)
    assert page.locator('#phase-battle').get_attribute('class').split().count('active')==1
    attacker=page.locator('.player-m-zone .card-entity[data-id="97590747"]')
    if attacker.count():
        attacker.tap() if mobile else attacker.click()
        capture(page,out,'battle-action-from-own-monster',report)
        report['checks']['battleReachedAndOwnMonsterActionClickable']=True
        targets=page.locator('.card-zone[data-side="opponent"].can-target')
        assert targets.count(),'Selecting a live own attacker must offer a real opposing zone'
        report['battleTargetLabel']=targets.first.get_attribute('aria-label')
        before_log=page.locator('#log-content .log-entry').count()
        before_lp=int(page.locator('#opponent-lp').inner_text())
        page.evaluate("""()=>{window.__auditBattleClicks=[];document.addEventListener('click',event=>{const z=event.target.closest?.('.card-zone');window.__auditBattleClicks.push({tag:event.target.tagName,id:event.target.id,className:String(event.target.className),zone:z?{side:z.dataset.side,type:z.dataset.zoneType,index:z.dataset.index}:null});},{capture:true});}""")
        targets.first.tap() if mobile else targets.first.click()
        # The core's async advance starts before its first stateChanged paint.
        # Await public output rather than the previous frame's enabled button.
        ui.wait_until(page,"before=>document.querySelectorAll('#log-content .log-entry').length>before||document.querySelector('#board-decision-prompt')?.checkVisibility()",before_log)
        settle(page,trace,mobile)
        report['battleClickTargets']=page.evaluate('window.__auditBattleClicks')
        report['battleLp']=page.evaluate("()=>({player:document.querySelector('#player-lp').textContent,opponent:document.querySelector('#opponent-lp').textContent})")
        report['battlePublicLog']=page.locator('#log-content .log-entry').all_inner_texts()[-8:]
        ui.wait_until(page,"expected=>Number(document.querySelector('#opponent-lp').textContent)===expected",before_lp-1800)
        report['battleLp']=page.evaluate("()=>({player:document.querySelector('#player-lp').textContent,opponent:document.querySelector('#opponent-lp').textContent})")
        # A second click on an already-used attacker must neither offer targets
        # nor apply another native attack or damage this turn.
        click(page,'.player-m-zone .card-entity[data-id="97590747"]',mobile)
        assert page.locator('.player-m-zone.attacker-active').count()==0
        assert int(page.locator('#opponent-lp').inner_text())==before_lp-1800
        report['checks']['real1800DamageAndAttackerSpentThisTurn']=True
        capture(page,out,'native-battle-after-real-target',report)
        report['checks']['actualAttackThroughOfferedOpposingZoneAndNativeResponseWindows']=True
    else:
        report['checks']['battleReachedAndOwnMonsterActionClickable']='Attacker destroyed during the legal AI turn; no attack invented'
    report['checks']['opponentConcealment']=ui.verify_concealment(page)
    report['checks']['responsiveBody']=not page.evaluate('document.body.scrollWidth>innerWidth')
    assert report['checks']['responsiveBody']
    assert page.evaluate('JSON.parse(localStorage.getItem("ygo_custom_deck"))')==draft
    csp=page.evaluate('window.__auditCspViolations||[]');report['cspViolations']=csp
    assert not errors and not failed and not csp,{'errors':errors,'failed':failed,'csp':csp}


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--dist',type=Path,default=ROOT/'dist')
    parser.add_argument('--output',type=Path,default=Path('/workspace/yugioh-board-gameplay-2026-10-15/after'))
    parser.add_argument('--width',type=int,action='append')
    args=parser.parse_args();args.output.mkdir(parents=True,exist_ok=True)
    ui.AuditServer.headers_to_add=ui.production_headers()
    server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(ui.AuditServer,directory=str(args.dist)))
    threading.Thread(target=server.serve_forever,daemon=True).start()
    html=(args.dist/'index.html').read_text();entry=re.search(r'src="([^\"]+/index-[^\"]+\.js)"',html).group(1)
    report={'ok':False,'target':'compiled production bundle','entry':entry,'entrySha256':hashlib.sha256((args.dist/entry.lstrip('/')).read_bytes()).hexdigest(),'viewports':[]}
    try:
        with sync_playwright() as p:
            browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
            for width in args.width or [1440,390]:
                height=1000 if width>500 else 844
                context=browser.new_context(viewport={'width':width,'height':height},has_touch=width<500,reduced_motion='reduce')
                page=context.new_page();page.set_default_timeout(30000)
                view={'width':width,'height':height};report['viewports'].append(view)
                try:run(page,f'http://127.0.0.1:{server.server_port}',args.output,view,fixture())
                except Exception:
                    page.screenshot(path=str(args.output/f'failure-{width}.png'),animations='disabled')
                    view['failureState']=facts(page)
                    raise
                finally:context.close()
            browser.close()
        report['ok']=True
    except Exception as error:
        report['failure']={'type':type(error).__name__,'message':str(error)[:1800]}
        raise
    finally:
        (args.output/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');server.shutdown()
    print(json.dumps(report,ensure_ascii=False))

if __name__=='__main__':main()
