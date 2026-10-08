#!/usr/bin/env python3
"""Verify the compiled Field atlas through its public desktop/mobile controls."""
import argparse
import functools
import hashlib
import importlib.util
import json
from http.server import ThreadingHTTPServer
from pathlib import Path
import re
import threading

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]

def load_helper(name, filename):
    spec = importlib.util.spec_from_file_location(name, ROOT / 'scripts' / filename)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module

helper = load_helper('atlas_native_ui', 'audit-native-duel-ui.py')
provenance = load_helper('atlas_native_views', 'audit-native-duel-views.py')
REPRESENTATIVES = [('stage', '67616300'), ('arcane', '74665651'),
                   ('engineering', '59054773'), ('community', '43175858'),
                   ('ritual', '48179391'), ('frontier', '57554544')]

def await_preview(page):
    helper.wait_until(page, "() => document.querySelector('#field-atlas-preview-status').textContent.startsWith('Vue 3D :')")
    canvas = page.locator('#field-atlas-canvas canvas')
    assert canvas.count() == 1
    box = canvas.bounding_box()
    assert box and box['width'] > 30 and box['height'] > 30
    helper.wait_until(page, "() => { const i=document.querySelector('#field-atlas-source'); return i.complete && i.naturalWidth>0 && i.naturalHeight>0; }")
    return canvas

def verify(page, base_url, width, height, expected, output, view):
    errors, failures = [], []
    page.on('pageerror', lambda error: errors.append(str(error)[:500]))
    page.on('requestfailed', lambda request: failures.append({'path': request.url.split(base_url)[-1], 'error': request.failure}))
    page.add_init_script("window.__atlasCsp=[]; addEventListener('securitypolicyviolation', e=>window.__atlasCsp.push({directive:e.effectiveDirective,blocked:e.blockedURI==='inline'?'inline':'resource'}));")
    page.goto(base_url, wait_until='networkidle')
    page.locator('#btn-open-field-atlas').click()
    helper.wait_until(page, "() => document.querySelector('#field-atlas-summary').textContent.includes('illustrations originales')")
    summary = page.locator('#field-atlas-summary').inner_text()
    assert '339 Terrains' in summary and '339 illustrations originales' in summary
    assert f'{expected} volumes reconstruits' in summary and '339 effets disponibles' in summary
    assert page.evaluate('typeof window.__YGO_QA__') == 'undefined'
    await_preview(page)
    seen, pages = set(), 0
    while True:
        ids = page.locator('#field-atlas-list [data-field-id]').evaluate_all('(items)=>items.map(i=>i.dataset.fieldId)')
        assert ids and not seen.intersection(ids), 'Pagination repeats a Field'
        seen.update(ids)
        pages += 1
        if page.locator('#field-atlas-next').is_disabled():
            break
        page.locator('#field-atlas-next').click()
        assert pages <= 29
    assert len(seen) == 339 and pages == 29
    # The complete catalogue contains 28 full pages plus its final three cards.
    # PAGE_SIZE is 12: 339 cards occupy 29 pages.
    view['catalogue'] = {'uniqueFields': len(seen), 'pages': pages, 'summary': summary}
    page.locator('#field-atlas-filter').select_option('source-reconstructed')
    result = page.locator('#field-atlas-results').inner_text()
    assert int(re.match(r'(\d+)', result).group(1)) == expected
    view['reconstructedFilter'] = result
    page.locator('#field-atlas-filter').select_option('pending-reconstruction')
    result = page.locator('#field-atlas-results').inner_text()
    assert int(re.match(r'(\d+)', result).group(1)) == 339 - expected
    view['pendingFilter'] = result
    if expected == 339:
        assert page.locator('#field-atlas-empty').is_visible()
        assert page.locator('#field-atlas-canvas canvas').count() == 0
    page.locator('#field-atlas-filter').select_option('all')
    for lot, code in REPRESENTATIVES:
        page.locator('#field-atlas-search').fill(code)
        assert page.locator('#field-atlas-list [data-field-id]').count() == 1
        assert page.locator('#field-atlas-list [data-field-id]').get_attribute('data-field-id') == code
        canvas = await_preview(page)
        assert page.locator('#field-atlas-source').get_attribute('src') == f'/environments/field-art/{code}.jpg'
        assert 'Volumes reconstruits depuis' in page.locator('#field-atlas-model-status').inner_text()
        assert 'initialisation vérifiée' in page.locator('#field-atlas-rule-status').inner_text()
        assert page.locator('#field-atlas-effect').inner_text().strip()
        record = {'lot': lot, 'code': code, 'name': page.locator('#field-atlas-name').inner_text(), 'angles': []}
        for angle, label in [('0', 'face'), ('0.65', 'three-quarter'), ('1.57', 'side')]:
            page.locator(f'[data-atlas-angle="{angle}"]').click()
            canvas.scroll_into_view_if_needed()
            path = output / f'{width}-{lot}-{code}-{label}.jpg'
            canvas.screenshot(path=str(path), type='jpeg', quality=88)
            record['angles'].append({'angle': label, 'image': path.name, 'sha256': hashlib.sha256(path.read_bytes()).hexdigest()})
        assert len({entry['sha256'] for entry in record['angles']}) == 3, 'Angle controls did not alter the rendered image'
        if lot in ['stage', 'frontier']:
            path = output / f'{width}-{lot}-public-atlas.jpg'
            page.screenshot(path=str(path), type='jpeg', quality=88)
            record['publicCapture'] = path.name
        view.setdefault('representatives', []).append(record)
    page.locator('#field-atlas-search').fill('zzzz-terrain-inexistant')
    assert page.locator('#field-atlas-empty').is_visible()
    assert page.locator('#field-atlas-canvas canvas').count() == 0
    page.locator('#field-atlas-search').fill('0002674965')
    assert page.locator('#field-atlas-list [data-field-id]').get_attribute('data-field-id') == '2674965'
    await_preview(page)
    page.locator('#btn-close-field-atlas').click()
    assert page.locator('#field-atlas-canvas canvas').count() == 0
    page.locator('#btn-open-field-atlas').click()
    await_preview(page)
    page.locator('#btn-close-field-atlas').click()
    assert page.locator('#field-atlas-canvas canvas').count() == 0
    assert page.evaluate('document.body.scrollWidth <= innerWidth'), 'Responsive body overflows'
    view.update(ok=True, pageErrors=errors, requestFailures=failures,
                cspViolations=page.evaluate('window.__atlasCsp'),
                closeAndReopenDisposesCanvas=True, exactPasscode=True, emptySearch=True)
    assert not errors and not failures and not view['cspViolations']

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--base-url')
    parser.add_argument('--dist', type=Path, default=ROOT / 'dist')
    parser.add_argument('--output', type=Path, default=ROOT / 'docs/audits/artifacts/field-atlas-ui-2026-10-07')
    parser.add_argument('--expected-reconstructed', type=int, default=339)
    parser.add_argument('--chromium', default='/usr/bin/chromium')
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    server = None
    headers = helper.production_headers()
    if not args.base_url:
        assert (args.dist / 'index.html').is_file()
        helper.AuditServer.headers_to_add = headers
        server = ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(helper.AuditServer, directory=str(args.dist)))
        threading.Thread(target=server.serve_forever, daemon=True).start()
        args.base_url = f'http://127.0.0.1:{server.server_port}'
    report = {'ok': False, 'method': 'compiled production bundle, public controls and DOM only; no game injection',
              'productionCsp': headers['Content-Security-Policy'], 'expectedReconstructed': args.expected_reconstructed,
              'scope': '339-card pagination, evidence filters and six representative 3D previews; complete spatial 1:1 fidelity is not certified',
              'viewports': []}
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(executable_path=args.chromium, headless=True,
                args=['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
            context = browser.new_context()
            provenance.record_build_provenance(context.request, args.base_url, report)
            context.close()
            for width, height in [(1280, 900), (390, 844)]:
                context = browser.new_context(viewport={'width': width, 'height': height}, reduced_motion='reduce')
                view = {'width': width, 'height': height, 'ok': False}
                report['viewports'].append(view)
                verify(context.new_page(), args.base_url, width, height, args.expected_reconstructed, args.output, view)
                context.close()
            context = browser.new_context()
            final = {}
            provenance.record_build_provenance(context.request, args.base_url, final)
            assert all(report[key] == value for key, value in final.items()), 'Build changed during audit'
            context.close()
            browser.close()
            report['buildUnchangedDuringAudit'] = True
        report['captureSha256'] = {path.name: hashlib.sha256(path.read_bytes()).hexdigest() for path in sorted(args.output.glob('*.jpg'))}
        report['ok'] = True
    except Exception as error:
        report['failure'] = {'type': type(error).__name__, 'message': str(error)[:1500]}
        raise
    finally:
        (args.output / 'report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
        if server:
            server.shutdown()
    print(json.dumps({'ok': report['ok'], 'indexSha256': report['testedIndexSha256'],
                      'viewports': [{'width': v['width'], 'fields': v['catalogue']['uniqueFields']} for v in report['viewports']]}))

if __name__ == '__main__':
    main()
