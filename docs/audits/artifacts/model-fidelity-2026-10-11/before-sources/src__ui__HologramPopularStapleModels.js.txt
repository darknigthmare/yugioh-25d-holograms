import * as THREE from 'three';

/** Exact illustrated identities; geometry remains an adaptation of a single JPEG. */
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
  const sides = [-1, 1];
  if (profile.anatomy === 'segmented-cyber-serpent') {
    // No wings, feet or dragon chest: the source is an armored continuous snake.
    const path = [[-.93,.35,-.12],[-1.05,.68,-.15],[-.85,1.02,-.15],[-.25,1.11,-.12],[.35,.84,.08],[.72,.5,.22],[.8,.29,.3],[.4,.22,.35],[-.16,.39,.42],[-.53,.77,.38],[-.57,1.18,.31],[-.27,1.58,.2],[.31,1.86,.13],[.73,2.13,.02],[.61,2.47,.03],[.1,2.62,.04],[-.28,2.83,.1],[-.26,3.15,.19]];
    for (let i = 0; i < path.length - 1; i++) {
      const radius = .17 + .13 * Math.sin((i + 2) / path.length * Math.PI);
      rod(`cyber-segment-${i}-dark-connector`, 'dark', path[i], path[i + 1], radius, radius);
      const a = new THREE.Vector3(...path[i]), b = new THREE.Vector3(...path[i + 1]);
      const start = a.clone().lerp(b, .035).toArray(), end = a.clone().lerp(b, .91).toArray();
      rod(`cyber-segment-${i}-silver-shell`, 'body', start, end, radius + .024, radius + .024, i % 3 === 0 ? '#d7e0e7' : '#aebecb');
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
    sphere('utopia-rear-number-plate','body',[0,2.92,-.38],[.43,.51,.065],1,pale);
    const strokes=[[-.19,3.19,-.12,3.26],[-.12,3.26,-.05,3.18],[-.05,3.18,-.12,3.1],[-.12,3.1,-.03,3.02],[-.03,3.02,-.13,2.96],[.13,3.19,.21,3.25],[.21,3.25,.27,3.14],[.27,3.14,.16,3.09],[.16,3.09,.13,3.19],[.27,3.14,.2,2.95]];
    strokes.forEach(([x1,y1,x2,y2],i)=>rod(`utopia-pink-39-stroke-${i}`,'accent',[x1,y1,-.46],[x2,y2,-.46],.027,.027,'#d44b83'));
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
    return true;
  }
  if (profile.anatomy === 'spring-kimono-child') {
    const cream='#f1dace', pale='#eeebf8', hair='#c9b7a2', dark='#6c646e';
    sphere('ash-child-face','body',[0,2.62,.16],[.34,.36,.27],1,cream);
    sphere('ash-rounded-bob-hair','dark',[0,2.71,-.005],[.43,.4,.3],1,hair);
    // Put the face over the bob; locks frame its front instead of hiding the eyes.
    sphere('ash-visible-face','body',[0,2.61,.265],[.3,.3,.14],1,cream);
    for(const side of sides) {
      sphere(`ash-brown-eye-white-${side}`,'body',[side*.115,2.635,.388],[.083,.085,.02],1,'#fff7e8');
      sphere(`ash-brown-eye-iris-${side}`,'eye',[side*.115,2.63,.408],[.052,.058,.018],1,'#ae7648');
      sphere(`ash-eye-highlight-${side}`,'eye',[side*.105,2.66,.427],[.016,.019,.007],0,'#ffffff');
      sphere(`ash-side-bob-lock-${side}`,'dark',[side*.3,2.57,.18],[.13,.27,.18],1,hair);
      for(let lock=0;lock<2;lock++) rod(`ash-hair-side-highlight-${side}-${lock}`,'body',[side*(.29+lock*.055),2.8,.21],[side*(.25+lock*.07),2.4,.23],.017,.008,'#e9d9bd');
      solid(`ash-pointed-pale-hair-tuft-${side}`,'body',[[-.15,0],[0,.38],[.15,0]],.07,[side*.3,2.95,-.02],[0,0,side*-.35],'#e7d8cf');
    }
    rod('ash-swept-center-fringe','dark',[-.24,2.95,.23],[.07,2.86,.36],.085,.025,hair);
    sphere('ash-open-smiling-mouth','dark',[.015,2.475,.407],[.052,.039,.013],1,'#74474e');
    sphere('ash-small-pink-tongue','accent',[.02,2.46,.42],[.032,.017,.007],0,'#eaa5a5');
    cone('ash-orange-hair-bow-left','accent',[-.17,3.04,.04],[.2,.36,.075],[0,0,-.65],'#df8753');
    cone('ash-orange-hair-bow-right','accent',[.12,3.07,.02],[.2,.35,.075],[0,0,.65],'#eea861');
    sphere('ash-orange-hair-bow-knot','accent',[-.025,3.015,.125],[.085,.07,.075],1,'#efac65');
    sphere('ash-dark-kimono-bodice','dark',[0,1.95,0],[.29,.43,.2],1,dark);
    solid('ash-crossed-kimono-collar','body',[[-.25,.15],[.09,-.22],[.22,-.13],[-.09,.23]],.03,[0,2.24,.175],undefined,pale);
    solid('ash-soft-pink-neck-scarf','accent',[[-.26,.14],[.26,.14],[.2,-.13],[.05,-.27],[-.23,-.05]],.06,[0,2.28,.235],undefined,'#e993ad');
    rod('ash-scarf-light-fold','body',[-.18,2.33,.28],[.17,2.27,.29],.022,.022,'#f4c6d6');
    rod('ash-orange-obi-belt','accent',[-.26,1.79,.11],[.26,1.79,.11],.083,.083,'#dd8b50');
    solid('ash-charcoal-obi-bow-left','dark',[[0,0],[-.35,.12],[-.3,-.21],[0,-.12]],.08,[-.03,1.75,.245],undefined,dark);
    solid('ash-charcoal-obi-bow-right','dark',[[0,0],[.35,.12],[.3,-.21],[0,-.12]],.08,[.03,1.75,.245],undefined,dark);
    sphere('ash-obi-front-knot','dark',[0,1.73,.32],[.095,.075,.055],1,dark);
    // Closed bell skirt and bell sleeves preserve the conspicuously loose kimono.
    part('ash-flared-white-kimono-skirt',new THREE.CylinderGeometry(.25,.48,.64,12,1,false),'body',[0,1.35,0],[1,1,.68],undefined,pale);
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
      part(side===1?'mage-glove-1-ash-large-sleeve':'ash-left-large-sleeve',new THREE.CylinderGeometry(.15,.33,direction.length(),12,1,false),'body',start.clone().add(end).multiplyScalar(.5).toArray(),[1,1,.67],rotation.toArray().slice(0,3),pale);
      sphere(side===1?'mage-hand-1-ash-small-hand':'ash-left-small-hand','body',[side*.96,1.84,.12],[.12,.085,.1],1,cream);
      rod(`ash-bare-child-leg-${side}`,'body',[side*.15,1.08,0],[side*.19,.64,.03],.105,.083,cream);
      rod(`ash-white-sock-${side}`,'body',[side*.19,.64,.03],[side*.21,.24,.08],.087,.066,'#f0e7e8');
      sphere(`ash-little-sandal-${side}`,'dark',[side*.21,.2,.17],[.11,.08,.19],1,'#bc8f7f');
      rod(`ash-pink-sandal-strap-${side}`,'accent',[side*.21-.06,.27,.15],[side*.21+.06,.27,.15],.026,.026,'#dc9c9b');
    }
    return true;
  }
  return false;
}
