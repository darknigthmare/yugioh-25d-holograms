#!/usr/bin/env python3
"""Check Umi's shared printed-name copy limit through production deck controls."""
import argparse
import json
from pathlib import Path
from playwright.sync_api import sync_playwright


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--base-url', default='http://127.0.0.1:4173')
    parser.add_argument('--output', type=Path, default=Path(__file__).resolve().parents[1] / 'docs/audits/artifacts')
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox'])
        page = browser.new_page(viewport={'width': 1440, 'height': 1000})
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto(args.base_url, wait_until='networkidle')
        page.locator('[data-deck-id="custom"]').click()
        page.locator('[data-builder-preset="kaiba"]').click()
        umi = page.locator('#library-cards-list [data-card-id="22702055"]')
        ocean = page.locator('#library-cards-list [data-card-id="295517"]')
        umi.click()
        umi.click()
        page.locator('#builder-add-to-side').check()
        ocean.click()
        for button in [umi, ocean]:
            assert button.is_disabled()
            assert button.locator('.builder-card-count').inner_text() == '3/3'
        stored = page.evaluate('JSON.parse(localStorage.getItem("ygo_custom_deck"))')
        assert stored['main'].count('22702055') == 2
        assert stored['side'].count('295517') == 1
        assert page.locator('#deck-validity-badge').inner_text() == 'Deck valide'
        page.locator('#builder-my-deck-list button[aria-label="Retirer Océan Légendaire du Side Deck"]').click()
        for button in [umi, ocean]:
            assert not button.is_disabled()
            assert button.locator('.builder-card-count').inner_text() == '2/3'
        assert errors == [], errors
        report = {'baseUrl': args.base_url, 'realButtons': True,
            'sharedNameLimit': 3, 'mixedMainAndSide': True, 'remainingCopyRestoredAfterRemoval': True,
            'physicalCardIdsPreserved': True, 'pageErrors': errors}
        (args.output / 'umi-name-browser-2026-10-07.json').write_text(json.dumps(report, indent=2) + '\n')
        print(json.dumps(report))
        browser.close()


if __name__ == '__main__':
    main()
