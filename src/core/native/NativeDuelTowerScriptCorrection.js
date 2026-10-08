/** Local execution correction for the tie clause printed by Konami.
 * The upstream archive stays byte-identical; only its executed source changes.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
import { nativeSourceSha256 } from './NativeSourceIntegrity.js';

const before = "\tif atk[tp]==atk[1-tp] then return end\n\tlocal p=(atk[tp]>atk[1-tp]) and tp or 1-tp\n\tif not Duel.IsExistingMatchingCard(Card.IsCanBeSpecialSummoned,p,LOCATION_HAND,0,1,nil,e,0,p,false,false)\n\t\tor not Duel.SelectYesNo(p,aux.Stringid(id,3)) then return end\n\tDuel.Hint(HINT_SELECTMSG,p,HINTMSG_SPSUMMON)\n\tlocal sc=Duel.SelectMatchingCard(p,Card.IsCanBeSpecialSummoned,p,LOCATION_HAND,0,1,1,nil,e,0,p,false,false):GetFirst()\n\tif not sc then return end\n\tif Duel.SpecialSummonStep(sc,0,p,p,false,false,POS_FACEUP) then\n\t\t--Can attack directly\n\t\tlocal e1=Effect.CreateEffect(c)\n\t\te1:SetDescription(3205)\n\t\te1:SetProperty(EFFECT_FLAG_CLIENT_HINT)\n\t\te1:SetType(EFFECT_TYPE_SINGLE)\n\t\te1:SetCode(EFFECT_DIRECT_ATTACK)\n\t\te1:SetReset(RESET_EVENT|RESETS_STANDARD)\n\t\tsc:RegisterEffect(e1)\n\tend\n\tDuel.SpecialSummonComplete()";
const after = "\tlocal highest_atk=math.max(atk[tp],atk[1-tp])\n\tif highest_atk<0 then return end\n\tfor _,p in ipairs(players) do\n\t\tif atk[p]==highest_atk and Duel.GetLocationCount(p,LOCATION_MZONE)>0\n\t\t\tand Duel.IsExistingMatchingCard(Card.IsCanBeSpecialSummoned,p,LOCATION_HAND,0,1,nil,e,0,p,false,false)\n\t\t\tand Duel.SelectYesNo(p,aux.Stringid(id,3)) then\n\t\t\tDuel.Hint(HINT_SELECTMSG,p,HINTMSG_SPSUMMON)\n\t\t\tlocal sc=Duel.SelectMatchingCard(p,Card.IsCanBeSpecialSummoned,p,LOCATION_HAND,0,1,1,nil,e,0,p,false,false):GetFirst()\n\t\t\tif sc and Duel.SpecialSummonStep(sc,0,p,p,false,false,POS_FACEUP) then\n\t\t\t\t--Can attack directly\n\t\t\t\tlocal e1=Effect.CreateEffect(c)\n\t\t\t\te1:SetDescription(3205)\n\t\t\t\te1:SetProperty(EFFECT_FLAG_CLIENT_HINT)\n\t\t\t\te1:SetType(EFFECT_TYPE_SINGLE)\n\t\t\t\te1:SetCode(EFFECT_DIRECT_ATTACK)\n\t\t\t\te1:SetReset(RESET_EVENT|RESETS_STANDARD)\n\t\t\t\tsc:RegisterEffect(e1)\n\t\t\tend\n\t\tend\n\tend\n\tDuel.SpecialSummonComplete()";

export const NATIVE_DUEL_TOWER_SCRIPT_CORRECTION = Object.freeze({
  cardId: 43940008,
  filename: 'c43940008.lua',
  upstreamPath: 'official/c43940008.lua',
  upstreamSha256: '43d4454ff05c1e05ec47eb69023e45750b4e0e9bf186c4b718e72432ba0f1460',
  correctedSha256: '32bfc7a639718a0f1631dd6eec0ee9018334e7273aeabb09065d5e0eb213a11e',
  verifiedOn: '2026-10-08',
  reason: 'Konami TCG EN/FR explicitly permits each player to Special Summon when the revealed ATK are tied. The bundled source returns without either summon.',
  officialSources: Object.freeze([
    'https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=2&cid=17244&request_locale=en',
    'https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=2&cid=17244&request_locale=fr'
  ]),
  substitutions: Object.freeze([Object.freeze({ before, after, occurrences: 1 })])
});

/** Only the pinned original is accepted. Unknown upstream changes fail closed. */
export function correctNativeDuelTowerScript(source) {
  if (typeof source !== 'string') throw new TypeError('Duel Tower source must be a string');
  const provenance = NATIVE_DUEL_TOWER_SCRIPT_CORRECTION;
  const actualSha256 = nativeSourceSha256(source);
  if (actualSha256 !== provenance.upstreamSha256) {
    throw new Error(`Duel Tower upstream SHA-256 mismatch: ${actualSha256}`);
  }
  if (source.split(before).length - 1 !== 1) throw new Error('Duel Tower correction requires exactly one pinned winner block');
  const corrected = source.replace(before, after);
  if (nativeSourceSha256(corrected) !== provenance.correctedSha256) throw new Error('Duel Tower corrected SHA-256 mismatch');
  return corrected;
}
