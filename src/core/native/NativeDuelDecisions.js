/**
 * Translate core-owned decisions into the existing decision modal contract.
 * No duel state is changed here: only a validated, typed core response escapes.
 * Prompts arrive in core order, so payment, targeting and resolution stay under
 * the core's authority. Card labels are private to the choosing side; this module
 * never writes them to logs or queries either player's hidden cards.
 */
const MESSAGE = Object.freeze({
  SELECT_EFFECTYN: 12, SELECT_YESNO: 13, SELECT_OPTION: 14, SELECT_CARD: 15,
  SELECT_CHAIN: 16, SELECT_PLACE: 18, SELECT_POSITION: 19, SELECT_TRIBUTE: 20,
  SORT_CHAIN: 21, SELECT_COUNTER: 22, SELECT_SUM: 23, SELECT_DISFIELD: 24,
  SORT_CARD: 25, SELECT_UNSELECT_CARD: 26, ROCK_PAPER_SCISSORS: 132,
  ANNOUNCE_RACE: 140, ANNOUNCE_ATTRIB: 141, ANNOUNCE_CARD: 142, ANNOUNCE_NUMBER: 143
});
const RESPONSE = Object.freeze({
  SELECT_EFFECTYN: 2, SELECT_YESNO: 3, SELECT_OPTION: 4, SELECT_CARD: 5,
  SELECT_UNSELECT_CARD: 7, SELECT_CHAIN: 8, SELECT_DISFIELD: 9, SELECT_PLACE: 10,
  SELECT_POSITION: 11, SELECT_TRIBUTE: 12, SELECT_COUNTER: 13, SELECT_SUM: 14,
  SORT_CARD: 15, ANNOUNCE_RACE: 16, ANNOUNCE_ATTRIB: 17, ANNOUNCE_CARD: 18,
  ANNOUNCE_NUMBER: 19, ROCK_PAPER_SCISSORS: 20
});
export const NATIVE_DECISION_PROMPT_KINDS = Object.freeze(Object.keys(MESSAGE));
const POSITION_LABELS = new Map([
  [1, 'ATTAQUE FACE RECTO'], [2, 'ATTAQUE FACE VERSO'],
  [4, 'DÉFENSE FACE RECTO'], [8, 'DÉFENSE FACE VERSO']
]);
const ATTRIBUTE_LABELS = ['TERRE', 'EAU', 'FEU', 'VENT', 'LUMIÈRE', 'TÉNÈBRES', 'DIVIN'];
const RACE_LABELS = ['Guerrier', 'Magicien', 'Elfe', 'Démon', 'Zombie', 'Machine', 'Aqua',
  'Pyro', 'Rocher', 'Bête Ailée', 'Plante', 'Insecte', 'Tonnerre', 'Dragon', 'Bête',
  'Bête-Guerrier', 'Dinosaure', 'Poisson', 'Serpent de Mer', 'Reptile', 'Psychique',
  'Bête Divine', 'Dieu Créateur', 'Wyrm', 'Cyberse', 'Illusion', 'Cyborg',
  'Chevalier Magique', 'Grand Dragon', 'Oméga Psychique', 'Guerrier Céleste', 'Galaxie'];

function kindOf(prompt, constants) {
  const messages = constants?.OcgMessageType ?? MESSAGE;
  return NATIVE_DECISION_PROMPT_KINDS.find(kind => messages[kind] === prompt?.type) ?? null;
}
function responseType(kind, constants) {
  return (constants?.OcgResponseType ?? RESPONSE)[kind === 'SORT_CHAIN' ? 'SORT_CARD' : kind];
}
const integer = (value, min = 0, max = Number.MAX_SAFE_INTEGER) => Number.isSafeInteger(value)
  && value >= min && value <= max;
const unique = values => new Set(values).size === values.length;
function validIndices(values, size) {
  return Array.isArray(values) && unique(values) && values.every(value => integer(value, 0, size - 1));
}
function readMetadata(metadata, code) {
  if (!metadata) return null;
  if (metadata instanceof Map) return metadata.get(code) ?? metadata.get(String(code)) ?? null;
  if (Array.isArray(metadata)) return metadata.find(card => Number(card.code ?? card.id) === code) ?? null;
  if (typeof metadata.getCard === 'function') return metadata.getCard(code) ?? null;
  if (typeof metadata.get === 'function') return metadata.get(code) ?? metadata.get(String(code)) ?? null;
  return readMetadata(metadata.cards ?? metadata.byCode ?? metadata.catalogue, code)
    ?? metadata[code] ?? null;
}
function metadataCards(metadata) {
  if (metadata instanceof Map) return [...metadata.entries()].map(([key, card]) => ({ code: Number(key), ...card }));
  if (Array.isArray(metadata)) return metadata;
  if (!metadata) return [];
  return metadataCards(metadata.cards ?? metadata.byCode ?? metadata.catalogue
    ?? Object.values(metadata).filter(card => card && typeof card === 'object' && (card.code || card.id)));
}
function optionsFor(prompt, options = {}) {
  return { ...options, side: options.side ?? options.sideForPlayer?.(prompt.player)
    ?? (prompt.player === 1 ? 'opponent' : 'player') };
}
function cardCandidate(ref, index, prompt, options) {
  // Tribute/counter wire references omit position. A synchronized public board
  // projection may confirm visibility without returning a hidden identity.
  // An explicit facedown position or any opposing hand/deck stays private.
  const publicPositionOmitted = ref.controller !== prompt.player && ref.position == null && integer(ref.code, 1)
    && (ref.location & (1 | 2)) === 0 && (ref.location & (64 | 32 | 4 | 8)) !== 0
    && options.isPublicCard?.(ref) === true;
  const hiddenOther = ref.controller !== prompt.player && ((ref.location & (1 | 2)) !== 0
    || ((ref.location & (64 | 32 | 4 | 8)) !== 0 && ((ref.position ?? 8) & 10) !== 0 && !publicPositionOmitted));
  const known = integer(ref.code, 1) && !hiddenOther;
  // In particular, never resolve code=0 against a mirror containing its real code.
  const card = known ? options.resolveCard?.(ref) ?? readMetadata(options.metadata, ref.code) : null;
  const name = known ? card?.name ?? `Carte ${ref.code}` : 'Carte face verso';
  const effectText = ref.description != null ? descriptionLabel(ref.description, options, ref.code) : '';
  return { uid: String(index), name, label: effectText ? `${name} — ${effectText}` : name,
    source: (ref.location & 4) !== 0 ? 'field' : (ref.location & 64) !== 0 ? 'extra' : 'hand' };
}
function descriptionLabel(description, options, code) {
  const text = options.resolveDescription?.(description, code);
  if (typeof text === 'string' && text) return text;
  try {
    const value = BigInt(description);
    const effectCode = Number(value >> 4n);
    const effectIndex = Number(value & 15n);
    const card = readMetadata(options.metadata, effectCode);
    const label = card?.strings?.[effectIndex] ?? card?.effects?.[effectIndex];
    if (typeof label === 'string' && label) return label;
  } catch { /* Invalid descriptions cannot supply a private label. */ }
  return 'Choix de l’effet';
}
function selectionToIndices(choice, size) {
  if (!Array.isArray(choice)) return null;
  const values = choice.map(value => typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value);
  return validIndices(values, size) ? values : null;
}
function maskValues(mask, count, bigint = false) {
  try {
    const bits = BigInt(mask);
    return Array.from({ length: count }, (_, index) => 1n << BigInt(index))
      .filter(value => (bits & value) !== 0n).map(value => bigint ? value : Number(value));
  } catch { return []; }
}

/** Zero bits are selectable; mask halves are relative to the prompt's player. */
export function nativeSelectablePlaces(prompt) {
  if (![0, 1].includes(prompt?.player) || !integer(prompt?.field_mask, -0x80000000, 0xffffffff)) return [];
  const mask = prompt.field_mask >>> 0;
  const places = [];
  for (let relativePlayer = 0; relativePlayer < 2; relativePlayer += 1) {
    for (const [location, start, length] of [[4, 0, 7], [8, 8, 8]]) {
      for (let sequence = 0; sequence < length; sequence += 1) {
        const bit = relativePlayer * 16 + start + sequence;
        if (((mask >>> bit) & 1) === 0) places.push({ player: prompt.player ^ relativePlayer, location, sequence });
      }
    }
  }
  return places;
}
const placeKey = place => `${place?.player}:${place?.location}:${place?.sequence}`;
function placeLabel(place, prompt) {
  const owner = place.player === prompt.player ? 'Votre' : 'Adversaire —';
  const zone = place.location === 4 ? (place.sequence >= 5 ? 'Zone Monstre Extra' : 'Zone Monstre')
    : (place.sequence === 5 ? 'Zone Terrain' : place.sequence >= 6 ? 'Zone Pendule' : 'Zone Magie/Piège');
  return `${owner} ${zone} ${place.sequence + 1}`;
}

function sumAmounts(card) {
  const encoded = Number(card.amount) >>> 0;
  const low = encoded & 0xffff;
  const high = encoded >>> 16;
  return [...new Set(high ? [low, high] : [low])];
}
function exactSumPossible(cards, amount) {
  if (!cards.length || !integer(amount, 1)) return false;
  let totals = new Set(sumAmounts(cards.at(-1)).filter(value => value > 0 && value <= amount));
  for (let index = cards.length - 2; index >= 0; index -= 1) {
    const next = new Set();
    for (const total of totals) for (const value of sumAmounts(cards[index])) {
      if (total + value <= amount) next.add(total + value);
    }
    totals = next;
    if (!totals.size) return false;
  }
  return totals.has(amount);
}
function validSumSelection(prompt, indices) {
  const must = prompt.selects_must ?? [];
  const optional = prompt.selects ?? [];
  // The response addresses optional cards only; the core appends must cards.
  if (!validIndices(indices, optional.length)) return false;
  const cards = [...must, ...indices.map(index => optional[index])];
  if (!prompt.select_max) return indices.length >= prompt.min && indices.length <= prompt.max
    && cards.length > 0 && exactSumPossible(cards, prompt.amount);
  // Greater-or-equal mode uses upper and lower weight bounds (including must
  // cards) and imposes no min/max count constraint, exactly as playerop.cpp.
  const values = cards.map(card => Math.min(...sumAmounts(card)));
  if (!values.length || values.some(value => !Number.isFinite(value))) return false;
  const total = values.reduce((a, b) => a + b, 0);
  const maximum = cards.reduce((sum, card) => sum + Math.max(...sumAmounts(card)), 0);
  return maximum >= prompt.amount && total - Math.min(...values) < prompt.amount;
}
function validTributeSelection(prompt, indices) {
  return validIndices(indices, prompt.selects?.length ?? 0)
    && indices.length <= prompt.max
    && indices.reduce((total, index) => total + prompt.selects[index].release_param, 0) >= prompt.min;
}

/** Card declarations use public database records, never either player's deck. */
export function nativeCardMatchesAnnounceOpcode(card, opcodes, constants = {}) {
  card = card?.nativeData ?? card?.data ?? card;
  if (!card || !integer(Number(card.code ?? card.id), 1) || !Array.isArray(opcodes)) return false;
  const opcode = constants.OcgOpCode ?? Object.fromEntries([
    ['ADD', 0], ['SUB', 1], ['MUL', 2], ['DIV', 3], ['AND', 4], ['OR', 5], ['NEG', 6], ['NOT', 7],
    ['BAND', 8], ['BOR', 9], ['BNOT', 16], ['BXOR', 17], ['LSHIFT', 18], ['RSHIFT', 19],
    ['ALLOW_ALIASES', 20], ['ALLOW_TOKENS', 21], ['ISCODE', 256], ['ISSETCARD', 257], ['ISTYPE', 258],
    ['ISRACE', 259], ['ISATTRIBUTE', 260], ['GETCODE', 261], ['GETSETCARD', 262], ['GETTYPE', 263],
    ['GETRACE', 264], ['GETATTRIBUTE', 265]
  ].map(([key, value]) => [key, 0x4000000000000000n + (BigInt(value) << 32n)]));
  const stack = [];
  let aliases = false, tokens = false;
  const pop = () => { if (!stack.length) throw new Error('Opcode stack underflow'); return stack.pop(); };
  const binary = fn => { if (stack.length < 2) return; const right = pop(), left = pop(); stack.push(BigInt.asIntN(64, fn(left, right))); };
  const unary = fn => { if (stack.length) stack.push(BigInt.asIntN(64, fn(pop()))); };
  const code = Number(card.code ?? card.id);
  try {
    for (const raw of opcodes) {
      const value = BigInt(raw);
      switch (value) {
        case opcode.ADD: binary((a, b) => a + b); break;
        case opcode.SUB: binary((a, b) => a - b); break;
        case opcode.MUL: binary((a, b) => a * b); break;
        case opcode.DIV: binary((a, b) => a / b); break;
        case opcode.AND: binary((a, b) => a !== 0n && b !== 0n ? 1n : 0n); break;
        case opcode.OR: binary((a, b) => a !== 0n || b !== 0n ? 1n : 0n); break;
        case opcode.NEG: unary(value => -value); break;
        case opcode.NOT: unary(value => value === 0n ? 1n : 0n); break;
        case opcode.BAND: binary((a, b) => a & b); break;
        case opcode.BOR: binary((a, b) => a | b); break;
        case opcode.BNOT: unary(value => ~value); break;
        case opcode.BXOR: binary((a, b) => a ^ b); break;
        case opcode.LSHIFT: binary((a, b) => { if (b < 0n || b > 63n) throw new Error('Invalid shift'); return a << b; }); break;
        case opcode.RSHIFT: binary((a, b) => { if (b < 0n || b > 63n) throw new Error('Invalid shift'); return a >> b; }); break;
        case opcode.ALLOW_ALIASES: aliases = true; break;
        case opcode.ALLOW_TOKENS: tokens = true; break;
        case opcode.ISCODE: unary(value => BigInt(code) === BigInt.asUintN(32, value) ? 1n : 0n); break;
        case opcode.ISSETCARD: {
          if (!stack.length) break;
          const setcode = Number(pop());
          stack.push((card.setcodes ?? []).some(set => (set & 0xfff) === (setcode & 0xfff)
            && (set & setcode & 0xf000) === (setcode & 0xf000)) ? 1n : 0n);
          break;
        }
        case opcode.ISTYPE: unary(value => BigInt(card.type ?? 0) & value); break;
        case opcode.ISRACE: unary(value => BigInt(card.race ?? 0) & value); break;
        case opcode.ISATTRIBUTE: unary(value => BigInt(card.attribute ?? 0) & value); break;
        case opcode.GETCODE: stack.push(BigInt(code)); break;
        case opcode.GETTYPE: stack.push(BigInt(card.type ?? 0)); break;
        case opcode.GETRACE: stack.push(BigInt(card.race ?? 0)); break;
        case opcode.GETATTRIBUTE: stack.push(BigInt(card.attribute ?? 0)); break;
        default: stack.push(BigInt.asIntN(64, value)); break;
      }
    }
    return stack.length === 1 && stack[0] !== 0n
      && ([78734254, 13857930].includes(code) || ((aliases || !card.alias)
        && (tokens || ((Number(card.type) & 0x4001) !== 0x4001))));
  } catch { return false; }
}
function declarationCards(prompt, options) {
  const cards = metadataCards(options.metadata ?? options.cards);
  return cards.filter(card => isDeclarableCard(Number(card.code ?? card.id), prompt, options));
}
function isDeclarableCard(code, prompt, options) {
  if (typeof options.isCardDeclarable === 'function') return options.isCardDeclarable(code, prompt.opcodes) === true;
  const data = options.cardReader?.(code) ?? readMetadata(options.cards ?? options.metadata, code);
  return nativeCardMatchesAnnounceOpcode(data, prompt.opcodes, options.constants);
}

/** Validate both UI decisions and custom AI responses before the core sees them. */
export function validateNativeDuelResponse(prompt, response, options = {}) {
  const kind = kindOf(prompt, options.constants);
  if (!kind || !response || response.type !== responseType(kind, options.constants)) return false;
  switch (kind) {
    case 'SELECT_EFFECTYN': case 'SELECT_YESNO': return typeof response.yes === 'boolean';
    case 'SELECT_OPTION': return integer(response.index, 0, (prompt.options?.length ?? 0) - 1);
    case 'SELECT_CHAIN': return response.index === null ? !prompt.forced
      : integer(response.index, 0, (prompt.selects?.length ?? 0) - 1);
    case 'SELECT_CARD': return response.indicies === null ? prompt.can_cancel === true
      : validIndices(response.indicies, prompt.selects?.length ?? 0)
        && response.indicies.length >= prompt.min && response.indicies.length <= prompt.max;
    case 'SELECT_TRIBUTE': return response.indicies === null ? prompt.can_cancel === true
      : validTributeSelection(prompt, response.indicies);
    case 'SELECT_SUM': return validSumSelection(prompt, response.indicies);
    case 'SELECT_UNSELECT_CARD': return response.index === null ? Boolean(prompt.can_finish || prompt.can_cancel)
      : integer(response.index, 0, (prompt.select_cards?.length ?? 0) + (prompt.unselect_cards?.length ?? 0) - 1);
    case 'SELECT_POSITION': return POSITION_LABELS.has(response.position) && (prompt.positions & response.position) !== 0;
    case 'SELECT_PLACE': case 'SELECT_DISFIELD': {
      const allowed = new Set(nativeSelectablePlaces(prompt).map(placeKey));
      return Array.isArray(response.places) && response.places.length === prompt.count
        && unique(response.places.map(placeKey)) && response.places.every(place => allowed.has(placeKey(place)));
    }
    case 'SELECT_COUNTER': return Array.isArray(response.counters) && response.counters.length === prompt.cards.length
      && response.counters.every((value, index) => integer(value, 0, Math.min(0xffff, prompt.cards[index].count)))
      && response.counters.reduce((a, b) => a + b, 0) === prompt.count;
    case 'SORT_CHAIN': case 'SORT_CARD': return response.order === null
      || (validIndices(response.order, prompt.cards.length) && response.order.length === prompt.cards.length);
    case 'ANNOUNCE_RACE': case 'ANNOUNCE_ATTRIB': {
      const values = response[kind === 'ANNOUNCE_RACE' ? 'races' : 'attributes'];
      const allowed = maskValues(prompt.available, kind === 'ANNOUNCE_RACE' ? 32 : 7, kind === 'ANNOUNCE_RACE');
      return Array.isArray(values) && unique(values) && values.length === prompt.count
        && values.every(value => allowed.includes(value));
    }
    case 'ANNOUNCE_CARD': return integer(response.card, 1, 0x7fffffff)
      && isDeclarableCard(response.card, prompt, options);
    // The core asks for an option INDEX, not the announced number itself.
    case 'ANNOUNCE_NUMBER': return integer(response.value, 0, (prompt.options?.length ?? 0) - 1);
    case 'ROCK_PAPER_SCISSORS': return [1, 2, 3].includes(response.value);
    default: return false;
  }
}

/** One-shot descriptors are compatible with requestUiDecision's choices/multi UI. */
export function translateNativePrompt(prompt, inputOptions = {}) {
  const options = optionsFor(prompt, inputOptions);
  const kind = kindOf(prompt, options.constants);
  if (!kind) return null;
  const type = responseType(kind, options.constants);
  const request = { type: 'native-duel-decision', nativeKind: kind, side: options.side,
    title: 'CHOISIR POUR LE DUEL', description: 'Sélectionnez une option autorisée.', required: true };
  let convert;
  const choices = (items, mapper, title) => {
    request.choices = items.map(mapper);
    if (title) request.title = title;
  };
  switch (kind) {
    case 'SELECT_EFFECTYN': case 'SELECT_YESNO':
      choices([true, false], value => ({ value, label: value ? 'OUI' : 'NON' }), 'ACTIVER OU CONFIRMER ?');
      request.description = descriptionLabel(prompt.description, options, prompt.code);
      if (kind === 'SELECT_EFFECTYN') request.card = cardCandidate(prompt, 0, prompt, options);
      convert = yes => typeof yes === 'boolean' ? { type, yes } : null;
      break;
    case 'SELECT_OPTION': case 'ANNOUNCE_NUMBER':
      choices(prompt.options ?? [], (value, index) => ({ value: index, label: kind === 'ANNOUNCE_NUMBER'
        ? String(value) : descriptionLabel(value, options) }), kind === 'ANNOUNCE_NUMBER' ? 'ANNONCER UN NOMBRE' : 'CHOISIR UN EFFET');
      convert = index => ({ type, [kind === 'ANNOUNCE_NUMBER' ? 'value' : 'index']: index });
      break;
    case 'SELECT_CHAIN':
      request.required = Boolean(prompt.forced);
      choices(prompt.selects ?? [], (ref, index) => ({ value: index,
        label: cardCandidate(ref, index, prompt, options).label }), 'RÉPONDRE À LA CHAÎNE');
      if (!prompt.forced) request.choices.push({ value: null, label: 'PASSER LA PRIORITÉ' });
      convert = index => ({ type, index });
      break;
    case 'SELECT_CARD': case 'SELECT_TRIBUTE': case 'SELECT_SUM': {
      const must = kind === 'SELECT_SUM' ? prompt.selects_must ?? [] : [];
      const refs = prompt.selects ?? [];
      request.multiple = true;
      request.required = kind === 'SELECT_SUM' || !prompt.can_cancel;
      request.minimum = kind === 'SELECT_TRIBUTE' ? 0 : prompt.min;
      request.maximum = prompt.max;
      if (kind === 'SELECT_SUM' && prompt.select_max) {
        request.minimum = 0;
        request.maximum = refs.length;
      }
      request.title = kind === 'SELECT_TRIBUTE' ? 'CHOISIR LES SACRIFICES'
        : kind === 'SELECT_SUM' ? 'CHOISIR LES MATÉRIELS' : 'CHOISIR LES CARTES';
      request.candidates = refs.map((ref, index) => cardCandidate(ref, index, prompt, options));
      if (must.length) request.description = `${must.length} carte(s) obligatoire(s) déjà incluse(s). Sélectionnez les cartes supplémentaires.`;
      convert = choice => {
        if (choice === null && kind !== 'SELECT_SUM') return { type, indicies: null };
        const indices = selectionToIndices(choice, refs.length);
        return indices ? { type, indicies: indices } : null;
      };
      request.validateSelection = choice => {
        const response = convert(choice);
        return response !== null && validateNativeDuelResponse(prompt, response, options);
      };
      break;
    }
    case 'SELECT_UNSELECT_CARD':
      request.required = !prompt.can_finish && !prompt.can_cancel;
      choices([...(prompt.select_cards ?? []), ...(prompt.unselect_cards ?? [])], (ref, index) => ({ value: index,
        label: `${index < prompt.select_cards.length ? 'AJOUTER' : 'RETIRER'} — ${cardCandidate(ref, index, prompt, options).label}` }), 'CHOISIR LES MATÉRIELS');
      if (prompt.can_finish || prompt.can_cancel) request.choices.push({ value: null, label: prompt.can_finish ? 'CONFIRMER LES MATÉRIELS' : 'ANNULER' });
      convert = index => ({ type, index });
      break;
    case 'SELECT_POSITION':
      choices([...POSITION_LABELS].filter(([value]) => (prompt.positions & value) !== 0), ([value, label]) => ({ value, label }), 'CHOISIR LA POSITION');
      convert = position => ({ type, position });
      break;
    case 'SELECT_PLACE': case 'SELECT_DISFIELD': {
      const places = nativeSelectablePlaces(prompt);
      request.title = kind === 'SELECT_DISFIELD' ? 'CHOISIR LES ZONES À CONDAMNER' : 'CHOISIR LA ZONE';
      request.multiple = true;
      request.minimum = prompt.count;
      request.maximum = prompt.count;
      request.candidates = places.map((place, index) => ({ uid: String(index), name: placeLabel(place, prompt), label: placeLabel(place, prompt) }));
      convert = choice => {
        const indices = selectionToIndices(choice, places.length);
        return indices ? { type, places: indices.map(index => places[index]) } : null;
      };
      break;
    }
    case 'ANNOUNCE_RACE': case 'ANNOUNCE_ATTRIB': {
      const race = kind === 'ANNOUNCE_RACE';
      const values = maskValues(prompt.available, race ? 32 : 7, race);
      request.multiple = true; request.minimum = prompt.count; request.maximum = prompt.count;
      request.title = race ? 'ANNONCER UN TYPE' : 'ANNONCER UN ATTRIBUT';
      request.candidates = values.map((value, index) => ({ uid: String(index), name: (race ? RACE_LABELS : ATTRIBUTE_LABELS)[Math.log2(Number(value))] }));
      convert = choice => {
        const indices = selectionToIndices(choice, values.length);
        return indices ? { type, [race ? 'races' : 'attributes']: indices.map(index => values[index]) } : null;
      };
      break;
    }
    case 'ANNOUNCE_CARD':
      choices(declarationCards(prompt, options), card => ({ value: Number(card.code ?? card.id), label: card.name ?? `Carte ${card.code ?? card.id}` }), 'ANNONCER UNE CARTE');
      request.searchable = true;
      convert = card => ({ type, card });
      break;
    case 'ROCK_PAPER_SCISSORS':
      choices([1, 2, 3], (value, index) => ({ value, label: ['CISEAUX', 'PIERRE', 'FEUILLE'][index] }), 'PIERRE, FEUILLE, CISEAUX');
      convert = value => ({ type, value });
      break;
    case 'SELECT_COUNTER': case 'SORT_CARD': case 'SORT_CHAIN':
      // Rich one-shot consumers can render these. The async bridge below uses
      // successive ordinary choices so the existing modal needs no new widgets.
      request.sequence = kind === 'SELECT_COUNTER' ? 'counters' : 'order';
      request.candidates = prompt.cards.map((ref, index) => cardCandidate(ref, index, prompt, options));
      convert = choice => ({ type, [kind === 'SELECT_COUNTER' ? 'counters' : 'order']: choice });
      break;
    default: return null;
  }
  return { request, validate: response => validateNativeDuelResponse(prompt, response, options),
    toResponse: choice => {
      const response = convert(choice);
      return response && validateNativeDuelResponse(prompt, response, options) ? response : null;
    } };
}

function findLegalSubset(prompt, kind) {
  const optional = prompt.selects ?? [];
  if (kind === 'SELECT_SUM' && prompt.select_max) {
    const indices = optional.map((_, index) => index);
    if (!validSumSelection(prompt, indices)) {
      let upper = [...(prompt.selects_must ?? []), ...optional]
        .reduce((sum, card) => sum + Math.max(...sumAmounts(card)), 0);
      if (upper < prompt.amount) return null;
      // Remove optional cards while preserving the upper bound. The resulting
      // group is minimal; its lower bound cannot exceed the required bound.
      for (let index = indices.length - 1; index >= 0; index -= 1) {
        const weight = Math.max(...sumAmounts(optional[indices[index]]));
        if (upper - weight >= prompt.amount) { upper -= weight; indices.splice(index, 1); }
      }
    }
    return validSumSelection(prompt, indices) ? indices : null;
  }
  const maximum = Math.min(prompt.max, optional.length);
  const minimum = kind === 'SELECT_SUM' ? prompt.min : 0;
  const amount = kind === 'SELECT_SUM' ? prompt.amount : prompt.min;
  // Dynamic programming keeps one legal path per cardinality and total rather
  // than enumerating an exponential catalogue of material combinations.
  let mustTotals = new Set([0]);
  if (kind === 'SELECT_SUM') for (const card of prompt.selects_must ?? []) {
    const next = new Set();
    for (const total of mustTotals) for (const value of sumAmounts(card)) if (total + value <= amount) next.add(total + value);
    mustTotals = next;
  }
  const states = Array.from({ length: maximum + 1 }, () => new Map());
  for (const total of mustTotals) states[0].set(total, []);
  const check = indices => kind === 'SELECT_SUM' ? validSumSelection(prompt, indices) : validTributeSelection(prompt, indices);
  for (let index = 0; index < optional.length; index += 1) {
    const weights = kind === 'SELECT_SUM' ? sumAmounts(optional[index]) : [optional[index].release_param];
    for (let count = Math.min(index + 1, maximum); count >= 1; count -= 1) {
      for (const [total, path] of states[count - 1]) for (const weight of weights) {
        const next = kind === 'SELECT_SUM' ? total + weight : Math.min(amount, total + weight);
        if (next > amount || states[count].has(next)) continue;
        states[count].set(next, [...path, index]);
      }
    }
  }
  for (let count = minimum; count <= maximum; count += 1) {
    const path = states[count].get(amount);
    if (path && check(path)) return path;
  }
  return null;
}

/** Deterministic legal fallback for the AI; it sees only the emitted prompt. */
export function chooseNativeAIResponse(prompt, options = {}) {
  const translated = translateNativePrompt(prompt, { ...options, side: 'opponent', resolveCard: undefined });
  if (!translated) return null;
  const kind = kindOf(prompt, options.constants);
  const type = responseType(kind, options.constants);
  let response;
  switch (kind) {
    case 'SELECT_EFFECTYN': case 'SELECT_YESNO': response = { type, yes: true }; break;
    case 'SELECT_OPTION': response = { type, index: 0 }; break;
    case 'ANNOUNCE_NUMBER': response = { type, value: 0 }; break;
    case 'SELECT_CHAIN': response = { type, index: prompt.forced ? 0 : null }; break;
    case 'SELECT_CARD': response = { type, indicies: Array.from({ length: prompt.min }, (_, index) => index) }; break;
    case 'SELECT_TRIBUTE': case 'SELECT_SUM': {
      const indicies = findLegalSubset(prompt, kind);
      response = indicies ? { type, indicies } : kind === 'SELECT_TRIBUTE' && prompt.can_cancel ? { type, indicies: null } : null;
      break;
    }
    case 'SELECT_UNSELECT_CARD': response = { type, index: prompt.can_finish ? null : prompt.select_cards.length ? 0
      : prompt.can_cancel ? null : prompt.unselect_cards.length ? 0 : null }; break;
    case 'SELECT_POSITION': response = { type, position: [...POSITION_LABELS.keys()].find(value => (prompt.positions & value) !== 0) }; break;
    case 'SELECT_PLACE': case 'SELECT_DISFIELD': response = { type, places: nativeSelectablePlaces(prompt).slice(0, prompt.count) }; break;
    case 'SELECT_COUNTER': {
      let remaining = prompt.count;
      const counters = prompt.cards.map(card => { const take = Math.min(card.count, remaining); remaining -= take; return take; });
      response = { type, counters }; break;
    }
    case 'SORT_CARD': case 'SORT_CHAIN': response = { type, order: prompt.cards.map((_, index) => index) }; break;
    case 'ANNOUNCE_RACE': response = { type, races: maskValues(prompt.available, 32, true).slice(0, prompt.count) }; break;
    case 'ANNOUNCE_ATTRIB': response = { type, attributes: maskValues(prompt.available, 7).slice(0, prompt.count) }; break;
    case 'ANNOUNCE_CARD': response = { type, card: Number(declarationCards(prompt, options)[0]?.code ?? declarationCards(prompt, options)[0]?.id) }; break;
    case 'ROCK_PAPER_SCISSORS': response = { type, value: 2 }; break;
    default: return null;
  }
  return validateNativeDuelResponse(prompt, response, options) ? response : null;
}

/** Await explicit human choices; cancellation and stale answers never advance. */
export async function resolveNativeDuelPrompt({ prompt, runtime, side, metadata, resolveCard,
  onDecision, legalAI, generation, isCurrent, ...otherOptions } = {}) {
  const options = { ...otherOptions, side, metadata, resolveCard, constants: runtime?.constants ?? otherOptions.constants };
  options.cardReader ??= runtime?.options?.cardReader;
  options.isCardDeclarable ??= typeof runtime?.isCardDeclarable === 'function'
    ? runtime.isCardDeclarable.bind(runtime) : undefined;
  const translated = translateNativePrompt(prompt, options);
  if (!translated) return null;
  const initialGeneration = runtime?.generation;
  const initialPromptGeneration = runtime?.promptGeneration;
  const tracked = runtime && 'pendingPrompt' in runtime;
  const current = () => (!tracked || runtime.pendingPrompt === prompt) && !runtime?.closed && !runtime?.ended
    && runtime?.generation === initialGeneration && runtime?.promptGeneration === initialPromptGeneration
    && (typeof isCurrent !== 'function' || isCurrent(generation));
  if (!current()) return null;
  if (translated.request.side === 'opponent') {
    if (typeof legalAI === 'function') {
      // Custom AI gets a private decision descriptor, never a runtime or a hand
      // mirror. Unknown cards remain generic in that descriptor.
      let suggested;
      try { suggested = await legalAI({ request: translated.request, side: 'opponent' }); }
      catch { /* A failed policy falls back to an independently legal choice. */ }
      if (!current()) return null;
      if (translated.validate(suggested)) return suggested;
      const converted = translated.toResponse(suggested);
      if (converted) return converted;
    }
    return current() ? chooseNativeAIResponse(prompt, options) : null;
  }
  if (typeof onDecision !== 'function') return null;
  const ask = async request => {
    if (!current()) return undefined;
    const answer = await onDecision(request);
    return current() ? answer : undefined;
  };
  const kind = kindOf(prompt, options.constants);
  if (kind === 'SELECT_COUNTER') {
    const counts = [];
    let remaining = prompt.count;
    for (let index = 0; index < prompt.cards.length; index += 1) {
      const capacityAfter = prompt.cards.slice(index + 1).reduce((sum, card) => sum + card.count, 0);
      const minimum = Math.max(0, remaining - capacityAfter);
      const maximum = Math.min(prompt.cards[index].count, remaining);
      if (minimum > maximum) return null;
      const answer = await ask({ ...translated.request, sequence: undefined, candidates: undefined,
        title: 'RETIRER LES COMPTEURS', description: `${translated.request.candidates[index].name} — ${remaining} compteur(s) restant(s).`,
        choices: Array.from({ length: maximum - minimum + 1 }, (_, offset) => ({ value: minimum + offset, label: String(minimum + offset) })) });
      if (!integer(answer, minimum, maximum)) return null;
      counts.push(answer); remaining -= answer;
    }
    return current() ? translated.toResponse(counts) : null;
  }
  if (kind === 'SORT_CARD' || kind === 'SORT_CHAIN') {
    const available = prompt.cards.map((_, index) => index);
    const chosen = [];
    while (available.length) {
      const answer = await ask({ ...translated.request, sequence: undefined, candidates: undefined,
        title: kind === 'SORT_CHAIN' ? 'ORDONNER LES EFFETS DÉCLENCHÉS' : 'ORDONNER LES CARTES',
        description: `Choisissez la carte en position ${chosen.length + 1}.`, required: true,
        choices: available.map(index => ({ value: index, label: translated.request.candidates[index].label })) });
      if (!available.includes(answer)) return null;
      chosen.push(answer); available.splice(available.indexOf(answer), 1);
    }
    // Wire order maps each original card to its destination rank.
    const order = prompt.cards.map((_, index) => chosen.indexOf(index));
    return current() ? translated.toResponse(order) : null;
  }
  const answer = await ask(translated.request);
  return current() ? translated.toResponse(answer) : null;
}
