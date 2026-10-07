#!/usr/bin/env python3
"""Verify strict custom deck UI → Match → restored Side Deck → actual Duel 2.

Use the local DEV server because __YGO_QA__ supplies only the Duel 1 result.
All construction, launch decisions and Side Deck exchanges use real controls.
The empty local draft fixture exercises restoration from the saved Match.
python scripts/verify-custom-deck-browser.py --base-url http://127.0.0.1:5174
Requires Python Playwright and a Chromium executable; no app dependency added.
"""
import argparse
from collections import Counter
import json
import traceback
from pathlib import Path
from playwright.sync_api import sync_playwright


def canonical(value):
    return str(value).lstrip("0") or "0"


def deck_sizes(deck):
    return {section: len(deck[section]) for section in ("mainDeck", "extraDeck", "sideDeck")}


def deck_ids(deck):
    return {section: [canonical(card["id"]) for card in deck[section]]
            for section in ("mainDeck", "extraDeck", "sideDeck")}


def get_match(page):
    return page.evaluate("window.__YGO_QA__.getMatchView()")


def assert_registered_sizes(view):
    player = next(player for player in view["players"] if player["id"] == "player")
    assert player["hasRegisteredDeck"]
    assert player["activeDeckSizes"] == {"mainDeck": 40, "extraDeck": 3, "sideDeck": 7}, player


def scroll_modal_to(page, target, modal="#start-modal .modal-content"):
    """Scroll the actual dialog, not the obscured page below its fixed overlay."""
    page.locator(modal).evaluate("""(element, selector) => {
      const target = document.querySelector(selector);
      const top = target.getBoundingClientRect().top - element.getBoundingClientRect().top + element.scrollTop;
      element.scrollTop = Math.max(0, top - 14);
    }""", target)


def snapshot(page, path):
    page.screenshot(path=str(path), full_page=False, animations="disabled")


def verify(page, report, output):
    page.goto(report["baseUrl"], wait_until="domcontentloaded")
    page.wait_for_function("Boolean(window.__YGO_QA__)")
    page.locator('[data-deck-id="custom"]').click()
    assert page.locator('#library-cards-list button').count() == 80
    page.locator('[data-builder-preset="kaiba"]').click()
    assert page.locator('#deck-size-val').inner_text() == 'Main: 40 / Extra: 3 / Side: 5'
    assert page.locator('#deck-validity-badge').inner_text() == 'Deck valide'
    assert page.locator('#library-cards-list [data-card-id="55144522"]').is_disabled()
    assert page.locator('#library-cards-list [data-card-id="83764718"]').is_disabled()
    page.locator('#builder-add-to-side').check()
    wetlands = page.locator('#library-cards-list [data-card-id="2084239"]')
    for _ in range(3):
        wetlands.click()
    assert wetlands.is_disabled()
    initial = page.evaluate('JSON.parse(localStorage.getItem("ygo_custom_deck"))')
    assert tuple(len(initial[section]) for section in ('main', 'extra', 'side')) == (40, 3, 8)
    assert initial['side'].count('2084239') == 3
    assert initial['main'].count('55144522') == 0
    assert initial['main'].count('83764718') == 1
    report["checks"]["strictLibraryAndLimits"] = {"library": 80, "presetSizes": [40, 3, 5],
        "potForbidden": True, "rebornLimitedOne": True, "combinedWetlandsLimitThree": True}

    page.reload(wait_until="domcontentloaded")
    page.locator('[data-deck-id="custom"]').click()
    assert page.locator('#deck-size-val').inner_text() == 'Main: 40 / Extra: 3 / Side: 8'
    page.get_by_role('button', name='Retirer Plaines Marécageuses du Side Deck', exact=True).first.click()
    page.locator('#builder-add-to-side').check()
    assert not page.locator('#library-cards-list [data-card-id="2084239"]').is_disabled()
    page.locator('input[name="duel-series"][value="match"]').check()
    page.locator('input[name="ai-difficulty"][value="easy"]').check()
    assert page.locator('[data-deck-id="custom"]').get_attribute('aria-pressed') == 'true'
    assert not page.locator('#btn-start-duel').is_disabled()
    saved = page.evaluate('JSON.parse(localStorage.getItem("ygo_custom_deck"))')
    assert tuple(len(saved[section]) for section in ('main', 'extra', 'side')) == (40, 3, 7)
    expected = {key: [canonical(value) for value in saved[source]] for key, source in
                (('mainDeck', 'main'), ('extraDeck', 'extra'), ('sideDeck', 'side'))}
    report["checks"]["builderReloadPreserved"] = True
    report["checks"]["savedCustomDeckBeforeMatch"] = expected

    page.evaluate('() => document.fonts.ready.then(() => true)')
    fonts = page.evaluate("""() => [...document.fonts].map(face => ({family: face.family.replaceAll('"', ''), status: face.status}))""")
    assert all(any(face['family'] == family and face['status'] == 'loaded' for face in fonts)
               for family in ('Inter', 'Orbitron')), fonts
    assert not any('fonts.googleapis.com' in url or 'fonts.gstatic.com' in url for url in report['fontRequests'])
    report['checks']['selfHostedFontsLoaded'] = {'faces': fonts, 'externalGoogleFontRequests': 0}
    scroll_modal_to(page, '#deck-builder-section')
    snapshot(page, output / 'custom-deck-builder-desktop-2026-10-07.png')
    page.set_viewport_size({'width': 390, 'height': 844})
    assert page.evaluate('document.body.scrollWidth') == 390
    scroll_modal_to(page, '#deck-builder-section')
    page.locator('#library-cards-list').evaluate('(element) => element.scrollTop = 0')
    library_bounds = page.locator('#library-cards-list').bounding_box()
    assert library_bounds and library_bounds['y'] < 650 and library_bounds['y'] + library_bounds['height'] > 140
    snapshot(page, output / 'custom-deck-builder-mobile-library-2026-10-07.png')
    scroll_modal_to(page, '.builder-panels > .builder-panel:nth-child(2)')
    page.locator('#builder-my-deck-list').evaluate('(element) => element.scrollTop = 0')
    assert page.locator('#deck-size-val').is_visible()
    assert page.locator('#deck-size-val').inner_text() == 'Main: 40 / Extra: 3 / Side: 7'
    snapshot(page, output / 'custom-deck-builder-mobile-main-2026-10-07.png')
    page.locator('#builder-my-deck-list').evaluate("""(element) => {
      const section = [...element.querySelectorAll('.builder-section-title')].find(title => title.textContent.includes('Extra'));
      element.scrollTop += section.getBoundingClientRect().top - element.getBoundingClientRect().top;
    }""")
    snapshot(page, output / 'custom-deck-builder-mobile-extra-side-2026-10-07.png')
    report["checks"]["mobileBuilderBeforeLaunch"] = {"viewport": [390, 844], "bodyWidth": 390,
        "actualBuilderShown": True, "libraryButtons": 64, "deckSizes": [40, 3, 7],
        "screenshotsUseViewportAndDialogScroll": True}

    page.set_viewport_size({'width': 1280, 'height': 800})
    page.locator('#btn-start-duel').click()
    page.wait_for_function("""() => {
      const choice = [...document.querySelectorAll('button')].some(button => button.textContent.trim() === 'JE COMMENCE' && button.getClientRects().length);
      return choice || window.__YGO_QA__.getMatchView()?.status === 'active';
    }""")
    opening_choice = page.get_by_role('button', name='JE COMMENCE', exact=True)
    if opening_choice.is_visible():
        opening_choice.click()
        report["checks"]["openingFirstPlayerChoiceClicked"] = True
    else:
        report["checks"]["openingFirstPlayerChoiceClicked"] = False
    page.wait_for_function("""() => {
      const view = window.__YGO_QA__.getMatchView(), game = window.__YGO_QA__.getGame();
      return view?.status === 'active' && view.gameNumber === 1 && game && !game._duelEnded
        && game.playerDeck.length + game.playerHand.length === 40 && game.playerExtraDeck.length === 3;
    }""")
    launch = get_match(page)
    assert_registered_sizes(launch)
    report["checks"]["actualMatchDuelOneRegistration"] = launch

    assert page.evaluate("window.__YGO_QA__.finishDuel('opponent')") is not False
    page.get_by_role('button', name='PRÉPARER LE DUEL SUIVANT', exact=True).click()
    page.locator('#side-deck-modal').wait_for(state='visible')
    between = get_match(page)
    assert between['status'] == 'between_games' and between['scores'] == {'player': 0, 'opponent': 1}
    assert between['nextDuel']['chooserPlayerId'] == 'player'
    assert_registered_sizes(between)
    persisted = page.evaluate('JSON.parse(localStorage.getItem("ygo_active_match_v1"))')
    assert persisted['selectedDeckId'] == 'custom'
    state = json.loads(persisted['controller'])['engine']['state']
    registered = deck_ids(state['registeredDecks']['player'])
    assert registered == expected
    assert deck_sizes(state['activeDecks']['player']) == {'mainDeck': 40, 'extraDeck': 3, 'sideDeck': 7}
    report["checks"]["actualRegisteredSnapshot"] = registered
    report["checks"]["sideDeckDialogOpenedByResultButton"] = True

    # Deliberately erase only the editable local draft, preserving the saved
    # Match. This is a persistence fixture, not a deck mutation inside the game.
    page.evaluate("localStorage.setItem('ygo_custom_deck', JSON.stringify({main: [], extra: [], side: []}))")
    assert page.evaluate('JSON.parse(localStorage.getItem("ygo_active_match_v1")).controller') == persisted['controller']
    page.reload(wait_until="domcontentloaded")
    page.locator('#side-deck-modal').wait_for(state='visible')
    restored = get_match(page)
    assert restored['status'] == 'between_games' and restored['scores'] == between['scores']
    assert_registered_sizes(restored)
    assert page.locator('[data-deck-id="custom"]').get_attribute('aria-pressed') == 'true'
    assert page.evaluate('JSON.parse(localStorage.getItem("ygo_custom_deck"))') == {'main': [], 'extra': [], 'side': []}
    assert page.locator('#btn-start-next-duel').is_disabled()
    report["checks"]["restoredMatchWithEmptyBuilderDraft"] = {"customSelected": True,
        "scores": restored['scores'], "registeredSizes": [40, 3, 7], "builderDraftSizes": [0, 0, 0]}

    page.locator('input[name="next-first-player"][value="player"]').check()
    assert not page.locator('#btn-start-next-duel').is_disabled()
    assert get_match(page)['nextDuel']['firstPlayerId'] == 'player'
    page.reload(wait_until="domcontentloaded")
    page.locator('#side-deck-modal').wait_for(state='visible')
    assert page.locator('input[name="next-first-player"][value="player"]').is_checked()
    assert get_match(page)['nextDuel']['firstPlayerId'] == 'player'
    assert_registered_sizes(get_match(page))
    assert not page.locator('#btn-start-next-duel').is_disabled()
    report["checks"]["firstPlayerChoiceReloadPreserved"] = True

    first_main = page.locator('.side-deck-card[data-section="mainDeck"][data-index="0"]')
    main_name = first_main.inner_text()
    side_wetlands = page.locator('.side-deck-card[data-section="sideDeck"]').filter(has_text='Plaines Marécageuses').first
    side_index = int(side_wetlands.get_attribute('data-index'))
    assert expected['sideDeck'][side_index] == '2084239'
    first_main.click()
    side_wetlands.click()
    assert page.locator('.side-deck-card[data-section="mainDeck"][data-index="0"]').inner_text() == 'Plaines Marécageuses'
    assert page.locator(f'.side-deck-card[data-section="sideDeck"][data-index="{side_index}"]').inner_text() == main_name
    assert tuple(page.locator(f'.side-deck-card[data-section="{section}"]').count()
                 for section in ('mainDeck', 'extraDeck', 'sideDeck')) == (40, 3, 7)
    assert 'échangées' in page.locator('#side-deck-feedback').inner_text()
    sided = {section: list(ids) for section, ids in expected.items()}
    sided['mainDeck'][0], sided['sideDeck'][side_index] = sided['sideDeck'][side_index], sided['mainDeck'][0]
    assert Counter(sum(expected.values(), [])) == Counter(sum(sided.values(), []))
    report["checks"]["realMainSideWetlandsSwap"] = {"mainCardRemoved": main_name,
        "sideIndex": side_index, "sizesPreserved": [40, 3, 7], "cardPoolPreserved": True, "expectedDeck": sided}
    scroll_modal_to(page, '#side-deck-title', '#side-deck-modal .modal-content')
    snapshot(page, output / 'custom-match-side-deck-2026-10-07.png')

    page.locator('#btn-start-next-duel').click()
    page.wait_for_function("""() => {
      const view = window.__YGO_QA__.getMatchView(), game = window.__YGO_QA__.getGame();
      return view?.status === 'active' && view.gameNumber === 2 && game && !game._duelEnded
        && game.currentTurn === 'player' && game.playerDeck.length + game.playerHand.length === 40;
    }""")
    duel_two = get_match(page)
    assert_registered_sizes(duel_two)
    assert duel_two['currentDuel']['firstPlayerId'] == 'player'
    inventory = page.evaluate("""() => {
      const game = window.__YGO_QA__.getGame();
      return {mode: game.rulesMode, startingPlayer: game.startingPlayerId,
        main: [...game.playerDeck, ...game.playerHand].map(card => String(card.id)),
        extra: game.playerExtraDeck.map(card => String(card.id)),
        handSize: game.playerHand.length, deckSize: game.playerDeck.length,
        playerLP: game.playerLP, opponentLP: game.opponentLP};
    }""")
    assert inventory['mode'] == 'strict' and inventory['startingPlayer'] == 'player'
    assert Counter(map(canonical, inventory['main'])) == Counter(sided['mainDeck'])
    assert Counter(map(canonical, inventory['extra'])) == Counter(sided['extraDeck'])
    assert sum(canonical(value) == '2084239' for value in inventory['main']) == 1
    assert page.evaluate("localStorage.getItem('ygo_active_match_v1')") is None
    assert page.evaluate('JSON.parse(localStorage.getItem("ygo_custom_deck"))') == {'main': [], 'extra': [], 'side': []}
    assert not page.locator('#side-deck-modal').is_visible()
    report["checks"]["actualDuelTwoFromRegisteredMatchDespiteEmptyDraft"] = {
        "view": duel_two, "inventory": inventory, "sidedMainIdentityVerified": True,
        "wetlandsInMain": 1, "storedMatchClearedOnLaunch": True, "localDraftStillEmpty": True}
    snapshot(page, output / 'custom-match-duel-two-2026-10-07.png')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--base-url', default='http://127.0.0.1:5174')
    parser.add_argument('--chromium-path', default='/usr/bin/chromium')
    parser.add_argument('--output-dir', type=Path, default=Path(__file__).resolve().parents[1] / 'docs/audits/artifacts')
    args = parser.parse_args()
    args.output_dir.mkdir(parents=True, exist_ok=True)
    report = {"auditDate": "2026-10-07", "baseUrl": args.base_url, "checks": {},
              "pageErrors": [], "consoleErrors": [], "failedRequests": [], "fontRequests": [],
              "fixtures": ["DEV finishDuel('opponent') ends Duel 1", "local custom draft emptied between Duels while Match save remains intact"],
              "scope": "Real custom builder and Match launch/Side Deck controls; no simulated gameplay or production deployment proof."}
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(executable_path=args.chromium_path, headless=True,
            args=['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
        page = browser.new_page(viewport={'width': 1280, 'height': 800})
        page.set_default_timeout(15000)
        page.on('pageerror', lambda error: report['pageErrors'].append(str(error)))
        page.on('console', lambda message: report['consoleErrors'].append(message.text) if message.type == 'error' else None)
        page.on('requestfailed', lambda request: report['failedRequests'].append({'url': request.url, 'failure': request.failure}))
        page.on('request', lambda request: report['fontRequests'].append(request.url)
                if '/fonts/' in request.url or 'fonts.googleapis.com' in request.url or 'fonts.gstatic.com' in request.url else None)
        try:
            verify(page, report, args.output_dir)
            assert not report['pageErrors'], report['pageErrors']
            assert not report['consoleErrors'], report['consoleErrors']
            assert not report['failedRequests'], report['failedRequests']
            report['passed'] = True
        except Exception as error:
            report['passed'] = False
            report['failure'] = str(error)
            report['traceback'] = traceback.format_exc()
            snapshot(page, args.output_dir / 'custom-deck-browser-failure-2026-10-07.png')
            raise
        finally:
            (args.output_dir / 'custom-deck-browser-2026-10-07.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
            browser.close()
    print(json.dumps({'passed': report['passed'], 'checks': len(report['checks']),
                      'pageErrors': report['pageErrors'], 'consoleErrors': report['consoleErrors'],
                      'failedRequests': report['failedRequests']}, ensure_ascii=False))


if __name__ == '__main__':
    main()
