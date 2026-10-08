import test from 'node:test';
import assert from 'node:assert/strict';
import { NativeBufferReader, readNativeMessage, OcgMessageType as M, OcgLocation as L, OcgPosition as P } from '../src/core/native/vendor/ocgcore/index.js';
import { NativeDuelGame } from '../src/core/native/NativeDuelGame.js';
import { translateNativeVisualEvents } from '../src/core/native/NativeDuelVisualEvents.js';

function payload(from, to) {
  // Pinned core operations.cpp step 6 and libduel.cpp ShuffleSetCard write
  // an 8-bit count, all source locations, then all destination locations.
  const view = new DataView(new ArrayBuffer(3 + 20 * from.length + 2));
  let offset = 0;
  view.setUint8(offset++, M.SHUFFLE_SET_CARD); view.setUint8(offset++, L.SZONE);
  view.setUint8(offset++, from.length);
  for (const loc of [...from, ...to]) {
    view.setUint8(offset++, loc.controller); view.setUint8(offset++, loc.location);
    view.setUint32(offset, loc.sequence, true); offset += 4;
    view.setUint32(offset, loc.position, true); offset += 4;
  }
  view.setUint8(offset++, M.NEW_TURN); view.setUint8(offset, 1);
  return new NativeBufferReader(view);
}
const sources = [0,1,2].map(sequence => ({ controller: 0, location: L.SZONE, sequence, position: P.FACEDOWN }));
const masked = sources.map(() => ({ controller: 0, location: 0, sequence: 0, position: 0 }));

test('observed three-Set message preserves all sources and intentionally masked destinations without EOF', () => {
  const reader = payload(sources, masked);
  assert.deepEqual(readNativeMessage(reader), { type: M.SHUFFLE_SET_CARD, location: L.SZONE,
    cards: sources.map((from,index) => ({ from, to: masked[index] })) });
  assert.equal(reader.avail, 2);
  assert.deepEqual(readNativeMessage(reader), { type: M.NEW_TURN, player: 1 });
  assert.equal(reader.avail, 0);
});
test('separate nonzero destination block remains distinct from every source', () => {
  const destination = sources.map(loc => ({ ...loc, sequence: (loc.sequence + 1) % 3 }));
  const message = readNativeMessage(payload(sources, destination));
  assert.deepEqual(message.cards.map(card => card.from.sequence), [0,1,2]);
  assert.deepEqual(message.cards.map(card => card.to.sequence), [1,2,0]);
});
test('masked shuffle invalidates old projection references and public metadata without querying identities', () => {
  const game = new NativeDuelGame({}, {});
  game.runtime = { constants: { OcgMessageType: M, OcgLocation: L, OcgPosition: P } };
  const message = readNativeMessage(payload(sources, masked));
  // Exercise the same key construction as the Game's real projection maps.
  const key = loc => `${loc.controller}:${loc.location}:${loc.sequence}:${loc.overlay_sequence ?? '-'}`;
  for (const loc of sources) {
    game._slotIds.set(key(loc), { uid: 'previously-known', code: 123 });
    game._annotations.set(key(loc), { hasAttacked: true });
    game._fieldActivations.set(key(loc), { state: 'resolved' });
  }
  game._processMessages([message]);
  assert.equal(game._slotIds.size, 0); assert.equal(game._annotations.size, 0);
  assert.equal(game._fieldActivations.size, 0);
  const context = { playerController: 0, publicCards: new Map(sources.map(loc => [key(loc), { id: 123 }])),
    publicCodes: new Map(sources.map(loc => [key(loc), 123])),
    queryCard: () => { throw Error('Hidden shuffle must not query a card identity'); },
    getCardMetadata: () => { throw Error('Hidden shuffle must not read card metadata'); } };
  const result = translateNativeVisualEvents(message, context);
  assert.equal(context.publicCards.size, 0); assert.equal(context.publicCodes.size, 0);
  assert.equal(result.events.length, 3);
  for (const event of result.events) {
    assert.equal(event.card, null); assert.equal(event.to, null);
    assert.equal(event.hidden, true); assert.equal(event.faceDown, true);
  }
});
