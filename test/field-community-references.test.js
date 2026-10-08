import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {FIELD_GEOMETRY_THREE} from '../src/ui/FieldGeometryThree.js';
import {COMMUNITY_CARD_LANDMARKS,COMMUNITY_INSPECTED_ART_PROFILES,createCommunityReferenceGeometry} from '../src/ui/FieldEnvironmentCommunityReferences.js';
import {createFieldEnvironmentGeometry,disposeFieldEnvironmentGeometry,hasFieldEnvironmentLandmarkGeometry,
  FIELD_ENVIRONMENT_GEOMETRY_BUDGET as budget} from '../src/ui/FieldEnvironmentGeometry.js';
import {getFieldEnvironmentForCardId} from '../src/ui/FieldEnvironmentRegistry.js';
import {FIELD_SPELL_REFERENCE_ART_SNAPSHOT} from '../src/ui/FieldSpellReferenceArtSnapshot.js';

const motifs={
  "31322640": [
    "allure-round-gray-tower",
    "allure-pink-onion-dome",
    "allure-dome-finial",
    "allure-upper-arched-inset",
    "allure-low-courtyard-wall",
    "allure-central-round-gate",
    "allure-central-gate-masonry",
    "allure-round-pale-courtyard-light"
  ],
  "90764871": [
    "strategy-dark-pointed-ruin",
    "strategy-small-green-gate-pier",
    "strategy-green-round-doorway",
    "strategy-ochre-door-panel",
    "strategy-pale-door-step",
    "strategy-gold-board-frame",
    "strategy-low-red-fire"
  ],
  "74733322": [
    "artmage-white-round-tower",
    "artmage-blue-round-cupola",
    "artmage-colored-teardrop-turret",
    "artmage-small-arched-tower-window",
    "artmage-huge-white-bridge-arch",
    "artmage-central-rosette-facade",
    "artmage-round-colored-rosette",
    "artmage-large-pale-sky-ring"
  ],
  "4357063": [
    "babylon-floating-undercut-island",
    "babylon-concentric-stepped-pit",
    "babylon-broken-outer-terrace",
    "babylon-four-yellow-walkways",
    "babylon-slim-broken-column",
    "babylon-broken-column-lintel",
    "babylon-scattered-small-stone"
  ],
  "11808215": [
    "dice-dark-red-square-grid-floor",
    "dice-luminous-square-grid",
    "dice-tall-steel-side-wall",
    "dice-red-blue-end-receptor",
    "dice-round-cup-receptor",
    "dice-three-colored-indicators",
    "dice-small-square-prop",
    "dice-prop-pale-rays"
  ],
  "67331360": [
    "doll-white-timber-house",
    "doll-small-central-gable",
    "doll-small-round-turret",
    "doll-small-pink-turret-roof",
    "doll-long-red-stair",
    "doll-pink-stair-rail",
    "doll-pink-cyan-checker-wall",
    "doll-large-upper-arched-window",
    "doll-small-gold-star-ornament"
  ],
  "60514625": [
    "ecole-long-curved-stair-ribbon",
    "ecole-curved-stair-tread",
    "ecole-pink-flowering-vine",
    "ecole-pink-vine-flower",
    "ecole-green-curved-paver-arch",
    "ecole-paver-arch-seam",
    "ecole-broken-round-column",
    "ecole-floating-small-rock"
  ],
  "56725612": [
    "fairy-pale-ballroom-column",
    "fairy-pink-pediment-scroll",
    "fairy-soft-cyan-floor",
    "fairy-round-pale-light",
    "fairy-outlined-white-star"
  ],
  "38057522": [
    "ichirin-four-intersecting-rings",
    "ichirin-short-rim-mark",
    "ichirin-white-central-petal",
    "ichirin-small-colored-lights"
  ],
  "26232916": [
    "ninja-blue-rocky-ravine-bank",
    "ninja-layered-blue-forest-crown",
    "ninja-low-wood-house",
    "ninja-steep-blue-roof",
    "ninja-tall-lookout-frame",
    "ninja-crossed-lookout-brace",
    "ninja-steep-lookout-roof",
    "ninja-hanging-plank-bridge",
    "ninja-sagging-bridge-rope",
    "ninja-small-full-moon"
  ],
  "34771947": [
    "labyrinth-thick-green-stone-wall",
    "labyrinth-dark-masonry-course",
    "labyrinth-green-rectangular-paved-floor",
    "labyrinth-square-floor-joint",
    "labyrinth-pale-diagonal-wind"
  ],
  "18890039": [
    "libromancer-angular-comic-panel",
    "libromancer-yellow-radial-impact",
    "libromancer-white-jagged-explosion",
    "libromancer-small-halftone-dot"
  ],
  "35487920": [
    "channel-blue-browser-top-bar",
    "channel-pale-left-control-column",
    "channel-large-central-video-panel",
    "channel-round-pale-chat-panel",
    "channel-pink-cyan-thumbnail-card",
    "channel-round-control-icon",
    "channel-horizontal-top-control",
    "channel-short-chat-placeholder"
  ],
  "14001430": [
    "madolche-round-wafer-tier",
    "madolche-cream-piping-ring",
    "madolche-pink-icing-roof",
    "madolche-cream-roof-dollop",
    "madolche-red-strawberry-ornament",
    "madolche-round-pale-gate",
    "madolche-pink-round-gate-inset",
    "madolche-gold-balcony-baluster",
    "madolche-dotted-green-shrub"
  ],
  "95477924": [
    "salvation-tilted-gold-inscribed-rim",
    "salvation-gold-rim-short-mark",
    "salvation-purple-spiral-light",
    "salvation-round-pink-spark"
  ],
  "35815783": [
    "magikey-round-oculus-band",
    "magikey-slim-rotunda-column",
    "magikey-arched-inset-door",
    "magikey-door-petal-tracery",
    "magikey-door-round-colored-gem"
  ],
  "25807544": [
    "noble-wood-display-plinth",
    "noble-clear-square-display-case",
    "noble-glass-display-edges-and-blade",
    "noble-recessed-ceiling-coffer",
    "noble-ceiling-coffer-inset",
    "noble-long-warm-wall-display"
  ],
  "55742055": [
    "roundtable-large-pale-map-table",
    "roundtable-tapered-wood-table-leg",
    "roundtable-gray-stone-hall-wall",
    "roundtable-visible-block-joint",
    "roundtable-red-hanging-banner",
    "roundtable-gold-banner-edge",
    "roundtable-purple-high-chair-drape",
    "roundtable-carved-chair-post",
    "roundtable-small-map-piece"
  ],
  "3055018": [
    "obsidim-cracked-gray-gate-pier",
    "obsidim-long-masonry-crack",
    "obsidim-broken-upper-gateway",
    "obsidim-leaning-fluted-column",
    "obsidim-broken-column-crenel",
    "obsidim-dark-arched-rear-door",
    "obsidim-fissured-rear-volcano",
    "obsidim-small-orange-flame",
    "obsidim-low-pale-ground-smoke"
  ],
  "90011152": [
    "ojama-round-cream-house",
    "ojama-wide-ochre-roof",
    "ojama-round-wood-door",
    "ojama-round-porthole-window",
    "ojama-short-door-stair",
    "ojama-yellow-earth-terrace",
    "ojama-flower-windmill-stalk",
    "ojama-flower-windmill-blade",
    "ojama-curled-berry-tree",
    "ojama-red-berry"
  ],
  "26493435": [
    "onomat-upper-white-glow",
    "onomat-long-yellow-radial-streak",
    "onomat-tiny-gold-glint"
  ],
  "61557074": [
    "elemental-large-square-palace",
    "elemental-stacked-stone-dome",
    "elemental-thin-dome-spire",
    "elemental-round-dome-course",
    "elemental-deep-square-portico",
    "elemental-five-round-portico-column",
    "elemental-column-round-capital",
    "elemental-dark-wall-window",
    "elemental-raised-rectangular-base",
    "elemental-pale-portico-step"
  ],
  "16269385": [
    "prank-crooked-yellow-house",
    "prank-gold-timber-frame",
    "prank-purple-cone-roof",
    "prank-purple-roof-tile-ring",
    "prank-cream-upper-round-tank",
    "prank-turquoise-round-porthole",
    "prank-gold-round-finial-stem",
    "prank-gold-round-finial-top",
    "prank-curving-gold-exterior-pipe",
    "prank-purple-porch-roof",
    "prank-small-cyan-house-window"
  ],
  "78710386": [
    "funk-layered-warm-blast-cloud",
    "funk-long-pale-radial-streak",
    "funk-blue-purple-halftone-panel",
    "funk-panel-halftone-dot"
  ],
  "47870325": [
    "smile-scattered-pale-sky-card",
    "smile-brightly-rimmed-oval-opening",
    "smile-colorful-round-sphere",
    "smile-fine-converging-streak",
    "smile-curved-red-stand-edge"
  ],
  "6909330": [
    "soul-dark-riveted-central-gate",
    "soul-green-brick-round-side-tower",
    "soul-tower-brick-course",
    "soul-square-iron-door-band",
    "soul-visible-square-rivet",
    "soul-irregular-upper-crenel",
    "soul-low-orange-liquid-band",
    "soul-round-low-lava-bubble",
    "soul-pink-diagonal-wisp"
  ],
  "54631665": [
    "spyral-heavy-screen-frame",
    "spyral-large-blue-screen",
    "spyral-cyan-wall-light-strip",
    "spyral-blocky-console-desk",
    "spyral-angled-tabletop-monitor-frame",
    "spyral-cyan-monitor-diagram",
    "spyral-square-graph-stroke"
  ],
  "20212491": [
    "purrely-warm-shop-wall",
    "purrely-projecting-gridded-facade",
    "purrely-tall-rear-clock-tower",
    "purrely-tiered-clock-cap",
    "purrely-small-round-rear-clock",
    "purrely-sagging-bunting-cord",
    "purrely-orange-triangular-bunting",
    "purrely-two-headed-iron-lamp",
    "purrely-cafe-table-and-planter",
    "purrely-pot-flower"
  ],
  "75304793": [
    "symph-large-violet-amplifier-cabinet",
    "symph-orange-amplifier-face",
    "symph-yellow-control-knob",
    "symph-concentric-sound-circle",
    "symph-small-round-drum-prop",
    "symph-slim-instrument-support"
  ],
  "84792926": [
    "therion-orange-fissured-volcano",
    "therion-bright-volcanic-fissure",
    "therion-suspended-blue-rim-disc",
    "therion-disc-concentric-lower-rim",
    "therion-industrial-scaffold-block",
    "therion-visible-cross-brace",
    "therion-industrial-warm-window",
    "therion-long-bright-lava-channel"
  ],
  "20216608": [
    "tilted-gold-slot-cabinet",
    "tilted-blue-horizontal-cabinet-stripe",
    "tilted-three-square-reel-window",
    "tilted-three-red-round-button",
    "tilted-curved-gold-top-trim",
    "tilted-yellow-impact-ray"
  ],
  "43175858": [
    "toon-round-beige-castle-tower",
    "toon-purple-square-crenellation",
    "toon-barred-round-castle-gate",
    "toon-straight-gate-bar",
    "toon-leafless-branching-tree",
    "toon-dark-round-bowl-torch",
    "toon-yellow-bowl-torch-flame",
    "toon-red-flag-pole",
    "toon-red-forked-flag",
    "toon-curved-book-cover",
    "toon-curling-pale-pages",
    "toon-round-book-spine"
  ],
  "7293697": [
    "perfect-lavender-round-tower",
    "perfect-tall-red-cone-roof",
    "perfect-small-arched-window",
    "perfect-mushroom-turret-stem",
    "perfect-pink-green-mushroom-roof",
    "perfect-small-mushroom-dot",
    "perfect-pale-curling-smoke",
    "perfect-gold-sky-star",
    "perfect-curved-book-cover",
    "perfect-curling-pale-pages",
    "perfect-round-book-spine"
  ],
  "69299029": [
    "treasure-long-fluted-stone-column",
    "treasure-round-column-capital",
    "treasure-cyan-bowl-fire",
    "treasure-luminous-floor-strip",
    "treasure-small-gold-end-plinth",
    "treasure-long-ceiling-trim"
  ],
  "35550352": [
    "vanquish-warm-map-board",
    "vanquish-pale-paper-patch",
    "vanquish-gold-round-pin",
    "vanquish-curved-red-link-string",
    "vanquish-small-central-cyan-marker"
  ],
  "75952542": [
    "konig-raised-wood-game-board",
    "konig-tall-stepped-faceted-tower",
    "konig-stepped-tower-shoulder",
    "konig-cyan-tower-edge",
    "konig-cyan-angular-map-route",
    "konig-central-round-circuit-base",
    "konig-lower-control-panel",
    "konig-red-blue-control-square"
  ],
  "49568943": [
    "shinra-green-hill-tabletop",
    "shinra-pink-small-volcano",
    "shinra-small-pagoda-body",
    "shinra-dark-stacked-pagoda-roof",
    "shinra-pink-flowering-crown",
    "shinra-curved-blue-small-pond",
    "shinra-tiny-red-gate",
    "shinra-lower-game-control-panel",
    "shinra-red-blue-control-square"
  ],
  "26984177": [
    "imperial-gold-relief-wall",
    "imperial-recessed-round-tablet-border",
    "imperial-thin-tablet-side-mark",
    "imperial-upper-radiating-gold-border",
    "imperial-low-green-relief-mist",
    "imperial-small-pale-round-spark"
  ],
  "58924378": [
    "watt-yellow-polygon-castle-tower",
    "watt-red-cone-tower-roof",
    "watt-cyan-tower-collar",
    "watt-small-diamond-window",
    "watt-blue-round-front-gate",
    "watt-pale-blue-front-step",
    "watt-jagged-yellow-electrical-stroke"
  ],
  "63017368": [
    "wedju-ochre-square-relief-wall",
    "wedju-five-framed-relief-panel",
    "wedju-framed-relief-edge",
    "wedju-stepped-dark-brick-altar",
    "wedju-small-round-fire-bowl",
    "wedju-small-orange-bowl-flame",
    "wedju-thin-round-side-column"
  ],
  "32353566": [
    "walpurgis-large-pale-upper-moon",
    "walpurgis-layered-blue-cloud",
    "walpurgis-small-distant-town-house",
    "walpurgis-dark-gabled-roof",
    "walpurgis-tiny-warm-window",
    "walpurgis-blue-near-hill",
    "walpurgis-small-turquoise-dot-band"
  ],
  "93360904": [
    "acroquey-large-pale-egg-pod",
    "acroquey-round-upper-pod-window",
    "acroquey-triangular-pod-control",
    "acroquey-light-tiered-rear-tower",
    "acroquey-curved-striped-candy-stick",
    "acroquey-candy-stripe-band",
    "acroquey-flat-cookie-flower",
    "acroquey-small-colored-ground-candy"
  ],
  "66975205": [
    "mignon-pink-tiered-cake-wall",
    "mignon-pale-hanging-icing-drop",
    "mignon-winding-cyan-stream",
    "mignon-brown-scalloped-stream-bank",
    "mignon-pastel-egg-shaped-hill",
    "mignon-large-cookie-flower",
    "mignon-small-round-colored-candy",
    "mignon-round-stepped-pastel-pit"
  ],
  "64230128": [
    "zaralaam-tall-faceted-cyan-crystal",
    "zaralaam-long-ceiling-stalactite",
    "zaralaam-dark-round-cave-door",
    "zaralaam-small-violet-door-gem",
    "zaralaam-purple-branching-door-line",
    "zaralaam-blue-stone-approach-step"
  ],
  "4663194": [
    "midnight-tall-dark-clock-tower",
    "midnight-steep-pointed-clock-roof",
    "midnight-small-corner-spire",
    "midnight-large-round-gold-clock",
    "midnight-tower-warm-window",
    "midnight-boxy-side-highrise",
    "midnight-side-warm-window-grid",
    "midnight-huge-pale-full-moon",
    "midnight-gold-moon-crescent"
  ],
  "47596607": [
    "hero-faceted-blue-glass-central-tower",
    "hero-thin-glass-facade-line",
    "hero-two-sloping-green-fins",
    "hero-yellow-round-side-tower",
    "hero-orange-round-tower-cap",
    "hero-curved-elevated-transit-bridge",
    "hero-huge-round-central-canopy",
    "hero-central-canopy-rim-course",
    "hero-wide-pale-front-stair"
  ],
  "22198672": [
    "castle-huge-orange-stellar-disc",
    "castle-orange-stellar-disc-rim",
    "castle-wide-curling-wave-front",
    "castle-thin-orange-radial-spark"
  ]
};
const ids=Object.keys(motifs),create=id=>createFieldEnvironmentGeometry(FIELD_GEOMETRY_THREE,getFieldEnvironmentForCardId(id));
const named=(group,name)=>group.children.filter(mesh=>mesh.userData.instanceNames.includes(name));
const curves=(group,name)=>named(group,name).flatMap(mesh=>mesh.geometry.userData.continuousCurves||[mesh.geometry.userData.continuousCurve]).filter(Boolean);
const worldBounds=(group,name)=>{
  group.updateMatrixWorld(true);const result=new THREE.Box3();
  for(const mesh of named(group,name)){mesh.geometry.computeBoundingBox();for(let i=0;i<mesh.count;i++){const matrix=new THREE.Matrix4();mesh.getMatrixAt(i,matrix);matrix.premultiply(mesh.matrixWorld);result.union(mesh.geometry.boundingBox.clone().applyMatrix4(matrix));}}
  return result;
};

test('47 individually opened community sources retain original JPG bytes and dispatch through the real bounded factory',()=>{
  assert.equal(ids.length,47);assert.deepEqual(new Set(Object.keys(COMMUNITY_CARD_LANDMARKS)),new Set(ids));
  assert.equal(createCommunityReferenceGeometry({profile:{cardId:'unowned'}}),false);
  for(const id of ids){
    const inspected=COMMUNITY_INSPECTED_ART_PROFILES[id],snapshot=FIELD_SPELL_REFERENCE_ART_SNAPSHOT.entries.find(entry=>entry.cardId===id);
    assert.ok(Object.isFrozen(inspected)&&Object.isFrozen(inspected.palette)&&Object.isFrozen(inspected.motifs));
    const bytes=readFileSync(new URL(`../public/environments/field-art/${id}.jpg`,import.meta.url));
    assert.equal(createHash('sha256').update(bytes).digest('hex'),snapshot.sha256,id);
    const group=create(id);assert.equal(group.userData.inspectedArt,inspected);assert.equal(group.userData.fidelity,'reference-informed-geometry');
    assert.equal(group.userData.landmark,COMMUNITY_CARD_LANDMARKS[id]);
    for(const name of motifs[id])assert.ok(hasFieldEnvironmentLandmarkGeometry(group,name),`${id}: ${name}`);
    for(const generic of ['weathered-rock','tree-trunk','canopy-layer','tower','portal-anchor'])assert.equal(hasFieldEnvironmentLandmarkGeometry(group,generic),false,`${id}: ${generic}`);
    disposeFieldEnvironmentGeometry(group);
  }
});

test('whole rendered instances clear the duel corridor and all 47 scenes meet finite-buffer, index, extent and draw budgets',()=>{
  const corridor=new THREE.Box3(new THREE.Vector3(...budget.playableCorridor.min),new THREE.Vector3(...budget.playableCorridor.max));
  for(const id of ids){
    const group=create(id);group.updateMatrixWorld(true);
    assert.ok(group.userData.referencePrimitiveCount<=budget.maxPrimitiveCount,`${id}: ${group.userData.referencePrimitiveCount}`);
    assert.ok(group.userData.drawCallCount<=budget.maxDrawCallCount,`${id}: ${group.userData.drawCallCount}`);
    assert.ok(group.userData.materialCount<=budget.maxMaterialCount,`${id}: ${group.userData.materialCount}`);
    group.traverse(mesh=>{
      if(!mesh.isMesh)return;assert.equal(mesh.isInstancedMesh,true);assert.equal(mesh.material.map,null);
      const positions=mesh.geometry.attributes.position;assert.ok(positions.count>=3);
      for(const attribute of ['position','normal','color']){
        const buffer=mesh.geometry.attributes[attribute];assert.ok(buffer,`${id}/${attribute}`);
        for(const v of buffer.array)assert.ok(Number.isFinite(v),`${id}/${attribute}`);
      }
      assert.equal(mesh.geometry.attributes.normal.count,positions.count);assert.equal(mesh.geometry.attributes.color.count,positions.count);
      assert.ok(Array.from(mesh.geometry.attributes.normal.array).some(v=>Math.abs(v)>.5),'actual surface normals');
      if(mesh.geometry.index)for(const i of mesh.geometry.index.array)assert.ok(i>=0&&i<positions.count,`${id}: index ${i}`);
      mesh.geometry.computeBoundingBox();
      for(let i=0;i<mesh.count;i++){
        const matrix=new THREE.Matrix4();mesh.getMatrixAt(i,matrix);matrix.premultiply(mesh.matrixWorld);
        const bounds=mesh.geometry.boundingBox.clone().applyMatrix4(matrix);
        assert.equal(bounds.intersectsBox(corridor),false,`${id}/${mesh.userData.instanceNames[i]}`);
        for(const axis of ['x','z'])assert.ok(bounds.min[axis]>-budget.maxHorizontalExtent&&bounds.max[axis]<budget.maxHorizontalExtent,`${id}/${axis}`);
      }
    });disposeFieldEnvironmentGeometry(group);
  }
});

test('the two pale palaces retain cylindrical cupolas, jewel turrets and a five-column portico',()=>{
  const allure=create('31322640'),artmage=create('74733322'),elemental=create('61557074');
  assert.equal(named(allure,'allure-round-gray-tower')[0].geometry.userData.referencePrimitiveCount,5);
  assert.equal(named(allure,'allure-pink-onion-dome')[0].geometry.userData.referencePrimitiveCount,5);
  assert.equal(named(artmage,'artmage-colored-teardrop-turret')[0].geometry.userData.referencePrimitiveCount,7);
  assert.equal(named(elemental,'elemental-five-round-portico-column')[0].geometry.userData.referencePrimitiveCount,5);
  const dome=worldBounds(elemental,'elemental-stacked-stone-dome');assert.ok(dome.max.y-dome.min.y>7.9);
  for(const g of [allure,artmage,elemental])disposeFieldEnvironmentGeometry(g);
});

test('the two pop-up book castles use curved indexed page surfaces and distinct castle roofs',()=>{
  const toon=create('43175858'),perfect=create('7293697');
  for(const [group,prefix]of[[toon,'toon'],[perfect,'perfect']]){
    assert.equal(named(group,prefix+'-curved-book-cover')[0].geometry.userData.referencePrimitiveCount,4);
    const cover=worldBounds(group,prefix+'-curved-book-cover');assert.ok(cover.max.y-cover.min.y>5.4,'colored front covers extend below the pages');
    const pages=named(group,prefix+'-curling-pale-pages')[0];assert.equal(pages.geometry.userData.referencePrimitiveCount,12);
    const p=pages.geometry.attributes.position;assert.equal(p.count,12*41*9);
    assert.ok(Math.max(...Array.from({length:p.count},(_,i)=>p.getY(i)))-Math.min(...Array.from({length:p.count},(_,i)=>p.getY(i)))>2.4,'pages curl above the spine');
  }
  assert.equal(named(toon,'toon-purple-square-crenellation')[0].geometry.userData.referencePrimitiveCount,15);
  assert.equal(named(perfect,'perfect-tall-red-cone-roof')[0].geometry.userData.referencePrimitiveCount,4);
  for(const g of [toon,perfect])disposeFieldEnvironmentGeometry(g);
});

test('Babylon terracing and the two game-board worlds have real and different relief',()=>{
  const babylon=create('4357063'),konig=create('75952542'),shinra=create('49568943');
  const pit=named(babylon,'babylon-concentric-stepped-pit')[0].geometry.attributes.position;assert.equal(pit.count,97*37);
  assert.ok(Math.max(...Array.from({length:pit.count},(_,i)=>pit.getY(i)))-Math.min(...Array.from({length:pit.count},(_,i)=>pit.getY(i)))>4.2);
  const underside=worldBounds(babylon,'babylon-floating-undercut-island');assert.ok(underside.min.y<=-8&&underside.max.y<=5);
  const annulus=named(babylon,'babylon-open-green-upper-annulus')[0].geometry.attributes.position;
  assert.ok(Array.from({length:annulus.count},(_,i)=>Math.hypot(annulus.getX(i)/10,(annulus.getZ(i)+33)/7)).every(r=>r>.9999),'upper annulus leaves the pit open');
  assert.equal(named(konig,'konig-tall-stepped-faceted-tower')[0].geometry.userData.referencePrimitiveCount,19);
  assert.equal(named(shinra,'shinra-dark-stacked-pagoda-roof')[0].geometry.userData.referencePrimitiveCount,12);
  assert.ok(named(shinra,'shinra-curved-blue-small-pond')[0].geometry.attributes.position.count>600);
  for(const g of [babylon,konig,shinra])disposeFieldEnvironmentGeometry(g);
});

test('museum coffers remain above the full corridor and the rotunda oculus is an actual bounded ellipse',()=>{
  const museum=create('25807544'),rotunda=create('35815783');
  const ceiling=named(museum,'noble-recessed-ceiling-coffer')[0].geometry.attributes.position;
  assert.ok(Math.min(...Array.from({length:ceiling.count},(_,i)=>ceiling.getY(i)))>30);
  const cases=named(museum,'noble-clear-square-display-case');assert.ok(cases.every(m=>m.material.transparent&&m.material.opacity===.33));
  const rim=named(rotunda,'magikey-round-oculus-band')[0].geometry;rim.computeBoundingBox();
  assert.ok(rim.boundingBox.max.x-rim.boundingBox.min.x>33);assert.ok(rim.boundingBox.max.z-rim.boundingBox.min.z<25);
  for(const g of [museum,rotunda])disposeFieldEnvironmentGeometry(g);
});

test('the warm shop street retains sagging bunting and the moonlit village has sagging bridge ropes',()=>{
  const street=create('20212491'),village=create('26232916');
  const bunting=curves(street,'purrely-sagging-bunting-cord');assert.equal(bunting.length,3);
  assert.ok(bunting.every(c=>Math.min(...c.map(p=>p[1]))<c[0][1]-2.9));
  const ropes=curves(village,'ninja-sagging-bridge-rope');assert.equal(ropes.length,2);
  assert.ok(ropes.every(c=>Math.min(...c.map(p=>p[1]))<c[0][1]-1.7));
  assert.equal(named(street,'purrely-orange-triangular-bunting')[0].geometry.userData.referencePrimitiveCount,33);
  for(const g of [street,village])disposeFieldEnvironmentGeometry(g);
});

test('figure-dominated sources keep observed diagram, panel, spark and wave scenery without figure models',()=>{
  for(const id of ['90764871','56725612','18890039','95477924','26493435','78710386','22198672']){
    const group=create(id);assert.equal(group.userData.publicOnly,true);
    for(const name of ['humanoid','demon-model','dragon-model','magician-model','vehicle-model'])assert.equal(hasFieldEnvironmentLandmarkGeometry(group,name),false);
    for(const mesh of group.children){assert.equal(mesh.material.vertexColors,true);assert.equal(mesh.material.emissive.getHex(),0);}
    disposeFieldEnvironmentGeometry(group);
  }
});

test('all buffers, unused host shapes, materials and GPU instance resources dispose exactly once on replacement',()=>{
  for(const id of ids){
    const tracked=new Map(),bounded={...FIELD_GEOMETRY_THREE};
    for(const key of ['MeshStandardMaterial','BufferGeometry','BoxGeometry','DodecahedronGeometry','ConeGeometry','CylinderGeometry','IcosahedronGeometry','TorusGeometry','SphereGeometry','InstancedMesh']){
      const Base=bounded[key];bounded[key]=class extends Base{constructor(...args){super(...args);tracked.set(this,0);this.addEventListener('dispose',()=>tracked.set(this,tracked.get(this)+1));}};
    }
    const group=createFieldEnvironmentGeometry(bounded,getFieldEnvironmentForCardId(id));
    disposeFieldEnvironmentGeometry(group);disposeFieldEnvironmentGeometry(group);assert.equal(group.children.length,0);
    for(const [resource,count]of tracked)assert.equal(count,1,`${id}: ${resource.type}`);
  }
});
