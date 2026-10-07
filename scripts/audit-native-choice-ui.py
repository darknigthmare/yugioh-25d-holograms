#!/usr/bin/env python3
"""Verify searchable declarations and exact weighted costs through real controls.

The production bundle receives a legal local Deck of 40 cards and an isolated
crypto stream. Every duel action and response is a visible click; no engine hook,
custom Lua, debug API, post-start card injection or opponent identity read occurs.
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

def module(name, filename):
    spec = importlib.util.spec_from_file_location(name, ROOT / 'scripts' / filename)
    loaded = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(loaded)
    return loaded

ui = module('native_ui_audit', 'audit-native-duel-ui.py')
controls = module('native_pendulum_controls', 'audit-native-pendulum-ui.py')
OPENING = ['43711255', '50357013', '70781052', '97590747', '89631139']

def fixture():
    draft, _ = ui.custom_deck_fixture()
    for index, code in zip([11, 14, 18, 4, 25], OPENING):
        draft['main'][index] = code
    assert len(draft['main']) == 40 and max(Counter(draft['main']).values()) <= 3
    return draft

def pending(page, title):
    ui.wait_until(page, "title => document.querySelector('#decision-modal').checkVisibility() && document.querySelector('#decision-modal-title').textContent===title", title)

def run_view(page, url, view, out):
    draft = fixture()
    errors, failed = [], []
    page.on('pageerror', lambda error: errors.append(str(error)[:600]))
    page.on('requestfailed', lambda request: failed.append(urlsplit(request.url).path) if '/native/' in request.url else None)
    page.add_init_script(ui.RNG_FIXTURE)
    page.add_init_script(f"localStorage.setItem('ygo_custom_deck',{json.dumps(json.dumps(draft))});")
    page.goto(url, wait_until='domcontentloaded')
    assert page.evaluate('typeof window.__YGO_QA__') == 'undefined'
    page.locator('input[name="game-mode"][value="native"]').check()
    page.locator('[data-deck-id="custom"]').click()
    ui.wait_until(page, '() => !document.querySelector("#btn-start-duel").disabled', timeout=60)
    page.locator('#btn-start-duel').click()
    pending(page, 'CHOIX DU PREMIER JOUEUR')
    page.get_by_role('button', name='JE COMMENCE', exact=True).click()
    page.locator('#start-modal').wait_for(state='hidden')
    page.wait_for_selector('#player-hand .card-entity')
    controls.settle(page)
    opening = page.locator('#player-hand .card-entity').evaluate_all('(cards) => cards.map(card => card.dataset.id)')
    assert Counter(opening) == Counter(OPENING), opening
    view['checks']['exactFortyCardFixtureAndRealShuffledOpening'] = True

    controls.activate(page, '43711255', 0)
    pending(page, 'ANNONCER UNE CARTE')
    search = page.locator('#decision-options input[type="search"]')
    ui.wait_until(page, "() => document.activeElement===document.querySelector('#decision-options input[type=\"search\"]')")
    assert search.evaluate('(element) => document.activeElement===element'), 'Declaration search must receive keyboard focus'
    status = page.locator('.decision-search-status')
    initial_status = status.inner_text()
    assert re.search(r'100 sur \d+ cartes', initial_status), initial_status
    assert page.locator('#decision-options .decision-choice-list button').count() == 100
    view['checks']['largeNativeCatalogueHasExplicitResultCountAndSearchFocus'] = True
    search.fill('no-such-native-card-xyz')
    assert page.locator('#decision-options .decision-choice-list button').count() == 0
    assert 'Aucune carte autorisée' in status.inner_text()
    search.fill('46986414')
    options = page.locator('#decision-options .decision-choice-list button')
    assert options.count() == 1 and 'Dark Magician' in options.inner_text()
    assert status.inner_text() == '1 carte autorisée.'
    assert not page.locator('#btn-decision-cancel').is_visible()
    page.screenshot(path=str(out / f'native-choice-declaration-{view["width"]}.png'), animations='disabled')
    options.click()
    controls.settle(page)
    assert page.locator('.player-s-zone[data-index="0"] .card-entity[data-id="43711255"]').count() == 1
    view['checks']['emptySearchAndNumericIdentitySearchChooseActualAnnouncement'] = True
    view['announcement'] = {'initialResults': initial_status, 'chosen': '46986414'}

    controls.activate(page, '50357013', 1)
    pending(page, 'CHOISIR LES MATÉRIELS')
    cards = page.locator('#decision-options .decision-card-option')
    labels = cards.all_inner_texts()
    assert len(labels) == 3, labels
    skull_name = re.compile(r'Summoned Skull|Crâne Invoqué', re.I)
    assert any(skull_name.search(label) and 'Valeur : 6' in label for label in labels), labels
    assert any('La Jinn' in label and 'Valeur : 4' in label for label in labels), labels
    summary = page.locator('.decision-selection-summary')
    confirm = page.locator('#decision-options > button.btn-magenta')
    assert 'Valeur totale : 0' in summary.inner_text() and 'exactement 10' in summary.inner_text()
    assert confirm.is_disabled()
    skull = cards.filter(has_text=skull_name)
    skull.click()
    assert skull.get_attribute('aria-pressed') == 'true'
    assert 'Valeur totale : 6' in summary.inner_text() and confirm.is_disabled()
    # Selection feedback is reversible; an invalid intermediate choice has no
    # response, no paid cost and no native Graveyard move.
    assert page.locator('#player-gy-count').inner_text() == '0'
    skull.click()
    assert 'Valeur totale : 0' in summary.inner_text() and confirm.is_disabled()
    skull.click()
    cards.filter(has_text='La Jinn').click()
    assert 'Valeur totale : 10' in summary.inner_text() and confirm.is_enabled()
    page.screenshot(path=str(out / f'native-choice-sum-{view["width"]}.png'), animations='disabled')
    view['weightedCost'] = {'offered': labels, 'selectedSummary': summary.inner_text()}
    confirm.click()
    controls.settle(page)
    assert page.locator('#player-hand .card-entity[data-id="70781052"]').count() == 0
    assert page.locator('#player-hand .card-entity[data-id="97590747"]').count() == 0
    assert page.locator('#player-hand .card-entity[data-id="89631139"]').count() >= 1
    assert page.locator('#player-hand .card-entity').count() == 3, 'Blue-Eyes stays and the official effect draws two cards'
    assert page.locator('#player-gy-count').inner_text() == '3', 'Two actual costs and the resolved Spell reach the Graveyard'
    view['checks']['nativeWeightsSummaryRejectsPartialAndAllowsExactTen'] = True
    view['checks']['nativeCostAndTwoDrawResolutionPreserveUnselectedCard'] = True
    view['checks']['opponentConcealment'] = ui.verify_concealment(page)
    assert page.evaluate('document.body.scrollWidth <= innerWidth')
    assert page.evaluate('JSON.parse(localStorage.getItem("ygo_custom_deck"))') == draft
    page.screenshot(path=str(out / f'native-choice-board-{view["width"]}.png'), animations='disabled')
    csp = page.evaluate('window.__auditCspViolations || []')
    assert not errors and not failed and not csp, {'errors': errors, 'failed': failed, 'csp': csp}
    view.update(pageErrors=errors, nativeRequestFailures=failed, cspViolations=csp)

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--dist', type=Path, default=ROOT / 'dist')
    parser.add_argument('--output', type=Path, default=ROOT / 'docs/audits/artifacts/native-choice-ui-2026-10-07')
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    headers = ui.production_headers()
    ui.AuditServer.headers_to_add = headers
    server = ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(ui.AuditServer, directory=str(args.dist)))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    url = f'http://127.0.0.1:{server.server_port}'
    asset = re.search(r'src="([^\"]+/index-[^\"]+\.js)"', (args.dist / 'index.html').read_text()).group(1)
    report = {'ok': False, 'target': 'compiled production bundle', 'productionCsp': headers['Content-Security-Policy'],
        'testedIndexAsset': asset, 'testedIndexSha256': hashlib.sha256((args.dist / asset.lstrip('/')).read_bytes()).hexdigest(),
        'testedWasmSha256': hashlib.sha256((args.dist / 'native/ocgcore.sync.wasm').read_bytes()).hexdigest(), 'viewports': []}
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True,
                args=['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
            for width, height in [(1280, 900), (390, 844)]:
                context = browser.new_context(viewport={'width': width, 'height': height}, reduced_motion='reduce')
                page = context.new_page()
                page.set_default_timeout(30000)
                view = {'width': width, 'height': height, 'checks': {}}
                report['viewports'].append(view)
                try:
                    run_view(page, url, view, args.output)
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
        (args.output / 'report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
        server.shutdown()
        server.server_close()
    print(json.dumps(report, ensure_ascii=False))

if __name__ == '__main__':
    main()
