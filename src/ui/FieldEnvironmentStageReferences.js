import { createFieldReferenceDetailGeometry } from './FieldReferenceDetailGeometry.js';

/** Individually inspected preserved JPGs inform these static stage volumes.
 * Added sculptural details are declared per source; peripheral placement is adapted to
 * the playable corridor, without a claim of full spatial reconstruction. */
const references = [["2674965", "argostars-suspended-cyan-disc-stage", ["#163d47", "#71999d", "#397e82", "#71ebed", "#364e57", "#e1ffff"], ["stacked circular cyan stage and suspended concentric canopy", "tilted round spotlight pods around the lower rim", "pink yellow fine fireworks and star-shaped canopy mark"]], ["67616300", "chicken-forest-cliff-road", ["#7a7152", "#9b8c6f", "#264e46", "#bedcd9", "#5d5844", "#d5e6df"], ["narrow ochre ledge road along a fractured cliff", "dark dense forest masses above the ledge", "pale vertical mist; adapted orange mechanical face, green buggy and rust-colored forehead tank now have sculptural volumes"]], ["5833312", "academy-gold-finned-island-campus", ["#3d745a", "#907d62", "#366f58", "#c7f1ed", "#ad7947", "#eef4e9"], ["campus of tall triangular gold fins and white round roofs", "large steep smoking volcano above forested island", "blue shoreline, cliff rim, bridge and narrow waterfall"]], ["91002901", "assault-cyan-orange-winding-trails", ["#10355d", "#708fa5", "#286a91", "#64f1fa", "#71616e", "#fff2b5"], ["broad cyan and orange winding energy trails", "pink curved band around a round metallic base", "long radial pale streaks, dragon heads stay in the illustration"]], ["43940008", "duel-silver-outrigger-tower", ["#708294", "#c2cbd3", "#466782", "#e4f7ff", "#5c666f", "#edf0ec"], ["very tall narrow silver polygon tower", "long sloping triangular outriggers above a round base", "broken concrete walls with exposed dark rebar at both edges"]], ["19162134", "dueltaining-neon-panel-orbits", ["#26335b", "#697b91", "#567d83", "#74fcf2", "#ae9a4c", "#faf8c0"], ["cyan pink rectilinear light panels behind the performer", "long pale angled light shards", "gold curved orbit rods with green round nodes and star glints"]], ["39838559", "circuit-banked-cyan-arrow-road", ["#152549", "#496575", "#245d65", "#65e7f1", "#b67c3c", "#cee9ec"], ["banked curving blue road with repeated orange arrow marks", "thin tall curved track supports", "green circuit floor, rectangular scoreboard windows and translucent HUD panels"]], ["1061200", "city-hologram-zigzag-map", ["#294b80", "#477891", "#508cac", "#8df5ff", "#8759a9", "#f5aaf1"], ["blue tilted city-map panel with extruded outlined rectangular towers", "bright pink zigzag route across the map", "floating cyan rectangular diagram cards, figures stay painted"]], ["2144946", "offroad-rock-ramp-city-lights", ["#344d51", "#6b6659", "#487c78", "#7af8f4", "#97733e", "#e8e9b1"], ["rough rocky rising ramp beside luminous highrise blocks", "overhead winding yellow and red edged rail", "large oval suspended lamps project pale beams"]], ["58012707", "ballpark-ochre-mound-woodline", ["#9d854d", "#b99c61", "#3b7c49", "#b0e3ed", "#6e664c", "#f3edb4"], ["round ochre ground mound in the foreground", "green tree line and soft distant hills", "fine pale outward action streaks, insect players remain painted"]], ["85638822", "gouki-chainlink-red-corner", ["#59636b", "#939eaa", "#526371", "#d9edf1", "#9d4441", "#f8f7e4"], ["tall angled chain-link cage panels framed by silver bars", "red corner post with three black square cushions and ropes", "white edge flashes and jagged ground lightning, wrestlers stay painted"]], ["32391631", "savage-broken-arcaded-colosseum", ["#78614f", "#a99877", "#5f4b61", "#cb85da", "#705e47", "#dcc7a6"], ["curving three levels of stone arches and round columns", "chipped irregular upper wall rim", "violet glow through the arch openings"]], ["5063379", "flavian-gold-circuit-spires", ["#a8965c", "#c8b171", "#7b977e", "#aaf4ee", "#8b7539", "#f1fff6"], ["gold maze-lined walls and pointed gold spikes", "large suspended crown ring above a jagged pale blue fountain", "rectangular corner pylons with cyan outlined panels"]], ["90173539", "dino-red-mesh-jungle-court", ["#beae61", "#a69872", "#477f43", "#c6e2a6", "#9a4c48", "#ece4b1"], ["round sandy court within a red curved mesh fence", "layered long pointed jungle palm fronds", "pale diagonal sunlight shafts through dense forest"]], ["38053381", "generaider-eight-node-luminous-wheel", ["#142460", "#345684", "#29577c", "#77e7ff", "#18385b", "#e7fdff"], ["six round nodes on a wheel with extra upper and lower nodes", "double cyan round rim, bright radial wedges and center node", "blue concentric floor rings and faint rectangular diagram lines"]], ["7617062", "museum-arched-alcove-rope-rails", ["#334958", "#778691", "#485b68", "#becfd8", "#a38550", "#e3e6dc"], ["gray blue arched museum alcoves and cracked stone walls", "brass rope barrier posts and red hanging ropes", "gilded oval mirror frame, adapted dinosaur fossil and scattered golden shards; ghost figures remain painted"]], ["29400787", "parade-gabled-town-lamps-balloons", ["#474263", "#7c7595", "#5c6278", "#f4df8d", "#816c65", "#e8d7ef"], ["purple brick gabled houses with lit tall windows", "three-headed street lamps above blue cobbled paving", "bright purple pink balloons with many fine strings, parade figures remain painted"]], ["15388353", "restaurant-twin-turret-lit-stairs", ["#7a686c", "#b998a4", "#63784d", "#f0d980", "#5b5568", "#e8dace"], ["lavender two-storey building with round corner turrets and slate cone roofs", "large golden arched windows and baluster balcony", "two stair levels, iron entrance arch and warm lantern posts"]], ["49370016", "punk-radial-speaker-petal-panels", ["#28274d", "#475b81", "#348d88", "#70ece3", "#a98045", "#fbd971"], ["large violet petal fan behind cyan round speaker nodes", "angular purple blue panels with cyan borders", "yellow round hubs with radial gold struts and colored light tubes"]], ["55553602", "dramatic-red-curtain-star-trim", ["#a58266", "#9c686c", "#63797b", "#92f5f8", "#b35451", "#f2e2a0"], ["curving red draped curtains with black star-decorated strips", "cyan illuminated rectangular stage framework", "round pale performance floor and gold ring props, actors stay painted"]], ["29650040", "harmonia-outlined-floating-music", ["#b97270", "#cc9292", "#809bc1", "#c8f4f3", "#c09554", "#f7e3b0"], ["many outlined purple cyan orange music-note signs", "long diagonal pale music staff lines", "curled orange pale cloud bands and tiny rings, performers remain painted"]], ["63492244", "light-arena-flower-heart-lamps", ["#858149", "#627654", "#74a16c", "#c0fc81", "#a7585f", "#f8ead8"], ["large bright green diamond lamp matrix above flower-lined stage", "many colored heart outlines and broad translucent spot beams", "red owl-shaped side panels with glowing oval eyes"]], ["51208046", "live-pink-heart-speaker-stage", ["#6a3a62", "#baa7ae", "#849582", "#f4b3df", "#a88a39", "#fff6d6"], ["huge pink skull-shaped center panel with a heart-shaped nose and jagged gold outline", "large white speaker cabinets with dark round drivers", "dense overhead rows of round lamps and small black floor monitors"]], ["35371948", "light-stage-gold-floral-screen", ["#497a4a", "#748869", "#73b978", "#daf4a3", "#a88e38", "#e3f5d1"], ["wide cyan central screen framed by small warm lights", "green golden scroll crest above the screen", "floral jewel-like side columns, small hearts and curved pale baluster tier below"]]];
export const STAGE_CARD_LANDMARKS=Object.freeze(Object.fromEntries(references.map(([id,landmark])=>[id,landmark])));
export const STAGE_INSPECTED_ART_PROFILES=Object.freeze(Object.fromEntries(references.map(([cardId,,colors,motifs])=>[cardId,Object.freeze({cardId,sourceUrl:`https://images.ygoprodeck.com/images/cards_cropped/${cardId}.jpg`,motifs:Object.freeze(motifs),palette:Object.freeze({ground:colors[0],stone:colors[1],foliage:colors[2],accent:colors[3],wood:colors[4],foam:colors[5]})})])));
export function createStageReferenceGeometry(ctx) {
  if (!Object.hasOwn(STAGE_CARD_LANDMARKS,ctx.profile.cardId)) return false;
  const {THREE,profile,root,material,geometry,add,curvedTube,curvedDeck,radialSurface,box,cylinder,cone,ring}=ctx;
  const p=STAGE_INSPECTED_ART_PROFILES[profile.cardId].palette,meshes=[];
  const solid=material('#ffffff',{vertexColors:true,side:THREE.DoubleSide,roughness:.87,emissive:'#000000',emissiveIntensity:0});
  let mistMaterial=null,index=0;
  const mist=()=>mistMaterial??=material('#ffffff',{vertexColors:true,side:THREE.DoubleSide,roughness:.65,transparent:true,opacity:.33,depthWrite:false,emissive:'#000000',emissiveIntensity:0});
  const remember=mesh=>{meshes.push(mesh);return mesh;};
  const color=hex=>new THREE.Color(hex);
  const tint=(shape,hex,key='')=>geometry(`stage-tint-${shape.uuid}-${hex}-${key}`,()=>{
    const result=shape.clone(),c=color(hex),values=[];
    for(let i=0;i<result.attributes.position.count;i++)values.push(c.r,c.g,c.b);
    result.setAttribute('color',new THREE.Float32BufferAttribute(values,3));return result;
  });
  const oval=geometry('stage-oval',()=>new THREE.SphereGeometry(1,14,10));
  const leafy=geometry('stage-scalloped-canopy',()=>{
    const result=new THREE.SphereGeometry(1,20,12),pos=result.attributes.position;
    for(let i=0;i<pos.count;i++){
      const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i),a=Math.atan2(z,x),r=1+.08*Math.sin(a*7+y*8)+.04*Math.cos(a*11-y*9);
      pos.setXYZ(i,x*r,y*r,z*r);
    }
    result.computeVertexNormals();return result;
  });
  const flutedColumn=geometry('stage-fluted-stone-column',()=>{
    const result=new THREE.CylinderGeometry(1,1,1,64,12),pos=result.attributes.position;
    for(let i=0;i<pos.count;i++){
      const x=pos.getX(i),z=pos.getZ(i),a=Math.atan2(z,x),r=1+.055*Math.cos(a*16);
      pos.setXYZ(i,x*r,pos.getY(i),z*r);
    }
    result.computeVertexNormals();return result;
  });
  const mesh=(name,shape,hex,position,scale=[1,1,1],rotation=[0,0,0],transparent=false)=>
    remember(add(name,tint(shape,hex),transparent?mist():solid,position,scale,rotation));
  const slab=(name,hex,x,y,z,w,h,d,rotation=[0,0,0],transparent=false)=>mesh(name,box,hex,[x,y,z],[w,h,d],rotation,transparent);
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
  const shape=(name,positions,faces,colors)=>geometry(`stage-${profile.cardId}-${index++}-${name}`,()=>{
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

  const deck=(name,hex,path,width,thickness=.2,segments=48)=>{
    const result=curvedDeck(name,solid,path,width,thickness,segments),c=color(hex),values=[];
    for(let i=0;i<result.geometry.attributes.position.count;i++)values.push(c.r,c.g,c.b);
    result.geometry.setAttribute('color',new THREE.Float32BufferAttribute(values,3));return remember(result);
  };
  const arch=(name,x,y,z,w,h,hex,angle=0)=>{
    const point=(u,v)=>[x+Math.cos(angle)*u,y+v,z-Math.sin(angle)*u],stem=h-w/2;
    for(const side of [-1,1])line(name,hex,point(side*w/2,0),point(side*w/2,stem),.19);
    tube(name,hex,t=>point(Math.cos(t*Math.PI)*w/2,stem+Math.sin(t*Math.PI)*w/2),.19,32);
  };
  const window=(name,x,y,z,w,h,hex)=>{
    const pts=[[x-w/2,y,z],[x+w/2,y,z]];
    for(let i=0;i<=16;i++){const a=i*Math.PI/16;pts.push([x+Math.cos(a)*w/2,y+h-w/2+Math.sin(a)*w/2,z]);}
    polygon(name,pts,hex);line(name,p.wood,[x,y,z+.035],[x,y+h,z+.035],.045);
    for(let i=1;i<3;i++)line(name,p.wood,[x-w/2,y+h*i/3,z+.035],[x+w/2,y+h*i/3,z+.035],.04);
  };
  const disc=(name,x,y,z,r,h,hex)=>mesh(name,cylinder,hex,[x,y,z],[r,h,r]);
  const star=(name,x,y,z,r,hex)=>polygon(name,Array.from({length:10},(_,i)=>{const a=i*Math.PI/5-Math.PI/2,s=i%2?r*.4:r;return[x+Math.cos(a)*s,y+Math.sin(a)*s,z];}),hex);
  const heart=(name,x,y,z,r,hex,fill=false)=>{
    const path=t=>{const a=t*Math.PI*2;return[x+Math.pow(Math.sin(a),3)*r,y+(13*Math.cos(a)-5*Math.cos(2*a)-2*Math.cos(3*a)-Math.cos(4*a))*r/16,z];};
    if(fill)polygon(name,Array.from({length:64},(_,i)=>path(i/64)),hex);
    tube(name,hex,path,.065,64);
  };
  const lightBeam=(name,x,y,z,tx,ty,tz,width,hex)=>{
    const pts=[[x,y,z],[tx-width,ty,tz-width*.25],[tx+width,ty,tz-width*.25],[tx+width,ty,tz+width*.25],[tx-width,ty,tz+width*.25]],faces=[0,1,2,0,2,3,0,3,4,0,4,1],c=color(hex);
    remember(add(name,shape(name,pts.flat(),faces,pts.flatMap(()=>[c.r,c.g,c.b])),mist(),[0,0,0]));
  };
  const lamp=(name,x,y,z,hex=p.accent)=>{
    mesh(name,oval,hex,[x,y,z],[.32,.55,.32]);mesh(name,cylinder,p.wood,[x,y-.45,z],[.38,.12,.38]);
  };
  const musicNote=(name,x,y,z,r,hex)=>{
    mesh(name,oval,hex,[x,y,z],[r*.48,r*.32,.09],[0,0,.25]);line(name,hex,[x+r*.35,y,z],[x+r*.35,y+r*2.4,z],.06);
    tube(name,hex,t=>[x+r*.35+t*r*.9,y+r*2.4-Math.sin(t*Math.PI)*r*.5,z],.065,24);
  };
  const arcadeMasonry=(name,x,y,z,w,h,hex,angle=0)=>{
    const r=w*.42,c=Math.cos(angle),s=Math.sin(angle),local=(px,py)=>[x+px*c,y+py,z+px*s];
    for(const side of [-1,1]){const pt=local(side*w*.49,(h-r)/2);mesh(name,box,hex,pt,[w*.18,h-r,.65],[0,-angle,0]);}
    grid(name,(u,v)=>{const px=(u-.5)*r*2,lower=h-r+Math.sqrt(Math.max(0,r*r-px*px));return local(px,lower+v*(h+.9-lower));},hex,32,4);
  };
  switch(profile.cardId){
    case '2674965':{
      for(const [y,r,h]of[[1,10,.8],[2.3,8.5,.6],[3.2,6.5,.5],[24,11,1.1],[25.4,12,.7]]){
        disc('argostars-concentric-cyan-platform',0,y,-33,r,h,p.stone);mesh('argostars-luminous-platform-rim',ring,p.accent,[0,y+.4,-33],[r,r,1],[-Math.PI/2,0,0]);
      }
      for(const x of [-9,-4,4,9]){mesh('argostars-round-tilted-light-pod',cylinder,p.wood,[x,2,-23.7],[.8,.55,.8],[1.1,0,.25]);mesh('argostars-round-tilted-light-pod',oval,p.accent,[x,2.45,-23.3],[.62,.2,.62],[.7,0,0]);}
      lightBeam('argostars-central-cyan-light-volume',0,24,-33,0,3.5,-33,4,p.accent);star('argostars-canopy-star',0,26,-22.5,1.25,p.foam);
      for(const side of [-1,1])for(let i=0;i<18;i++){const a=i*Math.PI/9;line('argostars-fine-firework-rays',side<0?'#e9a9e5':'#d5ec75',[side*16,18,-33],[side*16+Math.cos(a)*4,18+Math.sin(a)*4,-33],.018);}
      break;
    }
    case '67616300':{
      for(const side of [-1,1]){land('chicken-narrow-cliff-road',side*18,-9,9,35,2.3,p.ground);crag('chicken-fractured-road-cliff',side*21,-14,3.5,12,6,p.stone,side,.88);leaves('chicken-dense-dark-forest',side*20,8,-29,5,p.foliage);}
      for(let i=0;i<5;i++)cloud('chicken-pale-valley-mist',-20+i*10,3,-34,10,p.foam);
      break;
    }
    case '5833312':{
      land('academy-forested-island-shelf',0,-34,45,16,3.5,p.foliage);
      crag('academy-steep-smoke-volcano',0,-40,13,5.8,26,p.wood,2,.02);
      for(let i=0;i<3;i++)cloud('academy-white-volcanic-plume',1+i*.7,27+i*1.4,-41,4+i,p.foam);
      disc('academy-white-round-campus-roof',0,13,-29,3.5,.8,p.foam);disc('academy-gold-round-roof',0,9,-25,1.8,.5,'#e0c46b');
      for(let i=0;i<7;i++){const a=i*Math.PI*2/7,x=Math.cos(a)*6,z=-29+Math.sin(a)*4.5;
        pyramid('academy-tall-gold-campus-fin',x,3.5,z,2.5,11+i%3,2,.02,'#d4b273');
        mesh('academy-campus-white-column',cylinder,p.foam,[Math.cos(a)*3,8,-29+Math.sin(a)*2],[.24,9,.24]);
      }
      for(const side of [-1,1]){
        grid('academy-blue-shore-water',(u,v)=>[side*20+(u-.5)*13,-.2,-9+(v-.5)*33],'#316d9a',48,16);
        for(let i=0;i<4;i++)leaves('academy-small-forest-crown',side*(14+i*2),4,-28+i*3,1.2,p.foliage);
      }
      ribbon('academy-narrow-coastal-waterfall',p.foam,t=>[21+.3*Math.sin(t*5),5-t*5,-2],.6,false,28);
      for(let i=0;i<10;i++)slab('academy-front-campus-step',p.stone,0,3.5+i*.17,-20.5-i*.4,5.5,.2,.42);
      break;
    }
    case '91002901':{
      disc('assault-round-metallic-base',0,.8,-32,7.5,1.4,p.stone);mesh('assault-blue-base-rim',ring,p.accent,[0,1.55,-32],[7.4,7.4,1],[-Math.PI/2,0,0]);
      for(const [hex,phase]of[['#f7ce56',0],['#6ce6ed',Math.PI]])ribbon('assault-winding-energy-ribbon',hex,t=>{const a=phase+t*Math.PI*3.2,r=2+t*8;return[Math.cos(a)*r,3+t*22,-31+Math.sin(a)*2];},t=>.6+t*1.5,true,96);
      tube('assault-pink-curved-band','#ec8adf',t=>{const a=t*Math.PI*3.4;return[Math.cos(a)*(3+t*8),2+t*20,-30+Math.sin(a)*3];},.13,100);
      for(let i=0;i<22;i++)line('assault-pale-radial-streak',p.foam,[-17+i*1.6,2,-36],[-24+i*2.2,29,-40],.017);
      break;
    }
    case '43940008':{
      pyramid('duel-tall-silver-polygon-spire',0,2,-33,4.5,29,4,.08,p.stone);
      disc('duel-round-wide-tower-base',0,1,-33,10,1.8,p.stone);
      for(const side of [-1,1]){
        polygon('duel-long-sloping-outrigger',[[side*.9,28,-33],[side*9,2,-29],[side*5,2,-29],[side*2,19,-33]],'#a5b2c0');
        line('duel-outrigger-panel-seam','#626d7a',[side*2,22,-32.8],[side*7.8,3,-28.9],.055);
        for(let i=0;i<4;i++)slab('duel-broken-concrete-edge',p.stone,side*(18+i*.7),2+i*1.6,-19-i*1.5,1.5,4+i,1.3);
        for(let i=0;i<7;i++)line('duel-exposed-wall-rebar',p.wood,[side*(17+i*.7),2+i*.8,-18.7],[side*(18+i*.7),8+i*.5,-19],.035);
      }
      for(let i=0;i<8;i++)line('duel-tower-horizontal-panel-seam',p.wood,[-1.6,4+i*3,-30.98],[1.6,4+i*3,-30.98],.025);
      break;
    }
    case '19162134':{
      for(const side of [-1,1]){
        slab('dueltaining-cyan-pink-light-panel',side<0?'#70f7eb':'#e497db',side*13,13,-35,6,22,.16);
        for(let i=0;i<6;i++)line('dueltaining-rectilinear-panel-rib',p.foam,[side*16,3+i*3.5,-34.8],[side*10,3+i*3.5,-34.8],.055);
        polygon('dueltaining-long-pale-shard',[[side*20,1,-29],[side*10,26,-34],[side*15,5,-30]],p.foam);
      }
      for(let i=0;i<3;i++)tube('dueltaining-gold-orbit-rod','#b6aa68',t=>{const a=t*Math.PI*1.4+i;return[5+Math.cos(a)*10,13+Math.sin(a)*8,-29];},.12,48);
      for(let i=0;i<12;i++)mesh('dueltaining-green-orbit-node',oval,'#6aba86',[-15+i%6*6,7+Math.floor(i/6)*12,-28],[.38,.38,.15]);
      for(let i=0;i<8;i++)star('dueltaining-pale-star-glint',-20+i*5.7,5+i%3*8,-27,.4,p.foam);
      break;
    }
    case '39838559':{
      for(const side of [-1,1]){
        const path=t=>[side*(17+Math.sin(t*Math.PI)*4),1+Math.sin(t*Math.PI)*3,-34+t*43];
        deck('circuit-banked-curving-road',p.stone,path,5,.3);tube('circuit-cyan-curving-rail',p.accent,t=>{const pt=path(t);return[pt[0]-side*2.3,pt[1]+.3,pt[2]];},.095,64);
        for(let i=0;i<7;i++){const t=i/6,pt=path(t);line('circuit-tall-track-support',p.wood,[pt[0],0,pt[2]],[pt[0],pt[1]-.2,pt[2]],.12);polygon('circuit-orange-arrow-mark',[[pt[0]-.6,pt[1]+.2,pt[2]-.45],[pt[0]+.6,pt[1]+.2,pt[2]-.45],[pt[0],pt[1]+.2,pt[2]+.55]],'#ecb358');}
      }
      for(let i=0;i<5;i++){slab('circuit-scoreboard-window','#24344d',-18+i*9,6,-38,7,4,.5);circuit('circuit-green-floor-lines',-18+i*9,.25,-27,6,.4,2,'#6dc56d');}
      for(let i=0;i<4;i++)slab('circuit-translucent-hud-panel','#a0ecf1',-16+i*10,20,-38,4.5,3,.04,[0,0,.12],true);
      break;
    }
    case '1061200':{
      slab('city-blue-map-table','#42799a',0,.3,-32,42,.4,15);
      for(let i=0;i<9;i++){
        const x=-17+i%5*8,z=-36+Math.floor(i/5)*7,h=2+i%4*3,w=2+i%2;
        slab('city-translucent-map-tower','#6faac0',x,h/2+.7,z,w,h,w,[0,0,0]);
        for(const dx of [-w/2,w/2])for(const dz of [-w/2,w/2])line('city-cyan-outline-tower',p.accent,[x+dx,.7,z+dz],[x+dx,h+.7,z+dz],.025);
        for(const y of [.7,h+.7])for(const dz of [-w/2,w/2])line('city-cyan-outline-tower',p.accent,[x-w/2,y,z+dz],[x+w/2,y,z+dz],.025);
      }
      const pts=[[-19,.6,-27],[-12,.6,-27],[-12,.6,-32],[-5,.6,-32],[-5,.6,-28],[2,.6,-28],[2,.6,-35],[9,.6,-35],[9,.6,-28],[18,.6,-28]];
      for(let i=0;i<pts.length-1;i++)line('city-pink-zigzag-route','#f3a4de',pts[i],pts[i+1],.11);
      for(const side of [-1,1])for(let i=0;i<3;i++)slab('city-floating-cyan-diagram',p.accent,side*(15-i*2),15+i*2,-39,3,2,.03,[0,0,side*.2],true);
      break;
    }
    case '2144946':{
      for(const [x,z,h,w]of[[-16,-34,15,8],[0,-39,23,9],[15,-35,19,7]]){
        slab('offroad-luminous-highrise',p.stone,x,h/2,z,w,h,5);
        for(let i=0;i<8;i++)slab('offroad-horizontal-lit-facade',i%2?p.accent:p.foam,x,2+i*(h-3)/8,z+2.53,w*.96,.32,.04);
      }
      for(const side of [-1,1]){
        land('offroad-rough-rock-ramp',side*19,-8,13,34,5,p.wood,side,.18);
        for(let i=0;i<9;i++)crag('offroad-small-angular-track-rock',side*(14+i%3*3),-22+Math.floor(i/3)*7,.65,.8,.7+i%2*.5,p.stone,i,.35);
        tube('offroad-winding-overhead-rail','#cabd67',t=>[side*(17+Math.sin(t*6)*3),16+Math.sin(t*5)*5,-32+t*36],.13,68);
        mesh('offroad-suspended-oval-lamp',oval,p.stone,[side*17,28,-29],[3,.35,1.5]);lightBeam('offroad-pale-spot-volume',side*17,27,-29,side*17,1,-27,4,p.accent);
      }break;
    }
    case '58012707':{
      land('ballpark-round-ochre-mound',0,-31,39,12,3.3,p.ground,1);
      for(const side of [-1,1]){land('ballpark-green-edge-bank',side*20,-4,13,32,2,p.foliage);for(let i=0;i<4;i++)leaves('ballpark-distant-green-woodline',side*(12+i*3),4,-38,2.3,p.foliage);}
      for(let i=0;i<24;i++)line('ballpark-fine-pale-action-streak',p.foam,[-17+i*1.45,2,-33],[-24+i*2,22,-37],.014);
      break;
    }
    case '85638822':{
      for(const x of [-21,-10,0,10,21])line('gouki-silver-cage-frame',p.stone,[x,0,-31],[x,24,-31],.17);
      for(const y of [0,8,16,24])line('gouki-silver-cage-frame',p.stone,[-21,y,-31],[21,y,-31],.17);
      for(let i=0;i<27;i++){
        const x=-21+i*1.6;line('gouki-diagonal-chainlink',p.wood,[x,0,-30.9],[Math.min(21,x+9),Math.min(24,(21-x)*2.6),-30.9],.016);
        line('gouki-diagonal-chainlink',p.wood,[x,24,-30.85],[Math.min(21,x+9),Math.max(0,24-(21-x)*2.6),-30.85],.016);
      }
      line('gouki-red-padded-corner',p.wood,[14,0,-21],[14,7,-21],.28);
      for(let i=0;i<3;i++){slab('gouki-black-turnbuckle-pad','#30363a',14,1.4+i*2,-20.7,.9,.7,.75);line('gouki-black-ring-rope','#30363a',[14,1.4+i*2,-20.6],[22,1.4+i*2,-20.6],.08);}
      for(const side of [-1,1])lightBeam('gouki-white-edge-flash',side*20,20,-30,side*20,2,-28,3,p.foam);
      break;
    }
    case '32391631':{
      for(const [y,h,w]of[[0,9,4.4],[10,5.5,3.7],[17,5,3.6]]){
        for(let i=0;i<9;i++){const a=.16+i*Math.PI*.88/8,x=Math.cos(a)*22,z=-29-Math.sin(a)*7,angle=Math.atan2(7*Math.cos(a),-22*Math.sin(a));
          arch('savage-three-tier-stone-arcade',x,y,z,w,h,p.stone,angle);arcadeMasonry('savage-solid-stone-arcade',x,y,z-.12,w,h,p.stone,angle);mesh('savage-round-stone-column',flutedColumn,p.stone,[x+w*.45,y+h*.4,z],[.3,h*.8,.3]);}
        tube('savage-curved-horizontal-stone-band',p.stone,t=>[Math.cos(t*Math.PI)*23,y+h+.6,-29-Math.sin(t*Math.PI)*7],.38,72);
      }
      for(let i=0;i<16;i++)slab('savage-chipped-upper-rim',p.stone,-22+i*2.9,23+i%3*.35,-29-Math.sin(i/15*Math.PI)*7,1.4,1.2+i%3*.3,.8);
      cloud('savage-violet-inner-glow',0,13,-42,26,p.accent);break;
    }
    case '5063379':{
      for(let i=0;i<6;i++){const x=-20+i*8;slab('flavian-gold-maze-wall',p.stone,x,11,-37,7.5,20,1);circuit('flavian-cyan-wall-maze',x,11,-36.4,6,16,2);for(let j=0;j<3;j++)mesh('flavian-pointed-gold-crown',cone,p.wood,[x+(j-1)*2,22,-37],[.55,2,.55]);}
      disc('flavian-round-jagged-fountain',0,1.5,-30,6,2,p.accent);
      for(let i=0;i<12;i++){const a=i*Math.PI/6;crag('flavian-pale-jagged-water-spire',Math.cos(a)*4,-30+Math.sin(a)*3,.8,.8,3+i%3,p.foam,i,.02);}
      mesh('flavian-suspended-crown-ring',ring,p.wood,[0,15,-31],[7,7,2],[-Math.PI/2,0,0]);
      for(let i=0;i<10;i++){const a=i*Math.PI/5;mesh('flavian-pointed-gold-crown',cone,p.wood,[Math.cos(a)*7,16,-31+Math.sin(a)*7],[.5,2,.5]);}
      for(const side of [-1,1]){slab('flavian-corner-circuit-pylon',p.wood,side*17,4,-21,3,8,3);circuit('flavian-corner-circuit-pylon',side*17,4,-19.4,2,6,1);}
      break;
    }
    case '90173539':{
      for(const side of [-1,1]){land('dino-sandy-court-edge',side*19,-7,13,35,1.3,p.ground);for(let i=0;i<6;i++)fern('dino-layered-jungle-frond',side*(13+i%3*4),3+i%2,-22+Math.floor(i/3)*11,4,i*.8,p.foliage);}
      land('dino-sandy-court-edge',0,-32,42,10,1.3,p.ground);
      for(const y of [1,3.5,6])tube('dino-curved-red-fence',p.wood,t=>[Math.cos(t*Math.PI)*22,y,-26-Math.sin(t*Math.PI)*9],.09,80);
      for(let i=0;i<19;i++){const a=i*Math.PI/18;line('dino-curved-red-fence',p.wood,[Math.cos(a)*22,.3,-26-Math.sin(a)*9],[Math.cos(a)*22,6,-26-Math.sin(a)*9],.07);}
      for(let i=0;i<20;i++){const a=i*Math.PI/19;tube('dino-fine-mesh-wire','#a79473',t=>[Math.cos(a+.035*t)*22,1+t*4.5,-26-Math.sin(a+.035*t)*9],.012,14);}
      for(let i=0;i<4;i++)lightBeam('dino-diagonal-sunlight',-16+i*11,26,-38,-20+i*10,1,-30,1.5,p.foam);break;
    }
    case '38053381':{
      for(const r of [7.1,7.6])mesh('generaider-double-luminous-wheel',ring,p.accent,[0,14,-32],[r,r,1]);
      const nodes=Array.from({length:6},(_,i)=>[Math.cos(i*Math.PI/3+Math.PI/6)*4.5,14+Math.sin(i*Math.PI/3+Math.PI/6)*4.5]);nodes.push([0,24],[0,4],[0,14]);
      for(const [x,y]of nodes){mesh('generaider-nine-round-nodes',oval,p.foam,[x,y,-31.7],[1,1,.15]);mesh('generaider-nine-round-nodes',ring,p.accent,[x,y,-31.5],[1.1,1.1,.6]);}
      for(let i=0;i<6;i++){const a=i*Math.PI/3;polygon('generaider-wide-radial-wedge',[[0,14,-31.9],[Math.cos(a-.04)*8.1,14+Math.sin(a-.04)*8.1,-31.9],[Math.cos(a+.04)*8.1,14+Math.sin(a+.04)*8.1,-31.9]],p.foam);}
      line('generaider-vertical-node-spine',p.foam,[0,4,-32],[0,24,-32],.09);
      for(const r of [3,6,8])mesh('generaider-concentric-floor-ring',ring,p.accent,[0,.2,-33],[r,r,1],[-Math.PI/2,0,0]);
      for(let i=0;i<8;i++)circuit('generaider-blue-floor-diagram',-20+i*5.7,1,-38,4,1.5,1,'#356bbb');break;
    }
    case '7617062':{
      for(const x of [-15,0,15]){arch('museum-gray-arched-alcove',x,0,-35,10,18,p.stone);arcadeMasonry('museum-solid-arched-stone-wall',x,0,-35.1,10,18,p.stone);slab('museum-cracked-stone-wall',p.stone,x,4,-36,9,7,1);}
      for(const side of [-1,1])for(let i=0;i<4;i++){const x=side*(12+i*3),z=-18+i*7;line('museum-brass-rope-post',p.wood,[x,0,z],[x,2.5,z],.1);mesh('museum-brass-rope-post',oval,p.wood,[x,2.6,z],[.22,.22,.22]);if(i<3)tube('museum-red-hanging-rope','#926361',t=>[x+side*3*t,2.35-Math.sin(t*Math.PI)*.6,z+t*7],.065,24);}
      mesh('museum-gilded-oval-mirror-frame',ring,p.wood,[10,15,-33],[3,4.5,.9]);
      for(let i=0;i<5;i++)tube('museum-angular-wall-crack','#364854',t=>[-20+i*9+Math.sin(t*13)*.3,1+t*5,-35.35],.035,28);
      break;
    }
    case '29400787':{
      for(const [x,z,w,h]of[[-15,-36,11,15],[1,-40,12,20],[17,-35,10,18]]){
        slab('parade-purple-gabled-house',p.stone,x,h/2,z,w,h,5);pyramid('parade-purple-gabled-roof',x,h,z,w+1,4,5.5,0,p.wood);
        for(const dx of [-w*.25,w*.25])window('parade-tall-lit-window',x+dx,3,z+2.6,1.7,4,p.accent);
        for(let i=0;i<5;i++)line('parade-brick-masonry-course',p.wood,[x-w/2,1+i*2.5,z+2.6],[x+w/2,1+i*2.5,z+2.6],.03);
      }
      for(const side of [-1,1]){line('parade-three-head-street-lamp',p.wood,[side*15,0,-20],[side*15,10,-20],.1);for(const dx of [-.8,0,.8])lamp('parade-three-head-street-lamp',side*15+dx,10+(!dx?.7:0),-20,p.accent);}
      for(let i=0;i<14;i++){const x=(i%2?1:-1)*(14+i%3),y=21+i%4;mesh('parade-pink-purple-balloon',oval,i%2?'#ce99dc':'#e6b5d6',[x,y,-30],[.8,1,.6]);line('parade-fine-balloon-string',p.foam,[x,y-1,-30],[x*.92,14,-30],.013);}
      for(let i=0;i<18;i++)slab('parade-blue-cobbled-paver',i%2?'#66799e':'#8193ad',-18+i%6*7,.05,-22-Math.floor(i/6)*3.6,5.8,.16,2.8);
      break;
    }
    case '15388353':{
      slab('restaurant-lavender-two-storey-wall',p.stone,0,10,-35,22,18,4);
      for(const side of [-1,1]){mesh('restaurant-round-corner-turret',cylinder,p.stone,[side*10.5,10,-34],[2,20,2]);mesh('restaurant-slate-cone-turret-roof',cone,p.wood,[side*10.5,23,-34],[2.5,7,2.5]);window('restaurant-warm-turret-window',side*10.5,4,-31.9,1.3,5,p.accent);}
      for(const x of [-6,0,6])for(const y of [2,12])window('restaurant-gold-arched-window',x,y,-32.9,3.7,6,p.accent);
      slab('restaurant-steep-slate-roof',p.wood,0,21,-35,22,.6,7,[.45,0,0]);
      slab('restaurant-baluster-balcony',p.stone,0,10,-31,20,.45,3);
      for(let i=0;i<15;i++){mesh('restaurant-baluster-balcony',oval,p.foam,[-9.5+i*1.36,11,-29.5],[.19,.65,.19]);}
      for(let i=0;i<17;i++)slab('restaurant-two-stair-levels',p.stone,0,.2+i*.2,-20.5-i*.6,9,.24,.62);
      arch('restaurant-iron-entrance-arch',0,3.5,-27,8,9,'#526371');
      for(const side of [-1,1]){line('restaurant-stair-balustrade',p.foam,[side*5,1,-21],[side*5,4,-29],.16);for(let i=0;i<3;i++){const z=-22-i*6;line('restaurant-warm-lantern-post',p.wood,[side*15,0,z],[side*15,6,z],.1);lamp('restaurant-warm-lantern-post',side*15,6.2,z,p.accent);}leaves('restaurant-green-edge-hedge',side*18,2,-29,3,p.foliage);}
      break;
    }
    case '49370016':{
      for(let i=0;i<9;i++){const a=i*Math.PI*2/9,x=Math.cos(a)*10,y=14+Math.sin(a)*9;
        polygon('punk-violet-radial-petal-panel',[[0,14,-35],[x-1,y,-35],[x,y+3,-35],[x+2,y,-35]],i%2?'#805cb5':'#584e9b');mesh('punk-cyan-speaker-node',oval,p.accent,[x*.8,y,-33],[1.1,1.1,.2]);mesh('punk-cyan-speaker-node',ring,p.stone,[x*.8,y,-32.7],[1.2,1.2,.8]);}
      for(const side of [-1,1])for(let i=0;i<3;i++){slab('punk-angular-speaker-panel',p.stone,side*(13+i*2),3+i*5,-31,4,3,.7,[0,0,side*.3]);mesh('punk-cyan-speaker-node',oval,p.accent,[side*(13+i*2),3+i*5,-30.5],[.8,.8,.18]);}
      for(const [x,y]of[[-12,23],[12,24],[0,7]]){mesh('punk-gold-radial-hub',oval,p.foam,[x,y,-30],[1,1,.2]);for(let i=0;i<8;i++){const a=i*Math.PI/4;line('punk-gold-radial-hub',p.wood,[x+Math.cos(a),y+Math.sin(a),-30],[x+Math.cos(a)*3.2,y+Math.sin(a)*3.2,-30],.065);}}
      for(const side of [-1,1])tube('punk-colored-light-tube','#df9bc3',t=>[side*(22-4*t),1+t*23,-29],.17,24);break;
    }
    case '55553602':{
      for(const side of [-1,1])grid('dramatic-curving-red-curtain',(u,v)=>[side*(12+u*10),2+v*25,-33+Math.sin(u*20)*.55],(u,v)=>u% .2<.1?'#be756b':'#975452',64,20);
      ribbon('dramatic-black-star-trim','#35313f',t=>[-22+t*44,24-Math.sin(t*Math.PI)*3,-30],1.8,false,64);
      for(let i=0;i<14;i++)star('dramatic-blue-star-mark',-20+i*3.1,22-i%3*.5,-29.8,.45,'#8b99c4');
      for(const x of [-10,10])line('dramatic-cyan-stage-framework',p.accent,[x,0,-29],[x,20,-29],.12);
      line('dramatic-cyan-stage-framework',p.accent,[-10,20,-29],[10,20,-29],.12);
      disc('dramatic-round-pale-stage',0,.4,-31,8,.6,p.foam);mesh('dramatic-gold-ring-prop',ring,p.wood,[8,8,-28],[2.5,2.5,.7]);
      for(let i=0;i<14;i++)mesh('dramatic-cyan-round-footlight',oval,p.accent,[-9+i*1.4,1.3,-24.2],[.12,.12,.12]);break;
    }
    case '29650040':{
      for(let i=0;i<16;i++)musicNote('harmonia-purple-cyan-orange-note',-20+i%8*5.6,3+Math.floor(i/8)*12,-29,.55+i%3*.18,['#b69bdb','#9ed2d4','#e1b685'][i%3]);
      for(let i=0;i<5;i++)line('harmonia-diagonal-pale-music-staff',p.foam,[-23,2+i*.6,-33],[23,21+i*.6,-33],.035);
      for(let i=0;i<5;i++)ribbon('harmonia-curled-orange-cloud-band','#e7c18f',t=>[-21+t*42,4+i*4+Math.sin(t*12+i)*1.3,-35],1.4,true);
      for(let i=0;i<20;i++)mesh('harmonia-tiny-pale-ring',ring,p.foam,[-21+i%10*4.6,1+Math.floor(i/10)*21,-28],[.16,.16,.3]);break;
    }
    case '63492244':{
      for(let i=0;i<20;i++)mesh('arena-green-diamond-lamp-matrix',box,p.accent,[-6+i%5*3,20+Math.floor(i/5)*1.6,-34],[.9,.9,.2],[0,0,Math.PI/4]);
      for(const side of [-1,1]){slab('arena-red-owl-side-panel',p.wood,side*16,22,-35,5,5,.6);for(const dx of [-1.1,1.1])mesh('arena-glowing-oval-eyes',oval,p.foam,[side*16+dx,22.5,-34.6],[.75,1,.1]);lightBeam('arena-broad-colored-spotlight',side*17,25,-34,side*12,1,-25,5,side<0?'#b6f4c1':'#e6b6da');}
      for(let i=0;i<8;i++)heart('arena-colored-heart-outline',-20+i%4*13,5+Math.floor(i/4)*9,-29,1.5,['#e8b8da','#ddec98','#b8ebc6'][i%3]);
      for(let i=0;i<14;i++)flower('arena-multicolor-flower-border',-20+i*3.1,1,-23,.4,['#f2c2db','#d6cba2','#b2dab8'][i%3]);
      break;
    }
    case '51208046':{
      heart('live-large-pink-heart-panel',0,15,-36,8,'#dc9bc5',true);
      for(const side of [-1,1]){
        polygon('live-jagged-gold-heart-border',[[side*7,7,-35],[side*12,10,-35],[side*8.5,12,-35],[side*16,22,-35],[side*7.5,18,-35]],'#dfc173');
        slab('live-white-speaker-cabinet',p.foam,side*15,6,-31,4.5,11,2);for(let i=0;i<3;i++)mesh('live-dark-round-speaker-driver',oval,'#484454',[side*15,2.3+i*3.2,-29.9],[1.35,1.35,.1]);
      }
      for(let i=0;i<28;i++)mesh('live-overhead-round-stage-lamp',oval,p.foam,[-21+i%14*3.2,25+Math.floor(i/14)*2,-33],[.28,.28,.12]);
      slab('live-wide-performance-platform',p.stone,0,.5,-30,34,.7,8);for(const x of [-9,-3,3,9])slab('live-small-black-floor-monitor','#35323d',x,1.2,-25.8,1.3,.65,.7,[.2,0,0]);
      for(const side of [-1,1])lightBeam('live-yellow-green-light-volume',side*17,25,-33,side*8,1,-29,4,side<0?'#eddda4':'#b2ebc5');break;
    }
    case '35371948':{
      slab('light-wide-cyan-display-panel','#afdcd4',0,7,-33,25,10,.2);
      for(let i=0;i<18;i++)mesh('light-small-warm-screen-rim',oval,p.foam,[-13+i*1.53,1.6,-32.7],[.1,.1,.05]);
      for(const side of [-1,1]){slab('light-floral-jewel-side-column',p.foliage,side*16,8,-32,4,16,2);for(let i=0;i<8;i++){heart('light-floral-jewel-side-column',side*16,2+i*1.8,-30.9,.42,['#dcbe66','#e6abd0','#a6d5bb'][i%3],true);}tube('light-gold-scroll-crest',p.wood,t=>{const a=t*Math.PI*3,r=1+t*2;return[side*(2+Math.cos(a)*r),15+Math.sin(a)*r,-32];},.13,60);}
      for(let i=0;i<12;i++)mesh('light-curved-pale-baluster',cylinder,p.foam,[-18+i*3.3,.8,-24.5-Math.sin(i/11*Math.PI)*2],[.17,1.5,.17]);
      tube('light-curved-pale-baluster',p.foam,t=>[-19+t*38,1.6,-24.5-Math.sin(t*Math.PI)*2],.16,64);
      for(let i=0;i<10;i++)heart('light-small-floating-heart',-20+i%5*10,18+Math.floor(i/5)*6,-30,.45,p.accent,true);break;
    }
  }
  mergeStageMeshes(THREE,root,meshes,geometry,add,profile.cardId);
  createFieldReferenceDetailGeometry(ctx);return true;
}
function mergeStageMeshes(THREE,root,meshes,geometry,add,id){
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
    const combined=geometry(`stage-merged-${id}-${index++}`,()=>{
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
