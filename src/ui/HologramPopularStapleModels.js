import * as THREE from 'three';

/** Exact illustrated identities; alternate art corroborates structure, not palette. */
export const POPULAR_STAPLE_PROFILES = Object.freeze(Object.fromEntries(Object.entries({
  '70095154': { id: 'cyber-dragon', family: 'machine', body: '#bdc9d5', accent: '#e4eaf0', eye: '#e8cf62', hair: '#263440', bodyMetalness: .72, bodyRoughness: .3, attack: 'cyber-beam', anatomy: 'segmented-cyber-serpent', referenceArt: '/cards/cropped/70095154.jpg' },
  '89943723': { id: 'elemental-hero-neos', family: 'warrior', body: '#c8d4df', accent: '#c42648', eye: '#51b7bc', hair: '#243049', bodyMetalness: .3, bodyRoughness: .42, accentMetalness: .25, attack: 'impact', anatomy: 'silver-neos-hero', referenceArt: '/cards/cropped/89943723.jpg' },
  '84013237': { id: 'number-39-utopia', family: 'warrior', body: '#d6e2e9', accent: '#d3aa43', eye: '#ca3453', hair: '#223342', bodyMetalness: .55, bodyRoughness: .33, attack: 'blade', anatomy: 'gold-armored-utopia', referenceArt: '/cards/cropped/84013237.jpg' },
  '72989439': { id: 'black-luster-soldier-envoy', family: 'warrior', body: '#17377c', accent: '#ddcd74', eye: '#8cbb9d', hair: '#190d29', bodyMetalness: .5, bodyRoughness: .33, attack: 'blade', anatomy: 'blue-gold-chaos-knight', referenceArt: '/cards/cropped/72989439.jpg' },
  '14558127': { id: 'ash-blossom-joyous-spring', family: 'spirit', body: '#eeebf8', accent: '#eb8ca3', eye: '#ae7648', hair: '#c9b7a2', bodyMetalness: .02, bodyRoughness: .8, accentMetalness: .03, accentRoughness: .65, darkMetalness: .02, attack: 'impact', anatomy: 'spring-kimono-child', referenceArt: '/cards/cropped/14558127.jpg' }
}).map(([id, profile]) => [id, Object.freeze(profile)])));

/** Uses the existing batch/rig ownership; every new polygon is a closed solid. */
export function buildPopularStapleAnatomy(profile, helpers) {
  const { part, sphere, box, cone, rod } = helpers;
  function solid(name, material, vertices, depth, position, rotation, tint) {
    const outline = new THREE.Shape();
    vertices.forEach(([x, y], i) => i ? outline.lineTo(x, y) : outline.moveTo(x, y));
    outline.closePath();
    const geometry = new THREE.ExtrudeGeometry(outline, { depth, bevelEnabled: false, steps: 1, curveSegments: 1 });
    geometry.translate(0, 0, -depth / 2);
    part(name, geometry, material, position, [1, 1, 1], rotation, tint);
  }
  // A closed curved tube keeps the mechanical body continuous between plates;
  // caps share the exact tube boundary so there are no sphere-cap gaps.
  function closedTube(name, material, points, radius, segments, tint) {
    const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));
    const radial=12, stride=radial+1;
    const geometry=new THREE.TubeGeometry(curve,segments,radius,radial,false);
    for(const [label,row,sign] of [['start',0,-1],['end',segments,1]]) {
      const t=row/segments,center=curve.getPointAt(t),normal=curve.getTangentAt(t).multiplyScalar(sign);
      const positions=center.toArray(),normals=normal.toArray(),uv=[.5,.5],index=[];
      for(let i=0;i<=radial;i++) {
        positions.push(...geometry.attributes.position.array.slice((row*stride+i)*3,(row*stride+i+1)*3));
        normals.push(...normal.toArray());uv.push(.5+.5*Math.cos(i*Math.PI*2/radial),.5+.5*Math.sin(i*Math.PI*2/radial));
        if(i<radial) index.push(...(sign===-1?[0,i+1,i+2]:[0,i+2,i+1]));
      }
      const cap=new THREE.BufferGeometry();cap.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));cap.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));cap.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));cap.setIndex(index);
      part(`${name}-${label}-closed-cap`,cap,material,[0,0,0],undefined,undefined,tint);
    }
    part(name,geometry,material,[0,0,0],undefined,undefined,tint);
  }
  function foldedBell(radiusTop,radiusBottom,height,folds=8) {
    const geometry=new THREE.CylinderGeometry(radiusTop,radiusBottom,height,24,5,false);
    const position=geometry.attributes.position;
    for(let i=0;i<position.count;i++) {
      const x=position.getX(i),z=position.getZ(i),t=(height/2-position.getY(i))/height;
      if(Math.hypot(x,z)<1e-7) continue;
      const angle=Math.atan2(z,x),pleat=1+.045*Math.cos(angle*folds)*(.25+.75*t);
      const bell=1+.055*Math.sin(t*Math.PI);
      position.setXYZ(i,x*pleat*bell,position.getY(i),z*pleat*bell);
    }
    geometry.computeVertexNormals();return geometry;
  }
  const sides = [-1, 1];
  if (profile.anatomy === 'segmented-cyber-serpent') {
    // No wings, feet or dragon chest: the source is an armored continuous snake.
    const path = [[-.93,.35,-.12],[-1.05,.68,-.15],[-.85,1.02,-.15],[-.25,1.11,-.12],[.35,.84,.08],[.72,.5,.22],[.8,.29,.3],[.4,.22,.35],[-.16,.39,.42],[-.53,.77,.38],[-.57,1.18,.31],[-.27,1.58,.2],[.31,1.86,.13],[.73,2.13,.02],[.61,2.47,.03],[.1,2.62,.04],[-.28,2.83,.1],[-.26,3.15,.19]];
    const bodyCurve=new THREE.CatmullRomCurve3(path.map(p=>new THREE.Vector3(...p)));
    for (let i = 0; i < path.length - 1; i++) {
      const radius = .17 + .13 * Math.sin((i + 2) / path.length * Math.PI);
      const point=f=>bodyCurve.getPoint((i+f)/(path.length-1)).toArray();
      closedTube(`cyber-segment-${i}-dark-connector`, 'dark', [point(0),point(.5),point(1)], radius, 3, '#263440');
      closedTube(`cyber-segment-${i}-silver-shell`, 'body', [point(.035),point(.48),point(.91)], radius+.024, 4, i%3===0?'#d7e0e7':'#aebecb');
      const seam=bodyCurve.getPoint((i+.935)/(path.length-1));
      const tangent=bodyCurve.getTangent((i+.935)/(path.length-1));
      const orientation=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,0,1),tangent);
      const rotation=new THREE.Euler().setFromQuaternion(orientation).toArray().slice(0,3);
      part(`cyber-segment-${i}-rounded-armor-lip`,new THREE.TorusGeometry(radius+.016,.011,4,16),'accent',seam.toArray(),undefined,rotation,'#d5e1e8');
    }
    for (let i = 0; i < 6; i++) {
      const p = path[9 + i];
      solid(`cyber-swept-dorsal-fin-${i}`, 'accent', [[0,0],[-.18,.32],[.17,.19],[.26,.02]], .07, [p[0],p[1],p[2]-.24], [0,Math.PI/2,-.4], '#c3d1dc');
    }
    sphere('cyber-head-neck-collar', 'body', [-.25,3.15,.2], [.25,.24,.29], 0);
    sphere('cyber-sloped-armored-head', 'body', [-.2,3.36,.36], [.26,.2,.48], 1);
    solid('cyber-long-angular-upper-muzzle', 'accent', [[-.24,-.12],[.24,-.12],[.2,.17],[0,.23],[-.2,.17]], .88, [-.2,3.44,.7], [.15,0,0], '#d5e1e8');
    box('cyber-open-black-mouth', 'dark', [-.2,3.21,.79], [.35,.24,.51], [-.17,0,0], '#182735');
    sphere('cyber-red-mouth-interior', 'accent', [-.2,3.12,.62], [.12,.07,.11], 0, '#ce5664');
    solid('jaw-cyber-pointed-lower-plate', 'body', [[-.19,0],[.19,0],[.25,.13],[0,.26],[-.25,.13]], .43, [-.2,3.03,.66], [-.12,0,0], '#c6d5dd');
    for (const side of sides) {
      sphere(`cyber-dark-eye-socket-${side}`, 'dark', [-.2+side*.222,3.42,.65], [.04,.065,.13], 0, '#152630');
      sphere(`cyber-narrow-yellow-eye-${side}`, 'eye', [-.2+side*.248,3.44,.67], [.025,.025,.086], 0);
      cone(`cyber-upper-hooked-fang-${side}`, 'accent', [-.2+side*.145,3.18,.98], [.045,.26,.045], [Math.PI-.3,0,0]);
      cone(`jaw-cyber-lower-fang-${side}`, 'accent', [-.2+side*.13,3.13,.79], [.035,.14,.035], [.2,0,0]);
      solid(`cyber-head-swept-cheek-fin-${side}`, 'body', [[0,0],[.28,.13],[.53,.1],[.21,-.1]], .055, [-.2+side*.21,3.37,.35], [0,side*Math.PI/2,0], '#b1c7d4');
      const hose = [[-.2+side*.23,3.4,.23],[-.2+side*.39,3.16,.14],[-.2+side*.36,2.91,.17],[-.2+side*.16,2.78,.22]];
      for (let i=0;i<hose.length-1;i++) {
        rod(`cyber-cheek-cable-${side}-${i}`, 'dark', hose[i], hose[i+1], .052, .052, '#344953');
        const a=new THREE.Vector3(...hose[i]), b=new THREE.Vector3(...hose[i+1]);
        for (const f of [.15,.6]) sphere(`cyber-cheek-cable-link-${side}-${i}-${f}`, 'accent', a.clone().lerp(b,f).toArray(), [.064,.064,.064], 0, '#b3c5ce');
      }
    }
    solid('cyber-long-raised-nasal-armor', 'body', [[-.09,-.04],[.09,-.04],[.065,.085],[-.065,.085]], .73,[-.2,3.624,.672],[.15,0,0],'#eef3f7');
    for(const side of sides) {
      rod(`cyber-jaw-side-hydraulic-${side}`,'dark',[-.2+side*.21,3.32,.46],[-.2+side*.19,3.05,.62],.021,.025,'#607684');
      rod(`cyber-angular-eye-brow-${side}`,'accent',[-.2+side*.243,3.508,.62],[-.2+side*.249,3.477,.802],.025,.015,'#edf3f6');
      for(let tooth=0;tooth<4;tooth++) cone(`cyber-small-upper-tooth-${side}-${tooth}`,'accent',[-.2+side*.151,3.292,.54+tooth*.092],[.018,.086,.021],[Math.PI-.12,0,0],'#e3edf2');
      solid(`cyber-long-rear-swept-crown-spike-${side}`,'body',[[0,0],[side*.015,.2],[side*.093,.57],[side*.135,.66],[side*.12,.09]],.055,[-.2+side*.16,3.39,.14],[0,side*.22,-side*.045],'#d9e4ea');
      solid(`cyber-long-angular-lateral-skull-fin-${side}`,'body',[[0,.045],[side*.21,.17],[side*.45,.12],[side*.18,-.066],[side*.01,-.078]],.057,[-.2+side*.18,3.409,.335],[0,side*Math.PI/2,0],'#bdcbd6');
      for(let panel=1;panel<path.length-2;panel+=2) {
        const t=(panel+.53)/(path.length-1),center=bodyCurve.getPoint(t),tangent=bodyCurve.getTangent(t);
        const orientation=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),tangent),rotation=new THREE.Euler().setFromQuaternion(orientation).toArray().slice(0,3);
        solid(`cyber-flared-side-overlapping-armor-${side}-${panel}`,'body',[[side*.15,.075],[side*.38,.13],[side*.32,-.1],[side*.18,-.15]],.11,center.toArray(),rotation,panel%4===1?'#c4d2dd':'#b1c1cd');
      }
    }
    return true;
  }
  if (profile.anatomy === 'silver-neos-hero') {
    const silver = '#c8d4df', dark = '#252a3b', red = '#c42648';
    sphere('neos-tapered-muscular-torso', 'body', [0,2.0,0], [.48,.7,.28], 1);
    sphere('neos-pectoral-left', 'body', [-.22,2.36,.14], [.31,.24,.2], 1);
    sphere('neos-pectoral-right', 'body', [.22,2.36,.14], [.31,.24,.2], 1);
    sphere('neos-abdominal-core', 'body', [0,1.69,.09], [.29,.43,.24], 1);
    sphere('neos-neck', 'body', [0,2.74,0], [.19,.23,.2], 1);
    sphere('neos-silver-helmet', 'body', [0,3.1,.015], [.27,.35,.24], 1);
    solid('neos-swept-single-crown', 'body', [[-.085,0],[.025,.65],[.32,.91],[.11,.65],[.095,0]], .1, [0,3.25,-.06], [0,Math.PI/2,0], silver);
    rod('neos-crown-gold-edge', 'accent', [0,3.3,.02], [0,3.8,-.33], .019,.019,'#d0b357');
    box('neos-dark-visor', 'dark', [0,3.12,.234], [.33,.065,.045], undefined, dark);
    for (const side of sides) sphere(`neos-slanted-eye-${side}`, 'eye', [side*.115,3.135,.262], [.075,.035,.025], 0);
    solid('neos-left-face-cheek', 'body', [[-.14,-.18],[.04,-.23],[.13,.18],[-.12,.2]], .055, [-.095,3.065,.22], undefined, '#dae2e9');
    solid('neos-right-face-cheek', 'body', [[-.13,.18],[-.04,-.23],[.14,-.18],[.12,.2]], .055, [.095,3.065,.22], undefined, '#dae2e9');
    rod('neos-throat-red-left', 'accent', [-.13,3.05,.15], [-.13,2.62,.2], .035,.035,red);
    rod('neos-throat-red-right', 'accent', [.13,3.05,.15], [.13,2.62,.2], .035,.035,red);
    sphere('neos-blue-chest-orb-rim', 'dark', [0,2.38,.338], [.145,.145,.055], 1, '#455b89');
    sphere('neos-blue-chest-orb', 'eye', [0,2.38,.378], [.115,.12,.035], 1, '#467ed3');
    solid('neos-red-chest-chevron', 'accent', [[-.34,.05],[-.16,-.08],[0,-.37],[.16,-.08],[.34,.05],[0,-.08]], .024,[0,2.32,.315],undefined,red);
    for (const side of sides) {
      const shoulder=[side*.65,2.49,0];
      sphere(`neos-shoulder-muscle-${side}`, 'body', shoulder,[.31,.34,.28],1);
      solid(`neos-pointed-shoulder-plate-${side}`, 'body', [[-.28,-.1],[-.32,.24],[.17,.32],[.43,.38],[.33,-.04],[0,-.2]], .18, shoulder, [0,0,side*.08], '#d9e3e9');
      rod(`neos-shoulder-red-bottom-${side}`,'accent',[side*.48,2.39,.19],[side*.89,2.46,.19],.035,.035,red);
      rod(`upper-arm-${side}-neos-muscle`,'body',[side*.69,2.39,0],[side*.92,2.04,.1],.21,.19);
      sphere(`neos-elbow-${side}`,'dark',[side*.93,1.99,.13],[.18,.16,.17],0,dark);
      rod(`gauntlet-${side}-neos-silver`,'body',[side*.95,1.98,.12],[side*1.03,1.49,.24],.22,.18);
      solid(`gauntlet-${side}-neos-long-fin`,'body',[[-.1,0],[.1,.08],[.23,.7],[.08,.54]],.06,[side*1.03,1.85,.04],[0,side*Math.PI/2,0],silver);
      rod(`gauntlet-${side}-neos-gold-fin-edge`,'accent',[side*1.07,1.96,.08],[side*1.09,2.5,-.12],.02,.012,'#d0b357');
      sphere(`hand-${side}-neos-black-glove`,'dark',[side*1.035,1.36,.26],[.17,.21,.17],1,dark);
      for(let f=0;f<4;f++) box(`hand-${side}-neos-curled-finger-${f}`,'dark',[side*1.035+(f-1.5)*.075,1.26,.38],[.07,.14,.07],[.1,0,0],dark);
      rod(`neos-red-waist-line-${side}`,'accent',[side*.27,2.11,.25],[side*.18,1.43,.24],.034,.034,red);
      rod(`neos-red-waist-flare-${side}`,'accent',[side*.18,1.43,.24],[side*.38,1.62,.14],.034,.034,red);
      rod(`neos-thigh-${side}`,'body',[side*.22,1.34,0],[side*.34,.79,.03],.22,.18);
      rod(`neos-shin-${side}`,'body',[side*.34,.77,.03],[side*.4,.2,.1],.18,.11);
      sphere(`neos-boot-${side}`,'body',[side*.4,.18,.21],[.15,.18,.31],1);
      rod(`neos-leg-red-border-${side}`,'accent',[side*.32,1.27,.16],[side*.39,.32,.2],.028,.028,red);
    }
    for(const side of sides) {
      sphere(`upper-arm-${side}-neos-sculpted-lateral-bicep`,'body',[side*.831,2.225,.107],[.205,.285,.195],2,silver);
      sphere(`gauntlet-${side}-neos-long-forearm-muscle`,'body',[side*.997,1.795,.243],[.179,.285,.128],2,'#dee7ed');
      rod(`neos-raised-pectoral-armor-rim-${side}`,'accent',[side*.16,2.34,.341],[side*.421,2.397,.241],.019,.013,red);
      rod(`neos-helmet-red-cheek-contour-${side}`,'accent',[side*.214,3.09,.182],[side*.125,2.865,.238],.018,.025,red);
      sphere(`neos-sculpted-quadriceps-${side}`,'body',[side*.282,1.072,.098],[.205,.322,.17],2,silver);
      solid(`neos-pointed-pelvic-red-inlay-${side}`,'accent',[[0,.19],[side*.11,-.23],[side*.035,-.43],[side*-.04,-.035]],.018,[side*.11,1.51,.257],undefined,red);
      solid(`neos-deep-blue-knee-joint-inlay-${side}`,'dark',[[side*-.115,.07],[side*.08,.12],[side*.16,-.08],[side*.005,-.19],[side*-.14,-.07]],.037,[side*.337,.759,.157],undefined,'#1b3986');
      solid(`neos-blue-pointed-ankle-cuff-${side}`,'dark',[[side*-.135,.07],[side*-.08,.19],[side*.11,.13],[side*.15,-.045],[side*.07,-.12],[side*-.11,-.12]],.08,[side*.398,.294,.131],undefined,'#173683');
      rod(`neos-ankle-red-border-${side}`,'accent',[side*.285,.26,.193],[side*.514,.283,.197],.019,.021,red);
      rod(`neos-rear-long-red-waist-line-${side}`,'accent',[side*.16,2.3,-.264],[side*.128,1.58,-.253],.023,.019,red);
      solid(`neos-rear-deep-blue-collar-${side}`,'dark',[[side*-.03,-.04],[side*.11,.33],[side*.23,.23],[side*.18,-.12]],.04,[side*.13,2.72,-.162],undefined,'#263d84');
      rod(`neos-neck-red-collar-edge-${side}`,'accent',[side*.181,2.929,-.204],[side*.279,2.644,-.201],.021,.017,red);
    }
    solid('neos-long-angular-silver-nose-plate','body',[[-.037,.14],[.037,.14],[.05,-.05],[0,-.14],[-.05,-.05]],.073,[0,3.058,.239],undefined,'#e0e9ef');
    solid('neos-pointed-silver-chin-plate','body',[[-.113,.045],[.113,.045],[.049,-.094],[0,-.146],[-.049,-.094]],.048,[0,2.874,.172],undefined,silver);
    return true;
  }
  if (profile.anatomy === 'gold-armored-utopia') {
    const gold='#d3aa43', pale='#d6e2e9', dark='#223342';
    sphere('utopia-white-chest-core','body',[0,2.11,0],[.46,.65,.28],1);
    solid('utopia-gold-breastplate','accent',[[-.42,.18],[-.26,-.15],[0,-.31],[.26,-.15],[.42,.18],[.16,.29],[0,.07],[-.16,.29]],.12,[0,2.22,.28],undefined,gold);
    sphere('utopia-green-chest-jewel','eye',[0,2.18,.4],[.11,.09,.035],1,'#2baf96');
    sphere('utopia-waist-gold-armor','accent',[0,1.47,.05],[.32,.37,.24],1,gold);
    for(let i=0;i<3;i++) box(`utopia-abdominal-black-seam-${i}`,'dark',[0,1.55+i*.145,.27],[.42,.027,.018],undefined,dark);
    sphere('utopia-neck','body',[0,2.72,0],[.18,.16,.18],1);
    sphere('utopia-white-helmet','body',[0,3.04,0],[.27,.35,.25],1);
    box('utopia-dark-visor','dark',[0,3.08,.236],[.4,.09,.05],undefined,dark);
    for(const side of sides) {
      sphere(`utopia-red-eye-${side}`,'eye',[side*.13,3.09,.27],[.085,.032,.018],0,'#ca3453');
      rod(`utopia-gold-helmet-center-${side}`,'accent',[side*.04,3.32,.25],[side*.06,2.88,.28],.026,.026,gold);
      solid(`utopia-long-gold-crown-${side}`,'accent',[[0,0],[side*.1,.6],[side*.2,.78],[side*.2,.07]],.075,[side*.22,3.23,-.02],undefined,gold);
      solid(`utopia-shoulder-flared-blade-${side}`,'accent',[[-.22,-.2],[-.34,.15],[.1,.23],[.56,.54],[.37,.03],[.06,-.18]],.16,[side*.57,2.47,.015],[0,0,side*.07],gold);
      sphere(`utopia-shoulder-white-shell-${side}`,'body',[side*.65,2.52,-.05],[.3,.22,.27],1,pale);
      sphere(`utopia-round-shoulder-gold-rivet-${side}`,'accent',[side*.59,2.5,.24],[.095,.095,.04],0,gold);
      rod(`upper-arm-${side}-utopia-white`,'body',[side*.66,2.37,0],[side*.88,1.96,.12],.18,.16,pale);
      rod(`gauntlet-${side}-utopia-white`,'body',[side*.89,1.96,.12],[side*.92,1.57,.38],.21,.17,pale);
      sphere(`gauntlet-${side}-utopia-gold-cuff`,'accent',[side*.92,1.6,.36],[.23,.18,.21],1,gold);
      sphere(`hand-${side}-utopia-dark-glove`,'dark',[side*.92,1.43,.44],[.17,.19,.18],1,dark);
      rod(`utopia-thigh-${side}`,'accent',[side*.22,1.32,0],[side*.32,.76,.06],.23,.17,gold);
      sphere(`utopia-knee-white-shell-${side}`,'body',[side*.33,.78,.19],[.18,.18,.1],1,pale);
      rod(`utopia-shin-${side}`,'body',[side*.33,.7,.07],[side*.37,.21,.12],.16,.12,pale);
      sphere(`utopia-pointed-gold-boot-${side}`,'accent',[side*.37,.18,.3],[.18,.16,.39],1,gold);
      // The illustrated rear strips are rigid shoulder fins, not bird wings.
      solid(`utopia-back-hanging-white-fin-${side}`,'body',[[-.16,0],[.18,0],[.19,-1.53],[-.13,-1.64]],.055,[side*.95,2.77,-.22],[0,side*.16,side*.18],pale);
      for(let stripe=0;stripe<3;stripe++) rod(`utopia-back-fin-groove-${side}-${stripe}`,'dark',[side*.95+(stripe-1)*.065,2.65,-.18],[side*1.2+(stripe-1)*.065,1.21,-.18],.009,.009,'#7795a3');
    }
    // Two large broad swords replace the generic warrior's round shield.
    rod('sword-utopia-right-grip','dark',[.92,1.18,.48],[.92,1.82,.48],.055,.055,dark);
    solid('sword-utopia-right-gold-guard','accent',[[-.48,0],[-.32,.33],[-.2,.2],[0,.05],[.2,.2],[.32,.33],[.48,0],[.2,-.1],[-.2,-.1]],.1,[.92,1.8,.48],undefined,gold);
    solid('sword-utopia-right-broad-white-blade','body',[[-.15,0],[-.18,1.7],[0,2.17],[.18,1.7],[.15,0]],.085,[.92,1.92,.48],[0,0,-.15],pale);
    solid('sword-utopia-right-dark-blade-center','dark',[[-.065,0],[-.075,1.7],[0,2.07],[.075,1.7],[.065,0]],.025,[.92,1.93,.535],[0,0,-.15],'#56707e');
    rod('utopia-left-sword-grip','dark',[-.93,1.15,.48],[-.93,1.76,.48],.055,.055,dark);
    solid('utopia-left-sword-gold-guard','accent',[[-.38,0],[-.23,.22],[0,.1],[.23,.22],[.38,0],[0,-.14]],.1,[-.93,1.77,.48],undefined,gold);
    solid('utopia-left-sword-white-blade','body',[[-.12,0],[-.14,1.4],[0,1.86],[.14,1.4],[.12,0]],.08,[-.93,1.86,.48],[0,0,.2],pale);
    // Source's pink number 39 is built from short rounded strokes on the rear shell.
    // Original and alternative art both place the number on the raised white
    // shoulder shell. It is not an extra disc on the back of the helmet.
    solid('utopia-raised-right-number-shoulder-shell','body',[[-.22,-.31],[-.255,.15],[-.13,.74],[.08,.88],[.24,.7],[.24,.06],[.12,-.31]],.095,[.69,2.99,-.035],[0,0,-.08],pale);
    const strokes=[[-.19,3.19,-.12,3.26],[-.12,3.26,-.05,3.18],[-.05,3.18,-.12,3.1],[-.12,3.1,-.03,3.02],[-.03,3.02,-.13,2.96],[.13,3.19,.21,3.25],[.21,3.25,.27,3.14],[.27,3.14,.16,3.09],[.16,3.09,.13,3.19],[.27,3.14,.2,2.95]];
    strokes.forEach(([x1,y1,x2,y2],i)=>rod(`utopia-pink-39-stroke-${i}`,'accent',[.69+x1*.82,y1+.28,.042],[.69+x2*.82,y2+.28,.042],.027,.027,'#d44b83'));
    for(const side of sides) {
      part(`utopia-shoulder-circular-recess-ring-${side}`,new THREE.TorusGeometry(.14,.027,6,24),'accent',[side*.623,2.525,.251],undefined,[0,0,0],gold);
      solid(`utopia-white-curved-cheek-guard-${side}`,'body',[[side*-.075,.19],[side*.16,.06],[side*.1,-.17],[side*-.02,-.24]],.06,[side*.17,3.027,.184],undefined,pale);
      solid(`utopia-gold-helmet-cheek-edge-${side}`,'accent',[[side*-.01,.16],[side*.04,.12],[side*-.06,-.22],[side*-.092,-.18]],.035,[side*.16,3.018,.259],undefined,gold);
      sphere(`upper-arm-${side}-utopia-visible-dark-elbow-pivot`,'dark',[side*.87,1.982,.147],[.172,.147,.177],1,dark);
      part(`gauntlet-${side}-utopia-brass-wrist-ring`,new THREE.TorusGeometry(.172,.023,6,20),'accent',[side*.917,1.642,.345],undefined,[Math.PI/2+.53,0,side*.05],gold);
      rod(`utopia-thigh-curved-gold-border-${side}`,'accent',[side*.26,1.253,.196],[side*.34,.845,.201],.033,.022,'#f0d88a');
      for(let i=0;i<4;i++) rod(`hand-${side}-utopia-gold-grip-seam-${i}`,'body',[side*.917+(i-1.5)*.066,1.394,.574],[side*.917+(i-1.5)*.066,1.337,.525],.012,.009,'#82969f');
    }
    return true;
  }
  if (profile.anatomy === 'blue-gold-chaos-knight') {
    const blue='#17377c', gold='#ddcd74', dark='#190d29';
    sphere('bls-blue-armored-torso','body',[0,2.02,0],[.46,.61,.29],1,blue);
    solid('bls-gilded-pointed-breastplate','accent',[[-.32,.31],[-.39,.07],[-.19,-.28],[0,-.42],[.19,-.28],[.39,.07],[.32,.31],[0,.17]],.065,[0,2.08,.28],undefined,gold);
    solid('bls-dark-breastplate-inlay','dark',[[-.18,.19],[-.24,.02],[0,-.26],[.24,.02],[.18,.19],[0,.07]],.021,[0,2.08,.321],undefined,dark);
    sphere('bls-central-red-chest-jewel','eye',[0,2.11,.347],[.065,.095,.027],1,'#df2f3f');
    sphere('bls-neck','dark',[0,2.65,0],[.19,.22,.19],1,dark);
    sphere('bls-high-navy-helmet','body',[0,3.06,0],[.26,.38,.25],1,blue);
    sphere('bls-green-visible-face','body',[0,2.99,.235],[.16,.2,.06],1,'#90b198');
    box('bls-dark-visor','dark',[0,3.09,.25],[.31,.055,.022],undefined,dark);
    for(const side of sides) sphere(`bls-narrow-pale-eye-${side}`,'eye',[side*.092,3.088,.274],[.059,.021,.016],0,'#c1e0b8');
    solid('bls-gold-forehead-crown','accent',[[-.25,.23],[-.15,.06],[0,-.22],[.15,.06],[.25,.23],[.11,.17],[0,-.07],[-.11,.17]],.038,[0,3.16,.246],undefined,gold);
    solid('bls-tall-center-navy-crown','body',[[-.09,0],[-.14,.28],[-.055,.47],[-.03,.77],[.12,.49],[.095,.12]],.1,[0,3.34,-.025],undefined,blue);
    solid('bls-center-crown-dark-inlay','dark',[[-.045,.07],[-.07,.26],[.005,.42],[.055,.23],[.035,.07]],.025,[0,3.34,.04],undefined,dark);
    sphere('bls-crown-ruby','eye',[0,3.32,.28],[.05,.058,.022],1,'#d6284a');
    for(const side of sides) {
      solid(`bls-swept-blue-side-crown-${side}`,'body',[[0,0],[side*.2,.13],[side*.31,.57],[side*.42,.78],[side*.36,.25],[side*.1,-.04]],.09,[side*.18,3.3,-.06],undefined,blue);
      rod(`bls-side-crown-gold-edge-${side}`,'accent',[side*.26,3.31,.02],[side*.48,3.62,.02],.021,.021,gold);
      solid(`bls-purple-high-collar-${side}`,'dark',[[-.19,-.25],[-.21,.26],[.07,.38],[.19,.15],[.17,-.31]],.09,[side*.34,2.57,.01],[0,side*.2,side*-.18],dark);
      rod(`bls-collar-gold-rim-${side}`,'accent',[side*.2,2.28,.15],[side*.23,2.9,.15],.026,.026,gold);
      sphere(`bls-bulbous-blue-shoulder-${side}`,'body',[side*.66,2.4,0],[.33,.38,.3],1,blue);
      solid(`bls-tall-gold-shoulder-spike-${side}`,'accent',[[-.14,-.19],[-.33,.12],[-.15,.5],[.03,1.12],[.12,.53],[.25,.01]],.09,[side*.74,2.52,.02],[0,0,side*-.22],gold);
      solid(`bls-dark-shoulder-spike-inlay-${side}`,'dark',[[-.05,.13],[-.09,.47],[.025,.93],[.045,.4],[.08,.13]],.02,[side*.74,2.52,.08],[0,0,side*-.22],dark);
      sphere(`bls-gold-shoulder-rim-${side}`,'accent',[side*.66,2.41,.26],[.265,.265,.075],1,gold);
      sphere(`bls-blue-shoulder-rim-center-${side}`,'body',[side*.66,2.41,.313],[.18,.18,.045],1,blue);
      rod(`upper-arm-${side}-bls-blue`,'body',[side*.64,2.21,.02],[side*.83,1.97,.13],.19,.17,blue);
      rod(`gauntlet-${side}-bls-blue`,'body',[side*.83,1.97,.13],[side*.8,1.58,.25],.19,.15,blue);
      rod(`gauntlet-${side}-bls-gold-border`,'accent',[side*.92,2.02,.15],[side*.89,1.62,.25],.027,.027,gold);
      sphere(`gauntlet-${side}-bls-gold-cuff`,'accent',[side*.8,1.59,.25],[.18,.115,.18],1,gold);
      sphere(`hand-${side}-bls-blue-glove`,'body',[side*.79,1.43,.26],[.15,.18,.15],1,blue);
      for(let f=0;f<3;f++) sphere(`hand-${side}-bls-gold-knuckle-${f}`,'accent',[side*.79+(f-1)*.075,1.49,.393],[.035,.043,.02],0,gold);
      rod(`bls-blue-thigh-${side}`,'body',[side*.22,1.37,0],[side*.3,.82,.05],.2,.17,blue);
      rod(`bls-blue-shin-${side}`,'body',[side*.3,.8,.05],[side*.35,.24,.1],.16,.12,blue);
      rod(`bls-leg-gold-front-line-${side}`,'accent',[side*.31,.84,.23],[side*.35,.28,.22],.022,.022,gold);
      sphere(`bls-blue-gold-boot-${side}`,'body',[side*.35,.18,.26],[.17,.18,.32],1,blue);
      solid(`bls-flared-purple-hip-armor-${side}`,'dark',[[-.12,.19],[-.19,-.33],[.16,-.55],[.24,.19]],.075,[side*.34,1.5,-.025],[0,0,side*.15],dark);
      rod(`bls-hip-armor-gold-edge-${side}`,'accent',[side*.43,1.65,.03],[side*.64,.99,.03],.025,.025,gold);
    }
    solid('bls-pointed-gold-waist-plate','accent',[[-.2,.15],[-.16,-.17],[0,-.51],[.16,-.17],[.2,.15],[0,.025]],.08,[0,1.4,.28],undefined,gold);
    solid('bls-black-waist-inlay','dark',[[-.095,.06],[-.08,-.15],[0,-.33],[.08,-.15],[.095,.06],[0,-.01]],.022,[0,1.4,.332],undefined,dark);
    sphere('bls-waist-red-gem','eye',[0,1.48,.351],[.047,.065,.02],1,'#d33a4a');
    rod('sword-bls-long-gold-grip','accent',[.79,1.2,.3],[.79,1.95,.3],.055,.055,gold);
    solid('sword-bls-gold-winged-guard','accent',[[-.35,0],[-.2,.2],[0,.065],[.2,.2],[.35,0],[0,-.12]],.09,[.79,1.91,.3],[0,0,.45],gold);
    solid('sword-bls-broad-silver-blade','body',[[-.14,0],[-.2,1.45],[0,2.07],[.15,1.45],[.15,.18],[.06,.18],[.02,0]],.07,[.79,2.02,.3],[0,0,.45],'#b3ccdf');
    solid('sword-bls-blade-bright-edge','accent',[[-.14,.08],[-.2,1.45],[0,2.07],[-.11,1.4]],.022,[.79,2.02,.349],[0,0,.45],'#e2e9ef');
    solid('bls-long-black-gold-shield','accent',[[-.21,-.72],[-.34,.19],[-.09,.83],[0,.65],[.17,.96],[.28,.19],[.11,-.68]],.13,[-.98,1.01,.31],[0,0,-.13],gold);
    solid('bls-long-shield-dark-inlay','dark',[[-.15,-.55],[-.25,.17],[-.07,.63],[0,.49],[.12,.74],[.18,.13],[.06,-.55]],.031,[-.98,1.01,.394],[0,0,-.13],dark);
    solid('bls-long-shield-blue-inlay','body',[[-.11,-.28],[-.12,.1],[.01,.37],[.11,.08],[.05,-.28]],.02,[-.98,1.01,.42],[0,0,-.13],blue);
    for(const side of sides) {
      part(`bls-rounded-gold-shoulder-border-${side}`,new THREE.TorusGeometry(.25,.018,6,28),'accent',[side*.66,2.41,.31],undefined,[0,0,0],gold);
      solid(`bls-layered-gold-cheek-guard-${side}`,'accent',[[side*-.06,.15],[side*.14,.08],[side*.09,-.15],[side*-.08,-.19],[side*-.035,-.1]],.032,[side*.163,3.01,.243],undefined,gold);
      rod(`bls-gilded-breastplate-beveled-edge-${side}`,'accent',[side*.316,2.38,.321],[side*.159,1.799,.337],.018,.014,'#f3e6a6');
      for(let i=0;i<3;i++) rod(`gauntlet-${side}-bls-segmented-gold-seam-${i}`,'accent',[side*.69,1.7+i*.087,.348],[side*.89,1.71+i*.087,.326],.009,.011,gold);
      sphere(`bls-ruby-ear-guard-${side}`,'eye',[side*.255,3.127,.032],[.038,.052,.021],1,'#df2f3f');
    }
    return true;
  }
  if (profile.anatomy === 'spring-kimono-child') {
    const cream='#f1dace', pale='#eeebf8', hair='#c9b7a2', dark='#6c646e';
    sphere('ash-child-face','body',[0,2.62,.085],[.271,.339,.235],2,cream);
    sphere('ash-rounded-bob-hair','dark',[0,2.71,-.005],[.43,.4,.3],1,hair);
    // Put the face over the bob; locks frame its front instead of hiding the eyes.
    const face=new THREE.SphereGeometry(1,20,12),vertices=face.attributes.position;
    for(let i=0;i<vertices.count;i++)if(vertices.getY(i)<0)vertices.setX(i,vertices.getX(i)*(.77+.23*(1+vertices.getY(i))));
    face.computeVertexNormals();
    const faceNormals=face.attributes.normal;for(let row=0;row<=12;row++) {
      const first=row*21,last=first+20,n=new THREE.Vector3().fromBufferAttribute(faceNormals,first).add(new THREE.Vector3().fromBufferAttribute(faceNormals,last)).normalize();
      faceNormals.setXYZ(first,n.x,n.y,n.z);faceNormals.setXYZ(last,n.x,n.y,n.z);
    }
    part('ash-visible-face',face,'body',[0,2.61,.238],[.263,.326,.15],undefined,cream);
    for(const side of sides) {
      sphere(`ash-brown-eye-white-${side}`,'body',[side*.115,2.635,.388],[.082,.045,.018],1,'#fff7e8');
      sphere(`ash-brown-eye-iris-${side}`,'eye',[side*.115,2.63,.408],[.039,.047,.017],1,'#ae7648');
      sphere(`ash-eye-highlight-${side}`,'eye',[side*.105,2.66,.427],[.013,.014,.007],0,'#ffffff');
      sphere(`ash-side-bob-lock-${side}`,'dark',[side*.3,2.57,.18],[.13,.27,.18],1,hair);
      for(let lock=0;lock<2;lock++) rod(`ash-hair-side-highlight-${side}-${lock}`,'body',[side*(.29+lock*.055),2.8,.21],[side*(.25+lock*.07),2.4,.23],.017,.008,'#e9d9bd');
      closedTube(`ash-curled-pale-crown-lock-${side}`,'dark',[[side*.064,3.033,.14],[side*.147,3.146,.012],[side*.238,3.055,-.079],[side*.282,2.962,-.01]],.036,12,'#e7d8cf');
    }
    rod('ash-swept-center-fringe','dark',[-.24,2.95,.23],[.07,2.86,.36],.085,.025,hair);
    sphere('ash-open-smiling-mouth','dark',[.015,2.48,.389],[.042,.028,.013],1,'#74474e');
    sphere('ash-small-pink-tongue','accent',[.02,2.467,.402],[.024,.011,.006],0,'#eaa5a5');
    solid('ash-orange-hair-bow-left','accent',[[0,0],[-.17,.096],[-.213,.025],[-.148,-.092],[-.032,-.045]],.037,[-.024,3.035,.12],undefined,'#df8753');
    solid('ash-orange-hair-bow-right','accent',[[0,0],[.167,.104],[.206,.019],[.158,-.091],[.029,-.046]],.037,[-.016,3.041,.12],undefined,'#eea861');
    sphere('ash-orange-hair-bow-knot','accent',[-.025,3.015,.125],[.085,.07,.075],1,'#efac65');
    sphere('ash-dark-kimono-bodice','dark',[0,1.95,0],[.29,.43,.2],1,'#9b91a6');
    solid('ash-crossed-kimono-collar','body',[[-.25,.15],[.09,-.22],[.22,-.13],[-.09,.23]],.03,[0,2.24,.175],undefined,pale);
    solid('ash-soft-pink-neck-scarf','accent',[[-.26,.14],[.26,.14],[.2,-.13],[.05,-.27],[-.23,-.05]],.06,[0,2.28,.235],undefined,'#e993ad');
    rod('ash-scarf-light-fold','body',[-.18,2.33,.28],[.17,2.27,.29],.022,.022,'#f4c6d6');
    rod('ash-orange-obi-belt','accent',[-.26,1.79,.11],[.26,1.79,.11],.083,.083,'#dd8b50');
    solid('ash-charcoal-obi-bow-left','dark',[[0,0],[-.35,.12],[-.3,-.21],[0,-.12]],.08,[-.03,1.75,.245],undefined,'#a39bb6');
    solid('ash-charcoal-obi-bow-right','dark',[[0,0],[.35,.12],[.3,-.21],[0,-.12]],.08,[.03,1.75,.245],undefined,'#a39bb6');
    sphere('ash-obi-front-knot','dark',[0,1.73,.32],[.095,.075,.055],1,'#a39bb6');
    // Closed bell skirt and bell sleeves preserve the conspicuously loose kimono.
    part('ash-flared-white-kimono-skirt',foldedBell(.25,.48,.64),'body',[0,1.35,0],[1,1,.68],undefined,pale);
    for(let fold=0;fold<6;fold++) {
      const a=(fold/6)*Math.PI*2;
      rod(`ash-skirt-lavender-fold-${fold}`,'body',[Math.sin(a)*.24,1.65,Math.cos(a)*.17],[Math.sin(a)*.43,1.07,Math.cos(a)*.29],.021,.035,'#d4cce8');
    }
    for(const side of sides) {
      const prefix=side===1?'mage-arm-1':'ash-left-arm';
      rod(`${prefix}-kimono-upper`,'body',[side*.27,2.11,0],[side*.58,1.97,.08],.13,.16,pale);
      const start=new THREE.Vector3(side*.48,2.02,.07),end=new THREE.Vector3(side*.94,1.84,.11),direction=end.clone().sub(start);
      const quaternion=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),direction.clone().normalize());
      const rotation=new THREE.Euler().setFromQuaternion(quaternion);
      part(side===1?'mage-glove-1-ash-large-sleeve':'ash-left-large-sleeve',foldedBell(.15,.33,direction.length(),6),'body',start.clone().add(end).multiplyScalar(.5).toArray(),[1,1,.67],rotation.toArray().slice(0,3),pale);
      sphere(side===1?'mage-hand-1-ash-small-hand':'ash-left-small-hand','body',[side*.96,1.84,.12],[.12,.085,.1],1,cream);
      rod(`ash-bare-child-leg-${side}`,'body',[side*.15,1.08,0],[side*.19,.64,.03],.105,.083,cream);
      // Both original artworks and the licensed close-ups show bare feet.
      rod(`ash-bare-tapered-shin-${side}`,'body',[side*.19,.64,.03],[side*.21,.24,.08],.087,.066,cream);
      sphere(`ash-small-bare-foot-${side}`,'body',[side*.21,.196,.174],[.09,.065,.183],1,cream);
      for(let toe=0;toe<4;toe++)sphere(`ash-bare-rounded-toe-${side}-${toe}`,'body',[side*.21+(toe-1.5)*.034,.183,.329-toe*.006],[.019,.024,.03],0,cream);
    }
    for(const side of sides) {
      sphere(`ash-warm-cheek-blush-${side}`,'accent',[side*.18,2.542,.369],[.046,.015,.009],1,'#e8b1a9');
      rod(`ash-soft-eyebrow-${side}`,'dark',[side*.065,2.744,.388],[side*.16,2.755,.362],.011,.006,'#9d8270');
      for(let strand=0;strand<3;strand++) {
        const x=side*(.16+.055*strand);
        closedTube(`ash-individual-bob-lock-${side}-${strand}`,'dark',[[x,2.969,.186],[x+side*.055,2.735,.241],[x-side*.025,2.427,.231]],.027,8,'#d8c6ac');
      }
      const sleeve=side===1?'mage-glove-1':'ash-left';
      rod(`${sleeve}-ash-sleeve-fold-ridge`,'body',[side*.51,2.008,.184],[side*.884,1.834,.273],.023,.034,'#f7f5ff');
      rod(`${sleeve}-ash-sleeve-lavender-seam`,'body',[side*.5,2.009,-.052],[side*.913,1.849,-.044],.015,.022,'#d8d2eb');
      solid(`ash-pointed-animal-ear-${side}`,'dark',[[side*-.055,-.09],[side*.1,.165],[side*.18,-.072]],.087,[side*.177,3.007,-.051],undefined,'#d6c2ad');
      solid(`ash-soft-pink-inner-ear-${side}`,'accent',[[side*-.018,-.052],[side*.093,.108],[side*.128,-.048]],.02,[side*.177,3.007,.005],undefined,'#e4b8bb');
      solid(`ash-upward-orange-bow-leaf-${side}`,'accent',[[side*-.025,-.031],[side*.03,.125],[side*.144,.225],[side*.122,.071],[side*.041,-.028]],.035,[side*.075,3.07,-.065],undefined,'#e59b5b');
    }
    closedTube('ash-long-soft-rear-hair-tail','dark',[[.07,2.73,-.113],[.18,2.4,-.289],[.15,2.09,-.353],[.053,1.87,-.269]],.071,16,'#d2bfaa');
    sphere('ash-small-sculpted-nose','body',[0,2.56,.392],[.018,.02,.015],1,cream);
    for(const side of sides) rod(`ash-almond-upper-eyelid-${side}`,'dark',[side*.059,2.666,.402],[side*.171,2.659,.378],.009,.006,'#927661');
    return true;
  }
  return false;
}
