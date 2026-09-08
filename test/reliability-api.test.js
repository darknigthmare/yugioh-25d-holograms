import assert from 'node:assert/strict';
import test from 'node:test';
import { getCardById, normalizeCardData, searchCards } from '../src/api.js';
import { escapeHtml, safeImageUrl } from '../src/security.js';

function installGlobals(t, values) {
  for (const [key, value] of Object.entries(values)) {
    const original = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
    t.after(() => {
      if (original) Object.defineProperty(globalThis, key, original);
      else delete globalThis[key];
    });
  }
  t.mock.method(console, 'warn', () => {});
  t.mock.method(console, 'error', () => {});
}

function storage() {
  const values = new Map();
  return {
    values,
    get length() { return values.size; },
    key: index => [...values.keys()][index] ?? null,
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: key => values.delete(key)
  };
}

function apiCard(id = 98765001, extra = {}) {
  return { id, name: 'Remote example', type: 'Normal Monster', atk: 1000, def: 1000, ...extra };
}

function response(cards, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => ({ data: cards }) };
}

function cachedCard(id, extra = {}) {
  return JSON.stringify({
    version: 4,
    cachedAt: Date.now() - 10,
    card: { ...normalizeCardData(apiCard(id)), ...extra }
  });
}

test('canonical local rules data wins over even a current-shaped catalogue cache', async t => {
  const cache = storage();
  cache.setItem('ygo_card_89631139', cachedCard(89631139, { name: 'False Dragon', atk: 900000 }));
  installGlobals(t, { localStorage: cache, fetch: () => assert.fail('local cards require no network') });
  const card = await getCardById('089631139');
  assert.equal(card.name, 'Dragon Blanc aux Yeux Bleus');
  assert.equal(card.atk, 3000);
});

test('cache hits preserve Sandbox metadata but cannot inject strict support or arbitrary rule fields', async t => {
  const cache = storage();
  cache.setItem('ygo_card_98765001', cachedCard(98765001, {
    supportedInStrict: true, effectKey: 'draw', customEffect: 'grant-win', atk: 'Infinity'
  }));
  installGlobals(t, { localStorage: cache, fetch: () => assert.fail('valid cache needs no network') });
  const card = await getCardById(98765001);
  assert.equal(card.supportedInStrict, false);
  assert.equal(card.atk, 0);
  assert.equal(Object.hasOwn(card, 'effectKey'), false);
  assert.equal(Object.hasOwn(card, 'customEffect'), false);
});

test('cache rejects protocol-relative images, wrong identities, future timestamps and invalid JSON', async t => {
  const cache = storage();
  const badEntries = [
    cachedCard(98765001, { image_url: '//attacker.invalid/image.png' }),
    cachedCard(98765002),
    JSON.stringify({ version: 4, cachedAt: Date.now() + 60000, card: normalizeCardData(apiCard()) }),
    '{invalid-json',
    'x'.repeat(20001)
  ];
  installGlobals(t, { localStorage: cache, fetch: async () => response([], 404) });
  for (const entry of badEntries) {
    cache.setItem('ygo_card_98765001', entry);
    assert.equal(await getCardById(98765001), null);
    assert.equal(cache.getItem('ygo_card_98765001'), null);
  }
});

test('remote catalogue normalization accepts only bounded text and finite numeric metadata', () => {
  assert.equal(normalizeCardData(null), null);
  assert.equal(normalizeCardData({ id: '<img src=x>' }), null);
  const card = normalizeCardData(apiCard(98765001, {
    name: 'x'.repeat(1000), desc: 'd'.repeat(20000), type: {}, atk: Infinity,
    def: {}, level: NaN, attribute: '<script>', linkmarkers: ['Top', {}, 'Injected']
  }));
  assert.equal(card.name.length, 128);
  assert.equal(card.desc.length, 8000);
  assert.equal(card.type, 'Normal Monster');
  assert.equal(card.atk, 0);
  assert.equal(card.def, 0);
  assert.equal(card.level, 0);
  assert.equal(card.attribute, 'LIGHT');
  assert.deepEqual(card.linkMarkers, ['Top']);
});

test('search handles a large response without normalizing/caching the whole catalogue', async t => {
  const cache = storage();
  const cards = Array.from({ length: 1000 }, (_, index) => apiCard(98000000 + index));
  // Accessing unused fields in the tail would expose an unbounded .map().
  cards[40] = { get type() { assert.fail('unused search tail must not be normalized'); }, id: 98000040 };
  installGlobals(t, { localStorage: cache, fetch: async () => response(cards) });
  const results = await searchCards('remote', { limit: 7 });
  assert.equal(results.length, 7);
  assert.equal(cache.length, 7);
});

test('catalogue cache is bounded and eviction never removes player settings or decks', async t => {
  const cache = storage();
  cache.setItem('ygo_deck_builder', 'my-deck');
  cache.setItem('ygo_preferences', 'my-settings');
  let batch = 0;
  installGlobals(t, {
    localStorage: cache,
    fetch: async () => response(Array.from({ length: 50 }, (_, index) => apiCard(97000000 + batch * 50 + index)))
  });
  for (; batch < 5; batch += 1) await searchCards('remote', { limit: 50 });
  assert.equal(cache.length, 152);
  assert.equal(cache.getItem('ygo_deck_builder'), 'my-deck');
  assert.equal(cache.getItem('ygo_preferences'), 'my-settings');
  assert.equal(cache.getItem('ygo_card_97000000'), null);
  assert.ok(cache.getItem('ygo_card_97000249'));
});

test('timeout restores bounded local results and aborts the hung request', async t => {
  let requestSignal;
  installGlobals(t, {
    localStorage: storage(),
    fetch: (_url, { signal }) => new Promise((_resolve, reject) => {
      requestSignal = signal;
      signal.addEventListener('abort', () => reject(signal.reason), { once: true });
    })
  });
  const results = await searchCards('dragon', { timeoutMs: 5, limit: 1 });
  assert.equal(results.length, 1);
  assert.equal(requestSignal.aborted, true);
  assert.equal(requestSignal.reason.name, 'TimeoutError');
});

test('timeout also covers a response body which never finishes loading', async t => {
  installGlobals(t, {
    fetch: async (_url, { signal }) => ({
      ok: true, status: 200,
      json: () => new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(signal.reason), { once: true }))
    }),
    localStorage: storage()
  });
  assert.equal(await getCardById(98765001, { timeoutMs: 5 }), null);
});

test('caller cancellation is not displayed as local fallback and prevents cache writes', async t => {
  const controller = new AbortController();
  const cache = storage();
  installGlobals(t, {
    localStorage: cache,
    fetch: async () => {
      controller.abort();
      return response([apiCard()]);
    }
  });
  assert.deepEqual(await searchCards('dragon', { signal: controller.signal }), []);
  assert.equal(cache.length, 0);
  globalThis.fetch = () => assert.fail('a previously aborted request must not fetch');
  assert.equal(await getCardById(89631139, { signal: controller.signal }), null);
  assert.deepEqual(await searchCards('dragon', { signal: controller.signal }), []);
});

test('exact lookup refuses an API response containing another card', async t => {
  const cache = storage();
  installGlobals(t, { localStorage: cache, fetch: async () => response([apiCard(98765002)]) });
  assert.equal(await getCardById(98765001), null);
  assert.equal(cache.length, 0);
});

test('network failures and invalid options retain predictable local search limits', async t => {
  installGlobals(t, { localStorage: storage(), fetch: async () => { throw new Error('offline'); } });
  assert.equal((await searchCards('dragon', { limit: 1 })).length, 1);
  assert.ok((await searchCards('dragon', { limit: NaN })).length > 0);
  assert.deepEqual(await searchCards({ toString: () => 'dragon' }), []);
  assert.equal(await getCardById('9'.repeat(1000)), null);
});

test('quota and denied storage do not make available API results disappear', async t => {
  installGlobals(t, {
    localStorage: { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('quota'); } },
    fetch: async () => response([apiCard()])
  });
  assert.equal((await getCardById(98765001)).id, '98765001');
  assert.equal((await searchCards('remote')).length, 1);
});

test('security helpers keep text inert and refuse executable image URL schemes', () => {
  assert.equal(escapeHtml('<img src=x onerror="bad()">&\''), '&lt;img src=x onerror=&quot;bad()&quot;&gt;&amp;&#039;');
  for (const value of ['javascript:alert(1)', 'data:text/html,x', 'file:///c:/secret', 'vbscript:x']) {
    assert.equal(safeImageUrl(value, '/fallback.png'), '/fallback.png');
  }
  assert.equal(safeImageUrl('/custom-card-back.png'), 'http://localhost/custom-card-back.png');
  assert.equal(safeImageUrl('https://example.invalid/card.png'), 'https://example.invalid/card.png');
});
