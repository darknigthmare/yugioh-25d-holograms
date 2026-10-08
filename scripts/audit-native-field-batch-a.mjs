import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { loadNativeAuditInputs } from './native-field-audit-inputs.mjs';
import { createNativeFieldScenarioRunner, perform, reachIdle, endTurn, enterBattle, battleAttack,
  leaveBattle, hasCode, requireChain, clone, json, auditFlags } from './native-field-audit-harness.mjs';

export const NATIVE_FIELD_BATCH_A_IDS = Object.freeze([33900648,62314831,93360904,62200831,82460246,
  69217334,60600821,63017368,6798031,59054773,72283691,4398189,12215894,64400161,90173539,
  60514625,675319,11808215,24793135,26984177,36668118,56787189,40005099,41418852,85668449,
  62188962,29400787,6909330,69039982,79698395,20216608,86643777,4545854,68462976,32999573,
  43034264,35956022]);

function fieldQuery(s) { const value=s.duel.queryField(); s.queries.push({query:{field:true},result:clone(value)}); return value; }
function unchangedResources(inputs, code) { return inputs.resources.cards.get(code); }
function once(s, code) { assert.ok(!reachIdle(s).activates.some(c=>c.code===code&&c.location===s.C.OcgLocation.SZONE)); }
function selectByLocation(s, hand, other) { return p=>p.selects[0]?.location===s.C.OcgLocation.HAND?hand:other; }

/** Fixed established-board fixtures, all installed before the native duel starts.
 * Every result below comes from the shipped official Lua and typed core replies. */
export async function auditNativeFieldBatchA(inputs, sharedCore) {
  const { scenarios, run }=createNativeFieldScenarioRunner(inputs,sharedCore);

  await run('batch-a-clear-world-wind-spell-cost-maintenance',[33900648],
    'A WIND monster makes a real Spell activation cost 500 LP; native End Phase maintenance costs another 500 LP.',s=>{
    s.add(33900648,0,s.C.OcgLocation.HAND).add(76812113,0,s.C.OcgLocation.MZONE)
      .add(46130346,0,s.C.OcgLocation.HAND).baseDecks().start();
    perform(s,'activate',33900648); const before=fieldQuery(s).players[0].lp;
    perform(s,'activate',46130346); assert.equal(fieldQuery(s).players[0].lp,before-500);
    endTurn(s,{option:0}); assert.equal(fieldQuery(s).players[0].lp,before-1000);
    assert.equal(s.card(0,s.C.OcgLocation.SZONE,5).code,33900648);requireChain(s,33900648);
  });

  await run('batch-a-amritara-destruction-defense-revival',[62314831],
    'Visas satisfies activation; Dark Hole destroys the owned monster and the Field trigger revives it in Defense Position.',s=>{
    s.add(62314831,0,s.C.OcgLocation.HAND).add(56099748,0,s.C.OcgLocation.MZONE)
      .add(53129443,0,s.C.OcgLocation.HAND).baseDecks().start();
    perform(s,'activate',62314831);perform(s,'activate',53129443,{codes:[56099748],chainCodes:[62314831],option:0});
    const revived=s.card(0,s.C.OcgLocation.MZONE);assert.equal(revived.code,56099748);
    assert.equal(revived.position,s.C.OcgPosition.FACEUP_DEFENSE);requireChain(s,62314831);
    assert.equal(s.messages.filter(m=>m.type===s.C.OcgMessageType.CHAINING&&m.code===62314831).length,2);
  });

  await run('batch-a-acroquey-grave-banish-three-bottom-sort',[93360904],
    'The GY ignition targets two genuine Yummy monsters across GY and faceup banishment, returns all three cards and performs a native bottom-deck sort.',s=>{
    s.add(93360904,0,s.C.OcgLocation.GRAVE).add(4215180,0,s.C.OcgLocation.GRAVE)
      .add(68810435,0,s.C.OcgLocation.REMOVED,0,s.C.OcgPosition.FACEUP_ATTACK).baseDecks().start();
    perform(s,'activate',93360904,{codes:[4215180,68810435],sort:p=>p.cards.map((_,i)=>p.cards.length-1-i)});
    for(const code of [93360904,4215180,68810435])assert.ok(hasCode(s,0,s.C.OcgLocation.DECK,code));
    assert.ok(!hasCode(s,0,s.C.OcgLocation.GRAVE,93360904));assert.ok(!hasCode(s,0,s.C.OcgLocation.REMOVED,68810435));
    assert.ok(s.decisions.some(d=>d.prompt.type===s.C.OcgMessageType.SORT_CARD));requireChain(s,93360904);
  });

  await run('batch-a-gunkan-normal-summon-decktop-placement',[62200831],
    'A real Normal Summon of Shari triggers the Field; the selected Gunkan card becomes the actual top card of the native deck.',s=>{
    s.add(62200831,0,s.C.OcgLocation.HAND).add(24639891,0,s.C.OcgLocation.HAND)
      .add(61027400,0,s.C.OcgLocation.DECK).baseDecks().start();
    perform(s,'activate',62200831);perform(s,'summon',24639891,{chainCodes:[62200831],codes:[61027400]});
    const deck=s.location(0,s.C.OcgLocation.DECK);assert.equal(deck.at(-1).code,61027400);
    assert.equal(s.messages.filter(m=>m.type===s.C.OcgMessageType.CHAINING&&m.code===62200831).length,2);requireChain(s,62200831);
  });

  await run('batch-a-calarium-search-counted-light-bonus',[82460246],
    'Activation searches genuine Mannadium and grants 100 ATK per owned Tuner on field and in GY, with a non-LIGHT negative control.',s=>{
    s.add(82460246,0,s.C.OcgLocation.HAND).add(71277255,0,s.C.OcgLocation.DECK)
      .add(56099748,0,s.C.OcgLocation.MZONE).add(17272964,0,s.C.OcgLocation.GRAVE)
      .add(89631139,0,s.C.OcgLocation.MZONE,1).add(46986414,0,s.C.OcgLocation.MZONE,2).baseDecks().start();
    perform(s,'activate',82460246,{codes:[71277255]});assert.ok(hasCode(s,0,s.C.OcgLocation.HAND,71277255));
    assert.equal(s.card(0,s.C.OcgLocation.MZONE).attack,2300);
    assert.equal(s.card(0,s.C.OcgLocation.MZONE,1).attack,3200);assert.equal(s.card(0,s.C.OcgLocation.MZONE,2).attack,2500);
    requireChain(s,82460246);
  });

  await run('batch-a-breaking-world-public-ritual-level-end-reset',[69217334],
    'The ignition targets a field Ritual and publicly reveals a different-Level Ritual in hand; its native Level changes to eight and resets at End Phase.',s=>{
    s.add(69217334,0,s.C.OcgLocation.HAND).add(46427957,0,s.C.OcgLocation.MZONE)
      .add(59913418,0,s.C.OcgLocation.HAND).baseDecks().start();
    perform(s,'activate',69217334);perform(s,'activate',69217334,{select:selectByLocation(s,[59913418],[46427957])});
    const revealed=s.card(0,s.C.OcgLocation.HAND);assert.equal(revealed.code,59913418);assert.equal(revealed.level,8);assert.equal(revealed.isPublic,true);
    endTurn(s);const reset=s.card(0,s.C.OcgLocation.HAND);assert.equal(reset.level,10);assert.equal(reset.isPublic,false);requireChain(s,69217334);
  });

  await run('batch-a-spring-zone-counter-attack',[60600821],
    'A genuine ignition selects an unused Main Monster Zone, installs a Season Counter and increases owned ATK by 400; a later Normal Summon cannot use the blocked zone.',s=>{
    s.add(60600821,0,s.C.OcgLocation.HAND).add(89631139,0,s.C.OcgLocation.MZONE)
      .add(23635815,0,s.C.OcgLocation.HAND).baseDecks().start();
    perform(s,'activate',60600821);perform(s,'activate',60600821,{yes:false});
    assert.equal(s.card(0,s.C.OcgLocation.SZONE,5).counters[0x214],1);assert.equal(s.card(0,s.C.OcgLocation.MZONE).attack,3400);
    assert.ok(s.decisions.some(d=>d.prompt.type===s.C.OcgMessageType.SELECT_DISFIELD));
    const blocked=s.messages.find(m=>m.type===s.C.OcgMessageType.FIELD_DISABLED);assert.equal(blocked.field_mask,2);
    perform(s,'summon',23635815);assert.equal(s.card(0,s.C.OcgLocation.MZONE,2).code,23635815);
    assert.equal(s.card(0,s.C.OcgLocation.MZONE,2).attack,2150);once(s,60600821);requireChain(s,60600821);
  });

  await run('batch-a-wedju-hand-deck-monsters-continuous-spells',[63017368],
    'The official ignition places the hand monster and a real Millennium deck monster into Spell/Trap Zones with native Continuous Spell types.',s=>{
    s.add(63017368,0,s.C.OcgLocation.HAND).add(89631139,0,s.C.OcgLocation.HAND).add(23635815,0,s.C.OcgLocation.HAND)
      .add(38775407,0,s.C.OcgLocation.DECK).add(1164211,0,s.C.OcgLocation.DECK).baseDecks().start();
    perform(s,'activate',63017368);perform(s,'activate',63017368,{select:selectByLocation(s,[89631139],[38775407])});
    const spells=s.location(0,s.C.OcgLocation.SZONE);for(const code of [89631139,38775407]){
      assert.ok(spells.some(c=>c.code===code));const index=spells.findIndex(c=>c.code===code);
      const q=s.card(0,s.C.OcgLocation.SZONE,index);assert.equal(q.type,s.C.OcgType.SPELL|s.C.OcgType.CONTINUOUS);
    }once(s,63017368);requireChain(s,63017368);
  });

  await run('batch-a-ryzeal-cross-two-bottom-draw',[6798031],
    'A genuine two-card GY target is sorted onto the deck bottom and followed by exactly one effect draw; the hard once-per-turn ignition then disappears.',s=>{
    s.add(6798031,0,s.C.OcgLocation.HAND).add(8633261,0,s.C.OcgLocation.GRAVE)
      .add(35844557,0,s.C.OcgLocation.GRAVE).add(34022970,0,s.C.OcgLocation.GRAVE)
      .add(72238166,0,s.C.OcgLocation.GRAVE).baseDecks().start();
    perform(s,'activate',6798031);perform(s,'activate',6798031,{codes:[8633261,35844557],sort:p=>p.cards.map((_,i)=>p.cards.length-1-i)});
    assert.ok(hasCode(s,0,s.C.OcgLocation.DECK,8633261));assert.ok(hasCode(s,0,s.C.OcgLocation.DECK,35844557));
    assert.equal(s.location(0,s.C.OcgLocation.HAND).length,1);assert.ok(s.decisions.some(d=>d.prompt.type===s.C.OcgMessageType.SORT_CARD));
    assert.ok(hasCode(s,0,s.C.OcgLocation.GRAVE,34022970));assert.ok(hasCode(s,0,s.C.OcgLocation.GRAVE,72238166));once(s,6798031);requireChain(s,6798031);
  });

  await run('batch-a-ai-land-real-hand-summon',[59054773],
    'An empty Main Monster Zone enables a native hand-to-field Wizard @Ignister summon; the occupied zone then makes another A.I.Land summon unavailable.',s=>{
    s.add(59054773,0,s.C.OcgLocation.HAND).add(3723262,0,s.C.OcgLocation.HAND)
      .add(3723262,0,s.C.OcgLocation.HAND).baseDecks().start();
    perform(s,'activate',59054773);const after=perform(s,'activate',59054773,{codes:[3723262]});
    assert.equal(s.card(0,s.C.OcgLocation.MZONE).code,3723262);
    assert.ok(!after.activates.some(c=>c.code===59054773&&c.location===s.C.OcgLocation.SZONE));requireChain(s,59054773);
  });

  await run('batch-a-stromberg-deck-summon-normal-lock',[72283691],
    'Stromberg Special Summons its explicitly listed Hexe Trude partner from Deck, then the native core forbids a still-legal low-Level Normal Summon.',s=>{
    s.add(72283691,0,s.C.OcgLocation.HAND).add(46294982,0,s.C.OcgLocation.DECK)
      .add(23635815,0,s.C.OcgLocation.HAND).baseDecks().start();
    perform(s,'activate',72283691);assert.ok(reachIdle(s).summons.some(c=>c.code===23635815));
    const after=perform(s,'activate',72283691,{codes:[46294982]});assert.equal(s.card(0,s.C.OcgLocation.MZONE).code,46294982);
    assert.ok(!after.summons.some(c=>c.code===23635815));requireChain(s,72283691);
  });

  await run('batch-a-white-forest-search-current-tuner-reset',[4398189],
    'Activation searches White Forest, then a targeted non-Tuner becomes a native Tuner for this turn and resets at End Phase.',s=>{
    s.add(4398189,0,s.C.OcgLocation.HAND).add(25592142,0,s.C.OcgLocation.DECK)
      .add(61980241,0,s.C.OcgLocation.MZONE).baseDecks().start();
    assert.equal(s.card(0,s.C.OcgLocation.MZONE).type&s.C.OcgType.TUNER,0);
    perform(s,'activate',4398189,{codes:[25592142]});assert.ok(hasCode(s,0,s.C.OcgLocation.HAND,25592142));
    perform(s,'activate',4398189,{codes:[61980241]});assert.ok(s.card(0,s.C.OcgLocation.MZONE).type&s.C.OcgType.TUNER);
    endTurn(s);assert.equal(s.card(0,s.C.OcgLocation.MZONE).type&s.C.OcgType.TUNER,0);requireChain(s,4398189);
  });

  await run('batch-a-deskbot-stats-hand-recycle-draw',[12215894],
    'Base grants the actual bilateral Deskbot 500 ATK/DEF bonus and recycles two selected hand Deskbot cards to draw exactly two cards.',s=>{
    s.add(12215894,0,s.C.OcgLocation.HAND).add(22227683,0,s.C.OcgLocation.MZONE)
      .add(22227683,1,s.C.OcgLocation.MZONE).add(23635815,0,s.C.OcgLocation.MZONE,1).add(59368956,0,s.C.OcgLocation.HAND)
      .add(75944053,0,s.C.OcgLocation.HAND).add(46986414,0,s.C.OcgLocation.DECK).baseDecks().start();
    perform(s,'activate',12215894);for(const p of [0,1]){const c=s.card(p,s.C.OcgLocation.MZONE);assert.equal(c.attack,1000);assert.equal(c.defense,1000);}
    assert.equal(s.card(0,s.C.OcgLocation.MZONE,1).attack,1750);
    perform(s,'activate',12215894,{codes:[59368956,75944053]});assert.equal(s.location(0,s.C.OcgLocation.HAND).length,2);
    assert.equal(s.messages.filter(m=>m.type===s.C.OcgMessageType.DRAW).at(-1).drawn.length,2);
    for(const code of [59368956,75944053])assert.ok(s.messages.some(m=>m.type===s.C.OcgMessageType.MOVE&&m.card===code&&m.to.location===s.C.OcgLocation.DECK&&(m.reason&0x40)));
    requireChain(s,12215894);
  });

  await run('batch-a-fandora-five-names-field-cost-board-destroy',[64400161],
    'Five distinct genuine Fur Hire monsters enable the ignition; the Field is sent as cost and destroys both opposing monster and Trap.',s=>{
    s.add(64400161,0,s.C.OcgLocation.HAND);[93850652,94073244,66740005,67466547,20345391].forEach((c,i)=>s.add(c,0,s.C.OcgLocation.MZONE,i));
    s.add(89631139,1,s.C.OcgLocation.MZONE).add(44095762,1,s.C.OcgLocation.SZONE,0,s.C.OcgPosition.FACEDOWN_DEFENSE).baseDecks().start();
    perform(s,'activate',64400161);perform(s,'activate',64400161);
    const field=s.location(0,s.C.OcgLocation.GRAVE).find(c=>c.code===64400161);assert.ok(field&&(field.reason&0x80));
    for(const code of [89631139,44095762])assert.ok(hasCode(s,1,s.C.OcgLocation.GRAVE,code));requireChain(s,64400161);
  });

  await run('batch-a-dino-wrestling-grave-banish-cost-deck-summon',[90173539],
    'With more opposing monsters, World Dino Wrestling banishes itself from GY as cost and Special Summons a native Dinowrestler from Deck.',s=>{
    s.add(90173539,0,s.C.OcgLocation.GRAVE).add(29996433,0,s.C.OcgLocation.DECK)
      .add(89631139,1,s.C.OcgLocation.MZONE).baseDecks().start();
    perform(s,'activate',90173539,{codes:[29996433]});assert.equal(s.card(0,s.C.OcgLocation.MZONE).code,29996433);
    const cost=s.location(0,s.C.OcgLocation.REMOVED).find(c=>c.code===90173539);assert.ok(cost&&(cost.reason&0x80));requireChain(s,90173539);
  });

  await run('batch-a-ecole-normal-destroy-token-stats-leave-cleanup',[60514625],
    'A real Normal Summon is destroyed and replaced by a Mask Token with the exact destroyed stats; Field destruction destroys the token.',s=>{
    s.add(60514625,0,s.C.OcgLocation.HAND).add(43096270,0,s.C.OcgLocation.HAND)
      .add(5318639,0,s.C.OcgLocation.HAND).baseDecks().start();
    perform(s,'activate',60514625);perform(s,'summon',43096270,{chainCodes:[60514625]});
    const token=s.card(0,s.C.OcgLocation.MZONE);assert.ok(token.type&s.C.OcgType.TOKEN);assert.equal(token.attack,2000);assert.equal(token.defense,100);
    assert.ok(hasCode(s,0,s.C.OcgLocation.GRAVE,43096270));perform(s,'activate',5318639,{codes:[60514625]});
    assert.equal(s.location(0,s.C.OcgLocation.MZONE).length,0);requireChain(s,60514625);
  });

  await run('batch-a-zodiac-owned-archetype-stats-restoration',[675319],
    'Zodiac Sign gives only the owned Zoodiac 300 ATK/DEF, preserving an opposing Zoodiac and an owned unrelated Beast-Warrior; destruction restores printed stats.',s=>{
    s.add(675319,0,s.C.OcgLocation.HAND).add(31755044,0,s.C.OcgLocation.MZONE)
      .add(31755044,1,s.C.OcgLocation.MZONE).add(5053103,0,s.C.OcgLocation.MZONE,1)
      .add(5318639,0,s.C.OcgLocation.HAND).baseDecks().start();
    const original=unchangedResources(inputs,31755044);perform(s,'activate',675319);
    assert.equal(s.card(0,s.C.OcgLocation.MZONE).attack,original.attack+300);assert.equal(s.card(0,s.C.OcgLocation.MZONE).defense,original.defense+300);
    assert.equal(s.card(1,s.C.OcgLocation.MZONE).attack,original.attack);assert.equal(s.card(0,s.C.OcgLocation.MZONE,1).attack,1700);
    perform(s,'activate',5318639,{codes:[675319]});assert.equal(s.card(0,s.C.OcgLocation.MZONE).attack,original.attack);requireChain(s,675319);
  });

  await run('batch-a-dice-dungeon-search-native-roll-attack-reset',[11808215],
    'The Field searches Dimension Dice, then rolls two actual native dice in its owner\'s Battle Phase; recorded rolls determine both ATK changes and End Phase resets them.',s=>{
    s.add(11808215,0,s.C.OcgLocation.HAND).add(47292920,0,s.C.OcgLocation.DECK)
      .add(23635815,0,s.C.OcgLocation.MZONE).add(89631139,1,s.C.OcgLocation.MZONE).baseDecks().start();
    perform(s,'activate',11808215,{codes:[47292920]});assert.ok(hasCode(s,0,s.C.OcgLocation.HAND,47292920));
    assert.ok(s.location(0,s.C.OcgLocation.HAND).find(c=>c.code===47292920).reason&0x40);
    endTurn(s);endTurn(s);enterBattle(s,{chainCodes:[11808215]});
    const rolls=s.messages.filter(m=>m.type===s.C.OcgMessageType.TOSS_DICE);assert.equal(rolls.length,2);
    const expected=(attack,result)=>result===5?Math.floor(attack/2):result===6?attack*2:attack+({1:-1000,2:1000,3:-500,4:500}[result]);
    assert.equal(s.card(0,s.C.OcgLocation.MZONE).attack,expected(1750,rolls[0].results[0]));
    assert.equal(s.card(1,s.C.OcgLocation.MZONE).attack,expected(3000,rolls[1].results[0]));
    leaveBattle(s);endTurn(s);assert.equal(s.card(0,s.C.OcgLocation.MZONE).attack,1750);
    assert.equal(s.card(1,s.C.OcgLocation.MZONE).attack,3000);requireChain(s,11808215);
  });

  await run('batch-a-gizmek-excavate-equal-stat-machine-banish',[24793135],
    'A native excavation selects a real equal-ATK/DEF Machine from three top cards and banishes the other two face-down; summoning that Machine installs a counter.',s=>{
    s.add(24793135,0,s.C.OcgLocation.HAND).add(94693857,0,s.C.OcgLocation.DECK)
      .add(89631139,0,s.C.OcgLocation.DECK).add(46986414,0,s.C.OcgLocation.DECK).add(46986414,1,s.C.OcgLocation.DECK).start();
    perform(s,'activate',24793135);perform(s,'activate',24793135,{codes:[94693857]});
    assert.ok(hasCode(s,0,s.C.OcgLocation.HAND,94693857));const removed=s.location(0,s.C.OcgLocation.REMOVED);assert.equal(removed.length,2);
    for(let i=0;i<2;i++)assert.ok(s.card(0,s.C.OcgLocation.REMOVED,i).position&s.C.OcgPosition.FACEDOWN);
    perform(s,'summon',94693857);assert.equal(s.card(0,s.C.OcgLocation.SZONE,5).counters[0x206],1);requireChain(s,24793135);
  });

  await run('batch-a-imperial-tomb-horus-search-hand-bottom-current-name',[26984177],
    'The Field changes its current name to King\'s Sarcophagus and resolves a genuine Horus search followed by a different hand card placed on deck bottom.',s=>{
    s.add(26984177,0,s.C.OcgLocation.HAND).add(84941194,0,s.C.OcgLocation.DECK).add(11335209,0,s.C.OcgLocation.DECK)
      .add(89631139,0,s.C.OcgLocation.HAND).baseDecks().start();
    perform(s,'activate',26984177);const f=s.card(0,s.C.OcgLocation.SZONE,5,s.C.OcgQueryFlags.ALIAS);assert.notEqual(f.alias,26984177);
    perform(s,'activate',26984177,{select:selectByLocation(s,[89631139],[84941194])});
    assert.ok(hasCode(s,0,s.C.OcgLocation.HAND,84941194));assert.equal(s.location(0,s.C.OcgLocation.DECK)[0].code,89631139);once(s,26984177);requireChain(s,26984177);
  });

  await run('batch-a-boot-sector-two-hand-rokkets-defense-bonus',[36668118],
    'Boot Sector resolves its hand mode and summons two distinct native Rokkets in Defense, with the continuous 300 ATK/DEF bonuses.',s=>{
    s.add(36668118,0,s.C.OcgLocation.HAND).add(26655293,0,s.C.OcgLocation.HAND)
      .add(32472237,0,s.C.OcgLocation.HAND).add(5969957,0,s.C.OcgLocation.HAND).baseDecks().start();
    perform(s,'activate',36668118);perform(s,'activate',36668118,{codes:[26655293,32472237],option:0,
      respond:(p,C)=>p.type===C.OcgMessageType.SELECT_UNSELECT_CARD?{type:C.OcgResponseType.SELECT_UNSELECT_CARD,index:p.select_cards.length?0:null}:null});
    for(let i=0;i<2;i++){const c=s.card(0,s.C.OcgLocation.MZONE,i);const data=unchangedResources(inputs,c.code);
      assert.ok([26655293,32472237].includes(c.code));assert.equal(c.position,s.C.OcgPosition.FACEUP_DEFENSE);
      assert.equal(c.attack,data.attack+300);assert.equal(c.defense,data.defense+300);
    }once(s,36668118);requireChain(s,36668118);
  });

  await run('batch-a-new-frontier-opponent-fusion-albaz-search',[56787189],
    'A genuine opposing Polymerization Fusion Summon triggers the Field and searches Fallen of Albaz from the owner\'s deck.',s=>{
    s.add(56787189,0,s.C.OcgLocation.HAND).add(68468459,0,s.C.OcgLocation.DECK)
      .add(24094653,1,s.C.OcgLocation.HAND).add(23995346,1,s.C.OcgLocation.EXTRA);
    for(let i=0;i<3;i++)s.add(89631139,1,s.C.OcgLocation.HAND);s.baseDecks().start();
    perform(s,'activate',56787189);endTurn(s);perform(s,'activate',24094653,{chainCodes:[56787189],
      select:p=>p.selects.some(c=>c.code===68468459)?[68468459]:p.selects.some(c=>c.code===23995346)?[23995346]:[89631139]});
    assert.ok(hasCode(s,1,s.C.OcgLocation.MZONE,23995346));assert.ok(hasCode(s,0,s.C.OcgLocation.HAND,68468459));
    assert.equal(s.messages.filter(m=>m.type===s.C.OcgMessageType.CHAINING&&m.code===56787189).length,2);requireChain(s,56787189);
  });

  await run('batch-a-shiranui-hand-send-cost-zero-defense-zombie-revive',[40005099],
    'Synthesis sends a hand card to GY as a real non-discard cost, selects the zero-DEF Zombie in GY and Special Summons it through the native core.',s=>{
    s.add(40005099,0,s.C.OcgLocation.HAND).add(89631139,0,s.C.OcgLocation.HAND)
      .add(36630403,0,s.C.OcgLocation.GRAVE).baseDecks().start();
    perform(s,'activate',40005099);perform(s,'activate',40005099,{select:selectByLocation(s,[89631139],[36630403]),option:0});
    assert.equal(s.card(0,s.C.OcgLocation.MZONE).code,36630403);
    const cost=s.location(0,s.C.OcgLocation.GRAVE).find(c=>c.code===89631139);assert.ok(cost&&(cost.reason&0x80)&&!(cost.reason&0x4000));requireChain(s,40005099);
  });

  await run('batch-a-numeron-network-official-calling-copy-four-summons',[41418852],
    'Network sends official Numeron Calling from Deck as cost, copies its activation effect and summons four distinct Numeron Gates from Extra Deck; End Phase banishes all four.',s=>{
    s.add(41418852,0,s.C.OcgLocation.HAND).add(77402960,0,s.C.OcgLocation.DECK);
    const gates=[15232745,42230449,78625448,4019153];for(const c of gates)s.add(c,0,s.C.OcgLocation.EXTRA);s.baseDecks().start();
    perform(s,'activate',41418852);perform(s,'activate',41418852,{codes:[77402960],
      respond:(p,C)=>p.type===C.OcgMessageType.SELECT_UNSELECT_CARD?{type:C.OcgResponseType.SELECT_UNSELECT_CARD,index:p.select_cards.length?0:null}:null});
    for(const c of gates)assert.ok(hasCode(s,0,s.C.OcgLocation.MZONE,c));
    const cost=s.location(0,s.C.OcgLocation.GRAVE).find(c=>c.code===77402960);assert.ok(cost&&(cost.reason&0x80));
    endTurn(s);for(const c of gates)assert.ok(hasCode(s,0,s.C.OcgLocation.REMOVED,c));requireChain(s,41418852);
  });

  await run('batch-a-brain-lab-native-lp-cost-counter-leave-damage',[85668449],
    'Lab replaces Destructotron\'s real 1000 LP activation cost with a Psychic Counter; MST then destroys Lab and the controller takes 1000 effect damage.',s=>{
    s.add(85668449,0,s.C.OcgLocation.HAND).add(11232355,0,s.C.OcgLocation.MZONE)
      .add(44095762,1,s.C.OcgLocation.SZONE,0,s.C.OcgPosition.FACEDOWN_DEFENSE)
      .add(5318639,0,s.C.OcgLocation.HAND).baseDecks().start();
    perform(s,'activate',85668449);perform(s,'activate',11232355,{codes:[44095762],yes:true});
    assert.equal(fieldQuery(s).players[0].lp,8000);assert.equal(s.card(0,s.C.OcgLocation.SZONE,5).counters[4],1);
    assert.ok(hasCode(s,1,s.C.OcgLocation.GRAVE,44095762));perform(s,'activate',5318639,{codes:[85668449]});
    assert.equal(fieldQuery(s).players[0].lp,7000);requireChain(s,85668449);requireChain(s,11232355);
  });

  await run('batch-a-vampire-opponent-deck-send-own-vampire-destroy',[62188962],
    'An opposing Foolish Burial deck-to-GY event triggers Kingdom: target the opposing monster, send a real DARK Vampire by effect and destroy the target.',s=>{
    s.add(62188962,0,s.C.OcgLocation.HAND).add(34250214,0,s.C.OcgLocation.DECK)
      .add(81439173,1,s.C.OcgLocation.HAND).add(46986414,1,s.C.OcgLocation.DECK)
      .add(89631139,1,s.C.OcgLocation.MZONE).baseDecks().start();
    perform(s,'activate',62188962);endTurn(s);perform(s,'activate',81439173,{chainCodes:[62188962],
      select:p=>p.selects.some(c=>c.code===34250214)?[34250214]:p.selects.some(c=>c.code===89631139)?[89631139]:[46986414]});
    const sent=s.location(0,s.C.OcgLocation.GRAVE).find(c=>c.code===34250214);assert.ok(sent&&(sent.reason&0x40)&&!(sent.reason&0x80));
    assert.ok(hasCode(s,1,s.C.OcgLocation.GRAVE,89631139));requireChain(s,62188962);
    assert.equal(s.messages.filter(m=>m.type===s.C.OcgMessageType.CHAINING&&m.code===62188962).length,2);
  });

  await run('batch-a-ghostrick-facedown-direct-attack-search-damage',[29400787],
    'Parade prevents effect damage to the opponent; with all defenders facedown, an opposing direct attack does not flip the defender and triggers a genuine Ghostrick search.',s=>{
    s.add(29400787,0,s.C.OcgLocation.HAND).add(23635815,0,s.C.OcgLocation.MZONE,0,s.C.OcgPosition.FACEDOWN_DEFENSE)
      .add(80885284,0,s.C.OcgLocation.DECK).add(89631139,1,s.C.OcgLocation.MZONE)
      .add(46130346,0,s.C.OcgLocation.HAND).baseDecks().start();
    perform(s,'activate',29400787);perform(s,'activate',46130346);assert.equal(fieldQuery(s).players[1].lp,8000);
    endTurn(s);enterBattle(s);battleAttack(s,89631139,null,{chainCodes:[29400787],codes:[80885284]});
    assert.equal(fieldQuery(s).players[0].lp,5000);assert.equal(s.card(0,s.C.OcgLocation.MZONE).position,s.C.OcgPosition.FACEDOWN_DEFENSE);
    assert.ok(hasCode(s,0,s.C.OcgLocation.HAND,80885284));leaveBattle(s);requireChain(s,29400787);
  });

  await run('batch-a-soul-gate-native-set-destruction-activation-summon',[6909330],
    'The native activation is unavailable until MST destroys an owned Set Spell; with Z-ONE in GY, a real Normal Summon is destroyed and both players take 800 damage.',s=>{
    s.add(6909330,0,s.C.OcgLocation.HAND).add(5318639,0,s.C.OcgLocation.HAND)
      .add(46130346,0,s.C.OcgLocation.SZONE,0,s.C.OcgPosition.FACEDOWN_DEFENSE)
      .add(62499965,0,s.C.OcgLocation.GRAVE).add(23635815,0,s.C.OcgLocation.HAND).baseDecks().start();
    assert.ok(!reachIdle(s).activates.some(c=>c.code===6909330));perform(s,'activate',5318639,{codes:[46130346]});
    perform(s,'activate',6909330);perform(s,'summon',23635815,{chainCodes:[6909330]});
    assert.ok(hasCode(s,0,s.C.OcgLocation.GRAVE,23635815));const f=fieldQuery(s);assert.equal(f.players[0].lp,7200);assert.equal(f.players[1].lp,7200);requireChain(s,6909330);
  });

  await run('batch-a-crusadia-bilateral-link-only-bonus-removal',[69039982],
    'Revival gives both players\' genuine Crusadia Links 500 ATK, excludes an owned Crusadia non-Link and restores stats when removed.',s=>{
    s.add(69039982,0,s.C.OcgLocation.HAND).add(72228247,0,s.C.OcgLocation.MZONE,5)
      .add(72228247,1,s.C.OcgLocation.MZONE,5).add(91646304,0,s.C.OcgLocation.MZONE,2)
      .add(5318639,0,s.C.OcgLocation.HAND).baseDecks().start();
    const ownBefore=s.card(0,s.C.OcgLocation.MZONE,5).attack,otherBefore=s.card(1,s.C.OcgLocation.MZONE,5).attack;
    perform(s,'activate',69039982);assert.equal(s.card(0,s.C.OcgLocation.MZONE,5).attack,ownBefore+500);
    assert.equal(s.card(1,s.C.OcgLocation.MZONE,5).attack,otherBefore+500);assert.equal(s.card(0,s.C.OcgLocation.MZONE,2).attack,800);
    perform(s,'activate',5318639,{codes:[69039982]});assert.equal(s.card(0,s.C.OcgLocation.MZONE,5).attack,ownBefore);requireChain(s,69039982);
  });

  await run('batch-a-danger-targeted-continuing-direct-attack',[79698395],
    'Realm targets a genuine Danger monster and grants a continuing direct attack despite an opposing faceup monster; the native Battle Phase inflicts exactly its ATK.',s=>{
    s.add(79698395,0,s.C.OcgLocation.HAND).add(52350806,0,s.C.OcgLocation.MZONE)
      .add(89631139,1,s.C.OcgLocation.MZONE).baseDecks().start();
    perform(s,'activate',79698395);perform(s,'activate',79698395,{codes:[52350806]});endTurn(s);endTurn(s);
    enterBattle(s);battleAttack(s,52350806,null,{yes:true});assert.equal(fieldQuery(s).players[1].lp,6200);
    assert.equal(s.card(1,s.C.OcgLocation.MZONE).code,89631139);leaveBattle(s);requireChain(s,79698395);
  });

  await run('batch-a-tilted-effect-draw-reveal-field-send-bottom-redraw',[20216608],
    'Pot of Greed\'s genuine draw triggers Tilted Try: reveal one drawn card, send the Field to GY, place that exact card on deck bottom and draw a replacement.',s=>{
    s.add(20216608,0,s.C.OcgLocation.HAND).add(55144522,0,s.C.OcgLocation.HAND);
    for(const c of [89631139,23635815,46986414,11549357])s.add(c,0,s.C.OcgLocation.DECK);s.add(46986414,1,s.C.OcgLocation.DECK).start();
    perform(s,'activate',20216608);perform(s,'activate',55144522,{chainCodes:[20216608]});
    assert.ok(hasCode(s,0,s.C.OcgLocation.GRAVE,20216608));assert.equal(s.location(0,s.C.OcgLocation.HAND).length,2);
    assert.equal(s.messages.filter(m=>m.type===s.C.OcgMessageType.DRAW).length,2);
    const revealed=s.decisions.find(d=>d.prompt.type===s.C.OcgMessageType.SELECT_CARD);
    const selected=revealed.prompt.selects[revealed.response.indicies[0]].code;
    assert.equal(s.location(0,s.C.OcgLocation.DECK)[0].code,selected);
    assert.ok(s.messages.some(m=>m.type===s.C.OcgMessageType.MOVE&&m.card===selected&&m.from.location===s.C.OcgLocation.HAND&&m.to.location===s.C.OcgLocation.DECK&&(m.reason&0x40)));
    assert.equal(s.messages.filter(m=>m.type===s.C.OcgMessageType.CHAINING&&m.code===20216608).length,2);requireChain(s,20216608);
  });

  await run('batch-a-bug-matrix-hand-insect-native-overlay',[86643777],
    'Matrix grants an Insect Xyz the native 300 ATK/DEF bonus and attaches a selected hand Insect as a real overlay material.',s=>{
    s.add(86643777,0,s.C.OcgLocation.HAND).add(12615446,0,s.C.OcgLocation.MZONE)
      .add(94344242,0,s.C.OcgLocation.HAND).baseDecks().start();
    perform(s,'activate',86643777);assert.equal(s.card(0,s.C.OcgLocation.MZONE).attack,2100);
    perform(s,'activate',86643777,{select:selectByLocation(s,[94344242],[12615446])});
    const q=s.card(0,s.C.OcgLocation.MZONE,0,s.C.OcgQueryFlags.OVERLAY_CARD);assert.deepEqual(q.overlayCards,[94344242]);
    assert.ok(!hasCode(s,0,s.C.OcgLocation.HAND,94344242));once(s,86643777);requireChain(s,86643777);
  });

  await run('batch-a-xyz-territory-rank-damage-calculation-only',[4545854],
    'An opposing Blue-Eyes attacks genuinely Xyz-Summoned Rank-4 Dark Rebellion: Territory\'s damage-calculation-only 800 ATK reverses the battle result, then ATK returns to 2500.',s=>{
    s.add(4545854,0,s.C.OcgLocation.HAND).add(16195942,0,s.C.OcgLocation.EXTRA)
      .add(43096270,0,s.C.OcgLocation.MZONE).add(43096270,0,s.C.OcgLocation.MZONE,1)
      .add(89631139,1,s.C.OcgLocation.MZONE).baseDecks().start();
    perform(s,'activate',4545854);perform(s,'special',16195942);assert.equal(s.card(0,s.C.OcgLocation.MZONE).attack,2500);endTurn(s);enterBattle(s);
    battleAttack(s,89631139,16195942);assert.ok(hasCode(s,1,s.C.OcgLocation.GRAVE,89631139));
    const calculation=s.messages.find(m=>m.type===s.C.OcgMessageType.BATTLE&&m.target?.attack===3300);assert.ok(calculation);assert.equal(calculation.target.defense,2800);
    assert.equal(fieldQuery(s).players[1].lp,7700);assert.equal(s.card(0,s.C.OcgLocation.MZONE).attack,2500);leaveBattle(s);requireChain(s,4545854);
  });

  await run('batch-a-secret-village-opponent-spell-prohibition',[68462976],
    'Only the owner controls a Spellcaster, suppressing opposing Spells; battle destroys that Spellcaster, then the opponent regains Spell activation while the owner becomes locked.',s=>{
    s.add(68462976,0,s.C.OcgLocation.HAND).add(46986414,0,s.C.OcgLocation.MZONE)
      .add(89631139,1,s.C.OcgLocation.MZONE).add(46130346,0,s.C.OcgLocation.HAND)
      .add(46130346,1,s.C.OcgLocation.HAND).baseDecks().start();
    perform(s,'activate',68462976);assert.ok(reachIdle(s).activates.some(c=>c.code===46130346));endTurn(s);
    assert.ok(!reachIdle(s).activates.some(c=>c.code===46130346));enterBattle(s);battleAttack(s,89631139,46986414);
    assert.ok(hasCode(s,0,s.C.OcgLocation.GRAVE,46986414));leaveBattle(s);
    assert.ok(reachIdle(s).activates.some(c=>c.code===46130346));endTurn(s);
    assert.ok(!reachIdle(s).activates.some(c=>c.code===46130346));requireChain(s,68462976);
  });

  await run('batch-a-xyz-override-facedown-hand-cost-preserves-overlays',[32999573],
    'A real Xyz Summon establishes Cowboy with two materials; Override replaces its detach activation cost by a face-down hand banishment while Cowboy still inflicts 800 damage.',s=>{
    s.add(32999573,0,s.C.OcgLocation.HAND).add(12014404,0,s.C.OcgLocation.EXTRA)
      .add(43096270,0,s.C.OcgLocation.MZONE).add(43096270,0,s.C.OcgLocation.MZONE,1)
      .add(89631139,0,s.C.OcgLocation.HAND).baseDecks().start();
    perform(s,'activate',32999573);perform(s,'special',12014404,{respond:(p,C)=>p.type===C.OcgMessageType.SELECT_POSITION?
      {type:C.OcgResponseType.SELECT_POSITION,position:C.OcgPosition.FACEUP_DEFENSE}:null});
    const monsters=s.location(0,s.C.OcgLocation.MZONE);assert.ok(monsters.some(c=>c.code===12014404));
    const sequence=fieldQuery(s).players[0].monsters.findIndex((c,i)=>c&&s.card(0,s.C.OcgLocation.MZONE,i).code===12014404);
    const before=s.card(0,s.C.OcgLocation.MZONE,sequence,s.C.OcgQueryFlags.OVERLAY_CARD);assert.equal(before.overlayCards.length,2);
    perform(s,'activate',12014404,{codes:[89631139],yes:true});const after=s.card(0,s.C.OcgLocation.MZONE,sequence,s.C.OcgQueryFlags.OVERLAY_CARD);
    assert.equal(after.overlayCards.length,2);const cost=s.location(0,s.C.OcgLocation.REMOVED).find(c=>c.code===89631139);assert.ok(cost&&(cost.reason&0x80));
    assert.ok(s.card(0,s.C.OcgLocation.REMOVED).position&s.C.OcgPosition.FACEDOWN);assert.equal(fieldQuery(s).players[1].lp,7200);
    requireChain(s,32999573);requireChain(s,12014404);
  });

  await run('batch-a-laser-qlip-real-additional-normal-summon',[43034264],
    'After an ordinary Normal Summon, Laser Qlip makes a real Qliphort Normal Summon available and the core summons it without Tributes, applying its official Level-4/1800 effect.',s=>{
    s.add(43034264,0,s.C.OcgLocation.HAND).add(23635815,0,s.C.OcgLocation.HAND)
      .add(91907707,0,s.C.OcgLocation.HAND).baseDecks().start();
    perform(s,'activate',43034264);perform(s,'summon',23635815);assert.ok(reachIdle(s).summons.some(c=>c.code===91907707));
    perform(s,'summon',91907707,{option:1,yes:true});const q=s.card(0,s.C.OcgLocation.MZONE,1);assert.equal(q.code,91907707);assert.equal(q.level,4);assert.equal(q.attack,1800);requireChain(s,43034264);
  });

  await run('batch-a-acid-earth-bilateral-stat-restore-non-earth',[35956022],
    'Downpour applies the exact -500 ATK/+400 DEF modifier to both players\' EARTH monsters, excludes LIGHT and restores stats when MST destroys the Field.',s=>{
    s.add(35956022,0,s.C.OcgLocation.HAND).add(23635815,0,s.C.OcgLocation.MZONE)
      .add(23635815,1,s.C.OcgLocation.MZONE).add(89631139,0,s.C.OcgLocation.MZONE,1)
      .add(5318639,0,s.C.OcgLocation.HAND).baseDecks().start();
    perform(s,'activate',35956022);for(const p of [0,1]){const q=s.card(p,s.C.OcgLocation.MZONE);assert.equal(q.attack,1250);assert.equal(q.defense,400);}
    assert.equal(s.card(0,s.C.OcgLocation.MZONE,1).attack,3000);perform(s,'activate',5318639,{codes:[35956022]});
    assert.equal(s.card(0,s.C.OcgLocation.MZONE).attack,1750);assert.equal(s.card(0,s.C.OcgLocation.MZONE).defense,0);requireChain(s,35956022);
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


async function writeBatchReport() {
  const inputs=await loadNativeAuditInputs();const core=await inputs.coreModule.default({...inputs.initializer,sync:true});
  const hash=data=>createHash('sha256').update(data).digest('hex');
  const hashFiles=async paths=>Object.fromEntries(await Promise.all(paths.map(async p=>[p,hash(await readFile(new URL(`../${p}`,import.meta.url)))])));
  const archivePaths=['public/native/scripts.json','public/native/card-data.json','public/native/ocgcore.sync.wasm'];
  const upstreamArchiveHashes=await hashFiles(archivePaths);
  const scenarios=await auditNativeFieldBatchA(inputs,core);
  assert.deepEqual(await hashFiles(archivePaths),upstreamArchiveHashes);
  const provenance=await collectBatchExecutionProvenance(inputs,scenarios,NATIVE_FIELD_BATCH_A_IDS);
  const sourceHashes=Object.fromEntries(provenance.dependencies.map(({path,sha256})=>[path,sha256]));
  const scriptCorrections=provenance.scriptCorrections;
  const fields=NATIVE_FIELD_BATCH_A_IDS.map(code=>{const sourceCode=inputs.resources.canonicalCodeToSource?.get(code)??code;
    const filename=`c${sourceCode}.lua`;const observed=scenarios.flatMap(s=>s.fixtureCards).find(c=>c.sourceCode===sourceCode);
    const upstreamScriptSha256=hash(inputs.resources.scripts.get(filename));assert.equal(observed.scriptSha256,upstreamScriptSha256);
    return {canonicalCode:code,sourceCode,name:inputs.resources.metadata.get(sourceCode)?.name,
      scriptPath:inputs.resources.auditScriptFiles?.[filename]?.path,scriptSha256:upstreamScriptSha256,
      upstreamScriptSha256,effectiveScriptSha256:observed.effectiveScriptSha256};});
  const report={generatedOn:'2026-10-08',batch:'a',nativeApi:core.getVersion(),coreWasmSha256:inputs.coreBuild.wasmSha256,
    flags:auditFlags(inputs.coreModule).toString(),modifiedScripts:scriptCorrections.length>0,upstreamArchiveBytesModified:false,
    fixtures:{beforeStartOnly:true,modifiedScripts:scriptCorrections.length>0,modifiedCardData:false,testMode:false},
    sourceHashes,sourceFiles:sourceHashes,provenance,upstreamArchiveHashes,scriptCorrections,fields,summary:{assignedFields:37,testedFields:new Set(scenarios.filter(s=>s.status==='passed').flatMap(s=>s.fields)).size,
      scenarios:scenarios.length,passedScenarios:scenarios.filter(s=>s.status==='passed').length},
    limits:['Each Field has one explicitly exercised significant branch; other branches and interaction combinations are not certified.',
      'These are headless native scenarios, with browser integration audited separately.'],scenarios};
  const out=new URL('../docs/audits/artifacts/native-field-batch-a-2026-10-08.json',import.meta.url);
  await mkdir(new URL('.',out),{recursive:true});await writeFile(out,`${json(report)}\n`);
  console.log(json(report.summary));for(const s of scenarios.filter(s=>s.status!=='passed'))console.error(s.id,s.error);
  assert.equal(report.summary.passedScenarios,report.summary.scenarios);
  assert.equal(report.summary.testedFields,NATIVE_FIELD_BATCH_A_IDS.length);
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url)await writeBatchReport();
