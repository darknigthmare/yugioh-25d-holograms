/**
 * Each preserved JPG was opened individually before these observations.
 * Characters remain in the illustration. The surrounding static volumes are
 * adapted to the playable corridor; they do not reproduce its perspective.
 */
const references = [
  ['87624166','ancient-forked-canopy-shafts',['#12363d','#52635c','#43a88e','#c9fff0','#777967','#ecfffa'],['large forked trunks frame a mint canopy opening','many slim receding trunks below dark cyan leaves','parallel white sunlight shafts fall through the opening']],
  ['5050644','aroma-wrought-arch-cottage',['#b8a86e','#d6cbb0','#568246','#ede4f4','#635646','#fff8ef'],['pointed wrought iron arch with curled scrolls and white climbing flowers','red tiled cottage behind a curving pale paved path','raised flower beds with violet spikes, red flowers and low wire edging']],
  ['71645242','black-thorn-framed-plinth',['#353640','#7c8582','#245b57','#b286bf','#225751','#ccd4d0'],['thick diagonal teal thorn stems enclose the scene','purple roses and delicate dark stems climb a cracked stone plinth','pale broken figure stays in the original illustration']],
  ['62265044','ravine-sunlit-fluted-cliffs',['#927133','#bc8b32','#4e6859','#ffd667','#735227','#e8f0db'],['tall orange cliffs with sharp vertical ridges and dark clefts','lower isolated fluted outcrops recede through pale mist','large yellow sun above a white valley, dragons stay painted']],
  ['87430998','forest-rooted-cut-bank',['#789541','#686f48','#42834c','#b1c958','#777750','#b5d896'],['forked broadleaf trunks with exposed curving roots on the right','dark narrow conifer row behind a vertical cut earth bank','dense lime foreground grass and broad low leaf stems']],
  ['56594520','gaia-buttressed-ridged-oak',['#6d7751','#877358','#2f5b3b','#c7df9c','#906141','#b0d49f'],['huge brown oak trunk with vertical bark ridges','broad spreading buttress roots and thick curved limbs','large overlapping dark green canopy masses and pale plants growing in bark']],
  ['75782277','hunting-swept-earthen-ground',['#aa9761','#766343','#667242','#f8e5b4','#6b563b','#fff4d6'],['pale diagonal ground opening bordered by olive brown earth','dense outward fine ochre speed streaks across the ground','harpy and small creatures remain in the source, no invented buildings']],
  ['10080320','jurassic-caldera-fern-lake',['#396843','#979580','#397554','#bfcaef','#415e45','#dce5f2'],['long pale near vertical caldera wall surrounds jungle','gray violet cone volcano with white curling smoke behind the wall','small blue lake, foreground fern fronds and hanging vines']],
  ['17228908','lost-palm-basin-eggs',['#658547','#969c8e','#377548','#cbe2f1','#5b6650','#ebeee1'],['broad feather palm crowns beside a stepped white gray cliff','egg shaped pale plants on slender stalks in the middle distance','small blue water channel, all dinosaur figures remain painted']],
  ['50913601','mountain-oblique-seamed-ridges',['#65788b','#7f777d','#465c69','#b8dff1','#594438','#e0ecf2'],['large sharp rear mountain with many sloping seams','lower foreground ridge crosses diagonally from left to right','thin blue white cloud shelves between distant pale peaks']],
  ['76869711','rikka-snowflake-bare-branches',['#e4eaf0','#b9b6cb','#9a7baf','#ccf4ff','#a79b82','#fffafb'],['pale bare forked branches along the upper edge','large six armed cyan snowflakes and smaller scattered ice signs','silver violet faceted diamond rims surround the crystal staff; people stay painted']],
  ['86318356','sogen-fissured-grass-ridges',['#7ba644','#7b8171','#318543','#badc76','#5c7351','#ccdfe1'],['broad green grass plain with low distant gray peaks','diagonal grassy fissure exposes dark vertical cut banks on the right','long sharp foreground grass blades and layered blue cloud streaks']],
  ['23424603','wasteland-striated-bare-terraces',['#99816b','#8e7561','#4f6244','#d8c4a6','#71543d','#c4d7ea'],['wide barren horizontal rolling terraces','angular fractured escarpment dominates the lower right foreground','two sparse bare trees and small scattered rocky outcrops']],
  ['45383307','cruiser-floating-gold-pods',['#cfb26c','#4a4854','#38787e','#75f3ff','#967b29','#e8f0f4'],['four hovering angular dark pods capped by gold trapezoidal plates','stacked small pyramid and long horizontal dark cannon barrels','cyan circuit channels under gold maze patterned panels']],
  ['9989792','fortress-tiered-circuit-pyramid',['#c1903a','#4d4037','#625f4c','#6defff','#946317','#ffd67d'],['three stepped golden pyramid tiers with rectangular maze engravings','two dark cannon apertures between tiers','small cyan apex and vertical cyan crystal inset under orange sky']],
  ['72772445','kingolem-cannon-panel-platform',['#9a865b','#555460','#4c6b7a','#76f3ff','#a28d30','#e8d8a8'],['wide gold trapezoid platform above dark open-bottom pods','large raised square gold and cyan panels with long diagonal cannon tubes','mechanical figure hands and face remain in the source, only peripheral platform and tubes are adapted']],
  ['84335863','rose-fluted-stair-ruins',['#b9c3b7','#c6cecb','#3f9255','#d7f2ff','#a6afa3','#f5fbfa'],['broad pale stone stairs with low side balustrades','broken fluted classical columns stand at different heights','dense white rose banks and airborne pale petals before gray green mountains']],
  ['12801833','traptrip-light-swept-dew-field',['#698854','#62664b','#62995f','#f3ed9a','#755c3f','#dcfaff'],['diagonal raised green banks edged with thin grass','wide curling pale light ribbons and floating green oval dew drops','peripheral circular olive rims with red points and gold spheres; central figure stays painted']],
  ['60884672','golgonda-rippled-dunes-ruins',['#d5b65c','#9da68d','#77806b','#f7de8c','#7d744d','#f2eee0'],['yellow rolling dunes with dense parallel wind ripples and dark lee faces','huge tilted pale green carved column ruins at the horizon','curved white bone tusks and scattered small bones in the sand; vehicles remain painted']],
  ['7206349','vernusylph-river-blossom-valley',['#9fbb74','#7caaa0','#76b46f','#d9f0d1','#829368','#fae7ed'],['turquoise curving river divided around rounded green islands','pink flowering crowns along the right bank','dark green snow patched mountain behind multicolored flower meadows and a large striped green bud']]
];

export const WILD_CARD_LANDMARKS = Object.freeze(Object.fromEntries(references.map(([id,landmark])=>[id,landmark])));
export const WILD_INSPECTED_ART_PROFILES = Object.freeze(Object.fromEntries(references.map(([cardId,,colors,motifs])=>[cardId,Object.freeze({
  cardId,sourceUrl:`https://images.ygoprodeck.com/images/cards_cropped/${cardId}.jpg`,
  motifs:Object.freeze(motifs),palette:Object.freeze({ground:colors[0],stone:colors[1],foliage:colors[2],accent:colors[3],wood:colors[4],foam:colors[5]})
})])));

/** Uses only the bounded application namespace and shared resource helpers. */
export function createWildReferenceGeometry(ctx) {
  if (!Object.hasOwn(WILD_CARD_LANDMARKS,ctx.profile.cardId)) return false;
  const {THREE,profile,root,material,geometry,add,curvedTube,radialSurface,box,cylinder,cone,ring}=ctx;
  const p=WILD_INSPECTED_ART_PROFILES[profile.cardId].palette,meshes=[];
  const solid=material('#ffffff',{vertexColors:true,side:THREE.DoubleSide,roughness:.87,emissive:'#000000',emissiveIntensity:0});
  let mistMaterial=null,index=0;
  const mist=()=>mistMaterial??=material('#ffffff',{vertexColors:true,side:THREE.DoubleSide,roughness:.65,transparent:true,opacity:.33,depthWrite:false,emissive:'#000000',emissiveIntensity:0});
  const remember=mesh=>{meshes.push(mesh);return mesh;};
  const color=hex=>new THREE.Color(hex);
  const tint=(shape,hex,key='')=>geometry(`wild-tint-${shape.uuid}-${hex}-${key}`,()=>{
    const result=shape.clone(),c=color(hex),values=[];
    for(let i=0;i<result.attributes.position.count;i++)values.push(c.r,c.g,c.b);
    result.setAttribute('color',new THREE.Float32BufferAttribute(values,3));return result;
  });
  const oval=geometry('wild-oval',()=>new THREE.SphereGeometry(1,14,10));
  const leafy=geometry('wild-scalloped-canopy',()=>{
    const result=new THREE.SphereGeometry(1,20,12),pos=result.attributes.position;
    for(let i=0;i<pos.count;i++){
      const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i),a=Math.atan2(z,x),r=1+.08*Math.sin(a*7+y*8)+.04*Math.cos(a*11-y*9);
      pos.setXYZ(i,x*r,y*r,z*r);
    }
    result.computeVertexNormals();return result;
  });
  const flutedColumn=geometry('wild-fluted-stone-column',()=>{
    const result=new THREE.CylinderGeometry(1,1,1,64,12),pos=result.attributes.position;
    for(let i=0;i<pos.count;i++){
      const x=pos.getX(i),z=pos.getZ(i),a=Math.atan2(z,x),r=1+.055*Math.cos(a*16);
      pos.setXYZ(i,x*r,pos.getY(i),z*r);
    }
    result.computeVertexNormals();return result;
  });
  const mesh=(name,shape,hex,position,scale=[1,1,1],rotation=[0,0,0],transparent=false)=>
    remember(add(name,tint(shape,hex),transparent?mist():solid,position,scale,rotation));
  const slab=(name,hex,x,y,z,w,h,d,rotation=[0,0,0])=>mesh(name,box,hex,[x,y,z],[w,h,d],rotation);
  const tube=(name,hex,path,radius=.1,segments=28,transparent=false)=>{
    const result=curvedTube(name,transparent?mist():solid,path,t=>{
      const r=typeof radius==='function'?radius(t):radius;return [r,r];
    },segments,.035);
    // Each continuous tube is an actual source-specific silhouette. Adding
    // colors to its cached buffer keeps the palette through static merging.
    const c=color(hex),values=[];
    for(let i=0;i<result.geometry.attributes.position.count;i++)values.push(c.r,c.g,c.b);
    result.geometry.setAttribute('color',new THREE.Float32BufferAttribute(values,3));
    return remember(result);
  };
  const line=(name,hex,a,b,r=.05)=>tube(name,hex,t=>a.map((v,i)=>v+(b[i]-v)*t),r,2);
  const shape=(name,positions,faces,colors)=>geometry(`wild-${profile.cardId}-${index++}-${name}`,()=>{
    const result=new THREE.BufferGeometry();result.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    result.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));result.setIndex(faces);result.computeVertexNormals();return result;
  });
  const polygon=(name,points,hex,transparent=false)=>{
    const c=color(hex),colors=points.flatMap(()=>[c.r,c.g,c.b]),faces=[];
    for(let i=1;i<points.length-1;i++)faces.push(0,i,i+1);
    return remember(add(name,shape(name,points.flat(),faces,colors),transparent?mist():solid,[0,0,0]));
  };
  const grid=(name,vertex,shade,nu=48,nv=18,transparent=false)=>{
    const positions=[],colors=[],faces=[];
    for(let v=0;v<=nv;v++)for(let u=0;u<=nu;u++){
      positions.push(...vertex(u/nu,v/nv));const c=color(typeof shade==='function'?shade(u/nu,v/nv):shade);colors.push(c.r,c.g,c.b);
      if(u<nu&&v<nv){const a=v*(nu+1)+u;faces.push(a,a+nu+1,a+1,a+1,a+nu+1,a+nu+2);}
    }
    return remember(add(name,shape(name,positions,faces,colors),transparent?mist():solid,[0,0,0]));
  };
  const ribbon=(name,hex,path,width,transparent=false,segments=64)=>grid(name,(t,v)=>{
    const center=path(t),before=path(Math.max(0,t-.0001)),after=path(Math.min(1,t+.0001)),dx=after[0]-before[0],dy=after[1]-before[1],length=Math.hypot(dx,dy)||1,w=typeof width==='function'?width(t):width;
    return [center[0]-dy/length*(v-.5)*w,center[1]+dx/length*(v-.5)*w,center[2]];
  },hex,segments,1,transparent);
  const landHeight=(x,z,cx,cz,w,d,h,phase=0,ripple=0)=>{
    const u=(x-cx)/w+.5,v=(z-cz)/d+.5,ridge=Math.sin(u*Math.PI)*Math.sin(v*Math.PI);
    return h*(.23+ridge*.77)+Math.sin(u*11+v*8+phase)*h*.07+ripple*Math.sin(u*100+v*13);
  };
  const land=(name,x,z,w,d,h,hex,phase=0,ripple=0)=>grid(name,(u,v)=>{
    const px=x+(u-.5)*w,pz=z+(v-.5)*d;
    return [px,landHeight(px,pz,x,z,w,d,h,phase,ripple),pz];
  },(u,v)=>{const c=color(hex).multiplyScalar(.84+.15*Math.sin(u*9+v*4+phase));return '#'+c.getHexString();},64,24);
  const crag=(name,x,z,rx,rz,height,hex,phase=0,plateau=.08,folds=7,segments=40)=>{
    radialSurface(name,solid,(t,a)=>{
      a=-a;const radius=(plateau+(1-plateau)*Math.pow(t,.63))*(1+.12*Math.sin(a*7+phase)+.055*Math.sin(a*folds+t*2+phase));
      return [x+Math.cos(a)*rx*radius,height*(1-t),z+Math.sin(a)*rz*radius];
    },segments,28,(t,a)=>{
      const c=color(hex).multiplyScalar(.68+.17*Math.cos(a*7+phase)+.11*t+.07*Math.sin(a*folds+phase));return [c.r,c.g,c.b];
    });remember(root.children.at(-1));
    if(plateau>.15){const cap=Array.from({length:40},(_,i)=>{
      const a=i*Math.PI/20,r=plateau*(1+.12*Math.sin(a*7+phase)+.055*Math.sin(a*folds+phase));return [x+Math.cos(a)*rx*r,height,z+Math.sin(a)*rz*r];
    });polygon(name,cap,hex);}
  };
  const leaves=(name,x,y,z,r,hex=p.foliage)=>{
    for(let i=0;i<5;i++){const a=i*Math.PI*2/5;mesh(name,leafy,hex,[x+Math.cos(a)*r*.55,y+Math.sin(a*2)*r*.17,z+Math.sin(a)*r*.42],[r*.75,r*.4,r*.66]);}
  };
  const tree=(name,x,z,h,r,canopy=true,roots=true)=>{
    tube(name,p.wood,t=>[x+Math.sin(t*5)*r*.26,h*t,z+Math.sin(t*3)*r*.2],t=>r*(1.28-.65*t),36);
    if(roots)for(let i=0;i<4;i++){const a=i*Math.PI/2+.3;tube(name,p.wood,t=>[x+Math.cos(a)*r*(.3+t*3.7),h*.13*Math.pow(1-t,2),z+Math.sin(a)*r*(.3+t*3.7)],t=>r*(.6-.5*t),20);}
    for(let i=0;i<3;i++){const a=i*Math.PI*2/3+.3;tube(name,p.wood,t=>[x+Math.cos(a)*(r*.3+t*h*.23),h*(.53+t*.4),z+Math.sin(a)*t*h*.16],t=>r*(.61-.46*t),24);}
    if(canopy)leaves(name+'-canopy',x,h*.92,z,h*.23);
  };
  // A whole compound fern is one continuous static plant buffer, with a
  // curved stem and individually pointed opposite leaflets, not a flat card.
  const fern=(name,x,y,z,length,angle,hex=p.foliage)=>{
    const points=[],faces=[],colors=[],c=color(hex),count=9;
    const transform=(t,side,width)=>[x+Math.sin(angle)*t*length+Math.cos(angle)*side*width,y+Math.sin(t*Math.PI)*length*.25,z+Math.cos(angle)*t*length-Math.sin(angle)*side*width];
    for(let i=0;i<count;i++)for(const side of [-1,1]){
      const t=.1+i*.088,w=length*.19*Math.sin(t*Math.PI),base=points.length/3;
      const vertices=[transform(t,0,0),transform(t+.04,side,w*.52),transform(t-.045,side,w),transform(t-.06,side,w*.28)];
      for(const pt of vertices){points.push(...pt);colors.push(c.r,c.g,c.b);}faces.push(base,base+1,base+2,base,base+2,base+3);
    }
    const result=remember(add(name,shape(name,points,faces,colors),solid,[0,0,0]));
    tube(name,hex,t=>transform(t,0,0),.025,22);return result;
  };
  const flower=(name,x,y,z,r,hex)=>{
    mesh(name,oval,hex,[x,y,z],[r,r*.32,r]);
    for(let i=0;i<5;i++){const a=i*Math.PI*.4;mesh(name,oval,hex,[x+Math.cos(a)*r*.7,y+.08,z+Math.sin(a)*r*.7],[r*.55,r*.22,r*.48],[.12,a,0]);}
  };
  const rose=(name,x,y,z,r,hex)=>{
    for(let i=0;i<3;i++)mesh(name,ring,hex,[x,y+i*r*.13,z],[r*(1-i*.25),r*(1-i*.25),r*.8],[-Math.PI/2+i*.12,i*.6,0]);
    mesh(name,oval,hex,[x,y+r*.25,z],[r*.28,r*.22,r*.28]);
  };
  const grass=(name,x,z,w,d,hex,rows=4,heightAt=()=>0)=>{
    const positions=[],faces=[],colors=[],c=color(hex);
    for(let i=0;i<rows*12;i++){
      const px=x+((i*7%19)/18-.5)*w,pz=z+((i*11%23)/22-.5)*d,h=.4+i%5*.15,base=positions.length/3;
      const y=heightAt(px,pz)+.05;positions.push(px-.09,y,pz,px+.08,y,pz,px+.15*Math.sin(i),y+h,pz-.1);
      for(let j=0;j<3;j++)colors.push(c.r,c.g,c.b);faces.push(base,base+1,base+2);
    }
    remember(add(name,shape(name,positions,faces,colors),solid,[0,0,0]));
  };
  const cloud=(name,x,y,z,w,hex=p.foam)=>{for(let i=0;i<4;i++)mesh(name,oval,hex,[x+(i-1.5)*w*.28,y+Math.sin(i*2)*w*.06,z],[w*.4,w*.13,w*.1],[0,0,0],true);};
  const pyramid=(name,x,y,z,w,h,d,top,hex)=>{
    const vertices=[[-w/2,0,-d/2],[w/2,0,-d/2],[w/2,0,d/2],[-w/2,0,d/2],[-w*top/2,h,-d*top/2],[w*top/2,h,-d*top/2],[w*top/2,h,d*top/2],[-w*top/2,h,d*top/2]].map(pt=>[pt[0]+x,pt[1]+y,pt[2]+z]);
    const faces=[0,2,1,0,3,2,4,5,6,4,6,7,0,1,5,0,5,4,1,2,6,1,6,5,2,3,7,2,7,6,3,0,4,3,4,7],c=color(hex);
    remember(add(name,shape(name,vertices.flat(),faces,vertices.flatMap(()=>[c.r,c.g,c.b])),solid,[0,0,0]));
  };
  const circuit=(name,x,y,z,w,h,count=5,hex=p.accent,slope=0)=>{
    for(let i=0;i<count;i++){
      const px=x+(i-(count-1)/2)*w/count;
      const path=[[px,y-h/2],[px,y-h*.12],[px+w/count*.3,y-h*.12],[px+w/count*.3,y+h*.2],[px-w/count*.15,y+h*.2],[px-w/count*.15,y+h/2]].map(([u,v])=>[u,v,z-slope*(v-y)]);
      for(let j=0;j<path.length-1;j++)line(name,hex,path[j],path[j+1],.03);
    }
  };
  const cannon=(name,x,y,z,dx,dy,length,r=.32)=>{
    tube(name,'#535360',t=>[x+dx*t,y+dy*t,z+length*t],r,6);
    const end=[x+dx,y+dy,z+length];mesh(name,oval,'#101724',end,[r*.8,r*.8,.045]);
    mesh(name,ring,'#b8bac1',end,[r*.93,r*.93,.35]);
  };

  switch(profile.cardId){
    case '87624166':{
      for(const [x,z,h,r]of[[-17,-28,26,1.3],[18,-29,28,1.8],[-11,-36,22,.8],[12,-37,21,.75],[-5,-40,18,.5],[6,-41,19,.55]]){
        tree('ancient-forked-enclosing-trunk',x,z,h,r,true,false);
        for(let i=0;i<2;i++)tube('ancient-bark-seam',p.stone,t=>[x+Math.sin(t*5)*r*.26+(i-.5)*r*.5,h*t,z+r*.9],.055,32);
      }
      for(let i=0;i<12;i++)line('ancient-parallel-sunlight-shaft',p.foam,[-1+i*.33,24,-31],[-7+i*.45,2,-27],.023);
      cloud('ancient-mint-canopy-opening',0,25,-39,14,'#b2f9df');break;
    }
    case '5050644':{
      for(const x of [-11,11]){
        tube('aroma-pointed-wrought-arch','#303444',t=>[x*(1-t*.96),2+22*Math.sin(t*Math.PI/2),-28],.15,44);
        tube('aroma-pointed-wrought-arch','#303444',t=>[x*(1-t*.94)*1.12,2+23.4*Math.sin(t*Math.PI/2),-28.2],.09,44);
        for(let i=0;i<5;i++)tube('aroma-curled-iron-scroll','#303444',t=>{const a=t*Math.PI*2*1.4,r=(1-t)*.95;return[x*(1-i*.16)+Math.cos(a)*r,4+i*3.7+Math.sin(a)*r,-27.8];},.065,34);
        tube('aroma-flowered-climbing-vine',p.foliage,t=>[x*(1-t*.9)+Math.sin(t*18)*.6,2+t*20,-27.65],.065,36);
        for(let i=0;i<6;i++)flower('aroma-white-jasmine',x*(1-i*.135),3+i*2.9,-27.45,.32,p.foam);
      }
      for(const side of [-1,1])slab('aroma-cottage-tiled-roof','#b05f49',3,7.9,-38+side*1.25,11,.3,3.1,[side*.34,0,0]);
      slab('aroma-cottage-wall',p.stone,3,5.3,-38,10,4.5,3);slab('aroma-cottage-door',p.wood,2.5,4.5,-36.4,1.5,3,.1);
      slab('aroma-cottage-chimney',p.stone,4,9,-38,1,2,1);
      for(const x of [0,6]){slab('aroma-cottage-wall','#626a4a',x,5.8,-36.42,1.6,1.6,.12);line('aroma-cottage-wall',p.wood,[x-.9,5.8,-36.3],[x+.9,5.8,-36.3],.065);line('aroma-cottage-wall',p.wood,[x,4.9,-36.3],[x,6.7,-36.3],.065);}
      for(let i=0;i<11;i++)line('aroma-cottage-tiled-roof','#813e35',[-2+i,8.4,-38],[-2+i,7.4,-35.9],.035);
      for(let i=0;i<5;i++)tube('aroma-curled-iron-scroll','#303444',t=>{const a=t*Math.PI*2*1.5,r=(1-t)*.8;return[(i-2)*1.8+Math.cos(a)*r,23.5-Math.abs(i-2)*.35+Math.sin(a)*r,-28];},.07,30);
      for(let i=0;i<16;i++){const z=-25-i*.6,x=Math.sin(i*.18)*3;slab('aroma-curving-pale-paver',p.stone,x,.15,z,2.8,.18,.47,[0,i*.03,0]);}
      for(const side of [-1,1]){
        land('aroma-raised-flower-bed',side*18,-10,10,23,1.2,p.foliage);
        for(let i=0;i<3;i++){
          const x=side*(14+i%3*2.3),z=-18+i*8,y=landHeight(x,z,side*18,-10,10,23,1.2);
          flower('aroma-red-violet-flower-bed',x,y+.25,z,.6,i%2?'#cf4761':'#aaa6da');
          for(let j=0;j<3;j++)mesh('aroma-red-violet-flower-bed',cone,'#a89acc',[x+(j-1)*.36,y+.7,z-.7],[.11,.95,.11]);
          tube('aroma-low-loop-wire-edge','#c6c9a7',t=>[x-.5+t,y+.1+Math.sin(t*Math.PI)*.6,z+1.3],.025,20);
        }
      }break;
    }
    case '71645242':{
      pyramid('black-cracked-stone-plinth',0,0,-33,10,7,6,.66,p.stone);
      slab('black-cracked-stone-plinth',p.stone,0,7.4,-33,9,1,5.2);
      slab('black-cracked-stone-plinth','#595b55',0,4.5,-29.85,5,2.1,.08);
      for(const [a,b]of[[[-22,2,-26],[19,25,-30]],[[-21,25,-28],[20,3,-27]],[[-22,17,-29],[17,21,-30]],[[-17,0,-26],[-8,28,-28]]]){
        tube('black-crossed-teal-thorn-stem',p.wood,t=>a.map((v,i)=>v+(b[i]-v)*t+Math.sin(t*5)*.2),.44,40);
        for(let i=0;i<8;i++){const t=.08+i*.11,x=a[0]+(b[0]-a[0])*t,y=a[1]+(b[1]-a[1])*t,z=a[2]+(b[2]-a[2])*t;
          mesh('black-pointed-thorn',cone,p.foliage,[x,y+.4,z+.1],[.23,1.25,.24],[0,0,Math.atan2(b[1]-a[1],b[0]-a[0])+(i%2?-.9:.9)]);}
      }
      for(let i=0;i<7;i++){const x=(i%2?1:-1)*(2+i%3*2),y=1+i*1.1;
        tube('black-rose-climbing-stem',p.foliage,t=>[x+Math.sin(t*9)*.4,y+t*2,-29.3],.035,22);
        rose('black-purple-climbing-rose',x,y+.8,-29,.65,p.accent);}
      for(let i=0;i<5;i++)line('black-stone-plinth-crack','#353c3d',[-4+i*1.7,.5,-29.75],[-3.4+i*1.7,6.8,-29.75],.04);break;
    }
    case '62265044':{
      for(const [x,z,rx,rz,h,phase]of[[-18,-11,5,7,27,0],[18,-14,5,6,22,2],[-9,-33,5,3,14,3],[8,-39,3,3,10,4]])
        crag('ravine-fluted-orange-cliff',x,z,rx,rz,h,p.stone,phase,.7);
      for(const side of [-1,1])for(let i=0;i<7;i++)tube('ravine-dark-vertical-cleft','#745320',t=>[side*(16.6+i*.34+Math.sin(t*7+i)*.08),2+t*(19+i%3*2),-5.4],.04+i%2*.02,30);
      for(let i=0;i<5;i++)cloud('ravine-pale-low-mist',-18+i*9,2+i%2,-32-i%2*2,13,p.foam);
      mesh('ravine-yellow-sun',oval,p.accent,[11,25,-42],[3.6,3.6,.12]);break;
    }
    case '87430998':{
      for(const [x,z,h,r]of[[17,-6,16,1.1],[21,-18,18,.9],[15,-28,17,.8],[-19,-10,15,.8]])tree('forest-forked-rooted-broadleaf',x,z,h,r,true,true);
      for(let i=0;i<13;i++)mesh('forest-dark-conifer-row',cone,i%2?'#24533d':'#386347',[-20+i*3.3,8,-36],[2.1,15,2]);
      slab('forest-cut-earth-bank',p.wood,0,1.3,-31,43,2.6,1.1);
      for(let i=0;i<25;i++)line('forest-cut-bank-vertical-root',p.stone,[-21+i*1.75,2.7,-30.37],[-21+i*1.75,.1,-30.37],.065);
      for(const side of [-1,1]){land('forest-lime-grass-bank',side*20,-3,14,38,1,p.ground);grass('forest-long-foreground-grass',side*19,10,11.6,7,p.foliage,4,(x,z)=>landHeight(x,z,side*20,-3,14,38,1));for(let i=0;i<4;i++){const x=side*(14+i*2),z=2-i*4;fern('forest-broad-low-leaf-stem',x,landHeight(x,z,side*20,-3,14,38,1)+.15,z,2.4,.2+i,p.foliage);}}
      break;
    }
    case '56594520':{
      tree('gaia-massive-buttress-oak',0,-34,27,3,true,true);
      for(let i=0;i<9;i++){const a=(i-4)*.17;tube('gaia-long-bark-furrow','#66482f',t=>{const r=3*(1.28-.65*t)*1.045;return[Math.sin(t*5)*.78+Math.sin(a)*r,t*27,-34+Math.sin(t*3)*.6+Math.cos(a)*r];},.075+i%2*.04,42);}
      for(const side of [-1,1])for(let i=0;i<3;i++)tube('gaia-thick-spreading-limb',p.wood,t=>[side*(1.1+t*(7+i*1.4)),13+i*2.5+t*(6-i),-34-Math.sin(t*2+i)*1.6],t=>.85*(1-t)+.2,32);
      for(const x of [-7,7])leaves('gaia-broad-overlapping-dark-canopy',x,24,-35,6,p.foliage);
      for(const [x,y,z]of[[-1,5,-30],[1.7,9,-30.8],[-.4,14,-31.6],[2,18,-31.7]])fern('gaia-pale-bark-epiphyte',x,y,z,1.5,.2,'#9ac295');
      for(const side of [-1,1]){tree('gaia-pale-background-tree',side*18,-35,20,1,false,false);leaves('gaia-pale-background-canopy',side*18,16,-38,6,'#9abf8a');}
      break;
    }
    case '75782277':{
      for(const side of [-1,1])land('hunting-olive-earthen-slope',side*20,-7,16,40,3.3,p.stone,side);
      land('hunting-pale-diagonal-ground',0,-32,43,13,1.7,p.ground,1);
      for(let i=0;i<42;i++){const a=i*Math.PI*2/42;tube('hunting-ochre-radial-earth-streak',i%3?p.foam:p.stone,t=>{
        const r=3+t*18,x=Math.cos(a)*r,z=-32+Math.sin(a)*r*.21,u=(x+21.5)/43,v=(z+38.5)/13;
        return[x,1.7*(.23+.77*Math.sin(u*Math.PI)*Math.sin(v*Math.PI))+.119*Math.sin(u*11+v*8+1)+.06,z];
      },.014+i%3*.01,30);}
      break;
    }
    case '10080320':{
      crag('jurassic-smoke-cone-volcano',0,-37,13,6,16,'#7c7e9c',2,.06);
      for(let i=0;i<4;i++)cloud('jurassic-curling-white-smoke',Math.sin(i)*1.4,18+i*2,-38,3+i*.45,p.foam);
      for(let i=0;i<9;i++)crag('jurassic-pale-caldera-rim',-22+i*5.5,-28,3.3,2.2,5.8+i%3*.3,p.stone,i,.9);
      grid('jurassic-small-blue-lake',(u,v)=>[-6+u*12,.15,-23+v*3+Math.sin(u*7)*.4],p.accent,40,8);
      for(const side of [-1,1]){
        land('jurassic-dense-jungle-floor',side*19,-7,12,36,1.3,p.foliage,side);
        for(let i=0;i<5;i++){const x=side*(14+i*1.7),z=-1-i*4;fern('jurassic-layered-fern-frond',x,landHeight(x,z,side*19,-7,12,36,1.3,side)+.15,z,3.3,side*(.5+i*.5));}
        tube('jurassic-hanging-canopy-vine',p.wood,t=>[side*(17+Math.sin(t*7)*2),24-t*18,-27],.1,38);
        for(let i=0;i<4;i++)fern('jurassic-hanging-leaf-frond',side*18,19-i*2.4,-27,2,1.5);
      }break;
    }
    case '17228908':{
      crag('lost-stepped-white-gray-cliff',17,-32,5,3,26,p.stone,1,.28);
      crag('lost-stepped-white-gray-cliff',-6,-39,5,3,14,p.foam,2,.07);
      for(const [x,z,h]of[[-18,-17,16],[-11,-31,12],[13,-28,11]]){
        tube('lost-feather-palm-trunk',p.wood,t=>[x+Math.sin(t*3)*.35,h*t,z],t=>.32-.16*t,32);
        for(let i=0;i<7;i++)fern('lost-broad-feather-palm-crown',x,h,z,4,i*Math.PI*2/7);
      }
      for(let i=0;i<5;i++){
        const x=-7+i*2.8,z=-32-i%2;mesh('lost-pale-egg-shaped-plant',oval,p.foam,[x,8.8+i%2*.6,z],[.85,1.25,.85]);
        tube('lost-pale-egg-shaped-plant',p.stone,t=>[x+Math.sin(t*5)*.2,1+t*6.5,z],.14,18);
      }
      grid('lost-blue-basin-water',(u,v)=>[-20+u*40,.1,-25+v*3+Math.sin(u*11)*.3],'#76b9df',48,6);
      break;
    }
    case '50913601':{
      crag('mountain-sharp-rear-seamed-peak',9,-37,13,7,25,p.stone,1,.035,42,112);
      crag('mountain-left-fractured-ridge',-15,-30,8,5,11,'#74665d',2,.045,42,112);
      grid('mountain-oblique-foreground-ridge',(u,v)=>[-24+u*46,.15+Math.sin(v*Math.PI)*(.7+(1-u)*2.5+Math.sin(u*9)*.4),-22-v*8-u*2],(u,v)=>v>.8?'#746051':p.stone,68,24);
      for(let i=0;i<8;i++)tube('mountain-long-sloping-seam','#5b4d47',t=>[8+(i-3.5)*t*2.5,24-t*19,-30.6+Math.sin(t*5+i)*.2],.045,28);
      for(let i=0;i<4;i++)cloud('mountain-blue-white-cloud-shelf',-15+i*11,3+i%2*2,-42,16,'#b2d9ed');break;
    }
    case '76869711':{
      for(const side of [-1,1]){
        tube('rikka-pale-bare-upper-branch',p.wood,t=>[side*(22-t*18),25-t*2+Math.sin(t*5),-32],t=>.2-.11*t,36);
        for(let i=0;i<4;i++)line('rikka-pale-bare-upper-branch',p.wood,[side*(19-i*4),24,-32],[side*(17-i*4),27+i%2,-32],.065);
      }
      for(const [x,y,r]of[[-14,17,2.1],[14,11,2.3],[-5,5,1.3],[5,22,1.1]]){
        for(let i=0;i<6;i++){const a=i*Math.PI/3,dx=Math.cos(a),dy=Math.sin(a);line('rikka-six-armed-cyan-snowflake',p.accent,[x,y,-29],[x+dx*r,y+dy*r,-29],.04);
          for(const side of [-1,1]){const b=a+side*.75;line('rikka-six-armed-cyan-snowflake',p.accent,[x+dx*r*.63,y+dy*r*.63,-29],[x+dx*r*.63+Math.cos(b)*r*.27,y+dy*r*.63+Math.sin(b)*r*.27,-29],.025);}
        }
      }
      for(const [x,y,s]of[[18,23,2.4],[19,16,1.8],[-18,8,1.5]]){
        const corners=[[x,y+s,-31],[x+s*.65,y,-31],[x,y-s,-31],[x-s*.65,y,-31]];
        polygon('rikka-silver-violet-diamond-rim',corners,'#b8b5df',true);
        for(let i=0;i<4;i++)line('rikka-silver-violet-diamond-rim',p.foam,corners[i],corners[(i+1)%4],.1);
      }break;
    }
    case '86318356':{
      for(const side of [-1,1]){
        land('sogen-layered-green-grass-plain',side*20,-2,16,43,1.6,p.ground,side);
        grass('sogen-sharp-foreground-blades',side*19,13,13,6,p.foliage,8,(x,z)=>landHeight(x,z,side*20,-2,16,43,1.6,side));
      }
      land('sogen-layered-green-grass-plain',0,-31,46,15,1.9,p.foliage,1);
      for(let i=0;i<7;i++)crag('sogen-low-distant-gray-peaks',-21+i*7,-41,5.5,3,4+i%3*1.2,p.stone,i,.03);
      grid('sogen-exposed-diagonal-fissure',(u,v)=>[12.7+u*10.5,.2+v*(1.5+.3*Math.sin(u*10)),-15+u*16],(u,v)=>v>.85?p.stone:'#46513c',48,8);
      grid('sogen-exposed-diagonal-fissure',(u,v)=>[12.7+u*10.5+(v-.5)*.4,1.7+.3*Math.sin(u*10),-15+u*16],p.ground,48,1);
      for(let i=0;i<12;i++)line('sogen-exposed-diagonal-fissure',p.stone,[12.7+i*.85,1.5,-15+i*1.3],[12.7+i*.85,.2,-15+i*1.3],.04);
      for(let i=0;i<3;i++)cloud('sogen-layered-cloud-streak',-15+i*15,12+i%2*2,-42,16,p.foam);break;
    }
    case '23424603':{
      for(const side of [-1,1])land('wasteland-horizontal-barren-terrace',side*21,-3,16,42,1.2,p.ground,side);
      for(let i=0;i<4;i++)land('wasteland-horizontal-barren-terrace',0,-26-i*4.4,45,5,1+i*.7,p.ground,i);
      for(let i=0;i<6;i++)crag('wasteland-angular-foreground-escarpment',15+i*2,6-i*.7,1.8,2,4+i%3,p.stone,i,.7);
      for(const [x,z,h]of[[-19,-30,8],[20,-36,6]]){
        tube('wasteland-two-bare-trees',p.wood,t=>[x+t*.3,h*t,z],t=>.14-.1*t,24);
        for(let i=0;i<4;i++)line('wasteland-two-bare-trees',p.wood,[x,h*(.35+i*.13),z],[x+(i%2?1:-1)*(1+i*.2),h*(.65+i*.1),z-.2],.04);
      }
      for(let i=0;i<5;i++)crag('wasteland-small-fractured-outcrop',-17+i*8,-30-i%2*4,1.6,1,1.3+i%3*.6,p.stone,i,.1);break;
    }
    case '45383307':{
      for(const x of [-13,-4.5,4.5,13]){
        pyramid('cruiser-hovering-gold-trapezoid-pod',x,7,-32,8,2.6,6,.68,'#c5ae3b');
        pyramid('cruiser-dark-open-bottom-pod',x,4.3,-32,6.5,2.8,5.2,.76,p.stone);
        slab('cruiser-dark-open-bottom-pod','#24242e',x,4.8,-28.8,3.5,1.7,.1);
        circuit('cruiser-cyan-circuit-channel',x,6.8,-29.94,6,1.2,3,p.accent,.22);
        circuit('cruiser-gold-maze-panel',x,8.8,-29.62,6,1.4,4,'#887629',.369);
      }
      pyramid('cruiser-stacked-small-pyramid',-4.5,10,-34,10,4,6,.14,'#bdac3d');
      pyramid('cruiser-stacked-small-pyramid',-4.5,15,-34,5,3,4,.02,'#bcaa39');
      polygon('cruiser-cyan-pyramid-apex',[[-5,18,-32],[-4.5,18.8,-32],[-4,18,-32]],p.accent);
      cannon('cruiser-horizontal-cannon',-4,12,-31,-2,0,5,.5);cannon('cruiser-horizontal-cannon',-4,15,-33,-1,0,4.4,.32);
      for(let i=0;i<3;i++)cloud('cruiser-low-dust',-14+i*14,2,-34,14,'#e2d0a0');break;
    }
    case '9989792':{
      for(const [y,w,h,top]of[[0,25,8,.62],[9,15,5,.54],[15,8,6,.03]]){
        pyramid('fortress-three-stepped-pyramid-tiers',0,y,-34,w,h,w*.6,top,p.wood);
        circuit('fortress-gold-maze-engraving',0,y+h*.42,-34+w*.3*(1-(1-top)*.42)+.045,w*.69,h*.46,5,'#6e4b16',w*.3*(1-top)/h);
      }
      polygon('fortress-cyan-apex',[[0,22,-34],[-1,20.8,-32.6],[1,20.8,-32.6]],p.accent);
      polygon('fortress-vertical-cyan-inset',[[-.8,10,-28.55],[.8,10,-28.55],[.4,14,-30],[ -.4,14,-30]],p.accent);
      cannon('fortress-dark-cannon-aperture',-5,10,-29,0,0,2,.65);cannon('fortress-dark-cannon-aperture',5,10,-29,0,0,2,.65);
      for(const side of [-1,1])land('fortress-orange-dune',side*20,-7,14,35,2.1,'#bd8c36',side);break;
    }
    case '72772445':{
      for(const x of [-12,-4,4,12]){
        pyramid('kingolem-gold-platform-trapezoid',x,3,-34,8,3.4,6,.7,'#b59d37');
        slab('kingolem-dark-platform-opening','#30313d',x,1.4,-30.9,4.6,2.4,1.2);
        circuit('kingolem-gold-cyan-panel',x,6,-30.75,6,1,3,'#7b6930');
      }
      for(const side of [-1,1])slab('kingolem-gold-cyan-panel','#4d5661',side*6,10,-34,2.2,14,3);
      slab('kingolem-gold-cyan-panel','#4d5661',0,10,-34,12,4,3);
      for(const [x,y,w,h]of[[-7,14,5,5],[6,17,7,6],[0,11,6,4]]){
        slab('kingolem-gold-cyan-panel','#b49b38',x,y,-33,w,h,1.5);
        slab('kingolem-gold-cyan-panel','#4d5661',x,y,-32.18,w*.75,h*.73,.08);
        slab('kingolem-gold-cyan-panel','#b99e39',x,y,-32.1,w+.5,.35,.2);
        for(const side of [-1,1])slab('kingolem-gold-cyan-panel','#b99e39',x+side*w*.48,y,-32.1,.35,h,.2);
        circuit('kingolem-cyan-circuit-lines',x,y,-32.06,w*.8,h*.7,3);
      }
      for(const [x,y,z,dx,dy,l]of[[-7,15.5,-32,-5,6,6],[6,19.5,-33,-4,7,5],[-12,6,-31,-5,1.2,6],[4,10,-31,-3,2,6]])cannon('kingolem-long-diagonal-cannon',x,y,z,dx,dy,l,.42);
      break;
    }
    case '84335863':{
      for(let i=0;i<22;i++)slab('rose-broad-pale-stair',p.stone,0,.1+i*.25,-21-i*.65,11,.3,.68);
      for(let i=0;i<6;i++)line('rose-broad-pale-stair','#a9b8b4',[-5,.26+i*.75,-22.96-i*1.95],[5,.26+i*.75,-22.96-i*1.95],.025);
      for(const side of [-1,1]){
        line('rose-low-stair-balustrade',p.stone,[side*6,.2,-21],[side*6,5.8,-35.4],.32);
        for(let i=0;i<3;i++){
          const x=side*(11+i*5),z=-28-i%2*6,h=5+i*3;
          mesh('rose-broken-fluted-column',flutedColumn,p.stone,[x,h*.5,z],[.85,h,.85]);
          slab('rose-broken-fluted-column',p.foam,x,.25,z,2.1,.5,2.1);
        }
        land('rose-dense-white-flower-bank',side*17,-13,11,26,2.3,p.foliage,side);
        for(let i=0;i<20;i++){const x=side*(12.5+i%4*2.2),z=-23+Math.floor(i/4)*4;rose('rose-dense-white-flower-bank',x,landHeight(x,z,side*17,-13,11,26,2.3,side)+.12,z,.45+i%3*.12,p.foam);}
      }
      for(let i=0;i<16;i++)mesh('rose-airborne-white-petal',oval,p.foam,[-20+i%7*6,5+Math.floor(i/7)*5,-27-i%2],[.25,.4,.04],[0,.3,i*.6]);break;
    }
    case '12801833':{
      for(const side of [-1,1])land('traptrip-diagonal-green-bank',side*20,-7,14,37,2.5,p.foliage,side);
      for(let i=0;i<4;i++)ribbon('traptrip-wide-curling-light-ribbon',i%2?'#e3ffeb':'#fff1a9',t=>[-21+t*42,2+i*3+Math.sin(t*4+i)*2,-31-i*.8],t=>.3+Math.sin(t*Math.PI)*1.4,true);
      for(let i=0;i<24;i++)mesh('traptrip-floating-green-oval-dew',oval,i%2?'#c6e8a4':'#809d71',[-20+i%8*5.7,2+Math.floor(i/8)*7,-29-i%2],[.28+i%3*.07,.45+i%3*.1,.08],[0,0,i*.3]);
      for(const side of [-1,1]){
        mesh('traptrip-olive-peripheral-rim',ring,'#829137',[side*21,9,-29],[4,4,1]);
        for(let i=0;i<10;i++){const a=i*Math.PI/5,x=side*21+Math.cos(a)*4.4,y=9+Math.sin(a)*4.4;
          mesh('traptrip-red-point-gold-sphere',cone,'#b75b44',[x,y,-29],[.28,.85,.3],[0,0,a-Math.PI/2]);
          mesh('traptrip-red-point-gold-sphere',oval,'#eadb81',[side*21+Math.cos(a)*5,y+Math.sin(a)*.6,-29],[.38,.38,.2]);
        }
      }break;
    }
    case '60884672':{
      land('golgonda-wind-rippled-dune',0,-33,44,15,3.5,p.ground,1,.075);
      for(const side of [-1,1]){
        grid('golgonda-wind-rippled-dune',(u,v)=>[side*20+(u-.5)*15,1+2.7*Math.sin(u*Math.PI)*Math.sin(v*Math.PI)+.05*Math.sin(u*175+v*26),-4+(v-.5)*42],(u,v)=>Math.sin(u*5+v*8)>.2?'#dfc36a':'#b99d4c',90,32);
        for(let i=0;i<3;i++)tube('golgonda-curved-white-tusk',p.foam,t=>[side*(13+i*3)+side*Math.sin(t*2)*1.5,Math.pow(t,1.2)*(4+i*2),2-i*6],t=>.3*(1-t)+.025,36);
      }
      for(const [x,z,h,tilt]of[[-16,-32,25,.26],[18,-35,28,-.15],[-5,-42,17,.22]]){
        const pillar=mesh('golgonda-leaning-carved-ruin',cylinder,p.stone,[x,h/2,z],[2.2,h,2.2],[0,0,tilt]);
        for(let i=0;i<6;i++)mesh('golgonda-leaning-carved-ruin',ring,'#8a947e',[x-Math.sin(tilt)*(i*3-h/2),i*3+.5,z],[2.23,2.23,.5],[-Math.PI/2,0,tilt]);
        for(let i=0;i<4;i++)line('golgonda-carved-vertical-groove','#73816c',[x+(i-1.5)*.6+Math.sin(tilt)*h*.4,1,z+2.14],[x+(i-1.5)*.6-Math.sin(tilt)*h*.4,h-1,z+2.14],.045);
        pillar.userData.sourceTilt=tilt;
      }
      for(let i=0;i<8;i++)tube('golgonda-small-scattered-bone',p.foam,t=>[-19+i*5.4+t*1.1,.3+Math.sin(t*Math.PI)*.2,-27-i%3*2],.09,16);break;
    }
    case '7206349':{
      grid('vernusylph-turquoise-curving-river',(u,v)=>[-19+u*38,.08,-34+v*9+Math.sin(u*7)*2.1],'#83cacc',64,16);
      for(const [x,z,w,d,h]of[[-13,-30,15,8,4],[13,-32,13,8,3],[-20,-6,14,30,2.4],[20,-5,14,32,2.7]])land('vernusylph-rounded-green-island',x,z,w,d,h,p.foliage,x);
      land('vernusylph-rounded-green-island',0,-38,42,6,3.5,p.ground,2);
      crag('vernusylph-snow-patched-green-mountain',12,-41,12,4.5,14,'#629986',2,.08);
      for(let i=0;i<5;i++)ribbon('vernusylph-pale-snow-patch',p.foam,t=>[8+i*1.8+t*3,13-t*(4+i*.4),-36.4],t=>.05+(1-t)*.4,false,24);
      for(const [x,z]of[[16,-27],[21,-17],[17,-7]]){
        tube('vernusylph-pink-flowering-crown',p.wood,t=>[x,.3+t*6,z],t=>.3-.13*t,20);
        leaves('vernusylph-pink-flowering-crown',x,6,z,4.3,'#efb9c7');
      }
      for(let i=0;i<7;i++){const x=-16+i*4.8,z=-37-i%2*2;flower('vernusylph-multicolor-flower-meadow',x,landHeight(x,z,0,-38,42,6,3.5,2)+.25,z,.4,['#ffe9a1','#f1d1e5','#d4f0ef'][i%3]);}
      for(let i=0;i<8;i++){const a=i*Math.PI/4;tube('vernusylph-large-striped-green-bud',i%2?'#abd09b':'#78aa76',t=>[15+Math.cos(a)*Math.sin(t*Math.PI)*1.6,6+t*5,-35+Math.sin(a)*Math.sin(t*Math.PI)*1.5],.17,28);}
      mesh('vernusylph-large-striped-green-bud',cylinder,p.foliage,[15,3.5,-35],[.2,5,.2]);
      break;
    }
  }
  mergeWildMeshes(THREE,root,meshes,geometry,add,profile.cardId);
  return true;
}

/** Merge only matching motifs within each wholly peripheral region. The
 * original buffers remain in the host geometry cache for exactly-once cleanup.
 * Keeping left/right/horizon separate preserves whole-instance corridor tests.
 */
function mergeWildMeshes(THREE,root,meshes,geometry,add,id){
  const groups=new Map();
  root.userData.referencePrimitiveCount=root.children.filter(mesh=>mesh.isMesh).length;
  for(const mesh of meshes){
    mesh.updateMatrix();mesh.geometry.computeBoundingBox();const b=mesh.geometry.boundingBox.clone().applyMatrix4(mesh.matrix);
    const region=b.max.z<-18?'horizon':b.max.x<-9?'left':b.min.x>9?'right':'other',key=`${mesh.name}:${mesh.material.uuid}:${region}`;
    if(!groups.has(key))groups.set(key,[]);groups.get(key).push(mesh);
  }
  let index=0;
  for(const sources of groups.values()){
    if(sources.length<2)continue;
    const combined=geometry(`wild-merged-${id}-${index++}`,()=>{
      const positions=[],normals=[],colors=[],indices=[],curves=[];let offset=0;
      for(const mesh of sources){
        const p=mesh.geometry.attributes.position,n=mesh.geometry.attributes.normal,c=mesh.geometry.attributes.color,normalMatrix=new THREE.Matrix3().getNormalMatrix(mesh.matrix);
        for(let i=0;i<p.count;i++){
          const v=new THREE.Vector3().fromBufferAttribute(p,i).applyMatrix4(mesh.matrix),normal=new THREE.Vector3().fromBufferAttribute(n,i).applyMatrix3(normalMatrix).normalize();
          positions.push(v.x,v.y,v.z);normals.push(normal.x,normal.y,normal.z);colors.push(c.getX(i),c.getY(i),c.getZ(i));
        }
        const src=mesh.geometry.index;for(let i=0;i<(src?.count??p.count);i++)indices.push(offset+(src?src.getX(i):i));offset+=p.count;
        if(mesh.geometry.userData.continuousCurve)curves.push(mesh.geometry.userData.continuousCurve);
      }
      const result=new THREE.BufferGeometry();result.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));result.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));result.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));result.setIndex(indices);
      result.userData.referencePrimitiveCount=sources.length;result.userData.continuousCurves=Object.freeze(curves);return result;
    });
    for(const mesh of sources)root.remove(mesh);
    add(sources[0].name,combined,sources[0].material,[0,0,0]).castShadow=sources.some(mesh=>mesh.castShadow);
  }
}
