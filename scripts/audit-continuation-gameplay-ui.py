#!/usr/bin/env python3
"""Exercise new native choices on the coordinator's frozen compiled build.

Only forty-card registrations and a deterministic initial RNG are set before
start. All commands, costs, options and placements use visible controls. The
script reads public DOM; it never accesses a game/core object or QA hook.
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


def helper(name, filename):
    spec = importlib.util.spec_from_file_location(name, ROOT / 'scripts' / filename)
    loaded = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(loaded)
    return loaded


ui = helper('continuation_gameplay_controls', 'audit-native-duel-ui.py')
controls = helper('continuation_pendulum_controls', 'audit-native-pendulum-ui.py')
wave = helper('continuation_gameplay_build', 'audit-native-wave-ui.py')
views = helper('continuation_gameplay_views', 'audit-native-duel-views.py')
ROWS = {str(row[0]): row for row in json.loads((ROOT / 'public/native/card-data.json').read_text())['rows']}
OPENINGS = {
    'ravine': ['62265044', '46986414', '97590747', '15025844', '32452818'],
    'scales': ['15146890', '51531505', '5318639', '97590747', '32452818'],
    'gateway': ['27970830', '2511717', '49721904', '49721904', '81439173']
}


def fixture(name):
    draft, _ = ui.custom_deck_fixture()
    # Filler IDs with three original copies are removed before placing a known
    # opening. Subsequent shuffles, searches and draws remain core commands.
    remove = set(OPENINGS[name]) | {'89631139', '59755122', '63176202'}
    fill = [code for code in draft['main'] if code not in remove]
    for code in ['41392891', '66602787', '91939608', '91152256', '76812113', '5053103']:
        while len(fill) < 40 and fill.count(code) < 3:
            fill.append(code)
    assert len(fill) >= 40
    main = fill[:40]
    for index, code in zip([11, 14, 18, 4, 25], OPENINGS[name]):
        main[index] = code
    reserved = {11, 14, 18, 4, 25}
    additional = ['89631139', '59755122'] if name == 'ravine' else ['63176202', '2511717'] if name == 'gateway' else []
    for index, code in zip([20, 24], additional):
        assert index not in reserved
        main[index] = code
    assert len(main) == 40 and max(Counter(main).values()) <= 3
    assert all(code in ROWS for code in main)
    return {'main': main, 'extra': [], 'side': []}


PUBLIC_STATE = """() => {
 const own=selector=>[...document.querySelectorAll(selector)].map(card=>({id:card.dataset.id,uid:card.dataset.uid,
   label:card.getAttribute('aria-label'),text:card.innerText}));
 const zones=[...document.querySelectorAll('.card-zone[data-side="player"]')].map(zone=>({
   type:zone.dataset.zoneType,index:zone.dataset.index,cards:[...zone.querySelectorAll('.card-entity')].map(card=>({
    id:card.dataset.id,uid:card.dataset.uid,label:card.getAttribute('aria-label'),text:card.innerText,
    faceDown:!!card.querySelector('.card-inner.face-down')}))}));
 return {view:document.querySelector('#btn-toggle-view')?.dataset.viewMode,ownHand:own('#player-hand .card-entity'),zones,
   playerLp:document.querySelector('#player-lp')?.textContent,opponentLp:document.querySelector('#opponent-lp')?.textContent,
   ownGraveCount:document.querySelector('#player-gy-count')?.textContent,
   ownDeckCount:document.querySelector('#player-deck-count')?.textContent,
   log:document.querySelector('#log-content')?.innerText,
   counts:{boards:document.querySelectorAll('#duel-board').length,hands:document.querySelectorAll('#player-hand').length,
     canvases:document.querySelectorAll('.real-duel-scene-3d-canvas').length,
     scenes:document.querySelectorAll('[data-real-duel-scene3d="true"]').length}};
}"""


def snapshot(page):
    return page.evaluate(PUBLIC_STATE)


def modal(page, title=None):
    ui.wait_until(page, "title => document.querySelector('#decision-modal').checkVisibility() && (!title || document.querySelector('#decision-modal-title').textContent===title)", title)
    page.evaluate('() => new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))')


def trace(page, record, stage):
    facts = {'stage': stage, 'title': page.locator('#decision-modal-title').inner_text(),
             'description': page.locator('#decision-modal-description').inner_text(),
             'choices': page.locator('#decision-options .decision-choice-list button').all_inner_texts(),
             'cards': page.locator('#decision-options .decision-card-option').all_inner_texts(),
             'cancelVisible': page.locator('#btn-decision-cancel').is_visible(),
             'ownState': snapshot(page)}
    record['trace'].append(facts)
    return facts


def choose_card(page, pattern):
    options = page.locator('#decision-options .decision-card-option')
    wanted = options.filter(has_text=re.compile(pattern, re.I))
    assert wanted.count(), (pattern, options.all_inner_texts())
    confirm = page.locator('#decision-options > button.btn-magenta')
    assert confirm.is_disabled()
    wanted.first.click()
    assert wanted.first.get_attribute('aria-pressed') == 'true' and confirm.is_enabled()
    confirm.click()


def place(page, code, selector):
    page.locator(f'#player-hand .card-entity[data-id="{code}"]').first.click()
    zone = page.locator(selector)
    assert 'active-zone' in (zone.get_attribute('class') or ''), (code, selector)
    zone.click()
    page.locator('#action-modal').wait_for(state='visible')
    assert page.locator('#btn-action-faceup').is_enabled()
    page.locator('#btn-action-faceup').click()
    page.locator('#action-modal').wait_for(state='hidden')


def capture(page, record, out, stage, allow_decision=False):
    if not allow_decision:
        assert not page.locator('#decision-modal').is_visible()
    readiness = views.wait_real_projection(page)
    state = snapshot(page)
    assert state['view'] == 'real' and all(value == 1 for value in state['counts'].values())
    assert page.evaluate("""() => {const canvas=document.querySelector('.real-duel-scene-3d-canvas');
      window.__auditContinuationGameplayCanvas ??= canvas;return canvas===window.__auditContinuationGameplayCanvas;}"""), 'Canvas replaced within one actual duel'
    record['stages'].append({'stage': stage, 'publicState': state, 'stableProjection': readiness, 'sameCanvas': True})
    page.screenshot(path=str(out / f'gameplay-{record["scenario"]}-{stage}-{record["width"]}.png'), animations='disabled', timeout=60000)


def begin(page, url, record, draft):
    errors, failed, loaded = [], [], set()
    page.on('pageerror', lambda error: errors.append(str(error)[:600]))
    page.on('requestfailed', lambda request: failed.append(urlsplit(request.url).path) if '/native/' in request.url or '/assets/' in request.url else None)
    page.on('response', lambda response: loaded.add(urlsplit(response.url).path) if response.status == 200 and '/native/' in response.url else None)
    record.update(pageErrors=errors, failedRequests=failed, trace=[], stages=[], fixture=draft)
    page.add_init_script(ui.RNG_FIXTURE)
    page.add_init_script(f"localStorage.setItem('ygo_custom_deck',{json.dumps(json.dumps(draft))});")
    response = page.goto(url, wait_until='domcontentloaded')
    assert response.header_value('content-security-policy') == ui.production_headers()['Content-Security-Policy']
    assert page.evaluate('typeof window.__YGO_QA__') == 'undefined'
    page.locator('input[name="game-mode"][value="native"]').check()
    page.locator('input[name="ai-difficulty"][value="easy"]').check()
    page.locator('[data-deck-id="custom"]').click()
    ui.wait_until(page, "() => document.querySelector('#builder-catalogue-status')?.textContent.includes('cartes avec règles natives')")
    assert page.locator('#deck-validity-badge').inner_text() == 'Deck valide'
    assert page.locator('#deck-size-val').inner_text() == 'Main: 40 / Extra: 0 / Side: 0'
    page.locator('#btn-start-duel').click()
    modal(page, 'CHOIX DU PREMIER JOUEUR')
    page.get_by_role('button', name='JE COMMENCE', exact=True).click()
    page.locator('#start-modal').wait_for(state='hidden')
    page.wait_for_selector('#player-hand .card-entity')
    controls.settle(page)
    opening = page.locator('#player-hand .card-entity').evaluate_all('cards=>cards.map(card=>card.dataset.id)')
    assert Counter(opening) == Counter(OPENINGS[record['scenario']]), opening
    record['opening'] = opening
    assert page.evaluate('JSON.parse(localStorage.getItem("ygo_custom_deck"))') == draft
    wave.switch_view(page, 'real')
    views.wait_real_projection(page)
    return loaded


def finish(page, record, out, loaded):
    controls.settle(page)
    record['checks']['opponentConcealment'] = ui.verify_concealment(page)
    assert page.evaluate('document.body.scrollWidth<=innerWidth')
    assert page.evaluate('JSON.parse(localStorage.getItem("ygo_custom_deck"))') == record['fixture']
    assert {'/native/ocgcore.sync.wasm', '/native/card-data.json', '/native/scripts.json'} <= loaded
    assert not record['pageErrors'] and not record['failedRequests'] and not page.evaluate('window.__auditCspViolations || []')
    record.update(nativeAssetsLoaded=sorted(loaded), cspViolations=[], noQaHook=True, noPostStartInjection=True)
    capture(page, record, out, 'resolved')


def ravine(page, record, out):
    place(page, '62265044', '#player-field-zone'); controls.settle(page)
    capture(page, record, out, 'activated')
    before = snapshot(page)
    page.locator('#player-field-zone').click(); modal(page, 'EFFETS ET INVOCATIONS')
    actions = page.locator('#decision-options .decision-choice-list button')
    assert actions.count() == 1, actions.all_inner_texts()
    trace(page, record, 'field-native-action'); actions.click()
    modal(page, 'CHOISIR LES CARTES'); trace(page, record, 'discard-cost')
    choose_card(page, r'Dark Magician|Magicien Sombre')
    modal(page, 'CHOISIR UN EFFET')
    facts = trace(page, record, 'two-official-options')
    expected = [value.strip() for value in ROWS['62265044'][13][1:3]]
    assert facts['choices'] == expected, (facts['choices'], expected)
    assert int(page.locator('#player-gy-count').inner_text()) == int(before['ownGraveCount']) + 1
    assert page.locator('#player-hand .card-entity').count() == len(before['ownHand']) - 1
    capture(page, record, out, 'official-options', allow_decision=True)
    buttons = page.locator('#decision-options .decision-choice-list button')
    rectangles = buttons.evaluate_all('buttons=>buttons.map(button=>{const r=button.getBoundingClientRect();return {width:r.width,height:r.height,left:r.left,right:r.right}})')
    assert all(r['height'] >= 44 and r['width'] >= 44 and r['left'] >= 0 and r['right'] <= record['width'] + 1 for r in rectangles)
    buttons.nth(1).focus(); page.keyboard.press('Enter')
    modal(page, 'CHOISIR LES CARTES'); trace(page, record, 'dragon-deck-target')
    choose_card(page, r'Blue.Eyes|Yeux Bleus|Dragon Blanc')
    controls.settle(page)
    assert page.locator('#player-gy-count').inner_text() == '2'
    assert page.locator('#player-deck-count').inner_text() == '34'
    page.locator('#player-graveyard-zone').click(); page.locator('#public-zone-modal').wait_for(state='visible')
    assert page.locator('#public-zone-list [data-id="46986414"]').count() == 1
    assert page.locator('#public-zone-list [data-id="89631139"]').count() == 1
    page.locator('#btn-close-public-zone').click()
    page.locator('#player-field-zone').click()
    assert not page.locator('#decision-modal').is_visible(), 'Spent once-per-turn action remained available'
    record['checks'].update(twoExactOfficialMetadataOptionLabels=True, discardBeforeOptionAndDeckChoice=True,
        nativeDragonSentToPublicGraveyard=True, oncePerTurnActionRemoved=True, keyboardEnterSelectsOfferedBranch=True,
        touchOptionRectangles=rectangles)


def scales(page, record, out):
    controls.activate(page, '15146890', 0); controls.settle(page)
    assert page.locator('.player-s-zone[data-index="0"] .card-entity[data-id="15146890"]').count() == 1
    assert page.locator('.player-s-zone[data-index="4"] .card-entity').count() == 0
    pendulum = page.locator('#btn-pendulum-summon')
    assert not pendulum.is_visible() or not pendulum.is_enabled()
    capture(page, record, out, 'left-only')
    controls.activate(page, '51531505', 4); controls.settle(page)
    assert page.locator('.player-s-zone[data-index="4"] .card-entity[data-id="51531505"]').count() == 1
    capture(page, record, out, 'paired-outer-zones')
    controls.activate(page, '5318639', 2)
    modal(page, 'CHOISIR LES CARTES'); trace(page, record, 'mst-left-scale-target')
    choose_card(page, r'Dragonpulse Magician'); controls.settle(page)
    assert page.locator('.player-s-zone[data-index="0"] .card-entity').count() == 0
    assert page.locator('.player-s-zone[data-index="4"] .card-entity[data-id="51531505"]').count() == 1
    assert page.locator('#player-gy-count').inner_text() == '1'
    assert not pendulum.is_visible() or not pendulum.is_enabled()
    page.locator('#player-extra-zone').click(); page.locator('#extra-deck-modal').wait_for(state='visible')
    assert page.locator('#extra-deck-list .face-up-extra-card[data-id="15146890"]').count() == 1
    assert page.locator('#extra-deck-list .native-extra-pendulum-action').count() == 0
    page.screenshot(path=str(out / f'gameplay-scales-face-up-extra-{record["width"]}.png'), animations='disabled')
    page.locator('#close-extra-modal').click()
    record['checks'].update(leftScaleOnlyInActualLeftOuterZone=True, distinctPairInOuterZonesZeroAndFour=True,
        mstDestroysChosenLeftScale=True, rightScaleRetained=True, destroyedScaleFaceUpExtraNotGraveyard=True,
        oneScaleDoesNotOfferPendulumProcedure=True)


def gateway(page, record, out):
    controls.activate(page, '27970830', 0); controls.settle(page)
    place(page, '2511717', '.player-m-zone[data-index="0"]')
    # Kageki's optional effect is selected from the real Chain prompt.
    deadline = time.monotonic() + 35
    selected = False
    while time.monotonic() < deadline:
        if page.locator('#decision-modal').is_visible():
            facts = trace(page, record, 'kageki-native-trigger')
            cards = page.locator('#decision-options .decision-card-option')
            choices = page.locator('#decision-options .decision-choice-list button')
            if cards.count() and any('Kizan' in label for label in cards.all_inner_texts()):
                choose_card(page, 'Kizan'); selected = True
            elif facts['title'] == 'CHOISIR LA ZONE':
                cards.first.click(); page.locator('#decision-options > button.btn-magenta').click()
            elif facts['title'] == 'CHOISIR LA POSITION':
                page.get_by_role('button', name='ATTAQUE FACE RECTO', exact=True).click()
            elif facts['title'] == 'ACTIVER UN EFFET ?':
                page.get_by_role('button', name='OUI, ACTIVER', exact=True).click()
            elif facts['title'] == 'ACTIVER OU CONFIRMER ?':
                page.get_by_role('button', name='OUI', exact=True).click()
            elif any('Kageki' in label or 'Special Summon' in label for label in facts['choices']):
                choices.filter(has_text=re.compile('Kageki|Special Summon')).first.click()
            elif choices.filter(has_text='PASSER LA PRIORITÉ').count():
                choices.filter(has_text='PASSER LA PRIORITÉ').click()
            else:
                raise AssertionError(f'Unexpected Kageki decision: {facts}')
        elif selected and page.locator('.player-m-zone .card-entity[data-id="49721904"]').count() == 1:
            controls.settle(page); break
        page.wait_for_timeout(75)
    else:
        raise AssertionError('Kageki did not actually summon the selected Kizan')
    page.locator('#btn-native-actions').click(); modal(page, 'EFFETS ET INVOCATIONS')
    choices = page.locator('#decision-options .decision-choice-list button')
    summon = choices.filter(has_text=re.compile('Invoquer spécialement.*Kizan', re.I))
    assert summon.count() == 1, choices.all_inner_texts()
    trace(page, record, 'kizan-own-native-special-procedure'); summon.click()
    deadline = time.monotonic() + 35
    while time.monotonic() < deadline:
        if page.locator('#decision-modal').is_visible():
            facts = trace(page, record, 'kizan-native-placement')
            if facts['title'] == 'CHOISIR LA ZONE':
                page.locator('#decision-options .decision-card-option').first.click()
                page.locator('#decision-options > button.btn-magenta').click()
            elif facts['title'] == 'CHOISIR LA POSITION':
                page.get_by_role('button', name='ATTAQUE FACE RECTO', exact=True).click()
            elif facts['title'] == 'RÉPONDRE À LA CHAÎNE':
                page.get_by_role('button', name='PASSER LA PRIORITÉ', exact=True).click()
            else:
                raise AssertionError(f'Unexpected Kizan decision: {facts}')
        elif page.locator('.player-m-zone .card-entity[data-id="49721904"]').count() == 2:
            controls.settle(page); break
        page.wait_for_timeout(75)
    else:
        raise AssertionError('Second Kizan did not complete its real procedure')
    controls.activate(page, '81439173', 2)
    modal(page, 'CHOISIR LES CARTES'); trace(page, record, 'foolish-shien-to-graveyard')
    choose_card(page, r'Great Shogun Shien'); controls.settle(page)
    page.locator('.player-s-zone[data-index="0"]').click(); modal(page, 'EFFETS ET INVOCATIONS')
    facts = trace(page, record, 'three-distinct-gateway-effects')
    expected = [value.strip() for value in ROWS['27970830'][13][:3]]
    assert len(facts['choices']) == 3 and len(set(facts['choices'])) == 3, facts['choices']
    assert all(label.endswith(effect) for label, effect in zip(facts['choices'], expected))
    capture(page, record, out, 'three-official-effects', allow_decision=True)
    before = snapshot(page)
    page.get_by_role('button', name='ANNULER', exact=True).click(); controls.settle(page)
    after = snapshot(page)
    assert before == after, 'Dismissing the public action menu changed native public state'
    page.locator('.player-s-zone[data-index="0"]').click(); modal(page, 'EFFETS ET INVOCATIONS')
    reopened = trace(page, record, 'cancelled-menu-reopened')
    assert reopened['choices'] == facts['choices']
    page.locator('#decision-options .decision-choice-list button').nth(1).click()
    modal(page, 'CHOISIR LES CARTES'); trace(page, record, 'gateway-four-counter-search')
    choose_card(page, r'Kageki'); controls.settle(page)
    assert page.locator('#player-hand .card-entity[data-id="2511717"]').count() == 1
    page.locator('.player-s-zone[data-index="0"]').click(); modal(page, 'EFFETS ET INVOCATIONS')
    remaining = trace(page, record, 'native-cost-removes-four-and-six-counter-options')
    assert len(remaining['choices']) == 1 and remaining['choices'][0].endswith(expected[0]), remaining['choices']
    page.get_by_role('button', name='ANNULER', exact=True).click()
    record['checks'].update(threeRealSamuraiSummonsEnableThreeOfficialEffects=True,
        actualFoolishBurialPlacesShienInPublicGraveyard=True, distinctEffectLabelsPreserved=True,
        publicActionMenuCancellationPreservesNativePublicState=True, cancelledMenuCanReopen=True,
        selectedFourCounterEffectActuallySearchesKageki=True, remainingTwoCounterEffectOnly=True,
        internalRequiredEffectModalDismissalCertified=False)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--dist', type=Path, default=ROOT / 'dist')
    parser.add_argument('--output', type=Path, default=ROOT / 'docs/audits/artifacts/continuation-gameplay-ui-2026-10-08')
    parser.add_argument('--expected-entry-sha256', required=True)
    parser.add_argument('--desktop-only', action='store_true')
    parser.add_argument('--scenario', choices=['all', *OPENINGS], default='all')
    args = parser.parse_args()
    assert re.fullmatch('[a-f0-9]{64}', args.expected_entry_sha256)
    before_local, essential = wave.compiled_wave_fingerprints(args.dist)
    entry = next(path for path in before_local if re.fullmatch(r'assets/index-[^/]+\.js', path))
    assert before_local[entry]['sha256'] == args.expected_entry_sha256, 'Build is not the coordinator-frozen entry'
    args.output.mkdir(parents=True, exist_ok=True)
    ui.AuditServer.headers_to_add = ui.production_headers()
    server = ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(ui.AuditServer, directory=str(args.dist)))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    url = f'http://127.0.0.1:{server.server_port}'
    dependencies = ['scripts/audit-native-duel-ui.py', 'scripts/audit-native-pendulum-ui.py',
        'scripts/audit-native-wave-ui.py', 'scripts/audit-native-duel-views.py', 'src/core/native/NativeDuelGame.js',
        'src/core/native/NativeDuelDecisions.js', 'src/ui/NativeDuelPresentationModel.js', 'main.js', 'vercel.json',
        'public/native/card-data.json', 'public/native/scripts.json', 'public/native/ocgcore.sync.wasm']
    report = {'ok': False, 'date': '2026-10-08', 'target': 'coordinator-frozen compiled production bundle',
        'scope': 'Actual free native duel commands and public DOM observations. No game/core object access.',
        'tcgAdvancedLegalityCertified': False, 'expectedEntrySha256': args.expected_entry_sha256,
        'productionCsp': ui.production_headers()['Content-Security-Policy'], 'essentialBuildAssets': essential,
        'auditSourceSha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
        'sourceHashes': {path: hashlib.sha256((ROOT / path).read_bytes()).hexdigest() for path in dependencies},
        'fixtures': {name: fixture(name) for name in OPENINGS}, 'viewports': [],
        'limits': ['The Gateway browser cancel closes the public native-action menu; the internal required callback dismissal is tested by the separate actual-runtime suite.',
            'The scales journey checks two actual outer zones and a destroyed scale destination, not every Pendulum procedure or every Link arrow interaction.',
            'The selected Ravine branch is sending a Dragon to the Graveyard; its other offered label is checked without claiming a second browser resolution.']}
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True,
                args=['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
            request = browser.new_context()
            before_served = wave.fingerprints(request.request, url, before_local); request.close()
            assert before_local == before_served
            report['servedResponseFingerprintsBefore'] = before_served
            for width, height in [(1280, 900)] + ([] if args.desktop_only else [(390, 844)]):
                view = {'width': width, 'height': height, 'scenarios': []}; report['viewports'].append(view)
                for name in OPENINGS if args.scenario == 'all' else [args.scenario]:
                    context = browser.new_context(viewport={'width': width, 'height': height}, reduced_motion='reduce')
                    page = context.new_page(); page.set_default_timeout(30000)
                    record = {'scenario': name, 'width': width, 'height': height, 'checks': {}}; view['scenarios'].append(record)
                    try:
                        loaded = begin(page, url, record, fixture(name))
                        globals()[name](page, record, args.output)
                        finish(page, record, args.output, loaded)
                        record['ok'] = True
                    except Exception:
                        page.screenshot(path=str(args.output / f'failure-{name}-{width}.png'), animations='disabled', timeout=60000)
                        if page.locator('#decision-modal').is_visible():
                            record['pendingDecision'] = trace(page, record, 'failure-pending-decision')
                        raise
                    finally:
                        context.close()
            request = browser.new_context()
            after_served = wave.fingerprints(request.request, url, before_local); request.close()
            after_local, essential_after = wave.compiled_wave_fingerprints(args.dist)
            assert before_served == after_served == before_local == after_local and essential == essential_after
            report.update(servedResponseFingerprintsAfter=after_served, compiledSnapshotBefore=before_local,
                compiledSnapshotAfter=after_local, immutableCompiledSnapshot=True)
            browser.close()
        report['captureSha256'] = {path.name: hashlib.sha256(path.read_bytes()).hexdigest() for path in sorted(args.output.glob('gameplay-*.png'))}
        report['ok'] = True
    except Exception as error:
        report['failure'] = {'type': type(error).__name__, 'message': str(error)[:2000]}
        raise
    finally:
        (args.output / 'report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
        server.shutdown(); server.server_close()
    print(json.dumps({'ok': report['ok'], 'viewports': len(report['viewports']),
        'scenarios': sum(len(view['scenarios']) for view in report['viewports']), 'captures': len(report['captureSha256']),
        'servedBodies': len(report['servedResponseFingerprintsBefore']), 'entrySha256': args.expected_entry_sha256}))


if __name__ == '__main__':
    main()
