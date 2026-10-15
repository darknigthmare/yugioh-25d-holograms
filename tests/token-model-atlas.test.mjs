import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { TOKEN_PRESENTATION_CATALOG, getTokenPresentationProfile } from '../src/ui/TokenMonsterProfiles.js';
import { filterTokenAtlasProfiles, formatTokenAtlasStat, normalizeTokenAtlasSearch, TokenModelAtlas } from '../src/ui/TokenModelAtlas.js';
import { TokenModelAtlasPreview, disposeTokenAtlasModel, prepareTokenAtlasPresentation, createTokenModelAtlasPreview } from '../src/ui/TokenModelAtlasPreview.js';
import { DuelistAvatarPreviewLifecycle } from '../src/ui/DuelistAvatarPreviewLifecycle.js';

function previewFixture() {
  const calls = [];
  const host = { isConnected: true, clientWidth: 360, clientHeight: 400, dataset: {} };
  const renderer = {
    domElement: { dataset: {}, setAttribute(name, value) { calls.push(['attribute', name, value]); }, remove() { calls.push(['remove']); } },
    setSize(width, height) { calls.push(['size', width, height]); }, render() { calls.push(['render']); },
    dispose() { calls.push(['dispose-renderer']); }, forceContextLoss() { calls.push(['context-loss']); }
  };
  const preview = Object.assign(Object.create(TokenModelAtlasPreview.prototype), {
    host, document: { hidden: false }, window: {}, disposed: false, visible: true, intersecting: true,
    defense: false, angle: 0, model: null, listeners: [], pointer: null,
    scene: new THREE.Scene(), camera: new THREE.PerspectiveCamera(37, 1, .1, 80),
    floor: new THREE.Mesh(new THREE.CircleGeometry(2, 12), new THREE.MeshStandardMaterial()), renderer
  });
  preview.scene.add(preview.floor);
  return { preview, host, calls };
}

test('Atlas filters keep exact native codes, presentation identities and record categories', () => {
  const categories = ['duel', 'decorative', 'placeholder'].map(kind => filterTokenAtlasProfiles({ kind }));
  assert.equal(categories.reduce((total, entries) => total + entries.length, 0), TOKEN_PRESENTATION_CATALOG.length);
  assert.equal(new Set(TOKEN_PRESENTATION_CATALOG.map(entry => entry.presentationId)).size, TOKEN_PRESENTATION_CATALOG.length);
  for (const entries of categories) assert.ok(entries.every(entry => entry.kind === entries[0]?.kind));
  for (const code of ['73915052', '73915053', '73915054', '73915055']) {
    const entries = filterTokenAtlasProfiles({ kind: 'duel', query: code });
    assert.ok(entries.some(entry => entry.cardId === code), `Sheep Token ${code} remains distinct`);
    assert.ok(filterTokenAtlasProfiles({ kind: 'duel', query: 'mouton' }).some(entry => entry.cardId === code));
  }
  const placeholders = filterTokenAtlasProfiles({ kind: 'placeholder' });
  assert.ok(placeholders.length >= 3);
  assert.ok(placeholders.every(entry => !entry.modelAvailable));
  assert.equal(filterTokenAtlasProfiles({ query: '<script>no-token</script>' }).length, 0);
});

test('search handles French accents and human race/attribute labels without altering source stats', () => {
  assert.equal(normalizeTokenAtlasSearch('  BÊTE TÉNÈBRES  '), 'bete tenebres');
  for (const entry of TOKEN_PRESENTATION_CATALOG.filter(profile => profile.kind === 'duel').slice(0, 20)) {
    assert.ok(filterTokenAtlasProfiles({ query: entry.name.toUpperCase(), race: entry.race, attribute: entry.attribute }).some(result => result.presentationId === entry.presentationId));
  }
  assert.equal(formatTokenAtlasStat(-2), '?');
  assert.equal(formatTokenAtlasStat(null), '—');
  assert.equal(formatTokenAtlasStat(undefined), '—');
  assert.equal(formatTokenAtlasStat(0), '0');
  assert.equal(formatTokenAtlasStat(1234), '1234');
});

test('illustrated companions are searchable in French and in the printed names', () => {
  for (const [query, id] of [
    ['Yugi Magicien Sombre', 'commemorative:LDK2-ENT01'],
    ['Yugi Dark Magician', 'commemorative:LDK2-ENT01'],
    ['Kaiba Dragon Blanc Yeux Bleus', 'commemorative:LDK2-ENT02'],
    ['Joey Dragon Noir Yeux Rouges', 'commemorative:LDK2-ENT03']
  ]) {
    assert.ok(filterTokenAtlasProfiles({ query }).some(entry => entry.presentationId === id), query);
  }
});

test('actual Token preview rejects unknown or placeholder identities while preserving its current model', () => {
  const { preview } = previewFixture();
  const profile = TOKEN_PRESENTATION_CATALOG.find(entry => entry.kind === 'duel' && entry.modelAvailable);
  preview.setAvatar(profile.presentationId);
  const model = preview.model;
  assert.equal(preview.profile, getTokenPresentationProfile(profile.presentationId));
  assert.throws(() => preview.setAvatar('duel:unknown'));
  const placeholder = TOKEN_PRESENTATION_CATALOG.find(entry => entry.kind === 'placeholder');
  assert.throws(() => preview.setAvatar(placeholder.presentationId));
  assert.equal(preview.model, model);
  preview.dispose();
});

test('actual Token preview keeps one renderer on swaps and releases old geometry and pose resources', () => {
  const { preview, host, calls } = previewFixture();
  const entries = TOKEN_PRESENTATION_CATALOG.filter(entry => entry.kind === 'duel' && entry.modelAvailable).slice(0, 2);
  const renderer = preview.renderer;
  preview.setAvatar(entries[0].presentationId);
  const old = preview.model;
  const oldRig = old.userData.poseRig;
  let geometryDisposals = 0;
  old.traverse(object => object.geometry?.addEventListener('dispose', () => geometryDisposals++));
  preview.setAvatar(entries[1].presentationId);
  assert.ok(geometryDisposals > 0);
  assert.equal(oldRig.disposed, true);
  assert.equal(old.parent, null);
  assert.equal(preview.renderer, renderer);
  assert.equal(host.dataset.tokenCardId, entries[1].cardId);
  assert.equal(host.dataset.tokenPresentationId, entries[1].presentationId);
  preview.rotateBy(Math.PI / 8);
  const angle = preview.angle;
  const oldAttack = preview.model;
  preview.setPose('defense');
  assert.notEqual(preview.model, oldAttack);
  assert.equal(oldAttack.userData.poseRig.disposed, true);
  assert.equal(preview.angle, angle);
  assert.equal(host.dataset.tokenPose, 'defense');
  const defense = preview.model;
  assert.equal(preview.setPose('unsupported'), false);
  assert.equal(preview.model, defense);
  preview.dispose(); preview.dispose();
  assert.equal(calls.filter(call => call[0] === 'dispose-renderer').length, 1);
  assert.equal(calls.filter(call => call[0] === 'context-loss').length, 1);
});

test('shared group resources are released once even when referenced by multiple Token meshes', () => {
  const model = new THREE.Group();
  const geometry = new THREE.BoxGeometry();
  const material = new THREE.MeshStandardMaterial();
  model.add(new THREE.Mesh(geometry, material), new THREE.Mesh(geometry, material));
  let geometries = 0, materials = 0, rigs = 0;
  geometry.addEventListener('dispose', () => geometries++); material.addEventListener('dispose', () => materials++);
  model.userData.poseRig = { dispose() { rigs++; } };
  disposeTokenAtlasModel(model);
  assert.deepEqual([geometries, materials, rigs], [1, 1, 1]);
  assert.equal(model.children.length, 0);
});

test('verified commemoratives render every illustrated subject and release the whole scene when returning to a Token', async () => {
  const expected = new Map([['commemorative:YGLD-ENTKN', 'atem'], ['commemorative:LDK2-ENT01', 'atem'], ['commemorative:LDK2-ENT02', 'kaiba'], ['commemorative:LDK2-ENT03', 'joey']]);
  const { preview, host } = previewFixture();
  const renderer = preview.renderer;
  for (const [id, avatarId] of expected) {
    const profile = await prepareTokenAtlasPresentation(id);
    assert.equal(profile.cardId, null);
    assert.equal(profile.tokenAnatomy, null);
    for (const key of ['atk', 'def', 'level', 'race', 'attribute']) assert.equal(profile[key], null);
    const previous = preview.compositionModel;
    preview.setAvatar(id);
    if (previous) assert.equal(previous.disposed, true);
    assert.equal(preview.compositionModel.avatarId, avatarId);
    assert.equal(preview.model.userData.avatarId, avatarId);
    assert.deepEqual(preview.compositionModel.subjects.map(subject => subject.name), profile.illustratedCharacters);
    assert.equal(preview.compositionModel.subjects.length, id.endsWith('YGLD-ENTKN') ? 1 : 2);
    for (const subject of preview.compositionModel.subjects) {
      assert.ok(subject.group.isObject3D);
      let vertices = 0;
      subject.group.traverse(object => { vertices += object.geometry?.attributes.position.count || 0; });
      assert.ok(vertices > 0, `${subject.name} must have actual 3D geometry`);
    }
    assert.equal(host.dataset.tokenCardId, '');
    assert.equal(host.dataset.tokenAvatarId, avatarId);
    assert.equal(host.dataset.tokenModelKind, 'illustration-composition');
    assert.equal(host.dataset.tokenPose, 'illustration');
    assert.equal(host.dataset.tokenSubjectCount, String(profile.illustratedCharacters.length));
    assert.equal(preview.renderer, renderer);
    assert.equal(preview.setPose('defense'), false);
    preview.rotateBy(.5);
    assert.equal(preview.angle, .5);
  }
  const composition = preview.compositionModel;
  const token = TOKEN_PRESENTATION_CATALOG.find(profile => profile.kind === 'duel' && profile.modelAvailable);
  preview.setAvatar(token.presentationId);
  assert.equal(composition.disposed, true);
  assert.equal(preview.compositionModel, null);
  assert.equal(host.dataset.tokenAvatarId, '');
  assert.equal(host.dataset.tokenModelKind, 'token-monster');
  assert.equal(host.dataset.tokenCardId, token.cardId);
  preview.dispose();
});

test('a character resource load finishing after close never constructs a renderer or mounts a canvas', async () => {
  const profile = getTokenPresentationProfile('commemorative:LDK2-ENT02');
  const result = await createTokenModelAtlasPreview({ isConnected: true }, profile, { isActive: () => false });
  assert.equal(result, null);
  let creations = 0;
  const atlas = Object.assign(Object.create(TokenModelAtlas.prototype), {
    disposed: false, visible: true, previewRequest: 0, selectedId: profile.presentationId,
    dialogElement: { querySelector() { return { hidden: true }; } }, previewHost: { isConnected: true },
    previewLifecycle: { show() { creations++; }, hide() {} }, _setPreviewState() {}, closeDialog() {}
  });
  const operation = atlas._showPreview();
  atlas.close();
  await operation;
  assert.equal(creations, 0);
});

test('a Token preview import finishing after Atlas close cannot mount a late canvas', async () => {
  let resolve;
  const gate = new Promise(done => { resolve = done; });
  let active = true, creations = 0;
  const lifecycle = new DuelistAvatarPreviewLifecycle({ isActive: () => active, loadPreview: () => gate });
  const host = { isConnected: true };
  const promise = lifecycle.show({ id: 'duel:73915052' }, host);
  active = false; lifecycle.hide();
  resolve({ createDuelistAvatarPreview3D() { creations++; throw new Error('Must never construct after close'); } });
  assert.equal(await promise, false);
  assert.equal(creations, 0);
  assert.equal(lifecycle.preview, null);
});

test('Atlas close disposes its public preview before delegating modal/focus restoration', () => {
  const calls = [];
  const dialogElement = { name: 'token-atlas-modal' };
  const atlas = Object.assign(Object.create(TokenModelAtlas.prototype), {
    disposed: false, visible: true, dialogElement,
    previewLifecycle: { hide() { calls.push('release-preview'); } },
    closeDialog(dialog) { assert.equal(dialog, dialogElement); calls.push('restore-modal-focus'); }
  });
  atlas.close();
  assert.equal(atlas.visible, false);
  assert.deepEqual(calls, ['release-preview', 'restore-modal-focus']);
});
