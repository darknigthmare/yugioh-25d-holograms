import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { loadNativeAuditInputs } from './native-field-audit-inputs.mjs';
import { makeSession, perform, endTurn, enterBattle, requireChain, scenarioEvidence, clone, json } from './native-field-audit-harness.mjs';
import { createNativeCardPresentationTemplate } from '../src/core/native/NativeCardCatalogue.js';
import * as current from '../src/core/native/NativeDuelVisualEvents.js';
import { createPublicCombatVisual } from '../src/ui/PublicDuelVisuals.js';
import { createNativeScriptReader } from '../src/core/native/NativeDuelRuntime.js';

export const CONFIRMATION_PRIVACY_BEFORE_SHA256 = '6f8848708ce939600357f8d48f768fc9d3aaac76fe82ce26f68b05d67dbdc8dc';
export const CONFIRMATION_PRIVACY_ARTIFACT = new URL('../docs/audits/artifacts/native-confirmation-privacy-2026-10-08.json',import.meta.url);
const sha256 = value => createHash('sha256').update(value).digest('hex');
const trustedPublicSources = Object.freeze([2106266,43940008]);

async function beforeTranslator() {
  const original = await readFile(new URL('../docs/audits/artifacts/native-confirmation-privacy-before-2026-10-08.js.txt',import.meta.url),'utf8');
  assert.equal(sha256(original),CONFIRMATION_PRIVACY_BEFORE_SHA256);
  const adapted = original.replace("'./NativeCardCharacteristics.js'",JSON.stringify(new URL('../src/core/native/NativeCardCharacteristics.js',import.meta.url).href));
  return {module:await import(`data:text/javascript;base64,${Buffer.from(adapted).toString('base64')}`),provenance:{originalSha256:sha256(original),importAdaptedSha256:sha256(adapted),adaptation:'One import URL changes for module resolution; the archived translator body stays byte-exact.'}};
}

/** One native message stream is projected independently for both viewers. */
export async function auditNativeConfirmationPrivacy() {
  const inputs = await loadNativeAuditInputs(), core = await inputs.coreModule.default({...inputs.initializer,sync:true});
  const before = await beforeTranslator(), cases = [], source = createNativeScriptReader(inputs.resources.scripts);
  const name = value => {const match=[...inputs.resources.metadata].find(([,m])=>m.name===value);assert.ok(match);return match[0];};
  async function run(label,fields,exercise,fixtureOptions={}) {
    const session=await makeSession(inputs,core,label,fixtureOptions),projections=[];
    for(const version of ['before','after','explicit-public-policy']) for(const playerController of [0,1]) {
      const module=version==='before'?before.module:current;
      const projection={version,playerController,events:[],logs:[],metadataLookups:[],nativeQueries:[],activeMessage:null};
      const context=module.createNativeVisualContext({playerController,
        getCardMetadata:code=>{projection.metadataLookups.push({code,messageType:projection.activeMessage?.type,messagePlayer:projection.activeMessage?.player});return createNativeCardPresentationTemplate(inputs.resources,code);},
        queryCard:query=>{projection.nativeQueries.push({query:clone(query),messageType:projection.activeMessage?.type});return session.duel.queryCard(query);}
      });
      if(version==='explicit-public-policy') context.isPublicReveal=(message)=>message.type===31
        && [...context.chains.values()].some(link=>trustedPublicSources.includes(Number(link.card?.id)));
      projection.context=context;projection.module=module;projections.push(projection);
    }
    const advance=session.advance.bind(session);
    session.advance=()=>{const batch=advance();for(const message of batch.messages)for(const p of projections){p.activeMessage=message;const translated=p.module.translateNativeVisualEvents(message,p.context);p.events.push(...translated.events);p.logs.push(...translated.logs);}return batch;};
    const get=(version,player)=>projections.find(p=>p.version===version&&p.playerController===player);
    try {
      const observations=await exercise(session,get);
      cases.push({...scenarioEvidence(session,fields,label),observations,
        projections:projections.map(({context,module,activeMessage,...projection})=>clone(projection))});
    } finally {session.duel.close();}
  }
  function confirmNoLeak(s,get,recipient) {
    const M=s.C.OcgMessageType,confirmation=s.messages.find(message=>message.type===M.CONFIRM_CARDS);
    assert.ok(confirmation);assert.equal(confirmation.player,recipient);
    const secretCodes=confirmation.cards.map(card=>card.code),other=1-recipient;
    assert.ok(get('before',other).events.some(event=>event.type==='reveal'&&secretCodes.includes(Number(event.card?.id))),'Real archived translator leakage must be reproduced');
    for(const version of ['after','explicit-public-policy']) {
      const owner=get(version,recipient),excluded=get(version,other);
      assert.ok(owner.events.some(event=>event.type==='inspect'&&event.private===true&&event.audienceController===recipient&&event.nativeAudienceConfirmed===true&&event.publicReveal===false));
      assert.ok(owner.events.filter(event=>event.type==='inspect').every(event=>createPublicCombatVisual(event,{})===null));
      assert.ok(!excluded.events.some(event=>['inspect','reveal'].includes(event.type)&&secretCodes.includes(Number(event.card?.id))));
      assert.equal(excluded.metadataLookups.filter(lookup=>lookup.messageType===M.CONFIRM_CARDS).length,0);
      assert.equal(excluded.nativeQueries.filter(lookup=>lookup.messageType===M.CONFIRM_CARDS).length,0);
      assert.equal(owner.nativeQueries.filter(lookup=>lookup.messageType===M.CONFIRM_CARDS).length,0);
      assert.ok(!owner.logs.some(log=>log.message.startsWith('Carte révélée')));
      assert.ok(!excluded.logs.some(log=>log.message.startsWith('Carte révélée')));
      for(const card of confirmation.cards)assert.ok(!owner.context.publicCodes.has(`${card.controller}:${card.location}:${card.sequence}:-`));
    }
    return {recipient,cardControllers:confirmation.cards.map(card=>card.controller),oldLeakToOtherViewer:true,newOtherViewerMetadataLookups:0,newOtherViewerNativeQueries:0,recipientGetsPrivateInspection:true,noPublicRevealOrNamedLog:true};
  }

  for(const caster of [0,1]) await run(`private-smartfon-defense-own-deck-controller-${caster}`,[],(s,get)=>{
    const L=s.C.OcgLocation;
    s.add(15521027,caster,L.HAND).add(name('Morphtronic Celfon'),caster,L.GRAVE);
    for(const code of [89631139,46986414,97590747,23635815,43096270,53129443,83764718,5318639])s.add(code,caster,L.DECK);
    s.add(23635815,1-caster,L.DECK).start();if(caster)endTurn(s);
    perform(s,'special',15521027,{respond:(p,C)=>p.type===C.OcgMessageType.SELECT_POSITION?{type:C.OcgResponseType.SELECT_POSITION,position:C.OcgPosition.FACEUP_DEFENSE}:null});
    assert.equal(s.card(caster,L.MZONE).position,s.C.OcgPosition.FACEUP_DEFENSE);
    perform(s,'activate',15521027);requireChain(s,15521027);
    assert.ok(s.messages.some(message=>message.type===s.C.OcgMessageType.TOSS_DICE));
    const observation=confirmNoLeak(s,get,caster);assert.ok(observation.cardControllers.every(player=>player===caster));return observation;
  },{seed:caster?[0x123456789abcdef0n,0xfedcba9876543210n,0xaabbccddeeff0011n,0x1020304050607080n]:[1n,2n,3n,4n]});

  for(const caster of [0,1]) await run(`private-diabolos-opposing-deck-controller-${caster}`,[],(s,get)=>{
    const L=s.C.OcgLocation;
    s.add(29424328,caster,L.HAND).add(46986414,caster,L.MZONE).add(46986414,caster,L.MZONE,1);
    for(const code of [89631139,97590747,23635815,43096270])s.add(code,1-caster,L.DECK);
    s.add(23635815,caster,L.DECK).start();if(caster)endTurn(s,{effectYes:()=>false});
    perform(s,'summon',29424328);assert.equal(s.card(caster,L.MZONE).code,29424328);
    assert.equal(s.location(caster,L.GRAVE).filter(card=>card.code===46986414).length,2);
    endTurn(s);requireChain(s,29424328);
    const observation=confirmNoLeak(s,get,caster);assert.ok(observation.cardControllers.every(player=>player!==caster));return observation;
  });

  for(const caster of [0,1]) await run(`public-smartfon-attack-excavation-controller-${caster}`,[],(s,get)=>{
    const L=s.C.OcgLocation;
    s.add(15521027,caster,L.HAND).add(name('Morphtronic Celfon'),caster,L.GRAVE);
    for(const code of [89631139,46986414,97590747,23635815,43096270,53129443,83764718,5318639])s.add(code,caster,L.DECK);
    s.add(23635815,1-caster,L.DECK).start();if(caster)endTurn(s);perform(s,'special',15521027);perform(s,'activate',15521027);requireChain(s,15521027);
    const confirmation=s.messages.find(message=>message.type===s.C.OcgMessageType.CONFIRM_DECKTOP);assert.ok(confirmation);
    const codes=confirmation.cards.map(card=>String(card.code));
    for(const viewer of [0,1]) {
      assert.ok(get('after',viewer).events.some(event=>event.type==='reveal'&&event.publicReveal===true&&codes.includes(event.card?.id)));
      assert.deepEqual(get('after',viewer).events.filter(event=>event.type==='reveal'),get('before',viewer).events.filter(event=>event.type==='reveal'));
    }
    s.location(caster,L.DECK);return {bothViewersKeepActualPublicExcavation:true,confirmDecktopUnchanged:true,nativeDiceUnmodified:true};
  });

  for(const caster of [0,1]) await run(`official-gaia-reveal-and-search-recipient-controller-${caster}`,[2106266],(s,get)=>{
    const L=s.C.OcgLocation;
    s.add(2106266,caster,L.HAND).add(name('Curse of Dragon'),caster,L.HAND).add(name('Gaia The Fierce Knight'),caster,L.DECK).baseDecks().start();if(caster)endTurn(s);
    perform(s,'activate',2106266);perform(s,'activate',2106266);requireChain(s,2106266);
    assert.ok(s.location(caster,L.HAND).some(card=>card.code===name('Gaia The Fierce Knight')));
    const recipient=1-caster,confirmations=s.messages.filter(message=>message.type===s.C.OcgMessageType.CONFIRM_CARDS);assert.equal(confirmations.length,2);assert.ok(confirmations.every(message=>message.player===recipient));
    assert.equal(get('after',recipient).events.filter(event=>event.type==='inspect').length,2);
    assert.equal(get('after',caster).metadataLookups.filter(lookup=>lookup.messageType===31).length,0);
    for(const viewer of [0,1])assert.equal(get('explicit-public-policy',viewer).events.filter(event=>event.type==='reveal'&&event.publicReveal===true).length,2);
    return {actualRevealCostAndSearchPreserved:true,defaultRecipientInspection:true,explicitTrustedPolicyAllowsBothPublicReveals:true};
  });

  for(const owner of [0,1]) await run(`official-duel-tower-reveals-recipient-owner-${owner}`,[43940008],(s,get)=>{
    const L=s.C.OcgLocation;
    s.add(43940008,owner,L.HAND).add(89631139,0,L.DECK).add(68638985,1,L.DECK).add(23635815,0,L.HAND).baseDecks().start();
    if(owner)endTurn(s);perform(s,'activate',43940008);if(!owner)endTurn(s,{effectYes:p=>p.code!==43940008});
    enterBattle(s,{select:p=>p.player===0?(p.selects.some(card=>card.code===89631139)?[89631139]:[23635815]):[68638985]});requireChain(s,43940008);
    assert.equal(s.card(0,L.MZONE).code,23635815);
    for(const viewer of [0,1]) {
      const inspected=get('after',viewer).events.filter(event=>event.type==='inspect');assert.equal(inspected.length,1);assert.equal(inspected[0].audienceController,viewer);
      const publicReveals=get('explicit-public-policy',viewer).events.filter(event=>event.type==='reveal'&&event.publicReveal===true);assert.equal(publicReveals.length,2);
      const moves=get('after',viewer).events.filter(event=>event.type==='move'&&event.to?.zoneType==='banished');assert.equal(moves.length,2);assert.ok(moves.every(event=>event.card===null&&event.hidden===true));
      assert.ok(get('after',viewer).events.some(event=>event.type==='summon'&&event.nativeSummonConfirmed===true&&event.card?.id==='23635815'));
    }
    return {coreRevealsAndLegalWinnerSummonPreserved:true,defaultEachRecipientGetsOneInspection:true,explicitPublicPolicyKeepsBothReveals:true,facedownBanishmentAnonymous:true};
  });

  const pins=[15521027,29424328,2106266,43940008].map(code=>{
    const filename=`c${code}.lua`,original=inputs.resources.scripts.get(filename),effective=source(filename),metadata=inputs.resources.metadata.get(code);
    return {cardId:code,filename,originalSha256:sha256(original),effectiveSha256:sha256(effective),textSource:'Shipped official CDB metadata; complete archive hash recorded below.',name:metadata.name,text:metadata.description??metadata.desc,textSha256:sha256(metadata.description??metadata.desc)};
  });
  const paths=['scripts/audit-native-confirmation-privacy.mjs','tests/native-confirmation-privacy.test.mjs','src/core/native/NativeDuelVisualEvents.js','src/ui/PublicDuelVisuals.js','src/ui/NativeDuelPresentationModel.js','src/core/native/NativeDuelGame.js','src/core/native/NativeDuelDecisions.js','src/core/native/NativeCardCatalogue.js','src/core/native/NativeCardCharacteristics.js','src/core/native/NativeDuelRuntime.js','src/core/native/NativeCardScriptCorrections.js','src/core/native/NativeDuelTowerScriptCorrection.js','src/core/native/NativeDiceDungeonScriptCorrection.js','src/core/native/NativeSourceIntegrity.js','src/core/native/NativeLuaCompatibility.js','scripts/native-field-audit-inputs.mjs','scripts/native-field-audit-harness.mjs','src/core/native/vendor/ocgcore/index.js','public/native/manifest.json','public/native/card-data.json','public/native/scripts.json','public/native/ocgcore.sync.wasm','docs/audits/artifacts/native-confirmation-privacy-before-2026-10-08.js.txt'];
  const dependencies=[];for(const path of paths){const bytes=await readFile(new URL(`../${path}`,import.meta.url));dependencies.push({path,bytes:bytes.length,sha256:sha256(bytes)});}
  for(const [artifact,path]of[['cards','public/native/card-data.json'],['scripts','public/native/scripts.json']])assert.equal(dependencies.find(entry=>entry.path===path).sha256,inputs.resources.manifest.artifacts[artifact].sha256);
  assert.equal(dependencies.find(entry=>entry.path.endsWith('.wasm')).sha256,inputs.coreBuild.wasmSha256);
  const fixtureScripts=new Map();for(const c of cases)for(const card of c.fixtureCards){const filename=`c${card.sourceCode}.lua`,original=inputs.resources.scripts.get(filename);if(typeof original!=='string')continue;const effective=source(filename);assert.equal(card.scriptSha256,sha256(original));assert.equal(card.effectiveScriptSha256,sha256(effective));fixtureScripts.set(filename,{filename,originalSha256:sha256(original),effectiveSha256:sha256(effective),corrected:original!==effective});}
  return {date:'2026-10-08',executedAtUtc:new Date().toISOString(),nativeApi:core.getVersion(),scope:'Ten authentic native cases, each projected for both viewers, reproduce the original confirmation leak and prove recipient privacy and explicitly authorized public reveals.',contract:{confirmCardsDefault:'Only the native recipient receives a private inspect event; no public reveal, named log, public cache or stat query.',explicitPublic:'Only isPublicReveal(message,location) === true authorizes a public reveal.',confirmDecktopAndExtratop:'Existing public-confirmation behavior unchanged.',visibilityNeverChangesDuelResults:true},upstreamArchiveBytesModified:false,postStartInjection:false,debugApi:false,before:before.provenance,provenance:{dependencies,cardTextAndScriptPins:pins,fixtureScripts:[...fixtureScripts.values()],explicitPublicSourcePolicy:trustedPublicSources,explicitPolicyScope:'Audit-only trusted source policy for known official public reveal texts. Production defaults remain recipient-only.'},summary:{scenarios:cases.length,passed:cases.length,viewersPerScenario:2,privacyCases:4,publicExcavationCases:2,officialRevealCases:4},cases};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  const report=await auditNativeConfirmationPrivacy();await mkdir(new URL('.',CONFIRMATION_PRIVACY_ARTIFACT),{recursive:true});await writeFile(CONFIRMATION_PRIVACY_ARTIFACT,json(report)+'\n');console.log(json(report.summary));
}
