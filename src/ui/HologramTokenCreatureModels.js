import * as THREE from 'three';
import { createTokenGeometryTools } from './HologramTokenGeometry.js';

/** Illustrated animal, aquatic and draconic Tokens, using the caller's owned batches. */
export function buildTokenCreatureAnatomy(profile, helpers) {
  const { part, sphere, box, cone, ring, rod } = helpers;
  const { solid, roundedSolid, curvedSheet, curve, taperedCurve, taperedPath, eyes } = createTokenGeometryTools(helpers);
  const anatomy = profile.tokenAnatomy;
  const code = String(profile.tokenCode || '');
  const variant = profile.tokenVisual?.variant || '';
  const body = profile.body, accent = profile.accent, dark = profile.hair || '#29242f';
  const cream = '#ead8ab', white = '#fff4dc', black = '#201b2b';
  const sides = [-1, 1];

  if (anatomy === 'sheep' || anatomy === 'lamb') {
    // The reference Tokens are sleeping, floating balls of wool. They do not
    // have the long legs, upright head or pointed horns of a generic goat.
    const shadow = ['67284108', '67284109', '67284110', '67284111'].includes(code) || variant === 'black-sheep';
    const lamb = anatomy === 'lamb';
    sphere('token-sheep-round-fleece', 'body', [0, 1.35, 0], [.87, .88, .78], 2, shadow ? '#4b1927' : body);
    for (let index = 0; index < 26; index += 1) {
      const angle = index * 2.399963;
      const y = 1 - 2 * (index + .5) / 26;
      const radial = Math.sqrt(1 - y * y);
      const direction = [Math.cos(angle) * radial, y, Math.sin(angle) * radial];
      const start = [direction[0] * .75, 1.35 + direction[1] * .76, direction[2] * .66];
      const tip = [direction[0] * .94 - direction[1] * .035, 1.35 + direction[1] * .98, direction[2] * .83];
      taperedCurve(`token-sheep-wool-tip-${index}`, 'body', [start, [direction[0] * .87, 1.35 + direction[1] * .89, direction[2] * .77], tip], .105, .003, shadow ? '#401c2b' : body, 10, 8, .65);
    }
    for (const side of sides) {
      // Stray Lambs and both printed Lamb Tokens have upward-facing crescent
      // horns. Sheep Tokens instead have a complete ram's spiral.
      const hornPoints = lamb
        ? [[side * .62, 1.58, .25], [side * .94, 1.47, .34], [side * 1.04, 1.62, .38], [side * .98, 1.91, .37], [side * .82, 2.06, .34]]
        : [[side * .7, 1.58, .29], [side * .97, 1.65, .38], [side * 1.1, 1.44, .4], [side * .96, 1.23, .42], [side * .75, 1.27, .48], [side * .71, 1.43, .49], [side * .84, 1.5, .51]];
      taperedCurve(`token-sheep-curled-horn-${side}`, 'accent', hornPoints, .185, lamb ? .006 : .058, cream, 36, 12);
      for (let groove = 0; groove < 5; groove += 1) {
        if (lamb) {
          const point = new THREE.CatmullRomCurve3(hornPoints.map(p => new THREE.Vector3(...p))).getPoint(.17 + groove * .13);
          curve(`token-lamb-crescent-horn-groove-${side}-${groove}`, 'accent', [[point.x - .055, point.y + .035, point.z + .085], [point.x, point.y, point.z + .11], [point.x + .055, point.y - .035, point.z + .085]], .008, '#aa9870', 6);
        } else sphere(`token-sheep-horn-ridge-${side}-${groove}`, 'accent', [side * (.72 + groove * .075), 1.59 - groove * .034, .47], [.025, .17, .04], 0, '#c6b483');
      }
      if (shadow) sphere(`token-sheep-shadow-eye-${side}`, 'eye', [side * .27, 1.51, .733], [.115, .11, .037], 1, '#a6e5f1');
      else curve(`token-sheep-closed-eye-${side}`, 'dark', [[side * .39, 1.44, .716], [side * .29, 1.41, .767], [side * .17, 1.45, .78]], .013, '#65574e', 7);
      cone(`token-sheep-tiny-hoof-${side}`, 'accent', [side * .41, .55, .12], [.13, .16, .15], [Math.PI, 0, 0], cream);
      if (lamb) cone(`token-lamb-rear-hoof-${side}`, 'accent', [side * .24, .57, -.29], [.1, .14, .13], [Math.PI, 0, 0], cream);
    }
    taperedCurve('token-sheep-crown-tuft', 'body', [[-.025, 2.13, -.03], [.03, 2.32, -.035], [.13, 2.4, -.04]], .12, .004, shadow ? '#4b1927' : body, 12, 8, .52);
    curve('token-sheep-sleeping-mouth', 'dark', [[-.09, 1.15, .775], [0, 1.12, .79], [.09, 1.16, .775]], .012, '#7a5e57', 6);
    return true;
  }

  if (anatomy === 'kuriboh') {
    sphere('token-kuriboh-fur-ball', 'body', [0, 1.45, 0], [.79, .85, .68], 2, body);
    for (let index = 0; index < 28; index += 1) {
      const angle = index * 2.399963, y = 1 - 2 * (index + .5) / 28, radius = Math.sqrt(1 - y * y);
      const direction = [Math.cos(angle) * radius, y, Math.sin(angle) * radius];
      taperedCurve(`token-kuriboh-fur-lock-${index}`, 'body', [[direction[0] * .65, 1.45 + direction[1] * .72, direction[2] * .55], [direction[0] * .85, 1.45 + direction[1] * .86 - .02, direction[2] * .72], [direction[0] * .95, 1.45 + direction[1] * .87 - .15, direction[2] * .8]], .125, .003, body, 12, 8, .52);
    }
    eyes('token-kuriboh', { y: 1.66, z: .65, spread: .29, size: .19, white: true, tint: '#927abc' });
    for (const side of sides) {
      sphere(`token-kuriboh-green-hand-${side}`, 'accent', [side * .7, 1.16, .14], [.26, .27, .2], 1, '#6b9871');
      sphere(`token-kuriboh-green-foot-${side}`, 'accent', [side * .31, .68, .27], [.25, .21, .3], 1, '#6b9871');
      for (let claw = 0; claw < 3; claw += 1) {
        const x = side * .7 + (claw - 1) * .11;
        taperedCurve(`token-kuriboh-claw-${side}-${claw}`, 'accent', [[x, .99, .24], [x, .91, .3], [x, .87, .35]], .044, .001, '#ede0b7', 8, 6);
      }
      for (let claw = 0; claw < 4; claw += 1) {
        const x = side * .31 + (claw - 1.5) * .095;
        cone(`token-kuriboh-foot-claw-${side}-${claw}`, 'accent', [x, .6, .53], [.034, .155, .036], [Math.PI * .59, 0, 0], '#ede0b7');
      }
    }
    return true;
  }

  if (anatomy === 'hippo') {
    const dancer = ['orange-dancer', 'yellow-dancer', 'blue-dancer'].includes(variant) || ['11050417', '11050418', '11050419'].includes(code);
    sphere('token-hippo-round-body', 'body', [0, 1.2, 0], [.64, .87, .42], 2, body);
    sphere('token-hippo-wide-head', 'body', [0, 2.37, .03], [.64, .54, .45], 2, body);
    sphere('token-hippo-wide-muzzle', 'body', [0, 2.15, .41], [.61, .31, .31], 2, body);
    eyes('token-hippo', { y: 2.55, z: .407, spread: .29, size: .095, white: true, tint: profile.eye });
    for (const side of sides) {
      sphere(`token-hippo-round-ear-${side}`, 'body', [side * .56, 2.8, -.04], [.16, .19, .13], 1, body);
      sphere(`token-hippo-nostril-${side}`, 'dark', [side * .25, 2.29, .7], [.063, .073, .024], 0, '#602a49');
      rod(`token-hippo-arm-${side}`, 'body', [side * .54, 1.77, 0], [side * .98, dancer ? 2.15 : 1.77, .13], .2, .17, body);
      sphere(`token-hippo-hand-${side}`, 'body', [side * 1.01, dancer ? 2.18 : 1.79, .14], [.21, .2, .17], 1, body);
      rod(`token-hippo-leg-${side}`, 'body', [side * .29, .65, .01], [side * .39, .25, .13], .18, .16, body);
      sphere(`token-hippo-foot-${side}`, 'body', [side * .39, .22, .25], [.26, .16, .34], 1, body);
    }
    box('token-hippo-open-smile', 'dark', [0, 2.065, .705], [.68, .2, .025], undefined, '#6d2344');
    for (const side of sides) box(`token-hippo-incisor-${side}`, 'accent', [side * .15, 2.14, .731], [.19, .13, .028], undefined, white);
    if (!dancer) {
      box('token-hippo-bowtie-knot', 'accent', [0, 1.77, .43], [.13, .14, .1], undefined, '#ffcc72');
      for (const side of sides) cone(`token-hippo-bowtie-${side}`, 'accent', [side * .17, 1.77, .43], [.13, .29, .1], [0, 0, side * Math.PI / 2], '#ffdc81');
      cone('token-hippo-party-hat', 'accent', [0, 3.14, -.07], [.33, .76, .3], [0, 0, -.12], '#8934a3');
      sphere('token-hippo-hat-pom', 'accent', [-.06, 3.55, -.07], [.1, .1, .1], 1, '#f8d447');
    } else {
      ring('token-hippo-waist-trim', 'accent', [0, .83, 0], .54, undefined, .07, accent);
      for (let bead = 0; bead < 9; bead += 1) sphere(`token-hippo-pearl-${bead}`, 'accent', [(bead - 4) * .1, 1.74 - Math.sin(bead / 8 * Math.PI) * .16, .43], [.064, .064, .04], 1, white);
      const orange=code==='11050417', yellow=code==='11050418';
      const plumeColor=orange?'#65a56b':yellow?'#cf538c':'#ecd27b';
      for(let plume=0;plume<5;plume++){
        const a=(plume-2)*.36;
        curve(`token-hippo-large-rear-plume-${plume}`,'accent',[[Math.sin(a)*.34,2.77,-.36],[Math.sin(a)*.98,3.04,-.42],[Math.sin(a)*1.22,2.92+Math.cos(a)*.41,-.43]],.19,plumeColor,10);
      }
      if(yellow){
        sphere('token-hippo-blue-turban-band','accent',[0,2.98,.14],[.32,.105,.35],1,'#73a9c6');
        solid('token-hippo-turban-central-gem','eye',[[-.12,0],[0,.17],[.12,0],[0,-.1]],.06,[0,3.05,.463],undefined,'#9181c2');
        for(const side of sides)solid(`token-hippo-cyan-cross-collar-${side}`,'accent',[[0,0],[side*.13,.07],[side*.36,-.43],[side*.2,-.45]],.035,[0,1.86,.422],undefined,'#4ea1c5');
      }else{
        for(let feather=0;feather<7;feather++)solid(`token-hippo-headdress-feather-${feather}`,'accent',[[-.07,0],[-.1,.24],[0,.54],[.1,.24],[.07,0]],.055,[(feather-3)*.105,2.8,.11],[0,0,-(feather-3)*.18],orange?'#a9be6b':'#d3639b');
        if(!orange)for(let bead=0;bead<11;bead++)sphere(`token-hippo-second-gold-necklace-${bead}`,'accent',[(bead-5)*.073,1.62-Math.sin(bead/10*Math.PI)*.17,.446],[.043,.043,.029],1,'#dec473');
        for(const side of sides)sphere(`token-hippo-flower-collar-${side}`,'accent',[side*.34,1.61,.445],[.18,.16,.033],1,orange?'#ead6d7':'#ead581');
      }
      for(const side of sides)ring(`token-hippo-gold-earring-${side}`,'accent',[side*.62,2.46,.016],.09,[0,0,0],.023,'#d9bc68');
    }
    return true;
  }

  if (anatomy === 'ojama') {
    const blue = code === '14470847', red = code === '14470846', yellow = code === '29843093', metal = code === '29843094';
    const small = blue || red;
    if (code === '29843092' || metal) {
      const headY = metal ? 2.35 : 2.21, face = metal ? '#a4aab7' : body;
      sphere('token-ojama-odd-body', 'body', [0, 1.06, 0], [metal ? .53 : .44, .57, .37], 2, face);
      sphere('token-ojama-odd-head', 'body', [0, headY, .055], [.63, .62, .43], 2, face);
      sphere('token-ojama-single-raised-eye-white', 'accent', [metal ? 0 : -.2, headY + .43, .335], [.24, .235, .13], 2, metal ? '#bcc3c9' : '#eed44a');
      sphere('token-ojama-single-raised-iris', 'eye', [metal ? 0 : -.2, headY + .43, .46], [.105, .14, .026], 1, metal ? '#838996' : '#b52c9c');
      sphere('token-ojama-single-pupil', 'dark', [metal ? 0 : -.2, headY + .43, .487], [.044, .085, .013], 1, black);
      sphere('token-ojama-grinning-black-mouth', 'dark', [0, headY - .12, .449], [.51, .33, .053], 2, '#281c2a');
      for (let tooth = 0; tooth < 10; tooth += 1) for (const row of [-1, 1]) {
        const x = (tooth - 4.5) * .088, y = headY - .12 + row * (.22 - Math.pow(x, 2) * .2);
        sphere(`token-ojama-rounded-grin-tooth-${row}-${tooth}`, 'accent', [x, y, .493], [.041, .087, .024], 0, white);
      }
      curve('token-ojama-upper-grin-lip', 'body', [[-.5, headY-.1, .4], [-.36, headY+.14, .443], [0, headY+.19, .45], [.36, headY+.14, .443], [.5, headY-.1, .4]], .052, face, 14);
      if (!metal) taperedCurve('token-ojama-long-pink-tongue', 'accent', [[0, headY-.2, .5],[.05, headY-.43, .66],[.03, headY-.83, .7],[.01, headY-1.0, .57]], .145, .073, '#c879ae', 28, 12, .25);
      for (const side of sides) {
        const raised = !metal && side === 1;
        const points = [[side*.48,1.51,0],[side*.73,raised?2.09:1.38,.07],[side*.57,raised?2.86:1.12,.16]];
        taperedCurve(`token-ojama-spindly-arm-${side}`, 'body', points, .105, .072, face, 20, 10);
        sphere(`token-ojama-hand-${side}`, 'body', points.at(-1), [.145,.145,.11], 1, face);
        for(let finger=0;finger<3;finger++)taperedCurve(`token-ojama-finger-${side}-${finger}`,'body',[[points[2][0]+(finger-1)*.069,points[2][1],.23],[points[2][0]+(finger-1)*.084,points[2][1]+(raised?.16:-.13),.27],[points[2][0]+(finger-1)*.081,points[2][1]+(raised?.18:-.13),.29]],.024,.014,face,8,6);
        taperedCurve(`token-ojama-bent-leg-${side}`, 'body', [[side*.24,.74,0],[side*.57,.46,.08],[side*.42,.2,.18]], .16, .085, face, 20, 10);
        sphere(`token-ojama-foot-${side}`, 'body', [side*.43,.2,.28], [.25,.135,.3], 1, face);
      }
      ring('token-ojama-red-waistband','accent',[0,.78,0],.38,undefined,.06,metal?'#536274':'#b73654');
      return true;
    }
    if (small) {
      // Ojama Duo supplies a second pose for the red and blue printed Tokens.
      // Their heads, hands and faces are different anatomical designs; they
      // are not recolours of the yellow/green smiling Ojamas.
      sphere('token-ojama-odd-body', 'body', [0, 1.09, 0], [blue ? .29 : .34, .43, .25], 2, body);
      if (blue) {
        const contour = [[0,-.65],[.29,-.65],[.48,-.6],[.52,-.43],[.45,-.2],[.4,.08],[.45,.35],[.57,.53],[.6,.6],[.46,.65],[0,.65]];
        part('token-ojama-odd-head', new THREE.LatheGeometry(contour.map(p => new THREE.Vector2(...p)), 24), 'body', [0,2.36,.03], [1,1,.66], undefined, body);
        for (const side of sides) {
          const x = side * .29;
          curvedSheet(`token-ojama-blue-slanted-eye-white-${side}`, 'accent', [[-side*.21,-.055],[-side*.23,.04],[side*.24,.14],[side*.21,.006],[0,-.083]], .017, [x,2.78,.327], undefined, '#e7e7c8', {camber:.025,curl:0,subdivisions:1});
          sphere(`token-ojama-eye-${side}`, 'dark', [side*.24,2.78,.363], [.023,.039,.013], 0, '#343845');
          curve(`token-ojama-blue-raised-eyelid-${side}`, 'body', [[side*.07,2.825,.345],[side*.29,2.879,.358],[side*.53,2.943,.323]], .023, body, 8);
        }
        curve('token-ojama-blue-pursed-purple-lips','accent',[[-.12,2.12,.342],[-.06,2.17,.371],[.04,2.17,.376],[.12,2.12,.35],[.04,2.075,.376],[-.06,2.075,.371],[-.12,2.12,.342]],.036,'#a181b4',12);
        curve('token-ojama-unhappy-mouth','dark',[[-.076,2.12,.397],[0,2.12,.412],[.076,2.12,.397]],.012,'#634c81',6);
        // The token pose has a folded hand pressed against the upper arm.
        taperedCurve('token-ojama-spindly-arm--1','body',[[-.25,1.49,.03],[-.45,1.22,.07],[.04,1.2,.24],[.23,1.42,.23]],.068,.052,body,20,8);
        taperedCurve('token-ojama-spindly-arm-1','body',[[.25,1.5,.03],[.43,1.24,.09],[-.1,1.13,.24],[-.27,1.37,.24]],.068,.052,body,20,8);
        for (const side of sides) {
          sphere(`token-ojama-hand-${side}`,'body',[side*.24,1.4,.255],[.11,.135,.075],1,body);
          for(let finger=0;finger<3;finger++)taperedCurve(`token-ojama-blue-folded-finger-${side}-${finger}`,'body',[[side*.21+(finger-1)*.045,1.34,.3],[side*.2+(finger-1)*.047,1.43,.332],[side*.17+(finger-1)*.044,1.47,.313]],.018,.009,body,7,6);
        }
      } else {
        const head = new THREE.SphereGeometry(1,20,12), vertex=head.attributes.position;
        for(let i=0;i<vertex.count;i++){
          const x=vertex.getX(i), y=vertex.getY(i), z=vertex.getZ(i);
          vertex.setXYZ(i,x*(y<0?1+y*.18:1-y*.17)-Math.max(0,y)*.09,y,z);
        }
        head.computeVertexNormals();
        part('token-ojama-odd-head',head,'body',[0,2.24,.04],[.56,.61,.38],undefined,body);
        cone('token-ojama-crown-point','body',[-.075,2.878,.015],[.18,.29,.15],[0,0,.23],body);
        for(const side of sides){
          const x=side*.175, y=side===-1?2.115:2.175;
          sphere(`token-ojama-eye-white-${side}`,'accent',[x,y,.386],[.092,.101,.026],1,'#e5e3c6');
          sphere(`token-ojama-eye-${side}`,'dark',[x,y-.006,.416],[.027,.033,.013],0,'#382b32');
          curve(`token-ojama-red-scowling-brow-${side}`,'body',[[side*.28,y+.106,.344],[side*.18,y+.087,.397],[side*.083,y+.048,.412]],.038,body,8);
        }
        curve('token-ojama-unhappy-mouth','dark',[[-.25,1.987,.356],[-.14,2.027,.408],[.03,2.026,.421],[.23,1.95,.36]],.027,'#5a2939',10);
        for(let tooth=0;tooth<5;tooth++)roundedSolid(`token-ojama-red-gritted-tooth-${tooth}`,'accent',[[-.029,0],[.029,0],[.031,-.052],[-.028,-.052]],.014,[-.132+tooth*.061,2.021-tooth*.006,.437],undefined,'#e9e0cd',.002);
        ring('token-ojama-red-yellow-scarf-collar','accent',[0,1.657,.028],.29,undefined,.061,'#e7dc87');
        curvedSheet('token-ojama-red-yellow-scarf-bib','accent',[[-.22,.065],[-.14,-.17],[.02,-.225],[.19,-.12],[.22,.055]],.03,[0,1.65,.216],undefined,'#e7dc87',{camber:.044,curl:.035,subdivisions:1});
        curve('token-ojama-red-scarf-fold','dark',[[-.12,1.628,.267],[-.045,1.514,.294],[.093,1.584,.29]],.009,'#b2a655',7);
        curvedSheet('token-ojama-red-scarf-flying-end','accent',[[-.04,.055],[-.38,-.06],[-.35,-.22],[-.13,-.16],[.055,-.035]],.026,[-.2,1.66,.003],undefined,'#e7dc87',{camber:.04,curl:-.05,subdivisions:1});
        for(const side of sides){
          const points=side===-1?[[-.31,1.49,.01],[-.62,1.71,.04],[-.76,2.02,.13]]:[[.31,1.48,.01],[.65,1.28,.09],[.89,1.66,.18]];
          taperedCurve(`token-ojama-spindly-arm-${side}`,'body',points,.083,.056,body,20,8);
          sphere(`token-ojama-hand-${side}`,'body',points[2],[.13,.135,.089],1,body);
          if(side===-1){
            taperedCurve('token-ojama-red-pointing-index','body',[[-.805,2.08,.16],[-.82,2.24,.17],[-.84,2.35,.18]],.029,.015,body,10,6);
            for(let finger=0;finger<3;finger++)taperedCurve(`token-ojama-red-folded-finger-${finger}`,'body',[[-.76+finger*.034,2.075,.2],[-.722+finger*.037,2.11,.217],[-.714+finger*.032,2.039,.236]],.023,.013,body,7,6);
          }else for(let finger=0;finger<4;finger++)rod(`token-ojama-red-fist-finger-${finger}`,'body',[.83+finger*.035,1.702,.25],[.83+finger*.035,1.633,.267],.022,.021,body);
        }
      }
      // Both illustrations show thong briefs and narrow bent legs ending in
      // individual toes, instead of the former rounded toy feet.
      curvedSheet('token-ojama-red-thong-briefs','accent',[[-.29,.08],[-.16,-.045],[0,-.25],[.16,-.045],[.29,.08]],.025,[0,.846,.198],undefined,'#c74e69',{camber:.027,curl:0,subdivisions:1});
      for(const side of sides){
        const knee=[side*(blue?.31:.48),.46,blue?-.006:.085], foot=[side*(blue?.34:.64),.15,.165];
        taperedCurve(`token-ojama-bent-leg-${side}`,'body',[[side*.18,.76,0],knee,foot],.11,.052,body,20,8);
        sphere(`token-ojama-foot-${side}`,'body',[foot[0],.14,.231],[.126,.076,.19],1,body);
        for(let toe=0;toe<4;toe++)taperedCurve(`token-ojama-toe-${side}-${toe}`,'body',[[foot[0]+(toe-1.5)*.045,.145,.29],[foot[0]+(toe-1.5)*.048,.137,.373],[foot[0]+(toe-1.5)*.045,.132,.4]],.022,.01,body,7,6);
      }
      return true;
    }
    sphere('token-ojama-odd-body', 'body', [0, small ? 1.16 : 1.08, 0], [small ? .34 : .58, small ? .43 : .68, .33], 2, body);
    sphere('token-ojama-odd-head', 'body', [0, small ? 2.24 : 1.96, .04], [blue ? .49 : .54, blue ? .76 : .58, .38], 2, body);
    const eyeY = blue ? 2.64 : red ? 2.16 : 2.3;
    const spread = blue ? .38 : small ? .23 : .25;
    eyes('token-ojama', { y: eyeY, z: blue ? .25 : .385, spread, size: small ? .12 : .16, white: true, tint: '#cdd393' });
    for (const side of sides) {
      rod(`token-ojama-spindly-arm-${side}`, 'body', [side * .4, 1.45, 0], [side * .83, small ? 1.21 : 1.83, .16], .095, .075, body);
      sphere(`token-ojama-hand-${side}`, 'body', [side * .86, small ? 1.2 : 1.85, .18], [.13, .14, .1], 1, body);
      rod(`token-ojama-bent-leg-${side}`, 'body', [side * .24, .65, 0], [side * .43, .3, .13], .14, .1, body);
      sphere(`token-ojama-foot-${side}`, 'body', [side * .43, .24, .26], [.21, .15, .3], 1, body);
      if (yellow) curve(`token-ojama-looped-eyestalk-${side}`, 'body', [[side * .27, 2.17, 0], [side * .6, 2.78, .05], [side * .28, 2.91, .11], [side * .11, 2.65, .21]], .085, body, 14);
    }
    if (!small) {
      sphere('token-ojama-grinning-black-mouth', 'dark', [0, 1.85, .383], [.43, .32, .068], 1, '#321f33');
      for (let tooth = 0; tooth < 8; tooth += 1) box(`token-ojama-grin-tooth-${tooth}`, 'accent', [(tooth - 3.5) * .093, 2.01 - Math.abs(tooth - 3.5) * .018, .46], [.078, .135, .03], [0, 0, -(tooth - 3.5) * .08], white);
      if (!yellow && !metal) sphere('token-ojama-long-pink-tongue', 'accent', [0, 1.53, .53], [.16, .5, .09], 2, '#d380bc');
      ring('token-ojama-red-waistband', 'accent', [0, .73, 0], .38, undefined, .064, '#b73654');
    } else {
      curve('token-ojama-unhappy-mouth', 'dark', [[-.17, 1.99, .415], [0, 2.05, .444], [.17, 1.99, .415]], .024, '#513342', 8);
      if (red) cone('token-ojama-crown-point', 'body', [0, 2.91, .04], [.22, .31, .14], [0, 0, .28], body);
    }
    return true;
  }

  if (anatomy === 'raccoon' || anatomy === 'beast') {
    const fox = code === '27198002' || variant === 'fox';
    const wolf = code === '15394084' || variant === 'wolf';
    const biped = anatomy === 'raccoon';
    sphere('token-beast-torso', 'body', [0, biped ? 1.4 : 1.3, 0], [biped ? .57 : .6, biped ? .78 : .5, biped ? .43 : .92], 2, body);
    sphere('token-beast-head', 'body', [0, biped ? 2.47 : 1.87, biped ? .02 : .74], [.43, .42, .4], 2, body);
    sphere('token-beast-muzzle', 'accent', [0, biped ? 2.29 : 1.75, biped ? .37 : 1.08], [.32, .2, .32], 1, accent);
    const faceY = biped ? 2.53 : 2, faceZ = biped ? .33 : 1.06;
    if (biped) for (const side of sides) sphere(`token-raccoon-black-mask-${side}`, 'dark', [side * .2, faceY, faceZ], [.22, .12, .035], 1, '#342a23');
    eyes('token-beast', { y: faceY, z: faceZ + .035, spread: .2, size: .065, tint: '#d7b96a' });
    sphere('token-beast-nose', 'dark', [0, biped ? 2.37 : 1.8, biped ? .656 : 1.35], [.085, .065, .042], 1, black);
    for (const side of sides) {
      cone(`token-beast-ear-${side}`, 'body', [side * .3, biped ? 2.86 : 2.22, biped ? -.01 : .7], [fox ? .2 : .15, fox ? .52 : .36, .16], [0, 0, side * -.23], body);
      if (biped) {
        rod(`token-raccoon-arm-${side}`, 'body', [side * .51, 1.96, .02], [side * .7, 1.35, .16], .18, .15, body);
        sphere(`token-raccoon-hand-${side}`, 'accent', [side * .7, 1.25, .19], [.2, .2, .15], 1, accent);
        rod(`token-raccoon-leg-${side}`, 'body', [side * .3, .82, 0], [side * .36, .28, .1], .2, .15, body);
        sphere(`token-raccoon-foot-${side}`, 'accent', [side * .36, .2, .25], [.23, .16, .31], 1, accent);
      } else for (const z of [-.54, .59]) {
        rod(`token-beast-leg-${side}-${z}`, 'body', [side * .43, 1.18, z], [side * .52, .3, z + .08], .15, .1, body);
        sphere(`token-beast-paw-${side}-${z}`, 'accent', [side * .52, .22, z + .2], [.23, .16, .29], 1, accent);
      }
    }
    if(fox){
      for(let tail=0;tail<9;tail++){
        const a=tail/9*Math.PI*2;
        const path=[[0,1.25,-.65],[Math.cos(a)*.45,1.32+Math.sin(a)*.39,-.92],[Math.cos(a)*.94,1.44+Math.sin(a)*.89,-1.14],[Math.cos(a)*1.37,1.55+Math.sin(a)*1.15,-1.1]];
        curve(`token-fox-nine-tail-${tail}`,'body',path,.17,'#e3d5df',16);
        curve(`token-fox-red-tail-tip-${tail}`,'accent',[path[2],path[3],[path[3][0]*1.03,path[3][1]+.06,-1.08]],.107,'#b9495b',10);
        sphere(`token-fox-red-tail-end-${tail}`,'accent',[path[3][0]*1.03,path[3][1]+.06,-1.08],[.105,.105,.105],0,'#b9495b');
      }
      for(const side of sides)curve(`token-fox-red-face-mark-${side}`,'accent',[[side*.16,2.17,1.13],[side*.26,1.99,1.15],[side*.13,1.86,1.23]],.019,'#b9495b',8);
    }else curve('token-beast-curled-tail','body',[[0,1.23,-.72],[.46,1.06,-1.11],[.78,1.47,-1.31],[.87,1.86,-1.13]],.18,body,16);
    if (biped) {
      solid('token-raccoon-leaf-cloak', 'accent', [[-.56,.38],[.56,.38],[.88,-.56],[.4,-.8],[0,-.47],[-.4,-.8],[-.88,-.56]], .06, [0, 1.98, -.31], undefined, '#7d9465');
      sphere('token-raccoon-beige-belly','accent',[0,1.47,.328],[.38,.48,.058],2,'#e9d29d');
      for(const side of sides){
        solid(`token-raccoon-red-vest-${side}`,'accent',[[0,0],[side*.29,-.1],[side*.31,-.73],[0,-.64]],.04,[side*.13,2.09,.326],undefined,'#a4524a');
        box(`token-raccoon-green-trousers-${side}`,'accent',[side*.31,.67,.045],[.37,.49,.3],undefined,'#617c4a');
        curve(`token-raccoon-tool-rope-${side}`,'dark',[[side*.7,1.29,.26],[side*.86,.97,.32],[side*.78,.52,.36]],.021,'#685b52',12);
        rod(`token-raccoon-bamboo-staff-${side}`,'accent',[side*.76,.55,.35],[side*.73,1.86,.26],.036,.036,'#bdad63');
        if(side===-1){sphere('token-raccoon-white-tool-bottle','accent',[-.78,.37,.37],[.19,.25,.18],1,'#e7e3d3');ring('token-raccoon-white-tool-rim','dark',[-.78,.59,.37],.083,undefined,.019,'#746951');}
        else{sphere('token-raccoon-orange-gourd-lower','accent',[.78,.39,.37],[.2,.22,.18],1,'#ca6c43');sphere('token-raccoon-orange-gourd-upper','accent',[.78,.66,.37],[.12,.15,.12],1,'#d3834a');}
      }
      sphere('token-raccoon-straw-travel-hat','accent',[0,2.23,-.47],[.76,.79,.089],1,'#907455');
      ring('token-raccoon-hat-rim','dark',[0,2.23,-.36],.75,[0,0,0],.037,'#655445');
    }
    if (wolf) for (const side of sides) cone(`token-wolf-fang-${side}`, 'accent', [side * .11, 1.67, 1.23], [.043, .22, .045], [Math.PI, 0, 0], white);
    return true;
  }

  if(code==='65500516'||variant==='squid-ink'){
    sphere('token-squid-mantle','body',[0,2.2,0],[.54,.87,.48],2,body);
    eyes('token-squid',{y:1.96,z:.454,spread:.23,size:.13,white:true,tint:profile.eye});
    for(let arm=0;arm<8;arm++){
      const a=arm*Math.PI/4, points=[[Math.sin(a)*.33,1.53,Math.cos(a)*.31],[Math.sin(a)*.89,.86,Math.cos(a)*.71],[Math.sin(a)*.72,.25,Math.cos(a)*.59],[Math.sin(a)*1.01,.44,Math.cos(a)*.73]];
      taperedCurve(`token-squid-tentacle-${arm}`,'body',points,.1,.025,body,28,10);
      const path=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));
      for(let cup=0;cup<5;cup++){
        const center=path.getPoint(.16+cup*.13);
        sphere(`token-squid-suction-cup-${arm}-${cup}`,'accent',[center.x,center.y,center.z+.063],[.042,.03,.014],0,accent);
      }
    }
    return true;
  }
  if(['25415053','52900001'].includes(code)||variant==='shinobird'){
    // The printed illustration depicts a luminous seal with three plumes,
    // not an anatomical peacock with a beak, breast or walking legs.
    for(let feather=0;feather<3;feather++){
      const x=(feather-1)*.55, y=feather===1?1.37:1.05;
      curvedSheet(`token-shinobird-floating-plume-${feather}`,'body',[[-.14,0],[-.3,.54],[-.3,.89],[0,1.53],[.3,.89],[.3,.54],[.14,0]],.038,[x,y,0],undefined,body);
      ring(`token-shinobird-plume-eye-${feather}`,'accent',[x,y+.77,.039],.18,[0,0,0],.024,accent);
      curve(`token-shinobird-plume-inner-eye-${feather}`,'accent',[[x-.09,y+.78,.039],[x-.07,y+.87,.039],[x+.06,y+.87,.039],[x+.09,y+.77,.039],[x,y+.72,.039]],.013,accent,12);
      rod(`token-shinobird-plume-spine-${feather}`,'accent',[x,y-.25,.044],[x,y+.58,.044],.018,.014,accent);
      for(const side of sides)for(let vein=0;vein<5;vein++)rod(`token-shinobird-plume-vein-${feather}-${side}-${vein}`,'accent',[x,y+.25+vein*.15,.044],[x+side*(.13+Math.sin(vein/4*Math.PI)*.15),y+.35+vein*.16,.044],.014,.009,accent);
    }
    curve('token-shinobird-seal-base','accent',[[-.93,.7,.01],[-.63,.48,.01],[0,.4,.01],[.63,.48,.01],[.93,.7,.01]],.026,accent,18);
    ring('token-shinobird-central-seal','accent',[0,.58,.029],.12,[0,0,0],.022,accent);
    return true;
  }
  if(code==='54537490'||variant==='mini-mare-mare'){
    curve('token-seahorse-curled-tail','body',[[0,1.33,0],[.14,.72,.01],[.4,.41,.01],[.56,.54,.01],[.39,.7,.01],[.28,.57,.01]],.13,body,22);
    sphere('token-seahorse-upright-belly','body',[0,1.56,0],[.3,.64,.22],2,body);
    sphere('token-seahorse-head','body',[0,2.47,.08],[.32,.3,.26],2,body);
    curve('token-seahorse-curved-snout','body',[[0,2.35,.23],[0,2.33,.53],[0,2.43,.68]],.083,body,12);
    eyes('token-seahorse',{y:2.51,z:.276,spread:.19,size:.093,tint:'#ceca6c'});
    for(let plate=0;plate<6;plate++)box(`token-seahorse-green-belly-scale-${plate}`,'accent',[0,1.21+plate*.16,.221],[.3,.045,.03],undefined,'#65874d');
    for(let spike=0;spike<5;spike++)cone(`token-seahorse-crown-spike-${spike}`,'body',[(spike-2)*.12,2.74,-.08],[.074,.27+Math.sin(spike/4*Math.PI)*.18,.075],[0,0,(spike-2)*-.18],body);
    for(const side of sides)curvedSheet(`token-seahorse-side-fin-${side}`,'accent',[[0,0],[side*.36,.17],[side*.37,-.21],[side*.08,-.3]],.04,[side*.2,1.79,-.01],undefined,accent);
    return true;
  }
  if(anatomy==='fish'&&code!=='83239740'){
    sphere('token-fish-horizontal-body','body',[0,1.66,0],[.88,.45,.3],2,body);
    sphere('token-fish-rounded-head','body',[-.55,1.74,.04],[.38,.34,.28],1,body);
    sphere('token-fish-single-round-eye','eye',[-.67,1.86,.281],[.087,.087,.025],1,profile.eye);
    sphere('token-fish-eye-pupil','dark',[-.67,1.86,.304],[.039,.047,.01],0,black);
    curve('token-fish-gill-cover','accent',[[-.28,1.98,.276],[-.15,1.76,.306],[-.22,1.41,.276]],.016,accent,10);
    curvedSheet('token-fish-forked-tail','accent',[[0,0],[.53,.44],[.34,.03],[.54,-.42],[-.06,-.13]],.055,[.71,1.67,0],undefined,accent);
    curvedSheet('token-fish-dorsal-fin','accent',[[-.35,0],[.04,.5],[.43,0]],.055,[0,2.03,0],undefined,accent);
    for(const side of sides)curvedSheet(`token-fish-pectoral-fin-${side}`,'accent',[[0,0],[-.21,-.3],[.21,-.16]],.05,[-.07,1.6,side*.31],[side*.41,0,0],accent);
    for (let ray = 0; ray < 7; ray += 1) {
      const t = ray / 6, z = .078 + Math.sin(t * Math.PI) * .025;
      rod(`token-fish-tail-fin-ray-${ray}`, 'body', [.76, 1.65, z], [1.21, 1.3 + t * .74, z], .007, .004, body);
    }
    return true;
  }

  if (anatomy === 'cloud' || anatomy === 'slime') {
    const steam = code === '9047461';
    const ghostSlime = ['21770261','79387393'].includes(code);
    if (anatomy === 'cloud' || steam) {
      const bubbles = [[0,1.89,0,.65],[-.52,1.77,.06,.42],[.54,1.79,.02,.45],[-.29,2.23,-.1,.35],[.28,2.25,-.08,.38]];
      for (const [x,y,z,r] of bubbles) sphere(`token-cloud-lobe-${x}-${y}`, 'body', [x,y,z], [r,r*.75,r*.55], 2, body);
      if (steam) {
        eyes('token-steam', {y:1.86,z:.393,spread:.24,size:.16,pupil:false,tint:'#efae63'});
        taperedPath('token-steam-twisting-tail','body',[[0,1.7,0],[.07,1.18,0],[-.11,.85,0],[.09,.55,0],[0,.26,0]],.25,.065,body);
      } else for (const side of sides) curve(`token-cloud-closed-eye-${side}`,'dark',[[side*.41,1.94,.34],[side*.28,1.88,.39],[side*.13,1.94,.39]],.019,'#6a7480',8);
    } else {
      sphere('token-slime-floating-core','body',[0,1.59,0],[ghostSlime?.68:.9,ghostSlime?.81:.65,.46],2,body);
      taperedPath('token-slime-dripping-tail','body',[[0,1.03,0],[.21,.62,.03],[.08,.35,.14]],.29,.035,body);
      eyes('token-slime',{y:1.84,z:.424,spread:.23,size:.09,pupil:false,tint:ghostSlime?'#ba3e2e':profile.eye});
      if (ghostSlime) for (const side of sides) rod(`token-slime-fang-${side}`,'accent',[side*.1,1.51,.45],[side*.1,1.37,.48],.026,.009,'#ac4155');
      else for (let drop=0;drop<3;drop++) sphere(`token-slime-bubble-${drop}`,'body',[(drop-1)*.69,.66+drop*.12,.05],[.12,.19,.11],1,body);
    }
    return true;
  }

  if (anatomy === 'egg') {
    if(code==='17228909'){
      // SR04-ENTKN depicts six irregularly spotted eggs in a leafy nest.
      // Spots follow the shell surface instead of floating as large spheres.
      const shells=[[-.29,1.49,-.31,.32],[.31,1.5,-.28,.31],[-.5,1.19,.04,.34],[0,1.27,.105,.35],[.49,1.22,.026,.33],[0,.83,.442,.36]];
      for(let egg=0;egg<shells.length;egg++){
        const [x,y,z,r]=shells[egg],scale=[r*.92,r*1.08,r*.86];
        sphere(`token-jurraegg-nest-shell-${egg}`,'body',[x,y,z],scale,2,'#ead1a1');
        for(let spot=0;spot<12;spot++){
          const angle=spot*2.399963+egg*.61,sy=1-2*(spot+.5)/12,radial=Math.sqrt(1-sy*sy);
          const direction=new THREE.Vector3(Math.cos(angle)*radial,sy,Math.sin(angle)*radial);
          const tangent=new THREE.Vector3().crossVectors(direction,new THREE.Vector3(Math.abs(sy)>.9?1:0,Math.abs(sy)>.9?0:1,0)).normalize();
          const bitangent=new THREE.Vector3().crossVectors(direction,tangent).normalize(),positions=[],uv=[],indices=[];
          const points=[direction];
          for(let corner=0;corner<5;corner++){
            const a=corner*Math.PI*2/5,spread=.2+(corner+spot)%3*.038;
            points.push(direction.clone().addScaledVector(tangent,Math.cos(a)*spread).addScaledVector(bitangent,Math.sin(a)*spread).normalize());
          }
          for(const p of points){positions.push(x+p.x*scale[0]*1.008,y+p.y*scale[1]*1.008,z+p.z*scale[2]*1.008);uv.push(p.x*.5+.5,p.y*.5+.5);}
          for(let corner=0;corner<5;corner++)indices.push(0,corner+1,(corner+1)%5+1);
          const patch=new THREE.BufferGeometry();patch.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));patch.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));patch.setIndex(indices);patch.computeVertexNormals();
          part(`token-jurraegg-irregular-shell-mark-${egg}-${spot}`,patch,'accent',[0,0,0],undefined,undefined,spot%3?'#985836':'#804938');
        }
      }
      for(let leaf=0;leaf<18;leaf++){
        const a=leaf*Math.PI*2/18,x=Math.sin(a)*.55,z=Math.cos(a)*.42;
        curvedSheet(`token-jurraegg-leafy-nest-${leaf}`,'body',[[0,0],[-.17,.16],[-.18,.33],[0,.59],[.18,.33],[.17,.16]],.025,[x,.54,z],[-Math.PI/2,0,-a],'#6b9a42',{camber:.048,curl:-.063,subdivisions:1});
      }
      return true;
    }
    sphere('token-egg-speckled-shell','body',[0,1.15,0],[.67,.97,.62],2,body);
    for(let spot=0;spot<9;spot++) sphere(`token-egg-brown-spot-${spot}`,'accent',[(spot%3-1)*.32,.64+Math.floor(spot/3)*.43,.56- Math.abs(spot%3-1)*.09],[.1,.14,.024],1,accent);
    return true;
  }

  if (anatomy === 'avian') {
    if (variant === 'vague-shadow' || code === '9929399') {
      solid('token-vague-shadow-winged-heart', 'body', [[0,-.43],[-.94,.1],[-1.08,.44],[-.71,.65],[-.29,.52],[0,.27],[.29,.52],[.71,.65],[1.08,.44],[.94,.1]], .19, [0,1.69,0], undefined, body);
      curve('token-vague-shadow-aura','glow',[[-1.02,2.1,.08],[-.66,2.28,.08],[0,1.96,.08],[.66,2.28,.08],[1.02,2.1,.08]],.035,accent,16);
      return true;
    }
    const shinobird = ['25415053','52900001'].includes(code) || variant === 'shinobird';
    if(code==='9925983'){
      part('token-blackwing-broken-eggshell',new THREE.LatheGeometry([new THREE.Vector2(.01,.19),new THREE.Vector2(.43,.26),new THREE.Vector2(.59,.51),new THREE.Vector2(.6,.82),new THREE.Vector2(.58,.95)],16),'accent',[0,0,0],undefined,undefined,'#e5cc99');
      for(let shard=0;shard<8;shard++){const a=shard/8*Math.PI*2;solid(`token-blackwing-jagged-shell-rim-${shard}`,'accent',[[-.12,0],[0,.25+(shard%3)*.05],[.12,0]],.07,[Math.cos(a)*.58,.89,Math.sin(a)*.58],[0,-a,0],'#e5cc99');}
      for(let spot=0;spot<6;spot++){const a=spot/6*Math.PI*2;sphere(`token-blackwing-red-shell-mark-${spot}`,'accent',[Math.cos(a)*.579,.62,Math.sin(a)*.579],[.09,.12,.035],1,'#ad6074');}
    }
    sphere('token-bird-breast','body',[0,1.9,0],[.42,.64,.33],2,body);
    sphere('token-bird-head','body',[0,2.69,.12],[.29,.33,.3],1,body);
    cone('token-bird-beak','accent',[0,2.61,.46],[.12,.35,.12],[Math.PI/2,0,0],shinobird?'#c7d6c0':'#b8a074');
    eyes('token-bird',{y:2.79,z:.36,spread:.145,size:.055,tint:profile.eye});
    for(const side of sides){
      rod(`wing-${side}-token-bird-spar`,'body',[side*.28,2.25,-.2],[side*1.09,2.91,-.2],.08,.035,body);
      for(let feather=0;feather<6;feather++)curvedSheet(`wing-${side}-token-bird-feather-${feather}`,'accent',[[0,0],[side*.69,.47],[side*1.06,.25],[side*.28,-.12]],.045,[side*(.25+feather*.14),2.23-feather*.075,-.22],[0,0,side*feather*.075],feather%2?body:accent);
      rod(`token-bird-leg-${side}`,'dark',[side*.17,1.44,0],[side*.22,.74,.08],.055,.043,'#b5ae82');
      for(let toe=0;toe<3;toe++)rod(`token-bird-talon-${side}-${toe}`,'accent',[side*.22,.73,.08],[side*.22+(toe-1)*.09,.65,.31],.027,.009,'#b8a074');
    }
    if(shinobird)for(let feather=0;feather<3;feather++){
      const x=(feather-1)*.65;
      curvedSheet(`token-shinobird-peacock-tail-${feather}`,'body',[[-.22,0],[-.38,.86],[0,1.54],[.38,.86],[.22,0]],.045,[x,1.52,-.43],[0,0,-(feather-1)*.13],body);
      ring(`token-shinobird-tail-eye-${feather}`,'accent',[x,2.54,-.396],.145,[0,0,0],.022,accent);
      sphere(`token-shinobird-tail-eye-core-${feather}`,'eye',[x,2.54,-.38],[.059,.087,.02],1,accent);
    }else for(let tuft=0;tuft<4;tuft++)cone(`token-blackwing-crown-${tuft}`,'body',[(tuft-1.5)*.12,3.04+tuft%2*.06,.035],[.08,.47,.07],[0,0,-(tuft-1.5)*.4],body);
    return true;
  }

  if (variant === 'spinosaurus' || code === '44689689') {
    sphere('token-spinosaurus-upright-body','body',[0,1.52,0],[.55,.89,.48],2,body);
    sphere('token-spinosaurus-head','body',[0,2.81,.21],[.31,.38,.44],1,body);
    sphere('token-spinosaurus-long-jaw','accent',[0,2.65,.59],[.28,.18,.47],1,accent);
    eyes('token-spinosaurus',{y:2.95,z:.57,spread:.21,size:.053,tint:profile.eye});
    for(const side of sides){
      rod(`token-spinosaurus-small-arm-${side}`,'body',[side*.43,2.14,.1],[side*.64,1.74,.49],.09,.07,body);
      sphere(`token-spinosaurus-haunch-${side}`,'body',[side*.47,.86,0],[.32,.46,.35],1,body);
      rod(`token-spinosaurus-leg-${side}`,'body',[side*.47,.78,0],[side*.58,.3,.25],.2,.12,body);
      sphere(`token-spinosaurus-foot-${side}`,'body',[side*.58,.2,.43],[.24,.14,.4],1,body);
      for(let tooth=0;tooth<4;tooth++)cone(`token-spinosaurus-fang-${side}-${tooth}`,'accent',[side*.22,2.56,.35+tooth*.18],[.029,.14,.032],[Math.PI,0,0],white);
    }
    taperedPath('token-spinosaurus-tail','body',[[0,1.03,-.38],[.44,.84,-.89],[.95,.63,-1.27],[1.26,.68,-1.53]],.26,.04,body);
    for(let flame=0;flame<7;flame++)cone(`token-spinosaurus-fiery-sail-${flame}`,'accent',[0,2.49-flame*.15,-.39-flame*.08],[.12,.79-flame*.06,.11],[-.3,0,flame%2*.13],accent);
    return true;
  }

  if(code==='86801872'||variant==='snake-in-urn'){
    sphere('token-snake-decorated-blue-urn','accent',[0,.93,0],[.7,.91,.64],2,accent);
    ring('token-snake-urn-gold-rim','accent',[0,1.66,0],.5,undefined,.071,'#d9b465');
    sphere('token-snake-dark-urn-opening','dark',[0,1.63,0],[.46,.049,.46],1,'#263439');
    ring('token-snake-urn-gold-base','accent',[0,.28,0],.36,undefined,.041,'#d9b465');
    for(let stripe=0;stripe<11;stripe++){
      const angle=stripe/11*Math.PI*2;
      cone(`token-snake-urn-orange-mark-${stripe}`,'accent',[Math.cos(angle)*.69,.97+(stripe%2)*.21,Math.sin(angle)*.63],[.044,.15,.045],undefined,'#e3a44c');
    }
    curve('token-snake-arched-green-neck','body',[[0,1.64,0],[0,2.52,-.04],[-.44,2.91,.13],[-.82,2.72,.46],[-.84,2.27,.62]],.22,body,25);
    sphere('token-snake-downward-head','body',[-.83,2.12,.64],[.29,.35,.29],2,body);
    for(const side of sides)sphere(`token-snake-yellow-eye-${side}`,'eye',[-.83+side*.18,2.11,.85],[.071,.12,.024],1,'#d9d36d');
    for(let plate=0;plate<6;plate++)box(`token-snake-cream-neck-scale-${plate}`,'accent',[-.01,1.89+plate*.12,.22],[.31,.033,.04],undefined,'#dac998');
    rod('token-snake-forked-tongue-stem','accent',[-.83,1.91,.8],[-.83,1.65,.93],.015,.013,'#7683b6');
    for(const side of sides)rod(`token-snake-forked-tongue-${side}`,'accent',[-.83,1.65,.93],[-.83+side*.065,1.57,.97],.013,.008,'#7683b6');
    return true;
  }
  if(code==='21179144'||variant==='reptilianne'){
    curve('token-reptilianne-blue-serpent-tail','body',[[.7,.41,-.07],[1.03,.58,-.12],[.66,.83,.03],[-.33,.61,.08],[-.49,.99,0],[0,1.47,0]],.22,'#65738d',25);
    sphere('token-reptilianne-female-torso','body',[0,1.97,0],[.28,.44,.23],1,body);
    sphere('token-reptilianne-cobra-head','body',[0,2.66,.01],[.22,.31,.22],2,body);
    solid('token-reptilianne-spreading-cobra-hood','accent',[[-.23,.27],[-.7,.21],[-.63,-.22],[-.34,-.38],[-.13,-.04],[.13,-.04],[.34,-.38],[.63,-.22],[.7,.21],[.23,.27]],.08,[0,2.7,-.09],undefined,'#4b6780');
    eyes('token-reptilianne',{y:2.69,z:.217,spread:.096,size:.037,tint:profile.eye});
    for(let lock=0;lock<9;lock++){
      const angle=(lock-4)*.19;
      curve(`token-reptilianne-black-fan-hair-${lock}`,'dark',[[0,2.91,-.08],[Math.sin(angle)*.79,3.33,-.17],[Math.sin(angle)*1.13,3.61-Math.abs(lock-4)*.07,-.23]],.1,dark,12);
    }
    for(const side of sides){
      rod(`token-reptilianne-upper-arm-${side}`,'body',[side*.25,2.22,0],[side*.61,2.06,.03],.063,.045,body);
      rod(`token-reptilianne-white-forearm-${side}`,'accent',[side*.61,2.06,.03],[side*.98,2.27,.05],.073,.05,'#d9d4d7');
      for(let finger=0;finger<3;finger++)rod(`token-reptilianne-finger-${side}-${finger}`,'accent',[side*.96,2.27,.04],[side*(1.15+finger*.027),2.33+finger*.04,.06],.016,.01,'#d9d4d7');
      solid(`token-reptilianne-violet-collar-${side}`,'accent',[[0,0],[side*.65,.26],[side*.35,-.21],[0,-.29]],.04,[side*.03,2.3,-.13],undefined,'#553653');
      solid(`token-reptilianne-white-skirt-${side}`,'accent',[[0,0],[side*.25,-.23],[side*.58,-.52],[side*.25,-.59],[-side*.13,-.13]],.045,[side*.15,1.62,-.06],undefined,'#d8d6d1');
    }
    ring('token-reptilianne-gold-waist','accent',[0,1.62,0],.24,undefined,.045,'#c6b16e');
    return true;
  }
  if(code==='69868556'||variant==='dragon-lord'){
    const stone=body;
    for(let tier=0;tier<3;tier++)box(`token-dragon-lord-statue-pedestal-${tier}`,'accent',[0,.16+tier*.18,0],[1.35-tier*.16,.2,1.11-tier*.13],undefined,accent);
    sphere('token-dragon-lord-seated-stone-body','body',[0,1.39,-.04],[.48,.66,.39],1,stone);
    sphere('token-dragon-lord-stone-head','body',[0,2.3,.15],[.26,.35,.28],2,stone);
    sphere('token-dragon-lord-long-snout','body',[0,2.17,.37],[.2,.15,.32],1,stone);
    eyes('token-dragon-lord',{y:2.39,z:.359,spread:.14,size:.036,tint:profile.eye});
    for(const side of sides){
      curve(`token-dragon-lord-long-curved-horn-${side}`,'body',[[side*.2,2.5,.05],[side*.26,2.84,-.02],[side*.17,3.14,-.07]],.062,stone,12);
      sphere(`token-dragon-lord-seated-thigh-${side}`,'body',[side*.41,.99,.1],[.31,.44,.27],1,stone);
      sphere(`token-dragon-lord-foot-${side}`,'body',[side*.38,.64,.4],[.27,.12,.34],1,stone);
      rod(`token-dragon-lord-raised-arm-${side}`,'body',[side*.4,1.88,.03],[side*.5,2.11,.4],.11,.095,stone);
      sphere(`token-dragon-lord-raised-hand-${side}`,'body',[side*.5,2.17,.44],[.14,.13,.12],1,stone);
      for(let claw=0;claw<3;claw++)cone(`token-dragon-lord-hand-claw-${side}-${claw}`,'accent',[side*.5+(claw-1)*.077,2.28,.46],[.024,.14,.025],undefined,accent);
      curvedSheet(`wing-${side}-token-dragon-lord-stone-wing`,'body',[[0,0],[side*.27,.84],[side*1.42,.53],[side*1.53,-.25],[side*.93,.04],[side*.61,-.29],[side*.18,-.22]],.065,[side*.28,2.25,-.2],undefined,stone);
      for(let rib=0;rib<3;rib++)rod(`wing-${side}-token-dragon-lord-stone-rib-${rib}`,'accent',[side*.55,3.08,-.14],[side*(.6+rib*.43),2.02+rib*.075,-.14],.028,.018,accent);
    }
    return true;
  }
  if(code==='89907228'||variant==='divine-dragon'){
    sphere('token-divine-dragon-armored-body','body',[0,1.24,0],[.65,.57,.39],1,body);
    solid('token-divine-dragon-central-breastplate','accent',[[-.47,.29],[0,.53],[.47,.29],[.36,-.32],[0,-.54],[-.36,-.32]],.14,[0,1.24,.35],undefined,accent);
    for(const side of sides){
      const path=[[side*.35,1.57,-.03],[side*.61,1.91,0],[side*.84,2.43,.06],[side*.82,2.93,.19]];
      taperedPath(`token-divine-dragon-neck-${side}`,'body',path,.24,.19,body);
      for(let plate=0;plate<4;plate++)sphere(`token-divine-dragon-neck-armor-${side}-${plate}`,'accent',[side*(.51+plate*.095),1.79+plate*.26,.077],[.27,.16,.25],1,accent);
      sphere(`token-divine-dragon-head-${side}`,'body',[side*.82,3.02,.29],[.3,.31,.29],2,body);
      sphere(`jaw-token-divine-dragon-${side}`,'dark',[side*.82,2.85,.48],[.18,.15,.16],1,'#683556');
      for(let tooth=0;tooth<2;tooth++)cone(`token-divine-dragon-head-fang-${side}-${tooth}`,'accent',[side*.82+(tooth-.5)*.21,2.88,.56],[.045,.24,.038],[Math.PI,0,0],'#d8d0ae');
      sphere(`token-divine-dragon-eye-${side}`,'eye',[side*.82,3.07,.574],[.072,.04,.023],1,'#bd7994');
      solid(`token-divine-dragon-head-shield-${side}`,'accent',[[-.33,.31],[0,.61],[.33,.31],[.19,-.18],[0,-.23],[-.19,-.18]],.073,[side*.82,3.09,.19],undefined,body);
      curve(`token-divine-dragon-magenta-face-mark-${side}`,'accent',[[side*.82-.18,3.39,.249],[side*.82,3.24,.255],[side*.82+.18,3.4,.249]],.02,'#91456c',8);
      rod(`token-divine-dragon-arm-${side}`,'body',[side*.54,1.4,.1],[side*.99,.88,.3],.15,.12,body);
      for(let claw=0;claw<3;claw++)cone(`token-divine-dragon-large-claw-${side}-${claw}`,'accent',[side*.99+(claw-1)*.13,.69,.41],[.065,.35,.055],[Math.PI,0,-side*.17],'#d0c698');
    }
    return true;
  }

  if (code === '2819436') {
    // The exact artwork has a long serpentine trunk, a projecting open maw,
    // curled dark horns and webbed limbs, not a spherical cartoon dragon.
    taperedCurve('token-phantasm-spiral-coiled-trunk','body',[[-.88,.4,-.36],[-1.02,.9,-.48],[-.6,1.72,-.45],[.02,1.94,-.16],[.28,2.23,.1],[.06,2.64,.37]],.28,.19,body,40,10);
    taperedCurve('token-phantasm-spiral-long-tail','body',[[-.86,.48,-.37],[-.65,.29,-.97],[.09,.24,-1.21],[.82,.42,-1.01],[1.11,.66,-.65]],.24,.024,body,32,8);
    sphere('token-phantasm-spiral-brow-skull','body',[0,2.78,.52],[.31,.27,.49],2,body);
    sphere('token-phantasm-spiral-long-upper-muzzle','body',[0,2.74,.9],[.3,.12,.42],1,body);
    sphere('token-phantasm-spiral-open-purple-maw','dark',[0,2.54,.94],[.27,.2,.35],1,'#4e324d');
    sphere('jaw-token-phantasm-spiral-long-lower-muzzle','body',[0,2.36,.87],[.28,.09,.43],1,body);
    for(const side of sides){
      sphere(`token-phantasm-spiral-cyan-eye-${side}`,'eye',[side*.239,2.875,.815],[.055,.023,.019],0,'#7be2ec');
      taperedCurve(`token-phantasm-spiral-coiled-dark-horn-${side}`,'dark',[[side*.17,2.91,.24],[side*.39,3.23,.07],[side*.21,3.46,-.02],[side*.035,3.27,.015],[side*.21,3.13,.1]],.1,.032,'#28343d',24,8);
      curvedSheet(`token-phantasm-spiral-red-cheek-fin-${side}`,'accent',[[0,0],[side*.23,.09],[side*.7,.25],[side*.49,-.3],[side*.21,-.45]],.03,[side*.22,2.68,.42],undefined,accent,{camber:.075,curl:.05});
      for(let tooth=0;tooth<6;tooth++) for(const row of [-1,1]) cone(`token-phantasm-spiral-maw-fang-${side}-${row}-${tooth}`,'accent',[side*.23,2.53+row*.105,.58+tooth*.13],[.025,.17,.024],[row===1?Math.PI:0,0,0],white);
      const shoulder=[side*.27,2.18,-.15], elbow=[side*.79,2.65,-.23];
      rod(`wing-${side}-token-phantasm-spiral-spar`,'body',shoulder,elbow,.09,.055,body);
      curvedSheet(`wing-${side}-token-phantasm-spiral-ragged-membrane`,'accent',[[0,0],[side*.52,.6],[side*1.48,.57],[side*1.19,.05],[side*1.27,-.15],[side*.92,-.18],[side*.64,-.63],[side*.56,-.3],[side*.24,-.35]],.032,shoulder,undefined,accent,{camber:.16,curl:-.11});
      for(let rib=0;rib<3;rib++)taperedCurve(`wing-${side}-token-phantasm-spiral-membrane-rib-${rib}`,'body',[elbow,[side*(.93+rib*.19),2.33-rib*.24,-.14],[side*(1.39-rib*.25),1.85+rib*.11,-.16]],.021,.008,body,12,6);
      taperedCurve(`token-phantasm-spiral-foreleg-${side}`,'body',[[side*.29,1.98,.1],[side*.6,1.33,.35],[side*.57,.46,.68]],.13,.085,body,20,8);
      sphere(`token-phantasm-spiral-front-paw-${side}`,'body',[side*.59,.35,.76],[.18,.12,.2],1,body);
      for(let claw=0;claw<4;claw++)taperedCurve(`token-phantasm-spiral-front-claw-${side}-${claw}`,'accent',[[side*.58+(claw-1.5)*.084,.38,.85],[side*.58+(claw-1.5)*.086,.28,1.02],[side*.58+(claw-1.5)*.083,.18,1.08]],.025,.004,white,12,6);
    }
    for(let plate=0;plate<8;plate++){
      const y=.78+plate*.17;
      curvedSheet(`token-phantasm-spiral-overlapping-flank-scale-${plate}`,'accent',[[-.28,.12],[0,.18],[.25,.07],[.16,-.08],[-.2,-.09]],.035,[-.64+plate*.09,y,-.04],undefined,body,{camber:.07,curl:.024,subdivisions:1});
    }
    return true;
  }

  if (code === '23837055') {
    // OP18-EN026 is a hornless liquid serpent emerging from a dark vortex.
    // Its printed silhouette has no dragon muzzle, arms or dorsal spikes.
    const liquid='#202031', edge='#648399', highlight='#819cad';
    const neck=[[0,.57,0],[-.18,1.06,-.015],[-.45,1.51,-.04],[-.56,2.09,-.032],[-.31,2.6,.005],[.08,2.79,.031],[.43,2.76,.054],[.59,2.55,.071]];
    taperedCurve('token-ogdoadic-liquid-swan-neck','body',neck,.36,.055,liquid,48,12,.67);
    sphere('token-ogdoadic-hornless-serpent-head','body',[.485,2.685,.073],[.23,.15,.127],2,liquid);
    curvedSheet('token-ogdoadic-pointed-liquid-muzzle','body',[[0,.05],[.24,-.025],[.28,-.15],[.16,-.14],[-.04,-.04]],.08,[.525,2.672,.08],undefined,liquid,{camber:.017,curl:0,subdivisions:1});
    taperedCurve('token-ogdoadic-cool-neck-rim','accent',[[-.172,1.034,.171],[-.502,1.591,.168],[-.574,2.173,.143],[-.282,2.66,.152],[.085,2.825,.11],[.459,2.779,.12]],.016,.005,edge,32,6);
    taperedCurve('token-ogdoadic-inner-neck-reflection','accent',[[-.213,1.269,.203],[-.317,1.606,.197],[-.309,2.071,.14],[-.044,2.374,.105],[.232,2.387,.093]],.018,.004,'#3c425a',24,6);
    for(let flow=0;flow<5;flow++){
      const shift=(flow-2)*.075;
      taperedCurve(`token-ogdoadic-lower-liquid-flow-${flow}`,'body',[[shift,.54,.013],[.277+shift,.786,.08],[.456+shift,1.09,.057],[.27+shift,1.296,.046]],.045,.008,flow%2?liquid:'#2c2d43',18,8,.54);
    }
    for(let ripple=0;ripple<6;ripple++){
      const radius=.29+ripple*.133,points=[];
      for(let point=0;point<=20;point++){
        const a=point/20*Math.PI*2+ripple*.19;
        points.push([Math.cos(a)*radius,.34+Math.sin(a*3+ripple)*.021,Math.sin(a)*radius*.72]);
      }
      taperedCurve(`token-ogdoadic-dark-liquid-ripple-${ripple}`,'body',points,.016,.011,liquid,28,6,.57);
      const glint=[];
      for(let point=0;point<=8;point++){
        const a=point/8*Math.PI*.68+ripple*.37;
        glint.push([Math.cos(a)*radius,.354,Math.sin(a)*radius*.72]);
      }
      taperedCurve(`token-ogdoadic-vortex-ripple-reflection-${ripple}`,'accent',glint,.007,.001,ripple%2?edge:highlight,12,6,.67);
    }
    return true;
  }

  if (anatomy === 'serpent' || anatomy === 'dragon' || anatomy === 'fish') {
    const mini = code === '54537490';
    const oyster = code === '83239740';
    const squid = code === '65500516';
    const winged = anatomy === 'dragon' && !mini && !squid;
    if (oyster) {
      sphere('token-oyster-ridged-shell','body',[0,1.1,0],[.62,.87,.29],2,body);
      for(let ridge=0;ridge<8;ridge++) curve(`token-oyster-shell-ridge-${ridge}`,'accent',[[-.4+ridge*.09,.49,.21],[-.57+ridge*.15,1.13,.31],[-.31+ridge*.09,1.72,.19]],.024,accent,9);
      return true;
    }
    if (squid) {
      sphere('token-squid-mantle','body',[0,2.2,0],[.54,.87,.48],2,body);
      eyes('token-squid',{y:1.96,z:.454,spread:.23,size:.13,white:true,tint:profile.eye});
      for(let arm=0;arm<8;arm++) {const a=arm*Math.PI/4;curve(`token-squid-tentacle-${arm}`,'body',[[Math.sin(a)*.33,1.53,Math.cos(a)*.31],[Math.sin(a)*.89,.86,Math.cos(a)*.71],[Math.sin(a)*.72,.25,Math.cos(a)*.59],[Math.sin(a)*1.01,.44,Math.cos(a)*.73]],.075,body,14);}
      return true;
    }
    const path = [[-.72,.29,-.13],[-.41,.43,.05],[.16,.34,.21],[.62,.54,.04],[.39,.97,0],[0,1.21,.04],[-.31,1.59,.1],[-.13,1.98,.12],[0,2.46,.23]];
    taperedPath('token-serpent-coiled-body','body',path,mini?.12:.22,mini?.18:.27,body);
    sphere('token-serpent-head','body',[0,2.67,.34],[mini?.26:.35,.31,.42],2,body);
    sphere('token-serpent-muzzle','accent',[0,2.54,.63],[.28,.17,.29],1,accent);
    eyes('token-serpent',{y:2.8,z:.65,spread:.22,size:.055,tint:profile.eye});
    for(const side of sides){
      cone(`token-serpent-horn-${side}`,'accent',[side*.24,2.98,.16],[.085,mini?.4:.64,.085],[0,0,side*-.6],accent);
      if(anatomy==='dragon'){
        rod(`token-dragon-forearm-${side}`,'body',[side*.29,2.2,.08],[side*.68,1.7,.38],.12,.08,body);
        for(let claw=0;claw<3;claw++) cone(`token-dragon-claw-${side}-${claw}`,'accent',[side*.69+(claw-1)*.075,1.59,.4],[.04,.18,.04],[Math.PI,0,0],white);
      }
      if(winged){
        const shoulder=[side*.28,2.3,-.2],elbow=[side*1.03,3.22,-.2];rod(`wing-${side}-token-bone`,'body',shoulder,elbow,.11,.065,body);
        curvedSheet(`wing-${side}-token-membrane`,'accent',[[side*.27,2.26],[side*1.03,3.22],[side*1.83,2.7],[side*1.39,2.32],[side*1.08,1.86],[side*.52,1.79]],.034,[0,0,-.25],undefined,accent);
        for(let rib=0;rib<3;rib++)rod(`wing-${side}-token-rib-${rib}`,'body',elbow,[side*(.6+rib*.4),1.8+rib*.24,-.22],.025,.017,body);
      }
      if(anatomy==='fish')solid(`token-fish-fin-${side}`,'accent',[[0,0],[side*.88,.45],[side*.53,-.3]],.05,[side*.19,1.63,.03],undefined,accent);
    }
    for(let fin=0;fin<5;fin++)cone(`token-serpent-dorsal-fin-${fin}`,'accent',[-.13,1.69+fin*.15,-.18],[.07,.32,.08],[-.5,0,-.23],accent);
    return true;
  }
  return false;
}
