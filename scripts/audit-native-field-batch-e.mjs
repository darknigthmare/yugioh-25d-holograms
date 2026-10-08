import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { createNativeFieldScenarioRunner, perform, reachIdle, endTurn, enterBattle, battleAttack, requireChain, hasCode, json } from './native-field-audit-harness.mjs';

export const NATIVE_FIELD_BATCH_E_IDS = Object.freeze([55742055,66750703,97254001,55276522,95856586,46273941,975299,17000165,74733322,2674965,7206349,26162470,64213017,2106266,269510,87902575,23213239,5414777,13764602,65589010,34822850,25163979,60448701,61557074,63899465,32353566,70222318,38391684,65938950,4215636,33407125,58406094,39730727,90351981,59687381,42015635,81231742]);

/** Every fixture is created before start. The shipped core owns all effects. */
export async function auditNativeFieldBatchE(inputs, sharedCore) {
  const { scenarios, run } = createNativeFieldScenarioRunner(inputs, sharedCore);
  const native = code => inputs.resources.canonicalCodeToSource?.get(code) ?? code;
  const chain = (s, code) => requireChain(s, native(code));
  const stats = code => inputs.resources.cards.get(native(code));
  const check = (s, player, location, code) => assert.ok(hasCode(s, player, location, native(code)), `Expected ${code} in location ${location}`);
  const activate = (s, field, choices) => { perform(s, 'activate', native(field), choices); chain(s, field); };
  const once = (s, field) => assert.ok(!reachIdle(s).activates.some(c => c.code === native(field) && c.location === s.C.OcgLocation.SZONE));
  const recordField = s => { const result=s.duel.queryField(); s.queries.push({query:{kind:'field'},result});return result; };
  const effectReason = (s,p,loc,code,mask=0x40) => { const c=s.location(p,loc).find(c=>c.code===native(code));assert.ok(c && (c.reason&mask)!==0); };
  async function caseFor(field, suffix, description, exercise, options) { await run(`batch-e-${field}-${suffix}`,[field],description,exercise,options); }

  await caseFor(55742055,'three-names-end-phase-send','Three distinct Noble Knight names unlock the End Phase deck-to-GY branch; the sent card has effect reason.',s=>{
    const L=s.C.OcgLocation;s.add(55742055,0,L.HAND).add(92125819,0,L.GRAVE).add(53550467,0,L.GRAVE).add(47120245,0,L.GRAVE).add(59057152,0,L.DECK).baseDecks().start();
    activate(s,55742055);endTurn(s,{chainCodes:[55742055],codes:[59057152]});effectReason(s,0,L.GRAVE,59057152);chain(s,55742055);
  });
  await caseFor(66750703,'summon-counters-and-cost','A Normal Summon and real Monster Reborn Special Summon each add one Fire Fist Counter; the two-counter ignition pays both and shares its once-per-turn limit.',s=>{
    const L=s.C.OcgLocation;s.add(66750703,0,L.HAND).add(6353603,0,L.HAND).add(43748308,0,L.GRAVE).add(83764718,0,L.HAND).baseDecks().start();
    activate(s,66750703);perform(s,'summon',6353603);assert.equal(s.card(0,L.SZONE,5).counters[0x201],1);
    perform(s,'activate',83764718,{codes:[43748308]});assert.equal(s.card(0,L.SZONE,5).counters[0x201],2);
    activate(s,66750703);assert.equal(s.card(0,L.SZONE,5).counters[0x201]??0,0);once(s,66750703);
  });
  await caseFor(97254001,'unused-zones-season-counters','Two opposing occupied Main Monster Zones leave three spaces; Summer places exactly three Season Counters and cannot repeat its ignition this turn.',s=>{
    const L=s.C.OcgLocation;s.add(97254001,0,L.HAND).add(89631139,1,L.MZONE,0).add(46986414,1,L.MZONE,1).baseDecks().start();activate(s,97254001);activate(s,97254001);assert.equal(s.card(0,L.SZONE,5).counters[0x214],3);once(s,97254001);
  });
  await caseFor(55276522,'three-races-three-destinations','Activation selects a Dinosaur, Sea Serpent and Wyrm, moving one to hand, one to banishment and one to GY; a Spellcaster revival is then unavailable.',s=>{
    const L=s.C.OcgLocation;const partners=[37265642,37721209,45960523];s.add(55276522,0,L.HAND).add(83764718,0,L.HAND).add(46986414,0,L.GRAVE);for(const id of partners)s.add(id,0,L.DECK);s.baseDecks().start();
    activate(s,55276522);const moved=[L.HAND,L.REMOVED,L.GRAVE].map(loc=>s.location(0,loc).filter(c=>partners.includes(c.code)));assert.ok(moved.every(a=>a.length===1));assert.equal(new Set(moved.flat().map(c=>stats(c.code).race.toString())).size,3);perform(s,'activate',83764718,{select:p=>{assert.ok(!p.selects.some(c=>c.code===46986414));return[moved[2][0].code];}});check(s,0,L.MZONE,moved[2][0].code);
  });
  await caseFor(95856586,'predraw-top-shining-draw','The next own Draw Phase triggers Zexal Field before drawing and puts the shipped Shining Draw on top of the Deck.',s=>{
    const L=s.C.OcgLocation;s.add(95856586,0,L.HAND).add(35906693,0,L.DECK).add(89631139,0,L.DECK).baseDecks().start();activate(s,95856586);endTurn(s);endTurn(s,{chainCodes:[95856586]});assert.equal(s.card(0,L.DECK,s.location(0,L.DECK).length-1).code,35906693);assert.ok(s.messages.some(m=>m.type===s.C.OcgMessageType.CONFIRM_DECKTOP));
  });
  await caseFor(46273941,'normal-revival-draw','Monster Reborn Special Summons a non-Token Normal Monster and the official Pere-Zenet field trigger draws one card.',s=>{
    const L=s.C.OcgLocation;s.add(46273941,0,L.HAND).add(83764718,0,L.HAND).add(89631139,0,L.GRAVE).baseDecks().start();activate(s,46273941);perform(s,'activate',83764718,{codes:[89631139],chainCodes:[native(46273941)]});check(s,0,L.MZONE,89631139);assert.equal(s.location(0,L.HAND).length,1);assert.ok(s.messages.some(m=>m.type===s.C.OcgMessageType.DRAW&&m.player===0&&m.drawn.length===1));
  });
  await caseFor(975299,'boss-rush-search-bes-summon','Zelos searches Boss Rush, Special Summons B.E.S. Big Core from hand, boosts both stats by 500 and places its additional counter.',s=>{
    const L=s.C.OcgLocation;s.add(975299,0,L.HAND).add(66947414,0,L.DECK).add(14148099,0,L.HAND).baseDecks().start();activate(s,975299,{codes:[66947414]});check(s,0,L.HAND,66947414);activate(s,975299,{codes:[14148099]});const c=s.card(0,L.MZONE);assert.equal(c.code,14148099);assert.equal(c.attack,2800);assert.equal(c.defense,1600);assert.equal(c.counters[0x1f],1);once(s,975299);
  });
  await caseFor(17000165,'destroy-zero-revive-dark-reptile','Recoil targets and destroys an own zero-ATK monster, then revives the independently targeted DARK Reptile and consumes its ignition limit.',s=>{
    const L=s.C.OcgLocation;s.add(17000165,0,L.HAND).add(79491903,0,L.MZONE).add(42303365,0,L.GRAVE).baseDecks().start();activate(s,17000165);activate(s,17000165,{select:p=>p.selects[0].location===L.MZONE?[79491903]:[42303365]});check(s,0,L.GRAVE,79491903);check(s,0,L.MZONE,42303365);once(s,17000165);assert.ok(s.messages.some(m=>m.type===s.C.OcgMessageType.BECOME_TARGET));
  });
  await caseFor(74733322,'medius-additional-normal-summon','After a generic Normal Summon consumes the regular allowance, Acropolis still permits Medius the Pure and rejects a third ordinary summon.',s=>{
    const L=s.C.OcgLocation;s.add(74733322,0,L.HAND).add(15025844,0,L.HAND).add(97556336,0,L.HAND).add(13039848,0,L.HAND).baseDecks().start();activate(s,74733322);perform(s,'summon',15025844);assert.ok(reachIdle(s).summons.some(c=>c.code===97556336));perform(s,'summon',97556336,{yes:false});check(s,0,L.MZONE,97556336);assert.ok(!reachIdle(s).summons.some(c=>c.code===13039848));s.card(0,L.MZONE,1);
  });
  await caseFor(2674965,'lp-cost-banishment-recovery','Home Stadium pays exactly 1000 LP, adds an Argostars card from face-up banishment to hand, and cannot repeat its recovery this turn.',s=>{
    const L=s.C.OcgLocation;s.add(2674965,0,L.HAND).add(21050476,0,L.REMOVED).baseDecks().start();activate(s,2674965);activate(s,2674965,{codes:[21050476]});check(s,0,L.HAND,21050476);assert.equal(recordField(s).players[0].lp,7000);assert.ok(s.messages.some(m=>m.type===s.C.OcgMessageType.PAY_LPCOST&&m.amount===1000));once(s,2674965);
  });
  await caseFor(7206349,'five-earth-stat-threshold','With five own EARTH monsters, Full Bloom boosts each own monster by 1000 ATK while leaving an opposing EARTH monster unchanged.',s=>{
    const L=s.C.OcgLocation;s.add(7206349,0,L.HAND);for(let k=0;k<5;k++)s.add(13039848,0,L.MZONE,k);s.add(13039848,1,L.MZONE).baseDecks().start();const before=s.card(0,L.MZONE).attack;activate(s,7206349);for(let k=0;k<5;k++)assert.equal(s.card(0,L.MZONE,k).attack,before+1000);assert.equal(s.card(1,L.MZONE).attack,before);
  });
  await caseFor(26162470,'distinct-names-search-discard','Fandora counts two distinct Fur Hire names rather than three copies; its ignition searches from Deck before a different hand card is discarded by effect.',s=>{
    const L=s.C.OcgLocation;s.add(26162470,0,L.HAND).add(93850652,0,L.MZONE).add(93850652,0,L.MZONE,1).add(94073244,0,L.MZONE,2).add(46986414,0,L.HAND).add(31467949,0,L.DECK).baseDecks().start();activate(s,26162470);assert.equal(s.card(0,L.MZONE).attack,1800);assert.equal(s.card(0,L.MZONE,2).attack,1100);activate(s,26162470,{select:p=>p.selects[0].location===L.DECK?[31467949]:[46986414]});check(s,0,L.HAND,31467949);effectReason(s,0,L.GRAVE,46986414);once(s,26162470);
  });
  await caseFor(64213017,'revival-lp-loss-no-attack','Formation revives a Beetrooper in turn three, loses LP equal to its original ATK and makes that monster unavailable as a Battle Phase attacker.',s=>{
    const L=s.C.OcgLocation;s.add(64213017,0,L.HAND).add(65430555,0,L.GRAVE).baseDecks().start();activate(s,64213017);endTurn(s);endTurn(s);activate(s,64213017,{codes:[65430555]});check(s,0,L.MZONE,65430555);assert.equal(recordField(s).players[0].lp,5600);assert.ok(!enterBattle(s).attacks.some(c=>c.code===65430555));
  });
  await caseFor(2106266,'reveal-gaia-search-dragon','Galloping Gaia reveals an actual Gaia the Fierce Knight as cost without discarding it, searches a Level 5 Dragon and shares the once-per-turn limit between both search modes.',s=>{
    const L=s.C.OcgLocation;s.add(2106266,0,L.HAND).add(6368038,0,L.HAND).add(28279543,0,L.DECK).baseDecks().start();activate(s,2106266);activate(s,2106266,{select:p=>p.selects[0].location===L.HAND?[6368038]:[28279543]});check(s,0,L.HAND,6368038);check(s,0,L.HAND,28279543);assert.ok(!hasCode(s,0,L.GRAVE,6368038));once(s,2106266);assert.ok(s.messages.some(m=>m.type===s.C.OcgMessageType.CONFIRM_CARDS));
  });
  await caseFor(269510,'dragon-defense-and-nonlink-attack-ban','Fire Prison adds 300 DEF to Dragons on both sides, leaves a Spellcaster unchanged and prevents a normal Dragon from attacking in the real Battle Phase.',s=>{
    const L=s.C.OcgLocation;s.add(269510,0,L.HAND).add(89631139,0,L.MZONE).add(89631139,1,L.MZONE).add(46986414,0,L.MZONE,1).baseDecks().start();activate(s,269510);assert.equal(s.card(0,L.MZONE).defense,2800);assert.equal(s.card(1,L.MZONE).defense,2800);assert.equal(s.card(0,L.MZONE,1).defense,2100);endTurn(s);endTurn(s);assert.equal(enterBattle(s).attacks.length,0);
  });
  await caseFor(87902575,'normal-summon-temporary-banish-return','Future Visions targets a real Normal Summon, temporarily banishes it, leaves it absent through the opposing turn and returns it at its controller’s next Standby in face-up Attack Position.',s=>{
    const L=s.C.OcgLocation;s.add(87902575,0,L.HAND).add(15025844,0,L.HAND).baseDecks().start();activate(s,87902575);perform(s,'summon',15025844);check(s,0,L.REMOVED,15025844);assert.ok(!hasCode(s,0,L.MZONE,15025844));endTurn(s);check(s,0,L.REMOVED,15025844);endTurn(s);assert.equal(s.card(0,L.MZONE).code,15025844);assert.equal(s.card(0,L.MZONE).position,s.C.OcgPosition.FACEUP_ATTACK);
  });
  await caseFor(23213239,'battle-destroyed-danger-retaliation','An opposing Blue-Eyes destroys Danger!? Jackalope? by battle; Disorder then destroys that opposing Blue-Eyes by its own real trigger effect.',s=>{
    const L=s.C.OcgLocation;s.add(23213239,0,L.HAND).add(43694650,0,L.MZONE).add(89631139,1,L.MZONE).baseDecks().start();activate(s,23213239);endTurn(s);enterBattle(s);battleAttack(s,89631139,43694650,{chainCodes:[23213239],effectYes:p=>p.code===23213239});check(s,0,L.GRAVE,43694650);effectReason(s,1,L.GRAVE,89631139);s.card(0,L.GRAVE,0);
  });
  await caseFor(5414777,'light-dragon-synchro-defense-trigger','With an actual Level 7 LIGHT Dragon Synchro present, World of Spirits changes a Monster Reborn Special Summon from Attack to Defense by its mandatory trigger.',s=>{
    const L=s.C.OcgLocation;s.add(5414777,0,L.HAND).add(25862681,0,L.MZONE).add(83764718,0,L.HAND).add(89631139,0,L.GRAVE).baseDecks().start();activate(s,5414777);perform(s,'activate',83764718,{codes:[89631139]});assert.equal(s.card(0,L.MZONE,1).code,89631139);assert.equal(s.card(0,L.MZONE,1).position,s.C.OcgPosition.FACEUP_DEFENSE);chain(s,5414777);
  });
  await caseFor(13764602,'search-spirit-token-extra-lock','Perfect Sync searches a Dual Avatar monster, summons its Spirit Token and blocks an otherwise legal Link Spider from the Extra Deck for the rest of the turn.',s=>{
    const L=s.C.OcgLocation;s.add(13764602,0,L.HAND).add(85360035,0,L.MZONE).add(11759079,0,L.DECK).add(98978921,0,L.EXTRA).baseDecks().start();activate(s,13764602,{codes:[11759079]});check(s,0,L.HAND,11759079);activate(s,13764602);const token=s.card(0,L.MZONE,1);assert.equal(token.code,87669905);assert.equal(token.level,2);assert.equal(token.attack,0);assert.ok((token.type&s.C.OcgType.TOKEN)!==0);assert.ok(!reachIdle(s).special_summons.some(c=>c.code===98978921));
  });
  await caseFor(65589010,'opponent-destroys-field-both-extra-to-grave','When an opposing MST destroys Dogmatika Nation, its delayed trigger makes both players send one monster from their own Extra Deck to the GY by effect.',s=>{
    const L=s.C.OcgLocation;s.add(65589010,0,L.HAND).add(5318639,1,L.HAND).add(23995346,0,L.EXTRA).add(23995346,1,L.EXTRA).baseDecks().start();activate(s,65589010);endTurn(s);perform(s,'activate',5318639,{codes:[65589010,23995346],chainCodes:[65589010]});effectReason(s,0,L.GRAVE,23995346);effectReason(s,1,L.GRAVE,23995346);assert.equal(s.location(0,L.EXTRA).length,0);assert.equal(s.location(1,L.EXTRA).length,0);
  });
  await caseFor(34822850,'standby-infernoid-token','Void Expansion’s first own Standby trigger summons the official Infernoid Token with FIRE, Fiend, Level 1, ATK/DEF zero.',s=>{
    const L=s.C.OcgLocation;s.add(34822850,0,L.SZONE,5).baseDecks().start();reachIdle(s,{chainCodes:[34822850]});const c=s.card(0,L.MZONE);assert.equal(c.code,34822851);assert.equal(c.attribute,s.C.OcgAttribute.FIRE);assert.equal(c.race,s.C.OcgRace.FIEND);assert.equal(c.level,1);assert.equal(c.attack,0);assert.equal(c.defense,0);chain(s,34822850);
  });
  await caseFor(25163979,'move-knightmare-main-zone','World Legacy’s Nightmare moves an existing Knightmare Phoenix from Main Monster Zone zero to another selected legal Main Monster Zone and cannot repeat.',s=>{
    const L=s.C.OcgLocation;s.add(25163979,0,L.HAND).add(2857636,0,L.MZONE).baseDecks().start();activate(s,25163979);activate(s,25163979,{codes:[2857636],respond:(p,C)=>p.type===C.OcgMessageType.SELECT_DISFIELD?{type:C.OcgResponseType.SELECT_DISFIELD,places:[{player:0,location:L.MZONE,sequence:3}]}:null});assert.equal(s.card(0,L.MZONE,3).code,2857636);assert.equal(s.card(0,L.MZONE,0).code,undefined);once(s,25163979);
  });
  await caseFor(60448701,'destroyed-field-distinct-reptile-mill','Opposing MST destroys Origin; two distinct Reptile names in the GY, despite a duplicate, make the opponent mill exactly two cards by effect.',s=>{
    const L=s.C.OcgLocation;s.add(60448701,0,L.HAND).add(79491903,0,L.GRAVE).add(79491903,0,L.GRAVE).add(42303365,0,L.GRAVE).add(5318639,1,L.HAND).add(89631139,1,L.DECK).add(15025844,1,L.DECK).baseDecks().start();activate(s,60448701);endTurn(s);perform(s,'activate',5318639,{codes:[60448701],chainCodes:[60448701]});assert.equal(s.location(1,L.GRAVE).filter(c=>c.code!==5318639).length,2);assert.ok(s.location(1,L.GRAVE).filter(c=>c.code!==5318639).every(c=>(c.reason&0x40)!==0));
  });
  await caseFor(61557074,'attribute-bonus-search-and-persistent-skip','Palace counts distinct GY Attributes, searches an Elementsaber, then its scheduled next-turn Battle Phase skip persists after MST removes Palace.',s=>{
    const L=s.C.OcgLocation;s.add(61557074,0,L.HAND).add(46986414,0,L.MZONE).add(89631139,0,L.GRAVE).add(46986414,0,L.GRAVE).add(46986414,0,L.GRAVE).add(19036557,0,L.DECK).add(5318639,0,L.HAND).baseDecks().start();activate(s,61557074);assert.equal(s.card(0,L.MZONE).attack,2900);assert.equal(s.card(0,L.MZONE).defense,2500);activate(s,61557074,{codes:[19036557]});check(s,0,L.HAND,19036557);perform(s,'activate',5318639,{codes:[61557074]});assert.equal(s.card(0,L.MZONE).attack,2500);endTurn(s);endTurn(s);const start=s.messages.length;s.respond({type:s.C.OcgResponseType.SELECT_IDLECMD,action:s.C.SelectIdleCMDAction.TO_BP,index:null});assert.equal(reachIdle(s).player,1);assert.ok(s.messages.slice(start).some(m=>m.type===s.C.OcgMessageType.NEW_PHASE&&m.phase===s.C.OcgPhase.END));assert.ok(!s.messages.slice(start).some(m=>m.type===s.C.OcgMessageType.SELECT_BATTLECMD));check(s,0,L.GRAVE,61557074);
  });
  await caseFor(63899465,'opponent-condition-and-extra-normal','HQ grants +500 ATK/DEF while the opponent controls a monster, then allows a Rescue-ACE Normal Summon after the regular summon is spent.',s=>{
    const L=s.C.OcgLocation;s.add(63899465,0,L.HAND).add(38339996,0,L.MZONE).add(89631139,1,L.MZONE).add(15025844,0,L.HAND).add(37617348,0,L.HAND).baseDecks().start();activate(s,63899465);assert.equal(s.card(0,L.MZONE).attack,2000);assert.equal(s.card(0,L.MZONE).defense,2000);perform(s,'summon',15025844);assert.ok(reachIdle(s).summons.some(c=>c.code===37617348));perform(s,'summon',37617348);check(s,0,L.MZONE,37617348);
  });
  await caseFor(32353566,'witchcrafter-search-before-effect-discard','Walpurgis searches a genuine Witchcrafter from Deck, keeps the searched card and discards a different hand card by effect rather than as cost.',s=>{
    const L=s.C.OcgLocation;s.add(32353566,0,L.HAND).add(46986414,0,L.HAND).add(21744288,0,L.DECK).baseDecks().start();activate(s,32353566);activate(s,32353566,{select:p=>p.selects[0].location===L.DECK?[21744288]:[46986414]});check(s,0,L.HAND,21744288);effectReason(s,0,L.GRAVE,46986414);assert.ok((s.location(0,L.GRAVE).find(c=>c.code===46986414).reason&0x80)===0);once(s,32353566);
  });
  await caseFor(70222318,'plant-cost-sylvan-top','Mount Sylvania sends a hand Plant to GY as cost, chooses a real Sylvan spell from Deck and puts it on top with a native deck-top reveal.',s=>{
    const L=s.C.OcgLocation;s.add(70222318,0,L.HAND).add(99641328,0,L.HAND).add(82016179,0,L.DECK).add(89631139,0,L.DECK).baseDecks().start();activate(s,70222318);activate(s,70222318,{select:p=>p.selects[0].location===L.HAND?[99641328]:[82016179]});effectReason(s,0,L.GRAVE,99641328,0x80);assert.equal(s.card(0,L.DECK,s.location(0,L.DECK).length-1).code,82016179);assert.ok(s.messages.some(m=>m.type===s.C.OcgMessageType.CONFIRM_DECKTOP));once(s,70222318);
  });
  await caseFor(38391684,'umi-grave-placement-and-levels','With Umi present, Atlantis activates its graveyard ignition and replaces the Field; a real mentioning Daedalus then reduces all field and hand monster levels by one on both sides.',s=>{
    const L=s.C.OcgLocation;s.add(38391684,0,L.GRAVE).add(22702055,0,L.SZONE,5).add(64603351,0,L.MZONE).add(46986414,1,L.MZONE).add(89631139,0,L.HAND).baseDecks().start();activate(s,38391684);assert.equal(s.card(0,L.SZONE,5).code,38391684);assert.equal(s.card(0,L.MZONE).level,6);assert.equal(s.card(1,L.MZONE).level,6);assert.equal(s.card(0,L.HAND).level,7);check(s,0,L.GRAVE,22702055);
  });
  await caseFor(65938950,'opponent-normal-tuner-draw-penalty','An actual opposing normal Draw Phase draw reveals a Tuner, draws two more through the Field trigger, then its owner loses 2000 LP and sends the Field to GY.',s=>{
    const L=s.C.OcgLocation;s.add(65938950,0,L.HAND).baseDecks();for(let k=0;k<4;k++)s.add(74093656,1,L.DECK);s.start();activate(s,65938950);endTurn(s,{chainCodes:[65938950]});assert.equal(s.location(1,L.HAND).length,3);assert.equal(recordField(s).players[0].lp,6000);check(s,0,L.GRAVE,65938950);assert.ok(s.messages.some(m=>m.type===s.C.OcgMessageType.CONFIRM_CARDS));s.card(0,L.GRAVE,0);
  },{team2:{drawCountPerTurn:1}});
  await caseFor(4215636,'wind-destruction-recruits-negated-wind','Dark Hole destroys an own WIND monster; Shrine recruits a Level 2 WIND Effect Monster from Deck and the core marks that monster disabled.',s=>{
    const L=s.C.OcgLocation;s.add(4215636,0,L.HAND).add(76812113,0,L.MZONE).add(31467949,0,L.DECK).add(53129443,0,L.HAND).baseDecks().start();activate(s,4215636);perform(s,'activate',53129443,{codes:[31467949],chainCodes:[4215636]});const c=s.card(0,L.MZONE);assert.equal(c.code,31467949);assert.ok((c.status&0x1)!==0,'STATUS_DISABLED from official constant.lua');effectReason(s,0,L.GRAVE,76812113);
  });
  await caseFor(33407125,'nonlabrynth-normal-trap-fiend-revival','A genuinely Set Waboku activates on a later turn and Labrynth Labyrinth resolves its delayed trigger to Special Summon a Fiend from hand.',s=>{
    const L=s.C.OcgLocation;s.add(33407125,0,L.HAND).add(12607053,0,L.SZONE,0,s.C.OcgPosition.FACEDOWN_DEFENSE).add(70781052,0,L.HAND).baseDecks().start();activate(s,33407125);endTurn(s);endTurn(s);perform(s,'activate',12607053,{codes:[70781052],chainCodes:[33407125]});check(s,0,L.MZONE,70781052);chain(s,12607053);chain(s,33407125);s.card(0,L.MZONE,0);
  });
  await caseFor(58406094,'light-dragon-bounce-draw','A real Set Compulsory Evacuation Device returns an own Level 7 LIGHT Dragon from field to hand in its owner’s turn; Starry Knight Sky then draws exactly one.',s=>{
    const L=s.C.OcgLocation;s.add(58406094,0,L.HAND).add(6740720,0,L.MZONE).add(94192409,0,L.SZONE,0,s.C.OcgPosition.FACEDOWN_DEFENSE).baseDecks().start();activate(s,58406094);endTurn(s);endTurn(s);perform(s,'activate',94192409,{codes:[6740720],chainCodes:[58406094]});check(s,0,L.HAND,6740720);assert.equal(s.location(0,L.HAND).length,2);assert.ok(s.messages.some(m=>m.type===s.C.OcgMessageType.DRAW&&m.player===0&&m.drawn.length===1));
  });
  await caseFor(39730727,'opponent-effect-special-summon-draw-two','While the owner controls a Normal Monster, an opposing Monster Reborn summons an Effect Monster and Tenyi’s delayed field trigger draws two cards.',s=>{
    const L=s.C.OcgLocation;s.add(39730727,0,L.HAND).add(15025844,0,L.MZONE).add(83764718,1,L.HAND).add(6353603,1,L.GRAVE).add(89631139,0,L.DECK).add(13039848,0,L.DECK).baseDecks().start();activate(s,39730727);endTurn(s);perform(s,'activate',83764718,{codes:[6353603],chainCodes:[39730727]});check(s,1,L.MZONE,6353603);assert.equal(s.location(0,L.HAND).length,2);assert.ok(s.messages.some(m=>m.type===s.C.OcgMessageType.DRAW&&m.player===0&&m.drawn.length===2));s.card(0,L.MZONE);
  });
  await caseFor(90351981,'grave-discard-cost-recovery','Babel’s official graveyard ignition sends an actual hand card to GY as cost and returns Babel to hand by effect, after being absent from the field.',s=>{
    const L=s.C.OcgLocation;s.add(90351981,0,L.GRAVE).add(46986414,0,L.HAND).baseDecks().start();activate(s,90351981,{codes:[46986414]});check(s,0,L.HAND,90351981);effectReason(s,0,L.GRAVE,46986414,0x80);effectReason(s,0,L.HAND,90351981);s.card(0,L.HAND);
  });
  await caseFor(59687381,'column-target-and-destruction-protection','An occupied Main Monster column prevents opposing MST from selecting its Set Spell/Trap; after MST destroys an uncovered card, Harpie’s Feather Duster destroys the Field but preserves the covered card.',s=>{
    const L=s.C.OcgLocation;s.add(59687381,0,L.HAND).add(15025844,0,L.MZONE,0).add(12607053,0,L.SZONE,0,s.C.OcgPosition.FACEDOWN_DEFENSE).add(94192409,0,L.SZONE,1,s.C.OcgPosition.FACEDOWN_DEFENSE).add(5318639,1,L.HAND).add(18144506,1,L.HAND).baseDecks().start();activate(s,59687381);endTurn(s);perform(s,'activate',5318639,{select:p=>{assert.ok(!p.selects.some(c=>c.controller===0&&c.location===L.SZONE&&c.sequence===0));return[94192409];}});check(s,0,L.SZONE,12607053);check(s,0,L.GRAVE,94192409);perform(s,'activate',18144506);check(s,0,L.SZONE,12607053);check(s,0,L.GRAVE,59687381);s.card(0,L.SZONE,0);
  });
  await caseFor(42015635,'neos-and-listed-fusion-stat-bonus','Neo Space increases Elemental HERO Neos and a Fusion listing Neos by 500 ATK on either side, with a Blue-Eyes negative control unchanged.',s=>{
    const L=s.C.OcgLocation;s.add(42015635,0,L.HAND).add(89943723,0,L.MZONE).add(90050480,1,L.MZONE).add(89631139,0,L.MZONE,1).baseDecks().start();activate(s,42015635);assert.equal(s.card(0,L.MZONE).attack,3000);assert.equal(s.card(1,L.MZONE).attack,stats(90050480).attack+500);assert.equal(s.card(0,L.MZONE,1).attack,3000);
  });
  await caseFor(81231742,'own-turn-attack-opponent-turn-defense','Spell Wall grants only the owner’s monsters +300 ATK during the own turn, switches to +300 DEF during the opposing turn, and leaves the opponent’s monster unchanged.',s=>{
    const L=s.C.OcgLocation;s.add(81231742,0,L.HAND).add(46986414,0,L.MZONE).add(46986414,1,L.MZONE).baseDecks().start();activate(s,81231742);assert.equal(s.card(0,L.MZONE).attack,2800);assert.equal(s.card(0,L.MZONE).defense,2100);endTurn(s);assert.equal(s.card(0,L.MZONE).attack,2500);assert.equal(s.card(0,L.MZONE).defense,2400);assert.equal(s.card(1,L.MZONE).attack,2500);assert.equal(s.card(1,L.MZONE).defense,2100);
  });
  return scenarios;
}

// CLI/report provenance only: this does not participate in native scenarios.
async function collectBatchExecutionProvenance(inputs, scenarios, assignedIds) {
  const hash = value => createHash('sha256').update(value).digest('hex');
  const modulePath = `scripts/${new URL(import.meta.url).pathname.split('/').at(-1)}`;
  const paths = [modulePath, 'scripts/native-field-audit-inputs.mjs', 'scripts/native-field-audit-harness.mjs',
    'src/core/native/NativeDuelRuntime.js', 'src/core/native/NativeCardScriptCorrections.js',
    'src/core/native/NativeDiceDungeonScriptCorrection.js', 'src/core/native/NativeDuelTowerScriptCorrection.js',
    'src/core/native/NativeSourceIntegrity.js', 'src/core/native/NativeLuaCompatibility.js',
    'src/core/native/NativeDuelDecisions.js', 'src/core/native/NativeCardData.js',
    'src/core/native/NativeScriptArchive.js', 'src/core/native/NativeCoreAssets.js',
    'src/core/native/vendor/ocgcore/index.js', 'src/core/native/vendor/ocgcore/ocgcore.sync-MMMSWPBB.js',
    'src/core/native/vendor/ocgcore/chunk-6GYI7QPM.js', 'src/core/native/vendor/ocgcore/chunk-L5TW24SS.js',
    'public/native/core-build.json', 'public/native/manifest.json', 'public/native/card-data.json',
    'public/native/scripts.json', 'public/native/field-banlists.json', 'public/native/ocgcore.sync.wasm'];
  const dependencies = [];
  for (const path of paths) {
    const bytes = await readFile(new URL(`../${path}`, import.meta.url));
    dependencies.push({ path, bytes: bytes.byteLength, sha256: hash(bytes) });
  }
  for (const [artifact, path] of [['cards', 'public/native/card-data.json'], ['scripts', 'public/native/scripts.json'], ['fieldBanlists', 'public/native/field-banlists.json']]) {
    const archived = dependencies.find(entry => entry.path === path);
    assert.equal(archived.sha256, inputs.resources.manifest.artifacts[artifact].sha256, `${artifact}: original archive hash`);
    assert.equal(archived.bytes, inputs.resources.manifest.artifacts[artifact].bytes, `${artifact}: original archive bytes`);
  }
  assert.equal(dependencies.find(entry => entry.path === 'public/native/ocgcore.sync.wasm').sha256, inputs.coreBuild.wasmSha256);
  const { createNativeScriptReader } = await import('../src/core/native/NativeDuelRuntime.js');
  const reader = createNativeScriptReader(inputs.resources.scripts);
  const describe = sourceCode => {
    const filename = `c${sourceCode}.lua`;
    const original = inputs.resources.scripts.get(filename);
    if (typeof original !== 'string') return null;
    const effective = reader(filename);
    return { sourceCode, filename, path: inputs.resources.auditScriptFiles?.[filename]?.path ?? filename,
      sha256: hash(original), originalSha256: hash(original), effectiveSha256: hash(effective),
      originalBytes: Buffer.byteLength(original, 'utf8'), effectiveBytes: Buffer.byteLength(effective, 'utf8'),
      corrected: original !== effective };
  };
  const fixtureScripts = new Map();
  for (const scenario of scenarios) for (const card of scenario.fixtureCards ?? []) {
    const script = describe(card.sourceCode);
    if (!script) { assert.equal(card.scriptSha256, null); continue; }
    assert.equal(card.scriptSha256, script.originalSha256, `${scenario.id}: original fixture ${script.filename}`);
    assert.equal(card.effectiveScriptSha256, script.effectiveSha256, `${scenario.id}: executed fixture ${script.filename}`);
    card.scriptBytes = script.originalBytes;
    card.effectiveScriptBytes = script.effectiveBytes;
    fixtureScripts.set(script.filename, script);
  }
  const scriptCorrections = [...new Map(scenarios.flatMap(scenario => scenario.scriptCorrections ?? []).map(correction => [correction.filename, correction])).values()];
  const officialFieldScripts = assignedIds.map(canonicalCode => {
    const sourceCode = inputs.resources.canonicalCodeToSource?.get(canonicalCode) ?? canonicalCode;
    const script = describe(sourceCode);
    assert.ok(script, `Missing assigned script c${sourceCode}.lua`);
    return { canonicalCode, ...script };
  });
  return { dependencies, officialFieldScripts, fixtureScripts: [...fixtureScripts.values()], scriptCorrections,
    modifiedScripts: scriptCorrections.length > 0, upstreamArchiveBytesModified: false,
    coreModuleOverride: process.env.NATIVE_CORE_MODULE ?? null, wasmSha256: inputs.coreBuild.wasmSha256 };
}

export async function writeNativeFieldBatchEReport(inputs, scenarios) {
  const provenance=await collectBatchExecutionProvenance(inputs,scenarios,NATIVE_FIELD_BATCH_E_IDS);
  const fingerprints=provenance.dependencies;
  const report={schemaVersion:1,date:'2026-10-08',lot:'E',scope:'37 previously unexercised Field Spells; one significant official effect branch per Field, not exhaustive rulings.',nativeApi:inputs.coreBuild.coreApi,coreBuild:inputs.coreBuild,expectedFields:NATIVE_FIELD_BATCH_E_IDS,summary:{scenarios:scenarios.length,passed:scenarios.filter(s=>s.status==='passed').length,failed:scenarios.filter(s=>s.status!=='passed').length,distinctFields:new Set(scenarios.flatMap(s=>s.fields)).size},fingerprints,provenance,fixturePolicy:{beforeStartOnly:true,modifiedScripts:provenance.modifiedScripts,upstreamArchiveBytesModified:false,modifiedCardData:false,testMode:false,postStartFixtureInjection:false},scenarios};
  await mkdir(new URL('../docs/audits/artifacts/',import.meta.url),{recursive:true});await writeFile(new URL('../docs/audits/artifacts/native-field-batch-e-2026-10-08.json',import.meta.url),`${json(report)}\n`);return report;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const {loadNativeAuditInputs}=await import('./native-field-audit-inputs.mjs');const inputs=await loadNativeAuditInputs();const core=await inputs.coreModule.default({...inputs.initializer,sync:true});const scenarios=await auditNativeFieldBatchE(inputs,core);const report=await writeNativeFieldBatchEReport(inputs,scenarios);console.log(json(report.summary));for(const s of scenarios.filter(s=>s.status!=='passed'))console.error(s.id,s.error);if(report.summary.failed)process.exitCode=1;
}
