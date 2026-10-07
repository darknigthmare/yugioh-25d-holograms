import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { loadNativeCardResources } from '../src/core/native/NativeCardData.js';
import { CardState } from '../src/core/CardState.js';
import { getNativeCardTemplate, NATIVE_CARDS } from '../src/core/native/NativeCardRegistry.js';
import { isStrictCardSupported } from '../src/core/StrictCardRegistry.js';
import { canAddDeckBuilderCard } from '../src/ui/DeckBuilderRules.js';
import {
  createNativeCardTemplate, createNativeCardPresentationTemplate, searchNativeCardCatalogue,
  getNativeCardCatalogueCount, getNativeCardCopyIdentity, isSupportedNativeCatalogueCard,
  NATIVE_UNKNOWN_CARD_IMAGE
} from '../src/core/native/NativeCardCatalogue.js';

const resources = await loadNativeCardResources({ fetch: async url => ({
  ok: true, json: async () => JSON.parse(await readFile(new URL(`../public${url}`, import.meta.url), 'utf8'))
}) });
const freeOptions = { native: true, format: 'ALL',
  isSupportedCard: (card, section) => isSupportedNativeCatalogueCard(resources, card, section),
  getCopyIdentity: card => getNativeCardCopyIdentity(resources, card) };

test('full CDB search preserves the local 390 catalogue and existing original templates', () => {
  assert.equal(NATIVE_CARDS.length, 390);
  assert.equal(getNativeCardCatalogueCount(resources), 14355);
  assert.equal(createNativeCardTemplate(resources, 89631139), getNativeCardTemplate(89631139));
  assert.equal(createNativeCardTemplate(resources, 62265044), getNativeCardTemplate(62265044));
  assert.equal(NATIVE_CARDS.length, 390, 'search does not register the full CDB in strict mode');
  assert.equal(searchNativeCardCatalogue(resources, 'Dragunity', { limit: 6 }).length, 6);
  const search = searchNativeCardCatalogue(resources, 'Elemental HERO Neos', { limit: 100 });
  assert.equal(search[0].id, '89943723');
  assert.equal(searchNativeCardCatalogue(resources, '0089943723')[0].id, '89943723');
  assert.deepEqual(searchNativeCardCatalogue(resources, 'Dragunity', { limit: 0 }), []);
});

test('ordinary Normal monsters need no Lua; effect and procedure cards require genuine bundled scripts', () => {
  const neos = createNativeCardTemplate(resources, 89943723);
  assert.equal(neos.name_en, 'Elemental HERO Neos');
  assert.equal(neos.scriptStatus, 'normal-no-script-needed');
  assert.equal(neos.supportedInStrict, false);
  assert.equal(neos.nativeRace, 1n);
  assert.equal(neos.nativeAttribute, 16);
  const phalanx = createNativeCardTemplate(resources, 59755122);
  assert.equal(phalanx.isTuner, true);
  assert.equal(phalanx.scriptStatus, 'bundled');
  assert.equal(typeof resources.scripts.get(phalanx.nativeMetadata.sourceScript), 'string');
  assert.ok(phalanx.setcodes.includes(0x29));
});

test('native CDB templates preserve Xyz ranks, Link markers and both Pendulum scales', () => {
  const rows = searchNativeCardCatalogue(resources, '', { limit: 1000 });
  // Select directly from full source data rather than depending on search order.
  const find = type => [...resources.cards].map(([code, data]) => data.type & type ? createNativeCardTemplate(resources, code) : null)
    .find(card => card?.nativeCatalogueOnly);
  const xyz = find(0x800000); const link = find(0x4000000); const pendulum = find(0x1000000);
  assert.ok(rows.length > 0);
  assert.equal(xyz.extra_type, 'xyz'); assert.equal(xyz.level, 0); assert.ok(xyz.rank > 0);
  assert.equal(link.extra_type, 'link'); assert.equal(link.level, 0); assert.equal(link.def, null);
  assert.ok(link.linkRating > 0); assert.ok(link.linkArrows.length > 0);
  const source = resources.cards.get(Number(pendulum.id));
  assert.equal(pendulum.leftScale, source.lscale); assert.equal(pendulum.rightScale, source.rscale);
  assert.equal(pendulum.nativeMetadata.sourceDatabase, resources.metadata.get(Number(pendulum.id)).sourceDatabase);
});

test('bound prerelease passcodes and duplicate beta versions produce a single canonical search result', () => {
  assert.equal(createNativeCardTemplate(resources, 101402095), getNativeCardTemplate(12845564));
  assert.equal(searchNativeCardCatalogue(resources, 'Angelechy Endgame Problem').filter(card => card.name_en === 'Angelechy Endgame Problem').length, 1);
  assert.equal(createNativeCardTemplate(resources, 57160137).id, '57160136');
  assert.equal(searchNativeCardCatalogue(resources, 'Cynet Mining').filter(card => card.name_en === 'Cynet Mining').length, 1);
  assert.equal(getNativeCardCopyIdentity(resources, 101402095), '12845564');
});

test('unknown artwork uses a local PNG accepted by CardState; native-created Tokens stay out of decks', async () => {
  const neos = createNativeCardTemplate(resources, 89943723);
  const state = new CardState(neos);
  assert.equal(state.image_url, NATIVE_UNKNOWN_CARD_IMAGE);
  assert.equal(state.image_url_cropped, NATIVE_UNKNOWN_CARD_IMAGE);
  assert.deepEqual([...((await readFile(new URL('../public/cards/native-unknown.png', import.meta.url))).subarray(0, 8))], [137, 80, 78, 71, 13, 10, 26, 10]);
  assert.equal(createNativeCardTemplate(resources, 71645243), null);
  assert.ok(searchNativeCardCatalogue(resources, 'Rose Token').every(card => !card.isToken && card.id !== '71645243'));
  const token = createNativeCardPresentationTemplate(resources, 71645243);
  assert.equal(token.isToken, true); assert.equal(token.nativeDeckEligible, false);
  assert.equal(token.image_url, NATIVE_UNKNOWN_CARD_IMAGE);
  assert.equal(isSupportedNativeCatalogueCard(resources, token), false);
});

test('trusted CDB aliases enforce the three-copy rule across Harpie variants and Umi', () => {
  for (const id of [76812113, 91932350, 27927359]) assert.equal(getNativeCardCopyIdentity(resources, id), '76812113');
  assert.equal(getNativeCardCopyIdentity(resources, 295517), '22702055');
  assert.equal(getNativeCardCopyIdentity(resources, { id: '91932350', nativeAlias: 12345, alias: 12345 }), '76812113');
  const cards = [76812113, 91932350, 27927359].map(id => createNativeCardTemplate(resources, id));
  const outcome = canAddDeckBuilderCard({ mainDeck: cards, extraDeck: [], sideDeck: [] }, cards[1], 'sideDeck', 'native', freeOptions);
  assert.equal(outcome.allowed, false); assert.equal(outcome.copyLimit, 3);
});

test('expanded CDB cards are accepted only by the free native predicate and cannot spoof deck sections', () => {
  const neos = createNativeCardTemplate(resources, 89943723);
  const deck = { mainDeck: [], extraDeck: [], sideDeck: [] };
  assert.equal(isSupportedNativeCatalogueCard(resources, neos, 'main'), true);
  assert.equal(isSupportedNativeCatalogueCard(resources, neos, 'extra'), false);
  assert.equal(canAddDeckBuilderCard(deck, neos, 'mainDeck', 'native', freeOptions).allowed, true);
  assert.equal(canAddDeckBuilderCard(deck, neos, 'mainDeck', 'strict', freeOptions).allowed, false);
  assert.equal(isStrictCardSupported(new CardState(neos)), false);
  assert.equal(isSupportedNativeCatalogueCard(resources, { ...neos, card_type: 'spell', type: 'Spell Card' }, 'main'), false);
  assert.equal(isSupportedNativeCatalogueCard(resources, { ...neos, extra_type: 'fusion', belongsInExtraDeck: true }, 'extra'), false);
});

test('Skill, Rush, illegal, Token and effect cards with missing scripts are excluded from free search', () => {
  const rows = [
    [90000001, 3, 17], [90000002, 3, 33], [90000003, 512, 17], [90000004, 3, 0x8000002],
    [90000005, 3, 0x4011], [90000006, 1, 17], [90000007, 257, 33], [90000008, 8, 17],
    [90000009, 3, 2], [90000010, 3, 33], [90000011, 4099, 17], [90000012, 3, 0x2000011]
  ];
  const fixture = { cards: new Map(), metadata: new Map(), scripts: new Map([
    ['c90000002.lua', 'genuine source fixture'], ['c90000007.lua', 'genuine source fixture']
  ]) };
  for (const [code, ot, type] of rows) {
    fixture.cards.set(code, { code, alias: 0, type, race: 1n, attribute: 1, attack: 1000, defense: 1000,
      level: 4, lscale: 0, rscale: 0, link_marker: 0, setcodes: [] });
    fixture.metadata.set(code, { name: `Fixture ${code}`, description: 'Source description', ot,
      sourceDatabase: ot & 256 ? 'prerelease-fixture.cdb' : 'cards.cdb' });
  }
  assert.equal(getNativeCardCatalogueCount(fixture), 4);
  assert.ok(createNativeCardTemplate(fixture, 90000001));
  assert.ok(createNativeCardTemplate(fixture, 90000002));
  assert.ok(createNativeCardTemplate(fixture, 90000006));
  assert.ok(createNativeCardTemplate(fixture, 90000007));
  for (const code of [90000003, 90000004, 90000005, 90000008, 90000009, 90000010, 90000011, 90000012]) {
    assert.equal(createNativeCardTemplate(fixture, code), null, String(code));
  }
});
