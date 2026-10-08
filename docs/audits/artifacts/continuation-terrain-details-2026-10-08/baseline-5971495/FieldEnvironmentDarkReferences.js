import { createFieldReferenceDetailGeometry } from './FieldReferenceDetailGeometry.js';

/** Individually inspected, intact illustrations supply these peripheral volumes.
 * Painted figures remain in the backdrop; dimensions and camera perspective
 * are adapted to the duel corridor, without claiming a complete 1:1 model.
 */
export const DARK_CARD_LANDMARKS = Object.freeze({"63883999": "palabyrinth-horned-ribbed-fortress", "81788994": "shadow-prison-sandy-lit-enclosure", "16625614": "dark-sanctuary-crag-and-needle-castle", "84171830": "monarch-domain-columned-shadow-chamber", "1050355": "terror-mirror-magenta-window-bridges", "70122149": "pareidolia-gold-edged-moon-castle", "13301895": "fallen-paradise-gnarled-eye-tree", "99795159": "ghostrick-mansion-curtained-party-room", "33407125": "labrynth-white-city-ramp-and-cup", "59160188": "darkness-lair-cracked-road-and-crags", "36890111": "dreadful-dolls-round-stained-glass-mansion", "43338320": "mementomictlan-engraved-fire-ziggurat", "47355498": "necrovalley-striated-sunset-gorge", "93729896": "nightmare-blue-curved-metal-chair", "94585852": "pandemonium-grown-ribbed-arch-court", "40005099": "shiranui-synthesis-crossing-cyan-ribbons", "72043279": "supreme-king-molten-hollow-spire", "33017655": "dark-world-open-carved-double-gates", "62188962": "vampire-kingdom-roof-village-red-moon", "76871889": "vendread-neon-city-barbed-wire"});

export const DARK_INSPECTED_ART_PROFILES = Object.freeze(Object.fromEntries([
  [
    "63883999",
    [
      "#33323c",
      "#8e909b",
      "#464555",
      "#c8b7f6",
      "#4c4c5e",
      "#d7d8e1"
    ],
    [
      "crowded grey ribbed cylindrical towers and tall blade pinnacles",
      "left tower wrapped by a thick continuous spiral",
      "black silver concentric ground sigil and pointed horn crowns; three carved demon faces, vertebral masks, bat-shaped ears and apertures now have sculptural volumes"
    ]
  ],
  [
    "81788994",
    [
      "#6c5a2d",
      "#b8a26c",
      "#9d894e",
      "#ffe989",
      "#796638",
      "#fff4bb"
    ],
    [
      "ochre desert cliff at left and sandy recess",
      "dark low oval ground with two golden light points",
      "cream gold sky; seated armored figure, orbit accessory and crescent staff stay painted"
    ]
  ],
  [
    "16625614",
    [
      "#583242",
      "#773950",
      "#493044",
      "#d274b2",
      "#251b31",
      "#d5a6d9"
    ],
    [
      "small black red needle castle on a steep broken stone mound",
      "many narrow spires and high pointed openings",
      "purple red fog; giant sky eyes and mouths stay painted"
    ]
  ],
  [
    "84171830",
    [
      "#505366",
      "#777b90",
      "#545865",
      "#d9dcec",
      "#3a3d4b",
      "#e8e8ef"
    ],
    [
      "tall vertical chamber columns beneath a white overhead shaft",
      "three curved concentric bands behind the central head",
      "one enormous enthroned figure and six foreground visitors stay painted"
    ]
  ],
  [
    "1050355",
    [
      "#354561",
      "#516987",
      "#273747",
      "#d630c5",
      "#32284b",
      "#a8bedd"
    ],
    [
      "layered blue teal courtyard with curved elevated bridges",
      "skewed pointed turrets and magenta narrow windows",
      "thick crawling violet strands; ornamental border and creatures remain painted"
    ]
  ],
  [
    "70122149",
    [
      "#4d5d52",
      "#25243d",
      "#3b3f3e",
      "#d9bc58",
      "#3b3143",
      "#d3f6f1"
    ],
    [
      "tall asymmetric black castle with fine golden outlines",
      "many narrow pale violet pointed windows and needle pinnacles",
      "large pale cyan moon and bare cliff trees; moon face stays painted"
    ]
  ],
  [
    "13301895",
    [
      "#444840",
      "#69705a",
      "#555b3e",
      "#87f453",
      "#343d2b",
      "#aaa89a"
    ],
    [
      "single huge olive grey leafless tree with twisted trunk and fine reaching branches",
      "green luminous hollows among roots and trunk",
      "broken grey cliff ring and one red apple on cracked foreground stone"
    ]
  ],
  [
    "99795159",
    [
      "#647c89",
      "#9bafb8",
      "#556873",
      "#f4bf58",
      "#434f61",
      "#dce5dc"
    ],
    [
      "blue interior curtains and paneled wall",
      "round white draped table with a branching candle stand",
      "sofa and rear mantel with round pot and narrow bottle; party characters stay painted"
    ]
  ],
  [
    "33407125",
    [
      "#b9cde5",
      "#e1eef6",
      "#719de2",
      "#c0baff",
      "#5678c7",
      "#fcffff"
    ],
    [
      "dense round white city with blue pointed tower roofs",
      "broad spiral ramps and diamond lattice gables",
      "large right chalice tower and floating ornament spires beneath a painted purple sigil"
    ]
  ],
  [
    "59160188",
    [
      "#40444b",
      "#677078",
      "#34373f",
      "#48d7d1",
      "#272d35",
      "#a5a6af"
    ],
    [
      "broken angular grey path framed by jagged black crags",
      "deep rock ledges and thin lightning behind the path",
      "central winged armored figure and four teal spectral heads remain painted"
    ]
  ],
  [
    "36890111",
    [
      "#586278",
      "#526c89",
      "#3b485d",
      "#a9e4ef",
      "#28374d",
      "#cee4ed"
    ],
    [
      "round tiered blue mansion with tall black needle roofs",
      "many small cyan pink yellow stained glass windows",
      "front triangular porch and thin pointed metal fence; doll characters remain painted"
    ]
  ],
  [
    "43338320",
    [
      "#743a2d",
      "#a9583f",
      "#573a31",
      "#ffad39",
      "#482b2a",
      "#e6c6a0"
    ],
    [
      "wide stepped copper red ziggurat with square maze engravings",
      "two large black round burning braziers on flank plinths",
      "multicolored angular crystals beneath a painted giant skeletal altar"
    ]
  ],
  [
    "47355498",
    [
      "#bba277",
      "#9d8569",
      "#81795c",
      "#ffdc72",
      "#5b5350",
      "#e4cc94"
    ],
    [
      "two towering irregular vertically striated rock walls",
      "sandy narrow passage opening towards an orange setting sun",
      "two tiny triangular pyramids on the distant horizon"
    ]
  ],
  [
    "93729896",
    [
      "#526c95",
      "#638bc0",
      "#435b87",
      "#a3d6ee",
      "#2d405b",
      "#d1e7f8"
    ],
    [
      "blue metallic chair with a curved tall slotted back",
      "rolled cylindrical armrests and a thick projecting seat",
      "floating translucent rectangular panels; seated winged character stays painted"
    ]
  ],
  [
    "94585852",
    [
      "#879c37",
      "#bfce64",
      "#75891f",
      "#fbdd49",
      "#334b2f",
      "#eceab5"
    ],
    [
      "yellow green curved skeletal columns with red ridged tips",
      "circular stepped court leading to a jagged oval opening",
      "branching ribbed ruined palaces beneath orange lightning; central silhouette stays painted"
    ]
  ],
  [
    "40005099",
    [
      "#3b2687",
      "#8585c0",
      "#395899",
      "#99f8ff",
      "#412f77",
      "#ebfbff"
    ],
    [
      "large luminous cyan white curved energy ribbons crossing horizontally",
      "dense violet vertical light streaks behind them",
      "living and spectral figures, fan shapes and weapons remain painted; no graveyard is depicted"
    ]
  ],
  [
    "72043279",
    [
      "#412944",
      "#5e5a84",
      "#363148",
      "#ffb833",
      "#282539",
      "#c0a8dd"
    ],
    [
      "irregular hollow purple black rock spire with jagged projecting peaks",
      "small rectangular grey gatehouse at its base",
      "bright orange lava below a toothed rock shelf and purple branching lightning"
    ]
  ],
  [
    "33017655",
    [
      "#59617b",
      "#9398b6",
      "#535a79",
      "#d5f9ff",
      "#666d90",
      "#f0ffff"
    ],
    [
      "two enormous thick partly opened grey violet carved doors",
      "outer ribbed round columns with flower-like round capitals",
      "long raised curling reliefs surrounding a white cyan opening; central silhouette stays painted"
    ]
  ],
  [
    "62188962",
    [
      "#545761",
      "#919293",
      "#4b5357",
      "#d52134",
      "#5d5157",
      "#e1d8d4"
    ],
    [
      "dense pale town with pitched dark roofs dormers chimneys and thin window slots",
      "small pale distant hill castle reached by a white winding path",
      "red moon and foreground pointed black fence"
    ]
  ],
  [
    "76871889",
    [
      "#303349",
      "#4d576d",
      "#343e58",
      "#f4dc58",
      "#222e43",
      "#c7dbab"
    ],
    [
      "modern city of narrow yellow window grids and cyan lit facades",
      "parallel foreground barbed wire strands with sharp crossings",
      "pale moon and diagonal light shafts; hero and zombies remain painted"
    ]
  ]
].map(([cardId,colors,motifs])=>[cardId,Object.freeze({cardId,
  sourceUrl:`https://images.ygoprodeck.com/images/cards_cropped/${cardId}.jpg`,
  motifs:Object.freeze(motifs),palette:Object.freeze({ground:colors[0],stone:colors[1],foliage:colors[2],accent:colors[3],wood:colors[4],foam:colors[5]})
})])));

export function createDarkReferenceGeometry(ctx) {
  const {THREE,profile,root,materials:m,material,geometry,add,block,beam,
    curvedTube,curvedDeck,box,cylinder,cone,ring,crown,rock}=ctx;
  if(!Object.hasOwn(DARK_CARD_LANDMARKS,profile.cardId)) return false;
  const sphere = geometry('dark-sphere', () => new THREE.SphereGeometry(1,16,12));
  const pyramid = geometry('dark-square-pyramid', () => new THREE.ConeGeometry(1,1,4));
  const gable = geometry('dark-pitched-gable', () => {
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
    const shape=geometry(`dark-${name}`,()=>{
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
    const shape=geometry(`dark-${name}`,()=>{const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();g.userData.terraceCount=tiers;return g;});
    return add(name,shape,mat,[0,0,0]);
  };
  const crag=(name,x,z,width,height,depth,mat=m.stone,phase=0)=>{
    const shape=geometry(`dark-${name}`,()=>{
      const g=new THREE.BoxGeometry(1,1,1,5,12,6),p=g.attributes.position;
      for(let i=0;i<p.count;i++) {
        const px=p.getX(i),py=p.getY(i),pz=p.getZ(i),t=py+.5;
        p.setXYZ(i,px*width*(1+.10*Math.sin(t*15+pz*4+phase))+.28*Math.sin(t*6+phase),
          py*height+Math.sin(px*8+pz*5+phase)*(.25+t*.85),pz*depth+Math.sin(t*19+px*6+phase)*.24);
      }
      g.computeVertexNormals();g.userData.irregularWall=true;return g;
    });return add(name,shape,mat,[x,height*.5,z]);
  };
  const slab=geometry('dark-irregular-six-sided-stone-slab',()=>{
    const g=new THREE.CylinderGeometry(1,1,1,6),p=g.attributes.position;
    for(let i=0;i<p.count;i++) {const x=p.getX(i),z=p.getZ(i),a=Math.atan2(z,x),r=1+.12*Math.sin(a*5+.7);p.setX(i,x*r);p.setZ(i,z*r);}
    g.computeVertexNormals();return g;
  });
  const shardRock=geometry('dark-low-poly-splintered-crag',()=>{
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
  switch(profile.cardId) {
    case '63883999': {
      add('palabyrinth-central-ribbed-cylinder',cylinder,m.stone,[0,13.5,-35],[3.1,27,3.1]);
      for(let i=0;i<10;i++) {
        add('palabyrinth-spinal-stone-rib',cylinder,m.wood,[0,2+i*2.35,-35],[3.2,.35,3.2]);
        add('palabyrinth-front-vertebral-hollow',sphere,m.dark,[0,2.6+i*2.35,-31.85],[.45,.6,.15]);
      }
      add('palabyrinth-left-spiral-tower',cylinder,m.stone,[-8,12,-35],[1.8,24,1.8]);
      paths('palabyrinth-thick-continuous-left-spiral',m.stone,[{path:t=>[-8+Math.cos(t*Math.PI*5)*2.1,1+t*24,-35+Math.sin(t*Math.PI*5)*2.1],radius:.55}],96);
      for(const [x,z,h,r] of [[8,-34,18,2.7],[5,-40,24,1.3],[-4,-42,30,.75]]) {
        add('palabyrinth-stepped-satellite-tower',cylinder,m.stone,[x,h*.5,z],[r,h,r]);
        for(let y=3;y<h;y+=3.5) add('palabyrinth-satellite-horizontal-gallery',cylinder,m.wood,[x,y,z],[r*1.18,.35,r*1.18]);
        add('palabyrinth-satellite-ribbed-point',cone,m.stone,[x,h+2.4,z],[r*1.1,4.8,r*1.1]);
      }
      const horns=[-1,1].map(side=>({path:t=>[side*(2.2+Math.sin(t*Math.PI)*2),27+t*7,-35-t*1.1],radius:t=>.7*(1-t)+.035}));
      paths('palabyrinth-pointed-crown-horns',m.stone,horns,32);
      for(const [x,z,h] of [[-13,-34,27],[-11,-40,31],[12,-39,33],[4,-37,36]]) add('palabyrinth-tall-blade-pinnacle',cone,m.stone,[x,h*.5,z],[.62,h,.5]);
      paths('palabyrinth-concentric-silver-ground-sigil',m.paper,[7,10,13].map(r=>({path:t=>[r*Math.cos(t*Math.PI*2),.08,-34+r*.72*Math.sin(t*Math.PI*2)],radius:.12})),64);
      for(let i=0;i<8;i++) {const a=i*Math.PI/4;beam('palabyrinth-ground-sigil-spoke',[Math.cos(a)*6,.08,-34+Math.sin(a)*4.3],[Math.cos(a)*12.5,.08,-34+Math.sin(a)*9],m.paper,.09);}
      break;
    }
    case '81788994': {
      crag('shadow-prison-ochre-left-desert-cliff',-13,-35,8,24,15,m.stone,.7);
      crag('shadow-prison-low-sandy-right-ledge',12,-38,9,7,12,m.ground,2.1);
      add('shadow-prison-dark-low-oval-ground',cylinder,m.dark,[0,.2,-30],[8,.35,5.2]);
      for(const [x,z] of [[-4,-28],[1,-27]]) add('shadow-prison-golden-ground-light-point',sphere,m.light,[x,.42,z],[.38,.08,.28]);
      const strata=[];
      for(let i=0;i<9;i++) strata.push({path:t=>[-16.8+t*7.3,2+i*2.3+.2*Math.sin(t*5),-27.35+.1*Math.sin(t*7+i)],radius:.045});
      paths('shadow-prison-desert-wall-eroded-strata',m.wood,strata,20);
      block('shadow-prison-sandy-recess',m.ground,0,-.25,-35,25,.4,18);
      break;
    }
    case '16625614': {
      add('dark-sanctuary-broken-steep-crag',shardRock,m.ground,[0,1.7,-35],[11,4.7,8.5],[.05,.1,0]);
      block('dark-sanctuary-visible-lower-castle',m.wood,0,9.3,-35,7,6.3,6);
      for(const [x,z,h,r] of [[0,-35,24,1.8],[-4,-34,18,.7],[4,-36,17,.7],[-2,-39,20,.65],[3,-40,21,.5]]) {
        add('dark-sanctuary-black-needle-castle-body',cylinder,m.wood,[x,7+h*.24,z],[r,h*.48,r]);
        add('dark-sanctuary-long-needle-spire',cone,m.dark,[x,7+h*.64,z],[r*1.1,h*.42,r*1.1]);
      }
      for(const x of [-2.4,0,2.4]) gothic('dark-sanctuary-high-pointed-opening',m.dark,x,8,-31.9,1.4,3.5);
      paths('dark-sanctuary-red-castle-tracery',m.stone,[-4,0,4].map(x=>({path:t=>[x+.25*Math.sin(t*5),7+t*13,-32],radius:.055})),32);
      for(let i=0;i<9;i++) add('dark-sanctuary-crag-foot-boulder',rock,m.stone,[(i%3-1)*6,.5,-25-Math.floor(i/3)*7],[2,1.3,1.7],[0,i*.7,.1]);
      break;
    }
    case '84171830': {
      block('monarch-domain-shadow-chamber-floor',m.wood,0,-.3,-34,34,.6,19);
      block('monarch-domain-dark-rear-wall',m.ground,0,17,-43,34,34,.4);
      for(const x of [-15,-11,-7,7,11,15]) {
        add('monarch-domain-tall-chamber-column',cylinder,m.stone,[x,16,-40],[1,32,1]);
        block('monarch-domain-column-capital',m.stone,x,31.5,-40,2.6,.7,2.6);
      }
      paths('monarch-domain-three-concentric-rear-bands',m.wood,[8,10,12].map(r=>({path:t=>[Math.cos(t*Math.PI)*r,18+Math.sin(t*Math.PI)*r,-41],radius:.28})),48);
      add('monarch-domain-white-overhead-light-shaft',cone,m.light,[0,17,-39],[2.2,30,2.2],[0,0,Math.PI]);
      break;
    }
    case '1050355': {
      const violet=material('#693899',{roughness:.6});
      for(const [x,z,h] of [[-10,-35,15],[1,-39,22],[11,-35,18]]) {
        turret('terror-mirror-skewed-pointed-turret',x,z,h,1.9,m.stone,violet);
        for(let y=3;y<h;y+=4) gothic('terror-mirror-magenta-lancet',m.light,x,y,z+1.95,.5,1.45);
      }
      const bridges=[];
      for(let i=0;i<3;i++) {
        const y=4+i*4.5,z=-28-i*4;
        curvedDeck('terror-mirror-layered-elevated-bridge',m.stone,t=>[-12+t*24,y+Math.sin(t*Math.PI)*2,z-Math.sin(t*Math.PI)*3],2.2,.5,48);
        bridges.push({path:t=>[-12+t*24,y-.5+Math.sin(t*Math.PI)*2,z-Math.sin(t*Math.PI)*3],radius:.14});
      }
      paths('terror-mirror-continuous-bridge-arch-edges',m.wood,bridges,48);
      for(const x of [-12,12]) block('terror-mirror-tall-courtyard-support',m.stone,x,6,-29,2,12,2);
      paths('terror-mirror-crawling-violet-strands',violet,[-1,1].flatMap(side=>[0,1].map(i=>({path:t=>[side*(13-Math.sin(t*5+i)*2.1),2+t*20,-29-t*7+i],radius:t=>.55-.32*t}))),64);
      break;
    }
    case '70122149': {
      const lavender=material('#deccff',{emissive:'#a18cda',emissiveIntensity:.4});
      for(const [y,w,h] of [[3,12,6],[9,9,6],[15,6,6],[21,3.5,6]]) {
        block('pareidolia-black-stepped-castle',m.stone,3,y,-35,w,h,6);
        for(const side of [-1,1]) beam('pareidolia-fine-gold-vertical-outline',[3+side*w*.5,y-h*.5,-31.93],[3+side*w*.5,y+h*.5,-31.93],m.gold,.06);
        beam('pareidolia-fine-gold-horizontal-outline',[3-w*.5,y+h*.5,-31.9],[3+w*.5,y+h*.5,-31.9],m.gold,.06);
        gothic('pareidolia-luminous-pointed-central-window',lavender,3,y,-31.9,1.2,3.5);
      }
      for(const [x,z,h] of [[-4,-35,20],[9,-35,22],[-7,-38,16],[12,-39,18],[1,-40,31],[5,-40,28]]) {
        block('pareidolia-gold-edged-thin-pinnacle',m.stone,x,h*.5,z,1.2,h,1.2);
        for(const side of [-1,1]) beam('pareidolia-pinnacle-gold-edge',[x+side*.62,0,z+.62],[x+side*.62,h,z+.62],m.gold,.045);
        add('pareidolia-black-gold-pointed-roof',cone,m.gold,[x,h+2,z],[.9,4,.9]);
        gothic('pareidolia-narrow-lavender-pinnacle-window',lavender,x,h*.7,z+.65,.35,2.4);
      }
      orb('pareidolia-pale-cyan-moon',m.paper,-11,26,-40,5.2);
      const branches=[];
      for(const side of [-1,1]) {const x=side*15;
        branches.push({path:t=>[x+Math.sin(t*4)*.7,1+t*11,-27-t],radius:t=>.45*(1-t)+.08});
        for(let i=0;i<4;i++) branches.push({path:t=>[x+side*t*(2.3+i*.3),5+i*1.7+t*3,-28-t*2],radius:t=>.2*(1-t)+.02});
      }
      paths('pareidolia-bare-cliff-tree-branches',m.wood,branches,24);
      break;
    }
    case '13301895': {
      paths('fallen-paradise-huge-gnarled-trunk',m.stone,[{path:t=>[Math.sin(t*5)*.6,1+t*22,-35+Math.sin(t*4)*.5],radius:t=>2.5-t*.8+.3*Math.sin(t*11)}],64,10);
      const limbs=[];
      for(let i=0;i<14;i++) {const side=i%2?1:-1,y=7+Math.floor(i/2)*1.7,length=9+(i%3)*2.5;
        const trunkT=(y-1)/22,startX=Math.sin(trunkT*5)*.6,startZ=-35+Math.sin(trunkT*4)*.5;
        const primary=t=>[startX+side*(t*length+.9*Math.sin(t*5)),y+t*(7+i%4*1.2),startZ+(Math.sin(t*3+i)-Math.sin(i))*1.4];
        const anchor=primary(.56);
        limbs.push({path:primary,radius:t=>.7*Math.pow(1-t,1.3)+.025});
        limbs.push({path:t=>[anchor[0]+side*t*length*.35,anchor[1]+t*7,anchor[2]+t*1.5],radius:t=>.22*(1-t)+.015});
      }
      paths('fallen-paradise-fine-reaching-leafless-limbs',m.stone,limbs,40);
      paths('fallen-paradise-spreading-twisted-roots',m.stone,Array.from({length:8},(_,i)=>{const a=i*Math.PI/4;return {path:t=>[Math.cos(a)*t*9,.5+Math.sin(t*Math.PI)*.6,-35+Math.sin(a)*t*7],radius:t=>.8*(1-t)+.08};}),40);
      for(const [x,y,z] of [[-.5,16,-32.85],[.2,10,-32.6],[-5,.9,-30.7],[5,1.2,-30.4],[-2,.7,-28.8]]) {
        add('fallen-paradise-dark-luminous-tree-hollow',sphere,m.dark,[x,y,z],[.72,.65,.14]);
        for(const side of [-1,1]) add('fallen-paradise-green-hollow-light',sphere,m.light,[x+side*.25,y,z+.16],[.14,.09,.08]);
      }
      for(let i=0;i<10;i++) add('fallen-paradise-broken-grey-cliff-ring',shardRock,m.ground,[(i%2?1:-1)*(11+i%3*1.7),1.3,-27-Math.floor(i/2)*3.7],[2.6,2+i%3*.5,2],[0,i*.6,0]);
      for(let i=0;i<12;i++) add('fallen-paradise-cracked-ground-slab',slab,m.wood,[(i%4-1.5)*4.2,.1,-24-Math.floor(i/4)*3.5],[1.9,.22,1.5],[0,i*.8,0]);
      const red=material('#bd3341',{roughness:.35});
      for(const x of [-.18,.18]) add('fallen-paradise-single-red-apple-lobe',sphere,red,[x,.65,-24.2],[.42,.5,.42]);
      beam('fallen-paradise-apple-stem',[0,1,-24.2],[.08,1.3,-24.2],m.wood,.045);
      break;
    }
    case '99795159': {
      block('ghostrick-blue-paneled-room-wall',m.stone,0,10,-41,31,20,.4);
      for(let x=-12;x<=12;x+=4) block('ghostrick-wall-vertical-panel-frame',m.wood,x,10,-40.7,.2,19,.2);
      block('ghostrick-wall-horizontal-panel-frame',m.wood,0,8,-40.6,30,.2,.2);
      const curtain=geometry('dark-ghostrick-pleated-curtain',()=>{
        const g=new THREE.BoxGeometry(6,20,.18,24,2,1),p=g.attributes.position;
        for(let i=0;i<p.count;i++) p.setZ(i,p.getZ(i)+Math.sin(p.getX(i)*Math.PI*2)*.32);
        g.computeVertexNormals();return g;
      });
      for(const x of [-11.5,11.5]) add('ghostrick-heavy-blue-pleated-curtain',curtain,m.ground,[x,10,-40.2]);
      add('ghostrick-round-white-draped-table',cylinder,m.paper,[-4,2.8,-29],[3.6,2.7,3.6]);
      add('ghostrick-round-table-top',cylinder,m.paper,[-4,4.2,-29],[3.7,.2,3.7]);
      for(const x of [-5.5,-4,-2.5]) block('ghostrick-ragged-tablecloth-dark-patch',m.wood,x,1.8,-25.4,.32,.9,.06);
      beam('ghostrick-gold-candlestick-stem',[-4,4.3,-29],[-4,6.7,-29],m.gold,.09);
      paths('ghostrick-three-branched-candle-arms',m.gold,[-1,0,1].map(side=>({path:t=>[-4+side*t,5.2+.6*t*t,-29],radius:.07})),24);
      for(const x of [-5,-4,-3]) {
        add('ghostrick-white-candle',cylinder,m.paper,[x,6.2,-29],[.12,.8,.12]);
        add('ghostrick-warm-candle-flame',cone,m.light,[x,6.8,-29],[.13,.4,.13]);
      }
      block('ghostrick-sofa-seat',m.ground,6,1.7,-36.5,7,1.6,3.3);
      block('ghostrick-sofa-high-back',m.ground,6,3.2,-38,7,3.5,.8);
      for(const x of [2.5,9.5]) add('ghostrick-rounded-sofa-arm',sphere,m.stone,[x,2.9,-36.5],[.6,1.2,1.7]);
      block('ghostrick-rear-mantel',m.wood,8,4,-39.4,9,.4,1.6);
      for(const x of [4,12]) block('ghostrick-mantel-side',m.wood,x,2,-39.6,.7,4,1.5);
      orb('ghostrick-round-pot-on-mantel',m.leaves,7,5.2,-39.3,1.1);
      add('ghostrick-pot-short-neck',cylinder,m.leaves,[7,6.2,-39.3],[.6,.4,.6]);
      add('ghostrick-narrow-bottle-body',cylinder,m.ground,[11,5.3,-39.3],[.3,2.2,.3]);
      add('ghostrick-narrow-bottle-neck',cylinder,m.ground,[11,6.8,-39.3],[.15,.8,.15]);
      block('ghostrick-empty-front-chair-seat',m.wood,1,2,-26,2,.25,2);
      block('ghostrick-empty-front-chair-back',m.wood,1,3.5,-27,2,3,.3);
      for(const x of [.2,1.8]) for(const z of [-25.2,-26.8]) block('ghostrick-chair-leg',m.wood,x,1,z,.17,2,.17);
      break;
    }
    case '33407125': {
      const blue=material('#688fdf',{roughness:.55});
      add('labrynth-white-central-round-palace',cylinder,m.stone,[0,10,-36],[5.1,20,5.1]);
      add('labrynth-central-blue-pointed-roof',cone,blue,[0,23,-36],[4.1,6,4.1]);
      for(const y of [6.7,12.7,18.7]) {
        add('labrynth-central-round-balcony-shelf',cylinder,m.paper,[0,y,-36],[5.65,.35,5.65]);
        for(let i=0;i<7;i++) {const a=.12*Math.PI+i*.125*Math.PI;
          gothic('labrynth-central-fine-gallery-arch',blue,Math.cos(a)*5.14,y-1.7,-36+Math.sin(a)*5.14,.5,1.7,.12,Math.PI/2-a);
        }
      }
      paths('labrynth-three-fine-blue-gallery-rails',blue,[6.9,12.9,18.9].map(y=>({path:t=>[Math.cos(t*Math.PI*2)*5.65,y,-36+Math.sin(t*Math.PI*2)*5.65],radius:.065})),64);
      for(const [x,z,h,r] of [[-10,-34,15,2.1],[7,-37,18,2],[-5,-42,23,1.4],[10,-42,16,1.7]]) {
        turret('labrynth-round-blue-roof-satellite',x,z,h,r,m.stone,blue);
        for(let y=3;y<h;y+=3.7) gothic('labrynth-tower-lancet',blue,x,y,z+r+.03,.4,1.3);
      }
      for(const [x,z,h,r] of [[-14,-33,12,.7],[-11,-40,19,.6],[-8,-36,10,.55],[-3,-43,26,.55],[3,-43,27,.55],[9,-40,22,.65],[14,-37,16,.7],[15,-43,20,.55]]) {
        add('labrynth-fine-secondary-white-turret',cylinder,m.stone,[x,h*.5,z],[r,h,r]);
        add('labrynth-fine-secondary-gallery-ring',cylinder,m.paper,[x,h-.7,z],[r*1.4,.3,r*1.4]);
        add('labrynth-fine-secondary-blue-spire',cone,blue,[x,h+1.4,z],[r*1.45,2.8,r*1.45]);
        block('labrynth-secondary-thin-blue-window',blue,x,h*.65,z+r+.025,.2,1.9,.08);
      }
      curvedDeck('labrynth-broad-white-ascending-spiral-ramp',m.paper,t=>[-14+t*19+12*Math.sin(t*Math.PI),2+t*9,-25-t*11-2*Math.sin(t*Math.PI)],3.1,.5,80);
      curvedDeck('labrynth-broad-white-ascending-spiral-ramp',m.paper,t=>[12-t*18+12*Math.sin(t*Math.PI),3+t*11,-25-t*13-2*Math.sin(t*Math.PI)],3.1,.5,80);
      curvedDeck('labrynth-upper-white-gallery-ramp',m.paper,t=>[-10+t*18,8+t*8,-36-3*t-Math.sin(t*Math.PI)*2],2.2,.4,64);
      const cup=geometry('dark-labrynth-large-flared-chalice',()=>new THREE.CylinderGeometry(1,.28,1,24,8,true));
      add('labrynth-large-right-chalice-bowl',cup,m.paper,[11,10,-29],[3.9,5,3.9]);
      add('labrynth-chalice-thin-pedestal',cylinder,m.stone,[11,4.4,-29],[.9,6.2,.9]);
      add('labrynth-chalice-upper-blue-rim',cylinder,blue,[11,12.5,-29],[4,.25,4]);
      for(const [y,r] of [[1.2,1.5],[4.8,1.2],[7.2,1.5]]) add('labrynth-chalice-blue-waist-collar',cylinder,blue,[11,y,-29],[r,.3,r]);
      const petals=geometry('dark-labrynth-chalice-pointed-petal-canopy',()=>{
        const positions=[];
        for(let i=0;i<12;i++) {const a=i*Math.PI/6;positions.push(11+Math.cos(a-.16)*3.9,12.5,-29+Math.sin(a-.16)*3.9,11+Math.cos(a)*.55,14.8,-29+Math.sin(a)*.55,11+Math.cos(a+.16)*3.9,12.5,-29+Math.sin(a+.16)*3.9);}
        const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.computeVertexNormals();g.userData.pointedPetalCount=12;return g;
      });
      add('labrynth-chalice-twelve-pointed-white-petals',petals,m.paper,[0,0,0]);
      for(let i=0;i<6;i++) {const a=i*Math.PI/5;add('labrynth-chalice-diamond-ornament',crown,blue,[11+Math.cos(a)*2.9,9.6,-29+Math.sin(a)*2.9],[.2,.75,.16],[0,Math.PI/2-a,0]);}
      block('labrynth-white-diamond-gabled-wing',m.stone,-10,3,-41,8,6,5);
      roof('labrynth-pointed-white-lattice-gable',m.paper,-10,6,-41,8,5,5.4);
      for(const x of [-13,-10,-7]) for(const side of [-1,1]) beam('labrynth-blue-gable-diamond-lattice',[x-1.3,7,-38.23],[x,7+side*1.8,-38.23],blue,.085);
      for(const x of [-12,-10,-8]) gothic('labrynth-lower-wing-fine-arched-gallery',blue,x,3,-38.45,.6,2.2);
      block('labrynth-right-white-gabled-wing',m.stone,15,2.7,-40,7,5.4,5);
      roof('labrynth-right-diamond-lattice-gable',m.paper,15,5.4,-40,7.6,4,5.4);
      for(const x of [12.7,15,17.3]) for(const side of [-1,1]) beam('labrynth-right-blue-gable-diamond-lattice',[x-1.15,6.6,-37.23],[x,6.6+side*1.6,-37.23],blue,.075);
      for(const [x,y,z] of [[-16,26,-42],[-7,31,-43],[8,30,-43],[17,27,-42]]) {
        add('labrynth-floating-slender-ornament-upper-point',cone,m.paper,[x,y+1.7,z],[.35,3.4,.35]);
        add('labrynth-floating-blue-diamond-ornament',crown,blue,[x,y,z],[.38,.8,.35]);
        add('labrynth-floating-slender-ornament-lower-point',cone,m.paper,[x,y-1.7,z],[.35,3.4,.35],[0,0,Math.PI]);
      }
      break;
    }
    case '59160188': {
      for(let i=0;i<18;i++) {
        const row=Math.floor(i/3),x=(i%3-1)*(2.6+row*.1);
        add('darkness-lair-broken-angular-road-slab',slab,m.stone,[x,.12,-24-row*3.3],[1.7,.18,1.7],[.04,i*.42,.01]);
      }
      for(const side of [-1,1]) for(let i=0;i<5;i++) {
        add('darkness-lair-jagged-black-crag',shardRock,m.wood,[side*(10+i%2*2),1.6+i%3,-26-i*3.8],[2.5,3+i%2*2,2],[.1,i*.8,side*.25]);
        add('darkness-lair-crag-pointed-ridge',cone,m.wood,[side*(11+i%2),5+i%3,-26-i*3.8],[.8,5,.7],[0,0,side*.25]);
      }
      paths('darkness-lair-thin-rear-lightning',m.paper,[-1,1].flatMap(side=>[
        {path:poly([[side*10,34,-44],[side*8.8,29,-44],[side*11,27,-44],[side*9.7,22,-44],[side*11.1,19,-44],[side*10,15,-44]]),radius:.045},
        {path:poly([[side*11,27,-44],[side*13,25,-44],[side*12.2,22.5,-44]]),radius:.025}
      ]),40);
      break;
    }
    case '36890111': {
      const glassMaterial=material('#ffffff',{vertexColors:true,emissive:'#bbcddd',emissiveIntensity:.3,roughness:.35});
      const glass=geometry('dark-doll-mansion-stained-glass',()=>{
        const p=[[-.5,0,0],[.5,0,0],[.5,1,0],[0,1.6,0],[-.5,1,0],[0,.6,0]],triangles=[[0,1,5],[1,2,5],[2,3,5],[3,4,5],[4,0,5]],colors=['#6fe0df','#e38fd5','#c8e892','#a8cbed','#9ceaca'];
        const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(triangles.flatMap(t=>t.flatMap(i=>p[i])),3));
        g.setAttribute('color',new THREE.Float32BufferAttribute(triangles.flatMap((t,i)=>t.flatMap(()=>{const c=new THREE.Color(colors[i]);return[c.r,c.g,c.b];})),3));g.computeVertexNormals();return g;
      });
      for(const [y,r,h] of [[5,7,10],[13,5.1,6],[20,2.9,7]]) {
        add('dreadful-dolls-round-tiered-mansion',cylinder,m.stone,[0,y,-35],[r,h,r]);
        add('dreadful-dolls-broad-round-gallery-rim',cylinder,m.wood,[0,y+h*.5,-35],[r*1.13,.4,r*1.13]);
        for(let i=0;i<7;i++) {const a=.08*Math.PI+i*.14*Math.PI;
          add('dreadful-dolls-irregular-stained-glass-lancet',glass,glassMaterial,[Math.cos(a)*(r+.04),y-1.3,-35+Math.sin(a)*(r+.04)],[.85,1.8,1],[0,Math.PI/2-a,0]);
        }
      }
      add('dreadful-dolls-central-black-needle',cone,m.wood,[0,27,-35],[1.4,7,1.4]);
      for(const [x,z,h] of [[-8,-34,18],[8,-34,18],[-4,-40,27],[4,-40,27]]) {
        add('dreadful-dolls-thin-black-corner-spire',cone,m.wood,[x,h*.5,z],[.55,h,.55]);
        add('dreadful-dolls-spire-glass-diamond',glass,glassMaterial,[x,h*.69,z+.6],[.55,1.1,1]);
      }
      block('dreadful-dolls-pointed-front-porch',m.stone,0,3,-26.5,6,6,3);
      roof('dreadful-dolls-triangular-porch-roof',m.wood,0,6,-26.5,7,3,3.6);
      gothic('dreadful-dolls-bright-front-door',m.paper,0,2.5,-24.9,2,4);
      stairs('dreadful-dolls-front-door-step',m.stone,0,-21.2,4.5,4,.27,.7);
      for(const x of [-15,15]) {block('dreadful-dolls-tall-pointed-fence-post',m.wood,x,10,-24,.55,20,.55);add('dreadful-dolls-fence-spear-tip',cone,m.wood,[x,21.7,-24],[.9,3.4,.9]);}
      for(let i=0;i<12;i++) {const x=(i-5.5)*2.2;block('dreadful-dolls-thin-front-fence-bar',m.wood,x,2,-23.8,.1,4,.1);add('dreadful-dolls-small-fence-point',cone,m.wood,[x,4.3,-23.8],[.18,.6,.18]);}
      beam('dreadful-dolls-front-fence-rail',[-13.2,2.8,-23.8],[13.2,2.8,-23.8],m.wood,.08);
      break;
    }
    case '43338320': {
      for(const [y,w,h,d] of [[1.5,32,3,15],[4.5,26,3,12],[7.5,20,3,9],[10.2,14,2.4,6]]) block('mementomictlan-copper-red-ziggurat-tier',m.stone,0,y,-36,w,h,d);
      const glyphs=[];
      for(const [count,y,z] of [[10,1,-28.4],[8,4,-29.9],[6,7,-31.4],[4,9.8,-32.9]]) for(let i=0;i<count;i++) {
        const x=(i-(count-1)*.5)*3.1;
        glyphs.push({path:poly([[x-.9,y,z],[x+.9,y,z],[x+.9,y+1.4,z],[x-.4,y+1.4,z],[x-.4,y+.6,z],[x+.35,y+.6,z]]),radius:.075});
      }
      paths('mementomictlan-square-maze-carvings',m.wood,glyphs,25,4);
      const flames=[];
      for(const x of [-12,12]) {
        block('mementomictlan-flank-brazier-plinth',m.stone,x,2.7,-27.5,3.8,5.4,4);
        add('mementomictlan-large-black-round-brazier',cylinder,m.wood,[x,6,-27.5],[2.2,1.8,2.2]);
        for(let i=0;i<3;i++) flames.push({path:t=>[x+Math.sin(t*5+i)*.6,6.8+t*(4.6-i*.6),-27.5+Math.sin(t*3+i)*.4],radius:t=>.6*(1-t)+.02});
      }
      paths('mementomictlan-curling-orange-brazier-flames',m.light,flames,32);
      const crystalMaterial=material('#ffffff',{vertexColors:true,roughness:.3,metalness:.2});
      const crystal=geometry('dark-memento-multicolored-crystal',()=>{
        const g=new THREE.ConeGeometry(1,1,4),colors=[],palette=['#74dfbb','#78cbea','#af84ed','#f0c784'];
        for(let i=0;i<g.attributes.position.count;i++) {const c=new THREE.Color(palette[i%4]);colors.push(c.r,c.g,c.b);}
        g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));return g;
      });
      for(let i=0;i<12;i++) add('mementomictlan-angular-colored-crystal-shard',crystal,crystalMaterial,[(i%2?1:-1)*(4+i%4*1.3),1.7+i%3*.25,-25-Math.floor(i/4)*2.1],[.55,2.8+i%3,.45],[.15,i*.8,(i%2?1:-1)*.3]);
      break;
    }
    case '47355498': {
      crag('necrovalley-left-vertically-striated-wall',-10.5,-32,8.3,28,20,m.stone,.7);
      crag('necrovalley-right-vertically-striated-wall',10.5,-33,8.6,30,20,m.stone,2.7);
      block('necrovalley-sandy-narrow-passage',m.ground,0,-.2,-32,19,.3,21);
      const veins=[];
      for(const side of [-1,1]) for(let i=0;i<7;i++) veins.push({path:t=>[side*(7.4+i*.75+.16*Math.sin(t*19+i)),.6+t*26,-21.65-.35*Math.sin(t*8+i)],radius:.045});
      paths('necrovalley-thin-eroded-vertical-wall-veins',m.wood,veins,48);
      orb('necrovalley-setting-sun',m.light,0,12,-44,2.1);
      for(const [x,h] of [[-2.7,1.2],[2.5,1.8]]) add('necrovalley-two-distant-pyramids',geometry('dark-necrovalley-square-pyramid',()=>new THREE.ConeGeometry(1,1,4)),m.wood,[x,h*.5,-44.5],[1.4,h,1.4],[0,Math.PI/4,0]);
      paths('necrovalley-thin-golden-sunset-rays',m.light,[-1,1].flatMap(side=>[0,1].map(i=>({path:t=>[side*t*(11+i*2),12+t*(i?14:-8),-43.6],radius:.025}))),24);
      break;
    }
    case '93729896': {
      const blueMetal=material('#5482c0',{metalness:.42,roughness:.32}),silver=material('#9ebcdc',{metalness:.32,roughness:.3}),glass=material('#7ba9cb',{transparent:true,opacity:.25,roughness:.5,side:THREE.DoubleSide});
      const back=geometry('dark-nightmare-curved-slotted-chair-back',()=>{
        const g=new THREE.BoxGeometry(8.5,16,.7,20,22,1),p=g.attributes.position;
        for(let i=0;i<p.count;i++) {
          const x=p.getX(i),y=p.getY(i),round=Math.pow(Math.abs(x)/4.25,6)*1.4*Math.max(0,(y-5)/3);
          p.setY(i,y-round);p.setZ(i,p.getZ(i)+x*x*.065);
        }
        g.computeVertexNormals();g.userData.curvedChairBack=true;return g;
      });
      add('nightmare-throne-curved-tall-metallic-back',back,blueMetal,[0,14,-36]);
      block('nightmare-throne-dark-rectangular-back-slot',m.wood,0,19.2,-35.62,1.4,1.5,.06);
      for(const x of [-3,-1.5,1.5,3]) beam('nightmare-throne-thin-vertical-back-panel-seam',[x,6.5,-35.62+x*x*.065],[x,21.7,-35.62+x*x*.065],m.metal,.025);
      block('nightmare-throne-thick-projecting-seat',blueMetal,0,5.5,-30.7,12,1.3,10);
      add('nightmare-throne-tapered-seat-pedestal',gable,blueMetal,[0,5,-31],[10,6,7],[0,0,Math.PI]);
      for(const x of [-5.5,5.5]) add('nightmare-throne-rolled-cylindrical-armrest',cylinder,silver,[x,7.2,-31],[.85,9,.85],[Math.PI/2,0,0]);
      add('nightmare-throne-rounded-front-seat-lip',cylinder,silver,[0,5.7,-25.65],[.6,12,.6],[0,0,Math.PI/2]);
      for(const [x,y,z,w,h] of [[-12,22,-40,7,9],[10,25,-42,9,8],[2,29,-42,10,6],[-5,33,-43,8,5]]) block('nightmare-throne-floating-translucent-rectangle',glass,x,y,z,w,h,.16).rotation.z=x*.015;
      break;
    }
    case '94585852': {
      const red=material('#a43b30',{roughness:.6});
      const ribbed=geometry('dark-pandemonium-grown-ribbed-column',()=>{
        const g=new THREE.CylinderGeometry(1,1,1,20,30,true),p=g.attributes.position;
        for(let i=0;i<p.count;i++) {const t=p.getY(i)+.5,a=Math.atan2(p.getZ(i),p.getX(i)),r=.7+.22*Math.sin(t*22)+.1*Math.cos(a*8);p.setXYZ(i,Math.cos(a)*r+.2*Math.sin(t*5),p.getY(i),Math.sin(a)*r);}
        g.computeVertexNormals();g.userData.grownRibbedColumn=true;return g;
      });
      const horns=[],ribs=[];
      for(const [x,z,h] of [[-13,-34,22],[13,-34,26],[-7,-41,30],[7,-41,28]]) {
        add('pandemonium-grown-yellow-green-ribbed-column',ribbed,m.stone,[x,h*.5,z],[2.3,h,2.3]);
        horns.push({path:t=>[x+(x>0?-1:1)*Math.sin(t*Math.PI)*2,h+t*4,z+t],radius:t=>.65*(1-t)+.025});
        for(let i=0;i<8;i++) {const a=i*Math.PI/4;ribs.push({path:t=>[x+Math.cos(a)*2+.45*Math.sin(t*5),t*h,z+Math.sin(a)*2],radius:.07});}
      }
      paths('pandemonium-red-ridged-curving-column-tips',red,horns,32);
      paths('pandemonium-dark-raised-column-ribs',m.wood,ribs,48);
      paths('pandemonium-grown-connecting-palace-arcs',m.stone,[-1,1].flatMap(side=>[0,1].map(i=>({path:t=>[side*(13-t*(6+i*2)),20+i*5+Math.sin(t*Math.PI)*3,-34-t*7],radius:t=>.55-t*.18}))),48);
      paths('pandemonium-jagged-grown-oval-opening',m.stone,[{path:t=>{const a=t*Math.PI*2,r=1+.06*Math.sin(a*13);return [Math.cos(a)*5.8*r,11+Math.sin(a)*9*r,-36];},radius:.45}],96);
      add('pandemonium-bright-inner-oval-opening',sphere,m.paper,[0,11,-40],[4,6,.1]);
      for(let i=0;i<14;i++) {const a=i*Math.PI*2/14,x=Math.cos(a)*5.8,y=11+Math.sin(a)*9;add('pandemonium-oval-rim-pointed-tooth',cone,m.stone,[x,y,-36],[.35,1.5,.35],[0,0,Math.atan2(x,11-y)]);}
      for(let i=0;i<4;i++) add('pandemonium-circular-stepped-court',cylinder,m.stone,[0,.3+i*.65,-29],[8-i*1.3,.6,5.7-i*.85]);
      break;
    }
    case '40005099': {
      const violet=material('#965cdb',{emissive:'#6947b7',emissiveIntensity:.6});
      for(let i=0;i<2;i++) curvedDeck('shiranui-synthesis-luminous-crossing-ribbon',i?m.paper:m.light,t=>{
        const a=t*Math.PI*2+i*Math.PI;return [Math.cos(a)*12,10+i*3+Math.sin(a*2)*2.2,-34+Math.sin(a)*6];
      },.95,.045,96);
      curvedDeck('shiranui-synthesis-wide-rising-energy-band',m.light,t=>[-14+t*28,8+Math.sin(t*Math.PI)*9,-34+Math.cos(t*Math.PI)*5],1.25,.045,80);
      paths('shiranui-synthesis-violet-vertical-light-streaks',violet,Array.from({length:19},(_,i)=>({path:t=>[(i-9)*1.45+.18*Math.sin(t*5+i),t*(20+i%5*2),-42+(i%3)*.3],radius:.055})),24);
      for(let i=0;i<16;i++) orb('shiranui-synthesis-small-pale-light-point',m.paper,(i%5-2)*4.4,3+Math.floor(i/5)*6,-39+(i%3)*2,.11);
      break;
    }
    case '72043279': {
      const spire=geometry('dark-supreme-king-continuous-asymmetric-spire',()=>{
        const g=new THREE.CylinderGeometry(1,1,1,24,44,true),p=g.attributes.position;
        for(let i=0;i<p.count;i++) {const t=p.getY(i)+.5,a=Math.atan2(p.getZ(i),p.getX(i)),r=(4.7*Math.pow(1-t,.6)+.3)*(1+.18*Math.sin(a*5+t*19)+.08*Math.sin(a*9-t*7));p.setXYZ(i,Math.cos(a)*r+.6*Math.sin(t*12),t*34-17,Math.sin(a)*r*.85+.3*Math.cos(t*9));}
        g.computeVertexNormals();g.userData.continuousSpireHeight=34;return g;
      });
      add('supreme-king-continuous-hollow-rock-spire',spire,m.stone,[0,17,-35]);
      for(const [x,y,z,r] of [[-1.8,11,-30.8,1.4],[1.5,19,-31.7,1.2],[-.3,27,-32.6,.95]]) add('supreme-king-deep-black-spire-cavity',sphere,m.wood,[x,y,z],[r,r*1.8,.1]);
      for(let i=0;i<7;i++) add('supreme-king-jagged-projecting-spire-peak',cone,m.stone,[(i%2?1:-1)*(2.1-i%3*.4),6+i*3.7,-35],[.55,5-i%3*.7,.6],[0,0,(i%2?1:-1)*.35]);
      block('supreme-king-small-grey-gatehouse',m.stone,0,2.5,-26.8,7,5,3);
      gothic('supreme-king-single-dark-gatehouse-door',m.wood,0,1.6,-25.2,1.4,2.5);
      add('supreme-king-toothed-rock-shelf',rock,m.wood,[0,-.2,-34],[15,2,10]);
      const lava=material('#f57215',{emissive:'#db4411',emissiveIntensity:.8,roughness:.5});
      block('supreme-king-bright-orange-molten-floor',lava,0,-1.5,-34,33,.12,21);
      const cracks=[];
      for(let i=0;i<7;i++) cracks.push({path:t=>[-15+t*30,-1.4,-25-i*2.5+Math.sin(t*15+i)*.65],radius:.065});
      paths('supreme-king-yellow-molten-crack-lines',m.light,cracks,64);
      for(let i=0;i<12;i++) add('supreme-king-shelf-burning-pointed-flame',cone,lava,[(i-5.5)*2.6,-.2,-23.7],[.6,3+i%3,.45],[0,0,(i%3-1)*.25]);
      const violet=material('#cc76ec',{emissive:'#9952cc',emissiveIntensity:.7});
      paths('supreme-king-purple-branching-lightning',violet,[-1,1].flatMap(side=>[
        {path:poly([[side*2,27,-43],[side*4.5,28,-43],[side*4,30,-43],[side*9,31,-43],[side*8,33,-43],[side*15,35,-43]]),radius:.055},
        {path:poly([[side*9,31,-43],[side*11,28.5,-43],[side*15,29,-43]]),radius:.025}
      ]),40);
      break;
    }
    case '33017655': {
      const reliefs=[];
      for(const side of [-1,1]) {
        const angle=side*.42,cx=side*5.5;
        const world=(x,y,z)=>[cx+Math.cos(angle)*x+Math.sin(angle)*z,y,-35-Math.sin(angle)*x+Math.cos(angle)*z];
        add('dark-world-heavy-partly-opened-carved-door',box,m.stone,[cx,13,-35],[6.2,26,2],[0,angle,0]);
        for(let i=0;i<5;i++) reliefs.push({path:t=>world((i-2)*1.02+Math.sin(t*8+i)*.55,2+t*22,1.14),radius:.18});
        for(let i=0;i<4;i++) {const p=world(-1.7+i*1.05,22.8-i%2*.9,1.3);add('dark-world-upper-round-carved-relief',sphere,m.wood,p,[.55,.65,.12],[0,angle,0]);}
        add('dark-world-outer-round-ribbed-column',cylinder,m.stone,[side*10,13,-36],[1.8,26,1.8]);
        for(const y of [3,8,14,20,24]) add('dark-world-round-column-carved-band',cylinder,m.wood,[side*10,y,-36],[1.9,.28,1.9]);
        for(let i=0;i<6;i++) {const a=i*Math.PI/3;orb('dark-world-flower-like-round-capital-lobe',m.stone,side*10+Math.cos(a)*1.25,27+Math.sin(a)*.8,-36,.85);}
      }
      paths('dark-world-long-raised-curling-door-reliefs',m.wood,reliefs,64);
      block('dark-world-white-cyan-open-gap',m.light,0,13,-40,5.5,26,.1);
      break;
    }
    case '62188962': {
      const red=material('#e12a40',{emissive:'#a6162e',emissiveIntensity:.7});
      for(let i=0;i<9;i++) {
        const row=Math.floor(i/3),x=(i%3-1)*8+(row%2?2:0),z=-27-row*6,h=6+i%4*2;
        block('vampire-kingdom-pale-village-house',m.stone,x,h*.5,z,5.7,h,4.8);
        roof('vampire-kingdom-dark-pitched-village-roof',m.wood,x,h,z,6.4,3.2,5.5);
        for(const dx of [-1.7,0,1.7]) for(const y of [2,h-2]) block('vampire-kingdom-narrow-house-window-slot',m.ground,x+dx,y,z+2.45,.32,.9,.08);
        if(i%2===0) block('vampire-kingdom-roof-chimney',m.stone,x+1.3,h+2,z-.4,.65,3,.65);
        if(i%3===0) {block('vampire-kingdom-roof-dormer',m.stone,x,h+1,-24.45-row*6,1.2,1.3,.8);roof('vampire-kingdom-small-pointed-dormer-roof',m.wood,x,h+1.7,-24.45-row*6,1.5,.8,1);}
      }
      add('vampire-kingdom-distant-castle-hill',rock,m.leaves,[0,3,-43],[6,3.7,3]);
      block('vampire-kingdom-small-pale-distant-castle',m.paper,0,9,-43,6,6,3.5);
      for(const [x,h] of [[-2.2,9],[0,13],[2.2,9]]) {
        add('vampire-kingdom-distant-castle-tower',cylinder,m.paper,[x,6+h*.5,-43],[.8,h,.8]);
        add('vampire-kingdom-distant-castle-red-roof',cone,m.wood,[x,6+h+1.5,-43],[1.1,3,1.1]);
      }
      curvedDeck('vampire-kingdom-white-winding-hill-path',m.paper,t=>[Math.sin(t*Math.PI*2)*3,3+t*3,-38-t*6],.7,.06,64);
      orb('vampire-kingdom-red-moon-halo',red,-8,28,-43,2.3);orb('vampire-kingdom-pale-red-moon-center',m.paper,-8,28,-42.5,1.65);
      for(let i=0;i<9;i++) {const x=(i-4)*3.4;block('vampire-kingdom-black-foreground-fence-post',m.ground,x,2,-22.8,.3,4,.3);add('vampire-kingdom-pointed-foreground-fence-tip',cone,m.ground,[x,4.6,-22.8],[.65,1.5,.65]);}
      beam('vampire-kingdom-foreground-fence-rail',[-14,2.6,-22.8],[14,2.6,-22.8],m.ground,.16);
      break;
    }
    case '76871889': {
      const cyan=material('#56c8ed',{emissive:'#279cc2',emissiveIntensity:.45,roughness:.45});
      for(let i=0;i<8;i++) {
        const side=i%2?1:-1,x=side*(5+Math.floor(i/2)*3.1),z=-29-Math.floor(i/2)*4.2,h=16+i%4*3.5;
        block('vendread-nights-narrow-modern-city-building',i<2?cyan:m.stone,x,h*.5,z,3.3,h,3.3);
        for(let row=0;row<4;row++) for(let col=0;col<3;col++) block('vendread-nights-yellow-cyan-window-grid',i%3===0?cyan:m.light,x+(col-1)*.72,3+row*(h-5)/4,z+1.69,.38,1.3,.05);
      }
      orb('vendread-nights-pale-night-moon',m.paper,-2,30,-43,2.3);
      for(const [x,z,dx] of [[-14,-29,10],[13,-29,-8],[0,-38,3]]) beam('vendread-nights-diagonal-city-light-shaft',[x,2,z],[x+dx,31,-42],m.paper,.07);
      for(const x of [-16,-8,0,8,16]) {block('vendread-nights-barbed-fence-upright',m.wood,x,4.7,-23,.22,9.4,.22);add('vendread-nights-fence-post-cap',cone,m.wood,[x,9.6,-23],[.3,.6,.3]);}
      paths('vendread-nights-five-parallel-barbed-wire-strands',m.wood,Array.from({length:5},(_,i)=>({path:t=>[-18+t*36,3.2+i*1.2+.08*Math.sin(t*90+i),-23],radius:.045})),96);
      for(let i=0;i<18;i++) {const x=-17+i*2,y=3.2+(i%5)*1.2;
        for(const side of [-1,1]) beam('vendread-nights-sharp-crossed-wire-barb',[x-.3,y-side*.28,-23.08],[x+.3,y+side*.28,-22.92],m.wood,.025);
      }
      break;
    }
    default:return false;
  }
  createFieldReferenceDetailGeometry(ctx);return true;
}
