#!/usr/bin/env python3
"""Frozen native game: Terraforming reveals a card, then Live Stage resolves.

The forty-card Deck and initial RNG are registered before the Duel. All later
actions use visible controls, including keyboard details and closing the panel.
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
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('continuation_model_helpers', ROOT / 'scripts/audit-continuation-models-ui.py')
models = importlib.util.module_from_spec(spec)
spec.loader.exec_module(models)
ui = models.ui


def fixture():
    draft = models.fixture()
    for index, code in [(25, '73628505'), (4, '43422537'), (18, '5053103'),
                        (14, '66602787'), (11, '5318639'), (20, '51208046')]:
        draft['main'][index] = code
    assert len(draft['main']) == 40 and max(Counter(draft['main']).values()) <= 3
    return draft


def verify(page, base_url, output, item, draft):
    errors, failures = [], []
    item.update(errors=errors, nativeFailures=failures, actions=[])
    page.on('pageerror', lambda error: errors.append(str(error)[:500]))
    page.on('requestfailed', lambda request: failures.append(request.url.split('/')[-1]) if '/native/' in request.url else None)
    page.add_init_script(ui.RNG_FIXTURE)
    page.add_init_script(f"localStorage.setItem('ygo_custom_deck', {json.dumps(json.dumps(draft))});")
    response = page.goto(base_url, wait_until='domcontentloaded')
    assert response.header_value('content-security-policy') == ui.production_headers()['Content-Security-Policy']
    page.locator('input[name="game-mode"][value="native"]').check()
    page.locator('[data-deck-id="custom"]').click()
    ui.wait_until(page, "() => document.querySelector('#builder-catalogue-status')?.textContent.includes('cartes avec règles natives')")
    assert page.locator('#deck-validity-badge').inner_text() == 'Deck valide'
    page.locator('#btn-start-duel').click()
    ui.wait_until(page, "() => !document.querySelector('#start-modal').checkVisibility() || [...document.querySelectorAll('#decision-options button')].some(b=>b.checkVisibility())")
    first = page.get_by_role('button', name='JE COMMENCE', exact=True)
    if first.is_visible(): first.click()
    page.locator('#start-modal').wait_for(state='hidden')
    page.wait_for_selector('#player-hand .card-entity')
    ui.await_player_main(page)
    item['openingOwnHand'] = models.snapshot(page)['ownHand']
    assert {c['id'] for c in item['openingOwnHand']} == {'73628505', '43422537', '5053103', '66602787', '5318639'}
    models.switch_view(page, 'real')
    models.activate_hand_spell(page, '73628505', item, 'Trickstar Live Stage|Scène Live', '51208046')
    panel = page.locator('.public-card-confirmation')
    panel.wait_for(state='visible')
    assert page.locator('.private-card-inspection:not(.public-card-confirmation)').count() == 0
    button = panel.locator('.private-card-inspection-card')
    assert button.count() == 1
    button.focus(); page.keyboard.press('Enter')
    item['publicPanel'] = panel.evaluate("""panel => ({title:panel.querySelector('h2').textContent,
      name:panel.querySelector('h3').textContent,description:panel.querySelector('.private-card-inspection-description').textContent,
      label:panel.querySelector('.private-card-inspection-card').getAttribute('aria-label'),
      imageLoaded:panel.querySelector('img').complete && panel.querySelector('img').naturalWidth>0,
      role:panel.getAttribute('role'),modal:panel.getAttribute('aria-modal'),
      rect:(()=>{const r=panel.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height};})(),
      buttonHeight:panel.querySelector('button').getBoundingClientRect().height})""")
    assert item['publicPanel']['title'] == 'Cartes révélées'
    assert 'Trickstar' in item['publicPanel']['name'] and item['publicPanel']['description']
    assert 'privée' not in item['publicPanel']['label']
    assert item['publicPanel']['role'] == 'region' and item['publicPanel']['modal'] is None
    assert item['publicPanel']['buttonHeight'] >= 44
    rect = item['publicPanel']['rect']
    assert rect['x'] >= 0 and rect['x'] + rect['width'] <= item['width'] + 1
    item['publicLogAfterReveal'] = page.locator('#log-content').inner_text()
    assert 'Carte révélée' in item['publicLogAfterReveal']
    page.screenshot(path=str(output / f'public-confirmed-{item["width"]}.png'), animations='disabled')
    page.keyboard.press('Escape'); panel.wait_for(state='detached')
    item['keyboardClosePassed'] = True
    models.place_public_card(page, '51208046', 'field', True, item, output)
    ui.await_player_main(page)
    models.views.wait_real_projection(page)
    item['afterField'] = models.snapshot(page)
    assert item['afterField']['playerLp'] == item['afterField']['opponentLp'] == 8000
    item['liveFieldDom'] = page.locator('#player-field-zone').evaluate("zone=>({id:zone.querySelector('[data-id]')?.dataset.id,text:zone.innerText})")
    assert item['liveFieldDom']['id'] == '51208046'
    page.screenshot(path=str(output / f'public-live-stage-{item["width"]}.png'), animations='disabled')
    item['cspViolations'] = page.evaluate('window.__auditCspViolations || []')
    assert page.evaluate('typeof window.__YGO_QA__') == 'undefined'
    assert not errors and not failures and not item['cspViolations']
    item['ok'] = True


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--expected-entry-sha256', required=True)
    parser.add_argument('--dist', type=Path, default=ROOT / 'dist')
    parser.add_argument('--output', type=Path, default=ROOT / 'docs/audits/artifacts/continuation-public-ui-2026-10-08')
    args = parser.parse_args()
    local, essential = models.compiled_wave_fingerprints(args.dist)
    entry = next(path for path in local if re.fullmatch(r'assets/index-[^/]+\.js', path))
    assert local[entry]['sha256'] == args.expected_entry_sha256
    args.output.mkdir(parents=True, exist_ok=True)
    ui.AuditServer.headers_to_add = ui.production_headers()
    server = ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(ui.AuditServer, directory=str(args.dist)))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    base = f'http://127.0.0.1:{server.server_port}'
    draft = fixture()
    report = {'ok': False, 'date': '2026-10-08', 'scope': 'Actual frozen compiled native game; Terraforming search, source-authorized public confirmation and Live Stage activation, no post-start fixture or debug hook.',
              'expectedEntrySha256': args.expected_entry_sha256, 'fixture': draft, 'essentialBuildAssets': essential,
              'viewports': [], 'productionCsp': ui.production_headers()['Content-Security-Policy'],
              'dependencies': {str(p.relative_to(ROOT)): {'bytes': p.stat().st_size, 'sha256': hashlib.sha256(p.read_bytes()).hexdigest()} for p in [Path(__file__), ROOT/'main.js', ROOT/'style.css', ROOT/'src/ui/PrivateCardInspection.js', ROOT/'src/ui/PublicCardConfirmation.js', ROOT/'src/core/native/NativePublicRevealPolicy.js', ROOT/'src/core/native/NativeDuelVisualEvents.js']}}
    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
            context = browser.new_context()
            before = models.fingerprints(context.request, base, local); context.close()
            assert before == local
            for width, height in [(1280, 900), (390, 844)]:
                context = browser.new_context(viewport={'width': width, 'height': height})
                item = {'width': width, 'height': height}; report['viewports'].append(item)
                verify(context.new_page(), base, args.output, item, draft); context.close()
            context = browser.new_context(); after = models.fingerprints(context.request, base, local); context.close()
            assert before == after == local and models.compiled_wave_fingerprints(args.dist)[0] == local
            report.update(ok=True, servedResponsesBefore=before, servedResponsesAfter=after, buildUnchanged=True,
                          captureSha256={p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in args.output.glob('public-*.png')})
            browser.close()
    except Exception as error:
        report['failure'] = {'type': type(error).__name__, 'message': str(error)[:1500]}; raise
    finally:
        (args.output / 'report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n'); server.shutdown()
    print(json.dumps({'ok':report['ok'],'captures':len(report['captureSha256']),'viewports':len(report['viewports'])}))


if __name__ == '__main__': main()
