import * as THREE from 'three';
import { createTokenGeometryTools } from './HologramTokenGeometry.js';

/** Ghosts, angels and humanoids, with explicit illustrated exceptions. */
export function buildTokenSpiritAnatomy(profile, helpers) {
  const { part, sphere, box, cone, ring, rod } = helpers;
  const { solid, roundedSolid, curvedSheet, curve, taperedCurve, taperedPath, eyes } = createTokenGeometryTools(helpers);
  const anatomy = profile.tokenAnatomy, code = String(profile.tokenCode || '');
  const variant = profile.tokenVisual?.variant || '';
  const body = profile.body, accent = profile.accent, eye = profile.eye;
  const dark = profile.hair || '#2d2937', ivory = '#e7dfcb', sides = [-1, 1];

  function skull(prefix, position, scale = 1, tint = ivory) {
    const [x, y, z] = position;
    sphere(`${prefix}-cranium`, 'body', position, [.4*scale,.45*scale,.31*scale], 2, tint);
    for (const side of sides) {
      sphere(`${prefix}-black-eye-socket-${side}`, 'dark', [x+side*.17*scale,y+.035*scale,z+.29*scale], [.105*scale,.14*scale,.042*scale], 1, '#292535');
      sphere(`${prefix}-cheekbone-${side}`, 'body', [x+side*.3*scale,y-.2*scale,z+.16*scale], [.15*scale,.13*scale,.14*scale], 1, tint);
    }
    cone(`${prefix}-nose-hole`, 'dark', [x,y-.12*scale,z+.32*scale], [.065*scale,.12*scale,.025*scale], undefined, '#392b36');
    box(`${prefix}-jaw-bone`, 'body', [x,y-.35*scale,z+.07*scale], [.47*scale,.18*scale,.24*scale], undefined, tint);
    for (let index=0;index<5;index++) box(`${prefix}-tooth-${index}`,'body',[x+(index-2)*.075*scale,y-.3*scale,z+.218*scale],[.047*scale,.1*scale,.045*scale],undefined,tint);
  }
  function wing(side, feathered, tint, size = 1, row = 0) {
    const prefix=`wing-${side}-token-spirit-${row}`;
    const x=side*.28, y=2.25-row*.36, z=-.2-row*.035;
    if (feathered) {
      for (let feather=0;feather<8;feather++) {
        const tipX = side * (1.12 + feather * .067) * size, tipY = (.66 - feather * .146) * size;
        curvedSheet(`${prefix}-feather-${feather}`, 'accent', [[0,0],[side*(.77+feather*.06)*size,(.8-feather*.135)*size],[tipX,tipY],[side*.5*size,-.31*size]], .035, [x,y,z], undefined, tint, {camber:.095*size,curl:-.07*size});
        taperedCurve(`${prefix}-feather-shaft-${feather}`, 'body', [[x,y,z+.025],[x+tipX*.58,y+tipY*.63,z+.073],[x+tipX*.94,y+tipY*.95,z-.021]], .013, .004, tint, 12, 6);
      }
      rod(`${prefix}-leading-bone`,'body',[x,y,z],[side*(1.41*size+.28),y+.67*size,z],.064,.025,tint);
    } else {
      curvedSheet(`${prefix}-bat-membrane`, 'accent', [[0,0],[side*.53*size,.6*size],[side*1.44*size,.48*size],[side*1.25*size,-.03*size],[side*.83*size,-.2*size],[side*.6*size,-.53*size]], .045, [x,y,z], undefined, tint);
      for(let vein=0;vein<3;vein++)rod(`${prefix}-vein-${vein}`,'body',[x,y,z],[x+side*(.61+vein*.3)*size,y+(.3-vein*.29)*size,z+.031],.039,.018,body);
    }
  }
  function longHair(tint, length=1.25) {
    sphere('token-humanoid-hair-crown','dark',[0,3.13,-.06],[.36,.32,.32],1,tint);
    for(let lock=0;lock<11;lock++)taperedCurve(`token-humanoid-flowing-hair-${lock}`,'dark',[[ (lock-5)*.052,3.24,-.1],[(lock-5)*.085,2.95,-.24],[(lock-5)*.115,3.05-length,-.28],[(lock-5)*.15,2.9-length,-.02]],.067,.009,tint,24,8,.65);
    for(const side of sides)taperedCurve(`token-humanoid-face-framing-hair-${side}`,'dark',[[side*.19,3.29,.09],[side*.31,3.03,.27],[side*.29,2.66,.3],[side*.39,2.4,.14]],.052,.006,tint,24,8,.48);
  }

  // These four printed Tokens have their own anatomy. Their names and native
  // races are not a license to reuse an angel, a ghost or an armored person.
  // OP13/OP10/OP19/OP14 document one view; the rear remains an interpretation.
  function smoothPart(name, material, position, scale, tint, width=16, height=10, rotation) {
    part(name, new THREE.SphereGeometry(1,width,height), material, position, scale, rotation, tint);
  }
  function shapedPart(name, material, shape, depth, position, tint, rotation, resolution=12) {
    const bevel=Math.min(.025,depth*.2);
    const geometry=new THREE.ExtrudeGeometry(shape,{depth:depth-bevel*2,bevelEnabled:true,bevelSize:bevel,bevelThickness:bevel,bevelSegments:2,steps:1,curveSegments:resolution});
    geometry.translate(0,0,-depth/2+bevel);
    part(name,geometry,material,position,[1,1,1],rotation,tint);
  }

  if(code==='38053382') {
    const silver='#b8d9df', edge='#7196a8', violet='#9360b9', green='#70c49b';
    const crescent=new THREE.Shape();
    crescent.moveTo(-.13,.67);
    crescent.bezierCurveTo(-.43,.44,-.65,-.07,-.59,-.63);
    crescent.bezierCurveTo(-.53,-1.11,.07,-1.03,.43,-.59);
    crescent.bezierCurveTo(.62,-.36,.65,-.12,.59,.12);
    crescent.bezierCurveTo(.4,-.19,.31,-.64,-.06,-.63);
    crescent.bezierCurveTo(-.29,-.59,-.34,-.13,-.1,.2);
    crescent.lineTo(.12,.49);crescent.closePath();
    shapedPart('token-generaider-crescent-torso','body',crescent,.2,[0,1.99,0],silver);
    const face=new THREE.Shape();
    face.moveTo(-.18,-.38);face.bezierCurveTo(-.04,-.42,.06,-.25,.13,-.03);
    face.bezierCurveTo(.28,.17,.37,.4,.43,.6);face.bezierCurveTo(.02,.66,-.3,.36,-.18,-.38);face.closePath();
    shapedPart('token-generaider-tapered-silver-mask','body',face,.13,[-.06,2.75,.015],silver);
    smoothPart('token-generaider-single-cyan-eye','eye',[-.065,2.7,.119],[.047,.071,.025],'#40bde4',12,8);
    taperedCurve('token-generaider-face-engraving','dark',[[-.22,3.02,.107],[-.095,2.74,.107],[.02,2.48,.107]],.013,.011,edge,14,6);
    // A shallow, spiked oval crown, rather than a horned humanoid helmet.
    part('token-generaider-elliptical-crown',new THREE.TorusGeometry(.49,.036,6,40),'accent',[.055,3.17,-.02],[1.12,.36,1],[0,0,-.16],silver);
    for(let spike=0;spike<11;spike++) {
      const angle=spike/11*Math.PI*2, x=.055+Math.cos(angle)*.548, y=3.17+Math.sin(angle)*.175;
      rod(`token-generaider-crown-spike-${spike}`,'accent',[x,y,-.02],[x+Math.cos(angle)*.19,y+Math.sin(angle)*.16,-.02],.029,.003,silver);
    }
    for(const side of sides) {
      const wingShape=new THREE.Shape();
      wingShape.moveTo(0,0);
      if(side===-1) {
        wingShape.bezierCurveTo(-.08,.61,-.64,1.05,-.89,1.61);
        wingShape.bezierCurveTo(-.91,.68,-.7,.21,-.08,-.02);
      } else {
        wingShape.bezierCurveTo(.57,.14,.98,.27,1.07,1.08);
        wingShape.bezierCurveTo(1.28,.14,.98,-.09,.11,-.07);
      }
      wingShape.closePath();
      const origin=[side*.51,2.36,-.04];
      shapedPart(`wing-${side}-token-generaider-silver-blade`,'body',wingShape,.105,origin,silver);
      taperedCurve(`wing-${side}-token-generaider-blade-engraving`,'dark',side===-1
        ? [[-.62,2.39,.025],[-1.01,2.95,.025],[-1.37,3.73,.025]]
        : [[.68,2.39,.025],[1.23,2.62,.025],[1.53,3.31,.025]],.015,.009,edge,18,6);
      const leg=new THREE.Shape();
      leg.moveTo(0,0);leg.lineTo(side*.34,.05);leg.lineTo(side*.69,-.74);leg.lineTo(side*1.05,-1.22);leg.lineTo(side*.31,-.49);leg.closePath();
      shapedPart(`token-generaider-floating-spear-leg-${side}`,'body',leg,.095,[side*.27,1.35,-.065],silver);
      rod(`token-generaider-spear-leg-crease-${side}`,'dark',[side*.53,1.23,-.004],[side*1.18,.28,-.004],.014,.005,edge);
    }
    part('token-generaider-crossed-orbit-arms',new THREE.TorusGeometry(.63,.027,6,44),'accent',[0,2.15,.14],[1.35,.28,1],[0,-.08,-.24],silver);
    taperedCurve('token-generaider-right-curved-arm','accent',[[.21,2.76,-.03],[.72,2.78,.005],[1.04,2.51,.07],[1.16,2.13,.1]],.041,.023,silver,24,8);
    smoothPart('token-generaider-violet-chest-jewel','eye',[.22,2.31,.2],[.066,.12,.041],violet,12,8);
    smoothPart('token-generaider-left-green-arm-jewel','eye',[-.72,2.31,.13],[.071,.071,.06],green,12,8);
    smoothPart('token-generaider-right-violet-arm-jewel','eye',[1.15,2.09,.12],[.071,.071,.06],violet,12,8);
    part('token-generaider-gold-crescent-inlay',new THREE.TorusGeometry(.15,.045,6,24,Math.PI*1.45),'accent',[.02,1.68,.147],[1,1,1],[0,0,.4],'#cecd84');
    for(let bead=0;bead<3;bead++)smoothPart(`token-generaider-lower-jewel-${bead}`,'eye',[-.43+bead*.16,1.36-bead*.07,.115],[.041,.05,.024],bead===1?violet:green,10,8);
    return true;
  }

  if(code==='51208047') {
    const pink='#a44683', green='#9abd8d', ivoryWing='#e8e7df', outline='#496575';
    const heart=new THREE.Shape();
    heart.moveTo(0,.68);heart.bezierCurveTo(-.61,1.08,-.94,.68,-.77,.15);
    heart.bezierCurveTo(-.67,-.22,-.34,-.46,-.22,-.47);
    heart.bezierCurveTo(-.49,-.69,-.38,-.77,-.2,-.65);
    heart.bezierCurveTo(-.16,-.9,-.04,-.86,.02,-.72);
    heart.bezierCurveTo(.16,-.91,.27,-.86,.24,-.66);
    heart.bezierCurveTo(.43,-.77,.48,-.65,.31,-.49);
    heart.bezierCurveTo(.72,-.3,.98,.49,.67,.82);
    heart.bezierCurveTo(.48,1.04,.2,.89,0,.68);heart.closePath();
    shapedPart('token-trickstar-winged-heart-skull','body',heart,.18,[0,2.14,0],pink);
    const edgePoints=heart.getSpacedPoints(96).map(p=>[p.x,p.y+2.14,.098]);
    part('token-trickstar-green-heart-outline',new THREE.TubeGeometry(new THREE.CatmullRomCurve3(edgePoints.map(p=>new THREE.Vector3(...p)),true),96,.038,6,true),'accent',[0,0,0],undefined,undefined,green);
    for(const side of sides) {
      const wing=new THREE.Shape();wing.moveTo(0,0);
      wing.bezierCurveTo(side*.42,.21,side*.9,.79,side*1.12,1.1);
      wing.bezierCurveTo(side*1.39,1.45,side*1.39,.7,side*1.12,.37);
      wing.bezierCurveTo(side*1.5,.61,side*1.46,.07,side*.95,-.12);
      wing.bezierCurveTo(side*1.41,.09,side*1.23,-.3,side*.66,-.35);
      wing.bezierCurveTo(side*1.02,-.39,side*.75,-.61,side*.3,-.52);
      wing.lineTo(0,-.17);wing.closePath();
      shapedPart(`wing-${side}-token-trickstar-white-feather-wing`,'accent',wing,.075,[side*.51,2.14,-.15],ivoryWing,[0,0,side*.13],10);
      taperedCurve(`wing-${side}-token-trickstar-inner-feather-line`,'dark',[[side*.66,2.2,-.086],[side*1.15,2.22,-.067],[side*1.55,2.35,-.038]],.009,.003,'#c4c9c6',16,6);
      const eyeShape=new THREE.Shape();eyeShape.moveTo(-.22,-.15);eyeShape.bezierCurveTo(-.25,.17,-.05,.29,.19,.21);eyeShape.bezierCurveTo(.24,.06,.12,-.17,-.22,-.15);eyeShape.closePath();
      shapedPart(`token-trickstar-empty-lavender-eye-${side}`,'eye',eyeShape,.035,[side*.37,2.37,.116],'#c998c3',[0,0,side*.3],8);
    }
    smoothPart('token-trickstar-small-open-mouth','eye',[.015,2.035,.116],[.061,.096,.023],'#e7b8d3',14,10);
    taperedCurve('token-trickstar-curled-green-stem','accent',[[.32,1.68,-.015],[.37,1.22,.018],[.27,.81,.1],[.07,.61,.12]],.052,.042,green,32,8);
    taperedCurve('token-trickstar-stem-dark-edge','dark',[[.35,1.63,.026],[.408,1.18,.065],[.295,.83,.145],[.097,.65,.16]],.008,.006,outline,24,6);
    smoothPart('token-trickstar-blue-stem-pearl','eye',[.065,.6,.12],[.115,.115,.098],'#2eaad5',18,12);
    smoothPart('token-trickstar-pearl-highlight','eye',[.035,.638,.204],[.039,.033,.014],'#dcf6eb',10,8);
    return true;
  }

  if(code==='60514626') {
    const stone='#829d8e', seam='#4a6358', highlight='#9aafa0';
    smoothPart('token-mask-pear-shaped-body','body',[0,1.42,0],[.74,.76,.45],stone,18,12);
    smoothPart('token-mask-long-featureless-head','body',[.04,2.26,.005],[.49,.8,.36],stone,18,12);
    smoothPart('token-mask-long-drooping-face','body',[.2,2.05,.34],[.245,.67,.195],highlight,18,12,[0,0,.07]);
    smoothPart('token-mask-rounded-nose-tip','body',[.215,1.61,.38],[.18,.26,.18],stone,16,12);
    const hollow=new THREE.Shape();hollow.moveTo(-.12,-.26);hollow.bezierCurveTo(-.26,-.05,-.14,.25,.045,.3);hollow.bezierCurveTo(.24,.29,.12,.01,.08,-.12);hollow.lineTo(.06,-.34);hollow.closePath();
    shapedPart('token-mask-asymmetric-dark-face-hollow','dark',hollow,.022,[-.25,2.48,.318],'#223b30',[0,0,-.28],10);
    taperedCurve('token-mask-left-face-fold','dark',[[-.17,2.37,.34],[-.11,2.1,.419],[-.095,1.79,.404],[.03,1.62,.4]],.017,.009,seam,20,6);
    for(const side of sides) {
      smoothPart(`token-mask-rounded-shoulder-${side}`,'body',[side*.61,1.96,.015],[.24,.21,.24],stone,14,10);
      part(`token-mask-rolled-sleeve-cuff-${side}`,new THREE.TorusGeometry(.196,.053,6,28),'accent',[side*.72,1.91,.08],[1,1,1],[0,Math.PI/2,side*.14],highlight);
      taperedCurve(`token-mask-bent-arm-${side}`,'body',[[side*.67,1.99,.04],[side*.93,2.03,.105],[side*1.11,1.84,.2],[side*1.2,1.78,.29]],.128,.08,stone,20,8);
      smoothPart(`token-mask-curled-palm-${side}`,'body',[side*1.22,1.78,.29],[.15,.11,.12],stone,14,8);
      for(let finger=0;finger<4;finger++)taperedCurve(`token-mask-curled-finger-${side}-${finger}`,'body',[[side*(1.2+finger*.047),1.78,.29],[side*(1.22+finger*.048),1.65,.35],[side*(1.14+finger*.047),1.65,.34]],.036,.026,stone,8,6);
      smoothPart(`token-mask-short-leg-${side}`,'body',[side*.43,.7,.07],[.245,.28,.28],seam,14,10);
      smoothPart(`token-mask-wide-foot-${side}`,'body',[side*.44,.49,.235],[.29,.22,.36],stone,16,10);
      part(`token-mask-folded-ankle-cuff-${side}`,new THREE.TorusGeometry(.243,.058,6,28),'accent',[side*.44,.665,.07],[1,1,.97],[Math.PI/2,0,0],highlight);
      taperedCurve(`token-mask-foot-top-fold-${side}`,'dark',[[side*.22,.57,.29],[side*.39,.58,.4],[side*.62,.54,.31]],.014,.014,seam,12,6);
      for(let toe=0;toe<4;toe++)smoothPart(`token-mask-round-toe-${side}-${toe}`,'body',[side*.44+(toe-1.5)*.106,.41,.532],[.065,.087,.101],highlight,10,8);
    }
    return true;
  }

  if(code==='87669905') {
    const lion='#b1a4c8', mane='#918dbd', light='#c8cee3', darkLion='#625c8b';
    smoothPart('token-dual-avatar-seated-lion-body','body',[0,1.26,-.21],[.68,.86,.57],lion,18,12);
    smoothPart('token-dual-avatar-broad-lion-chest','body',[0,1.77,.16],[.58,.65,.46],lion,18,12);
    smoothPart('token-dual-avatar-rounded-guardian-head','body',[0,2.66,.265],[.61,.56,.46],lion,20,14);
    smoothPart('token-dual-avatar-open-roaring-mouth','dark',[0,2.28,.702],[.37,.3,.1],'#373c68',16,10);
    // The shared dragon jaw pivot does not fit this seated lion. Keep its
    // printed roaring mouth together with the head during body animation.
    smoothPart('token-dual-avatar-lower-jaw','body',[0,2.045,.56],[.38,.16,.3],lion,16,10);
    for(const side of sides) {
      smoothPart(`token-dual-avatar-broad-lion-muzzle-${side}`,'body',[side*.205,2.535,.681],[.275,.2,.255],light,16,10);
      smoothPart(`token-dual-avatar-white-spirit-eye-${side}`,'eye',[side*.275,2.81,.672],[.105,.094,.028],'#d8eeef',12,8,[0,0,side*.22]);
      taperedCurve(`token-dual-avatar-swept-eyebrow-${side}`,'body',[[side*.145,2.88,.675],[side*.32,2.98,.655],[side*.54,2.99,.49]],.058,.017,mane,16,8);
      smoothPart(`token-dual-avatar-round-ear-${side}`,'body',[side*.54,3.005,.18],[.145,.176,.13],mane,14,10);
      smoothPart(`token-dual-avatar-ear-inner-${side}`,'accent',[side*.548,3.02,.296],[.074,.088,.022],light,10,8);
      cone(`token-dual-avatar-upper-lion-fang-${side}`,'accent',[side*.24,2.348,.792],[.047,.245,.055],[Math.PI,0,side*.1],light);
      cone(`token-dual-avatar-lower-lion-fang-${side}`,'accent',[side*.17,2.15,.772],[.035,.13,.034],undefined,light);
      smoothPart(`token-dual-avatar-seated-hind-haunch-${side}`,'body',[side*.57,.8,-.345],[.35,.6,.44],lion,16,10);
      taperedCurve(`token-dual-avatar-curved-front-leg-${side}`,'body',[[side*.45,1.75,.16],[side*.48,1.21,.28],[side*.57,.63,.47],[side*.68,.34,.61]],.2,.155,lion,22,10);
      smoothPart(`token-dual-avatar-large-front-paw-${side}`,'body',[side*.65,.25,.685],[.285,.17,.32],light,16,10);
      for(let toe=0;toe<3;toe++) {
        smoothPart(`token-dual-avatar-front-paw-toe-${side}-${toe}`,'body',[side*.65+(toe-1)*.155,.205,.894],[.086,.107,.135],lion,12,8);
        cone(`token-dual-avatar-curved-claw-${side}-${toe}`,'accent',[side*.65+(toe-1)*.155,.21,.999],[.026,.125,.039],[Math.PI/2+.2,0,0],light);
      }
      // Carved cloud curls are the guardian lion's mane, not angel wings.
      for(let scroll=0;scroll<3;scroll++) {
        const points=[],cx=side*(.45+scroll*.05),cy=2.58-scroll*.42,cz=.18+scroll*.05;
        for(let point=0;point<=18;point++) {
          const a=point/18*Math.PI*1.6,r=.26*(1-point/23);
          points.push([cx+side*Math.cos(a)*r,cy+Math.sin(a)*r,cz+.11*Math.sin(point/18*Math.PI)]);
        }
        taperedCurve(`token-dual-avatar-carved-mane-scroll-${side}-${scroll}`,'body',points,.085,.04,mane,18,8);
      }
      for(let flame=0;flame<3;flame++) {
        const baseY=1.77+flame*.34,baseX=side*(.48+flame*.04);
        curvedSheet(`token-dual-avatar-swept-mane-flame-${side}-${flame}`,'accent',[[0,0],[side*.33,.25],[side*.43,.61],[side*.23,.72],[side*.4,.98],[side*.06,.63],[-side*.08,.22]],.065,[baseX,baseY,-.14],undefined,light,{camber:.05,curl:.055,subdivisions:1});
      }
      taperedCurve(`token-dual-avatar-foreleg-cloud-scroll-${side}`,'accent',[[side*.39,1.17,.485],[side*.58,1.24,.526],[side*.71,1.09,.51],[side*.6,.99,.525]],.033,.02,light,14,6);
    }
    smoothPart('token-dual-avatar-broad-lion-nose','body',[0,2.637,.885],[.208,.112,.104],mane,16,10);
    for(const side of sides)smoothPart(`token-dual-avatar-carved-nostril-${side}`,'dark',[side*.078,2.627,.971],[.036,.025,.013],darkLion,10,6);
    taperedCurve('token-dual-avatar-nose-center-crease','dark',[[0,2.57,.959],[0,2.48,.942],[0,2.423,.901]],.011,.008,darkLion,12,6);
    taperedCurve('token-dual-avatar-swept-lion-tail','body',[[0,.92,-.65],[.62,1.01,-.76],[.93,1.37,-.76],[1.01,1.89,-.68],[1.24,2.13,-.59]],.093,.017,mane,28,8);
    curvedSheet('token-dual-avatar-tail-flame-tip','accent',[[0,0],[.16,.27],[.12,.53],[-.06,.28],[-.18,.17]],.047,[1.22,2.03,-.59],undefined,light,{camber:.05,curl:.04,subdivisions:1});
    return true;
  }

  if (code === '7392746' || variant === 'chewbone-jr') {
    // The illustrated Token is a small bone hound, not a human zombie.
    sphere('token-bone-hound-bovine-skull','body',[0,1.53,.66],[.38,.43,.33],2,'#ebe0c5');
    sphere('token-bone-hound-long-bone-muzzle','body',[0,1.31,.94],[.28,.25,.32],1,'#ebe0c5');
    box('jaw-token-bone-hound-open-mouth','dark',[0,1.13,1.06],[.39,.16,.19],undefined,'#59342b');
    for(const side of sides){
      sphere(`token-bone-hound-dark-eye-socket-${side}`,'dark',[side*.21,1.57,.953],[.14,.19,.043],1,'#242731');
      sphere(`token-bone-hound-red-eye-${side}`,'eye',[side*.21,1.56,.992],[.062,.085,.022],1,'#c3654e');
      curve(`token-bone-hound-giant-red-horn-${side}`,'accent',[[side*.32,1.78,.52],[side*.71,1.92,.44],[side*.78,2.39,.4],[side*.7,2.73,.41],[side*.99,2.96,.48]],.14,'#943d44',20);
      for(let tooth=0;tooth<2;tooth++)cone(`token-bone-hound-large-fang-${side}-${tooth}`,'body',[side*.14,1.14+tooth*.02,1.03+tooth*.16],[.035,.31,.044],[Math.PI,0,0],'#ebe0c5');
    }
    rod('token-bone-hound-spine','body',[0,.94,-.68],[0,1.13,.42],.075,.09,ivory);
    for(let rib=0;rib<5;rib++){
      const z=-.5+rib*.18;
      for(const side of sides)curve(`token-bone-hound-rib-${rib}-${side}`,'body',[[0,1.03,z],[side*.29,.99,z],[side*.37,.73,z],[side*.21,.56,z]],.047,ivory,8);
    }
    for(const side of sides)for(const row of [-1,1]){
      const z=row*.42;
      sphere(`token-bone-hound-hip-${side}-${row}`,'body',[side*.31,.83,z],[.13,.14,.12],1,ivory);
      rod(`token-bone-hound-upper-leg-${side}-${row}`,'body',[side*.3,.83,z],[side*.38,.53,z+.1],.053,.045,ivory);
      rod(`token-bone-hound-lower-leg-${side}-${row}`,'body',[side*.38,.53,z+.1],[side*.36,.22,z+.17],.05,.043,ivory);
      for(let toe=0;toe<3;toe++)rod(`token-bone-hound-toe-${side}-${row}-${toe}`,'body',[side*.36+(toe-1)*.064,.19,z+.15],[side*.36+(toe-1)*.064,.18,z+.34],.032,.02,ivory);
    }
    taperedPath('token-bone-hound-segmented-tail','body',[[0,.99,-.62],[0,1.13,-.93],[.15,1.39,-1.02]],.047,.023,ivory);

    return true;
  }

  if (code === '34822851' || variant === 'infernoid') {
    sphere('token-infernoid-glass-capsule','body',[0,1.94,0],[.47,1.05,.45],2,'#bfbdbe');
    sphere('token-infernoid-iridescent-core','eye',[0,1.97,.385],[.31,.62,.065],2,'#bf9eba');
    for(const side of sides)curve(`token-infernoid-curved-metal-cage-${side}`,'accent',[[side*.1,.82,0],[side*.53,1.36,.01],[side*.54,2.39,.01],[side*.17,3.02,0]],.087,'#8ca4a7',14);
    for(const y of [.91,1.46,2.52,2.95])ring(`token-infernoid-cage-ring-${y}`,'accent',[0,y,0],y===.91||y===2.95?.2:.46,undefined,.06,'#b8a57c');
    cone('token-infernoid-metal-base','accent',[0,.61,0],[.37,.64,.34],undefined,'#685e5c');
    for(const side of sides)cone(`token-infernoid-top-prong-${side}`,'accent',[side*.28,2.96,0],[.095,.52,.1],[0,0,side*.38],'#b5bdb9');
    return true;
  }
  if (code === '75119041' || variant === 'tindangle') {
    solid('token-tindangle-triangular-demon','body',[[-.88,-.59],[0,1.05],[.88,-.59]],.27,[0,1.96,0],undefined,'#607f9a');
    for(const side of sides)rod(`token-tindangle-red-diagonal-${side}`,'accent',[side*.85,1.38,.154],[0,2.98,.154],.05,.05,'#b14854');
    rod('token-tindangle-red-base','accent',[-.86,1.38,.153],[.86,1.38,.153],.052,.052,'#b14854');
    sphere('token-tindangle-central-eye','eye',[0,1.99,.181],[.22,.24,.058],2,'#ceb8a1');
    sphere('token-tindangle-eye-pupil','dark',[0,1.99,.235],[.047,.16,.019],1,'#392d43');
    for(let spike=0;spike<7;spike++)cone(`token-tindangle-radial-spike-${spike}`,'body',[(spike-3)*.26,1.29,.03],[.08,.48,.085],[0,0,Math.PI+(spike-3)*.24],'#586f8b');
    return true;
  }
  if(code==='70391589'||variant==='siphon'){
    const green='#396b4a', vine='#a89955';
    curve('token-siphon-twisted-plant-trunk','body',[[0,.31,0],[-.14,.96,0],[.24,1.43,0],[-.17,2.06,0],[.03,2.86,0]],.26,green,28);
    solid('token-siphon-open-red-pod','accent',[[-.18,0],[-.27,.74],[0,1.02],[.31,.69],[.21,-.14]],.12,[.23,1.75,.09],undefined,'#864b50');
    for(let tendril=0;tendril<3;tendril++){
      const side=tendril===0?-1:1, y=1.33+tendril*.42, x=side*(.66+tendril*.13);
      curve(`token-siphon-gold-coiling-vine-${tendril}`,'accent',[[0,1.35+tendril*.35,.09],[x,y,.14],[side*1.14,y+.7,.16],[x,y+.81,.24],[x-side*.18,y+.48,.3]],.05,vine,25);
      sphere(`token-siphon-pink-light-orb-${tendril}`,'eye',[x-side*.18,y+.48,.3],[.15,.15,.15],2,'#e7b1d0');
      ring(`token-siphon-light-aura-${tendril}`,'glow',[x-side*.18,y+.48,.3],.22,[0,0,0],.037,'#bfdbd8');
    }
    for(let root=0;root<5;root++){
      const side=root%2?1:-1, x=(root-2)*.4;
      curve(`token-siphon-curling-ground-root-${root}`,'body',[[0,.4,-.04],[x,.28,.17],[x+side*.3,.46,.22],[x+side*.37,.85,.2],[x+side*.21,1.03,.2]],.075,green,14);
    }
    for(const side of sides)for(let thorn=0;thorn<5;thorn++)cone(`token-siphon-lateral-thorn-${side}-${thorn}`,'body',[side*.24,1.57+thorn*.23,-.01],[.035,.29,.033],[0,0,-side*1.16],green);
    return true;
  }
  if(code==='65810490'||variant==='wicked-egyptian'){
    sphere('token-wicked-gold-mask','body',[0,2.5,0],[.31,.43,.25],2,body);
    solid('token-wicked-egyptian-headdress','body',[[-.3,.36],[-.62,.16],[-.69,-.94],[-.3,-1.03],[-.2,-.29],[.2,-.29],[.3,-1.03],[.69,-.94],[.62,.16],[.3,.36]],.2,[0,2.62,-.09],undefined,body);
    for(const side of sides){
      for(let row=0;row<2;row++){
        sphere(`token-wicked-four-dark-eye-${side}-${row}`,'dark',[side*.155,2.56-row*.24,.235],[.13,.095,.028],1,dark);
        sphere(`token-wicked-four-red-iris-${side}-${row}`,'eye',[side*.155,2.56-row*.24,.263],[.045,.047,.016],1,'#c36b60');
      }
      for(let line=0;line<7;line++)box(`token-wicked-nemes-stripe-${side}-${line}`,'dark',[side*.49,2.65-line*.15,.034],[.27,.034,.022],undefined,dark);
      curve(`token-wicked-gold-crown-horn-${side}`,'body',[[side*.23,3.02,-.02],[side*.67,3.07,-.07],[side*.97,2.87,-.02]],.075,body,12);
      cone(`token-wicked-pointed-collar-${side}`,'body',[side*.59,1.49,.08],[.12,.7,.15],[Math.PI,0,-side*.25],body);
      for(let tier=0;tier<4;tier++)box(`token-wicked-gold-collar-tier-${side}-${tier}`,'body',[side*.29,1.7+tier*.12,.16],[.56,.074,.34],[0,0,-side*.17],body);
    }
    sphere('token-wicked-large-red-chest-eye','eye',[0,1.94,.31],[.23,.26,.057],2,'#ce6a81');
    sphere('token-wicked-cyan-chest-pupil','eye',[0,1.94,.367],[.05,.21,.021],1,'#7fc6d9');
    sphere('token-wicked-gold-orb','body',[0,.6,.21],[.46,.45,.43],2,body);
    curve('token-wicked-coiled-serpent-tail','body',[[-.12,.41,-.17],[-.84,.25,.02],[-.95,.36,.37],[-.36,.25,.48],[.54,.29,.42],[.92,.47,.16],[.54,.7,-.15],[.92,1.01,-.1],[.77,1.49,-.06]],.12,body,40);
    for(let scale=0;scale<8;scale++)box(`token-wicked-tail-segment-${scale}`,'dark',[-.76+scale*.2,.286,.37],[.014,.21,.15],undefined,dark);
    return true;
  }
  if (code === '24874631' || variant === 'metal-coil-fiend') {
    const points=[];
    for(let turn=0;turn<=30;turn++){const a=turn/30*Math.PI*6;points.push([Math.cos(a)*.32,.37+turn/30*1.66,Math.sin(a)*.32]);}
    curve('token-metal-fiend-coiled-spring-body','body',points,.11,body,60);
    sphere('token-metal-fiend-helmet','body',[0,2.61,0],[.43,.44,.36],1,body);
    box('token-metal-fiend-face-visor','dark',[0,2.64,.342],[.56,.14,.039],undefined,dark);
    eyes('token-metal-fiend',{y:2.64,z:.369,spread:.17,size:.047,tint:eye});
    for(const side of sides){
      rod(`token-metal-fiend-shoulder-${side}`,'body',[side*.3,2.22,0],[side*.77,2.27,.03],.16,.11,body);
      curve(`pincer-token-metal-hook-${side}`,'body',[[side*.77,2.27,.03],[side*1.03,2.03,.1],[side*.99,1.48,.15],[side*.7,1.44,.28]],.093,body,14);
      cone(`pincer-token-metal-hook-tip-${side}`,'accent',[side*.68,1.54,.28],[.065,.32,.06],[0,0,side*-.35],accent);
    }
    return true;
  }

  const doomsday = variant === 'doomsday-wisp';
  const ghost = anatomy==='spirit' && !['tricky-magician','world-legacy-spirit'].includes(variant);
  const spectralFiend = ['nightmare-ghost','malus-fire-eye'].includes(variant)||code==='90884404';
  if(ghost||spectralFiend||doomsday){
    if (code === '90884404') {
      sphere('token-soul-wide-eyeball','body',[0,1.92,0],[.64,.64,.29],2,body);
      sphere('token-soul-ivory-sclera','accent',[0,1.92,.265],[.48,.48,.083],2,'#eee4ce');
      sphere('token-soul-red-round-iris','eye',[0,1.92,.35],[.31,.31,.033],2,'#a34734');
      sphere('token-soul-round-black-pupil','dark',[0,1.92,.382],[.15,.15,.018],1,'#251b18');
      sphere('token-soul-iris-reflection','eye',[-.12,2.08,.405],[.077,.09,.013],0,'#fff3d7');
      for (let ray=0;ray<8;ray++) {
        const a = ray/8*Math.PI*2+.2, x=Math.sin(a), y=Math.cos(a);
        const joint=[x*.96,1.92+y*.96,0];
        taperedCurve(`token-soul-arm-shaft-${ray}`,'body',[[x*.58,1.92+y*.58,0],[x*.8,1.92+y*.79,-.03],joint],.052,.042,body,16,8);
        sphere(`token-soul-round-knife-joint-${ray}`,'dark',joint,[.088,.088,.084],1,'#826039');
        curvedSheet(`token-soul-pointed-appendage-${ray}`,'accent',[[-.058,0],[-.13,.16],[-.08,.36],[.09,.59],[.057,.25],[.053,.03]],.038,joint,[0,0,-a], '#dddcd0', {camber:.024,curl:.035});
      }
      return true;
    }
    if(variant==='soul-ring'||variant==='utchatzimime'||code==='90884404'){
      sphere('token-soul-wide-eyeball','body',[0,2.02,0],[.66,.58,.27],2,body);
      ring('token-soul-iris-ring','accent',[0,2.02,.29],.31,[0,0,0],.06,accent);
      sphere('token-soul-vertical-pupil','dark',[0,2.02,.34],[.072,.24,.027],1,dark);
      const count=variant==='utchatzimime'||code==='90884404'?9:5;
      for(let ray=0;ray<count;ray++){const a=ray/count*Math.PI*2;curve(`token-soul-pointed-appendage-${ray}`,'accent',[[Math.sin(a)*.6,2.02+Math.cos(a)*.52,0],[Math.sin(a)*1.07,2.02+Math.cos(a)*1.04,-.03],[Math.sin(a+.2)*1.38,2.02+Math.cos(a+.2)*1.29,.01]],.045,accent,10);}
      return true;
    }
    if(variant==='skull-spirit'){
      skull('token-phantom-skull',[0,2.1,.14],1.2,body);
      for(let thorn=0;thorn<12;thorn++){const a=thorn/12*Math.PI*2;cone(`token-phantom-shadow-thorn-${thorn}`,'dark',[Math.sin(a)*.68,2.1+Math.cos(a)*.7,-.16],[.16,.58,.11],[0,0,-a],dark);}
      curve('token-phantom-dark-trailing-tail','dark',[[0,1.5,-.1],[.23,1.01,-.1],[-.1,.45,0],[.34,.32,.17]],.18,dark,14);
      return true;
    }
    sphere('token-ghost-floating-head','body',[0,2.37,.02],[doomsday?.49:.53,.58,.33],2,body);
    sphere('token-ghost-tapered-body','body',[0,1.69,-.02],[.43,.56,.28],1,body);
    curve('token-ghost-curling-tail','body',[[0,1.46,0],[.12,1.01,0],[-.24,.63,.02],[.15,.39,.1]],.16,body,14);
    if(doomsday||variant==='malus-fire-eye'){
      sphere('token-ghost-single-iris','eye',[0,2.4,.345],[.24,.22,.05],2,eye);
      sphere('token-ghost-single-pupil','dark',[0,2.4,.387],[.043,.15,.018],1,dark);
      if(variant==='malus-fire-eye')ring('token-malus-gold-eye-frame','accent',[0,2.4,.372],.32,[0,0,0],.052,accent);
    }else{
      eyes('token-ghost',{y:2.43,z:.336,spread:.2,size:.095,pupil:false,tint:variant==='ghost'?'#342a40':eye});
      sphere('token-ghost-open-mouth','dark',[0,2.15,.326],[.12,.16,.034],1,'#443044');
    }
    for(const side of sides){
      curve(`token-ghost-curled-arm-${side}`,'body',[[side*.38,1.89,-.01],[side*.76,2.03,.03],[side*.93,2.5,.07],[side*.63,2.73,.1]],.08,body,14);
      cone(`token-ghost-head-point-${side}`,'body',[side*.36,2.89,0],[.13,.47,.1],[0,0,-side*.29],body);
    }
    return true;
  }

  if(!['warrior','fairy','zombie','fiend','spirit'].includes(anatomy))return false;
  const female=['gorz-emissary','sky-striker','einherjar','world-legacy-spirit'].includes(variant);
  const short=variant==='doppel', broad=['radian','armored-fiend','grinder','gift-fiend','metabo'].includes(variant);
  const floating=['einherjar','moon-spirit','waltz-seraph','world-legacy-spirit'].includes(variant);
  const angel=['asmo-angel','deus-angel','eva-angel'].includes(variant)||anatomy==='fairy'&&!female&&!floating;
  const bat=['skyblaster','phantasmal-winged'].includes(variant);
  const soldierHat=['doppel','double-dude'].includes(variant);
  const zombie=anatomy==='zombie';
  const scale=short?.78:1, waist=female?.24:broad?.49:.34, shoulder=broad?.8:.59;
  const y=v=>v*scale;
  const skin=female?'#eadad0':zombie?'#8d9993':body;
  sphere('token-humanoid-armored-torso','body',[0,y(2.0),0],[broad?.65:female?.37:.49,y(.57),broad?.4:.28],1,body);
  sphere('token-humanoid-waist','body',[0,y(1.38),0],[waist,y(.31),.25],1,body);
  if(variant==='moon-spirit')skull('token-moon-large-skull',[0,y(2.99),.07],1.16,body);
  else {
    sphere('token-humanoid-head','body',[0,y(3.04),.02],[broad?.4:.29,y(.36),.26],2,skin);
    eyes('token-humanoid',{y:y(3.07),z:.265,spread:broad?.17:.13,size:broad?.06:.044,tint:eye});
    sphere('token-humanoid-nose','body',[0,y(2.98),.282],[.055,y(.073),.064],0,skin);
    curve('token-humanoid-mouth','dark',[[-.087,y(2.87),.248],[0,y(2.855),.271],[.087,y(2.87),.248]],.009,'#6d4f5a',5);
  }
  if(female&&!['einherjar','moon-spirit'].includes(variant))longHair(variant==='world-legacy-spirit'?'#b1a5d0':dark,variant==='gorz-emissary'?1.62:1.15);
  else if(!soldierHat&&variant!=='moon-spirit'){
    solid('token-humanoid-helmet-faceplate','accent',[[-.29,.29],[-.19,.06],[-.29,-.16],[0,-.02],[.29,-.16],[.19,.06],[.29,.29]],.06,[0,y(3.05),.23],undefined,accent);
    for(const side of sides)cone(`token-humanoid-crown-prong-${side}`,'accent',[side*.24,y(3.41),-.03],[.1,y(.4),.09],[0,0,side*-.3],accent);
  }
  if(soldierHat){
    part('token-soldier-fedora-crown',new THREE.CylinderGeometry(.21,.26,.25,10),'dark',[0,y(3.4),0],[1,scale,1],undefined,dark);
    sphere('token-soldier-fedora-brim','dark',[0,y(3.28),0],[.43,y(.063),.35],1,dark);
    box('token-soldier-black-face-mask','dark',[0,y(2.98),.25],[.39,y(.31),.041],undefined,dark);
  }
  if(floating && code !== '46647145'){
    curve('token-humanoid-floating-robe-tail','body',[[0,y(1.49),0],[.1,y(1.02),-.08],[-.25,y(.48),-.02],[.28,y(.3),.13]],.17,body,16);
    for(const side of sides)curvedSheet(`token-floating-robe-panel-${side}`,'body',[[0,0],[side*.27,-.49],[side*.51,-1.13],[side*.22,-1.32],[-side*.13,-.17]],.04,[side*.12,y(1.48),-.07],undefined,body);
  }else for(const side of sides){
    rod(`token-humanoid-thigh-${side}`,'body',[side*waist*.72,y(1.31),0],[side*.3,y(.8),.05],broad?.23:.15,broad?.19:.12,body);
    sphere(`token-humanoid-knee-${side}`,'accent',[side*.3,y(.78),.07],[.16,y(.17),.15],1,accent);
    rod(`token-humanoid-shin-${side}`,'body',[side*.3,y(.74),.06],[side*.37,y(.25),.16],broad?.17:.12,broad?.16:.1,body);
    box(`token-humanoid-boot-${side}`,'accent',[side*.37,y(.17),.23],[broad?.43:.31,y(.24),.46],undefined,accent);
  }
  const multi=['einherjar','waltz-seraph'].includes(variant)?3:1;
  for(const side of sides)for(let arm=0;arm<multi;arm++){
    const shoulderY=y(2.37-arm*.25), handY=y(multi===3?2.73-arm*.75:1.58);
    const endX=side*(multi===3?1.13:shoulder+.21);
    sphere(`token-humanoid-shoulder-${side}-${arm}`,'accent',[side*shoulder,shoulderY,0],[broad?.32:.22,y(.24),.23],1,accent);
    rod(`upper-arm-${side}-token-humanoid-${arm}`,'body',[side*shoulder,shoulderY,0],[endX,handY+.22,.04],broad?.19:.095,broad?.15:.072,body);
    sphere(`hand-${side}-token-humanoid-${arm}`,'body',[endX,handY,.15],[broad?.23:.13,y(.17),broad?.17:.12],1,skin);
    for(let finger=0;finger<(variant==='moon-spirit'?4:3);finger++)rod(`hand-${side}-token-finger-${arm}-${finger}`,'body',[endX+(finger-1)*.055,handY-.04,.2],[endX+(finger-1)*.063,handY-y(variant==='moon-spirit'?.39:.16),.28],.021,.015,skin);
    if(variant==='waltz-seraph'){sphere(`token-waltz-hand-orb-${side}-${arm}`,'eye',[endX,handY+.19,.18],[.14,.14,.14],1,'#cca759');}
    if(broad)for(let claw=0;claw<3;claw++)cone(`hand-${side}-token-fiend-claw-${claw}`,'accent',[endX+(claw-1)*.1,handY-.23,.27],[.044,.27,.045],[Math.PI,0,0],accent);
  }
  if(angel||bat){for(const side of sides){wing(side,angel,angel&&variant!=='eva-angel'?'#343039':accent,variant==='eva-angel'?.8:1);if(variant==='eva-angel')wing(side,true,accent,.73,1);}}
  if(angel||['waltz-seraph','world-legacy-spirit'].includes(variant))ring('token-spirit-halo','accent',[0,y(3.62),-.05],.35,undefined,.03,accent);
  if (['asmo-angel','deus-angel'].includes(variant)) {
    roundedSolid('token-angel-black-silver-breastplate','dark',[[-.43,.36],[-.2,.46],[0,.35],[.2,.46],[.43,.36],[.38,-.16],[.18,-.38],[0,-.46],[-.18,-.38],[-.38,-.16]],.105,[0,y(2.03),.271],undefined,'#202930',.019);
    for (const side of sides) {
      curve(`token-angel-silver-chest-scroll-${side}`,'accent',[[side*.12,y(2.41),.34],[side*.29,y(2.28),.36],[side*.2,y(2.11),.372],[side*.1,y(2.22),.38]],.022,accent,14);
      curvedSheet(`token-angel-raised-shoulder-rim-${side}`,'accent',[[0,0],[side*.33,.22],[side*.48,.09],[side*.44,-.19],[side*.14,-.31],[-side*.09,-.09]],.05,[side*.47,y(2.46),-.05],undefined,accent,{camber:.06,curl:.035});
      for(let feather=0;feather<3;feather++)curvedSheet(`token-angel-cheek-feather-${side}-${feather}`,'body',[[0,0],[side*.16,.06],[side*(.34+feather*.08),.34+feather*.1],[side*.08,.15]],.03,[side*.2,y(3.08+feather*.03),0],undefined,body,{camber:.025,curl:.035});
    }
    for(let fold=0;fold<8;fold++) {
      const a=fold/8*Math.PI*2;
      curvedSheet(`token-angel-robed-skirt-fold-${fold}`,'body',[[-.09,0],[-.2,-.67],[-.27,-1.04],[.27,-1.04],[.2,-.67],[.09,0]],.04,[Math.sin(a)*.22,y(1.46),Math.cos(a)*.22],[0,a,0],body,{camber:.045,curl:.14,wave:.018,subdivisions:1});
    }
  }
  if (code === '46647145') {
    for(const side of sides){
      curvedSheet(`token-world-legacy-checkered-skirt-${side}`,'accent',[[0,0],[side*.3,-.04],[side*.48,-.4],[side*.12,-.47],[-side*.16,-.25]],.04,[side*.08,y(1.6),.17],undefined,accent,{camber:.06,curl:.06,wave:.035});
      curvedSheet(`token-world-legacy-waist-sash-${side}`,'dark',[[0,0],[side*.19,-.06],[side*.24,-.25],[side*.02,-.3]],.025,[side*.12,y(1.51),.22],undefined,'#79768f',{camber:.028,curl:.035});
      taperedCurve(`token-world-legacy-floating-hair-ribbon-${side}`,'accent',[[side*.18,3.16,-.12],[side*.58,3.01,-.19],[side*.97,2.72,-.17],[side*1.13,3.04,-.12]],.026,.013,'#caa3a9',30,8,.4);
    }
  }
  if(variant==='eva-angel')for(const side of sides)sphere(`token-eva-purple-orb-${side}`,'eye',[side*.77,2.7,.15],[.21,.21,.21],2,'#b493d2');
  if(variant==='radian')for(const side of sides)sphere(`hand-${side}-token-radian-blue-energy`,'eye',[side*.93,1.52,.31],[.24,.26,.1],2,'#84bdda');
  if(broad||['armored-phantasm','vassal'].includes(variant)){
    solid('token-fiend-chest-armor','accent',[[-.36,.26],[0,.36],[.36,.26],[.3,-.25],[0,-.45],[-.3,-.25]],.08,[0,y(2.06),.29],undefined,accent);
    for(const side of sides)for(let spike=0;spike<3;spike++)cone(`token-fiend-shoulder-spike-${side}-${spike}`,'accent',[side*(shoulder+spike*.09),y(2.59),-.06],[.08,y(.34+spike*.08),.07],[0,0,-side*(.4+spike*.18)],accent);
  }
  if(variant==='grinder'){
    ring('token-grinder-gear-crest','accent',[0,y(3.22),-.13],.46,[0,0,0],.08,accent);
    for(let tooth=0;tooth<10;tooth++){const a=tooth/10*Math.PI*2;box(`token-grinder-crown-gear-tooth-${tooth}`,'body',[Math.cos(a)*.47,y(3.22)+Math.sin(a)*.47,-.13],[.15,.13,.19],[0,0,a],body);}
  }
  if(zombie){
    for(let rib=0;rib<4;rib++)for(const side of sides)curve(`token-zombie-visible-rib-${side}-${rib}`,'accent',[[side*.05,y(2.17-rib*.15),.3],[side*.29,y(2.2-rib*.15),.33],[side*.42,y(2.04-rib*.15),.29]],.025,accent,7);
    for(const side of sides)curvedSheet(`token-zombie-tattered-cloth-${side}`,'dark',[[0,0],[side*.34,-.47],[side*.12,-.39],[side*.18,-.65],[-side*.15,-.38]],.028,[side*.12,y(1.48),.18],undefined,dark);
  }
  if (variant === 'gorz-emissary') {
    curvedSheet('token-gorz-tall-pointed-helmet','body',[[-.25,-.2],[-.29,.27],[-.16,.86],[.15,1.03],[.13,.47],[.27,.18],[.25,-.2]],.09,[0,y(3.08),-.025],undefined,body,{camber:.06,curl:.08});
    for(const side of sides){
      curvedSheet(`token-gorz-curved-breast-armor-${side}`,'body',[[0,0],[side*.31,.11],[side*.39,-.08],[side*.21,-.25],[-side*.04,-.16]],.06,[side*.06,y(2.29),.26],undefined,body,{camber:.09,curl:.025});
      curve(`token-gorz-gold-armor-outline-${side}`,'accent',[[side*.06,y(2.25),.31],[side*.31,y(2.4),.32],[side*.44,y(2.16),.34],[side*.18,y(1.96),.35]],.016,accent,16);
      curvedSheet(`token-gorz-long-split-skirt-${side}`,'body',[[0,0],[side*.26,-.13],[side*.36,-.94],[side*.1,-1.26],[-side*.13,-.83]],.045,[side*.2,y(1.43),.2],undefined,body,{camber:.06,curl:.085,wave:.028});
      curvedSheet(`token-gorz-red-lined-cape-${side}`,'accent',[[0,0],[side*.31,-.61],[side*.73,-2.39],[-side*.03,-2.28],[-side*.12,-.22]],.04,[side*.2,y(2.66),-.26],undefined,'#893541',{camber:.075,curl:-.14,wave:.04});
    }
  }
  if(variant==='doppel'){
    box('token-doppel-backpack','dark',[0,y(2.04),-.37],[.78,y(.89),.23],undefined,dark);
    box('sword-token-doppel-gun-stock','dark',[.82,y(1.6),.26],[.22,y(.36),.16],undefined,dark);
    rod('sword-token-doppel-gun-barrel','body',[.81,y(1.81),.31],[.81,y(1.82),.86],.057,.044,body);
  }else if(variant==='double-dude'){
    for(const side of sides){box(`sword-token-double-dude-crossed-weapon-${side}`,'accent',[side*.13,2.07,.33],[.13,1.2,.12],[0,0,side*.85],accent);curvedSheet(`token-double-dude-coat-tail-${side}`,'dark',[[0,0],[side*.35,-1.01],[side*.53,-1.17],[-side*.19,-1.04]],.033,[side*.21,1.56,-.17],undefined,dark);}
  }else if(!floating&&!angel&&!bat&&!broad&&!zombie){
    if(variant==='sky-striker'){
      roundedSolid('sword-token-sky-striker-blaster','dark',[[-.1,0],[-.17,.22],[-.12,.68],[.06,.77],[.12,.61],[.11,.12]],.14,[.84,1.43,.25],[-.12,0,.1],dark,.015);
      curvedSheet('sword-token-sky-striker-long-blade','body',[[-.105,0],[-.16,.56],[-.08,1.09],[.14,1.48],[.1,.75],[.08,.12]],.035,[.86,2.05,.25],[0,0,-.3],'#d3d9d8',{camber:.025,curl:.018});
      for(const side of sides)curve(`token-sky-striker-waist-armor-seam-${side}`,'accent',[[side*.26,2.2,.243],[side*.16,1.72,.28],[side*.31,1.51,.222]],.012,'#d2d7d2',12);
      for(const side of sides)box(`token-sky-striker-tech-backpack-${side}`,'accent',[side*.29,2.16,-.4],[.19,.7,.24],[0,0,side*.14],accent);
    }else if(variant==='tricky-magician'){
      rod('staff-token-tricky','accent',[.82,.24,.28],[.82,2.71,.28],.045,.045,accent);
      sphere('staff-token-tricky-orb','eye',[.82,2.85,.28],[.18,.19,.18],1,eye);
      for(const side of sides)curvedSheet(`token-tricky-purple-cape-${side}`,'accent',[[0,0],[side*.51,-.43],[side*.6,-1.92],[-side*.21,-1.51]],.04,[side*.17,2.68,-.29],undefined,accent);
      cone('token-tricky-pointed-hat','body',[0,3.57,-.05],[.3,.53,.27],[0,0,-.23],body);
      curve('token-tricky-gold-question-mark','accent',[[-.08,3.09,.288],[0,3.2,.298],[.09,3.12,.288],[0,3.01,.29]],.013,eye,9);
    }else{
      rod('sword-token-warrior-hilt','accent',[.82,1.32,.24],[.82,1.79,.24],.055,.055,accent);
      box('sword-token-warrior-crossguard','accent',[.82,1.82,.24],[.4,.075,.09],undefined,accent);
      solid('sword-token-warrior-blade','accent',[[-.073,0],[.073,0],[.073,1.04],[0,1.28],[-.073,1.04]],.035,[.82,1.88,.24],undefined,variant==='gorz-emissary'?'#cac6b4':accent);
    }
  }
  return true;
}
