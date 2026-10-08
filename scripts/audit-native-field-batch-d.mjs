import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { createNativeFieldScenarioRunner, perform, reachIdle, endTurn, enterBattle, battleAttack, leaveBattle, hasCode, requireChain, clone, json } from './native-field-audit-harness.mjs';
import { loadNativeAuditInputs } from './native-field-audit-inputs.mjs';

export const NATIVE_FIELD_BATCH_D_IDS = Object.freeze([15635751,36742774,5063379,2906939,19162134,26534688,7293697,60884672,94243005,14442329,93031067,3055018,91880660,30761649,22555834,3129133,80749819,33700664,9547962,9597987,269012,81788994,22751868,35815783,56074358,56111151,44710391,42461852,32391631,72043279,4357063,15854426,67328336,18890039,53819808,53527835,23424603,10080320]);

const gyReason = (s, player, code, reason) => {
  const card = s.location(player, s.C.OcgLocation.GRAVE).find(c => c.code === code);
  assert.ok(card && (card.reason & reason), `${code}: expected native graveyard reason ${reason}`);
};
const fieldChoices = field => ({ chainCodes: [field] });
const queryField = s => { const value=s.duel.queryField(); s.queries.push({query:{field:true},result:clone(value)});return value; };

export async function auditNativeFieldBatchD(inputs, sharedCore) {
  const {scenarios,run}=createNativeFieldScenarioRunner(inputs,sharedCore);

  await run('camelot-temporary-banish-place-table-search-and-return',[15635751],'Camelot banishes itself, places the official Round Table from Deck, searches Gallatin, and returns at the next Standby Phase replacing that Table.',s=>{
    const L=s.C.OcgLocation; s.add(15635751,0,L.HAND).add(55742055,0,L.DECK).add(14745409,0,L.DECK).baseDecks().start();
    perform(s,'activate',15635751);perform(s,'activate',15635751,{select:p=>p.selects.some(c=>c.code===55742055)?[55742055]:[14745409]});
    requireChain(s,15635751);assert.ok(hasCode(s,0,L.REMOVED,15635751));assert.equal(s.card(0,L.SZONE,5).code,55742055);assert.ok(hasCode(s,0,L.HAND,14745409));
    endTurn(s);assert.equal(s.card(0,L.SZONE,5).code,15635751);gyReason(s,0,55742055,0x400);
  });

  await run('synchro-world-opponent-destruction-summons-crimson',[36742774],'An opponent MST destroys Synchro World; its actual optional destruction chain Special Summons Crimson Dragon from the Extra Deck.',s=>{
    const L=s.C.OcgLocation;s.add(36742774,0,L.HAND).add(5318639,1,L.HAND).add(63436931,0,L.EXTRA).baseDecks().start();perform(s,'activate',36742774);endTurn(s);
    perform(s,'activate',5318639,{...fieldChoices(36742774),select:p=>p.selects.some(c=>c.code===36742774)?[36742774]:[63436931]});requireChain(s,36742774);assert.ok(hasCode(s,0,L.MZONE,63436931));gyReason(s,0,36742774,0x40);
  });

  for(const spec of [{field:5063379,search:4253484,name:'flavian-discard-gladiator-search'},{field:93031067,search:55349375,name:'shipyarrrd-discard-plunder-search'}])await run(spec.name,[spec.field],'Pay one real discard cost, search the archetype card from the official Deck, and prove the ignition turn limit.',s=>{
    const L=s.C.OcgLocation;s.add(spec.field,0,L.HAND).add(46986414,0,L.HAND).add(46986414,0,L.HAND).add(spec.search,0,L.DECK).add(spec.search,0,L.DECK).baseDecks().start();perform(s,'activate',spec.field);
    const after=perform(s,'activate',spec.field,{select:p=>p.selects[0].location===L.HAND?[46986414]:[spec.search]});requireChain(s,spec.field);gyReason(s,0,46986414,0x80);assert.ok(hasCode(s,0,L.HAND,spec.search));assert.ok(hasCode(s,0,L.HAND,46986414));assert.ok(hasCode(s,0,L.DECK,spec.search));assert.ok(!after.activates.some(c=>c.code===spec.field&&c.location===L.SZONE));
  });

  await run('ashtrashen-facedown-target-search-send',[2906939],'Target a facedown monster, search one distinct Ashtra card, then send that still-facedown target by effect.',s=>{
    const L=s.C.OcgLocation;s.add(2906939,0,L.HAND).add(46986414,0,L.MZONE,0,s.C.OcgPosition.FACEDOWN_DEFENSE).add(1710647,0,L.DECK).baseDecks().start();perform(s,'activate',2906939);
    perform(s,'activate',2906939,{select:p=>p.selects[0].location===L.MZONE?[46986414]:[1710647]});requireChain(s,2906939);assert.ok(hasCode(s,0,L.HAND,1710647));gyReason(s,0,46986414,0x40);assert.equal(s.location(0,L.MZONE).length,0);
  });

  await run('dueltaining-five-different-levels-draw-two',[19162134],'Soul Charge Special Summons five monsters with five distinct Levels simultaneously; Dueltaining draws exactly two real Deck cards.',s=>{
    const L=s.C.OcgLocation;const targets=[1929294,756652,32864,549481,2971090];s.add(19162134,0,L.HAND).add(54447022,0,L.HAND);targets.forEach(c=>s.add(c,0,L.GRAVE));s.add(89631139,0,L.DECK).baseDecks().start();perform(s,'activate',19162134);const before=s.location(0,L.HAND).length;
    perform(s,'activate',54447022,{codes:targets});requireChain(s,19162134);requireChain(s,54447022);assert.equal(s.location(0,L.MZONE).length,5);assert.equal(s.location(0,L.HAND).length,before-1+2);assert.equal(queryField(s).players[0].lp,3000);
  });

  await run('magellanica-native-level-increase-and-end-reset',[26534688],'Choose the real +1 Level branch for a WATER monster, then observe the native end-of-turn reset.',s=>{
    const L=s.C.OcgLocation;s.add(26534688,0,L.HAND).add(68638985,0,L.MZONE).baseDecks().start();perform(s,'activate',26534688);perform(s,'activate',26534688,{codes:[68638985]});requireChain(s,26534688);assert.equal(s.card(0,L.MZONE).level,3);endTurn(s);assert.equal(s.card(0,L.MZONE).level,2);
  });

  await run('perfect-toon-world-search-current-code-once',[7293697],'The Field becomes Toon World in native query and searches Toon Briefcase; the same face-up copy cannot search twice this turn.',s=>{
    const L=s.C.OcgLocation;s.add(7293697,0,L.HAND).add(5832914,0,L.DECK).add(5832914,0,L.DECK).baseDecks().start();perform(s,'activate',7293697);const after=perform(s,'activate',7293697,{codes:[5832914]});requireChain(s,7293697);assert.ok(hasCode(s,0,L.HAND,5832914));assert.ok(hasCode(s,0,L.DECK,5832914));const q=s.card(0,L.SZONE,5,s.C.OcgQueryFlags.ALIAS);assert.ok(q.code===15259703||q.alias===15259703);assert.ok(!after.activates.some(c=>c.location===L.SZONE));
  });

  await run('gold-golgonda-discard-extra-xyz-and-attack-bonus',[60884672],'Discard a Springans card as cost, summon an official Springans Xyz directly from the Extra Deck, and query its +1000 ATK.',s=>{
    const L=s.C.OcgLocation;s.add(60884672,0,L.HAND).add(20424878,0,L.HAND).add(62941499,0,L.EXTRA).baseDecks().start();perform(s,'activate',60884672);perform(s,'activate',60884672,{select:p=>p.selects[0].location===L.HAND?[20424878]:[62941499]});requireChain(s,60884672);gyReason(s,0,20424878,0x80);assert.equal(s.card(0,L.MZONE).attack,2600);assert.ok(hasCode(s,0,L.MZONE,62941499));
  });

  await run('chaos-zone-banish-counter-per-monster',[94243005],'A real Soul Release chain banishes two monsters and one Spell; Chaos Zone gains two counters, excluding the Spell.',s=>{
    const L=s.C.OcgLocation;s.add(94243005,0,L.HAND).add(5758500,0,L.HAND).add(46986414,0,L.GRAVE).add(89631139,0,L.GRAVE).add(5318639,0,L.GRAVE).baseDecks().start();perform(s,'activate',94243005);perform(s,'activate',5758500,{codes:[46986414,89631139,5318639]});requireChain(s,94243005);assert.equal(Object.values(s.card(0,L.SZONE,5).counters).reduce((a,b)=>a+b,0),2);assert.equal(s.location(0,L.REMOVED).length,3);
  });

  await run('jj-kewl-tune-tuner-tribute-search-restriction',[14442329],'Tribute one real Tuner, choose the add-to-hand branch for a Kewl Tune monster, and retain a non-Tuner hand Special Summon negative control.',s=>{
    const L=s.C.OcgLocation;s.add(14442329,0,L.HAND).add(1498130,0,L.MZONE).add(16387555,0,L.DECK).add(45894482,0,L.HAND).baseDecks().start();perform(s,'activate',14442329);assert.ok(reachIdle(s).special_summons.some(c=>c.code===45894482));
    const after=perform(s,'activate',14442329,{select:p=>p.selects[0].location===L.MZONE?[1498130]:[16387555],option:0});requireChain(s,14442329);gyReason(s,0,1498130,0x80);assert.ok(hasCode(s,0,L.HAND,16387555));assert.ok(!after.special_summons.some(c=>c.code===45894482));
  });

  await run('obsidim-destroy-field-summons-ashened',[3055018],'Destroy Obsidim with an actual MST chain; its native trigger Special Summons an Ashened monster from Deck.',s=>{
    const L=s.C.OcgLocation;s.add(3055018,0,L.HAND).add(5318639,0,L.HAND).add(35151572,0,L.DECK).baseDecks().start();perform(s,'activate',3055018);perform(s,'activate',5318639,{...fieldChoices(3055018),select:p=>p.selects.some(c=>c.code===3055018)?[3055018]:[35151572]});requireChain(s,3055018);assert.ok(hasCode(s,0,L.MZONE,35151572));gyReason(s,0,3055018,0x40);
  });

  await run('way-where-will-excavate-add-bottom',[91880660],'Excavate two actual Deck cards because the opponent controls two cards, add one, and put the remaining excavated card plus one hand card on the bottom.',s=>{
    const L=s.C.OcgLocation;s.add(91880660,0,L.HAND).add(11549357,0,L.HAND).add(89631139,0,L.DECK).add(23635815,0,L.DECK).add(46986414,1,L.MZONE).add(89631139,1,L.MZONE,1).baseDecks().start();perform(s,'activate',91880660);
    let kept=null,remaining=null,bottomOrder=null;
    perform(s,'activate',91880660,{respond:(p,C)=>{
      if(p.type===C.OcgMessageType.ANNOUNCE_NUMBER){assert.deepEqual(p.options.map(Number),[1,2]);return{type:C.OcgResponseType.ANNOUNCE_NUMBER,value:1};}
      if(p.type===C.OcgMessageType.SELECT_CARD&&p.selects[0].location===L.DECK){assert.equal(p.selects.length,2);kept=p.selects[1].code;remaining=p.selects[0].code;assert.notEqual(kept,remaining);return{type:C.OcgResponseType.SELECT_CARD,indicies:[1]};}
      if(p.type===C.OcgMessageType.SORT_CARD){assert.equal(p.cards.length,2);bottomOrder=[p.cards[1].code,p.cards[0].code];return{type:C.OcgResponseType.SORT_CARD,order:[1,0]};}
      return null;
    },select:p=>p.selects[0].location===L.HAND?[11549357]:null});
    requireChain(s,91880660);assert.ok(kept&&remaining&&bottomOrder);assert.deepEqual(s.location(0,L.HAND).map(c=>c.code),[kept]);const deck=s.location(0,L.DECK).map(c=>c.code);assert.equal(deck.length,3);assert.deepEqual(deck.slice(0,2),[...bottomOrder].reverse());assert.deepEqual([...bottomOrder].sort(),[remaining,11549357].sort());assert.ok(!deck.includes(kept));assert.ok(s.messages.some(m=>m.type===s.C.OcgMessageType.CONFIRM_DECKTOP&&m.cards.length===2));
  });

  await run('barian-untopia-protects-number-negative-control',[30761649],'An opponent Raigeki destroys an unprotected normal monster but cannot destroy Number 101 under Barian Untopia.',s=>{
    const L=s.C.OcgLocation;s.add(30761649,0,L.HAND).add(48739166,0,L.MZONE).add(46986414,0,L.MZONE,1).add(12580477,1,L.HAND).baseDecks().start();perform(s,'activate',30761649);endTurn(s);perform(s,'activate',12580477);requireChain(s,30761649);assert.ok(hasCode(s,0,L.MZONE,48739166));gyReason(s,0,46986414,0x40);s.card(0,L.MZONE);
  });

  await run('stairway-fabled-activation-sends-deck-monster',[22555834],'Choose the optional activation search-to-GY branch and send a Fabled monster from the official Deck by effect.',s=>{
    const L=s.C.OcgLocation;s.add(22555834,0,L.HAND).add(12235475,0,L.DECK).baseDecks().start();perform(s,'activate',22555834,{codes:[12235475]});requireChain(s,22555834);gyReason(s,0,12235475,0x40);assert.ok(!hasCode(s,0,L.DECK,12235475));
  });

  await run('delta-invitation-send-zombie-create-token',[3129133],'Activation sends a Level 7 Zombie from Deck, then the ignition summons the official Level 5 DARK Zombie Delta Token when a Zombie is present.',s=>{
    const L=s.C.OcgLocation;s.add(3129133,0,L.HAND).add(5186893,0,L.DECK).add(20277860,0,L.MZONE).baseDecks().start();perform(s,'activate',3129133,{codes:[5186893]});perform(s,'activate',3129133);requireChain(s,3129133);gyReason(s,0,5186893,0x40);const token=s.card(0,L.MZONE,1);assert.ok(token.type&s.C.OcgType.TOKEN);assert.equal(token.level,5);assert.equal(token.race,s.C.OcgRace.ZOMBIE);assert.equal(token.attribute,s.C.OcgAttribute.DARK);
  });

  await run('call-forgotten-sets-three-haunted-native-restriction',[80749819],'Set three Call of the Haunted from Deck on activation and prove that a non-Zombie hand Special Summon is no longer legal.',s=>{
    const L=s.C.OcgLocation;s.add(80749819,0,L.HAND).add(45894482,0,L.HAND);for(let i=0;i<3;i++)s.add(97077563,0,L.DECK);s.baseDecks().start();assert.ok(reachIdle(s).special_summons.some(c=>c.code===45894482));const after=perform(s,'activate',80749819,{codes:[97077563]});requireChain(s,80749819);assert.equal(s.location(0,L.SZONE).filter(c=>c.code===97077563).length,3);assert.ok(!after.special_summons.some(c=>c.code===45894482));for(let i=0;i<3;i++)assert.equal(s.card(0,L.SZONE,i).position,s.C.OcgPosition.FACEDOWN);
    const shuffled=s.messages.find(m=>m.type===s.C.OcgMessageType.SHUFFLE_SET_CARD);assert.ok(shuffled&&shuffled.cards.length===3);assert.deepEqual(shuffled.cards.map(c=>c.from.sequence),[0,1,2]);for(const entry of shuffled.cards){assert.equal(entry.from.controller,0);assert.equal(entry.from.location,L.SZONE);assert.equal(entry.from.position,s.C.OcgPosition.FACEDOWN);assert.deepEqual(entry.to,{controller:0,location:0,sequence:0,position:0});}
  });

  await run('call-forgotten-haunted-chain-sends-opponent-monster',[80749819],'After a real turn cycle, activate the Call of the Haunted Set by this Field: Call of the Forgotten chains to send the opposing monster to GY, then Haunted revives a Zombie.',s=>{
    const L=s.C.OcgLocation;s.add(80749819,0,L.HAND).add(97077563,0,L.DECK).add(20277860,0,L.GRAVE).add(89631139,1,L.MZONE).baseDecks().start();perform(s,'activate',80749819,{codes:[97077563]});endTurn(s);endTurn(s);
    perform(s,'activate',97077563,{...fieldChoices(80749819),select:p=>p.selects[0].location===L.GRAVE?[20277860]:[89631139]});requireChain(s,80749819);requireChain(s,97077563);assert.ok(hasCode(s,0,L.MZONE,20277860));gyReason(s,1,89631139,0x40);assert.ok(!hasCode(s,1,L.MZONE,89631139));s.card(0,L.MZONE);
  });

  await run('valvols-five-facedown-banish-cost-retrieve-archetype',[33700664],'Pay five facedown banishments from the GY, then use the official archetype recovery ignition to add a facedown banished Trirealm Rift card.',s=>{
    const L=s.C.OcgLocation;const cards=[100458031,46986414,89631139,23635815,5318639];s.add(33700664,0,L.HAND);cards.forEach(c=>s.add(c,0,L.GRAVE));s.baseDecks().start();perform(s,'activate',100458039,{codes:cards});const removed=s.location(0,L.REMOVED);assert.equal(removed.length,5);for(let i=0;i<5;i++)assert.equal(s.card(0,L.REMOVED,i).position,s.C.OcgPosition.FACEDOWN);perform(s,'activate',100458039,{codes:[100458031]});requireChain(s,100458039);assert.ok(hasCode(s,0,L.HAND,100458031));assert.equal(s.location(0,L.REMOVED).length,4);
  });

  await run('euler-graveyard-banish-discard-tindangle-search',[9547962],'Euler in the GY banishes itself and discards a Tindangle card as cost, then searches another official copy from Deck.',s=>{
    const L=s.C.OcgLocation;s.add(9547962,0,L.GRAVE).add(11375683,0,L.HAND).add(9547962,0,L.DECK).baseDecks().start();perform(s,'activate',9547962,{select:p=>p.selects[0].location===L.HAND?[11375683]:[9547962]});requireChain(s,9547962);gyReason(s,0,11375683,0x80);assert.ok(hasCode(s,0,L.REMOVED,9547962));assert.ok(hasCode(s,0,L.HAND,9547962));
  });

  await run('tenchi-kaimei-opponent-mst-revives-facedown-ninja',[9597987],'An opponent removes Tenchi from its owner Field Zone with MST; its real GY trigger revives one Ninja facedown.',s=>{
    const L=s.C.OcgLocation;s.add(9597987,0,L.HAND).add(5318639,1,L.HAND).add(4041838,0,L.GRAVE).baseDecks().start();perform(s,'activate',9597987);endTurn(s);perform(s,'activate',5318639,{...fieldChoices(9597987),select:p=>p.selects.some(c=>c.code===9597987)?[9597987]:[4041838]});requireChain(s,9597987);assert.equal(s.card(0,L.MZONE).code,4041838);assert.equal(s.card(0,L.MZONE).position,s.C.OcgPosition.FACEDOWN_DEFENSE);
  });

  await run('mound-bound-destruction-search-divine',[269012],'MST destroys Mound of the Bound Creator; its native destruction trigger searches a DIVINE monster from Deck.',s=>{
    const L=s.C.OcgLocation;s.add(269012,0,L.HAND).add(5318639,0,L.HAND).add(10000000,0,L.DECK).baseDecks().start();perform(s,'activate',269012);perform(s,'activate',5318639,{...fieldChoices(269012),select:p=>p.selects.some(c=>c.code===269012)?[269012]:[10000000]});requireChain(s,269012);assert.ok(hasCode(s,0,L.HAND,10000000));gyReason(s,0,269012,0x40);
  });

  await run('shadow-prison-shaddoll-effect-counter-opponent-turn-debuff',[81788994],'Foolish Burial sends one Shaddoll by effect, generating one Spellstone counter; the opposing normal monster loses 100 ATK only during its own turn.',s=>{
    const L=s.C.OcgLocation;s.add(81788994,0,L.HAND).add(81439173,0,L.HAND).add(3717252,0,L.DECK).add(46986414,1,L.MZONE).add(89631139,0,L.DECK).baseDecks().start();perform(s,'activate',81788994);perform(s,'activate',81439173,{codes:[3717252],yes:false});requireChain(s,81788994);assert.equal(Object.values(s.card(0,L.SZONE,5).counters).reduce((a,b)=>a+b,0),1);assert.equal(s.card(1,L.MZONE).attack,2500);endTurn(s);assert.equal(s.card(1,L.MZONE).attack,2400);
  });

  for(const spec of [{field:22751868,monster:3846170,name:'karakuri-castle-destruction-revives-level-four'},{field:56074358,monster:28124263,name:'morphtronic-map-destruction-revival'}])await run(spec.name,[spec.field],'Destroy the activated Field with a real MST chain; the official destruction trigger revives the qualifying archetype monster from GY.',s=>{
    const L=s.C.OcgLocation;s.add(spec.field,0,L.HAND).add(5318639,0,L.HAND).add(spec.monster,0,L.GRAVE).baseDecks().start();perform(s,'activate',spec.field);perform(s,'activate',5318639,{...fieldChoices(spec.field),select:p=>p.selects.some(c=>c.code===spec.field)?[spec.field]:[spec.monster]});requireChain(s,spec.field);assert.ok(hasCode(s,0,L.MZONE,spec.monster));gyReason(s,0,spec.field,0x40);s.card(0,L.MZONE);
  });

  await run('magikey-world-search-maftea-and-bottom-hand',[35815783],'Magikey World searches its Normal Monster on activation, then searches Maftea and places that monster at the actual bottom of Deck.',s=>{
    const L=s.C.OcgLocation;s.add(35815783,0,L.HAND).add(98234196,0,L.DECK).add(99426088,0,L.DECK).baseDecks().start();perform(s,'activate',35815783,{codes:[98234196]});assert.ok(hasCode(s,0,L.HAND,98234196));perform(s,'activate',35815783,{select:p=>p.selects[0].location===L.DECK?[99426088]:[98234196]});requireChain(s,35815783);assert.ok(hasCode(s,0,L.HAND,99426088));assert.ok(!hasCode(s,0,L.HAND,98234196));assert.equal(s.location(0,L.DECK)[0].code,98234196);
  });

  await run('kyoutou-counter-per-field-to-grave',[56111151],'MST destroys an opposing Set Trap, then MST itself is sent to GY by rule: Kyoutou gains two counters for the two on-field cards sent.',s=>{
    const L=s.C.OcgLocation;s.add(56111151,0,L.HAND).add(5318639,0,L.HAND).add(97077563,1,L.SZONE,0,s.C.OcgPosition.FACEDOWN_DEFENSE).baseDecks().start();perform(s,'activate',56111151);perform(s,'activate',5318639,{codes:[97077563]});requireChain(s,56111151);assert.equal(Object.values(s.card(0,L.SZONE,5).counters).reduce((a,b)=>a+b,0),2);gyReason(s,1,97077563,0x40);gyReason(s,0,5318639,0x400);
  });

  await run('earthbound-geoglyph-level-ten-field-immunity',[44710391],'A Level 10 monster activates Geoglyph protection: Heavy Storm destroys an unprotected Trap but leaves the Field intact.',s=>{
    const L=s.C.OcgLocation;s.add(44710391,0,L.HAND).add(19613556,0,L.HAND).add(10000000,0,L.MZONE).add(97077563,1,L.SZONE,0,s.C.OcgPosition.FACEDOWN_DEFENSE).baseDecks().start();perform(s,'activate',44710391);perform(s,'activate',19613556);requireChain(s,44710391);assert.equal(s.card(0,L.SZONE,5).code,44710391);gyReason(s,1,97077563,0x40);
  });

  await run('cynet-storm-linked-monster-stats',[42461852],'An official Link Spider points from the Extra Monster Zone to a normal monster; Cynet Storm buffs the linked normal while leaving an unlinked negative control unchanged.',s=>{
    const L=s.C.OcgLocation;s.add(42461852,0,L.HAND).add(98978921,0,L.MZONE,5).add(46986414,0,L.MZONE,1).add(23635815,0,L.MZONE,3).baseDecks().start();perform(s,'activate',42461852);requireChain(s,42461852);const linked=s.card(0,L.MZONE,1);assert.equal(linked.attack,3000);assert.equal(linked.defense,2600);assert.equal(s.card(0,L.MZONE,3).attack,1750);
  });

  await run('savage-colosseum-end-destroys-nonattacker',[32391631],'At the real End Phase, Savage Colosseum destroys the turn player’s face-up attack monster that did not declare an attack, preserving the defense-position negative control.',s=>{
    const L=s.C.OcgLocation;s.add(32391631,0,L.HAND).add(46986414,0,L.MZONE).add(23635815,0,L.MZONE,1,s.C.OcgPosition.FACEUP_DEFENSE).baseDecks().start();perform(s,'activate',32391631);endTurn(s);requireChain(s,32391631);gyReason(s,0,46986414,0x40);assert.equal(s.card(0,L.MZONE,1).code,23635815);
  });

  await run('supreme-castle-damage-step-evil-hero-cost',[72043279],'During an actual Fiend battle, send a Level 6 Evil HERO from Extra Deck as cost; the native +1200 ATK changes battle outcome and persists until End Phase.',s=>{
    const L=s.C.OcgLocation;s.add(72043279,0,L.HAND).add(95943058,0,L.MZONE).add(21947653,0,L.EXTRA).add(23635815,1,L.MZONE).baseDecks().start();perform(s,'activate',72043279);endTurn(s);endTurn(s);enterBattle(s);battleAttack(s,95943058,23635815,{...fieldChoices(72043279),codes:[21947653]});leaveBattle(s);requireChain(s,72043279);gyReason(s,0,21947653,0x80);gyReason(s,1,23635815,0x20);assert.equal(s.card(0,L.MZONE).attack,2800);endTurn(s);assert.equal(s.card(0,L.MZONE).attack,1600);
  });

  await run('chronomaly-babylon-matching-level-banish-and-revive',[4357063],'Banish one Level 3 Chronomaly as actual cost and target/revive another Level 3 Chronomaly, excluding a Level 4 GY negative control.',s=>{
    const L=s.C.OcgLocation;s.add(4357063,0,L.HAND).add(15941690,0,L.GRAVE).add(25163248,0,L.GRAVE).add(67559101,0,L.GRAVE).baseDecks().start();perform(s,'activate',4357063);perform(s,'activate',4357063,{select:p=>p.selects.some(c=>c.code===15941690)?[15941690]:[25163248]});requireChain(s,4357063);assert.ok(hasCode(s,0,L.REMOVED,15941690));assert.ok(hasCode(s,0,L.MZONE,25163248));assert.ok(hasCode(s,0,L.GRAVE,67559101));s.card(0,L.MZONE);
  });

  await run('divine-wind-bounce-wind-summons-deck',[15854426],'Compulsory Evacuation bounces a face-up WIND monster; Divine Wind’s official trigger summons a Level 4 WIND monster from Deck.',s=>{
    const L=s.C.OcgLocation;s.add(15854426,0,L.HAND).add(82199284,0,L.MZONE).add(82199284,0,L.DECK).add(94192409,0,L.SZONE,0,s.C.OcgPosition.FACEDOWN_DEFENSE).baseDecks().start();perform(s,'activate',15854426);endTurn(s);endTurn(s);perform(s,'activate',94192409,{...fieldChoices(15854426),codes:[82199284]});requireChain(s,15854426);assert.ok(hasCode(s,0,L.HAND,82199284));assert.ok(hasCode(s,0,L.MZONE,82199284));assert.ok(!hasCode(s,0,L.DECK,82199284));s.card(0,L.MZONE);
  });

  await run('meklord-fortress-destruction-emperor-search',[67328336],'Destroy the actual Field with MST; the official GY trigger searches a Meklord Emperor from Deck.',s=>{
    const L=s.C.OcgLocation;s.add(67328336,0,L.HAND).add(5318639,0,L.HAND).add(68140974,0,L.DECK).baseDecks().start();perform(s,'activate',67328336);perform(s,'activate',5318639,{...fieldChoices(67328336),select:p=>p.selects.some(c=>c.code===67328336)?[67328336]:[68140974]});requireChain(s,67328336);assert.ok(hasCode(s,0,L.HAND,68140974));gyReason(s,0,67328336,0x40);
  });

  await run('libromancer-first-search-different-controlled-name',[18890039],'The activation searches a Libromancer whose name differs from the controlled Libromancer, and excludes the same-name Deck negative control.',s=>{
    const L=s.C.OcgLocation;s.add(18890039,0,L.HAND).add(16312943,0,L.MZONE).add(16312943,0,L.DECK).add(46123974,0,L.DECK).baseDecks().start();perform(s,'activate',18890039,{select:p=>{assert.ok(!p.selects.some(c=>c.code===16312943));return[46123974];}});requireChain(s,18890039);assert.ok(hasCode(s,0,L.HAND,46123974));assert.ok(hasCode(s,0,L.DECK,16312943));
  });

  await run('temple-six-normal-summon-bushido-opponent-attack',[53819808],'Normal Summon one official Six Samurai, query one Bushido counter and the opponent’s -100 ATK, then resolve Monster Reborn for a second Samurai and verify the second counter.',s=>{
    const L=s.C.OcgLocation;s.add(53819808,0,L.HAND).add(27782503,0,L.HAND).add(83764718,0,L.HAND).add(31904181,0,L.GRAVE).add(46986414,1,L.MZONE).baseDecks().start();perform(s,'activate',53819808);perform(s,'summon',27782503);assert.equal(Object.values(s.card(0,L.SZONE,5).counters).reduce((a,b)=>a+b,0),1);assert.equal(s.card(1,L.MZONE).attack,2400);perform(s,'activate',83764718,{codes:[31904181]});requireChain(s,53819808);assert.equal(Object.values(s.card(0,L.SZONE,5).counters).reduce((a,b)=>a+b,0),2);assert.equal(s.card(1,L.MZONE).attack,2300);
  });

  await run('dark-city-real-battle-damage-calculation-only',[53527835],'A 1400 ATK Destiny HERO attacks a 1750 ATK normal monster: Dark City’s calculation-only +1000 wins the battle for 650 damage, then immediately resets.',s=>{
    const L=s.C.OcgLocation;s.add(53527835,0,L.HAND).add(13093792,0,L.MZONE).add(23635815,1,L.MZONE).baseDecks().start();perform(s,'activate',53527835);endTurn(s);endTurn(s);enterBattle(s);battleAttack(s,13093792,23635815);leaveBattle(s);requireChain(s,53527835);gyReason(s,1,23635815,0x20);assert.equal(queryField(s).players[1].lp,7350);assert.equal(s.card(0,L.MZONE).attack,1400);
  });

  for(const spec of [{field:23424603,bonus:200,name:'wasteland-three-races-two-players-negative-control'},{field:10080320,bonus:300,name:'jurassic-world-dinosaur-both-sides-negative-control'}])await run(spec.name,[spec.field],'Activate a real Field chain, query Dinosaur stats for both players, Zombie and Rock matching only Wasteland, and an unchanged Spellcaster negative control.',s=>{
    const L=s.C.OcgLocation;s.add(spec.field,0,L.HAND).add(45894482,0,L.MZONE).add(45894482,1,L.MZONE).add(46986414,0,L.MZONE,1).add(32864,0,L.MZONE,2).add(11549357,1,L.MZONE,1).baseDecks().start();perform(s,'activate',spec.field);requireChain(s,spec.field);for(const p of[0,1]){const q=s.card(p,L.MZONE);assert.equal(q.attack,1400+spec.bonus);assert.equal(q.defense,400+spec.bonus);}assert.equal(s.card(0,L.MZONE,1).attack,2500);
    for(const[player,sequence,code]of[[0,2,32864],[1,1,11549357]]){const printed=inputs.resources.cards.get(code),q=s.card(player,L.MZONE,sequence),bonus=spec.field===23424603?200:0;assert.equal(q.attack,printed.attack+bonus);assert.equal(q.defense,printed.defense+bonus);}
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

if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){
  const inputs=await loadNativeAuditInputs();
  const core=await inputs.coreModule.default({...inputs.initializer,sync:true});
  const scenarios=await auditNativeFieldBatchD(inputs,core);
  const provenance=await collectBatchExecutionProvenance(inputs,scenarios,NATIVE_FIELD_BATCH_D_IDS);
  const dependencies=provenance.dependencies,assignedScripts=provenance.officialFieldScripts;
  const passedFields=new Set(scenarios.filter(s=>s.status==='passed').flatMap(s=>s.fields));
  const result={generatedOn:'2026-10-08',lot:'d',
    moduleSha256:dependencies[0].sha256,harnessSha256:dependencies[1].sha256,
    dependencies,assignedScripts,provenance,nativeApi:core.getVersion(),coreBuild:inputs.coreBuild,
    fixture:{beforeStartOnly:true,modifiedScripts:provenance.modifiedScripts,upstreamArchiveBytesModified:false,modifiedCardData:false,testMode:false,postStartInjection:false},
    summary:{assignedFields:NATIVE_FIELD_BATCH_D_IDS.length,effectTested:passedFields.size,
      scenarios:scenarios.length,passed:scenarios.filter(s=>s.status==='passed').length},
    limits:['Only the effects specified in each scenario are exercised; all other branches remain uncertified.',
      'Headless native protocol evidence; browser integration is measured separately.'],scenarios};
  const destination=new URL('../docs/audits/artifacts/native-field-batch-d-2026-10-08.json',import.meta.url);
  await mkdir(new URL('.',destination),{recursive:true});await writeFile(destination,json(result)+'\n');
  console.log(json(result.summary));
  console.log(json(scenarios.filter(s=>s.status!=='passed').map(({id,error,errors})=>({id,error,errors}))));
  assert.equal(result.summary.passed,result.summary.scenarios);
  assert.deepEqual([...passedFields].sort((a,b)=>a-b),[...NATIVE_FIELD_BATCH_D_IDS].sort((a,b)=>a-b));
  for(const scenario of scenarios){
    assert.ok(scenario.messages.length&&scenario.decisions.length&&scenario.queries.length&&scenario.fixtureCards.length);
    assert.deepEqual(scenario.errors,[]);
  }
}
