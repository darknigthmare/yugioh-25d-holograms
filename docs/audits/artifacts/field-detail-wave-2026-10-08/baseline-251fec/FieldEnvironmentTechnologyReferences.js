/**
 * Technology scenery reconstructed after opening each preserved source JPG.
 * Only the visible apparatus, architecture and light structures are modeled.
 * Illustrated people, creatures and vehicles remain in the original artwork.
 */
export const TECHNOLOGY_CARD_LANDMARKS = Object.freeze({
  '36668118': 'boot-sector-open-red-rotor',
  '85668449': 'brain-lab-green-cylindrical-vat',
  '74378580': 'gmx-jungle-broken-concrete-lab',
  '63899465': 'rescue-hq-red-command-reactor',
  '42461852': 'cynet-storm-continuous-data-funnel',
  '22829942': 'fusion-recycling-searchlight-scrapyard',
  '37694547': 'geartown-interlocking-gear-buildings',
  '53039326': 'iron-core-orange-circuit-chamber',
  '28388296': 'scrap-factory-molten-vat-and-claw',
  '66399653': 'union-hangar-stacked-yellow-pods',
  '975299': 'zelos-receding-launch-chambers',
  '67328336': 'meklord-curved-dome-and-cyan-rings',
  '90351981': 'babel-tapered-spiral-organ-tower',
  '76136345': 'switchyard-radial-rails-and-turntable',
  '41418852': 'numeron-thorned-orange-network',
  '43034264': 'laser-qlip-floating-four-pillar-frame'
});

export const TECHNOLOGY_INSPECTED_ART_PROFILES = Object.freeze(Object.fromEntries([
  ['36668118', ['#647577','#b8c8c8','#2a4146','#76f8df','#b94e4c','#dcfff3'], ['open black circular rotor with toothed silver rim', 'red rectangular casing and projecting red axle', 'cyan discs and circuit seams on gray chamber walls']],
  ['85668449', ['#183930','#396c59','#0d2621','#5affe0','#172a25','#b0e9cb'], ['tall green cylindrical specimen vat with dark upper cap', 'curved laboratory walls covered in screens and round dials', 'hanging cables; brain and scientists remain in source art']],
  ['74378580', ['#7e9891','#c1cfcb','#366a4b','#b8e1d3','#514d3b','#e5eeea'], ['broken white concrete roof and rectangular wall slabs', 'exposed horizontal pipes beneath collapsed facade', 'dense palms, vines and rubble surrounding a small barred entrance']],
  ['63899465', ['#303f51','#d5e5e7','#295c7e','#55edff','#ca393b','#e6ffff'], ['red vertical command reactor with cyan windows and side cylinders', 'wide concentric black white yellow base', 'curved ring of transparent cyan monitor panels and thick yellow cables']],
  ['42461852', ['#182843','#244c87','#17a9bd','#72fff4','#691376','#daedff'], ['continuous cyan and magenta funnel twisting toward a narrow throat', 'curved white streaks and neon strands', 'hexagonal honeycomb patches and small green rectangular data fragments']],
  ['22829942', ['#29363e','#697776','#2d5960','#acccff','#4a4545','#edffc9'], ['brick recycling buildings and thin tall blue chimney', 'large slope of angular mechanical scrap', 'suspended round searchlights, blue motes and pale floating rings']],
  ['37694547', ['#655e4d','#b0abb0','#3d5254','#ffffb7','#8c683b','#ece4c8'], ['huge open toothed silver gears on building fronts', 'ochre cylindrical towers and narrow arched windows', 'vertical metal shafts, purple collars and yellow gear-shaped searchlight silhouettes']],
  ['53039326', ['#604b39','#ab8d52','#425658','#ffbf46','#3b3338','#ffdf9c'], ['octagonal orange laboratory walls with angular circuit tracks', 'hexagonal hanging core with downward orange cables', 'yellow circular central platform and dark monitor consoles; dragon and scientists remain in art']],
  ['28388296', ['#506168','#97aaac','#374b51','#ffad19','#c84817','#ffe757'], ['large circular molten orange vat with metal rim', 'red suspended two-jaw mechanical claw', 'serrated gray crusher plates joined by a horizontal shaft and hanging black cables']],
  ['66399653', ['#424c50','#ead398','#146047','#65f9aa','#b37c36','#fff2c8'], ['three stacked pale yellow cylindrical connector sections', 'alternating projecting ochre cubical display pods', 'green illuminated seams and angular dark chamber panels; enclosed creatures remain in art']],
  ['975299', ['#4e5856','#a8c5bf','#293d36','#89edbe','#665846','#d7faff'], ['receding rectangular gray launch frames and inset cyan chambers', 'large circular wall fittings', 'thin green crossing beams and fiery orange background; flying units remain in art']],
  ['67328336', ['#26394a','#bfcccb','#417477','#6afff6','#655668','#effbff'], ['smooth silver suspended dome with forked crown', 'large cyan elliptical lower ring with silver braces', 'three upward curved metallic prongs and magenta central infinity light']],
  ['90351981', ['#606674','#d5cb72','#5c7489','#eee7ad','#3d424c','#eff9ff'], ['tall tapering tower wrapped in climbing gold bands', 'dark diamond mesh between gold panels and vertical black slots', 'broad gray circular foundation in water and small pipe organ structures']],
  ['76136345', ['#73735c','#b3ada0','#565749','#ffe393','#a74a23','#e3e8d1'], ['circular recessed turntable with rusty bridge across its diameter', 'radial paired rails leading to rectangular engine sheds', 'red triangular bridge gantry, diagonal girder bracing and overhead spotlights; locomotives remain in art']],
  ['41418852', ['#742341','#c18572','#803a65','#ff51d9','#5d214e','#ffd893'], ['dense angular orange network ribs enclosing triangular and polygonal gaps', 'long dark pointed spires', 'pink glowing spheres and crystalline junctions; central black flowering figure remains in art']],
  ['43034264', ['#795199','#baaab9','#634966','#ee9ded','#674865','#ffe0b3'], ['floating silver and purple structure with four ribbed vertical pillars', 'pointed finials and thin curved upper connecting frame', 'long lavender curved rays behind structure; explosions remain in art']]
].map(([cardId, colors, motifs]) => [cardId, Object.freeze({
  cardId,
  sourceUrl: `https://images.ygoprodeck.com/images/cards_cropped/${cardId}.jpg`,
  motifs: Object.freeze(motifs),
  palette: Object.freeze({ ground: colors[0], stone: colors[1], foliage: colors[2], accent: colors[3], wood: colors[4], foam: colors[5] })
})])));

/** Same application-owned helpers and disposal contract as Nature/Architecture. */
export function createTechnologyReferenceGeometry(ctx) {
  const { THREE, profile, materials: m, material, geometry, add, block, beam,
    curvedTube, curvedDeck, radialSurface, cloudBank, box, rock, cone, cylinder, crown, ring, basinRim } = ctx;
  const id = profile.cardId;
  if (!Object.hasOwn(TECHNOLOGY_CARD_LANDMARKS, id)) return false;

  // Shared extruded toothed annulus: an actual open gear, not a painted disc.
  const gear = (innerRadius = 0.56) => geometry(`technology-open-spur-gear-${innerRadius}`, () => {
    const count = 96, positions = [], indices = [];
    for (let i = 0; i < count; i += 1) {
      const angle = i * Math.PI * 2 / count;
      const outer = i % 4 === 1 || i % 4 === 2 ? 1.12 : 0.97;
      for (const z of [-0.12, 0.12]) for (const r of [innerRadius, outer]) positions.push(Math.cos(angle) * r, Math.sin(angle) * r, z);
      const a = i * 4, b = ((i + 1) % count) * 4;
      for (const [u, v, w, q] of [[a,b,b+1,a+1],[a+2,a+3,b+3,b+2],[a+1,b+1,b+3,a+3],[a,a+2,b+2,b]]) {
        indices.push(u,v,w,u,w,q);
      }
    }
    const shape = new THREE.BufferGeometry();
    shape.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    shape.setIndex(indices); shape.computeVertexNormals();
    shape.userData.toothedAnnulus = Object.freeze({ teeth: 24, innerRadius });
    return shape;
  });
  const monitor = (name, x, y, z, width = 2, height = 1.2, screen = m.light) => {
    block(`${name}-frame`, m.dark, x, y, z, width + 0.28, height + 0.28, 0.3);
    block(`${name}-screen`, screen, x, y, z + 0.17, width, height, 0.025);
    for (let line = 0; line < 3; line += 1) block(`${name}-data-line`, m.stone,
      x - width * 0.08, y + height * (0.28 - line * 0.24), z + 0.2, width * (0.63 - line * 0.1), 0.035, 0.015);
  };
  const hexagon = (name, x, y, z, radius, mat = m.light) => {
    const points = Array.from({ length: 6 }, (_, i) => [x + Math.cos(i * Math.PI / 3) * radius, y + Math.sin(i * Math.PI / 3) * radius, z]);
    for (let i = 0; i < 6; i += 1) beam(name, points[i], points[(i + 1) % 6], mat, 0.055);
  };

  // World-space continuous shapes stay behind z=-19, or at the side of the
  // playable corridor. Curved paths use one physical buffer per visible curve.
  switch (id) {
    case '36668118': {
      const red = material('#ae484c', { metalness: 0.42 });
      block('boot-gray-chamber-wall', m.stone, 0, 8, -35, 31, 16, 0.7);
      block('boot-black-square-housing', m.dark, 0, 7.2, -28, 13, 13, 3.6);
      for (const side of [-1, 1]) {
        block('boot-red-casing-upright', red, side * 7, 7.4, -28.4, 1.9, 14.2, 4.2);
        block('boot-cyan-casing-inlay', m.light, side * 7, 7.4, -26.2, 0.18, 10.5, 0.05);
      }
      block('boot-red-upper-casing', red, 0, 14.5, -28.4, 15.8, 1.6, 4.2);
      add('boot-open-toothed-rotor', gear(0.86), m.stone, [0, 7.2, -25.95], [5.75, 5.75, 4.2]);
      add('boot-rotor-inner-rim', basinRim, m.stone, [0, 7.2, -25.4], [3.15, 3.15, 2]);
      for (let spoke = 0; spoke < 3; spoke += 1) {
        const a = spoke * Math.PI * 2 / 3;
        beam('boot-dark-rotor-spoke', [0,7.2,-25.5], [Math.cos(a)*4.7,7.2+Math.sin(a)*4.7,-25.5], m.dark, 0.55);
      }
      for (const y of [5.4, 9.2]) add('boot-cyan-port-disc', cylinder, m.light, [-2.2, y, -24.83], [0.95,0.08,0.95], [Math.PI / 2,0,0]);
      add('boot-projecting-red-axle', cylinder, red, [-6.8,7.5,-24], [0.75,7.3,0.75], [0,0,Math.PI / 2]);
      for (let panel = 0; panel < 8; panel += 1) {
        const x = -13 + panel * 3.7;
        block('boot-chamber-panel-seam', m.dark, x, 11.8, -34.55, 0.09, 6.5, 0.05);
        block('boot-cyan-wall-track', m.light, x + 1.4, 13.9 - panel % 2 * 2, -34.5, 2.55, 0.055, 0.05);
      }
      break;
    }
    case '85668449': {
      const glass = material('#22ce95', { transparent: true, opacity: 0.36, emissive:'#13835a', emissiveIntensity:0.4, roughness:0.2 });
      add('brain-lab-green-specimen-vat', cylinder, glass, [0,7.5,-29], [3.4,14,3.4]);
      for (const y of [0.4,14.5]) add('brain-lab-dark-vat-cap', cylinder, m.dark, [0,y,-29], [3.8,0.8,3.8]);
      for (const x of [-2.7,2.7]) block('brain-lab-vat-green-highlight', m.light, x,7.5,-27.1,0.08,12.8,0.08);
      for (let panel = 0; panel < 7; panel += 1) {
        const a = (panel / 6 - 0.5) * 2.25, x = Math.sin(a)*15, z = -28-Math.cos(a)*6;
        block('brain-lab-curved-control-wall', m.ground, x,7,z,4.3,14,0.5);
        monitor('brain-lab-green-oscilloscope',x,9.7,z+0.3,2.9,1.6);
        monitor('brain-lab-small-monitor',x,5.4,z+0.3,2.9,1.1);
        for (const offset of [-0.9,0,0.9]) add('brain-lab-round-control-dial', cylinder,m.stone,[x+offset,7.2,z+0.42],[0.25,0.04,0.25],[Math.PI/2,0,0]);
      }
      for (const side of [-1,1]) curvedTube('brain-lab-sagging-cable',m.dark,
        t=>[side*(3+t*10),15-Math.sin(t*Math.PI)*3.4,-29-t*3],()=>[0.08,0.08],32);
      break;
    }
    case '74378580': {
      const fracturedRoof=geometry('gmx-fractured-concrete-roof',()=>{
        const shape=new THREE.BoxGeometry(1,1,1,8,1,2),p=shape.attributes.position;
        for(let i=0;i<p.count;i+=1) if(p.getZ(i)>0.49) {
          const segment=Math.round((p.getX(i)+0.5)*8);
          p.setZ(i,p.getZ(i)-(segment%3===1?0.19:segment%3===2?0.065:0));
        }
        p.needsUpdate=true;shape.computeVertexNormals();shape.userData.fracturedEdge=true;return shape;
      });
      for (const side of [-1,1]) {
        block('gmx-broken-concrete-wall',m.stone,side*10,4.3,-29,3.7,8.6,6);
        add('gmx-broken-roof-slab',fracturedRoof,m.stone,[side*5.1,8.7,-30],[9,0.7,7],[0,side*0.08,side*-0.08]);
        for (let crack=0;crack<3;crack+=1) beam('gmx-exposed-rebar',[side*(4+crack*1.1),8.6,-26.3],[side*(4+crack*1.1),7.4,-25.8],m.metal,0.035);
        for (let rubble=0;rubble<5;rubble+=1) add('gmx-angular-concrete-rubble',rock,m.stone,
          [side*(8+rubble*1.45),0.5,-23-rubble*1.4],[1.25,0.6,1],[0,rubble*0.8,0]);
        for (let palm=0;palm<3;palm+=1) {
          const x=side*(12+palm*3.2),z=-26-palm*3;
          beam('gmx-palm-trunk',[x,0,z],[x+side*0.6,9+palm,z],m.wood,0.14);
          for (let leaf=0;leaf<5;leaf+=1) {
            const a=leaf*Math.PI*2/5;
            add('gmx-long-palm-leaf',cone,m.leaves,[x+Math.cos(a)*1.1,8.8+palm,z+Math.sin(a)*1.1],[0.35,4,0.14],[Math.sin(a)*1.1,0,-Math.cos(a)*1.1]);
          }
        }
      }
      for (const y of [5.5,6.5,7.5]) beam('gmx-exposed-horizontal-pipe',[-10,y,-26.4],[10,y,-26.4],m.metal,0.22);
      block('gmx-small-barred-entry-frame',m.stone,0,2.1,-25.2,6.5,4.2,2);
      block('gmx-dark-entrance',m.dark,0,1.8,-24.1,4.2,3.5,0.12);
      for (const x of [-1.5,-0.75,0,0.75,1.5]) beam('gmx-entry-yellow-bars',[x,0.4,-24],[x,3.6,-24],m.gold,0.045);
      for (const side of [-1,1]) curvedTube('gmx-roof-hanging-vine',m.leaves,
        t=>[side*(8+Math.sin(t*4)*0.3),8.8-t*7.3,-26+Math.sin(t*3)*0.25],()=>[0.055,0.055],28);
      break;
    }
    case '63899465': {
      const red=material('#bc383e',{metalness:0.45,roughness:0.4});
      for (const [y,r,h,mat] of [[0.3,9,0.6,m.dark],[0.75,7.7,0.3,m.stone],[1.1,5.6,0.5,m.metal],[2,3.1,1.2,red],[4.1,2.5,3.2,m.light],[6.2,3.6,1.4,red],[9.4,2.5,5,red]])
        add('rescue-hq-concentric-reactor-section',cylinder,mat,[0,y,-30],[r,h,r]);
      add('rescue-hq-top-warning-beacon',cone,m.gold,[0,12.5,-30],[1,1.8,1]);
      monitor('rescue-hq-cyan-command-screen',0,9.3,-27.42,2.6,2.2);
      for (const side of [-1,1]) {
        add('rescue-hq-horizontal-cyan-cylinder',cylinder,m.light,[side*5.5,5,-30],[1.3,4.8,1.3],[0,0,Math.PI/2]);
        for (const x of [3.5,7.4]) add('rescue-hq-red-cylinder-collar',cylinder,red,[side*x,5,-30],[1.5,0.65,1.5],[0,0,Math.PI/2]);
        curvedTube('rescue-hq-thick-yellow-cable',m.gold,
          t=>[side*(7.5+Math.sin(t*Math.PI)*3),5+t*10,-30-t*3],()=>[0.22,0.22],32);
      }
      const screen=material('#86e8f6',{transparent:true,opacity:0.44,emissive:'#38a9cb',emissiveIntensity:0.3,side:THREE.DoubleSide});
      for (let panel=0;panel<6;panel+=1) {
        const a=(panel/5-0.5)*2.4;
        add('rescue-hq-floating-cyan-display',box,screen,[Math.sin(a)*8.5,9,-30-Math.cos(a)*4.5],[3.7,3.3,0.04],[0,-a,0]);
        add('rescue-hq-yellow-base-inlay',box,m.gold,[Math.sin(a)*8,0.66,-30+Math.cos(a)*8],[0.35,0.05,1.7],[0,a,0]);
      }
      break;
    }
    case '42461852': {
      const magenta=material('#9b31c2',{emissive:'#7f159f',emissiveIntensity:0.45,side:THREE.DoubleSide});
      const cyan=material('#185d97',{emissive:'#127eac',emissiveIntensity:0.32,side:THREE.DoubleSide});
      const center=[0,0,-31];
      radialSurface('cynet-storm-continuous-twisted-funnel',cyan,(t,a)=>{
        const r=2.1+Math.pow(t,1.1)*11.8,turn=a+t*1.6;
        return [Math.cos(turn)*r,2+t*17+Math.sin(turn*3)*t*0.35,center[2]+Math.sin(turn)*r*0.65];
      },48,24);
      curvedTube('cynet-storm-magenta-helical-ribbon',magenta,
        t=>{const r=2.2+t*11.9,a=t*Math.PI*7;return[Math.cos(a)*r,2+t*17,-31+Math.sin(a)*r*0.65];},()=>[0.1,0.19],96);
      curvedTube('cynet-storm-white-helical-streak',m.paper,
        t=>{const r=2.4+t*12,a=t*Math.PI*4.8+1.1;return[Math.cos(a)*r,2+t*17.3,-31+Math.sin(a)*r*0.66];},()=>[0.035,0.06],72);
      for (const side of [-1,1]) for (let row=0;row<3;row+=1) for (let col=0;col<3;col+=1)
        hexagon('cynet-storm-side-honeycomb',side*(11.5+col*2.05),2.5+row*1.8+(col%2)*0.9,-29,1.12);
      for (let pixel=0;pixel<24;pixel+=1) block('cynet-storm-green-data-fragment',m.leaves,
        (pixel%2?1:-1)*(3+(pixel%7)*1.6),6+pixel%6*1.8,-30-(pixel%4),0.28+(pixel%3)*0.1,0.2,0.08);
      break;
    }
    case '22829942': {
      block('fusion-recycling-low-brick-building',m.ground,-11,3,-30,9,6,7);
      add('fusion-recycling-rounded-front-roof',cylinder,m.stone,[-11,6.1,-30],[4.7,0.8,3.8]);
      add('fusion-recycling-tall-thin-chimney',cylinder,m.metal,[-9,13,-33],[0.68,24,0.68]);
      block('fusion-recycling-blue-chimney-cap',m.light,-9,25.4,-33,1.05,1.4,1.05);
      curvedTube('fusion-recycling-elbow-pipe',m.metal,
        t=>[-14+Math.sin(t*Math.PI/2)*4,3+Math.cos(t*Math.PI/2)*4,-28],()=>[0.3,0.3],24);
      for (let piece=0;piece<32;piece+=1) {
        const row=piece%5,level=Math.floor(piece/5),x=6+row*1.7,z=-27-level*0.8;
        add('fusion-recycling-angular-scrap-slope',piece%3?box:rock,piece%2?m.stone:m.metal,
          [x,0.65+level*1.35,z],[1.1,1.05,1.1],[piece*0.61,piece*0.43,piece*0.29]);
        if(piece%4===0) add('fusion-recycling-discarded-open-gear',gear(),m.metal,[x,1.1+level*1.35,z+0.8],[0.85,0.85,1],[0,0,piece*0.4]);
      }
      for (const [x,y,z] of [[-16,15,-29],[13,20,-32],[8,10,-24]]) {
        add('fusion-recycling-floating-searchlight',cylinder,m.metal,[x,y,z],[0.7,0.65,0.7],[Math.PI/2,0,0]);
        add('fusion-recycling-searchlight-lens',cylinder,m.paper,[x,y,z+0.36],[0.51,0.04,0.51],[Math.PI/2,0,0]);
      }
      for (const y of [13,18]) add('fusion-recycling-pale-floating-ring',ring,m.light,[1,y,-34],[6,1.2,6],[Math.PI/2,0,0]);
      for (let mote=0;mote<16;mote+=1) add('fusion-recycling-blue-mote',crown,m.light,[-9+Math.sin(mote*2.3),15+mote*0.55,-33+Math.cos(mote)],[0.09,0.09,0.09]);
      break;
    }
    case '37694547': {
      for (const side of [-1,1]) {
        const x=side*11;
        add('geartown-ochre-cylindrical-tower',cylinder,m.wood,[x,5.5,-31],[3.6,11,3.6]);
        add('geartown-purple-collar',cylinder,m.stone,[x,10.5,-31],[3.9,0.65,3.9]);
        add('geartown-open-toothed-building-gear',gear(),m.stone,[side*6.5,9,-27],[5.2,5.2,3],[0,0,side*0.28]);
        beam('geartown-vertical-metal-shaft',[side*6.5,0.6,-25.9],[side*6.5,11,-25.9],m.metal,0.32);
        for (const y of [3,6,9]) {
          add('geartown-shaft-purple-collar',cylinder,m.stone,[side*6.5,y,-25.9],[0.55,0.3,0.55]);
          block('geartown-narrow-dark-arched-window',m.dark,x,y,-27.36,0.65,1.7,0.08);
        }
      }
      block('geartown-rear-brick-facade',m.ground,0,7,-35,19,14,2);
      for (const x of [-6,-2,2,6]) {
        add('geartown-golden-round-window-rim',basinRim,m.metal,[x,11,-33.9],[0.65,0.65,1]);
        add('geartown-yellow-window-pane',cylinder,m.light,[x,11,-33.85],[0.53,0.04,0.53],[Math.PI/2,0,0]);
        block('geartown-window-mullion',m.metal,x,11,-33.79,0.055,1.1,0.02);
      }
      for (const side of [-1,1]) add('geartown-rear-gear-silhouette',gear(),m.gold,[side*7,19,-35.3],[2.4,2.4,1]);
      break;
    }
    case '53039326': {
      const orange=material('#d5842f',{emissive:'#99430c',emissiveIntensity:0.35});
      block('iron-core-orange-rear-wall',orange,0,7.7,-35,25,15.4,0.6);
      for (const side of [-1,1]) {
        block('iron-core-chamber-side-wall',m.ground,side*13,7,-30,0.7,14,10);
        for (let track=0;track<4;track+=1) {
          const x=side*(1.6+track*2.6),y=2+track*2.2;
          const points=[[x,0.7,-34.62],[x,y,-34.62],[x+side*0.9,y+0.9,-34.62],[x+side*0.9,13.8,-34.62]];
          for(let k=1;k<points.length;k+=1) beam('iron-core-angular-wall-trace',points[k-1],points[k],m.gold,0.065);
        }
        block('iron-core-console-body',m.dark,side*8.8,2.4,-24.5,4.2,3,2.2);
        monitor('iron-core-console-screen',side*8.8,4.1,-23.6,3.2,1.5);
      }
      add('iron-core-yellow-platform',cylinder,m.gold,[0,0.4,-29],[4.6,0.8,4.6]);
      const hex=geometry('iron-core-hexagonal-device',()=>new THREE.CylinderGeometry(1,1,1,6));
      add('iron-core-suspended-hexagonal-probe',hex,m.metal,[0,14,-30],[2,1.25,2],[Math.PI/2,0,0]);
      hexagon('iron-core-orange-hexagonal-outline',0,14,-29.3,1.6,m.gold);
      add('iron-core-central-probe-light',cylinder,m.gold,[0,14,-29.25],[0.65,0.1,0.65],[Math.PI/2,0,0]);
      for (const side of [-1,1]) curvedTube('iron-core-descending-orange-cable',m.gold,
        t=>[side*(1.1+Math.sin(t*Math.PI)*0.75),13.5-t*7.6,-30+Math.sin(t*Math.PI)*0.9],()=>[0.07,0.07],32);
      break;
    }
    case '28388296': {
      const orange=material('#bd4220',{metalness:0.3});
      const shell=geometry('scrap-factory-open-vat-shell',()=>new THREE.CylinderGeometry(1,1,1,32,1,true));
      add('scrap-factory-molten-vat-shell',shell,m.metal,[0,1.5,-30],[8.5,3,8.5]);
      add('scrap-factory-molten-surface',cylinder,m.lava,[0,2.85,-30],[8.05,0.055,8.05]);
      add('scrap-factory-thick-vat-rim',basinRim,m.stone,[0,3.15,-30],[8.5,8.5,3.8],[Math.PI/2,0,0]);
      for (const side of [-1,1]) {
        const plate=geometry('scrap-factory-serrated-crusher',()=>{
          const s=new THREE.BoxGeometry(1,1,1,1,12,1),p=s.attributes.position;
          for(let i=0;i<p.count;i+=1) if(p.getX(i)>0) p.setX(i,p.getX(i)+(Math.round((p.getY(i)+0.5)*12)%2)*0.13);
          p.needsUpdate=true;s.computeVertexNormals();s.userData.serratedProfile=true;return s;
        });
        add('scrap-factory-serrated-crusher-plate',plate,m.stone,[side*12,8,-33],[2.5,15,2],[0,side<0?Math.PI:0,0]);
      }
      beam('scrap-factory-horizontal-crusher-shaft',[-13,9,-32],[13,9,-32],m.metal,0.4);
      add('scrap-factory-red-claw-pivot',cylinder,orange,[0,12,-28],[1.05,0.65,1.05],[Math.PI/2,0,0]);
      beam('scrap-factory-red-suspension',[0,18,-28],[0,12,-28],orange,0.45);
      for (const side of [-1,1]) curvedTube('scrap-factory-continuous-claw-jaw',orange,
        t=>[side*(0.7+Math.sin(t*Math.PI)*1.35),12-t*4.7,-28],t=>[0.35-t*0.17,0.3-t*0.12],32);
      for(const side of [-1,1]) curvedTube('scrap-factory-drooping-dark-cable',m.dark,
        t=>[side*(4+t*9),17-Math.sin(t*Math.PI)*3,-34],()=>[0.055,0.055],24);
      break;
    }
    case '66399653': {
      const ochre=material('#bf8d47',{metalness:0.24});
      for(let tier=0;tier<3;tier+=1) {
        const y=2.5+tier*4.6,side=tier%2?-1:1;
        add('union-hangar-yellow-connector-drum',cylinder,m.stone,[0,y,-31],[2.7,4.4,2.7]);
        for(const offset of [-2,2]) add('union-hangar-green-drum-ring',basinRim,m.light,[0,y+offset,-31],[2.8,2.8,1.6],[Math.PI/2,0,0]);
        block('union-hangar-ochre-display-pod',ochre,side*4,y,-29.2,5.4,3.7,4.6);
        block('union-hangar-dark-pod-recess',m.dark,side*4,y,-26.84,4.5,2.9,0.08);
        for(const edge of [-1,1]) block('union-hangar-green-pod-indicator',m.light,side*4+edge*2.35,y,-26.73,0.32,0.25,0.05);
        for(const x of [-1.5,1.5]) block('union-hangar-pod-frame-trim',m.stone,side*4+x,y,-26.68,0.09,2.9,0.05);
      }
      block('union-hangar-gray-rear-wall',m.ground,0,8,-36,25,16,0.5);
      for(let panel=0;panel<7;panel+=1) {
        const x=-11+panel*3.6;
        block('union-hangar-dark-wall-panel',m.dark,x,8,-35.65,3.35,15,0.12);
        for(const y of [3,7.5,12]) block('union-hangar-wall-green-seam',m.light,x,y,-35.5,2.65,0.055,0.035);
      }
      break;
    }
    case '975299': {
      for(let frame=0;frame<3;frame+=1) {
        const z=-23-frame*7,w=15-frame*1.8,h=15-frame*1.2;
        for(const side of [-1,1]) {
          block('zelos-receding-gray-frame-upright',m.stone,side*w/2,h/2,z,1,h,1.6);
          block('zelos-green-frame-edge',m.light,side*(w/2-0.56),h/2,z+0.85,0.075,h-1,0.03);
          add('zelos-circular-wall-port',cylinder,m.metal,[side*(w/2-1.7),h/2,z],[1.1,0.3,1.1],[Math.PI/2,0,0]);
          add('zelos-cyan-port-lens',cylinder,m.light,[side*(w/2-1.7),h/2,z+0.18],[0.8,0.04,0.8],[Math.PI/2,0,0]);
        }
        for(const y of [0.4,h]) {
          block('zelos-launch-frame-lintel',m.stone,0,y,z,w+1,0.8,1.6);
          block('zelos-lintel-cyan-inset',m.light,0,y,z+0.85,w-2,0.07,0.035);
        }
      }
      for(const side of [-1,1]) for(let beamIndex=0;beamIndex<3;beamIndex+=1) beam('zelos-crossing-green-beam',
        [side*12,3+beamIndex*5,-25],[-side*10,5+beamIndex*3,-39],m.light,0.028);
      block('zelos-dark-rear-chamber',m.dark,0,6,-42,11,12,0.5);
      break;
    }
    case '67328336': {
      radialSurface('meklord-smooth-silver-dome',m.stone,(t,a)=>{
        const r=5.7*Math.sin(t*Math.PI/2);return[Math.cos(a)*r,14.7-Math.pow(t,1.4)*4.8,-31+Math.sin(a)*r];
      },48,20);
      add('meklord-cyan-dome-underlight',basinRim,m.light,[0,9.8,-31],[5.5,5.5,2.4],[Math.PI/2,0,0]);
      add('meklord-lower-silver-elliptical-ring',basinRim,m.stone,[0,4.7,-31],[8.5,5.6,3],[Math.PI/2,0,0]);
      add('meklord-lower-cyan-ring-inlay',basinRim,m.light,[0,4.86,-31],[8.1,5.2,1.2],[Math.PI/2,0,0]);
      for(const side of [-1,1]) {
        curvedTube('meklord-upward-curved-silver-prong',m.stone,
          t=>[side*(9.2-Math.sin(t*Math.PI)*1.1),1+t*17.3,-31-Math.sin(t*Math.PI)*2.5],t=>[0.35-t*0.23,0.28-t*0.17],48);
        beam('meklord-dome-side-brace',[side*7,4.7,-31],[side*4.8,11,-31],m.metal,0.22);
        add('meklord-forked-crown-prong',cone,m.stone,[side*0.8,17,-31],[0.35,2.4,0.35],[0,0,side*-0.3]);
      }
      add('meklord-crown-neck',cylinder,m.stone,[0,15.6,-31],[1.1,1.8,1.1]);
      const pink=material('#e846b7',{emissive:'#c9259e',emissiveIntensity:0.7});
      for(const side of [-1,1]) add('meklord-magenta-infinity-loop',ring,pink,[side*0.82,7.4,-30.85],[1.05,0.67,1],[0,0,side*0.25]);
      break;
    }
    case '90351981': {
      radialSurface('babel-continuous-tapered-tower',m.leaves,(t,a)=>{
        const r=7.2-t*3.8;return[Math.cos(a)*r,1.8+t*24,-32+Math.sin(a)*r];
      },48,24);
      for(const y of [0.5,1.3]) add('babel-broad-gray-foundation',cylinder,m.ground,[0,y,-32],[8.5-y*0.45,0.8,8.5-y*0.45]);
      const spiral=t=>{const a=t*Math.PI*8,r=7.45-t*3.8;return[Math.cos(a)*r,2+t*23.5,-32+Math.sin(a)*r];};
      const ribbon=geometry('babel-continuous-wide-gold-ribbon',()=>{
        const positions=[],indices=[],curve=[],segments=128;
        for(let i=0;i<=segments;i+=1) {
          const t=i/segments,a=t*Math.PI*8,point=spiral(t);curve.push(Object.freeze(point));
          for(const radial of [-0.16,0.16]) for(const vertical of [-0.95,0.95])
            positions.push(point[0]+Math.cos(a)*radial,point[1]+vertical,point[2]+Math.sin(a)*radial);
          if(i===segments) continue;
          const n=i*4,k=n+4;
          for(const [u,v,w,q] of [[n,k,k+1,n+1],[n+2,n+3,k+3,k+2],[n+1,k+1,k+3,n+3],[n,n+2,k+2,k]]) indices.push(u,v,w,u,w,q);
        }
        const shape=new THREE.BufferGeometry();shape.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
        shape.setIndex(indices);shape.computeVertexNormals();shape.userData.continuousCurve=Object.freeze(curve);
        shape.userData.verticalRibbonHeight=1.9;return shape;
      });
      add('babel-continuous-climbing-gold-band',ribbon,m.gold,[0,0,0]);
      // The painted gold band contains narrow black slots; a single shared
      // box geometry carries their alternating physical panel positions.
      for(let slot=0;slot<40;slot+=1) {
        const t=slot/40,a=t*Math.PI*8,r=7.72-t*3.8;
        add('babel-gold-slot-panel',box,m.gold,[Math.cos(a)*r,2+t*23.5,-32+Math.sin(a)*r],[0.58,1.55,0.12],[0,-a+Math.PI/2,0]);
        add('babel-black-slot-inset',box,m.dark,[Math.cos(a)*(r+0.075),2+t*23.5,-32+Math.sin(a)*(r+0.075)],[0.32,0.95,0.025],[0,-a+Math.PI/2,0]);
      }
      for(const side of [-1,1]) {
        for(let pipe=0;pipe<6;pipe+=1) add('babel-small-organ-pipe',cylinder,m.stone,[side*(10+pipe*0.65),2+pipe*0.33,-33],[0.2,4+pipe*0.66,0.2]);
        block('babel-organ-gold-pedestal',m.gold,side*11.6,0.5,-33,5,1,3);
      }
      // Criss-cross mesh is reconstructed as a continuous cage outside the
      // tapered shell; its two helices replace unrelated generic columns.
      for(const side of [-1,1]) curvedTube('babel-dark-diamond-cage-helix',m.metal,
        t=>{const a=side*t*Math.PI*14,r=7.25-t*3.8;return[Math.cos(a)*r,2+t*23.5,-32+Math.sin(a)*r];},()=>[0.045,0.045],160);
      for(let level=0;level<6;level+=1) for(let cell=0;cell<8;cell+=1) {
        const low=level/6,high=(level+1)/6,a=cell*Math.PI/4,b=(cell+1)*Math.PI/4;
        const point=(t,angle)=>{const r=7.29-t*3.8;return[Math.cos(angle)*r,2+t*23.5,-32+Math.sin(angle)*r];};
        beam('babel-crossed-diamond-strut',point(low,a),point(high,b),m.metal,0.04);
        beam('babel-crossed-diamond-strut',point(low,b),point(high,a),m.metal,0.04);
      }
      break;
    }
    case '76136345': {
      add('switchyard-recessed-round-pit',cylinder,m.dark,[0,0.05,-30],[9,0.1,9]);
      add('switchyard-circular-metal-pit-rim',basinRim,m.stone,[0,0.2,-30],[9,9,2.5],[Math.PI/2,0,0]);
      block('switchyard-rusty-diameter-bridge',m.wood,0,0.7,-30,16.8,1.1,2.1);
      for(const side of [-1,1]) {
        beam('switchyard-bridge-top-rail',[-8,1.5,-30+side*1.02],[8,1.5,-30+side*1.02],m.metal,0.045);
        for(let bay=0;bay<6;bay+=1) {
          const x=-7.7+bay*2.55;
          beam('switchyard-bridge-triangular-bracing',[x,0.3,-30+side*1.06],[x+2.4,1.1,-30+side*1.06],m.wood,0.07);
        }
      }
      for(const side of [-1,1]) {
        beam('switchyard-red-gantry-leg',[side*2,1,-30],[side*0.8,9,-30],m.wood,0.14);
      }
      beam('switchyard-red-gantry-crossbar',[-1.8,7,-30],[1.8,7,-30],m.wood,0.1);
      for(let track=0;track<7;track+=1) {
        const a=Math.PI*0.12+track*Math.PI*0.125,dx=Math.cos(a),dz=-Math.sin(a);
        for(const side of [-1,1]) beam('switchyard-radial-paired-rail',
          [dx*9-side*dz*0.3,0.13,-30+dz*9+side*dx*0.3],
          [dx*15-side*dz*0.3,0.13,-30+dz*15+side*dx*0.3],m.metal,0.065);
        for(let sleeper=0;sleeper<5;sleeper+=1) {
          const r=9.3+sleeper*1.2;
          beam('switchyard-radial-wooden-sleeper',[dx*r-dz*0.65,0.07,-30+dz*r+dx*0.65],[dx*r+dz*0.65,0.07,-30+dz*r-dx*0.65],m.ground,0.085);
        }
      }
      for(let shed=0;shed<5;shed+=1) {
        const x=-12+shed*6;
        block('switchyard-rear-engine-shed',m.ground,x,4,-43,5.8,8,2);
        block('switchyard-dark-shed-opening',m.dark,x,3,-41.9,3.7,5.8,0.1);
        block('switchyard-white-overhead-lamp',m.paper,x,7.2,-41.75,0.22,0.22,0.12);
      }
      break;
    }
    case '41418852': {
      const orange=material('#d77446',{emissive:'#af5037',emissiveIntensity:0.28});
      const pink=material('#f13bda',{emissive:'#bd2dc0',emissiveIntensity:0.7});
      for(let row=0;row<4;row+=1) for(let col=0;col<6;col+=1) {
        const x=-15+col*6+(row%2)*1.8,y=2.5+row*4.1,z=-30-row*0.8;
        const points=[[x-2.6+row*0.13,y-1.5,z-0.6],[x+1.7+Math.sin(row+col)*0.9,y-1.1,z+0.3],
          [x+2.4,y+0.9,z-0.3],[x+0.4+Math.cos(col)*0.6,y+2.5,z+0.7],[x-2.2,y+1.3,z-0.1],[x-2.6+row*0.13,y-1.5,z-0.6]];
        for(let edge=1;edge<points.length;edge+=1) beam('numeron-angular-orange-network-rib',points[edge-1],points[edge],orange,0.11);
        if((row+col)%2===0) add('numeron-pink-crystalline-junction',crown,pink,[x+1.8,y+2.2,z],[0.27,0.4,0.27]);
        if(row%2===0 && col%2===0) add('numeron-long-dark-pointed-spire',cone,m.wood,[x,4.1+row*3.7,z-1.1],[0.4,8.2,0.3]);
      }
      for(const side of [-1,1]) {
        curvedTube('numeron-continuous-side-network-strand',orange,
          t=>[side*(14+Math.sin(t*8)*1.1),1+t*17,-27-Math.cos(t*7)*1.3],()=>[0.12,0.12],48);
        add('numeron-large-pink-sphere',crown,pink,[side*12,5.3,-27],[0.85,0.85,0.85]);
      }
      break;
    }
    case '43034264': {
      const purple=material('#79488d',{metalness:0.42});
      for(const side of [-1,1]) for(const depth of [-1,1]) {
        const x=side*5.3,z=-31+depth*3.6;
        add('laser-qlip-ribbed-silver-pillar',cylinder,m.stone,[x,10.2,z],[0.73,11,0.73]);
        add('laser-qlip-purple-pillar-inset',cylinder,purple,[x,10.2,z],[0.52,11.2,0.52]);
        for(let rib=0;rib<7;rib+=1) add('laser-qlip-diagonal-pillar-rib',box,m.stone,[x,5.6+rib*1.53,z+0.55],[1.25,0.16,0.2],[0,0,side*0.36]);
        add('laser-qlip-pointed-finial',cone,m.stone,[x,16.4,z],[0.48,1.7,0.48]);
        add('laser-qlip-hanging-lower-point',cone,m.stone,[x,3.5,z],[0.5,2.2,0.5],[Math.PI,0,0]);
      }
      for(const side of [-1,1]) {
        curvedTube('laser-qlip-curved-upper-frame',m.stone,
          t=>[-5.3+t*10.6,14.8+Math.sin(t*Math.PI)*1.2,-31+side*3.6],()=>[0.18,0.18],32);
        beam('laser-qlip-longitudinal-frame',[side*5.3,14.8,-34.6],[side*5.3,14.8,-27.4],m.stone,0.16);
        curvedTube('laser-qlip-lavender-background-ray',m.light,
          t=>[side*(2+t*15),1+t*20,-38-Math.sin(t*Math.PI)*3],()=>[0.035,0.035],48);
      }
      add('laser-qlip-central-purple-chamber',cylinder,purple,[0,11,-31],[2.8,3,2.8]);
      for(const y of [9.5,12.5]) add('laser-qlip-central-silver-chamber-band',basinRim,m.stone,[0,y,-31],[2.9,2.9,1.7],[Math.PI/2,0,0]);
      add('laser-qlip-small-pointed-chamber-bottom',cone,purple,[0,7.3,-31],[1.3,4.1,1.3],[Math.PI,0,0]);
      break;
    }
  }
  return true;
}
