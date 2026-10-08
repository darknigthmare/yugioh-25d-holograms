#!/usr/bin/env python3
"""Verify a Field Type announcement, public reveal and card-kind declaration.

The production bundle receives a legal local Deck of 40 cards and an isolated
crypto stream. Every duel action and response is a visible click; no engine hook,
custom Lua, debug API, post-start card injection or opponent identity read occurs.
Array of Revealing Light, The Hidden City, Double Summon and Hazy Flame Sphynx
resolve through the shipped official core and visible desktop/mobile controls.
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
OPENING = ['69296555', '5697558', '39581190', '1409474', '43422537']

def fixture():
    draft, _ = ui.custom_deck_fixture()
    for index, code in zip([11, 14, 18, 4, 25], OPENING):
        draft['main'][index] = code
    assert len(draft['main']) == 40 and max(Counter(draft['main']).values()) <= 3
    return draft

def pending(page, title):
    ui.wait_until(page, "title => document.querySelector('#decision-modal').checkVisibility() && document.querySelector('#decision-modal-title').textContent===title", title)

def place(page, code, selector, face_up=True):
    page.locator(f'#player-hand .card-entity[data-id="{code}"]').click()
    zone = page.locator(selector)
    assert 'active-zone' in (zone.get_attribute('class') or ''), f'Destination is not offered for {code}'
    zone.click()
    page.locator('#action-modal').wait_for(state='visible')
    action = page.locator('#btn-action-faceup' if face_up else '#btn-action-facedown')
    assert action.is_enabled()
    action.click()
    page.locator('#action-modal').wait_for(state='hidden')

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

    place(page, '69296555', '#player-field-zone')
    pending(page, 'ANNONCER UN TYPE')
    candidates = page.locator('#decision-options .decision-card-option')
    labels = candidates.all_inner_texts()
    assert all('Niv.' not in label and '— Main' not in label for label in labels), labels
    dragon = candidates.filter(has_text=re.compile(r'^Dragon(?:$| —)'))
    assert dragon.count() == 1
    confirm = page.locator('#decision-options > button.btn-magenta')
    assert confirm.is_disabled()
    dragon.click()
    assert dragon.get_attribute('aria-pressed') == 'true' and confirm.is_enabled()
    page.screenshot(path=str(out / f'field-choice-race-{view["width"]}.png'), animations='disabled')
    view['race'] = {'offered': labels, 'selected': dragon.inner_text()}
    confirm.click()
    controls.settle(page)
    assert page.locator('#player-field-zone .card-entity[data-id="69296555"]').count() == 1
    view['checks']['fieldRaceAnnouncementConfirmedThroughControls'] = True

    place(page, '39581190', '.player-m-zone[data-index="0"]', face_up=False)
    controls.settle(page)
    assert page.locator('.player-m-zone[data-index="0"] .card-entity[data-id="39581190"]').count() == 1
    place(page, '5697558', '#player-field-zone')
    controls.settle(page)
    assert page.locator('#player-field-zone .card-entity[data-id="5697558"]').count() == 1
    page.locator('#player-field-zone').click()
    pending(page, 'EFFETS ET INVOCATIONS')
    actions = page.locator('#decision-options .decision-choice-list button')
    assert actions.count() == 1, actions.all_inner_texts()
    actions.click()
    pending(page, 'CHOISIR LES CARTES')
    targets = page.locator('#decision-options .decision-card-option')
    assert targets.count() == 1
    view['positionTarget'] = targets.inner_text()
    targets.click()
    page.locator('#decision-options > button.btn-magenta').click()
    pending(page, 'CHOISIR LA POSITION')
    positions = page.locator('#decision-options .decision-choice-list button').all_inner_texts()
    assert positions == ['ATTAQUE FACE RECTO', 'DÉFENSE FACE RECTO'], positions
    page.screenshot(path=str(out / f'field-choice-position-{view["width"]}.png'), animations='disabled')
    page.get_by_role('button', name='DÉFENSE FACE RECTO', exact=True).click()
    controls.settle(page)
    revealed = page.locator('.player-m-zone[data-index="0"] .card-entity[data-id="39581190"]')
    assert revealed.get_attribute('data-card-visible') == 'true'
    assert 'defense-position' in page.locator('.player-m-zone[data-index="0"]').get_attribute('class')
    view['checks']['hiddenCityRevealsItsChosenSetMonsterInChosenDefense'] = True

    controls.activate(page, '43422537', 0)
    controls.settle(page)
    place(page, '1409474', '.player-m-zone[data-index="1"]')
    pending(page, 'CHOISIR LES SACRIFICES')
    tributes = page.locator('#decision-options .decision-card-option')
    assert tributes.count() == 1
    tributes.click()
    page.locator('#decision-options > button.btn-magenta').click()
    controls.settle(page)
    assert page.locator('.player-m-zone[data-index="1"] .card-entity[data-id="1409474"]').count() == 1
    assert page.locator('.player-m-zone[data-index="0"] .card-entity').count() == 0
    view['checks']['realDoubleSummonAllowsNativeTributeAfterSetAndReveal'] = True
    page.locator('.player-m-zone[data-index="1"]').click()
    ui.wait_until(page, "() => document.querySelector('#decision-modal').checkVisibility()")
    page.locator('#decision-options .decision-choice-list button').filter(has_text=re.compile('^ACTIVER')).click()
    pending(page, 'CHOISIR UN EFFET')
    kinds = page.locator('#decision-options .decision-choice-list button').all_inner_texts()
    view['cardKinds'] = kinds
    page.screenshot(path=str(out / f'field-choice-kind-{view["width"]}.png'), animations='disabled')
    assert kinds == ['MONSTRE', 'MAGIE', 'PIÈGE'], kinds
    page.get_by_role('button', name='MONSTRE', exact=True).click()
    controls.settle(page)
    assert page.locator('#player-gy-count').inner_text() == '4'
    assert page.locator('#player-hand .card-entity').count() == 0
    assert page.locator('#player-field-zone .card-entity[data-id="5697558"]').count() == 1
    view['checks']['distinctOfficialCardKindOptionsResolveThroughControls'] = True
    assert page.evaluate('document.body.scrollWidth <= innerWidth')
    assert page.evaluate('JSON.parse(localStorage.getItem("ygo_custom_deck"))') == draft
    page.screenshot(path=str(out / f'field-choice-board-{view["width"]}.png'), animations='disabled')
    csp = page.evaluate('window.__auditCspViolations || []')
    assert not errors and not failed and not csp, {'errors': errors, 'failed': failed, 'csp': csp}
    view.update(pageErrors=errors, nativeRequestFailures=failed, cspViolations=csp)

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--dist', type=Path, default=ROOT / 'dist')
    parser.add_argument('--output', type=Path, default=ROOT / 'docs/audits/artifacts/native-field-choice-ui-2026-10-07')
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
