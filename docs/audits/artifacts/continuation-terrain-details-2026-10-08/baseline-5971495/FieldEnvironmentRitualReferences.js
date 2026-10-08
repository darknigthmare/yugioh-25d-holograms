import { createFieldReferenceDetailGeometry } from './FieldReferenceDetailGeometry.js';

/** Forty-five individually inspected intact sources supply adapted scenery. Additional sculptures are declared per card; this is not a complete 1:1 spatial reproduction. */
export const RITUAL_CARD_LANDMARKS = Object.freeze({"17782288": "angelechy-overhead-checker-ring-tudor-town", "59048135": "heraldry-linked-diamond-light-ribbons", "80749819": "forgotten-skull-littered-rock-tunnel", "69039982": "crusadia-overhead-gold-white-ray-fan", "81380218": "chorus-cross-topped-violet-cloud-gates", "23213239": "danger-stormy-sea-black-spire-island", "12397569": "baatistina-hollow-spiralling-ice-blades", "53639887": "snake-eye-cracked-altar-cyan-braziers", "71817640": "dragonic-three-flame-columns-cloud-triangles", "7917970": "dragunity-amber-canyon-pink-gold-ribbons", "92223430": "elborz-wind-wrapped-green-alpine-valley", "39730727": "tenyi-steep-angular-rock-ledge", "40089744": "chaos-staggered-blue-white-radial-panels", "50186558": "guardragon-cyan-shield-ruined-recess", "17255673": "mikanko-rainbow-rope-shrine-helical-steps", "81777047": "luminous-red-black-diagonal-speed-bands", "71650854": "mid-breaker-red-orange-globes-blue-streams", "27564031": "malefic-blue-maze-ring-circuit-panels", "68337209": "maliss-magenta-diamond-pixel-raster", "84504242": "megalith-three-octagonal-lit-podiums", "269012": "bound-three-chain-wrapped-monoliths", "885016": "multi-universe-cyan-spires-rune-rings", "62314831": "amritara-seven-clouded-colored-worlds", "60946968": "a-zone-green-spiral-nebula-rock-shelf", "51669847": "vidolia-dripping-oval-stained-panel", "77584012": "pseudo-cyan-outlined-city-grey-world", "79698395": "danger-lagoon-double-natural-arches", "45778932": "rising-soft-diagonal-white-sky-wisps", "24793135": "gizmek-gold-scroll-ink-mountain-river", "30336082": "sangen-engraved-three-flame-cup-pillars", "1127737": "sargasso-broken-floating-carrier-decks", "48015771": "summon-over-pink-wire-dome-control-box", "9597987": "tenchi-dark-wood-hall-octagon-candles", "77946022": "tenyinfinity-broad-gold-rings-black-spires", "56433456": "sanctuary-floating-ruin-stairs-forked-orb", "48179391": "orichalcos-double-rune-rim-six-point-seal", "45943516": "war-rock-toothed-hollow-stone-beast-mountain", "4398189": "white-forest-braided-curled-canopy", "61654098": "discovery-vine-wrapped-abandoned-dish", "67831115": "shadow-midnight-grass-needle-horizon", "35546670": "scars-flooded-leaning-windowed-city", "25163979": "nightmare-orange-cracked-battle-plain", "59197169": "yami-pink-torn-smoke-abyss", "65861210": "beast-paradise-three-obelisks-eye-tree", "43236494": "fairytale-tiled-roofs-chimney-day-clouds"});

export const RITUAL_INSPECTED_ART_PROFILES = Object.freeze(Object.fromEntries([
  [
    "17782288",
    [
      "#868d88",
      "#b5c2c7",
      "#6b916b",
      "#fff69a",
      "#6a5144",
      "#f2f5df"
    ],
    [
      "large floating silver annulus with radial rectangular engraving and four gold lamps",
      "yellow underside checker lattice and narrow descending beams",
      "dense half-timbered village with pitched tiled roofs and windowed balconies; figure above the ring stays painted"
    ]
  ],
  [
    "59048135",
    [
      "#53345a",
      "#c6a941",
      "#817a45",
      "#ffef9d",
      "#893856",
      "#fffbd1"
    ],
    [
      "two gold curving chains of overlapping diamond-shaped heraldic panels",
      "magenta oval ground seal and fine pink blue radiating streaks",
      "central ornate floating crest retains its painted engraving"
    ]
  ],
  [
    "80749819",
    [
      "#303840",
      "#5c6771",
      "#424d58",
      "#c6b69a",
      "#202830",
      "#d7ccb0"
    ],
    [
      "deep irregular round rock tunnel with jagged layered walls and ceiling",
      "many pale skulls with dark eye sockets and broken teeth along the banks",
      "flat uneven worn stone walkway between piles of rubble"
    ]
  ],
  [
    "69039982",
    [
      "#766552",
      "#bba677",
      "#817c68",
      "#fff1ba",
      "#786751",
      "#ffffe2"
    ],
    [
      "dense gold white rays fan down from a single brilliant overhead point",
      "fine cyan orange green highlights interleave the broad luminous bands",
      "four characters and their weapons remain painted; no palace is visible"
    ]
  ],
  [
    "81380218",
    [
      "#d5e0ec",
      "#d4acc0",
      "#7ea481",
      "#e1acbc",
      "#bd838d",
      "#f8f5f0"
    ],
    [
      "low thin violet fence with scalloped rails and a central cross-topped double gate",
      "foreground coral roses with curled layered petals",
      "broad white cloud floor and blue sky; adapted red-haired winged cherub, laurel crown, halo and black musical notes now have sculptural volumes"
    ]
  ],
  [
    "23213239",
    [
      "#596b6d",
      "#756748",
      "#3d4e3f",
      "#ffd879",
      "#705336",
      "#f5f5d9"
    ],
    [
      "violent dark rolling water with dense broken white foam crests",
      "distant jagged rooted island spires and long thin horizontal rock shelves",
      "orange storm sky with many fine yellow branching bolts; creatures boat and people stay painted"
    ]
  ],
  [
    "12397569",
    [
      "#45486c",
      "#bdcfef",
      "#7c8fb4",
      "#daedff",
      "#66688d",
      "#f2f7ff"
    ],
    [
      "many long flat pale blue crystalline blades spiral around a large dark circular opening",
      "small concentric red green glowing center within the void",
      "broken grey blue layered icy terrain below the rising crystals"
    ]
  ],
  [
    "53639887",
    [
      "#416079",
      "#87929a",
      "#557861",
      "#74eaf8",
      "#40515e",
      "#d6f7ff"
    ],
    [
      "three raised cracked grey altar tiers with steps and crawling vines",
      "four short corner braziers with cyan flames and two taller ruined side columns",
      "cyan ground loop; serpentine background figure and red eye stay painted"
    ]
  ],
  [
    "71817640",
    [
      "#456888",
      "#acbce0",
      "#7876ae",
      "#d8faff",
      "#73549b",
      "#f1fcff"
    ],
    [
      "orange blue and violet jagged vertical flame curtains",
      "three colored bright points connected by white branching lightning",
      "large white angular ground triangles over clouds; three hovering figures remain painted"
    ]
  ],
  [
    "7917970",
    [
      "#806438",
      "#b38c51",
      "#8e7744",
      "#ffe394",
      "#614a5b",
      "#ffeeba"
    ],
    [
      "angular ochre mesas and floating rock chips in the lower sky",
      "broad pink and gold curving ribbons behind the upper flying figure",
      "small green light orbs; both armored beings remain painted"
    ]
  ],
  [
    "92223430",
    [
      "#537e61",
      "#a3b7d1",
      "#5f9554",
      "#ebf9ff",
      "#647687",
      "#faffff"
    ],
    [
      "sharp pale blue mountain chains around a green valley and a small blue lake",
      "long broad white wind ribbons curve around the valley and upper sky",
      "large bird its gold halo and drifting dark feathers stay painted"
    ]
  ],
  [
    "39730727",
    [
      "#73654f",
      "#9d916e",
      "#857752",
      "#e7d2a1",
      "#665746",
      "#f1e1b9"
    ],
    [
      "steep dark angular crag with a long pointed broken projecting ledge",
      "sharp layered rock plates and narrow protruding stone splinters",
      "beige drifting dust and diagonal sun shafts; fighter and enormous golden serpent remain painted"
    ]
  ],
  [
    "40089744",
    [
      "#78b2d8",
      "#9bdbf3",
      "#6bb9e3",
      "#e6ffff",
      "#448bca",
      "#ffffff"
    ],
    [
      "dense long blue white rectangular rays converge on a white center",
      "staggered angular panel borders and stepped ends punctuate the radial strips",
      "no architecture or characters are depicted"
    ]
  ],
  [
    "50186558",
    [
      "#786858",
      "#a89970",
      "#7ca992",
      "#bbfff0",
      "#7b5b52",
      "#f8ffc9"
    ],
    [
      "large translucent cyan circular shield behind the central spectral figure",
      "fragmented grey brown background wall and flying angular stone pieces",
      "gold shafts and tiny green stars; dragon and armored figures remain painted"
    ]
  ],
  [
    "17255673",
    [
      "#7b7953",
      "#c89962",
      "#637e60",
      "#ffe598",
      "#a4513c",
      "#fff4c8"
    ],
    [
      "red square shrine with fine roof railing and gold carved front post caps",
      "thick drooping braided rope and long colored ceremonial hanging ribbons",
      "gold leaf-shaped ascending helical steps toward a bright sky seal above mountain mist"
    ]
  ],
  [
    "81777047",
    [
      "#222124",
      "#292b30",
      "#59555a",
      "#f66e70",
      "#64343b",
      "#ffffff"
    ],
    [
      "broad black and white diagonal speed bands radiate behind the central figure",
      "many fine parallel red lines cross the black strips",
      "armored winged figure stays painted; no columns or stars are visible"
    ]
  ],
  [
    "71650854",
    [
      "#334858",
      "#5e738d",
      "#576780",
      "#ff734c",
      "#773b4c",
      "#bfe8fa"
    ],
    [
      "six round orange red energy globes contain dark patches and bright fissures",
      "fine long cyan vertical streams in the foreground",
      "orange and blue background streaks; both fighters remain painted"
    ]
  ],
  [
    "27564031",
    [
      "#323158",
      "#426778",
      "#367b58",
      "#93eaff",
      "#4b356a",
      "#efffff"
    ],
    [
      "concentric blue circular maze ring with interrupted inner sectors",
      "many branching blue circuit spokes connect to green rectangular peripheral panels with white blocks",
      "pink purple point arrays and a small white spiral galaxy in the cosmic background"
    ]
  ],
  [
    "68337209",
    [
      "#563456",
      "#a95486",
      "#555575",
      "#8bd8ed",
      "#582e56",
      "#e0dafa"
    ],
    [
      "distorted magenta lavender dark diamond checker backdrop",
      "many irregular cyan rectangular pixel glitches",
      "thin horizontal pink scanlines; characters ribbons cups and clocks stay painted"
    ]
  ],
  [
    "84504242",
    [
      "#796942",
      "#b9ae96",
      "#8d8668",
      "#fcf4bd",
      "#6f614a",
      "#ffffff"
    ],
    [
      "three floating thick octagonal stone podiums framed by gold borders",
      "cyan white and yellow circular underside lights and round corner rivets",
      "gold white vertical rays and small stars; three carved figures remain painted"
    ]
  ],
  [
    "269012",
    [
      "#596164",
      "#797568",
      "#65695c",
      "#fff28e",
      "#494f4d",
      "#d9dde0"
    ],
    [
      "three irregular upright stone monoliths with round drilled anchor holes",
      "long heavy elongated iron chain links wrap the stones and converge on an overhead sun",
      "broad yellow lightning bolts and dark concentric storm cloud bands"
    ]
  ],
  [
    "885016",
    [
      "#354877",
      "#7cafd0",
      "#588abd",
      "#acecfa",
      "#4778aa",
      "#f3faff"
    ],
    [
      "thin blue floating city spires with cup-shaped capitals and a tiered central tower",
      "two high purple gold rune rings and a lower small blue white ring",
      "white curved bar gate thin spiral lamp poles and small square cyan sky pixels; visitor stays painted"
    ]
  ],
  [
    "62314831",
    [
      "#26384b",
      "#84c9df",
      "#78a79d",
      "#bcebf4",
      "#434466",
      "#e5f4ed"
    ],
    [
      "large central blue green clouded globe",
      "six separate smaller dark grey white violet green and orange worlds around it",
      "fine star points and faint curved nebula bands"
    ]
  ],
  [
    "60946968",
    [
      "#343a3c",
      "#6d7974",
      "#6faa75",
      "#b6ed9e",
      "#667c72",
      "#f0f9c0"
    ],
    [
      "broad green orange purple nebula curls around two small spiral light centers",
      "dark layered broken foreground rock shelf and floating stone shards",
      "gold tapered beam from the upper visitor; alien and craft remain painted"
    ]
  ],
  [
    "51669847",
    [
      "#593a3d",
      "#8d7a8a",
      "#6e7c45",
      "#ee626c",
      "#352d32",
      "#e5d9c7"
    ],
    [
      "large black red pointed oval frame with long thin dripping strands",
      "diagonal dark chains veined yellow green and a colored lower-left stained-glass panel",
      "broad red white crossing swirls and a small green lower-right crystal; enclosed armored figure stays painted"
    ]
  ],
  [
    "77584012",
    [
      "#286178",
      "#4e8ca0",
      "#4d6975",
      "#a0f2f4",
      "#263b4b",
      "#e3fcf5"
    ],
    [
      "steep cyan wireframe skyscrapers with rows of deep black rectangular windows",
      "tall stepped center tower with a small pointed cap",
      "large grey partial sky globe and two crossed white diagonal light strips"
    ]
  ],
  [
    "79698395",
    [
      "#527b88",
      "#a6a0b1",
      "#526f5b",
      "#d4e9f1",
      "#717183",
      "#f5f5fa"
    ],
    [
      "wide blue lagoon ringed by jagged pale violet shores and dark trees",
      "two huge curving natural stone arches flank a tall distant pale mountain",
      "small table-shaped rock shelves and white mist; explorers remain painted"
    ]
  ],
  [
    "45778932",
    [
      "#648caf",
      "#afcfe8",
      "#84a4ba",
      "#e8f6ff",
      "#739bb9",
      "#f8fdff"
    ],
    [
      "long soft diagonal white cloud wisps at several widths",
      "blue sky behind the single soaring bird",
      "bird and feather details remain painted; no ground or architecture is present"
    ]
  ],
  [
    "24793135",
    [
      "#909279",
      "#929b88",
      "#447261",
      "#d1b866",
      "#69725b",
      "#eee8d2"
    ],
    [
      "gold rolled scroll edge at right framing black needle mountains and green rocks",
      "white crested winding river and sparse pine branches",
      "broad gold cloud patches; golden beasts and painted border details stay painted"
    ]
  ],
  [
    "30336082",
    [
      "#4a4245",
      "#b29160",
      "#81704e",
      "#eaffff",
      "#68543d",
      "#fff6cd"
    ],
    [
      "three tall gold etched cylinders end in broad round offering cups",
      "white cyan and red flames rise around each differently colored bowl",
      "large black overhead void bounded by jagged white lightning; suspended card stays painted"
    ]
  ],
  [
    "1127737",
    [
      "#414660",
      "#8b8da0",
      "#727995",
      "#8cdaec",
      "#654d54",
      "#e2e5dc"
    ],
    [
      "three irregular broken floating grey carrier decks with exposed rusted underside ribs",
      "white dashed runway lines thin radar masts and ruined offset bridge housings",
      "many floating stone and steel fragments; tiny aircraft silhouettes remain painted"
    ]
  ],
  [
    "48015771",
    [
      "#425d54",
      "#84949a",
      "#477a53",
      "#ff9aed",
      "#5c6e68",
      "#f2dbf6"
    ],
    [
      "bright magenta hemispherical wire cage above a circular etched floor seal",
      "large pink faceted diamonds around the lower rim",
      "grey right control box with red toggle and lower pink strips; creatures remain painted"
    ]
  ],
  [
    "9597987",
    [
      "#423932",
      "#685549",
      "#655e48",
      "#ff9259",
      "#342a24",
      "#fff6d9"
    ],
    [
      "two heavy dark timber columns and high beam frame a paneled interior",
      "glowing triple-lined orange octagon with eight outer round nodes on the plank floor",
      "eight white wax candles at different heights; fighter and weapon flames remain painted"
    ]
  ],
  [
    "77946022",
    [
      "#724531",
      "#805747",
      "#635344",
      "#ffe395",
      "#583329",
      "#fff1ae"
    ],
    [
      "jagged dark steep rock needles and floating angular chips",
      "two extremely broad sweeping gold energy bands with darker interior markings",
      "small gold sparks; central fiery figure and serpent accessory remain painted"
    ]
  ],
  [
    "56433456",
    [
      "#998d73",
      "#e0d4b4",
      "#43665b",
      "#fcf0ce",
      "#8e7967",
      "#f9f5e7"
    ],
    [
      "ruined pale floating island temple with long staircase and many front and rear columns",
      "broken side platforms curved right gallery and scattered narrow ruins",
      "high slender spiral-marked column crowned by two outward fork caps holding a white orb"
    ]
  ],
  [
    "48179391",
    [
      "#3b3d4d",
      "#829491",
      "#53775f",
      "#80ffb1",
      "#465b52",
      "#e0ffe9"
    ],
    [
      "two bright green circular rims surround two interlocking equilateral triangles",
      "outer band contains individual curved angular glyphs and a heart-like top mark",
      "soft grey violet smoke around a white bright center; no building is depicted"
    ]
  ],
  [
    "45943516",
    [
      "#6b7061",
      "#969b8b",
      "#738672",
      "#ffd5d2",
      "#646151",
      "#fffffb"
    ],
    [
      "enormous jagged stone peak resembles an open toothed beast mouth",
      "dark deep recessed mouth separates upper and lower sharp irregular stone jaws",
      "many long leaning rock fins down the sides and a white pink upper-right sun"
    ]
  ],
  [
    "4398189",
    [
      "#b9c9d1",
      "#dce5ed",
      "#bed2dc",
      "#d7f9ff",
      "#869ba9",
      "#f8fdff"
    ],
    [
      "thick white grey braided trunks with many curling hook-shaped branches",
      "pale flat canopy leaves and fine floating translucent diamond chips",
      "bright diagonal sun shafts and a pale grassy floor; small witches remain painted"
    ]
  ],
  [
    "61654098",
    [
      "#464d75",
      "#8586ad",
      "#4b5b79",
      "#d8dfff",
      "#373e56",
      "#c6d1ef"
    ],
    [
      "monumental abandoned round dish on a thick narrow stem among blue forest",
      "raised circular rim and many thin hanging crossing vines",
      "steep right rock face and pale overhead stars; all explorers stay painted"
    ]
  ],
  [
    "67831115",
    [
      "#303d38",
      "#3d4651",
      "#4a5b3e",
      "#b2dce4",
      "#2b343d",
      "#dde9e6"
    ],
    [
      "dark sparse grass floor beneath a pointed distant black skyline",
      "small pale cyan star points in the midnight sky",
      "giant fallen mechanical limbs and the numerous orange-eyed beings remain painted"
    ]
  ],
  [
    "35546670",
    [
      "#675a6a",
      "#8b7b80",
      "#69774f",
      "#e2ad93",
      "#5d4c5b",
      "#f4d3ac"
    ],
    [
      "broken leaning modern buildings with rows of dark windows and roof foliage",
      "pink violet flood water reflects warm orange light among ruined slabs",
      "giant golden central relic and foreground observers remain painted"
    ]
  ],
  [
    "25163979",
    [
      "#8e5948",
      "#ab8060",
      "#947350",
      "#f7c382",
      "#614a4d",
      "#f7d8b0"
    ],
    [
      "flat cracked orange brown stone plain with black seams and jagged scattered slabs",
      "small pale block silhouettes along a sunset horizon",
      "thin purple curved veining in the upper sky; all large beings and fighters remain painted"
    ]
  ],
  [
    "59197169",
    [
      "#25202f",
      "#6f4565",
      "#52394d",
      "#d77ca7",
      "#342133",
      "#f5d5e1"
    ],
    [
      "large nearly black central abyss has no architectural edge",
      "torn magenta wisps descend from upper left and upper right",
      "bright broad curved pink smoke band and irregular pale edges wrap the lower opening"
    ]
  ],
  [
    "65861210",
    [
      "#474d4d",
      "#c7bea0",
      "#525e48",
      "#b8ed81",
      "#4b4c3c",
      "#e5faff"
    ],
    [
      "three extremely tall tapered square gold stone obelisks with pointed caps",
      "central thick leafless tree has many crooked branches green hollow eyes spreading roots and a red apple",
      "rough layered rocky ground and dense white blue branching lightning; winged figure stays painted"
    ]
  ],
  [
    "43236494",
    [
      "#b6bfa2",
      "#d1b99a",
      "#74a566",
      "#f8dfa2",
      "#a56744",
      "#f6fbfc"
    ],
    [
      "left red pitched roof has distinct staggered tiles",
      "right brown roof shingles square chimney cap and slim green eave border",
      "rounded green treetops and white sky clouds; smiling sun remains painted"
    ]
  ]
].map(([cardId,colors,motifs])=>[cardId,Object.freeze({cardId,sourceUrl:`https://images.ygoprodeck.com/images/cards_cropped/${cardId}.jpg`,motifs:Object.freeze(motifs),palette:Object.freeze({ground:colors[0],stone:colors[1],foliage:colors[2],accent:colors[3],wood:colors[4],foam:colors[5]})})])));

export function createRitualReferenceGeometry(ctx) {
  const {THREE,profile,materials:m,material,geometry,add,block,beam,
    curvedDeck,box,cylinder,cone,ring,crown}=ctx;
  if(!Object.hasOwn(RITUAL_CARD_LANDMARKS,profile.cardId)) return false;
  const sphere = geometry('ritual-sphere', () => new THREE.SphereGeometry(1,16,12));
  const pyramid = geometry('ritual-square-pyramid', () => new THREE.ConeGeometry(1,1,4));
  const gable = geometry('ritual-pitched-gable', () => {
    const points=[[-.5,0,-.5],[.5,0,-.5],[0,1,-.5],[-.5,0,.5],[.5,0,.5],[0,1,.5]];
    const triangles=[[0,2,1],[3,4,5],[0,3,5],[0,5,2],[1,2,5],[1,5,4],[0,1,4],[0,4,3]];
    const shape=new THREE.BufferGeometry();
    shape.setAttribute('position',new THREE.Float32BufferAttribute(triangles.flatMap(t=>t.flatMap(i=>points[i])),3));
    shape.computeVertexNormals(); return shape;
  });
  const gothic = (name,mat,x,y,z,width,height,depth=.16,angle=0) => {
    block(name,mat,x,y,z,width,height,depth).rotation.y=angle;
    add(`${name}-pointed-head`,gable,mat,[x,y+height*.5,z],[width,width*.85,depth],[0,angle,0]);
  };
  const roof=(name,mat,x,y,z,w,h,d)=>add(name,gable,mat,[x,y,z],[w,h,d]);
  const turret=(name,x,z,h,r,mat=m.stone,roofMat=m.wood)=>{
    add(`${name}-round-body`,cylinder,mat,[x,h*.5,z],[r,h,r]);
    add(`${name}-round-capital`,cylinder,mat,[x,h-.2,z],[r*1.2,.45,r*1.2]);
    add(`${name}-cone-roof`,cone,roofMat,[x,h+r*1.2,z],[r*1.45,r*2.4,r*1.45]);
    add(`${name}-finial`,cone,m.gold,[x,h+r*2.7,z],[.12,.9,.12]);
  };
  // Connected physical tubes share one static buffer. This permits multiple
  // inscription/orbit lines or seven rainbow bands without seven draw calls.
  // Nothing here samples a texture or interprets the card name as geometry.
  const paths=(name,mat,definitions,segments=48,sides=6)=>{
    const positions=[],indices=[],colors=[],samples=[];
    for(const definition of definitions) {
      const start=positions.length/3,points=[];
      for(let i=0;i<=segments;i++) {
        const t=i/segments,point=definition.path(t);points.push(point);
        const a=definition.path(Math.max(0,t-.001)),b=definition.path(Math.min(1,t+.001));
        const tangent=new THREE.Vector3(b[0]-a[0],b[1]-a[1],b[2]-a[2]).normalize();
        const reference=Math.abs(tangent.y)>.9?new THREE.Vector3(1,0,0):new THREE.Vector3(0,1,0);
        const normal=new THREE.Vector3().crossVectors(tangent,reference).normalize();
        const binormal=new THREE.Vector3().crossVectors(tangent,normal).normalize();
        const radius=typeof definition.radius==='function'?definition.radius(t):(definition.radius??.08);
        const color=definition.color?new THREE.Color(definition.color):null;
        for(let j=0;j<sides;j++) {
          const angle=j*Math.PI*2/sides,c=Math.cos(angle)*radius,s=Math.sin(angle)*radius;
          positions.push(point[0]+normal.x*c+binormal.x*s,point[1]+normal.y*c+binormal.y*s,point[2]+normal.z*c+binormal.z*s);
          if(color) colors.push(color.r,color.g,color.b);
        }
      }
      for(let i=0;i<segments;i++) for(let j=0;j<sides;j++) {
        const a=start+i*sides+j,b=start+i*sides+(j+1)%sides,c=a+sides,d=b+sides;
        indices.push(a,b,c,b,d,c);
      }
      samples.push(Object.freeze(points.map(p=>Object.freeze(p))));
    }
    const shape=geometry(`ritual-${name}`,()=>{
      const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(indices);
      if(colors.length) g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
      g.computeVertexNormals();g.userData.continuousCurves=Object.freeze(samples);return g;
    });
    return add(name,shape,mat,[0,0,0]);
  };
  const ellipse=(name,mat,x,y,z,rx,rz,radius=.1)=>paths(name,mat,[{path:t=>[x+rx*Math.cos(t*Math.PI*2),y,z+rz*Math.sin(t*Math.PI*2)],radius}],64);
  const bowl=(name,mat,x,z,rx,rz,inner,height,tiers=8)=>{
    const positions=[],indices=[],n=72,rows=[];
    // Flat treads alternate with upright risers rather than a smooth cone.
    for(let i=0;i<=tiers;i++) {
      const r=inner+(1-inner)*i/tiers,y=height*i/tiers;
      rows.push([r,y]); if(i<tiers) rows.push([inner+(1-inner)*(i+1)/tiers,y]);
    }
    rows.push([1,0],[inner,0]);
    for(const [r,y] of rows) for(let j=0;j<=n;j++) {
      const a=j*Math.PI*2/n;positions.push(x+rx*r*Math.cos(a),y,z+rz*r*Math.sin(a));
    }
    for(let i=0;i<rows.length-1;i++) for(let j=0;j<n;j++) {
      const a=i*(n+1)+j,b=a+1,c=a+n+1,d=c+1;indices.push(a,b,c,b,d,c);
    }
    const shape=geometry(`ritual-${name}`,()=>{const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();g.userData.terraceCount=tiers;return g;});
    return add(name,shape,mat,[0,0,0]);
  };
  const crag=(name,x,z,width,height,depth,mat=m.stone,phase=0)=>{
    const shape=geometry(`ritual-${name}`,()=>{
      const g=new THREE.BoxGeometry(1,1,1,5,12,6),p=g.attributes.position;
      for(let i=0;i<p.count;i++) {
        const px=p.getX(i),py=p.getY(i),pz=p.getZ(i),t=py+.5;
        p.setXYZ(i,px*width*(1+.10*Math.sin(t*15+pz*4+phase))+.28*Math.sin(t*6+phase),
          py*height+Math.sin(px*8+pz*5+phase)*(.25+t*.85),pz*depth+Math.sin(t*19+px*6+phase)*.24);
      }
      g.computeVertexNormals();g.userData.irregularWall=true;return g;
    });return add(name,shape,mat,[x,height*.5,z]);
  };
  const slab=geometry('ritual-irregular-six-sided-stone-slab',()=>{
    const g=new THREE.CylinderGeometry(1,1,1,6),p=g.attributes.position;
    for(let i=0;i<p.count;i++) {const x=p.getX(i),z=p.getZ(i),a=Math.atan2(z,x),r=1+.12*Math.sin(a*5+.7);p.setX(i,x*r);p.setZ(i,z*r);}
    g.computeVertexNormals();return g;
  });
  const shardRock=geometry('ritual-low-poly-splintered-crag',()=>{
    const g=new THREE.DodecahedronGeometry(1,0),p=g.attributes.position;
    for(let i=0;i<p.count;i++) {const x=p.getX(i),y=p.getY(i),z=p.getZ(i);p.setXYZ(i,x+.11*Math.sin(y*8+z*3),y+.1*Math.sin(x*6-z*4),z);}
    g.computeVertexNormals();return g;
  });
  const poly=points=>t=>{
    const at=t*(points.length-1),k=Math.min(points.length-2,Math.floor(at)),u=at-k,a=points[k],b=points[k+1];return a.map((v,i)=>v+(b[i]-v)*u);
  };
  const stairs=(name,mat,x,z,width,count,rise=.38,run=.85)=>{
    for(let i=0;i<count;i++) block(name,mat,x,.15+i*rise,z-i*run,width,.3,run+.08);
  };
  const orb=(name,mat,x,y,z,size)=>add(name,sphere,mat,[x,y,z],[size,size,size]);
  const crescent=(name,mat,x,y,z,radius)=>paths(name,mat,[{path:t=>[x+Math.cos(.35*Math.PI+t*1.35*Math.PI)*radius,y+Math.sin(.35*Math.PI+t*1.35*Math.PI)*radius,z],radius:.13}],48);

  const colored=()=>material('#ffffff',{vertexColors:true,roughness:.65});
  const verticalRing=(name,mat,x,y,z,rx,ry,radius=.08)=>paths(name,mat,[{path:t=>[x+rx*Math.cos(t*Math.PI*2),y+ry*Math.sin(t*Math.PI*2),z],radius}],64);
  const star=(name,mat,x,y,z,r=.5)=>{
    add(name,gable,mat,[x,y,z],[r*.38,r,.08]);
    add(name,gable,mat,[x,y,z],[r*.38,r,.08],[0,0,Math.PI]);
    add(name,gable,mat,[x,y,z],[r*.25,r*.65,.08],[0,0,Math.PI/2]);
    add(name,gable,mat,[x,y,z],[r*.25,r*.65,.08],[0,0,-Math.PI/2]);
  };
  const ribbon=(name,mat,path,width,axis=[0,1,0],segments=80)=>{
    const positions=[],indices=[],samples=[];
    for(let i=0;i<=segments;i++) {const t=i/segments,p=path(t),w=typeof width==='function'?width(t):width;samples.push(p);
      for(const k of [-1,1]) positions.push(...p.map((v,j)=>v+axis[j]*w*k*.5));
      if(i<segments) {const a=i*2;indices.push(a,a+1,a+2,a+1,a+3,a+2);}
    }
    const shape=geometry(`ritual-${name}`,()=>{const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();g.userData.continuousRibbon=Object.freeze(samples);return g;});
    return add(name,shape,mat,[0,0,0]);
  };
  const crystal=geometry('ritual-pointed-six-faceted-crystal',()=>{
    const g=new THREE.CylinderGeometry(.02,1,1,6,1,false),p=g.attributes.position;
    for(let i=0;i<p.count;i++) {const y=p.getY(i);if(y>0)p.setX(i,p.getX(i)+.23);}
    g.computeVertexNormals();return g;
  });
  const lightning=(name,mat,lines)=>paths(name,mat,lines.map(p=>({path:poly(p),radius:.075})),48);

  const prism=(key,outline,depth=1)=>geometry(`ritual-${key}`,()=>{
    // Ear clipping keeps the visibly chipped concave carrier/jaw contours real
    // geometry without pulling Shape/ExtrudeGeometry into the bounded namespace.
    const area=outline.reduce((sum,p,i)=>{const q=outline[(i+1)%outline.length];return sum+p[0]*q[1]-q[0]*p[1];},0);
    const points=area>=0?outline:[...outline].reverse(),n=points.length,remaining=Array.from({length:n},(_,i)=>i),triangles=[];
    const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
    while(remaining.length>3){let found=false;for(let k=0;k<remaining.length;k++){
      const a=remaining[(k-1+remaining.length)%remaining.length],b=remaining[k],c=remaining[(k+1)%remaining.length];
      if(cross(points[a],points[b],points[c])<=1e-8)continue;
      if(remaining.some(i=>i!==a&&i!==b&&i!==c&&cross(points[a],points[b],points[i])>=0&&cross(points[b],points[c],points[i])>=0&&cross(points[c],points[a],points[i])>=0))continue;
      triangles.push([a,b,c]);remaining.splice(k,1);found=true;break;
    }if(!found)throw new Error(`Invalid source contour ${key}`);}
    triangles.push(remaining);const positions=[],push=(a,z)=>positions.push(points[a][0],points[a][1],z);
    for(const tri of triangles){for(const i of tri)push(i,depth*.5);for(const i of [...tri].reverse())push(i,-depth*.5);}
    for(let i=0;i<n;i++){const j=(i+1)%n;for(const [a,z] of [[i,-depth*.5],[j,-depth*.5],[j,depth*.5],[i,-depth*.5],[j,depth*.5],[i,depth*.5]])push(a,z);}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.computeVertexNormals();g.userData.sourceContour=Object.freeze(points.map(p=>Object.freeze(p)));return g;
  });
  const blade=prism('flat-jagged-crystal-blade',[[-.5,-.5],[-.25,.1],[.04,.5],[.2,.12],[.5,-.4],[.18,-.5]],.16);
  const octagon=geometry('ritual-octagonal-flat-platform',()=>new THREE.CylinderGeometry(1,1,1,8));
  const clouds=(name,mat,y=4,z=-35,n=18)=>{for(let i=0;i<n;i++)add(name,sphere,mat,[-16+(i%7)*5.1,y+.7*Math.sin(i*2)+Math.floor(i/7)*.65,z+(i%3-1)*3],[3.4,1.25,2.2]);};
  const chain=(name,mat,path,count=32,width=.35,length=.65,radius=.095)=>{
    const definitions=[];for(let i=0;i<count;i++){const t=(i+.5)/count,p=path(t),a=path(Math.max(0,t-.005)),b=path(Math.min(1,t+.005)),axis=new THREE.Vector3(...b).sub(new THREE.Vector3(...a)).normalize(),reference=Math.abs(axis.y)>.85?new THREE.Vector3(1,0,0):new THREE.Vector3(0,1,0),normal=new THREE.Vector3().crossVectors(axis,reference).normalize(),binormal=new THREE.Vector3().crossVectors(axis,normal).normalize(),side=i%2?normal:binormal;
      definitions.push({path:u=>{const angle=u*Math.PI*2;return p.map((v,j)=>v+axis.getComponent(j)*length*Math.cos(angle)+side.getComponent(j)*width*Math.sin(angle));},radius});
    }return paths(name,mat,definitions,24);
  };
  const rays=(name,mat,center,count=24,r=18)=>paths(name,mat,Array.from({length:count},(_,i)=>({path:t=>{const a=i*Math.PI*2/count;return [center[0]+Math.cos(a)*(2+t*r),center[1]+Math.sin(a)*(2+t*r),center[2]-t*.5];},radius:.03+(i%3)*.025})),32);
  const runeLoop=(name,mat,x,y,z,r,n=16)=>paths(name,mat,Array.from({length:n},(_,i)=>({path:t=>{const a=i*Math.PI*2/n,c=[x+r*Math.cos(a),y+r*Math.sin(a),z];return [c[0]+.3*Math.sin(t*Math.PI*2+i%3),c[1]+.45*Math.cos(t*Math.PI*2),z];},radius:.055})),24);
  switch(profile.cardId) {
    case '17782288': {
      const gold=material('#e9d77c'),roofmat=material('#bd7d6a'),greenRoof=material('#9aa887'),ochreRoof=material('#bba373'),silver=material('#9fb5bc');
      paths('angelechy-large-silver-overhead-annulus',silver,[11.5,13].map(r=>({path:t=>[r*Math.cos(t*Math.PI*2),24,-35+r*.72*Math.sin(t*Math.PI*2)],radius:.5})),96);
      const etch=[];for(let i=0;i<36;i++){const a=i*Math.PI/18;etch.push({path:poly([[Math.cos(a)*11.4,23.8,-35+Math.sin(a)*8.25],[Math.cos(a)*12.6,23.8,-35+Math.sin(a)*9],[Math.cos(a+.04)*12.6,23.8,-35+Math.sin(a+.04)*9]]),radius:.055});}paths('angelechy-radial-rectangular-underside-engraving',m.dark,etch,12);
      for(let i=0;i<4;i++){const a=i*Math.PI/2;add('angelechy-four-gold-ring-lamps',sphere,gold,[Math.cos(a)*12,23.7,-35+Math.sin(a)*8.65],[.8,.3,.8]);}
      paths('angelechy-yellow-underside-checker-lattice',gold,[-1,1].flatMap(s=>Array.from({length:9},(_,i)=>({path:t=>[-8+t*16,23.5,-35+(i-4)*1.1+s*(t-.5)*5],radius:.075}))),32);
      for(let i=0;i<12;i++){const x=-15+(i%6)*6,z=-29-Math.floor(i/6)*11,h=4+(i%3);block('angelechy-half-timber-house',m.stone,x,h*.5,z,4,h,3);roof('angelechy-pitched-tiled-roof',[roofmat,greenRoof,ochreRoof][i%3],x,h,z,4.6,2.4,3.6);for(const dx of [-1.6,0,1.6])block('angelechy-vertical-timber-post',m.wood,x+dx,h*.5,z+1.55,.16,h,.12);beam('angelechy-diagonal-timber-brace',[x-1.5,.4,z+1.6],[x+1.5,h-.4,z+1.6],m.wood,.085);for(const dx of [-.8,.8])block('angelechy-dark-window',m.dark,x+dx,h*.64,z+1.64,.6,1,.08);}
      paths('angelechy-thin-descending-light-beams',m.paper,Array.from({length:9},(_,i)=>({path:t=>[-11+i*2.75,t*23,-34+(i%3-1)*3],radius:.025})),24);break;
    }
    case '59048135': {
      const gold=material('#e9d46d',{emissive:'#c7a83a',emissiveIntensity:.12}),pink=material('#ef84ba');
      const strands=[];for(const s of [-1,1]){const line=t=>[s*(5+8*Math.sin(t*Math.PI)),4+t*26,-35+2*Math.cos(t*5)];for(let i=0;i<14;i++){const p=line(i/13);strands.push({path:poly([[p[0],p[1]+.7,p[2]],[p[0]+.65,p[1],p[2]],[p[0],p[1]-.7,p[2]],[p[0]-.65,p[1],p[2]],[p[0],p[1]+.7,p[2]]]),radius:.06});}}paths('heraldry-two-curving-linked-diamond-ribbons',gold,strands,24);
      paths('heraldry-magenta-oval-ground-seal',pink,[{path:t=>[10*Math.cos(t*Math.PI*2),.25,-32+5*Math.sin(t*Math.PI*2)],radius:.2},...[-1,1].map(s=>({path:t=>[s*(1+5*Math.sin(t*Math.PI*2)),.25,-32+3*Math.cos(t*Math.PI*2)],radius:.12}))],64);
      paths('heraldry-pink-blue-radiating-streaks',colored(),Array.from({length:24},(_,i)=>({path:t=>[(i-12)*t*1.4,10+t*14,-39],radius:.05,color:i%2?'#e879a8':'#779fc5'})),32);for(let i=0;i<9;i++)star('heraldry-fine-gold-star',m.paper,-16+i*4,15+(i%3)*6,-33,.4);break;
    }
    case '80749819': {
      const tunnel=geometry('ritual-rough-round-enclosing-tunnel',()=>{const p=[],idx=[];for(let row=0;row<=8;row++)for(let i=0;i<=48;i++){const a=i/48*Math.PI,r=8+.5*Math.sin(i*2+row);p.push(Math.cos(a)*r,1+Math.sin(a)*r,-26-row*2.2);}for(let r=0;r<8;r++)for(let i=0;i<48;i++){const a=r*49+i;idx.push(a,a+49,a+1,a+1,a+49,a+50);}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setIndex(idx);g.computeVertexNormals();g.userData.enclosingTunnel=true;return g;});
      const stone=material('#65717c',{side:THREE.DoubleSide});stone.forceSinglePass=true;add('forgotten-continuous-rough-rock-tunnel',tunnel,stone,[0,0,0]);
      for(let i=0;i<16;i++){const s=i%2?1:-1,x=s*(4+(i*3%4)*.65),z=-26-Math.floor(i/2)*2.2,sz=.45+(i%3)*.1;add('forgotten-pale-skull-cranium',sphere,m.paper,[x,sz,z],[sz,sz*.9,sz*.72]);for(const dx of [-.22,.22])add('forgotten-skull-dark-eye-socket',sphere,m.dark,[x+dx,sz+.04,z+sz*.65],[.15,.16,.075]);add('forgotten-skull-triangle-nose',gable,m.dark,[x,sz-.16,z+sz*.68],[.11,.16,.07],[0,0,Math.PI]);for(let k=0;k<3;k++)block('forgotten-skull-three-broken-teeth',m.paper,x+(k-1)*.15,.14,z+.35,.12,.18,.12);}
      for(let i=0;i<17;i++)add('forgotten-worn-flat-stone-walkway',slab,m.stone,[(i%3-1)*2.2,.08,-26-Math.floor(i/3)*3.1],[1.4,.2,1.6],[0,i*.3,0]);break;
    }
    case '69039982': {
      paths('crusadia-overhead-gold-white-fan',colored(),Array.from({length:31},(_,i)=>({path:t=>[(i-15)*1.15*t,31-t*31,-34],radius:.03+(i%4)*.045,color:['#fff9dc','#e7c179','#bce3e2','#dcc59c'][i%4]})),64);
      const white=material('#fff4cc',{side:THREE.DoubleSide});white.forceSinglePass=true;for(const i of [-3,-2,-1,0,1,2,3])ribbon('crusadia-wide-overhead-ray-'+i,white,t=>[i*5*t,31-t*31,-37],t=>.12+t*.7,[1,0,0],64);break;
    }
    case '81380218': {
      const pink=material('#d36575'),violet=material('#b490b7'),roseEdge=material('#954450');
      clouds('chorus-wide-white-cloud-floor',m.paper,2,-35,21);
      for(let x=-17;x<=17;x+=1.05)beam('chorus-distant-fine-purple-fence-bar',[x,7,-41],[x,9.4+1.1*Math.exp(-x*x/30),-41],violet,.045);
      paths('chorus-scalloped-fence-rails',violet,[7.4,9.4].map(y=>({path:t=>[-17+t*34,y+.6*Math.cos((t-.5)*Math.PI*2),-41],radius:.065})),80);
      for(const x of [-3,3])beam('chorus-central-double-gate-post',[x,7,-40.9],[x,12,-40.9],violet,.1);
      beam('chorus-central-gate-cross-upright',[0,12,-40.9],[0,14,-40.9],violet,.09);beam('chorus-central-gate-cross-arm',[-.6,13.3,-40.9],[.6,13.3,-40.9],violet,.09);
      paths('chorus-double-gate-crossed-diagonals',violet,[{path:poly([[-3,7,-40.9],[3,11.7,-40.9]]),radius:.055},{path:poly([[3,7,-40.9],[-3,11.7,-40.9]]),radius:.055}],24);
      const roses=[];for(let i=0;i<12;i++){const side=i<6?-1:1,j=i%6,x=side*(12+j%3*3.2),z=-25-Math.floor(j/3)*2.4;add('chorus-coral-rose-body',sphere,pink,[x,1.4,z],[1.7,1.7,.75]);for(const r of [.5,1.05,1.55])roses.push({path:t=>[x+r*Math.cos(t*Math.PI*2),1.4+r*.7*Math.sin(t*Math.PI*2),z+.75+.08*Math.sin(t*9)],radius:.09});}paths('chorus-rose-curled-layered-petals',roseEdge,roses,32);break;
    }
    case '23213239': {
      const water=material('#657d83'),white=material('#e8f4e9');
      const waves=[];for(let i=0;i<11;i++){const z=-25-i*1.8;waves.push({path:t=>[-17+t*34,1.3+Math.sin(t*19+i)*.9,z+.7*Math.sin(t*13)],radius:.32});}paths('danger-violent-rolling-water-crests',water,waves,96);
      paths('danger-broken-white-wave-foam',white,Array.from({length:31},(_,i)=>({path:t=>[-17+(i%6)*5.7+t*4,1.8+Math.sin(t*7+i)*.4,-26-Math.floor(i/6)*3.5],radius:t=>.04+.13*Math.sin(t*Math.PI)})),48);
      for(const [x,h] of [[-10,25],[0,18],[12,23]]){add('danger-rooted-distant-island-spire',crystal,m.wood,[x,h*.5,-42],[2,h,2]);for(const y of [7,12])add('danger-long-thin-horizontal-rock-shelf',shardRock,m.wood,[x,y,-41],[5.5,.5,1.5]);}
      lightning('danger-orange-sky-yellow-branching-bolts',m.light,Array.from({length:8},(_,i)=>[[-16+i*4.6,29,-40],[-17+i*4.6,25,-40],[-15+i*4.6,23,-40],[-16+i*4.6,19,-40]]));break;
    }
    case '12397569': {
      const ice=material('#d5e1f6'),blue=material('#9db6e1'),iceBlade=prism('baatistina-deep-faceted-crystal-blade',[[-.5,-.5],[-.25,.1],[.04,.5],[.2,.12],[.5,-.4],[.18,-.5]],.9);
      for(let i=0;i<38;i++){const a=i*Math.PI*2/38,r=9+(i%3)*1.7;add('baatistina-flat-spiralling-crystal-blade',iceBlade,i%3===0?blue:ice,[Math.cos(a)*r,16+Math.sin(a)*r,-35+(i%4-1.5)],[2,9+(i%4),1.5],[0,.12,a+.65]);}
      add('baatistina-large-black-circular-opening',sphere,m.dark,[0,16,-37],[4,4,.4]);
      for(const [r,color] of [[.9,'#66e389'],[.6,'#f74768'],[.25,'#f9fda6']])add('baatistina-concentric-colored-core',sphere,material(color,{emissive:color,emissiveIntensity:.2}),[0,16,-35.5-r*.5],[r,r,.12]);
      for(let i=0;i<12;i++)add('baatistina-broken-layered-icy-ground',shardRock,blue,[-15+(i%6)*6,1+(i%3),-29-Math.floor(i/6)*10],[4.5,1.2,3],[0,i*.31,.12]);break;
    }
    case '53639887': {
      for(let i=0;i<3;i++)block('snake-eye-cracked-raised-altar-tier',m.stone,0,.7+i*1.2,-34-i*.5,18-i*4,1.3,9-i*1.5);
      stairs('snake-eye-front-altar-steps',m.stone,0,-26,8,7,.4,.9);
      for(const x of [-7,7])for(const z of [-30,-39]){add('snake-eye-four-short-brazier-post',cylinder,m.stone,[x,2.3,z],[.5,4.6,.5]);add('snake-eye-four-cyan-brazier-flame',blade,m.light,[x,5.4,z],[.7,2,1]);}
      for(const x of [-16,16]){add('snake-eye-tall-ruined-side-column',cylinder,m.stone,[x,9,-36],[1,18,1]);add('snake-eye-broken-column-top',shardRock,m.stone,[x,18,-36],[1.2,.6,1.1]);}
      paths('snake-eye-cyan-ground-loop',m.light,[{path:t=>[5.4*Math.cos(t*Math.PI*2),.12,-28+1.6*Math.sin(t*Math.PI*2)],radius:.09}],64);
      paths('snake-eye-crawling-altar-vines',m.leaves,Array.from({length:9},(_,i)=>({path:t=>[-9+t*18,.9+(i%3)*1.2,-32+(i%4)*1.3+Math.sin(t*12+i)],radius:.055})),64);break;
    }
    case '71817640': {
      const colors=['#ffd367','#6a99f0','#d186ec'];
      for(let k=0;k<3;k++){const mat=material(colors[k],{emissive:colors[k],emissiveIntensity:.15}),x=-12+k*12;const outline=[[-2,-.5],[2,-.5],[1.6,.2],[2.1,.5],[.8,.15],[1,.8],[.2,.45],[-.4,1],[-.7,.25],[-1.7,.75],[-1.2,.1],[-2,.4]];add('dragonic-three-jagged-flame-curtain',prism('dragonic-ragged-flame',outline,.06),mat,[x,11,-35],[2.4,18,1]);orb('dragonic-three-colored-bright-points',mat,x,13,-31,.3);}
      clouds('dragonic-cloud-ground',m.paper,0,-35,15);
      paths('dragonic-large-white-angular-ground-triangles',m.paper,[-12,0,12].map(x=>({path:poly([[x-4,.8,-27],[x+4,.8,-27],[x,.8,-34],[x-4,.8,-27]]),radius:.18})),36);
      lightning('dragonic-white-linking-branch-lightning',m.paper,[[[-12,13,-31],[-7,19,-32],[-3,17,-32],[0,13,-31]],[[0,13,-31],[3,17,-32],[6,15,-32],[12,13,-31]],[[-12,13,-31],[-16,20,-32],[-14,24,-32],[-17,30,-32]],[[12,13,-31],[15,21,-32],[14,27,-32],[17,32,-32]]]);break;
    }
    case '7917970': {
      for(let i=0;i<12;i++)add('dragunity-angular-ochre-canyon-mesa',shardRock,m.stone,[-16+(i%6)*6.2,4+(i%3)*3,-39-(i%2)*3],[3.5,6,3],[0,i*.21,0]);
      paths('dragunity-broad-gold-pink-curving-sky-ribbons',colored(),['#f8d883','#ecb1c2','#f3efbe'].map((color,i)=>({path:t=>[-13+26*t,17+i*3+8*Math.sin(t*Math.PI),-34+i],radius:.18,color})),72);
      for(let i=0;i<9;i++){add('dragunity-floating-angular-stone-chip',shardRock,m.wood,[-16+(i*5%34),14+(i*3%12),-33],[.25,.4,.18],[i*.4,i,0]);orb('dragunity-small-green-light-orb',m.light,-14+(i*7%30),19+(i*3%11),-32,.15);}break;
    }
    case '92223430': {
      for(let i=0;i<19;i++)add('elborz-sharp-blue-alpine-mountain',geometry('ritual-three-dimensional-alpine-ridge',()=>new THREE.ConeGeometry(1,1,5)),m.stone,[-17+(i%7)*5.7,3+(i*5%6),-30-Math.floor(i/7)*5.5],[3.8,8+(i%3)*2,3.2],[0,i*.3,(i%3-1)*.15]);
      for(let i=0;i<7;i++)add('elborz-green-valley-floor',slab,m.leaves,[-12+i*4,.1,-33],[3.6,.25,4.7]);add('elborz-small-blue-valley-lake',slab,material('#6baac9'),[0,.42,-31],[2.8,.1,1.8]);
      const white=material('#e0f6ff',{side:THREE.DoubleSide});white.forceSinglePass=true;
      for(let i=0;i<3;i++)ribbon('elborz-broad-continuous-curved-wind-'+i,white,t=>[16*Math.cos(t*Math.PI*1.7+i),5+i*7+4*Math.sin(t*Math.PI*2),-35+7*Math.sin(t*Math.PI*1.7+i)],t=>.12+Math.sin(t*Math.PI)*.5,[0,1,0]);break;
    }
    case '39730727': {
      add('tenyi-long-steep-angular-projecting-rock-ledge',prism('tenyi-jagged-projecting-ledge',[[-1,-.7],[-.75,-.2],[-.2,.2],[.55,.8],[1,.75],[.9,.45],[.2,.05],[-.2,-.4]],1),m.wood,[0,9,-35],[17,13,4]);
      for(let i=0;i<12;i++)add('tenyi-narrow-pointed-rock-splinter',blade,m.stone,[-14+i*2.5,2+i*.65,-33+(i%2)],[.7,5,2],[0,0,-.4]);
      paths('tenyi-beige-fine-drifting-dust-trails',m.paper,Array.from({length:7},(_,i)=>({path:t=>[-17+t*34,5+i*3+Math.sin(t*6+i)*1.5,-39],radius:.03})),64);break;
    }
    case '40089744': {
      const light=material('#c9f5ff'),blue=material('#429bd8');const outline=[[-.5,-.5],[.5,-.5],[.5,.3],[.2,.3],[.2,.5],[-.5,.5]];
      for(let i=0;i<35;i++){const a=i*Math.PI*2/35,r=8+(i%4)*2.2;add('chaos-staggered-angular-blue-white-radial-panel',prism('chaos-stepped-ray-panel',outline,.08),i%2?light:blue,[Math.cos(a)*r,16+Math.sin(a)*r,-36+(i%2)],[.45+(i%3)*.2,7+(i%5),1],[0,0,a-Math.PI/2]);}
      rays('chaos-fine-cyan-converging-center-rays',m.light,[0,16,-35],40,16);orb('chaos-brilliant-white-center',m.paper,0,16,-35,2);break;
    }
    case '50186558': {
      const cyan=material('#94dccc',{transparent:true,opacity:.27,side:THREE.DoubleSide});cyan.forceSinglePass=true;add('guardragon-large-translucent-cyan-dome',sphere,cyan,[0,15,-35],[10,10,3]);
      for(let i=0;i<8;i++)block('guardragon-fragmented-background-wall',m.stone,-15+(i%4)*4,5+Math.floor(i/4)*7,-41,3,6,.7);
      for(let i=0;i<14;i++)add('guardragon-flying-stone-wall-fragment',shardRock,m.wood,[-17+(i*7%34),5+(i*3%23),-32],[.4,.6,.22],[i*.2,0,i]);
      paths('guardragon-gold-overhead-shafts',m.paper,Array.from({length:7},(_,i)=>({path:t=>[-6+i*2+t*(i-3),29-t*28,-36],radius:.07})),48);for(let i=0;i<9;i++)star('guardragon-small-green-star',m.light,-14+(i*9%30),7+(i*7%25),-31,.24);break;
    }
    case '17255673': {
      const red=material('#ab593b'),gold=material('#dfbb71');
      for(const x of [-7,7])block('mikanko-red-square-shrine-post',red,x,6,-36,1.7,12,1.7);block('mikanko-red-square-altar-roof',red,0,12.5,-36,18,1.2,7);
      for(let x=-8;x<=8;x+=1)beam('mikanko-fine-roof-railing-upright',[x,13,-32.7],[x,14,-32.7],m.wood,.055);beam('mikanko-roof-railing-top',[-8,14,-32.7],[8,14,-32.7],m.wood,.08);
      for(const x of [-12,0,12]){block('mikanko-front-carved-ceremonial-post',red,x,4,-27,.7,8,.7);add('mikanko-gold-carved-post-cap',octagon,gold,[x,8,-27],[1.1,.45,.8]);}
      paths('mikanko-three-strand-drooping-braided-rope',gold,Array.from({length:3},(_,i)=>({path:t=>[-12+t*24,6-2*Math.sin(t*Math.PI)+.09*Math.sin(t*90+i*2),-27+.12*Math.cos(t*90+i*2)],radius:.12})),120);
      paths('mikanko-colored-ceremonial-hanging-ribbons',colored(),[-12,0,12].flatMap(x=>['#e88983','#98c287','#89bee2','#b7a1d0'].map((color,i)=>({path:t=>[x+(i-1.5)*.25+Math.sin(t*6+i)*.4,7-t*6,-26.5+.2*Math.sin(t*9)],radius:.045,color}))),64);
      for(let i=0;i<25;i++){const a=i*.62;add('mikanko-gold-leaf-shaped-helical-step',blade,gold,[Math.cos(a)*2.6,14+i*.6,-35+Math.sin(a)*2.6],[.9,.8,.3],[0,0,-a]);}
      ellipse('mikanko-upper-bright-round-sky-seal',m.light,0,31,-35,4,3,.12);break;
    }
    case '81777047': {
      const red=material('#cf555b'),black=material('#111317');
      for(let i=0;i<18;i++){const x=-17+i*2.1;beam('luminous-oblique-black-white-speed-strip',[x-4,29,-36],[x+7,1,-32],i%2?black:m.paper,.12+(i%3)*.12);}
      paths('luminous-fine-red-parallel-speed-lines',red,Array.from({length:25},(_,i)=>({path:poly([[-18+i*1.35,29,-31.5],[-7+i*1.1,0,-31.5]]),radius:.045})),32);break;
    }
    case '71650854': {
      const hot=material('#f39c69'),dark=material('#422b48'),cyan=material('#87d7f0');
      const spots=[[-13,24],[-3,20],[7,28],[15,19],[-16,9],[10,8]];
      for(const [x,y] of spots){add('mid-breaker-six-orange-energy-globes',sphere,hot,[x,y,-35],[2.3,2.3,2.3]);for(let k=0;k<3;k++)add('mid-breaker-dark-globe-patch',shardRock,dark,[x+Math.sin(k*2)*1.1,y+Math.cos(k*2)*1.1,-32.9],[.8,.6,.12]);}
      paths('mid-breaker-globe-fiery-fissures',m.light,spots.flatMap(([x,y])=>[0,1].map(k=>({path:t=>[x-1.5+t*3,y+Math.sin(t*11+k)*.7,-32.65],radius:.07}))),48);
      paths('mid-breaker-long-cyan-foreground-streams',cyan,Array.from({length:28},(_,i)=>({path:t=>[-17+i*1.25,t*20,-29+.3*Math.sin(i)],radius:.025})),32);break;
    }
    case '27564031': {
      const green=material('#3b7168'),white=material('#daf8ee'),cyan=material('#76cde5');
      paths('malefic-blue-concentric-sector-maze',cyan,[{path:t=>[10*Math.cos(t*Math.PI*2),17+10*Math.sin(t*Math.PI*2),-35],radius:.08},...Array.from({length:12},(_,i)=>({path:t=>{const a=i*Math.PI/6+t*.38;const r=7+(i%2)*1.4;return [r*Math.cos(a),17+r*Math.sin(a),-35];},radius:.07}))],64);
      const circuits=[];for(let i=0;i<12;i++){const a=i*Math.PI/6;for(let k=0;k<3;k++)circuits.push({path:poly([[Math.cos(a)*10,17+Math.sin(a)*10,-35],[Math.cos(a)*13+k*.15,17+Math.sin(a)*13,-35],[Math.cos(a+.04)*17+k*.15,17+Math.sin(a+.04)*17,-35]]),radius:.045});const x=Math.cos(a)*16,y=17+Math.sin(a)*16;block('malefic-green-peripheral-circuit-panel',green,x,y,-36,3,6,.18).rotation.z=a-Math.PI/2;for(let k=0;k<3;k++)block('malefic-panel-short-white-code-block',white,x,y+(k-1)*1.2,-35.85,1.7,.5,.08).rotation.z=a-Math.PI/2;}
      paths('malefic-branching-blue-circuit-spokes',cyan,circuits,32);paths('malefic-small-cosmic-spiral-galaxy',m.paper,[0,Math.PI].map(a=>({path:t=>[10+t*2*Math.cos(t*8+a),28+t*2*Math.sin(t*8+a),-40],radius:.055})),64);break;
    }
    case '68337209': {
      const magenta=material('#a55083'),purple=material('#635276'),cyan=material('#7bc7dc');
      const diamond=prism('maliss-physical-diamond-checker',[[-.5,0],[0,-.5],[.5,0],[0,.5]],.08);
      for(let r=0;r<7;r++)for(let c=0;c<8;c++)add('maliss-distorted-magenta-lavender-checker',diamond,(r+c)%2?purple:magenta,[-16+c*4.6+(r%2)*2.3,2+r*4.5,-38+.6*Math.sin(r+c)],[4.8,4.8,1],[0,0,.07*Math.sin(c)]);
      for(let i=0;i<31;i++)block('maliss-irregular-cyan-pixel-glitch',cyan,-17+(i*7%35),2+(i*13%29),-36,1+(i%4)*.5,.2+(i%3)*.2,.08);
      paths('maliss-thin-horizontal-raster-scanlines',m.paper,Array.from({length:29},(_,i)=>({path:t=>[-17+t*34,1+i,-34],radius:.015})),24);break;
    }
    case '84504242': {
      const gold=material('#baa773'),colors=['#8ce5eb','#f3f3e6','#ece5a1'];
      for(let i=0;i<3;i++){const x=-10+i*10,y=8+(i===1?-2:3),mat=material(colors[i]);add('megalith-three-thick-octagonal-podiums',octagon,m.stone,[x,y,-35],[4.3,.9,3.5]);add('megalith-octagonal-gold-border',octagon,gold,[x,y+.5,-35],[4.5,.18,3.7]);add('megalith-three-differently-lit-undersides',octagon,mat,[x,y-.5,-35],[3.1,.08,2.7]);for(let k=0;k<8;k++){const a=k*Math.PI/4;orb('megalith-small-round-corner-rivet',m.paper,x+4*Math.sin(a),y+.65,-35+3.3*Math.cos(a),.1);}}
      rays('megalith-gold-white-backlight-rays',m.paper,[0,20,-41],27,16);for(let i=0;i<9;i++)star('megalith-small-star-point',m.paper,-16+(i*9%34),7+(i*7%25),-31,.19);break;
    }
    case '269012': {
      const iron=material('#8b8d86',{metalness:.18,roughness:.6});
      for(const [x,h] of [[-12,19],[12,21],[0,9]]){add('bound-three-irregular-stone-monoliths',shardRock,m.stone,[x,h*.5,-35],[3.5,h*.6,2.3]);add('bound-round-drilled-anchor-hole',sphere,m.dark,[x,h*.75,-32.8],[.65,.65,.12]);chain('bound-heavy-wrapping-chain-'+x,iron,t=>[x+3.4*Math.cos(t*Math.PI*2),h*.75+.3*Math.sin(t*Math.PI*2),-35+2.5*Math.sin(t*Math.PI*2)],24,.35,.55,.14);chain('bound-heavy-chain-to-overhead-sun-'+x,iron,t=>[x*(1-t),h*.75+(30-h*.75)*t-2*Math.sin(t*Math.PI),-33-t*2],22,.35,.7,.14);}
      lightning('bound-broad-yellow-lightning-bolts',m.light,[[[0,30,-32],[-5,25,-32],[-4,23,-32],[-14,17,-32],[-12,14,-32],[-17,8,-32]],[[0,30,-32],[5,25,-32],[4,21,-32],[15,13,-32],[13,10,-32],[17,6,-32]]]);star('bound-brilliant-overhead-sun-burst',m.paper,0,30,-34,2.2);break;
    }
    case '885016': {
      const blue=material('#709fc7'),cyan=material('#c1f5fa');
      for(let i=0;i<9;i++){const x=-17+i*4.3,h=12+(i*7%15);add('multi-universe-thin-floating-city-spire',cylinder,blue,[x,h*.5,-41],[.5,h,.5]);add('multi-universe-cup-shaped-spire-capital',cone,blue,[x,h,-41],[1.1,1.4,1.1],[0,0,Math.PI]);add('multi-universe-spire-pointed-cap',cone,blue,[x,h+1.5,-41],[.7,2,.7]);}
      for(const [y,r] of [[7,2.2],[12,2.7],[18,3.2]]){add('multi-universe-central-tiered-tower',cylinder,blue,[0,y,-36],[r,4,r]);add('multi-universe-central-cup-gallery',cone,blue,[0,y+2,-36],[r*1.4,1.5,r*1.4],[0,0,Math.PI]);for(let k=0;k<8;k++){const a=k*Math.PI/4;add('multi-universe-central-gallery-slim-column',cylinder,cyan,[Math.cos(a)*r,y+1,-36+Math.sin(a)*r],[.08,2,.08]);}}
      paths('multi-universe-large-purple-gold-orbit-rings',colored(),[26,31].map((y,i)=>({path:t=>[16*Math.cos(t*Math.PI*2),y,-35+7*Math.sin(t*Math.PI*2)],radius:.14,color:i?'#b49469':'#b2a5f3'})),96);
      paths('multi-universe-upright-glyphs-on-three-horizontal-rune-rings',colored(),[[26,16,7,'#b2a5f3'],[31,16,7,'#b49469'],[21,4,2.2,'#c1f5fa']].flatMap(([y,rx,rz,color])=>Array.from({length:28},(_,i)=>{const a=i*Math.PI/14,x=rx*Math.cos(a),z=-35+rz*Math.sin(a);return {path:t=>[x+.35*Math.sin(t*Math.PI*3)*Math.sin(a),y+.4*Math.cos(t*Math.PI*2),z+.35*Math.sin(t*Math.PI*3)*Math.cos(a)],radius:.045,color};})),24);
      for(let x=-8;x<=8;x+=.8)beam('multi-universe-white-curved-gate-bar',[x,0,-29],[x,6+2*Math.sin((x+8)/16*Math.PI),-29],cyan,.05);
      paths('multi-universe-white-gate-top',cyan,[{path:t=>[-8+t*16,6+2*Math.sin(t*Math.PI),-29],radius:.1}],64);
      for(const x of [-13,13]){beam('multi-universe-thin-lamp-pole',[x,0,-30],[x,23,-30],cyan,.08);paths('multi-universe-spiral-lamp-'+x,cyan,[{path:t=>[x+.4*Math.cos(t*Math.PI*8),t*23,-30+.4*Math.sin(t*Math.PI*8)],radius:.045}],80);orb('multi-universe-high-glowing-lamp',cyan,x,23,-30,.38);}
      for(let i=0;i<15;i++)block('multi-universe-small-cyan-sky-pixel',cyan,-17+(i*11%34),12+(i*7%22),-43,.16,.16,.08);break;
    }
    case '62314831': {
      const globe=geometry('ritual-cloud-colored-amritara-globe',()=>{const g=new THREE.SphereGeometry(1,32,24),p=g.attributes.position,c=[];for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),n=Math.sin(x*8+y*5)*Math.cos(z*9-y*4)+Math.sin(z*16+x*6)*.35;const col=new THREE.Color(n>.68?'#dcebe9':n>.1?'#80aa9e':'#659fc0');c.push(col.r,col.g,col.b);}g.setAttribute('color',new THREE.Float32BufferAttribute(c,3));return g;});add('amritara-large-blue-green-clouded-world',globe,material('#ffffff',{vertexColors:true}),[1,17,-35],[7,7,7]);
      const small=[[-13,26,1.9,'#4b4665'],[-6,31,.7,'#c2c8c7'],[14,29,1.3,'#a38ed1'],[-12,4,1.4,'#a1d4ab'],[0,7,.65,'#e1e6e2'],[13,4,2,'#e6b079']];for(const [x,y,r,c] of small)orb('amritara-six-separate-colored-small-worlds',material(c),x,y,-34,r);
      for(let i=0;i<34;i++)orb('amritara-fine-remote-star-point',m.paper,-17+(i*13%35),1+(i*7%32),-43,.025);break;
    }
    case '60946968': {
      const green=material('#99ba8b',{side:THREE.DoubleSide});green.forceSinglePass=true;const amber=material('#b9a188',{side:THREE.DoubleSide});amber.forceSinglePass=true;
      for(let i=0;i<4;i++)ribbon('a-zone-broad-green-orange-nebula-curl-'+i,i%2?green:amber,t=>[16*Math.cos(t*Math.PI*1.8+i),16+11*Math.sin(t*Math.PI*1.8+i),-36+2*Math.cos(t*8)],2.5,[0,1,0]);
      paths('a-zone-two-small-green-spiral-light-centers',m.light,[-10,9].flatMap(x=>[0,Math.PI].map(a=>({path:t=>[x+t*1.8*Math.cos(t*10+a),18+(x>0?-5:4)+t*1.8*Math.sin(t*10+a),-32],radius:.07}))),64);
      for(let i=0;i<9;i++)add('a-zone-layered-broken-foreground-rock-shelf',shardRock,m.stone,[-16+(i%5)*8,2+(i%3),-27-Math.floor(i/5)*5],[4.2,1.4,2.9],[0,i*.2,.15]);for(let i=0;i<9;i++)add('a-zone-floating-angular-stone-shard',shardRock,m.dark,[-16+(i*7%33),12+(i*3%16),-30],[.4,.3,.2],[i*.4,0,i]);break;
    }
    case '51669847': {
      const red=material('#a73343'),black=material('#23262a');
      verticalRing('vidolia-large-black-pointed-oval-frame',black,0,19,-36,8,12,.65);verticalRing('vidolia-thin-red-inner-oval',red,0,19,-35.6,7.2,11,.12);
      paths('vidolia-long-thin-dripping-frame-strands',black,Array.from({length:13},(_,i)=>({path:t=>[-7+i*1.15,11-t*(6+(i%3)),-35+.1*Math.sin(t*7)],radius:t=>.08*(1-t)+.025})),48);
      const panel=prism('vidolia-stained-glass-rectangular-panel',[[-1,-1],[1,-1],[1,1],[-1,1]],.1);add('vidolia-lower-left-stained-glass-panel-frame',panel,black,[-11,6,-29],[3.5,5,1],[0,0,-.12]);
      const glass=colored();paths('vidolia-colored-stained-glass-round-sectors',glass,Array.from({length:12},(_,i)=>({path:t=>[-11+2.7*Math.cos(i*Math.PI/6+t*.35),6+2.7*Math.sin(i*Math.PI/6+t*.35),-28.8],radius:.45,color:['#eaba69','#c754a0','#9ab3d8','#c5c675'][i%4]})),24);
      chain('vidolia-diagonal-dark-heavy-chains',black,t=>[-17+t*34,25-t*15,-40],43,.33,.55,.12);
      lightning('vidolia-yellow-green-chain-veins',m.light,[[[-17,25,-39.6],[-8,20,-39.6],[0,20,-39.6],[5,17,-39.6],[17,10,-39.6]]]);
      paths('vidolia-crossing-red-white-swirls',colored(),['#dc6470','#e3ded2'].map((color,i)=>({path:t=>[16*Math.cos(t*Math.PI*1.8+i),15+8*Math.sin(t*Math.PI*1.8+i),-34+3*Math.sin(t*7)],radius:.27,color})),96);add('vidolia-small-green-lower-right-crystal',crystal,m.leaves,[13,3,-28],[1.5,4,1.1]);break;
    }
    case '77584012': {
      const cyan=material('#92dbe7'),blue=material('#4c899c'),outline=[];
      for(const [x,z,h,w,d] of [[-14,-31,27,5,5],[-7,-40,21,4,4],[0,-41,29,4,4],[7,-40,22,5,4],[14,-31,25,5,5]]){
        block('pseudo-five-cyan-wireframe-skyscrapers',blue,x,h*.5,z,w,h,d);
        for(const dx of [-w*.5,w*.5])outline.push({path:poly([[x+dx,0,z+d*.51],[x+dx,h,z+d*.51]]),radius:.06});for(let y=1;y<h;y+=2)outline.push({path:poly([[x-w*.5,y,z+d*.51],[x+w*.5,y,z+d*.51]]),radius:.035});
        for(let i=0;i<8;i++)for(const dx of [-1.3,0,1.3])block('pseudo-deep-black-rectangular-window',m.dark,x+dx,2+i*2.5,z+d*.51,.65,1.3,.08);
      }
      paths('pseudo-cyan-facade-edge-and-floor-grid',cyan,outline,24);add('pseudo-stepped-center-pointed-cap',cone,cyan,[0,31,-41],[1.4,4,1.4]);add('pseudo-large-grey-partial-sky-world',sphere,material('#9e9b9d'),[9,34,-40],[8,8,1.4]);
      paths('pseudo-two-crossing-white-diagonal-sky-strips',m.paper,[{path:poly([[-17,31,-35],[17,18,-35]]),radius:.1},{path:poly([[-17,17,-35],[17,32,-35]]),radius:.1}],48);break;
    }
    case '79698395': {
      const blue=material('#629db5');add('danger-realm-wide-blue-lagoon',slab,blue,[0,.05,-34],[17,.1,10]);
      for(let i=0;i<15;i++)add('danger-realm-jagged-pale-violet-shore',blade,m.stone,[-17+(i%6)*6.5,2+(i%3),-30-Math.floor(i/6)*5.6],[3,7,3],[0,i*.25,.15]);
      for(const side of [-1,1])curvedDeck('danger-realm-two-huge-natural-stone-arches',m.stone,t=>[side*(2+t*14),10+11*Math.sin(t*Math.PI),-40+3*Math.sin(t*Math.PI)],2.4,.65,80);
      add('danger-realm-tall-distant-pale-mountain',crystal,m.paper,[0,14,-43],[4,28,3]);
      for(let i=0;i<6;i++)add('danger-realm-small-table-rock-shelf',shardRock,m.wood,[-10+i*4,4+(i%2),-34],[2.3,.45,1.7]);clouds('danger-realm-low-white-shore-mist',m.paper,1,-34,12);break;
    }
    case '45778932': {
      const white=material('#d3e4f0',{side:THREE.DoubleSide,transparent:true,opacity:.65});white.forceSinglePass=true;
      for(let i=0;i<7;i++)ribbon('rising-soft-diagonal-white-cloud-wisp-'+i,white,t=>[-17+t*34,7+i*3-t*7+Math.sin(t*5+i)*.7,-37+(i%3)],t=>(.4+i%3*.5)*Math.pow(Math.sin(t*Math.PI),.8),[0,1,0]);break;
    }
    case '24793135': {
      const gold=material('#bdab69'),green=material('#658b74'),white=material('#e7e9da');
      add('gizmek-right-gold-rolled-scroll-edge',cylinder,gold,[17,15,-35],[1,30,1]);paths('gizmek-scroll-edge-curled-embossing',white,Array.from({length:12},(_,i)=>({path:t=>[17+.6*Math.sin(t*Math.PI*2),2+i*2.2+.8*Math.cos(t*Math.PI*2),-33.9],radius:.035})),24);
      for(let i=0;i<9;i++)add('gizmek-black-ink-needle-mountain',blade,m.wood,[-14+i*3.5,4+(i%4),-41],[1.7,12+(i%3),2],[0,i*.21,.1]);for(let i=0;i<10;i++)add('gizmek-green-angular-river-rock',shardRock,green,[-12+(i%5)*6,1,-29-Math.floor(i/5)*5],[2.5,2,2]);
      paths('gizmek-winding-white-crested-river',white,Array.from({length:6},(_,i)=>({path:t=>[-13+t*27,.6+Math.sin(t*14+i)*.35,-27-i*1.5+Math.sin(t*5)],radius:.16})),80);
      for(let i=0;i<9;i++)add('gizmek-broad-gold-cloud-patch',sphere,gold,[-15+(i%5)*7,10+(i*3%12),-36],[3,1,1]);break;
    }
    case '30336082': {
      const gold=material('#b8a071');const etch=[];
      for(let i=0;i<3;i++){const x=-12+i*12,h=18+i*2;add('sangen-three-tall-gold-offering-cylinder',cylinder,gold,[x,h*.5,-36],[1.6,h,1.6]);add('sangen-three-broad-offering-cups',cone,gold,[x,h,-36],[3,2,3],[0,0,Math.PI]);for(let y=2;y<h-2;y+=1.5)etch.push({path:t=>[x+.75*Math.sin(t*Math.PI*3),y+.4*Math.cos(t*Math.PI*3),-34.35],radius:.04});}
      paths('sangen-many-curled-cylinder-carvings',m.wood,etch,24);
      paths('sangen-three-differently-colored-flame-trails',colored(),[-12,0,12].flatMap((x,i)=>Array.from({length:3},(_,k)=>({path:t=>[x+(k-1)*1.2+Math.sin(t*13+k)*.5,19+i*2+t*4,-34],radius:t=>.17*(1-t)+.02,color:['#fff2be','#75f1ee','#ef684c'][i]}))),64);
      add('sangen-black-overhead-void',sphere,m.dark,[0,31,-39],[6,6,.2]);lightning('sangen-white-jagged-overhead-void-rim',m.paper,[Array.from({length:33},(_,i)=>{const a=i*Math.PI/16,r=6+(i%2)*.7;return [Math.cos(a)*r,31+Math.sin(a)*r,-38.7];})]);break;
    }
    case '1127737': {
      const rust=material('#684e59'),deck=material('#a3a4b0');
      const shape=prism('sargasso-irregular-chipped-carrier-deck',[[-1,-.4],[-.85,-.55],[-.5,-.5],[-.4,-.3],[-.2,-.45],[.6,-.45],[.7,-.2],[1,-.2],[.9,.4],[.6,.4],[.5,.55],[.2,.45],[-.1,.55],[-.4,.35],[-.7,.45],[-.8,.15],[-1,.1]],.22);
      for(const [x,y,z,sz,a] of [[-9,23,-37,7,-.15],[9,15,-40,7,.18],[0,5,-28,10,-.1]]){
        add('sargasso-three-broken-floating-carrier-decks',shape,deck,[x,y,z],[sz,sz*.65,2],[Math.PI/2,0,a]);
        for(let k=0;k<5;k++){block('sargasso-exposed-rusted-underdeck-rib',rust,x-sz*.7+k*sz*.35,y-1.2,z, .35,1.6,sz*.55);}
        block('sargasso-offset-ruined-bridge-housing',m.stone,x+sz*.42,y+1.4,z-1.5,1.6,2.2,1.5);beam('sargasso-thin-radar-mast',[x+sz*.42,y+2,z-1.5],[x+sz*.42,y+5,z-1.5],m.dark,.045);beam('sargasso-radar-mast-cross-arm',[x+sz*.42-.6,y+4,z-1.5],[x+sz*.42+.6,y+4,z-1.5],m.dark,.035);
        for(let k=0;k<7;k++)block('sargasso-white-dashed-runway-line',m.paper,x-sz*.65+k*sz*.2,y+.25,z,.55,.06,.07);
      }
      for(let i=0;i<21;i++)add('sargasso-floating-steel-and-rock-debris',shardRock,i%2?rust:m.stone,[-17+(i*11%35),2+(i*7%28),-32-(i%3)*4],[.3+(i%3)*.15,.15,.2],[i*.4,0,i*.7]);break;
    }
    case '48015771': {
      const pink=material('#f390d9',{emissive:'#ce61c0',emissiveIntensity:.2}),control=material('#9caaad');
      const dome=[];for(let i=0;i<10;i++){const a=i*Math.PI/5;dome.push({path:t=>[9*Math.cos(t*Math.PI)*Math.cos(a),Math.sin(t*Math.PI)*17,-34+9*Math.cos(t*Math.PI)*Math.sin(a)],radius:.07});}for(const y of [4,8,12]){const r=9*Math.sqrt(1-y*y/289);dome.push({path:t=>[r*Math.cos(t*Math.PI*2),y,-34+r*Math.sin(t*Math.PI*2)],radius:.065});}paths('summon-over-magenta-hemispherical-wire-cage',pink,dome,80);
      paths('summon-over-circular-etched-ground-rim',pink,[7.5,9].map(r=>({path:t=>[r*Math.cos(t*Math.PI*2),.15,-34+r*Math.sin(t*Math.PI*2)],radius:.09})),80);
      for(let i=0;i<6;i++){const a=i*Math.PI/3;add('summon-over-six-large-pink-faceted-diamonds',crown,pink,[Math.cos(a)*10,1.7,-34+Math.sin(a)*10],[1.2,1.9,1.2]);}
      block('summon-over-right-grey-control-box',control,15,8,-37,3.5,14,3);block('summon-over-dark-switch-slot',m.dark,15,11,-35.4,1.5,1.4,.1);block('summon-over-red-control-toggle',material('#c14c54'),15,11,-35.1,.65,.8,.5);for(let i=0;i<5;i++)block('summon-over-bottom-pink-control-strip',pink,13.8+i*.55,2,-35.4,.25,2,.1);break;
    }
    case '9597987': {
      for(const x of [-14,14])block('tenchi-two-heavy-dark-timber-column',m.wood,x,12,-36,2,24,2);block('tenchi-high-heavy-timber-beam',m.wood,0,24,-36,30,2,2);
      for(let i=0;i<12;i++)block('tenchi-dark-interior-wall-panel',m.dark,-14+i*2.55,12,-41,2.4,22,.3);for(let i=0;i<13;i++)block('tenchi-wooden-floor-plank',m.wood,-15+i*2.5,.05,-34,2.4,.1,16);
      const seal=[];for(const r of [7,8,9])seal.push({path:poly(Array.from({length:9},(_,i)=>[r*Math.cos(i*Math.PI/4),.2,-34+r*.67*Math.sin(i*Math.PI/4)])),radius:.065});for(let i=0;i<8;i++){const a=i*Math.PI/4,x=11*Math.cos(a),z=-34+7.3*Math.sin(a);seal.push({path:t=>[x+.55*Math.cos(t*Math.PI*2),.2,z+.55*Math.sin(t*Math.PI*2)],radius:.07});const h=.8+(i%3)*.4;add('tenchi-eight-white-wax-candles',cylinder,m.paper,[x,h*.5,z],[.18,h,.18]);add('tenchi-eight-candle-flames',cone,m.light,[x,h+.2,z],[.11,.45,.11]);}paths('tenchi-triple-octagon-and-eight-node-seal',m.light,seal,64);break;
    }
    case '77946022': {
      for(let i=0;i<16;i++)add('tenyinfinity-jagged-dark-rock-needle',blade,m.wood,[-17+(i%8)*4.8,5+(i%4)*3,-32-Math.floor(i/8)*9],[2.2,13,2.5],[0,i*.2,.15]);
      const gold=material('#f5d080',{side:THREE.DoubleSide});gold.forceSinglePass=true;
      for(const y of [7,27]){ribbon('tenyinfinity-two-extremely-broad-gold-energy-bands-'+y,gold,t=>[-17+t*34,y+4*Math.sin(t*Math.PI*1.2),-28-Math.sin(t*Math.PI)*7],3.7,[0,1,0]);paths('tenyinfinity-dark-inner-band-markings-'+y,m.wood,Array.from({length:11},(_,i)=>({path:poly([[-15+i*3,y+4*Math.sin((i+.5)/11*Math.PI*1.2),-28-Math.sin((i+.5)/11*Math.PI)*7],[-14+i*3,y+1+4*Math.sin((i+.5)/11*Math.PI*1.2),-28-Math.sin((i+.5)/11*Math.PI)*7]]),radius:.09})),16);}
      for(let i=0;i<19;i++)orb('tenyinfinity-small-gold-spark',m.light,-17+(i*11%35),3+(i*7%29),-30,.06);break;
    }
    case '56433456': {
      const stone=material('#e0d5bd'),shadow=material('#8e816f');
      for(let i=0;i<8;i++)add('sanctuary-floating-jagged-island-rock',shardRock,shadow,[-12+(i%4)*8,-3+(i%3),-34-Math.floor(i/4)*5],[4.6,4.5,4]);
      block('sanctuary-front-temple-raised-platform',stone,0,2,-32,17,3,9);roof('sanctuary-front-temple-triangular-gable',stone,0,11,-34,18,3.5,6);
      for(let x=-7;x<=7;x+=2.8){add('sanctuary-six-front-fluted-column',cylinder,stone,[x,7,-30.8],[.35,8,.35]);add('sanctuary-front-column-square-capital',box,stone,[x,11,-30.8],[.9,.4,.9]);}
      stairs('sanctuary-long-front-staircase',stone,0,-23,8,14,.23,.6);
      for(const s of [-1,1])for(let i=0;i<5;i++){add('sanctuary-broken-side-ruin-column',cylinder,stone,[s*(10+i*1.4),5+(i%2),-37],[.25,6+(i%3),.25]);block('sanctuary-rear-broken-colonnade-lintel',stone,s*11,9,-41,8,.45,1);}
      for(let i=0;i<7;i++)add('sanctuary-upper-rear-thin-column',cylinder,stone,[-8+i*2.6,15,-40],[.2,7,.2]);
      curvedDeck('sanctuary-curved-right-side-gallery',stone,t=>[8+8*t,5+3*t,-30-7*Math.sin(t*Math.PI*.7)],1.8,.35,72);
      add('sanctuary-high-slender-orb-column',cylinder,stone,[0,21,-40],[.55,15,.55]);paths('sanctuary-column-spiral-marking',shadow,[{path:t=>[.6*Math.cos(t*Math.PI*7),14+t*14,-40+.6*Math.sin(t*Math.PI*7)],radius:.055}],96);
      for(const s of [-1,1])beam('sanctuary-two-outward-forked-orb-caps',[s*.5,28,-40],[s*1.8,30,-40],stone,.25);orb('sanctuary-white-orb-held-by-forks',m.paper,0,30,-40,.8);clouds('sanctuary-floating-island-low-mist',m.paper,-1,-35,12);break;
    }
    case '48179391': {
      const green=material('#86edb1',{emissive:'#36cc82',emissiveIntensity:.18});
      paths('orichalcos-two-bright-green-rims',green,[11,12.5].map(r=>({path:t=>[r*Math.cos(t*Math.PI*2),16+r*Math.sin(t*Math.PI*2),-35],radius:.12})),96);
      paths('orichalcos-two-interlocking-equilateral-triangles',green,[0,Math.PI].map(phase=>({path:poly(Array.from({length:4},(_,i)=>{const a=phase+Math.PI/2+i*Math.PI*2/3;return [11*Math.cos(a),16+11*Math.sin(a),-34.8];})),radius:.12})),72);
      const glyphs=[];for(let i=0;i<24;i++){const a=i*Math.PI/12,x=11.75*Math.cos(a),y=16+11.75*Math.sin(a);glyphs.push({path:t=>[x+.31*Math.sin(t*Math.PI*(i%3+1)),y+.4*Math.cos(t*Math.PI*2),-34.8],radius:.05});if(i%4===0)glyphs.push({path:poly([[x-.3,y-.3,-34.8],[x+.25,y-.3,-34.8],[x+.25,y+.35,-34.8]]),radius:.045});}paths('orichalcos-individual-curved-angular-rim-glyphs',green,glyphs,24);
      paths('orichalcos-heart-like-top-mark',green,[{path:t=>[.35*Math.pow(Math.sin(t*Math.PI*2),3),28.1+.025*(13*Math.cos(t*Math.PI*2)-5*Math.cos(t*Math.PI*4)-2*Math.cos(t*Math.PI*6)-Math.cos(t*Math.PI*8)),-34.7],radius:.04}],48);
      const mist=material('#75808e',{side:THREE.DoubleSide,transparent:true,opacity:.25});mist.forceSinglePass=true;for(let i=0;i<3;i++)ribbon('orichalcos-soft-grey-violet-smoke-'+i,mist,t=>[16*Math.cos(t*Math.PI*1.8+i),16+13*Math.sin(t*Math.PI*1.8+i),-38],2,[0,1,0]);break;
    }
    case '45943516': {
      const upper=prism('war-rock-irregular-upper-stone-jaw',[[-1,.1],[-.9,.5],[-.65,.4],[-.5,.7],[-.2,.55],[0,.7],[.3,.35],[.65,.2],[1,-.15],[.2,-.05],[-.2,0],[-.7,-.3],[-.9,-.1]],1);
      const lower=prism('war-rock-irregular-lower-stone-jaw',[[-.9,-.1],[-.55,-.3],[-.1,-.25],[.25,-.6],[.75,-.8],[1,-1],[1,.1],[.25,0],[-.3,.1],[-.7,.25]],1);
      for(const shape of [upper,lower]){const p=shape.attributes.position;for(let i=0;i<p.count;i++)p.setZ(i,p.getZ(i)+.14*Math.sin(p.getX(i)*7+p.getY(i)*9));shape.computeVertexNormals();shape.userData.facetedStoneJaw=true;}
      add('war-rock-connected-steep-stone-mountain-body',prism('war-rock-connected-body',[[-.35,-.5],[.65,-.5],[.9,.2],[.4,.5],[-.05,.45],[-.25,.1]],1),m.stone,[5,9,-37],[16,20,7]);
      for(let i=0;i<8;i++)add('war-rock-irregular-connected-base-facet',shardRock,m.stone,[1+(i%4)*4.1,1+Math.floor(i/4)*5,-34],[3.4,4,3.3],[0,i*.3,.1]);
      add('war-rock-upper-jagged-stone-jaw',upper,m.stone,[-1,19,-35],[12,13,5]);add('war-rock-lower-jagged-stone-jaw',lower,m.stone,[-1,10,-35],[12,11,5]);
      block('war-rock-deep-dark-open-mouth',m.dark,-4,16,-36.5,8,8,.3);
      for(let i=0;i<6;i++){add('war-rock-upper-downward-sharp-stone-tooth',blade,m.wood,[-10+i*1.35,20-i*.4,-31.8],[.9,3,1],[0,0,Math.PI-.13]);add('war-rock-lower-upward-sharp-stone-tooth',blade,m.wood,[-9+i*1.35,12+i*.3,-31.8],[.8,2.5,1]);}
      for(let i=0;i<11;i++)add('war-rock-long-leaning-side-rock-fin',blade,m.stone,[-14+(i%5)*7,1+(i%3)*4,-34-Math.floor(i/5)*4],[1.8,14,2],[0,i*.3,-.3]);orb('war-rock-white-pink-dusk-sun',m.paper,14,31,-39,3.4);break;
    }
    case '4398189': {
      const trunks=[],branches=[];
      for(const x of [-12,-4,5,13])for(let strand=0;strand<3;strand++)trunks.push({path:t=>[x+Math.cos(t*12+strand*Math.PI*2/3)*.8,t*27,-35+Math.sin(t*12+strand*Math.PI*2/3)*.7],radius:t=>.55*(1-t)+.22});
      for(let i=0;i<28;i++){const x=[-12,-4,5,13][i%4],s=i%2?1:-1,y=8+(i*5%18);branches.push({path:t=>{if(t<=.68)return [x+s*(t*4+Math.sin(t*7)*.55),y+3*t+.6*Math.cos(t*7),-35+(i%3-1)*t*2];const u=(t-.68)/.32,a=-Math.PI/2+u*Math.PI*1.4,bx=x+s*(.68*4+Math.sin(.68*7)*.55),by=y+3*.68+.6*Math.cos(.68*7);return [bx+s*.6*Math.cos(a),by+.6+.6*Math.sin(a),-35+(i%3-1)*.68*2];},radius:t=>.17*(1-t)+.04});}
      paths('white-forest-twelve-braided-trunk-strands',m.stone,trunks,112);paths('white-forest-many-curled-hook-branches',m.wood,branches,80);
      for(let i=0;i<24;i++)add('white-forest-flat-pale-canopy-leaf-cluster',sphere,m.leaves,[-17+(i%8)*4.8,26+(i%3)*1.3,-36+(i%3-1)*3],[3,1,2]);
      for(let i=0;i<15;i++)add('white-forest-floating-translucent-diamond-chip',blade,m.light,[-17+(i*11%35),4+(i*7%23),-29],[.15,.35,.15],[0,0,i]);
      paths('white-forest-bright-diagonal-sun-shafts',m.paper,[-1,1,3].map(i=>({path:poly([[i*2,32,-38],[i*2+8,0,-28]]),radius:.075})),64);break;
    }
    case '61654098': {
      const silver=material('#8792b4'),vine=material('#4a546e');
      add('discovery-monumental-abandoned-round-dish',cone,silver,[0,19,-37],[10,5,7],[Math.PI+.65,0,0]);paths('discovery-large-raised-dish-rim',silver,[{path:t=>[10*Math.cos(t*Math.PI*2),20.99+4.23*Math.sin(t*Math.PI*2),-35.49-5.57*Math.sin(t*Math.PI*2)],radius:.42}],96);add('discovery-thick-narrow-dish-stem',cylinder,silver,[0,8,-37],[1.9,16,1.9]);
      paths('discovery-hanging-crossing-grown-vines',vine,Array.from({length:23},(_,i)=>({path:t=>[-9+(i%8)*2.6+Math.sin(t*7+i)*.8,22-t*(11+i%5),-33+(i%3)*.8],radius:.045})),80);
      add('discovery-steep-right-rock-face',shardRock,m.stone,[15,10,-32],[3,14,5]);for(let i=0;i<14;i++)add('discovery-purple-forest-crown',sphere,m.leaves,[-17+(i%7)*5.5,3+(i%3),-40+Math.floor(i/7)*12],[2.8,2.4,2]);for(let i=0;i<16;i++)orb('discovery-pale-overhead-star-point',m.paper,-17+(i*13%35),25+(i*7%9),-43,.045);break;
    }
    case '67831115': {
      for(let i=0;i<10;i++)add('shadow-distant-black-needle-horizon',blade,m.dark,[-17+i*3.7,3+(i*3%9),-43],[1.7,10+(i%3)*4,1.2]);for(let i=0;i<8;i++)add('shadow-midnight-grassland-slab',slab,m.ground,[-14+(i%4)*9,.1,-27-Math.floor(i/4)*10],[5,.2,4]);
      const grass=[];for(let i=0;i<31;i++)for(let k=0;k<3;k++)grass.push({path:t=>[-17+(i*11%35)+(k-1)*t*.18,t*(.4+i%3*.17),-25-(i*7%16)],radius:.016});paths('shadow-sparse-midnight-grass-blades',m.leaves,grass,12);
      for(let i=0;i<39;i++)orb('shadow-small-pale-cyan-sky-star',m.paper,-17+(i*13%35),10+(i*7%24),-43,.025);break;
    }
    case '35546670': {
      const water=material('#997a96'),leaves=material('#77805b');add('scars-pink-violet-reflecting-flood',slab,water,[0,.05,-34],[17,.12,10]);
      for(let i=0;i<18;i++){const x=-16+(i%6)*6.3,z=-29-Math.floor(i/6)*6,h=3+(i*7%7),a=(i%3-1)*.19;block('scars-leaning-broken-modern-building',m.stone,x,h*.5,z,3,h,2.6).rotation.z=a;for(let y=1;y<h;y+=1.5)for(const dx of [-.8,.8])block('scars-dark-ruined-window',m.dark,x+dx,y,z+1.34,.5,.45,.08);if(i%3===0){add('scars-rooftop-tree-crown',sphere,leaves,[x,h+1,z],[1.1,1.4,.9]);beam('scars-attached-rooftop-tree-trunk',[x,h,z],[x,h+1,z],m.wood,.1);}}
      for(let i=0;i<11;i++)add('scars-flat-broken-flooded-slab',shardRock,m.wood,[-15+(i*7%32),.4,-25-(i*3%16)],[1.5,.3,1.1],[0,i*.2,0]);paths('scars-warm-flood-water-reflection-lines',m.light,Array.from({length:8},(_,i)=>({path:t=>[-13+t*26,.18,-27-i*2+.3*Math.sin(t*12+i)],radius:.025})),48);break;
    }
    case '25163979': {
      for(let i=0;i<25;i++)add('nightmare-orange-cracked-stone-plain-tile',slab,m.stone,[-16+(i%7)*5.2,.08,-25-Math.floor(i/7)*5.5],[2.5,.2,2.7],[0,i*.12,0]);
      paths('nightmare-black-ground-crack-seams',m.dark,Array.from({length:12},(_,i)=>({path:poly([[-17+i*3,.31,-25],[-16+i*3,.31,-31],[-18+i*3,.31,-39]]),radius:.045})),24);
      for(let i=0;i<12;i++)block('nightmare-small-pale-horizon-block',m.paper,-17+i*3.1,2+(i%3),-43,1.7,4+(i%3),1.1);
      paths('nightmare-thin-purple-sunset-veins',material('#af8eb4'),[{path:t=>[-17+t*34,27+2*Math.sin(t*7),-41],radius:.065},{path:t=>[-17+t*34,31+2*Math.sin(t*7+2),-41],radius:.045}],64);break;
    }
    case '59197169': {
      const pink=material('#c47b9c',{side:THREE.DoubleSide}),dark=material('#844b72',{side:THREE.DoubleSide});pink.forceSinglePass=true;dark.forceSinglePass=true;
      for(const s of [-1,1])ribbon('yami-torn-upper-magenta-smoke-'+s,dark,t=>[s*(13-3*t),32-t*11,-35+Math.sin(t*6)*.5],t=>(1-t)*4+.4*Math.sin(t*23),[1,0,0],96);
      ribbon('yami-broad-curving-lower-pink-smoke-band',pink,t=>[16*Math.cos(.1*Math.PI+t*.8*Math.PI),4-4*Math.sin(.1*Math.PI+t*.8*Math.PI),-35+3*Math.sin(t*7)],t=>2.6+.6*Math.sin(t*21),[0,1,0],96);
      paths('yami-pale-irregular-low-smoke-edge',m.paper,[{path:t=>[-17+t*34,1.2+1.8*Math.sin(t*Math.PI)+.2*Math.sin(t*25),-31],radius:.06}],96);break;
    }
    case '65861210': {
      const gold=material('#b7b093'),jade=material('#c1df9a'),red=material('#b94b59');
      for(const [x,z,h] of [[-13,-39,29],[0,-43,24],[13,-39,31]]){add('beast-paradise-three-tall-square-tapered-obelisks',geometry('ritual-square-tapered-obelisk',()=>new THREE.CylinderGeometry(.7,1,1,4)),gold,[x,h*.5,z],[2.3,h,2.3],[0,Math.PI/4,0]);add('beast-paradise-square-pointed-obelisk-cap',geometry('ritual-square-obelisk-cap',()=>new THREE.ConeGeometry(1,1,4)),gold,[x,h+2,z],[1.65,4,1.65],[0,Math.PI/4,0]);}
      paths('beast-paradise-gnarled-living-tree-trunk',m.wood,[{path:t=>[Math.sin(t*7)*.6,t*17,-33],radius:t=>1.7*(1-t)+.3}],96);
      const limbs=[];for(let i=0;i<22;i++){const s=i%2?1:-1,y=5+i*.55;limbs.push({path:t=>[s*t*(4+i%5),y+t*7+Math.sin(t*8)*.6,-33+(i%3-1)*t*2],radius:t=>.22*(1-t)+.04});}paths('beast-paradise-many-crooked-leafless-branches',m.wood,limbs,80);
      paths('beast-paradise-eight-spreading-twisted-roots',m.wood,Array.from({length:8},(_,i)=>({path:t=>[Math.cos(i*Math.PI/4)*t*7,.5*(1-t),-33+Math.sin(i*Math.PI/4)*t*6],radius:t=>.45*(1-t)+.045})),64);
      for(let i=0;i<7;i++)add('beast-paradise-green-tree-hollow-eye',sphere,jade,[.7*Math.sin(i*3),2+i*1.4,-31.4],[.18,.33,.08]);orb('beast-paradise-red-ground-apple',red,0,.7,-25,.5);beam('beast-paradise-apple-short-attached-stem',[0,1.1,-25],[.1,1.5,-25],m.wood,.045);
      for(let i=0;i<9;i++)add('beast-paradise-layered-rough-ground-crag',shardRock,m.stone,[-16+(i%5)*8,1+(i%3),-30-Math.floor(i/5)*10],[3.2,2.1,2.8]);lightning('beast-paradise-dense-white-blue-branching-lightning',m.paper,Array.from({length:9},(_,i)=>[[-17+i*4.2,31,-35],[-15+i*4.2,26,-35],[-18+i*4.2,20,-35],[-16+i*4.2,14,-35]]));break;
    }
    case '43236494': {
      const red=material('#bb6f48'),brown=material('#8b7b64'),green=material('#91b992'),redTile=material('#d28a6b'),brownTile=material('#b2a18c');
      roof('fairytale-left-red-pitched-roof',red,-10,8,-34,12,9,9);roof('fairytale-right-brown-pitched-roof',brown,10,6,-35,13,8,10);
      for(let row=0;row<5;row++)for(let c=0;c<7;c++)for(const side of [-1,1]){const lx=-10+side*(5.4-row*1.05),rx=10+side*(5.8-row*1.1);block('fairytale-staggered-left-red-roof-tile',redTile,lx,8+(6-Math.abs(lx+10))*1.5+.17,-37.5+c*1.16+(row%2)*.18,1.35,.16,1.06).rotation.z=-side*Math.atan(1.5);block('fairytale-staggered-right-brown-roof-shingle',brownTile,rx,6+(6.5-Math.abs(rx-10))*8/6.5+.17,-39.1+c*1.38+(row%2)*.18,1.42,.16,1.29).rotation.z=-side*Math.atan(8/6.5);}
      block('fairytale-square-roof-chimney',brown,13,12.8,-36,2.4,5,2.2);block('fairytale-wide-square-chimney-cap',m.stone,13,15.3,-36,2.8,.6,2.6);beam('fairytale-slim-green-right-eave-edge',[4,6,-29.5],[16,14,-29.5],green,.13);
      for(let i=0;i<12;i++)add('fairytale-rounded-green-rear-treetop',sphere,green,[-16+(i%6)*6.4,4+(i%3),-41+(i%2)],[3,2,2]);clouds('fairytale-white-daytime-sky-clouds',m.paper,25,-42,9);break;
    }
  }
  createFieldReferenceDetailGeometry(ctx);return true;
}
