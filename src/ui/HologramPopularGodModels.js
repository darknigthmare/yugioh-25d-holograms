import * as THREE from 'three';

// Exact original-art IDs. This map adds presentation only; summons, protection,
// damage and variable ATK/DEF remain entirely owned by the native card scripts.
export const POPULAR_GOD_MODEL_PROFILES = Object.freeze(Object.fromEntries([
  ['10000020', { id: 'slifer-sky-dragon', family: 'dragon', anatomy: 'crimson-double-jawed-god', body: '#c83738', accent: '#f25c55', hair: '#241f26', eye: '#e9e55a', attack: 'dragon-burst', bodyMetalness: 0.27, bodyRoughness: 0.45, referenceArt: '/cards/cropped/10000020.jpg' }],
  ['10000000', { id: 'obelisk-tormentor', family: 'warrior', anatomy: 'azure-armored-god', body: '#568ea8', accent: '#94bdc8', hair: '#183d50', eye: '#adf0e9', attack: 'impact', bodyMetalness: 0.22, bodyRoughness: 0.53, referenceArt: '/cards/cropped/10000000.jpg' }],
  ['10000010', { id: 'winged-dragon-ra', family: 'dragon', anatomy: 'golden-mechanical-sun-god', body: '#c89526', accent: '#f5d45b', hair: '#463116', eye: '#dbecbd', attack: 'dragon-burst', bodyMetalness: 0.7, bodyRoughness: 0.31, referenceArt: '/cards/cropped/10000010.jpg' }]
].map(([id, profile]) => [id, Object.freeze(profile)])));

/** Three closed-volume anatomies, using the existing batched, articulated rig. */
export function buildPopularGodMonsterAnatomy(profile, build) {
  const { part, sphere, box, cone, rod } = build;
  function plate(name, material, points, depth, z, tint) {
    const shape = new THREE.Shape();
    points.forEach(([x, y], i) => i ? shape.lineTo(x, y) : shape.moveTo(x, y));
    shape.closePath();
    part(name, new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 3, steps: 1 }), material, [0, 0, z], undefined, undefined, tint);
  }
  function tube(name, material, points, width, segments, tint) {
    const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
    const radialSegments = 12, stride = radialSegments + 1;
    const geometry = new THREE.TubeGeometry(curve, segments, width, radialSegments, false);
    // Taper tight bends so the inside of a tube does not turn through itself.
    // Recompute surface normals for the resulting changing radius, once at
    // construction; the pose rig never uploads or changes this geometry.
    const position=geometry.attributes.position;
    for(let row=0;row<=segments;row++) {
      const t=row/segments,low=Math.max(0,t-.005),high=Math.min(1,t+.005);
      const distance=curve.getPointAt(high).distanceTo(curve.getPointAt(low));
      const curvature=curve.getTangentAt(high).distanceTo(curve.getTangentAt(low))/Math.max(distance,1e-8);
      const desiredRadius=width*(name==='slifer-continuous-looped-serpentine-body'?Math.min(1,.18+t*1.82):1);
      const radius=Math.min(desiredRadius,.4/Math.max(curvature,1e-8)),center=curve.getPointAt(t);
      for(let i=0;i<=radialSegments;i++) {
        const vertex=new THREE.Vector3().fromBufferAttribute(position,row*stride+i).sub(center).multiplyScalar(radius/width).add(center);
        position.setXYZ(row*stride+i,vertex.x,vertex.y,vertex.z);
      }
    }
    geometry.computeVertexNormals();
    // TubeGeometry duplicates the radial seam for UVs. Weld its shading normals
    // after reshaping the radius, while retaining the separate hard cap normal.
    const normals=geometry.attributes.normal;
    for(let row=0;row<=segments;row++) {
      const a=row*stride,b=a+radialSegments;
      const normal=new THREE.Vector3().fromBufferAttribute(normals,a).add(new THREE.Vector3().fromBufferAttribute(normals,b)).normalize();
      normals.setXYZ(a,normal.x,normal.y,normal.z);normals.setXYZ(b,normal.x,normal.y,normal.z);
    }
    // Reuse the exact TubeGeometry boundary vertices to close both ends.
    // A sphere cap of the same radius can leave gaps between polygon facets.
    for (const [end, row, direction] of [['start',0,-1],['end',segments,1]]) {
      const center=curve.getPointAt(end==='start'?0:1),normal=curve.getTangentAt(end==='start'?0:1).multiplyScalar(direction);
      const positions=[...center.toArray()],normals=[...normal.toArray()],uv=[.5,.5],indices=[];
      for(let i=0;i<=radialSegments;i++) {
        const offset=(row*stride+i)*3;
        positions.push(...geometry.attributes.position.array.slice(offset,offset+3));
        normals.push(...normal.toArray());uv.push(.5+Math.cos(i*Math.PI*2/radialSegments)*.5,.5+Math.sin(i*Math.PI*2/radialSegments)*.5);
        if(i<radialSegments) indices.push(...(end==='start'?[0,i+1,i+2]:[0,i+2,i+1]));
      }
      const cap=new THREE.BufferGeometry();cap.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));cap.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));cap.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));cap.setIndex(indices);
      part(`${name}-${end}-closed-cap`,cap,material,[0,0,0],undefined,undefined,tint);
    }
    part(name, geometry, material, [0, 0, 0], undefined, undefined, tint);
  }
  function curvedPlate(name, material, commands, depth, z, tint) {
    const shape=new THREE.Shape();for(const [method,...values]of commands)shape[method](...values);shape.closePath();
    part(name,new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelSize:.012,bevelThickness:.012,bevelSegments:2,curveSegments:12,steps:1}),material,[0,0,z],undefined,undefined,tint);
  }
  function tooth(name, position, length, tint = '#dce2db', rotation = [0, 0, Math.PI]) {
    cone(name, 'accent', position, [.035, length, .045], rotation, tint);
  }

  if (profile.anatomy === 'crimson-double-jawed-god') {
    const red = profile.body, pale = '#ece6dc', blue = '#3b99bc';
    const spine = [[1.23,.53,-.37],[1.41,1.04,-.48],[1.03,1.39,-.54],[.36,1.33,-.61],[-.43,1.5,-.65],[-.73,1.92,-.55],[-.47,2.26,-.23],[-.19,2.47,.04],[0,2.82,.08]];
    tube('slifer-continuous-looped-serpentine-body', 'body', spine, .24, 56, red);
    // The reference shows an ebony ventral neck with narrow silver-grey ribs.
    sphere('slifer-ebony-raised-ventral-neck', 'dark', [0, 2.28, .26], [.3, .65, .14], 1, '#171a21');
    for (let i = 0; i < 7; i++) {
      const y = 1.8 + i * .135;
      plate(`slifer-silver-ventral-rib-${i}`, 'accent', [[-.25,y+.04],[-.16,y-.025],[.16,y-.025],[.25,y+.04],[.22,y+.06],[.13,y+.015],[-.13,y+.015],[-.22,y+.06]], .04, .365, '#868b9a');
    }
    sphere('slifer-long-red-armored-skull', 'body', [0, 2.96, .2], [.34, .25, .5], 2);
    plate('slifer-angular-nasal-spear', 'body', [[-.23,3.13],[-.17,3.33],[0,3.4],[.17,3.33],[.23,3.13],[0,2.98]], .42, .35);
    sphere('slifer-azure-forehead-gem', 'accent', [0, 3.31, .65], [.14, .075, .055], 1, blue);
    for (const side of [-1, 1]) {
      // Swept crescent crown horns rather than generic straight cones.
      plate(`slifer-long-swept-crown-horn-${side}`, 'body', [[side*.13,3.22],[side*.38,3.34],[side*.61,3.81],[side*.62,3.4],[side*.42,3.11],[side*.24,3.02]], .13, .13);
      plate(`slifer-side-rear-crown-spike-${side}`, 'body', [[side*.25,3.05],[side*.9,3.53],[side*.65,3.07],[side*.34,2.89]], .13, -.04);
      plate(`slifer-head-side-swept-blade-${side}`, 'body', [[side*.26,2.99],[side*.77,3.17],[side*.6,2.86],[side*.26,2.79]], .12, .2);
      sphere(`slifer-yellow-eye-${side}`, 'eye', [side*.22, 3.02, .62], [.07,.032,.032], 0);
      sphere(`slifer-dark-eye-lid-${side}`, 'dark', [side*.22, 3.065, .617], [.09,.026,.033], 0);
    }
    // Slifer's source has two mouths: a narrow upper mouth and a long open jaw.
    box('slifer-upper-mouth-ebony-gap', 'dark', [0, 2.89, .67], [.46,.08,.15]);
    rod('slifer-upper-mouth-red-ridge', 'body', [-.24,2.99,.68], [.24,2.99,.68], .045);
    for (let i = 0; i < 7; i++) tooth(`slifer-upper-small-fang-${i}`, [-.2+i*.066,2.905,.76], .09);
    sphere('slifer-open-lower-mouth-cavity', 'dark', [0, 2.64, .47], [.26,.3,.18], 1);
    plate('jaw-slifer-long-red-lower-mandible', 'body', [[-.26,2.8],[-.31,2.43],[0,2.25],[.31,2.43],[.26,2.8],[.18,2.48],[0,2.36],[-.18,2.48]], .21, .58);
    for (const side of [-1, 1]) {
      tooth(`slifer-ivory-cheek-tusk-${side}`, [side*.27,2.85,.76], .44, pale);
      for (let i = 0; i < 4; i++) tooth(`jaw-slifer-lower-fang-${side}-${i}`, [side*(.11+i*.035),2.39+i*.055,.79], .09, pale, [0,0,side*.12]);
      rod(`slifer-red-forelimb-${side}`, 'body', [side*.26,1.96,.13], [side*.44,1.54,.34], .1, .12);
      sphere(`slifer-three-clawed-hand-${side}`, 'body', [side*.45,1.46,.4], [.17,.13,.12], 0);
      for (let i=0;i<3;i++) rod(`slifer-silver-hand-claw-${side}-${i}`, 'accent', [side*(.32+i*.13),1.48,.46], [side*(.34+i*.14),1.17,.66], .045,.014, pale);
      const wing = `wing-${side}-slifer`;
      const points = [[side*.3,2.68],[side*.58,3.1],[side*1.64,3.71],[side*1.35,3.12],[side*1.83,2.8],[side*1.6,2.36],[side*1.16,2.4],[side*.74,2.13],[side*.46,2.24]];
      plate(`${wing}-sculpted-crimson-surface`, 'body', points, .075, -.28, '#aa2936');
      plate(`${wing}-dark-inset-membrane`, 'dark', [[side*.5,2.57],[side*1.48,3.5],[side*1.23,3.06],[side*1.65,2.77],[side*1.52,2.5],[side*1.1,2.55],[side*.73,2.27]], .045, -.195, '#291a23');
      rod(`${wing}-long-upper-red-spar`, 'body', [side*.32,2.63,-.17], [side*1.64,3.71,-.17], .075,.018);
      rod(`${wing}-outer-red-spar`, 'body', [side*1.64,3.71,-.17], [side*1.35,3.12,-.17], .06,.045);
      rod(`${wing}-lower-red-spar`, 'body', [side*.4,2.48,-.17], [side*1.83,2.8,-.17], .065,.015);
    }
    for(let i=0;i<5;i++) cone(`slifer-serpentine-red-dorsal-spike-${i}`, 'body', [-.86+i*.35,1.66,-.74], [.09,.27,.09], [.32,0,0]);
    // Thin nested armor seams distinguish the long nasal spear from a generic
    // dragon head, while the eyes sit inside the red swept brow seen in the art.
    for (const side of [-1, 1]) {
      rod(`slifer-eye-swept-red-brow-${side}`, 'body', [side*.08,3.095,.686], [side*.32,3.125,.586], .032,.046,'#9b2230');
      plate(`slifer-cheek-overlapping-crimson-armor-${side}`, 'body', [[side*.21,2.96],[side*.44,2.97],[side*.51,2.74],[side*.31,2.79]], .05, .39, '#b72933');
      tooth(`slifer-long-upper-canine-${side}`, [side*.185,2.93,.788], .2,pale);
      tube(`slifer-swept-ivory-cheek-tusk-${side}`, 'accent', [[side*.26,2.94,.72],[side*.33,2.78,.79],[side*.3,2.62,.83]], .026, 10, pale);
      for(let i=0;i<4;i++) {
        const y=2.37+i*.125;
        rod(`slifer-neck-red-overlap-seam-${side}-${i}`, 'body', [side*.25,y,.26], [side*.29,y+.09,.1], .019,.014,'#851e2c');
      }
      for(let i=0;i<3;i++) {
        const wing=`wing-${side}-slifer`;
        rod(`${wing}-membrane-scallop-ridge-${i}`, 'body', [side*.66,2.69,-.137], [side*(1.04+i*.23),2.52+i*.17,-.137], .019,.014,'#d94847');
      }
    }
    return true;
  }

  if (profile.anatomy === 'azure-armored-god') {
    const blue = profile.body, pale = profile.accent, dark = profile.hair;
    // The printed art crops the figure at the waist. Legs are inferred and
    // deliberately subdued; the source's broad horned upper body is primary.
    sphere('obelisk-massive-blue-torso', 'body', [0,2.18,0], [.72,.67,.42], 2);
    for(const side of [-1,1]) {
      sphere(`obelisk-sculpted-pectoral-${side}`, 'body', [side*.34,2.4,.36], [.37,.25,.15], 2, pale);
      sphere(`obelisk-muscular-flank-${side}`, 'body', [side*.48,1.97,.05], [.22,.4,.3], 1);
      for(let i=0;i<3;i++) sphere(`obelisk-ribbed-abdominal-muscle-${side}-${i}`, 'body', [side*.2,2.03-i*.19,.37], [.24,.13,.115], 0, i===0?blue:pale);
      sphere(`obelisk-huge-angular-shoulder-${side}`, 'body', [side*.98,2.53,0], [.46,.46,.36], 1);
      plate(`obelisk-shoulder-upward-blade-${side}`, 'accent', [[side*.7,2.59],[side*.86,3.36],[side*1.03,3.14],[side*1.26,3.46],[side*1.23,2.85],[side*1.42,2.9],[side*1.15,2.44]], .2, -.02, pale);
      rod(`upper-arm-${side}-obelisk-blue-bicep`, 'body', [side*.93,2.44,.02], [side*1.11,1.91,.16], .25,.3,blue);
      sphere(`hand-${side}-obelisk-armored-elbow`, 'dark', [side*1.11,1.87,.18], [.27,.26,.24], 0,dark);
      rod(`hand-${side}-obelisk-enormous-forearm`, 'body', [side*1.11,1.86,.18], [side*1.07,1.12,.33], .23,.3,blue);
      plate(`hand-${side}-obelisk-bladed-forearm-plate`, 'accent', [[side*.89,1.14],[side*.85,1.71],[side*1.07,2.01],[side*1.3,1.64],[side*1.24,1.15],[side*1.07,.98]], .13,.47,pale);
      sphere(`hand-${side}-obelisk-clenched-fist`, 'body', [side*1.06,.95,.33], [.26,.23,.22], 0);
      for(let i=0;i<4;i++) box(`hand-${side}-obelisk-knuckle-${i}`, 'accent', [side*(.87+i*.105),.95,.54], [.075,.13,.09], [0,0,side*.2],pale);
      // A broken ornamental ridge joins the shoulder to the source chest.
      plate(`obelisk-chest-pointed-collar-${side}`, 'accent', [[side*.06,2.97],[side*.3,2.76],[side*.61,2.99],[side*.56,2.7],[side*.76,2.78],[side*.59,2.53],[side*.33,2.6],[side*.17,2.73]], .08,.34,pale);
      sphere(`obelisk-inferred-blue-thigh-${side}`, 'body', [side*.29,1.15,-.01], [.22,.38,.23], 1);
      rod(`obelisk-inferred-armored-shin-${side}`, 'body', [side*.29,.89,0], [side*.36,.33,.06], .19,.2);
      sphere(`obelisk-inferred-blue-foot-${side}`, 'dark', [side*.36,.2,.18], [.25,.14,.36], 0,dark);
    }
    sphere('obelisk-small-blue-head', 'body', [0,2.93,.12], [.235,.31,.22],1);
    plate('obelisk-long-pointed-chin', 'accent', [[-.13,2.88],[0,2.57],[.13,2.88],[.11,2.99],[-.11,2.99]], .11,.34,pale);
    box('obelisk-grinning-ebony-mouth', 'dark', [0,2.94,.38], [.26,.11,.07]);
    for(let i=0;i<6;i++) box(`obelisk-visible-tooth-${i}`, 'accent', [-.108+i*.043,2.954,.426], [.025,.066,.015],undefined,pale);
    for(const side of [-1,1]) {
      sphere(`obelisk-slanted-blue-eye-${side}`, 'eye', [side*.106,3.086,.316], [.075,.026,.02],0);
      plate(`obelisk-long-curved-crown-horn-${side}`, 'accent', [[side*.13,3.13],[side*.34,3.25],[side*.4,3.77],[side*.2,3.44],[side*.11,3.59],[side*.03,3.35]], .13,.05,pale);
      plate(`obelisk-lateral-head-fin-${side}`, 'accent', [[side*.17,3.15],[side*.4,3.16],[side*.49,3.43],[side*.52,3.08],[side*.26,2.97]], .12,.16,blue);
    }
    rod('obelisk-sculpted-nasal-bridge', 'body', [0,3.2,.32],[0,2.99,.42],.045,.063,pale);
    // Source face is a pointed, segmented mask; pectoral/abdominal boundaries
    // follow the muscular armor instead of drawing rectangular chest plates.
    plate('obelisk-central-ridged-forehead', 'accent', [[-.085,3.22],[0,3.41],[.085,3.22],[.055,3.12],[0,3.18],[-.055,3.12]], .048,.336,pale);
    for(const side of [-1,1]) {
      rod(`obelisk-fierce-slanted-brow-${side}`, 'dark', [side*.025,3.126,.354],[side*.174,3.167,.286],.021,.033,dark);
      plate(`obelisk-tapered-cheek-mask-${side}`, 'accent', [[side*.12,3.08],[side*.22,3.14],[side*.21,2.94],[side*.105,2.82]],.045,.32,blue);
      rod(`obelisk-chest-carved-muscle-seam-${side}`,'dark',[side*.035,2.325,.456],[side*.52,2.25,.4],.017,.01,'#35576d');
      rod(`obelisk-lower-pectoral-border-${side}`,'body',[side*.035,2.29,.464],[side*.52,2.215,.36],.025,.017,pale);
      for(let i=0;i<4;i++) {
        const x=side*(.875+i*.106);
        sphere(`hand-${side}-obelisk-articulated-knuckle-${i}`,'body',[x,.983,.595],[.055,.082,.048],1,blue);
        rod(`hand-${side}-obelisk-curled-finger-seam-${i}`,'dark',[x,.912,.561],[x,.886,.442],.008,.009,dark);
      }
      sphere(`hand-${side}-obelisk-clasped-thumb`,'body',[side*.846,.994,.419],[.089,.135,.12],1,blue);
      for(let groove=0;groove<3;groove++) rod(`hand-${side}-obelisk-gauntlet-ridge-${groove}`,'body',[side*(.971+groove*.092),1.24,.546],[side*(.94+groove*.08),1.73,.549],.012,.018,'#386b88');
    }
    return true;
  }

  if (profile.anatomy === 'golden-mechanical-sun-god') {
    const gold=profile.body, bright=profile.accent, dark=profile.hair;
    sphere('ra-golden-armored-torso', 'body', [0,1.9,-.04], [.51,.7,.39],1);
    sphere('ra-segmented-golden-long-neck', 'body', [0,2.68,.04], [.28,.62,.28],1);
    for(let i=0;i<6;i++) plate(`ra-chevron-gold-ventral-plate-${i}`, 'accent', [[-.31,2.01-i*.16],[0,1.91-i*.16],[.31,2.01-i*.16],[.29,1.9-i*.16],[0,1.8-i*.16],[-.29,1.9-i*.16]], .075,.337, i%2?gold:bright);
    for(let i=0;i<5;i++) plate(`ra-layered-pointed-neck-armor-${i}`, 'accent', [[-.19,3.08-i*.15],[0,2.97-i*.15],[.26,3.09-i*.15],[.23,2.92-i*.15],[0,2.8-i*.15],[-.2,2.93-i*.15]], .1,.28, i%2?gold:bright);
    sphere('ra-hawk-like-golden-skull', 'body', [0,3.15,.22], [.24,.2,.38],2);
    plate('ra-long-downcurved-golden-beak', 'accent', [[-.17,3.24],[0,3.41],[.17,3.24],[.16,3.03],[0,2.92],[-.16,3.03]], .16,.5,bright);
    sphere('ra-ebony-beak-opening', 'dark', [0,3.023,.569], [.108,.1,.086],0,dark);
    plate('jaw-ra-pointed-lower-golden-beak', 'body', [[-.12,3.02],[0,2.84],[.12,3.02],[0,2.96]], .14,.56,gold);
    sphere('ra-spherical-gold-crown-jewel', 'accent', [0,3.36,.44], [.085,.085,.07],1,bright);
    for(const side of [-1,1]) {
      sphere(`ra-narrow-pale-green-eye-${side}`, 'eye', [side*.17,3.18,.46], [.044,.036,.023],0);
      plate(`ra-swept-golden-crown-horn-${side}`, 'accent', [[side*.1,3.24],[side*.43,3.69],[side*.39,3.38],[side*.58,3.53],[side*.38,3.12]], .1,.05,bright);
      plate(`ra-golden-cheek-fan-${side}`, 'body', [[side*.14,3.21],[side*.49,3.2],[side*.38,3.04],[side*.52,2.98],[side*.24,2.93]], .1,.27,gold);
      sphere(`ra-circular-mechanical-shoulder-${side}`, 'body', [side*.42,2.54,-.12], [.26,.26,.22],2);
      const wing=`wing-${side}-ra`;
      // Continuous thick swept wing rim and inset bronze panel; not a sprite.
      curvedPlate(`${wing}-closed-swept-gold-wing`, 'body', [
        ['moveTo',side*.39,2.58],['quadraticCurveTo',side*.73,3.19,side*1.18,3.9],
        ['quadraticCurveTo',side*1.83,3.94,side*2.14,3.0],['quadraticCurveTo',side*2.41,1.96,side*1.76,.89],
        ['quadraticCurveTo',side*2.09,2.72,side*1.52,3.15],['quadraticCurveTo',side*1.1,3.57,side*.58,2.4]
      ],.1,-.38,gold);
      plate(`${wing}-bronze-recessed-inner-membrane`, 'dark', [[side*.62,2.67],[side*1.14,3.54],[side*1.47,3.47],[side*1.73,3.15],[side*1.94,2.62],[side*1.9,1.81],[side*1.59,2.19],[side*1.24,2.6],[side*.9,2.59]], .075,-.279,'#6e491e');
      for(let i=0;i<4;i++) {
        const end=[side*(1.93-i*.12),1.83+i*.35,-.175];
        rod(`${wing}-golden-radiating-finger-${i}`, 'body', [side*.77,2.77,-.175], end,.037,.024,bright);
      }
      rod(`${wing}-golden-outer-rim`, 'accent', [side*1.18,3.9,-.23],[side*1.6,3.8,-.23],.048,.03,bright);
      sphere(`${wing}-engraved-round-pivot`, 'accent', [side*.52,2.62,.18], [.2,.2,.1],1,bright);
      sphere(`${wing}-recessed-pivot-center`, 'dark', [side*.52,2.62,.273], [.11,.11,.034],1,gold);
      rod(`ra-short-golden-upper-arm-${side}`, 'body', [side*.4,2.23,.07],[side*.63,1.94,.25],.125,.14);
      rod(`hand-${side}-ra-golden-forearm`, 'body',[side*.63,1.94,.25],[side*.4,1.8,.53],.09,.12,bright);
      sphere(`hand-${side}-ra-three-clawed-palm`, 'body',[side*.4,1.78,.56],[.14,.12,.12],0);
      for(let i=0;i<3;i++) rod(`hand-${side}-ra-ivory-gold-claw-${i}`, 'accent',[side*(.29+i*.105),1.79,.65],[side*(.24+i*.12),1.59,.76],.035,.009,'#e8ddb4');
      sphere(`ra-armored-golden-haunch-${side}`, 'body',[side*.38,1.22,0],[.28,.38,.25],1);
      rod(`ra-bent-golden-lower-leg-${side}`, 'body',[side*.39,.93,0],[side*.48,.48,.15],.13,.16);
      sphere(`ra-gold-banded-ankle-${side}`, 'accent',[side*.48,.39,.19],[.16,.13,.17],0,bright);
      for(let i=0;i<3;i++) rod(`ra-gold-talon-${side}-${i}`, 'body',[side*(.35+i*.11),.32,.2],[side*(.31+i*.15),.19,.61],.055,.011,gold);
    }
    tube('ra-long-swept-golden-tail', 'body', [[0,1.05,-.25],[.13,.75,-.63],[.69,.68,-.67],[1.17,.91,-.41]],.12,24,gold);
    plate('ra-tail-pointed-gold-terminal', 'accent', [[.99,.9],[1.37,1.24],[1.19,.76],[1.07,.76]],.08,-.49,bright);
    for(const side of [-1,1]) {
      // Golden sun-god plates form a nested fan across the long neck. Visible
      // seams are bronze recesses, with fine raised gold rims on their borders.
      for(let i=0;i<4;i++) {
        const y=2.49+i*.16;
        plate(`ra-neck-lateral-overlapping-fan-${side}-${i}`,'body',[[side*.15,y+.08],[side*.32,y+.15],[side*.36,y-.025],[side*.17,y-.07]],.043,.2,gold);
        rod(`ra-neck-bronze-fan-seam-${side}-${i}`,'dark',[side*.18,y-.03,.3],[side*.34,y+.014,.24],.012,.009,'#745018');
      }
      const wing=`wing-${side}-ra`;
      for(let ring=0;ring<2;ring++) part(`${wing}-concentric-gold-pivot-ring-${ring}`,new THREE.TorusGeometry(.14+ring*.052,.014,6,24),'accent',[side*.52,2.62,.287+ring*.006],undefined,[0,0,0],bright);
      rod(`${wing}-raised-gold-leading-arc`,'accent',[side*1.43,3.826,-.223],[side*1.85,3.35,-.223],.027,.026,bright);
      sphere(`ra-eye-dark-recess-${side}`,'dark',[side*.188,3.178,.447],[.024,.057,.067],1,'#4e3717');
      sphere(`ra-sunken-pale-eye-${side}`,'eye',[side*.204,3.195,.491],[.025,.027,.041],1,'#dbecbd');
      rod(`ra-gold-eye-brow-${side}`,'accent',[side*.124,3.248,.527],[side*.245,3.254,.382],.024,.03,bright);
      for(let i=0;i<3;i++) cone(`ra-visible-upper-ivory-tooth-${side}-${i}`,'accent',[side*(.044+i*.027),3.068,.681],[.015,.061,.021],[Math.PI,0,0],'#e8ddb4');
      rod(`ra-thigh-plated-gold-rim-${side}`,'accent',[side*.255,1.471,.238],[side*.476,1.101,.232],.025,.019,bright);
    }
    return true;
  }
  return false;
}
