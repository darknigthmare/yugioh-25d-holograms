import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { STARTER_CARDS, EXTRA_DECK_CARDS } from '../src/cards.js';
import { STRICT_CARD_REGISTRY, isStrictCardSupported } from '../src/core/StrictCardRegistry.js';
import { FIELD_SPELL_ENVIRONMENT_CATALOG } from '../src/ui/FieldSpellEnvironmentCatalog.js';
import { FIELD_SPELL_CARD_DATA_SNAPSHOT } from '../src/ui/FieldSpellCardDataSnapshot.js';
import {
  NATIVE_CARD_REGISTRY, NATIVE_CARD_TEMPLATES, NATIVE_CARDS, NATIVE_MAIN_DECK_CARDS,
  NATIVE_EXTRA_DECK_CARDS, NATIVE_FIELD_RESTRICTIONS, getNativeCardRegistration,
  getNativeCardTemplate, getNativeFieldEligibility, isNativeCardSupported
} from '../src/core/native/NativeCardRegistry.js';
import { canAddDeckBuilderCard, getDeckBuilderCopyLimit, validateCustomDeck } from '../src/ui/DeckBuilderRules.js';
import { createNativeCardDataMaps } from '../src/core/native/NativeCardData.js';

const strictNative = { native: true, format: 'TCG' };
function legalDeck() {
  const normals = STARTER_CARDS.filter(card => card.card_type === 'monster' && card.type === 'Normal Monster');
  return { mainDeck: normals.slice(0, 20).flatMap(card => [card, card]), extraDeck: [], sideDeck: [] };
}

test('the static native library contains exactly the legacy 80 plus the remaining 310 Fields', () => {
  const legacyIds = new Set([...STARTER_CARDS, ...EXTRA_DECK_CARDS].map(card => String(Number(card.id))));
  assert.equal(STRICT_CARD_REGISTRY.size, 80);
  assert.equal(STARTER_CARDS.length, 75);
  assert.equal(EXTRA_DECK_CARDS.length, 5);
  assert.equal(NATIVE_CARD_REGISTRY.size, 390);
  assert.equal(NATIVE_CARD_TEMPLATES.size, 390);
  assert.equal(NATIVE_CARDS.length, 390);
  assert.equal(NATIVE_MAIN_DECK_CARDS.length, 385);
  assert.equal(NATIVE_EXTRA_DECK_CARDS.length, 5);
  assert.equal(NATIVE_CARDS.filter(card => !legacyIds.has(card.id)).length, 310);
  assert.equal(NATIVE_FIELD_RESTRICTIONS.size, 339);
  assert.equal(STARTER_CARDS.some(card => card.nativeEngine === true), false);
  for (const field of FIELD_SPELL_ENVIRONMENT_CATALOG) {
    const card = getNativeCardTemplate(field.cardId);
    assert.equal(card.card_type, 'spell');
    assert.equal(card.race, 'Field');
    assert.equal(card.isFieldSpell, true);
    assert.equal(card.name_en, FIELD_SPELL_CARD_DATA_SNAPSHOT[field.cardId].name);
    assert.equal(card.rulesText, FIELD_SPELL_CARD_DATA_SNAPSHOT[field.cardId].effectText);
    assert.equal(card.image_url, `/cards/small/${field.cardId}.jpg`);
    assert.equal(card.image_url_cropped, `/environments/field-art/${field.cardId}.jpg`);
    assert.equal(isNativeCardSupported(card, 'main'), true);
    assert.equal(isNativeCardSupported(card, 'extra'), false);
  }
});

test('static flags, OT, genuine aliases, restrictions and four bindings match the archived facts', async () => {
  const payload = JSON.parse(await readFile(new URL('../public/native/card-data.json', import.meta.url)));
  const data = new Map(payload.rows.map(row => [row[0], row]));
  const bindings = new Map(payload.canonicalBindings.map(row => [row.canonicalCode, row.sourceCode]));
  const banlists = JSON.parse(await readFile(new URL('../public/native/field-banlists.json', import.meta.url)));
  const restrictions = new Map(banlists.entries.map(row => [row.id, row]));
  for (const field of FIELD_SPELL_ENVIRONMENT_CATALOG) {
    const template = getNativeCardTemplate(field.cardId);
    const sourceCode = bindings.get(Number(field.cardId)) ?? Number(field.cardId);
    const source = data.get(sourceCode);
    assert.equal(template.scriptCode, sourceCode);
    assert.equal(template.nativeOT, source[1]);
    assert.equal(template.nativeAlias, source[2]);
    assert.equal(template.nativeType, source[4]);
    assert.deepEqual(template.fieldRestriction, restrictions.get(field.cardId));
  }
  assert.equal(getNativeCardTemplate('00295517').nativeAlias, 22702055);
  assert.equal(getNativeCardTemplate(12845564).scriptStatus, 'prerelease');
  assert.equal(getNativeCardTemplate(12845564).scriptCode, 101402095);
  assert.equal(getNativeCardRegistration('00591397169'), null);
  assert.equal(getNativeCardTemplate('unknown'), null);
});

test('legacy strict defaults stay at 80 while explicit native options admit new card procedures', () => {
  const field = getNativeCardTemplate(71645242); // Black Garden
  const deck = legalDeck();
  assert.equal(isStrictCardSupported(field), false);
  assert.equal(canAddDeckBuilderCard(deck, field, 'sideDeck').allowed, false);
  assert.equal(canAddDeckBuilderCard(deck, field, 'sideDeck', 'strict', strictNative).allowed, true);
  assert.equal(canAddDeckBuilderCard(deck, field, 'extraDeck', 'strict', strictNative).allowed, false);
  deck.sideDeck = [field];
  assert.equal(validateCustomDeck(deck).valid, false);
  assert.equal(validateCustomDeck(deck, 'strict', strictNative).valid, true);
  assert.equal(isNativeCardSupported({ ...field, card_type: 'monster', race: 'Dragon' }), false);
  assert.equal(isNativeCardSupported({ ...field, id: '12345678' }), false);
  assert.equal(isNativeCardSupported({ ...field, supportedInNative: false }), false);
});

test('strict native copy limits use the full field snapshot in every deck section', () => {
  for (const [id, limit] of [[76375976, 0], [67616300, 1], [15854426, 1], [71650854, 1], [68337209, 2], [71645242, 3]]) {
    const card = getNativeCardTemplate(id);
    assert.equal(getDeckBuilderCopyLimit(card, 'strict', strictNative), limit, card.name);
    assert.equal(getDeckBuilderCopyLimit(card, 'native'), 3, card.name);
    for (const section of ['mainDeck', 'sideDeck']) {
      const deck = legalDeck();
      deck.sideDeck = Array.from({ length: limit }, () => card);
      assert.equal(canAddDeckBuilderCard(deck, card, section, 'strict', strictNative).allowed, false, card.name);
    }
  }
  assert.equal(getDeckBuilderCopyLimit(getNativeCardTemplate(55144522), 'strict', strictNative), 0);
  assert.equal(getDeckBuilderCopyLimit(getNativeCardTemplate(83764718), 'strict', strictNative), 1);
  const deck = legalDeck();
  deck.sideDeck = [getNativeCardTemplate(68337209), getNativeCardTemplate(68337209), getNativeCardTemplate(68337209)];
  const issue = validateCustomDeck(deck, 'strict', strictNative).issues.find(row => row.code === 'COPY_LIMIT_EXCEEDED');
  assert.deepEqual(issue, { code: 'COPY_LIMIT_EXCEEDED', cardId: '68337209', found: 3, allowed: 2 });
});

test('Umi identities share three copies across Main, Extra and Side in both native modes', () => {
  const deck = legalDeck();
  deck.mainDeck[0] = getNativeCardTemplate(22702055);
  deck.sideDeck = [getNativeCardTemplate(295517), getNativeCardTemplate(2819435)];
  for (const mode of ['strict', 'native']) {
    assert.equal(validateCustomDeck(deck, mode, strictNative).valid, true);
    assert.equal(canAddDeckBuilderCard(deck, getNativeCardTemplate(34103656), 'sideDeck', mode, strictNative).allowed, false);
    const overflow = { ...deck, sideDeck: [...deck.sideDeck, getNativeCardTemplate(26534688)] };
    const issue = validateCustomDeck(overflow, mode, strictNative).issues.find(row => row.code === 'COPY_LIMIT_EXCEEDED');
    assert.equal(issue.cardId, '22702055');
    assert.equal(issue.allowed, 3);
    assert.equal(issue.found, 4);
  }
});

test('TCG strict rejects the five dated future releases and six known OCG-only Fields', () => {
  const future = [12845564, 2906939, 38391684, 39513225, 4663194];
  const ocg = [88288421, 46273941, 60600821, 7293697, 33700664, 32353566];
  for (const [ids, code] of [[future, 'FIELD_NOT_RELEASED_TCG'], [ocg, 'FIELD_OCG_ONLY']]) {
    for (const id of ids) {
      const field = getNativeCardTemplate(id);
      assert.equal(getNativeFieldEligibility(field, 'TCG').code, code, field.name);
      assert.equal(getNativeFieldEligibility(field, 'ALL').allowed, true);
      assert.equal(canAddDeckBuilderCard(legalDeck(), field, 'sideDeck', 'strict', strictNative).code, code);
      const deck = legalDeck();
      deck.sideDeck = [field];
      assert.ok(validateCustomDeck(deck, 'strict', strictNative).issues.some(row => row.code === code));
      assert.equal(validateCustomDeck(deck, 'native').valid, true);
      assert.equal(validateCustomDeck(deck, 'strict', { native: true, format: 'ALL' }).valid, true);
    }
  }
  const endgame = getNativeFieldEligibility(12845564);
  assert.equal(endgame.releaseDate, '2026-10-08');
  assert.equal(endgame.evidence, 'primary-publication');
  assert.equal(getNativeFieldEligibility(88288421).evidence, 'primary-publication');
});

test('Duel libre uses native support with three copies and normal deck sizes without F&L restrictions', () => {
  const deck = legalDeck();
  deck.mainDeck[0] = getNativeCardTemplate(55144522);
  deck.sideDeck = [getNativeCardTemplate(76375976), getNativeCardTemplate(83764718), getNativeCardTemplate(83764718)];
  assert.equal(validateCustomDeck(deck, 'native').valid, true);
  assert.equal(validateCustomDeck(deck, 'strict', strictNative).valid, false);
  assert.equal(validateCustomDeck({ ...deck, mainDeck: deck.mainDeck.slice(0, 39) }, 'native').valid, false);
  assert.equal(validateCustomDeck({ ...deck, extraDeck: Array(16).fill(NATIVE_EXTRA_DECK_CARDS[0]) }, 'native').valid, false);
  assert.equal(validateCustomDeck({ ...deck, sideDeck: Array(16).fill(NATIVE_MAIN_DECK_CARDS[0]) }, 'native').valid, false);
  const foreign = { ...getNativeCardTemplate(89631139), id: '12345678' };
  assert.equal(canAddDeckBuilderCard(deck, foreign, 'sideDeck', 'native').allowed, false);
  assert.equal(canAddDeckBuilderCard(deck, foreign, 'sideDeck', 'sandbox').allowed, true);
});

test('a factual catalogue predicate can extend Duel libre while strict stays at the audited library', async () => {
  const payload = JSON.parse(await readFile(new URL('../public/native/card-data.json', import.meta.url)));
  const sources = new Map(payload.rows.map(row => [String(row[0]), row]));
  const partner = { id: '89943723', name: 'Elemental HERO Neos', type: 'Normal Monster', card_type: 'monster' };
  const calls = [];
  const isSupportedCard = (card, expectedSection) => {
    calls.push(expectedSection);
    if (isNativeCardSupported(card, expectedSection)) return true;
    const source = sources.get(String(card?.id));
    return source?.[4] === 17 && card?.type === 'Normal Monster' && card?.card_type === 'monster'
      && expectedSection !== 'extra';
  };
  const options = { native: true, format: 'ALL', isSupportedCard };
  const deck = legalDeck();
  assert.equal(getNativeCardTemplate(partner.id), null);
  assert.equal(canAddDeckBuilderCard(deck, partner, 'sideDeck', 'native', options).allowed, true);
  assert.equal(canAddDeckBuilderCard(deck, partner, 'extraDeck', 'native', options).allowed, false);
  assert.equal(canAddDeckBuilderCard(deck, partner, 'sideDeck', 'strict', options).allowed, false);
  assert.ok(calls.includes(null));
  assert.ok(calls.includes('extra'));
  deck.sideDeck = [partner, partner, partner];
  assert.equal(validateCustomDeck(deck, 'native', options).valid, true);
  assert.equal(canAddDeckBuilderCard(deck, partner, 'mainDeck', 'native', options).allowed, false);
  const overflow = { ...deck, sideDeck: [...deck.sideDeck, partner] };
  const issue = validateCustomDeck(overflow, 'native', options).issues.find(row => row.code === 'COPY_LIMIT_EXCEEDED');
  assert.deepEqual(issue, { code: 'COPY_LIMIT_EXCEEDED', cardId: '89943723', found: 4, allowed: 3 });
  assert.equal(validateCustomDeck(deck, 'strict', options).valid, false);
  assert.equal(canAddDeckBuilderCard(deck, { ...partner, card_type: 'spell' }, 'mainDeck', 'native', options).allowed, false);
  assert.equal(canAddDeckBuilderCard(deck, { ...partner, id: '12345678', supportedInNative: true }, 'mainDeck', 'native', options).allowed, false);
});

test('Duel libre copy identities combine factual permanent-name and alternate-art CDB aliases', async () => {
  const payload = JSON.parse(await readFile(new URL('../public/native/card-data.json', import.meta.url)));
  const { cards } = createNativeCardDataMaps(payload);
  const fromSource = id => {
    const source = payload.rows.find(row => row[0] === id);
    return { id: String(id), name: source[11], card_type: 'monster', type: source[4] === 17 ? 'Normal Monster' : 'Effect Monster' };
  };
  const options = {
    native: true, format: 'ALL',
    isSupportedCard: (card, expectedSection) => {
      const data = cards.get(Number(card?.id));
      if (isNativeCardSupported(card, expectedSection)) return true;
      return Boolean(data && (data.type & 1) && card?.card_type === 'monster' && expectedSection !== 'extra');
    },
    getCopyIdentity: card => {
      const source = cards.get(Number(card?.id));
      return source ? String(source.alias || source.code) : String(card?.id ?? '');
    }
  };
  const harpie1 = fromSource(91932350);
  const harpie2 = fromSource(27927359);
  const cyberHarpie = fromSource(80316585);
  assert.equal(options.getCopyIdentity(harpie1), '76812113');
  assert.equal(options.getCopyIdentity(harpie2), '76812113');
  const deck = legalDeck();
  deck.mainDeck[0] = harpie1;
  deck.mainDeck[1] = harpie1;
  deck.sideDeck = [harpie2];
  assert.equal(validateCustomDeck(deck, 'native', options).valid, true);
  for (const card of [harpie1, harpie2, cyberHarpie]) {
    assert.equal(canAddDeckBuilderCard(deck, card, 'mainDeck', 'native', options).allowed, false);
    assert.equal(canAddDeckBuilderCard(deck, card, 'sideDeck', 'native', options).allowed, false);
  }
  const overflow = { ...deck, sideDeck: [harpie2, harpie2] };
  const validation = validateCustomDeck(overflow, 'native', options);
  assert.deepEqual(validation.issues.find(row => row.code === 'COPY_LIMIT_EXCEEDED'), {
    code: 'COPY_LIMIT_EXCEEDED', cardId: '76812113', found: 4, allowed: 3
  });
  assert.match(validation.message, /Harpie Lady 1/);

  const magician = getNativeCardTemplate(46986414);
  const alternate = fromSource(46986413);
  const artDeck = legalDeck();
  artDeck.mainDeck = artDeck.mainDeck.filter(card => Number(card.id) !== 46986414);
  artDeck.mainDeck.push(magician, magician);
  artDeck.sideDeck = [alternate];
  assert.equal(canAddDeckBuilderCard(artDeck, alternate, 'mainDeck', 'native', options).allowed, false);
  artDeck.sideDeck.push(alternate);
  const artIssue = validateCustomDeck(artDeck, 'native', options).issues.find(row => row.code === 'COPY_LIMIT_EXCEEDED');
  assert.equal(artIssue.cardId, '46986414');
  assert.equal(artIssue.found, 4);
  assert.equal(artIssue.allowed, 3);

  // A malicious caller's identity callback cannot change legacy or strict limits.
  const strictOptions = { native: true, format: 'TCG', getCopyIdentity: () => 'shared' };
  assert.equal(validateCustomDeck(legalDeck(), 'strict', strictOptions).valid, true);
  assert.equal(validateCustomDeck(legalDeck(), 'strict', { getCopyIdentity: () => 'shared' }).valid, true);
});
