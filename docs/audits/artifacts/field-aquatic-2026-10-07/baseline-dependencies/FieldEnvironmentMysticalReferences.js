/**
 * Peripheral volumes derived from individually opened, preserved source JPGs.
 * Painted characters stay in the source. Their surrounding energy patterns,
 * shards, stars and seals are adapted to the playable corridor, not claimed
 * as complete character models or a perspective-identical reconstruction.
 */
export const MYSTICAL_CARD_LANDMARKS = Object.freeze({
  '94243005': 'chaos-warped-galaxy-grid',
  '33550694': 'fusion-violet-funnel-grid',
  '42015635': 'neo-rainbow-cloud-spiral',
  '87902575': 'future-floating-landscape-frames',
  '20720928': 'metaphys-fractured-luminous-window',
  '34822850': 'void-cyan-cloud-node-diagram',
  '33900648': 'clear-suspended-blue-prism',
  '69296555': 'revealing-multicolor-inscribed-seal',
  '58406094': 'starry-teal-nebula-golden-stars',
  '675319': 'zodiac-jagged-violet-light-signs',
  '27813661': 'iris-concentric-spectrum-halos',
  '69217334': 'breaking-cyan-rays-fractured-earth',
  '95856586': 'zexal-golden-sphere-spectrum-panels',
  '4545854': 'xyz-fiery-spectrum-shell'
});

export const MYSTICAL_INSPECTED_ART_PROFILES = Object.freeze(Object.fromEntries([
  ['94243005', ['#052051','#12206f','#244dba','#58f4ff','#391565','#e8ffff'], ['curved blue square grid receding into white central opening','cyan elliptical spiral galaxies scattered across the grid','pink violet glints in deep blue space']],
  ['33550694', ['#252235','#332b43','#353549','#d398d5','#242133','#bdff66'], ['dark violet funnel with broad curling gray purple bands','fine magenta edges inside the spiral','lime cyan floor grid bent upward at the horizon']],
  ['42015635', ['#31365b','#725183','#437b71','#fe98de','#7d5848','#d6fff5'], ['broad translucent rainbow cloud ribbons turning into a dark center','small yellow cyan pink oval lights following the curves','green and pink foreground glow']],
  ['87902575', ['#0d0731','#37305d','#253f6f','#b4ffe4','#1e3d43','#f1ffe7'], ['tilted rectangular landscape windows with mint luminous rims','purple elliptical galaxies behind the windows','large angled mint light shards on the edges']],
  ['20720928', ['#15334b','#4c6384','#394164','#b9fff3','#283756','#f6ff95'], ['irregular shattered window with yellow lit cracks','floating cyan yellow and pink polygon shards','blue forked lightning above a dark teal horizon']],
  ['34822850', ['#153343','#435b6d','#19657a','#6de7ff','#394052','#d7eff1'], ['enclosing curling cyan blue clouds','small pale angular floating rock islands','hanging diagram of differently colored round nodes and pale connecting lines']],
  ['33900648', ['#7067bd','#5282b9','#5f58aa','#edffff','#273f70','#f6f0ff'], ['long hexagonal blue crystal with pointed upper and lower ends','white radial light wedges and soft pale circular halos','narrow rainbow streaks across the ground']],
  ['69296555', ['#111a66','#222b9c','#313394','#70edf9','#2c2059','#ff75a7'], ['flat cyan circular seal inside a bright pink angular star','yellow orange orbit ring and repeated pale angular glyph marks','deep blue background with upward pale streaks']],
  ['58406094', ['#061825','#183c50','#106768','#65f7e1','#163442','#ffe276'], ['diagonal teal cloudy nebula band','large long pointed golden and green stars','dense tiny cyan specks with blue dark patches']],
  ['675319', ['#060e28','#313858','#514784','#b991ff','#202130','#faf1ff'], ['jagged violet crosslike light signs','long violet diagonal light trails in starry dark blue space','white radial flares behind the signs and low dark jagged ridge']],
  ['27813661', ['#195276','#486b9c','#448e9d','#ffd9f0','#345871','#fff5da'], ['large concentric rainbow light halos','fine pale triangular lines connecting the halo rims','dense small luminous beads tracing pink cyan rings']],
  ['69217334', ['#302a30','#675355','#414657','#63e2ff','#3e3331','#ffcad6'], ['broad steep cyan beams meeting at a white ground flash','large broken angular brown stone plates with dark fissures','pink violet branching lightning crossing the fragments']],
  ['95856586', ['#151835','#746334','#75456b','#ffec61','#333354','#fffdeb'], ['bright round golden sphere and white radial wedges','tall translucent blue red and violet panels behind the sphere','dark curved bands across the halo and small white stars']],
  ['4545854', ['#48202f','#594252','#6a3b73','#ffd581','#482b35','#ffedf5'], ['large round cyan edged shell filled with pink violet and yellow flame streaks','dark angular fragments circling the shell','fine pale parallel lines crossing the blue rim']]
].map(([cardId, colors, motifs]) => [cardId, Object.freeze({
  cardId,
  sourceUrl: `https://images.ygoprodeck.com/images/cards_cropped/${cardId}.jpg`,
  motifs: Object.freeze(motifs),
  palette: Object.freeze({ ground: colors[0], stone: colors[1], foliage: colors[2], accent: colors[3], wood: colors[4], foam: colors[5] })
})])));

/** Uses the host's shared buffers, batching and disposal; imports no Three. */
export function createMysticalReferenceGeometry(ctx) {
  const { THREE, profile, root, materials: m, material, geometry, add, block,
    beam, curvedTube, rock, cylinder, crown, ring } = ctx;
  if (!Object.hasOwn(MYSTICAL_CARD_LANDMARKS, profile.cardId)) return false;
  const custom = [];
  const remember = mesh => { custom.push(mesh); return mesh; };
  const colored = material('#ffffff', { vertexColors: true, side: THREE.DoubleSide,
    emissive: '#000000', emissiveIntensity: 0, roughness: .7 });
  const translucent = material('#ffffff', { vertexColors: true, side: THREE.DoubleSide,
    transparent: true, opacity: .38, depthWrite: false,
    emissive: '#000000', emissiveIntensity: 0, roughness: .7 });
  const oval = geometry('mystical-oval', () => new THREE.SphereGeometry(1, 16, 12));
  let index = 0;
  const shape = (name, points, indices, colors) => geometry(`mystical-${profile.cardId}-${name}-${index++}`, () => {
    const result = new THREE.BufferGeometry();
    result.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
    if (colors) result.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    if (indices) result.setIndex(indices);
    result.computeVertexNormals();
    return result;
  });
  const color = hex => new THREE.Color(hex);
  const tube = (name, mat, path, radius, segments = 40) => remember(curvedTube(name, mat, path,
    t => [typeof radius === 'function' ? radius(t) : radius, typeof radius === 'function' ? radius(t) : radius], segments));
  const line = (name, from, to, mat = m.light, radius = .04) => remember(beam(name, from, to, mat, radius));
  const coloredPrimitive = (name, base, hex, position, scale, rotation = [0, 0, 0], mat = colored) => {
    const painted = geometry(`mystical-painted-${base.uuid}-${hex}`, () => {
      const result = base.clone(), c = color(hex), values = [];
      for (let i = 0; i < result.attributes.position.count; i++) values.push(c.r, c.g, c.b);
      result.setAttribute('color', new THREE.Float32BufferAttribute(values, 3)); return result;
    });
    return remember(add(name, painted, mat, position, scale, rotation));
  };
  const polygon = (name, vertices, hex, mat = colored) => {
    const points = vertices.flat(), faces = [], colors = [], c = color(hex);
    for (let i = 0; i < vertices.length; i++) colors.push(c.r, c.g, c.b);
    for (let i = 1; i < vertices.length - 1; i++) faces.push(0, i, i + 1);
    return remember(add(name, shape(name, points, faces, colors), mat, [0, 0, 0]));
  };
  // A continuous ribbon lies in the source's image plane. Its triangular
  // surface has actual palette colors; it is not a card texture or screenshot.
  const ribbon = (name, path, width, shade, mat = colored, segments = 64) => {
    const points = [], faces = [], colors = [], samples = [];
    for (let i = 0; i <= segments; i++) {
      const t = i / segments, p = path(t), before = path(Math.max(0, t - .0001)), after = path(Math.min(1, t + .0001));
      const dx = after[0] - before[0], dy = after[1] - before[1], length = Math.hypot(dx, dy) || 1;
      const w = typeof width === 'function' ? width(t) : width;
      const c = color(typeof shade === 'function' ? shade(t) : shade);
      samples.push(Object.freeze(p));
      for (const side of [-1, 1]) {
        points.push(p[0] - dy / length * side * w / 2, p[1] + dx / length * side * w / 2, p[2]);
        colors.push(c.r, c.g, c.b);
      }
      if (i < segments) { const offset = i * 2; faces.push(offset, offset + 1, offset + 2, offset + 1, offset + 3, offset + 2); }
    }
    const surface = shape(name, points, faces, colors);
    surface.userData.continuousCurve = Object.freeze(samples);
    return remember(add(name, surface, mat, [0, 0, 0]));
  };
  const spiral = (name, x, y, z, radius, turns, hex, mat = colored, thickness = .13, phase = 0) => ribbon(name,
    t => { const a = phase + t * Math.PI * 2 * turns, r = radius * (1 - .92 * t);
      return [x + Math.cos(a) * r, y + Math.sin(a) * r * .72, z - t * .12]; },
    t => thickness * (1 - t * .65), hex, mat, 96);
  const spark = (name, x, y, z, size, hex) => {
    const thin = size * .085;
    polygon(name, [[x,y+size,z],[x+thin,y+thin,z],[x+size*.7,y,z],[x+thin,y-thin,z],
      [x,y-size,z],[x-thin,y-thin,z],[x-size*.7,y,z],[x-thin,y+thin,z]], hex);
  };
  const bubble = (name, x, y, z, radius, hex, mat = translucent) =>
    coloredPrimitive(name, oval, hex, [x,y,z], [radius,radius,radius*.22], [0,0,0], mat);
  const spectral = ['#ef9fdc','#f8c46e','#fff3a2','#8cf9a3','#92f1ff','#b39cf7'];

  switch (profile.cardId) {
    case '94243005': {
      const grid = material('#185aab', { emissive:'#134fa3', emissiveIntensity:.45 });
      const point = (depth, angle) => { const r = 2 + depth * 18, twist = angle + depth * .8;
        return [Math.cos(twist)*r, 11+Math.sin(twist)*r*.67, -39+depth*7]; };
      for (let i=0;i<24;i++) tube('chaos-warped-square-grid',grid,t=>point(t,i*Math.PI/12),.023,32);
      for (let i=1;i<=12;i++) tube('chaos-warped-square-grid',grid,t=>point(i/12,t*Math.PI*2),.023,48);
      bubble('chaos-white-central-opening',0,11,-39.3,2.6,'#e9ffff',colored);
      for (let i=0;i<8;i++) {
        const a=i*Math.PI/4+.2,r=7+i%3*4,x=Math.cos(a)*r,y=11+Math.sin(a)*r*.62;
        spiral('chaos-cyan-elliptical-galaxy',x,y,-30.5-i%2,1.2+i%3*.45,2.1,'#70f6ff',colored,.24,i*.4);
        bubble('chaos-galaxy-white-core',x,y,-30.25-i%2,.25+i%3*.12,'#ffffff',colored);
      }
      for (let i=0;i<20;i++) spark('chaos-pink-blue-glint',-20+i*2.1,2+i%7*3,-32,.11+i%3*.04,i%2?'#df97ed':'#9cfaff');
      break;
    }
    case '33550694': {
      bubble('fusion-black-funnel-opening',0,9,-35,5.1,'#090710',colored);
      for(let i=0;i<6;i++) {
        const phase=i*Math.PI/3;
        ribbon('fusion-broad-violet-funnel-band',t=>{
          const a=phase+t*Math.PI*2.1,r=2+t*15;
          return [Math.cos(a)*r,9+Math.sin(a)*r*.9,-34-t*.8];
        },t=>.4+t*1.6,i%2?'#615770':'#49395e',translucent,96);
        tube('fusion-magenta-vortex-edge',m.light,t=>{
          const a=phase+t*Math.PI*2.1,r=2+t*15;
          return [Math.cos(a)*r,9+Math.sin(a)*r*.9,-33.8-t*.8];
        },.045,80);
      }
      const lime=material('#b8f96a',{emissive:'#80db62',emissiveIntensity:.45});
      for (let i=0;i<17;i++) {
        const x=(i-8)*2.7;
        tube('fusion-lime-bent-floor-grid',lime,t=>[x*(.5+t*.5),.12+Math.pow(1-t,5)*1.2,-36+t*15],.022,24);
        tube('fusion-lime-bent-floor-grid',lime,t=>[-22+t*44,.12+Math.pow(1-i/17,5)*(1.2+.45*Math.sin(t*Math.PI*2)), -36+i*.87],.022,32);
      }
      break;
    }
    case '42015635': {
      for(let i=0;i<12;i++) {
        const phase=i*Math.PI/6,hex=spectral[i%6];
        ribbon('neo-continuous-rainbow-cloud',t=>{
          const a=phase+t*Math.PI*2.5+Math.sin(t*6+i)*.14,r=2+t*18;
          return [Math.cos(a)*r*(1+.035*Math.sin(t*8+i)),11+Math.sin(a)*r*.76,-34-t*.15];
        },t=>.7+t*2.2+Math.sin(t*11+i)*.25,hex,translucent,96);
        for(let j=0;j<5;j++) {
          const t=.25+j*.14,a=phase+t*Math.PI*2.5,r=2+t*18;
          coloredPrimitive('neo-colored-oval-light',oval,hex,[Math.cos(a)*r,11+Math.sin(a)*r*.76,-32.5],
            [.11+j*.035,.07+j*.025,.05],[0,0,a]);
        }
      }
      break;
    }
    case '87902575': {
      const mint=material('#baffd9',{emissive:'#a0ffd3',emissiveIntensity:.75});
      const frames=[[-13,12,-30,6,4,.3],[11,15,-32,7,5,-.35],[-9,4,-29,7,3,-.2],[8,5,-31,3,4,.55],[0,18,-33,2.4,3,.3]];
      for(const [x,y,z,w,h,angle] of frames) {
        const p=(u,v)=>[x+Math.cos(angle)*u-Math.sin(angle)*v,y+Math.sin(angle)*u+Math.cos(angle)*v,z];
        polygon('future-floating-landscape-window',[p(-w/2,-h/2),p(w/2,-h/2),p(w/2,h/2),p(-w/2,h/2)],'#2455a1');
        polygon('future-window-pale-cloud-band',[p(-w/2,h*.2),p(w/2,h*.05),p(w/2,h*.25),p(-w/2,h*.35)],'#bdd9e6');
        polygon('future-window-angular-land-band',[p(-w/2,-h/2),p(w/2,-h/2),p(w/2,-h*.1),p(w*.1,-h*.22),p(-w*.13,h*.08),p(-w/2,-h*.15)],'#687170');
        const corners=[p(-w/2,-h/2),p(w/2,-h/2),p(w/2,h/2),p(-w/2,h/2)];
        for(let i=0;i<4;i++) line('future-mint-window-rim',corners[i],corners[(i+1)%4],mint,.09);
      }
      for(const [x,y,r] of [[-18,19,4],[18,8,5],[-12,1,3]]) spiral('future-violet-background-galaxy',x,y,-36,r,3.3,'#8f66ec',colored,.1);
      for(const side of [-1,1]) polygon('future-angled-mint-light-shard',[[side*22,2,-32],[side*17,8,-32],[side*19,2.7,-32]],'#d6fff3');
      break;
    }
    case '20720928': {
      const edge=material('#f9f584',{emissive:'#ffe561',emissiveIntensity:.65});
      const aperture=[[-8,6,-31],[-12,9,-31],[-10,12,-31],[-12,15,-31],[-8,17,-31],[-7,21,-31],[-3,20,-31],[0,23,-31],
        [2,18,-31],[5,19,-31],[6,15,-31],[4,12,-31],[7,9,-31],[1,8,-31],[-1,5,-31],[-4,7,-31]];
      polygon('metaphys-fractured-luminous-window',aperture,'#efffa7',translucent);
      for(let i=0;i<aperture.length;i++) line('metaphys-yellow-window-fracture',aperture[i],aperture[(i+1)%aperture.length],edge,.065);
      for(let i=0;i<18;i++) {
        const x=(i%2?1:-1)*(8+i%5*2.5),y=2+i%7*3,z=-29-i%3;
        polygon('metaphys-floating-colored-shard',[[x-.6,y-.7,z],[x+.65,y-.4,z],[x+.3,y+.85,z],[x-.4,y+.55,z]],['#80ffee','#f0f79c','#ecbdff'][i%3]);
      }
      for(const side of [-1,1]) {
        tube('metaphys-blue-forked-lightning',m.light,t=>[side*(12+Math.sin(t*18)*.45),22-t*17,-35],.033,56);
        for(let i=0;i<3;i++) line('metaphys-lightning-side-fork',[side*12,7+i*4,-35],[side*(14+i*.4),5+i*4,-35],m.light,.025);
        block('metaphys-dark-teal-horizon',m.ground,side*17,.3,-35,11,.7,3);
      }
      break;
    }
    case '34822850': {
      for(const side of [-1,1]) for(let i=0;i<4;i++) ribbon('void-enclosing-cyan-cloud',t=>
        [side*(12+Math.sin(t*Math.PI)*7+i*.8+Math.sin(t*15+i)*.5),2+t*21,-34-i*.3],
        t=>1.2+Math.sin(t*11+i)*.5,'#4493a7',translucent,64);
      const nodes=[[0,19,'#b7dcbd'],[0,16.4,'#927acc'],[-2.6,14.7,'#74cd9b'],[2.6,14.7,'#e0ad50'],
        [0,12.7,'#d5dd55'],[-2.6,10.9,'#6db4e8'],[2.6,10.9,'#e97470'],[-2.2,7.8,'#425762'],[2.2,7.8,'#635376'],[0,5.9,'#e9f2dd']];
      for(const [x,y,hex] of nodes) {
        bubble('void-colored-round-diagram-node',x,y,-29,.48,hex,colored);
        add('void-node-pale-outline',ring,m.paper,[x,y,-28.7],[.49,.49,.35]);
      }
      for(const [a,b] of [[0,1],[1,2],[1,3],[2,3],[2,4],[3,4],[4,5],[4,6],[5,6],[5,7],[6,8],[7,8],[7,9],[8,9],[1,9],[2,7],[3,8]])
        line('void-pale-diagram-connection',[nodes[a][0],nodes[a][1],-29.1],[nodes[b][0],nodes[b][1],-29.1],m.paper,.035);
      for(const [x,y,z] of [[-10,4,-32],[9,3,-34],[13,9,-36]]) {
        add('void-small-floating-rock-island',rock,m.stone,[x,y,z],[1.5,.8,1]);
        polygon('void-cyan-island-cap',[[x-1.3,y+.6,z],[x+1.4,y+.6,z],[x+.7,y+.6,z-1]],'#95eced');
      }
      break;
    }
    case '33900648': {
      const points=[],faces=[],shades=[];
      const rows=[[0,21],[1.5,18.5],[1.5,10],[0,6.8]],colors=['#b6f6ff','#5995c8','#244c87','#6498be','#91d4df','#376996'];
      for(const [r,y] of rows) for(let i=0;i<6;i++) {const a=i*Math.PI/3;
        points.push(Math.cos(a)*r,y,-30+Math.sin(a)*r);const c=color(colors[i]);shades.push(c.r,c.g,c.b);}
      for(let row=0;row<3;row++) for(let i=0;i<6;i++) {const a=row*6+i,b=row*6+(i+1)%6;faces.push(a,b,a+6,b,b+6,a+6);}
      remember(add('clear-pointed-hexagonal-blue-prism',shape('clear-prism',points,faces,shades),colored,[0,0,0]));
      for(let i=0;i<12;i++) {
        const a=i*Math.PI/6+.12,c=[0,15,-32],r=22;
        polygon('clear-white-radial-light-wedge',[c,[Math.cos(a-.025)*r,15+Math.sin(a-.025)*r*.75,-33],
          [Math.cos(a+.025)*r,15+Math.sin(a+.025)*r*.75,-33]],'#f5f7ff',translucent);
      }
      for(let i=0;i<9;i++) bubble('clear-pale-circular-halo',-17+i*4.3,3+i%4*5,-31,1+i%3*.55,'#f4ecff');
      for(let i=0;i<6;i++) line('clear-narrow-rainbow-ground-streak',[-21,.1+i*.015,-24-i*.2],[21,.1+i*.015,-34-i*.2],
        material(spectral[i],{emissive:spectral[i],emissiveIntensity:.35}),.025);
      break;
    }
    case '69296555': {
      const pink=material('#ff68b3',{emissive:'#fa4d9d',emissiveIntensity:.65}),gold=material('#ffd580',{emissive:'#eac16d',emissiveIntensity:.5});
      for(const [r,mat] of [[6,m.light],[9,pink],[10.5,gold]]) add('revealing-concentric-seal-circle',ring,mat,[0,.15,-31],[r,r,1],[-Math.PI/2,0,0]);
      const star=Array.from({length:12},(_,i)=>{const a=i*Math.PI/6,r=i%2?4.9:10;return [Math.cos(a)*r,.2,-31+Math.sin(a)*r];});
      for(let i=0;i<star.length;i++) line('revealing-pink-angular-six-point-star',star[i],star[(i+1)%star.length],pink,.055);
      for(let i=0;i<20;i++) {
        const a=i*Math.PI/10,x=Math.cos(a)*7.9,z=-31+Math.sin(a)*7.9;
        line('revealing-pale-ring-glyph',[x-.26,.24,z-.26],[x+.23,.24,z-.18],m.paper,.025);
        line('revealing-pale-ring-glyph',[x+.23,.24,z-.18],[x+.18,.24,z+.27],m.paper,.025);
      }
      for(const side of [-1,1]) for(let i=0;i<5;i++) line('revealing-upward-pale-streak',
        [side*(13+i*2),1,-33],[side*(12+i*2),18+i%3*2,-34],m.paper,.045);
      break;
    }
    case '58406094': {
      for(let i=0;i<8;i++) ribbon('starry-diagonal-teal-nebula',t=>[-22+t*44,3+t*15+Math.sin(t*7+i)*2,-36-i*.12],
        t=>2.2+Math.sin(t*Math.PI)*2.4,i%2?'#2eabb0':'#256c79',translucent,64);
      for(let i=0;i<17;i++) {
        const x=-19+i*2.3,y=2+i%5*4.6;
        spark('starry-long-pointed-star',x,y,-30,.35+i%4*.3,i%3?'#ffe183':'#75f3c9');
        if(i%3) add('starry-golden-star-orbit',ring,m.paper,[x,y,-30.1],[.18+i%4*.12,.3+i%4*.13,.15],[0,0,.3]);
      }
      for(let i=0;i<90;i++) bubble('starry-tiny-cyan-speck',-21+i%15*2.95,1+Math.floor(i/15)*4.1+i%3*.36,-33,.024+i%4*.016,'#90fff2',colored);
      break;
    }
    case '675319': {
      const signs=[
        [[-1.4,-2.6],[-.8,-1.1],[-.65,-1.35],[-.15,.25],[.07,.07],[.75,1.75],[1.4,3]],
        [[-2.2,.72],[-1.55,1],[-1.72,.64],[-.95,.82],[-1.1,.5],[-.2,.69],[.62,.78],[.5,.42],[1.6,.95],[1.4,.58],[2,.95]],
        [[-2.25,-.18],[-1.55,.03],[-1.7,-.33],[-.85,-.1],[-1.05,-.42],[-.15,-.16],[.65,-.08],[.42,-.43],[1.6,.04],[1.4,-.27],[2.04,.06]]
      ];
      for(const [x,y,size] of [[-14,14,2.4],[2,13,3],[17,9,2]]) {
        for(const sign of signs) ribbon('zodiac-jagged-violet-light-sign',t=>{
          const f=Math.min(sign.length-1.000001,t*(sign.length-1)),i=Math.floor(f),u=f-i;
          return [x+(sign[i][0]*(1-u)+sign[i+1][0]*u)*size,
            y+(sign[i][1]*(1-u)+sign[i+1][1]*u)*size,-30];
        },size*.16,'#946bf7',colored,80);
        for(let i=0;i<9;i++) {const a=i*Math.PI*2/9;
          polygon('zodiac-white-radial-flare',[[x,y,-32],[x+Math.cos(a-.025)*7,y+Math.sin(a-.025)*7,-32],
            [x+Math.cos(a+.025)*7,y+Math.sin(a+.025)*7,-32]],'#f0e4ff',translucent);}
      }
      for(let i=0;i<5;i++) ribbon('zodiac-diagonal-violet-trail',t=>[-23+t*46,-1+t*27+i*1.2,-35-i*.2],.32,'#9d80e8',translucent,48);
      for(let i=0;i<22;i++) spark('zodiac-white-star',-21+i%11*4.1,3+Math.floor(i/11)*14+i%4,-33,.12+i%3*.06,'#e9e5ff');
      for(let i=0;i<7;i++) add('zodiac-low-dark-jagged-ridge',rock,m.dark,[-19+i*6.3,.4+i%2*.2,-37],[3.5,1+i%3*.3,1.5]);
      break;
    }
    case '27813661': {
      for(let band=0;band<6;band++) ribbon('iris-concentric-spectrum-halo',t=>{
        const a=t*Math.PI*2,r=7+band*1.6;return [Math.cos(a)*r,11+Math.sin(a)*r*.82,-32-band*.1];
      },.8,spectral[band],translucent,96);
      for(let band=0;band<2;band++) for(let i=0;i<28;i++) {
        const a=i*Math.PI/14,r=7+band*6.7;
        bubble('iris-pink-cyan-rim-bead',Math.cos(a)*r,11+Math.sin(a)*r*.82,-30.7,.045+i%3*.02,band?'#a4ffff':'#ffc1e9',colored);
      }
      for(let i=0;i<20;i++) {
        const a=i*Math.PI/10,b=a+Math.PI*.55,r=14;
        line('iris-fine-triangular-halo-line',[Math.cos(a)*r,11+Math.sin(a)*r*.82,-33.5],
          [Math.cos(b)*r,11+Math.sin(b)*r*.82,-33.5],m.paper,.018);
      }
      break;
    }
    case '69217334': {
      const plate=geometry('mystical-jagged-stone-plate',()=>{
        const result=new THREE.BufferGeometry();
        const p=[-1,.2,-.8, .75,.35,-1, 1,.13,.82, -.8,.5,1, -1,-.5,-.8, .75,-.5,-1, 1,-.5,.82, -.8,-.5,1];
        const faces=[0,3,2,0,2,1,4,5,6,4,6,7,0,1,5,0,5,4,1,2,6,1,6,5,2,3,7,2,7,6,3,0,4,3,4,7];
        result.setAttribute('position',new THREE.Float32BufferAttribute(p,3));result.setIndex(faces);
        const flat=result.toNonIndexed();result.dispose();flat.computeVertexNormals();return flat;
      });
      for(let i=0;i<7;i++) {
        const x=(i-3)*6;
        polygon('breaking-broad-cyan-converging-beam',[[x-1.3,24,-32],[x+1.3,24,-32],[.22,1,-29],[-.22,1,-29]],i%2?'#85efff':'#42caff',translucent);
      }
      bubble('breaking-white-ground-flash',0,1,-29,2.7,'#f5ffff',colored);
      for(let i=0;i<14;i++) {
        const x=(i%2?1:-1)*(5+i%4*3.1),z=-25-Math.floor(i/4)*4;
        const fragment=remember(add('breaking-angular-brown-stone-plate',plate,m.stone,[x,.65+i%3*.2,z],
          [1.7+i%3*.3,.9+i%3*.3,1.2],[0,i*.43,.2-i%3*.2]));
        for(let j=0;j<2;j++) line('breaking-dark-stone-fissure',[x-.6,.9+i%3*.2,z+j*.4],[x+.4,1+i%3*.2,z+.3+j*.4],m.dark,.035);
        fragment.castShadow=false;
      }
      for(const side of [-1,1]) for(let i=0;i<3;i++) tube('breaking-pink-branching-lightning',m.paper,
        t=>[side*(1+t*19),1+i*1.5+Math.sin(t*27+i)*.5,-26-i*3],.045,56);
      for(let i=0;i<14;i++) add('breaking-small-airborne-fragment',rock,m.dark,[-18+i%7*6,5+Math.floor(i/7)*9+i%3,-34],
        [.16+i%3*.08,.28+i%2*.15,.15],[i*.2,0,.3]);
      break;
    }
    case '95856586': {
      bubble('zexal-bright-round-golden-sphere',0,11,-32,7,'#ffe763',translucent);
      for(let i=0;i<12;i++) {
        const a=i*Math.PI/6+.1;
        polygon('zexal-white-radial-wedge',[[0,11,-30.5],[Math.cos(a-.025)*20,11+Math.sin(a-.025)*20*.8,-31],
          [Math.cos(a+.025)*20,11+Math.sin(a+.025)*20*.8,-31]],'#fffddd',translucent);
      }
      for(let i=0;i<8;i++) polygon('zexal-tall-spectrum-panel',[[(-4+i)*4,0,-35],[(-4+i)*4+2,0,-35],
        [(-4+i)*4+5,24,-35],[(-4+i)*4+3,24,-35]],spectral[i%6],translucent);
      for(let i=0;i<3;i++) ribbon('zexal-dark-curved-halo-band',t=>{
        const a=-.3+t*Math.PI*1.6,r=10+i*2;return [Math.cos(a)*r,11+Math.sin(a)*r*.72,-29.5-i*.15];
      },.7,'#353244',translucent,80);
      for(let i=0;i<18;i++) spark('zexal-small-white-star',-21+i%9*5.1,2+Math.floor(i/9)*17+i%3,-30,.16+i%3*.08,'#fff4ba');
      break;
    }
    case '4545854': {
      ribbon('xyz-round-cyan-edged-shell',t=>{const a=t*Math.PI*2;return [Math.cos(a)*12.6,11+Math.sin(a)*12.6*.85,-33];},.3,'#a6f2ff',translucent,128);
      for(let i=0;i<10;i++) ribbon('xyz-pink-violet-yellow-flame-streak',t=>[
        -13+i*2.8+Math.sin(t*9+i)*1.8,1+t*21,-34],t=>.6+Math.sin(t*Math.PI)*1.2,
        t=>spectral[(i+Math.floor(t*4))%6],translucent,64);
      for(let i=0;i<20;i++) {
        const a=i*Math.PI/10,r=13.5+i%2;
        add('xyz-circling-dark-angular-fragment',rock,m.dark,[Math.cos(a)*r,11+Math.sin(a)*r*.8,-31],
          [.3+i%3*.18,.45+i%2*.3,.22],[i*.2,i*.3,i*.5]);
      }
      for(let i=0;i<17;i++) {
        const y=1+i*1.22,w=Math.sqrt(Math.max(0,1-Math.pow((y-11)/11,2)))*12;
        line('xyz-fine-parallel-shell-line',[-w,y,-30],[w,y,-30],m.paper,.009);
      }
      break;
    }
  }
  mergeMysticalMeshes(THREE, root, custom, geometry, add, profile.cardId);
  // The host disposes used resources on replacement. These two helper
  // materials are outside its default palette, so release unused ones here.
  const used = new Set(root.children.filter(mesh=>mesh.isMesh).map(mesh=>mesh.material));
  for(const mat of [colored,translucent]) if(!used.has(mat)) mat.dispose();
  return true;
}

/** Merge only equivalent names/materials in one safe peripheral region. */
function mergeMysticalMeshes(THREE, root, meshes, geometry, add, cardId) {
  const groups=new Map();
  for(const mesh of meshes) {
    mesh.updateMatrix();mesh.geometry.computeBoundingBox();
    const bounds=mesh.geometry.boundingBox.clone().applyMatrix4(mesh.matrix);
    const region=bounds.max.z<-18?'rear':bounds.max.x<-9?'left':bounds.min.x>9?'right':'other';
    const key=`${mesh.name}:${mesh.material.uuid}:${region}`;
    if(!groups.has(key)) groups.set(key,[]);groups.get(key).push(mesh);
  }
  root.userData.referencePrimitiveCount=root.children.filter(mesh=>mesh.isMesh).length;
  let index=0;
  for(const sources of groups.values()) {
    if(sources.length<2) continue;
    const merged=geometry(`mystical-combined-${cardId}-${index++}`,()=>{
      const positions=[],normals=[],colors=[],indices=[],curves=[];let offset=0;
      const hasColors=sources.some(mesh=>mesh.geometry.attributes.color);
      for(const mesh of sources) {
        const p=mesh.geometry.attributes.position,n=mesh.geometry.attributes.normal,c=mesh.geometry.attributes.color;
        const normalMatrix=new THREE.Matrix3().getNormalMatrix(mesh.matrix);
        for(let i=0;i<p.count;i++) {
          const point=new THREE.Vector3().fromBufferAttribute(p,i).applyMatrix4(mesh.matrix);
          const normal=new THREE.Vector3().fromBufferAttribute(n,i).applyMatrix3(normalMatrix).normalize();
          positions.push(point.x,point.y,point.z);normals.push(normal.x,normal.y,normal.z);
          if(hasColors) colors.push(c?c.getX(i):1,c?c.getY(i):1,c?c.getZ(i):1);
        }
        const src=mesh.geometry.index;
        for(let i=0;i<(src?.count??p.count);i++) indices.push(offset+(src?src.getX(i):i));
        offset+=p.count;
        if(mesh.geometry.userData.continuousCurve) curves.push(mesh.geometry.userData.continuousCurve);
      }
      const result=new THREE.BufferGeometry();
      result.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
      result.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));
      if(hasColors) result.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
      result.setIndex(indices);result.userData.continuousCurves=Object.freeze(curves);
      result.userData.referencePrimitiveCount=sources.length;return result;
    });
    for(const mesh of sources) root.remove(mesh);
    const result=add(sources[0].name,merged,sources[0].material,[0,0,0]);
    result.castShadow=sources.some(mesh=>mesh.castShadow);
  }
}
