import assert from 'node:assert/strict';
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {createNativeFieldScenarioRunner, reachIdle, perform, endTurn, enterBattle, battleAttack, leaveBattle, hasCode, requireChain, clone, json, defaultResponse} from './native-field-audit-harness.mjs';

export const NATIVE_FIELD_BATCH_B_IDS=Object.freeze([63492244,31322640,66059345,35550352,8794055,39513225,77946022,37654623,24382602,15388353,95658967,3875465,84335863,36890111,53639887,1003840,53039326,15306543,50186558,12931061,33773528,63883999,74378580,17255673,94317736,34225426,7617062,71650854,20720928,28388296,52518793,1127737,99795159,50433147,41128647,28120197,87430998,92481084]);

export async function auditNativeFieldBatchB(inputs, sharedCore) {
 const {scenarios,run}=createNativeFieldScenarioRunner(inputs,sharedCore);
 const code=name=>{const hit=[...inputs.resources.metadata].find(([id,m])=>m.name===name&&!inputs.resources.cards.get(id)?.alias);assert.ok(hit,`Missing official fixture ${name}`);return hit[0];};
 const runField=async(field,slug,description,exercise)=>{
  await run(`batch-b-${slug}`,[field],description,s=>{exercise(s);requireChain(s,field);assert.ok(s.queries.length>0);assert.ok(s.decisions.length>0);});
 };
 const fieldQuery=s=>{const q=s.duel.queryField();s.queries.push({query:{field:true},result:clone(q)});return q;};
 const spell=5318639, dark=46986414, blue=89631139, luster=11091375;
 const activate=s=>perform(s,'activate',s.fixtureCards.find(c=>NATIVE_FIELD_BATCH_B_IDS.includes(c.canonicalCode)).canonicalCode);

 await runField(63492244,'trickstar-set-lock-end-return','Light Arena targets a Set opposing MST; its card stays Set until the End Phase and is returned to the opponent hand by the native mandatory operation.',s=>{
  s.add(63492244,0,s.C.OcgLocation.HAND).add(spell,1,s.C.OcgLocation.SZONE,0,s.C.OcgPosition.FACEDOWN_DEFENSE).baseDecks().start();activate(s);perform(s,'activate',63492244,{codes:[spell]});
  assert.equal(s.card(1,s.C.OcgLocation.SZONE).position,s.C.OcgPosition.FACEDOWN_DEFENSE);
  endTurn(s,{yes:false});assert.ok(hasCode(s,1,s.C.OcgLocation.HAND,spell));assert.ok(!hasCode(s,1,s.C.OcgLocation.SZONE,spell));
 });
 await runField(31322640,'allure-spellcaster-stats','Allure Palace grants exactly 500 ATK/DEF to the controller Spellcaster, leaving its Dragon and the opposing Spellcaster unchanged.',s=>{
  s.add(31322640,0,s.C.OcgLocation.HAND).add(dark,0,s.C.OcgLocation.MZONE).add(blue,0,s.C.OcgLocation.MZONE,1).add(dark,1,s.C.OcgLocation.MZONE).baseDecks().start();
  const before=s.card(0,s.C.OcgLocation.MZONE);activate(s);const after=s.card(0,s.C.OcgLocation.MZONE);assert.equal(after.attack,before.attack+500);assert.equal(after.defense,before.defense+500);assert.equal(s.card(0,s.C.OcgLocation.MZONE,1).attack,3000);assert.equal(s.card(1,s.C.OcgLocation.MZONE).attack,2500);
 });
 await runField(66059345,'materiactor-excavate-reorder-six','Meltthrough actually excavates six distinct official cards and the typed SORT_CARD response reverses their order; native deck query verifies the resulting top six.',s=>{
  const cards=[dark,blue,luster,spell,code('Monster Reborn'),code('Pot of Greed')];s.add(66059345,0,s.C.OcgLocation.HAND);cards.forEach(c=>s.add(c,0,s.C.OcgLocation.DECK));s.add(dark,1,s.C.OcgLocation.DECK).start();
  const before=s.location(0,s.C.OcgLocation.DECK).map(c=>c.code);perform(s,'activate',66059345,{sort:p=>p.cards.map((_,i)=>p.cards.length-1-i)});const after=s.location(0,s.C.OcgLocation.DECK).map(c=>c.code);
  assert.deepEqual(after,before.toReversed());assert.ok(s.decisions.some(d=>d.prompt.type===s.C.OcgMessageType.SORT_CARD&&d.prompt.cards.length===6));assert.ok(s.messages.some(m=>m.type===s.C.OcgMessageType.CONFIRM_DECKTOP));
 });
 await runField(35550352,'vanquish-different-attribute-search','Start targets the FIRE Vanquish Soul Razen and searches DARK Dr. Mad Love; the once-per-turn ignition is then absent.',s=>{
  const razen=code('Vanquish Soul Razen'),love=code('Vanquish Soul Dr. Mad Love');s.add(35550352,0,s.C.OcgLocation.HAND).add(razen,0,s.C.OcgLocation.MZONE).add(love,0,s.C.OcgLocation.DECK).baseDecks().start();activate(s);perform(s,'activate',35550352,{codes:[razen,love]});assert.ok(hasCode(s,0,s.C.OcgLocation.HAND,love));assert.ok(!reachIdle(s).activates.some(c=>c.code===35550352));
 });
 await runField(8794055,'ghoti-banish-fish-cost-search','Deepest Depths banishes a Fish from the hand as cost before searching an official Ghoti monster from the Deck.',s=>{
  const fish=code('7 Colored Fish'),ghoti=code('Eanoc, Sentry of the Ghoti');s.add(8794055,0,s.C.OcgLocation.HAND).add(fish,0,s.C.OcgLocation.HAND).add(ghoti,0,s.C.OcgLocation.DECK).baseDecks().start();activate(s);perform(s,'activate',8794055,{codes:[fish,ghoti],yes:false});assert.ok(hasCode(s,0,s.C.OcgLocation.HAND,ghoti));const cost=s.location(0,s.C.OcgLocation.REMOVED).find(c=>c.code===fish);assert.ok(cost&&(cost.reason&0x80));
 });
 await runField(39513225,'barian-search-discard','Seventh Untopia searches Umbral Horror Ghoul, then discards a different hand card by effect while keeping the searched card.',s=>{
  const ghoul=code('Umbral Horror Ghoul');s.add(39513225,0,s.C.OcgLocation.HAND).add(dark,0,s.C.OcgLocation.HAND).add(ghoul,0,s.C.OcgLocation.DECK).baseDecks().start();activate(s);perform(s,'activate',39513225,{select:p=>p.selects.some(c=>c.code===dark)?[dark]:[ghoul]});assert.ok(hasCode(s,0,s.C.OcgLocation.HAND,ghoul));const discard=s.location(0,s.C.OcgLocation.GRAVE).find(c=>c.code===dark);assert.ok(discard&&(discard.reason&0x40));
 });
 await runField(77946022,'tenyinfinity-activation-search','The activation optional effect searches Vessel for the Dragon Cycle from the official Deck.',s=>{
  const vessel=65124425;s.add(77946022,0,s.C.OcgLocation.HAND).add(vessel,0,s.C.OcgLocation.DECK).baseDecks().start();perform(s,'activate',77946022,{codes:[vessel]});assert.ok(hasCode(s,0,s.C.OcgLocation.HAND,vessel));assert.ok(!hasCode(s,0,s.C.OcgLocation.DECK,vessel));
 });
 await runField(37654623,'coulomb-real-hand-normal-boost','Coulomb gives a genuinely Normal Summoned Luster Dragon from hand 500 ATK/DEF; a pre-existing monster does not receive the summon-location bonus.',s=>{
  s.add(37654623,0,s.C.OcgLocation.HAND).add(luster,0,s.C.OcgLocation.HAND).add(dark,0,s.C.OcgLocation.MZONE).baseDecks().start();activate(s);perform(s,'summon',luster);const dragon=s.card(0,s.C.OcgLocation.MZONE,1);assert.equal(dragon.code,luster);assert.equal(dragon.attack,2400);assert.equal(dragon.defense,2100);assert.equal(s.card(0,s.C.OcgLocation.MZONE).attack,2500);
 });
 await runField(24382602,'mausoleum-normal-level-buff','Mausoleum sends a Level 8 Normal Blue-Eyes from Deck to GY and grants the targeted Dark Magician exactly 800 ATK/DEF until turn end.',s=>{
  s.add(24382602,0,s.C.OcgLocation.HAND).add(dark,0,s.C.OcgLocation.MZONE).add(blue,0,s.C.OcgLocation.DECK).baseDecks().start();activate(s);perform(s,'activate',24382602,{select:p=>p.selects.some(c=>c.location===s.C.OcgLocation.MZONE)?[dark]:[blue]});assert.equal(s.card(0,s.C.OcgLocation.MZONE).attack,3300);assert.equal(s.card(0,s.C.OcgLocation.MZONE).defense,2900);assert.ok(hasCode(s,0,s.C.OcgLocation.GRAVE,blue));endTurn(s);assert.equal(s.card(0,s.C.OcgLocation.MZONE).attack,2500);
 });
 await runField(15388353,'nouvelles-activation-recipe','At Table searches a real Recipe Ritual Spell from Deck through its optional activation effect.',s=>{
  const recipe=code('Recette de Viande (Meat Recipe)');s.add(15388353,0,s.C.OcgLocation.HAND).add(recipe,0,s.C.OcgLocation.DECK).baseDecks().start();perform(s,'activate',15388353,{codes:[recipe]});assert.ok(hasCode(s,0,s.C.OcgLocation.HAND,recipe));assert.ok(!hasCode(s,0,s.C.OcgLocation.DECK,recipe));
 });
 await runField(95658967,'ritual-sanctuary-discard-spell-search','Ritual Sanctuary discards MST as cost to search Hamburger Recipe; the native GY reason contains COST and DISCARD.',s=>{
  const recipe=code('Hamburger Recipe');s.add(95658967,0,s.C.OcgLocation.HAND).add(spell,0,s.C.OcgLocation.HAND).add(recipe,0,s.C.OcgLocation.DECK).baseDecks().start();activate(s);perform(s,'activate',95658967,{codes:[spell,recipe]});assert.ok(hasCode(s,0,s.C.OcgLocation.HAND,recipe));const cost=s.location(0,s.C.OcgLocation.GRAVE).find(c=>c.code===spell);assert.ok(cost&&(cost.reason&0x80)&&(cost.reason&0x4000));
 });
 await runField(3875465,'appliancer-activation-search','Electrilyrical World searches an official non-Field Appliancer monster from Deck.',s=>{
  const partner=5846183;s.add(3875465,0,s.C.OcgLocation.HAND).add(partner,0,s.C.OcgLocation.DECK).baseDecks().start();perform(s,'activate',3875465,{codes:[partner]});assert.ok(hasCode(s,0,s.C.OcgLocation.HAND,partner));assert.ok(!hasCode(s,0,s.C.OcgLocation.DECK,partner));
 });
 await runField(84335863,'white-rose-plant-special','White Rose Cloister Special Summons Spore from the hand while no monsters are controlled; the effect cannot be reused after the summon.',s=>{
  const plant=11747708;s.add(84335863,0,s.C.OcgLocation.HAND).add(plant,0,s.C.OcgLocation.HAND).baseDecks().start();activate(s);perform(s,'activate',84335863,{codes:[plant]});assert.equal(s.card(0,s.C.OcgLocation.MZONE).code,plant);assert.ok(!hasCode(s,0,s.C.OcgLocation.HAND,plant));assert.ok(!reachIdle(s).activates.some(c=>c.code===84335863));
 });
 await runField(36890111,'gimmick-mansion-search','Mansion of the Dreadful Dolls searches Gimmick Puppet Humpty Dumpty from the Deck on activation.',s=>{
  const puppet=8226374;s.add(36890111,0,s.C.OcgLocation.HAND).add(puppet,0,s.C.OcgLocation.DECK).baseDecks().start();perform(s,'activate',36890111,{codes:[puppet]});assert.ok(hasCode(s,0,s.C.OcgLocation.HAND,puppet));assert.ok(!hasCode(s,0,s.C.OcgLocation.DECK,puppet));
 });
 await runField(53639887,'snake-eye-monster-continuous-spell','Temple places Snake-Eye Ash from Deck into the S/T Zone as a native Continuous Spell; a second Level 1 FIRE Ash gains 1100 ATK while Dark Magician is unchanged.',s=>{
  const ash=9674034;s.add(53639887,0,s.C.OcgLocation.HAND).add(ash,0,s.C.OcgLocation.DECK).add(ash,0,s.C.OcgLocation.MZONE).add(dark,0,s.C.OcgLocation.MZONE,1).baseDecks().start();perform(s,'activate',53639887,{codes:[ash],yes:true});const placed=s.card(0,s.C.OcgLocation.SZONE);assert.equal(placed.code,ash);assert.ok(placed.type&s.C.OcgType.SPELL);assert.ok(placed.type&s.C.OcgType.CONTINUOUS);assert.equal(s.card(0,s.C.OcgLocation.MZONE).attack,1900);assert.equal(s.card(0,s.C.OcgLocation.MZONE,1).attack,2500);
 });
 await runField(1003840,'starlight-tuner-tribute-different-level','Starlight Junktion Tributes a Level 1 Jet Synchron as cost and Special Summons Level 3 Junk Synchron from Deck.',s=>{
  const jet=9742784,junk=code('Junk Synchron');s.add(1003840,0,s.C.OcgLocation.HAND).add(jet,0,s.C.OcgLocation.MZONE).add(junk,0,s.C.OcgLocation.DECK).baseDecks().start();activate(s);perform(s,'activate',1003840,{codes:[jet,junk],yes:false});assert.equal(s.card(0,s.C.OcgLocation.MZONE).code,junk);assert.equal(s.card(0,s.C.OcgLocation.MZONE).level,3);const cost=s.location(0,s.C.OcgLocation.GRAVE).find(c=>c.code===jet);assert.ok(cost&&(cost.reason&0x80)&&(cost.reason&0x2));
 });
 await runField(53039326,'iron-lab-maintenance-destruction','Iron Core Specimen Lab reaches its real End Phase maintenance with no Iron Core in hand and destroys itself by COST.',s=>{
  s.add(53039326,0,s.C.OcgLocation.HAND).baseDecks().start();activate(s);assert.equal(s.card(0,s.C.OcgLocation.SZONE,5).code,53039326);endTurn(s);const gone=s.location(0,s.C.OcgLocation.GRAVE).find(c=>c.code===53039326);assert.ok(gone&&(gone.reason&0x80)&&(gone.reason&0x1));assert.ok(!hasCode(s,0,s.C.OcgLocation.SZONE,53039326));
 });
 await runField(15306543,'stars-align-spirit-return-recovery','A genuinely Normal Summoned WIND Spirit Shinobird Crow returns to hand at the End Phase; Stars Align then recovers a Ritual Spell from GY.',s=>{
  const crow=39817919,recipe=code('Hamburger Recipe');s.add(15306543,0,s.C.OcgLocation.HAND).add(crow,0,s.C.OcgLocation.HAND).add(recipe,0,s.C.OcgLocation.GRAVE).baseDecks().start();activate(s);perform(s,'summon',crow);endTurn(s,{codes:[recipe]});assert.ok(hasCode(s,0,s.C.OcgLocation.HAND,crow));assert.ok(hasCode(s,0,s.C.OcgLocation.HAND,recipe));assert.ok(!hasCode(s,0,s.C.OcgLocation.GRAVE,recipe));assert.ok(s.messages.filter(m=>m.type===s.C.OcgMessageType.CHAINING&&m.code===15306543).length>=2);
 });
 await runField(50186558,'guardragon-total-link-rating','Guardragon Shield targets Blue-Eyes and grants 200 ATK/DEF from two genuine Link-1 monsters, including the opponent Link Monster; the Dragon remains boosted after the controller turn.',s=>{
  const spider=code('Link Spider');s.add(50186558,0,s.C.OcgLocation.HAND).add(blue,0,s.C.OcgLocation.MZONE).add(spider,0,s.C.OcgLocation.MZONE,1).add(spider,1,s.C.OcgLocation.MZONE).baseDecks().start();activate(s);perform(s,'activate',50186558,{codes:[blue]});assert.equal(s.card(0,s.C.OcgLocation.MZONE).attack,3200);assert.equal(s.card(0,s.C.OcgLocation.MZONE).defense,2700);endTurn(s);assert.equal(s.card(0,s.C.OcgLocation.MZONE).attack,3200);
 });
 await runField(12931061,'ua-search-paid-extra-normal','Hyper Stadium searches U.A. Midfielder, then reveals Forest and pays 1000 LP to allow its Normal Summon after an ordinary Luster Dragon Normal Summon.',s=>{
  const midfielder=72491806;s.add(12931061,0,s.C.OcgLocation.HAND).add(87430998,0,s.C.OcgLocation.HAND).add(luster,0,s.C.OcgLocation.HAND).add(midfielder,0,s.C.OcgLocation.DECK).baseDecks().start();perform(s,'activate',12931061,{codes:[midfielder]});assert.ok(hasCode(s,0,s.C.OcgLocation.HAND,midfielder));perform(s,'summon',luster);assert.ok(!reachIdle(s).summons.some(c=>c.code===midfielder));perform(s,'activate',12931061,{codes:[87430998]});assert.equal(fieldQuery(s).players[0].lp,7000);perform(s,'summon',midfielder);assert.ok(hasCode(s,0,s.C.OcgLocation.MZONE,midfielder));assert.ok(hasCode(s,0,s.C.OcgLocation.HAND,87430998));
 });
 await runField(33773528,'amazement-set-turn-attraction','Precious Park allows a genuinely Set Attraction Trap to activate in that same Main Phase, equip the opponent Blue-Eyes and reduce it by 500 ATK.',s=>{
  const trap=29867611;s.add(33773528,0,s.C.OcgLocation.HAND).add(trap,0,s.C.OcgLocation.HAND).add(blue,1,s.C.OcgLocation.MZONE).baseDecks().start();activate(s);let p=reachIdle(s);const index=p.spell_sets.findIndex(c=>c.code===trap);assert.ok(index>=0);s.respond({type:s.C.OcgResponseType.SELECT_IDLECMD,action:s.C.SelectIdleCMDAction.SELECT_SPELL_SET,index});p=reachIdle(s);assert.ok(p.activates.some(c=>c.code===trap));perform(s,'activate',trap,{codes:[blue]});assert.equal(s.card(1,s.C.OcgLocation.MZONE).attack,2500);assert.equal(s.card(0,s.C.OcgLocation.SZONE).code,trap);assert.ok(s.messages.some(m=>m.type===s.C.OcgMessageType.EQUIP));
 });
 await runField(63883999,'archfiend-controller-fiend-buff','Archfiend Palabyrinth gives exactly 500 ATK to the controller Summoned Skull; its Spellcaster and opposing Summoned Skull stay unchanged.',s=>{
  const skull=code('Summoned Skull');s.add(63883999,0,s.C.OcgLocation.HAND).add(skull,0,s.C.OcgLocation.MZONE).add(dark,0,s.C.OcgLocation.MZONE,1).add(skull,1,s.C.OcgLocation.MZONE).baseDecks().start();activate(s);assert.equal(s.card(0,s.C.OcgLocation.MZONE).attack,3000);assert.equal(s.card(0,s.C.OcgLocation.MZONE,1).attack,2500);assert.equal(s.card(1,s.C.OcgLocation.MZONE).attack,2500);
 });
 await runField(74378580,'gmx-set-and-stack-hand','GMX Lab Sets an official GMX Spell from Deck, then places Dark Magician from hand onto the real top of the Deck.',s=>{
  const gmx=18795635;s.add(74378580,0,s.C.OcgLocation.HAND).add(dark,0,s.C.OcgLocation.HAND).add(gmx,0,s.C.OcgLocation.DECK).baseDecks().start();activate(s);perform(s,'activate',74378580,{codes:[gmx,dark]});const set=s.card(0,s.C.OcgLocation.SZONE);assert.equal(set.code,gmx);assert.ok(set.position&s.C.OcgPosition.FACEDOWN);assert.ok(!hasCode(s,0,s.C.OcgLocation.HAND,dark));assert.equal(s.location(0,s.C.OcgLocation.DECK).at(-1).code,dark);
 });
 await runField(17255673,'mikanko-forced-equipped-target','Heavenly Gate forces the opponent to attack an equipped Dark Magician rather than an unequipped Blue-Eyes; native battle target selection is restricted and the attacker loses 1600 LP.',s=>{
  const axe=code('Axe of Despair');s.add(17255673,0,s.C.OcgLocation.HAND).add(axe,0,s.C.OcgLocation.HAND).add(dark,0,s.C.OcgLocation.MZONE).add(blue,0,s.C.OcgLocation.MZONE,1).add(luster,1,s.C.OcgLocation.MZONE).baseDecks().start();activate(s);perform(s,'activate',axe,{codes:[dark]});assert.equal(s.card(0,s.C.OcgLocation.MZONE).attack,3500);endTurn(s);const battle=enterBattle(s);assert.equal(battle.to_m2,false);battleAttack(s,luster,dark,{select:p=>{assert.ok(p.selects.every(c=>c.code===dark));return [dark];}});leaveBattle(s);assert.equal(fieldQuery(s).players[1].lp,6400);assert.ok(hasCode(s,0,s.C.OcgLocation.MZONE,blue));
 });
 await runField(94317736,'hidden-springs-main-two-recovery','Hidden Springs ignition is absent in Main Phase 1, becomes legal in a real Main Phase 2, and recovers exactly 500 LP.',s=>{
  s.add(94317736,0,s.C.OcgLocation.HAND).baseDecks().start();activate(s);assert.ok(!reachIdle(s).activates.some(c=>c.code===94317736));endTurn(s);enterBattle(s);leaveBattle(s);perform(s,'activate',94317736);assert.equal(fieldQuery(s).players[1].lp,8500);assert.ok(!reachIdle(s).activates.some(c=>c.code===94317736));s.card(0,s.C.OcgLocation.SZONE,5);
 });
 await runField(34225426,'perlegia-controller-fusion-buff','Perlegia gives 500 ATK to a controller Fusion type monster without altering a non-Fusion or an opposing Fusion monster.',s=>{
  const fusion=code('Flame Swordsman');s.add(34225426,0,s.C.OcgLocation.HAND).add(fusion,0,s.C.OcgLocation.MZONE).add(dark,0,s.C.OcgLocation.MZONE,1).add(fusion,1,s.C.OcgLocation.MZONE).baseDecks().start();activate(s);assert.equal(s.card(0,s.C.OcgLocation.MZONE).attack,2300);assert.equal(s.card(0,s.C.OcgLocation.MZONE,1).attack,2500);assert.equal(s.card(1,s.C.OcgLocation.MZONE).attack,1800);
 });
 await runField(7617062,'ghostrick-museum-native-attack-lock','Museum disallows the controller non-Ghostrick attack while allowing a Ghostrick attacker against the opposing face-down monster; its direct hit then turns it face-down.',s=>{
  const ghost=16279989;s.add(7617062,0,s.C.OcgLocation.HAND).add(dark,0,s.C.OcgLocation.MZONE).add(ghost,0,s.C.OcgLocation.MZONE,1).add(blue,1,s.C.OcgLocation.MZONE,0,s.C.OcgPosition.FACEDOWN_DEFENSE).baseDecks().start();activate(s);endTurn(s);endTurn(s);const battle=enterBattle(s);assert.ok(!battle.attacks.some(c=>c.code===dark));assert.ok(battle.attacks.some(c=>c.code===ghost));battleAttack(s,ghost,null,{yes:false});leaveBattle(s);assert.equal(s.card(0,s.C.OcgLocation.MZONE,1).position,s.C.OcgPosition.FACEDOWN_DEFENSE);assert.equal(fieldQuery(s).players[1].lp,6400);assert.equal(s.card(1,s.C.OcgLocation.MZONE).position,s.C.OcgPosition.FACEDOWN_DEFENSE);
 });
 await runField(71650854,'midbreaker-main-one-protection','Mid-Breaker activates at the start of Main Phase 1, disallows activating a second Field, blocks Dark Hole destruction of the opponent monster but allows destruction of its own monster.',s=>{
  const hole=code('Dark Hole');s.add(71650854,0,s.C.OcgLocation.HAND).add(hole,0,s.C.OcgLocation.HAND).add(87430998,0,s.C.OcgLocation.HAND).add(dark,0,s.C.OcgLocation.MZONE).add(blue,1,s.C.OcgLocation.MZONE).baseDecks().start();activate(s);assert.ok(!reachIdle(s).activates.some(c=>c.code===87430998));perform(s,'activate',hole);assert.ok(hasCode(s,0,s.C.OcgLocation.GRAVE,dark));assert.equal(s.card(1,s.C.OcgLocation.MZONE).code,blue);s.card(0,s.C.OcgLocation.SZONE,5);
 });
 await runField(20720928,'metaphys-tribute-free-next-turn-banish','Metaphys Factor permits the real Normal Summon of Level 8 Tyrant Dragon without Tributes, keeps it through this End Phase and banishes it during the next turn End Phase.',s=>{
  const tyrant=18743376;s.add(20720928,0,s.C.OcgLocation.HAND).add(tyrant,0,s.C.OcgLocation.HAND).baseDecks().start();activate(s);perform(s,'summon',tyrant,{yes:true});assert.equal(s.card(0,s.C.OcgLocation.MZONE).code,tyrant);assert.equal(s.location(0,s.C.OcgLocation.GRAVE).length,0);endTurn(s);assert.ok(hasCode(s,0,s.C.OcgLocation.MZONE,tyrant));endTurn(s,{yes:false});assert.ok(!hasCode(s,0,s.C.OcgLocation.MZONE,tyrant));assert.ok(hasCode(s,0,s.C.OcgLocation.REMOVED,tyrant));
 });
 await runField(28388296,'scrap-bilateral-stats','Scrap Factory grants 200 ATK/DEF to Scrap Recycler on both fields, leaving an unrelated monster unchanged.',s=>{
  const scrap=4334811;s.add(28388296,0,s.C.OcgLocation.HAND).add(scrap,0,s.C.OcgLocation.MZONE).add(scrap,1,s.C.OcgLocation.MZONE).add(dark,0,s.C.OcgLocation.MZONE,1).baseDecks().start();activate(s);for(const player of [0,1]){assert.equal(s.card(player,s.C.OcgLocation.MZONE).attack,1100);assert.equal(s.card(player,s.C.OcgLocation.MZONE).defense,1400);}assert.equal(s.card(0,s.C.OcgLocation.MZONE,1).attack,2500);
 });
 await runField(52518793,'colosseum-deck-special-counter','Colosseum adds one counter for a real Emergency Teleport Special Summon from Deck, granting a Gladiator Beast exactly 100 ATK/DEF; banishment at turn end does not add another counter.',s=>{
  const gladiator=4253484,teleport=code('Emergency Teleport'),psychic=59438930;s.add(52518793,0,s.C.OcgLocation.HAND).add(teleport,0,s.C.OcgLocation.HAND).add(gladiator,0,s.C.OcgLocation.MZONE).add(psychic,0,s.C.OcgLocation.DECK).baseDecks().start();activate(s);assert.equal(s.card(0,s.C.OcgLocation.MZONE).attack,700);perform(s,'activate',teleport,{codes:[psychic],yes:false});assert.ok(hasCode(s,0,s.C.OcgLocation.MZONE,psychic));assert.equal(s.card(0,s.C.OcgLocation.MZONE).attack,800);assert.equal(s.card(0,s.C.OcgLocation.MZONE).defense,2200);assert.equal(s.card(0,s.C.OcgLocation.SZONE,5).counters['7'],1);endTurn(s,{yes:false});assert.equal(s.card(0,s.C.OcgLocation.SZONE,5).counters['7'],1);
 });
 await runField(1127737,'sargasso-real-xyz-and-end-damage','Sargasso inflicts 500 on a genuine Number 39 Utopia Xyz Summon and another 500 at the Summoning player End Phase.',s=>{
  const utopia=code('Number 39: Utopia');s.add(1127737,0,s.C.OcgLocation.HAND).add(luster,0,s.C.OcgLocation.MZONE).add(luster,0,s.C.OcgLocation.MZONE,1).add(utopia,0,s.C.OcgLocation.EXTRA).baseDecks().start();activate(s);perform(s,'special',utopia,{yes:false});assert.equal(s.card(0,s.C.OcgLocation.MZONE).code,utopia);assert.equal(fieldQuery(s).players[0].lp,7500);endTurn(s,{yes:false});assert.equal(fieldQuery(s).players[0].lp,7000);
 });
 await runField(99795159,'ghostrick-mansion-direct-halved-damage','Mansion permits a direct attack while the opponent controls only a face-down monster and halves non-Ghostrick Luster Dragon battle damage to 950.',s=>{
  s.add(99795159,0,s.C.OcgLocation.HAND).add(luster,1,s.C.OcgLocation.MZONE).add(blue,0,s.C.OcgLocation.MZONE,0,s.C.OcgPosition.FACEDOWN_DEFENSE).baseDecks().start();activate(s);endTurn(s);enterBattle(s);battleAttack(s,luster,null,{yes:true});leaveBattle(s);assert.equal(fieldQuery(s).players[0].lp,7050);assert.equal(s.card(0,s.C.OcgLocation.MZONE).position,s.C.OcgPosition.FACEDOWN_DEFENSE);
 });
 await runField(50433147,'nordic-lights-destruction-cascade','Destroying Nordic Lights with MST causes its mandatory chain to destroy face-up Nordic monsters on both fields while leaving an unrelated Dark Magician.',s=>{
  const nordic=2333365;s.add(50433147,0,s.C.OcgLocation.HAND).add(spell,0,s.C.OcgLocation.HAND).add(nordic,0,s.C.OcgLocation.MZONE).add(nordic,1,s.C.OcgLocation.MZONE).add(dark,0,s.C.OcgLocation.MZONE,1).baseDecks().start();activate(s);perform(s,'activate',spell,{codes:[50433147]});assert.ok(hasCode(s,0,s.C.OcgLocation.GRAVE,nordic));assert.ok(hasCode(s,1,s.C.OcgLocation.GRAVE,nordic));assert.ok(hasCode(s,0,s.C.OcgLocation.MZONE,dark));assert.ok(hasCode(s,0,s.C.OcgLocation.GRAVE,50433147));assert.ok(s.messages.filter(m=>m.type===s.C.OcgMessageType.CHAINING&&m.code===50433147).length>=2);
 });
 await runField(41128647,'dinomic-bilateral-stats','Dinomic Powerload grants exactly 300 ATK/DEF to Dinomist Stegosaur on both fields while leaving an unrelated monster unchanged.',s=>{
  const dino=1580833;s.add(41128647,0,s.C.OcgLocation.HAND).add(dino,0,s.C.OcgLocation.MZONE).add(dino,1,s.C.OcgLocation.MZONE).add(dark,0,s.C.OcgLocation.MZONE,1).baseDecks().start();activate(s);for(const p of [0,1]){assert.equal(s.card(p,s.C.OcgLocation.MZONE).attack,1900);assert.equal(s.card(p,s.C.OcgLocation.MZONE).defense,2100);}assert.equal(s.card(0,s.C.OcgLocation.MZONE,1).attack,2500);
 });
 await runField(28120197,'canyon-rock-defense-double','Canyon doubles the real 100 defense damage from Luster Dragon attacking Giant Soldier of Stone into 200; the defending Rock stays on the field.',s=>{
  const rock=code('Giant Soldier of Stone');s.add(28120197,0,s.C.OcgLocation.HAND).add(rock,0,s.C.OcgLocation.MZONE,0,s.C.OcgPosition.FACEUP_DEFENSE).add(luster,1,s.C.OcgLocation.MZONE).baseDecks().start();activate(s);endTurn(s);enterBattle(s);battleAttack(s,luster,rock);leaveBattle(s);assert.equal(fieldQuery(s).players[1].lp,7800);assert.equal(s.card(0,s.C.OcgLocation.MZONE).code,rock);
 });
 await runField(87430998,'forest-four-races-bilateral','Forest grants 200 ATK/DEF to each of Insect, Beast, Plant and Beast-Warrior, including an opposing monster, and leaves a Spellcaster unchanged.',s=>{
  const races=[code('Basic Insect'),code('Silver Fang'),code('Spore'),code('Battle Ox')];s.add(87430998,0,s.C.OcgLocation.HAND);races.forEach((c,index)=>s.add(c,index===3?1:0,s.C.OcgLocation.MZONE,index===3?0:index));s.add(dark,0,s.C.OcgLocation.MZONE,3).baseDecks().start();const before=races.map((c,index)=>s.card(index===3?1:0,s.C.OcgLocation.MZONE,index===3?0:index));activate(s);races.forEach((c,index)=>{const after=s.card(index===3?1:0,s.C.OcgLocation.MZONE,index===3?0:index);assert.equal(after.attack,before[index].attack+200);assert.equal(after.defense,before[index].defense+200);});assert.equal(s.card(0,s.C.OcgLocation.MZONE,3).attack,2500);
 });
 await runField(92481084,'mind-eye-fixed-real-battle-damage','Temple of the Mind Eye replaces the ordinary 3000 direct Blue-Eyes battle damage with exactly 1000.',s=>{
  s.add(92481084,0,s.C.OcgLocation.HAND).add(blue,1,s.C.OcgLocation.MZONE).baseDecks().start();activate(s);endTurn(s);enterBattle(s);battleAttack(s,blue,null);leaveBattle(s);assert.equal(fieldQuery(s).players[0].lp,7000);assert.ok(s.messages.some(m=>m.type===s.C.OcgMessageType.DAMAGE&&m.amount===1000));s.card(0,s.C.OcgLocation.SZONE,5);
 });
 assert.equal(scenarios.length,NATIVE_FIELD_BATCH_B_IDS.length,'Every assigned Field needs its scenario');
 assert.deepEqual([...new Set(scenarios.flatMap(s=>s.fields))].sort((a,b)=>a-b),[...NATIVE_FIELD_BATCH_B_IDS].sort((a,b)=>a-b));
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
 const {loadNativeAuditInputs}=await import('./native-field-audit-inputs.mjs');const inputs=await loadNativeAuditInputs();const core=await inputs.coreModule.default({...inputs.initializer,sync:true});
 const scenarios=await auditNativeFieldBatchB(inputs,core);const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
 const provenance=await collectBatchExecutionProvenance(inputs,scenarios,NATIVE_FIELD_BATCH_B_IDS);
 const sourceFiles=Object.fromEntries(provenance.dependencies.map(({path,sha256})=>[path,sha256]));
 const report={generatedOn:'2026-10-08',batch:'b',fields:NATIVE_FIELD_BATCH_B_IDS,summary:{assignedFields:38,scenarios:scenarios.length,passed:scenarios.filter(s=>s.status==='passed').length,effectTested:new Set(scenarios.filter(s=>s.status==='passed').flatMap(s=>s.fields)).size},nativeApi:core.getVersion(),flags:(inputs.coreModule.OcgDuelMode.MODE_MR5|inputs.coreModule.OcgDuelMode.TCG_SEGOC_NONPUBLIC|inputs.coreModule.OcgDuelMode.TCG_SEGOC_FIRSTTRIGGER).toString(),coreWasmSha256:sha(new Uint8Array(inputs.initializer.wasmBinary)),coreBuild:inputs.coreBuild,resources:inputs.resources.manifest,sourceFiles,provenance,fixturePolicy:{beforeStartOnly:true,modifiedScripts:provenance.modifiedScripts,upstreamArchiveBytesModified:false,modifiedCardData:false,testMode:false,postStartFixtureInjection:false},limits:['One significant effect branch per assigned Field is exercised; this is not exhaustive certification of all branches.','All fixtures are registered before start. The original Lua archive, CDB and WASM are unchanged; explicitly applied reader corrections are recorded separately; no Debug/TestMode or post-start injection.','Headless native verification does not certify browser integration.'],scenarios};
 const path=new URL('../docs/audits/artifacts/native-field-batch-b-2026-10-08.json',import.meta.url);await mkdir(new URL('.',path),{recursive:true});await writeFile(path,json(report)+'\n');console.log(json(report.summary));for(const s of scenarios.filter(s=>s.status!=='passed'))console.error(s.id,s.error);assert.equal(report.summary.passed,report.summary.scenarios);
}
