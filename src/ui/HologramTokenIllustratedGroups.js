import * as THREE from 'three';

// Printed sources, not the monsters which happen to create these Tokens:
// TK05-JP050: a crowded Prank-Kids street; SDCB-EN049: seven loose jewels.
// Coordinates below retain the source image's left/right, heights and overlap.
const PRANK_FRAME = Object.freeze({ left: 120, top: 285, right: 938, bottom: 1090 });
const CRYSTAL_FRAME = Object.freeze({ left: 55, top: 120, right: 418, bottom: 488 });

export const ILLUSTRATED_TOKEN_GROUPS = Object.freeze({
  '43664495': Object.freeze({ source: '/tokens/reviewed/43664495.png', printing: 'TK05-JP050', frame: PRANK_FRAME,
    subjects: Object.freeze([
      ['purple-cleaner', 320, 736, 641, -.14, 'cleaner'],
      ['brown-hound', 251, 910, 337, .14, 'hound'],
      ['green-foreground', 356, 974, 192, .44, 'green'],
      ['fire-foreground', 580, 916, 350, .34, 'fire'],
      ['blue-foreground', 781, 1011, 142, .48, 'blue'],
      // Tiny figures are individually placed, rather than reducing the crowd
      // to three main characters or repeating one generic central mannequin.
      ['upper-red-left', 468, 374, 42, -.29, 'fire'],
      ['upper-green', 539, 367, 48, -.30, 'green'],
      ['upper-dark-blue', 668, 344, 53, -.32, 'blue'],
      ['upper-red-right', 626, 390, 39, -.30, 'fire'],
      ['upper-wall-red', 467, 465, 54, -.28, 'fire'],
      ['roof-corner-blue', 677, 493, 37, -.22, 'blue'],
      ['roof-green-left', 674, 593, 76, -.17, 'green'],
      ['roof-flame-upper', 737, 552, 76, -.16, 'fire'],
      ['roof-orange-left', 722, 650, 91, -.10, 'fire'],
      ['roof-green-right', 792, 640, 80, -.10, 'green'],
      ['roof-small-green', 746, 687, 47, -.03, 'green'],
      ['roof-orange-lower', 783, 710, 71, -.02, 'fire'],
      ['roof-airborne-red', 800, 542, 47, -.18, 'fire'],
      ['right-wall-green', 856, 858, 47, -.22, 'green'],
      ['right-wall-red', 877, 935, 42, -.20, 'fire'],
      ['right-wall-blue', 918, 936, 29, -.19, 'blue'],
      ['right-wall-green-low', 890, 980, 40, -.15, 'green'],
      ['right-edge-blue', 932, 1010, 63, -.12, 'blue'],
      ['floor-red-left', 433, 1023, 93, .17, 'fire'],
      ['floor-blue-left', 480, 1024, 90, .18, 'blue'],
      ['floor-red-middle', 651, 1024, 83, .18, 'fire'],
      ['floor-green-middle', 691, 1023, 101, .19, 'green'],
      ['floor-blue-middle', 720, 1038, 67, .20, 'blue'],
      ['floor-green-right', 824, 1038, 68, .22, 'green'],
      ['floor-red-right', 868, 1038, 88, .23, 'fire'],
    ].map(row => Object.freeze(row))),
  }),
  '58371672': Object.freeze({ source: '/tokens/reviewed/58371672.png', printing: 'SDCB-EN049', frame: CRYSTAL_FRAME,
    subjects: Object.freeze([
      ['amethyst', 141, 211, 84, 105, '#aa69b1', 'pointed'],
      ['clear-violet', 279, 183, 88, 90, '#8382aa', 'table'],
      ['emerald', 360, 251, 75, 108, '#4eac65', 'pear'],
      ['ruby', 239, 287, 87, 102, '#d3404c', 'ruby'],
      ['gold', 114, 320, 81, 98, '#e4ce42', 'gold-drop'],
      ['amber', 187, 419, 103, 108, '#d5a54b', 'amber-drop'],
      ['sapphire', 331, 397, 91, 113, '#347bbb', 'sapphire-table'],
    ].map(row => Object.freeze(row))),
  }),
});

/** Printed art frame in the native factory's .7-scale world coordinates. */
export function getTokenIllustrationFrame(code) {
  const id = String(code || ''), group = Object.hasOwn(ILLUSTRATED_TOKEN_GROUPS,id) ? ILLUSTRATED_TOKEN_GROUPS[id] : null;
  if (!group) return null;
  const { left, right, top, bottom } = group.frame;
  const unit = id === '43664495' ? .00345 : .0073, originX = id === '43664495' ? 528 : 236;
  const baseY = id === '43664495' ? .18 : .25;
  const minX = (left-originX)*unit*.7, maxX = (right-originX)*unit*.7;
  const minY = baseY*.7, maxY = (baseY+(bottom-top)*unit)*.7;
  return {left:minX,right:maxX,bottom:minY,top:maxY,centerX:(minX+maxX)/2,centerY:(minY+maxY)/2,width:maxX-minX,height:maxY-minY,depth:1.2};
}

/** Source compositions, built once into the existing five material buckets. */
export function buildTokenIllustratedGroups(profile, helpers) {
  const code = String(profile?.tokenCode || '');
  if (code !== '43664495' && code !== '58371672') return false;
  if (code === '58371672') buildCrystalGroup(helpers);
  else buildPrankStreet(helpers);
  return true;
}

function buildCrystalGroup({ part }) {
  const unit = .0073;
  const point = (x, y, z = 0) => [(x - 236) * unit, .25 + (488 - y) * unit, z];
  const outlines = {
    pointed: [[-.11,-1],[-.73,-.72],[-.7,-.34],[-1,-.05],[-.76,.35],[-.22,.88],[.05,.47],[.48,.85],[.53,.34],[1,.05],[.57,-.27],[.51,-.73]],
    table: [[-.88,.4],[-.63,.78],[.28,.9],[.85,.54],[1,.07],[.55,-.77],[0,-1],[-.65,-.61]],
    pear: [[-.15,1],[-.75,.58],[-.97,.13],[-.75,-.57],[-.2,-.94],[.28,-1],[.8,-.6],[1,-.14],[.75,.47],[.34,.72]],
    ruby: [[-.36,.91],[.3,1],[.73,.64],[1,.12],[.69,-.65],[.31,-1],[-.32,-.9],[-.84,-.46],[-1,.18],[-.73,.69]],
    'gold-drop': [[-.45,1],[.15,.62],[.53,.47],[.9,.10],[.67,-.62],[.22,-1],[-.5,-.78],[-.9,-.44],[-1,.04],[-.73,.62]],
    'amber-drop': [[0,1],[-.75,.5],[-1,-.1],[-.68,-.75],[-.12,-1],[.69,-.72],[1,-.1],[.76,.48]],
    'sapphire-table': [[-.8,.43],[-.38,.75],[.25,1],[.37,.56],[.85,.27],[.9,-.26],[.48,-.9],[-.15,-1],[-.65,-.69],[-1,-.09]],
  };
  for (const [name, x, y, width, height, tint, kind] of ILLUSTRATED_TOKEN_GROUPS['58371672'].subjects) {
    let outline = outlines[kind];
    if (THREE.ShapeUtils.area(outline.map(([vx,vy]) => new THREE.Vector2(vx,vy))) < 0) outline = outline.toReversed();
    const positions = [], colours = [], uv = [], indices = [];
    const colour = new THREE.Color(tint), count = outline.length, table = kind === 'table' || kind === 'sapphire-table';
    // A cut inner crown, asymmetric girdle and tapering pavilion give the
    // jewels genuine volume and individually shaded planar facets.
    const rings = [[table ? .83 : .53,table ? .45 : .15,.25], [1,0,.025], [.70,-.08,-.17]];
    for (const [scale, offset, depth] of rings) for (const [vx, vy] of outline) {
      const yScale = depth === .25 && table ? scale * .36 : scale;
      positions.push(vx * width * unit * .5 * scale, (vy * yScale + offset) * height * unit * .5, depth);
      uv.push(vx * .5 + .5, vy * .5 + .5);
    }
    positions.push(0, height * unit * (table ? .225 : .10), .28, 0, -height * unit * .16, -.23); uv.push(.5,.5,.5,.5);
    const face = (a, b, c, shade, base = colour) => {
      const start = indices.length;
      indices.push(a, b, c);
      for (let n = start; n < start + 3; n++) {
        const shaded = base.clone().multiplyScalar(shade);
        colours.push(shaded.r, shaded.g, shaded.b);
      }
    };
    for (let edge = 0; edge < count; edge++) {
      const next = (edge + 1) % count;
      face(count*3, edge, next, table ? .95 + edge % 3 * .025 : 1.06 + edge % 3 * .15, table ? new THREE.Color('#d1e3ed') : colour);
      face(edge, count + edge, count + next, .60 + edge % 4 * .14);
      face(edge, count + next, next, .88 + edge % 3 * .09);
      face(count + edge, count*2 + edge, count*2 + next, .54 + edge % 3 * .12);
      face(count + edge, count*2 + next, count + next, .68 + edge % 3 * .11);
      face(count*3 + 1, count*2 + next, count*2 + edge, .48 + edge % 4 * .10);
    }
    const indexed = new THREE.BufferGeometry();
    indexed.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    indexed.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); indexed.setIndex(indices);
    const geometry = indexed.toNonIndexed(); indexed.dispose();
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colours, 3)); geometry.computeVertexNormals();
    // The factory merges indexed buffers; preserve those flat facet normals.
    geometry.setIndex(Array.from({ length: geometry.attributes.position.count }, (_, index) => index));
    part(`token-crystal-beast-gem-${name}`, geometry, 'body', point(x, y), [1,1,1], undefined, tint);
  }
  const stars = [[105,176,15],[177,164,12],[240,143,12],[309,166,10],[347,201,12],[389,217,10],[391,289,13],[350,326,13],[309,358,15],[304,401,11],[245,401,10],[209,454,13],[140,465,8],[93,396,11],[73,329,10]];
  for (const [index, [x,y,size]] of stars.entries()) {
    const vertices = [0,size,0,-size*.16,size*.16,0,-size,0,0,-size*.16,-size*.16,0,0,-size,0,size*.16,-size*.16,0,size,0,0,size*.16,size*.16,0];
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices.map(v => v*unit), 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(new Array(16).fill(.5), 2));
    geometry.setIndex([0,1,7,1,2,3,1,3,7,3,4,5,3,5,7,5,6,7]); geometry.computeVertexNormals();
    part(`token-crystal-beast-white-star-${index}`, geometry, 'eye', point(x,y,.31), [1,1,1], undefined, '#eefbff');
    part(`token-crystal-beast-star-halo-${index}`, new THREE.SphereGeometry(1,8,6), 'glow', point(x,y,.30), [size*unit*.35,size*unit*.35,.008], undefined, '#bde8f5');
  }
}

function buildPrankStreet({ part }) {
  const unit = .00345;
  const point = (x,y,z = 0) => [(x-528)*unit,.18+(1090-y)*unit,z];
  const ellipsoid = (name,x,y,rx,ry,depth,tint,z = 0,detail = false,material = 'body',rotation = 0) => {
    part(`token-prank-${name}`, new THREE.SphereGeometry(1,detail?10:6,detail?8:4), material, point(x,y,z), [rx*unit,ry*unit,depth], [0,0,rotation], tint);
  };
  const polygon = (name, outline, tint, z = 0, depth = .05, material = 'body') => {
    const shape = new THREE.Shape();
    outline.forEach(([x,y],i) => i ? shape.lineTo((x-528)*unit,.18+(1090-y)*unit) : shape.moveTo((x-528)*unit,.18+(1090-y)*unit)); shape.closePath();
    const geometry = new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:false,curveSegments:1,steps:1}); geometry.translate(0,0,-depth*.5);
    part(`token-prank-${name}`,geometry,material,[0,0,z],[1,1,1],undefined,tint);
  };
  const stroke = (name, points, radius, tint, z, material = 'body', segments = 9) => {
    const path = new THREE.CatmullRomCurve3(points.map(([x,y]) => new THREE.Vector3(...point(x,y,z))));
    part(`token-prank-${name}`,new THREE.TubeGeometry(path,segments,radius*unit,6,false),material,[0,0,0],[1,1,1],undefined,tint);
  };
  const palettes = { fire:['#db4237','#f5a742','#a92c39'],green:['#4ea87e','#9edca0','#28635f'],blue:['#577ab5','#9fbdd7','#3c467d'] };

  // The sloping red roofs establish the depth plane behind the crowd. Their
  // individual ridges keep figures anchored to the same roof as the print.
  polygon('street-right-facade',[[670,500],[838,657],[919,812],[886,1055],[643,1048],[655,672]],'#b77b42',-.48,.19);
  polygon('street-sloping-roof',[[646,508],[688,494],[870,716],[820,759],[631,588]],'#723343',-.34,.07);
  stroke('street-magenta-roof-edge',[[647,614],[720,676],[827,745]],7,'#b644a0',-.20);
  for(let line=0;line<6;line++) stroke(`roof-tile-ridge-${line}`,[[666+line*17,524+line*15],[734+line*17,612+line*15]],2,'#a55746',-.27,'accent',2);
  polygon('street-foreground-green-ground',[[130,1060],[931,1057],[931,1086],[130,1086]],'#b4ba58',-.1,.14);

  // Purple cleaner: tall coat, asymmetric hose/nozzle arms and steam puffs.
  polygon('purple-cleaner-torso',[[233,520],[356,523],[412,601],[449,893],[701,1040],[215,1059],[179,921]],'#75459d',-.10,.34);
  polygon('purple-cleaner-coat-shadow',[[239,551],[268,543],[263,863],[221,1017],[202,1029],[209,894]],'#45336c',.08,.025);
  ellipsoid('purple-cleaner-hood',326,433,57,47,.16,'#47305f',-.06,true);
  ellipsoid('purple-cleaner-head',325,478,82,54,.19,'#9b65b0',.05,true);
  for(const side of [-1,1]) {
    ellipsoid(`purple-cleaner-green-eye-${side}`,325+side*40,458,30,14,.024,'#c6dd8a',.207,false,'eye',side*.16);
    stroke(`purple-cleaner-drooping-cheek-${side}`,[[325+side*16,479],[325+side*22,503],[325+side*10,515]],2,'#50395f',.213,'dark',6);
  }
  ellipsoid('purple-cleaner-throat',309,528,32,18,.07,'#282b42',.03);
  stroke('purple-cleaner-left-sleeve',[[224,536],[168,639],[187,704]],30,'#9160aa',-.04,'body',12);
  stroke('purple-cleaner-right-sleeve',[[389,528],[452,577],[518,558]],39,'#8850a0',-.03,'body',12);
  ellipsoid('purple-cleaner-nozzle-hand',506,510,21,18,.08,'#392534',.12);
  stroke('purple-cleaner-long-hose',[[179,493],[138,562],[131,665],[164,724],[195,678]],8,'#3d2d49',.10,'dark',12);
  stroke('purple-cleaner-red-wand',[[212,517],[204,626],[195,767]],5,'#ad3a69',.18,'accent',5);
  ellipsoid('purple-cleaner-wand-hand',193,654,19,24,.065,'#49354d',.20);
  ellipsoid('purple-cleaner-right-oval-cuff',603,572,46,94,.13,'#d8a4bd',.03,true,'body',-.18);
  stroke('purple-cleaner-held-black-handle',[[570,600],[587,519],[586,436]],9,'#49242b',.24,'dark',7);
  polygon('purple-cleaner-held-t-handle',[[561,412],[574,395],[628,414],[637,431],[621,450],[566,429]],'#632d30',.25,.07,'dark');
  for(let button=0;button<3;button++) ellipsoid(`purple-cleaner-cuff-button-${button}`,632,506+button*36,10,14,.015,'#e4b663',.17,false,'accent',-.12);
  for(let button=0;button<4;button++) {
    const y=585+button*69,x=292+button*4;
    ellipsoid(`purple-cleaner-coat-button-rim-${button}`,x,y,18,15,.025,'#d6aa66',.105,false,'accent');
    ellipsoid(`purple-cleaner-coat-button-center-${button}`,x,y,10,8,.015,'#492e4e',.134,false,'dark');
  }
  for(const [puff,x,y,scale] of [[0,273,369,1],[1,408,354,1.15]]) {
    for(let lobe=0;lobe<3;lobe++) ellipsoid(`purple-cleaner-steam-${puff}-${lobe}`,x+(lobe-1)*14,y-(lobe===1?8:0),18*scale,17*scale,.025,'#e9ddeb',-.02,false,'eye');
    stroke(`purple-cleaner-steam-tail-${puff}`,[[x,y+8],[x-5,y+30]],2,'#ded0e4',.01,'eye',3);
  }

  // Brown hound leans left with folded ears, scowling eyes and a broad muzzle.
  ellipsoid('brown-hound-torso',233,956,90,114,.24,'#bd9755',.14,true,'body',-.16);
  ellipsoid('brown-hound-head',263,811,90,72,.27,'#c4a368',.22,true,'body',-.12);
  ellipsoid('brown-hound-muzzle',281,869,52,44,.12,'#d7b875',.43,true);
  for(const side of [-1,1]) {
    ellipsoid(`brown-hound-heavy-ear-${side}`,257+side*77,800,30,71,.085,'#655944',.28,false,'body',side*.7);
    ellipsoid(`brown-hound-eye-${side}`,263+side*32,792,23,15,.025,'#f3f0da',.47,false,'eye');
    polygon(`brown-hound-angry-brow-${side}`,[[263+side*10,783],[263+side*53,779],[263+side*47,791],[263+side*15,796]],'#54412b',.501,.015,'dark');
    ellipsoid(`brown-hound-paw-${side}`,232+side*56,1044,28,24,.12,'#b9985e',.29);
  }
  ellipsoid('brown-hound-nose',296,840,22,12,.045,'#59412b',.53);
  stroke('brown-hound-tight-mouth',[[231,856],[270,857],[309,870]],3,'#6d4a31',.55,'dark',5);
  polygon('brown-hound-purple-scarf',[[195,902],[260,932],[300,916],[276,946],[216,950]],'#654470',.40,.025,'accent');

  function kid(row, main = false) {
    const [name,x,y,height,z,kind] = row, h=height, [hair,light,cloth]=palettes[kind];
    const pos=(dx,dy)=>[x+dx*h,y+dy*h];
    const poly=(partName,points,tint,depth=.025,material='body',forward)=>{
      const surface = forward ?? (/golden-fringe|orange-headband/.test(partName) ? main ? .18 : .065
        : /flame-hair|swept-hair/.test(partName) ? main ? .135 : .05
          : /belt|front-buckle/.test(partName) ? main ? .075 : .05 : .025);
      polygon(`${name}-${partName}`,points.map(([dx,dy])=>pos(dx,dy)),tint,z+surface,depth,material);
    };
    const ellipse=(partName,dx,dy,rx,ry,tint,forward=0,material='body')=>{
      const depth = !main ? .015 : partName.startsWith('eye-') ? .015 : partName === 'laughing-mouth' ? .025 : .065;
      ellipsoid(`${name}-${partName}`,x+dx*h,y+dy*h,rx*h,ry*h,depth,tint,z+forward,main && /^(head|.*mitten)$/.test(partName),material);
    };
    // Every figure receives an actual coloured head, face, body and posed limbs.
    // A small far-away figure uses a closed low-poly outline rather than a
    // full-resolution copy of the foreground head, retaining the ×5 cap.
    poly('torso',[[-.16,-.05],[.14,-.05],[.19,.28],[-.17,.28]],cloth,main?.075:.02);
    poly('left-leg',[[-.15,.21],[-.025,.21],[-.02,.44],[-.21,.47],[-.19,.36]],cloth);
    poly('right-leg',[[.015,.21],[.15,.19],[.28,.35],[.21,.43],[.04,.35]],cloth);
    if(main) ellipse('head',0,-.23,.20,.16,'#f0d2a7',.055);
    else poly('head',[[-.19,-.34],[.16,-.36],[.22,-.18],[.11,-.08],[-.13,-.09],[-.21,-.20]],'#e7d0a3');
    if(kind==='fire') {
      poly('flame-hair',[[-.2,-.17],[-.29,-.28],[-.22,-.37],[-.29,-.50],[-.09,-.42],[-.04,-.57],[.07,-.43],[.21,-.51],[.22,-.34],[.34,-.30],[.23,-.18],[.15,-.38],[-.09,-.37]],hair,main?.07:.025,'accent');
      poly('golden-fringe',[[-.2,-.34],[-.1,-.40],[.1,-.38],[.22,-.31],[.05,-.30]],light,.025,'accent');
    } else {
      poly('swept-hair',[[-.21,-.17],[-.27,-.30],[-.18,-.41],[-.26,-.49],[-.07,-.42],[.01,-.51],[.08,-.40],[.25,-.45],[.20,-.34],[.31,-.34],[.25,-.22],[.16,-.29],[-.13,-.28]],hair,main?.065:.023);
      poly('orange-headband',[[-.20,-.32],[.18,-.33],[.20,-.26],[-.20,-.25]],'#e3b35d',.024,'accent');
    }
    // Arms differ: Fansies cheers, Lampsies runs, Dropsies lifts both hands.
    const left=kind==='fire'?[[-.13,0],[-.30,-.15],[-.23,-.24]]:[[-.13,0],[-.34,-.16],[-.35,-.28]];
    const right=kind==='fire'?[[.13,.01],[.30,.13],[.36,.16]]:[[.13,0],[.32,-.17],[.33,-.32]];
    for(const [side,path] of [['left',left],['right',right]]) {
      const outline=[...path.map(([dx,dy])=>[dx-.035,dy-.03]),...path.toReversed().map(([dx,dy])=>[dx+.035,dy+.04])];
      poly(`${side}-raised-arm`,outline,main?'#ebe5c6':light,main?.045:.016);
      const [dx,dy]=path[2];
      if(main) ellipse(`${side}-mitten`,dx,dy,.075,.072,'#e7e7cc',.08);
      else poly(`${side}-hand`,[[dx-.06,dy-.05],[dx+.05,dy-.07],[dx+.07,dy+.04],[dx-.05,dy+.04]],light);
    }
    if(main) {
      if(kind!=='fire') for(const side of [-1,1]) {
        ellipse(`eye-${side}`,side*.075,-.23,.032,.045,'#fff8df',.127,'eye');
        poly(`pupil-${side}`,[[side*.075-.009,-.253],[side*.075+.009,-.253],[side*.075+.009,-.211],[side*.075-.009,-.211]],'#3b5a67',.009,'dark',.145);
      }
      ellipse('laughing-mouth',0,-.135,kind==='fire'?.15:.093,kind==='fire'?.062:.045,kind==='fire'?'#f5efdb':'#854c67',.13,'eye');
      poly('belt',[[-.17,.19],[.17,.19],[.17,.26],[-.17,.26]],'#dacbad',.024,'accent');
      poly('front-buckle',[[-.035,.02],[.035,.02],[.035,.115],[-.035,.115]],'#e3d6b0',.025,'accent');
      if(kind==='fire') {
        for(const side of [-1,1]) poly(`closed-eye-${side}`,[[side*.025,-.245],[side*.15,-.27],[side*.12,-.23]],'#5a2942',.02,'dark',.128);
        for(let tooth=0;tooth<3;tooth++) stroke(`${name}-grin-tooth-${tooth}`,[[x+(tooth-1)*h*.071,y-h*.17],[x+(tooth-1)*h*.059,y-h*.095]],1.1,'#85586b',z+.158,'dark',2);
      }
    }
  }
  const subjects=ILLUSTRATED_TOKEN_GROUPS['43664495'].subjects;
  for(const row of subjects.slice(5)) kid(row);
  for(const row of subjects.slice(2,5)) kid(row,true);
  // Illustration-specific VFX remain integrated in the model batches, with no
  // extra renderer, timers or per-frame buffer rebuilding.
  for(const side of [-1,1]) stroke(`green-foreground-air-streak-${side}`,[[356+side*43,848],[356+side*57,817],[356+side*64,784]],3,'#97db94',.45,'eye',5);
  stroke('fire-foreground-rising-spark',[[607,742],[627,713],[634,676]],3,'#ffcc70',.35,'eye',5);
  for(const [i,[x,y,tint]] of [[0,[568,350,'#8ee1aa']],[1,[589,319,'#f1bf73']],[2,[699,334,'#ec82b5']],[3,[888,875,'#f8e6b0']]]) ellipsoid(`street-spark-${i}`,x,y,5,5,.012,tint,-.08,false,'eye');
}
