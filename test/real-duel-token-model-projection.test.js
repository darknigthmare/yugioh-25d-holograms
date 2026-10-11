import assert from 'node:assert/strict';
import test from 'node:test';
import { Scene, PerspectiveCamera } from 'three';
import { RealDuelScene3D } from '../src/ui/RealDuelScene3D.js';

function fixture() {
  let writes = 0;
  const scene = new RealDuelScene3D({ documentRef: { hidden: false }, windowRef: {} });
  scene.scene = new Scene();
  scene.camera = new PerspectiveCamera();
  scene.renderer = { render() {} };
  scene.root = { dataset: new Proxy({}, { set(target, name, value) { writes++; target[name] = value; return true; } }) };
  return { scene, get writes() { return writes; } };
}

test('constructed field model identities publish only bounded public zone and anatomy metadata', () => {
  const f = fixture();
  let privateReads = 0;
  const card = { id: '89631139', name: 'Public Blue-Eyes', type: 'Normal Monster', race: 'Dragon', attribute: 'LIGHT' };
  for (const name of ['uid', 'atk', 'def', 'effect', 'desc', 'image_url', 'image_url_cropped', 'nativeMetadata']) {
    Object.defineProperty(card, name, { get() { privateReads++; throw new Error(`Private ${name} read`); } });
  }
  const visible = { key: 'caller-private-key-must-not-be-published', owner: 'player', zoneType: 'main', zoneIndex: 2, faceUp: true, card, position: 'attack' };
  try {
    f.scene.updateFieldHolograms([visible]);
    assert.deepEqual(JSON.parse(f.scene.root.dataset.fieldHologramProfiles), [{
      owner: 'player', zoneType: 'main', zoneIndex: 2, cardId: '89631139',
      profileId: 'blue-eyes', anatomy: 'armored-blue-dragon', position: 'attack'
    }]);
    const first = f.scene._fieldHolograms.get(visible.key).object;
    assert.equal(first.userData.profile.id, 'blue-eyes', 'identity belongs to the model actually constructed');
    const writes = f.writes;
    for (let i = 0; i < 100; i++) f.scene.updateFieldHolograms([visible]);
    assert.equal(f.writes, writes, 'unchanged field sync does not write its public dataset');
    assert.equal(f.scene._fieldHolograms.get(visible.key).object, first);
    assert.equal(privateReads, 0);
    assert.equal(f.scene.root.dataset.fieldHologramProfiles.includes(visible.key), false);
    f.scene.updateFieldHolograms([{ ...visible, owner: 'opponent', position: 'defense' }]);
    const changed = JSON.parse(f.scene.root.dataset.fieldHologramProfiles)[0];
    assert.equal(changed.owner, 'opponent');
    assert.equal(changed.position, 'defense');
    assert.notEqual(f.scene._fieldHolograms.get(visible.key).object, first);
    assert.equal(privateReads, 0);
  } finally { f.scene._destroyRenderer(); }
  assert.equal(f.scene.root.dataset.fieldHologramProfiles, '[]');
});

test('concealed field identities and technical caller keys never enter the model inventory', () => {
  const f = fixture();
  let hiddenReads = 0;
  try {
    f.scene.updateFieldHolograms([{
      faceUp: false, owner: 'opponent', zoneType: 'main', zoneIndex: 0,
      get card() { hiddenReads++; throw new Error('Hidden identity read'); }
    }, {
      faceUp: true, hidden: true, owner: 'opponent', zoneType: 'main', zoneIndex: 1,
      get card() { hiddenReads++; throw new Error('Hidden identity read'); }
    }]);
    assert.equal(hiddenReads, 0);
    assert.equal(f.scene.root.dataset.fieldHologramProfiles, '[]');
    assert.equal(f.scene._fieldHolograms.size, 0);
    f.scene.updateFieldHolograms([{ owner: 'player', faceUp: true, zoneType: 'main', zoneIndex: 0,
      key: 'secret-caller-key', card: { id: 'not-a-passcode', type: 'Token Monster' } }]);
    const publicModel = JSON.parse(f.scene.root.dataset.fieldHologramProfiles)[0];
    assert.equal(publicModel.cardId, '');
    assert.deepEqual(Object.keys(publicModel), ['owner', 'zoneType', 'zoneIndex', 'cardId', 'profileId', 'anatomy', 'position']);
    assert.equal(JSON.stringify(publicModel).includes('secret'), false);
    f.scene.updateFieldHolograms([]);
    assert.equal(f.scene.root.dataset.fieldHologramProfiles, '[]');
    assert.equal(f.scene.scene.children.length, 0);
  } finally { f.scene._destroyRenderer(); }
});
