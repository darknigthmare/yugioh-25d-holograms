import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { loadNativeAuditInputs } from '../scripts/audit-native-field-runtime.mjs';
import { makeSession, perform, reachIdle, endTurn, enterBattle, leaveBattle, requireChain,
  scenarioEvidence, clone, json } from '../scripts/native-field-audit-harness.mjs';
import { correctNativeDiceDungeonScript, NATIVE_DICE_DUNGEON_SCRIPT_CORRECTION as CORRECTION }
  from '../src/core/native/NativeDiceDungeonScriptCorrection.js';

const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const archiveFiles=['public/native/scripts.json','public/native/card-data.json','public/native/ocgcore.sync.wasm'];
const hashFiles=async files=>Object.fromEntries(await Promise.all(files.map(async path=>[path,hash(await readFile(new URL(`../${path}`,import.meta.url)))])));
const baselineHashes=await hashFiles(archiveFiles);
const inputs=await loadNativeAuditInputs();
const core=await inputs.coreModule.default({...inputs.initializer,sync:true});
const original=inputs.resources.scripts.get(CORRECTION.filename);
const corrected=correctNativeDiceDungeonScript(original);
const effectiveMap=new Map(inputs.resources.scripts);
effectiveMap.set(CORRECTION.filename,corrected);
const cases=[];
let upstreamMismatch;
let productionReaderCase;

// These fixed fixture seeds produced the recorded native outcomes. No response,
// custom RNG callback or Lua operation chooses or alters a die result.
const seeds=[
  [14417597170776629353n,4841133560403876232n,8260047010386786192n,9272791722834923846n],
  [12072115766630003988n,16387449653078886724n,18164719814922947223n,1335510722137167065n],
  [7677425505160176976n,15632882449737936750n,10172101469414383797n,9012195941878950100n],
  [15953190738313573858n,17761614793556771792n,7483718546579912954n,4558639393502493677n],
  [2439735325226629505n,6033948420562034962n,17387877418621781152n,1752438222423787581n],
  [10018809765118716519n,10543409400768742999n,12345208555169681493n,11089935520924673710n]
];
// Independent expectations from the printed six-result table, for the two
// unchanged official fixture monsters (Jerry 1750 ATK and Blue-Eyes 3000 ATK).
const attackTable=[{1:750,2:2750,3:1250,4:2250,5:875,6:3500},
  {1:2000,2:4000,3:2500,4:3500,5:1500,6:6000}];

async function capture({fieldController=0,turnPlayer=1,seed=seeds[0],mode='corrected'}) {
  const scripts=mode==='upstream'?inputs.resources.scripts:effectiveMap;
  // The explicit synchronous reader is intentional: the comparison exercises
  // this exact source even after production's normal Map reader gains a fix.
  const sessionInputs=mode==='production-reader'?inputs:{...inputs,resources:{...inputs.resources,scripts,
    scriptReader:name=>scripts.get(name)??scripts.get(`official/${name}`)??null}};
  const label=`dice-dungeon-${mode}-field-${fieldController}-turn-${turnPlayer}-${seeds.indexOf(seed)}`;
  const s=await makeSession(sessionInputs,core,label,{seed});
  try {
    s.add(CORRECTION.cardId,fieldController,s.C.OcgLocation.HAND)
      .add(23635815,0,s.C.OcgLocation.MZONE).add(89631139,1,s.C.OcgLocation.MZONE).baseDecks().start();
    if(fieldController===1)endTurn(s);
    perform(s,'activate',CORRECTION.cardId);
    for(let turn=0;turn<4;turn++){
      const prompt=reachIdle(s);
      if(prompt.player===turnPlayer&&prompt.to_bp)break;
      endTurn(s);
    }
    const before=reachIdle(s);assert.equal(before.player,turnPlayer);assert.equal(before.to_bp,true);
    enterBattle(s,{chainCodes:[CORRECTION.cardId]});
    const rolls=clone(s.messages.filter(m=>m.type===s.C.OcgMessageType.TOSS_DICE));
    assert.equal(rolls.length,2);assert.deepEqual(rolls.map(r=>r.player),[turnPlayer,1-turnPlayer]);
    for(const roll of rolls){assert.equal(roll.results.length,1);assert.ok(roll.results[0]>=1&&roll.results[0]<=6);}
    const resolvedATK=[s.card(0,s.C.OcgLocation.MZONE).attack,s.card(1,s.C.OcgLocation.MZONE).attack];
    const expectedATK=[0,1].map(player=>attackTable[player][rolls.find(r=>r.player===player).results[0]]);
    leaveBattle(s);endTurn(s);
    const resetATK=[s.card(0,s.C.OcgLocation.MZONE).attack,s.card(1,s.C.OcgLocation.MZONE).attack];
    assert.deepEqual(resetATK,[1750,3000]);requireChain(s,CORRECTION.cardId);
    assert.equal(s.messages.filter(m=>m.type===s.C.OcgMessageType.CHAINING&&m.code===CORRECTION.cardId).length,2);
    const evidence=scenarioEvidence(s,[CORRECTION.cardId],mode==='upstream'?
      'Observe the byte-exact upstream Dice Dungeon source, with no effective script correction.':
      'Each player receives their own real native die result; the End Phase resets both modifiers.');
    return {...evidence,status:mode==='upstream'?'observed-upstream':'passed',mode,fieldController,turnPlayer,
      effectiveScriptSha256:hash(s.duel.options.scriptReader(CORRECTION.filename)),rolls,resolvedATK,expectedATK,resetATK,
      conformsToPrintedDiceAttribution:resolvedATK.every((atk,p)=>atk===expectedATK[p])};
  }finally{s.duel.close();}
}

test('Dice Dungeon correction requires the exact upstream SHA and changes only die attribution',()=>{
  assert.equal(hash(original),CORRECTION.upstreamSha256);assert.equal(hash(corrected),CORRECTION.correctedSha256);
  assert.equal(Buffer.byteLength(original),CORRECTION.upstreamBytes);assert.equal(Buffer.byteLength(corrected),CORRECTION.correctedBytes);
  assert.equal(corrected.replace('\tif turn_p~=tp then res1,res2=res2,res1 end\n',''),original);
  assert.equal([...effectiveMap].filter(([name,source])=>source!==inputs.resources.scripts.get(name)).length,1);
  assert.throws(()=>correctNativeDiceDungeonScript(`${original}\n`),/exact pinned upstream/);
  assert.throws(()=>correctNativeDiceDungeonScript(original.replace('ダイス','テスト')),/exact pinned upstream/);
  assert.throws(()=>correctNativeDiceDungeonScript(corrected),/exact pinned upstream/);
  assert.equal(inputs.resources.scripts.get(CORRECTION.filename),original);
  const printed=inputs.resources.metadata.get(CORRECTION.cardId).description;
  assert.match(printed,/each player rolls a six-sided die and applies the result to all monsters they control/i);
});

test('Byte-exact upstream Lua demonstrably assigns the two opponent-phase rolls to the wrong players',async()=>{
  upstreamMismatch=await capture({mode:'upstream'});
  assert.deepEqual(upstreamMismatch.rolls.map(r=>({player:r.player,result:r.results[0]})),[{player:1,result:2},{player:0,result:1}]);
  assert.deepEqual(upstreamMismatch.resolvedATK,[2750,2000]);assert.deepEqual(upstreamMismatch.expectedATK,[750,4000]);
  assert.equal(upstreamMismatch.conformsToPrintedDiceAttribution,false);
});

for(const fieldController of [0,1])for(const turnPlayer of [0,1])for(let i=0;i<seeds.length;i++){
  test(`Corrected native Dice Dungeon: controller ${fieldController}, turn ${turnPlayer}, real RNG seed ${i}`,async()=>{
    const result=await capture({fieldController,turnPlayer,seed:seeds[i]});
    assert.deepEqual(result.resolvedATK,result.expectedATK);assert.equal(result.conformsToPrintedDiceAttribution,true);
    if(fieldController===0&&turnPlayer===1&&i===0){
      assert.deepEqual(result.rolls,upstreamMismatch.rolls);assert.deepEqual(result.resolvedATK,[750,4000]);
    }
    cases.push(result);
  });
}

test('Uncorrected owner-phase results are preserved by the effective source and all six die values are exercised',async()=>{
  for(const fieldController of [0,1]){
    const upstream=await capture({fieldController,turnPlayer:fieldController,seed:seeds[0],mode:'upstream'});
    const effective=cases.find(c=>c.fieldController===fieldController&&c.turnPlayer===fieldController&&c.fixtureSeed.join(',')===seeds[0].map(String).join(','));
    assert.ok(effective);assert.deepEqual(upstream.resolvedATK,upstream.expectedATK);
    assert.deepEqual(effective.rolls,upstream.rolls);assert.deepEqual(effective.resolvedATK,upstream.resolvedATK);
  }
  assert.deepEqual([...new Set(cases.flatMap(c=>c.rolls.flatMap(r=>r.results)))].sort(),[1,2,3,4,5,6]);
  assert.equal(cases.length,24);assert.deepEqual(await hashFiles(archiveFiles),baselineHashes);
});

test('The production runtime Map reader applies the pinned correction while retaining the original script archive',async()=>{
  productionReaderCase=await capture({mode:'production-reader'});
  assert.equal(productionReaderCase.effectiveScriptSha256,CORRECTION.correctedSha256);
  assert.deepEqual(productionReaderCase.resolvedATK,[750,4000]);
  assert.deepEqual(productionReaderCase.rolls,upstreamMismatch.rolls);
  assert.equal(hash(inputs.resources.scripts.get(CORRECTION.filename)),CORRECTION.upstreamSha256);
});

after(async()=>{
  const endHashes=await hashFiles(archiveFiles);assert.deepEqual(endHashes,baselineHashes);
  const files=['src/core/native/NativeDiceDungeonScriptCorrection.js','src/core/native/NativeSourceIntegrity.js',
    'src/core/native/NativeDuelRuntime.js','src/core/native/NativeCardScriptCorrections.js',
    'src/core/native/NativeLuaCompatibility.js','scripts/native-field-audit-harness.mjs',
    'scripts/native-field-audit-inputs.mjs','tests/native-dice-dungeon-correction.test.mjs'];
  const report={generatedOn:'2026-10-08',correction:CORRECTION,printedCardText:inputs.resources.metadata.get(CORRECTION.cardId).description,
    nativeApi:core.getVersion(),coreRevision:inputs.coreBuild.coreRevision,coreWasmSha256:inputs.coreBuild.wasmSha256,
    flags:cases[0]?.flags??null,upstreamArchiveHashes:baselineHashes,finalArchiveHashes:endHashes,
    upstreamResourcesUnchanged:true,executedLocalSourceCorrection:true,modifiedCDB:false,modifiedWASM:false,
    debug:false,testMode:false,pseudoShuffle:false,postStartInjection:false,sourceHashes:await hashFiles(files),
    summary:{correctedCases:cases.length,expectedCorrectedCases:24,passedCorrectedCases:cases.filter(c=>c.conformsToPrintedDiceAttribution).length,
      observedDiceResults:[...new Set(cases.flatMap(c=>c.rolls.flatMap(r=>r.results)))].sort(),
      ownerAndOpponentPhases:true,bothFieldControllers:true,allEffectiveCasesCaptured:cases.length===24},
    upstreamMismatch,productionReaderCase,cases};
  const directory=new URL('../docs/audits/artifacts/',import.meta.url);await mkdir(directory,{recursive:true});
  await writeFile(new URL('native-dice-dungeon-correction-2026-10-08.json',directory),`${json(report)}\n`);
});
