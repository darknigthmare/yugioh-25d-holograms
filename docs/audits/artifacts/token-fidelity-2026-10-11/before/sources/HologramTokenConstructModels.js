import * as THREE from 'three';
import { createTokenGeometryTools } from './HologramTokenGeometry.js';

/** Machine, digital and elemental silhouettes. Geometry is registered once, at construction. */
export function buildTokenConstructAnatomy(profile, helpers) {
  const { part, sphere, box, cone, ring, rod } = helpers;
  const { solid, curve, eyes, spokes } = createTokenGeometryTools(helpers);
  const anatomy = profile.tokenAnatomy, code = String(profile.tokenCode || '');
  const variant = profile.tokenVisual?.variant || '';
  const body = profile.body, accent = profile.accent, eye = profile.eye, dark = profile.hair || '#28313c';
  const sides = [-1, 1];

  if (anatomy === 'aircraft') {
    const stealth = code === '10389143';
    const fighter = code === '29491335';
    const option = code === '14089429' || variant === 'option-beam';
    sphere('token-aircraft-streamlined-fuselage', 'body', [0, 2.25, 0], [.31, .19, 1.04], 2, body);
    cone('token-aircraft-pointed-nose', 'body', [0, 2.25, 1.14], [.27, .7, .18], [Math.PI / 2, 0, 0], body);
    solid('token-aircraft-cockpit', 'dark', [[-.18,0],[.18,0],[.12,.18],[0,.28],[-.12,.18]], .49, [0,2.36,.38], [-.15,0,0], '#647890');
    for (const side of sides) {
      const outline = stealth ? [[side*.23,0],[side*1.69,-.25],[side*1.58,-.69],[side*.3,-.62]] : [[side*.2,0],[side*1.51,-.25],[side*1.68,-.49],[side*.32,-.61]];
      // The standard wing pivot is retained at y2.25/z-.2; these are aircraft
      // wings, with closed solid panels rather than dragon membranes.
      solid(`wing-${side}-token-aircraft-swept-panel`, 'body', outline, .085, [0,2.25,-.2], [-Math.PI/2,0,0], body);
      box(`wing-${side}-token-aircraft-tip-stripe`,'accent',[side*1.3,2.26,-.53],[.35,.038,.13],[0,side*.2,0],accent);
      const podX=side*(fighter?.88:.61);
      rod(`wing-${side}-token-aircraft-engine`,'body',[podX,2.18,-.82],[podX,2.18,.45],fighter?.22:.13,fighter?.17:.12,body);
      sphere(`wing-${side}-token-aircraft-thruster`,'eye',[podX,2.18,-.85],[fighter?.14:.09,.09,.035],1,eye);
      solid(`token-aircraft-tail-fin-${side}`,'accent',[[0,0],[side*.26,.47],[side*.45,.1]],.055,[side*.08,2.29,-.85],undefined,accent);
    }
    if (option) {
      sphere('token-option-luminous-core','eye',[0,2.27,.52],[.22,.17,.29],2,'#f5d66a');
      for(const side of sides)solid(`token-option-forward-rail-${side}`,'body',[[0,0],[side*.1,.21],[side*.24,.13],[side*.14,-.1]],.93,[side*.19,2.24,.21],[0,0,0],body);
    }
    return true;
  }

  if (anatomy === 'gadget') {
    const acorn=code==='84816245'||variant==='usb-acorn';
    const compass=code==='27450401'||variant==='compass';
    const solar=code==='23331401'||variant==='solar-drone';
    const battery=code==='44586427'||variant==='solar-battery';
    const security=code==='93104633'||variant==='security-drone';
    const dragonoid=code==='28053764'||variant==='dragonoid';
    const multi=code==='35514097'||variant==='multi';
    if(multi){
      // The reference depicts a floating laser module, with a violet aperture
      // and a green rear nozzle, rather than a humanoid machine.
      solid('token-multi-laser-casing','body',[[-.48,-.35],[.44,-.35],[.39,.38],[-.36,.46]],.75,[0,1.94,0],[.12,-.12,.12],'#a96953');
      for(const side of sides)solid(`token-multi-casing-fin-${side}`,'accent',[[0,0],[side*.23,-.19],[side*.23,.29]],.68,[side*.4,1.96,-.02],[.12,-.12,.12],'#bd8266');
      ring('token-multi-violet-lens-rim','accent',[0,2.03,.427],.26,[0,0,0],.057,'#5d334c');
      sphere('token-multi-violet-laser-lens','eye',[0,2.03,.448],[.22,.22,.079],2,'#bb72bb');
      rod('token-multi-green-rear-nozzle','accent',[0,1.91,-.34],[0,1.91,-.93],.2,.1,'#9bbc6c');
      for(let slot=0;slot<3;slot++)box(`token-multi-casing-vent-${slot}`,'dark',[.48,1.88+slot*.1,.035],[.018,.045,.26],[.12,-.12,.12],dark);
      cone('token-multi-rear-nozzle-tip','accent',[0,1.91,-1.07],[.105,.36,.105],[-Math.PI/2,0,0],'#b7cf74');
      return true;
    }
    if(dragonoid){
      // This small winged dragon grips a dark chalice. It has a single visible
      // red eye and a green forehead plate, not a two-eye robot display.
      cone('token-dragonoid-dark-chalice','dark',[0,1.13,0],[.53,1.04,.42],[0,0,Math.PI],'#32323f');
      rod('token-dragonoid-chalice-stem','dark',[0,.4,0],[0,.73,0],.105,.16,'#353342');
      ring('token-dragonoid-chalice-lower-rim','dark',[0,.47,0],.24,undefined,.059,'#484450');
      cone('token-dragonoid-chalice-point','dark',[0,.23,0],[.17,.42,.14],[0,0,Math.PI],'#353342');
      ring('token-dragonoid-chalice-upper-rim','dark',[0,1.68,0],.53,undefined,.09,'#454453');
      const dragonBlue='#294268';
      sphere('token-dragonoid-armored-body','body',[0,2.02,-.04],[.35,.47,.27],1,dragonBlue);
      sphere('token-dragonoid-armored-head','body',[0,2.64,.015],[.44,.38,.29],1,dragonBlue);
      sphere('token-dragonoid-rounded-muzzle','body',[0,2.42,.23],[.27,.19,.19],1,dragonBlue);
      sphere('token-dragonoid-single-red-eye','eye',[0,2.68,.299],[.12,.072,.029],2,'#ec4e3a');
      sphere('token-dragonoid-eye-slit','dark',[.025,2.68,.324],[.027,.06,.011],1,'#302331');
      solid('token-dragonoid-green-forehead-plate','accent',[[-.21,0],[.19,0],[.22,.25],[.04,.42],[-.17,.3]],.045,[0,2.85,.15],[.17,0,0],'#9ac878');
      for(const side of sides){
        curve(`token-dragonoid-curled-black-horn-${side}`,'dark',[[side*.3,2.94,-.04],[side*.52,3.23,-.05],[side*.37,3.33,0],[side*.29,3.08,.06]],.115,'#293038',12);
        solid(`wing-${side}-token-dragonoid-bat-membrane`,'accent',[[0,0],[side*.58,.76],[side*.91,-.44],[side*.7,-1.22],[side*.45,-.55],[side*.2,-.37]],.032,[side*.28,2.25,-.2],undefined,'#87b96c');
        curve(`wing-${side}-token-dragonoid-wing-frame`,'body',[[side*.28,2.25,-.2],[side*.86,3.01,-.2],[side*1.19,1.81,-.2],[side*.98,1.03,-.2]],.045,dragonBlue,14);
        rod(`token-dragonoid-gripping-arm-${side}`,'body',[side*.27,2.16,.14],[side*.28,1.87,.35],.085,.085,dragonBlue);
        sphere(`token-dragonoid-rim-hand-${side}`,'body',[side*.28,1.79,.36],[.13,.11,.12],1,dragonBlue);
        for(let claw=0;claw<3;claw++)cone(`token-dragonoid-rim-claw-${side}-${claw}`,'accent',[side*.28+(claw-1)*.075,1.68,.45],[.026,.16,.027],[0,0,Math.PI],'#b9c9bd');
        cone(`token-dragonoid-mouth-fang-${side}`,'accent',[side*.17,2.46,.364],[.037,.14,.037],[0,0,Math.PI],'#bacdb9');
      }
      return true;
    }
    if(acorn){
      sphere('token-acorn-brown-dome','body',[0,1.96,0],[.65,.65,.58],2,body);
      sphere('token-acorn-cup','accent',[0,1.53,.015],[.67,.35,.58],2,accent);
      ring('token-acorn-cap-rim','accent',[0,1.73,0],.61,undefined,.056,accent);
      eyes('token-acorn',{y:2.07,z:.532,spread:.28,size:.14,white:true,tint:eye});
      for(const side of sides){sphere(`token-acorn-round-hand-${side}`,'body',[side*.66,1.6,.015],[.15,.16,.16],1,body);sphere(`token-acorn-ear-${side}`,'body',[side*.63,2.14,0],[.15,.13,.13],1,body);}
      box('token-acorn-usb-metal-plug','body',[0,1.05,0],[.45,.47,.24],undefined,'#d9dbe1');
      for(const side of sides)box(`token-acorn-usb-contact-${side}`,'dark',[side*.11,1.08,.13],[.1,.13,.025],undefined,'#363945');
      return true;
    }
    if(compass){
      sphere('token-compass-dark-orb','dark',[0,2.8,0],[.3,.3,.28],2,'#4a4d59');
      eyes('token-compass',{y:2.86,z:.263,spread:.125,size:.045,tint:'#c0c1cf'});
      rod('token-compass-long-gold-pendulum','accent',[0,.59,0],[0,2.53,0],.03,.03,accent);
      part('token-compass-diamond-weight',new THREE.OctahedronGeometry(.43), 'accent',[0,.71,0],[.52,1.31,.5],undefined,body);
      return true;
    }
    if(solar||battery){
      if(solar)sphere('token-data-solar-drone-core','body',[0,2.16,0],[.27,.31,.3],1,body);
      else {
        box('token-solar-battery-rectangular-body','body',[0,1.67,0],[.92,1.06,.34],undefined,body);
        for(const side of sides){rod(`token-battery-arm-${side}`,'body',[side*.49,1.92,0],[side*.79,1.58,.1],.1,.075,body);sphere(`token-battery-hand-${side}`,'accent',[side*.8,1.53,.14],[.16,.13,.13],1,accent);rod(`token-battery-leg-${side}`,'body',[side*.25,1.13,0],[side*.3,.31,.1],.12,.1,body);sphere(`token-battery-foot-${side}`,'body',[side*.3,.22,.2],[.23,.14,.31],1,body);}
        rod('token-battery-horizontal-head','body',[-.36,2.5,0],[.36,2.5,0],.14,.14,body);
        eyes('token-battery',{y:2.52,z:.13,spread:.14,size:.042,tint:eye});
      }
      for(const side of sides){
        const x=solar?side*.58:0,y=solar?2.36:1.78;
        if(!solar&&side===1)continue;
        const rotation=[0,solar?side*.22:0,solar?side*.22:0];
        const panelEuler=new THREE.Euler(...rotation);
        const panelPosition=(offset)=>new THREE.Vector3(...offset).applyEuler(panelEuler).add(new THREE.Vector3(x,y,.24)).toArray();
        box(`token-solar-panel-frame-${side}`,'accent',[x,y,.24],[solar?.64:.75,.88,.055],rotation,body);
        box(`token-solar-panel-cell-${side}`,'dark',panelPosition([0,0,.038]),[solar?.57:.68,.8,.025],rotation,accent);
        for(let row=0;row<5;row++)box(`token-solar-cell-grid-${side}-${row}`,'body',panelPosition([0,-.32+row*.16,.057]),[solar?.59:.7,.012,.012],rotation,'#bfd5e7');
        for(let column=0;column<3;column++)box(`token-solar-cell-grid-column-${side}-${column}`,'body',panelPosition([(column-1)*(solar?.18:.21),0,.057]),[.012,.8,.012],rotation,'#a2a9cd');
        if(solar)rod(`token-data-solar-panel-link-${side}`,'body',[0,2.2,.02],[side*.36,2.22,.02],.06,.06,body);
      }
      return true;
    }
    if(security){
      solid('token-security-triangular-drone','body',[[-.62,.49],[.62,.49],[.35,-.54],[0,-.84],[-.35,-.54]],.2,[0,1.96,0],undefined,body);
      sphere('token-security-lens-rim','accent',[0,2.24,.135],[.28,.29,.095],2,accent);
      sphere('token-security-blue-lens','eye',[0,2.24,.227],[.2,.2,.047],2,eye);
      for(const side of sides)solid(`token-security-side-fin-${side}`,'body',[[0,0],[side*.65,-.19],[side*.34,-.55]],.12,[side*.45,2.1,-.09],undefined,body);
      box('token-security-red-keyslot','accent',[0,1.56,.135],[.11,.45,.045],undefined,accent);
      return true;
    }
    sphere('token-gadget-metal-core','body',[0,1.89,0],[.5,.58,.33],1,body);
    sphere('token-gadget-head','body',[0,2.69,.015],[.32,.35,.28],1,body);
    eyes('token-gadget',{y:2.74,z:.283,spread:.15,size:.065,tint:eye});
    box('token-gadget-chest-panel','accent',[0,1.97,.31],[.55,.49,.075],undefined,accent);
    for(const side of sides){
      sphere(`token-gadget-shoulder-${side}`,'body',[side*.58,2.17,0],[.21,.24,.23],1,body);
      rod(`upper-arm-${side}-token-gadget`,'body',[side*.58,2.17,0],[side*.73,1.56,.08],.1,.085,body);
      sphere(`hand-${side}-token-gadget`,'accent',[side*.75,1.44,.12],[.2,.21,.14],1,accent);
      rod(`token-gadget-piston-leg-${side}`,'body',[side*.25,1.34,0],[side*.34,.29,.13],.14,.11,body);
      box(`token-gadget-foot-${side}`,'accent',[side*.34,.2,.21],[.36,.23,.51],undefined,accent);
    }
    box('token-gadget-head-antenna','accent',[0,3.14,0],[.06,.46,.06],undefined,accent);sphere('token-gadget-antenna-tip','eye',[0,3.39,0],[.09,.09,.09],1,eye);
    return true;
  }

  if(anatomy==='gear'||anatomy==='tank'){
    const compactEngine=code==='82556059'||variant==='engine';
    const synchronEngine=code==='62125439'||variant==='synchron-engine';
    if(compactEngine){
      // Engine Token's exact art has a compact crankcase, two dark cylinder
      // heads and looping red/blue wires. It does not have Synchron's V fins.
      box('token-engine-compact-crankcase','body',[0,1.81,0],[1.18,.63,.62],undefined,'#aab3b7');
      solid('token-engine-front-flange','accent',[[-.62,-.22],[-.39,-.37],[.46,-.37],[.64,-.18],[.54,.29],[-.48,.29]],.12,[0,1.82,.34],undefined,'#a9afb1');
      solid('token-engine-recessed-front-panel','dark',[[-.35,-.11],[.32,-.11],[.44,.1],[-.44,.1]],.019,[0,1.75,.413],undefined,'#576571');
      for(let bolt=0;bolt<8;bolt++){const a=bolt*Math.PI/4;sphere(`token-engine-front-bolt-${bolt}`,'body',[Math.sin(a)*.48,1.82+Math.cos(a)*.25,.435],[.048,.048,.018],0,'#626e77');}
      for(const side of sides){
        box(`token-engine-dark-cylinder-head-${side}`,'dark',[side*.28,2.28,-.06],[.44,.37,.46],[0,side*.12,side*-.12],'#425462');
        rod(`token-engine-cylinder-port-${side}`,'body',[side*.28,2.16,.16],[side*.28,2.16,.4],.098,.098,'#8598a5');
        curve(`token-engine-metal-intake-hose-${side}`,'body',[[side*.28,2.16,.43],[side*.61,2.21,.48],[side*.76,1.92,.42],[side*.65,1.57,.44]],.085,'#8598a5',14);
      }
      curve('token-engine-front-metal-outlet','body',[[.08,1.89,.45],[.12,1.58,.52],[.37,1.38,.5],[.62,1.43,.35]],.094,'#9baeb7',14);
      curve('token-engine-looping-red-wire','accent',[[-.43,1.81,-.22],[-.77,1.24,.07],[-.51,1.02,.32],[.43,1.03,.35],[.87,1.34,.17],[.54,1.78,-.04]],.033,'#bd5264',22);
      curve('token-engine-looping-blue-wire','accent',[[-.4,1.9,-.23],[-.7,1.28,.11],[-.41,1.1,.32],[.46,1.12,.31],[.81,1.42,.12],[.53,1.84,-.05]],.032,'#439abd',22);
      box('token-engine-top-black-vent','dark',[0,2.145,.045],[.64,.026,.19],undefined,'#26313b');
    }else if(synchronEngine){
      // Synchron's source instead shows a tall, twin-cylinder V engine with
      // green cooling fins. These fixed angles follow its visible anatomy.
      sphere('token-synchron-rounded-crankcase','body',[0,1.39,0],[.57,.44,.37],1,'#89959d');
      ring('token-synchron-front-crankcase-rim','accent',[0,1.47,.349],.3,[0,0,0],.047,'#bac0bf');
      sphere('token-synchron-front-crankcase-disc','body',[0,1.47,.361],[.28,.28,.026],1,'#5b6c77');
      for(const side of sides){
        const angle=side*-.34;
        const finRotation=[0,0,angle];
        const finEuler=new THREE.Euler(...finRotation);
        const cylinderPosition=(height)=>new THREE.Vector3(0,height,0).applyEuler(finEuler).add(new THREE.Vector3(side*.23,1.65,-.08)).toArray();
        for(let fin=0;fin<7;fin++)box(`token-synchron-green-cooling-fin-${side}-${fin}`,'accent',cylinderPosition(.16+fin*.11),[.54,.044,.58],finRotation,'#307d69');
        box(`token-synchron-silver-cylinder-cap-${side}`,'body',cylinderPosition(.93),[.65,.23,.61],finRotation,'#b1b9b9');
        rod(`token-synchron-exposed-cylinder-rod-${side}`,'body',[side*.13,1.66,.265],cylinderPosition(.83).map((value,index)=>index===2?.265:value),.035,.035,'#b3beba');
        curve(`token-synchron-lower-exhaust-pipe-${side}`,'body',[[side*.15,1.13,.01],[side*.25,.91,.11],[side*.58,.99,.23]],.078,'#89999f',12);
      }
      curve('token-synchron-green-front-hose','accent',[[-.26,1.49,.43],[0,1.3,.49],[.25,1.48,.41]],.064,'#32866e',10);
    }else{
      ring('token-gear-main-wheel','body',[0,1.65,0],.62,[0,0,0],.16,body);
      rod('token-gear-axle','dark',[0,1.65,-.45],[0,1.65,.58],.22,.22,dark);
      for(let tooth=0;tooth<14;tooth++){const a=tooth*Math.PI/7;box(`token-gear-square-tooth-${tooth}`,'body',[Math.sin(a)*.75,1.65+Math.cos(a)*.75,0],[.24,.24,.31],[0,0,-a],body);}
      spokes('token-gear-wheel-spoke','accent',[0,1.65,.21],.6,6,.051,accent);
    }
    if(anatomy==='tank'){
      box('token-tank-lower-hull','body',[0,.79,0],[1.32,.6,1.3],undefined,body);
      for(const side of sides){box(`token-tank-track-${side}`,'dark',[side*.7,.43,0],[.38,.34,1.51],undefined,dark);for(let wheel=0;wheel<4;wheel++)sphere(`token-tank-wheel-${side}-${wheel}`,'accent',[side*.9,.44,-.51+wheel*.34],[.05,.17,.17],1,accent);}
      rod('token-tank-cannon','body',[0,1.72,.2],[0,1.72,1.2],.12,.085,body);
    }
    return true;
  }

  if(anatomy==='block'){
    const yellow='#d8b741',red='#b94744',blue='#386b9d',green='#429765';
    box('token-block-yellow-head','body',[0,2.84,0],[.52,.46,.45],undefined,yellow);
    eyes('token-block',{y:2.86,z:.238,spread:.14,size:.036,pupil:false,tint:'#25282f'});
    box('token-block-brick-torso','body',[0,2.11,0],[.57,.84,.47],undefined,yellow);
    for(const side of sides){
      box(`token-block-red-shoulder-${side}`,'accent',[side*.59,2.42,0],[.61,.49,.55],undefined,red);
      box(`upper-arm-${side}-token-block-blue`,'body',[side*.7,1.95,0],[.29,.58,.34],[0,0,side*.35],blue);
      box(`hand-${side}-token-block-yellow`,'body',[side*.85,1.54,.08],[.29,.24,.26],undefined,yellow);
      box(`token-block-green-thigh-${side}`,'body',[side*.26,1.23,0],[.33,.69,.34],[0,0,side*-.1],green);
      box(`token-block-red-boot-${side}`,'accent',[side*.32,.44,.09],[.38,.65,.45],undefined,red);
      for(let stud=0;stud<4;stud++)sphere(`token-block-round-stud-${side}-${stud}`,'body',[side*.58+(stud%2-.5)*.24,2.74,Math.floor(stud/2)*.21-.1],[.088,.049,.088],1,red);
    }
    for(const side of sides)rod(`token-block-head-stud-${side}`,'body',[side*.13,3.06,0],[side*.13,3.17,0],.075,.075,yellow);
    return true;
  }

  if(anatomy==='cyber-orb'||anatomy==='cyber-polyhedron'||anatomy==='network'||anatomy==='clock'){
    if(code==='93130022'||variant==='option-orb'){
      // Open gold shell arcs retain the source's luminous sphere while leaving
      // its small dark spacecraft visible through the existing material bins.
      for(let meridian=0;meridian<3;meridian++)ring(`token-option-golden-shell-${meridian}`,'glow',[0,1.97,0],.86,[Math.PI/2,meridian*Math.PI/3,.16],.043,'#e5d56a');
      ring('token-option-golden-equator','accent',[0,1.97,0],.86,[0,0,0],.052,'#d8c75e');
      solid('token-option-inner-dark-craft','dark',[[-.55,0],[-.17,.26],[.43,.19],[.59,0],[.4,-.25],[-.17,-.27]],.4,[0,1.97,0],undefined,'#474b53');
      solid('token-option-inner-craft-metal-ridge','body',[[-.5,0],[-.04,.09],[.4,.055],[.57,0],[.38,-.035],[-.04,-.035]],.034,[0,1.98,.219],undefined,'#abb0ad');
      solid('token-option-orange-core','accent',[[-.26,.04],[.11,.15],[.12,-.1]],.03,[0,2.01,.252],undefined,'#c67849');
      sphere('token-option-forward-cyan-aperture','eye',[-.56,1.98,.05],[.1,.12,.14],2,'#91e3e1');
      for(let node=0;node<7;node++){const a=node*Math.PI*2/7;sphere(`token-option-orbiting-light-${node}`,'eye',[Math.sin(a)*.8,1.97+Math.cos(a)*.8,.24],[.045,.045,.045],1,'#acf0e3');}
      return true;
    }
    if(code==='67949764'||variant==='umbral-crystal'){
      solid('token-umbral-elongated-blue-crystal','body',[[-.32,.48],[.31,.48],[.37,.16],[.2,-1.06],[0,-1.35],[-.22,-.92]],.36,[0,1.6,0],[0,0,.08],'#264eb4');
      solid('token-umbral-crystal-front-facet','accent',[[-.29,.44],[.29,.44],[.02,.02],[-.19,-.92]],.013,[0,1.6,.191],[0,0,.08],'#437be0');
      rod('token-umbral-green-crest-neck','accent',[0,2.05,0],[0,2.51,0],.075,.15,'#63b784');
      solid('token-umbral-gold-crest-helmet','accent',[[-.34,-.07],[-.38,.18],[-.26,.46],[0,.58],[.26,.46],[.38,.18],[.34,-.07],[.13,.07],[-.13,.07]],.22,[0,2.58,0],undefined,'#cfb559');
      solid('token-umbral-green-crest-inlay','body',[[-.1,.03],[.1,.03],[.14,.35],[0,.46],[-.14,.35]],.025,[0,2.68,.124],undefined,'#77c193');
      for(const side of sides){
        solid(`token-umbral-gold-crest-prong-${side}`,'accent',[[0,0],[side*.22,-.39],[side*.28,.13]],.12,[side*.19,2.7,.03],undefined,'#d0b862');
        curve(`token-umbral-crest-engraving-${side}`,'dark',[[side*.15,3.05,.124],[side*.27,2.9,.124],[side*.29,2.71,.124]],.019,'#68594d',8);
      }
      return true;
    }
    if(code==='16946850'||variant==='synthetic-seraph'){
      sphere('token-seraphim-white-tadpole','body',[0,1.89,0],[.57,.41,.35],2,body);
      curve('token-seraphim-white-tail','body',[[.38,1.95,-.08],[.7,2.17,-.17],[1.04,2.31,-.2],[1.35,2.5,-.21]],.075,body,14);
      for(const side of sides)solid(`token-seraphim-fin-${side}`,'accent',[[0,0],[side*.67,.28],[side*.32,-.12]],.03,[side*.18,2.02,0],undefined,accent);
      return true;
    }
    if(anatomy==='clock'){
      rod('token-clock-face','body',[0,1.64,-.04],[0,1.64,.1],.68,.68,body);
      ring('token-clock-rim','accent',[0,1.64,.105],.64,[0,0,0],.052,accent);
      for(let tick=0;tick<12;tick++){const a=tick*Math.PI/6;box(`token-clock-hour-marker-${tick}`,'dark',[Math.sin(a)*.52,1.64+Math.cos(a)*.52,.16],[.028,.1,.018],[0,0,-a],dark);}
      rod('token-clock-long-hand','accent',[0,1.64,.17],[-.13,2.05,.17],.027,.018,accent);rod('token-clock-short-hand','dark',[0,1.64,.18],[.3,1.47,.18],.035,.022,dark);
      cone('token-clock-digital-base','body',[0,.65,0],[.39,.45,.25],undefined,body);
    }else if(anatomy==='cyber-orb'){
      sphere('token-digital-orb','body',[0,1.73,0],[.7,.7,.7],2,body);
      ring('token-digital-equator','accent',[0,1.73,0],.71,[Math.PI/2,0,.25],.032,accent);
      if(code==='17418745'||variant==='photon-orb')for(let ray=0;ray<7;ray++){const a=ray*Math.PI/3.5;solid(`token-photon-light-fin-${ray}`,'glow',[[-.1,0],[0,.45],[.13,.11]],.028,[Math.sin(a)*.72,1.73+Math.cos(a)*.72,0],[0,0,-a],accent);}
      else {box('token-digital-orb-front-display','dark',[0,1.8,.68],[.33,.21,.025],undefined,dark);eyes('token-digital-orb',{y:1.82,z:.71,spread:.09,size:.037,pupil:false,tint:eye});}
    }else{
      part('token-digital-polyhedral-core',new THREE.OctahedronGeometry(.72),'body',[0,1.78,0],[1,1.25,.78],undefined,body);
      if(code==='13536607'||variant==='v-lan'){
        for(let branch=0;branch<3;branch++){const x=(branch-1)*.84;curve(`token-vlan-network-cable-${branch}`,'accent',[[0,2.04,0],[x,2.59,-.08],[x,2.89,0]],.062,accent,10);solid(`token-vlan-snake-head-${branch}`,'body',[[-.2,-.13],[.22,-.13],[.31,.03],[.04,.2],[-.25,.11]],.21,[x,2.98,0],undefined,body);eyes(`token-vlan-snake-${branch}`,{x,y:3.02,z:.12,spread:.1,size:.028,pupil:false,tint:eye});}
      }else if(anatomy==='network'){
        for(let node=0;node<6;node++){const a=node*Math.PI/3,x=Math.sin(a)*.97,y=1.78+Math.cos(a)*.97;rod(`token-network-link-${node}`,'accent',[0,1.78,0],[x,y,0],.026,.026,accent);part(`token-network-node-${node}`,new THREE.OctahedronGeometry(.15),'eye',[x,y,0],[1,1,1],undefined,eye);}
      }else{
        for(const side of sides)solid(`token-digital-angular-wing-${side}`,'accent',[[0,0],[side*.78,.24],[side*.41,-.33]],.07,[side*.19,1.77,0],undefined,accent);
        ring('token-polyhedron-floating-frame','glow',[0,1.78,0],1.05,[0,0,.25],.026,accent);
      }
    }
    return true;
  }

  if(anatomy==='ice'){
    const coffin=code==='66661679'||variant==='gold-ice-coffin';
    part('token-ice-central-crystal',new THREE.OctahedronGeometry(1),'body',[0,1.72,0],[coffin?.39:.61,1.18,.36],undefined,body);
    for(const side of sides){
      if(coffin){
        rod(`token-ice-coffin-gold-frame-${side}`,'accent',[side*.46,.62,.04],[side*.46,2.73,.04],.053,.053,accent);
        rod(`token-ice-coffin-gold-diagonal-${side}`,'accent',[side*.46,2.73,.04],[side*.13,2.26,.07],.037,.037,accent);
        rod(`token-ice-coffin-crossbar-${side}`,'accent',[-.52,1.18+side*.27,.09],[.52,1.18+side*.27,.09],.05,.05,accent);
      }else for(let shard=0;shard<3;shard++)part(`token-ice-side-shard-${side}-${shard}`,new THREE.OctahedronGeometry(.38),'accent',[side*(.44+shard*.17),.69+shard*.33,-.02],[.58,1.35,.55],[0,0,side*-.4],accent);
    }
    if(code==='55326323'){curve('token-crystron-red-wire','accent',[[-.22,.91,0],[-.58,.65,.11],[-.4,.47,.19]],.026,'#a15469',8);curve('token-crystron-blue-wire','accent',[[.2,.87,0],[.62,.65,.11],[.38,.41,.21]],.026,'#665da4',8);}
    return true;
  }

  if(anatomy==='rock'||anatomy==='primal-being'){
    const pillar=code==='82340057'||variant==='ceremonial-pillar';
    const coreMachine=code==='176393'||variant==='koa-ki-meiru';
    if(pillar){
      box('token-ceremonial-stone-pillar','body',[0,1.48,0],[.55,2.41,.43],undefined,body);
      for(let tier=0;tier<6;tier++)box(`token-ceremonial-block-course-${tier}`,'accent',[0,.45+tier*.35,.225],[.6,.044,.037],undefined,accent);
      solid('token-ceremonial-pointed-crown','body',[[-.27,0],[.27,0],[.22,.33],[0,.68],[-.22,.33]],.42,[0,2.64,0],undefined,body);
      sphere('token-ceremonial-red-seal','eye',[0,2.57,.248],[.085,.089,.028],1,eye);
    }else if(coreMachine){
      sphere('token-koaki-core-machine','body',[0,1.8,0],[.65,.54,.33],1,'#2d8c87');
      ring('token-koaki-alchemical-core-rim','accent',[0,1.83,.35],.32,[0,0,0],.045,'#d3b950');
      sphere('token-koaki-alchemical-core','dark',[0,1.83,.36],[.28,.28,.027],1,'#26372d');
      for(let ray=0;ray<3;ray++){const a=ray*Math.PI*2/3;curve(`token-koaki-yellow-seal-${ray}`,'eye',[[0,1.85,.395],[Math.sin(a)*.13,1.85+Math.cos(a)*.13,.395],[Math.sin(a+.6)*.2,1.85+Math.cos(a+.6)*.2,.395]],.021,'#e0c34d',7);}
      for(const side of sides){rod(`token-koaki-machine-leg-${side}`,'body',[side*.38,1.42,0],[side*.61,.5,.03],.17,.12,'#397f7d');box(`token-koaki-machine-foot-${side}`,'body',[side*.61,.35,.17],[.37,.27,.55],undefined,'#527f80');curve(`token-koaki-cable-${side}`,'accent',[[side*.49,2.04,-.11],[side*.93,2.39,-.1],[side*.98,2.98,-.03]],.053,'#c28453',12);}
      rod('token-koaki-high-neck','body',[0,2.16,0],[0,2.95,0],.1,.085,'#688f74');sphere('token-koaki-camera-eye','eye',[0,3.04,.02],[.21,.19,.15],1,'#d4cf65');
    }else{
      const primal=anatomy==='primal-being';
      sphere('token-rock-craggy-body','body',[0,1.82,0],[primal?.82:.58,.95,.43],1,body);
      sphere('token-rock-faceted-head','body',[0,2.84,0],[.36,.37,.34],0,body);
      eyes('token-rock',{y:2.84,z:.29,spread:.14,size:.047,pupil:false,tint:eye});
      for(const side of sides){sphere(`token-rock-boulder-shoulder-${side}`,'body',[side*(primal?.9:.62),2.29,0],[.4,.41,.4],0,body);rod(`upper-arm-${side}-token-rock`,'body',[side*(primal?.9:.62),2.19,0],[side*(primal?1.09:.85),1.26,.16],.25,.2,body);sphere(`hand-${side}-token-rock-fist`,'accent',[side*(primal?1.11:.87),1.15,.2],[.3,.32,.28],0,accent);rod(`token-rock-pillar-leg-${side}`,'body',[side*.3,1.08,0],[side*.41,.25,.1],.27,.2,body);sphere(`token-rock-foot-${side}`,'body',[side*.41,.2,.23],[.3,.17,.4],0,body);}
      for(let crack=0;crack<5;crack++)box(`token-rock-luminous-fissure-${crack}`,'eye',[(crack%2-.5)*.42,1.48+crack*.2,.41],[.13,.023,.018],[0,0,crack%2?.31:-.28],accent);
      if(primal)for(let crag=0;crag<5;crag++)part(`token-primal-jagged-crown-${crag}`,new THREE.TetrahedronGeometry(.25),'body',[(crag-2)*.19,3.16+crag%2*.16,-.05],[1,1.7,.7],[0,crag*.4,0],body);
      else box('token-rockstone-red-chest-armor','accent',[0,2.11,.4],[.68,.44,.13],undefined,accent);
    }
    return true;
  }

  if(anatomy==='flame'){
    const blue=code==='98596597'||variant==='blue-flame';
    const faceless=blue||['48411997','68815402'].includes(code)||['small-fire','wild-fire'].includes(variant);
    if(code==='68815402'||variant==='wild-fire'){
      curve('token-wildfire-large-swirling-flame','body',[[-.4,.43,0],[.54,.79,0],[.43,1.39,0],[-.18,1.96,0],[-.22,2.54,0],[.39,2.72,0],[.66,2.39,0]],.22,body,24);
      for(const side of sides){
        curve(`token-wildfire-lower-curl-${side}`,'accent',[[side*.14,.73,0],[side*.82,.51,0],[side*1.01,.85,0],[side*.88,1.12,0],[side*.65,.97,0]],.16,accent,18);
        curve(`token-wildfire-rising-tongue-${side}`,'accent',[[side*.45,1.05,0],[side*.88,1.6,0],[side*.65,2.11,0],[side*.91,2.4,0]],.09,accent,16);
        cone(`token-wildfire-pointed-tip-${side}`,'accent',[side*.91,2.43,0],[.1,.31,.08],[0,0,side*-.45],accent);
      }
      curve('token-wildfire-inner-gold-trail','glow',[[-.4,.43,.17],[.37,.86,.17],[.24,1.41,.17],[-.3,2.04,.17],[-.14,2.6,.17],[.39,2.72,.13]],.047,'#ffd16f',22);
      return true;
    }
    sphere('token-flame-core','body',[0,1.23,0],[.55,.7,.41],2,body);
    for(let tongue=0;tongue<7;tongue++){
      const x=(tongue-3)*.17;
      curve(`token-flame-curved-tongue-${tongue}`,'accent',[[x*.6,1.46,.025],[x,1.97+Math.abs(tongue-3)*.04,.015],[x+(tongue%2?.12:-.12),2.56-Math.abs(tongue-3)*.16,0]],.085,accent,10);
      cone(`token-flame-pointed-tip-${tongue}`,'accent',[x+(tongue%2?.12:-.12),2.58-Math.abs(tongue-3)*.16,0],[.09,.33,.078],[0,0,tongue%2?-.25:.25],accent);
    }
    if(!faceless){eyes('token-flame',{y:1.51,z:.388,spread:.19,size:.085,pupil:false,tint:eye});sphere('token-flame-smiling-mouth','dark',[0,1.24,.411],[.11,.15,.025],1,'#ad3341');}
    if(blue)for(const side of sides)curve(`token-blue-flame-floating-wisp-${side}`,'body',[[side*.42,1.17,0],[side*.81,1.6,.02],[side*.7,2.13,.01]],.082,body,10);
    return true;
  }
  return false;
}
