#!/usr/bin/env python3
"""Exercise the public terrain atlas, with real WebGL, desktop and touch UI.

No QA hook, renderer stub, delays override or dependency change is needed.
Runs against a dev server or a compiled production preview.
"""
import argparse
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]


def ready_preview(page):
    page.wait_for_function("document.querySelector('#field-atlas-preview-status').textContent.startsWith('Vue 3D :')", timeout=30000)
    assert page.locator('#field-atlas-canvas canvas').count() == 1
    page.wait_for_function("document.querySelector('#field-atlas-source').complete && document.querySelector('#field-atlas-source').naturalWidth > 0")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--base-url', default='http://127.0.0.1:5174')
    parser.add_argument('--output', type=Path, default=ROOT / 'docs/audits/artifacts')
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    report = {'baseUrl': args.base_url, 'devices': []}
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True,
            args=['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
        for name, viewport, touch in [('desktop', {'width': 1440, 'height': 1000}, False), ('mobile', {'width': 390, 'height': 844}, True)]:
            context = browser.new_context(viewport=viewport, has_touch=touch)
            page = context.new_page()
            errors, failures = [], []
            page.on('pageerror', lambda error: errors.append(str(error)))
            page.on('response', lambda response: failures.append(response.status) if response.status >= 400 else None)
            page.goto(args.base_url, wait_until='networkidle')
            assert '80 cartes' in page.locator('#simulator-card-coverage').text_content()
            page.locator('#btn-open-field-atlas').click()
            ready_preview(page)
            assert '339 Terrains' in page.locator('#field-atlas-summary').inner_text()
            if name == 'desktop':
                assert page.locator('.field-atlas-content').bounding_box()['width'] >= 1000
            assert '29 effets jouables' in page.locator('#field-atlas-summary').inner_text()
            assert page.locator('#field-atlas-list button').count() == 12
            assert page.evaluate("document.activeElement.id") == 'field-atlas-search'
            page.locator('#field-atlas-search').fill('monde zombie')
            ready_preview(page)
            assert page.locator('#field-atlas-list [data-field-id="4064256"]').count() == 1
            assert page.locator('#field-atlas-name').inner_text() == 'Zombie World'
            assert page.locator('#field-atlas-rules-link').get_attribute('href').startswith('https://www.db.yugioh-card.com/')
            page.locator('#field-atlas-search').fill('02084239')
            ready_preview(page)
            assert page.locator('#field-atlas-list [data-field-id="2084239"]').count() == 1
            page.locator('#field-atlas-search').fill('zzzz-no-field')
            assert page.locator('#field-atlas-empty').is_visible()
            assert page.locator('#field-atlas-canvas canvas').count() == 0
            page.locator('#field-atlas-search').fill('')
            page.locator('#field-atlas-filter').select_option('playable')
            ready_preview(page)
            assert page.locator('#field-atlas-results').inner_text().startswith('29 Terrains')
            visited = []
            while True:
                visited += page.locator('#field-atlas-list button').evaluate_all('(nodes)=>nodes.map(n=>n.dataset.fieldId)')
                if page.locator('#field-atlas-next').is_disabled():
                    break
                page.locator('#field-atlas-next').click()
                ready_preview(page)
            assert len(set(visited)) == len(visited) == 29
            page.locator('#field-atlas-filter').select_option('pending-rules')
            ready_preview(page)
            assert page.locator('#field-atlas-results').inner_text().startswith('310 Terrains')
            page.locator('#field-atlas-filter').select_option('all')
            page.locator('#field-atlas-search').fill('12845564')
            ready_preview(page)
            assert 'Sortie annoncée 2026-10-08' in page.locator('#field-atlas-publication').inner_text()
            assert page.locator('#field-atlas-rule-status').inner_text() == 'Effet à intégrer au moteur de duel'
            page.locator('#field-atlas-search').fill('295517')
            ready_preview(page)
            page.locator('[data-atlas-angle="0.65"]').click()
            style = page.locator('#field-atlas-source').evaluate('(e)=>({fit:getComputedStyle(e).objectFit,filter:getComputedStyle(e).filter})')
            assert style == {'fit': 'contain', 'filter': 'none'}
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
            page.locator('#field-atlas-detail').scroll_into_view_if_needed()
            page.screenshot(path=str(args.output / f'field-atlas-{name}-2026-10-07.png'), full_page=False)
            page.keyboard.press('Escape')
            assert page.locator('#start-modal').is_visible()
            assert page.locator('#field-atlas-canvas canvas').count() == 0
            page.wait_for_function("document.activeElement.id === 'btn-open-field-atlas'")
            page.locator('#btn-open-field-atlas').click()
            ready_preview(page)
            page.locator('#btn-close-field-atlas').click()
            assert page.locator('#field-atlas-canvas canvas').count() == 0
            assert page.locator('#start-modal').is_visible()
            assert errors == [], errors
            assert failures == [], failures
            report['devices'].append({'device': name, 'playableFieldsVisited': len(visited),
                'keyboardReturn': True, 'singleCanvasAndDisposal': True, 'originalArtContain': style,
                'errors': errors, 'failedHttp': failures})
            context.close()
        browser.close()
    (args.output / 'field-atlas-browser-2026-10-07.json').write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps(report))


if __name__ == '__main__':
    main()
