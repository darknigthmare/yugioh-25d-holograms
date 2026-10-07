/** Static scenery derived from individually opened, preserved card artwork.
 * Illustrated characters remain in the backdrop. Volumes are adapted to the
 * peripheral duel space, rather than claiming an exact perspective match.
 */
export const URBAN_CARD_LANDMARKS = Object.freeze({
  '75041269': 'clock-prison-two-faced-turret',
  '72283691': 'stromberg-golden-gables',
  '39910367': 'endymion-ribboned-citadel',
  '80921533': 'emperor-twin-obelisk-brazier',
  '24382602': 'white-mausoleum-cyan-colonnade',
  '34487429': 'rainbow-ruins-curved-stone-stands',
  '56111151': 'kyoutou-golden-observation-tower',
  '19814508': 'ua-stadium-golden-crescent',
  '12931061': 'ua-hyper-stadium-radiant-bowl',
  '77297908': 'abyss-playhouse-heart-marquee',
  '33773528': 'amazement-park-wheel-and-spire',
  '99543666': 'despia-flared-ribbed-theater',
  '65589010': 'dogmatika-nation-gothic-horizon',
  '95658967': 'ritual-sanctuary-golden-display'
});

export const URBAN_INSPECTED_ART_PROFILES = Object.freeze(Object.fromEntries([
  ['75041269', ['#333550','#607194','#31364c','#d8bd63','#252b47','#c6cbed'], ['two large perpendicular gold-rimmed clock faces','blue square tower with pointed corner turrets','horizontal masonry bands and small black arch windows']],
  ['72283691', ['#af8c29','#edca45','#7d701d','#fff0a1','#80612b','#fff5bc'], ['gold cylinder turrets with tall conical roofs and finials','central pointed gable and rows of narrow arched windows','deep pointed entrance above a broad gold stairway']],
  ['39910367', ['#778f78','#c8c6aa','#608065','#ffbcec','#a86e64','#eeedda'], ['central tall round tower with circular medallions','white town with red roofs and blue conical satellite turrets','several pink inscribed spiral ribbons and thin blue orbit rings']],
  ['80921533', ['#936c42','#d6a659','#3e4b3c','#ffc338','#a56837','#ffe794'], ['two tall orange obelisks with pointed tops','central round stone brazier with a large flame','two broad rising stair flights and sloped stone flanks']],
  ['24382602', ['#6f9da9','#dcebf0','#8eb3c5','#c5f7ff','#777e9a','#f6ffff'], ['very tall pale columns with thin cyan vertical light','round column capitals and blue recessed channels','layered white curved monument at right; illustrated figures stay in the source']],
  ['34487429', ['#bba378','#c0aa7f','#67815e','#99deee','#887044','#ece0bc'], ['curved stone amphitheater terraces with narrow stair aisles','four worn ochre pillars with carved bands','diagonal rainbow rising above the pillars']],
  ['56111151', ['#536d75','#a9b6b2','#355d77','#e3e8b9','#955154','#e9eee2'], ['thin blue tower shaft framed by gold horizontal rings and diagonal braces','wide round observation gallery with a shallow gold dome','red pointed lantern cap above a dense gray coastal city']],
  ['19814508', ['#255446','#3f515d','#254d2b','#a4f8ff','#15232b','#eafaff'], ['green sports field inside a dark oval stadium','gold-trimmed angular crescent shell with a red round emblem','floating cyan circular display and crossed searchlights']],
  ['12931061', ['#314e64','#83999c','#295364','#8fffff','#39364e','#e0fcff'], ['deep oval bowl lined with many concentric cyan lights','large diagonal dark panels bordered in gold','floating central projector and cyan windows beneath the stands']],
  ['77297908', ['#654134','#a26442','#402651','#ff96db','#9a3535','#ffef9a'], ['red theater facade with three glowing arch windows','two giant round eye ornaments and a pink heart sign','cream marquee and dense rows of warm round bulbs']],
  ['33773528', ['#c7b379','#f0e6cb','#93ba74','#92dffa','#b74a48','#fff5b1'], ['yellow wheel with colored suspended cabins at lower left','tall tapered white central spire with stacked cylindrical tiers','red round ride and angular striped hall amid curved paths']],
  ['99543666', ['#735052','#3c293e','#4b2944','#f06585','#942c3d','#ebc26e'], ['tall dark theater broken open around its central faceted column','gold outlined diamonds and red circular gems','ribbed red flared trumpet turrets with black needle points']],
  ['65589010', ['#5d5b86','#8584ad','#5a5c91','#ffdaad','#645c82','#dddce9'], ['dense layers of violet walled towers with thin needle roofs','white gold cathedral crown above a distant citadel','long narrow gothic windows beneath a warm orange sky']],
  ['95658967', ['#8a4862','#d8b45d','#814447','#ffaccb','#a66b44','#ffe6f0'], ['shallow oval gold display plinth beneath wedding figurines','wide magenta pink spotlight behind the figures','small tilted colored confetti rectangles; no temple is depicted']]
].map(([cardId, colors, motifs]) => [cardId, Object.freeze({
  cardId,
  sourceUrl: `https://images.ygoprodeck.com/images/cards_cropped/${cardId}.jpg`,
  motifs: Object.freeze(motifs),
  palette: Object.freeze({ ground: colors[0], stone: colors[1], foliage: colors[2], accent: colors[3], wood: colors[4], foam: colors[5] })
})])));

/** Uses only the owning factory's bounded Three namespace and resource helpers. */
export function createUrbanReferenceGeometry(ctx) {
  const { THREE, profile, root, materials: m, material, geometry, add, block, beam,
    box, cylinder, cone, ring, crown, rock } = ctx;
  if (!Object.hasOwn(URBAN_CARD_LANDMARKS, profile.cardId)) return false;
  const sphere = geometry('urban-sphere', () => new THREE.SphereGeometry(1,16,12));
  const pyramid = geometry('urban-square-pyramid', () => new THREE.ConeGeometry(1,1,4));
  const gable = geometry('urban-pitched-gable', () => {
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
    const shape=geometry(`urban-${name}`,()=>{
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
    const shape=geometry(`urban-${name}`,()=>{const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();g.userData.terraceCount=tiers;return g;});
    return add(name,shape,mat,[0,0,0]);
  };
  switch(profile.cardId) {
    case '75041269': {
      block('clock-prison-square-tower',m.stone,0,11,-33,11,22,10);
      for(const x of [-5.7,5.7]) for(const z of [-38,-28]) {
        turret('clock-prison-corner-turret',x,z,24,1.15,m.stone,m.wood);
        for(let y=3;y<21;y+=3) add('clock-prison-pillar-band',cylinder,m.gold,[x,y,z],[1.19,.22,1.19]);
      }
      roof('clock-prison-steep-main-gable',m.wood,0,23.5,-33,11,7,10);
      for(const [x,y,z,rotation] of [[0,14,-27.85,[Math.PI/2,0,0]],[5.65,14,-33,[0,0,Math.PI/2]]]) {
        const front=rotation[0]!==0;
        add('clock-prison-dial',cylinder,m.paper,[x,y,z],[4.15,.16,4.15],rotation);
        add('clock-prison-gold-dial-rim',ring,m.gold,[x+(front?0:.14),y,z+(front?.14:0)],[4.25,4.25,4.25],front?[0,0,0]:[0,Math.PI/2,0]);
        for(let i=0;i<12;i++) {const a=i*Math.PI/6;
          const point=front?[x+Math.sin(a)*3.5,y+Math.cos(a)*3.5,z+.25]:[x+.25,y+Math.cos(a)*3.5,z+Math.sin(a)*3.5];
          add('clock-prison-gold-hour-mark',box,m.gold,point,front?[.16,.6,.12]:[.12,.6,.16],front?[0,0,-a]:[a,0,0]);
        }
        const center=front?[x,y,z+.35]:[x+.35,y,z];
        for(const [a,length] of [[-.9,2.9],[2.15,2]]) {
          const end=front?[x+Math.sin(a)*length,y+Math.cos(a)*length,z+.35]:[x+.35,y+Math.cos(a)*length,z+Math.sin(a)*length];
          beam('clock-prison-gold-clock-hand',center,end,m.gold,.13);
          add('clock-prison-diamond-hand-tip',crown,m.gold,end,[.23,.33,.16]);
        }
      }
      for(let x=-3.8;x<=3.8;x+=1.9) gothic('clock-prison-black-arch-window',m.dark,x,20.5,-27.9,.65,1.3);
      for(let y=3;y<22;y+=3) block('clock-prison-masonry-course',m.wood,0,y,-27.88,10.7,.16,.2);
      break;
    }
    case '72283691': {
      block('stromberg-gold-palace',m.stone,0,6,-33,19,12,9);
      roof('stromberg-central-pointed-gable',m.gold,0,12,-33,9,6.5,9.5);
      turret('stromberg-central-round-keep',0,-39,24,3.2,m.stone,m.gold);
      for(const [x,z,h,r] of [[-9,-33,17,1.7],[9,-33,17,1.7],[-14,-37,20,1.5],[14,-37,20,1.5]]) turret('stromberg-gold-turret',x,z,h,r,m.stone,m.gold);
      gothic('stromberg-deep-pointed-gateway',m.dark,0,4,-28.38,3,5,.25);
      for(const y of [7.5,10.5]) for(const x of [-7,-4.5,4.5,7]) gothic('stromberg-narrow-arch-window',m.wood,x,y,-28.35,.65,1.35);
      for(let i=0;i<7;i++) block('stromberg-broad-ascending-stair',m.stone,0,.16+i*.35,-20.4-i,9,.32,1.1);
      for(const x of [-6,6]) {
        add('stromberg-front-round-battlement',cylinder,m.stone,[x,3.3,-26],[2.1,6.6,2.1]);
        for(let i=0;i<8;i++) {const a=i*Math.PI/4;block('stromberg-crenellation',m.stone,x+Math.cos(a)*1.8,7,-26+Math.sin(a)*1.8,.65,.8,.65);}
      }
      break;
    }
    case '39910367': {
      const blue=material('#4889bd',{roughness:.6});
      add('endymion-central-round-citadel',cylinder,m.stone,[0,13,-34],[3.6,26,3.6]);
      add('endymion-central-blue-cone',cone,blue,[0,28,-34],[4.2,6,4.2]);
      for(let i=0;i<8;i++) {const a=i*Math.PI/4;
        add('endymion-circular-medallion',sphere,i%2?m.wood:m.leaves,[Math.cos(a)*3.65,17,-34+Math.sin(a)*3.65],[.75,.75,.2],[0,Math.PI/2-a,0]);
      }
      for(const y of [8,12]) for(let i=0;i<5;i++) {
        const a=.2*Math.PI+i*.15*Math.PI;
        gothic('endymion-tower-inset-arch-window',m.dark,Math.cos(a)*3.65,y,-34+Math.sin(a)*3.65,.65,1.7,.14,Math.PI/2-a);
      }
      for(const [x,z,h] of [[-9,-34,13],[9,-34,15],[-5.5,-41,18],[6,-42,16]]) turret('endymion-blue-satellite',x,z,h,1.3,m.stone,blue);
      for(let i=0;i<9;i++) {
        const x=(i%3-1)*6.2,z=-28-Math.floor(i/3)*5,h=2.6+(i%3)*.6;
        if(x===0&&z<-30) continue;
        block('endymion-small-town-house',m.paper,x,h*.5,z,3.2,h,2.6);
        roof('endymion-red-town-gable',m.wood,x,h,z,3.8,1.8,3);
        block('endymion-town-dark-window',m.dark,x,h*.6,z+1.35,.55,.8,.08);
      }
      paths('endymion-continuous-pink-inscribed-spirals',m.light,[0,1].map(i=>({path:t=>{
        const r=11.4-t*6.9,a=t*Math.PI*4+i*Math.PI;return [Math.cos(a)*r,6+t*19,-34+Math.sin(a)*r];},radius:.18})),96);
      paths('endymion-thin-blue-orbits',blue,[8,15,22].map((y,i)=>({path:t=>[Math.cos(t*Math.PI*2)*(11-i*2.5),y+Math.sin(t*Math.PI*2)*1.5,-34+Math.sin(t*Math.PI*2)*(8-i*1.5)],radius:.065})),64);
      const strokes=[];
      for(let i=0;i<30;i++) {const t=i/30,a=t*Math.PI*4,r=11.4-t*6.9,x=Math.cos(a)*r,z=-34+Math.sin(a)*r,y=6+t*19;
        strokes.push({path:u=>[x+.2*(u-.5)*Math.cos(a),y+.3*u,z+.2*(u-.5)*Math.sin(a)],radius:.028});}
      paths('endymion-abstract-ribbon-inscription-strokes',m.paper,strokes,2,4);
      break;
    }
    case '80921533': {
      const flame=material('#ffac20',{emissive:'#f5750d',emissiveIntensity:.75,roughness:.45});
      for(const x of [-5,5]) {
        block('emperor-orange-square-obelisk',m.stone,x,9,-34,2.8,18,2.8);
        add('emperor-obelisk-pyramid-cap',pyramid,m.stone,[x,19.4,-34],[2,2.8,2],[0,Math.PI/4,0]);
        block('emperor-obelisk-shadow-inset',m.wood,x,9.5,-32.55,.55,13,.1);
      }
      add('emperor-round-stone-brazier',cylinder,m.stone,[0,6,-32],[3,1.2,3]);
      add('emperor-brazier-stem',cylinder,m.wood,[0,4.7,-32],[.85,2.1,.85]);
      add('emperor-brazier-burning-bowl',cylinder,flame,[0,6.7,-32],[2.6,.3,2.6]);
      paths('emperor-large-curling-flame',flame,[-1,0,1].map((side,i)=>({path:t=>[side*(1-t)*1.1+Math.sin(t*5+i)*.45,6.8+t*(5.4-i*.7),-32+Math.sin(t*4+i)*.35],radius:t=>(1-t)*(.6-i*.1)+.025})),28);
      for(let i=0;i<11;i++) {
        const upper=i>5;
        block(upper?'emperor-upper-stair-flight':'emperor-lower-stair-flight',m.stone,0,.2+i*.48,-20.1-i,8.8,.4,1.1);
      }
      const flank=geometry('urban-emperor-sloped-solid-flank',()=>{
        const p=[[-.5,0,.5],[-.5,0,-.5],[-.5,1,-.5],[.5,0,.5],[.5,0,-.5],[.5,1,-.5]],triangles=[[0,1,2],[3,5,4],[0,3,4],[0,4,1],[1,4,5],[1,5,2],[0,2,5],[0,5,3]];
        const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(triangles.flatMap(t=>[t[0],t[2],t[1]].flatMap(i=>p[i])),3));g.computeVertexNormals();return g;
      });
      for(const x of [-5.3,5.3]) add('emperor-sloped-stair-flank',flank,m.wood,[x,0,-26],[1.6,5.6,10]);
      break;
    }
    case '24382602': {
      const purple=material('#75658e',{roughness:.45});
      for(const x of [-14,-7,0,7,14]) {
        add('white-mausoleum-tall-pale-column',cylinder,m.stone,[x,13,-35],[1.05,26,1.05]);
        for(const y of [1,24.8,25.8]) add('white-mausoleum-round-capital',cylinder,m.paper,[x,y,-35],[1.45,.5,1.45]);
        block('white-mausoleum-blue-recessed-channel',m.ground,x,13,-33.9,.25,22,.1);
        beam('white-mausoleum-cyan-vertical-light',[x-.45,2,-33.8],[x-.45,24,-33.8],m.light,.055);
      }
      for(let i=0;i<4;i++) {
        add('white-mausoleum-layered-curved-monument',cylinder,m.paper,[15,1+i*1.05,-28],[4.5-i*.5,.65,2.7-i*.3]);
        for(let j=0;j<4;j++) {const a=.15*Math.PI+j*.23*Math.PI;add('white-mausoleum-purple-inset-stud',sphere,purple,[15+Math.cos(a)*(4.52-i*.5),1+i*1.05,-28+Math.sin(a)*(2.72-i*.3)],[.24,.28,.1],[0,Math.PI/2-a,0]);}
      }
      break;
    }
    case '34487429': {
      // Real stair aisles divide each curved terrace into four stone sections.
      const positions=[],indices=[],n=22;
      for(let tier=0;tier<7;tier++) for(let section=0;section<4;section++) {
        const from=.08*Math.PI+section*.21*Math.PI+.016,to=from+.19*Math.PI;
        const r=15.4+tier*.9,y=.5+tier*.64,base=positions.length/3;
        for(const [rr,yy] of [[r,y],[r+.85,y],[r+.85,y+.62],[r,y+.62]]) for(let j=0;j<=n;j++) {
          const a=from+(to-from)*j/n;positions.push(Math.cos(a)*rr,yy,-21-Math.sin(a)*rr);
        }
        for(let row=0;row<3;row++) for(let j=0;j<n;j++) {const a=base+row*(n+1)+j,b=a+1,c=a+n+1,d=c+1;indices.push(a,c,b,b,c,d);}
      }
      const terraces=geometry('urban-rainbow-aisled-terraces',()=>{const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();g.userData.terraceCount=7;g.userData.stairAisleCount=3;return g;});
      add('rainbow-ruins-curved-stone-terraces',terraces,m.stone,[0,0,0]);
      for(let aisle=1;aisle<4;aisle++) {const a=.08*Math.PI+aisle*.21*Math.PI;
        for(let i=0;i<14;i++) {const r=15.4+i*.45;add('rainbow-ruins-narrow-stair-aisle',box,m.paper,[Math.cos(a)*r,.4+i*.32,-21-Math.sin(a)*r],[.68,.25,.55],[0,a-Math.PI/2,0]);}
      }
      for(const [x,z] of [[-14,-36],[-6,-41],[5,-41],[14,-36]]) {
        add('rainbow-ruins-worn-ochre-pillar',cylinder,m.stone,[x,9,z],[1.15,18,1.15]);
        for(const y of [1,6,12,17]) add('rainbow-ruins-carved-pillar-band',cylinder,m.wood,[x,y,z],[1.3,.35,1.3]);
      }
      const rainbow=material('#ffffff',{vertexColors:true,roughness:.6,emissive:'#444444',emissiveIntensity:.15});
      paths('rainbow-ruins-seven-colored-physical-arcs',rainbow,['#e96483','#f89e60','#f0d572','#88c182','#65b8d3','#759de2','#ae8fd0'].map((color,i)=>({path:t=>[-17+t*34,16+Math.sin(t*Math.PI)*(12-i*.32),-39+i*.14],radius:.17,color})),56);
      break;
    }
    case '56111151': {
      const blue=material('#528eae',{metalness:.25,roughness:.35}),red=material('#9e4749',{roughness:.65});
      block('kyoutou-thin-blue-tower-shaft',blue,0,10,-35,2.8,20,2.8);
      for(const y of [3,7,11,15,19]) {
        add('kyoutou-gold-horizontal-shaft-ring',cylinder,m.gold,[0,y,-35],[2,.3,2]);
        for(const side of [-1,1]) beam('kyoutou-diagonal-lattice-brace',[side*1.5,y-.1,-33.48],[-side*1.5,y+3.5,-33.48],m.gold,.09);
      }
      add('kyoutou-wide-blue-observation-gallery',cylinder,blue,[0,22,-35],[5.1,3.2,5.1]);
      for(const y of [20.3,23.7]) add('kyoutou-gold-gallery-rim',cylinder,m.gold,[0,y,-35],[5.4,.32,5.4]);
      for(let i=0;i<20;i++) {const a=i*Math.PI/10;beam('kyoutou-gold-gallery-window-stanchion',[Math.cos(a)*5.15,20.5,-35+Math.sin(a)*5.15],[Math.cos(a)*5.15,23.5,-35+Math.sin(a)*5.15],m.gold,.06);}
      const dome=geometry('urban-kyoutou-shallow-dome',()=>new THREE.SphereGeometry(1,24,10,0,Math.PI*2,0,Math.PI/2));
      add('kyoutou-shallow-gold-dome',dome,m.gold,[0,23.7,-35],[5.4,1.4,5.4]);
      block('kyoutou-red-lantern-house',red,0,25.8,-35,1.5,1.6,1.5);
      add('kyoutou-red-pointed-lantern-cap',pyramid,red,[0,27.4,-35],[1.25,1.6,1.25],[0,Math.PI/4,0]);
      add('kyoutou-tiny-gold-finial',cone,m.gold,[0,28.7,-35],[.15,1.1,.15]);
      for(let i=0;i<18;i++) {const side=i%2?1:-1,x=side*(8+i%4*3),z=-25-Math.floor(i/4)*4,h=2.1+i%5*1.1;
        block('kyoutou-gray-coastal-city-building',m.stone,x,h*.5,z,2.4,h,2.6);
        for(let y=1;y<h;y+=1.2) block('kyoutou-building-window-row',m.dark,x,y,z+1.35,1.7,.16,.08);
      }
      break;
    }
    case '19814508': {
      const green=material('#356949',{roughness:.95}),red=material('#ad3c43',{roughness:.55});
      bowl('ua-stadium-dark-oval-grandstands',m.dark,0,-35,13,8.5,.57,5,7);
      add('ua-stadium-green-oval-field',cylinder,green,[0,.1,-35],[7.7,.2,4.8]);
      paths('ua-stadium-field-circuit-markings',m.paper,[{path:t=>{const a=t*Math.PI*2;return [6.1*Math.cos(a),.25,-35+3.4*Math.sin(a)];},radius:.055}],64);
      const positions=[],indices=[],steps=12;
      const shellTop=a=>[16*Math.cos(a),5+Math.max(0,Math.cos(a))*15+Math.max(0,-Math.cos(a))*7,-35+10*Math.sin(a)];
      for(let i=0;i<=steps;i++) {
        const a=i*Math.PI/steps,top=shellTop(a),bottom=[13*Math.cos(a),5,-35+8.5*Math.sin(a)];
        // The pale sloped crescent meets the bowl's outer rim continuously.
        positions.push(...bottom,...top,bottom[0],bottom[1]-.35,bottom[2],top[0],top[1]-.35,top[2]);
      }
      for(let i=0;i<steps;i++) {
        const a=i*4,b=a+4;
        indices.push(a,a+1,b,b,a+1,b+1,a+2,b+2,a+3,b+2,b+3,a+3,a,a+2,a+1,a+1,a+2,a+3,b,b+1,b+2,b+1,b+3,b+2);
      }
      const shell=geometry('urban-ua-asymmetric-sloped-crescent',()=>{
        const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(indices.flatMap((_,i)=>i%3===0?[indices[i],indices[i+2],indices[i+1]]:[]));g.computeVertexNormals();g.userData.rightCrownHeight=20;g.userData.leftCrownHeight=12;return g;
      });
      add('ua-stadium-asymmetric-pale-angular-crescent-shell',shell,m.paper,[0,0,0]);
      paths('ua-stadium-gold-angular-shell-outline',m.gold,[{path:t=>shellTop(t*Math.PI),radius:.15}],48);
      paths('ua-stadium-curved-gold-front-crescent',m.gold,[{path:t=>[13*Math.cos(t*Math.PI),5.2,-35+8.5*Math.sin(t*Math.PI)],radius:.19}],48);
      add('ua-stadium-red-circular-emblem',cylinder,red,[0,5.2,-26.35],[.9,.16,.9],[Math.PI/2,0,0]);
      add('ua-stadium-floating-cyan-display',cylinder,m.light,[0,10,-35],[3.1,.25,1.9]);
      ellipse('ua-stadium-floating-display-outline',m.paper,0,10.2,-35,3.4,2.1,.06);
      for(const side of [-1,1]) beam('ua-stadium-crossed-searchlight',[side*11,4,-33],[-side*7,22,-39],m.light,.13);
      for(let i=0;i<18;i++) {const a=i*Math.PI/17;add('ua-stadium-cyan-shell-edge-bulb',sphere,m.light,[Math.cos(a)*13,5.4,-35+Math.sin(a)*8.5],[.095,.095,.095]);}
      break;
    }
    case '12931061': {
      bowl('ua-hyper-deep-oval-tiered-bowl',m.wood,0,-35,13,8.4,.43,8,9);
      add('ua-hyper-cyan-bowl-aperture',cylinder,m.ground,[0,.08,-35],[5.5,.16,3.55]);
      const lights=[];
      for(let i=0;i<6;i++) lights.push({path:t=>[(6.5+i*1.05)*Math.cos(t*Math.PI*2),1+i*1.3,-35+(4.2+i*.66)*Math.sin(t*Math.PI*2)],radius:.1});
      paths('ua-hyper-six-concentric-cyan-tier-lights',m.light,lights,72);
      for(let i=0;i<44;i++) {const a=i*Math.PI*2/44;add('ua-hyper-dense-white-rim-bulb',sphere,m.paper,[13*Math.cos(a),8.1,-35+8.4*Math.sin(a)],[.1,.1,.1]);}
      for(const [x,z,tilt] of [[-10,-36,.48],[10,-36,-.48]]) {
        add('ua-hyper-diagonal-dark-roof-panel',box,m.dark,[x,12,z],[3.2,1,15],[0,0,tilt]);
        beam('ua-hyper-gold-diagonal-panel-border',[x-1.7,11,-43.5],[x+1.7,13,-28.5],m.gold,.14);
      }
      for(const side of [-1,1]) {
        const x=side*6,angle=side*.28,y=side>0?5:7;
        add('ua-hyper-front-crossing-architectural-arm',box,m.dark,[x,y,-28],[18,.8,2.8],[0,angle,0]);
        const dx=Math.cos(angle)*8.8,dz=-Math.sin(angle)*8.8;
        beam('ua-hyper-front-arm-gold-frame',[x-dx,y+.5,-28-dz+1.2],[x+dx,y+.5,-28+dz+1.2],m.gold,.12);
        beam('ua-hyper-front-arm-cyan-strip',[x-dx,y+.52,-28-dz-.8],[x+dx,y+.52,-28+dz-.8],m.light,.07);
      }
      for(let i=0;i<14;i++) {const a=i*Math.PI/13;block('ua-hyper-cyan-substand-window',m.light,Math.cos(a)*12.5,1.7,-35+Math.sin(a)*8,.55,1.1,.12).rotation.y=Math.PI/2-a;}
      add('ua-hyper-floating-central-projector',cylinder,m.gold,[0,9.5,-35],[1.25,.8,1.25]);
      add('ua-hyper-projector-cyan-aperture',cylinder,m.light,[0,10,-35],[.9,.15,.9]);
      break;
    }
    case '77297908': {
      const purple=material('#604073',{roughness:.7}),red=material('#ba343f',{roughness:.65}),bulb=material('#ffe691',{emissive:'#ffd465',emissiveIntensity:.85});
      block('abyss-playhouse-red-theater-facade',red,0,6,-34,18,12,7);
      roof('abyss-playhouse-purple-triangular-roof',purple,0,12,-34,20,6,8);
      for(const x of [-5,0,5]) gothic('abyss-playhouse-glowing-tall-arch-window',bulb,x,8,-30.38,1.7,4);
      for(const x of [-8.3,8.3]) {
        add('abyss-playhouse-giant-eye-ornament',sphere,m.paper,[x,14.5,-30],[2,2,1.1]);
        add('abyss-playhouse-red-round-pupil',cylinder,red,[x,14.5,-28.85],[.8,.1,.8],[Math.PI/2,0,0]);
      }
      beam('abyss-playhouse-right-eye-cross-horizontal',[7.6,14.5,-28.7],[9,14.5,-28.7],purple,.12);
      beam('abyss-playhouse-right-eye-cross-vertical',[8.3,13.8,-28.7],[8.3,15.2,-28.7],purple,.12);
      paths('abyss-playhouse-pink-heart-sign',m.light,[{path:t=>{const a=t*Math.PI*2;return [Math.pow(Math.sin(a),3)*2,15.5+(13*Math.cos(a)-5*Math.cos(2*a)-2*Math.cos(3*a)-Math.cos(4*a))*.13,-29.5];},radius:.2}],64);
      block('abyss-playhouse-cream-marquee',m.paper,0,4.6,-29.9,15,2,.6);
      // The photographed marquee glyphs are illegible; use raised decorative
      // strokes rather than inventing a readable title absent from the source.
      for(let i=0;i<12;i++) block('abyss-playhouse-unreadable-marquee-glyph',purple,(i-5.5)*.85,4.65,-29.5,.32,.65,.1).rotation.z=(i%3-1)*.15;
      for(let i=0;i<24;i++) add('abyss-playhouse-warm-marquee-bulb',sphere,bulb,[(i%12-5.5)*1.2,i<12?5.65:3.55,-29.45],[.14,.14,.14]);
      gothic('abyss-playhouse-red-pointed-door',m.dark,0,1.6,-30.35,2.3,2.8);
      for(let i=0;i<6;i++) block('abyss-playhouse-wide-front-step',red,0,.15+i*.22,-23-i,7,.25,1.2);
      break;
    }
    case '33773528': {
      const yellow=material('#ebcb66',{roughness:.65}),blue=material('#80c4d1',{roughness:.7});
      block('amazement-green-park-platform',m.leaves,0,-.3,-34,35,.6,21);
      for(let i=0;i<5;i++) add('amazement-white-stacked-central-spire',cylinder,m.paper,[0,2+i*3.4,-36],[3.4-i*.55,3.4,3.4-i*.55]);
      add('amazement-white-central-spire-point',cone,m.paper,[0,20.5,-36],[.9,6,.9]);
      const center=[-11,6.5,-28],radius=5.4;
      add('amazement-yellow-ferris-wheel-rim',ring,yellow,center,[radius,radius,radius]);
      add('amazement-ferris-wheel-hub',cylinder,yellow,center,[.55,.55,.55],[Math.PI/2,0,0]);
      for(let i=0;i<12;i++) {const a=i*Math.PI/6,x=center[0]+Math.sin(a)*radius,y=center[1]+Math.cos(a)*radius;
        beam('amazement-wheel-radial-spoke',center,[x,y,-28],yellow,.065);
        block('amazement-colored-suspended-wheel-cabin',i%3===0?m.wood:i%3===1?blue:m.light,x,y-.5,-27.75,.8,.75,.65);
      }
      for(const side of [-1,1]) beam('amazement-wheel-sloping-support',[-11+side*2.6,0,-27.8],center,yellow,.16);
      add('amazement-low-red-round-ride',cylinder,m.wood,[11,1.5,-28],[3.1,2.8,3.1]);
      add('amazement-round-ride-gold-roof',cone,yellow,[11,3.5,-28],[3.5,1.2,3.5]);
      block('amazement-striped-roof-hall',m.paper,12,2.7,-39,7,5.4,5);
      roof('amazement-angular-hall-gable',m.wood,12,5.4,-39,8,3.2,5.6);
      for(let i=0;i<6;i++) beam('amazement-hall-yellow-roof-stripe',[8.2+i*1.5,5.6,-36.2],[8.2+i*1.5,8.5,-39],yellow,.1);
      paths('amazement-looping-park-paths',yellow,[{path:t=>[-15+t*30,.05,-33+Math.sin(t*Math.PI*2)*3],radius:.32},{path:t=>[8*Math.cos(t*Math.PI*2),.06,-36+6*Math.sin(t*Math.PI*2)],radius:.24}],64);
      break;
    }
    case '99543666': {
      const red=material('#963544',{roughness:.55});
      add('despia-central-faceted-dark-theater',crown,m.stone,[0,13,-35],[4.7,16,4]);
      for(const x of [-7.5,7.5]) block('despia-exposed-black-blade-support',m.dark,x,12,-35,1.1,25,2).rotation.z=x>0?-.16:.16;
      for(let y=4;y<25;y+=5) {
        for(const side of [-1,1]) {beam('despia-gold-diamond-lattice',[-3,y,-30.8],[0,y+side*2.2,-30.8],m.gold,.11);beam('despia-gold-diamond-lattice',[3,y,-30.8],[0,y+side*2.2,-30.8],m.gold,.11);}
        add('despia-red-circular-facade-gem',sphere,red,[0,y,-30.55],[.48,.48,.18]);
      }
      const flared=geometry('urban-despia-ribbed-flared-turret',()=>{
        const g=new THREE.CylinderGeometry(1,.25,1,32,12,true),p=g.attributes.position;
        for(let i=0;i<p.count;i++) {const t=p.getY(i)+.5,a=Math.atan2(p.getZ(i),p.getX(i)),r=.25+.75*Math.pow(t,2.1),rib=1+.09*Math.cos(a*12);p.setXYZ(i,Math.cos(a)*r*rib,p.getY(i),Math.sin(a)*r*rib);}
        g.computeVertexNormals();g.userData.flaredRibCount=12;return g;
      });
      const ribs=[];
      for(const [x,z,h] of [[-9,-36,17],[9,-36,19],[-5,-42,26],[5,-42,24]]) {
        add('despia-flared-ribbed-red-trumpet-turret',flared,red,[x,h*.5,z],[2.3,h,2.3]);
        add('despia-trumpet-gold-collar',cylinder,m.gold,[x,h,z],[2.42,.35,2.42]);
        add('despia-black-needle-turret-tip',cone,m.dark,[x,h+3.5,z],[1,7,1]);
        for(let i=0;i<12;i++) {const a=i*Math.PI/6;ribs.push({path:t=>{const r=(.25+.75*Math.pow(t,2.1))*2.53;return [x+Math.cos(a)*r,t*h,z+Math.sin(a)*r];},radius:.055});}
      }
      paths('despia-twelve-dark-ribs-per-flared-turret',m.dark,ribs,32);
      for(let i=0;i<10;i++) add('despia-jagged-floating-rock',rock,m.dark,[(i%2?1:-1)*(11+i%3*2),1+i%4*2.3,-27-Math.floor(i/3)*5],[1.4+i%2,.9+i%3*.3,1.4],[.2,i*.7,.3]);
      paths('despia-thin-hanging-gold-chains',m.gold,[-1,1].map(side=>({path:t=>[side*(7+Math.sin(t*Math.PI)*2),22-t*17,-32],radius:.045})),48);
      break;
    }
    case '65589010': {
      for(let i=0;i<11;i++) {
        const x=(i%2?1:-1)*(4+Math.floor(i/2)*2.1),z=-28-Math.floor(i/4)*5,h=7+i%4*3;
        block('dogmatika-violet-layered-city-tower',m.stone,x,h*.5,z,2.3,h,2.7);
        add('dogmatika-thin-needle-city-roof',cone,m.wood,[x,h+2.8,z],[1.65,5.6,1.65]);
        gothic('dogmatika-long-narrow-gothic-window',m.dark,x,h*.55,z+1.4,.5,h*.45);
        block('dogmatika-violet-linking-city-wall',m.stone,x+(x>0?-1.3:1.3),2.2,z,2.6,4.4,1.2);
      }
      block('dogmatika-distant-pale-citadel',m.paper,0,15,-43,5,12,4);
      for(const [x,h] of [[-3,25],[-1.6,28],[0,31],[1.6,28],[3,25]]) {
        block('dogmatika-pale-cathedral-needle-shaft',m.paper,x,(h-3+18)*.5,-43,1.1,h-3-18,1.1);
        add('dogmatika-white-gold-cathedral-crown',cone,m.paper,[x,h,-43],[.75,6,.75]);
        add('dogmatika-cathedral-gold-finial',cone,m.gold,[x,h+3.1,-43],[.1,.9,.1]);
      }
      gothic('dogmatika-distant-cathedral-gold-window',m.gold,0,16,-40.9,1.3,6);
      break;
    }
    case '95658967': {
      const rose=material('#dc568e',{emissive:'#9b315b',emissiveIntensity:.35,transparent:true,opacity:.65,side:THREE.DoubleSide});
      for(let i=0;i<3;i++) add('ritual-sanctuary-shallow-golden-oval-plinth',cylinder,m.gold,[0,.25+i*.4,-32],[8.5-i*.55,.38,4.7-i*.3]);
      const spotlight=geometry('urban-ritual-pink-spotlight',()=>{
        const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute([-10,17,-37,10,17,-37,0,1,-37],3));g.computeVertexNormals();return g;
      });
      add('ritual-sanctuary-wide-pink-triangular-spotlight',spotlight,rose,[0,0,0]);
      for(let i=0;i<24;i++) {
        const x=(i%2?1:-1)*(4+i%5*1.7),y=3+Math.floor(i/4)*2.2,z=-36.8+(i%3)*.5;
        add('ritual-sanctuary-tilted-confetti-rectangle',box,[m.paper,m.light,m.wood,m.leaves][i%4],[x,y,z],[.32,.65,.06],[0,0,(i%5-2)*.5]);
      }
      // The bride and groom are figurines, not architecture. They remain in
      // the intact illustration; this display reconstructs their surroundings.
      break;
    }
  }
  return true;
}
