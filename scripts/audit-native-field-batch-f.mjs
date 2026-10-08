import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { createNativeFieldScenarioRunner, perform, reachIdle, endTurn, enterBattle, battleAttack, leaveBattle, hasCode, requireChain, clone, json } from './native-field-audit-harness.mjs';

export const NATIVE_FIELD_BATCH_F_IDS = Object.freeze([17621695,89948817,88288421,17782288,29650040,51669847,4663194,43338320,85638822,43940008,20212491,3113667,33981008,34771947,75304793,77297908,64230128,59048135,91228233,71089030,47870325,26493435,86809440,7142724,39210885,99543666,885016,712559,27813661,43912676,3576031,27564031,78082039,37322745,46500985,60946968,73787254]);
const sha256 = value => createHash('sha256').update(value).digest('hex');
const sourceCode = (inputs, code) => inputs.resources.canonicalCodeToSource?.get(code) ?? code;
const metadataCode = (inputs, name) => { const match = [...inputs.resources.metadata].find(([, m]) => m.name === name); assert.ok(match, `Missing official partner ${name}`); return match[0]; };
const fieldQuery = s => { const info=s.duel.queryField(); s.queries.push({query:{field:true},result:clone(info)}); return info; };
const monsterCode = (inputs, predicate) => { const entry=[...inputs.resources.cards].find(([id,data])=>predicate(data,inputs.resources.metadata.get(id))); assert.ok(entry); return entry[0]; };
const sNoSecond = (s, code) => assert.ok(!reachIdle(s).activates.some(c => c.code === code && c.location === s.C.OcgLocation.SZONE), 'Native once-per-turn ignition still offered');

export async function auditNativeFieldBatchF(inputs, sharedCore) {
  const { scenarios, run: originalRun } = createNativeFieldScenarioRunner(inputs, sharedCore);
  const run = originalRun;
  const name = value => metadataCode(inputs,value);
  const bonusSpecs = [
    {field:3576031, monster:name('Crystron Thystvern'), attack:1800,defense:1800,label:'crystolic-archetype-bonus'},
    {field:46500985, monster:name('Metalfoes Goldriver'), attack:2200,defense:800,label:'metamorformation-normal-pendulum-bonus'},
    {field:73787254, monster:name('X-Saber Anu Piranha'), attack:2200,defense:700,bothPlayers:true,label:'saber-vault-level-scaled-bonus'},
    {field:712559, monster:name('Amazoness Swords Woman'), attack:1700,defense:1600,bothPlayers:true,label:'amazoness-village-archetype-bonus'},
    {field:43912676, bothPlayers:true,monster:monsterCode(inputs,(d)=>d.race===0x800000n && d.attack>0 && (d.type & 0x10)!==0 && (d.type & 0x20)===0), label:'celestia-wyrm-bonus'}
  ];
  for(const spec of bonusSpecs) await run(`f-${spec.label}`,[spec.field],'Resolve the native archetype/Type modifier, verify ownership scope and a nonmatching monster, then destroy the Field by MST and query exact base-stat restoration.',s=>{
    const d=inputs.resources.cards.get(spec.monster),L=s.C.OcgLocation;
    s.add(spec.field,0,L.HAND).add(5318639,0,L.HAND).add(spec.monster,0,L.MZONE).add(spec.monster,1,L.MZONE).add(46986414,0,L.MZONE,1).baseDecks().start();
    perform(s,'activate',sourceCode(inputs,spec.field)); requireChain(s,sourceCode(inputs,spec.field));
    const q=s.card(0,L.MZONE); assert.equal(q.attack,spec.attack??d.attack+300); assert.equal(q.defense,spec.defense??d.defense+300);
    const control=s.card(0,L.MZONE,1); assert.equal(control.attack,2500); assert.equal(control.defense,2100);
    const opponent=s.card(1,L.MZONE);assert.equal(opponent.attack,spec.bothPlayers?q.attack:d.attack);assert.equal(opponent.defense,spec.bothPlayers?q.defense:d.defense);
    perform(s,'activate',5318639,{codes:[spec.field]});requireChain(s,5318639);assert.ok(hasCode(s,0,L.GRAVE,spec.field));for(const player of[0,1]){const restored=s.card(player,L.MZONE);assert.equal(restored.attack,d.attack);assert.equal(restored.defense,d.defense);}
  });
  await run('f-closed-forest-monster-grave-count-and-field-prohibition',[78082039],'Beast gains 100 per real GY monster; Spell in GY does not count and a second Field activation is prohibited.',s=>{
    const L=s.C.OcgLocation,beast=monsterCode(inputs,(d)=>d.race===0x4000n && d.attack>0 && d.type===17);
    s.add(78082039,0,L.HAND).add(2084239,0,L.HAND).add(beast,0,L.MZONE).add(89631139,0,L.GRAVE).add(46986414,0,L.GRAVE).add(83764718,0,L.GRAVE).baseDecks().start();
    const before=reachIdle(s); assert.ok(before.activates.some(c=>c.code===2084239));
    perform(s,'activate',78082039); requireChain(s,78082039); assert.equal(s.card(0,L.MZONE).attack,inputs.resources.cards.get(beast).attack+200);
    assert.ok(!reachIdle(s).activates.some(c=>c.code===2084239)); s.location(0,L.GRAVE);
  });
  await run('f-enneapolis-return-real-pendulum-monster',[17621695],'Return a face-up Enneacraft Pendulum monster from MZONE to hand through the native ignition target chain.',s=>{
    const L=s.C.OcgLocation,m=name('Ekto Enneacraft - "tromarIA"');
    s.add(17621695,0,L.HAND).add(m,0,L.MZONE).baseDecks().start(); perform(s,'activate',17621695); perform(s,'activate',17621695,{codes:[m]});
    requireChain(s,17621695); assert.ok(hasCode(s,0,L.HAND,m)); assert.ok(!hasCode(s,0,L.MZONE,m)); sNoSecond(s,17621695);
  });
  await run('f-jurrac-volcano-destroy-dinosaur-deck-summon',[89948817],'Destroy a real Dinosaur and Special Summon Jurrac from Deck; verify effect/destruction reasons and the ignition limit.',s=>{
    const L=s.C.OcgLocation,m=name('Jurrac Protops'),summoned=name('Jurrac Megalo');
    s.add(89948817,0,L.HAND).add(m,0,L.MZONE).add(45894482,0,L.MZONE,1).add(summoned,0,L.DECK).add(summoned,0,L.DECK).baseDecks().start();
    perform(s,'activate',89948817); perform(s,'activate',89948817,{select:p=>p.selects.some(c=>c.code===m)?[m]:[summoned]}); requireChain(s,89948817);
    const grave=s.location(0,L.GRAVE).find(c=>c.code===m); assert.ok(grave); assert.ok(grave.reason & 0x40); assert.ok(grave.reason & 0x1);
    assert.ok(hasCode(s,0,L.MZONE,summoned)); sNoSecond(s,89948817);
  });
  await run('f-field-power-bonus-same-type-summon',[88288421],'The canonical Field resolves its shipped pre-release source script; a Warrior Normal Summon gains 1000 ATK/DEF because another Warrior is present.',s=>{
    const L=s.C.OcgLocation,field=sourceCode(inputs,88288421),m=name('X-Saber Anu Piranha');
    s.add(88288421,0,L.HAND).add(m,0,L.HAND).add(m,0,L.MZONE).baseDecks().start();
    perform(s,'activate',field); perform(s,'summon',m); requireChain(s,field);
    const q=s.card(0,L.MZONE,1); assert.equal(q.code,m); assert.equal(q.attack,2800); assert.equal(q.defense,2100);
    assert.equal(s.card(0,L.MZONE).attack,1800);
  });
  await run('f-angelechy-problem-cost-extra-summon-continuous-spell',[17782288],'Discard an actual Spell as cost, Special Summon Level 2 Angelechy from Extra Deck and place another Synchro as Continuous Spell.',s=>{
    const L=s.C.OcgLocation,a=name('Angelechy Enlisted'),b=name('Angelechy Shatranga');
    s.add(17782288,0,L.HAND).add(83764718,0,L.HAND).add(83764718,0,L.HAND).add(a,0,L.EXTRA).add(a,0,L.EXTRA).add(b,0,L.EXTRA).add(b,0,L.EXTRA).baseDecks().start();
    perform(s,'activate',17782288); perform(s,'activate',17782288,{select:p=>p.selects.some(c=>c.code===83764718)?[83764718]:p.selects.some(c=>c.code===b)?[b]:[a]}); requireChain(s,17782288);
    assert.ok(hasCode(s,0,L.MZONE,a)); const continuous=s.card(0,L.SZONE); assert.equal(continuous.code,b); assert.equal(continuous.type,s.C.OcgType.SPELL|s.C.OcgType.CONTINUOUS);
    const cost=s.location(0,L.GRAVE).find(c=>c.code===83764718); assert.ok(cost.reason & 0x80); assert.ok(cost.reason & 0x4000); sNoSecond(s,17782288);
  });
  await run('f-solfachord-harmonia-faceup-extra-return',[29650040],'Native mode selection recovers a face-up Solfachord Pendulum from Extra Deck to hand and consumes only that mode for this turn.',s=>{
    const L=s.C.OcgLocation,m=name('ReSolfachord Dreamia');
    s.add(29650040,0,L.HAND).add(53129443,0,L.HAND).add(m,0,L.MZONE).baseDecks().start(); perform(s,'activate',53129443); assert.ok(hasCode(s,0,L.EXTRA,m)); perform(s,'activate',29650040); perform(s,'activate',29650040,{codes:[m]});
    requireChain(s,29650040); assert.ok(hasCode(s,0,L.HAND,m)); assert.ok(!hasCode(s,0,L.EXTRA,m)); sNoSecond(s,29650040);
  });
  await run('f-vidolia-banished-count-continuous-negative-owner',[51669847],'Two banished cards on different sides reduce only opposing monsters by 200 ATK; no fabricated counters or monster statistics.',s=>{
    const L=s.C.OcgLocation;s.add(51669847,0,L.HAND).add(46986414,0,L.MZONE).add(46986414,1,L.MZONE).add(83764718,0,L.REMOVED,0,s.C.OcgPosition.FACEDOWN_DEFENSE).add(89631139,1,L.REMOVED).baseDecks().start();
    perform(s,'activate',51669847); requireChain(s,51669847); assert.equal(s.card(0,L.MZONE).attack,2500); assert.equal(s.card(1,L.MZONE).attack,2300); s.location(0,L.REMOVED); s.location(1,L.REMOVED);
  });
  for(const spec of [
    {field:39210885,target:name('Angello Vaalmonica'),label:'vaalmonica-activation-archetype-search'},
    {field:7142724,target:name('Icejade Tinola'),location:'GRAVE',label:'icejade-cradle-grave-recovery'}
  ]) await run(`f-${spec.label}`,[spec.field],'Activate with the real optional search/recovery choice, query the selected partner in hand and its departure from the source zone.',s=>{
    const L=s.C.OcgLocation,from=L[spec.location??'DECK'];s.add(spec.field,0,L.HAND).add(spec.target,0,from).baseDecks().start(); perform(s,'activate',spec.field,{codes:[spec.target]});requireChain(s,spec.field);
    assert.ok(hasCode(s,0,L.HAND,spec.target)); assert.ok(!hasCode(s,0,from,spec.target));
  });
  await run('f-dark-city-midnight-activated-turn-search',[4663194],'Only after the Field was activated this turn, ignition searches a Destiny HERO; the native hard once-per-turn is then exhausted.',s=>{
    const L=s.C.OcgLocation,m=name('Destiny HERO - Doom Lord');s.add(4663194,0,L.HAND).add(m,0,L.DECK).add(name('Destiny HERO - Disk Commander'),0,L.DECK).baseDecks().start();
    perform(s,'activate',4663194); perform(s,'activate',4663194,{codes:[m]});requireChain(s,4663194);assert.ok(hasCode(s,0,L.HAND,m));sNoSecond(s,4663194);
  });
  await run('f-mimighoul-dungeon-deck-search-and-facedown-prohibition',[86809440],'Search a genuine Mimighoul partner; an existing face-down monster makes native Normal Summons unavailable.',s=>{
    const L=s.C.OcgLocation,m=name('Mimighoul Dragon');s.add(86809440,0,L.HAND).add(23635815,0,L.HAND).add(46986414,0,L.MZONE,0,s.C.OcgPosition.FACEDOWN_DEFENSE).add(m,0,L.DECK).baseDecks().start();
    perform(s,'activate',86809440);perform(s,'activate',86809440,{codes:[m]}); requireChain(s,86809440);assert.ok(hasCode(s,0,L.HAND,m)); assert.equal(reachIdle(s).summons.length,0);sNoSecond(s,86809440);
  });
  await run('f-sky-iris-destroy-faceup-card-odd-eyes-search',[27813661],'Destroy another actual face-up card by effect and search Odd-Eyes; verify destruction reason, target chain and ignition exhaustion.',s=>{
    const L=s.C.OcgLocation,m=name('Odd-Eyes Pendulum Dragon');s.add(27813661,0,L.HAND).add(46986414,0,L.MZONE).add(m,0,L.DECK).baseDecks().start();
    perform(s,'activate',27813661);perform(s,'activate',27813661,{select:p=>p.selects.some(c=>c.code===46986414)?[46986414]:[m]});requireChain(s,27813661);assert.ok(hasCode(s,0,L.HAND,m));assert.ok(hasCode(s,0,L.GRAVE,46986414));assert.ok(s.messages.some(m=>m.type===s.C.OcgMessageType.BECOME_TARGET));sNoSecond(s,27813661);
  });
  await run('f-earthbound-prison-target-native-effect-negation',[71089030],'Activation targets an opposing Effect Monster and installs native effect negation while preserving its identity.',s=>{
    const L=s.C.OcgLocation,m=name('Destiny HERO - Doom Lord');s.add(71089030,0,L.HAND).add(m,1,L.MZONE).baseDecks().start();perform(s,'activate',71089030,{codes:[m]});requireChain(s,71089030);
    const q=s.card(1,L.MZONE);assert.equal(q.code,m);assert.ok(q.status&0x1);assert.ok(s.messages.some(m=>m.type===s.C.OcgMessageType.BECOME_TARGET));
  });
  await run('f-multi-universe-destroy-self-place-real-field',[885016],'Target Wetlands in GY, destroy Multi-Universe and place the real target in Field Zone; its native Aqua modifier becomes active.',s=>{
    const L=s.C.OcgLocation;s.add(885016,0,L.HAND).add(2084239,0,L.GRAVE).add(68638985,0,L.MZONE).baseDecks().start();perform(s,'activate',885016);perform(s,'activate',885016,{codes:[2084239]});requireChain(s,885016);
    assert.equal(s.card(0,L.SZONE,5).code,2084239);assert.equal(s.card(0,L.MZONE).attack,1900);assert.ok(hasCode(s,0,L.GRAVE,885016));assert.ok(!hasCode(s,0,L.GRAVE,2084239));
  });
  await run('f-mementomictlan-end-phase-real-grave-set',[43338320],'Own End Phase targets a Memento Trap in GY and Sets it face-down; its identity and source GY departure are queried.',s=>{
    const L=s.C.OcgLocation,m=name('Mementotlan Bone Back');s.add(43338320,0,L.HAND).add(m,0,L.GRAVE).baseDecks().start();perform(s,'activate',43338320);endTurn(s,{codes:[m]}); requireChain(s,43338320);
    const q=s.card(0,L.SZONE);assert.equal(q.code,m);assert.equal(q.position,s.C.OcgPosition.FACEDOWN);assert.ok(!hasCode(s,0,L.GRAVE,m));assert.ok(s.messages.some(m=>m.type===s.C.OcgMessageType.SET));
  });
  await run('f-purrely-street-end-phase-real-overlay',[20212491],'End Phase targets a real Purrely Xyz and attaches a genuine Purrely Quick-Play Spell from Deck as overlay material.',s=>{
    const L=s.C.OcgLocation,m=name('Epurrely Plump'),spell=name('Purrely Happy Memory');s.add(20212491,0,L.HAND).add(m,0,L.MZONE).add(spell,0,L.DECK).baseDecks().start();perform(s,'activate',20212491);endTurn(s,{select:p=>p.selects.some(c=>c.code===m)?[m]:[spell]});requireChain(s,20212491);
    const q=s.card(0,L.MZONE,0,s.C.OcgQueryFlags.OVERLAY_CARD);assert.deepEqual(q.overlayCards,[spell]);assert.ok(!hasCode(s,0,L.DECK,spell));
  });
  await run('f-grand-spellbook-tower-standby-bottom-return-draw',[33981008],'Real own Standby Phase returns a Spellbook from GY to deck bottom and draws the original top card; Spellcaster in GY satisfies its condition.',s=>{
    const L=s.C.OcgLocation,m=name('Spellbook of Power');s.add(33981008,0,L.HAND).add(m,0,L.GRAVE).add(46986414,0,L.GRAVE).baseDecks().start();perform(s,'activate',33981008);endTurn(s);endTurn(s,{codes:[m]});requireChain(s,33981008);
    assert.ok(hasCode(s,0,L.DECK,m));assert.ok(!hasCode(s,0,L.GRAVE,m));assert.ok(hasCode(s,0,L.HAND,46986414));assert.equal(s.messages.filter(m=>m.type===s.C.OcgMessageType.DRAW&&m.player===0).length,1);
  });
  await run('f-labyrinth-wall-shadow-place-native-continuous-gate',[34771947],'The ignition moves Sanga from Deck into SZONE and changes its native TYPE to Continuous Spell; it remains the same physical card.',s=>{
    const L=s.C.OcgLocation,m=name('Sanga of the Thunder');s.add(34771947,0,L.HAND).add(m,0,L.DECK).baseDecks().start();perform(s,'activate',34771947);perform(s,'activate',34771947,{codes:[m]});requireChain(s,34771947);
    const q=s.card(0,L.SZONE);assert.equal(q.code,m);assert.equal(q.type,s.C.OcgType.SPELL|s.C.OcgType.CONTINUOUS);assert.ok(!hasCode(s,0,L.DECK,m));sNoSecond(s,34771947);
  });
  await run('f-symph-amplifire-real-monster-effect-counter-and-boost',[75304793],'A real Symphonic Warrior Piaano ignition resolves; Amplifire adds a native Symphonic Counter and applies its 100 ATK increment.',s=>{
    const L=s.C.OcgLocation,m=name('Symphonic Warrior Piaano');s.add(75304793,0,L.HAND).add(m,0,L.MZONE).baseDecks().start();perform(s,'activate',75304793);assert.equal(s.card(0,L.MZONE).attack,900);perform(s,'activate',m,{codes:[m]});requireChain(s,m);requireChain(s,75304793);
    assert.equal(s.card(0,L.SZONE,5).counters[0x35],1);assert.equal(s.card(0,L.MZONE).attack,1000);assert.ok(s.messages.some(m=>m.type===s.C.OcgMessageType.ADD_COUNTER&&m.counter_type===0x35));
  });
  await run('f-abyss-playhouse-reveal-pair-distinct-script-search',[77297908],'Reveal a real Abyss Actor Pendulum and Abyss Script, then search another named Script; the revealed pair stays in hand.',s=>{
    const L=s.C.OcgLocation,actor=name('Abyss Actor - Extras'),shown=name('Abyss Script - Rise of the Abyss King'),added=name('Abyss Script - Fantasy Magic');s.add(77297908,0,L.HAND).add(actor,0,L.HAND).add(shown,0,L.HAND).add(added,0,L.DECK).baseDecks().start();perform(s,'activate',77297908);perform(s,'activate',77297908,{select:p=>p.selects.some(c=>c.code===added)?[added]:p.selects.some(c=>c.code===actor)?[actor]:[shown]});requireChain(s,77297908);
    for(const code of[actor,shown,added])assert.ok(hasCode(s,0,L.HAND,code));assert.ok(!hasCode(s,0,L.DECK,added));assert.equal(s.location(0,L.GRAVE).length,0);assert.ok(s.messages.some(m=>m.type===s.C.OcgMessageType.CONFIRM_CARDS));sNoSecond(s,77297908);
  });
  await run('f-augmented-heraldry-discard-search-turn-oath',[59048135],'Discard Heraldic Beast as cost and search Heraldry Spell; a non-Heraldic Normal Summon is prohibited for the rest of this native turn.',s=>{
    const L=s.C.OcgLocation,m=name('Heraldic Beast Twin-Headed Eagle'),spell=name('Heraldry Reborn');s.add(59048135,0,L.HAND).add(m,0,L.HAND).add(23635815,0,L.HAND).add(spell,0,L.DECK).baseDecks().start();perform(s,'activate',59048135);assert.ok(reachIdle(s).summons.some(c=>c.code===23635815));perform(s,'activate',59048135,{select:p=>p.selects.some(c=>c.code===m)?[m]:[spell]});requireChain(s,59048135);
    assert.ok(hasCode(s,0,L.HAND,spell));const cost=s.location(0,L.GRAVE).find(c=>c.code===m);assert.ok(cost.reason&0x80);assert.ok(cost.reason&0x4000);assert.ok(!reachIdle(s).summons.some(c=>c.code===23635815));sNoSecond(s,59048135);
  });
  await run('f-onomatopia-real-utopia-xyz-counter-team-bonus',[26493435],'Perform an actual two-material Utopia Xyz Summon; Onomatopia gains its counter and boosts owned monsters by 200 ATK/DEF.',s=>{
    const L=s.C.OcgLocation,m=name('Number 39: Utopia'),material=name('X-Saber Anu Piranha');s.add(26493435,0,L.HAND).add(material,0,L.MZONE).add(material,0,L.MZONE,1).add(46986414,0,L.MZONE,2).add(m,0,L.EXTRA).baseDecks().start();perform(s,'activate',26493435);perform(s,'special',m);requireChain(s,26493435);
    const monster=s.location(0,L.MZONE);assert.ok(monster.some(c=>c.code===m));const moved=s.messages.find(msg=>msg.type===s.C.OcgMessageType.SPSUMMONING&&msg.code===m);const q=s.card(0,L.MZONE,moved.sequence,s.C.OcgQueryFlags.OVERLAY_CARD);assert.equal(q.attack,2700);assert.equal(q.defense,2200);assert.equal(q.overlayCards.length,2);assert.equal(s.card(0,L.MZONE,2).attack,2700);assert.equal(Object.values(s.card(0,L.SZONE,5).counters).reduce((a,b)=>a+b,0),1);
  });
  await run('f-despia-theater-real-level-twelve-fusion-materials',[99543666],'Theater performs a genuine Level 12 Fusion Summon from three Blue-Eyes hand materials; all material moves and Fusion identity come from the core.',s=>{
    const L=s.C.OcgLocation;s.add(99543666,0,L.HAND);for(let n=0;n<3;n++)s.add(89631139,0,L.HAND);s.add(23995346,0,L.EXTRA).baseDecks().start();perform(s,'activate',99543666);perform(s,'activate',99543666);requireChain(s,99543666);
    assert.ok(hasCode(s,0,L.MZONE,23995346));assert.equal(s.location(0,L.GRAVE).filter(c=>c.code===89631139).length,3);assert.ok(s.messages.some(m=>m.type===s.C.OcgMessageType.SPSUMMONED));sNoSecond(s,99543666);
  });
  await run('f-malefic-world-real-predraw-three-reveal-random-hand',[27564031],'With native drawCountPerTurn 1, replace the turn-three normal draw by revealing three Malefic cards; native random selection adds exactly one and draws no card.',s=>{
    const L=s.C.OcgLocation,codes=[name('Malefic Rainbow Dragon'),name('Malefic Cyber End Dragon'),name('Malefic Blue-Eyes White Dragon')];s.add(27564031,0,L.HAND);for(const c of codes)s.add(c,0,L.DECK);s.add(46986414,1,L.DECK).baseDecks().start();perform(s,'activate',27564031);endTurn(s);endTurn(s,{codes});requireChain(s,27564031);
    const hand=s.location(0,L.HAND).filter(c=>codes.includes(c.code));assert.equal(hand.length,1);assert.equal(s.location(0,L.DECK).filter(c=>codes.includes(c.code)).length,2);assert.equal(s.messages.filter(m=>m.type===s.C.OcgMessageType.DRAW&&m.player===0).length,0);assert.ok(s.messages.some(m=>m.type===s.C.OcgMessageType.RANDOM_SELECTED));fieldQuery(s);
  },{team1:{drawCountPerTurn:1},team2:{drawCountPerTurn:1}});
  await run('f-naturia-forest-opponent-activation-negated-search',[37322745],'Solemn Judgment negates an opposing Spell activation and pays half LP; Naturia Forest then resolves a separate delayed search chain for a Level 2 Naturia.',s=>{
    const L=s.C.OcgLocation,m=name('Naturia Sunflower');s.add(37322745,1,L.SZONE,5).add(41420027,1,L.SZONE,0,s.C.OcgPosition.FACEDOWN_DEFENSE).add(m,1,L.DECK).add(46130346,0,L.HAND).baseDecks().start();perform(s,'activate',46130346,{chainCodes:[41420027,37322745],codes:[m]});requireChain(s,41420027);requireChain(s,37322745);
    assert.ok(hasCode(s,1,L.HAND,m));assert.ok(s.messages.some(m=>m.type===s.C.OcgMessageType.CHAIN_NEGATED));assert.equal(fieldQuery(s).players[1].lp,4000);assert.ok(!hasCode(s,1,L.DECK,m));
  });
  await run('f-smile-action-banished-spell-return-discard-negate-attack',[47870325],'Field activation banishes a real GY Spell face-down; an actual attack then randomly recovers and discards it, negating the attack with zero battle damage.',s=>{
    const L=s.C.OcgLocation;s.add(47870325,0,L.HAND).add(83764718,0,L.GRAVE).add(23635815,0,L.MZONE).add(89631139,1,L.MZONE).baseDecks().start();perform(s,'activate',47870325,{codes:[83764718]});const banished=s.card(0,L.REMOVED);assert.equal(banished.position,s.C.OcgPosition.FACEDOWN);endTurn(s);enterBattle(s);battleAttack(s,89631139,23635815);requireChain(s,47870325);
    const discard=s.location(0,L.GRAVE).find(c=>c.code===83764718);assert.ok(discard.reason&0x4000);assert.ok(discard.reason&0x40);assert.ok(hasCode(s,0,L.MZONE,23635815));assert.ok(s.messages.some(m=>m.type===s.C.OcgMessageType.ATTACK_DISABLED));assert.equal(fieldQuery(s).players[0].lp,8000);assert.ok(!hasCode(s,0,L.REMOVED,83764718));
  });
  await run('f-heavy-metal-raiders-first-battle-survival-attack-gain',[3113667],'An actual opposing 2500 ATK attack deals 1100 battle damage to a DARK Machine, which survives its first battle destruction and gains exactly 1100 ATK.',s=>{
    const L=s.C.OcgLocation,m=name('Cannon Soldier');s.add(3113667,0,L.HAND).add(m,0,L.MZONE).add(46986414,1,L.MZONE).baseDecks().start();perform(s,'activate',3113667);endTurn(s);enterBattle(s);battleAttack(s,46986414,m);requireChain(s,3113667);
    assert.equal(s.card(0,L.MZONE).code,m);assert.equal(s.card(0,L.MZONE).attack,2500);assert.equal(fieldQuery(s).players[0].lp,6900);assert.ok(!hasCode(s,0,L.GRAVE,m));
  });
  await run('f-otherworld-a-zone-real-damage-calculation-only-debuff',[60946968],'A 2000 ATK opposing monster attacks Alien Shocktrooper; the calculation-only 300 debuff reverses the battle, destroying the attacker and dealing 200 damage.',s=>{
    const L=s.C.OcgLocation,m=name('Alien Shocktrooper');s.add(60946968,0,L.HAND).add(m,0,L.MZONE).add(43096270,1,L.MZONE).baseDecks().start();perform(s,'activate',60946968);assert.equal(s.card(1,L.MZONE).attack,2000);endTurn(s);enterBattle(s);battleAttack(s,43096270,m);requireChain(s,60946968);
    assert.ok(hasCode(s,1,L.GRAVE,43096270));assert.ok(hasCode(s,0,L.MZONE,m));assert.equal(s.card(0,L.MZONE).attack,1900);assert.equal(fieldQuery(s).players[1].lp,7800);assert.equal(fieldQuery(s).players[0].lp,8000);
  });
  await run('f-gouki-cage-match-counter-removal-on-real-battle',[85638822],'Activation places three native counters; a genuine Gouki battle victory resolves the mandatory Field chain and removes exactly one.',s=>{
    const L=s.C.OcgLocation,m=name('Gouki Suprex');s.add(85638822,0,L.HAND).add(m,0,L.MZONE).add(68638985,1,L.MZONE).baseDecks().start();perform(s,'activate',85638822);assert.equal(s.card(0,L.SZONE,5).counters[0x46],3);endTurn(s);endTurn(s);enterBattle(s);battleAttack(s,m,68638985);requireChain(s,85638822);
    assert.equal(s.card(0,L.SZONE,5).counters[0x46],2);assert.ok(hasCode(s,1,L.GRAVE,68638985));assert.ok(s.messages.some(m=>m.type===s.C.OcgMessageType.REMOVE_COUNTER));
  });
  await run('f-duel-tower-unequal-reveal-banish-hand-special-direct',[43940008],'At the real Battle Phase start each side reveals and banishes a Deck monster face-down; the higher-ATK side Special Summons its hand monster, which can attack directly.',s=>{
    const L=s.C.OcgLocation;s.add(43940008,0,L.HAND).add(89631139,0,L.DECK).add(68638985,1,L.DECK).add(23635815,0,L.HAND).add(46986414,1,L.MZONE).baseDecks().start();perform(s,'activate',43940008);endTurn(s,{effectYes:p=>p.code!==43940008});const battle=enterBattle(s,{select:p=>p.player===0?(p.selects.some(c=>c.code===89631139)?[89631139]:[23635815]):[68638985]});requireChain(s,43940008);
    assert.equal(s.card(0,L.MZONE).code,23635815);for(const[p,c]of[[0,89631139],[1,68638985]]){assert.ok(hasCode(s,p,L.REMOVED,c));assert.equal(s.card(p,L.REMOVED).position,s.C.OcgPosition.FACEDOWN);}assert.ok(s.messages.some(m=>m.type===s.C.OcgMessageType.SPSUMMONED));leaveBattle(s);endTurn(s,{effectYes:p=>p.code!==43940008});const nextBattle=enterBattle(s,{yes:false});assert.ok(nextBattle.attacks.some(c=>c.code===23635815&&c.can_direct));battleAttack(s,23635815,null,{yes:true,effectYes:p=>p.code!==43940008});assert.equal(fieldQuery(s).players[1].lp,6250);assert.ok(hasCode(s,1,L.MZONE,46986414));
  });
  for(const spec of [{field:64230128,label:'zaralaam-adventurer-battle-damage-search',damage:700},{field:91228233,label:'lost-flowers-adventurer-battle-draw-search',draw:true}]) await run(`f-${spec.label}`,[spec.field],'Rite creates a real Adventurer Token; its turn-three battle destruction triggers the Field reward and unlocks the subsequent Main Phase Field search.',s=>{
    const L=s.C.OcgLocation,other=spec.field===64230128?91228233:64230128;s.add(spec.field,0,L.HAND).add(3285551,0,L.HAND).add(other,0,L.DECK).add(68638985,1,L.MZONE).baseDecks().start();perform(s,'activate',spec.field);perform(s,'activate',3285551);const token=s.card(0,L.MZONE).code;assert.equal(s.card(0,L.MZONE).type&s.C.OcgType.TOKEN,s.C.OcgType.TOKEN);endTurn(s);endTurn(s);const handBefore=s.location(0,L.HAND).length;enterBattle(s);battleAttack(s,token,68638985);leaveBattle(s);requireChain(s,spec.field);
    if(spec.draw)assert.equal(s.location(0,L.HAND).length,handBefore+1);else assert.equal(fieldQuery(s).players[1].lp,6000);
    perform(s,'activate',spec.field,{codes:[other]});assert.ok(hasCode(s,0,L.HAND,other));assert.ok(!hasCode(s,0,L.DECK,other));
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

async function main(){
  const {loadNativeAuditInputs}=await import('./native-field-audit-inputs.mjs');const inputs=await loadNativeAuditInputs();const core=await inputs.coreModule.default({sync:true,...inputs.initializer});
  const scenarios=await auditNativeFieldBatchF(inputs,core);const counts={scenarios:scenarios.length,passed:scenarios.filter(s=>s.status==='passed').length,failed:scenarios.filter(s=>s.status!=='passed').length,distinctFields:new Set(scenarios.flatMap(s=>s.fields)).size};
  const provenance=await collectBatchExecutionProvenance(inputs,scenarios,NATIVE_FIELD_BATCH_F_IDS);
  provenance.sources=provenance.dependencies;
  const report={date:'2026-10-08',batch:'F',nativeApi:core.getVersion(),fixturePolicy:{beforeStartOnly:true,modifiedScripts:provenance.modifiedScripts,upstreamArchiveBytesModified:false,modifiedCardData:false,postStartFixtureInjection:false,testMode:false,flagNames:['MODE_MR5','TCG_SEGOC_NONPUBLIC','TCG_SEGOC_FIRSTTRIGGER']},scope:'Significant branches of 37 previously untested Field Spells; no claim of exhaustive rule branches.',counts,provenance,scenarios};
  const output=new URL('../docs/audits/artifacts/native-field-batch-f-2026-10-08.json',import.meta.url);await mkdir(new URL('.',output),{recursive:true});await writeFile(output,json(report)+'\n');
  console.log(json(counts));for(const s of scenarios)console.log(s.status,s.id,s.error??'');if(counts.failed||counts.distinctFields!==NATIVE_FIELD_BATCH_F_IDS.length)process.exitCode=1;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)await main();
