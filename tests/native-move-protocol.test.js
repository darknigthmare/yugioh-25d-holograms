import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { NativeBufferReader, readNativeMessage, OcgMessageType, OcgLocation,
  OcgPosition } from '../src/core/native/vendor/ocgcore/index.js';

function movePayload(reason, overlaySequence = 0) {
  // Native MSG_MOVE: type u8, code u32, two ten-byte info_location records,
  // then reason u32. For overlays, the location's final u32 is its index.
  // This is La Jinn's observed Utopia material move to an Extra Deck host.
  const bytes = new Uint8Array(31);
  const view = new DataView(bytes.buffer);
  let offset = 0;
  view.setUint8(offset++, OcgMessageType.MOVE);
  view.setUint32(offset, 97590747, true); offset += 4;
  for (const [location, positionOrOverlay] of [
    [OcgLocation.MZONE, OcgPosition.FACEUP_ATTACK],
    [OcgLocation.EXTRA | OcgLocation.OVERLAY, overlaySequence]
  ]) {
    view.setUint8(offset++, 0);
    view.setUint8(offset++, location);
    view.setUint32(offset, 0, true); offset += 4;
    view.setUint32(offset, positionOrOverlay, true); offset += 4;
  }
  view.setUint32(offset, reason, true); offset += 4;
  view.setUint8(offset++, OcgMessageType.NEW_TURN);
  view.setUint8(offset, 1);
  return new NativeBufferReader(view);
}

test('MSG_MOVE preserves native Xyz material reason and consumes the complete payload', () => {
  const reader = movePayload(0x200008);
  assert.deepEqual(readNativeMessage(reader), {
    type: OcgMessageType.MOVE, card: 97590747,
    from: { controller: 0, location: OcgLocation.MZONE, sequence: 0, position: OcgPosition.FACEUP_ATTACK },
    to: { controller: 0, location: OcgLocation.EXTRA, sequence: 0,
      position: OcgPosition.FACEUP_ATTACK, overlay_sequence: 0 },
    reason: 0x200008 // REASON_MATERIAL | REASON_XYZ, directly from the wire.
  });
  assert.equal(reader.avail, 2);
  assert.deepEqual(readNativeMessage(reader), { type: OcgMessageType.NEW_TURN, player: 1 });
  assert.equal(reader.avail, 0);
});

test('MSG_MOVE reason remains unsigned and independent of the overlay index', () => {
  const reader = movePayload(0x80000040, 1);
  const message = readNativeMessage(reader);
  assert.equal(message.reason, 2147483712);
  assert.equal(message.to.overlay_sequence, 1);
  assert.equal(reader.avail, 2);
});

test('local MOVE decoder and declaration patches preserve the exact upstream TypeScript', async () => {
  const base = new URL('../src/core/native/vendor/ocgcore/', import.meta.url);
  for (const [file, expected] of [
    ['messages.ts', '16c94ab5afa9f909fdec98b25ac96aa2e0ebf28a0a5228351b9e165e3cd7e6df'],
    ['type_message.ts', '205f9b71339a8a873c6a66242354e8b31748f6d85b835416bd80dd8f25f8c4da']
  ]) {
    const source = await readFile(new URL(`upstream-source/src/${file}`, base));
    assert.equal(createHash('sha256').update(source).digest('hex'), expected, file);
  }
  const declarations = await readFile(new URL('index.d.ts', base), 'utf8');
  const move = declarations.match(/export declare interface OcgMessageMove \{[\s\S]*?\n\}/)?.[0];
  assert.match(move, /reason: number;/);
});
