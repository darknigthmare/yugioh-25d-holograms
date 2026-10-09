import assert from 'node:assert/strict';
import test from 'node:test';
import { auditNativeConfirmationPrivacy } from '../scripts/audit-native-confirmation-privacy.mjs';
import { createNativeVisualContext,translateNativeVisualEvents } from '../src/core/native/NativeDuelVisualEvents.js';

const report=await auditNativeConfirmationPrivacy();
for(const scenario of report.cases)test(`native confirmation audience: ${scenario.id}`,()=>{
  assert.equal(scenario.status,'passed');assert.deepEqual(scenario.errors,[]);
  assert.ok(scenario.messages.length&&scenario.decisions.length&&scenario.queries.length&&scenario.fixtureCards.length);
  assert.ok(!scenario.messages.some(message=>message.type===1));
  assert.equal(scenario.projections.length,6);
  for(const projection of scenario.projections.filter(p=>p.version==='after')){
    const privateEvents=projection.events.filter(event=>event.type==='inspect');
    assert.ok(privateEvents.every(event=>/^native-private-inspection-\d+$/.test(event.inspectionGroupId)));
    for(const id of new Set(privateEvents.map(event=>event.inspectionGroupId)))
      assert.ok(privateEvents.filter(event=>event.inspectionGroupId===id).every(event=>event.audienceController===projection.playerController));
  }
  if(scenario.id==='private-smartfon-defense-own-deck-controller-1'){
    const confirmation=scenario.messages.find(message=>message.type===31);
    assert.equal(confirmation.cards.length,6,'Six comes from the actual seeded native die result');
    const inspection=scenario.projections.find(p=>p.version==='after'&&p.playerController===1).events.filter(event=>event.type==='inspect');
    assert.equal(inspection.length,6);assert.equal(new Set(inspection.map(event=>event.inspectionGroupId)).size,1);
  }
});
test('an invalid confirmation audience cannot trigger metadata or native queries',()=>{
  let metadataReads=0,queries=0;
  const context=createNativeVisualContext({getCardMetadata:()=>{metadataReads++;throw new Error('Private metadata touched');},queryCard:()=>{queries++;throw new Error('Private stats touched');}});
  const original=report.cases[0].messages.find(message=>message.type===31);
  const translated=translateNativeVisualEvents({...original,player:255},context);
  assert.deepEqual(translated,{events:[],logs:[]});assert.equal(metadataReads,0);assert.equal(queries,0);
});
test('a private confirmation cannot populate public identities or supply later hidden stats',()=>{
  const original=report.cases[0].messages.find(message=>message.type===31);
  const context=createNativeVisualContext({playerController:original.player,getCardMetadata:code=>({id:String(code),name:'Private inspected card'}),queryCard:()=>{throw new Error('Private confirmation queried');}});
  const result=translateNativeVisualEvents(original,context);
  assert.ok(result.events.every(event=>event.type==='inspect'&&event.private===true&&event.publicReveal===false));
  assert.deepEqual(result.logs,[]);assert.equal(context.publicCards.size,0);assert.equal(context.publicCodes.size,0);
});
test('an explicit false public policy preserves only the addressed private inspection',()=>{
  const original=report.cases[0].messages.find(message=>message.type===31);
  for(const playerController of [0,1]){
    const context=createNativeVisualContext({playerController,isPublicReveal:()=>false,getCardMetadata:code=>({id:String(code)})});
    const result=translateNativeVisualEvents(original,context);
    assert.equal(result.events.length,playerController===original.player?original.cards.length:0);
    assert.ok(result.events.every(event=>event.type==='inspect'));assert.deepEqual(result.logs,[]);
  }
});
