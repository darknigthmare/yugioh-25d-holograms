#!/usr/bin/env python3
"""Reproduce duplicate native targets by playing a registered Deck through UI.

Only local registration and a varied RNG stream are set before play. Graceful
Charity really draws/discards, then Monster Reborn really selects a duplicate
from the GY. No duel object, QA hook or post-start fixture is used.
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
spec = importlib.util.spec_from_file_location('choice_locations_ui', ROOT / 'scripts/audit-native-duel-ui.py')
ui = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ui)
BLUE_EYES = re.compile(r'Blue[- ]Eyes|Dragon Blanc|Yeux Bleus', re.I)
OPENING = ['79571449', '83764718', '89631139', '89631139', '89631139']


def fixture():
    normals = ['89631139', '46986414', '97590747', '15025844', '70781052',
               '5053103', '76812113', '91152256', '32452818', '91939608']
    main = [code for code in normals for _ in range(3)]
    main += ['79571449'] * 3 + ['83764718'] * 3 + ['5318639'] * 3 + ['44095762']
    locked = set()
    for position, code in zip([11, 14, 18, 4, 25], OPENING):
        source = next(index for index, value in enumerate(main) if value == code and index not in locked)
        main[position], main[source] = main[source], main[position]
        locked.add(position)
    rows = {str(row[0]): row for row in json.loads((ROOT / 'public/native/card-data.json').read_text())['rows']}
    assert len(main) == 40 and max(Counter(main).values()) <= 3
    assert all(code in rows for code in main)
    return {'main': main, 'extra': [], 'side': []}


def activate(page, code):
    page.locator(f'#player-hand .card-entity[data-id="{code}"]').first.click()
    page.locator('.card-zone[data-side="player"][data-zone-type="spell"].active-zone').first.click()
    page.locator('#action-modal').wait_for(state='visible')
    assert page.locator('#btn-action-faceup').is_enabled()
    page.locator('#btn-action-faceup').click()
    page.locator('#action-modal').wait_for(state='hidden')


def resolve(page, spell, view, output):
    selected = False
    deadline = time.monotonic() + 40
    while time.monotonic() < deadline:
        if page.locator('#decision-modal').is_visible():
            title = page.locator('#decision-modal-title').inner_text()
            options = page.locator('#decision-options .decision-card-option')
            passing = page.locator('#decision-options .decision-choice-list button').filter(has_text='PASSER LA PRIORITÉ')
            if passing.count():
                view['trace'].append({'title': title, 'choice': 'PASSER LA PRIORITÉ'})
                passing.click()
            elif title == 'CHOISIR LES CARTES':
                assert not selected
                labels = options.all_inner_texts()
                matching = [index for index, label in enumerate(labels) if BLUE_EYES.search(label)]
                required = 2 if spell == '79571449' else 1
                assert len(matching) == (3 if required == 2 else 2), labels
                assert all(('Votre main' if required == 2 else 'Votre Cimetière') in labels[index] for index in matching), labels
                assert len({labels[index] for index in matching}) == len(matching), labels
                confirm = page.locator('#decision-options > button.btn-magenta')
                assert confirm.is_disabled()
                indices = [matching[1], matching[0]] if required == 2 else [matching[1]]
                for index in indices:
                    # Native buttons support keyboard selection as ordinary buttons.
                    options.nth(index).focus()
                    page.keyboard.press('Space')
                    assert options.nth(index).get_attribute('aria-pressed') == 'true'
                assert confirm.is_enabled()
                bounds = options.evaluate_all('buttons => buttons.map(button=>{const r=button.getBoundingClientRect();return {width:r.width,height:r.height,left:r.left,right:r.right}})')
                confirmation_bounds = confirm.evaluate('button=>{const r=button.getBoundingClientRect();return {width:r.width,height:r.height,left:r.left,right:r.right}}')
                assert all(rect['height'] >= 44 and rect['width'] >= 44 and rect['left'] >= 0
                           and rect['right'] <= view['width'] + 1 for rect in bounds + [confirmation_bounds]), (bounds, confirmation_bounds)
                observation = {'title': title, 'offered': labels, 'clickedIndices': indices,
                               'confirmation': confirm.inner_text(), 'keyboardSelection': True,
                               'buttonRectangles': bounds, 'confirmationRectangle': confirmation_bounds}
                view['selections'][spell] = observation
                page.screenshot(path=str(output / f'choice-locations-{spell}-{view["width"]}.png'), animations='disabled')
                confirm.focus()
                page.keyboard.press('Enter')
                selected = True
            elif title == 'CHOISIR LA POSITION':
                page.get_by_role('button', name='ATTAQUE FACE RECTO', exact=True).click()
            elif title == 'CHOISIR LA ZONE':
                options.first.click()
                page.locator('#decision-options > button.btn-magenta').click()
            else:
                raise AssertionError(f'Unexpected native choice: {title}; {page.locator("#decision-options button").all_inner_texts()}')
        if selected and not page.locator('#decision-modal').is_visible() and page.locator('#btn-end-turn').is_enabled():
            ui.await_player_main(page)
            return
        page.wait_for_timeout(75)
    raise AssertionError(f'{spell} did not resolve')


def run_view(page, url, width, output, draft, compiled=False):
    view = {'width': width, 'trace': [], 'selections': {}}
    errors, failures, native_loaded = [], [], set()
    page.on('pageerror', lambda error: errors.append(str(error)[:600]))
    page.on('requestfailed', lambda request: failures.append(urlsplit(request.url).path) if '/native/' in request.url else None)
    page.on('response', lambda response: native_loaded.add(urlsplit(response.url).path) if '/native/' in response.url and response.status == 200 else None)
    page.add_init_script(ui.RNG_FIXTURE)
    page.add_init_script(f"localStorage.setItem('ygo_custom_deck',{json.dumps(json.dumps(draft))});")
    response = page.goto(url, wait_until='domcontentloaded')
    if compiled:
        assert response.header_value('content-security-policy') == ui.production_headers()['Content-Security-Policy']
    assert page.evaluate('typeof window.__YGO_QA__') == 'undefined', 'Use production NODE_ENV for the source server'
    page.locator('input[name="game-mode"][value="native"]').check()
    page.locator('input[name="ai-difficulty"][value="easy"]').check()
    page.locator('[data-deck-id="custom"]').click()
    ui.wait_until(page, "() => document.querySelector('#builder-catalogue-status')?.textContent.includes('cartes avec règles natives')")
    assert page.locator('#deck-validity-badge').inner_text() == 'Deck valide'
    assert page.locator('#deck-size-val').inner_text() == 'Main: 40 / Extra: 0 / Side: 0'
    page.locator('#btn-start-duel').click()
    page.get_by_role('button', name='JE COMMENCE', exact=True).click()
    page.locator('#start-modal').wait_for(state='hidden')
    page.wait_for_selector('#player-hand .card-entity')
    ui.await_player_main(page)
    opening = page.locator('#player-hand .card-entity').evaluate_all('cards => cards.map(card=>card.dataset.id)')
    assert Counter(opening) == Counter(OPENING), opening
    assert page.locator('#player-gy-count').inner_text() == '0'
    activate(page, '79571449')
    resolve(page, '79571449', view, output)
    assert page.locator('#player-gy-count').inner_text() == '3'
    assert page.locator('#player-hand .card-entity[data-id="89631139"]').count() == 1
    activate(page, '83764718')
    resolve(page, '83764718', view, output)
    ui.wait_until(page, "() => document.querySelectorAll('.card-zone[data-side=\"player\"][data-zone-type=\"monster\"] .card-entity[data-id=\"89631139\"]').length===1")
    assert page.locator('#player-gy-count').inner_text() == '3'  # one target leaves; Reborn itself enters
    assert page.locator('#player-hand .card-entity[data-id="89631139"]').count() == 1
    assert page.evaluate('JSON.parse(localStorage.getItem("ygo_custom_deck"))') == draft
    assert not errors and not failures, (errors, failures)
    assert not page.evaluate('window.__auditCspViolations || []')
    assert {'/native/ocgcore.sync.wasm', '/native/card-data.json', '/native/scripts.json'} <= native_loaded
    view['checks'] = {'validFortyCardFreeRegistration': True, 'nativeArchivesLoaded': True,
                      'realCharityDrawAndTwoDiscards': True, 'duplicateMainAndGyLabelsDistinct': True,
                      'realRebornSummonConfirmedInPublicBoard': True, 'keyboardSpaceAndEnter': True,
                      'touchTargetsAtLeast44pxAndInsideViewport': True, 'noQaHookOrPostStartInjection': True}
    view['errors'] = errors
    page.screenshot(path=str(output / f'choice-locations-resolved-{width}.png'), animations='disabled')
    return view


def fingerprints(root, paths):
    return [{'path': path, 'bytes': (root / path).stat().st_size,
             'sha256': hashlib.sha256((root / path).read_bytes()).hexdigest()} for path in paths]


def main():
    parser = argparse.ArgumentParser()
    server_args = parser.add_mutually_exclusive_group(required=True)
    server_args.add_argument('--base-url', help='Source preflight server with production NODE_ENV')
    server_args.add_argument('--dist', type=Path, help='Frozen compiled application; served with actual production CSP')
    parser.add_argument('--output', type=Path, default=ROOT / 'docs/audits/artifacts/native-choice-locations-ui-2026-10-08')
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    draft = fixture()
    paths = ['main.js', 'style.css', 'vercel.json', 'src/core/native/NativeDuelDecisions.js', 'src/ui/NativeDuelPresentationModel.js',
             'scripts/audit-native-choice-locations-ui.py', 'scripts/audit-native-duel-ui.py',
             'public/native/ocgcore.sync.wasm', 'public/native/card-data.json', 'public/native/scripts.json']
    dependencies = fingerprints(ROOT, paths)
    compiled = args.dist is not None
    server = None
    if compiled:
        args.dist = args.dist.resolve()
        ui.AuditServer.headers_to_add = ui.production_headers()
        server = ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(ui.AuditServer, directory=str(args.dist)))
        threading.Thread(target=server.serve_forever, daemon=True).start()
        url = f'http://127.0.0.1:{server.server_port}'
        compiled_paths = ['index.html', 'native/ocgcore.sync.wasm', 'native/card-data.json', 'native/scripts.json']
        compiled_paths += sorted(str(path.relative_to(args.dist)) for path in (args.dist / 'assets').iterdir()
                                 if path.suffix in {'.js', '.css'})
        assert any(re.fullmatch(r'assets/index-.+\.js', path) for path in compiled_paths)
        compiled_before = fingerprints(args.dist, compiled_paths)
    else:
        url = args.base_url
    limits = ['The browser exercises own Main/GY duplicate choices; both-GY ownership, shared Extra Zone mapping and facedown enemy targets are proven separately by official-WASM scenarios.']
    if not compiled:
        limits.insert(0, 'This preflight uses the actual source application via Vite with production NODE_ENV; it is not a compiled production-CSP proof.')
    report = {'generatedOn': '2026-10-08', 'stage': 'compiled-production-csp' if compiled else 'source-preflight-after-confirmation-touch-fix', 'status': 'running', 'registeredFixture': draft,
              'sourceDependencies': dependencies, 'viewports': [],
              'limits': limits}
    if compiled:
        report['compiledSnapshotBefore'] = compiled_before
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox'])
        try:
            for width, height in [(1440, 900), (390, 844)]:
                context = browser.new_context(viewport={'width': width, 'height': height}, is_mobile=width < 600,
                                              has_touch=width < 600)
                report['viewports'].append(run_view(context.new_page(), url, width, args.output, draft, compiled))
                if compiled:
                    served = []
                    for path in compiled_paths:
                        response = context.request.get(f'{url}/{path}')
                        assert response.status == 200
                        body = response.body()
                        served.append({'path': path, 'bytes': len(body), 'sha256': hashlib.sha256(body).hexdigest()})
                    assert served == compiled_before
                    report['servedCompiledSnapshot'] = served
                context.close()
            if compiled:
                report['compiledSnapshotAfter'] = fingerprints(args.dist, compiled_paths)
                assert report['compiledSnapshotAfter'] == compiled_before
            report['sourceDependenciesAfter'] = fingerprints(ROOT, paths)
            assert report['sourceDependenciesAfter'] == dependencies, 'A reviewed source dependency changed during the browser run'
            report['status'] = 'passed'
        except Exception as error:
            report['status'] = 'failed'
            report['error'] = str(error)
            raise
        finally:
            browser.close()
            if server:
                server.shutdown()
                server.server_close()
            (args.output / 'report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    print('Native duplicate choices UI: desktop/mobile passed')


if __name__ == '__main__':
    main()
