import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import vm from 'node:vm';
import { STARTER_CARDS, EXTRA_DECK_CARDS } from '../src/cards.js';
import { SOLO_MISSIONS, buildMissionDecks } from '../src/content/SoloCampaign.js';
import { MatchEngine } from '../src/core/MatchEngine.js';
import { getNativeCardCatalogueCount, createNativeCardTemplate } from '../src/core/native/NativeCardCatalogue.js';
import { TCG_ADVANCED_BANLIST_METADATA, TCG_SWISS_POLICY } from '../src/core/tcg/TcgAdvancedFormat.js';
import { loadTcgFormatFixture, officialFormatRows, verifyOfficialRow, verifyLifecycleCases } from './tcg-complete-format-cases.mjs';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const baseCommit = 'b8e216cd53ccc640366c91755268291afb1840d2';
const artifactRoot = 'docs/audits/artifacts/tcg-complete-2026-10-08';
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const fixture = await loadTcgFormatFixture();
const sourceRows = officialFormatRows.map(row => verifyOfficialRow(fixture,row));
const lifecycle = verifyLifecycleCases(fixture);
const targetedChecks = JSON.parse(await readFile(path.join(root,`${artifactRoot}/targeted-tests.json`),'utf8'));
const targetedLog = await readFile(path.join(root,targetedChecks.log));
assert.equal(digest(targetedLog),targetedChecks.sha256);
assert.equal(targetedChecks.tests,281);assert.equal(targetedChecks.pass,281);assert.equal(targetedChecks.fail,0);

// Execute the exact previous validator. Only its relative import is rewritten
// to the same unchanged CardNameRules module for data-URL module resolution.
const beforePath = `${artifactRoot}/before-match-engine.js.txt`;
const beforeBytes = await readFile(path.join(root,beforePath));
assert.deepEqual(beforeBytes,execFileSync('git',['show',`${baseCommit}:src/core/MatchEngine.js`],{cwd:root}));
const beforeSource = beforeBytes.toString().replace("from './CardNameRules.js'",`from '${pathToFileURL(path.join(root,'src/core/CardNameRules.js')).href}'`);
const {MatchEngine: BeforeMatchEngine} = await import(`data:text/javascript;base64,${Buffer.from(beforeSource).toString('base64')}`);
const before = new BeforeMatchEngine();
const beforeAfter = [];
for(const code of [23434538,4280258,76375976,61665245,32807846,73628505,41420027,94145021]) {
  const target=fixture.card(code); const row=officialFormatRows.find(entry=>entry.codes.includes(String(code)));
  const deck=fixture.withCopies(target,row.copyLimit+1);
  const previous=before.validateDeck(deck); const current=new MatchEngine(fixture.options).validateDeck(deck);
  assert.equal(previous.valid,true);assert.equal(current.valid,false);
  beforeAfter.push({cardId:target.id,name:target.name_en??target.name,officialLimit:row.copyLimit,
    copies:row.copyLimit+1,beforeAccepted:true,afterRejected:true,
    issues:current.issues.map(({code,cardId,allowed,found})=>({code,cardId,allowed,found}))});
}
const previousUnknownList = before.validateDeck(fixture.legalDeck(),'TCG_ADVANCED','UNKNOWN').valid;
assert.equal(previousUnknownList,true);
assert.equal(new MatchEngine().validateDeck(fixture.legalDeck(),'TCG_ADVANCED','UNKNOWN').valid,false);

const templateMap = new Map([...STARTER_CARDS,...EXTRA_DECK_CARDS].map(card=>[String(Number(card.id)),card]));
const mainSource=await readFile(path.join(root,'main.js'),'utf8');
const block=mainSource.match(/const PREMADE_DECKS\s*=\s*\{([\s\S]*?)\n\};/)[0];
const context={};vm.runInNewContext(block.replace('const PREMADE_DECKS','globalThis.decks'),context);
const premade=[];
for(const [name,deck] of Object.entries(context.decks)) {
  const definition={mainDeck:Array.from(deck.main,id=>templateMap.get(String(Number(id)))),
    extraDeck:Array.from(deck.extra,id=>templateMap.get(String(Number(id)))),
    sideDeck:Array.from(deck.side,id=>templateMap.get(String(Number(id))))};
  const result=new MatchEngine(fixture.options).validateDeck(definition);assert.equal(result.valid,true,`${name}: ${JSON.stringify(result.issues)}`);
  premade.push({name,main:definition.mainDeck.length,extra:definition.extraDeck.length,side:definition.sideDeck.length,valid:true});
}
const campaign=[];
for(const mission of SOLO_MISSIONS) for(const [player,deck] of Object.entries(buildMissionDecks(mission.id))) {
  const result=new MatchEngine(fixture.options).validateDeck(deck);assert.equal(result.valid,true);
  campaign.push({mission:mission.id,player,valid:true,main:deck.mainDeck.length,extra:deck.extraDeck.length,side:deck.sideDeck.length});
}

// Enumerate every canonical searchable row instead of only the 100 UI results.
const catalogue=new Map();
for(const code of fixture.resources.cards.keys()) {const card=createNativeCardTemplate(fixture.resources,code);if(card)catalogue.set(card.id,card);}
assert.equal(catalogue.size,getNativeCardCatalogueCount(fixture.resources));
const regional={eligible:0,rejected:0,byRejectionCode:{},evidenceCounts:{},samples:{}};
for(const card of catalogue.values()) {
  const result=fixture.policy.getCardEligibility(card);
  regional.evidenceCounts[result.evidence]=(regional.evidenceCounts[result.evidence]??0)+1;
  if(result.allowed)regional.eligible++;else {regional.rejected++;regional.byRejectionCode[result.code]=(regional.byRejectionCode[result.code]??0)+1;
    if((regional.samples[result.code]??=[]).length<3)regional.samples[result.code].push({id:card.id,name:card.name_en??card.name,message:result.message});}
}
const dependencies=[];
for(const filename of ['src/core/MatchEngine.js','src/ui/MatchController.js','src/ui/DeckBuilderRules.js',
  'src/core/tcg/TcgAdvancedFormat.js','src/core/tcg/TcgAdvancedBanlistData.js','src/core/tcg/TcgCardLegality.js',
  'src/core/CardNameRules.js','src/core/native/NativeCardCatalogue.js','src/core/native/NativeCardRegistry.js','src/core/native/NativeCardData.js',
  'src/content/SoloCampaign.js','src/cards.js','main.js','public/native/card-data.json','public/native/scripts.json',
  'scripts/generate-tcg-complete-format.py','scripts/tcg-complete-format-cases.mjs','scripts/audit-tcg-complete-format.mjs',
  'test/tcg-complete-format.test.js',beforePath,`${artifactRoot}/sources.json`,`${artifactRoot}/resolved-advanced-list.json`,
  `${artifactRoot}/targeted-tests.json`,`${artifactRoot}/targeted-tests.txt`,
  `${artifactRoot}/official-advanced-list.html.txt`]) {
  const bytes=await readFile(path.join(root,filename));dependencies.push({path:filename,bytes:bytes.length,sha256:digest(bytes)});
}
const resourcesPreserved=[];
for(const filename of ['public/native/card-data.json','public/native/scripts.json','public/native/manifest.json','public/native/field-banlists.json','src/core/CardNameRules.js']) {
  const bytes=await readFile(path.join(root,filename));const previous=execFileSync('git',['show',`${baseCommit}:${filename}`],{cwd:root,maxBuffer:64*1024*1024});
  assert.deepEqual(bytes,previous);resourcesPreserved.push({path:filename,byteIdenticalToBase:true,bytes:bytes.length,sha256:digest(bytes)});
}
const output={format:'tcg-complete-format-audit-v1',date:'2026-10-08',auditedAtUtc:new Date().toISOString(),ok:true,baseCommit,
  scope:'Complete official Advanced restriction table, trusted CDB copy identities, provider regional eligibility, registered Deck/Side/Match rules and optional KDE-E Swiss expiry; not a certification of all card interactions or every territory-specific promo release.',
  officialList:TCG_ADVANCED_BANLIST_METADATA,officialRowsTested:sourceRows.length,lifecycleCasesTested:lifecycle.length,
  officialRows:sourceRows,lifecycle,targetedChecks,beforeAfter,unknownListBypass:{beforeAccepted:previousUnknownList,afterRejected:true},
  catalogue:{canonicalSearchable:catalogue.size,regionalEligibility:regional},premade,campaign,swissPolicy:TCG_SWISS_POLICY,
  resourcesPreserved,dependencies,
  limitations:[
    'Restrictions count copies across all three registered sections and do not use arbitrary card names/aliases supplied by deck objects.',
    'CDB TCG scope verifies the pinned provider snapshot, not an official publication date for every card or European promo.',
    'The app clock integration and compiled browser end-to-end evidence are supplied by the root task separately.',
    'These are real catalogue registration and Match state tests, not native in-Duel WASM executions.',
    'The historical May list stays the historical small local snapshot to preserve existing Match saves; current new Matches use the complete September table.',
    'Physical-event rules about sleeves, marked cards, judge penalties, attendance and translation documents are outside a digital duel runtime.'
  ]};
await writeFile(path.join(root,`${artifactRoot}/report.json`),JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify({ok:true,officialRows:sourceRows.length,lifecycleCases:lifecycle.length,
  catalogue:catalogue.size,eligible:regional.eligible,rejected:regional.rejected,
  premade:premade.length,campaign:campaign.length,beforeAfter:beforeAfter.length,
  report:`${artifactRoot}/report.json`}));
