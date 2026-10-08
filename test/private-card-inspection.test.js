import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { PrivateCardInspection } from '../src/ui/PrivateCardInspection.js';
import { safeImageUrl } from '../src/security.js';
import { loadNativeCardResources } from '../src/core/native/NativeCardData.js';
import { createNativeCardPresentationTemplate } from '../src/core/native/NativeCardCatalogue.js';

// These descriptors were produced by the official WASM, not a UI reveal hook.
const nativeReport = JSON.parse(readFileSync(new URL('../docs/audits/artifacts/native-confirmation-privacy-2026-10-08.json', import.meta.url)));
const nativeCase = nativeReport.cases.find(entry => entry.id === 'private-smartfon-defense-own-deck-controller-1');
const nativeEvents = nativeCase.projections.find(entry => entry.version === 'after' && entry.playerController === 1)
  .events.filter(event => event.type === 'inspect');

class Element {
  constructor(tag, document) { this.tagName = tag.toUpperCase(); this.ownerDocument = document;
    this.children = []; this.attributes = new Map(); this.listeners = new Map(); this.textContent = ''; }
  append(...elements) { for (const element of elements) { element.parentElement = this; this.children.push(element); } }
  replaceChildren(...elements) { for (const child of this.children) child.parentElement = null; this.children = []; this.append(...elements); }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  getAttribute(name) { return this.attributes.get(name) ?? null; }
  removeAttribute(name) { this.attributes.delete(name); if (name === 'src') this.src = ''; }
  addEventListener(type, callback) { this.listeners.set(type, callback); }
  dispatch(type, extra = {}) { this.listeners.get(type)?.({ type, target: this, stopPropagation() {}, ...extra }); }
  remove() { const parent = this.parentElement; if (!parent) return;
    parent.children.splice(parent.children.indexOf(this), 1); this.parentElement = null; }
  get firstElementChild() { return this.children[0]; }
}

function fixture() {
  const document = { createElement(tag) { return new Element(tag, document); } };
  document.body = new Element('body', document);
  const imageRequests = [], detailsLookups = [];
  const inspection = new PrivateCardInspection({ documentRef: document,
    cardDetails: card => { detailsLookups.push(card.id); return null; },
    imageUrl: card => { imageRequests.push(card.id); return safeImageUrl(card.image_url, `/cards/${card.id}.jpg`); } });
  return { inspection, document, imageRequests, detailsLookups, game: { playerController: 1, winner: null } };
}

test('six genuine native Smartfon confirmations group in one accessible private panel for controller 1', () => {
  assert.equal(nativeCase.status, 'passed');
  assert.equal(nativeEvents.length, 6);
  const { inspection, document, game, imageRequests } = fixture();
  for (const event of nativeEvents) assert.equal(inspection.handle(event, game), true);
  assert.equal(document.body.children.length, 1);
  assert.equal(inspection.panel.getAttribute('role'), 'region');
  assert.equal(inspection.panel.getAttribute('aria-modal'), null);
  assert.equal(inspection.panel.getAttribute('aria-labelledby'), 'private-card-inspection-title');
  assert.equal(inspection.list.children.length, 6);
  assert.equal(inspection.count.textContent, '6 cartes reçues.');
  assert.deepEqual(inspection.cards.map(card => card.name), nativeEvents.map(event => event.card.name));
  assert.equal(imageRequests.length, 6);
  for (const [index, item] of inspection.list.children.entries()) {
    const button = item.firstElementChild;
    assert.equal(button.tagName, 'BUTTON'); assert.equal(button.type, 'button');
    assert.match(button.getAttribute('aria-label'), /inspection privée/);
    assert.equal(button.firstElementChild.alt, nativeEvents[index].card.name);
    assert.equal(button.firstElementChild.referrerPolicy, 'no-referrer');
    button.dispatch('click');
    assert.equal(button.getAttribute('aria-pressed'), 'true');
    assert.equal(inspection.details.firstElementChild.textContent, nativeEvents[index].card.name);
  }
});

test('recipient authorization precedes card getters and any image or DOM allocation for both native controllers', () => {
  for (const playerController of [0, 1]) {
    const { inspection, document, game, imageRequests, detailsLookups } = fixture();
    game.playerController = playerController;
    let reads = 0;
    const base = { ...nativeEvents[0], audienceController: playerController,
      get card() { reads += 1; throw new Error('Unauthorized identity was accessed'); } };
    for (const override of [{ audienceController: 1 - playerController }, { audienceController: '1' },
      { audienceController: 255 }, { private: false }, { private: 1 }, { nativeAudienceConfirmed: false },
      { nativeAudienceConfirmed: 1 }, { inspectionGroupId: undefined }, { inspectionGroupId: 'unconfirmed' }]) {
      const event = Object.create(base); Object.assign(event, override);
      assert.equal(inspection.handle(event, game), true, 'even rejected private events are consumed');
    }
    game.playerController = undefined; assert.equal(inspection.handle(base, game), true);
    game.playerController = playerController; game.winner = 'opponent'; assert.equal(inspection.handle(base, game), true);
    assert.equal(reads, 0); assert.equal(imageRequests.length, 0); assert.equal(detailsLookups.length, 0);
    assert.equal(document.body.children.length, 0);
  }
});

test('authorized printed CDB descriptions and local art enrich the panel without a duel instance or native stat query', async () => {
  const resources = await loadNativeCardResources({ fetch: async url => ({ ok: true,
    json: async () => JSON.parse(readFileSync(new URL(`../public${url}`, import.meta.url), 'utf8')) }) });
  const { document, game } = fixture();
  game.resources = resources;
  game.queryCard = () => { throw new Error('Private inspection queried native stats'); };
  const inspection = new PrivateCardInspection({ documentRef: document,
    imageUrl: card => safeImageUrl(card.image_url, '/cards/native-unknown.png'),
    cardDetails: (card, current) => createNativeCardPresentationTemplate(current.resources, card.id) });
  const original = nativeEvents[0];
  assert.equal(original.card.desc, undefined, 'the native audience descriptor deliberately omits long printed text');
  inspection.handle(original, game);
  const printed = createNativeCardPresentationTemplate(resources, original.card.id);
  assert.equal(inspection.details.children[2].textContent, printed.desc);
  assert.ok(printed.desc.length > 0);
  assert.equal(inspection.list.firstElementChild.firstElementChild.firstElementChild.src,
    safeImageUrl(printed.image_url, '/cards/native-unknown.png'));
  assert.equal('nativeRef' in inspection.cards[0], false);
});

test('a different group or duel replaces old cards, and closing or Escape drops all inspection state', () => {
  const { inspection, document, game } = fixture();
  for (const event of nativeEvents) inspection.handle(event, game);
  const old = inspection.panel;
  inspection.handle({ ...nativeEvents[0], inspectionGroupId: 'native-private-inspection-2' }, game);
  assert.equal(old.parentElement, null);
  assert.equal(document.body.children.length, 1); assert.equal(inspection.cards.length, 1);
  const previous = inspection.panel;
  inspection.handle(nativeEvents[1], { playerController: 1, winner: null });
  assert.equal(previous.parentElement, null);
  assert.equal(inspection.cards.length, 1); assert.equal(inspection.cards[0].name, nativeEvents[1].card.name);
  inspection.panel.firstElementChild.children[1].dispatch('click');
  assert.equal(document.body.children.length, 0); assert.equal(inspection.game, null);
  assert.equal(inspection.groupId, null); assert.deepEqual(inspection.cards, []); assert.equal(inspection.selectedButton, null);
  inspection.handle(nativeEvents[0], game); inspection.panel.dispatch('keydown', { key: 'Escape' });
  assert.equal(document.body.children.length, 0); assert.equal(inspection.details, null);
  inspection.clear(); assert.equal(document.body.children.length, 0);
});

test('authorized opposing Deck cards use text nodes and local details without reading runtime identity or active image URLs', () => {
  const { inspection, game } = fixture();
  const card = { id: '123', name: '<img src=x onerror=alert(1)>', type: '<script>type</script>',
    desc: '<script>private description</script>', image_url: 'javascript:alert(1)',
    get uid() { throw new Error('Runtime identity read'); },
    get nativeRef() { throw new Error('Private native reference read'); },
    get getAtk() { throw new Error('Native stats queried'); } };
  inspection.handle({ ...nativeEvents[0], target: 'opponent', zoneType: 'deck', card }, game);
  assert.equal(inspection.details.firstElementChild.textContent, card.name);
  assert.equal(inspection.details.children[2].textContent, card.desc);
  assert.equal(inspection.list.firstElementChild.firstElementChild.firstElementChild.src, '/cards/123.jpg');
  assert.equal('uid' in inspection.cards[0], false); assert.equal('nativeRef' in inspection.cards[0], false);
  assert.equal('getAtk' in inspection.cards[0], false);
});

test('the actual main animation router consumes authorized and rejected inspections before public or campaign consumers', () => {
  const { inspection, game } = fixture();
  const source = readFileSync(new URL('../main.js', import.meta.url), 'utf8');
  const handler = source.match(/function handleGameAnimations\(event\) \{[^]*?\n\}/)?.[0];
  assert.ok(handler);
  let publicCalls = 0;
  const publicConsumer = () => { publicCalls += 1; throw new Error('Private event reached a public consumer'); };
  let publicPanelClears = 0;
  const route = vm.runInNewContext(`(${handler})`, { game, privateCardInspection: inspection,
    publicCardConfirmation: { clear() { publicPanelClears++; }, handle: publicConsumer },
    campaignTracker: { recordAnimation: publicConsumer }, duelViewController: { playAnimation: publicConsumer },
    document: { getElementById: publicConsumer } });
  route(nativeEvents[0]);
  assert.equal(inspection.cards.length, 1);
  route({ ...nativeEvents[0], audienceController: 0, get card() { throw new Error('Wrong audience card read'); } });
  route({ type: 'activate', private: true, get card() { throw new Error('Other private payload read'); } });
  assert.equal(publicCalls, 0);
  assert.equal(publicPanelClears, 2, 'Both inspection messages retire the previous public confirmation');
});

test('new Duel, configuration return and game over clear the actual private panel before other work', () => {
  const source = readFileSync(new URL('../main.js', import.meta.url), 'utf8');
  for (const name of ['initGameInstance', 'returnToConfiguration', 'handleGameOver']) {
    const firstStatement = source.match(new RegExp(`(?:async )?function ${name}\\([^]*?\\) \\{\\s*([^;]+;)`))?.[1];
    assert.equal(firstStatement, 'privateCardInspection.clear();', name);
    const firstTwo = source.match(new RegExp(`(?:async )?function ${name}\\([^]*?\\) \\{\\s*([^;]+;)\\s*([^;]+;)`));
    assert.equal(firstTwo?.[2], 'publicCardConfirmation.clear();', name);
  }
});
