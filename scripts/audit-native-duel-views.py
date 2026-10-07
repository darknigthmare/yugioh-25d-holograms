#!/usr/bin/env python3
"""Verify native field and public monster rendering across all three duel views.

Build first. This imports the production-header browser helper, serves dist, and
uses only real controls and public DOM. An isolated local custom deck and seeded
RNG provide Mausoleum, Blue-Eyes and Zombie World; native rules are never patched.
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
from urllib.parse import urlsplit

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('native_ui_audit', ROOT / 'scripts/audit-native-duel-ui.py')
helper = importlib.util.module_from_spec(spec)
spec.loader.exec_module(helper)
FIELD = '.card-zone[data-side="player"][data-zone-type="field"]'
MONSTER = '.card-zone[data-side="player"][data-zone-type="monster"] .monster-hologram-entity[data-id="89631139"]'


def fixture():
    draft, _rows = helper.custom_deck_fixture()
    draft['main'] = draft['main'].copy()
    for indexes, code in [([3, 11, 39], '80921533'), ([1, 7, 14], '89631139'), ([9, 18, 25], '4064256')]:
        for index in indexes:
            draft['main'][index] = code
    draft['main'][4] = '14087893'  # A legal optional response holds the pending chain open.
    assert len(draft['main']) == 40 and max(Counter(draft['main']).values()) <= 3
    return draft


def snapshot(page):
    # No opponent card IDs, names, hand contents or engine objects are read.
    return page.evaluate("""() => {
      const layer=document.querySelector('[data-real-duel-view-layer="true"]');
      const scene=document.querySelector('[data-real-duel-scene3d="true"]');
      const field=document.querySelector('.card-zone[data-side="player"][data-zone-type="field"] .card-entity');
      const monster=document.querySelector('.card-zone[data-side="player"][data-zone-type="monster"] .monster-hologram-entity[data-id="89631139"]');
      return {
        view:document.querySelector('#btn-toggle-view')?.dataset.viewMode,
        ownHand:[...document.querySelectorAll('#player-hand .card-entity')].map(card=>({id:card.dataset.id,uid:card.dataset.uid})),
        ownField:field?{id:field.dataset.id,faceDown:Boolean(field.querySelector('.card-inner.face-down'))}:null,
        playerLp:Number(document.querySelector('#player-lp')?.textContent.replace(/[^0-9]/g,'')),
        opponentLp:Number(document.querySelector('#opponent-lp')?.textContent.replace(/[^0-9]/g,'')),
        monster:monster?{id:monster.dataset.id,uid:monster.dataset.uid,
          atk:monster.querySelector('.stat-badge.atk')?.textContent,
          def:monster.querySelector('.stat-badge.def')?.textContent,
          label:monster.getAttribute('aria-label'),modelRendered:monster.closest('.card-zone').classList.contains('has-real-hologram-model')}:null,
        environment:layer?{id:layer.dataset.environmentId,active:layer.dataset.active,
          backdrop:layer.style.getPropertyValue('--real-environment-backdrop')}:null,
        scene:scene?{id:scene.dataset.environmentId,webglAvailable:scene.dataset.webglAvailable,
          material:scene.dataset.arenaMaterial}:null,
        counts:{boards:document.querySelectorAll('#duel-board').length,hands:document.querySelectorAll('#player-hand').length,
          scenes:document.querySelectorAll('[data-real-duel-scene3d="true"]').length,
          canvases:document.querySelectorAll('.real-duel-scene-3d-canvas').length,
          css3d:document.querySelectorAll('.real-duel-css3d-root').length},
        approximateJsHeapBytes:performance.memory?.usedJSHeapSize??null
      };
    }""")


def cycle(page, target):
    for _ in range(3):
        if snapshot(page)['view'] == target:
            return
        page.locator('#btn-toggle-view').click()
        page.wait_for_timeout(150)
    raise AssertionError(f'View selector did not reach {target}')


def assert_public_state(page, report, stage, expected_hand, expected_field, real_environment=None, allow_decision=False):
    if not allow_decision:
        helper.wait_until(page, """() => !document.querySelector('#decision-modal').checkVisibility()""")
    facts = snapshot(page)
    assert facts['playerLp'] == 6000 and facts['opponentLp'] == 8000, facts
    assert facts['ownHand'] == expected_hand, f'View transition changed the own hand at {stage}'
    assert facts['ownField'] == expected_field, f'View transition changed the field at {stage}'
    assert facts['monster'] and facts['monster']['atk'] == 'ATK 3000' and facts['monster']['def'] == 'DEF 2500', facts
    assert facts['monster']['uid'] == report['monsterRuntimeUid'], facts
    assert facts['counts']['boards'] == 1 and facts['counts']['hands'] == 1, facts
    assert all(facts['counts'][key] <= 1 for key in ['scenes', 'canvases', 'css3d']), facts
    if facts['view'] == 'real':
        helper.wait_until(page, """() => document.querySelector('.card-zone[data-side="player"][data-zone-type="monster"] .has-real-hologram-model') || document.querySelector('.card-zone[data-side="player"][data-zone-type="monster"].has-real-hologram-model')""")
        facts = snapshot(page)
        assert facts['counts']['scenes'] == facts['counts']['canvases'] == facts['counts']['css3d'] == 1, facts
        assert page.evaluate("""() => {
          const canvas=document.querySelector('.real-duel-scene-3d-canvas');
          window.__auditFirstSceneCanvas ??= canvas;
          return canvas===window.__auditFirstSceneCanvas;
        }"""), 'View changes replaced the existing scene canvas'
        assert facts['scene']['webglAvailable'] == 'true' and facts['monster']['modelRendered'], facts
        if real_environment:
            assert facts['environment']['id'] == real_environment and facts['scene']['id'] == real_environment, facts
            assert f'/{expected_field["id"]}.jpg' in facts['environment']['backdrop'], facts
    report['stages'].append({'stage': stage, **facts, 'concealment': helper.verify_concealment(page)})
    return facts


def settle_mausoleum(page, report):
    for _ in range(100):
        if page.locator(MONSTER).count():
            helper.dismiss_optional_decisions(page)
            return
        modal = page.locator('#decision-modal')
        if not modal.is_visible():
            page.wait_for_timeout(100)
            continue
        title = page.locator('#decision-modal-title').inner_text()
        options = page.locator('#decision-options button').filter(visible=True)
        labels = options.all_inner_texts()
        report['mausoleumDecisions'].append({'title': title, 'choices': labels})
        cards = page.locator('#decision-options .decision-card-option').filter(has_text=re.compile('Blue-Eyes|Yeux Bleus', re.I))
        confirm = page.locator('#decision-options > button.btn-magenta')
        if confirm.is_visible() and confirm.is_enabled():
            confirm.click()
        elif cards.count():
            cards.first.click()
        else:
            desired = options.filter(has_text=re.compile(r'^(OUI|YES|INVOQUER|ATTAQUE)|ATK|2000', re.I))
            cancel = page.locator('#btn-decision-cancel')
            if desired.count():
                desired.first.click()
            elif cancel.is_visible() and cancel.is_enabled():
                cancel.click()
            else:
                assert options.count(), f'No legal decision: {title}'
                options.first.click()
        page.wait_for_timeout(100)
    raise AssertionError('Mausoleum summon did not finish through legal controls')


def verify(page, base_url, output, report, draft):
    errors, native_failures = [], []
    report.update(pageErrors=errors, nativeRequestFailures=native_failures, stages=[], mausoleumDecisions=[])
    page.on('pageerror', lambda error: errors.append(str(error)[:500]))
    page.on('requestfailed', lambda request: native_failures.append(urlsplit(request.url).path) if '/native/' in request.url else None)
    page.add_init_script(helper.RNG_FIXTURE)
    page.add_init_script(f"localStorage.setItem('ygo_custom_deck', {json.dumps(json.dumps(draft))});")
    response = page.goto(base_url, wait_until='domcontentloaded')
    assert "'wasm-unsafe-eval'" in response.header_value('content-security-policy')
    assert page.evaluate('typeof window.__YGO_QA__') == 'undefined'
    page.locator('input[name="game-mode"][value="native"]').check()
    page.locator('[data-deck-id="custom"]').click()
    helper.wait_until(page, "() => document.querySelector('#builder-catalogue-status')?.textContent.includes('cartes avec règles natives')")
    assert page.locator('#deck-validity-badge').inner_text() == 'Deck valide'
    page.locator('#btn-start-duel').click()
    helper.wait_until(page, "() => !document.querySelector('#start-modal').checkVisibility() || [...document.querySelectorAll('#decision-options button')].some(button=>button.checkVisibility())")
    start = page.get_by_role('button', name='JE COMMENCE', exact=True)
    if start.is_visible():
        start.click()
    page.locator('#start-modal').wait_for(state='hidden')
    page.wait_for_selector('#player-hand .card-entity')
    helper.await_player_main(page)
    report['openingOwnHand'] = snapshot(page)['ownHand']
    for code in ['80921533', '89631139', '4064256']:
        assert page.locator(f'#player-hand .card-entity[data-id="{code}"]').count(), f'Missing fixture card {code}: {report["openingOwnHand"]}'
    cycle(page, 'compact')
    helper.place_hand_card(page, '80921533', 'field', True)
    helper.await_player_main(page)
    helper.wait_until(page, "() => document.querySelector('#btn-native-actions').checkVisibility() && !document.querySelector('#btn-native-actions').disabled")
    page.locator(FIELD).click()
    page.locator('#decision-modal').wait_for(state='visible')
    assert page.locator('#decision-modal-title').inner_text() == 'EFFETS ET INVOCATIONS'
    page.locator('#decision-options .decision-choice-list button').first.click()
    settle_mausoleum(page, report)
    helper.await_player_main(page)
    helper.wait_until(page, "() => Number(document.querySelector('#player-lp').textContent)===6000")
    state = snapshot(page)
    hand, field = state['ownHand'], state['ownField']
    report['monsterRuntimeUid'] = state['monster']['uid']
    assert field == {'id': '80921533', 'faceDown': False}, state
    width = report['width']
    for view in ['compact', 'arena', 'real']:
        cycle(page, view)
        assert_public_state(page, report, f'mausoleum-{view}', hand, field,
                            'temple-sanctuary')
        page.screenshot(path=str(output / f'native-mausoleum-{view}-{width}.png'), animations='disabled')
    # Replacing the resolved field with a face-down card removes its environment.
    # Its public Set state must not activate Zombie World's source scenery.
    cycle(page, 'compact')
    helper.place_hand_card(page, '4064256', 'field', False)
    helper.await_player_main(page)
    set_state = snapshot(page)
    hand, field = set_state['ownHand'], set_state['ownField']
    assert field == {'id': '4064256', 'faceDown': True}, set_state
    cycle(page, 'real')
    facts = assert_public_state(page, report, 'zombie-world-set-real', hand, field)
    assert facts['environment']['id'] not in ['graveyard', 'temple-sanctuary'], facts
    report['setFieldDoesNotActivateScenery'] = True
    page.screenshot(path=str(output / f'native-zombie-world-set-real-{width}.png'), animations='disabled')
    # Use the Set card's real view control, then the offered activation button.
    page.locator(FIELD).click()
    page.locator('#decision-modal').wait_for(state='visible')
    assert page.get_by_role('button', name='ACTIVER FACE RECTO', exact=True).is_enabled()
    page.get_by_role('button', name='ACTIVER FACE RECTO', exact=True).click()
    helper.wait_until(page, "() => document.querySelector('#decision-modal').checkVisibility() && document.querySelectorAll('#decision-options button').length > 0")
    pending = snapshot(page)
    assert pending['ownField'] == {'id': '4064256', 'faceDown': False}, pending
    assert pending['environment']['id'] == facts['environment']['id'], pending
    assert pending['environment']['backdrop'] == facts['environment']['backdrop'], pending
    assert_public_state(page, report, 'zombie-world-activation-pending-real', hand,
                        {'id': '4064256', 'faceDown': False}, allow_decision=True)
    report['pendingActivationDoesNotActivateScenery'] = True
    page.screenshot(path=str(output / f'native-zombie-world-pending-real-{width}.png'), animations='disabled')
    helper.dismiss_optional_decisions(page)
    helper.await_player_main(page)
    helper.wait_until(page, """() => !document.querySelector('.card-zone[data-side="player"][data-zone-type="field"] .card-inner.face-down')""")
    field = {'id': '4064256', 'faceDown': False}
    for view in ['compact', 'arena', 'real', 'compact', 'arena', 'real']:
        cycle(page, view)
        assert_public_state(page, report, f'zombie-world-{view}-{len(report["stages"])}', hand, field,
                            'graveyard')
        page.screenshot(path=str(output / f'native-zombie-world-{view}-{width}.png'), animations='disabled')
    report['realViewSetActivationThroughControls'] = True
    report['sameCanvasAcrossViewCycles'] = True
    report['cspViolations'] = page.evaluate('window.__auditCspViolations || []')
    assert not errors and not native_failures and not report['cspViolations'], report
    report['ok'] = True


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--base-url')
    parser.add_argument('--dist', type=Path, default=ROOT / 'dist')
    parser.add_argument('--output', type=Path, default=ROOT / 'docs/audits/artifacts/native-duel-views-2026-10-07')
    parser.add_argument('--chromium', default='/usr/bin/chromium')
    parser.add_argument('--desktop-only', action='store_true')
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    headers = helper.production_headers()
    server = None
    if not args.base_url:
        assert (args.dist / 'index.html').is_file(), 'Build the production bundle first'
        helper.AuditServer.headers_to_add = headers
        server = ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(helper.AuditServer, directory=str(args.dist)))
        threading.Thread(target=server.serve_forever, daemon=True).start()
        args.base_url = f'http://127.0.0.1:{server.server_port}'
    report = {'ok': False, 'target': 'compiled production bundle', 'productionCsp': headers['Content-Security-Policy'],
              'method': 'actual controls and public DOM only; isolated legal custom deck and seeded RNG',
              'memoryScope': 'DOM renderer counts and approximate JS heap; GPU allocation not measured', 'viewports': []}
    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(executable_path=args.chromium, headless=True,
                args=['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
            req = browser.new_context()
            report['testedWasmSha256'] = hashlib.sha256(req.request.get(args.base_url + '/native/ocgcore.sync.wasm').body()).hexdigest()
            report['testedIndexSha256'] = hashlib.sha256(req.request.get(args.base_url).body()).hexdigest()
            req.close()
            for width, height in ([(1280, 900)] if args.desktop_only else [(1280, 900), (390, 844)]):
                context = browser.new_context(viewport={'width': width, 'height': height}, reduced_motion='reduce')
                page = context.new_page()
                page.set_default_timeout(30000)
                viewport_report = {'width': width, 'height': height, 'ok': False}
                report['viewports'].append(viewport_report)
                try:
                    verify(page, args.base_url, args.output, viewport_report, fixture())
                except Exception:
                    viewport_report['failurePublicState'] = snapshot(page)
                    viewport_report['failureVisibleDecision'] = page.locator('#decision-modal').inner_text() if page.locator('#decision-modal').is_visible() else None
                    page.screenshot(path=str(args.output / f'native-views-failure-{width}.png'), animations='disabled')
                    raise
                finally:
                    context.close()
            browser.close()
        report['ok'] = True
    except Exception as error:
        report['failure'] = {'type': type(error).__name__, 'message': str(error)[:1500]}
        raise
    finally:
        (args.output / 'report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
        if server:
            server.shutdown()
    print(json.dumps({'ok': report['ok'], 'testedWasmSha256': report['testedWasmSha256'],
                      'viewports': [{'width': view['width'], 'stages': len(view['stages'])} for view in report['viewports']]}))


if __name__ == '__main__':
    main()
