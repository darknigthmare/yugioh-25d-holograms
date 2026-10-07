#!/usr/bin/env python3
"""Play official Trap Monsters through public production controls on desktop/mobile.

This audit serves an already-built immutable dist with production CSP. A saved
40-card custom registration and deterministic crypto stream affect only each
isolated browser context. Set, activation, zone/position choices, later position
changes and view switches use rendered controls. No game object, QA hook,
engine response injection, opponent private state or post-start fixture is used.
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
spec = importlib.util.spec_from_file_location('native_ui_audit', ROOT / 'scripts/audit-native-duel-ui.py')
ui = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ui)
OPENING = ['26905245', '28649820', '97590747', '12607053', '14315573']
NAMES = {'26905245': 'Metal Reflect Slime', '28649820': 'Embodiment of Apophis'}


def fixture():
    normals = ['89631139', '46986414', '97590747', '15025844', '70781052',
               '5053103', '76812113', '91152256', '32452818', '91939608']
    main = [code for code in normals for _ in range(3)]
    main += ['26905245'] * 2 + ['28649820'] * 2 + ['12607053'] * 3 + ['14315573'] * 3
    # These registered positions become the real opening five under the shared
    # varied crypto stream. Swap registration positions, preserving copy limits.
    locked = set()
    for position, code in zip([11, 14, 18, 4, 25], OPENING):
        source = next(index for index, value in enumerate(main) if value == code and index not in locked)
        main[position], main[source] = main[source], main[position]
        locked.add(position)
    assert len(main) == 40 and max(Counter(main).values()) <= 3
    rows = {str(row[0]): row for row in json.loads((ROOT / 'public/native/card-data.json').read_text())['rows']}
    assert all(code in rows for code in main)
    assert all(rows[code][4] & 1 for code in normals)
    return {'main': main, 'extra': [], 'side': []}


def fingerprints(dist):
    html = (dist / 'index.html').read_text()
    index = re.search(r'src="([^"]+/index-[^"]+\.js)"', html).group(1).lstrip('/')
    css = re.search(r'href="([^"]+/index-[^"]+\.css)"', html).group(1).lstrip('/')
    paths = ['index.html', index, css, 'native/ocgcore.sync.wasm', 'native/card-data.json', 'native/scripts.json']
    paths += [str(next((dist / 'assets').glob('NativeDuelGame-*.js')).relative_to(dist))]
    paths += [str(next((dist / 'assets').glob('ocgcore-*.js')).relative_to(dist))]
    return {path: {'bytes': (dist / path).stat().st_size,
                   'sha256': hashlib.sha256((dist / path).read_bytes()).hexdigest()} for path in paths}


def settle(page, trace, timeout=40, allow_placement=False):
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        if page.locator('#decision-modal').is_visible():
            title = page.locator('#decision-modal-title').inner_text()
            choices = page.locator('#decision-options .decision-choice-list button')
            passing = choices.filter(has_text=re.compile('PASSER LA PRIORITÉ'))
            if passing.count():
                trace.append({'kind': 'chain', 'choice': 'PASSER LA PRIORITÉ'})
                passing.click()
            elif title == 'ACTIVER UN EFFET ?' and page.get_by_role('button', name='NON', exact=True).is_visible():
                page.get_by_role('button', name='NON', exact=True).click()
            elif allow_placement and title == 'CHOISIR LA ZONE':
                options = page.locator('#decision-options .decision-card-option')
                mains = options.filter(has_text=re.compile(r'^Votre Zone Monstre [1-5]$'))
                assert mains.count(), 'No legal own Main Monster Zone offered'
                trace.append({'kind': 'place', 'offered': options.all_inner_texts(), 'choice': mains.first.inner_text()})
                mains.first.click()
                page.locator('#decision-options > button.btn-magenta').click()
            elif allow_placement and title == 'CHOISIR LA POSITION':
                defense = page.get_by_role('button', name='DÉFENSE FACE RECTO', exact=True)
                attack = page.get_by_role('button', name='ATTAQUE FACE RECTO', exact=True)
                choice = defense if defense.is_visible() else attack
                assert choice.is_visible() and choice.is_enabled()
                trace.append({'kind': 'position', 'choice': choice.inner_text()})
                choice.click()
            else:
                raise AssertionError(f'Unexpected required public decision: {title}')
        elif page.locator('#btn-end-turn').is_enabled() and page.locator('#phase-main1').evaluate("e => e.classList.contains('active')"):
            return
        page.wait_for_timeout(100)
    raise AssertionError('Native duel did not return to actionable player Main Phase')


def public_monsters(page):
    # Read only revealed own monsters. Deliberately omit duel UIDs and all hands.
    return page.locator('.player-m-zone').evaluate_all("""zones => zones.flatMap(zone => {
      const card=zone.querySelector('.card-entity[data-card-visible="true"]');
      if (!card || card.querySelector('.face-down')) return [];
      const holo=zone.querySelector('.monster-hologram-entity:not(.face-down)');
      return [{publicCode:card.dataset.id,category:card.dataset.cardType,zone:Number(zone.dataset.index),
        position:zone.classList.contains('defense-position')?'defense':'attack',
        hologram:Boolean(holo),hologramAttribute:holo?.className.match(/attr-([a-z-]+)/)?.[1]||null,
        attack:holo?.querySelector('.stat-badge.atk')?.textContent||null,
        defense:holo?.querySelector('.stat-badge.def')?.textContent||null,
        label:holo?.getAttribute('aria-label')||null}];
    })""")


def check_monster(page, code, type_label, attribute, attack, defense, require_stat_bounds=False):
    zone = page.locator('.player-m-zone').filter(has=page.locator(f'.card-entity[data-id="{code}"]'))
    assert zone.count() == 1, f'Missing transformed public monster {code}'
    # Focus is the accessible public inspector path, including touch layouts.
    zone.focus()
    card = zone.locator('.card-entity')
    card.focus()
    ui.wait_until(page, "name => document.querySelector('#inspector-display .inspector-title')?.textContent===name", NAMES[code])
    title = page.locator('#inspector-display .inspector-title').inner_text()
    projected_type = page.locator('#inspector-display .inspector-type').text_content().strip()
    stats = re.sub(r'\s+', ' ', page.locator('#inspector-display .inspector-stats').text_content()).strip()
    facts = next(card for card in public_monsters(page) if card['publicCode'] == code)
    assert facts['category'] == 'monster' and facts['hologram']
    assert facts['hologramAttribute'] == attribute.lower()
    assert facts['attack'] == f'ATK {attack}' and facts['defense'] == f'DEF {defense}'
    assert projected_type == type_label and f'ATK {attack}' in stats and f'DEF {defense}' in stats
    bounds = page.locator('#inspector-display').evaluate("""display => {
      const parent=display.getBoundingClientRect();
      const stats=[...display.querySelectorAll('.inspector-stat-atk,.inspector-stat-def')].map(span=>{
        const box=span.getBoundingClientRect();
        const text=document.createRange();text.selectNodeContents(span);
        const glyph=text.getBoundingClientRect();
        return {text:span.textContent.trim(),withinInspector:box.left>=parent.left-1&&box.right<=parent.right+1&&box.top>=parent.top-1&&box.bottom<=parent.bottom+1,
          textFitsSpan:glyph.left>=box.left-1&&glyph.right<=box.right+1&&glyph.top>=box.top-1&&glyph.bottom<=box.bottom+1,
          width:Math.round(box.width),textWidth:Math.round(glyph.width)};
      });
      return {checked:stats.length===2,spans:stats,allFit:stats.length===2&&stats.every(s=>s.withinInspector&&s.textFitsSpan)};
    }""")
    if require_stat_bounds:
        assert bounds['allFit'], f'Public ATK/DEF text exceeds the inspector: {bounds}'
    return {**facts, 'inspector': {'title': title, 'type': projected_type, 'stats': stats, 'statBounds': bounds}}


def activate_set(page, zone_index, code, trace):
    zone = page.locator(f'.player-s-zone[data-index="{zone_index}"]')
    assert zone.locator('.card-inner.face-down').count() == 1
    zone.click()
    page.locator('#decision-modal').wait_for(state='visible')
    assert page.locator('#decision-modal-title').inner_text() == NAMES[code]
    action = page.get_by_role('button', name='ACTIVER FACE RECTO', exact=True)
    assert action.is_enabled()
    action.click()
    settle(page, trace, allow_placement=True)
    assert zone.locator('.card-entity').count() == 0, 'Summoned Trap still occupies a Spell/Trap Zone'


def capture_details(page, destination, width):
    if width < 600:
        page.locator('#inspector-display').scroll_into_view_if_needed()
    page.screenshot(path=str(destination), animations='disabled', timeout=60000)
    page.locator('#btn-end-turn').scroll_into_view_if_needed()


def run_view(page, url, view, output, draft):
    errors, failed, csp, trace, loaded = [], [], [], [], set()
    page.on('pageerror', lambda error: errors.append(str(error)[:600]))
    page.on('requestfailed', lambda request: failed.append(urlsplit(request.url).path) if '/native/' in request.url else None)
    page.on('response', lambda response: loaded.add(urlsplit(response.url).path) if '/native/' in response.url and response.status == 200 else None)
    page.add_init_script(ui.RNG_FIXTURE)
    page.add_init_script(f"localStorage.setItem('ygo_custom_deck',{json.dumps(json.dumps(draft))});")
    response = page.goto(url, wait_until='domcontentloaded')
    policy = response.header_value('content-security-policy') or ''
    assert "'wasm-unsafe-eval'" in policy and "'unsafe-eval'" not in policy
    assert page.evaluate('typeof window.__YGO_QA__') == 'undefined'
    page.locator('input[name="game-mode"][value="native"]').check()
    page.locator('input[name="ai-difficulty"][value="easy"]').check()
    page.locator('[data-deck-id="custom"]').click()
    ui.wait_until(page, "() => document.querySelector('#builder-catalogue-status')?.textContent.includes('cartes avec règles natives')")
    assert page.locator('#deck-validity-badge').inner_text() == 'Deck valide'
    assert page.locator('#deck-size-val').inner_text() == 'Main: 40 / Extra: 0 / Side: 0'
    page.screenshot(path=str(output / f'chain-registration-{view["width"]}.png'), animations='disabled', timeout=60000)
    page.locator('#btn-start-duel').click()
    ui.wait_until(page, "() => !document.querySelector('#start-modal').checkVisibility() || [...document.querySelectorAll('#decision-options button')].some(button=>button.checkVisibility())")
    page.get_by_role('button', name='JE COMMENCE', exact=True).click()
    page.locator('#start-modal').wait_for(state='hidden')
    page.wait_for_selector('#player-hand .card-entity')
    settle(page, trace)
    own_opening = page.locator('#player-hand .card-entity').evaluate_all('cards => cards.map(card=>card.dataset.id)')
    assert Counter(own_opening) == Counter(OPENING), f'Unexpected own fixed shuffled opening {own_opening}'
    assert page.evaluate('JSON.parse(localStorage.getItem("ygo_custom_deck"))') == draft
    view['checks']['validFortyCardRegistrationAndRealShuffle'] = True
    slime_zone = ui.place_hand_card(page, '26905245', 'spell', False)
    apophis_zone = ui.place_hand_card(page, '28649820', 'spell', False)
    assert slime_zone != apophis_zone
    view['checks']['bothTrapsSetThroughControls'] = True
    page.screenshot(path=str(output / f'chain-set-{view["width"]}.png'), animations='disabled', timeout=60000)
    page.locator('#btn-end-turn').click()
    settle(page, trace)
    activate_set(page, slime_zone, '26905245', trace)
    slime = check_monster(page, '26905245', 'Trap Effect Monster', 'WATER', 0, 3000, view['requireStatBounds'])
    assert slime['position'] == 'defense'
    view['checks']['slimePublicNativeMonster'] = slime
    capture_details(page, output / f'chain-slime-details-{view["width"]}.png', view['width'])
    # Advance normally once more: a freshly summoned monster cannot change its
    # position this turn. On the next own Main Phase the core offers it legally.
    page.locator('#btn-end-turn').click()
    settle(page, trace)
    slime_cell = page.locator('.player-m-zone').filter(has=page.locator('.card-entity[data-id="26905245"]'))
    slime_cell.click()
    page.locator('#decision-modal').wait_for(state='visible')
    change = page.get_by_role('button', name='CHANGER LA POSITION DE COMBAT', exact=True)
    assert change.is_enabled()
    change.click()
    settle(page, trace)
    assert next(card for card in public_monsters(page) if card['publicCode'] == '26905245')['position'] == 'attack'
    view['checks']['nextTurnNativePositionChangeThroughMenu'] = True
    activate_set(page, apophis_zone, '28649820', trace)
    apophis = check_monster(page, '28649820', 'Trap Normal Monster', 'EARTH', 1600, 1800, view['requireStatBounds'])
    view['checks']['apophisPublicNativeMonster'] = apophis
    capture_details(page, output / f'chain-apophis-details-{view["width"]}.png', view['width'])
    initial = public_monsters(page)
    view['presentations'] = []
    for mode in ['compact', 'arena', 'real', 'compact']:
        if page.locator('#btn-toggle-view').get_attribute('data-view-mode') != mode:
            page.locator('#btn-toggle-view').click()
        ui.wait_until(page, 'mode => document.querySelector("#btn-toggle-view").dataset.viewMode===mode', mode)
        if mode == 'real':
            page.locator('.real-duel-scene-3d-canvas').wait_for(state='visible')
            page.wait_for_timeout(700)
        assert public_monsters(page) == initial, 'View switch changed the public duel projection'
        assert not page.locator('#decision-modal').is_visible()
        assert page.locator('#btn-end-turn').is_enabled()
        view['presentations'].append({'mode': mode, 'samePublicState': True,
            'webglCanvasVisible': mode == 'real' and page.locator('.real-duel-scene-3d-canvas').is_visible()})
        if len(view['presentations']) <= 3:
            page.screenshot(path=str(output / f'chain-{mode}-{view["width"]}.png'), animations='disabled', timeout=60000)
    view['checks']['threeViewsAndReturnSharePublicState'] = True
    view['checks']['opponentConcealment'] = ui.verify_concealment(page)
    assert page.evaluate('document.body.scrollWidth<=innerWidth')
    assert page.evaluate('JSON.parse(localStorage.getItem("ygo_custom_deck"))') == draft
    assert {'/native/ocgcore.sync.wasm', '/native/scripts.json', '/native/card-data.json'} <= loaded
    csp.extend(page.evaluate('window.__auditCspViolations || []'))
    assert not errors and not failed and not csp, {'errors': errors, 'failed': failed, 'csp': csp}
    view.update(decisionTrace=trace, pageErrors=errors, nativeRequestFailures=failed,
                cspViolations=csp, nativeAssets=sorted(loaded), publicFinal=initial)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--dist', type=Path, default=ROOT / 'dist')
    parser.add_argument('--output', type=Path, default=ROOT / 'docs/audits/artifacts/native-chain-ui-2026-10-07')
    parser.add_argument('--viewport', choices=['both', 'desktop', 'mobile'], default='both')
    parser.add_argument('--final', action='store_true', help='Gate final publication on readable ATK/DEF bounds as well as native controls')
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    before = fingerprints(args.dist)
    headers = ui.production_headers()
    ui.AuditServer.headers_to_add = headers
    server = ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(ui.AuditServer, directory=str(args.dist)))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    url = f'http://127.0.0.1:{server.server_port}'
    index = next(path for path in before if re.match(r'assets/index-.+\.js$', path))
    report = {'ok': False, 'target': 'immutable final compiled production bundle' if args.final else 'immutable intermediate compiled production bundle',
        'requireStatBounds': args.final,
        'testedIndexAsset': '/' + index, 'testedIndexSha256': before[index]['sha256'],
        'testedWasmSha256': before['native/ocgcore.sync.wasm']['sha256'],
        'productionCsp': headers['Content-Security-Policy'], 'compiledSnapshotBefore': before,
        'sourceFacadeSha256': hashlib.sha256((ROOT / 'src/core/native/NativeDuelGame.js').read_bytes()).hexdigest(),
        'registeredFixture': fixture(), 'qaHook': False, 'postStartInjection': False, 'viewports': []}
    page = None
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
                view = {'width': width, 'height': height, 'requireStatBounds': args.final, 'checks': {}}
                report['viewports'].append(view)
                try:
                    run_view(page, url, view, args.output, report['registeredFixture'])
                except Exception:
                    page.screenshot(path=str(args.output / f'failure-{width}.png'), animations='disabled', timeout=60000)
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
        after = fingerprints(args.dist)
        report['compiledSnapshotAfter'] = after
        report['immutableCompiledSnapshot'] = before == after
        if before != after:
            report['ok'] = False
        (args.output / 'report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
        server.shutdown()
        server.server_close()
    assert before == after, 'Compiled snapshot changed during audit'
    print(json.dumps(report, ensure_ascii=False))


if __name__ == '__main__':
    main()
