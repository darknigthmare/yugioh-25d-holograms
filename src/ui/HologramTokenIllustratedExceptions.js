import * as THREE from 'three';
import { createTokenGeometryTools } from './HologramTokenGeometry.js';

/** Four illustrated silhouettes, constructed once into the caller's shared batches. */
export function buildTokenIllustratedExceptions(profile, helpers) {
  const code = String(profile?.tokenCode || '');
  if (!['93912846', '49808197', '75732623', '8198621'].includes(code)) return false;
  const { part, sphere, box, cone, ring, rod } = helpers;
  const { solid, roundedSolid, curvedSheet, curve, taperedCurve, taperedPath } = createTokenGeometryTools(helpers);
  const body = profile.body, accent = profile.accent, eye = profile.eye;
  const sides = [-1, 1];

  if (code === '93912846') {
    sphere('token-gift-fiend-small-round-torso', 'body', [0, 1.24, 0], [.43, .54, .33], 2, body);
    sphere('token-gift-fiend-large-round-head', 'body', [0, 2.01, .01], [.48, .52, .39], 2, body);
    sphere('token-gift-fiend-brown-belly', 'accent', [0, 1.13, .31], [.31, .38, .071], 2, '#965a43');
    for (const side of sides) {
      sphere(`token-gift-fiend-blue-eye-${side}`, 'eye', [side * .235, 2.15, .35], [.12, .15, .041], 2, eye);
      sphere(`token-gift-fiend-purple-pupil-${side}`, 'dark', [side * .235, 2.15, .395], [.072, .097, .026], 1, '#403d7b');
      sphere(`token-gift-fiend-eye-reflection-${side}`, 'eye', [side * .235 - .024, 2.195, .422], [.028, .034, .012], 1, '#d5f6ff');
      sphere(`token-gift-fiend-bent-thigh-${side}`, 'body', [side * .36, .7, .035], [.27, .4, .27], 2, body);
      curve(`token-gift-fiend-bent-calf-${side}`, 'body', [[side*.4,.63,.01],[side*.47,.39,.03],[side*.31,.22,.17]], .13, body, 10);
      sphere(`token-gift-fiend-foot-${side}`, 'body', [side * .36, .2, .27], [.23, .12, .28], 1, body);
      for (let toe = 0; toe < 3; toe += 1) sphere(`token-gift-fiend-round-toe-${side}-${toe}`, 'body', [side*.36+(toe-1)*.125,.145,.46], [.084,.071,.14], 1, body);
    }
    // The arms cross the belly rather than hanging at the generic humanoid sides.
    curve('token-gift-fiend-crossed-left-arm', 'body', [[-.4,1.64,0],[-.57,1.4,.19],[-.1,1.4,.37],[.3,1.68,.39]], .135, body, 15);
    curve('token-gift-fiend-crossed-right-arm', 'body', [[.4,1.67,0],[.54,1.44,.24],[.06,1.49,.43],[-.33,1.72,.38]], .132, body, 15);
    for (const side of sides) for (let finger = 0; finger < 3; finger += 1) sphere(`token-gift-fiend-crossed-finger-${side}-${finger}`, 'body', [side*.33,1.65+finger*.06,.42+finger*.005], [.15,.037,.045], 1, body);
    curve('token-gift-fiend-wavy-mouth', 'dark', [[-.36,1.86,.308],[-.26,1.79,.362],[-.11,1.83,.382],[0,1.75,.395],[.16,1.8,.375],[.3,1.82,.342],[.35,1.9,.3]], .02, '#1d2024', 18);
    return true;
  }

  if (code === '49808197') {
    // These literal tints are visible in the local Token artwork; its registry
    // palette is still unspecified and otherwise inherits the neutral fallback.
    const fur = '#8b5b34', maneHighlight = '#b28653', purple = '#81748e', furShadow = '#36251e';
    sphere('token-metabo-furry-parasite-body', 'body', [0, 1.76, -.12], [.56, .6, .4], 2, fur);
    for (let lock = 0; lock < 13; lock += 1) {
      const angle = lock / 13 * Math.PI * 2, side = Math.sin(angle), z = Math.cos(angle) * .3 - .09;
      curvedSheet(`token-metabo-long-brown-mane-${lock}`, 'body', [[0,0],[-.16,-.19],[-.22,-.57],[-.17,-.93],[-.12,-1.24],[.05,-1.03],[.18,-.45],[.13,-.13]], .11, [side*.34,2.17,z], [0,Math.cos(angle)>=0?side*.19:angle,side*.41], lock%3===0?maneHighlight:fur);
      curve(`token-metabo-mane-strand-${lock}`, 'accent', [[side*.34,2.15,z+.062],[side*.53,1.8,z+.064],[side*.65,1.41,z+.058]], .011, maneHighlight, 7);
    }
    for (const side of sides) {
      for (const row of [-1, 1]) {
        const hip = [side*.38,1.48,row*.25-.06], knee = [side*(row===1?.73:.61),.83,row*.39-.05], ankle = [side*(row===1?1.04:.91),.22,row*.54+.02];
        taperedPath(`token-metabo-long-bent-leg-${side}-${row}`, 'dark', [hip,knee,ankle,[side*(row===1?1.35:1.16),.15,row*.58+.12]], .072, .014, furShadow);
      }
      sphere(`token-metabo-heavy-purple-head-lobe-${side}`, 'accent', [side*.215,2.27,.12], [.31,.26,.29], 2, purple);
      sphere(`token-metabo-dark-eye-opening-${side}`, 'dark', [side*.235,2.26,.381], [.22,.08,.024], 1, '#24202f');
      sphere(`token-metabo-sleepy-magenta-eye-${side}`, 'eye', [side*.235,2.251,.409], [.105,.025,.014], 1, '#bc67d4');
      curve(`token-metabo-heavy-lowered-eyelid-${side}`, 'accent', [[side*.43,2.28,.315],[side*.27,2.33,.382],[side*.1,2.285,.388]], .064, purple, 12);
      curve(`token-metabo-under-eye-fold-${side}`, 'accent', [[side*.44,2.23,.316],[side*.28,2.18,.389],[side*.11,2.225,.391]], .029, '#65596f', 9);
      taperedPath(`token-metabo-mouth-feeler-${side}`, 'accent', [[side*.12,2.04,.34],[side*.23,1.7,.44],[side*.17,1.42,.48]], .043, .006, '#918198');
    }
    curvedSheet('token-metabo-purple-crested-head', 'accent', [[-.12,-.07],[-.16,.26],[-.23,.48],[-.04,.36],[.1,.39],[.24,.29],[.17,0]], .21, [0,2.35,.14], undefined, purple);
    sphere('token-metabo-small-mouth', 'body', [0,2.01,.36], [.13,.14,.11], 1, '#be9762');
    rod('token-metabo-fine-long-proboscis', 'dark', [0,1.99,.48], [0,.19,.57], .018, .006, '#453823');
    solid('token-metabo-small-candle-flame', 'glow', [[-.07,0],[-.11,.17],[-.04,.35],[.01,.43],[.04,.25],[.11,.15],[.08,0]], .035, [-.2,2.84,.12], undefined, '#f4b54b');
    return true;
  }

  if (code === '75732623') {
    const blackMetal = '#28373b', paleSteel = '#d8e4e2', shadedSteel = '#60777b';
    const teeth = [];
    for (let point = 0; point < 32; point += 1) {
      const angle = point / 32 * Math.PI * 2, radius = point % 2 ? .68 : .85;
      teeth.push([Math.sin(angle)*radius,Math.cos(angle)*radius]);
    }
    solid('token-grinder-back-saw-crest', 'dark', teeth, .19, [0,2.33,-.19], undefined, blackMetal);
    sphere('token-grinder-stooped-metal-torso', 'body', [0,1.88,.095], [.49,.64,.4], 2, body);
    roundedSolid('token-grinder-forward-chest-plate', 'body', [[-.36,-.42],[-.43,.15],[-.24,.5],[.24,.5],[.43,.15],[.36,-.42],[0,-.49]], .16, [0,2.12,.42], [.23,0,0], body, .022);
    curve('token-grinder-left-head-harness', 'body', [[-.35,1.8,.45],[-.46,2.34,.4],[-.32,2.78,.26],[0,2.9,.16]], .07, shadedSteel, 13);
    curve('token-grinder-right-head-harness', 'body', [[.35,1.8,.45],[.46,2.34,.4],[.32,2.78,.26],[0,2.9,.16]], .07, shadedSteel, 13);
    // No exposed face or paired glowing eyes: the reference hides its head.
    for (const side of sides) {
      sphere(`token-grinder-high-round-shoulder-${side}`, 'body', [side*.56,2.31,.13], [.32,.34,.32], 2, body);
      const prefix = side === 1 ? 'upper-arm-1-token-grinder' : 'pincer-token-grinder-arm--1';
      rod(`${prefix}-upper`, 'body', [side*.56,2.24,.15], [side*.78,1.78,.2], .19,.17,body);
      sphere(`${prefix}-elbow`, 'dark', [side*.78,1.77,.2], [.2,.19,.18], 1, blackMetal);
      rod(`${prefix}-forearm`, 'body', [side*.78,1.77,.2], [side*.81,1.3,.37], .24,.24,body);
      ring(`${prefix}-wrist-cuff`, 'dark', [side*.81,1.36,.37], .24, undefined, .055, blackMetal);
      for(let rivet=0;rivet<3;rivet++)sphere(`${prefix}-cuff-rivet-${rivet}`,'accent',[side*.81+(rivet-1)*.12,1.5,.577],[.027,.027,.019],0,accent);
      rod(`token-grinder-thick-thigh-${side}`,'body',[side*.26,1.36,0],[side*.38,.89,side===1?.31:.2],.22,.21,body);
      sphere(`token-grinder-round-knee-${side}`,'dark',[side*.38,.87,side===1?.31:.2],[.22,.21,.22],1,blackMetal);
      rod(`token-grinder-heavy-shin-${side}`,'body',[side*.38,.85,side===1?.31:.2],[side*.39,.35,.1],.24,.25,body);
      box(`token-grinder-angular-boot-${side}`,'body',[side*.39,.26,.26],[.48,.27,.62],[0,side*.08,0],shadedSteel);
      ring(`token-grinder-ankle-rim-${side}`,'dark',[side*.39,.4,.12],.23,undefined,.04,blackMetal);
      for(let bolt=0;bolt<3;bolt++)sphere(`token-grinder-chest-bolt-${side}-${bolt}`,'accent',[side*.35,1.95+bolt*.2,.41],[.023,.023,.02],0,accent);
    }
    box('token-grinder-broad-waist-ring','dark',[0,1.42,.02],[.91,.16,.65],undefined,blackMetal);
    for(let spike=0;spike<5;spike++)cone(`token-grinder-waist-spike-${spike}`,'accent',[(spike-2)*.2,1.45,.35],[.047,.16,.051],[Math.PI/2,0,0],paleSteel);
    for(let spike=0;spike<4;spike++)cone(`gauntlet-1-token-grinder-spike-${spike}`,'accent',[.81+(spike%2?-.14:.14),1.64-Math.floor(spike/2)*.19,.44],[.065,.17,.065],[Math.PI/2,0,0],paleSteel);
    solid('sword-token-grinder-triangular-drill-outer','accent',[[-.23,0],[-.28,-.36],[0,-.86],[.28,-.36],[.23,0],[.08,-.28],[0,-.54],[-.08,-.28]],.13,[.81,1.24,.43],[.2,0,0],paleSteel);
    solid('sword-token-grinder-triangular-drill-center','body',[[-.068,0],[-.1,-.27],[0,-.66],[.1,-.27],[.068,0]],.17,[.81,1.24,.52],[.2,0,0],shadedSteel);
    const hook = [[-.99,1.31,.41],[-1.16,1.11,.44],[-1.06,.86,.45],[-.79,.81,.46],[-.59,1.01,.44],[-.68,1.22,.42]];
    taperedPath('pincer-token-grinder-angular-hook--1','body',hook,.1,.068,shadedSteel);
    cone('pincer-token-grinder-hook-tip--1','body',[-.7,1.25,.42],[.066,.2,.07],[0,0,.44],shadedSteel);
    const chain = [[-.33,2.74,.15],[-.47,2.57,.31],[-.47,2.36,.37],[-.38,2.14,.4],[.37,2.71,.1],[.48,2.53,.26],[.49,2.31,.32],[.36,2.1,.37],[-.05,1.25,-.04],[-.25,1.07,.01],[-.47,.98,.1]];
    for(let link=0;link<chain.length;link++)part(`token-grinder-hanging-chain-link-${link}`,new THREE.TorusGeometry(.095,.025,4,12),'dark',chain[link],[.75,1.13,1],[0,link%2?Math.PI/2:0,-.3],blackMetal);
    return true;
  }

  // Dark Soul is the armoured, green-marked apparition in the local artwork.
  const black = '#1e2825', green = '#3d6b3d';
  sphere('token-dark-soul-heavy-armored-torso','body',[0,1.96,0],[.57,.66,.39],2,body);
  roundedSolid('token-dark-soul-angular-front-armor','dark',[[-.34,.42],[-.16,.5],[.12,.43],[.35,.23],[.31,-.28],[.05,-.43],[-.21,-.36]],.12,[0,1.92,.35],[.08,0,-.07],black,.018);
  for(let layer=0;layer<3;layer++){
    curvedSheet(`token-dark-soul-twisted-chest-lamella-${layer}`,'body',[[-.33,.1],[-.06,.17],[.31,.04],[.28,-.1],[-.13,-.15],[-.35,-.04]],.055,[0,2.08-layer*.16,.43],[0,0,-.08-layer*.035],body,{camber:.063,curl:-.018});
  }
  sphere('token-dark-soul-crooked-helmet','body',[-.09,2.65,.035],[.31,.33,.29],2,body);
  curvedSheet('token-dark-soul-twisted-face-mask','dark',[[-.28,.19],[-.08,.28],[.22,.1],[.24,-.13],[.02,-.32],[-.18,-.2]],.115,[-.09,2.59,.32],[0,0,-.14],black);
  for(const side of sides){
    sphere(`token-dark-soul-red-eye-slit-${side}`,'eye',[side*.093-.09,2.655,.393],[.053,.018,.013],1,eye);
    sphere(`token-dark-soul-large-armored-shoulder-${side}`,'body',[side*.64,2.32,-.02],[.35,.32,.33],2,body);
    rod(`token-dark-soul-massive-upper-arm-${side}`,'body',[side*.67,2.23,0],[side*.85,1.84,.03],.23,.2,body);
    sphere(`token-dark-soul-elbow-armor-${side}`,'dark',[side*.85,1.85,.04],[.23,.23,.24],1,black);
    rod(`token-dark-soul-armored-forearm-${side}`,'body',[side*.85,1.83,.04],[side*.75,1.52,.22],.25,.28,body);
    sphere(`token-dark-soul-metal-fist-${side}`,'dark',[side*.73,1.49,.27],[.28,.22,.22],1,black);
    for(let finger=0;finger<3;finger++)box(`token-dark-soul-armored-knuckle-${side}-${finger}`,'body',[side*.73+(finger-1)*.13,1.51,.454],[.095,.13,.08],[0,0,side*.1],body);
    sphere(`token-dark-soul-red-chest-orb-${side}`,'eye',[side*.35,2.15,.347],[.098,.052,.04],1,eye);
    ring(`token-dark-soul-chest-orb-armor-${side}`,'body',[side*.35,2.15,.342],.117,[0,0,side*.2],.027,body);
    for(let marking=0;marking<3;marking++)curve(`token-dark-soul-green-armor-mark-${side}-${marking}`,'accent',[[side*(.25+marking*.18),2.43-marking*.12,.27],[side*(.37+marking*.17),2.54-marking*.14,.22],[side*(.48+marking*.14),2.42-marking*.17,.19]],.017,green,8);
  }
  for(let plate=0;plate<4;plate++)box(`token-dark-soul-belly-buckle-${plate}`,'body',[0,1.62+plate*.13,.422],[.23,.075,.04],[0,0,-.1],body);
  curvedSheet('token-dark-soul-floating-torn-left-haunch','body',[[-.48,.29],[-.02,.26],[.08,-.15],[-.15,-.35],[-.29,-.7],[-.43,-.51],[-.59,-.48],[-.65,-.12]],.28,[-.04,1.28,-.02],undefined,body);
  curvedSheet('token-dark-soul-floating-torn-right-haunch','body',[[-.09,.27],[.43,.23],[.53,-.18],[.29,-.53],[.23,-.79],[.04,-.67],[-.07,-.37]],.26,[.05,1.28,-.01],undefined,body);
  taperedPath('token-dark-soul-ragged-floating-tail','dark',[[.18,1.09,0],[.35,.67,.01],[.12,.33,.015],[.13,.13,.04]],.19,.014,black);
  for(const side of sides){
    curvedSheet(`token-dark-soul-curved-shoulder-sheath-${side}`,'body',[[0,.28],[side*.31,.17],[side*.37,-.18],[side*.2,-.34],[-side*.1,-.22]],.07,[side*.59,2.39,.12],[0,0,side*.16],body,{camber:.075,curl:.065});
    for(let ridge=0;ridge<3;ridge++)curve(`token-dark-soul-shoulder-shell-ridge-${side}-${ridge}`,'dark',[[side*(.48+ridge*.05),2.58-ridge*.055,.28],[side*(.68+ridge*.05),2.47-ridge*.09,.33],[side*(.78+ridge*.04),2.24-ridge*.045,.24]],.013,black,10);
    taperedCurve(`token-dark-soul-floating-coattail-${side}`,'body',[[side*.31,1.14,-.05],[side*.42,.85,-.025],[side*.29,.55,.04],[side*.46,.4,.12]],.08,.003,body,24,10,.53);
  }
  for(const side of sides)curvedSheet(`token-dark-soul-tattered-tail-edge-${side}`,'body',[[0,0],[side*.24,-.22],[side*.06,-.68],[-side*.075,-.3]],.07,[.18,.9,.04],[0,0,side*.1],body);
  return true;
}
