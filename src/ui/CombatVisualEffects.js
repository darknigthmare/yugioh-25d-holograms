import * as THREE from 'three';
import { resolveCombatVisualProfile } from './CombatVisualProfiles.js';

/** One short-lived effect, with no timers, assets or perpetual animation. */
export function createCombatVisualEffect(options = {}) {
  const profile = resolveCombatVisualProfile(options);
  const source = new THREE.Vector3(...(options.source || [0, 2, 0]));
  const target = new THREE.Vector3(...(options.target || options.source || [0, 2, 0]));
  const travel = target.clone().sub(source);
  const distance = Math.max(0.01, travel.length());
  const group = new THREE.Group();
  group.name = `combat-${profile.id}`;
  group.position.copy(source);
  group.userData.profile = profile.id;
  const material = new THREE.MeshBasicMaterial({
    color: profile.color, transparent: true, opacity: 0.8, depthWrite: false,
    blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false
  });
  const brightMaterial = material.clone();
  brightMaterial.color.set(profile.secondary);
  const dimMaterial = material.clone();
  dimMaterial.opacity = 0.3;
  const animated = [];
  function mesh(name, geometry, usedMaterial = material) {
    const value = new THREE.Mesh(geometry, usedMaterial);
    value.name = name;
    group.add(value);
    return value;
  }
  function circle(name, radius, position, horizontal = false, usedMaterial = material, arc = Math.PI * 2) {
    const value = mesh(name, new THREE.TorusGeometry(radius, 0.025, 5, 40, arc), usedMaterial);
    value.position.copy(position);
    if (horizontal) value.rotation.x = Math.PI / 2;
    return value;
  }
  const zero = new THREE.Vector3();
  const hitRing = circle('impact-wave', 0.6, travel, true, brightMaterial);
  hitRing.visible = false;
  animated.push(progress => {
    const hit = THREE.MathUtils.clamp((progress - 0.56) / 0.44, 0, 1);
    hitRing.visible = progress >= 0.56;
    hitRing.scale.setScalar(0.3 + hit * 2.7);
  });
  const rune = circle('source-rune', 0.64, zero, true, dimMaterial);
  animated.push(progress => {
    rune.scale.setScalar(0.55 + Math.sin(progress * Math.PI) * 0.7);
    rune.rotation.z = progress * Math.PI;
  });

  if (profile.shape === 'beam') {
    const beam = mesh('beam-envelope', new THREE.CylinderGeometry(0.13, 0.28, 1, 12), material);
    const core = mesh('beam-core', new THREE.CylinderGeometry(0.042, 0.085, 1, 8), brightMaterial);
    const direction = travel.clone().normalize();
    if (travel.lengthSq() < 0.0001) direction.set(0, 1, 0);
    for (const value of [beam, core]) value.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
    animated.push(progress => {
      const reach = Math.min(1, progress / 0.48);
      for (const value of [beam, core]) {
        value.position.copy(travel).multiplyScalar(reach / 2);
        value.scale.set(1 + Math.sin(progress * 10) * 0.1, distance * reach, 1);
        value.visible = progress < 0.82;
      }
    });
    for (let i = 0; i < 3; i += 1) {
      const shock = circle(`beam-wave-${i}`, 0.24 + i * 0.07, zero, false, dimMaterial);
      shock.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction);
      animated.push(progress => {
        shock.position.copy(travel).multiplyScalar((progress * 1.5 + i * 0.2) % 1);
        shock.scale.setScalar(0.7 + progress);
      });
    }
  } else if (profile.shape === 'orb' || profile.shape === 'flame') {
    const orb = mesh('projectile', new THREE.IcosahedronGeometry(profile.shape === 'flame' ? 0.27 : 0.2, 2), brightMaterial);
    const corona = mesh('projectile-corona', new THREE.IcosahedronGeometry(0.35, 1), dimMaterial);
    const trails = [];
    for (let i = 0; i < 5; i += 1) trails.push(mesh(`projectile-trail-${i}`, new THREE.IcosahedronGeometry(0.16, 0), material));
    animated.push(progress => {
      const reach = Math.min(1, progress / 0.68);
      orb.position.copy(travel).multiplyScalar(reach);
      corona.position.copy(orb.position);
      corona.rotation.set(progress * 3, progress * 5, 0);
      corona.scale.setScalar(1 + Math.sin(progress * 17) * 0.15);
      orb.visible = corona.visible = progress < 0.83;
      trails.forEach((value, index) => {
        value.position.copy(travel).multiplyScalar(Math.max(0, reach - (index + 1) * 0.06));
        value.scale.setScalar(1 - index * 0.14);
        value.visible = progress < 0.78;
      });
    });
  } else if (profile.shape === 'lightning') {
    const lightningMaterial = new THREE.LineBasicMaterial({ color: profile.secondary, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, toneMapped: false });
    for (let branch = 0; branch < 3; branch += 1) {
      const points = [];
      for (let i = 0; i <= 12; i += 1) {
        const progress = i / 12;
        const envelope = Math.sin(progress * Math.PI);
        points.push(travel.clone().multiplyScalar(progress).add(new THREE.Vector3(
          Math.sin(i * 2.37 + branch) * 0.45 * envelope,
          Math.cos(i * 3.91 + branch) * 0.55 * envelope,
          Math.sin(i * 1.73 + branch) * 0.32 * envelope
        )));
      }
      const bolt = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), lightningMaterial);
      bolt.name = `lightning-branch-${branch}`;
      group.add(bolt);
      animated.push(progress => { bolt.visible = progress < 0.67 && Math.floor(progress * 18 + branch) % 3 !== 0; });
    }
  } else if (profile.shape === 'slash') {
    for (let i = 0; i < 3; i += 1) {
      const slash = circle(`blade-slash-${i}`, 0.82 + i * 0.11, travel, false, i % 2 ? brightMaterial : material, Math.PI * 1.08);
      slash.rotation.set(0.3, 0.4, -Math.PI / 3 + i * 0.12);
      animated.push(progress => {
        slash.visible = progress > 0.25 + i * 0.06;
        slash.rotation.z = -Math.PI / 3 + i * 0.12 + progress * 1.9;
        slash.scale.setScalar(0.4 + Math.sin(progress * Math.PI) * 0.9);
      });
    }
  } else if (profile.shape === 'shield') {
    const shield = mesh('protective-dome', new THREE.SphereGeometry(1, 20, 12), dimMaterial);
    shield.position.copy(travel);
    shield.scale.set(1.15, 1.6, 1.15);
    for (let i = 0; i < 3; i += 1) {
      const seal = circle(`barrier-seal-${i}`, 1.13, travel, false, i % 2 ? brightMaterial : material);
      seal.rotation.y = i * Math.PI / 3;
    }
    animated.push(progress => { shield.scale.setScalar(1.1 + Math.sin(progress * Math.PI) * 0.15); });
  } else if (profile.shape === 'rune' || profile.shape === 'summon') {
    const center = travel;
    for (let i = 0; i < 3; i += 1) {
      const seal = circle(`ritual-circle-${i}`, 0.55 + i * 0.22, center, profile.id !== 'time-magic', i % 2 ? brightMaterial : material);
      animated.push(progress => {
        seal.rotation.z = progress * Math.PI * (i % 2 ? -1 : 1);
        seal.scale.setScalar(0.3 + Math.sin(progress * Math.PI) * 0.9);
        if (profile.shape === 'summon') seal.position.y = center.y + progress * (i + 1) * 0.9;
      });
    }
    for (let i = 0; i < 8; i += 1) {
      const angle = i * Math.PI / 4;
      const sigil = mesh(`ritual-glyph-${i}`, new THREE.OctahedronGeometry(0.08), brightMaterial);
      sigil.position.copy(center).add(new THREE.Vector3(Math.cos(angle) * 0.82, 0, Math.sin(angle) * 0.82));
    }
    if (profile.shape === 'summon') {
      const pillar = mesh('summon-column', new THREE.CylinderGeometry(0.55, 0.95, 3.2, 16, 1, true), dimMaterial);
      pillar.position.copy(center).add(new THREE.Vector3(0, 1.4, 0));
      animated.push(progress => { pillar.scale.y = Math.sin(progress * Math.PI); });
    }
  } else if (profile.shape === 'sanctuary') {
    const protectedCenter = travel.clone();
    protectedCenter.y += 1.05;
    const dome = mesh('sanctuary-golden-barrier', new THREE.SphereGeometry(1, 20, 12), dimMaterial);
    dome.position.copy(protectedCenter);
    const haloCenter = protectedCenter.clone();
    haloCenter.y += 1.35;
    const halo = circle('sanctuary-halo', 0.65, haloCenter, true, brightMaterial);
    for (let i = 0; i < 2; i += 1) {
      const meridian = circle(`sanctuary-meridian-${i}`, 1.01, protectedCenter, false, material);
      meridian.rotation.y = i * Math.PI / 2;
      meridian.scale.y = 1.3;
    }
    animated.push(progress => {
      const breathe = Math.sin(progress * Math.PI);
      dome.scale.set(0.93 + breathe * 0.12, 1.22 + breathe * 0.12, 0.93 + breathe * 0.12);
      halo.scale.setScalar(0.75 + breathe * 0.35);
    });
  } else if (profile.shape === 'boost') {
    const boostCenter = travel.clone();
    boostCenter.y += 0.5;
    for (let i = 0; i < 3; i += 1) {
      const ascent = circle(`skyscraper-rise-ring-${i}`, 0.6 + i * 0.11, boostCenter, true, i % 2 ? brightMaterial : material);
      animated.push(progress => {
        ascent.position.y = travel.y + 0.1 + (progress * 1.4 + i * 0.27) % 1 * 2;
        ascent.scale.setScalar(0.85 + Math.sin(progress * Math.PI) * 0.25);
      });
    }
    for (let i = 0; i < 6; i += 1) {
      const angle = i * Math.PI / 3;
      const arrow = mesh(`skyscraper-boost-arrow-${i}`, new THREE.ConeGeometry(0.11, 0.28, 4), brightMaterial);
      arrow.position.copy(boostCenter);
      arrow.position.x += Math.cos(angle) * 0.77;
      arrow.position.z += Math.sin(angle) * 0.77;
      animated.push(progress => { arrow.position.y = travel.y + 0.35 + progress * 1.65; });
    }
  } else if (profile.shape === 'roots') {
    for (let i = 0; i < 5; i += 1) {
      const angle = i * Math.PI * 0.4;
      const radialX = Math.cos(angle);
      const radialZ = Math.sin(angle);
      const path = new THREE.CatmullRomCurve3([
        new THREE.Vector3(radialX * 0.91, -0.08, radialZ * 0.91),
        new THREE.Vector3(radialX * 0.63, 0.29, radialZ * 0.63),
        new THREE.Vector3(radialX * 0.4, 0.93, radialZ * 0.4),
        new THREE.Vector3(radialX * 0.17, 1.31, radialZ * 0.17)
      ]);
      const root = mesh(`ancient-forest-binding-root-${i}`, new THREE.TubeGeometry(path, 12, 0.055, 5, false), i % 2 ? material : dimMaterial);
      root.position.copy(travel);
      const leaf = mesh(`ancient-forest-leaf-${i}`, new THREE.OctahedronGeometry(0.12), brightMaterial);
      leaf.position.copy(travel);
      leaf.position.x += radialX * 0.52;
      leaf.position.z += radialZ * 0.52;
      animated.push(progress => {
        root.scale.y = Math.min(1, progress * 2.3);
        leaf.position.y = travel.y + 0.3 + progress * 1.1;
        leaf.rotation.y = progress * 2 + angle;
      });
    }
  } else if (profile.shape === 'pincer') {
    for (const side of [-1, 1]) {
      const pincer = circle(`pincer-strike-${side}`, 0.7, travel, false, brightMaterial, Math.PI * 0.82);
      const fang = mesh(`pincer-fang-${side}`, new THREE.ConeGeometry(0.09, 0.54, 7), material);
      fang.rotation.z = side * Math.PI / 2;
      animated.push(progress => {
        const close = Math.sin(Math.min(1, progress * 1.6) * Math.PI);
        pincer.position.x = travel.x + side * (0.64 - close * 0.44);
        pincer.rotation.z = side > 0 ? Math.PI / 2 : -Math.PI / 2;
        pincer.scale.setScalar(0.75 + close * 0.3);
        fang.position.copy(travel);
        fang.position.x += side * (0.59 - close * 0.47);
        fang.visible = progress > 0.1 && progress < 0.82;
      });
    }
  } else if (profile.shape === 'faith') {
    const book = new THREE.Group();
    book.name = 'faith-restored-spellbook';
    book.position.copy(travel);
    group.add(book);
    for (const side of [-1, 1]) {
      const page = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.49, 0.035), brightMaterial);
      page.name = `faith-book-page-${side}`;
      page.position.set(side * 0.18, 0, 0);
      page.rotation.y = side * 0.27;
      book.add(page);
    }
    const blessing = circle('faith-blessing-halo', 0.77, travel, true, material);
    for (let i = 0; i < 3; i += 1) {
      const ray = mesh(`faith-ray-${i}`, new THREE.CylinderGeometry(0.025, 0.04, 1.25, 6), dimMaterial);
      ray.position.copy(travel);
      ray.position.x += (i - 1) * 0.43;
      ray.position.y += 0.65;
    }
    animated.push(progress => {
      book.position.y = travel.y + Math.sin(progress * Math.PI) * 0.68;
      book.rotation.y = Math.sin(progress * Math.PI) * 0.25;
      blessing.scale.setScalar(0.7 + progress);
    });
  } else if (profile.shape === 'search') {
    const lens = circle('sangan-search-lens', 0.43, travel, false, brightMaterial);
    const card = mesh('revealed-search-card', new THREE.BoxGeometry(0.4, 0.57, 0.035), dimMaterial);
    card.position.copy(travel);
    for (let i = 0; i < 3; i += 1) {
      const eye = mesh(`sangan-search-eye-${i}`, new THREE.IcosahedronGeometry(0.075, 1), material);
      eye.position.copy(travel);
      eye.position.y += i === 0 ? 0.21 : -0.04;
      eye.position.x += i === 0 ? 0 : i === 1 ? -0.13 : 0.13;
      eye.position.z += 0.055;
    }
    animated.push(progress => {
      lens.scale.setScalar(0.6 + Math.sin(progress * Math.PI) * 0.6);
      lens.rotation.z = progress * 1.5;
      card.position.y = travel.y + Math.sin(progress * Math.PI) * 0.3;
      card.rotation.y = progress * 0.6;
    });
  } else if (profile.shape === 'vortex') {
    for (let i = 0; i < 6; i += 1) {
      const swirl = circle(`typhoon-spiral-${i}`, 0.35 + i * 0.12, travel, true, i % 2 ? dimMaterial : material, Math.PI * 1.7);
      animated.push(progress => {
        swirl.position.y = travel.y - 0.55 + i * 0.22;
        swirl.rotation.z = progress * Math.PI * 4 + i * 0.6;
        swirl.scale.setScalar(0.45 + Math.sin(progress * Math.PI));
      });
    }
  } else if (profile.shape === 'moon') {
    const crescent = circle('moon-crescent', 0.82, travel.clone().add(new THREE.Vector3(0, 0.95, 0)), false, brightMaterial, Math.PI * 1.35);
    crescent.rotation.z = 0.7;
    const halo = mesh('moon-veil', new THREE.SphereGeometry(1, 16, 10), dimMaterial);
    halo.position.copy(travel);
    animated.push(progress => {
      crescent.scale.setScalar(0.4 + Math.sin(progress * Math.PI) * 0.7);
      halo.scale.setScalar(1.15 - progress * 0.75);
      halo.rotation.y = progress * 2;
    });
  } else if (profile.shape === 'impact') {
    for (let i = 0; i < 8; i += 1) {
      const ray = mesh(`impact-ray-${i}`, new THREE.ConeGeometry(0.045, 0.55, 5), brightMaterial);
      const angle = i * Math.PI / 4;
      ray.position.copy(travel).add(new THREE.Vector3(Math.cos(angle) * 0.55, Math.sin(angle) * 0.55, 0));
      ray.rotation.z = angle - Math.PI / 2;
      animated.push(progress => { ray.visible = progress > 0.4; ray.scale.y = Math.sin(progress * Math.PI); });
    }
  }

  const sparkCount = profile.shape === 'shatter' ? 44 : 24;
  const sparkPositions = new Float32Array(sparkCount * 3);
  const sparkGeometry = new THREE.BufferGeometry();
  sparkGeometry.setAttribute('position', new THREE.BufferAttribute(sparkPositions, 3));
  const sparkMaterial = new THREE.PointsMaterial({ color: profile.secondary, size: profile.shape === 'shatter' ? 0.12 : 0.07, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  const sparks = new THREE.Points(sparkGeometry, sparkMaterial);
  sparks.name = 'energy-sparks';
  sparks.frustumCulled = false;
  group.add(sparks);
  animated.push(progress => {
    const burst = Math.max(0, (progress - 0.48) / 0.52);
    sparks.visible = burst > 0;
    for (let i = 0; i < sparkCount; i += 1) {
      const angle = i * 2.399963;
      const elevation = 1 - (i + 0.5) / sparkCount * 2;
      const radius = Math.sqrt(1 - elevation * elevation) * burst * (0.8 + i % 5 * 0.12);
      sparkPositions[i * 3] = travel.x + Math.cos(angle) * radius;
      sparkPositions[i * 3 + 1] = travel.y + elevation * burst * 1.4 - burst * burst * 0.5;
      sparkPositions[i * 3 + 2] = travel.z + Math.sin(angle) * radius;
    }
    sparkGeometry.attributes.position.needsUpdate = true;
    sparkMaterial.opacity = 0.85 * (1 - burst);
  });
  let disposed = false;
  function update(progress) {
    if (disposed) return false;
    const value = THREE.MathUtils.clamp(Number(progress) || 0, 0, 1);
    const envelope = Math.min(1, value / 0.12) * Math.min(1, (1 - value) / 0.25);
    material.opacity = envelope * 0.8;
    brightMaterial.opacity = envelope * 0.95;
    dimMaterial.opacity = envelope * 0.23;
    animated.forEach(callback => callback(value));
    return value < 1;
  }
  function dispose() {
    if (disposed) return false;
    disposed = true;
    const geometries = new Set();
    const usedMaterials = new Set([material, brightMaterial, dimMaterial, sparkMaterial]);
    group.traverse(object => {
      if (object.geometry) geometries.add(object.geometry);
      if (object.material) usedMaterials.add(object.material);
    });
    geometries.forEach(geometry => geometry.dispose());
    usedMaterials.forEach(value => value.dispose());
    group.removeFromParent();
    group.clear();
    return true;
  }
  update(0);
  return { group, profile, duration: profile.duration, update, dispose };
}
