import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { loadNativeCardResources } from '../src/core/native/NativeCardData.js';
import { CardState } from '../src/core/CardState.js';
import { getNativeCardTemplate, NATIVE_CARDS } from '../src/core/native/NativeCardRegistry.js';
import { isStrictCardSupported } from '../src/core/StrictCardRegistry.js';
import { canAddDeckBuilderCard } from '../src/ui/DeckBuilderRules.js';
import { NATIVE_CARD_REFERENCE_ART, getNativeCardReferenceArt } from '../src/core/native/NativeCardReferenceArt.js';
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

function jpegDimensions(bytes) {
  assert.equal(bytes.readUInt16BE(0), 0xffd8, 'JPEG start marker');
  assert.equal(bytes.readUInt16BE(bytes.length - 2), 0xffd9, 'complete JPEG end marker');
  for (let offset = 2; offset < bytes.length;) {
    assert.equal(bytes[offset++], 0xff, 'JPEG segment marker');
    while (bytes[offset] === 0xff) offset += 1;
    const marker = bytes[offset++];
    assert.notEqual(marker, 0xda, 'dimensions must precede compressed scan');
    const length = bytes.readUInt16BE(offset);
    assert.ok(length >= 2 && offset + length <= bytes.length);
    if ([0xc0, 0xc1, 0xc2].includes(marker)) {
      return { height: bytes.readUInt16BE(offset + 3), width: bytes.readUInt16BE(offset + 5) };
    }
    offset += length;
  }
  throw new Error('JPEG frame dimensions missing');
}

test('two Trap Monster illustrations are exact local source JPEGs with pinned bytes, dimensions and metadata', async () => {
  assert.deepEqual(Object.keys(NATIVE_CARD_REFERENCE_ART).sort(), ['26905245', '28649820']);
  assert.ok(Object.isFrozen(NATIVE_CARD_REFERENCE_ART));
  const hashes = {
    26905245: ['9377a21d60345e052e0564bc38910199f6593c7247791a7805a0ee23e97597bd', 'da4105f998aea65251d2c1f0e3c92ae1802012ddfdb482b997fdbda59846aa60', '4759e30156b2cd9063d64a9395071d68d75932bccd7fec80f630ef0d4f7152ee'],
    28649820: ['d4bf7c195cd988b1796f07dddc2ad0f7781e4f5bff20731a8ec33884132686b8', 'eaaeb38bcd2dfa389d96e5769fb978e8ebf04b9ce2d79b5a6dd67ce094797895', 'e0408c5845482d05e88bff2873cfe30ce635ee466598f801e4fed81be64f0fa1']
  };
  for (const code of [26905245, 28649820]) {
    const reference = getNativeCardReferenceArt(code);
    assert.equal(getNativeCardReferenceArt(`00${code}`), reference);
    assert.equal(reference.cardId, String(code));
    assert.ok(Object.isFrozen(reference));
    for (const [index, variant] of ['full', 'cropped', 'small'].entries()) {
      const metadata = reference[variant];
      assert.ok(Object.isFrozen(metadata));
      assert.equal(metadata.sourceUrl, `https://images.ygoprodeck.com/images/${variant === 'full' ? 'cards' : variant === 'small' ? 'cards_small' : 'cards_cropped'}/${code}.jpg`);
      assert.equal(metadata.assetPath, `/cards/${variant === 'full' ? 'reference' : variant}/${code}.jpg`);
      const bytes = await readFile(new URL(`../public${metadata.assetPath}`, import.meta.url));
      assert.equal(bytes.length, metadata.bytes);
      assert.equal(createHash('sha256').update(bytes).digest('hex'), hashes[code][index]);
      assert.equal(metadata.sha256, hashes[code][index]);
      assert.deepEqual(jpegDimensions(bytes), { width: metadata.width, height: metadata.height });
    }
    const template = createNativeCardPresentationTemplate(resources, code);
    assert.equal(template.name_en, resources.metadata.get(code).name);
    assert.equal(template.nativeCode, code);
    assert.equal(template.nativeMetadata.sourceCode, code);
    assert.equal(template.card_type, 'trap');
    assert.equal(template.image_url, reference.full.assetPath);
    assert.equal(template.image_url_cropped, reference.cropped.assetPath);
    const state = new CardState(template);
    assert.equal(state.image_url, reference.full.assetPath);
    assert.equal(state.image_url_cropped, reference.cropped.assetPath);
  }
});

test('copied runtime names and monster traits preserve physical artwork and permanent native copy identity', () => {
  for (const [code, copiedCode] of [[26905245, 28649820], [28649820, 26905245]]) {
    const template = createNativeCardTemplate(resources, code);
    const spoofed = { id: String(code), name: resources.metadata.get(copiedCode).name,
      name_en: resources.metadata.get(copiedCode).name, nativeAlias: copiedCode, alias: copiedCode,
      currentNameCode: copiedCode, image_url: getNativeCardReferenceArt(copiedCode).full.assetPath };
    assert.equal(createNativeCardPresentationTemplate(resources, spoofed), template);
    assert.equal(getNativeCardCopyIdentity(resources, spoofed), String(code));
    const state = new CardState(template);
    state.name = spoofed.name;
    state.name_en = spoofed.name_en;
    state.card_type = 'monster';
    state.type = 'Trap Monster';
    state.nativeAlias = copiedCode;
    state.currentNameCode = copiedCode;
    assert.equal(state.id, String(code));
    assert.equal(state.image_url, getNativeCardReferenceArt(code).full.assetPath);
    assert.equal(state.image_url_cropped, getNativeCardReferenceArt(code).cropped.assetPath);
    assert.equal(getNativeCardCopyIdentity(resources, state), String(code));
  }
});

test('unreferenced cards and native-created Tokens retain the neutral local artwork after known references are cached', () => {
  for (const code of [26905245, 28649820]) createNativeCardPresentationTemplate(resources, code);
  for (const code of [89943723, 71645243]) {
    assert.equal(getNativeCardReferenceArt(code), null);
    const template = createNativeCardPresentationTemplate(resources, code);
    assert.equal(template.image_url, NATIVE_UNKNOWN_CARD_IMAGE);
    assert.equal(template.image_url_cropped, NATIVE_UNKNOWN_CARD_IMAGE);
    assert.equal(new CardState(template).image_url, NATIVE_UNKNOWN_CARD_IMAGE);
  }
  assert.equal(createNativeCardTemplate(resources, 71645243), null);
  assert.equal(createNativeCardPresentationTemplate(resources, 71645243).nativeDeckEligible, false);
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
