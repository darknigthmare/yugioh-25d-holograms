import { getDeckCopyIdentity } from '../CardNameRules.js';
import {
  CURRENT_TCG_BANLIST_ID, TCG_ADVANCED_BANLIST_ENTRIES,
  TCG_ADVANCED_BANLIST_METADATA, TCG_DECK_COPY_ALIASES
} from './TcgAdvancedBanlistData.js';

export { CURRENT_TCG_BANLIST_ID, TCG_ADVANCED_BANLIST_METADATA };
export const TCG_FORMAT_SNAPSHOT_DATE = TCG_ADVANCED_BANLIST_METADATA.asOf;
export const TCG_SWISS_POLICY = Object.freeze({
  id: 'TCG_EU_SWISS', timeLimitMinutes: 50,
  sourceUrl: 'https://img.yugioh-card.com/eu/wp-content/uploads/2025/09/Official-KDE-E-Yu-Gi-Oh-TRADING-CARD-GAME-Tournament-Policy-Version-2.5.pdf',
  sourceSha256: '01b419dde56ac142c5f290758e5a48a443c50e309ba1486cb6ce34aeb95a175c',
  page: 44, unfinishedMatchResult: 'double_loss'
});

/** Printed passcodes and genuine permanent names share one copy identity.
 * This lookup is generated from trusted CDB rows. Object alias/name properties
 * never influence restrictions or allow an alternate illustration to bypass them. */
export function getTcgSnapshotCopyIdentity(cardOrId) {
  const rawId = typeof cardOrId === 'object' ? cardOrId?.id : cardOrId;
  let id = getDeckCopyIdentity(String(rawId ?? '').trim());
  const seen = new Set();
  while (TCG_DECK_COPY_ALIASES[id] && !seen.has(id)) {
    seen.add(id);
    id = TCG_DECK_COPY_ALIASES[id];
  }
  return id;
}

const restrictions = new Map();
for (const entry of TCG_ADVANCED_BANLIST_ENTRIES) {
  for (const code of entry.codes) restrictions.set(getTcgSnapshotCopyIdentity(code), entry);
}

export function getTcgAdvancedRestriction(cardOrId, options = {}) {
  const identity = getTcgSnapshotCopyIdentity(cardOrId);
  const entry = restrictions.get(identity);
  const asOf = options.asOf ?? TCG_FORMAT_SNAPSHOT_DATE;
  if (entry?.effectiveDate > asOf && entry.status === 'Unlimited') {
    return { identity, copyLimit: 0, status: 'Forbidden', effectiveDate: entry.effectiveDate,
      source: TCG_ADVANCED_BANLIST_METADATA.sourceUrl };
  }
  return { identity, copyLimit: entry?.copyLimit ?? 3, status: entry?.status ?? 'Unlimited',
    effectiveDate: entry?.effectiveDate ?? TCG_ADVANCED_BANLIST_METADATA.effectiveDate,
    source: TCG_ADVANCED_BANLIST_METADATA.sourceUrl };
}

export function createCurrentTcgBanlist() {
  const result = { forbidden: [], limited: [], semi_limited: [],
    metadata: { ...TCG_ADVANCED_BANLIST_METADATA } };
  const statusKey = { Forbidden: 'forbidden', Limited: 'limited', 'Semi-Limited': 'semi_limited' };
  for (const entry of TCG_ADVANCED_BANLIST_ENTRIES) {
    const key = statusKey[entry.status];
    if (!key) continue;
    const identity = getTcgSnapshotCopyIdentity(entry.codes[0]);
    if (!result[key].includes(identity)) result[key].push(identity);
  }
  return result;
}
