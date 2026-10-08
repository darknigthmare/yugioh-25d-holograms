#!/usr/bin/env python3
"""Audit a frozen production build through real native desktop/mobile controls.

Requires the coordinator's frozen entry SHA. No build is performed. The isolated
40-card deck and initial RNG fixture are registered before starting the duel.
All later actions use visible controls; observations read public DOM only.
The mode is native free duel, not certified TCG Advanced deck legality.
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


def import_helper(name, filename):
    spec = importlib.util.spec_from_file_location(name, ROOT / 'scripts' / filename)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


ui = import_helper('continuation_native_ui', 'audit-native-duel-ui.py')
views = import_helper('continuation_native_views', 'audit-native-duel-views.py')
MODELS = {'5053103': (1700, 1000), '66602787': (600, 1500), '28279543': (2000, 1500)}
MODEL_NAMES = {'5053103': 'Battle Ox', '66602787': 'Saggi the Dark Clown', '28279543': 'Curse of Dragon'}
CAMERAS = ['player', 'diagonal-left', 'diagonal-right', 'console', 'overview']


def fixture():
    draft, rows = ui.custom_deck_fixture()
    draft['main'] = [{'5053103': '41392891', '66602787': '61201220'}.get(code, code)
                     for code in draft['main']]
    for index, code in [(25, '5053103'), (4, '43422537'), (18, '66602787'),
                        (14, '81439173'), (11, '83764718'), (20, '28279543'),
                        (24, '91152256')]:
        draft['main'][index] = code
    assert len(draft['main']) == 40 and max(Counter(draft['main']).values()) <= 3
    assert draft['main'].count('83764718') == draft['main'].count('81439173') == 1
    assert all(code in rows for code in draft['main'])
    return draft


PUBLIC_SNAPSHOT = """() => {
  const rect=e=>{if(!e)return null;const r=e.getBoundingClientRect();
    return {x:r.x,y:r.y,width:r.width,height:r.height};};
  const own=[...document.querySelectorAll('.card-zone[data-side="player"][data-zone-type="monster"]')]
    .flatMap(zone=>{const card=zone.querySelector('.monster-hologram-entity');if(!card)return [];
      return [{id:card.dataset.id,uid:card.dataset.uid,index:Number(zone.dataset.index),
        atk:card.querySelector('.stat-badge.atk')?.textContent,
        def:card.querySelector('.stat-badge.def')?.textContent,
        label:card.getAttribute('aria-label'),modelRendered:zone.classList.contains('has-real-hologram-model'),
        zoneRect:rect(zone),atkRect:rect(card.querySelector('.stat-badge.atk')),
        defRect:rect(card.querySelector('.stat-badge.def'))}];});
  const scene=document.querySelector('[data-real-duel-scene3d="true"]');
  return {view:document.querySelector('#btn-toggle-view')?.dataset.viewMode,
    ownHand:[...document.querySelectorAll('#player-hand .card-entity')].map(c=>({id:c.dataset.id,uid:c.dataset.uid})),
    ownMonsters:own,playerLp:Number(document.querySelector('#player-lp')?.textContent.replace(/[^0-9]/g,'')),
    opponentLp:Number(document.querySelector('#opponent-lp')?.textContent.replace(/[^0-9]/g,'')),
    ownGraveCount:Number(document.querySelector('#player-gy-count')?.textContent),
    opponentGraveCount:Number(document.querySelector('#opponent-gy-count')?.textContent),
    phase:document.querySelector('.phase-step.active')?.id,
    hostRect:rect(document.querySelector('#parallax-container')),
    camera:document.querySelector('.real-duel-camera-controls')?.dataset.cameraPreset,
    cameraControlsRect:rect(document.querySelector('.real-duel-camera-controls')),
    webglAvailable:scene?.dataset.webglAvailable,
    counts:{boards:document.querySelectorAll('#duel-board').length,hands:document.querySelectorAll('#player-hand').length,
      scenes:document.querySelectorAll('[data-real-duel-scene3d="true"]').length,
      canvases:document.querySelectorAll('.real-duel-scene-3d-canvas').length,
      css3d:document.querySelectorAll('.real-duel-css3d-root').length},
    publicLog:document.querySelector('#log-content')?.innerText};
}"""

FEEDBACK_OBSERVER = """() => {
  window.__auditWaveFeedback=[];
  const classes=['combat-lunge','combat-recoil','holo-dissolve'];
  new MutationObserver(records=>{for(const record of records){
    if(record.type!=='attributes')continue;
    const element=record.target,zone=element.closest?.('.card-zone');
    if(!zone || (zone.dataset.side!=='player'
      && !(element.dataset.cardVisible==='true' && element.dataset.id)))continue;
    for(const name of classes){
      if(element.classList.contains(name) && !record.oldValue?.split(/\\s+/).includes(name))
        window.__auditWaveFeedback.push({kind:name,id:element.dataset.id??null,side:zone.dataset.side,
          index:zone.dataset.index,at:performance.now()});
    }
  }}).observe(document.querySelector('#duel-board'),{subtree:true,attributes:true,
    attributeFilter:['class'],attributeOldValue:true});
}"""


def snapshot(page):
    return page.evaluate(PUBLIC_SNAPSHOT)


def game_facts(state):
    return {key: state[key] for key in ['ownHand', 'playerLp', 'opponentLp', 'ownGraveCount'] } | {
        'ownMonsters': [{key: card[key] for key in ['id', 'uid', 'index', 'atk', 'def']}
                        for card in state['ownMonsters']]}


def switch_view(page, target):
    for _ in range(4):
        if snapshot(page)['view'] == target:
            ui.wait_until(page, "() => document.querySelector('#btn-toggle-view').getAttribute('aria-busy')==='false'")
            return
        page.locator('#btn-toggle-view').click()
        ui.wait_until(page, "() => document.querySelector('#btn-toggle-view').getAttribute('aria-busy')==='false'")
    raise AssertionError(f'View did not reach {target}')


def assert_models(state, codes, real=False):
    for code in codes:
        cards = [card for card in state['ownMonsters'] if card['id'] == code]
        assert len(cards) == 1, (code, state)
        attack, defense = MODELS[code]
        assert cards[0]['atk'] == f'ATK {attack}' and cards[0]['def'] == f'DEF {defense}', cards[0]
        assert cards[0]['uid'], cards[0]
        if real:
            assert cards[0]['modelRendered'], cards[0]


def framing(state, codes, require_all=True):
    host = state['hostRect']
    details = []
    for card in state['ownMonsters']:
        if card['id'] not in codes:
            continue
        zone = card['zoneRect']
        center = {'x': zone['x'] + zone['width'] / 2, 'y': zone['y'] + zone['height'] / 2}
        visible = (zone['width'] > 0 and zone['height'] > 0 and
                   host['x'] <= center['x'] <= host['x'] + host['width'] and
                   host['y'] <= center['y'] <= host['y'] + host['height'])
        details.append({'id': card['id'], 'zoneCenter': center, 'centerWithinHost': visible,
                        'zoneRect': zone, 'atkRect': card['atkRect'], 'defRect': card['defRect']})
    assert details and (all(d['centerWithinHost'] for d in details) if require_all
                        else any(d['centerWithinHost'] for d in details)), details
    return details


def capture_state(page, report, output, label, codes, expected=None, camera=None):
    state = snapshot(page)
    if state['view'] == 'real':
        readiness = views.wait_real_projection(page)
        state = snapshot(page)
        state['projectionCaptureReadiness'] = readiness
        assert state['webglAvailable'] == 'true', state
        assert all(state['counts'][key] == 1 for key in ['scenes', 'canvases', 'css3d']), state
        state['framing'] = framing(state, codes, require_all=camera in [None, 'player', 'overview'])
        assert page.evaluate("""() => {const canvas=document.querySelector('.real-duel-scene-3d-canvas');
          window.__auditWaveFirstCanvas ??= canvas;return canvas===window.__auditWaveFirstCanvas;}"""), 'Scene canvas replaced'
    assert state['counts']['boards'] == state['counts']['hands'] == 1, state
    assert_models(state, codes, real=state['view'] == 'real')
    if expected is not None:
        assert game_facts(state) == expected, f'Camera/view transition changed native state: {label}'
    if camera:
        assert state['camera'] == camera, state
        controls = state['cameraControlsRect']
        assert controls['height'] > 0 and controls['width'] > 0, controls
    state['stage'] = label
    report['stages'].append(state)
    page.screenshot(path=str(output / f'wave-{label}-{report["width"]}.png'),
                    animations='disabled', timeout=60000)
    return state


def activate_hand_spell(page, code, report, selected_name=None, selected_code=None, capture=None):
    before = snapshot(page)
    page.locator(f'#player-hand .card-entity[data-id="{code}"]').first.click()
    zones = page.locator('.card-zone[data-side="player"][data-zone-type="spell"].active-zone')
    assert zones.count(), f'No legally offered Spell Zone for {code}'
    zones.first.click()
    page.locator('#action-modal').wait_for(state='visible')
    action = page.locator('#btn-action-faceup')
    assert action.is_enabled(), f'Activation unavailable for {code}'
    action.click()
    page.locator('#action-modal').wait_for(state='hidden')
    selected = selected_name is None
    decisions = []
    deadline = time.monotonic() + 35
    while time.monotonic() < deadline:
        modal = page.locator('#decision-modal')
        if modal.is_visible():
            title = page.locator('#decision-modal-title').inner_text()
            choices = modal.locator('.decision-card-option').filter(visible=True)
            wanted = choices.filter(has_text=re.compile(selected_name, re.I)) if selected_name and not selected else None
            if wanted is not None and wanted.count():
                choice = wanted.first
                decisions.append({'title': title, 'selectedOwnCandidate': choice.inner_text(), 'code': selected_code})
                choice.click()
                confirm = page.locator('#decision-options > button.btn-magenta')
                assert confirm.is_visible() and confirm.is_enabled(), title
                confirm.click()
                selected = True
            else:
                cancel = page.locator('#btn-decision-cancel')
                confirm = page.locator('#decision-options .decision-confirm-button')
                if confirm.is_visible() and confirm.is_enabled():
                    confirm.click()
                elif cancel.is_visible() and cancel.is_enabled():
                    cancel.click()
                else:
                    buttons = modal.locator('button:not([disabled])').filter(visible=True)
                    assert buttons.count(), title
                    decisions.append({'title': title, 'mandatoryChoice': buttons.first.inner_text()})
                    buttons.first.click()
        elif not page.locator(f'#player-hand .card-entity[data-id="{code}"]').count():
            if not selected:
                page.wait_for_timeout(50)
                continue
            if capture:
                capture()
            ui.await_player_main(page)
            after = snapshot(page)
            report['actions'].append({'spell': code, 'before': game_facts(before),
                                      'after': game_facts(after), 'decisions': decisions})
            return after
        page.wait_for_timeout(50)
    raise AssertionError(f'Native Spell {code} did not finish through legal controls')


def place_public_card(page, code, zone_type, face_up, report, output):
    page.locator(f'#player-hand .card-entity[data-id="{code}"]').first.click()
    zone = page.locator(f'.card-zone[data-side="player"][data-zone-type="{zone_type}"].active-zone').first
    index = zone.get_attribute('data-index')
    zone.click()
    page.locator('#action-modal').wait_for(state='visible')
    action = page.locator('#btn-action-faceup' if face_up else '#btn-action-facedown')
    assert action.is_enabled()
    action.click()
    page.locator('#action-modal').wait_for(state='hidden')
    for _ in range(20):
        modal = page.locator('#decision-modal')
        if not modal.is_visible():
            break
        page.evaluate('() => new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))')
        facts = page.evaluate("""() => ({
          title:document.querySelector('#decision-modal-title')?.textContent,
          description:document.querySelector('#decision-modal-description')?.textContent,
          buttons:[...document.querySelectorAll('#decision-modal button')].map(b=>({
            text:b.textContent,visible:b.checkVisibility(),disabled:b.disabled,className:b.className})),
          focused:document.activeElement?.textContent
        })""")
        report.setdefault('placementDecisions', []).append(facts)
        confirm = page.locator('#decision-options .decision-confirm-button')
        cancel = page.locator('#btn-decision-cancel')
        if confirm.is_visible() and confirm.is_enabled():
            confirm.click()
        elif cancel.is_visible() and cancel.is_enabled():
            cancel.click()
        else:
            options = page.locator('#decision-options button:not([disabled])').filter(visible=True)
            assert options.count(), facts
            options.first.click()
        page.wait_for_timeout(100)
    if page.locator('#decision-modal').is_visible():
        report['failurePublicDom'] = facts
        page.screenshot(path=str(output / 'failure-public-dom.png'), timeout=60000)
        raise AssertionError('Public placement decisions did not settle')
    ui.wait_until(page, """({zoneType,index}) => Boolean(document.querySelector(
      `.card-zone[data-side="player"][data-zone-type="${zoneType}"][data-index="${index}"] .card-entity`))""",
      {'zoneType': zone_type, 'index': index})
    return index


def verify(page, base_url, output, report, draft):
    errors, failures, loaded = [], [], set()
    report.update(pageErrors=errors, nativeRequestFailures=failures, stages=[], actions=[])
    page.on('pageerror', lambda error: errors.append(str(error)[:500]))
    page.on('requestfailed', lambda request: failures.append(urlsplit(request.url).path)
            if '/native/' in request.url else None)
    page.on('response', lambda response: loaded.add(urlsplit(response.url).path)
            if response.status == 200 and ('/native/' in response.url or '/assets/' in response.url) else None)
    page.add_init_script(ui.RNG_FIXTURE)
    page.add_init_script(f"localStorage.setItem('ygo_custom_deck', {json.dumps(json.dumps(draft))});")
    response = page.goto(base_url, wait_until='domcontentloaded')
    assert response.header_value('content-security-policy') == ui.production_headers()['Content-Security-Policy']
    assert page.evaluate('typeof window.__YGO_QA__') == 'undefined'
    page.locator('input[name="game-mode"][value="native"]').check()
    page.locator('[data-deck-id="custom"]').click()
    ui.wait_until(page, "() => document.querySelector('#builder-catalogue-status')?.textContent.includes('cartes avec règles natives')")
    assert page.locator('#deck-validity-badge').inner_text() == 'Deck valide'
    page.locator('#btn-start-duel').click()
    ui.wait_until(page, "() => !document.querySelector('#start-modal').checkVisibility() || [...document.querySelectorAll('#decision-options button')].some(b=>b.checkVisibility())")
    first = page.get_by_role('button', name='JE COMMENCE', exact=True)
    if first.is_visible():
        first.click()
    page.locator('#start-modal').wait_for(state='hidden')
    page.wait_for_selector('#player-hand .card-entity')
    ui.await_player_main(page)
    report['openingOwnHand'] = snapshot(page)['ownHand']
    assert Counter(card['id'] for card in report['openingOwnHand']) == Counter(
        ['5053103', '43422537', '66602787', '81439173', '83764718']), report['openingOwnHand']
    page.evaluate(FEEDBACK_OBSERVER)
    place_public_card(page, '5053103', 'monster', True, report, output)
    activate_hand_spell(page, '43422537', report)
    place_public_card(page, '66602787', 'monster', True, report, output)
    assert_models(snapshot(page), ['5053103', '66602787'])
    activate_hand_spell(page, '81439173', report, 'Curse of Dragon|Dragon Maudit|Malédiction du Dragon', '28279543')
    page.locator('#player-graveyard-zone').click()
    page.locator('#public-zone-modal').wait_for(state='visible')
    assert page.locator('#public-zone-list [data-id="28279543"]').count() == 1
    report['curseInPublicGraveyardBeforeReborn'] = True
    page.locator('#btn-close-public-zone').click()
    switch_view(page, 'real')
    capture_state(page, report, output, 'first-real-before-revival', ['5053103', '66602787'])

    def capture_revival():
        ui.wait_until(page, "() => Boolean(document.querySelector('.card-zone[data-side=player][data-zone-type=monster] .monster-hologram-entity[data-id=\"28279543\"]'))")
        assert snapshot(page)['view'] == 'real'
        readiness = views.wait_real_projection(page)
        report['revivalMotionProjectionReadiness'] = readiness
        page.screenshot(path=str(output / f'wave-native-revival-motion-{report["width"]}.png'),
                        animations='disabled', timeout=60000)

    after = activate_hand_spell(page, '83764718', report, 'Curse of Dragon|Dragon Maudit|Malédiction du Dragon', '28279543', capture_revival)
    assert after['ownGraveCount'] == 3 and after['playerLp'] == after['opponentLp'] == 8000, after
    assert not after['ownHand'], after
    page.wait_for_timeout(1200)
    state = capture_state(page, report, output, 'three-models-real', MODELS, camera='player')
    expected = game_facts(state)
    report['monsterRuntimeUids'] = {card['id']: card['uid'] for card in state['ownMonsters']}
    for camera in CAMERAS[1:]:
        page.locator(f'.real-duel-camera-button[data-camera-preset="{camera}"]').click()
        capture_state(page, report, output, f'camera-{camera}', MODELS, expected, camera)
    page.locator('.real-duel-camera-button[data-camera-preset="player"]').click()
    for view in ['compact', 'arena', 'real']:
        switch_view(page, view)
        capture_state(page, report, output, f'repeat-{view}', MODELS, expected,
                      camera='player' if view == 'real' else None)
    report['cameraAndViewTransitionsPreserveLpHandIdentityStats'] = True
    report['sameCanvasAcrossCameraAndViewCycles'] = True
    report['opponentConcealment'] = ui.verify_concealment(page)
    report['feedback'] = page.evaluate('window.__auditWaveFeedback')
    report['loadedHttpAssets'] = sorted(loaded)
    assert '/native/ocgcore.sync.wasm' in loaded and '/native/scripts.json' in loaded and '/native/card-data.json' in loaded
    assert page.evaluate('typeof window.__YGO_QA__') == 'undefined'
    report['productionQaHookAbsent'] = True
    report['cspViolations'] = page.evaluate('window.__auditCspViolations || []')
    assert not errors and not failures and not report['cspViolations'], report
    assert not re.search(r'moteur natif est arrêté|Lua error|RETRY', snapshot(page)['publicLog'], re.I)
    assert page.evaluate('document.body.scrollWidth <= innerWidth'), 'Horizontal viewport overflow'
    report['ok'] = True


def compiled_wave_fingerprints(dist):
    # This final build inlines the catalogue in the entry and shares ocgcore-*.js.
    # Keep the older helpers and their previous build evidence unchanged.
    html = dist.joinpath('index.html').read_text()
    entry = re.search(r'src="([^"]+/index-[^"]+\.js)"', html).group(1).lstrip('/')
    css = re.search(r'href="([^"]+/index-[^"]+\.css)"', html).group(1).lstrip('/')
    chunk = lambda prefix: next(dist.joinpath('assets').glob(prefix + '-*.js')).relative_to(dist).as_posix()
    essential = ['index.html', entry, css, chunk('NativeDuelGame'),
                 chunk('FieldEnvironmentRegistry'), chunk('RealDuelView'), chunk('ocgcore')]
    main = dist.joinpath(entry).read_text()
    bridge = dist.joinpath(essential[-1]).read_text()
    assert '/cards/native-unknown.png' in main and 'normal-no-script-needed' in main, 'Catalogue functions absent from entry'
    assert 'getVersion' in bridge and 'ocgcore.sync-' in bridge, 'Core loader absent from shared bridge'
    assert re.search(r'export\s*\{', bridge), 'Catalogue/core bridge has no compiled exports'
    paths = ['index.html'] + [path.relative_to(dist).as_posix()
            for path in sorted(dist.joinpath('assets').glob('*')) if path.suffix in ['.js', '.css']]
    paths += ['native/ocgcore.sync.wasm', 'native/card-data.json', 'native/scripts.json']
    result = {path: {'bytes': dist.joinpath(path).stat().st_size,
                    'sha256': hashlib.sha256(dist.joinpath(path).read_bytes()).hexdigest()} for path in paths}
    return result, essential


def fingerprints(request, base_url, local):
    result = {}
    for relative in local:
        response = request.get(base_url.rstrip('/') + '/' + ('' if relative == 'index.html' else relative))
        assert response.status == 200, relative
        if relative == 'index.html':
            assert response.headers.get('content-security-policy') == ui.production_headers()['Content-Security-Policy']
        body = response.body()
        result[relative] = {'bytes': len(body), 'sha256': hashlib.sha256(body).hexdigest()}
    return result


def negation_fixture():
    draft = fixture()
    draft['main'][25] = '39552864'  # A genuine 500-ATK Normal Monster.
    draft['main'][4] = '14315573'   # Negate Attack, Set before the opposing turn.
    assert len(draft['main']) == 40 and max(Counter(draft['main']).values()) <= 3
    return draft


def verify_attack_negation(page, base_url, output, report):
    errors, failures = [], []
    draft = negation_fixture()
    report.update(fixture=draft, pageErrors=errors, nativeRequestFailures=failures)
    page.on('pageerror', lambda error: errors.append(str(error)[:500]))
    page.on('requestfailed', lambda request: failures.append(urlsplit(request.url).path)
            if '/native/' in request.url else None)
    page.add_init_script(ui.RNG_FIXTURE)
    page.add_init_script(f"localStorage.setItem('ygo_custom_deck', {json.dumps(json.dumps(draft))});")
    response = page.goto(base_url, wait_until='domcontentloaded')
    assert response.header_value('content-security-policy') == ui.production_headers()['Content-Security-Policy']
    assert page.evaluate('typeof window.__YGO_QA__') == 'undefined'
    page.locator('input[name="game-mode"][value="native"]').check()
    page.locator('[data-deck-id="custom"]').click()
    ui.wait_until(page, "() => document.querySelector('#builder-catalogue-status')?.textContent.includes('cartes avec règles natives')")
    assert page.locator('#deck-validity-badge').inner_text() == 'Deck valide'
    page.locator('#btn-start-duel').click()
    ui.wait_until(page, "() => !document.querySelector('#start-modal').checkVisibility() || [...document.querySelectorAll('#decision-options button')].some(b=>b.checkVisibility())")
    first = page.get_by_role('button', name='JE COMMENCE', exact=True)
    if first.is_visible():
        first.click()
    page.locator('#start-modal').wait_for(state='hidden')
    page.wait_for_selector('#player-hand .card-entity')
    ui.await_player_main(page)
    assert page.locator('#player-hand .card-entity[data-id="14315573"]').count()
    place_public_card(page, '39552864', 'monster', True, report, output)
    place_public_card(page, '14315573', 'spell', False, report, output)
    switch_view(page, 'real')
    report['initialProjectionReadiness'] = views.wait_real_projection(page)
    initial = snapshot(page)
    target = next(card for card in initial['ownMonsters'] if card['id'] == '39552864')
    assert target['atk'] == 'ATK 500' and target['def'] == 'DEF 500' and target['modelRendered'], target
    report['targetRuntimeUid'] = target['uid']
    page.evaluate(FEEDBACK_OBSERVER)
    page.locator('#btn-end-turn').click()
    chosen = False
    deadline = time.monotonic() + 40
    while time.monotonic() < deadline:
        modal = page.locator('#decision-modal')
        if modal.is_visible():
            options = modal.locator('button:not([disabled])').filter(visible=True)
            negate = options.filter(has_text=re.compile('Negate Attack', re.I))
            if negate.count():
                report['beforeNegation'] = snapshot(page)
                report['beforeNegationProjectionReadiness'] = views.wait_real_projection(page)
                feedback = page.evaluate('window.__auditWaveFeedback')
                assert any(item['kind'] == 'combat-lunge' and item['side'] == 'opponent' for item in feedback), feedback
                report['nativeAttackPublicFeedbackBeforeResponse'] = feedback
                report['offeredNegateAttack'] = negate.first.inner_text()
                page.screenshot(path=str(output / f'wave-native-attack-before-negation-{report["width"]}.png'),
                                animations='disabled', timeout=60000)
                negate.first.click()
                chosen = True
                break
            cancel = page.locator('#btn-decision-cancel')
            if cancel.is_visible() and cancel.is_enabled():
                cancel.click()
            else:
                assert options.count(), 'Native opponent phase has no legal visible response'
                options.first.click()
        page.wait_for_timeout(50)
    assert chosen, 'The native core never offered Negate Attack against an actual opposing attack'
    ui.wait_until(page, "() => !document.querySelector('#decision-modal').checkVisibility()")
    report['afterNegationProjectionReadiness'] = views.wait_real_projection(page)
    page.screenshot(path=str(output / f'wave-native-attack-negated-motion-{report["width"]}.png'),
                    animations='disabled', timeout=60000)
    ui.await_player_main(page)
    after = snapshot(page)
    before = report['beforeNegation']
    assert after['playerLp'] == before['playerLp'] == 8000, (before, after)
    assert after['opponentLp'] == before['opponentLp'] == 8000, (before, after)
    assert page.locator(f'.card-zone[data-side="player"] [data-uid="{report["targetRuntimeUid"]}"]').count() >= 1
    page.locator('#player-graveyard-zone').click()
    page.locator('#public-zone-modal').wait_for(state='visible')
    assert page.locator('#public-zone-list [data-id="14315573"]').count() == 1
    page.locator('#btn-close-public-zone').click()
    report['afterNegation'] = after
    report['actualNativeAttackAnsweredThroughOfferedTrap'] = True
    report['lifePointsAndTargetPreserved'] = True
    report['publicTrapMovedToGraveyard'] = True
    report['opponentConcealment'] = ui.verify_concealment(page)
    report['cspViolations'] = page.evaluate('window.__auditCspViolations || []')
    assert page.evaluate('typeof window.__YGO_QA__') == 'undefined'
    assert not errors and not failures and not report['cspViolations'], report
    report['ok'] = True


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--base-url')
    parser.add_argument('--dist', type=Path, default=ROOT / 'dist')
    parser.add_argument('--output', type=Path, default=ROOT / 'docs/audits/artifacts/continuation-models-ui-2026-10-08')
    parser.add_argument('--chromium', default='/usr/bin/chromium')
    parser.add_argument('--expected-entry-sha256', required=True)
    parser.add_argument('--desktop-only', action='store_true')
    args = parser.parse_args()
    assert re.fullmatch('[a-f0-9]{64}', args.expected_entry_sha256)
    local_before, essential = compiled_wave_fingerprints(args.dist)
    entry = next(path for path in local_before if re.fullmatch(r'assets/index-[^/]+\.js', path))
    assert local_before[entry]['sha256'] == args.expected_entry_sha256, 'Build is not the coordinator-frozen entry'
    args.output.mkdir(parents=True, exist_ok=True)
    server = None
    if not args.base_url:
        ui.AuditServer.headers_to_add = ui.production_headers()
        server = ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(ui.AuditServer, directory=str(args.dist)))
        threading.Thread(target=server.serve_forever, daemon=True).start()
        args.base_url = f'http://127.0.0.1:{server.server_port}'
    dependencies = ['scripts/audit-native-duel-ui.py', 'scripts/audit-native-duel-views.py',
                    'src/core/native/NativeDuelVisualEvents.js', 'src/core/native/NativePublicRevealPolicy.js', 'src/ui/PublicDuelVisuals.js', 'src/ui/PublicCardConfirmation.js', 'src/ui/PrivateCardInspection.js',
                    'src/ui/CardSpecificVisualEffects.js', 'src/ui/CombatVisualEffects.js',
                    'src/ui/CombatVisualProfiles.js', 'src/ui/HologramReferenceAnatomy.js',
                    'src/ui/HologramMonsterModels.js', 'src/ui/RealDuelScene3D.js', 'src/ui/RealDuelView.js',
                    'src/core/native/NativeDuelGame.js', 'src/core/native/NativeDuelDecisions.js',
                    'src/ui/NativeDuelPresentationModel.js', 'main.js', 'vercel.json']
    draft = fixture()
    report = {'ok': False, 'generatedOn': '2026-10-08', 'stage': 'production-native-models-continuation',
              'method': 'native free duel; real public controls and DOM; accepted forty-card isolated deck registered before start; initial seeded RNG',
              'format': 'Duel libre natif', 'tcgAdvancedLegalityCertified': False,
              'noPostStartInjection': True, 'expectedEntrySha256': args.expected_entry_sha256,
              'essentialBuildAssets': essential,
              'auditSourceSha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
              'sourceDependencies': {path: {'bytes': (ROOT / path).stat().st_size,
                  'sha256': hashlib.sha256((ROOT / path).read_bytes()).hexdigest()} for path in dependencies},
              'productionCsp': ui.production_headers()['Content-Security-Policy'],
              'fixture': draft, 'fixtureSha256': hashlib.sha256(json.dumps(draft, sort_keys=True).encode()).hexdigest(),
              'viewports': [], 'limits': ['The named audited states per viewport are not every duel interaction.',
                  'The native revival and procedural models are checked; full official artwork geometry is not claimed 1:1.',
                  'Camera framing records projected public zone rectangles, not private Three.js or engine objects.']}
    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(executable_path=args.chromium, headless=True,
                args=['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
            context = browser.new_context()
            before = fingerprints(context.request, args.base_url, local_before)
            report['servedResponseFingerprintsBefore'] = before
            for path, value in local_before.items():
                assert before[path] == value, f'HTTP/local frozen build differs: {path}'
            context.close()
            for width, height in [(1280, 900)] + ([] if args.desktop_only else [(390, 844)]):
                context = browser.new_context(viewport={'width': width, 'height': height}, reduced_motion='no-preference')
                page = context.new_page()
                page.set_default_timeout(30000)
                item = {'width': width, 'height': height}
                report['viewports'].append(item)
                verify(page, args.base_url, args.output, item, draft)
                context.close()
                context = browser.new_context(viewport={'width': width, 'height': height}, reduced_motion='no-preference')
                page = context.new_page()
                page.set_default_timeout(30000)
                item['attackNegation'] = {'width': width, 'height': height}
                verify_attack_negation(page, args.base_url, args.output, item['attackNegation'])
                context.close()
            context = browser.new_context()
            after = fingerprints(context.request, args.base_url, local_before)
            context.close()
            report['servedResponseFingerprintsAfter'] = after
            assert before == after, 'Served production assets changed during audit'
            local_after, essential_after = compiled_wave_fingerprints(args.dist)
            assert essential_after == essential
            report['compiledSnapshotBefore'], report['compiledSnapshotAfter'] = local_before, local_after
            assert local_before == local_after, 'Compiled snapshot changed during audit'
            report['buildUnchangedDuringAudit'] = True
            browser.close()
        report['captureSha256'] = {path.name: hashlib.sha256(path.read_bytes()).hexdigest()
                                  for path in sorted(args.output.glob('wave-*.png'))}
        report['ok'] = True
    except Exception as error:
        report['failure'] = {'type': type(error).__name__, 'message': str(error)[:1500]}
        raise
    finally:
        (args.output / 'report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
        if server:
            server.shutdown()
    print(json.dumps({'ok': report['ok'], 'viewports': len(report['viewports']),
                      'captures': len(report['captureSha256']), 'entrySha256': args.expected_entry_sha256}))


if __name__ == '__main__':
    main()
