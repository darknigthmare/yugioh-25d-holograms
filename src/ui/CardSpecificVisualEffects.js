import * as THREE from 'three';

// Inspected public illustrations and the existing explicit attack mappings.
// These are presentation choices, never a rule, target, damage or procedure.
const ATTACKS = Object.freeze({
  '89631139': ['blue-eyes-stream', '/cards/cropped/89631139.jpg'],
  '74677422': ['red-eyes-plume', '/cards/cropped/74677422.jpg'],
  '91152256': ['celtic-sword', '/cards/cropped/91152256.jpg'],
  '70781052': ['skull-forks', '/cards/cropped/70781052.jpg']
});

export function resolveCardSpecificVisualProfile(options, base) {
  if (options.hidden === true || options.faceDown === true || options.card?.isSetFaceDown === true) return null;
  const kind = options.kind || 'attack';
  if (kind === 'attack' && !options.profile) {
    const id = String(options.card?.id || '').replace(/^0+(?=\d)/, '');
    const source = ATTACKS[id];
    if (source) return Object.freeze({ ...base, shape: source[0], sourceCardId: id, referenceArt: source[1] });
  }
  if (kind === 'negate') return Object.freeze({ ...base, shape: 'broken-seal' });
  if (base.id === 'revival') return Object.freeze({ ...base, shape: 'revival-ankh', color: '#45cfc4', secondary: '#e1ffff',
    referenceArt: '/cards/cropped/83764718.jpg' });
  return null;
}

/** Append deterministic, texture-free geometry to the caller's disposable group. */
export function populateCardSpecificVisualEffect({ options, profile, group, travel, distance,
  material, brightMaterial, dimMaterial, animated, mesh, circle }) {
  const direction = travel.clone().normalize();
  if (travel.lengthSq() < .0001) direction.set(0, 1, 0);
  const right = new THREE.Vector3().crossVectors(direction,
    Math.abs(direction.y) < .9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(0, 0, 1)).normalize();
  const up = new THREE.Vector3().crossVectors(right, direction).normalize();
  const aim = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
  const pose = new THREE.Object3D();
  const position = new THREE.Vector3(), scale = new THREE.Vector3(), outward = new THREE.Vector3();
  const orientation = new THREE.Quaternion(), vertical = new THREE.Vector3(0, 1, 0);
  function instances(name, geometry, usedMaterial, count) {
    const value = new THREE.InstancedMesh(geometry, usedMaterial, count);
    value.name = name;
    value.frustumCulled = false;
    group.add(value);
    return value;
  }
  function commit(value, index, position, scale, quaternion = aim) {
    pose.position.copy(position);
    pose.scale.copy(scale);
    pose.quaternion.copy(quaternion);
    pose.updateMatrix();
    value.setMatrixAt(index, pose.matrix);
  }

  if (profile.shape === 'blue-eyes-stream') {
    const shell = mesh('blue-eyes-tapered-breath', new THREE.CylinderGeometry(.32, .07, 1, 10, 1, true), material);
    const core = mesh('blue-eyes-white-core', new THREE.CylinderGeometry(.07, .025, 1, 8), brightMaterial);
    const charge = mesh('blue-eyes-source-charge', new THREE.IcosahedronGeometry(.2, 1), brightMaterial);
    for (const value of [shell, core]) value.quaternion.copy(aim);
    for (const strand of [-1, 1]) {
      const points = Array.from({ length: 33 }, (_, index) => {
        const t = index / 32, angle = t * Math.PI * 6 + (strand < 0 ? Math.PI : 0);
        return travel.clone().multiplyScalar(t)
          .addScaledVector(right, Math.cos(angle) * (.12 + t * .14))
          .addScaledVector(up, Math.sin(angle) * (.12 + t * .14));
      });
      const helix = mesh(`blue-eyes-breath-helix-${strand}`,
        new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 48, .026, 4, false), brightMaterial);
      animated.push(progress => {
        helix.geometry.setDrawRange(0, Math.floor(helix.geometry.index.count * Math.min(1, progress / .55) / 6) * 6);
        helix.visible = progress < .83;
      });
    }
    const rays = instances('blue-eyes-crystalline-impact', new THREE.ConeGeometry(.055, .45, 4), brightMaterial, 8);
    animated.push(progress => {
      const reach = Math.min(1, progress / .55), burst = Math.max(0, (progress - .55) / .45);
      for (const value of [shell, core]) {
        value.position.copy(travel).multiplyScalar(reach / 2);
        value.scale.set(1, Math.max(.001, distance * reach), 1);
        value.visible = progress < .83;
      }
      charge.scale.setScalar(.55 + Math.sin(Math.min(1, progress / .3) * Math.PI) * .65);
      charge.visible = progress < .4;
      rays.visible = progress >= .55;
      for (let i = 0; i < 8; i += 1) {
        const a = i * Math.PI / 4;
        outward.copy(right).multiplyScalar(Math.cos(a)).addScaledVector(up, Math.sin(a));
        commit(rays, i, position.copy(travel).addScaledVector(outward, .2 + burst * 1.05),
          scale.set(1, .5 + burst, 1), orientation.setFromUnitVectors(vertical, outward));
      }
      rays.instanceMatrix.needsUpdate = true;
    });
  } else if (profile.shape === 'red-eyes-plume') {
    const tongues = instances('red-eyes-burning-tongues', new THREE.ConeGeometry(.17, 1.05, 6), material, 9);
    const embers = instances('red-eyes-scattered-embers', new THREE.TetrahedronGeometry(.065), brightMaterial, 12);
    const smokeMaterial = dimMaterial.clone();
    smokeMaterial.color.set('#402236');
    smokeMaterial.blending = THREE.NormalBlending;
    const smoke = instances('red-eyes-heat-smoke', new THREE.IcosahedronGeometry(.24, 1), smokeMaterial, 5);
    const core = mesh('red-eyes-incandescent-core', new THREE.CylinderGeometry(.19, .055, 1, 8, 1, true), brightMaterial);
    core.quaternion.copy(aim);
    animated.push(progress => {
      const reach = Math.min(1, progress / .65), flare = Math.sin(progress * Math.PI);
      core.position.copy(travel).multiplyScalar(reach / 2);
      core.scale.set(.7 + flare * .4, Math.max(.001, distance * reach), .7 + flare * .4);
      core.visible = tongues.visible = progress < .86;
      for (let i = 0; i < 9; i += 1) {
        const t = Math.max(0, reach - i * .075), a = i * 2.399963 + progress * 1.7;
        position.copy(travel).multiplyScalar(t)
          .addScaledVector(right, Math.cos(a) * t * .46).addScaledVector(up, Math.sin(a) * t * .46);
        commit(tongues, i, position, scale.set(.55 + t * 1.2, .7 + flare * .65, .55 + t * 1.2));
      }
      for (let i = 0; i < 12; i += 1) {
        const t = Math.min(1, Math.max(0, reach - (i % 4) * .12)), a = i * 2.399963;
        const radius = (.12 + progress * .65) * (i % 3 + 1) / 3;
        commit(embers, i, position.copy(travel).multiplyScalar(t).addScaledVector(right, Math.cos(a) * radius)
          .addScaledVector(up, Math.sin(a) * radius + progress * .15), scale.set(1, 1, 1));
      }
      for (let i = 0; i < 5; i += 1) {
        commit(smoke, i, position.copy(travel).multiplyScalar(Math.max(0, reach - i * .14))
          .addScaledVector(up, progress * (.4 + i * .07)), scale.set(1, 1.5, 1).multiplyScalar(.4 + flare * .8));
      }
      for (const value of [tongues, embers, smoke]) value.instanceMatrix.needsUpdate = true;
      embers.visible = smoke.visible = progress > .12;
    });
  } else if (profile.shape === 'celtic-sword') {
    const sweep = mesh('celtic-filled-sword-sweep', new THREE.RingGeometry(.62, 1.1, 32, 1, -.85, Math.PI * 1.2), brightMaterial);
    const edge = mesh('celtic-silver-cut-edge', new THREE.TorusGeometry(1.1, .022, 4, 32, Math.PI * 1.2), material);
    const bladeGeometry = new THREE.BufferGeometry();
    bladeGeometry.setAttribute('position', new THREE.Float32BufferAttribute([
      -.07, 0, 0, .07, 0, 0, .095, .9, 0, 0, 1.35, 0, -.095, .9, 0
    ], 3));
    bladeGeometry.setIndex([0, 1, 2, 0, 2, 4, 4, 2, 3]);
    const blade = mesh('celtic-pointed-silver-blade', bladeGeometry, brightMaterial);
    const guard = mesh('celtic-sword-crossguard', new THREE.BoxGeometry(.44, .075, .075), material);
    blade.quaternion.copy(aim); guard.quaternion.copy(aim);
    animated.push(progress => {
      const reach = THREE.MathUtils.smoothstep(progress, .12, .62), turn = -1.3 + reach * 2.2;
      for (const value of [sweep, edge]) {
        value.position.copy(travel).multiplyScalar(reach);
        value.rotation.set(.25, .4, turn);
        value.scale.setScalar(.4 + Math.sin(progress * Math.PI) * .75);
        value.visible = progress > .15 && progress < .9;
      }
      blade.position.copy(travel).multiplyScalar(reach).addScaledVector(direction, -.45);
      guard.position.copy(blade.position);
      blade.visible = guard.visible = progress > .08 && progress < .7;
    });
  } else if (profile.shape === 'skull-forks') {
    for (let branch = 0; branch < 3; branch += 1) {
      const points = Array.from({ length: 13 }, (_, index) => {
        const t = index / 12, zigzag = Math.sin(index * 2.8 + branch) * Math.sin(t * Math.PI);
        return travel.clone().multiplyScalar(t)
          .addScaledVector(right, (branch - 1) * .42 * (1 - t) + zigzag * .28)
          .addScaledVector(up, Math.cos(index * 2.1 + branch) * Math.sin(t * Math.PI) * .25);
      });
      const positions = points.flatMap(point => [...point.clone().addScaledVector(right, .035).toArray(),
        ...point.clone().addScaledVector(right, -.035).toArray()]);
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.setIndex(Array.from({ length: 12 }, (_, i) => [i * 2, i * 2 + 1, i * 2 + 2,
        i * 2 + 1, i * 2 + 3, i * 2 + 2]).flat());
      const bolt = mesh(`skull-forked-lightning-ribbon-${branch}`, geometry, branch === 1 ? brightMaterial : material);
      animated.push(progress => {
        bolt.geometry.setDrawRange(0, Math.floor(12 * Math.min(1, progress / .35)) * 6);
        bolt.visible = progress < .82; // Continuous fade, never a strobe.
      });
    }
    for (const side of [-1, 1]) {
      const charge = mesh(`skull-claw-charge-${side}`, new THREE.IcosahedronGeometry(.18, 1), brightMaterial);
      charge.position.copy(right).multiplyScalar(side * .42);
      animated.push(progress => { charge.scale.setScalar(.5 + Math.sin(progress * Math.PI) * .6); });
    }
    const crown = circle('skull-electric-impact-crown', .44, travel, false, material, Math.PI * 1.65);
    crown.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction);
    animated.push(progress => { crown.visible = progress > .35; crown.scale.setScalar(.3 + progress * 1.6); });
  } else if (profile.shape === 'broken-seal') {
    for (let i = 0; i < 4; i += 1) {
      const arc = circle(`negated-broken-seal-quarter-${i}`, .78, travel, false, material, Math.PI * .36);
      animated.push(progress => {
        arc.rotation.z = i * Math.PI / 2 + progress * .45;
        arc.position.copy(travel);
        arc.position.x += Math.cos(i * Math.PI / 2) * progress * .28;
        arc.position.y += Math.sin(i * Math.PI / 2) * progress * .28;
      });
    }
    for (const side of [-1, 1]) {
      const cross = mesh(`negation-cross-${side}`, new THREE.BoxGeometry(.12, 1.4, .035), brightMaterial);
      cross.position.copy(travel); cross.rotation.z = side * Math.PI / 4;
      animated.push(progress => { cross.scale.y = .35 + Math.sin(progress * Math.PI) * .65; });
    }
  } else if (profile.shape === 'shatter') {
    const shards = instances('destruction-fractured-light-shards', new THREE.TetrahedronGeometry(.16), material, 18);
    const fault = circle('destruction-fracture-ring', .7, travel, true, brightMaterial, Math.PI * 1.65);
    animated.push(progress => {
      const burst = THREE.MathUtils.smoothstep(progress, .08, .8);
      for (let i = 0; i < 18; i += 1) {
        const a = i * 2.399963, height = 1 - (i + .5) / 18 * 2;
        const radius = Math.sqrt(1 - height * height) * burst * (1.1 + i % 3 * .18);
        pose.rotation.set(i * .7 + progress * 2, i * .3, progress * 3);
        position.copy(travel);
        position.x += Math.cos(a) * radius;
        position.y += .6 + height * burst * 1.4 - burst * burst * .75;
        position.z += Math.sin(a) * radius;
        commit(shards, i, position, scale.set(.35, 1.3, .6).multiplyScalar(1 - progress * .7), orientation.copy(pose.quaternion));
      }
      shards.instanceMatrix.needsUpdate = true;
      fault.rotation.z = progress * .7; fault.scale.setScalar(.3 + burst * 1.4);
    });
  } else if (profile.shape === 'revival-ankh') {
    // Monster Reborn's inspected ankh is an explicit visual symbol. Only a
    // confirmed summon raises it; a declared Spell merely charges its seal.
    const confirmed = options.kind === 'summon';
    const center = travel.clone().add(new THREE.Vector3(0, confirmed ? .45 : .2, 0));
    const loop = circle('revival-ankh-loop', .23, center.clone().add(new THREE.Vector3(0, .68, 0)), false, material);
    loop.scale.set(.8, 1.2, 1);
    const stem = mesh('revival-ankh-stem', new THREE.BoxGeometry(.11, .75, .09), material);
    stem.position.copy(center).add(new THREE.Vector3(0, .13, 0));
    const cross = mesh('revival-ankh-crossbar', new THREE.BoxGeometry(.66, .12, .09), brightMaterial);
    cross.position.copy(center).add(new THREE.Vector3(0, .45, 0));
    const rising = confirmed ? mesh('confirmed-revival-light-column',
      new THREE.CylinderGeometry(.42, .75, 2.1, 12, 1, true), dimMaterial) : null;
    if (rising) rising.position.copy(travel).add(new THREE.Vector3(0, 1, 0));
    const glyphs = [loop, stem, cross];
    const initial = glyphs.map(value => value.position.clone());
    animated.push(progress => {
      glyphs.forEach((value, index) => { value.position.copy(initial[index]);
        if (confirmed) value.position.y += THREE.MathUtils.smoothstep(progress, .12, .82) * 1.05; });
      if (rising) rising.scale.y = .2 + Math.sin(progress * Math.PI) * .9;
    });
  } else return false;
  return true;
}
