// A Legendary Ocean's name is always Umi, including outside a Duel. This is
// printed rules text, rather than an effect which a player can negate.
const UMI_ID = '22702055';
const PERMANENT_UMI_IDS = new Set([
  UMI_ID, '295517', '34103656', '2819435', '26534688'
]);

export const PERMANENT_NAME_RULE_SOURCE = 'https://www.db.yugioh-card.com/yugiohdb/faq_search.action?ope=4&cid=5387&request_locale=ja';

function passcode(cardOrId) {
  const raw = typeof cardOrId === 'object' ? cardOrId?.id : cardOrId;
  const value = String(raw ?? '');
  return /^\d+$/.test(value) ? value.replace(/^0+(?=\d)/, '') : value;
}

export function getDeckCopyIdentity(cardOrId) {
  const id = passcode(cardOrId);
  return PERMANENT_UMI_IDS.has(id) ? UMI_ID : id;
}

export function getPermanentCardName(card, locale = 'en') {
  if (PERMANENT_UMI_IDS.has(passcode(card))) return 'Umi';
  return locale === 'en' ? card?.name_en || card?.name || '' : card?.name || card?.name_en || '';
}
