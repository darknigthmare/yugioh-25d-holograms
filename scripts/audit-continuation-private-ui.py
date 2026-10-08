#!/usr/bin/env python3
"""Play actual Foolish Burial -> Smartfon through frozen production UI only.

The coordinator's exact entry SHA is required. This script never builds. A
40-card native free-duel registration and a varied RNG stream precede Start;
all subsequent actions are visible controls and all observations are DOM. No
QA hooks, game-object access, synthetic events or post-start injection occur.
"""
import argparse
from collections import Counter
from datetime import datetime, timezone
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
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


ui = helper('continuation_private_native_ui', 'audit-native-duel-ui.py')
wave = helper('continuation_private_native_wave', 'audit-native-wave-ui.py')
SMARTFON, FOOLISH, CELFON = '15521027', '81439173', '93542102'
OPENING = [SMARTFON, FOOLISH, '46986414', '15025844', '97590747']


def fingerprint(path):
    data = path.read_bytes()
    return {'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()}


def fixture():
    normal = ['89631139', '46986414', '97590747', '15025844', '70781052',
              '5053103', '76812113', '91152256', '32452818', '91939608']
    main = [code for code in normal for _ in range(3)]
    main += [SMARTFON] * 3 + [FOOLISH] + [CELFON] * 3 + ['5318639'] * 3
    locked = set()
    for position, code in zip([25, 4, 18, 14, 11], OPENING):
        source = next(index for index, value in enumerate(main) if value == code and index not in locked)
        main[position], main[source] = main[source], main[position]
        locked.add(position)
    rows = {str(row[0]): row for row in json.loads((ROOT / 'public/native/card-data.json').read_text())['rows']}
    assert len(main) == 40 and max(Counter(main).values()) <= 3 and main.count(FOOLISH) == 1
    assert all(code in rows for code in main)
    assert rows[CELFON][11] == 'Morphtronic Celfon'
    assert CELFON not in OPENING
    return {'main': main, 'extra': [], 'side': []}


def public_state(page):
    return page.evaluate("""() => ({
      hand:[...document.querySelectorAll('#player-hand .card-entity')].map(c=>({id:c.dataset.id,uid:c.dataset.uid})),
      ownMonsters:[...document.querySelectorAll('.card-zone[data-side="player"][data-zone-type="monster"]')]
        .flatMap(zone=>{const c=zone.querySelector('.monster-hologram-entity');return c?[{
          id:c.dataset.id,uid:c.dataset.uid,index:zone.dataset.index,defense:zone.classList.contains('defense-position'),
          atk:c.querySelector('.stat-badge.atk')?.textContent,def:c.querySelector('.stat-badge.def')?.textContent}]:[]}),
      deckCount:document.querySelector('#player-deck-count')?.textContent,
      gyCount:document.querySelector('#player-gy-count')?.textContent,
      banishedCount:document.querySelector('#player-banished-count')?.textContent,
      playerLp:document.querySelector('#player-lp')?.textContent,
      opponentLp:document.querySelector('#opponent-lp')?.textContent,
      publicLog:document.querySelector('#log-content')?.innerText,
      publicInspector:document.querySelector('#inspector-display')?.innerText,
      publicConfirmationPanels:document.querySelectorAll('.public-card-confirmation').length
    })""")


def facts(state):
    return {key: state[key] for key in ['hand', 'ownMonsters', 'deckCount', 'gyCount', 'banishedCount', 'playerLp', 'opponentLp']}


def select_cards(page, candidate, trace):
    options = page.locator('#decision-options .decision-card-option')
    wanted = options.filter(has_text=candidate).first
    assert wanted.count(), (candidate, options.all_inner_texts())
    ui.wait_until(page, "() => document.querySelector('#decision-options .decision-card-option') === document.activeElement")
    trace.append({'title': page.locator('#decision-modal-title').inner_text(), 'selected': wanted.inner_text(), 'method': 'keyboard Space/Enter'})
    wanted.focus()
    page.keyboard.press('Space')
    ui.wait_until(page, "() => document.querySelector('#decision-options .decision-card-option[aria-pressed=\"true\"]') !== null")
    confirm = page.locator('#decision-options .decision-confirm-button')
    assert confirm.is_visible() and confirm.is_enabled()
    confirm.focus()
    page.keyboard.press('Enter')


def settle(page, trace, phase, timeout=45):
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        modal = page.locator('#decision-modal')
        if modal.is_visible():
            title = page.locator('#decision-modal-title').inner_text()
            choices = page.locator('#decision-options .decision-choice-list button')
            passing = choices.filter(has_text='PASSER LA PRIORITÉ')
            if passing.count():
                trace.append({'title': title, 'selected': 'PASSER LA PRIORITÉ'})
                passing.first.click()
            elif title == 'CHOISIR LES CARTES':
                select_cards(page, re.compile('Morphtronic Celfon', re.I), trace)
            elif title == 'CHOISIR LES MATÉRIELS':
                confirm = choices.filter(has_text='CONFIRMER LES MATÉRIELS')
                adding = choices.filter(has_text=re.compile(r'^AJOUTER.*Morphtronic Celfon', re.I))
                target = confirm.first if confirm.count() else adding.first
                assert target.count(), choices.all_inner_texts()
                trace.append({'title': title, 'selected': target.inner_text()})
                target.click()
            elif title == 'CHOISIR LA POSITION':
                target = page.get_by_role('button', name='DÉFENSE FACE RECTO', exact=True)
                assert target.is_visible()
                trace.append({'title': title, 'selected': 'DÉFENSE FACE RECTO'})
                target.click()
            elif title == 'CHOISIR LA ZONE':
                options = page.locator('#decision-options .decision-card-option')
                options.first.click()
                confirm = page.locator('#decision-options .decision-confirm-button')
                assert confirm.is_enabled()
                trace.append({'title': title, 'selected': options.first.inner_text()})
                confirm.click()
            elif title == 'CHOISIR UN EFFET' and phase == 'inspect':
                labels = choices.all_inner_texts()
                assert labels == ['Top of deck', 'Bottom of deck'], labels
                trace.append({'title': title, 'options': labels, 'selected': labels[0]})
                choices.first.click()
            elif title == 'ORDONNER LES CARTES' and phase == 'inspect':
                assert choices.count()
                trace.append({'title': title, 'selectedAuthorizedDeckCard': choices.first.inner_text()})
                choices.first.click()
            else:
                raise AssertionError(f'Unexpected native choice in {phase}: {title}; {page.locator("#decision-options button").all_inner_texts()}')
        elif page.locator('#btn-end-turn').is_enabled():
            ready = (phase == 'foolish' and page.locator('#player-gy-count').inner_text() == '2') or (
                phase == 'special' and page.locator(
                    f'.card-zone[data-side="player"][data-zone-type="monster"] .monster-hologram-entity[data-id="{SMARTFON}"]'
                ).count() == 1) or (phase == 'inspect' and page.locator(
                    '.private-card-inspection:not(.public-card-confirmation)').count() == 1)
            if ready:
                return
        page.wait_for_timeout(60)
    raise AssertionError(f'Native {phase} did not resolve through public choices')


def native_action(page, prefix, trace):
    assert page.locator('#btn-native-actions').is_enabled()
    page.locator('#btn-native-actions').click()
    page.locator('#decision-modal').wait_for(state='visible')
    choices = page.locator('#decision-options .decision-choice-list button')
    target = choices.filter(has_text=prefix).first
    assert target.count(), choices.all_inner_texts()
    trace.append({'title': page.locator('#decision-modal-title').inner_text(), 'selected': target.inner_text()})
    target.click()


def public_pile(page, zone):
    page.locator(f'#player-{zone}-zone').click()
    page.locator('#public-zone-modal').wait_for(state='visible')
    codes = page.locator('#public-zone-list .card-entity').evaluate_all('cards=>cards.map(c=>c.dataset.id)')
    page.locator('#btn-close-public-zone').click()
    page.locator('#public-zone-modal').wait_for(state='hidden')
    return codes


def panel_metrics(page):
    return page.evaluate("""() => {
      const section=document.querySelector('.private-card-inspection:not(.public-card-confirmation)');
      const rect=el=>{const r=el.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height};};
      return {count:document.querySelectorAll('.private-card-inspection:not(.public-card-confirmation)').length,
        role:section?.getAttribute('role'),modal:section?.getAttribute('aria-modal'),title:section?.querySelector('h2')?.textContent,
        panel:section?rect(section):null,received:section?.querySelector('.private-card-inspection-count')?.textContent,
        names:[...section?.querySelectorAll('.private-card-inspection-card span')??[]].map(c=>c.textContent),
        images:[...section?.querySelectorAll('.private-card-inspection-card img')??[]].map(c=>({
          url:c.getAttribute('src'),loaded:c.complete&&c.naturalWidth>0,hidden:c.hidden,alt:c.alt})),
        buttons:[...section?.querySelectorAll('button')??[]].map(c=>({label:c.getAttribute('aria-label'),...rect(c)})),
        selectedName:section?.querySelector('h3')?.textContent,description:section?.querySelector('.private-card-inspection-description')?.textContent,
        scrollWidth:document.documentElement.scrollWidth,viewportWidth:innerWidth,viewportHeight:innerHeight};
    }""")


def run_view(page, url, width, height, output, draft):
    report = {'width': width, 'height': height, 'trace': [], 'captures': [], 'pageErrors': [], 'nativeRequestFailures': []}
    loaded = set()
    page.on('pageerror', lambda error: report['pageErrors'].append(str(error)[:600]))
    page.on('requestfailed', lambda request: report['nativeRequestFailures'].append(urlsplit(request.url).path)
            if '/native/' in request.url else None)
    page.on('response', lambda response: loaded.add(urlsplit(response.url).path)
            if response.status == 200 and ('/native/' in response.url or '/assets/' in response.url) else None)
    page.add_init_script(ui.RNG_FIXTURE)
    page.add_init_script(f"localStorage.setItem('ygo_custom_deck', {json.dumps(json.dumps(draft))});")
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
    page.get_by_role('button', name='JE COMMENCE', exact=True).click()
    page.locator('#start-modal').wait_for(state='hidden')
    page.wait_for_selector('#player-hand .card-entity')
    ui.await_player_main(page)
    opening = page.locator('#player-hand .card-entity').evaluate_all('cards=>cards.map(c=>c.dataset.id)')
    assert Counter(opening) == Counter(OPENING), opening
    report['actualOpeningOwnHand'] = opening
    assert page.locator('.private-card-inspection').count() == 0
    page.locator(f'#player-hand .card-entity[data-id="{FOOLISH}"]').first.click()
    page.locator('.card-zone[data-side="player"][data-zone-type="spell"].active-zone').first.click()
    page.locator('#action-modal').wait_for(state='visible')
    assert page.locator('#btn-action-faceup').is_enabled()
    page.locator('#btn-action-faceup').click()
    settle(page, report['trace'], 'foolish')
    gy = public_pile(page, 'graveyard')
    assert Counter(gy) == Counter([FOOLISH, CELFON]), gy
    report['publicGyAfterActualFoolish'] = gy
    native_action(page, re.compile(r'^Invoquer spécialement Morphtronic Smartfon', re.I), report['trace'])
    settle(page, report['trace'], 'special')
    board = public_state(page)
    assert len(board['ownMonsters']) == 1 and board['ownMonsters'][0]['id'] == SMARTFON
    assert board['ownMonsters'][0]['defense']
    assert board['gyCount'] == '1' and board['banishedCount'] == '1', board
    assert public_pile(page, 'banished') == [CELFON]
    before = public_state(page)
    native_action(page, re.compile(r'^Activer Morphtronic Smartfon.*Excavate and arranje', re.I), report['trace'])
    settle(page, report['trace'], 'inspect')
    page.locator('.private-card-inspection:not(.public-card-confirmation)').wait_for(state='visible')
    ui.wait_until(page, "() => [...document.querySelectorAll('.private-card-inspection-card img')].every(i=>i.complete&&i.naturalWidth>0)")
    metrics = panel_metrics(page)
    actual_count = len(metrics['names'])
    assert metrics['count'] == 1 and metrics['title'] == 'Inspection privée' and metrics['role'] == 'region' and metrics['modal'] is None
    assert 1 <= actual_count <= 6, metrics
    assert len(metrics['images']) == actual_count and all(image['loaded'] and not image['hidden'] for image in metrics['images'])
    assert metrics['received'] == f'{actual_count} carte{"s" if actual_count > 1 else ""} reçue{"s" if actual_count > 1 else ""}.'
    rect = metrics['panel']
    assert rect['x'] >= 0 and rect['y'] >= 0 and rect['x'] + rect['width'] <= width + 1 and rect['y'] + rect['height'] <= height + 1
    assert all(button['width'] >= 44 and button['height'] >= 44 for button in metrics['buttons'])
    assert metrics['scrollWidth'] <= width
    after = public_state(page)
    assert facts(before) == facts(after), (before, after)
    assert after['publicConfirmationPanels'] == 0
    delta = after['publicLog'][len(before['publicLog']):] if after['publicLog'].startswith(before['publicLog']) else after['publicLog']
    assert not re.search(r'Carte révélée|RETRY|Lua error|moteur natif est arrêté', delta, re.I), delta
    disclosed_before = {'Morphtronic Smartfon', 'Morphtronic Celfon', 'Foolish Burial'}
    assert not any(name in delta for name in set(metrics['names']) - disclosed_before), (metrics['names'], delta)
    report.update(actualPrivateCardCount=actual_count, diceOutcomeNotForcedOrReadFromEngine=True,
                  groupedPanel=metrics, publicStateBeforeInspection=before, publicStateAfterInspection=after,
                  publicLogDelta=delta, preexistingPublicNamesExcludedFromLogTest=sorted(disclosed_before))
    capture = output / f'private-smartfon-grouped-{width}.png'
    page.screenshot(path=str(capture), animations='disabled')
    report['captures'].append(capture.name)
    inspector_before = after['publicInspector']
    buttons = page.locator('.private-card-inspection-card')
    buttons.last.focus()
    page.keyboard.press('Enter')
    selected = panel_metrics(page)
    assert selected['selectedName'] == selected['names'][-1] and selected['description']
    assert buttons.last.get_attribute('aria-pressed') == 'true'
    assert public_state(page)['publicInspector'] == inspector_before
    page.locator('.private-card-inspection-details').scroll_into_view_if_needed()
    capture = output / f'private-smartfon-keyboard-details-{width}.png'
    page.screenshot(path=str(capture), animations='disabled')
    report['captures'].append(capture.name)
    report['keyboardDetails'] = selected
    if width >= 600:
        page.get_by_role('button', name='Fermer l’inspection privée', exact=True).click()
        report['closedThrough'] = 'visible close button'
    else:
        buttons.last.focus()
        page.keyboard.press('Escape')
        report['closedThrough'] = 'keyboard Escape inside real panel'
    assert page.locator('.private-card-inspection').count() == 0
    assert facts(public_state(page)) == facts(after)
    assert page.locator('#btn-end-turn').is_enabled()
    assert page.evaluate('JSON.parse(localStorage.getItem("ygo_custom_deck"))') == draft
    assert page.evaluate('typeof window.__YGO_QA__') == 'undefined'
    report['opponentConcealment'] = ui.verify_concealment(page)
    report['loadedHttpAssets'] = sorted(loaded)
    assert {'/native/ocgcore.sync.wasm', '/native/card-data.json', '/native/scripts.json'} <= loaded
    report['cspViolations'] = page.evaluate('window.__auditCspViolations || []')
    assert not report['pageErrors'] and not report['nativeRequestFailures'] and not report['cspViolations'], report
    capture = output / f'private-smartfon-closed-board-{width}.png'
    page.screenshot(path=str(capture), animations='disabled')
    report['captures'].append(capture.name)
    report['ok'] = True
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--dist', type=Path, default=ROOT / 'dist')
    parser.add_argument('--base-url')
    parser.add_argument('--output', type=Path, default=ROOT / 'docs/audits/artifacts/continuation-private-ui-2026-10-08')
    parser.add_argument('--expected-entry-sha256', required=True)
    parser.add_argument('--desktop-only', action='store_true')
    args = parser.parse_args()
    assert re.fullmatch('[a-f0-9]{64}', args.expected_entry_sha256)
    args.dist = args.dist.resolve()
    compiled_before, essential = wave.compiled_wave_fingerprints(args.dist)
    entry = next(path for path in compiled_before if re.fullmatch(r'assets/index-[^/]+\.js', path))
    assert compiled_before[entry]['sha256'] == args.expected_entry_sha256, 'Entry does not match coordinator frozen SHA'
    assert len(compiled_before) >= 17, 'Expected complete compiled assets and native resources'
    args.output.mkdir(parents=True, exist_ok=True)
    paths = ['main.js', 'style.css', 'vercel.json', 'scripts/audit-continuation-private-ui.py',
             'scripts/audit-native-duel-ui.py', 'scripts/audit-native-wave-ui.py',
             'src/ui/PrivateCardInspection.js', 'src/ui/PublicCardConfirmation.js',
             'src/core/native/NativeDuelGame.js', 'src/core/native/NativeDuelRuntime.js',
             'src/core/native/NativeDuelDecisions.js', 'src/core/native/NativeDuelVisualEvents.js',
             'src/core/native/NativePublicRevealPolicy.js', 'src/ui/NativeDuelPresentationModel.js',
             'src/core/native/NativeCardCatalogue.js', 'src/core/native/NativeCardData.js',
             'public/native/card-data.json', 'public/native/scripts.json', 'public/native/ocgcore.sync.wasm']
    before = {path: fingerprint(ROOT / path) for path in paths}
    draft = fixture()
    report = {'format': 'continuation-private-production-ui-v1', 'ok': False,
              'executedAtUtc': datetime.now(timezone.utc).isoformat(), 'technicalTimezone': 'UTC',
              'stage': 'frozen-compiled-production-csp', 'expectedEntrySha256': args.expected_entry_sha256,
              'essentialBuildAssets': essential, 'registeredFixture': draft,
              'method': 'Forty-card native free duel registered before Start; varied initial crypto stream; all gameplay uses public UI; observations use visible DOM only.',
              'tcgAdvancedLegalityCertified': False, 'noPostStartInjection': True, 'syntheticInspectionEvents': False,
              'privateCardCountAssumption': 'The core owns the dice; the actual count is observed from the legitimate recipient panel and must be 1–6. Six cards are never assumed.',
              'sourceDependenciesBefore': before, 'compiledSnapshotBefore': compiled_before,
              'productionCsp': ui.production_headers()['Content-Security-Policy'], 'viewports': [],
              'limits': ['This browser proof is the native recipient/player-controller-0 application flow. Both native recipients/controllers are proved separately in WASM.',
                         'No native object or raw hidden Deck/opponent hand is read. Authorized private UI card names are recorded.',
                         'The close button is exercised on desktop and Escape on mobile in separate actual duels; no fake reopening or synthetic group replacement occurs.']}
    server = None
    if not args.base_url:
        ui.AuditServer.headers_to_add = ui.production_headers()
        server = ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(ui.AuditServer, directory=str(args.dist)))
        threading.Thread(target=server.serve_forever, daemon=True).start()
        args.base_url = f'http://127.0.0.1:{server.server_port}'
    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(executable_path='/usr/bin/chromium', headless=True,
                args=['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
            context = browser.new_context()
            served_before = wave.fingerprints(context.request, args.base_url, compiled_before)
            context.close()
            assert served_before == compiled_before
            report['servedResponseFingerprintsBefore'] = served_before
            for width, height in [(1280, 900)] + ([] if args.desktop_only else [(390, 844)]):
                context = browser.new_context(viewport={'width': width, 'height': height}, is_mobile=width < 600,
                                              has_touch=width < 600, reduced_motion='no-preference')
                page = context.new_page()
                page.set_default_timeout(30000)
                item = {'width': width, 'height': height, 'ok': False}
                report['viewports'].append(item)
                try:
                    item.update(run_view(page, args.base_url, width, height, args.output, draft))
                except Exception as error:
                    item['failure'] = str(error)
                    diagnostic = args.output / f'diagnostic-private-smartfon-{width}.png'
                    page.screenshot(path=str(diagnostic), animations='disabled')
                    item['diagnosticScreenshot'] = diagnostic.name
                    raise
                finally:
                    context.close()
            context = browser.new_context()
            served_after = wave.fingerprints(context.request, args.base_url, compiled_before)
            context.close()
            compiled_after, essential_after = wave.compiled_wave_fingerprints(args.dist)
            source_after = {path: fingerprint(ROOT / path) for path in paths}
            report.update(servedResponseFingerprintsAfter=served_after, compiledSnapshotAfter=compiled_after,
                          sourceDependenciesAfter=source_after)
            assert served_before == served_after == compiled_before == compiled_after
            assert essential == essential_after and before == source_after
            report['buildAndSourceUnchangedDuringAudit'] = True
            report['captureFingerprints'] = {name: fingerprint(args.output / name)
                for viewport in report['viewports'] for name in viewport['captures']}
            report['ok'] = len(report['viewports']) == (1 if args.desktop_only else 2) and all(view['ok'] for view in report['viewports'])
            browser.close()
    finally:
        if server:
            server.shutdown()
            server.server_close()
        report['completedAtUtc'] = datetime.now(timezone.utc).isoformat()
        (args.output / 'report.json').write_text(json.dumps(report, indent=2, ensure_ascii=False) + '\n')
    assert report['ok']
    print(json.dumps({'ok': True, 'viewports': len(report['viewports']), 'captures': len(report['captureFingerprints']),
                      'actualPrivateCardCounts': [view['actualPrivateCardCount'] for view in report['viewports']],
                      'servedAssetsVerifiedBeforeAfter': len(compiled_before)}))


if __name__ == '__main__':
    main()
