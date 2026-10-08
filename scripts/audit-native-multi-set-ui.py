#!/usr/bin/env python3
"""Exercise Call of the Forgotten's real three-card Set through compiled UI.

A legal local registration and an isolated varied crypto stream precede the
duel. All subsequent choices are visible clicks. No game object, response
injection, post-start fixture, QA API or opponent private identity is read.
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


def module(name, filename):
    spec = importlib.util.spec_from_file_location(name, ROOT / 'scripts' / filename)
    value = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(value)
    return value


ui = module('multi_set_native_ui', 'audit-native-duel-ui.py')
provenance = module('multi_set_native_provenance', 'audit-native-duel-views.py')
OPENING = ['80749819', '45894482', '97590747', '12607053', '89631139']
HAUNTED = re.compile(r'Call of the Haunted|Appel.*Hant', re.I)
GILASAURUS_SPECIAL = re.compile(r'^Invoquer spécialement (?:Gilasaurus|Gilasaure)', re.I)


def compiled_fingerprints(dist):
    paths = ['index.html', 'native/ocgcore.sync.wasm', 'native/card-data.json', 'native/scripts.json']
    paths += sorted(str(path.relative_to(dist)) for path in (dist / 'assets').iterdir()
                    if path.suffix in {'.js', '.css'})
    assert any(re.fullmatch(r'assets/index-.+\.js', path) for path in paths)
    assert any(path.startswith('assets/FieldEnvironmentRegistry-') for path in paths)
    return {path: {'bytes': (dist / path).stat().st_size,
                   'sha256': hashlib.sha256((dist / path).read_bytes()).hexdigest()} for path in paths}


def fixture():
    normals = ['89631139', '46986414', '97590747', '15025844', '70781052',
               '5053103', '76812113', '91152256', '32452818', '91939608']
    main = [code for code in normals for _ in range(3)]
    main += ['80749819'] * 3 + ['97077563'] * 3 + ['45894482'] * 3 + ['12607053']
    locked = set()
    for position, code in zip([11, 14, 18, 4, 25], OPENING):
        source = next(index for index, value in enumerate(main) if value == code and index not in locked)
        main[position], main[source] = main[source], main[position]
        locked.add(position)
    rows = {str(row[0]): row for row in json.loads((ROOT / 'public/native/card-data.json').read_text())['rows']}
    assert len(main) == 40 and max(Counter(main).values()) <= 3
    assert all(code in rows for code in main)
    assert Counter(main)['97077563'] == 3 and '97077563' not in OPENING
    return {'main': main, 'extra': [], 'side': []}


def native_actions(page):
    page.locator('#btn-native-actions').click()
    page.locator('#decision-modal').wait_for(state='visible')
    assert page.locator('#decision-modal-title').inner_text() == 'EFFETS ET INVOCATIONS'
    labels = page.locator('#decision-options .decision-choice-list button').all_inner_texts()
    page.locator('#btn-decision-cancel').click()
    page.locator('#decision-modal').wait_for(state='hidden')
    return labels


def activate_field(page):
    page.locator('#player-hand .card-entity[data-id="80749819"]').click()
    zone = page.locator('#player-field-zone')
    assert 'active-zone' in (zone.get_attribute('class') or '')
    zone.click()
    page.locator('#action-modal').wait_for(state='visible')
    button = page.locator('#btn-action-faceup')
    assert button.is_enabled() and button.inner_text() == 'ACTIVER LE TERRAIN'
    button.click()
    page.locator('#action-modal').wait_for(state='hidden')


def resolve_sets(page, view, output):
    selected = False
    places = []
    trace = []
    deadline = time.monotonic() + 45
    while time.monotonic() < deadline:
        if page.locator('#decision-modal').is_visible():
            title = page.locator('#decision-modal-title').inner_text()
            passing = page.locator('#decision-options .decision-choice-list button').filter(has_text='PASSER LA PRIORITÉ')
            if passing.count():
                trace.append({'title': title, 'choice': 'PASSER LA PRIORITÉ'})
                passing.click()
            elif title == 'ACTIVER OU CONFIRMER ?':
                description = page.locator('#decision-modal-description').inner_text()
                trace.append({'title': title, 'description': description, 'choice': 'OUI'})
                page.get_by_role('button', name='OUI', exact=True).click()
            elif title == 'CHOISIR LES CARTES':
                assert not selected, 'Unexpected second mandatory card selection'
                options = page.locator('#decision-options .decision-card-option')
                labels = options.all_inner_texts()
                assert options.count() == 3 and all(HAUNTED.search(label) for label in labels), labels
                confirm = page.locator('#decision-options > button.btn-magenta')
                assert confirm.is_disabled()
                for index in [2, 0, 1]:
                    options.nth(index).click()
                    assert options.nth(index).get_attribute('aria-pressed') == 'true'
                assert confirm.is_enabled() and confirm.inner_text() == 'CONFIRMER (3/3)'
                view['cardSelection'] = {'offered': labels, 'clickedIndices': [2, 0, 1],
                                         'selectedCount': 3, 'confirmation': confirm.inner_text()}
                page.screenshot(path=str(output / f'multi-set-selection-{view["width"]}.png'), animations='disabled')
                confirm.click()
                selected = True
            elif title == 'CHOISIR LA ZONE':
                assert selected
                options = page.locator('#decision-options .decision-card-option')
                offered = options.all_inner_texts()
                own = options.filter(has_text=re.compile(r'^Votre Zone Magie/Piège [1-5]$'))
                assert own.count(), offered
                chosen = own.first.inner_text()
                assert chosen not in places, 'Same occupied Spell/Trap Zone was offered twice'
                places.append(chosen)
                own.first.click()
                page.locator('#decision-options > button.btn-magenta').click()
                trace.append({'title': title, 'offered': offered, 'choice': chosen})
            else:
                raise AssertionError(f'Unexpected native decision while setting: {title}')
        elif page.locator('#btn-end-turn').is_enabled() and page.locator('#phase-main1').evaluate("e => e.classList.contains('active')"):
            assert selected and len(places) == 3
            view['decisionTrace'] = trace
            view['setPlaces'] = places
            return
        page.wait_for_timeout(100)
    raise AssertionError('The three Sets did not resolve to an actionable Main Phase')


def public_state(page):
    return page.evaluate("""() => {
      const spells=[...document.querySelectorAll('.player-s-zone')].flatMap(zone=>{
        const card=zone.querySelector('.card-entity'); if(!card) return [];
        return [{zone:Number(zone.dataset.index),knownOwnCode:card.dataset.id,
          faceDown:Boolean(card.querySelector('.card-inner.face-down'))}];
      });
      const field=document.querySelector('#player-field-zone .card-entity');
      return {ownSpellZones:spells,publicField:field?.dataset.id||null,
        ownHandCount:document.querySelectorAll('#player-hand .card-entity').length,
        opponentHandCount:document.querySelectorAll('#opponent-hand .card-entity').length};
    }""")


def await_real_projection(page):
    # Activation completes before ResizeObserver's next projection. Read only
    # public layout and wait for two stable animation frames before any camera
    # interaction; a camera click must not conceal an incomplete initial frame.
    ui.wait_until(page, """async () => {
      const sample=()=>{
        const host=document.querySelector('.field-container'),root=document.querySelector('.real-duel-css3d-root'),
          camera=document.querySelector('#duel-board')?.parentElement;
        if(!host||!root||!camera)return null;
        const h=host.getBoundingClientRect(),r=root.getBoundingClientRect(),transform=getComputedStyle(camera).transform;
        if(host.scrollTop||host.scrollLeft||Math.abs(h.width-r.width)>1||Math.abs(h.height-r.height)>1
          ||Math.abs(h.x-r.x)>1||Math.abs(h.y-r.y)>1||Math.abs(camera.offsetWidth-h.width)>1
          ||Math.abs(camera.offsetHeight-h.height)>1||new DOMMatrixReadOnly(transform).isIdentity)return null;
        return [h.x,h.y,h.width,h.height,r.x,r.y,r.width,r.height,camera.offsetWidth,camera.offsetHeight,transform].join('|');
      };
      const first=sample();if(!first)return false;
      await new Promise(requestAnimationFrame);const second=sample();if(first!==second)return false;
      await new Promise(requestAnimationFrame);return second===sample();
    }""")


def own_set_bounds(page):
    return page.evaluate("""() => {
      const host=document.querySelector('.field-container'),bounds=host.getBoundingClientRect();
      const cards=[...document.querySelectorAll('.player-s-zone .card-entity[data-id="97077563"]')].map(card=>{
        const r=card.getBoundingClientRect();return {knownOwnCode:card.dataset.id,
          rectangle:{x:Math.round(r.x),y:Math.round(r.y),width:Math.round(r.width),height:Math.round(r.height)},
          intersectsHost:r.right>bounds.left&&r.left<bounds.right&&r.bottom>bounds.top&&r.top<bounds.bottom,
          centerWithinHost:(r.left+r.right)/2>=bounds.left&&(r.left+r.right)/2<=bounds.right
            &&(r.top+r.bottom)/2>=bounds.top&&(r.top+r.bottom)/2<=bounds.bottom};
      });
      return {scrollX,scrollY,viewport:{width:innerWidth,height:innerHeight},
        hostScrollTop:host.scrollTop,hostScrollLeft:host.scrollLeft,
        documentScrollTop:document.scrollingElement?.scrollTop||0,cards};
    }""")


def assert_sets_framed(framed):
    assert framed['hostScrollTop'] == 0 and framed['hostScrollLeft'] == 0
    assert len(framed['cards']) == 3
    assert all(card['rectangle']['width'] >= 8 and card['rectangle']['height'] >= 8
               and card['centerWithinHost'] for card in framed['cards']), framed


def run_view(page, url, view, output, draft):
    errors, failures, loaded = [], [], set()
    page.on('pageerror', lambda error: errors.append(str(error)[:600]))
    page.on('requestfailed', lambda request: failures.append(urlsplit(request.url).path) if '/native/' in request.url else None)
    page.on('response', lambda response: loaded.add(urlsplit(response.url).path) if '/native/' in response.url and response.status == 200 else None)
    page.add_init_script(ui.RNG_FIXTURE)
    page.add_init_script(f"localStorage.setItem('ygo_custom_deck',{json.dumps(json.dumps(draft))});")
    response = page.goto(url, wait_until='domcontentloaded')
    csp = response.header_value('content-security-policy') or ''
    assert "'wasm-unsafe-eval'" in csp and "'unsafe-eval'" not in csp
    assert page.evaluate('typeof window.__YGO_QA__') == 'undefined'
    page.locator('input[name="game-mode"][value="native"]').check()
    page.locator('input[name="ai-difficulty"][value="easy"]').check()
    page.locator('[data-deck-id="custom"]').click()
    ui.wait_until(page, "() => document.querySelector('#builder-catalogue-status')?.textContent.includes('cartes avec règles natives')")
    assert page.locator('#deck-validity-badge').inner_text() == 'Deck valide'
    assert page.locator('#deck-size-val').inner_text() == 'Main: 40 / Extra: 0 / Side: 0'
    page.screenshot(path=str(output / f'multi-set-registration-{view["width"]}.png'), animations='disabled')
    page.locator('#btn-start-duel').click()
    page.get_by_role('button', name='JE COMMENCE', exact=True).click()
    page.locator('#start-modal').wait_for(state='hidden')
    page.wait_for_selector('#player-hand .card-entity')
    ui.await_player_main(page)
    opening = page.locator('#player-hand .card-entity').evaluate_all('cards => cards.map(card=>card.dataset.id)')
    assert Counter(opening) == Counter(OPENING), opening
    before = native_actions(page)
    assert any(GILASAURUS_SPECIAL.search(label) for label in before), before
    view['availableActionsBefore'] = before
    activate_field(page)
    resolve_sets(page, view, output)
    state = public_state(page)
    assert state['publicField'] == '80749819'
    assert len(state['ownSpellZones']) == 3
    assert all(card['knownOwnCode'] == '97077563' and card['faceDown'] for card in state['ownSpellZones'])
    after = native_actions(page)
    assert not any(GILASAURUS_SPECIAL.search(label) for label in after), after
    assert any(re.search(r'^Invoquer (?:Gilasaurus|Gilasaure)', label, re.I) for label in after), after
    view['availableActionsAfter'] = after
    view['checks'] = {'validFortyCardRegistration': True, 'realShuffledOpening': True,
                      'threeDistinctCopiesSelectedThroughUi': True, 'threeDistinctPlacesChosenThroughUi': True,
                      'threeTrapsSetAndFieldResolved': True, 'nonZombieSpecialForbiddenNormalStillAvailable': True}
    view['publicResolvedState'] = state
    view['presentations'] = []
    for mode in ['compact', 'arena', 'real', 'compact', 'arena', 'real', 'compact']:
        if page.locator('#btn-toggle-view').get_attribute('data-view-mode') != mode:
            page.locator('#btn-toggle-view').click()
        ui.wait_until(page, 'mode => document.querySelector("#btn-toggle-view").dataset.viewMode===mode', mode)
        if mode == 'real':
            ui.wait_until(page, """() => {
              const host=document.querySelector('.field-container'),app=document.querySelector('.app-container'),layer=document.querySelector('[data-real-duel-view-layer="true"]');
              return host?.classList.contains('real-duel-view-active')&&app?.classList.contains('real-duel-view-active')
                &&layer?.dataset.active==='true'&&!layer.hidden&&!document.querySelector('#btn-toggle-view').disabled;
            }""")
            page.locator('.real-duel-scene-3d-canvas').wait_for(state='visible')
            await_real_projection(page)
            view['realPresentationBounds'] = page.evaluate("""() => {
              const selectors=['.field-container','.real-duel-scene-3d-canvas','.real-duel-camera-controls',
                '.real-duel-css3d-root','#duel-board','#player-hand'];
              const rect=e=>{const r=e?.getBoundingClientRect();return r?{x:Math.round(r.x),y:Math.round(r.y),width:Math.round(r.width),height:Math.round(r.height)}:null;};
              const ancestry=e=>{const rows=[];for(let p=e?.parentElement;p&&rows.length<6;p=p.parentElement){
                const s=getComputedStyle(p);rows.push({tag:p.tagName,className:p.className,
                  scrollTop:p.scrollTop,scrollLeft:p.scrollLeft,overflow:s.overflow,
                  overflowX:s.overflowX,overflowY:s.overflowY,rectangle:rect(p)});
              }return rows;};
              return selectors.map(selector=>{
                const element=document.querySelector(selector),r=element?.getBoundingClientRect(),style=element?getComputedStyle(element):null;
                return {selector,present:Boolean(element),hidden:element?.hidden||false,
                  display:style?.display||null,visibility:style?.visibility||null,
                  rectangle:rect(element),scrollTop:element?.scrollTop??null,scrollLeft:element?.scrollLeft??null,
                  ancestorBounds:ancestry(element),
                  intersectsViewport:Boolean(r&&r.right>0&&r.left<innerWidth&&r.bottom>0&&r.top<innerHeight)};
              });
            }""")
            frame = view['realPresentationBounds']
            host, canvas, toolbar = frame[:3]
            assert host['scrollTop'] == 0 and host['scrollLeft'] == 0, host
            assert abs(canvas['rectangle']['x'] - host['rectangle']['x']) <= 1, frame
            assert abs(canvas['rectangle']['y'] - host['rectangle']['y']) <= 1, frame
            assert not toolbar['hidden'] and toolbar['display'] == 'flex', toolbar
            assert toolbar['rectangle']['y'] >= host['rectangle']['y'], toolbar
            assert toolbar['rectangle']['y'] + toolbar['rectangle']['height'] <= host['rectangle']['y'] + host['rectangle']['height'], toolbar
            assert toolbar['rectangle']['x'] >= 0 and toolbar['rectangle']['x'] + toolbar['rectangle']['width'] <= view['width'] + 1, toolbar
            assert toolbar['rectangle']['y'] >= 0 and toolbar['rectangle']['y'] + toolbar['rectangle']['height'] <= view['height'], toolbar
            before_camera = own_set_bounds(page)
            assert_sets_framed(before_camera)
            overview = page.locator('.real-duel-camera-button[data-camera-preset="overview"]')
            assert overview.is_visible() and overview.is_enabled()
            overview.click()
            ui.wait_until(page, "() => document.querySelector('.real-duel-camera-controls').dataset.cameraPreset==='overview'")
            page.wait_for_timeout(700)
            assert overview.get_attribute('aria-pressed') == 'true'
            view['realScrollAndOwnCardBounds'] = own_set_bounds(page)
            framed = view['realScrollAndOwnCardBounds']
            assert_sets_framed(framed)
            view.setdefault('realFrames', []).append({'transition': len(view['presentations']) + 1,
                                                       'projectionStableForTwoFramesBeforeCamera': True,
                                                       'hostCanvasToolbar': frame, 'beforeAnyCameraClick': before_camera,
                                                       'afterPublicOverviewClick': framed})
            view['checks']['realHostScrollResetCanvasAlignedCameraClickableAndSetsInFrame'] = True
        assert public_state(page) == state
        assert not page.locator('#decision-modal').is_visible() and page.locator('#btn-end-turn').is_enabled()
        view['presentations'].append({'mode': mode, 'samePublicState': True})
        if len(view['presentations']) <= 3:
            page.screenshot(path=str(output / f'multi-set-{mode}-{view["width"]}.png'), animations='disabled')
        elif mode == 'real':
            page.screenshot(path=str(output / f'multi-set-real-repeat-{view["width"]}.png'), animations='disabled')
    # The first-turn opponent has no Set cards. Advance a real opponent turn
    # before claiming meaningful concealment or the restriction's expiry.
    page.locator('#btn-end-turn').click()
    ui.await_player_main(page)
    resumed = native_actions(page)
    assert any(GILASAURUS_SPECIAL.search(label) for label in resumed), resumed
    view['availableActionsNextOwnTurn'] = resumed
    view['checks']['restrictionExpiresAfterActualOpponentTurn'] = True
    view['opponentConcealment'] = ui.verify_concealment(page)
    assert view['opponentConcealment']['count'] >= 1, 'No opposing hidden card was actually present for the concealment check'
    view['checks']['actualOpposingHiddenCardsRemainAnonymous'] = True
    page.screenshot(path=str(output / f'multi-set-next-turn-{view["width"]}.png'), animations='disabled')
    assert page.evaluate('document.body.scrollWidth<=innerWidth')
    assert page.evaluate('JSON.parse(localStorage.getItem("ygo_custom_deck"))') == draft
    assert {'/native/ocgcore.sync.wasm', '/native/scripts.json', '/native/card-data.json'} <= loaded
    violations = page.evaluate('window.__auditCspViolations || []')
    assert not errors and not failures and not violations, {'errors': errors, 'failures': failures, 'csp': violations}
    view.update(pageErrors=errors, nativeRequestFailures=failures, cspViolations=violations, nativeAssets=sorted(loaded))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--dist', type=Path, default=ROOT / 'dist')
    parser.add_argument('--output', type=Path, default=ROOT / 'docs/audits/artifacts/native-multi-set-ui-2026-10-08')
    parser.add_argument('--viewport', choices=['both', 'desktop', 'mobile'], default='both')
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    before = compiled_fingerprints(args.dist)
    headers = ui.production_headers()
    ui.AuditServer.headers_to_add = headers
    server = ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(ui.AuditServer, directory=str(args.dist)))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    url = f'http://127.0.0.1:{server.server_port}'
    report = {'ok': False, 'generatedOn': '2026-10-08', 'target': 'immutable final compiled production bundle',
              'qaHook': False, 'postStartInjection': False, 'productionCsp': headers['Content-Security-Policy'],
              'registeredFixture': fixture(), 'compiledSnapshotBefore': before, 'viewports': []}
    source_paths = ['scripts/audit-native-multi-set-ui.py', 'scripts/audit-native-duel-ui.py',
                    'scripts/audit-native-duel-views.py', 'src/core/native/NativeDuelGame.js',
                    'src/core/native/NativeDuelVisualEvents.js', 'src/core/native/vendor/ocgcore/index.js']
    report['sourceHashes'] = {path: hashlib.sha256((ROOT / path).read_bytes()).hexdigest() for path in source_paths}
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True,
                args=['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
            for width, height in [(1280, 900), (390, 844)]:
                if args.viewport == 'desktop' and width != 1280 or args.viewport == 'mobile' and width != 390:
                    continue
                context = browser.new_context(viewport={'width': width, 'height': height}, reduced_motion='reduce')
                page = context.new_page()
                page.set_default_timeout(30000)
                view = {'width': width, 'height': height}
                report['viewports'].append(view)
                try:
                    provenance.record_build_provenance(context.request, url, report)
                    run_view(page, url, view, args.output, report['registeredFixture'])
                except Exception:
                    page.screenshot(path=str(args.output / f'failure-{width}.png'), animations='disabled')
                    if page.locator('#decision-modal').is_visible():
                        view['pendingDecision'] = {'title': page.locator('#decision-modal-title').inner_text(),
                                                  'offered': page.locator('#decision-options button').all_inner_texts()}
                    raise
                context.close()
            browser.close()
        report['ok'] = True
    except Exception as error:
        report['failure'] = {'type': type(error).__name__, 'message': str(error)[:1500]}
        raise
    finally:
        after = compiled_fingerprints(args.dist)
        report['compiledSnapshotAfter'] = after
        report['immutableCompiledSnapshot'] = before == after
        if before != after:
            report['ok'] = False
        (args.output / 'report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
        server.shutdown()
        server.server_close()
    assert before == after
    print(json.dumps({'ok': report['ok'], 'viewports': len(report['viewports']),
                      'testedIndexSha256': report['testedIndexSha256']}))


if __name__ == '__main__':
    main()
