import * as THREE from 'three';
import { createTokenGeometryTools } from './HologramTokenGeometry.js';

/** Machine, digital and elemental silhouettes. Geometry is registered once, at construction. */
export function buildTokenConstructAnatomy(profile, helpers) {
  const { part, sphere: sharedSphere, box, cone, ring, rod } = helpers;
  // Retainers and small joints stay round without paying the surface budget
  // of a full-size hull. The high resolution belongs to the main silhouette.
  const sphere = (name, material, position, scale, detail = 1, tint) => {
    const radius = Math.max(...scale.map(Math.abs));
    if (detail > 0 && radius <= .27) {
      part(name, new THREE.SphereGeometry(1, radius <= .1 ? 8 : 12, radius <= .1 ? 6 : 8), material, position, scale, undefined, tint);
    } else sharedSphere(name, material, position, scale, detail, tint);
  };
  const tools = createTokenGeometryTools(helpers);
  const { solid, curve, taperedCurve, eyes, spokes } = tools;
  const plate = tools.roundedSolid || solid;
  const sheet = tools.curvedSheet || solid;
  const anatomy = profile.tokenAnatomy, code = String(profile.tokenCode || '');
  const variant = profile.tokenVisual?.variant || '';
  const body = profile.body, accent = profile.accent, eye = profile.eye, dark = profile.hair || '#28313c';
  const sides = [-1, 1];

  if (anatomy === 'aircraft') {
    const stealth = code === '10389143';
    const fighter = code === '29491335';
    const option = code === '14089429' || variant === 'option-beam';
    if (option) {
      // Option is an open fork around a yellow orb, not a winged aircraft.
      sphere('token-option-luminous-core','eye',[0,2.12,-.03],[.31,.31,.31],3,'#ffdc61');
      rod('token-option-rear-reactor','dark',[0,2.12,-.78],[0,2.12,-.22],.235,.235,'#524c3b');
      for(let rib=0;rib<7;rib++)ring(`token-option-reactor-cooling-rib-${rib}`,'accent',[0,2.12,-.7+rib*.074],.242,[0,0,0],.017,'#b49552');
      for(const side of sides){
        plate(`token-option-forward-rail-${side}`,'body',[[side*-.09,.73],[side*.17,.73],[side*.31,.42],[side*.3,-.08],[side*.07,-1.38],[side*-.02,-1.38],[side*-.055,-.36],[side*-.12,.1]],.19,[side*.25,2.12,0],[-Math.PI/2,0,0],body,.018);
        plate(`token-option-tapered-rail-tip-${side}`,'accent',[[side*.255,-.055],[side*.033,-1.355],[side*-.005,-1.355],[side*.008,-.37]],.02,[side*.25,2.225,0],[-Math.PI/2,0,0],'#efefe5',.006);
        rod(`token-option-rail-inner-sill-${side}`,'accent',[side*.25,2.0,-.43],[side*.25,2.0,1.03],.022,.012,'#a9a78b');
        box(`token-option-reactor-rail-mount-${side}`,'body',[side*.21,2.12,-.48],[.16,.27,.42],undefined,'#aeb0aa');
      }
      return true;
    }
    if (fighter) {
      // Dog Fighter has two parallel torpedo hulls and a dark transverse bridge.
      plate('token-dogfighter-black-transverse-bridge','dark',[[-.76,-.26],[.76,-.26],[.76,.22],[-.76,.22]],.7,[0,2.13,-.28],[-Math.PI/2,0,0],'#36383f',.025);
      box('token-dogfighter-yellow-bridge-stripe','eye',[0,2.156,-.51],[1.06,.014,.063],undefined,'#e2e45c');
      for(const side of sides){
        sphere(`wing-${side}-token-aircraft-engine`,'body',[side*.67,2.15,.02],[.33,.26,.83],3,'#c5c7d3');
        cone(`wing-${side}-token-dogfighter-red-nose`,'accent',[side*.67,2.15,.93],[.22,.48,.19],[Math.PI/2,0,0],'#8b3945');
        rod(`wing-${side}-token-dogfighter-rear-motor`,'dark',[side*.67,2.15,-.94],[side*.67,2.15,-.69],.23,.27,'#42434d');
        ring(`wing-${side}-token-dogfighter-rear-nozzle-rim`,'accent',[side*.67,2.15,-.966],.23,[0,0,0],.035,'#a8a7ad');
        sphere(`wing-${side}-token-aircraft-thruster`,'eye',[side*.67,2.15,-.972],[.16,.16,.026],2,'#9fdfdc');
        for(let seam=0;seam<3;seam++)ring(`wing-${side}-token-dogfighter-hull-seam-${seam}`,'accent',[side*.67,2.15,-.44+seam*.36],.281-seam*.017,[0,0,0],.008,'#9297a5');
        plate(`wing-${side}-token-dogfighter-forward-blade`,'body',[[0,0],[side*.27,.11],[side*.4,-.14],[side*.08,-.12]],.3,[side*.76,2.03,.64],[-Math.PI/2,0,0],'#9da0a9',.012);
        for(let panel=0;panel<2;panel++)box(`token-dogfighter-bridge-access-panel-${side}-${panel}`,'body',[side*.24,2.173,-.34+panel*.25],[.23,.035,.13],undefined,'#626671');
      }
      return true;
    }
    if (stealth) {
      // The Battle Eagle's flattened delta and serrated whip tail are visible
      // in its own print; it has no conventional pair of round engine pods.
      for(const side of sides){
        const outline=[[0,.88],[side*.38,.51],[side*.63,.77],[side*.72,.24],[side*1.37,.4],[side*1.6,.13],[side*1.54,-.29],[side*.48,-.19],[0,-.54]];
        plate(`wing-${side}-token-aircraft-swept-panel`,'body',outline,.12,[0,2.08,0],[-Math.PI/2,0,0],'#353440',.017);
        plate(`wing-${side}-token-battle-eagle-upper-facet`,'accent',[[side*.04,.76],[side*.34,.49],[side*.63,.7],[side*.64,.22],[side*.04,-.34]],.022,[0,2.158,0],[-Math.PI/2,0,0],'#5d5e71',.007);
        curve(`wing-${side}-token-battle-eagle-edge-light`,'eye',[[0,2.018,1.02],[side*.66,2.018,.31],[side*1.55,2.018,-.2]],.013,'#ed697b',18);
        rod(`wing-${side}-token-battle-eagle-panel-seam`,'dark',[side*.44,2.158,.38],[side*.94,2.158,-.09],.009,.009,'#252832');
      }
      plate('token-aircraft-cockpit','body',[[-.24,0],[.24,0],[.16,.2],[0,.39],[-.16,.2]],.79,[0,2.18,-.02],[-.08,0,0],'#2b2d3a',.009);
      plate('token-battle-eagle-silver-nose-facet','accent',[[-.2,0],[.2,0],[.08,.12],[0,.34],[-.08,.12]],.023,[0,2.18,.404],undefined,'#b4c6d5',.007);
      curve('token-battle-eagle-curved-whip-tail','dark',[[0,2.25,-.46],[.18,2.59,-.92],[.69,2.68,-1.21],[1.0,2.88,-1.53],[.68,3.04,-1.83],[.15,3.07,-1.85]],.032,'#332637',28);
      for(let barb=0;barb<8;barb++)cone(`token-battle-eagle-tail-serration-${barb}`,'body',[.12+barb*.074,2.58+barb*.019,-.83-barb*.042],[.023,.095,.023],[0,0,-.65],'#534658');
      plate('token-battle-eagle-tail-arrow-tip','accent',[[0,0],[-.18,.09],[-.12,.01],[-.18,-.06]],.025,[.14,3.07,-1.85],undefined,'#985b74',.004);
      return true;
    }
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
      ring(`wing-${side}-token-aircraft-thruster-rim`,'accent',[podX,2.18,-.855],.133,[0,0,0],.025,accent);
      for(let vent=0;vent<3;vent++)box(`wing-${side}-token-aircraft-intake-slat-${vent}`,'dark',[podX,2.3,-.25+vent*.13],[.18,.025,.045],undefined,'#495269');
      plate(`wing-${side}-token-aircraft-control-flap`,'accent',[[0,0],[side*.73,-.08],[side*.58,-.22],[side*.03,-.2]],.025,[side*.58,2.3,-.42],[-Math.PI/2,0,0],accent,.008);
      curve(`token-aircraft-canopy-frame-${side}`,'accent',[[side*.16,2.36,.63],[side*.15,2.55,.41],[side*.08,2.59,.21]],.012,accent,12);
    }
    if (option) {
      sphere('token-option-luminous-core','eye',[0,2.27,.52],[.22,.17,.29],2,'#f5d66a');
      for(const side of sides)solid(`token-option-forward-rail-${side}`,'body',[[0,0],[side*.1,.21],[side*.24,.13],[side*.14,-.1]],.93,[side*.19,2.24,.21],[0,0,0],body);
    }
    return true;
  }

  if(code==='98875864'){
    // MAMA-EN103 shows a floating, tapered mass of dark stone. Cyberse is
    // its native race, not evidence for the former humanoid machine body.
    const rock='#2c4548',facet='#3a5759',shape=new THREE.IcosahedronGeometry(1,1),position=shape.attributes.position;
    for(let vertex=0;vertex<position.count;vertex++){
      const x=position.getX(vertex),y=position.getY(vertex),z=position.getZ(vertex);
      const width=1-.25*Math.abs(y),rough=1+.06*Math.sin(x*9-y*11+z*13);
      position.setXYZ(vertex,x*width*rough,y,z*width*rough);
    }
    shape.computeVertexNormals();
    part('token-g-golem-floating-jagged-rock',shape,'body',[0,1.89,0],[.65,.94,.5],undefined,rock);
    const crags=[[-.38,2.2,.1,.34],[.16,2.47,.015,.32],[.4,2.02,.09,.25],[-.13,1.62,.26,.28],[.18,1.27,.02,.25]];
    for(let crag=0;crag<crags.length;crag++){
      const [x,y,z,r]=crags[crag];
      part(`token-g-golem-angular-stone-crag-${crag}`,new THREE.IcosahedronGeometry(r,0),'body',[x,y,z],[.86,1.35,.83],[0,crag*.45,crag*.27],crag%2?facet:rock);
    }
    for(let crack=0;crack<5;crack++)taperedCurve(`token-g-golem-dark-stone-fissure-${crack}`,'dark',[[Math.sin(crack)*.2,2.16-crack*.11,.443],[Math.sin(crack+.4)*.22,1.94-crack*.1,.477],[Math.sin(crack-.3)*.2,1.74-crack*.1,.399]],.008,.002,'#20393d',9,6);
    return true;
  }

  if (anatomy === 'gadget') {
    if (code === '645088') {
      // TK04-JP029 shows a flying two-pronged drone, not the source monster
      // Cyberse Gadget or a humanoid robot. Only visible mechanical parts
      // are reconstructed; the reverse of the printed shell is inferred.
      const shell='#d4ddd8', trim='#73b0b1', red='#9a3548', steel='#656c75', cable='#2b303d';
      sphere('token-gadget-white-domed-drone-shell','body',[0,1.99,.02],[.62,.31,.52],2,shell);
      sphere('token-gadget-dark-underbody','dark',[0,1.78,.03],[.46,.2,.36],1,'#343948');
      curve('token-gadget-cyan-shell-center-seam','accent',[[0,2.293,-.25],[0,2.309,.03],[0,2.221,.35]],.018,trim,12);
      const hex=[];
      for(let edge=0;edge<=6;edge++){const a=edge*Math.PI/3;hex.push([Math.sin(a)*.102,2.014+Math.cos(a)*.094,.527]);}
      curve('token-gadget-cyan-hexagon-insignia','accent',hex,.015,trim,12);
      plate('token-gadget-red-chevron-insignia','accent',[[-.054,.035],[0,-.03],[.054,.035],[.032,-.048],[0,-.082],[-.032,-.048]],.016,[0,1.839,.496],undefined,red,.002);
      sphere('token-gadget-blue-underbody-lens','eye',[0,1.74,.384],[.114,.095,.049],1,'#5c6da9');
      ring('token-gadget-black-lens-rim','dark',[0,1.748,.356],.121,[0,0,0],.024,cable);
      sphere('token-gadget-lens-reflection','eye',[-.038,1.775,.426],[.02,.023,.01],1,'#d7eaff');
      for(const side of sides){
        sphere(`token-gadget-white-side-hinge-${side}`,'body',[side*.535,2.015,-.046],[.245,.245,.284],1,shell);
        ring(`token-gadget-cyan-hinge-seam-${side}`,'accent',[side*.536,2.013,.071],.218,[0,0,0],.014,trim);
        sphere(`token-gadget-red-pincher-housing-${side}`,'accent',[side*.644,1.828,.092],[.287,.276,.243],1,red);
        sphere(`token-gadget-black-pincher-bearing-${side}`,'dark',[side*.647,1.824,.302],[.217,.21,.022],1,cable);
        plate(`token-gadget-pincher-light-hexagon-${side}`,'eye',[[-.13,-.042],[-.077,.079],[.08,.075],[.14,-.036],[.049,-.117],[-.056,-.116]],.027,[side*.667,1.861,.331],undefined,'#e5ba6f',.006);
        curve(`token-gadget-pincher-cyan-light-rim-${side}`,'accent',[[side*.532,1.819,.353],[side*.59,1.944,.353],[side*.748,1.941,.353],[side*.806,1.824,.353],[side*.716,1.744,.353],[side*.611,1.744,.353],[side*.532,1.819,.353]],.012,'#8acac9',12);
        plate(`token-gadget-long-forked-pincher-${side}`,'body',[[-.133,.075],[.139,.075],[.145,-.74],[.067,-.98],[.026,-.98],[.026,-.28],[-.03,-.28],[-.03,-1.06],[-.086,-1.06],[-.137,-.73]],.093,[side*.63,1.742,.101],[-Math.PI/2,side*.12,0],steel,.013);
        taperedCurve(`token-gadget-looped-rear-cable-${side}`,'dark',[[side*.37,2.104,-.328],[side*.55,2.404,-.452],[side*.91,2.338,-.473],[side*.986,1.957,-.342],[side*.798,1.829,-.107]],.047,.042,cable,24,8);
        for(let retainer=0;retainer<2;retainer++)rod(`token-gadget-cable-metal-retainer-${side}-${retainer}`,'body',[side*(.408+retainer*.394),2.123-retainer*.218,-.309+retainer*.155],[side*(.421+retainer*.394),2.17-retainer*.218,-.355+retainer*.155],.064,.064,steel);
      }
      return true;
    }
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
      plate('token-multi-laser-casing','body',[[-.48,-.35],[.44,-.35],[.39,.38],[-.36,.46]],.75,[0,1.94,0],[.12,-.12,.12],'#a96953',.024);
      for(const side of sides)solid(`token-multi-casing-fin-${side}`,'accent',[[0,0],[side*.23,-.19],[side*.23,.29]],.68,[side*.4,1.96,-.02],[.12,-.12,.12],'#bd8266');
      ring('token-multi-violet-lens-rim','accent',[0,2.03,.427],.26,[0,0,0],.057,'#5d334c');
      sphere('token-multi-violet-laser-lens','eye',[0,2.03,.448],[.22,.22,.079],2,'#bb72bb');
      ring('token-multi-laser-inner-aperture','dark',[0,2.03,.51],.147,[0,0,0],.013,'#673f70');
      sphere('token-multi-laser-lens-specular','eye',[-.069,2.117,.517],[.038,.059,.01],2,'#f6d9ed');
      rod('token-multi-laser-central-focusing-spike','body',[0,2.03,.5],[0,2.03,.676],.022,.011,'#d3b78b');
      for(let bolt=0;bolt<6;bolt++){const a=bolt*Math.PI/3;sphere(`token-multi-lens-retaining-bolt-${bolt}`,'body',[Math.sin(a)*.273,2.03+Math.cos(a)*.273,.473],[.032,.032,.019],2,'#dac0a5');}
      rod('token-multi-green-rear-nozzle','accent',[0,1.91,-.34],[0,1.91,-.93],.2,.1,'#9bbc6c');
      for(let slot=0;slot<3;slot++)box(`token-multi-casing-vent-${slot}`,'dark',[.48,1.88+slot*.1,.035],[.018,.045,.26],[.12,-.12,.12],dark);
      cone('token-multi-rear-nozzle-tip','accent',[0,1.91,-1.07],[.105,.36,.105],[-Math.PI/2,0,0],'#b7cf74');
      for(let rib=0;rib<4;rib++)ring(`token-multi-rear-nozzle-rib-${rib}`,'body',[0,1.91,-.42-rib*.115],.2-rib*.025,[0,0,0],.018,'#7a9562');
      for(const side of sides)rod(`token-multi-shell-side-seam-${side}`,'dark',[side*.375,1.76,.345],[side*.342,2.17,.355],.008,.008,'#794e45');
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
      curve('token-dragonoid-heavy-upper-eyelid','dark',[[-.135,2.742,.273],[0,2.754,.323],[.14,2.735,.284]],.018,'#183047',16);
      solid('token-dragonoid-green-forehead-plate','accent',[[-.21,0],[.19,0],[.22,.25],[.04,.42],[-.17,.3]],.045,[0,2.85,.15],[.17,0,0],'#9ac878');
      for(const side of sides){
        sphere(`token-dragonoid-black-horn-base-${side}`,'dark',[side*.29,2.98,-.025],[.18,.19,.14],3,'#27313b');
        curve(`token-dragonoid-curled-black-horn-${side}`,'dark',[[side*.3,2.94,-.04],[side*.52,3.23,-.05],[side*.37,3.33,0],[side*.29,3.08,.06]],.115,'#293038',12);
        sheet(`wing-${side}-token-dragonoid-bat-membrane`,'accent',[[0,0],[side*.58,.76],[side*.91,-.44],[side*.7,-1.22],[side*.45,-.55],[side*.2,-.37]],.032,[side*.28,2.25,-.2],undefined,'#87b96c',{camber:.045,curl:.015,subdivisions:2});
        curve(`wing-${side}-token-dragonoid-wing-frame`,'body',[[side*.28,2.25,-.2],[side*.86,3.01,-.2],[side*1.19,1.81,-.2],[side*.98,1.03,-.2]],.045,dragonBlue,14);
        curve(`wing-${side}-token-dragonoid-membrane-rib`,'body',[[side*.29,2.25,-.178],[side*.72,2.24,-.165],[side*.98,1.03,-.18]],.025,dragonBlue,16);
        cone(`wing-${side}-token-dragonoid-wing-tip`,'body',[side*.86,3.085,-.2],[.033,.2,.033],[0,0,side*.22],'#bccbb6');
        rod(`token-dragonoid-gripping-arm-${side}`,'body',[side*.27,2.16,.14],[side*.28,1.87,.35],.085,.085,dragonBlue);
        sphere(`token-dragonoid-rim-hand-${side}`,'body',[side*.28,1.79,.36],[.13,.11,.12],1,dragonBlue);
        for(let claw=0;claw<3;claw++)cone(`token-dragonoid-rim-claw-${side}-${claw}`,'accent',[side*.28+(claw-1)*.075,1.68,.45],[.026,.16,.027],[0,0,Math.PI],'#b9c9bd');
        cone(`token-dragonoid-mouth-fang-${side}`,'accent',[side*.17,2.46,.364],[.037,.14,.037],[0,0,Math.PI],'#bacdb9');
        for(let scale=0;scale<4;scale++)curve(`token-dragonoid-cheek-scale-${side}-${scale}`,'accent',[[side*.16,2.38+scale*.11,.268],[side*.25,2.39+scale*.11,.226],[side*.29,2.42+scale*.11,.19]],.007,'#486080',10);
        plate(`token-dragonoid-chalice-rim-facet-${side}`,'dark',[[0,0],[side*.36,-.07],[side*.53,.07],[side*.38,.19],[0,.15]],.022,[0,1.68,.39],undefined,'#42424f',.007);
        plate(`token-dragonoid-tapered-cup-facet-${side}`,'dark',[[side*.04,0],[side*.45,.64],[side*.2,.58],[0,.11]],.017,[0,.78,.24],undefined,'#252935',.004);
      }
      return true;
    }
    if(acorn){
      sphere('token-acorn-brown-dome','body',[0,1.96,0],[.65,.65,.58],2,body);
      sphere('token-acorn-cup','accent',[0,1.53,.015],[.67,.35,.58],2,accent);
      ring('token-acorn-cap-rim','accent',[0,1.73,0],.61,undefined,.056,accent);
      for(let course=0;course<3;course++)ring(`token-acorn-cup-layer-${course}`,'accent',[0,1.43+course*.105,0],.51+course*.06,[Math.PI/2,0,0],.025,'#e3cc94');
      cone('token-acorn-top-point','accent',[0,2.63,0],[.14,.2,.12],[0,0,-.12],'#e6ca89');
      eyes('token-acorn',{y:2.07,z:.532,spread:.28,size:.14,white:true,tint:eye});
      for(const side of sides){
        sphere(`token-acorn-round-hand-${side}`,'body',[side*.66,1.6,.015],[.15,.16,.16],2,body);
        curve(`token-acorn-raised-arm-${side}`,'body',[[side*.6,2.01,0],[side*.78,2.04,.02],[side*.83,2.23,.03]],.064,body,10);
        sphere(`token-acorn-ear-${side}`,'body',[side*.63,2.14,0],[.15,.13,.13],2,body);
        for(let digit=0;digit<3;digit++)sphere(`token-acorn-fist-knuckle-${side}-${digit}`,'body',[side*.83+(digit-1)*.048,2.25,.115],[.035,.04,.033],2,body);
        curve(`token-acorn-little-leg-${side}`,'body',[[side*.44,1.48,0],[side*.64,1.31,.1],[side*.67,1.34,.2]],.063,body,10);
        sphere(`token-acorn-oval-foot-${side}`,'body',[side*.67,1.35,.21],[.12,.15,.084],2,body);
      }
      box('token-acorn-usb-metal-plug','body',[0,1.05,0],[.45,.47,.24],undefined,'#d9dbe1');
      for(const side of sides){box(`token-acorn-usb-contact-${side}`,'dark',[side*.11,1.08,.13],[.1,.13,.025],undefined,'#363945');box(`token-acorn-usb-blue-contact-${side}`,'accent',[side*.11,1.08,.145],[.075,.09,.013],undefined,'#3d91d3');}
      box('token-acorn-usb-dark-lower-socket','dark',[0,.837,.12],[.375,.077,.028],undefined,'#2e3843');
      box('token-acorn-usb-lower-blue-tongue','accent',[0,.847,.14],[.338,.026,.013],undefined,'#4b9ed5');
      rod('token-acorn-usb-housing-split','dark',[0,1.0,.141],[0,1.27,.141],.007,.007,'#8b9499');
      return true;
    }
    if(compass){
      sphere('token-compass-dark-orb','dark',[0,2.8,0],[.3,.3,.28],2,'#4a4d59');
      eyes('token-compass',{y:2.86,z:.263,spread:.125,size:.045,tint:'#c0c1cf'});
      rod('token-compass-long-gold-pendulum','accent',[0,.59,0],[0,2.53,0],.03,.03,accent);
      part('token-compass-diamond-weight',new THREE.OctahedronGeometry(.43), 'accent',[0,.71,0],[.52,1.31,.5],undefined,body);
      curve('token-compass-sad-arched-mouth','dark',[[-.145,2.66,.236],[-.09,2.755,.292],[0,2.775,.305],[.09,2.755,.292],[.145,2.66,.236]],.024,'#8d909c',18);
      for(let tooth=0;tooth<7;tooth++)box(`token-compass-mouth-tooth-${tooth}`,'body',[(tooth-3)*.025,2.768-Math.abs(tooth-3)*.009,.318-Math.abs(tooth-3)*.005],[.019,.031,.006],undefined,'#bdc0c7');
      for(const side of sides)curve(`token-compass-side-face-seam-${side}`,'dark',[[side*.13,3.055,.04],[side*.22,2.96,.185],[side*.25,2.77,.2],[side*.19,2.64,.15]],.01,'#363842',16);
      return true;
    }
    if(solar||battery){
      if(solar){
        sphere('token-data-solar-drone-core','body',[0,2.02,0],[.34,.4,.34],3,'#bd954b');
        ring('token-data-solar-turbine-gold-rim','accent',[0,2.02,.315],.28,[0,0,0],.044,'#d9b955');
        sphere('token-data-solar-dark-turbine','dark',[0,2.02,.337],[.24,.24,.03],2,'#333542');
        sphere('token-data-solar-central-reactor','eye',[0,2.02,.37],[.107,.107,.035],2,'#fff1a7');
        for(let blade=0;blade<8;blade++){const a=blade*Math.PI/4;plate(`token-data-solar-turbine-blade-${blade}`,'body',[[-.022,0],[.032,.1],[.091,.155],[.012,.16]],.02,[Math.sin(a)*.105,2.02+Math.cos(a)*.105,.365],[0,0,-a],'#7e8287',.005);}
        curve('token-data-solar-bent-neck','body',[[0,2.37,0],[-.18,2.65,-.07],[-.19,2.94,.01]],.072,'#897c4e',16);
        sphere('token-data-solar-mechanical-bird-head','body',[-.18,2.96,.025],[.16,.14,.13],2,'#bfaa50');
        cone('token-data-solar-pointed-beak','body',[-.18,2.96,.245],[.055,.26,.055],[Math.PI/2,0,0],'#c9cdad');
        sphere('token-data-solar-bird-eye','eye',[-.092,3.008,.127],[.036,.04,.022],2,'#b74034');
        for(const side of sides){
          ring(`token-data-solar-shoulder-joint-${side}`,'accent',[side*.26,2.35,.02],.079,[0,0,0],.025,'#d7b25c');
          for(let fin=0;fin<2;fin++)plate(`token-data-solar-small-rear-panel-${side}-${fin}`,'accent',[[0,0],[side*.39,.08],[side*.51,-.015],[side*.37,-.09]],.018,[side*.19,1.91+fin*.25,-.24],undefined,'#685f8b',.004);
          plate(`token-data-solar-red-armored-fin-${side}`,'accent',[[0,0],[side*.22,.18],[side*.39,.04],[side*.19,-.18]],.033,[side*.21,1.81,-.13],undefined,'#ba5649',.009);
        }
      }
      else {
        box('token-solar-battery-rectangular-body','body',[0,1.67,0],[.92,1.06,.34],undefined,body);
        for(const side of sides){rod(`token-battery-arm-${side}`,'body',[side*.49,1.92,0],[side*.79,1.58,.1],.1,.075,body);sphere(`token-battery-hand-${side}`,'accent',[side*.8,1.53,.14],[.16,.13,.13],1,accent);rod(`token-battery-leg-${side}`,'body',[side*.25,1.13,0],[side*.3,.31,.1],.12,.1,body);sphere(`token-battery-foot-${side}`,'body',[side*.3,.22,.2],[.23,.14,.31],1,body);}
        rod('token-battery-horizontal-head','body',[-.36,2.5,0],[.36,2.5,0],.14,.14,body);
        for(const side of sides){
          sphere(`token-battery-head-terminal-${side}`,'eye',[side*.365,2.5,0],[.025,.097,.097],2,'#f1d558');
          ring(`token-battery-head-terminal-rim-${side}`,'accent',[side*.345,2.5,0],.135,[0,Math.PI/2,0],.025,'#d78942');
          plate(`token-battery-angry-eye-${side}`,'eye',[[0,.03],[side*.17,.06],[side*.13,-.015],[0,-.03]],.02,[side*.055,2.51,.151],undefined,'#f5d959',.005);
          sphere(`token-battery-arm-spherical-joint-${side}`,'body',[side*.49,1.94,.02],[.18,.19,.18],3,'#d3d4cf');
          ring(`token-battery-wrist-gold-band-${side}`,'accent',[side*.76,1.6,.14],.126,[Math.PI/2,0,side*.4],.03,'#dbaa46');
          for(let digit=0;digit<4;digit++)rod(`token-battery-finger-${side}-${digit}`,'dark',[side*.77+(digit-1.5)*.06,1.58,.23],[side*.77+(digit-1.5)*.06,1.47,.258],.027,.028,'#3d4147');
          sphere(`token-battery-thumb-${side}`,'dark',[side*.89,1.59,.245],[.044,.064,.042],2,'#3d4147');
          sphere(`token-battery-knee-joint-${side}`,'body',[side*.28,.79,.02],[.135,.13,.135],2,'#afb1b4');
          plate(`token-battery-shin-armor-${side}`,'body',[[-.115,-.16],[.115,-.16],[.15,.21],[0,.32],[-.15,.21]],.13,[side*.3,.52,.17],undefined,'#c9cbc8',.02);
          ring(`token-battery-boot-gold-trim-${side}`,'accent',[side*.3,.23,.12],.15,[Math.PI/2,0,0],.025,'#d79741');
        }
        curve('token-battery-frowning-mouth','dark',[[-.09,2.414,.127],[0,2.455,.143],[.09,2.414,.127]],.011,'#3f444a',10);
        ring('token-battery-forehead-sun-emblem','accent',[0,2.594,.087],.033,[0,0,0],.008,'#d4bf57');
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
        for(const cornerX of [-1,1])for(const cornerY of [-1,1])sphere(`token-solar-frame-rivet-${side}-${cornerX}-${cornerY}`,'accent',panelPosition([cornerX*(solar?.286:.341),cornerY*.39,.042]),[.019,.019,.012],1,'#ded2a6');
      }
      if(battery){
        for(const side of sides){
          const rotation=[0,side*-.2,side*.13];
          const panelEuler=new THREE.Euler(...rotation);
          const panelPosition=offset=>new THREE.Vector3(...offset).applyEuler(panelEuler).add(new THREE.Vector3(side*.82,2.72,-.15)).toArray();
          box(`token-battery-raised-solar-frame-${side}`,'body',[side*.82,2.72,-.15],[.62,.52,.047],rotation,'#cecfc9');
          box(`token-battery-raised-solar-cell-${side}`,'accent',panelPosition([0,0,.033]),[.54,.44,.025],rotation,'#5a7fb4');
          for(let row=0;row<4;row++)box(`token-battery-raised-grid-row-${side}-${row}`,'body',panelPosition([0,-.16+row*.102,.049]),[.51,.009,.008],rotation,'#a0bddb');
          for(let column=0;column<3;column++)box(`token-battery-raised-grid-column-${side}-${column}`,'body',panelPosition([-.17+column*.17,0,.049]),[.009,.42,.008],rotation,'#a0bddb');
          rod(`token-battery-rear-panel-support-${side}`,'dark',[side*.18,2.28,-.13],[side*.58,2.56,-.15],.035,.035,'#626671');
        }
      }
      return true;
    }
    if(security){
      plate('token-security-triangular-drone','body',[[-.62,.49],[.62,.49],[.35,-.54],[0,-.84],[-.35,-.54]],.27,[0,1.96,0],undefined,'#84889b',.035);
      for(const side of sides)plate(`token-security-silver-side-cowl-${side}`,'body',[[side*.45,.45],[side*.61,.43],[side*.5,-.13],[side*.15,-.77],[side*.06,-.87],[side*.32,-.19]],.03,[0,1.96,.168],undefined,'#c9d5df',.012);
      sphere('token-security-lens-rim','accent',[0,2.24,.135],[.28,.29,.095],2,accent);
      sphere('token-security-blue-lens','eye',[0,2.24,.227],[.2,.2,.047],2,eye);
      ring('token-security-orange-lens-surround','accent',[0,2.24,.203],.271,[0,0,0],.043,'#d49558');
      sphere('token-security-lens-highlight-large','eye',[-.07,2.328,.274],[.038,.045,.009],2,'#d4f5fc');
      sphere('token-security-lens-highlight-small','eye',[.056,2.21,.274],[.02,.022,.009],2,'#bfeef5');
      for(const side of sides){
        plate(`token-security-side-fin-${side}`,'body',[[0,0],[side*.36,-.12],[side*.89,-.65],[side*.48,-.51]],.11,[side*.45,2.1,-.04],undefined,'#a5abbc',.014);
        rod(`token-security-lance-gold-collar-${side}`,'accent',[side*.76,1.79,-.04],[side*.84,1.73,-.04],.082,.072,'#d7d399');
      }
      box('token-security-red-keyslot','accent',[0,1.56,.135],[.11,.45,.045],undefined,accent);
      plate('token-security-orange-slot-frame','accent',[[-.155,.37],[.155,.37],[.155,-.36],[.05,-.41],[-.05,-.41],[-.155,-.36]],.045,[0,1.74,.185],undefined,'#d28c59',.012);
      box('token-security-slot-dark-inset','dark',[0,1.75,.216],[.19,.59,.023],undefined,'#4b4350');
      box('token-security-slot-red-display','accent',[0,1.76,.231],[.125,.5,.013],undefined,'#b9536b');
      for(let bar=0;bar<3;bar++)box(`token-security-slot-diagonal-band-${bar}`,'eye',[0,1.62+bar*.14,.24],[.14,.022,.012],[0,0,.5],'#eeb0bd');
      cone('token-security-lower-lance-tip','body',[0,.93,0],[.11,.55,.1],[0,0,Math.PI],'#8682ab');
      ring('token-security-lower-gold-collar','accent',[0,1.18,0],.103,[Math.PI/2,0,0],.028,'#d6d49e');
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
      ring(`token-gadget-shoulder-bearing-${side}`,'accent',[side*.59,2.17,.23],.135,[0,0,0],.024,accent);
      rod(`token-gadget-exposed-arm-piston-${side}`,'accent',[side*.62,2.07,.09],[side*.74,1.64,.17],.025,.022,accent);
      sphere(`token-gadget-elbow-ball-${side}`,'dark',[side*.73,1.6,.08],[.12,.12,.12],2,dark);
      for(let finger=0;finger<3;finger++)rod(`hand-${side}-token-gadget-separate-finger-${finger}`,'body',[side*.75+(finger-1)*.1,1.43,.25],[side*.75+(finger-1)*.1,1.3,.265],.04,.033,body);
      sphere(`token-gadget-knee-ball-${side}`,'dark',[side*.31,.78,.06],[.13,.13,.13],2,dark);
      plate(`token-gadget-shin-armored-sleeve-${side}`,'body',[[-.12,-.16],[.12,-.16],[.16,.18],[-.16,.18]],.15,[side*.33,.55,.13],undefined,body,.019);
    }
    for(const side of sides)for(const y of [1.78,2.13])sphere(`token-gadget-chest-fastener-${side}-${y}`,'body',[side*.23,y,.354],[.026,.026,.01],1,body);
    for(let vent=0;vent<3;vent++)box(`token-gadget-panel-vent-${vent}`,'dark',[0,1.9+vent*.06,.355],[.25,.016,.012],undefined,dark);
    box('token-gadget-head-antenna','accent',[0,3.14,0],[.06,.46,.06],undefined,accent);sphere('token-gadget-antenna-tip','eye',[0,3.39,0],[.09,.09,.09],1,eye);
    return true;
  }

  if(anatomy==='gear'||anatomy==='tank'){
    const compactEngine=code==='82556059'||variant==='engine';
    const synchronEngine=code==='62125439'||variant==='synchron-engine';
    if(compactEngine){
      // Engine Token's exact art has a compact crankcase, two dark cylinder
      // heads and looping red/blue wires. It does not have Synchron's V fins.
      plate('token-engine-compact-crankcase','body',[[-.59,-.315],[.59,-.315],[.59,.19],[.46,.315],[-.46,.315],[-.59,.19]],.62,[0,1.81,0],undefined,'#aab3b7',.032);
      plate('token-engine-front-flange','accent',[[-.62,-.22],[-.39,-.37],[.46,-.37],[.64,-.18],[.54,.29],[-.48,.29]],.12,[0,1.82,.34],undefined,'#a9afb1',.018);
      solid('token-engine-recessed-front-panel','dark',[[-.35,-.11],[.32,-.11],[.44,.1],[-.44,.1]],.019,[0,1.75,.413],undefined,'#576571');
      for(let bolt=0;bolt<8;bolt++){const a=bolt*Math.PI/4,x=Math.sin(a)*.48,y=1.82+Math.cos(a)*.25;sphere(`token-engine-front-bolt-${bolt}`,'body',[x,y,.435],[.048,.048,.018],2,'#626e77');rod(`token-engine-front-bolt-slot-${bolt}`,'dark',[x-.025,y,.453],[x+.025,y,.453],.006,.006,'#39444c');}
      for(const side of sides){
        box(`token-engine-dark-cylinder-head-${side}`,'dark',[side*.28,2.28,-.06],[.44,.37,.46],[0,side*.12,side*-.12],'#425462');
        rod(`token-engine-cylinder-port-${side}`,'body',[side*.28,2.16,.16],[side*.28,2.16,.4],.098,.098,'#8598a5');
        curve(`token-engine-metal-intake-hose-${side}`,'body',[[side*.28,2.16,.43],[side*.61,2.21,.48],[side*.76,1.92,.42],[side*.65,1.57,.44]],.085,'#8598a5',14);
        plate(`token-engine-upper-cylinder-cover-${side}`,'body',[[-.18,-.11],[.18,-.11],[.21,.13],[-.12,.18]],.018,[side*.28,2.29,.184],[0,side*.12,side*-.12],'#63717f',.014);
        ring(`token-engine-cylinder-hose-collar-${side}`,'accent',[side*.28,2.16,.405],.112,[0,0,0],.02,'#b4babb');
        box(`token-engine-wire-cable-tie-${side}`,'dark',[side*.51,1.195,.312],[.07,.14,.073],[0,0,side*.27],'#333945');
      }
      curve('token-engine-front-metal-outlet','body',[[.08,1.89,.45],[.12,1.58,.52],[.37,1.38,.5],[.62,1.43,.35]],.094,'#9baeb7',14);
      curve('token-engine-looping-red-wire','accent',[[-.43,1.81,-.22],[-.77,1.24,.07],[-.51,1.02,.32],[.43,1.03,.35],[.87,1.34,.17],[.54,1.78,-.04]],.033,'#bd5264',22);
      curve('token-engine-looping-blue-wire','accent',[[-.4,1.9,-.23],[-.7,1.28,.11],[-.41,1.1,.32],[.46,1.12,.31],[.81,1.42,.12],[.53,1.84,-.05]],.032,'#439abd',22);
      box('token-engine-top-black-vent','dark',[0,2.145,.045],[.64,.026,.19],undefined,'#26313b');
      for(let rib=0;rib<7;rib++)box(`token-engine-top-vent-crossbar-${rib}`,'accent',[-.26+rib*.087,2.161,.045],[.019,.018,.184],undefined,'#7d8b90');
      ring('token-engine-outlet-mouth-rim','body',[.633,1.43,.347],.099,[0,Math.PI/2,0],.025,'#aab7ba');
      sphere('token-engine-outlet-dark-bore','dark',[.644,1.43,.347],[.014,.07,.07],2,'#35444c');
    }else if(synchronEngine){
      // Synchron's source instead shows a tall, twin-cylinder V engine with
      // green cooling fins. These fixed angles follow its visible anatomy.
      sphere('token-synchron-rounded-crankcase','body',[0,1.39,0],[.57,.44,.37],1,'#89959d');
      ring('token-synchron-front-crankcase-rim','accent',[0,1.47,.349],.3,[0,0,0],.047,'#bac0bf');
      sphere('token-synchron-front-crankcase-disc','body',[0,1.47,.361],[.28,.28,.026],1,'#5b6c77');
      for(let bolt=0;bolt<6;bolt++){const a=bolt*Math.PI/3;sphere(`token-synchron-case-bolt-${bolt}`,'body',[Math.sin(a)*.37,1.46+Math.cos(a)*.28,.329],[.027,.027,.018],2,'#ccd0ce');}
      for(const side of sides){
        const angle=side*-.34;
        const finRotation=[0,0,angle];
        const finEuler=new THREE.Euler(...finRotation);
        const cylinderPosition=(height)=>new THREE.Vector3(0,height,0).applyEuler(finEuler).add(new THREE.Vector3(side*.23,1.65,-.08)).toArray();
        for(let fin=0;fin<7;fin++)box(`token-synchron-green-cooling-fin-${side}-${fin}`,'accent',cylinderPosition(.16+fin*.11),[.54,.044,.58],finRotation,'#307d69');
        box(`token-synchron-silver-cylinder-cap-${side}`,'body',cylinderPosition(.93),[.65,.23,.61],finRotation,'#b1b9b9');
        const cap=cylinderPosition(.93);
        plate(`token-synchron-stepped-cap-front-${side}`,'body',[[-.31,-.1],[.31,-.1],[.31,.1],[.12,.1],[.08,.035],[-.04,.035],[-.08,.1],[-.31,.1]],.03,[cap[0],cap[1],.244],finRotation,'#c1c7c5',.015);
        rod(`token-synchron-exposed-cylinder-rod-${side}`,'body',[side*.13,1.66,.265],cylinderPosition(.83).map((value,index)=>index===2?.265:value),.035,.035,'#b3beba');
        for(let collar=0;collar<3;collar++){const p=cylinderPosition(.22+collar*.22);rod(`token-synchron-pushrod-collar-${side}-${collar}`,'accent',[p[0],p[1]-.025,.265],[p[0],p[1]+.025,.265],.052,.052,'#a4aca9');}
        curve(`token-synchron-lower-exhaust-pipe-${side}`,'body',[[side*.15,1.13,.01],[side*.25,.91,.11],[side*.58,.99,.23]],.078,'#89999f',12);
      }
      curve('token-synchron-green-front-hose','accent',[[-.26,1.49,.43],[0,1.3,.49],[.25,1.48,.41]],.064,'#32866e',10);
      plate('token-synchron-machined-front-cover','body',[[-.2,-.14],[.2,-.14],[.24,.04],[.12,.2],[-.12,.2],[-.24,.04]],.025,[0,1.5,.389],undefined,'#9ba6a7',.009);
      rod('token-synchron-cover-central-stud','dark',[0,1.52,.401],[0,1.52,.452],.046,.04,'#535c60');
    }else{
      ring('token-gear-main-wheel','body',[0,1.65,0],.62,[0,0,0],.16,body);
      rod('token-gear-axle','dark',[0,1.65,-.45],[0,1.65,.58],.22,.22,dark);
      for(let tooth=0;tooth<14;tooth++){const a=tooth*Math.PI/7;box(`token-gear-square-tooth-${tooth}`,'body',[Math.sin(a)*.75,1.65+Math.cos(a)*.75,0],[.24,.24,.31],[0,0,-a],body);}
      spokes('token-gear-wheel-spoke','accent',[0,1.65,.21],.6,6,.051,accent);
      // A second pinion and its bearing are visible behind the large cog.
      rod('token-gear-front-hub','body',[0,1.65,.3],[0,1.65,.51],.37,.37,'#afb6b9');
      ring('token-gear-front-hub-machined-rim','accent',[0,1.65,.512],.332,[0,0,0],.028,'#d1d5d2');
      for(let bolt=0;bolt<6;bolt++){const a=bolt*Math.PI/3;sphere(`token-gear-front-bolt-${bolt}`,'dark',[Math.sin(a)*.24,1.65+Math.cos(a)*.24,.526],[.027,.027,.018],2,'#5b636a');}
      rod('token-gear-rear-pinion-body','body',[0,1.65,-.95],[0,1.65,-.58],.34,.34,'#8c979e');
      for(let tooth=0;tooth<10;tooth++){const a=tooth*Math.PI/5;box(`token-gear-rear-pinion-tooth-${tooth}`,'accent',[Math.sin(a)*.34,1.65+Math.cos(a)*.34,-.76],[.16,.16,.37],[0,0,-a],'#9ca8ad');}
      ring('token-gear-rear-bearing-collar','body',[0,1.65,-.539],.243,[0,0,0],.034,'#c0c7c7');
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
    box('token-block-brick-torso','body',[0,2.19,0],[.57,.6,.47],undefined,yellow);
    plate('token-block-yellow-hip-brick','body',[[-.27,-.19],[.27,-.19],[.36,.17],[.16,.29],[-.16,.29],[-.36,.17]],.39,[0,1.52,0],undefined,yellow,.014);
    box('token-block-black-segmented-waist','dark',[0,1.83,0],[.49,.28,.38],undefined,'#252c39');
    rod('token-block-red-neck-pivot','accent',[0,2.48,0],[0,2.61,0],.14,.14,red);
    for(const side of sides)for(let stud=0;stud<2;stud++)rod(`token-block-front-chest-stud-${side}-${stud}`,'body',[side*.14,2.08+stud*.2,.235],[side*.14,2.08+stud*.2,.29],.073,.073,'#e9cc56');
    for(const side of sides){
      box(`token-block-red-shoulder-${side}`,'accent',[side*.59,2.42,0],[.61,.49,.55],undefined,red);
      box(`upper-arm-${side}-token-block-blue`,'body',[side*.7,1.95,0],[.29,.58,.34],[0,0,side*.35],blue);
      box(`hand-${side}-token-block-yellow`,'body',[side*.85,1.54,.08],[.29,.24,.26],undefined,yellow);
      box(`token-block-green-thigh-${side}`,'body',[side*.26,1.23,0],[.33,.69,.34],[0,0,side*-.1],green);
      box(`token-block-red-boot-${side}`,'accent',[side*.32,.44,.09],[.38,.65,.45],undefined,red);
      for(let stud=0;stud<6;stud++)rod(`token-block-round-stud-${side}-${stud}`,'body',[side*.58+(stud%3-1)*.18,2.665,Math.floor(stud/3)*.21-.1],[side*.58+(stud%3-1)*.18,2.75,Math.floor(stud/3)*.21-.1],.064,.064,red);
      box(`upper-arm-${side}-token-block-green-elbow-brick`,'body',[side*.68,2.15,0],[.23,.22,.31],undefined,green);
      for(let finger=0;finger<4;finger++){
        box(`hand-${side}-token-block-finger-upper-${finger}`,'body',[side*.85+(finger-1.5)*.065,1.4,.14],[.054,.14,.092],[.14,0,side*.04],yellow);
        box(`hand-${side}-token-block-finger-lower-${finger}`,'body',[side*.85+(finger-1.5)*.065,1.295,.173],[.052,.08,.087],[.28,0,side*.04],yellow);
      }
      box(`hand-${side}-token-block-opposed-thumb`,'body',[side*.99,1.48,.2],[.075,.13,.11],[0,0,side*-.48],yellow);
      for(let stud=0;stud<4;stud++)rod(`token-block-red-shin-stud-${side}-${stud}`,'accent',[side*.32+(stud%2-.5)*.16,.28+Math.floor(stud/2)*.2,.317],[side*.32+(stud%2-.5)*.16,.28+Math.floor(stud/2)*.2,.367],.057,.057,red);
      for(let stud=0;stud<2;stud++)rod(`token-block-green-thigh-stud-${side}-${stud}`,'body',[side*.26,1.12+stud*.2,.18],[side*.26,1.12+stud*.2,.218],.065,.065,green);
    }
    for(const side of sides)for(const front of sides)rod(`token-block-head-stud-${side}-${front}`,'body',[side*.13,3.06,front*.11],[side*.13,3.17,front*.11],.075,.075,yellow);
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
      if(code==='13536607'||variant==='v-lan'){
        const armor='#3d9e99',seam='#8cd2c3',signal='#edadd7';
        const coilPoints=[[-1.15,.88,-.09],[-.62,.56,.06],[.38,.49,.13],[.98,.77,.01],[.98,1.11,-.21],[.44,1.36,-.24],[-.28,1.28,-.14],[-.38,1.55,.03],[0,1.86,.04]];
        taperedCurve('token-vlan-coiled-metal-serpent-body','body',coilPoints,.17,.223,armor,36,8);
        const coilPath=new THREE.CatmullRomCurve3(coilPoints.map(point=>new THREE.Vector3(...point)));
        for(let scale=0;scale<18;scale++){
          const t=scale/20,p=coilPath.getPoint(t),q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,0,1),coilPath.getTangent(t).normalize());
          const rotation=new THREE.Euler().setFromQuaternion(q).toArray().slice(0,3);
          part(`token-vlan-coiled-armor-course-${scale}`,new THREE.TorusGeometry(.224,.011,3,12),'accent',p.toArray(),undefined,rotation,seam);
        }
        cone('token-vlan-serpent-tail-point','body',[-1.24,.93,-.05],[.18,.44,.14],[0,0,-.9],armor);
        for(let branch=0;branch<3;branch++){
          const x=(branch-1)*.82,center=branch===1;
          sphere(`token-vlan-neck-base-collar-${branch}`,'body',[(branch-1)*.34,1.91,.02],[.25,.29,.21],2,armor);
          part(`token-vlan-neck-base-metal-lip-${branch}`,new THREE.TorusGeometry(.185,.04,4,16),'accent',[(branch-1)*.34,2.1,.025],undefined,[Math.PI/2,0,branch===0?.25:branch===2?-.25:0],seam);
          const neck=[[(branch-1)*.34,2.07,.02],[x*.74,2.34,-.08],[x*.98,2.7,-.02],[x,2.84,.01]];
          taperedCurve(`token-vlan-network-cable-${branch}`,'glow',neck,.128,.108,signal,20,8);
          taperedCurve(`token-vlan-network-light-filament-${branch}`,'eye',neck.map(p=>[p[0],p[1],p[2]+.09]),.012,.012,'#fce1f4',16,6);
          plate(`token-vlan-snake-head-${branch}`,'body',[[-.235,-.045],[.235,-.045],[.29,.11],[.2,.25],[-.12,.28],[-.3,.13]],.27,[x,2.98,.05],undefined,armor,.015);
          plate(`token-vlan-snake-crown-${branch}`,'accent',[[-.23,.07],[.2,.07],[.235,.17],[.07,.24],[-.22,.2]],.027,[x,2.98,.202],undefined,seam,.007);
          sphere(`token-vlan-snake-forehead-jewel-${branch}`,'eye',[x,3.14,.226],[.074,.046,.018],2,'#db639e');
          if(center||branch===2){
            plate(`token-vlan-snake-open-mouth-${branch}`,'dark',[[-.19,.02],[.18,.02],[.13,-.19],[-.13,-.19]],.015,[x,2.94,.211],undefined,'#26363f',.006);
            plate(`token-vlan-snake-lowered-jaw-${branch}`,'body',[[-.15,0],[.14,0],[.17,-.08],[0,-.14],[-.17,-.08]],.18,[x,2.79,.09],[-.18,0,0],armor,.011);
            for(const side of sides)cone(`token-vlan-snake-upper-fang-${branch}-${side}`,'body',[x+side*.115,2.92,.225],[.036,.15,.029],[0,0,Math.PI],'#d0e5d4');
            sphere(`token-vlan-snake-red-tongue-${branch}`,'accent',[x,2.815,.235],[.05,.045,.019],2,'#cc698f');
          }else curve(`token-vlan-snake-closed-jaw-line-${branch}`,'dark',[[x-.22,2.922,.193],[x,2.905,.206],[x+.22,2.922,.193]],.01,'#246466',12);
          for(const side of sides)sphere(`token-vlan-snake-eye-${branch}-${side}`,'eye',[x+side*.145,3.035,.218],[.036,.033,.014],2,'#e08fb7');
          sphere(`token-vlan-base-jewel-${branch}`,'eye',[(branch-1)*.34,1.98,.224],[.063,.063,.016],2,'#eb9acb');
        }
      }else if(anatomy==='network'){
        part('token-digital-polyhedral-core',new THREE.OctahedronGeometry(.72),'body',[0,1.78,0],[1,1.25,.78],undefined,body);
        for(let node=0;node<6;node++){const a=node*Math.PI/3,x=Math.sin(a)*.97,y=1.78+Math.cos(a)*.97;rod(`token-network-link-${node}`,'accent',[0,1.78,0],[x,y,0],.026,.026,accent);part(`token-network-node-${node}`,new THREE.OctahedronGeometry(.15),'eye',[x,y,0],[1,1,1],undefined,eye);}
      }else{
        part('token-digital-polyhedral-core',new THREE.OctahedronGeometry(.72),'body',[0,1.78,0],[1,1.25,.78],undefined,body);
        for(const side of sides)solid(`token-digital-angular-wing-${side}`,'accent',[[0,0],[side*.78,.24],[side*.41,-.33]],.07,[side*.19,1.77,0],undefined,accent);
        ring('token-polyhedron-floating-frame','glow',[0,1.78,0],1.05,[0,0,.25],.026,accent);
      }
    }
    return true;
  }

  if(anatomy==='ice'){
    if(code==='44308318'){
      // OP17-EN026 has two open hexagonal seals. It is not a cluster of
      // octahedral spikes. The empty center is genuine model geometry.
      for(const [seal,center,radius,angle]of[[0,[-.16,2.14,-.06],.84,-.17],[1,[.59,1.17,.37],.39,.15]]){
        const transform=new THREE.Matrix4().makeRotationZ(angle),gold='#c2cba1';
        const point=(r,a,z=0)=>new THREE.Vector3(Math.cos(a)*r,Math.sin(a)*r,z).applyMatrix4(transform).add(new THREE.Vector3(...center)).toArray();
        for(let edge=0;edge<6;edge++){
          const a=edge*Math.PI/3,b=(edge+1)*Math.PI/3;
          rod(`token-ice-barrier-hexagonal-outer-frame-${seal}-${edge}`,'body',point(radius,a),point(radius,b),.028,.028,gold);
          rod(`token-ice-barrier-hexagonal-inner-frame-${seal}-${edge}`,'accent',point(radius*.79,a,.021),point(radius*.79,b,.021),.013,.013,'#ece2b4');
          rod(`token-ice-barrier-corner-strut-${seal}-${edge}`,'body',point(radius*.79,a,.021),point(radius,a),.02,.02,gold);
          const tip=point(radius*1.18,a),base=point(radius*.94,a);
          const direction=new THREE.Vector3(...tip).sub(new THREE.Vector3(...base));
          const shard=new THREE.ConeGeometry(1,1,4);shard.scale(.069,direction.length(),.028);shard.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),direction.clone().normalize()));
          part(`token-ice-barrier-pointed-frame-corner-${seal}-${edge}`,shard,'body',new THREE.Vector3(...base).add(new THREE.Vector3(...tip)).multiplyScalar(.5).toArray(),undefined,undefined,gold);
        }
        // Thin ice facets surround the open seal; no opaque face covers its hole.
        const shape=new THREE.Shape();for(let corner=0;corner<6;corner++){const a=corner*Math.PI/3,x=Math.cos(a)*radius*1.11,y=Math.sin(a)*radius*1.11;corner?shape.lineTo(x,y):shape.moveTo(x,y);}shape.closePath();
        const hole=new THREE.Path();for(let corner=5;corner>=0;corner--){const a=corner*Math.PI/3,x=Math.cos(a)*radius*.73,y=Math.sin(a)*radius*.73;corner===5?hole.moveTo(x,y):hole.lineTo(x,y);}hole.closePath();shape.holes.push(hole);
        const ice=new THREE.ExtrudeGeometry(shape,{depth:.065,bevelEnabled:false,steps:1});ice.translate(0,0,-.052);
        part(`token-ice-barrier-translucent-hollow-seal-${seal}`,ice,'glow',center,[1,1,1],[0,0,angle],'#8edbea');
      }
      return true;
    }
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
    if(code==='27204312'){
      // OP12-EN026 depicts falling meteors and an incandescent impact. Its
      // background victims are not a documented humanoid Token anatomy.
      const rock='#29262b', ember='#e08435', lava='#f0bd53';
      const meteor=new THREE.IcosahedronGeometry(1,1), vertices=meteor.attributes.position;
      for(let vertex=0;vertex<vertices.count;vertex++){
        const x=vertices.getX(vertex),y=vertices.getY(vertex),z=vertices.getZ(vertex);
        const crag=1+.085*Math.sin(x*11+y*7+z*13)+.06*Math.cos(z*8-y*9);
        vertices.setXYZ(vertex,x*crag,y*crag,z*crag);
      }
      meteor.computeVertexNormals();
      part('token-primal-jagged-impact-meteor',meteor,'body',[0,1.84,.06],[.57,.71,.52],[0,0,-.38],rock);
      for(let crag=0;crag<5;crag++)part(`token-primal-black-fractured-crag-${crag}`,new THREE.TetrahedronGeometry(.25),'body',[Math.sin(crag*2.4)*.35,1.5+crag*.128,.24+Math.cos(crag*2.4)*.18],[.75,1.13,.8],[0,crag*.47,crag*.2],rock);
      for(let fissure=0;fissure<6;fissure++){
        const x=(fissure-2.5)*.16,y=1.93-Math.abs(fissure-2.5)*.08;
        taperedCurve(`token-primal-molten-rock-fissure-${fissure}`,'eye',[[x,y+.3,.413],[x+.06,y,.551],[x-.025,y-.21,.452]],.014,.005,ember,9,6);
      }
      for(let flame=0;flame<7;flame++){
        const a=flame*Math.PI*2/7, x=Math.sin(a)*.39,z=Math.cos(a)*.32;
        taperedCurve(`token-primal-rising-impact-flame-${flame}`,'accent',[[x,1.418,z],[x*1.15,1.905,z*1.2],[x*.92,2.574+(flame%3)*.14,z*1.13],[x*1.02,2.984+(flame%2)*.12,z]],.13,.002,ember,18,8,.42);
        taperedCurve(`token-primal-bright-impact-flame-core-${flame}`,'eye',[[x*.95,1.42,z*1.08],[x*1.03,1.908,z*1.24],[x*.87,2.506+(flame%2)*.14,z*1.16]],.053,.001,lava,12,6,.45);
      }
      ring('token-primal-incandescent-impact-ring','eye',[0,1.2,0],.81,undefined,.027,lava);
      for(let ray=0;ray<8;ray++){
        const a=ray*Math.PI/4;
        taperedCurve(`token-primal-radial-impact-crack-${ray}`,'eye',[[Math.sin(a)*.49,1.177,Math.cos(a)*.49],[Math.sin(a+.14)*.79,1.191,Math.cos(a+.14)*.79],[Math.sin(a-.06)*1.02,1.211,Math.cos(a-.06)*1.02]],.02,.003,ember,9,6);
      }
      return true;
    }
    const pillar=code==='82340057'||variant==='ceremonial-pillar';
    const coreMachine=code==='176393'||variant==='koa-ki-meiru';
    if(pillar){
      box('token-ceremonial-stone-pillar','body',[0,1.48,0],[.55,2.41,.43],undefined,body);
      for(let tier=0;tier<6;tier++)box(`token-ceremonial-block-course-${tier}`,'accent',[0,.45+tier*.35,.225],[.6,.044,.037],undefined,accent);
      solid('token-ceremonial-pointed-crown','body',[[-.27,0],[.27,0],[.22,.33],[0,.68],[-.22,.33]],.42,[0,2.64,0],undefined,body);
      sphere('token-ceremonial-red-seal','eye',[0,2.57,.248],[.085,.089,.028],1,eye);
    }else if(coreMachine){
      plate('token-koaki-core-machine','body',[[-.62,-.43],[.54,-.43],[.65,-.3],[.65,.36],[.4,.55],[-.44,.49],[-.65,.28]],.72,[0,1.88,0],undefined,'#2d8c87',.045);
      plate('token-koaki-alchemical-core-rim','accent',[[-.53,-.34],[.43,-.34],[.52,-.22],[.52,.27],[.34,.38],[-.34,.36],[-.52,.22]],.03,[0,1.9,.385],undefined,'#d3cb4d',.045);
      plate('token-koaki-alchemical-core','dark',[[-.43,-.26],[.35,-.26],[.41,-.16],[.41,.21],[.26,.28],[-.27,.27],[-.42,.16]],.02,[0,1.9,.411],undefined,'#26372d',.025);
      for(let ray=0;ray<3;ray++){const a=ray*Math.PI*2/3;curve(`token-koaki-yellow-seal-${ray}`,'eye',[[Math.sin(a)*.06,1.9+Math.cos(a)*.06,.435],[Math.sin(a)*.16,1.9+Math.cos(a)*.16,.435],[Math.sin(a+.5)*.25,1.9+Math.cos(a+.5)*.25,.435],[Math.sin(a+1.05)*.19,1.9+Math.cos(a+1.05)*.19,.435]],.022,'#ffc24a',13);}
      sphere('token-koaki-seal-central-dot','eye',[0,1.9,.435],[.039,.039,.018],2,'#ffcf4e');
      for(const side of sides){
        rod(`token-koaki-machine-leg-${side}`,'body',[side*.38,1.42,0],[side*.61,.5,.03],.17,.12,'#397f7d');
        plate(`token-koaki-machine-foot-${side}`,'body',[[-.23,0],[.23,0],[.21,.5],[.12,.69],[-.16,.63],[-.25,.28]],.44,[side*.61,.16,.02],undefined,'#2e807d',.025);
        sphere(`token-koaki-hip-ball-${side}`,'dark',[side*.42,1.24,0],[.2,.2,.2],2,'#303c3d');
        for(let arm=0;arm<2;arm++){
          const y=1.94-arm*.47,x=side*(.63+arm*.03),elbow=[side*(.94+arm*.13),y-.23,.07],wrist=[side*(1.03+arm*.11),y-.67,.13];
          sphere(`token-koaki-shoulder-${side}-${arm}`,'dark',[x,y,-.03],[.16,.16,.16],2,'#324b4b');
          rod(`token-koaki-bicep-${side}-${arm}`,'body',[x,y,-.03],elbow,.115,.12,'#397f7d');
          sphere(`token-koaki-elbow-${side}-${arm}`,'dark',elbow,[.135,.135,.135],2,'#374b4a');
          plate(`token-koaki-armored-gauntlet-${side}-${arm}`,'body',[[-.17,-.29],[.12,-.29],[.21,.14],[.09,.26],[-.16,.15]],.23,[wrist[0],wrist[1]+.16,.09],[0,0,side*.16],'#37978d',.024);
          curve(`token-koaki-gauntlet-gold-trace-${side}-${arm}`,'accent',[[wrist[0]-.09,wrist[1]-.02,.239],[wrist[0]-.1,wrist[1]+.3,.239],[wrist[0]+.06,wrist[1]+.34,.239]],.009,'#e0d861',12);
          sphere(`token-koaki-gauntlet-yellow-node-${side}-${arm}`,'eye',[wrist[0]+.035,wrist[1]+.08,.224],[.048,.048,.012],2,'#d5d05a');
        }
        for(let wire=0;wire<3;wire++){
          const offset=(wire-1)*.06;
          taperedCurve(`token-koaki-cable-${side}-${wire}`,'accent',[[side*.49,2.09,-.11+offset],[side*.92,2.43,-.12+offset],[side*1.04,2.98,-.03+offset],[side*.82,3.32,offset]],.022,.02,'#e07d3b',14,6);
          rod(`token-koaki-cable-frayed-wire-${side}-${wire}`,'body',[side*.82,3.32,offset],[side*(.69+wire*.037),3.38,offset+.03],.012,.008,'#c3c9d2');
        }
        taperedCurve(`token-koaki-lower-curled-cable-${side}`,'accent',[[side*.58,1.94,-.18],[side*1.31,2.07,-.19],[side*1.35,1.78,-.17],[side*1.11,1.76,-.09]],.031,.027,'#d47532',18,8);
        for(let node=0;node<3;node++)sphere(`token-koaki-chassis-side-node-${side}-${node}`,'accent',[side*.57,1.65+node*.22,.318],[.034,.034,.018],2,'#d4d450');
      }
      for(let wire=0;wire<4;wire++)taperedCurve(`token-koaki-high-neck-wire-${wire}`,'accent',[[(wire-1.5)*.051,2.35,-.04],[(wire-1.5)*.065,2.67,wire%2*.025],[(wire-1.5)*.044,2.9,.01]],.019,.019,'#de863a',12,6);
      rod('token-koaki-high-neck','dark',[0,2.36,-.065],[0,2.95,-.05],.08,.073,'#395c59');
      sphere('token-koaki-camera-metal-housing','body',[0,3.04,.02],[.28,.24,.2],2,'#399897');
      ring('token-koaki-camera-gold-lens-rim','accent',[0,3.04,.188],.18,[0,0,0],.029,'#d7d68a');
      sphere('token-koaki-camera-eye','eye',[0,3.04,.203],[.159,.159,.019],3,'#ece869');
      ring('token-koaki-camera-concentric-aperture','accent',[0,3.04,.226],.095,[0,0,0],.01,'#d1c254');
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
    if(code==='22411610'){
      // OP26-EN030 depicts a pitted, fractured burning stone, without eyes
      // or a smiling face. Its flame cage remains a solid 3D construction.
      const center=[0,1.41,.015],scale=[.67,.65,.62],shell=new THREE.DodecahedronGeometry(1,0);
      // Match the planar crust's face planes: a rounded subdivided core would
      // protrude through and hide all twelve externally visible crust plates.
      part('token-bomb-incandescent-stone-core',new THREE.DodecahedronGeometry(1,0),'accent',center,scale,undefined,'#d7a46a');
      const positions=shell.attributes.position;
      for(let panel=0;panel<12;panel++){
        const unique=new Map();
        for(let vertex=panel*9;vertex<panel*9+9;vertex++){
          const point=new THREE.Vector3().fromBufferAttribute(positions,vertex);unique.set(point.toArray().map(v=>v.toFixed(5)).join(','),point);
        }
        const centroid=[...unique.values()].reduce((sum,p)=>sum.add(p),new THREE.Vector3()).multiplyScalar(1/unique.size);
        const coords=[],uv=[];
        for(let vertex=panel*9;vertex<panel*9+9;vertex++){
          const point=new THREE.Vector3().fromBufferAttribute(positions,vertex).sub(centroid).multiplyScalar(.79).add(centroid).multiplyScalar(1.012);
          coords.push(point.x,point.y,point.z);uv.push(point.x*.5+.5,point.y*.5+.5);
        }
        const crust=new THREE.BufferGeometry();crust.setAttribute('position',new THREE.Float32BufferAttribute(coords,3));crust.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));crust.computeVertexNormals();
        part(`token-bomb-dark-pentagonal-crust-${panel}`,crust,'body',center,scale,undefined,panel%3?'#864224':'#ad6633');
      }
      shell.dispose();
      for(let flame=0;flame<8;flame++){
        const a=flame*Math.PI/4,x=Math.sin(a)*.56,z=Math.cos(a)*.47;
        taperedCurve(`token-bomb-rising-flame-${flame}`,'accent',[[x*.61,.93,z*.6],[x,1.44,z],[x*.8,2.08+(flame%3)*.15,z*.8],[x*.99,2.79+(flame%2)*.23,z*.9]],.13,.002,'#e8b46c',24,8,.48);
        taperedCurve(`token-bomb-bright-flame-rim-${flame}`,'eye',[[x*.57,.935,z*.66],[x*.98,1.437,z*1.04],[x*.79,2.03+(flame%3)*.15,z*.86]],.035,.001,'#f2d48a',16,6,.48);
      }
      for(const side of sides)taperedCurve(`token-bomb-curled-side-spark-${side}`,'accent',[[side*.71,1.32,.06],[side*.99,1.61,.04],[side*.93,2.16,.02],[side*1.09,2.37,.025]],.019,.001,'#e5a56e',24,6);
      return true;
    }
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
