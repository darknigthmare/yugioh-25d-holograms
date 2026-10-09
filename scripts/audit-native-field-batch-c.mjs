import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { createNativeFieldScenarioRunner, perform, reachIdle, endTurn, enterBattle, battleAttack, leaveBattle, hasCode, requireChain, clone, json, auditFlags } from './native-field-audit-harness.mjs';

export const NATIVE_FIELD_BATCH_C_IDS = Object.freeze([34487429,93729896,44139064,65861210,7917970,51208046,26920296,25807544,89264428,66975205,71817640,91002901,56725612,12397569,78710386,35546670,75952542,28126717,13482262,67831115,22198672,43236494,90764871,75041269,22829942,49568943,69299029,61654098,55553602,79555535,1801154,84504242,13301895,86997073,69408987,69296555,11102908]);
const sha256 = value => createHash('sha256').update(value).digest('hex');
const field = (s, code) => s.add(code, 0, s.C.OcgLocation.HAND);
const begin = s => s.baseDecks().start();
const locate = (s, player, location, code) => s.location(player,location).find(card => card.code === code);
function queryField(s) { const value=s.duel.queryField(); s.queries.push({query:{field:true}, result:clone(value)}); return value; }
const noIgnition = (s, code) => assert.ok(!reachIdle(s).activates.some(card => card.code===code && card.location===s.C.OcgLocation.SZONE));
function drawField(s,code,count) {
  perform(s,'activate',code);
  const handBefore=s.location(0,s.C.OcgLocation.HAND).length;
  const deckBefore=s.location(0,s.C.OcgLocation.DECK).length;
  assert.ok(deckBefore>=count*2, 'A second draw must remain legal apart from the count limit');
  perform(s,'activate',code);
  assert.equal(s.location(0,s.C.OcgLocation.HAND).length,handBefore+count);
  const deckAfter=s.location(0,s.C.OcgLocation.DECK).length;
  assert.equal(deckAfter,deckBefore-count);
  assert.ok(deckAfter>=count, 'Enough genuine Deck cards remain for another complete draw');
  requireChain(s,code); noIgnition(s,code);
}

export async function auditNativeFieldBatchC(inputs, sharedCore) {
 const {scenarios,run}=createNativeFieldScenarioRunner(inputs,sharedCore);
 await run('rainbow-ruins-four-crystals-draw-once',[34487429],'Four genuine faceup Crystal Beast Monster Cards in Spell/Trap Zones satisfy the threshold; the ignition draws one real card, then cannot repeat despite enough genuine cards remaining for another draw.',s=>{
  field(s,34487429); for(let seq=0;seq<4;seq++)s.add(7093411,0,s.C.OcgLocation.SZONE,seq); for(let k=0;k<3;k++)s.add(89631139,0,s.C.OcgLocation.DECK); begin(s); drawField(s,34487429,1);
 });
 await run('nightmare-throne-zero-zero-fiend-search',[93729896],'Resolve the activation choice by taking genuine Yubel from Deck into hand, rather than the destruction alternative.',s=>{
  field(s,93729896).add(78371393,0,s.C.OcgLocation.DECK); begin(s); perform(s,'activate',93729896,{codes:[78371393],option:0}); requireChain(s,93729896); assert.ok(hasCode(s,0,s.C.OcgLocation.HAND,78371393)); assert.ok(!hasCode(s,0,s.C.OcgLocation.DECK,78371393));
 });
 await run('megaroid-destroy-other-search-once',[44139064],'Target another owned card, destroy it by effect and search Gyroid; the once-per-turn ignition disappears while another target and deck result remain.',s=>{
  field(s,44139064).add(5318639,0,s.C.OcgLocation.SZONE,0,s.C.OcgPosition.FACEDOWN_DEFENSE).add(5318639,0,s.C.OcgLocation.SZONE,1,s.C.OcgPosition.FACEDOWN_DEFENSE).add(18325492,0,s.C.OcgLocation.DECK).add(18325492,0,s.C.OcgLocation.DECK); begin(s); perform(s,'activate',44139064); perform(s,'activate',44139064,{codes:[5318639,18325492]}); requireChain(s,44139064); assert.ok(hasCode(s,0,s.C.OcgLocation.HAND,18325492)); assert.ok(locate(s,0,s.C.OcgLocation.GRAVE,5318639).reason & 0x40); noIgnition(s,44139064);
 });
 await run('sacred-beasts-paradise-level-ten-draw-two',[65861210],'A genuine original-Level-10 Sacred Beast enables the draw-two ignition; query both drawn cards and the consumed effect while two genuine Deck cards remain.',s=>{
  field(s,65861210).add(96345184,0,s.C.OcgLocation.MZONE); for(let k=0;k<3;k++)s.add(5318639,0,s.C.OcgLocation.DECK); begin(s); drawField(s,65861210,2);
 });
 await run('dragunity-divine-wind-grave-dragon-recovery',[7917970],'Without Dragon Ravine in GY, choose the legal recovery mode, add Blue-Eyes from GY and consume the shared ignition.',s=>{
  field(s,7917970).add(89631139,0,s.C.OcgLocation.GRAVE); begin(s); perform(s,'activate',7917970); perform(s,'activate',7917970,{codes:[89631139]}); requireChain(s,7917970); assert.ok(hasCode(s,0,s.C.OcgLocation.HAND,89631139)); assert.ok(!hasCode(s,0,s.C.OcgLocation.GRAVE,89631139)); noIgnition(s,7917970);
 });
 await run('trickstar-live-stage-activation-grave-recovery',[51208046],'The optional activation effect targets and recovers actual Trickstar Candina from GY; no token branch is claimed.',s=>{
  field(s,51208046).add(61283655,0,s.C.OcgLocation.GRAVE); begin(s); perform(s,'activate',51208046,{codes:[61283655]}); requireChain(s,51208046); assert.ok(hasCode(s,0,s.C.OcgLocation.HAND,61283655));
 });
 await run('dreamland-synchro-normal-summon-level',[26920296],'With a genuine Synchro Monster faceup, Normal Summon Alexandrite Dragon and resolve Dreamland’s trigger to increase its Level from four to five.',s=>{
  field(s,26920296).add(44508094,0,s.C.OcgLocation.MZONE).add(43096270,0,s.C.OcgLocation.HAND); begin(s); perform(s,'activate',26920296); perform(s,'summon',43096270,{chainCodes:[26920296]}); requireChain(s,26920296); assert.equal(s.card(0,s.C.OcgLocation.MZONE,1).level,5);
 });
 await run('noble-arms-museum-lp-search-fire-warrior-bonus',[25807544],'A FIRE Warrior gains exactly 500 ATK; pay an actual 1200 LP cost to search Noble Arms of Destiny and consume the search effect.',s=>{
  field(s,25807544).add(58932615,0,s.C.OcgLocation.MZONE).add(7452945,0,s.C.OcgLocation.DECK); begin(s); perform(s,'activate',25807544); assert.equal(s.card(0,s.C.OcgLocation.MZONE).attack,1700); perform(s,'activate',25807544,{codes:[7452945]}); requireChain(s,25807544); assert.equal(queryField(s).players[0].lp,6800); assert.ok(hasCode(s,0,s.C.OcgLocation.HAND,7452945)); noIgnition(s,25807544);
 });
 await run('ursarctic-big-dipper-true-special-counter',[89264428],'A legal Gilasaurus hand procedure creates the actual Special Summon event and adds exactly one native counter to Big Dipper.',s=>{
  field(s,89264428).add(45894482,0,s.C.OcgLocation.HAND); begin(s); perform(s,'activate',89264428); perform(s,'special',45894482); requireChain(s,89264428); assert.equal(s.card(0,s.C.OcgLocation.SZONE,5).counters[0x204],1);
 });
 await run('yummy-mignon-counted-light-beast-bonus',[66975205],'Three genuine LIGHT Beast monsters determine the 1500 ATK bonus to an owned Yummy; an opponent Yummy receives no bonus.',s=>{
  field(s,66975205).add(4215180,0,s.C.OcgLocation.MZONE).add(12482652,0,s.C.OcgLocation.MZONE,1).add(4215180,1,s.C.OcgLocation.MZONE); begin(s); perform(s,'activate',66975205); requireChain(s,66975205); assert.equal(s.card(0,s.C.OcgLocation.MZONE).attack,2100); assert.equal(s.card(1,s.C.OcgLocation.MZONE).attack,600); assert.equal(s.card(0,s.C.OcgLocation.MZONE,1).attack,0);
 });
 await run('dragonic-pendulum-bonus-destruction-search',[71817640],'Luster Pendulum gains 300 ATK/DEF; MST destroys the real Field and its GY trigger searches Master Pendulum from Deck.',s=>{
  field(s,71817640).add(92746535,0,s.C.OcgLocation.MZONE).add(75195825,0,s.C.OcgLocation.DECK).add(5318639,0,s.C.OcgLocation.HAND); begin(s); perform(s,'activate',71817640); assert.equal(s.card(0,s.C.OcgLocation.MZONE).attack,2150); perform(s,'activate',5318639,{codes:[71817640,75195825],chainCodes:[71817640],option:0}); requireChain(s,71817640); assert.ok(hasCode(s,0,s.C.OcgLocation.HAND,75195825)); assert.equal(s.card(0,s.C.OcgLocation.MZONE).attack,1850);
 });
 await run('assault-zone-activation-mentioned-monster-search',[91002901],'The activation searches actual Assault Beast whose official Lua mentions Assault Mode Activate.',s=>{
  field(s,91002901).add(3431737,0,s.C.OcgLocation.DECK); begin(s); perform(s,'activate',91002901,{codes:[3431737]}); requireChain(s,91002901); assert.ok(hasCode(s,0,s.C.OcgLocation.HAND,3431737));
 });
 await run('fairy-tail-ball-activation-search',[56725612],'The activation searches real Fairy Tail Luna from Deck with an actual selection and deck-to-hand move.',s=>{
  field(s,56725612).add(86937530,0,s.C.OcgLocation.DECK); begin(s); perform(s,'activate',56725612,{codes:[86937530]}); requireChain(s,56725612); assert.ok(hasCode(s,0,s.C.OcgLocation.HAND,86937530));
 });
 await run('baatistina-deck-send-opponent-three-special',[12397569],'Send a real Tistina monster from Deck by effect; three opposing faceup cards permit the following Crystal God Tistina Special Summon.',s=>{
  field(s,12397569).add(87498729,0,s.C.OcgLocation.DECK).add(86999951,0,s.C.OcgLocation.DECK).add(89631139,1,s.C.OcgLocation.MZONE).add(46986414,1,s.C.OcgLocation.MZONE,1).add(43096270,1,s.C.OcgLocation.MZONE,2); begin(s); perform(s,'activate',12397569); perform(s,'activate',12397569,{select:p=>p.selects.some(c=>c.code===87498729)?[87498729]:[86999951],effectYes:()=>false}); requireChain(s,12397569); assert.ok(locate(s,0,s.C.OcgLocation.GRAVE,87498729).reason & 0x40); assert.ok(hasCode(s,0,s.C.OcgLocation.MZONE,86999951)); noIgnition(s,12397569);
 });
 await run('rb-funk-dock-search-opponent-destruction-recover',[78710386],'Search an R.B. Spell on activation; destroying an opposing monster with Dark Hole then recovers exactly 500 LP.',s=>{
  field(s,78710386).add(5109321,0,s.C.OcgLocation.DECK).add(53129443,0,s.C.OcgLocation.HAND).add(43096270,1,s.C.OcgLocation.MZONE); begin(s); perform(s,'activate',78710386,{codes:[5109321]}); assert.ok(hasCode(s,0,s.C.OcgLocation.HAND,5109321)); perform(s,'activate',53129443); requireChain(s,78710386); assert.equal(queryField(s).players[0].lp,8500);
 });
 await run('world-legacy-scars-discard-draw-qualifying-bonus',[35546670],'Mekk-Knight Avram gains 300 ATK/DEF; discard a second genuine Avram as cost and draw one actual card, then verify the count limit while another discard partner and Deck card remain.',s=>{
  field(s,35546670).add(84754430,0,s.C.OcgLocation.MZONE).add(84754430,0,s.C.OcgLocation.HAND).add(84754430,0,s.C.OcgLocation.HAND).add(89631139,0,s.C.OcgLocation.DECK); begin(s); perform(s,'activate',35546670); assert.equal(s.card(0,s.C.OcgLocation.MZONE).attack,2300); assert.equal(s.card(0,s.C.OcgLocation.MZONE).defense,300); perform(s,'activate',35546670,{codes:[84754430]}); requireChain(s,35546670); assert.ok(locate(s,0,s.C.OcgLocation.GRAVE,84754430).reason & 0x80); assert.ok(hasCode(s,0,s.C.OcgLocation.HAND,46986414)); assert.equal(s.location(0,s.C.OcgLocation.HAND).filter(c=>c.code===84754430).length,1); assert.ok(hasCode(s,0,s.C.OcgLocation.DECK,89631139)); noIgnition(s,35546670);
 });
 await run('vaylantz-konig-opponent-column-continuous-spell',[75952542],'Place Shinra Bansho in the opponent’s Field Zone by effect, then move a same-column opponent Effect Monster into its Spell/Trap Zone with a native Continuous Spell type.',s=>{
  field(s,75952542).add(49568943,0,s.C.OcgLocation.DECK).add(89631139,0,s.C.OcgLocation.MZONE,2).add(18325492,1,s.C.OcgLocation.MZONE,2); begin(s); perform(s,'activate',75952542,{codes:[49568943]}); assert.equal(s.card(1,s.C.OcgLocation.SZONE,5).code,49568943); perform(s,'activate',75952542,{codes:[18325492]}); requireChain(s,75952542); assert.equal(s.card(1,s.C.OcgLocation.MZONE,2).code,undefined); const placed=s.card(1,s.C.OcgLocation.SZONE,2); assert.equal(placed.code,18325492); assert.equal(placed.type,s.C.OcgType.SPELL|s.C.OcgType.CONTINUOUS); noIgnition(s,75952542);
 });
 await run('floowandereeze-map-reveal-banish-true-normal',[28126717],'Reveal Toccan, banish differently named Robina from Deck and perform the Map-granted real Normal Summon, declining Toccan’s separate optional trigger.',s=>{
  field(s,28126717).add(17827173,0,s.C.OcgLocation.HAND).add(18940725,0,s.C.OcgLocation.DECK); begin(s); perform(s,'activate',28126717); perform(s,'activate',28126717,{codes:[17827173,18940725],effectYes:()=>false}); requireChain(s,28126717); assert.ok(hasCode(s,0,s.C.OcgLocation.MZONE,17827173)); assert.ok(hasCode(s,0,s.C.OcgLocation.REMOVED,18940725)); assert.ok(s.messages.some(m=>m.type===s.C.OcgMessageType.SUMMONED)); noIgnition(s,28126717);
 });
 await run('impcantation-thanatosis-two-summons-revealed-shuffle',[13482262],'Reveal Bookstone from hand, Special Summon two actual same-name Bookstones from Deck and shuffle the revealed hand copy back.',s=>{
  field(s,13482262).add(18474999,0,s.C.OcgLocation.HAND).add(18474999,0,s.C.OcgLocation.DECK).add(18474999,0,s.C.OcgLocation.DECK); begin(s); perform(s,'activate',13482262,{codes:[18474999],effectYes:()=>false}); requireChain(s,13482262); assert.equal(s.location(0,s.C.OcgLocation.MZONE).filter(c=>c.code===18474999).length,2); assert.ok(!hasCode(s,0,s.C.OcgLocation.HAND,18474999)); assert.ok(hasCode(s,0,s.C.OcgLocation.DECK,18474999));
 });
 await run('world-legacy-shadow-insect-defense-special',[67831115],'Special Summon Krawler Receptor from hand in Defense Position and query the genuine Krawler 300 ATK/DEF bonuses.',s=>{
  field(s,67831115).add(83293307,0,s.C.OcgLocation.HAND); begin(s); perform(s,'activate',67831115); perform(s,'activate',67831115,{codes:[83293307],respond:(p,C)=>p.type===C.OcgMessageType.SELECT_POSITION?{type:C.OcgResponseType.SELECT_POSITION,position:C.OcgPosition.FACEUP_DEFENSE}:null}); requireChain(s,67831115); const q=s.card(0,s.C.OcgLocation.MZONE); assert.equal(q.code,83293307); assert.equal(q.position,s.C.OcgPosition.FACEUP_DEFENSE); assert.equal(q.attack,1200); assert.equal(q.defense,1500); noIgnition(s,67831115);
 });
 await run('castle-link-real-pointed-main-zone-move',[22198672],'Target Link Spider in an Extra Monster Zone and choose the genuinely pointed Main Monster Zone through SELECT_DISFIELD; query the moved native card.',s=>{
  field(s,22198672).add(98978921,0,s.C.OcgLocation.MZONE,5); begin(s); perform(s,'activate',22198672); perform(s,'activate',22198672,{codes:[98978921]}); requireChain(s,22198672); assert.equal(s.card(0,s.C.OcgLocation.MZONE,5).code,undefined); assert.equal(s.card(0,s.C.OcgLocation.MZONE,1).code,98978921); noIgnition(s,22198672);
 });
 await run('fairy-tale-prologue-light-beast-draw',[43236494],'A genuine LIGHT Beast fulfills the draw condition; the actual ignition draws one card and becomes unavailable despite at least one complete draw remaining in Deck.',s=>{
  field(s,43236494).add(12482652,0,s.C.OcgLocation.MZONE); for(let k=0;k<3;k++)s.add(89631139,0,s.C.OcgLocation.DECK); begin(s); drawField(s,43236494,1);
 });
 await run('archfiend-strategy-banish-fiend-search',[90764871],'Banish genuine Archfiend Soldier from GY as cost and search another Archfiend card from Deck, preserving cost/effect reasons.',s=>{
  field(s,90764871).add(49881766,0,s.C.OcgLocation.GRAVE).add(49881766,0,s.C.OcgLocation.DECK); begin(s); perform(s,'activate',90764871); perform(s,'activate',90764871,{codes:[49881766],option:0}); requireChain(s,90764871); assert.ok(locate(s,0,s.C.OcgLocation.REMOVED,49881766).reason & 0x80); assert.ok(hasCode(s,0,s.C.OcgLocation.HAND,49881766)); noIgnition(s,90764871);
 });
 await run('clock-tower-opponent-standby-four-counters-dreadmaster',[75041269],'Four genuine opposing Standby Phases add four Clock Counters; MST destruction then resolves the mandatory Dreadmaster Special Summon from Deck.',s=>{
  field(s,75041269).add(40591390,0,s.C.OcgLocation.DECK).add(5318639,0,s.C.OcgLocation.HAND); begin(s); perform(s,'activate',75041269); for(let turn=0;turn<7;turn++)endTurn(s); assert.equal(s.card(0,s.C.OcgLocation.SZONE,5).counters[0x1b],4); endTurn(s); perform(s,'activate',5318639,{codes:[75041269,40591390],chainCodes:[75041269],effectYes:()=>false}); requireChain(s,75041269); assert.ok(hasCode(s,0,s.C.OcgLocation.MZONE,40591390));
 });
 await run('fusion-recycling-plant-discard-polymerization-recover',[22829942],'Pay an actual discard cost and recover original Polymerization from GY; the spent once-per-turn search is absent.',s=>{
  field(s,22829942).add(89631139,0,s.C.OcgLocation.HAND).add(24094653,0,s.C.OcgLocation.GRAVE); begin(s); perform(s,'activate',22829942); perform(s,'activate',22829942,{codes:[89631139,24094653]}); requireChain(s,22829942); assert.ok(hasCode(s,0,s.C.OcgLocation.HAND,24094653)); assert.ok(locate(s,0,s.C.OcgLocation.GRAVE,89631139).reason&0x80); noIgnition(s,22829942);
 });
 await run('vaylantz-shinra-same-column-spell-zone-summon',[49568943],'Activation places Konig Wissen in the opposite Field Zone; the ignition Special Summons a real Monster Card from Spell/Trap Zone into its own same-column Main Zone.',s=>{
  field(s,49568943).add(75952542,0,s.C.OcgLocation.DECK).add(89631139,0,s.C.OcgLocation.SZONE,3); begin(s); perform(s,'activate',49568943,{codes:[75952542]}); assert.equal(s.card(1,s.C.OcgLocation.SZONE,5).code,75952542); perform(s,'activate',49568943,{codes:[89631139]}); requireChain(s,49568943); assert.equal(s.card(0,s.C.OcgLocation.SZONE,3).code,undefined); assert.equal(s.card(0,s.C.OcgLocation.MZONE,3).code,89631139); noIgnition(s,49568943);
 });
 await run('treasures-kings-set-apophis-name-search',[69299029],'Set actual Embodiment of Apophis from Deck, query Temple of the Kings’ native changed name code and, with a genuine GY Trap, search Mystical Beast of Serket.',s=>{
  field(s,69299029).add(28649820,0,s.C.OcgLocation.DECK).add(89194033,0,s.C.OcgLocation.DECK).add(44095762,0,s.C.OcgLocation.GRAVE); begin(s); perform(s,'activate',69299029,{codes:[28649820]}); assert.ok(hasCode(s,0,s.C.OcgLocation.SZONE,28649820)); const q=s.card(0,s.C.OcgLocation.SZONE,5,s.C.OcgQueryFlags.ALIAS); assert.equal(q.alias,29762407); perform(s,'activate',69299029,{codes:[89194033]}); requireChain(s,69299029); assert.ok(hasCode(s,0,s.C.OcgLocation.HAND,89194033)); noIgnition(s,69299029);
 });
 await run('world-legacy-discovery-bilateral-chalice-bonus',[61654098],'Both players’ genuine World Chalice vanilla monsters gain 300 ATK/DEF, while an unrelated monster gains nothing; removal restores every stat.',s=>{
  field(s,61654098).add(95511642,0,s.C.OcgLocation.MZONE).add(95511642,1,s.C.OcgLocation.MZONE).add(43096270,0,s.C.OcgLocation.MZONE,1).add(5318639,0,s.C.OcgLocation.HAND); begin(s); perform(s,'activate',61654098); for(const p of [0,1]){const q=s.card(p,s.C.OcgLocation.MZONE);assert.equal(q.attack,300);assert.equal(q.defense,2400);} assert.equal(s.card(0,s.C.OcgLocation.MZONE,1).attack,2000); perform(s,'activate',5318639,{codes:[61654098]}); requireChain(s,61654098); assert.equal(s.card(0,s.C.OcgLocation.MZONE).attack,0); assert.equal(s.card(1,s.C.OcgLocation.MZONE).defense,2100);
 });
 await run('performapal-theater-distinct-types-count',[55553602],'Three owned monsters of two distinct native Types produce exactly 400 ATK per owned monster, with no opponent bonus.',s=>{
  field(s,55553602).add(43096270,0,s.C.OcgLocation.MZONE).add(89631139,0,s.C.OcgLocation.MZONE,1).add(46986414,0,s.C.OcgLocation.MZONE,2).add(89631139,1,s.C.OcgLocation.MZONE); begin(s); perform(s,'activate',55553602); requireChain(s,55553602); assert.equal(s.card(0,s.C.OcgLocation.MZONE).attack,2400); assert.equal(s.card(0,s.C.OcgLocation.MZONE,1).attack,3400); assert.equal(s.card(0,s.C.OcgLocation.MZONE,2).attack,2900); assert.equal(s.card(1,s.C.OcgLocation.MZONE).attack,3000);
 });
 await run('ignition-phoenix-pendulum-destroy-extra-search',[79555535],'A genuine Igknight Pendulum Monster gains 300 ATK/DEF; destroy it by effect, observe its faceup Extra Deck destination and search a differently named Igknight.',s=>{
  field(s,79555535).add(24131534,0,s.C.OcgLocation.MZONE).add(23296404,0,s.C.OcgLocation.DECK); begin(s); perform(s,'activate',79555535); const base=inputs.resources.cards.get(24131534); assert.equal(s.card(0,s.C.OcgLocation.MZONE).attack,base.attack+300); perform(s,'activate',79555535,{codes:[24131534,23296404]}); requireChain(s,79555535); assert.ok(hasCode(s,0,s.C.OcgLocation.EXTRA,24131534)); const pendulum=s.card(0,s.C.OcgLocation.EXTRA); assert.equal(pendulum.code,24131534); assert.ok(pendulum.position & s.C.OcgPosition.FACEUP); assert.equal(pendulum.reason & (0x1|0x40),0x1|0x40); assert.ok(hasCode(s,0,s.C.OcgLocation.HAND,23296404)); noIgnition(s,79555535);
 });
 await run('centrifugal-fusion-destroy-listed-material-revive',[1801154],'Destroy actual Blue-Eyes Ultimate Dragon by Dark Hole; the mandatory Field trigger targets its genuinely listed Blue-Eyes material in GY and Special Summons it.',s=>{
  field(s,1801154).add(23995346,0,s.C.OcgLocation.MZONE).add(89631139,0,s.C.OcgLocation.GRAVE).add(53129443,0,s.C.OcgLocation.HAND); begin(s); perform(s,'activate',1801154); perform(s,'activate',53129443,{codes:[89631139],chainCodes:[1801154]}); requireChain(s,1801154); assert.ok(hasCode(s,0,s.C.OcgLocation.GRAVE,23995346)); assert.ok(hasCode(s,0,s.C.OcgLocation.MZONE,89631139));
 });
 await run('megalith-portal-true-ritual-trigger-grave-recovery',[84504242],'Megalith Unformed genuinely Ritual Summons Ophiel by Tributing twice its Level, then Portal’s real optional trigger recovers a Ritual Monster from GY.',s=>{
  field(s,84504242).add(69003792,0,s.C.OcgLocation.HAND).add(89631139,0,s.C.OcgLocation.HAND).add(63056220,0,s.C.OcgLocation.DECK).add(90444325,0,s.C.OcgLocation.GRAVE); begin(s); perform(s,'activate',84504242); perform(s,'activate',69003792,{codes:[89631139,63056220,90444325],option:0,chainCodes:[84504242]}); requireChain(s,84504242); assert.ok(hasCode(s,0,s.C.OcgLocation.MZONE,63056220)); assert.ok(hasCode(s,0,s.C.OcgLocation.HAND,90444325)); const material=locate(s,0,s.C.OcgLocation.GRAVE,89631139); assert.equal(material.reason & (0x100000|0x8|0x40),0x100000|0x8|0x40); assert.equal(material.reason & 0x80,0);
 });
 await run('fallen-paradise-real-sacred-beast-draw-two',[13301895],'An actual named Sacred Beast enables a real two-card draw; the once-per-turn ignition cannot repeat.',s=>{
  field(s,13301895).add(69890967,0,s.C.OcgLocation.MZONE); for(let k=0;k<3;k++)s.add(89631139,0,s.C.OcgLocation.DECK); begin(s); drawField(s,13301895,2);
 });
 await run('fortissimo-hand-meklord-army-special-once',[86997073],'Special Summon genuine Meklord Army of Granel from hand and consume the ignition despite another legal Army remaining.',s=>{
  field(s,86997073).add(2137678,0,s.C.OcgLocation.HAND).add(2137678,0,s.C.OcgLocation.HAND); begin(s); perform(s,'activate',86997073); perform(s,'activate',86997073,{codes:[2137678]}); requireChain(s,86997073); assert.ok(hasCode(s,0,s.C.OcgLocation.MZONE,2137678)); assert.equal(s.location(0,s.C.OcgLocation.HAND).filter(c=>c.code===2137678).length,1); noIgnition(s,86997073);
 });
 await run('spider-web-real-attack-defense-lock',[69408987],'An opposing Blue-Eyes destroys a defender in a real battle and Web turns it to Defense. Its next own turn still forbids a manual position change; removing Web with MST restores that exact action.',s=>{
  field(s,69408987).add(43096270,0,s.C.OcgLocation.MZONE).add(89631139,1,s.C.OcgLocation.MZONE).add(5318639,1,s.C.OcgLocation.HAND); begin(s); perform(s,'activate',69408987); endTurn(s); enterBattle(s); battleAttack(s,89631139,43096270); leaveBattle(s); requireChain(s,69408987); assert.equal(s.card(1,s.C.OcgLocation.MZONE).position,s.C.OcgPosition.FACEUP_DEFENSE); assert.ok(hasCode(s,0,s.C.OcgLocation.GRAVE,43096270)); endTurn(s); endTurn(s); assert.ok(!reachIdle(s).pos_changes.some(c=>c.code===89631139)); perform(s,'activate',5318639,{codes:[69408987]}); assert.ok(reachIdle(s).pos_changes.some(c=>c.code===89631139));
 });
 await run('array-revealing-light-declared-race-summon-turn-lock',[69296555],'Declare Dragon through native ANNOUNCE_RACE; a freshly Normal Summoned Dragon cannot attack, while a preexisting Dragon and a freshly Special Summoned Dinosaur can. The Dragon restriction expires on its next turn.',s=>{
  field(s,69296555).add(11091375,1,s.C.OcgLocation.MZONE).add(43096270,1,s.C.OcgLocation.HAND).add(45894482,1,s.C.OcgLocation.HAND); begin(s); perform(s,'activate',69296555,{respond:(p,C)=>p.type===C.OcgMessageType.ANNOUNCE_RACE?{type:C.OcgResponseType.ANNOUNCE_RACE,races:[8192n]}:null}); endTurn(s); perform(s,'summon',43096270); perform(s,'special',45894482); const battle=enterBattle(s); requireChain(s,69296555); assert.ok(!battle.attacks.some(c=>c.code===43096270)); assert.ok(battle.attacks.some(c=>c.code===11091375)); assert.ok(battle.attacks.some(c=>c.code===45894482)); assert.equal(s.card(1,s.C.OcgLocation.MZONE,1).code,43096270); leaveBattle(s); endTurn(s); endTurn(s); assert.ok(enterBattle(s).attacks.some(c=>c.code===43096270));
 });
 await run('shien-castle-real-damage-calculation-only-loss',[11102908],'Blue-Eyes attacks genuine Six Samurai Zanji; the 500 ATK loss exists only during damage calculation, yielding exactly 700 damage, then query restores 3000 ATK.',s=>{
  field(s,11102908).add(95519486,0,s.C.OcgLocation.MZONE).add(89631139,1,s.C.OcgLocation.MZONE); begin(s); perform(s,'activate',11102908); endTurn(s); enterBattle(s); battleAttack(s,89631139,95519486); leaveBattle(s); requireChain(s,11102908); assert.equal(queryField(s).players[0].lp,7300); assert.equal(s.card(1,s.C.OcgLocation.MZONE).attack,3000); assert.ok(hasCode(s,0,s.C.OcgLocation.GRAVE,95519486));
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

export async function writeNativeFieldBatchCReport(inputs, scenarios) {
 const provenance=await collectBatchExecutionProvenance(inputs,scenarios,NATIVE_FIELD_BATCH_C_IDS);
 const modules=Object.fromEntries(provenance.dependencies.map(({path,sha256})=>[path,sha256]));
 const scripts=provenance.officialFieldScripts;
 const result={generatedOn:'2026-10-08',batch:'C',nativeApi:inputs.coreBuild.coreApi,coreBuild:clone(inputs.coreBuild),coreWasmSha256:sha256(new Uint8Array(inputs.initializer.wasmBinary)),flags:auditFlags(inputs.coreModule).toString(),fixtures:{beforeStartOnly:true,modifiedScripts:provenance.modifiedScripts,upstreamArchiveBytesModified:false,modifiedCardData:false,testMode:false,postStartFixtureInjection:false,startingDrawCount:0,drawCountPerTurn:0},modules,scripts,provenance,summary:{assigned:NATIVE_FIELD_BATCH_C_IDS.length,scenarios:scenarios.length,passedScenarios:scenarios.filter(s=>s.status==='passed').length,effectTested:new Set(scenarios.filter(s=>s.status==='passed').flatMap(s=>s.fields)).size},limits:['Every assigned Field has at least one real effect exercised; unlisted branches remain uncertified.','This is a headless native-core audit; no browser integration claim.'],scenarios};
 await writeFile(new URL('../docs/audits/artifacts/native-field-batch-c-2026-10-08.json',import.meta.url),`${json(result)}\n`);return result;
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){
 const {loadNativeAuditInputs}=await import('./native-field-audit-inputs.mjs');const inputs=await loadNativeAuditInputs();const core=await inputs.coreModule.default({...inputs.initializer,sync:true});const result=await writeNativeFieldBatchCReport(inputs,await auditNativeFieldBatchC(inputs,core));console.log(json(result.summary));const failures=result.scenarios.filter(s=>s.status!=='passed');if(failures.length)console.error(json(failures.map(({id,error})=>({id,error}))));assert.equal(result.summary.passedScenarios,result.summary.scenarios);assert.equal(result.summary.effectTested,NATIVE_FIELD_BATCH_C_IDS.length);
}
