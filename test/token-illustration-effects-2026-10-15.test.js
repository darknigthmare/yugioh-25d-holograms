import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { AdditiveBlending } from 'three';
import { createTokenIllustrationEffects, TOKEN_ILLUSTRATION_EFFECT_REFERENCES } from '../src/ui/TokenIllustrationEffects.js';

const ids = Object.keys(TOKEN_ILLUSTRATION_EFFECT_REFERENCES);
const fingerprint = geometry => {
  const digest = createHash('sha256');
  for (const attribute of Object.values(geometry.attributes)) digest.update(Buffer.from(attribute.array.buffer));
  digest.update(Buffer.from(geometry.index.array.buffer));
  return digest.digest('hex');
};

test('four observed commemorative illustrations have local source scans, and other Tokens receive no invented generic effect', async () => {
  assert.equal(ids.length, 4);
  for (const reference of Object.values(TOKEN_ILLUSTRATION_EFFECT_REFERENCES)) {
    const source = await readFile(new URL(`../public${reference.source}`, import.meta.url));
    assert.equal(source.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
    assert.ok(Object.isFrozen(reference));
    assert.ok(Object.isFrozen(reference.kinds));
  }
  for (const id of [null, undefined, 'commemorative:unknown', '73915052', 'toString', '__proto__', {}]) {
    assert.equal(createTokenIllustrationEffects(id), null);
  }
});

test('Yami Yugi alone and Yami Yugi with Dark Magician have the illustrated aura and no fictional attack sphere', () => {
  for (const id of ids.slice(0, 2)) {
    const effect = createTokenIllustrationEffects(id);
    assert.equal(effect.group.children.length, 1);
    assert.ok(effect.group.children.every(mesh => !mesh.name.includes('mouth-charge')));
    assert.equal(TOKEN_ILLUSTRATION_EFFECT_REFERENCES[id].chargeAnchor, null);
    effect.dispose();
  }
  assert.deepEqual(TOKEN_ILLUSTRATION_EFFECT_REFERENCES[ids[0]].kinds, ['gold-silhouette-aura']);
  assert.deepEqual(TOKEN_ILLUSTRATION_EFFECT_REFERENCES[ids[1]].kinds, ['cyan-background-fractures', 'violet-magenta-background-glow']);
});

test('Blue-Eyes cyan charge and Red-Eyes amber charge remain at their separate mouth anchors, with depth and adjustable composition alignment', () => {
  const blue = createTokenIllustrationEffects(ids[2]);
  const red = createTokenIllustrationEffects(ids[3]);
  for (const [effect, id] of [[blue, ids[2]], [red, ids[3]]]) {
    assert.equal(effect.group.children.length, 2);
    const charge = effect.group.children[1];
    assert.deepEqual(charge.position.toArray(), TOKEN_ILLUSTRATION_EFFECT_REFERENCES[id].chargeAnchor);
    assert.ok(charge.position.x < -.8, 'charge stays left of the foreground duelist');
    assert.ok(charge.geometry.boundingBox.max.z - charge.geometry.boundingBox.min.z > .15, 'charge has depth at three-quarter view');
  }
  assert.notEqual(fingerprint(blue.group.children[1].geometry), fingerprint(red.group.children[1].geometry), 'amber and cyan are not one reused colour');
  const adjusted = createTokenIllustrationEffects(ids[2], { chargePosition: [-1.21, 2.17, .03] });
  assert.deepEqual(adjusted.group.children[1].position.toArray(), [-1.21, 2.17, .03]);
  const invalid = createTokenIllustrationEffects(ids[2], { chargePosition: [NaN, 1, 2] });
  assert.deepEqual(invalid.group.children[1].position.toArray(), TOKEN_ILLUSTRATION_EFFECT_REFERENCES[ids[2]].chargeAnchor);
  [blue, red, adjusted, invalid].forEach(effect => effect.dispose());
});

test('illustrated light is built once into at most two unlit batches and remains bounded without textures or per-frame buffer uploads', () => {
  for (const id of ids) {
    const effect = createTokenIllustrationEffects(id);
    const snapshots = effect.group.children.map(mesh => ({
      mesh, geometry: mesh.geometry, material: mesh.material, signature: fingerprint(mesh.geometry),
      attributes: Object.entries(mesh.geometry.attributes).map(([key, attribute]) => ({ key, attribute, version: attribute.version })),
    }));
    assert.ok(snapshots.length <= 2);
    const triangles = snapshots.reduce((total, { geometry }) => total + geometry.index.count / 3, 0);
    assert.ok(triangles <= 1500, `${id}: ${triangles} triangles`);
    for (const { mesh, geometry, material } of snapshots) {
      assert.ok(geometry.attributes.position.array.every(Number.isFinite));
      assert.ok(geometry.attributes.color.array.every(Number.isFinite));
      assert.ok(geometry.attributes.illustrationAlpha.array.every(alpha => alpha >= 0 && alpha <= 1));
      assert.equal(material.blending, AdditiveBlending);
      assert.equal(material.depthWrite, false);
      assert.equal(material.toneMapped, false);
      assert.equal(material.clipping, true, 'custom illustration shader participates in the composition crop');
      assert.ok(Object.values(material.uniforms).every(uniform => !uniform.value?.isTexture));
      assert.equal(mesh.userData.triangleCount, geometry.index.count / 3);
    }
    for (const time of [.1, .5, 1.2, 10, 100]) assert.equal(effect.update(time), true);
    for (const { mesh, geometry, material, signature, attributes } of snapshots) {
      assert.equal(mesh.geometry, geometry); assert.equal(mesh.material, material);
      assert.equal(fingerprint(geometry), signature);
      for (const { key, attribute, version } of attributes) {
        assert.equal(geometry.attributes[key], attribute); assert.equal(attribute.version, version);
      }
      assert.ok(Math.abs(material.uniforms.illustrationIntensity.value - 1) <= .035);
    }
    effect.dispose();
  }
});

test('artwork framing scales the traced light and its default landmarks, while a posed monster mouth remains in world units', () => {
  const sourceFrame = createTokenIllustrationEffects(ids[2]);
  const enlarged = createTokenIllustrationEffects(ids[2], { frameSize: 4.2 });
  const anchored = createTokenIllustrationEffects(ids[2], { frameSize: 4.2, chargePosition: [-1.4, 2, .1] });
  for (const mesh of enlarged.group.children) assert.deepEqual(mesh.scale.toArray(), [1.05, 1.05, 1.05]);
  assert.deepEqual(enlarged.group.children[1].position.toArray(), sourceFrame.group.children[1].position.toArray().map(value => value * 1.05));
  assert.deepEqual(anchored.group.children[1].position.toArray(), [-1.4, 2, .1]);
  assert.equal(enlarged.group.userData.frameSize, 4.2);
  for (const size of [NaN, Infinity, -4, 0, 101]) {
    const fallback = createTokenIllustrationEffects(ids[2], { frameSize: size });
    assert.equal(fallback.group.userData.frameSize, 4);
    fallback.dispose();
  }
  [sourceFrame, enlarged, anchored].forEach(effect => effect.dispose());
});

test('reduced motion, hidden and disposed effects cannot animate; hiding preserves the exact static illustration and disposal releases each resource once', () => {
  for (const id of ids) {
    const reduced = createTokenIllustrationEffects(id, { reducedMotion: true });
    assert.equal(reduced.group.visible, true);
    assert.equal(reduced.update(1), false);
    reduced.group.children.forEach(mesh => assert.equal(mesh.material.uniforms.illustrationIntensity.value, 1));
    reduced.dispose();
    const effect = createTokenIllustrationEffects(id);
    const resources = new Set(effect.group.children.flatMap(mesh => [mesh.geometry, mesh.material]));
    const disposed = new Map();
    resources.forEach(resource => resource.addEventListener('dispose', () => disposed.set(resource, (disposed.get(resource) || 0) + 1)));
    effect.update(1);
    const intensity = effect.group.children.map(mesh => mesh.material.uniforms.illustrationIntensity.value);
    assert.equal(effect.setVisible(false), true);
    assert.equal(effect.update(2), false);
    assert.deepEqual(effect.group.children.map(mesh => mesh.material.uniforms.illustrationIntensity.value), intensity);
    effect.setVisible(true); effect.reset();
    effect.group.children.forEach(mesh => assert.equal(mesh.material.uniforms.illustrationIntensity.value, 1));
    assert.equal(effect.update(NaN), false);
    effect.dispose(); effect.dispose();
    resources.forEach(resource => assert.equal(disposed.get(resource), 1));
    assert.equal(effect.group.children.length, 0);
    assert.equal(effect.group.userData.disposed, true);
    assert.equal(effect.update(1), false);
    assert.equal(effect.reset(), false);
    assert.equal(effect.setVisible(true), false);
  }
});
