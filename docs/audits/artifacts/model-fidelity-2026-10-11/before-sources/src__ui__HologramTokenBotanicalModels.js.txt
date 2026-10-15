import * as THREE from 'three';
import { createTokenGeometryTools } from './HologramTokenGeometry.js';

/** Construction-only, stylized Token anatomy. The caller owns all five batches. */
export function buildTokenBotanicalAnatomy(profile, helpers) {
  const { part, sphere, box, cone, ring, rod } = helpers;
  const { solid, curve, taperedPath, eyes, spokes } = createTokenGeometryTools(helpers);
  const anatomy = profile.tokenAnatomy;
  const code = String(profile.tokenCode || '');
  const variant = profile.tokenVisual?.variant || '';
  const body = profile.body || '#447e47';
  const accent = profile.accent || '#bdd286';
  const dark = profile.hair || '#27312a';
  const sides = [-1, 1];
  const leafOutline = [[0, 0], [-.21, .22], [-.29, .53], [-.2, .72], [0, 1], [.2, .72], [.29, .53], [.21, .22]];

  function leaf(name, position, size = 1, rotation = 0, tint = body, material = 'body', serrated = false) {
    const outline = serrated
      ? [[0, 0], [-.19, .17], [-.11, .23], [-.29, .39], [-.19, .45], [-.31, .6], [-.2, .66], [-.18, .78], [0, 1], [.18, .78], [.2, .66], [.31, .6], [.19, .45], [.29, .39], [.11, .23], [.19, .17]]
      : leafOutline;
    solid(name, material, outline.map(([x, y]) => [x * size, y * size]), .045, position, [0, 0, rotation], tint);
    const end = [position[0] - Math.sin(rotation) * size * .87, position[1] + Math.cos(rotation) * size * .87, position[2] + .031];
    rod(`${name}-midrib`, 'accent', [position[0], position[1], position[2] + .031], end, .014, .008, '#93b877');
    for (let vein = 1; vein < 4; vein += 1) for (const side of sides) {
      const y = size * (.15 + vein * .16), x = side * size * .16;
      const mid = [position[0] - Math.sin(rotation) * y, position[1] + Math.cos(rotation) * y, position[2] + .033];
      const tip = [position[0] + Math.cos(rotation) * x - Math.sin(rotation) * (y + .12 * size), position[1] + Math.sin(rotation) * x + Math.cos(rotation) * (y + .12 * size), position[2] + .033];
      rod(`${name}-vein-${side}-${vein}`, 'accent', mid, tip, .007, .005, '#73945a');
    }
  }

  function rootedStem(prefix, height = 1.9, tint = body) {
    curve(`${prefix}-curved-stem`, 'body', [[0, .13, 0], [-.16, .54, 0], [.12, 1.07, 0], [0, height, 0]], .068, tint, 12);
    for (const side of sides) curve(`${prefix}-root-${side}`, 'body', [[0, .17, 0], [side * .26, .09, .04], [side * .5, .12, .1]], .038, tint, 7);
  }

  function smile(prefix, y, z, width = .2, angry = false) {
    curve(`${prefix}-mouth`, 'dark', [[-width, y + (angry ? -.025 : .04), z], [0, y + (angry ? .07 : -.035), z + .025], [width, y + (angry ? -.025 : .04), z]], .014, '#644837', 8);
  }

  if (anatomy === 'flower') {
    const fluff = variant.startsWith('fluff') || variant === 'white-fluff' || ['15341822', '15341823', '36629636'].includes(code);
    const rose = variant === 'rose' || variant === 'regenerating-rose' || ['71645243', '31986289'].includes(code);
    if (fluff) {
      const white = variant === 'white-fluff';
      const fleece = white ? '#f1f0dd' : body;
      sphere('token-fluff-round-face', 'body', [0, 2, 0], [.62, .65, .53], 2, fleece);
      for (let tuft = 0; tuft < 42; tuft += 1) {
        const angle = tuft * 2.399963, y = 1 - 2 * (tuft + .5) / 42, radial = Math.sqrt(1 - y * y);
        const direction = new THREE.Vector3(Math.cos(angle) * radial, y, Math.sin(angle) * radial);
        const geometry = new THREE.ConeGeometry(1, 1, 5);
        geometry.scale(.055, .24, .05);
        geometry.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction));
        part(`token-fluff-fine-down-${tuft}`, geometry, 'accent', [direction.x * .63, 2 + direction.y * .66, direction.z * .54], undefined, undefined, white ? '#fffdf0' : accent);
      }
      eyes('token-fluff', { y: 2.19, z: .473, spread: .22, size: .105, white: true, tint: '#92442d' });
      const angry = variant === 'fluff-angry' || code === '15341822';
      if (angry) for (const side of sides) rod(`token-fluff-angry-brow-${side}`, 'dark', [side * .33, 2.35, .477], [side * .12, 2.29, .535], .025, .015, '#9d663a');
      smile('token-fluff', 1.9, .529, .14, angry);
      curve('token-fluff-fine-stalk', 'dark', [[0, 1.34, 0], [.025, .91, 0], [.1, .41, .02], [.32, .19, .04]], .023, '#788352', 14);
      leaf('token-fluff-tiny-leaf', [.27, .23, .08], .34, -1.05, '#788352');
      return true;
    }
    if (rose) {
      const regenerating = code === '31986289' || variant === 'regenerating-rose';
      rootedStem('token-rose', 1.88, body);
      if (regenerating) curve('token-rose-curled-root', 'body', [[0, .17, .04], [-.68, .22, .04], [-.89, .47, .04], [-.72, .7, .04], [-.57, .47, .04]], .055, body, 13);
      for (let thorn = 0; thorn < 8; thorn += 1) {
        const side = thorn % 2 ? -1 : 1;
        cone(`token-rose-sharp-thorn-${thorn}`, 'body', [side * .085, .36 + thorn * .18, .025], [.065, .18, .055], [0, 0, -side * 1.15], body);
      }
      for (const side of sides) {
        rod(`token-rose-leaf-branch-${side}`, 'body', [0, .95 + side * .2, 0], [side * .42, 1.08 + side * .24, .015], .033, .019, body);
        leaf(`token-rose-serrated-leaf-${side}`, [side * .31, 1.01 + side * .24, .02], regenerating ? .62 : .78, -side * .91, body, 'body', true);
      }
      sphere('token-rose-bloom-cup', 'accent', [0, 2.08, 0], [.57, .56, .35], 1, accent);
      for (let layer = 0; layer < 3; layer += 1) {
        const count = 6 - layer, innerRadius = [.24,.105,.014][layer], outerRadius = [.64,.44,.25][layer];
        for (let petal = 0; petal < count; petal += 1) {
          const center = petal / count * Math.PI * 2 + layer * .43;
          const positions = [], uvs = [], indices = [], edge = [];
          const angularSteps = 8, radialSteps = 4;
          for (let radial = 0; radial <= radialSteps; radial += 1) {
            const v = radial / radialSteps;
            for (let angular = 0; angular <= angularSteps; angular += 1) {
              const u = angular / angularSteps, a = center + (u-.5) * Math.PI*2/count*1.34;
              const radius = innerRadius + (outerRadius-innerRadius)*v*(.86+.14*Math.sin(u*Math.PI));
              const point = [Math.sin(a)*radius,Math.cos(a)*radius,.16+layer*.09+Math.sin(v*Math.PI)*.15+Math.pow(v,3)*.11*Math.sin(u*Math.PI)];
              positions.push(...point); uvs.push(u,v);
              if(radial===radialSteps)edge.push([point[0],point[1]+2.08,point[2]+.008]);
              if(radial<radialSteps && angular<angularSteps){const index=radial*(angularSteps+1)+angular;indices.push(index,index+1,index+angularSteps+1,index+1,index+angularSteps+2,index+angularSteps+1);}
            }
          }
          const geometry = new THREE.BufferGeometry();
          geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
          geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
          geometry.setIndex(indices);geometry.computeVertexNormals();
          part(`token-rose-layer-${layer}-folded-petal-${petal}`,geometry,'accent',[0,2.08,0],undefined,undefined,accent);
          curve(`token-rose-layer-${layer}-curled-petal-edge-${petal}`,'dark',edge,.012,'#781e32',10);
        }
      }
      curve('token-rose-spiral-heart', 'dark', [[.05,2.25,.535],[-.13,2.24,.54],[-.15,2.08,.545],[.03,2.01,.55],[.16,2.13,.54],[.08,2.28,.52]], .012, '#771f32', 18);
      for (const side of sides) leaf(`token-rose-sepal-${side}`, [side * .18, 1.81, -.07], .36, -side * 1.12, body);
      return true;
    }
    if (code === '28062326' || variant === 'plant') {
      sphere('token-plant-dark-face', 'dark', [0, 1.58, .03], [.35, .42, .27], 1, '#172719');
      sphere('token-plant-yellow-muzzle', 'eye', [0, 1.47, .267], [.23, .2, .085], 1, '#eed066');
      eyes('token-plant', { y: 1.77, z: .26, spread: .15, size: .045, pupil: false, tint: '#e8d260' });
      smile('token-plant', 1.48, .35, .11);
      sphere('token-plant-leaf-cap', 'body', [0, 2.09, 0], [.56, .37, .38], 1, body);
      for (let lock = 0; lock < 11; lock += 1) {
        const angle = lock / 11 * Math.PI * 2, side = Math.sin(angle);
        const outline = [[0,0],[-.22,-.23],[-.3,-.61],[-.2,-1.02],[0,-1.22],[.07,-.79],[.2,-.39]];
        const front = Math.cos(angle) >= 0, x = side*.39, z = Math.cos(angle)*.34;
        solid(`token-plant-long-leaf-hair-${lock}`, 'body', outline, .095, [x, 2.38, z], [0, front ? side*.2 : angle, side*.5], lock%3===0?'#62a833':body);
        curve(`token-plant-leaf-hair-rib-${lock}`, 'accent', [[x,2.35,z+.06],[x+side*.19,1.95,z+.09],[x+side*.35,1.57,z+.09]], .012, '#87be43', 7);
      }
      for(const side of sides)taperedPath(`token-plant-upswept-leaf-${side}`,'body',[[side*.29,2.19,.27],[side*.45,2.52,.3],[side*.4,2.83,.26]],.13,.012,body);
      for (const side of sides) {
        rod(`token-plant-small-leg-${side}`, 'dark', [side * .19, 1.23, 0], [side * .23, .5, .04], .1, .085, '#162824');
        sphere(`token-plant-blue-boot-${side}`, 'accent', [side * .3, .39, .2], [.22, .3, .29], 1, accent);
        ring(`token-plant-blue-boot-cuff-${side}`, 'accent', [side * .23, .77, .04], .13, undefined, .045, accent);
      }
      return true;
    }
    if (code === '62543394' || variant === 'lekunga') {
      sphere('token-lekunga-round-core', 'body', [0, 1.64, 0], [.61, .66, .43], 2, body);
      sphere('token-lekunga-single-red-iris', 'accent', [0, 1.7, .424], [.3, .33, .06], 2, accent);
      sphere('token-lekunga-single-pupil', 'dark', [0, 1.7, .49], [.13, .15, .028], 1, '#191d17');
      sphere('token-lekunga-eye-glint', 'eye', [.14, 1.88, .506], [.08, .084, .02], 1, '#fff7ed');
      for (let arm = 0; arm < 7; arm += 1) {
        const angle = arm / 7 * Math.PI * 2, dx = Math.sin(angle), dy = Math.cos(angle);
        const points = [[dx * .46,1.64 + dy * .49,-.01],[dx * .91,1.64 + dy * .87,0],[dx * 1.13 + dy * .18,1.64 + dy * 1.09,.03],[dx * .98 + dy * .3,1.64 + dy * 1.02,.06]];
        curve(`token-lekunga-curled-tentacle-${arm}`, 'body', points, .065, body, 12);
        const tip = points.at(-1);
        sphere(`token-lekunga-spiny-terminal-${arm}`, 'body', tip, [.13,.16,.13], 1, body);
        for (let thorn = 0; thorn < 5; thorn += 1) {
          const a = thorn / 5 * Math.PI * 2;
          cone(`token-lekunga-terminal-thorn-${arm}-${thorn}`, 'body', [tip[0] + Math.sin(a)*.115, tip[1] + Math.cos(a)*.135, tip[2] + .045], [.038,.13,.038], [0,0,-a], body);
        }
      }
      return true;
    }
    if (code === '82994510' || variant === 'horseytail') {
      const green = accent, cream = body;
      taperedPath('token-horseytail-long-stem', 'body', [[0,.71,0],[.13,1.06,0],[-.19,1.56,0],[-.25,2.21,0]], .26, .11, cream);
      sphere('token-horseytail-pale-head', 'body', [-.24,2.51,.01], [.32,.45,.24], 2, cream);
      sphere('token-horseytail-single-large-eye', 'eye', [-.35,2.62,.228], [.068,.088,.028], 1, '#d6b34f');
      sphere('token-horseytail-pupil', 'dark', [-.35,2.62,.258], [.032,.058,.018], 1, '#252518');
      smile('token-horseytail',2.38,.252,.18);
      for (const side of sides) {
        curve(`token-horseytail-long-leaf-arm-${side}`, 'accent', [[-.1,1.86,0],[side*.62,1.64,.02],[side*1.09,1.85,.03],[side*1.28,2.36,.03]], .043, green, 13);
        leaf(`token-horseytail-pointed-hand-${side}`, [side*1.04,1.9,.025], .76, -side*.29, green, 'accent', true);
        curve(`token-horseytail-curled-foot-${side}`, 'accent', [[side*.11,.88,0],[side*.39,.32,.03],[side*.56,.2,.08],[side*.69,.39,.09],[side*.54,.52,.09],[side*.45,.36,.09]], .045, green, 17);
        solid(`token-horseytail-pointed-collar-${side}`, 'accent', [[0,0],[side*.3,-.15],[side*.38,.09]], .055, [-.23,2.12,.09], undefined, green);
      }
      sphere('token-horseytail-red-scarf-knot','accent',[-.25,2.05,.22],[.1,.085,.065],1,'#b72c55');
      solid('token-horseytail-red-scarf-tail-left','accent',[[0,0],[-.17,.02],[-.54,-.43],[-.3,-.39]],.045,[-.25,2.05,.18],undefined,'#c4395c');
      solid('token-horseytail-red-scarf-tail-right','accent',[[0,0],[.14,.01],[.22,-.53],[.04,-.59]],.045,[-.25,2.05,.18],undefined,'#b72c55');
      return true;
    }
    // Native-only floral Tokens have no token artwork in the pinned API pool.
    rootedStem('token-flower', 1.81, body);
    for (const side of sides) leaf(`token-flower-leaf-${side}`, [side*.03,.77,.025], .7, -side*.93, body);
    const seraphim = variant === 'elfnote-seraphim';
    sphere('token-flower-pollen-heart','accent',[0,2.08,.08],[.25,.26,.17],2,accent);
    for (let petal = 0; petal < (seraphim ? 8 : 6); petal += 1) {
      const angle = petal / (seraphim ? 8 : 6) * Math.PI*2;
      solid(`token-flower-open-petal-${petal}`,'body',[[-.12,0],[-.24,.37],[-.16,.62],[0,.75],[.16,.62],[.24,.37],[.12,0]],.065,[Math.sin(angle)*.12,2.08+Math.cos(angle)*.12,.015],[0,0,-angle],body);
    }
    if (seraphim) for (const side of sides) leaf(`token-flower-seraphim-leaf-wing-${side}`,[side*.2,1.52,-.12],1.08,-side*.95,accent,'accent');
    return true;
  }

  if (anatomy === 'ivy') {
    const wicked = code === '12965762' || variant === 'wicked-plant';
    if (wicked) {
      for (let shoot = 0; shoot < 3; shoot += 1) {
        const x = (shoot-1)*.6, height = shoot === 1 ? 2.6 : 1.93;
        curve(`token-wicked-plant-ghost-stem-${shoot}`,'accent',[[x,.16,0],[x-.12,.79,0],[x+.08,1.32,0],[x,height-.27,0]],.041,accent,13);
        for (const side of sides) curve(`token-wicked-plant-skeletal-branch-${shoot}-${side}`,'accent',[[x,.67,0],[x+side*.27,1.02,.01],[x+side*.33,1.39,.01]],.025,accent,9);
        solid(`token-wicked-plant-ghost-leaf-face-${shoot}`,'body',[[-.21,0],[-.31,.23],[-.26,.44],[-.12,.52],[0,.36],[.12,.52],[.27,.45],[.31,.24],[.2,0],[0,-.12]],.12,[x,height-.27,.02],undefined,body);
        curve(`token-wicked-plant-curled-crown-${shoot}`,'body',[[x-.22,height+.1,.02],[x-.3,height+.26,.02],[x-.08,height+.32,.02],[x,height+.14,.02],[x+.14,height+.28,.02],[x+.31,height+.22,.02],[x+.24,height+.05,.02]],.026,body,13);
        for (const side of sides) curve(`token-wicked-plant-exposed-root-${shoot}-${side}`,'accent',[[x,.18,0],[x+side*.14,.065,.06],[x+side*.29,.11,.09]],.026,accent,7);
      }
    } else {
      rootedStem('token-ivy',1.75,body);
      for (const [i,x,y,rotation,size] of [[0,-.02,1.16,.98,.89],[1,.02,1.14,-.97,.84],[2,0,1.65,.02,.83]]) leaf(`token-ivy-broad-leaf-${i}`,[x,y,.025],size,rotation,body);
      for (const side of sides) curve(`token-ivy-fine-root-${side}`,'dark',[[0,.14,0],[side*.27,.085,0],[side*.53,.07,.035]],.018,dark,8);
    }
    return true;
  }

  if (anatomy === 'maize') {
    sphere('token-maize-golden-cob','body',[0,1.73,0],[.39,.87,.35],2,body);
    for (let row = 0; row < 10; row += 1) for (let column = 0; column < 8; column += 1) {
      const angle = column/8*Math.PI*2, radius = .33*Math.sqrt(1-Math.pow((row-4.5)/6,2));
      // Leave the illustrated face clear while retaining kernels all around.
      if (row >= 4 && row <= 6 && column >= 0 && column <= 1) continue;
      sphere(`token-maize-kernel-${row}-${column}`,'body',[Math.sin(angle)*radius,1.03+row*.15,Math.cos(angle)*radius],[.103,.082,.074],0,row%2?'#e3b94d':body);
    }
    for (const side of sides) {
      leaf(`token-maize-long-husk-${side}`,[side*.13,.85,.09],1.39,-side*.5,accent,'accent');
      curve(`token-maize-leaf-arm-${side}`,'accent',[[side*.26,1.57,.03],[side*.67,1.72,.03],[side*1.1,1.91,.04]],.055,accent,10);
      leaf(`token-maize-leaf-hand-${side}`,[side*.79,1.81,.02],.54,-side*1.4,accent,'accent',true);
      rod(`token-maize-leg-${side}`,'accent',[side*.2,.88,.04],[side*.42,.4,.13],.105,.08,'#c4a273');
      sphere(`token-maize-foot-${side}`,'accent',[side*.47,.28,.24],[.19,.13,.22],1,'#d5b583');
      curve(`token-maize-closed-eye-${side}`,'dark',[[side*.28,1.86,.335],[side*.2,1.92,.354],[side*.12,1.88,.37]],.018,'#66522a',8);
    }
    sphere('token-maize-open-smile','dark',[0,1.66,.355],[.235,.102,.04],1,'#8e3b25');
    box('token-maize-smile-teeth','accent',[0,1.695,.4],[.33,.048,.016],undefined,'#fff1c5');
    for (let silk = 0; silk < 6; silk += 1) curve(`token-maize-brown-silk-${silk}`,'dark',[[(silk-2.5)*.04,2.52,0],[(silk-2.5)*.05,2.82,-.015],[(silk-2.5)*.09+.1,3.03,.02]],.024,'#9f7536',9);
    return true;
  }

  if (anatomy === 'seed') {
    if (code === '74440056' || variant === 'needle') {
      for (let needle = 0; needle < 3; needle += 1) {
        const x = (needle-1)*.37;
        rod(`token-needle-thin-metal-shaft-${needle}`,'body',[x,.32,.04],[x+.16,2.12+needle*.23,-.04],.022,.014,body);
        sphere(`token-needle-small-head-${needle}`,'accent',[x+.16,2.12+needle*.23,-.04],[.038,.04,.038],1,accent);
        cone(`token-needle-sharp-tip-${needle}`,'body',[x-.012,.24,.044],[.022,.18,.022],[Math.PI,0,0],body);
      }
      return true;
    }
    if (code === '60406592' || variant === 'sinister-seed') {
      rootedStem('token-sinister-seed',1.64,body);
      for (const side of sides) {
        leaf(`token-sinister-seed-large-leaf-${side}`,[side*.01,1.23,.04],1.11,-side*1.15,body);
        leaf(`token-sinister-seed-low-leaf-${side}`,[side*.01,.56,.04],.83,-side*1.3,body);
      }
      leaf('token-sinister-seed-tall-leaf',[0,1.82,-.03],1.02,.04,body);
      for (let bloom = 0; bloom < 5; bloom += 1) {
        const x = (bloom-2)*.22, y = 1.72-Math.abs(bloom-2)*.13;
        sphere(`token-sinister-seed-red-bloom-${bloom}`,'accent',[x,y,.11],[.19,.15,.12],1,accent);
        for (let petal = 0; petal < 3; petal += 1) solid(`token-sinister-seed-drooping-petal-${bloom}-${petal}`,'accent',[[0,0],[-.1,-.2],[-.04,-.33],[.05,-.32],[.1,-.19]],.055,[x+(petal-1)*.065,y,.18],[0,0,(petal-1)*.3],accent);
      }
      return true;
    }
    const fiery = code === '38041941' || variant === 'seed';
    sphere('token-seed-ribbed-pod','body',[0,1.3,0],[.46,.67,.34],2,body);
    for(let ridge=0;ridge<7;ridge++){const angle=ridge/7*Math.PI*2;curve(`token-seed-pod-ridge-${ridge}`,'accent',[[Math.sin(angle)*.17,.72,Math.cos(angle)*.14],[Math.sin(angle)*.46,1.25,Math.cos(angle)*.35],[Math.sin(angle)*.25,1.87,Math.cos(angle)*.19]],.027,accent,9);}
    for(const side of sides){
      curve(`token-seed-root-arm-${side}`,'body',[[side*.34,1.64,0],[side*.68,1.92,.06],[side*.95,1.57,.13]],.066,body,11);
      for(let finger=0;finger<3;finger++) taperedPath(`token-seed-branch-finger-${side}-${finger}`,'body',[[side*.92,1.63,.11],[side*(1.01+finger*.05),1.41,.18],[side*(.98+finger*.12),1.21,.22]],.027,.01,body);
      leaf(`token-seed-lower-leaf-${side}`,[side*.1,.68,.03],.66,-side*.81,body);
    }
    if(fiery){
      solid('token-seed-fire-crown','accent',[[-.41,0],[-.49,.35],[-.25,.18],[-.16,.69],[.05,.42],[.22,1.02],[.39,.34],[.5,.51],[.38,0]],.1,[0,1.88,.01],undefined,'#d86b28');
      solid('token-seed-fire-heart','glow',[[-.22,0],[-.19,.27],[0,.58],[.2,.23],[.22,0]],.07,[0,1.92,.095],undefined,'#ffc95c');
    }else leaf('token-seed-sprout',[0,1.89,.01],.72,-.22,body);
    return true;
  }

  if (anatomy === 'ant') {
    sphere('token-ant-rear-abdomen','body',[0,.91,-.5],[.37,.43,.48],2,body);
    sphere('token-ant-narrow-thorax','body',[0,1.16,.15],[.23,.3,.37],1,body);
    sphere('token-ant-large-head','body',[0,1.5,.55],[.36,.34,.35],2,body);
    eyes('token-ant',{y:1.65,z:.826,spread:.19,size:.06,pupil:false,tint:profile.eye});
    for(const side of sides){
      curve(`token-ant-bent-antenna-${side}`,'body',[[side*.16,1.77,.62],[side*.31,2.08,.68],[side*.54,2.11,.72]],.028,body,10);
      sphere(`token-ant-antenna-tip-${side}`,'accent',[side*.54,2.11,.72],[.041,.043,.041],1,accent);
      solid(`token-ant-jagged-mandible-${side}`,'accent',[[0,.08],[side*.28,-.03],[side*.18,-.25],[side*.07,-.11]],.075,[side*.12,1.28,.827],[.15,0,0],accent);
      for(let leg=0;leg<3;leg++){
        const z=.43-leg*.43,knee=[side*(.76+leg*.065),.87,z+.12],foot=[side*(.96+leg*.14),.21,z+.34];
        rod(`token-ant-leg-${side}-${leg}-femur`,'body',[side*.19,1.1,z],knee,.055,.035,body);
        rod(`token-ant-leg-${side}-${leg}-tibia`,'body',knee,foot,.035,.014,body);
        rod(`token-ant-leg-${side}-${leg}-tarsus`,'dark',foot,[foot[0]+side*.13,.16,foot[2]+.05],.016,.01,dark);
      }
    }
    return true;
  }

  if (anatomy === 'spider') {
    sphere('token-spider-purple-abdomen','body',[0,1.18,-.27],[.47,.44,.51],2,body);
    sphere('token-spider-dark-thorax','dark',[0,1.1,.33],[.29,.25,.29],1,dark);
    sphere('token-spider-low-head','dark',[0,.97,.63],[.36,.17,.2],1,dark);
    for(let eye=0;eye<6;eye++) sphere(`token-spider-small-eye-${eye}`,'eye',[(eye-2.5)*.094,1.04-Math.abs(eye-2.5)*.011,.816],[.033,.037,.015],1,'#c6c6bc');
    for(const side of sides){
      for(let leg=0;leg<4;leg++){
        const z=.52-leg*.25,start=[side*.18,1.13,z],knee=[side*(.64+leg*.12),1.32,z-.18],ankle=[side*(1.07+leg*.12),.48,z+.22];
        taperedPath(`token-spider-leg-${side}-${leg}`,'dark',[start,knee,ankle,[side*(1.14+leg*.13),.16,z+.26]],.034,.006,dark);
      }
      curve(`token-spider-curled-fang-${side}`,'dark',[[side*.22,.94,.75],[side*.29,.8,.78],[side*.15,.74,.77]],.033,dark,8);
    }
    for(let stripe=0;stripe<4;stripe++)curve(`token-spider-abdomen-band-${stripe}`,'accent',[[-.35,1.05+stripe*.15,-.05],[0,1.1+stripe*.15,.1],[.35,1.05+stripe*.15,-.05]],.017,accent,8);
    const webCenter=[0,1.42,-.9];
    spokes('token-spider-web-radial','accent',webCenter,1.31,10,.008,'#dad9c4');
    for(let loop=0;loop<3;loop++){
      const points=[];for(let point=0;point<=10;point++){const a=point/10*Math.PI*2;points.push([Math.sin(a)*(.43+loop*.37),.13+Math.cos(a)*(.43+loop*.37),.015]);}
      // A tilted, static web behind the spider, lifted entirely above the ground.
      const lifted=points.map(([x,y,z])=>[x,1.36+(y-.13)*.8,z-.9]);
      curve(`token-spider-web-loop-${loop}`,'accent',lifted,.006,'#dad9c4',20);
    }
    return true;
  }

  if (anatomy === 'mantis') {
    sphere('token-mantis-long-abdomen','body',[0,1.19,-.18],[.21,.72,.22],2,body);
    rod('token-mantis-long-thorax','body',[0,1.4,.01],[0,2.13,.08],.11,.08,body);
    solid('token-mantis-triangular-head','body',[[-.35,.16],[.35,.16],[.17,-.15],[0,-.23],[-.17,-.15]],.22,[0,2.32,.09],undefined,body);
    for(const side of sides){
      sphere(`token-mantis-bulging-eye-${side}`,'eye',[side*.27,2.43,.196],[.1,.12,.07],1,profile.eye);
      curve(`token-mantis-fine-antenna-${side}`,'dark',[[side*.1,2.47,.06],[side*.16,2.73,.03],[side*.3,2.95,.05]],.012,dark,9);
      const elbow=[side*.54,1.88,.25],wrist=[side*.37,2.21,.4];
      rod(`token-mantis-raptorial-upper-arm-${side}`,'body',[side*.1,2.04,.05],elbow,.06,.055,body);
      rod(`token-mantis-folded-foreleg-${side}`,'accent',elbow,wrist,.082,.045,accent);
      cone(`token-mantis-curved-foreclaw-${side}`,'accent',[side*.34,2.3,.41],[.039,.27,.045],[0,0,side*.23],accent);
      for(let spine=0;spine<4;spine++)cone(`token-mantis-foreleg-spine-${side}-${spine}`,'accent',[side*(.49-spine*.034),1.97+spine*.062,.42],[.018,.09,.018],[0,0,side*.72],accent);
      for(let leg=0;leg<2;leg++)taperedPath(`token-mantis-walking-leg-${side}-${leg}`,'body',[[side*.13,1.18+leg*.34,-.08],[side*(.72+leg*.12),.93+leg*.18,-.14],[side*(.57+leg*.28),.17,.13-leg*.35]],.034,.012,body);
    }
    return true;
  }

  const emerging = code === '91512836' || variant === 'insect-monster';
  if (anatomy === 'beetle' || (anatomy === 'egg' && emerging)) {
    const centerY=emerging?2.12:1.34;
    sphere('token-beetle-green-armored-abdomen','body',[0,centerY,-.09],[.4,emerging?.56:.67,.37],2,body);
    sphere('token-beetle-round-head','body',[0,centerY-.11,.39],[.3,.28,.28],2,body);
    for(let ridge=0;ridge<4;ridge++)curve(`token-beetle-armored-ridge-${ridge}`,'accent',[[-.3,centerY-.28+ridge*.17,.2],[0,centerY-.21+ridge*.17,.303],[.3,centerY-.28+ridge*.17,.2]],.031,body,10);
    eyes('token-beetle',{y:centerY-.1,z:.63,spread:.17,size:.045,pupil:false,tint:profile.eye});
    for(const side of sides){
      for(let leg=0;leg<3;leg++){
        const y=centerY+.2-leg*.27,knee=[side*.63,y+.06,.03+leg*.1],tip=[side*.92,y+(leg===0?.34:-.19),.18+leg*.14];
        rod(`token-beetle-leg-${side}-${leg}-upper`,'body',[side*.3,y,-.03],knee,.067,.05,body);
        rod(`token-beetle-leg-${side}-${leg}-lower`,'body',knee,tip,.13,.076,body);
        cone(`token-beetle-leg-${side}-${leg}-ivory-claw`,'accent',[tip[0]+side*.025,tip[1]-.07,tip[2]+.09],[.06,.22,.06],[0,0,side*.7],'#f1efdb');
      }
      cone(`token-beetle-ivory-mandible-${side}`,'accent',[side*.2,centerY-.28,.53],[.045,.26,.055],[0,0,-side*.45],'#f1efdb');
    }
    if(emerging){
      const shell=new THREE.SphereGeometry(1,20,12,0,Math.PI*2,Math.PI*.38,Math.PI*.62);
      part('token-insect-monster-open-eggshell',shell,'accent',[0,1.18,0],[.72,1.02,.65],undefined,accent);
      for(let spot=0;spot<11;spot++){
        const angle=spot*2.399963,y=.38+(spot%4)*.24,radial=Math.sqrt(Math.max(.05,1-Math.pow((y-1.18)/1.02,2)));
        sphere(`token-insect-monster-brown-shell-cell-${spot}`,'dark',[Math.sin(angle)*.705*radial,y,Math.cos(angle)*.645*radial],[.12,.18,.035],1,'#812e27');
      }
      for(let crack=0;crack<8;crack++){
        const angle=crack/8*Math.PI*2;
        cone(`token-insect-monster-broken-shell-rim-${crack}`,'accent',[Math.sin(angle)*.64,1.56,Math.cos(angle)*.58],[.14,.25,.12],[0,0,-Math.sin(angle)*.3],accent);
      }
    }else{
      const moult=variant==='moult';
      curve('token-beetle-central-elytra-seam','dark',[[0,.77,.314],[0,1.43,.35],[0,1.93,.21]],.015,dark,10);
      if(!moult) taperedPath('token-beetle-forked-horn','accent',[[0,1.53,.58],[0,1.82,.69],[0,2.13,.61]],.072,.025,accent);
      for(const side of sides)curve(`token-beetle-jointed-antenna-${side}`,'body',[[side*.15,1.57,.47],[side*.28,1.92,.5],[side*.44,2.06,.47]],.02,body,10);
      if(moult) for(const side of sides)solid(`token-beetle-open-moult-elytron-${side}`,'accent',[[0,0],[side*.47,.1],[side*.65,.89],[side*.17,1.11]],.07,[side*.1,.88,-.27],[0,side*.3,0],accent);
    }
    return true;
  }

  if(anatomy==='worm'){
    sphere('token-worm-grub-core','body',[0,1.33,0],[.4,.83,.3],2,body);
    for(let segment=0;segment<6;segment++){
      const y=.68+segment*.21,radius=.29+Math.sin(segment/5*Math.PI)*.12;
      sphere(`token-worm-rounded-segment-${segment}`,'body',[0,y,0],[radius,.17,.31],1,body);
      curve(`token-worm-dark-segment-seam-${segment}`,'dark',[[-radius*.88,y+.08,.13],[0,y+.035,.302],[radius*.88,y+.08,.13]],.016,dark,9);
      for(const side of sides)cone(`token-worm-red-side-spine-${segment}-${side}`,'accent',[side*radius,y,.1],[.046,.15,.055],[0,0,-side*1.18],'#963b35');
    }
    sphere('token-worm-ivory-skull-head','accent',[0,2.02,.08],[.44,.39,.28],2,accent);
    for(const side of sides){
      sphere(`token-worm-deep-skull-eye-${side}`,'dark',[side*.19,2.09,.334],[.13,.13,.037],1,'#362b32');
      box(`token-worm-skull-tooth-${side}`,'accent',[side*.095,1.79,.34],[.125,.11,.06],undefined,'#b7bac2');
      curve(`token-worm-curled-feeler-${side}`,'dark',[[side*.17,2.34,.01],[side*.29,2.6,.025],[side*.36,2.81,.04]],.027,dark,10);
      for(let hook=0;hook<3;hook++)curve(`token-worm-side-hook-${side}-${hook}`,'dark',[[side*.35,1.06+hook*.36,-.07],[side*.64,1.2+hook*.36,-.03],[side*.74,1.41+hook*.36,.04]],.023,dark,9);
      curve(`token-worm-red-front-mark-${side}`,'accent',[[side*.23,1.6,.315],[side*.1,1.39,.324],[side*.21,1.06,.32],[side*.13,.77,.3]],.032,'#913b34',12);
    }
    return true;
  }
  return false;
}
