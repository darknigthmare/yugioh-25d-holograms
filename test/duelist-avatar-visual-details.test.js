import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { createDuelistAvatarModel } from '../src/ui/DuelistAvatarModels.js';
import { renderDuelistAvatarPortrait } from '../src/ui/DuelistAvatarPortrait.js';
import { getDuelistAvatar } from '../src/content/DuelistAvatarCatalog.js';
const TRIANGLE_BASELINE = JSON.parse(readFileSync(new URL('./fixtures/duelist-avatar-triangle-baseline-2026-10-11.json', import.meta.url))).triangles;

function coloredVertices(model, tint, joint = null) {
  const color = new THREE.Color(tint);
  const values = [];
  model.group.traverse(mesh => {
    if (!mesh.geometry) return;
    const colors = mesh.geometry.attributes.color;
    const positions = mesh.geometry.attributes.position;
    const indices = mesh.geometry.attributes.skinIndex;
    for (let i = 0; i < colors.count; i += 1) {
      if (Math.abs(colors.getX(i) - color.r) > 1e-6 || Math.abs(colors.getY(i) - color.g) > 1e-6 || Math.abs(colors.getZ(i) - color.b) > 1e-6) continue;
      if (joint !== null && (!indices || indices.getX(i) !== joint)) continue;
      values.push(new THREE.Vector3().fromBufferAttribute(positions, i).applyMatrix4(mesh.matrixWorld));
    }
  });
  return values;
}

function hasParts(id, expected, absent = []) {
  const model = createDuelistAvatarModel(id);
  for (const part of expected) assert.ok(model.group.userData.partNames.includes(part), `${id}: ${part}`);
  for (const part of absent) assert.equal(model.group.userData.partNames.includes(part), false, `${id} omits ${part}`);
  assert.ok(model.group.userData.drawCalls <= 10);
  assert.ok(model.group.userData.triangles <= TRIANGLE_BASELINE[id] * 5);
  return model;
}

test('reference-corrected Yuga and Romin render shorts, canonical gloves and leggings in both representations', () => {
  for (const id of ['yuga', 'romin']) {
    const avatar = getDuelistAvatar(id);
    const model = hasParts(id, ['sport-shorts--1', 'sport-shorts-1'], ['pleated-skirt']);
    const svg = renderDuelistAvatarPortrait(id);
    assert.match(svg, /data-avatar-detail="shorts"/);
    assert.doesNotMatch(svg, /data-avatar-detail="skirt"/);
    assert.ok(coloredVertices(model, avatar.visual.bottomColor, 0).length > 0);
    assert.ok(svg.includes(`fill="${avatar.visual.bottomColor}"`));
    if (id === 'yuga') for (const joint of [3, 7]) assert.ok(coloredVertices(model, avatar.visual.gloveColor, joint).length > 0, 'blue glove moves with the wrist');
    if (id === 'romin') {
      assert.ok(coloredVertices(model, avatar.visual.legwearColor, 0).some(point => point.y < 2));
      assert.ok(svg.includes(`fill="${avatar.visual.legwearColor}"`));
    }
    model.dispose();
  }
});

test('Playmaker VR and Yudias keep their separate helmet, hair and cape palettes', () => {
  for (const id of ['playmaker', 'yudias']) {
    const avatar = getDuelistAvatar(id);
    const model = hasParts(id, ['headgear-helmet', 'headgear-forehead-band', 'star-fringe-0']);
    const svg = renderDuelistAvatarPortrait(id);
    assert.match(svg, /data-avatar-detail="headgear-helmet"/);
    for (const tint of [avatar.visual.hairColor, avatar.visual.hairAccent, avatar.visual.accessoryColor]) {
      assert.ok(coloredVertices(model, tint).length > 0, `${id} canonical ${tint}`);
      assert.ok(svg.includes(tint));
    }
    if (id === 'yudias') {
      assert.ok(model.group.userData.partNames.includes('cape-mantle'));
      const cape = coloredVertices(model, '#466b97');
      assert.ok(cape.length > 0, 'blue cape remains separate from the black helmet');
      assert.ok(Math.max(...cape.map(point => point.z)) < -0.4, 'cape is behind the coat, without coplanar depth flicker');
      assert.match(svg, /data-avatar-detail="cape"[^>]*fill="#466b97"/);
    }
    model.dispose();
  }
});

test('Nyandestar and Bochi are recognizable animal adaptations with no human haircut or necklace', () => {
  const expected = {
    nyandestar: ['animal-cat-ear--1', 'animal-cat-inner-ear-1', 'nyandestar-forehead-star', 'animal-whisker--1-0'],
    bochi: ['animal-dog-ear--1', 'animal-dog-inner-ear-1', 'bochi-white-forehead-stripe', 'bochi-collar-spike-0']
  };
  for (const [id, parts] of Object.entries(expected)) {
    const model = hasParts(id, [...parts, 'animal-tail', 'animal-belly'], ['hair-cap', 'soft-fringe-0', 'necklace-jewel']);
    const svg = renderDuelistAvatarPortrait(id);
    assert.match(svg, new RegExp(`data-avatar-species="${id === 'bochi' ? 'dog' : 'cat'}"`));
    assert.match(svg, /data-avatar-detail="animal-face"/);
    assert.match(svg, /data-avatar-detail="animal-tail"/);
    assert.match(svg, id === 'bochi' ? /data-avatar-detail="bochi-white-forehead-stripe"/ : /data-avatar-detail="nyandestar-forehead-star"/);
    const headMesh = model.group.getObjectByName('duelist-head-matte');
    assert.ok(headMesh.geometry.boundingBox.max.y + headMesh.parent.position.y > 5.7, 'ears stand above the head');
    model.dispose();
  }
});

test('Zuwijo has blond upper locks and purple tips in both representations', () => {
  const model = hasParts('zwijo', ['long-hair-lock-0', 'zwijo-purple-hair-tip-0', 'zwijo-purple-hair-tip-6']);
  const { hairAccent } = getDuelistAvatar('zwijo').visual;
  const tips = coloredVertices(model, hairAccent);
  assert.ok(tips.length > 0);
  assert.ok(Math.max(...tips.map(point => point.y)) < 4.4, 'purple is restricted to lower hair tips');
  assert.match(renderDuelistAvatarPortrait('zwijo'), /data-avatar-detail="zwijo-purple-hair-tips"/);
  model.dispose();
});

test('the once-colliding tall duelists retain distinct canonical clothing instead of numerical jitter', () => {
  const faker = hasParts('dr-faker', ['flowing-robe'], ['girag-open-shirt-chest']);
  const girag = hasParts('girag', ['girag-open-shirt-chest', 'girag-open-shirt-lapel-1'], ['flowing-robe']);
  const shoichi = hasParts('shoichi', ['visible-inner-shirt'], ['girag-open-shirt-chest', 'flowing-robe']);
  assert.match(renderDuelistAvatarPortrait('girag'), /data-avatar-detail="girag-open-shirt-chest"/);
  for (const model of [faker, girag, shoichi]) model.dispose();
});

test('canonical optional visual fields cannot be replaced by supplied species, headgear or private state', () => {
  const supplied = { id: 'bochi', get visual() { throw new Error('untrusted metadata'); }, get gameState() { throw new Error('private state'); } };
  assert.equal(renderDuelistAvatarPortrait(supplied), renderDuelistAvatarPortrait('bochi'));
  const model = hasParts('bochi', ['bochi-white-forehead-stripe']);
  const canonical = createDuelistAvatarModel(supplied);
  assert.deepEqual(canonical.group.userData.partNames, model.group.userData.partNames);
  model.dispose(); canonical.dispose();
});
