/**
 * Explicit allow-list for the cards whose procedures/effects are implemented
 * by this simulator. A card returned by an external API is never considered
 * strict-compatible merely because its generic card type looks familiar.
 */
const STRICT_CARD_REGISTRY = new Map([
  // Main Deck monsters using the normal Summon/Set procedure.
  ['89631139', { section: 'main', procedure: 'normal' }],
  ['46986414', { section: 'main', procedure: 'normal' }],
  ['74677422', { section: 'main', procedure: 'normal' }],
  ['38033121', { section: 'main', procedure: 'normal' }],
  ['70781052', { section: 'main', procedure: 'normal' }],
  ['91152256', { section: 'main', procedure: 'normal' }],
  ['40640057', { section: 'main', procedure: 'normal' }],
  ['13039848', { section: 'main', procedure: 'normal' }],
  ['88819587', { section: 'main', procedure: 'normal' }],
  ['71625222', { section: 'main', procedure: 'normal' }],
  ['63977008', { section: 'main', procedure: 'normal' }],
  ['05053103', { section: 'main', procedure: 'normal' }],
  ['97590747', { section: 'main', procedure: 'normal' }],
  ['14898066', { section: 'main', procedure: 'normal' }],
  ['66602787', { section: 'main', procedure: 'normal' }],
  ['15025844', { section: 'main', procedure: 'normal' }],
  ['41392891', { section: 'main', procedure: 'normal' }],
  ['32452818', { section: 'main', procedure: 'normal' }],
  ['28279543', { section: 'main', procedure: 'normal' }],
  ['06368038', { section: 'main', procedure: 'normal' }],
  ['48305365', { section: 'main', procedure: 'normal' }],
  ['64428736', { section: 'main', procedure: 'normal' }],
  ['44287299', { section: 'main', procedure: 'normal' }],
  ['49791927', { section: 'main', procedure: 'normal' }],

  // Locally scripted Main Deck procedures.
  ['83764718', { section: 'main', procedure: 'spell' }],
  ['12580477', { section: 'main', procedure: 'spell' }],
  ['55144522', { section: 'main', procedure: 'spell' }],
  ['44095762', { section: 'main', procedure: 'trap' }],
  ['04206964', { section: 'main', procedure: 'trap' }],
  ['24094653', { section: 'main', procedure: 'spell' }],
  ['55761792', { section: 'main', procedure: 'spell' }],
  ['05405694', { section: 'main', procedure: 'ritual' }],
  ['94415058', { section: 'main', procedure: 'pendulum' }],
  ['20409757', { section: 'main', procedure: 'pendulum' }],

  // Extra Deck procedures implemented by the local engines.
  ['23995346', { section: 'extra', procedure: 'fusion' }],
  ['44508094', { section: 'extra', procedure: 'synchro' }],
  ['31924889', { section: 'extra', procedure: 'synchro' }],
  ['84013237', { section: 'extra', procedure: 'xyz' }],
  ['77637979', { section: 'extra', procedure: 'link' }]
].map(([id, registration]) => [
  normalizeStrictCardId(id),
  registration
]));

export function normalizeStrictCardId(id) {
  const value = String(id ?? '');
  return /^\d+$/.test(value) ? value.replace(/^0+(?=\d)/, '') : value;
}

export function getStrictCardRegistration(cardOrId) {
  const id = typeof cardOrId === 'object' ? cardOrId?.id : cardOrId;
  return STRICT_CARD_REGISTRY.get(normalizeStrictCardId(id)) || null;
}

function getProcedure(card) {
  if (card?.extra_type) return String(card.extra_type).toLowerCase();
  if (card?.card_type === 'spell') return 'spell';
  if (card?.card_type === 'trap') return 'trap';
  if (card?.isRitualMonster || /Ritual/i.test(card?.type || '')) return 'ritual';
  if (card?.isPendulumMonster || /Pendulum/i.test(card?.type || '')) return 'pendulum';
  if (card?.card_type === 'monster') return 'normal';
  return null;
}

export function isStrictCardSupported(card, expectedSection = null) {
  if (!card || card.supportedInStrict === false) return false;
  const registration = getStrictCardRegistration(card);
  if (!registration) return false;
  if (expectedSection && registration.section !== expectedSection) return false;
  return registration.procedure === getProcedure(card);
}

export { STRICT_CARD_REGISTRY };
