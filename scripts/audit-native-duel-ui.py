#!/usr/bin/env python3
"""Audit the compiled native duel using real desktop/mobile controls and CSP.

Build first (`npm run build`), then run this script. It serves dist with the
repository's production response headers unless --base-url is supplied.
Fixtures affect only this audit's isolated browser: a legal local custom deck
and a fixed initial RNG seed. No QA hook, engine response injection, opponent
hand inspection, authenticated state, or third-party publishing is used.
"""
import argparse
import functools
import hashlib
import json
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from collections import Counter
import re
import threading
import time
from urllib.parse import urlsplit

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]


def compiled_fingerprints(dist):
    html = (dist / 'index.html').read_text()
    entry = re.search(r'src="([^"]+/index-[^"]+\.js)"', html).group(1).lstrip('/')
    css = re.search(r'href="([^"]+/index-[^"]+\.css)"', html).group(1).lstrip('/')
    paths = ['index.html', entry, css,
             str(next((dist / 'assets').glob('NativeDuelGame-*.js')).relative_to(dist)),
             str(next((dist / 'assets').glob('ocgcore-*.js')).relative_to(dist)),
             'native/ocgcore.sync.wasm', 'native/card-data.json', 'native/scripts.json']
    return {path: {'bytes': (dist / path).stat().st_size,
                   'sha256': hashlib.sha256((dist / path).read_bytes()).hexdigest()} for path in paths}


def served_fingerprints(request, base_url):
    """Discover assets in the served HTML/JS and hash their actual HTTP bodies."""
    found = {}

    def read(path):
        response = request.get(base_url.rstrip('/') + '/' + path)
        assert response.status == 200, (path, response.status)
        body = response.body()
        found[path or 'index.html'] = {'bytes': len(body), 'sha256': hashlib.sha256(body).hexdigest()}
        return body

    html = read('').decode()
    entry = re.search(r'src="([^"]+/index-[^"]+\.js)"', html).group(1).lstrip('/')
    css = re.search(r'href="([^"]+/index-[^"]+\.css)"', html).group(1).lstrip('/')
    entry_body = read(entry).decode()
    read(css)
    facade = str(Path(entry).parent / re.search(r'NativeDuelGame-[A-Za-z0-9_-]+\.js', entry_body).group(0))
    facade_body = read(facade).decode()
    wrapper = str(Path(facade).parent / re.search(r'ocgcore-[A-Za-z0-9_-]+\.js', facade_body).group(0))
    read(wrapper)
    for path in ['native/ocgcore.sync.wasm', 'native/card-data.json', 'native/scripts.json']:
        read(path)
    return found


RNG_FIXTURE = """(() => {
  window.addEventListener('securitypolicyviolation', event => {
    window.__auditCspViolations = window.__auditCspViolations || [];
    window.__auditCspViolations.push({directive: event.effectiveDirective,
      blocked: ['eval', 'wasm-eval', 'inline'].includes(event.blockedURI) ? event.blockedURI : 'resource'});
  });
  let state=0x9e3779b9, calls=0;
  Object.defineProperty(crypto, 'getRandomValues', {value(view) {
    for (let index=0; index<view.length; index++) {
      if (calls++===0) { view[index]=2; continue; }
      state ^= state << 13; state ^= state >>> 17; state ^= state << 5;
      view[index]=state >>> 0;
    }
    return view;
  }});
})()"""


def custom_deck_fixture():
    """Use actual starter cards and factual CDB rows, keeping three-copy limits."""
    ids = set(re.findall(r'id:\s*["\'](\d+)["\']', (ROOT / 'src/cards.js').read_text()))
    field_ids = set(re.findall(r"\['(\d+)',", (ROOT / 'src/ui/FieldSpellEnvironmentCatalog.js').read_text()))
    ids.update(field_ids)
    payload = json.loads((ROOT / 'public/native/card-data.json').read_text())
    rows = {str(row[0]): row for row in payload['rows']}
    monsters = [code for code in ids if code in rows and rows[code][4] == 17
                and 0 < (int(rows[code][7]) & 255) <= 4]
    spells = [code for code in ids if code in rows and rows[code][4] & 2
              and code not in {'55144522', '83764718'}]
    monsters.sort(key=int)
    spells.sort(key=lambda code: (not bool(rows[code][4] & 0x80000), int(code)))
    assert len(monsters) >= 7 and len(spells) >= 7, 'Insufficient starter fixture cards'
    def copies(codes):
        return [code for code in codes[:7] for _ in range(3)][:20]
    monster_copies, spell_copies = copies(monsters), copies(spells)
    main = [code for pair in zip(monster_copies, spell_copies) for code in pair]
    return {'main': main, 'extra': ['23995346'], 'side': []}, rows


def production_headers():
    config = json.loads((ROOT / 'vercel.json').read_text())
    result = {}
    for rule in config.get('headers', []):
        if rule.get('source') == '/(.*)':
            result.update({header['key']: header['value'] for header in rule['headers']})
    assert "'wasm-unsafe-eval'" in result.get('Content-Security-Policy', ''), 'Production CSP must authorize WASM compilation'
    assert "'unsafe-eval'" not in result['Content-Security-Policy'], 'Audit expects JavaScript eval to remain blocked'
    return result


class AuditServer(SimpleHTTPRequestHandler):
    headers_to_add = {}
    def end_headers(self):
        for key, value in self.headers_to_add.items():
            self.send_header(key, value)
        super().end_headers()
    def log_message(self, *_args):
        pass


def first_visible(page, selector):
    matches = page.locator(selector)
    for index in range(matches.count()):
        item = matches.nth(index)
        if item.is_visible():
            return item
    return None


def wait_until(page, predicate, argument=None, timeout=30):
    """Poll through DevTools without Playwright's string-eval wait helper."""
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        if page.evaluate(predicate, argument):
            return
        page.wait_for_timeout(100)
    raise AssertionError(f'Browser condition did not settle: {predicate[:160]}')


def dismiss_optional_decisions(page, limit=60):
    """Answer only visible, legally offered human decisions through buttons."""
    for _ in range(limit):
        modal = page.locator('#decision-modal')
        if not modal.is_visible():
            return
        cancel = page.locator('#btn-decision-cancel')
        if cancel.is_visible() and cancel.is_enabled():
            cancel.click()
        else:
            choices = modal.locator('button:not([disabled])').filter(visible=True)
            assert choices.count(), 'Required decision has no legal visible button'
            choices.first.click()
        page.wait_for_timeout(75)
    raise AssertionError('Decision sequence did not settle')


def await_player_main(page):
    for _ in range(300):
        dismiss_optional_decisions(page)
        if page.locator('#btn-end-turn').is_visible() and page.locator('#btn-end-turn').is_enabled():
            return
        page.wait_for_timeout(100)
    raise AssertionError('Native duel did not return to an actionable player turn')


def hand_id(page, rows, predicate):
    for element in page.locator('#player-hand .card-entity').all():
        code = element.get_attribute('data-id')
        if code in rows and predicate(rows[code]):
            return code
    return None


def place_hand_card(page, code, zone_type, face_up):
    card = page.locator(f'#player-hand .card-entity[data-id="{code}"]').first
    card.click()
    zones = page.locator(f'.card-zone[data-side="player"][data-zone-type="{zone_type}"].active-zone')
    assert zones.count(), f'No legal {zone_type} destination offered'
    zone = zones.first
    index = zone.get_attribute('data-index')
    zone.click()
    page.locator('#action-modal').wait_for(state='visible')
    action = page.locator('#btn-action-faceup' if face_up else '#btn-action-facedown')
    assert action.is_enabled(), 'Requested action is not enabled'
    action.click()
    page.locator('#action-modal').wait_for(state='hidden')
    dismiss_optional_decisions(page)
    wait_until(page, """({zoneType,index}) => Boolean(document.querySelector(
      `.card-zone[data-side="player"][data-zone-type="${zoneType}"][data-index="${index}"] .card-entity`))""",
      {'zoneType': zone_type, 'index': index})
    return index


def verify_concealment(page):
    # Public cards can be rendered; face-down opposing cards must expose no
    # identity, stats, front illustration, or private accessibility label.
    facts = page.evaluate("""() => {
      const cards = [...document.querySelectorAll('.card-zone[data-side="opponent"] .concealed-card')];
      return {count: cards.length, safe: cards.every(card =>
        !card.dataset.id && !card.dataset.uid && !card.dataset.cardType &&
        !card.querySelector('.card-front')?.style.backgroundImage &&
        card.getAttribute('aria-label') === 'Carte face cachée')};
    }""")
    assert facts['safe'], 'Opposing concealed cards expose private DOM information'
    return facts


def verify_page(page, base_url, report, output, width, height, draft, rows):
    errors, failed_native, csp_violations, native_assets = [], [], [], set()
    report.update(pageErrors=errors, nativeRequestFailures=failed_native)
    page.on('pageerror', lambda error: errors.append(str(error)[:400]))
    page.on('requestfailed', lambda request: failed_native.append(urlsplit(request.url).path)
            if '/native/' in request.url else None)
    page.on('response', lambda response: native_assets.add(urlsplit(response.url).path)
            if '/native/' in response.url and response.status == 200 else None)
    page.add_init_script(RNG_FIXTURE)
    page.add_init_script(f"if (!localStorage.getItem('ygo_custom_deck')) localStorage.setItem('ygo_custom_deck', {json.dumps(json.dumps(draft))});")
    page.set_viewport_size({'width': width, 'height': height})
    response = page.goto(base_url, wait_until='domcontentloaded')
    policy = response.header_value('content-security-policy') or ''
    assert "'wasm-unsafe-eval'" in policy
    assert "'unsafe-eval'" not in policy
    assert page.evaluate('typeof window.__YGO_QA__') == 'undefined', 'Production bundle exposes a development QA hook'
    page.locator('input[name="game-mode"][value="native"]').check()
    page.locator('[data-deck-id="custom"]').click()
    wait_until(page, "() => document.querySelectorAll('#library-cards-list [data-card-id]').length >= 339")
    wait_until(page, "() => document.querySelector('#builder-catalogue-status')?.textContent.includes('cartes avec règles natives')")
    library_count = page.locator('#library-cards-list [data-card-id]').count()
    assert page.locator('#deck-validity-badge').inner_text() == 'Deck valide'
    search = first_visible(page, '#builder-card-search, #builder-search, [data-builder-search]')
    assert search is not None, 'Native card library needs usable search'
    type_filter = page.locator('#builder-card-filter')
    type_filter.select_option('field')
    catalogue = set(re.findall(r"\['(\d+)',", (ROOT / 'src/ui/FieldSpellEnvironmentCatalog.js').read_text()))
    present_ids = set(page.locator('#library-cards-list [data-card-id]').evaluate_all('(buttons) => buttons.map(button => button.dataset.cardId)'))
    field_count = len(catalogue & present_ids)
    assert field_count == 339, 'Full native field catalogue is missing from the deck builder'
    assert page.locator('#library-cards-list [data-card-id]:visible').count() == 339
    search.fill('92107604')
    assert page.locator('#library-cards-list [data-card-id]:visible').count() == 1
    search.fill('')
    type_filter.select_option('all')
    search.fill('Dark World')
    partner = page.locator('#library-cards-list [data-card-id="79126789"]')
    partner.wait_for(state='visible')
    assert partner.is_enabled(), 'Native partner card is not deck-eligible'
    assert 'native-unknown.png' in partner.get_attribute('style'), 'Native partner lacks the neutral local illustration'
    assert 'Broww' in partner.inner_text()
    partner.click()
    assert page.locator('#deck-size-val').inner_text().startswith('Main: 41 /')
    page.locator('#builder-my-deck-list section').first.locator('button').first.click()
    saved = page.evaluate('JSON.parse(localStorage.getItem("ygo_custom_deck"))')
    expected = {'main': draft['main'][1:] + ['79126789'], 'extra': draft['extra'], 'side': draft['side']}
    assert saved == expected, 'Partner substitution changed unrelated deck IDs'
    page.reload(wait_until='domcontentloaded')
    page.locator('[data-deck-id="custom"]').click()
    wait_until(page, "() => document.querySelector('#builder-catalogue-status')?.textContent.includes('cartes avec règles natives')")
    assert page.evaluate('JSON.parse(localStorage.getItem("ygo_custom_deck"))') == expected, 'Reload silently discarded a native partner'
    assert page.locator('#deck-size-val').inner_text() == 'Main: 40 / Extra: 1 / Side: 0'
    assert page.locator('#deck-validity-badge').inner_text() == 'Deck valide'
    assert 'Broww' in page.locator('#builder-my-deck-list').inner_text()
    search = page.locator('#builder-card-search')
    search.fill('Dark World')
    report['checks']['nativePartner'] = {'query': 'Dark World', 'card': '79126789',
        'neutralLocalImage': True, 'replacementPreservesFortyCards': True, 'reloadPreservesExactIds': True}
    report['checks']['builder'] = {'libraryCards': library_count, 'fieldCards': field_count,
                                  'nativeFieldCodeSearch': True, 'fieldTypeFilter': True,
                                  'validFortyCardFixture': True}
    page.locator('#start-modal .modal-content').evaluate("""element => {
      const target=document.querySelector('#builder-card-search');
      element.scrollTop += target.getBoundingClientRect().top-element.getBoundingClientRect().top-32;
    }""")
    page.screenshot(path=str(output / f'native-builder-{width}.png'), animations='disabled')
    page.locator('#btn-start-duel').click()
    wait_until(page, "() => !document.querySelector('#start-modal').checkVisibility() || [...document.querySelectorAll('#decision-options button')].some(button => button.checkVisibility())")
    first = first_visible(page, '#decision-options button')
    if first:
        start = page.get_by_role('button', name='JE COMMENCE', exact=True)
        if start.is_visible():
            start.click()
        else:
            first.click()
            start = page.get_by_role('button', name='JE COMMENCE', exact=True)
            if start.is_visible():
                start.click()
    page.locator('#start-modal').wait_for(state='hidden')
    page.wait_for_selector('#player-hand .card-entity')
    await_player_main(page)
    assert '/native/ocgcore.sync.wasm' in native_assets, 'Duel did not load the native WASM'
    assert '/native/scripts.json' in native_assets and '/native/card-data.json' in native_assets
    report['checks']['nativeRuntimeLoaded'] = True
    opening = page.locator('#player-hand .card-entity').evaluate_all('(cards) => cards.map(card => card.dataset.id)')
    assert Counter(opening) != Counter(expected['main'][-5:]), 'The first hand still follows the registered deck order'
    assert page.evaluate('JSON.parse(localStorage.getItem("ygo_custom_deck"))') == expected
    report['checks']['initialMainDeckShuffledWithoutChangingRegistration'] = True
    monster = hand_id(page, rows, lambda row: row[4] == 17 and 0 < (int(row[7]) & 255) <= 4)
    spell = hand_id(page, rows, lambda row: row[4] & 2)
    assert monster and spell, 'Fixed opening must contain a normal summon and a settable spell'
    place_hand_card(page, monster, 'monster', True)
    place_hand_card(page, spell, 'field' if rows[spell][4] & 0x80000 else 'spell', False)
    report['checks']['normalSummonAndSpellSet'] = True
    extra = page.locator('#player-extra-zone')
    extra.click()
    page.locator('#extra-deck-modal').wait_for(state='visible')
    assert page.locator('#extra-deck-list').inner_text().strip()
    page.locator('#close-extra-modal').click()
    report['checks']['extraDeckAccessible'] = True
    before = page.locator('#player-hand .card-entity').count()
    page.locator('#btn-end-turn').click()
    await_player_main(page)
    after = page.locator('#player-hand .card-entity').count()
    assert after == before + 1, 'Ending a turn must let the AI act and return with the next native draw'
    report['checks']['aiTurnAndNextDraw'] = True
    report['checks']['opponentConcealment'] = verify_concealment(page)
    assert page.evaluate('document.body.scrollWidth <= innerWidth'), 'Layout overflows the viewport'
    report['checks']['responsiveBody'] = True
    report['checks']['productionQaHookAbsent'] = page.evaluate('typeof window.__YGO_QA__') == 'undefined'
    page.screenshot(path=str(output / f'native-duel-{width}.png'), animations='disabled')
    csp_violations.extend(page.evaluate('window.__auditCspViolations || []'))
    report.update(pageErrors=errors, nativeRequestFailures=failed_native,
                  cspViolations=csp_violations, nativeAssets=sorted(native_assets))
    assert not errors, f'Browser errors: {errors}'
    assert not failed_native, 'Native asset requests failed'
    assert not csp_violations, f'Production CSP violations: {csp_violations}'


def verify_ravine(page, base_url, report, output, draft):
    """Pay a real discard cost, then choose a Dragon from the native Deck list."""
    fixture = {section: list(ids) for section, ids in draft.items()}
    # Slot 39 supports an ordered diagnostic build; slots 11 and 3 cover the
    # deterministically shuffled production fixture. Three copies stay legal.
    for index in [3, 11, 39]:
        fixture['main'][index] = '62265044'
    for index in [1, 7, 9]:
        fixture['main'][index] = '89631139'
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)[:400]))
    page.add_init_script(RNG_FIXTURE)
    page.add_init_script(f"localStorage.setItem('ygo_custom_deck', {json.dumps(json.dumps(fixture))});")
    page.goto(base_url, wait_until='domcontentloaded')
    page.locator('input[name="game-mode"][value="native"]').check()
    page.locator('[data-deck-id="custom"]').click()
    wait_until(page, "() => document.querySelector('#builder-catalogue-status')?.textContent.includes('cartes avec règles natives')")
    assert page.locator('#deck-validity-badge').inner_text() == 'Deck valide'
    page.locator('#btn-start-duel').click()
    wait_until(page, "() => !document.querySelector('#start-modal').checkVisibility() || [...document.querySelectorAll('#decision-options button')].some(button => button.checkVisibility())")
    first = page.get_by_role('button', name='JE COMMENCE', exact=True)
    if first.is_visible():
        first.click()
    page.locator('#start-modal').wait_for(state='hidden')
    page.wait_for_selector('#player-hand .card-entity')
    await_player_main(page)
    assert page.locator('#player-hand .card-entity[data-id="62265044"]').count(), 'The fixed fixture must open with Dragon Ravine'
    place_hand_card(page, '62265044', 'field', True)
    field = page.locator('.card-zone[data-side="player"][data-zone-type="field"]')
    assert field.locator('.card-entity .card-inner.face-down').count() == 0
    before_hand = page.locator('#player-hand .card-entity').count()
    before_gy = int(page.locator('#player-gy-count').inner_text())
    field.click()
    page.locator('#decision-modal').wait_for(state='visible')
    assert page.locator('#decision-modal-title').inner_text() == 'EFFETS ET INVOCATIONS'
    assert page.locator('#decision-options .decision-choice-list button').count() == 1, f"Face-up Ravine menu: {page.locator('#decision-options button').all_inner_texts()}"
    page.locator('#decision-options .decision-choice-list button').first.click()
    wait_until(page, "() => document.querySelector('#decision-modal').checkVisibility() && document.querySelectorAll('#decision-options .decision-card-option').length > 0")
    assert page.locator('#player-hand .card-entity').count() == before_hand
    assert int(page.locator('#player-gy-count').inner_text()) == before_gy
    page.locator('#decision-options .decision-card-option').first.click()
    page.locator('#decision-options > button.btn-magenta').click()
    # Cost payment must precede the independently emitted Deck selection.
    wait_until(page, f"() => document.querySelectorAll('#player-hand .card-entity').length === {before_hand - 1} && Number(document.querySelector('#player-gy-count').textContent) === {before_gy + 1}")
    # The official script still asks SelectOption when its only legal branch
    # is sending a Dragon to the Graveyard. Confirm that offered branch first.
    wait_until(page, "() => document.querySelector('#decision-modal').checkVisibility() && document.querySelectorAll('#decision-options .decision-choice-list button').length > 0")
    assert page.locator('#decision-options .decision-choice-list button').count() == 1
    page.locator('#decision-options .decision-choice-list button').click()
    wait_until(page, "() => document.querySelector('#decision-modal').checkVisibility() && document.querySelectorAll('#decision-options .decision-card-option').length > 0")
    candidates = page.locator('#decision-options .decision-card-option')
    dragon = candidates.filter(has_text=re.compile('Blue-Eyes|Yeux Bleus', re.I)).first
    dragon.wait_for(state='visible')
    assert page.locator('#player-hand .card-entity').count() == before_hand - 1
    dragon.click()
    page.locator('#decision-options > button.btn-magenta').click()
    wait_until(page, f"() => Number(document.querySelector('#player-gy-count').textContent) === {before_gy + 2}")
    dismiss_optional_decisions(page)
    assert page.locator('#player-hand .card-entity').count() == before_hand - 1
    assert page.locator('#player-deck-count').inner_text() == '34'
    # The once-per-turn core command must disappear after its successful use.
    field.click()
    assert not page.locator('#decision-modal').is_visible()
    page.locator('#player-graveyard-zone').click()
    page.locator('#public-zone-modal').wait_for(state='visible')
    assert page.locator('#public-zone-list [data-id="89631139"]').count() == 1
    page.locator('#btn-close-public-zone').click()
    assert not errors, f'Ravine browser errors: {errors}'
    assert not page.evaluate('window.__auditCspViolations || []')
    page.screenshot(path=str(output / 'native-ravine-cost.png'), animations='disabled')
    report.update(card='62265044', faceUpFieldIgnitionMenu=True, discardCostBeforeDeckSelection=True,
                  nativeDragonSentToGraveyard=True, oncePerTurnCoreActionRemoved=True,
                  publicGraveyardProjection=True, pageErrors=errors)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--base-url')
    parser.add_argument('--dist', type=Path, default=ROOT / 'dist')
    parser.add_argument('--output', type=Path, default=ROOT / 'docs/audits/artifacts/native-duel-ui-2026-10-07')
    parser.add_argument('--chromium', default='/usr/bin/chromium')
    parser.add_argument('--only-ravine', action='store_true', help='Debug the cost flow without rerunning completed viewport flows')
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    headers = production_headers()
    server = None
    compiled_before = compiled_fingerprints(args.dist) if not args.base_url else None
    if not args.base_url:
        assert (args.dist / 'index.html').is_file(), 'Build the production bundle first'
        AuditServer.headers_to_add = headers
        server = ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(AuditServer, directory=str(args.dist)))
        threading.Thread(target=server.serve_forever, daemon=True).start()
        args.base_url = f'http://127.0.0.1:{server.server_port}'
    report = {'ok': False, 'target': 'compiled production bundle', 'productionCsp': headers['Content-Security-Policy'], 'viewports': [], 'ravineCost': {}}
    report_path = args.output / ('ravine-debug-report.json' if args.only_ravine else 'report.json')
    draft, rows = custom_deck_fixture()
    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(executable_path=args.chromium, headless=True,
                args=['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
            request_context = browser.new_context()
            served_before = served_fingerprints(request_context.request, args.base_url)
            report['servedResponseFingerprintsBefore'] = served_before
            report['testedWasmSha256'] = served_before['native/ocgcore.sync.wasm']['sha256']
            if compiled_before is not None:
                report['compiledSnapshotBefore'] = compiled_before
                assert served_before == compiled_before, 'Served responses differ from the frozen compiled snapshot'
            request_context.close()
            for width, height in ([] if args.only_ravine else [(1280, 900), (390, 844)]):
                context = browser.new_context(viewport={'width': width, 'height': height}, reduced_motion='reduce')
                page = context.new_page()
                page.set_default_timeout(30000)
                view = {'width': width, 'height': height, 'checks': {}}
                report['viewports'].append(view)
                verify_page(page, args.base_url, view, args.output, width, height, draft, rows)
                context.close()
            context = browser.new_context(viewport={'width': 1280, 'height': 900}, reduced_motion='reduce')
            page = context.new_page()
            page.set_default_timeout(30000)
            verify_ravine(page, args.base_url, report['ravineCost'], args.output, draft)
            context.close()
            request_context = browser.new_context()
            served_after = served_fingerprints(request_context.request, args.base_url)
            request_context.close()
            report['servedResponseFingerprintsAfter'] = served_after
            assert served_before == served_after, 'Served compiled assets changed during the audit'
            if compiled_before is not None:
                compiled_after = compiled_fingerprints(args.dist)
                report['compiledSnapshotAfter'] = compiled_after
                report['immutableCompiledSnapshot'] = compiled_before == compiled_after
                assert compiled_before == compiled_after, 'Local compiled snapshot changed during the audit'
            browser.close()
        report['ok'] = True
    except Exception as error:
        report['failure'] = {'type': type(error).__name__, 'message': str(error)[:1200]}
        raise
    finally:
        report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
        if server:
            server.shutdown()
    print(json.dumps(report, ensure_ascii=False))


if __name__ == '__main__':
    main()
