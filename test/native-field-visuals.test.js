import test from 'node:test';
import assert from 'node:assert/strict';
import { createPublicCombatVisual } from '../src/ui/PublicDuelVisuals.js';
import { createCombatVisualEffect } from '../src/ui/CombatVisualEffects.js';
import { translateNativeVisualEvents, createNativeVisualContext } from '../src/core/native/NativeDuelVisualEvents.js';
import { resolveCombatVisualProfile } from '../src/ui/CombatVisualProfiles.js';
import { OcgMessageType as M, OcgLocation as L, OcgPosition as P } from '../src/core/native/vendor/ocgcore/index.js';

const fieldEvent = (id, extra = {}) => ({ type: 'field-source-change', target: 'player', zoneType: 'field',
  zoneIndex: 0, resolved: true, active: true, card: { id, type: 'Field Spell', name: 'Public source',
    uid: 'PRIVATE-INSTANCE', targets: ['PRIVATE-TARGET'] }, ...extra });
const visual = event => createPublicCombatVisual(event, {}, () => [0, 1, 0]);

test('native field declarations and completed resolutions use separate presentation stages', () => {
  const resolved = fieldEvent('22702055');
  const declaration = { ...resolved, type: 'activate', nativeChain: true };
  assert.equal(resolveCombatVisualProfile(visual(declaration)).shape, 'rune');
  assert.equal(resolveCombatVisualProfile(visual(resolved)).shape, 'field-water');
  for (const extra of [{ resolved: false }, { active: false }, { negated: true }, { faceDown: true }]) {
    assert.equal(visual(fieldEvent('22702055', extra)), null);
  }
  assert.doesNotMatch(JSON.stringify(visual(resolved)), /PRIVATE-INSTANCE|PRIVATE-TARGET/);
});

test('a native position reveal has no Flip Summon confirmation and ordinary turns of a card have no reveal effect', () => {
  const code = 15025844;
  const ctx = createNativeVisualContext({
    getCardMetadata: () => ({ id: String(code), name: 'Mystical Elf', type: 'Normal Monster', uid: 'PRIVATE' }),
    queryCard: () => ({ code, attack: 800, defense: 2000 })
  });
  const fromHidden = { type: M.POS_CHANGE, controller: 1, location: L.MZONE, sequence: 1,
    prev_position: P.FACEDOWN_DEFENSE, position: P.FACEUP_DEFENSE, code };
  const reveal = translateNativeVisualEvents(fromHidden, ctx).events[0];
  assert.equal(reveal.type, 'toggle-position');
  assert.equal(reveal.publicReveal, true);
  assert.equal(reveal.position, 'defense');
  assert.notEqual(reveal.nativeSummonConfirmed, true);
  assert.equal(Object.hasOwn(reveal, 'byBattle'), false, 'POS_CHANGE does not identify its cause');
  assert.equal(visual(reveal).profile, 'card-reveal');
  assert.equal(visual(reveal).kind, 'activate');
  const rotation = translateNativeVisualEvents({ ...fromHidden, prev_position: P.FACEUP_ATTACK }, ctx).events[0];
  assert.equal(rotation.publicReveal, false);
  assert.equal(visual(rotation), null);
  translateNativeVisualEvents({ type: M.FLIPSUMMONING, controller: 1, location: L.MZONE, sequence: 1,
    position: P.FACEUP_ATTACK, code }, ctx);
  const actual = translateNativeVisualEvents({ type: M.FLIPSUMMONED }, ctx).events[0];
  assert.equal(actual.type, 'flip-summon');
  assert.equal(actual.nativeSummonConfirmed, true);
  assert.equal(visual(actual).profile, 'flip-summon');
  const hidden = translateNativeVisualEvents({ ...fromHidden, prev_position: P.FACEUP_ATTACK,
    position: P.FACEDOWN_DEFENSE, get code() { throw new Error('Hidden reveal identity was read'); } }, ctx).events[0];
  assert.equal(visual(hidden), null);
});

test('four field motifs use finite bounded geometry and release shared resources once', () => {
  const cases = [
    ['22702055', 'field-water', 'field-water-ripple-0'],
    ['56594520', 'field-growth', 'field-growth-leaf-0'],
    ['47355498', 'field-gloom', 'field-gloom-dim-aperture'],
    ['56433456', 'field-radiance', 'field-radiance-shaft-0']
  ];
  for (const [id, shape, motif] of cases) {
    const effect = createCombatVisualEffect(visual(fieldEvent(id)));
    assert.equal(effect.profile.shape, shape);
    assert.ok(effect.group.getObjectByName(motif));
    assert.ok(effect.group.children.length <= 14, `${shape}: transient draw budget`);
    const resources = new Set();
    effect.group.traverse(object => {
      if (object.geometry) {
        resources.add(object.geometry);
        for (const attribute of Object.values(object.geometry.attributes)) {
          assert.ok([...attribute.array].every(Number.isFinite), shape);
        }
      }
      if (object.material) {
        resources.add(object.material);
        assert.equal(object.material.map, null);
      }
    });
    const disposals = new Map([...resources].map(resource => [resource, 0]));
    for (const resource of resources) resource.addEventListener('dispose', () => disposals.set(resource, disposals.get(resource) + 1));
    for (const progress of [0, .2, .5, .8, 1]) {
      effect.update(progress);
      effect.group.traverse(object => assert.ok([...object.position.toArray(), ...object.scale.toArray(),
        ...object.rotation.toArray().slice(0, 3)].every(Number.isFinite), shape));
    }
    assert.equal(effect.dispose(), true);
    assert.equal(effect.dispose(), false);
    for (const count of disposals.values()) assert.equal(count, 1, shape);
    assert.equal(effect.group.children.length, 0);
  }
});
