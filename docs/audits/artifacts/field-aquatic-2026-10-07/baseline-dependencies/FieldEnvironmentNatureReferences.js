/**
 * Source-inspected scenery. The preserved illustration retains its characters.
 * Static volumes reconstruct its surroundings outside the playable corridor;
 * placement is adapted to the duel, rather than reproducing its perspective.
 */
export const NATURE_CARD_LANDMARKS = Object.freeze({
  '4064256': 'ruined-crypt',
  '295517': 'submerged-ruins',
  '78082039': 'closed-forest-watching-eye',
  '35956022': 'acidic-rain-wasteland',
  '28120197': 'canyon-layered-gorge',
  '712559': 'amazoness-thatched-village',
  '15854426': 'mist-valley-rainbow-ribbon',
  '37322745': 'naturia-floating-grove',
  '70222318': 'sylvania-snowpeak-valley',
  '54306223': 'venom-sunken-swamp',
  '7142724': 'icejade-tiered-cenote',
  '17000165': 'reptilianne-lightning-maze',
  '88288421': 'field-power-island-biomes',
  '33700664': 'valvols-storm-volcano-valley'
});

export const NATURE_INSPECTED_ART_PROFILES = Object.freeze(Object.fromEntries([
  ['4064256', ['#47344f','#625c70','#393043','#49ddd4','#695272','#c6bed0'], ['contorted purple trunks with carved faces','red river and scattered graves','central bone spire with cyan wisps']],
  ['295517', ['#315f69','#9baf9d','#387a73','#b5f9ff','#887652','#e5fff9'], ['curved brick aqueducts and tall rectangular supports','broad central staircase and round crenellated tower','underwater blue caustics and descending sunlight']],
  ['78082039', ['#413d29','#594c37','#586043','#ffe045','#735938','#fff0a4'], ['close interlaced diagonal wooden branches','yellow eye with vertical slit behind branches','dark enclosure with olive bark']],
  ['35956022', ['#885dab','#50465e','#64bf97','#bb88e9','#433047','#ded1fa'], ['dense slanted pale acid rain','low black gray rock mound','curling white vapor and purple puddle rings']],
  ['28120197', ['#a68b70','#ba9e81','#8d7159','#a9deed','#826653','#ded5c1'], ['flat topped layered sandstone mesas','vertical eroded gorge walls','pale beige terraces below cyan sky']],
  ['712559', ['#b99a55','#857e57','#3e8e31','#cfba6c','#70543c','#eee4b0'], ['raised wooden thatched huts','narrow vertical palisade behind huts','large pointed jungle leaves framing sandy ground']],
  ['15854426', ['#3161bb','#2775bb','#89db46','#b7f5ff','#315c9e','#dbffff'], ['diagonal multicolored rainbow ribbon','translucent blue crag wall','yellow green floating light orbs']],
  ['37322745', ['#a2e8d6','#c6c5aa','#4faa47','#e8c9fb','#88724d','#f1fff2'], ['floating pale rock islands topped with greenery','curled green vines and pastel lights','large tree framing right edge']],
  ['70222318', ['#437b55','#91a8b6','#397349','#b2e6ed','#5e7040','#eef8ff'], ['wide pyramidal snow capped mountain','layered green forest valley','narrow blue streams and foreground waterfall']],
  ['54306223', ['#54353d','#576652','#607154','#845664','#49564c','#a1ae8b'], ['murky red brown water and floating lily pads','broken mossy trunks with exposed roots','drooping vines, reeds and submerged pale bones']],
  ['7142724', ['#1e6b69','#90796e','#4c267d','#adeced','#485e68','#f1faf9'], ['round tiers of overflowing water','floating inverted stone cones with purple hanging plants','turquoise engravings and white ice caps']],
  ['17000165', ['#3c2154','#6a3d82','#352444','#74f1ff','#472742','#bcfaff'], ['large angular violet maze outlines','black inset labyrinth bands edged in cyan','cyan lightning at central convergence']],
  ['88288421', ['#b4ae73','#758d7b','#3e9b4b','#e4f5ff','#8a7250','#fffbd9'], ['raised coastal island with pale sandy outline','long chain of sharp green peaks and forest patches','blue water, white shoreline and a lower left compass']],
  ['33700664', ['#334252','#475a64','#264943','#d8e9e8','#282a31','#c1def0'], ['storm clouds and branching white lightning','two red erupting volcanoes on right mountain slope','blue and magenta energy vortices with bare foreground trees']]
].map(([cardId, colors, motifs]) => [cardId, Object.freeze({
  cardId,
  sourceUrl: `https://images.ygoprodeck.com/images/cards_cropped/${cardId}.jpg`,
  motifs: Object.freeze(motifs),
  palette: Object.freeze({ ground: colors[0],stone: colors[1],foliage: colors[2],accent: colors[3],wood: colors[4],foam: colors[5] })
})])));

/** Receive the application's Three namespace and its resource/disposal helpers. */
export function createNatureReferenceGeometry(ctx) {
  const { THREE, profile, root, materials: m, material, geometry, add, block, beam,
    curvedTube, curvedDeck, radialSurface: hostRadialSurface, cylinder, cone, crown, ring } = ctx;
  if (!Object.hasOwn(NATURE_CARD_LANDMARKS, profile.cardId)) return false;
  const customMeshes = [];
  // CylinderGeometry winds its rows as x=sin(angle), z=cos(angle). Our source
  // profiles use x=cos(angle), z=sin(angle), so reverse the angular traversal
  // to keep their exterior faces and lighting normals pointing outwards.
  const radialSurface=(name,mat,vertex,segments,rings,shade)=>{
    const sample=hostRadialSurface(name,mat,(t,a)=>vertex(t,-a),segments,rings,shade?(t,a)=>shade(t,-a):null);
    return (t,a)=>sample(t,-a);
  };
  const remember = mesh => { customMeshes.push(mesh); return mesh; };
  const tube = (name, mat, path, radius, segments = 32) => remember(curvedTube(name,mat,path,
    t => [typeof radius === 'function' ? radius(t) : radius,typeof radius === 'function' ? radius(t) : radius],segments,.04));
  const oval = geometry('nature-oval', () => new THREE.SphereGeometry(1,16,12));
  const leaf = geometry('nature-pointed-leaf', () => {
    const shape = new THREE.BufferGeometry();
    shape.setAttribute('position',new THREE.Float32BufferAttribute([
      0,0,0,-.35,.45,.03,0,1,0,0,0,0,0,1,0,.35,.45,.03,
      0,0,.035,0,1,.035,-.35,.45,.065,0,0,.035,.35,.45,.065,0,1,.035
    ],3)); shape.computeVertexNormals(); return shape;
  });
  const leaves = (name,x,y,z,radius,count = 8,mat = m.leaves) => {
    for(let i=0;i<count;i++) { const a=i*Math.PI*2/count;
      add(name,leaf,mat,[x+Math.sin(a)*radius*.2,y,z+Math.cos(a)*radius*.2],
        [radius*.8,radius,radius*.65],[.48,a,.35*Math.sin(a)]);
    }
  };
  const trunk = (name,x,z,height,radius=.6,mat=m.wood) => {
    tube(name,mat,t=>[x+Math.sin(t*5)*radius*.65,height*t,z+Math.sin(t*2)*radius*.8],t=>radius*(1.4-t*.65));
    for(const side of [-1,1]) tube(`${name}-branch`,mat,
      t=>[x+side*(radius*.3+t*2.8),height*(.53+t*.4),z-t*1.3],t=>radius*(.6-t*.43),20);
  };
  const island = (name,x,y,z,radius,height,mat=m.stone) => {
    const surface=radialSurface(name,mat,(t,a)=>{
      const r=radius*(.2+.8*Math.pow(1-t,.55))*(1+.085*Math.sin(a*5+t*3));
      return [x+Math.cos(a)*r,y-t*height,z+Math.sin(a)*r*.8];
    },32,10);
    remember(root.children.at(-1)); return surface;
  };
  switch(profile.cardId) {
    case '4064256': {
      const red=material('#931423',{emissive:'#66101a',emissiveIntensity:.2});
      for(const side of [-1,1]) {
        trunk('zombie-contorted-face-tree',side*15,-9,16,1.2);
        for(let i=0;i<5;i++) tube('zombie-gnarled-bark-ridge',m.stone,t=>[side*15+Math.sin(t*4+i)*.5,t*15,-9+(i-2)*.35],.11,28);
        add('zombie-tree-hollow-mouth',oval,m.dark,[side*15,9.45,-8],[.8,.66,.1]);
        for(let i=0;i<5;i++) add('zombie-tree-mouth-fang',cone,m.paper,[side*15+(i-2)*.22,9.6-i%2*.1,-7.85],[.11,.45,.11],[0,0,Math.PI]);
        curvedDeck('zombie-red-river',red,t=>[side*(15+Math.sin(t*5)*1.7),-.05,-23+t*33],5,.06,44);
      }
      for(let i=0;i<18;i++) {
        const x=(i%2?1:-1)*(13.5+i%4*2.8),z=-24+Math.floor(i/4)*4;
        block('zombie-tilted-gravestone',m.stone,x,.9+i%3*.1,z,.5,1.8,.18).rotation.z=(i%3-1)*.22;
        block('zombie-gravestone-crossbar',m.stone,x,1.45,z,.95,.25,.2);
      }
      tube('zombie-central-bone-spire',m.paper,t=>[Math.sin(t*13)*.27,2+t*20,-34],t=>.35-t*.2,48);
      for(let i=0;i<8;i++) {
        beam('zombie-spire-vertebra',[-.8,4+i*2,-34],[.75,4.2+i*2,-34],m.paper,.12);
        tube('zombie-cyan-spirit-wisp',m.light,t=>[Math.sin(t*Math.PI*1.4+i)*1.3,4+i*2+t*1.1,-34+Math.cos(t*Math.PI*1.4+i)],.055,20);
      }
      break;
    }
    case '295517': {
      const sea=material('#4995aa',{transparent:true,opacity:.34,roughness:.1,metalness:.2});
      for(const side of [-1,1]) {
        block('legendary-ocean-sea-shelf',sea,side*19,-.1,-3,13,.08,40);
        for(let tier=0;tier<2;tier++) {
          const y=5.5+tier*6.1;
          curvedDeck('legendary-ocean-curved-aqueduct',m.stone,t=>[side*(16+Math.sin(t*Math.PI)*6),y,-34+t*26],1.6,.65,40);
          for(let i=0;i<6;i++) {
            const t=i/5,x=side*(16+Math.sin(t*Math.PI)*6),z=-34+t*26;
            block('legendary-ocean-tall-aqueduct-support',m.stone,x,y/2,z,.9,y,1.1);
            for(let c=0;c<5;c++) block('legendary-ocean-masonry-course',m.wood,x,1+c*2.3,z+.56,.88,.045,.025);
          }
        }
      }
      add('legendary-ocean-round-tower',cylinder,m.stone,[0,6.5,-33],[2.6,13,2.6]);
      for(let i=0;i<14;i++) { const a=i*Math.PI/7;
        block('legendary-ocean-tower-crenellation',m.stone,Math.cos(a)*2.5,13.4,-33+Math.sin(a)*2.5,.6,.8,.6);
      }
      for(let i=0;i<18;i++) block('legendary-ocean-central-stair',m.stone,0,.17+i*.21,-24.5-i*.34,8.7,.3,.36);
      for(const side of [-1,1]) beam('legendary-ocean-stair-balustrade',[side*4.55,.6,-24.3],[side*4.55,4.2,-30.5],m.stone,.18);
      for(let i=0;i<9;i++) beam('legendary-ocean-descending-sunbeam',[(i-4)*1.8,23,-36],[(i-4)*3.6,1,-31+Math.abs(i-4)],m.light,.045);
      break;
    }
    case '78082039': {
      const iris=material('#fbd33b',{emissive:'#a87711',emissiveIntensity:.45});
      for(let i=0;i<7;i++) {
        const a=i*Math.PI/3.5;
        tube('closed-forest-interlaced-branch',m.wood,t=>[Math.cos(a)*(12-t*20),4+Math.sin(a)*7+t*8,-29+Math.sin(t*4+i)*.9],
          t=>1.1-Math.sin(t*Math.PI)*.25,38);
        for(let ridge=0;ridge<2;ridge++) tube('closed-forest-bark-furrow',m.stone,
          t=>[Math.cos(a)*(12-t*20)+ridge*.25,4+Math.sin(a)*7+t*8,-27.85+Math.sin(t*4+i)*.9],.09,38);
      }
      add('closed-forest-yellow-watching-eye',oval,iris,[0,9.5,-31],[4,1.9,.38]);
      add('closed-forest-vertical-slit-pupil',oval,m.dark,[0,9.5,-30.58],[.22,1.45,.15]);
      for(let i=0;i<22;i++) { const a=i*Math.PI*2/22;
        beam('closed-forest-radial-iris-fiber',[Math.cos(a)*3.75,9.5+Math.sin(a)*1.8,-30.55],
          [Math.cos(a)*2.35,9.5+Math.sin(a)*1.3,-30.52],m.light,.035);
      }
      break;
    }
    case '35956022': {
      const water=material('#a979d0',{transparent:true,opacity:.7,roughness:.18});
      const vapour=material('#c5b4e6',{transparent:true,opacity:.58,roughness:.7});
      for(const side of [-1,1]) {
        block('acidic-downpour-purple-puddle',water,side*18,-.18,-5,11,.08,34);
        for(let i=0;i<8;i++) {
          const x=side*(13+i%3*3),z=-22+Math.floor(i/3)*7;
          add('acidic-downpour-puddle-ring',ring,m.paper,[x,-.08,z],[.55+i%3*.24,.55+i%3*.24,1],[-Math.PI/2,0,0]);
          if(i%2===0) tube('acidic-downpour-curling-vapour',vapour,t=>[x+Math.sin(t*8)*.7,.2+t*5,z+Math.sin(t*4)*.3],.08+i*.004,32);
        }
        for(let i=0;i<30;i++) {
          const x=side*(12.5+i%5*2),y=3+Math.floor(i/5)*2.4,z=-27+i%7*4.1;
          beam('acidic-downpour-slanted-rain-streak',[x+.7,y+1.8,z],[x,y,z],m.paper,.017);
        }
        for(let i=0;i<6;i++) add('acidic-downpour-dark-rock-mound',crown,m.stone,
          [side*(15+i%3*2),.6+i%2*.4,-24+Math.floor(i/3)*4],[2.1,1.6,1.5]);
      }
      break;
    }
    case '28120197': {
      const strata=material('#ffffff',{vertexColors:true,roughness:.95});
      let capIndex=0;
      const cliff=(name,x,z,height,rx,rz,phase)=>{
        radialSurface(name,strata,(t,a)=>{
          const r=(1+.12*Math.sin(a*5+phase)+.035*Math.sin(t*70+a*3))*(1+Math.floor(t*7)*.045);
          return [x+Math.cos(a)*rx*r,height*(1-t),z+Math.sin(a)*rz*r];
        },48,30,(t,a)=>{
          const c=new THREE.Color(t<.035?'#ded6c1':Math.floor(t*24)%3===0?'#baa087':'#a4876d');
          c.multiplyScalar(.89+.1*Math.sin(a*3));return [c.r,c.g,c.b];
        });
        const cap=geometry(`canyon-mesa-top-${capIndex++}`,()=>{
          const positions=[x,height+.015,z],indices=[];
          for(let i=0;i<=48;i++) {const a=i*Math.PI*2/48,r=1+.12*Math.sin(a*5+phase)+.035*Math.sin(a*3);
            positions.push(x+Math.cos(a)*rx*r,height+.015,z+Math.sin(a)*rz*r);
            if(i<48) indices.push(0,i+2,i+1);
          }
          const result=new THREE.BufferGeometry();result.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
          result.setIndex(indices);result.computeVertexNormals();return result;
        });
        add('canyon-flat-topped-mesa-surface',cap,m.paper,[0,0,0]).castShadow=false;
      };
      for(const side of [-1,1]) {
        cliff('canyon-flat-topped-stratified-mesa',side*21,-20,12,6,9,side);
        cliff('canyon-lower-layered-terrace',side*21,4,4,5.5,7,side+2);
      }
      cliff('canyon-distant-plateau',0,-37,7,12,4,3);
      break;
    }
    case '712559': {
      const thatch=material('#b99e58',{roughness:1});
      for(const side of [-1,1]) {
        const x=side*17,z=-20;
        for(const dx of [-2.2,2.2]) for(const dz of [-2,2]) add('amazoness-raised-hut-stilt',cylinder,m.wood,[x+dx,1.6,z+dz],[.12,3.2,.12]);
        block('amazoness-hut-raised-floor',m.wood,x,2.5,z,5.2,.3,4.8);
        block('amazoness-hut-wall',thatch,x,4.2,z,4.6,3.2,4);
        block('amazoness-hut-dark-doorway',m.dark,x,3.8,z+2.02,1.25,2.3,.035);
        add('amazoness-conical-thatched-roof',cone,thatch,[x,6.7,z],[4.1,2.8,3.5]);
        for(let i=0;i<16;i++) { const a=i*Math.PI/8;
          beam('amazoness-thatch-roof-fiber',[x+Math.cos(a)*3.8,5.37,z+Math.sin(a)*3.15],[x,8,z],m.wood,.025);
        }
        for(let i=0;i<5;i++) block('amazoness-hut-access-step',m.wood,x,.4+i*.42,z+4.5-i*.36,1.8,.15,.42);
        for(let i=0;i<14;i++) add('amazoness-narrow-palisade',cylinder,m.wood,[side*(12+i*.62),3.5+i%3*.17,-27],[.105,7+i%3*.34,.105]);
        for(let i=0;i<4;i++) leaves('amazoness-long-pointed-jungle-leaf',side*(14+i*3),5+i%2*3,-9+i*6,3.5,6);
      }
      break;
    }
    case '15854426': {
      const spectrum=material('#ffffff',{vertexColors:true,emissive:'#ffffff',emissiveIntensity:.13,side:THREE.DoubleSide});
      const colors=['#ff9abb','#ffb676','#fff370','#a3e280','#a2d3fa','#c5a0ee'].map(c=>new THREE.Color(c));
      const ribbon=geometry('mist-valley-continuous-spectrum',()=>{
        const positions=[],shades=[],indices=[];
        for(let row=0;row<=48;row++) {const t=row/48;for(let band=0;band<=6;band++) {
          positions.push(-16+t*32,1+t*17+Math.sin(t*Math.PI)*1.3+(band-3)*.55,-31+Math.sin(t*4)*1.8+(band-3)*.035);
          const c=colors[Math.min(5,band)];shades.push(c.r,c.g,c.b);
        }}
        for(let row=0;row<48;row++) for(let band=0;band<6;band++) {const p=row*7+band;indices.push(p,p+7,p+1,p+1,p+7,p+8);}
        const shape=new THREE.BufferGeometry();shape.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
        shape.setAttribute('color',new THREE.Float32BufferAttribute(shades,3));shape.setIndex(indices);shape.computeVertexNormals();return shape;
      });
      add('mist-valley-continuous-rainbow-ribbon',ribbon,spectrum,[0,0,0]);
      const crag=geometry('mist-valley-faceted-blue-wall',()=>{
        const positions=[],indices=[];
        for(let row=0;row<=16;row++) for(let column=0;column<=24;column++) {
          const x=-20+column*40/24,y=1+row*23/16;
          positions.push(x,y+.45*Math.sin(column*2.1+row*.8),-35-1.4*Math.sin(column*1.8)-.7*Math.sin(row*1.1+column));
        }
        for(let row=0;row<16;row++) for(let column=0;column<24;column++) {
          const p=row*25+column;indices.push(p,p+1,p+25,p+1,p+26,p+25);
        }
        const shape=new THREE.BufferGeometry();shape.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
        shape.setIndex(indices);shape.computeVertexNormals();return shape;
      });
      add('mist-valley-blue-crag-wall',crag,m.stone,[0,0,0]);
      const orb=material('#c9ef70',{emissive:'#b7ee67',emissiveIntensity:.8});
      for(let i=0;i<11;i++) add('mist-valley-yellow-green-light-orb',oval,orb,[(i%6-2.5)*5.5,4+Math.floor(i/6)*10+i%3,-27],
        [.35+i%3*.24,.35+i%3*.24,.35+i%3*.24]);
      break;
    }
    case '37322745': {
      for(let i=0;i<7;i++) {
        const x=(i%2?-1:1)*(14+i%3*3.2),y=5+i%3*3.7,z=-25+Math.floor(i/3)*6;
        island('naturia-floating-pale-rock-island',x,y,z,2+i%2*.5,3.5);
        add('naturia-floating-island-green-crown',crown,m.leaves,[x,y+.8,z],[1.8,1.5,1.7]);
        tube('naturia-floating-island-curled-vine',m.leaves,t=>[x+Math.cos(t*7)*(.9-t*.7),y+.4+t*2,z+Math.sin(t*7)*(.9-t*.7)],.085,28);
      }
      trunk('naturia-right-framing-tree',22,-6,13,.8);leaves('naturia-right-framing-tree-leaf',23,10,-7,4,9);
      for(let i=0;i<14;i++) add('naturia-pastel-floating-light',oval,i%2?m.light:m.paper,
        [(i%2?-1:1)*(12+i%4*2.7),3+i%5*2,-24+Math.floor(i/5)*7],[.24,.24,.24]);
      break;
    }
    case '70222318': {
      const snow=material('#ffffff',{vertexColors:true,roughness:.9});
      radialSurface('sylvania-wide-snowcapped-peak',snow,(t,a)=>{
        const r=.5+Math.pow(t,.8)*15*(1+.14*Math.sin(a*5)+.04*Math.sin(a*13+t*5));
        return [Math.cos(a)*r,17*(1-t),-34+Math.sin(a)*r*.55];
      },64,32,(t,a)=>{
        const c=new THREE.Color(t<.45+.11*Math.sin(a*7)?'#eff7fb':'#8ca4b3');
        c.multiplyScalar(.77+.21*(Math.cos(a-1.5)+1)/2);return [c.r,c.g,c.b];
      });
      for(const side of [-1,1]) {
        for(let i=0;i<6;i++) add('sylvania-layered-forest-valley',crown,m.leaves,[side*(15+i%2*6),2+i%2,-22+Math.floor(i/2)*11],[4,3,5]);
        for(let i=0;i<4;i++) {
          const x=side*(15+i%2*5),z=-23+Math.floor(i/2)*12,height=4+i%2;
          trunk('sylvania-valley-branched-tree',x,z,height,.2);
          for(let layer=0;layer<3;layer++) add('sylvania-valley-tree-crown',crown,m.leaves,
            [x+(layer-1)*.6,height*.65+layer*.35,z],[1.15,1.1,1]);
        }
        curvedDeck('sylvania-narrow-blue-stream',m.water,t=>[side*(17+Math.sin(t*5)*2),.4,-24+t*27],1.1,.08,40);
        block('sylvania-foreground-waterfall',m.water,side*18,-1.6,10,1.1,4,.08);
        for(let i=0;i<4;i++) beam('sylvania-white-waterfall-thread',[side*18+(i-1.5)*.25,.45,10.08],[side*18+(i-1.5)*.25,-3.6,10.08],m.paper,.025);
      }
      break;
    }
    case '54306223': {
      const swamp=material('#66313f',{roughness:.16,metalness:.2,transparent:true,opacity:.88});
      for(const side of [-1,1]) {
        block('venom-red-brown-swamp-water',swamp,side*18,-.17,-5,12,.1,36);
        for(let i=0;i<3;i++) {
          const x=side*(15+i*4),z=-22+i*9;
          trunk('venom-mossy-broken-trunk',x,z,5+i*2,.65,m.stone);
          for(let j=0;j<3;j++) tube('venom-exposed-tree-root',m.stone,t=>[x+(j-1)*t*1.8,.12+Math.pow(1-t,2)*2,z+t*(j%2?2:-2)],t=>.36-t*.25,24);
          tube('venom-drooping-moss-vine',m.leaves,t=>[x+1.9+Math.sin(t*3)*.15,5-t*3.5,z],.055,24);
          leaves('venom-sharp-swamp-reed',x+1,.1,z+3,2,7);
        }
        for(let i=0;i<8;i++) add('venom-floating-lily-pad',cylinder,m.leaves,[side*(13.5+i%3*3.1),-.07,-23+Math.floor(i/3)*9],
          [.45+i%2*.25,.025,.36+i%2*.2]);
        for(let i=0;i<4;i++) tube('venom-submerged-pale-bone',m.paper,t=>[side*16+t*2,.12+Math.sin(t*Math.PI)*.8,-6+i*2.3],.12,20);
      }
      break;
    }
    case '7142724': {
      const ice=material('#d7edeb',{transparent:true,opacity:.78,roughness:.2});
      for(const side of [-1,1]) {
        const x=side*20;
        for(let tier=0;tier<3;tier++) {
          const y=1+tier*3.1,z=-15-tier*5.3,r=5.1-tier*1.15;
          add('icejade-round-cenote-tier',cylinder,m.stone,[x,y-.6,z],[r,1.2,r]);
          add('icejade-overflowing-water-tier',cylinder,m.water,[x,y+.07,z],[r*.98,.045,r*.98]);
          for(let i=0;i<7;i++) {const a=i*Math.PI*2/7;
            beam('icejade-white-cascade',[x+Math.cos(a)*r,y,z+Math.sin(a)*r],[x+Math.cos(a)*r,y-3,z+Math.sin(a)*r],ice,.045);
          }
          add('icejade-water-orbit',ring,m.light,[x,y+.12,z],[r*.65,r*.65,r*.65],[-Math.PI/2,0,0]);
        }
        for(let i=0;i<2;i++) {
          const z=-27+i*15,y=15-i*2;
          island('icejade-floating-inverted-cone',x+i*3,y,z,2.4,5);
          add('icejade-floating-island-white-cap',cylinder,ice,[x+i*3,y+.16,z],[2.3,.45,2]);
          for(let j=0;j<5;j++) tube('icejade-purple-hanging-plant',m.leaves,t=>[x+i*3+(j-2)*.6+Math.sin(t*16)*.22,y-.3-t*5,z+2.4],.11,36);
        }
        for(let i=0;i<9;i++) add('icejade-turquoise-engraved-glyph',ring,m.light,[side*14.75,.4+Math.floor(i/3)*.8,-23+i%3*8],[.32,.6,.32],[0,side*Math.PI/2,0]);
      }
      break;
    }
    case '17000165': {
      const violet=material('#bc72dd',{emissive:'#9143b7',emissiveIntensity:.4});
      const paths=[
        [[-20,4],[-11,4],[-11,8],[3,8],[3,14],[21,14]],
        [[-20,11],[-15,11],[-15,17],[-3,17],[-3,22],[19,22]],
        [[-21,20],[-10,20],[-10,24],[9,24]],
        [[-5,2],[15,2],[15,7],[21,7]]
      ];
      for(const path of paths) for(let i=1;i<path.length;i++) {
        const [ax,ay]=path[i-1],[bx,by]=path[i];
        beam('reptilianne-violet-maze-outline',[ax,ay,-32],[bx,by,-32],violet,.32).castShadow=false;
        beam('reptilianne-black-inset-labyrinth',[ax,ay,-31.78],[bx,by,-31.78],m.dark,.2).castShadow=false;
      }
      for(let i=0;i<12;i++) {const a=i*Math.PI/6;
        tube('reptilianne-branching-cyan-lightning',m.light,t=>[-7+Math.cos(a)*t*7+Math.sin(t*19)*.14,15+Math.sin(a)*t*6+Math.cos(t*13)*.1,-29],.043,32);
      }
      tube('reptilianne-central-cyan-convergence',m.light,t=>[-7+t*16+Math.sin(t*37)*.13,15-t*13,-28],t=>.11+t*.15,56);
      break;
    }
    case '88288421': {
      const beach=material('#d6c98e',{roughness:1});
      const ocean=material('#3f9dbb',{roughness:.15,metalness:.25});
      for(const side of [-1,1]) {
        block('field-power-surrounding-blue-sea',ocean,side*23,-.7,-8,20,.08,36);
        island('field-power-raised-coastal-island',side*22,1,-10,8.5,2.3);
        add('field-power-pale-sandy-shore',cylinder,beach,[side*22,1.06,-10],[8.4,.12,6.3]);
        for(let i=0;i<6;i++) {
          const x=side*(16+i%3*3.8),z=-23+Math.floor(i/3)*17;
          add('field-power-sharp-green-mountain-chain',cone,m.stone,[x,3+i%2,z],[2.5,5+i%2*2,3.1]);
          for(let j=0;j<4;j++) add('field-power-dense-green-forest-patch',crown,m.leaves,
            [x+(j%2-.5)*2,1.7,z+4+Math.floor(j/2)*1.5],[1.1,.85,1.2]);
        }
        for(let i=0;i<7;i++) add('field-power-white-shoreline-foam',ring,m.paper,
          [side*22,1.11,-10],[7.6+i*.12,5.7+i*.1,1],[-Math.PI/2,0,0]);
      }
      const cx=-16,cz=9;
      add('field-power-compass-outer-ring',ring,m.wood,[cx,1.4,cz],[2.5,2.5,2.5],[-Math.PI/2,0,0]);
      for(let i=0;i<8;i++) {
        const a=i*Math.PI/4;
        add('field-power-compass-direction',cone,i%2?m.paper:m.light,[cx+Math.cos(a)*1.2,1.45,cz+Math.sin(a)*1.2],
          [.25,2,.12],[Math.PI/2,0,a+Math.PI/2]);
      }
      break;
    }
    case '33700664': {
      const lava=material('#ee3749',{emissive:'#ff2339',emissiveIntensity:1});
      const magenta=material('#e88ac6',{emissive:'#d469b4',emissiveIntensity:.65});
      const cyan=material('#69daed',{emissive:'#55ccee',emissiveIntensity:.6});
      for(let i=0;i<6;i++) add('valvols-dark-storm-cloud',crown,m.dark,[(i-2.5)*6.7,19+i%2*2,-37],[5,2.8,2.4]);
      for(let i=0;i<3;i++) tube('valvols-white-forked-lightning',m.paper,
        t=>[-14+i*8+Math.sin(t*31+i)*.55,22-t*17,-31],.05,56);
      for(let i=0;i<8;i++) beam('valvols-lightning-secondary-fork',[-14+i%3*8,7+i*1.4,-31],
        [-12+i%3*8+(i%2?-3:2),5+i*1.4,-31],m.paper,.032);
      for(let i=0;i<2;i++) {
        const x=13+i*7,z=-28+i*10,height=9-i*3;
        const surface=radialSurface('valvols-red-erupting-volcano',m.stone,(t,a)=>{
          const r=.4+t*5.1*(1+.06*Math.sin(a*7)); return [x+Math.cos(a)*r,height*(1-t),z+Math.sin(a)*r*.8];
        },40,20);
        for(let j=0;j<4;j++) tube('valvols-branching-red-lava',lava,t=>{
          const p=surface(.02+t*.65,j*Math.PI/2+.12*Math.sin(t*8));return p.point.clone().addScaledVector(p.normal,.075).toArray();
        },.055,40);
        add('valvols-red-crater-glow',oval,lava,[x,height+.4,z],[.55,.55,.55]);
      }
      for(const [x,y,z,mat] of [[-19,5,-20,cyan],[18,3,-4,magenta]]) {
        tube('valvols-colored-energy-vortex',mat,t=>[x+Math.cos(t*Math.PI*5)*(2.7-t*2),y+t*3,
          z+Math.sin(t*Math.PI*5)*(2.7-t*2)],.14,64);
        add('valvols-floating-energy-triangle',cone,mat,[x,y+2,z],[.8,1.2,.8],[.3,0,.65]);
      }
      for(const side of [-1,1]) for(let i=0;i<3;i++) {
        const x=side*(15+i*4),z=-2+i*6;
        tube('valvols-bare-foreground-tree',m.wood,t=>[x+Math.sin(t*4)*.25,t*5,z],.09,24);
        for(const b of [-1,1]) beam('valvols-bare-tree-branch',[x,2.7,z],[x+b*1.4,4.4,z-.3],m.wood,.05);
      }
      break;
    }
  }
  mergeRepeatedCustomMeshes(THREE,root,customMeshes,geometry,add,profile.cardId);
  return true;
}

/**
 * Curved silhouettes share a draw when name, material and peripheral region
 * match. Separate left/right/horizon bounds keep corridor checks meaningful.
 * Original buffers stay in the host's disposal cache; no second Three import.
 */
function mergeRepeatedCustomMeshes(THREE,root,meshes,geometry,add,cardId) {
  const groups=new Map();
  for(const mesh of meshes) {
    mesh.updateMatrix(); mesh.geometry.computeBoundingBox();
    const bounds=mesh.geometry.boundingBox.clone().applyMatrix4(mesh.matrix);
    const region=bounds.max.z<-18?'horizon':bounds.max.x<-9?'left':bounds.min.x>9?'right':'other';
    const key=`${mesh.name}:${mesh.material.uuid}:${region}`;
    if(!groups.has(key)) groups.set(key,[]); groups.get(key).push(mesh);
  }
  root.userData.referencePrimitiveCount=root.children.filter(mesh=>mesh.isMesh).length;
  let groupIndex=0;
  for(const sources of groups.values()) {
    if(sources.length<2) continue;
    const shape=geometry(`nature-combined-${cardId}-${groupIndex++}`,()=>{
      const positions=[],normals=[],indices=[]; let offset=0;
      for(const mesh of sources) {
        const p=mesh.geometry.attributes.position,n=mesh.geometry.attributes.normal;
        const normalMatrix=new THREE.Matrix3().getNormalMatrix(mesh.matrix);
        for(let i=0;i<p.count;i++) {
          const v=new THREE.Vector3().fromBufferAttribute(p,i).applyMatrix4(mesh.matrix);
          const normal=new THREE.Vector3().fromBufferAttribute(n,i).applyMatrix3(normalMatrix).normalize();
          positions.push(v.x,v.y,v.z);normals.push(normal.x,normal.y,normal.z);
        }
        const index=mesh.geometry.index;
        for(let i=0;i<(index?.count??p.count);i++) indices.push(offset+(index?index.getX(i):i));
        offset+=p.count;
      }
      const result=new THREE.BufferGeometry();
      result.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
      result.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));result.setIndex(indices);
      result.userData.referencePrimitiveCount=sources.length;
      result.userData.continuousCurves=sources.map(mesh=>mesh.geometry.userData.continuousCurve).filter(Boolean);
      return result;
    });
    for(const mesh of sources) root.remove(mesh);
    const merged=add(sources[0].name,shape,sources[0].material,[0,0,0]);
    merged.castShadow=sources.some(mesh=>mesh.castShadow);
  }
}
