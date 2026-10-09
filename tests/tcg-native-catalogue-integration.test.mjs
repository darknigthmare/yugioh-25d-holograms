import test from 'node:test';
import assert from 'node:assert/strict';
import { loadNativeAuditInputs } from '../scripts/native-field-audit-inputs.mjs';
import { loadTcgFormatFixture } from '../scripts/tcg-complete-format-cases.mjs';
import { NativeDuelGame } from '../src/core/native/NativeDuelGame.js';
import { createNativeTcgCardTemplate, getNativeTcgCardCatalogueCount,
  searchNativeTcgCardCatalogue } from '../src/core/native/NativeCardCatalogue.js';
import { validateCustomDeck, canAddDeckBuilderCard } from '../src/ui/DeckBuilderRules.js';

const inputs = await loadNativeAuditInputs();
const fixture = await loadTcgFormatFixture();
const card = code => createNativeTcgCardTemplate(inputs.resources, code);

test('full strict TCG search supplies eligible iconic cards and rejects OCG/prerelease cards', () => {
  assert.equal(getNativeTcgCardCatalogueCount(inputs.resources), 13847);
  for (const code of [10000000,10000010,10000020,70095154,89943723,84013237,72989439,14558127]) {
    const template = card(code);
    assert.ok(template, String(code));
    assert.equal(template.supportedInStrict, true);
    assert.equal(searchNativeTcgCardCatalogue(inputs.resources, String(code))[0], template);
  }
  for (const code of [64865,101402082,71645243]) {
    assert.equal(card(code), null);
    assert.deepEqual(searchNativeTcgCardCatalogue(inputs.resources, String(code)), []);
  }
});

test('forbidden cards remain inspectable and cannot be added to any strict deck section', () => {
  const forbidden = card(55144522);
  assert.ok(forbidden); assert.equal(forbidden.tcgCopyLimit, 0);
  const deck = fixture.legalDeck();
  for (const section of ['mainDeck','extraDeck','sideDeck']) {
    assert.equal(canAddDeckBuilderCard(deck, forbidden, section, 'strict', fixture.options).allowed, false);
  }
  deck.sideDeck = [{ ...forbidden, tcgCopyLimit: 3, banlistVerified: true }];
  assert.equal(validateCustomDeck(deck, 'strict', fixture.options).valid, false);
});

test('a full-catalogue strict forty-card deck starts in real WASM and ignores saved presentation forgeries', async () => {
  const deck = fixture.legalDeck();
  deck.mainDeck[0] = card(70095154);
  deck.extraDeck = [card(84013237)];
  assert.equal(validateCustomDeck(deck, 'strict', fixture.options).valid, true);
  const forged = deck.mainDeck.map(template => ({ ...template, name: 'NOM FAUX DU SAVE',
    name_en: 'FORGED SAVE NAME', desc: 'Invented card effect.', rulesText: 'Invented card effect.' }));
  const game = new NativeDuelGame({}, { rulesMode: 'strict', nativeResources: inputs.resources,
    seed: [1n,2n,3n,4n], shuffleUint32: () => 0, aiDelay: 0,
    runtimeOptions: { coreModule: inputs.coreModule, initializer: inputs.initializer } });
  try {
    assert.equal(await game.startDuel(forged, forged, deck.extraDeck, deck.extraDeck), true);
    assert.equal(game.nativeError, null);
    assert.deepEqual(game.runtime.errors, []);
    assert.equal(game.playerHand.length, 5);
    assert.equal(game.playerDeck.length, 35);
    assert.equal(game.currentPhase, 'main1');
    assert.equal(game._getMetadata(84013237).image_url, '/cards/reference/84013237.jpg');
    assert.equal(game._getMetadata(84013237).image_url_cropped, '/cards/cropped/84013237.jpg');
    for (const code of [70095154,89943723,46986414]) {
      const trusted = card(code), metadata = game._getMetadata(code);
      assert.equal(metadata.name, trusted.name);
      assert.equal(metadata.name_en, trusted.name_en);
      assert.equal(metadata.rulesText, trusted.rulesText);
      assert.notEqual(metadata.desc, 'Invented card effect.');
    }
  } finally { game.dispose(); }
});
