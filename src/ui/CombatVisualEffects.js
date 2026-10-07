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
  } else if (profile.shape === 'temple-eye') {
    const center = travel.clone().add(new THREE.Vector3(0, 1.15, 0));
    for (const side of [-1, 1]) {
      const lid = circle(`temple-eye-lid-${side}`, 0.72, center, false, brightMaterial, Math.PI);
      lid.rotation.z = side < 0 ? Math.PI : 0;
      lid.scale.set(1.25, 0.48, 1);
    }
    const iris = mesh('temple-eye-iris', new THREE.IcosahedronGeometry(0.18, 1), material);
    iris.position.copy(center);
    for (let i = 0; i < 4; i += 1) {
      const angle = Math.PI / 4 + i * Math.PI / 2;
      const column = mesh(`temple-gilded-column-${i}`, new THREE.CylinderGeometry(0.085, 0.12, 1.35, 6), dimMaterial);
      column.position.copy(travel).add(new THREE.Vector3(Math.cos(angle) * 0.92, 0.7, Math.sin(angle) * 0.92));
      const crown = mesh(`temple-column-crown-${i}`, new THREE.BoxGeometry(0.25, 0.11, 0.25), brightMaterial);
      crown.position.copy(column.position).add(new THREE.Vector3(0, 0.73, 0));
    }
    const altarMaterial = material.clone();
    altarMaterial.color.set(profile.accent);
    const altar = mesh('temple-red-altar', new THREE.BoxGeometry(1.5, 0.07, 1.25), altarMaterial);
    altar.position.copy(travel);
    const seal = circle('temple-golden-seal', 1.08, travel, true, material);
    animated.push(progress => {
      const breathe = Math.sin(progress * Math.PI);
      iris.scale.setScalar(0.6 + breathe * 0.5);
      seal.scale.setScalar(0.75 + breathe * 0.3);
      altarMaterial.opacity = breathe * 0.45;
    });
  } else if (profile.shape === 'canyon-echo') {
    for (const side of [-1, 1]) {
      for (let tier = 0; tier < 3; tier += 1) {
        const ledge = mesh(`canyon-sandstone-ledge-${side}-${tier}`, new THREE.BoxGeometry(0.34 + tier * 0.11, 0.24, 1.32 - tier * 0.15), tier % 2 ? dimMaterial : material);
        ledge.position.copy(travel).add(new THREE.Vector3(side * (0.88 + tier * 0.04), tier * 0.25 + 0.12, 0));
        animated.push(progress => {
          ledge.scale.y = 0.3 + Math.sin(progress * Math.PI) * 0.7;
          ledge.position.x = travel.x + side * (1.05 - Math.sin(progress * Math.PI) * 0.17 + tier * 0.04);
        });
      }
    }
    const skyMaterial = material.clone();
    skyMaterial.color.set(profile.accent);
    for (let i = 0; i < 2; i += 1) {
      const echo = circle(`canyon-double-impact-${i}`, 0.5, travel, true, i ? brightMaterial : skyMaterial);
      animated.push(progress => {
        const pulse = Math.max(0, Math.min(1, (progress - 0.12 - i * 0.2) / 0.65));
        echo.visible = progress > 0.12 + i * 0.2;
        echo.scale.setScalar(0.5 + pulse * 1.8);
        skyMaterial.opacity = Math.sin(progress * Math.PI) * 0.65;
      });
    }
  } else if (profile.shape === 'shien-mist') {
    const center = travel.clone().add(new THREE.Vector3(0, 0.7, 0));
    for (let i = 0; i < 3; i += 1) {
      const mist = circle(`shien-purple-mist-${i}`, 0.74 + i * 0.13, center, true, i % 2 ? material : dimMaterial, Math.PI * 1.55);
      animated.push(progress => {
        mist.position.y = travel.y + 0.2 + i * 0.4 - progress * 0.22;
        mist.rotation.z = i * 2.2 - progress * Math.PI;
        mist.scale.setScalar(1.15 - Math.sin(progress * Math.PI) * 0.2);
      });
    }
    // Two curved roof outlines evoke Shien's tiered castle, rather than a
    // generic barrier; descending points make the loss of ATK readable.
    for (let tier = 0; tier < 2; tier += 1) {
      const roofPath = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.86 + tier * 0.1, 0.18, 0), new THREE.Vector3(-0.63 + tier * 0.1, 0, 0),
        new THREE.Vector3(0, 0.25, 0), new THREE.Vector3(0.63 - tier * 0.1, 0, 0),
        new THREE.Vector3(0.86 - tier * 0.1, 0.18, 0)
      ]);
      const roof = mesh(`shien-curved-castle-roof-${tier}`, new THREE.TubeGeometry(roofPath, 16, 0.035, 4, false), brightMaterial);
      roof.position.copy(travel).add(new THREE.Vector3(0, 1.1 + tier * 0.43, 0));
    }
    for (const side of [-1, 1]) {
      const descent = mesh(`shien-atk-descent-${side}`, new THREE.ConeGeometry(0.12, 0.28, 4), material);
      descent.rotation.z = Math.PI;
      descent.position.copy(travel).add(new THREE.Vector3(side * 0.7, 1.1, 0));
      animated.push(progress => { descent.position.y = travel.y + 1.2 - progress * 0.7; });
    }
  } else if (profile.shape === 'dark-city') {
    const skylineMaterial = material.clone();
    skylineMaterial.color.set(profile.accent);
    skylineMaterial.blending = THREE.NormalBlending;
    for (let i = 0; i < 4; i += 1) {
      const height = 0.75 + i % 3 * 0.26;
      const tower = mesh(`dark-city-shadow-tower-${i}`, new THREE.BoxGeometry(0.29, height, 0.24), skylineMaterial);
      tower.position.copy(travel).add(new THREE.Vector3((i - 1.5) * 0.42, height / 2, -0.42));
      for (let floor = 0; floor < 2; floor += 1) {
        const window = mesh(`dark-city-golden-window-${i}-${floor}`, new THREE.BoxGeometry(0.075, 0.18, 0.02), brightMaterial);
        window.position.copy(tower.position).add(new THREE.Vector3(0, floor * 0.26 - 0.12, 0.135));
        animated.push(progress => { window.scale.y = 0.6 + Math.sin(progress * Math.PI) * 0.5; });
      }
    }
    const moon = circle('dark-city-yellow-moon', 0.35, travel.clone().add(new THREE.Vector3(0, 1.32, -0.42)), false, material);
    for (const side of [-1, 1]) {
      const beam = mesh(`dark-city-golden-ascent-${side}`, new THREE.CylinderGeometry(0.035, 0.055, 1.2, 5), dimMaterial);
      beam.position.copy(travel).add(new THREE.Vector3(side * 0.86, 0.65, 0));
      const arrow = mesh(`dark-city-atk-ascent-${side}`, new THREE.ConeGeometry(0.13, 0.27, 4), brightMaterial);
      arrow.position.copy(beam.position);
      animated.push(progress => { arrow.position.y = travel.y + 0.4 + progress * 1.1; });
    }
    animated.push(progress => {
      const breathe = Math.sin(progress * Math.PI);
      moon.scale.setScalar(0.8 + breathe * 0.25);
      skylineMaterial.opacity = breathe * 0.6;
    });
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

  // A tiny instanced seven-segment label adds the actual rule value without
  // fonts, canvas textures or dozens of individual text draw calls.
  const valueLabels = {
    'temple-minds-eye': { kind: 'damage-fixed', prefix: '', value: 1000 },
    'canyon-damage': { kind: 'damage-double', prefix: 'x', value: 2 },
    'shien-mist-reduction': { kind: 'atk-decrease', prefix: '-', value: 500 },
    'dark-city-boost': { kind: 'atk-increase', prefix: '+', value: 1000 }
  };
  const labelRule = valueLabels[profile.id];
  if (labelRule) {
    const proposed = options.ruleChange?.kind === labelRule.kind ? options.ruleChange.value : labelRule.value;
    const amount = Number.isInteger(proposed) && proposed > 0 && proposed <= 1000000 ? proposed : labelRule.value;
    const text = `${labelRule.prefix}${amount}`;
    const segments = {
      a: [0, .5, .42, .075, 0], b: [.25, .25, .075, .4, 0], c: [.25, -.25, .075, .4, 0],
      d: [0, -.5, .42, .075, 0], e: [-.25, -.25, .075, .4, 0], f: [-.25, .25, .075, .4, 0],
      g: [0, 0, .42, .075, 0], h: [0, 0, .075, .42, 0],
      i: [0, 0, .45, .075, Math.PI / 4], j: [0, 0, .45, .075, -Math.PI / 4]
    };
    const glyphs = { 0: 'abcdef', 1: 'bc', 2: 'abged', 3: 'abgcd', 4: 'fgbc',
      5: 'afgcd', 6: 'afgecd', 7: 'abc', 8: 'abcdefg', 9: 'abfgcd', '+': 'gh', '-': 'g', x: 'ij' };
    const strokes = [...text].flatMap((character, index) => [...glyphs[character]].map(segment => ({ index, segment })));
    const label = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, .075), brightMaterial, strokes.length);
    label.name = `${profile.id}-value-label`;
    label.userData.text = text;
    label.position.copy(travel).add(new THREE.Vector3(0, 2.1, .1));
    const transform = new THREE.Object3D();
    strokes.forEach(({ index, segment }, instance) => {
      const [x, y, width, height, angle] = segments[segment];
      transform.position.set((index - (text.length - 1) / 2) * .72 + x, y, 0);
      transform.scale.set(width, height, 1);
      transform.rotation.z = angle;
      transform.updateMatrix();
      label.setMatrixAt(instance, transform.matrix);
    });
    label.instanceMatrix.needsUpdate = true;
    label.scale.setScalar(.34);
    group.add(label);
    animated.push(progress => {
      label.scale.setScalar(.27 + Math.sin(progress * Math.PI) * .07);
      label.position.y = travel.y + 2.1 + Math.sin(progress * Math.PI) * .15;
    });
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
      // Instanced labels also own GPU instance buffers; geometry disposal
      // alone does not release the renderer's per-object allocation.
      if (object.isInstancedMesh) object.dispose();
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
