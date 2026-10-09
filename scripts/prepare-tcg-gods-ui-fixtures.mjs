import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { loadNativeAuditInputs } from './native-field-audit-inputs.mjs';
import { createTcgFormatPolicy } from '../src/core/tcg/TcgCardLegality.js';
import { CURRENT_TCG_BANLIST_ID } from '../src/core/tcg/TcgAdvancedFormat.js';
import { createNativeTcgCardTemplate, isSupportedNativeCatalogueCard } from '../src/core/native/NativeCardCatalogue.js';
import { validateCustomDeck } from '../src/ui/DeckBuilderRules.js';

const { resources } = await loadNativeAuditInputs();
const policy = createTcgFormatPolicy(resources);
const sha = value => createHash('sha256').update(value).digest('hex');
const spell = [...resources.metadata].find(([, metadata]) => metadata.name === "Fiend's Sanctuary");
assert.ok(spell, "Fiend's Sanctuary must be resolved from the actual CDB name");
const sanctuary = createNativeTcgCardTemplate(resources, spell[0]);
assert.equal(sanctuary.tcgCopyLimit, 3);
const script = resources.scripts.get(`c${spell[0]}.lua`);
assert.ok(script.includes('Duel.CreateToken(tp,id+1)'));
assert.equal(script.includes('SetCountLimit'), true); // The token maintenance is once per Standby Phase, not the Spell activation.
const tokenCode = spell[0] + 1;
assert.equal(resources.metadata.get(tokenCode).name, 'Metal Fiend Token');
const options = { native: true, format: 'TCG', banlistId: CURRENT_TCG_BANLIST_ID, ...policy,
  isSupportedCard: (card, section) => isSupportedNativeCatalogueCard(resources, card, section) };
const candidates = [...resources.cards.keys()].sort((a,b) => a-b).flatMap(code => {
  const data = resources.cards.get(code);
  if (data.type !== 17 || data.level > 4) return [];
  const template = createNativeTcgCardTemplate(resources, code);
  return template?.tcgCopyLimit === 3 && policy.getCardEligibility(template, 'main').allowed ? [template] : [];
});
const identities = new Set(), normals = [];
for (const card of candidates) {
  const identity = policy.getCopyIdentity(card);
  if (!identities.has(identity)) { identities.add(identity); normals.push(card); }
  if (normals.length === 12) break;
}
assert.equal(normals.length, 12);
const fixtures = [];
for (const code of [10000020,10000000,10000010]) {
  const god = createNativeTcgCardTemplate(resources, code);
  assert.equal(god.tcgCopyLimit, 3);
  const main = Array(40), opening = new Map([[25,sanctuary.id],[4,sanctuary.id],[18,sanctuary.id],[14,god.id],[11,normals[0].id]]);
  const remaining = normals.flatMap((card,index) => Array(index ? 3 : 2).fill(card.id));
  for (let index=0; index<40; index++) main[index] = opening.get(index) ?? remaining.shift();
  assert.equal(remaining.length,0);assert.ok(main.every(Boolean));
  const deck = { main, extra: [], side: [] };
  const typed = { mainDeck: main.map(id => createNativeTcgCardTemplate(resources,id)), extraDeck: [], sideDeck: [] };
  const validation = validateCustomDeck(typed,'strict',options);
  assert.equal(validation.valid,true,JSON.stringify(validation));
  const counts = new Map();
  for (const card of typed.mainDeck) { const identity=policy.getCopyIdentity(card); counts.set(identity,(counts.get(identity)??0)+1); }
  assert.ok([...counts.values()].every(count=>count<=3));
  fixtures.push({ godId: god.id, godName: god.name, deck,
    expectedOpeningIds: [...opening.values()], expectedRemainingHandId: normals[0].id,
    completeAdvancedDeckValidation: validation,
    permanentNameCounts: [...counts].map(([identity,count])=>({identity,count})),
    cards: [...new Set(main)].map(id=>{ const card=createNativeTcgCardTemplate(resources,id);return {id,name:card.name,copyIdentity:policy.getCopyIdentity(card),copyLimit:card.tcgCopyLimit,eligibility:card.tcgEligibility}; }),
    expectedGodStats: code===10000020 ? [1000,1000] : code===10000000 ? [4000,4000] : [7900,7900],
    expectedPlayerLp: code===10000010 ? 100 : 8000 });
}
const sourcePaths = ['scripts/prepare-tcg-gods-ui-fixtures.mjs','public/native/card-data.json','public/native/scripts.json',
  'src/core/tcg/TcgAdvancedBanlistData.js','src/core/tcg/TcgAdvancedFormat.js','src/core/tcg/TcgCardLegality.js',
  'src/core/native/NativeCardCatalogue.js','src/ui/DeckBuilderRules.js'];
const sourceFiles = Object.fromEntries(await Promise.all(sourcePaths.map(async path=>[path,sha(await readFile(new URL('../'+path,import.meta.url)))])));
const report = { generatedOn:'2026-10-08',ok:true,format:'TCG Advanced strict',snapshot:policy.asOf,banlistId:CURRENT_TCG_BANLIST_ID,
  fixtureScope:'Three isolated browser fixtures registered before Start. Each Main Deck has 40 cards, no Extra or Side cards, at most 3 copies per trusted permanent name and passes the complete dated Advanced policy.',
  sanctuaryObserved:{code:spell[0],name:spell[1].name,sourceDatabase:spell[1].sourceDatabase,type:resources.cards.get(spell[0]).type,
    scriptPath:`c${spell[0]}.lua`,scriptSha256:sha(script),tokenCode,tokenName:resources.metadata.get(tokenCode).name,
    copyLimit:sanctuary.tcgCopyLimit,eligibility:sanctuary.tcgEligibility,
    actualScriptScope:'The normal Spell creates one Metal Fiend Token per resolution; its only SetCountLimit belongs to the token Standby maintenance. Three Spells can legally resolve in the same Main Phase before a 3-Tribute Normal Summon.'},
  sourceFiles,fixtures };
const path = new URL('../docs/audits/artifacts/tcg-gods-ui-fixtures-2026-10-08.json',import.meta.url);
await writeFile(path,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({ok:true,fixtures:fixtures.length,fiendSanctuary:spell[0],tokenCode,format:report.format}));
