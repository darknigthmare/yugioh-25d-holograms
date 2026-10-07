import { CardState } from '../CardState.js';
import { FieldState } from '../FieldState.js';
import { MatchEngine } from '../MatchEngine.js';
import { validateCustomDeck } from '../../ui/DeckBuilderRules.js';
import { OcgDuelMode } from './vendor/ocgcore/index.js';
import { createNativeDuelRuntime } from './NativeDuelRuntime.js';
import { createNativeCardPresentationTemplate, isSupportedNativeCatalogueCard,
  getNativeCardCopyIdentity } from './NativeCardCatalogue.js';
import { resolveNativeDuelPrompt, validateNativeDuelResponse } from './NativeDuelDecisions.js';
import { createNativeVisualContext, translateNativeVisualEvents } from './NativeDuelVisualEvents.js';

const SIDES = ['player', 'opponent'];
const frozen = values => Object.freeze(values);
const freezeNested = value => {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const entry of Object.values(value)) freezeNested(entry);
  return Object.freeze(value);
};
export const NATIVE_TCG_DUEL_FLAGS = OcgDuelMode.MODE_MR5
  | OcgDuelMode.TCG_SEGOC_NONPUBLIC | OcgDuelMode.TCG_SEGOC_FIRSTTRIGGER;

function secureShuffleWords() {
  const words = new Uint32Array(128);
  let cursor = words.length;
  return () => {
    if (cursor === words.length) {
      globalThis.crypto.getRandomValues(words);
      cursor = 0;
    }
    return words[cursor++];
  };
}

/** The core expects an initially shuffled Main Deck from its client. Each
 * bounded sample rejects the incomplete Uint32 interval to avoid modulo bias.
 * The optional word source exists for deterministic tests; production uses
 * cryptographic randomness. Subsequent duel shuffles belong entirely to Lua/core.
 */
export function shuffleNativeMainDeck(cards, randomUint32 = secureShuffleWords()) {
  if (!Array.isArray(cards)) throw new TypeError('Main Deck must be an array');
  if (typeof randomUint32 !== 'function') throw new TypeError('Shuffle word source must be a function');
  const result = [...cards];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const range = index + 1;
    const limit = 0x100000000 - (0x100000000 % range);
    let word;
    do {
      word = randomUint32();
      if (!Number.isInteger(word) || word < 0 || word > 0xffffffff) {
        throw new TypeError('Shuffle word source must return a Uint32');
      }
    } while (word >= limit);
    const chosen = word % range;
    [result[index], result[chosen]] = [result[chosen], result[index]];
  }
  return result;
}
const slotKey = card => `${card.controller}:${card.location}:${card.sequence}:${card.overlay_sequence ?? '-'}`;
const lookup = (map, code) => map?.get?.(Number(code)) ?? map?.get?.(String(code));
const titleCase = value => String(value ?? '').split('_').map(word => (
  word ? word[0].toUpperCase() + word.slice(1) : ''
)).join('-');
const COMPOUND_RACE_NAMES = Object.freeze({
  WINGEDBEAST: 'Winged Beast', BEASTWARRIOR: 'Beast-Warrior', SEASERPENT: 'Sea Serpent',
  DIVINE: 'Divine-Beast', CREATORGOD: 'Creator-God', MAGICALKNIGHT: 'Magical Knight',
  HIGHDRAGON: 'High Dragon', OMEGAPSYCHIC: 'Omega Psychic', CELESTIALWARRIOR: 'Celestial Warrior'
});

/** CardState-compatible presentation. Every dynamic value comes from a query. */
class NativeCardProjection extends CardState {
  getAtk() { return this.currentAtk; }
  getDef() { return this.isLinkMonster ? null : this.currentDef; }
  getLevel() { return this.currentLevel; }
  getRank() { return this.rank; }
  getName(locale = 'en') { return locale === 'en' ? this.name_en || this.name : this.name; }
}

/**
 * UI façade for the authoritative WASM/Lua duel. It never invokes the JavaScript
 * effect, summon, battle, phase or continuous-rule engines. Cards and zones are
 * immutable render projections; commands answer an action offered by the core.
 */
export class NativeDuelGame {
  constructor(callbacks = {}, options = {}) {
    this.options = { ...callbacks.options, ...options };
    this.callbacks = {
      onStateChange() {}, onLog() {}, onAnimation() {}, onGameOver() {},
      onDecision() {}, ...callbacks
    };
    this.engine = 'ocgcore-wasm';
    this.rulesMode = this.options.rulesMode || 'strict';
    this.aiDifficulty = this.options.aiDifficulty || 'normal';
    this.match = options.match || new MatchEngine(options.matchOptions);
    this.runtime = null;
    this._duelGeneration = 0;
    this._pumpPromise = null;
    this.reset();
    // This compatibility reader delegates to the native command list, rather
    // than recreating prohibitions from card names or text.
    this.defense = frozen({ isActionProhibited: (side, action, card) => {
      const available = this.getAvailableActions(side);
      if (action === 'ACTIVATE_EFFECT') return !this._activationCandidates(side)
        .some(candidate => this._matchesCard(candidate, card));
      if (action === 'SPECIAL_SUMMON') return !available.specialSummonCardUids.includes(card?.uid);
      if (action === 'NORMAL_SUMMON') return !available.normalSummonCardUids.includes(card?.uid);
      return true;
    } });
  }

  reset() {
    this.runtime?.close();
    this.runtime = null;
    this._duelGeneration += 1;
    this._pumpPromise = null;
    this._metadata = new Map();
    this._slotIds = new Map();
    this._nextCardId = 0;
    this._annotations = new Map();
    this._fieldActivations = new Map();
    this._fieldActivationSequence = 0;
    this._statusFlags = new Map();
    this._chainRecords = new Map();
    this._intent = null;
    this._summonProcedure = null;
    this._prompt = null;
    this._promptSerial = 0;
    this.pendingNativeDecision = null;
    this._aiActionCount = 0;
    this._duelEnded = false;
    this._gameOverNotified = false;
    this.nativeError = null;
    this.winner = null;
    this.endReason = null;
    this.currentTurn = 'player';
    this.currentPhase = 'draw';
    this.turnCount = 0;
    this.startingPlayerId = 'player';
    this.playerController = 0;
    this.playerLP = this.opponentLP = 8000;
    this.isResolvingAction = false;
    this.isResolvingEffect = false;
    this.pendingSummon = this.pendingExtraSummon = null;
    this.isDiscarding = false;
    this.normalSummonedThisTurn = false;
    this.attackedMonsters = new Set();
    for (const side of SIDES) {
      this[`${side}Deck`] = frozen([]);
      this[`${side}Hand`] = frozen([]);
      this[`${side}ExtraDeck`] = frozen([]);
    }
    this.field = this._freezeField(new FieldState());
    this.chain = frozen({ chainStatus: 'idle', links: frozen([]) });
  }

  setRulesMode(mode) {
    if (!['strict', 'native', 'sandbox'].includes(mode) || this.runtime?.started) return false;
    this.rulesMode = mode;
    return true;
  }
  setAIDifficulty(level) {
    if (!['easy', 'normal', 'hard'].includes(level)) return false;
    this.aiDifficulty = level;
    return true;
  }
  sideForPlayer(controller) { return controller === this.playerController ? 'player' : 'opponent'; }
  controllerForSide(side) { return side === 'player' ? this.playerController : 1 - this.playerController; }
  isDuelGenerationCurrent(generation) { return generation === this._duelGeneration && !this._duelEnded; }
  log(message, type = 'system') { this.callbacks.onLog(message, type); }
  stateChanged() { this.callbacks.onStateChange(this); }
  get playerMonsters() { return this.field.playerMonsterZones; }
  get opponentMonsters() { return this.field.opponentMonsterZones; }
  get playerSpells() { return this.field.playerSpellZones; }
  get opponentSpells() { return this.field.opponentSpellZones; }
  get playerGraveyard() { return this.field.playerGraveyard; }
  get opponentGraveyard() { return this.field.opponentGraveyard; }
  get playerBanished() { return this.field.playerBanished; }
  get opponentBanished() { return this.field.opponentBanished; }
  get playerFaceUpExtraDeck() { return this.field.playerFaceUpExtraDeck; }
  get opponentFaceUpExtraDeck() { return this.field.opponentFaceUpExtraDeck; }
  get extraMonsterZones() { return this.field.extraMonsterZones; }
  get playerFieldSpell() { return this.field.playerFieldSpellZone; }
  get opponentFieldSpell() { return this.field.opponentFieldSpellZone; }

  validateDeckForCurrentMode(mainDeck, extraDeck = []) {
    if (this.options.validateDeck) return this.options.validateDeck({ mainDeck, extraDeck }, this.rulesMode);
    if (this.rulesMode === 'sandbox') return { valid: mainDeck.length > 0, issues: [] };
    if (this.rulesMode === 'native') {
      const resources = this.resources || this.options.nativeResources || this.options.resources;
      if (!resources) return { valid: false, issues: [{ code: 'NATIVE_RESOURCES_NOT_LOADED',
        message: 'Chargez les données du moteur natif avant de valider le Deck.' }] };
      return validateCustomDeck({ mainDeck, extraDeck, sideDeck: [] }, 'native', {
        native: true, format: 'TCG',
        isSupportedCard: (card, section) => isSupportedNativeCatalogueCard(resources, card, section),
        getCopyIdentity: card => getNativeCardCopyIdentity(resources, card)
      });
    }
    return validateCustomDeck({ mainDeck, extraDeck, sideDeck: [] }, 'strict', { native: true, format: 'TCG' });
  }

  async initDecks(playerDeck, opponentDeck, playerExtra = [], opponentExtra = [], duelOptions = {}) {
    this.reset();
    const generation = this._duelGeneration;
    this.isResolvingAction = true;
    const mainDecks = [playerDeck, opponentDeck];
    const extras = [playerExtra, opponentExtra];
    if (mainDecks.some(deck => !Array.isArray(deck) || deck.length === 0)) {
      this.isResolvingAction = false;
      return this._invalidDeck(['Le Main Deck ne peut pas être vide.']);
    }
    try {
      const resources = this.options.nativeResources || this.options.resources
        || await (await import('./NativeCardData.js')).loadNativeCardResources();
      if (!this.isDuelGenerationCurrent(generation)) return false;
      this.resources = resources;
      const issues = [];
      for (let index = 0; index < 2; index += 1) {
        const validation = this.validateDeckForCurrentMode(mainDecks[index], extras[index] || []);
        issues.push(...validation.issues.map(issue => `${SIDES[index]} : ${issue.message || validation.message || issue.code}`));
      }
      if (issues.length) {
        this.isResolvingAction = false;
        return this._invalidDeck(issues);
      }
      this.startingPlayerId = duelOptions.startingPlayer === 'opponent' ? 'opponent' : 'player';
      this.playerController = this.startingPlayerId === 'opponent' ? 1 : 0;
      this.currentTurn = this.startingPlayerId;
      for (const deck of [...mainDecks, ...extras]) {
        for (const card of deck || []) this._metadata.set(Number(card.id ?? card.code), card);
      }
      const teams = duelOptions.teams || this.options.teams || [];
      const runtime = await (this.options.createRuntime || createNativeDuelRuntime)({
        ...this.options.runtimeOptions, cards: resources.cards, scripts: resources.scripts,
        canonicalCodeToSource: resources.canonicalCodeToSource,
        sourceCodeToCanonical: resources.sourceCodeToCanonical,
        flags: duelOptions.flags ?? this.options.flags ?? NATIVE_TCG_DUEL_FLAGS,
        seed: duelOptions.seed ?? this.options.seed,
        team1: teams[0] || this.options.team1,
        team2: teams[1] || this.options.team2
      });
      if (!this.isDuelGenerationCurrent(generation)) { runtime.close(); return false; }
      this.runtime = runtime;
      const { OcgLocation: L, OcgPosition: P } = runtime.constants;
      const injections = [];
      const initialShuffleRandomUint32 = this.options.initialShuffleRandomUint32 || secureShuffleWords();
      for (let index = 0; index < 2; index += 1) {
        const controller = this.controllerForSide(SIDES[index]);
        const shuffledMainDeck = shuffleNativeMainDeck(mainDecks[index], initialShuffleRandomUint32);
        for (const [deck, location] of [[shuffledMainDeck, L.DECK], [extras[index] || [], L.EXTRA]]) {
          for (const card of deck) injections.push({
            code: Number(card.id ?? card.code), controller, team: controller,
            location, sequence: 0, position: P.FACEDOWN_DEFENSE
          });
        }
      }
      await runtime.addCards(injections);
      if (generation !== this._duelGeneration || runtime.closed) return false;
      this.playerLP = Number(teams[this.playerController]?.startingLP ?? 8000);
      this.opponentLP = Number(teams[1 - this.playerController]?.startingLP ?? 8000);
      this._visualContext = createNativeVisualContext({
        playerController: this.playerController,
        lifePoints: this.playerController === 0 ? [this.playerLP, this.opponentLP] : [this.opponentLP, this.playerLP],
        getCardMetadata: code => this._getMetadata(code),
        getCardAt: reference => this._resolveCard(reference),
        getPublicSummonType: reference => this._annotations.get(slotKey(reference))?.summonType,
        queryCard: reference => runtime.queryCard({ ...reference,
          location: reference.overlay_sequence == null ? reference.location : reference.location | L.OVERLAY,
          overlaySequence: reference.overlaySequence ?? reference.overlay_sequence ?? 0, flags: this._queryFlags() }),
        getLifePoints: controller => this[`${this.sideForPlayer(controller)}LP`]
      });
      this.isResolvingAction = false;
      this._synchronize();
      return true;
    } catch (error) {
      if (generation === this._duelGeneration) this._fail(error);
      return false;
    }
  }

  async startDuel(...args) { return await this.initDecks(...args) && await this.start(); }
  async start() {
    if (!this.runtime || this.runtime.started || this._duelEnded) return false;
    try {
      await this.runtime.start();
      this.log('Le duel commence !', 'duel-start');
      return await this._pump();
    } catch (error) { this._fail(error); return false; }
  }

  _invalidDeck(issues) {
    this.log(`Deck refusé : ${issues.join(' | ')}`, 'danger');
    this.callbacks.onAnimation({ type: 'deck-invalid', issues });
    this.stateChanged();
    return false;
  }
  _fail(error) {
    this.nativeError = error;
    this.isResolvingAction = this.isResolvingEffect = false;
    this.log(`Le moteur natif est arrêté : ${error.message}`, 'danger');
    this.stateChanged();
  }
  _canonicalCode(code) { return lookup(this.resources?.sourceCodeToCanonical, code) ?? Number(code); }
  _getMetadata(code) {
    const canonical = this._canonicalCode(code);
    const database = lookup(this.resources?.metadata, canonical) || lookup(this.resources?.metadata, code) || {};
    const data = lookup(this.resources?.cards, code) || {};
    const template = createNativeCardPresentationTemplate(this.resources, canonical) || {};
    return { ...template, ...database, card_type: data.type & 2 ? 'spell' : data.type & 4 ? 'trap' : 'monster',
      type: this.runtime ? this._printedType(data.type || 0) : '',
      race: this.runtime ? this._constantName('OcgRace', data.race) : '',
      ...this._metadata.get(canonical), id: canonical };
  }
  _queryFlags() {
    return Object.values(this.runtime.constants.OcgQueryFlags).reduce((mask, flag) => mask | flag, 0);
  }
  _statusFlag(name) {
    if (this._statusFlags.has(name)) return this._statusFlags.get(name);
    const script = this.resources?.scripts?.get('constant.lua') || '';
    const value = script.match(new RegExp(`\\bSTATUS_${name}\\s*=\\s*(0x[\\da-fA-F]+|\\d+)`))?.[1];
    const mask = value ? Number(value) : 0;
    this._statusFlags.set(name, mask);
    return mask;
  }
  _constantName(group, value) {
    if (value == null) return '';
    const numeric = typeof value === 'bigint' ? value : Number(value);
    const entry = Object.entries(this.runtime.constants[group] || {}).find(([, code]) => code === numeric);
    if (!entry) return '';
    return group === 'OcgRace' ? COMPOUND_RACE_NAMES[entry[0]] || titleCase(entry[0].toLowerCase())
      : titleCase(entry[0].toLowerCase());
  }
  _printedType(type) {
    const T = this.runtime.constants.OcgType;
    if (type & T.SPELL) return 'Spell Card';
    if (type & T.TRAP) return 'Trap Card';
    return ['FUSION', 'RITUAL', 'SYNCHRO', 'XYZ', 'PENDULUM', 'LINK', 'TUNER', 'TOKEN', 'EFFECT', 'NORMAL']
      .filter(name => type & T[name]).map(name => titleCase(name.toLowerCase())).join(' ') + ' Monster';
  }

  _projectCard(query, controller, location, sequence) {
    if (!query || !query.code) return null;
    const { OcgType: T, OcgLocation: L, OcgPosition: P } = this.runtime.constants;
    const id = this._canonicalCode(query.code);
    const data = lookup(this.resources?.cards, id) || lookup(this.resources?.cards, query.code) || {};
    const metadata = this._getMetadata(query.code);
    const type = Number(query.type ?? data.type ?? 0);
    const cardType = type & T.SPELL ? 'spell' : type & T.TRAP ? 'trap' : 'monster';
    const position = query.position ?? P.FACEDOWN_DEFENSE;
    const faceDown = Boolean(position & (P.FACEDOWN_ATTACK | P.FACEDOWN_DEFENSE));
    const nativeRef = frozen({ controller, location, sequence, code: Number(query.code) });
    const key = slotKey(nativeRef);
    let identity = this._slotIds.get(key);
    if (!identity || identity.code !== Number(query.code)) {
      identity = { code: Number(query.code), uid: `native_${this._duelGeneration}_${++this._nextCardId}` };
      this._slotIds.set(key, identity);
    }
    const card = new NativeCardProjection({
      ...metadata, uid: identity.uid, id,
      name: metadata.name || `Carte ${id}`, name_en: metadata.name_en || metadata.name || `Card ${id}`,
      desc: metadata.description || metadata.desc || '', card_type: cardType,
      type: this._printedType(type), atk: data.attack, def: data.defense,
      level: data.level, race: cardType === 'spell' && (type & T.FIELD) ? 'Field' : metadata.race,
      isFieldSpell: Boolean(type & T.FIELD), isPendulumMonster: Boolean(type & T.PENDULUM)
    });
    const fieldSpell = location === L.SZONE && sequence === 5;
    const extraMonster = location === L.MZONE && sequence >= 5;
    const scale = location === L.SZONE && Boolean(type & T.PENDULUM) && [0, 4, 6, 7].includes(sequence);
    const locations = { [L.DECK]: 'deck', [L.HAND]: 'hand', [L.MZONE]: 'monster_zone',
      [L.SZONE]: 'spell_zone', [L.GRAVE]: 'graveyard', [L.REMOVED]: 'banished', [L.EXTRA]: 'extra_deck' };
    card.nativeRef = nativeRef;
    card.nativeCode = Number(query.code);
    card.nativeType = type;
    card.nativeStatus = Number(query.status ?? 0);
    card.nativePosition = position;
    card.location = fieldSpell ? 'field_zone' : extraMonster ? 'extra_monster_zone' : locations[location];
    card.zoneIndex = fieldSpell ? 0 : extraMonster ? this._sharedExtraIndex(controller, sequence) : sequence;
    card.controllerId = this.sideForPlayer(controller);
    card.ownerId = this.sideForPlayer(query.owner ?? controller);
    card.runtimeInstanceId = `${identity.uid}:${key}`;
    card.position = position & (P.FACEUP_DEFENSE | P.FACEDOWN_DEFENSE) ? 'defense' : 'attack';
    card.isSetFaceDown = faceDown;
    card.currentAtk = Number(query.attack ?? data.attack ?? 0);
    card.currentDef = Number(query.defense ?? data.defense ?? 0);
    card.baseAtk = Number(query.baseAttack ?? data.attack ?? 0);
    card.baseDef = Number(query.baseDefense ?? data.defense ?? 0);
    card.currentLevel = Number(query.level ?? (type & (T.XYZ | T.LINK) ? 0 : data.level) ?? 0);
    card.rank = Number(query.rank ?? 0);
    card.linkRating = query.link?.rating ?? (type & T.LINK ? data.level : null);
    card.isLinkMonster = Boolean(type & T.LINK);
    card.extra_type = ['FUSION', 'SYNCHRO', 'XYZ', 'LINK'].find(name => type & T[name])?.toLowerCase() || null;
    card.belongsInExtraDeck = Boolean(card.extra_type);
    card.isTuner = Boolean(type & T.TUNER);
    card.isRitualMonster = Boolean(type & T.RITUAL) && cardType === 'monster';
    card.isRitualSpell = Boolean(type & T.RITUAL) && cardType === 'spell';
    card.isPendulumMonster = Boolean(type & T.PENDULUM);
    card.isEffectMonster = Boolean(type & T.EFFECT);
    card.isToken = Boolean(type & T.TOKEN);
    card.currentRace = this._constantName('OcgRace', query.race ?? data.race);
    card.currentAttribute = this._constantName('OcgAttribute', query.attribute ?? data.attribute).toUpperCase();
    if (cardType === 'monster') card.race = card.currentRace;
    card.attribute = card.currentAttribute;
    card.pendulumScale = Number(query.leftScale ?? data.lscale ?? 0);
    card.leftScale = Number(query.leftScale ?? data.lscale ?? 0);
    card.rightScale = Number(query.rightScale ?? data.rscale ?? 0);
    card.isPendulumScale = scale;
    card.isFaceUpInExtraDeck = location === L.EXTRA && !faceDown;
    card.linkArrows = frozen(Object.entries(this.runtime.constants.OcgLinkMarker || {})
      .filter(([, marker]) => (query.link?.marker ?? data.link_marker ?? 0) & marker)
      .map(([name]) => name.toLowerCase().replaceAll('_', '-')));
    card.xyzMaterials = frozen((query.overlayCards || []).map((code, index) => frozen({
      ...this._getMetadata(code), id: this._canonicalCode(code),
      uid: `${identity.uid}:material:${index}`, nativeCode: code, location: 'overlay'
    })));
    card.counters = frozen({ ...(query.counters || {}) });
    card.effectNegated = Boolean(card.nativeStatus & this._statusFlag('DISABLED'));
    card.wasProperlySpecialSummoned = Boolean(card.nativeStatus & this._statusFlag('PROC_COMPLETE'));
    card.nativeQuery = freezeNested({ ...query, counters: card.counters, overlayCards: frozen([...(query.overlayCards || [])]) });
    Object.assign(card, this._annotations.get(key) || {});
    const activation = this._fieldActivations.get(key);
    card.fieldActivationState = fieldSpell ? faceDown ? 'set' : activation?.state || null : null;
    card.fieldActivationSequence = activation?.sequence || 0;
    card.fieldActivationRuntimeInstanceId = card.fieldActivationState ? card.runtimeInstanceId : null;
    card.resolvedSuccessfully = activation?.state === 'resolved';
    card.activeModifiers = frozen([]);
    card.effectUsage = frozen({});
    return freezeNested(card);
  }

  _sharedExtraIndex(controller, sequence) {
    return controller === this.playerController ? sequence - 5 : 6 - sequence;
  }
  _freezeField(field) {
    for (const key of Object.keys(field)) if (Array.isArray(field[key])) field[key] = frozen(field[key]);
    field.monsterFieldRevision = frozen({ ...field.monsterFieldRevision });
    return frozen(field);
  }
  _synchronize() {
    if (!this.runtime || this.runtime.closed) return;
    const { OcgLocation: L } = this.runtime.constants;
    const nativeField = this.runtime.queryField();
    const field = new FieldState();
    const cardsByRef = new Map();
    for (const side of SIDES) {
      const controller = this.controllerForSide(side);
      const zones = {};
      for (const location of [L.DECK, L.HAND, L.MZONE, L.SZONE, L.GRAVE, L.REMOVED, L.EXTRA]) {
        zones[location] = this.runtime.queryLocation({ controller, location, flags: this._queryFlags() })
          .map((query, sequence) => {
            const card = this._projectCard(query, controller, location, sequence);
            if (card) cardsByRef.set(slotKey(card.nativeRef), card);
            return card;
          });
      }
      this[`${side}Deck`] = frozen(zones[L.DECK].filter(Boolean));
      this[`${side}Hand`] = frozen(zones[L.HAND].filter(Boolean));
      this[`${side}ExtraDeck`] = frozen(zones[L.EXTRA].filter(card => card && !card.isFaceUpInExtraDeck));
      field[`${side}FaceUpExtraDeck`] = zones[L.EXTRA].filter(card => card?.isFaceUpInExtraDeck);
      field[`${side}MonsterZones`] = Array.from({ length: 5 }, (_, index) => zones[L.MZONE][index] || null);
      field[`${side}SpellZones`] = Array.from({ length: 5 }, (_, index) => zones[L.SZONE][index] || null);
      field[`${side}FieldSpellZone`] = zones[L.SZONE][5] || null;
      field[`${side}Graveyard`] = zones[L.GRAVE].filter(Boolean);
      field[`${side}Banished`] = zones[L.REMOVED].filter(Boolean);
      for (const sequence of [5, 6]) {
        const card = zones[L.MZONE][sequence];
        if (card) field.extraMonsterZones[this._sharedExtraIndex(controller, sequence)] = frozen({ card, controllerId: side });
      }
      const lp = nativeField.players?.[controller]?.lp;
      if (Number.isFinite(lp)) this[`${side}LP`] = lp;
    }
    this._cardsByRef = cardsByRef;
    this.field = this._freezeField(field);
    const links = frozen((nativeField.chain || []).map(link => frozen({ ...link })));
    this.chain = frozen({ links, chainStatus: links.length ? 'resolving' : 'idle' });
  }

  _resolveCard(reference) {
    if (!reference) return null;
    if (reference.overlay_sequence != null) {
      const host = this._cardsByRef?.get(slotKey({ ...reference, overlay_sequence: undefined }));
      return host?.xyzMaterials?.[reference.overlay_sequence] || null;
    }
    return this._cardsByRef?.get(slotKey(reference)) || null;
  }

  _isPublicCard(reference) {
    const { OcgLocation: L, OcgPosition: P } = this.runtime.constants;
    if (!reference || reference.code === 0 || ![L.MZONE, L.SZONE, L.EXTRA, L.REMOVED].includes(reference.location)) return false;
    const card = this._resolveCard(reference);
    return Boolean(card && (card.nativePosition & (P.FACEUP_ATTACK | P.FACEUP_DEFENSE))
      && !(card.nativePosition & (P.FACEDOWN_ATTACK | P.FACEDOWN_DEFENSE)));
  }
  _matchesCard(reference, card) {
    return Boolean(card?.nativeRef && slotKey(reference) === slotKey(card.nativeRef));
  }
  _processMessages(messages) {
    const { OcgMessageType: M, OcgPhase: P, OcgLocation: L } = this.runtime.constants;
    for (const message of messages) {
      if (message.type === M.NEW_TURN) {
        this.currentTurn = this.sideForPlayer(message.player);
        this.turnCount += 1;
        this.normalSummonedThisTurn = false;
        this._aiActionCount = 0;
        this.attackedMonsters.clear();
        for (const annotation of this._annotations.values()) {
          annotation.hasAttacked = false;
          annotation.hasChangedPositionThisTurn = false;
          annotation.attacksDeclaredThisTurn = 0;
        }
      } else if (message.type === M.NEW_PHASE) {
        const phaseNames = { [P.DRAW]: 'draw', [P.STANDBY]: 'standby', [P.MAIN1]: 'main1',
          [P.MAIN2]: 'main2', [P.END]: 'end' };
        this.currentPhase = phaseNames[message.phase] || 'battle';
      } else if (message.type === M.MOVE) {
        const from = slotKey(message.from), to = slotKey(message.to);
        const identity = this._slotIds.get(from);
        this._slotIds.delete(from);
        this._annotations.delete(from);
        this._fieldActivations.delete(from);
        if (identity) this._slotIds.set(to, identity);
        if (message.to.location === L.SZONE && message.to.sequence === 5
          && (message.to.position & 5)) {
          this._fieldActivations.set(to, { state: 'resolved', source: 'move',
            sequence: ++this._fieldActivationSequence });
        }
      } else if ([M.SUMMONING, M.SPSUMMONING, M.FLIPSUMMONING].includes(message.type)) {
        this._annotations.set(slotKey(message), {
          turnSummoned: this.turnCount,
          summonType: message.type === M.SUMMONING ? 'normal' : message.type === M.FLIPSUMMONING ? 'flip'
            : this._summonProcedure === 'pendulum' ? 'pendulum' : 'special'
        });
        if (message.type === M.SUMMONING) this.normalSummonedThisTurn = true;
      } else if (message.type === M.SPSUMMONED) {
        this._summonProcedure = null;
      } else if (message.type === M.POS_CHANGE) {
        this._annotations.set(slotKey(message), { ...this._annotations.get(slotKey(message)), hasChangedPositionThisTurn: true });
      } else if (message.type === M.ATTACK) {
        const key = slotKey(message.card);
        const annotation = this._annotations.get(key) || {};
        this._annotations.set(key, { ...annotation, hasAttacked: true,
          attacksDeclaredThisTurn: (annotation.attacksDeclaredThisTurn || 0) + 1 });
      } else if (message.type === M.CHAINING) {
        const record = { ...message, negated: false };
        this._chainRecords.set(message.chain_size, record);
        if (message.location === L.SZONE && message.sequence === 5
          && (this._fieldActivations.get(slotKey(message))?.state !== 'resolved'
            || this._fieldActivations.get(slotKey(message))?.source === 'move')) {
          this._fieldActivations.set(slotKey(message), { state: 'pending', sequence: 0 });
        }
      } else if ([M.CHAIN_NEGATED, M.CHAIN_DISABLED].includes(message.type)) {
        const record = this._chainRecords.get(message.chain_size);
        if (record) record.negated = true;
      } else if (message.type === M.CHAIN_SOLVED) {
        const record = this._chainRecords.get(message.chain_size);
        if (record?.location === L.SZONE && record.sequence === 5) {
          const existing = this._fieldActivations.get(slotKey(record));
          if (existing?.state === 'pending') this._fieldActivations.set(slotKey(record), record.negated
            ? { state: null, sequence: 0 }
            : { state: 'resolved', sequence: ++this._fieldActivationSequence });
        }
      } else if (message.type === M.CHAIN_END) {
        this._chainRecords.clear();
      } else if ([M.DAMAGE, M.RECOVER, M.PAY_LPCOST, M.LPUPDATE].includes(message.type)) {
        const key = `${this.sideForPlayer(message.player)}LP`;
        this[key] = message.type === M.LPUPDATE ? message.lp
          : this[key] + (message.type === M.RECOVER ? message.amount : -message.amount);
      } else if (message.type === M.WIN) {
        this.winner = message.player < 2 ? this.sideForPlayer(message.player) : 'draw';
        this.endReason = ({ 1: 'lp_zero', 2: 'deck_out', 3: 'surrender', 16: 'exodia' })[message.reason] || 'native_effect';
        this.nativeWinReason = message.reason;
        this._duelEnded = true;
      }
    }
  }

  async _pump() {
    if (this._pumpPromise) return this._pumpPromise;
    const generation = this._duelGeneration;
    const runtime = this.runtime;
    const work = this._advanceUntilPlayerCommand(runtime, generation);
    this._pumpPromise = work;
    try { return await work; }
    catch (error) { if (generation === this._duelGeneration) this._fail(error); return false; }
    finally { if (this._pumpPromise === work) this._pumpPromise = null; }
  }
  async _advanceUntilPlayerCommand(runtime, generation) {
    const { OcgMessageType: M, OcgProcessResult: S } = runtime.constants;
    this.isResolvingAction = true;
    while (generation === this._duelGeneration && !runtime.closed && !this._duelEnded) {
      const batch = await runtime.advance();
      if (generation !== this._duelGeneration || runtime.closed || this._duelEnded) return false;
      this._processMessages(batch.messages || []);
      if (batch.prompt && batch.prompt !== this._prompt) this._promptSerial += 1;
      this._prompt = batch.prompt;
      this.pendingNativeDecision = batch.prompt;
      this._synchronize();
      const command = batch.prompt && [M.SELECT_IDLECMD, M.SELECT_BATTLECMD].includes(batch.prompt.type);
      this.isResolvingAction = Boolean(batch.prompt) && !(command && this.sideForPlayer(batch.prompt.player) === 'player');
      this.isResolvingEffect = Boolean(this.chain.links.length);
      this.stateChanged();
      if (generation !== this._duelGeneration || runtime.closed) return false;
      for (const message of batch.messages || []) {
        const translated = translateNativeVisualEvents(message, this._visualContext);
        for (const event of translated.events || []) this.callbacks.onAnimation(event);
        for (const entry of translated.logs || []) this.log(entry.message, entry.type);
      }
      if (this._duelEnded || batch.status === S.END) {
        if (!this._duelEnded) throw new Error('Native duel ended without a WIN message');
        this.isResolvingAction = this.isResolvingEffect = false;
        this.pendingNativeDecision = this._prompt = null;
        this.stateChanged();
        this._notifyGameOver();
        return true;
      }
      if (!batch.prompt) { await Promise.resolve(); continue; }
      const side = this.sideForPlayer(batch.prompt.player);
      if (command && side === 'player') { this._intent = null; this._summonProcedure = null; return true; }
      const preferred = side === 'player' ? this._preferredResponse(batch.prompt) : null;
      const response = preferred || (command ? this._chooseAICommand(batch.prompt) : await resolveNativeDuelPrompt({
        prompt: batch.prompt, runtime, side, metadata: this.resources.metadata,
        resolveCard: reference => this._resolveCard(reference),
        isPublicCard: reference => this._isPublicCard(reference),
        sideForPlayer: player => this.sideForPlayer(player),
        onDecision: request => this.callbacks.onDecision({ ...request, rulesMode: this.rulesMode,
          turn: this.currentTurn, phase: this.currentPhase }),
        generation, isCurrent: () => this.isDuelGenerationCurrent(generation)
      }));
      if (generation !== this._duelGeneration || runtime.closed || this._duelEnded) return false;
      if (!response) {
        this.isResolvingAction = false;
        this.stateChanged();
        return true;
      }
      if (!this._validateResponse(batch.prompt, response)) {
        throw new Error('Decision adapter returned an illegal native response');
      }
      runtime.respond(response);
      this._prompt = this.pendingNativeDecision = null;
      // Yield to paint between AI actions; no timers survive a reset/disposal.
      if (side === 'opponent') await new Promise(resolve => setTimeout(resolve, this.options.aiDelay ?? 20));
    }
    return false;
  }

  _validateResponse(prompt, response) {
    const { OcgMessageType: M, OcgResponseType: R, SelectIdleCMDAction: I, SelectBattleCMDAction: B } = this.runtime.constants;
    if (!response || !prompt) return false;
    if (prompt.type === M.SELECT_IDLECMD) {
      if (response.type !== R.SELECT_IDLECMD) return false;
      const lists = { [I.SELECT_SUMMON]: 'summons', [I.SELECT_SPECIAL_SUMMON]: 'special_summons',
        [I.SELECT_POS_CHANGE]: 'pos_changes', [I.SELECT_MONSTER_SET]: 'monster_sets',
        [I.SELECT_SPELL_SET]: 'spell_sets', [I.SELECT_ACTIVATE]: 'activates' };
      if (lists[response.action]) return Number.isInteger(response.index) && response.index >= 0
        && response.index < (prompt[lists[response.action]]?.length || 0);
      return response.index === null && Boolean(({ [I.TO_BP]: prompt.to_bp,
        [I.TO_EP]: prompt.to_ep, [I.SHUFFLE]: prompt.shuffle })[response.action]);
    }
    if (prompt.type === M.SELECT_BATTLECMD) {
      if (response.type !== R.SELECT_BATTLECMD) return false;
      const list = response.action === B.SELECT_CHAIN ? prompt.chains : response.action === B.SELECT_BATTLE ? prompt.attacks : null;
      if (list) return Number.isInteger(response.index) && response.index >= 0 && response.index < list.length;
      return response.index === null && Boolean(({ [B.TO_M2]: prompt.to_m2, [B.TO_EP]: prompt.to_ep })[response.action]);
    }
    return validateNativeDuelResponse(prompt, response, {
      constants: this.runtime.constants, metadata: this.resources.metadata,
      cardReader: this.runtime.options?.cardReader,
      isCardDeclarable: this.runtime.isCardDeclarable?.bind(this.runtime),
      resolveCard: reference => this._resolveCard(reference),
      isPublicCard: reference => this._isPublicCard(reference)
    });
  }

  _preferredResponse(prompt) {
    const { OcgMessageType: M, OcgResponseType: R, OcgPosition: P } = this.runtime.constants;
    // There is no player choice when the core offers no chainable effect.
    if (prompt.type === M.SELECT_CHAIN && !prompt.forced && prompt.selects.length === 0) {
      return { type: R.SELECT_CHAIN, index: null };
    }
    const intent = this._intent;
    if (!intent) return null;
    let response = null;
    if (prompt.type === M.SELECT_PLACE && prompt.count === 1 && intent.place) {
      response = { type: R.SELECT_PLACE, places: [intent.place] };
    } else if (prompt.type === M.SELECT_POSITION && intent.position) {
      const position = intent.position === 'defense' ? P.FACEUP_DEFENSE : P.FACEUP_ATTACK;
      if (prompt.positions & position) response = { type: R.SELECT_POSITION, position };
    } else if (prompt.type === M.SELECT_CARD && intent.attackTarget) {
      const index = prompt.selects.findIndex(card => slotKey(card) === slotKey(intent.attackTarget));
      if (index >= 0 && prompt.min <= 1 && prompt.max >= 1) response = { type: R.SELECT_CARD, indicies: [index] };
    } else if (prompt.type === M.SELECT_CARD && intent.pendulumCards?.length) {
      const indicies = prompt.selects.map((card, index) => intent.pendulumCards.includes(this._resolveCard(card)?.uid) ? index : -1).filter(index => index >= 0);
      if (indicies.length === intent.pendulumCards.length) response = { type: R.SELECT_CARD, indicies };
    } else if (prompt.type === M.SELECT_UNSELECT_CARD && intent.pendulumCards?.length) {
      const selected = (prompt.unselect_cards || []).map(reference => this._resolveCard(reference)?.uid);
      const unwanted = selected.findIndex(uid => !intent.pendulumCards.includes(uid));
      if (unwanted >= 0) response = { type: R.SELECT_UNSELECT_CARD, index: prompt.select_cards.length + unwanted };
      else if (intent.pendulumCards.every(uid => selected.includes(uid)) && prompt.can_finish) {
        response = { type: R.SELECT_UNSELECT_CARD, index: null };
      } else {
        const index = prompt.select_cards.findIndex(reference => intent.pendulumCards.includes(this._resolveCard(reference)?.uid));
        if (index >= 0) response = { type: R.SELECT_UNSELECT_CARD, index };
      }
    }
    return response && this._validateResponse(prompt, response) ? response : null;
  }

  _chooseAICommand(prompt) {
    const { OcgMessageType: M, OcgResponseType: R, SelectIdleCMDAction: I, SelectBattleCMDAction: B } = this.runtime.constants;
    const pick = (type, action, index = null) => ({ type, action, index });
    const best = list => list.map((card, index) => ({ index, value: this._resolveCard(card)?.currentAtk || 0 }))
      .sort((a, b) => b.value - a.value)[0]?.index ?? 0;
    if (prompt.type === M.SELECT_BATTLECMD) {
      if (prompt.attacks.length) return pick(R.SELECT_BATTLECMD, B.SELECT_BATTLE, best(prompt.attacks));
      if (prompt.to_m2) return pick(R.SELECT_BATTLECMD, B.TO_M2);
      if (prompt.to_ep) return pick(R.SELECT_BATTLECMD, B.TO_EP);
      if (prompt.chains.length) return pick(R.SELECT_BATTLECMD, B.SELECT_CHAIN, 0);
    } else {
      this._aiActionCount += 1;
      if (this._aiActionCount <= 16) {
        if (prompt.summons.length) return pick(R.SELECT_IDLECMD, I.SELECT_SUMMON, best(prompt.summons));
        if (prompt.special_summons.length) {
          const index = best(prompt.special_summons);
          this._summonProcedure = this._resolveCard(prompt.special_summons[index])?.isPendulumScale ? 'pendulum' : null;
          return pick(R.SELECT_IDLECMD, I.SELECT_SPECIAL_SUMMON, index);
        }
        if (prompt.activates.length) return pick(R.SELECT_IDLECMD, I.SELECT_ACTIVATE, 0);
        if (prompt.monster_sets.length) return pick(R.SELECT_IDLECMD, I.SELECT_MONSTER_SET, best(prompt.monster_sets));
        if (prompt.spell_sets.length) return pick(R.SELECT_IDLECMD, I.SELECT_SPELL_SET, 0);
      }
      if (prompt.to_bp) return pick(R.SELECT_IDLECMD, I.TO_BP);
      if (prompt.to_ep) return pick(R.SELECT_IDLECMD, I.TO_EP);
      // When a phase change is unavailable, choose an offered action even after
      // the heuristic budget. The core decides whether it is repeatable.
      if (prompt.pos_changes.length) return pick(R.SELECT_IDLECMD, I.SELECT_POS_CHANGE, 0);
      if (prompt.activates.length) return pick(R.SELECT_IDLECMD, I.SELECT_ACTIVATE, 0);
    }
    throw new Error('Native command prompt offers no executable action');
  }

  _activationCandidates(side) {
    const M = this.runtime?.constants.OcgMessageType;
    const prompt = this._prompt;
    if (!M || !prompt || this.sideForPlayer(prompt.player) !== side) return [];
    return prompt.type === M.SELECT_IDLECMD ? prompt.activates : prompt.type === M.SELECT_BATTLECMD ? prompt.chains : [];
  }
  getAvailableActions(side = 'player') {
    const available = { normalSummonCardUids: [], monsterSetCardUids: [], spellSetCardUids: [],
      spellActivationCardUids: [], specialSummonCardUids: [], positionChangeCardUids: [],
      normalSetCardUids: [], nativeActions: [], monsterEffects: [], fusionExtraUids: [], synchroExtraUids: [], xyzExtraUids: [], linkExtraUids: [],
      attackCardUids: [], canPendulumSummon: false, canBattlePhase: false, canMainPhase2: false, canEndPhase: false };
    const prompt = this._prompt;
    const M = this.runtime?.constants.OcgMessageType;
    if (!prompt || !M || this.nativeError || this._duelEnded || this.isResolvingAction
      || this.sideForPlayer(prompt.player) !== side) return available;
    const uids = references => (references || []).map(card => this._resolveCard(card)?.uid).filter(Boolean);
    if (prompt.type === M.SELECT_IDLECMD) {
      available.normalSummonCardUids = uids(prompt.summons);
      available.monsterSetCardUids = uids(prompt.monster_sets);
      available.normalSetCardUids = available.monsterSetCardUids;
      available.spellSetCardUids = uids(prompt.spell_sets);
      available.specialSummonCardUids = uids(prompt.special_summons);
      available.positionChangeCardUids = uids(prompt.pos_changes);
      available.canBattlePhase = prompt.to_bp;
      available.canEndPhase = prompt.to_ep;
      for (const reference of prompt.special_summons) {
        const card = this._resolveCard(reference);
        if (card?.extra_type) available[`${card.extra_type}ExtraUids`].push(card.uid);
        if (card?.isPendulumScale) available.canPendulumSummon = true;
      }
    } else if (prompt.type === M.SELECT_BATTLECMD) {
      available.attackCardUids = uids(prompt.attacks);
      available.canMainPhase2 = prompt.to_m2;
      available.canEndPhase = prompt.to_ep;
    }
    for (const reference of this._activationCandidates(side)) {
      const card = this._resolveCard(reference);
      if (card?.card_type === 'monster' && ['monster_zone', 'extra_monster_zone'].includes(card.location)) {
        available.monsterEffects.push({ cardUid: card.uid, zoneIndex: card.zoneIndex,
          zoneType: card.location === 'extra_monster_zone' ? 'extra' : 'main', description: reference.description });
      } else if (card) available.spellActivationCardUids.push(card.uid);
    }
    const lists = prompt.type === M.SELECT_IDLECMD
      ? [['summons', 'SELECT_SUMMON'], ['special_summons', 'SELECT_SPECIAL_SUMMON'],
        ['pos_changes', 'SELECT_POS_CHANGE'], ['monster_sets', 'SELECT_MONSTER_SET'],
        ['spell_sets', 'SELECT_SPELL_SET'], ['activates', 'SELECT_ACTIVATE']]
      : [['attacks', 'SELECT_BATTLE'], ['chains', 'SELECT_ACTIVATE']];
    const labels = { SELECT_SUMMON: 'Invoquer', SELECT_SPECIAL_SUMMON: 'Invoquer spécialement',
      SELECT_POS_CHANGE: 'Changer la position', SELECT_MONSTER_SET: 'Poser', SELECT_SPELL_SET: 'Poser',
      SELECT_ACTIVATE: 'Activer', SELECT_BATTLE: 'Attaquer avec' };
    for (const [list, kind] of lists) {
      for (const [index, reference] of (prompt[list] || []).entries()) {
        const card = this._resolveCard(reference);
        const description = reference.description;
        let effectLabel = '';
        if (description != null) {
          const effectCode = Number(BigInt(description) >> 4n);
          effectLabel = this._getMetadata(effectCode).strings?.[Number(BigInt(description) & 15n)] || '';
        }
        available.nativeActions.push(frozen({ id: `${this._duelGeneration}:${this._promptSerial}:${prompt.type}:${list}:${index}`,
          kind, cardUid: card?.uid, card, description,
          label: `${labels[kind]} ${card?.name || 'une carte'}${effectLabel ? ` : ${effectLabel}` : ''}`,
          nativeRef: frozen({ ...reference }), index, list }));
      }
    }
    return available;
  }
  canActivateSpell(card, side = 'player') {
    return !this.isResolvingAction && this._activationCandidates(side).some(reference => this._matchesCard(reference, card));
  }
  canActivatePendulumScale(card, side = 'player') { return Boolean(card?.isPendulumMonster && this.canActivateSpell(card, side)); }
  canSetSpell(card, side = 'player') { return this.getAvailableActions(side).spellSetCardUids.includes(card?.uid); }
  async activateNativeAction(id, side = 'player') {
    const action = this.getAvailableActions(side).nativeActions.find(candidate => candidate.id === id);
    if (!action || !this._prompt) return false;
    const { OcgMessageType: M, OcgResponseType: R, SelectIdleCMDAction: I, SelectBattleCMDAction: B } = this.runtime.constants;
    const idle = this._prompt.type === M.SELECT_IDLECMD;
    const response = { type: idle ? R.SELECT_IDLECMD : R.SELECT_BATTLECMD,
      action: idle ? I[action.kind] : action.kind === 'SELECT_ACTIVATE' ? B.SELECT_CHAIN : B[action.kind],
      index: action.index };
    if (!this._validateResponse(this._prompt, response)) return false;
    this._summonProcedure = action.kind === 'SELECT_SPECIAL_SUMMON' && action.card?.isPendulumScale ? 'pendulum' : null;
    this.runtime.respond(response);
    this._prompt = this.pendingNativeDecision = null;
    return await this._pump();
  }
  getPendulumOptions(side = 'player') {
    return { valid: this.getAvailableActions(side).canPendulumSummon,
      fromHand: [], fromExtraDeck: [], nativeSelectionRequired: true };
  }
  getPendulumScales(side = 'player') {
    const scales = this.getSideState(side).spells.filter(card => card?.isPendulumScale);
    return { left: scales[0] || null, right: scales.at(-1) || null };
  }

  async _submitCommand(kind, listName, card, side = 'player', intent = null) {
    if (!this.runtime || this._duelEnded || this.nativeError || this.isResolvingAction || !card) return false;
    const prompt = this._prompt;
    const { OcgMessageType: M, OcgResponseType: R, SelectIdleCMDAction: I, SelectBattleCMDAction: B } = this.runtime.constants;
    if (!prompt || this.sideForPlayer(prompt.player) !== side) return false;
    const idle = prompt.type === M.SELECT_IDLECMD;
    const battle = prompt.type === M.SELECT_BATTLECMD;
    if (!idle && !battle) return false;
    const candidates = idle ? prompt[listName] : listName === 'activates' ? prompt.chains : listName === 'attacks' ? prompt.attacks : [];
    const indices = (candidates || []).map((candidate, index) => this._matchesCard(candidate, card) ? index : -1).filter(index => index >= 0);
    if (!indices.length) return false;
    let index = indices[0];
    if (indices.length > 1) {
      this.isResolvingAction = true;
      const generation = this._duelGeneration;
      const choice = await this.callbacks.onDecision({ type: 'native-action-effect', side,
        title: card.name, description: 'Choisissez l’effet à activer.',
        choices: indices.map(value => ({ value, label: String(candidates[value].description ?? `Effet ${value + 1}`) })) });
      if (!this.isDuelGenerationCurrent(generation) || prompt !== this._prompt) return false;
      this.isResolvingAction = false;
      index = indices.includes(Number(choice)) ? Number(choice) : choice === undefined ? indices[0] : -1;
      if (index < 0) return false;
    }
    const response = { type: idle ? R.SELECT_IDLECMD : R.SELECT_BATTLECMD,
      action: idle ? I[kind] : kind === 'SELECT_ACTIVATE' ? B.SELECT_CHAIN : B[kind], index };
    if (!this._validateResponse(prompt, response)) return false;
    this._intent = intent;
    this._summonProcedure = kind === 'SELECT_SPECIAL_SUMMON' && card.isPendulumScale ? 'pendulum' : null;
    this.runtime.respond(response);
    this._prompt = this.pendingNativeDecision = null;
    return await this._pump();
  }
  _handCard(uid, side = 'player') { return this.getSideState(side).hand.find(card => card.uid === uid); }
  _placement(side, location, sequence) { return { player: this.controllerForSide(side), location, sequence }; }
  async summonMonster(uid, zoneIndex) {
    return this._submitCommand('SELECT_SUMMON', 'summons', this._handCard(uid), 'player', {
      place: this._placement('player', this.runtime.constants.OcgLocation.MZONE, Number(zoneIndex)) });
  }
  async setMonsterFaceDown(uid, zoneIndex) {
    return this._submitCommand('SELECT_MONSTER_SET', 'monster_sets', this._handCard(uid), 'player', {
      place: this._placement('player', this.runtime.constants.OcgLocation.MZONE, Number(zoneIndex)) });
  }
  async playSpellTrap(uid, zoneIndex) {
    return this._submitCommand('SELECT_ACTIVATE', 'activates', this._handCard(uid), 'player', {
      place: this._placement('player', this.runtime.constants.OcgLocation.SZONE, Number(zoneIndex)) });
  }
  async setSpellTrapFaceDown(uid, zoneIndex) {
    return this._submitCommand('SELECT_SPELL_SET', 'spell_sets', this._handCard(uid), 'player', {
      place: this._placement('player', this.runtime.constants.OcgLocation.SZONE, Number(zoneIndex)) });
  }
  async activateFieldSpellFromHand(uid, side = 'player') {
    return this._submitCommand('SELECT_ACTIVATE', 'activates', this._handCard(uid, side), side, {
      place: this._placement(side, this.runtime.constants.OcgLocation.SZONE, 5) });
  }
  async setFieldSpellFaceDownFromHand(uid, side = 'player') {
    return this._submitCommand('SELECT_SPELL_SET', 'spell_sets', this._handCard(uid, side), side, {
      place: this._placement(side, this.runtime.constants.OcgLocation.SZONE, 5) });
  }
  async activateSetFieldSpell(side = 'player') {
    return this._submitCommand('SELECT_ACTIVATE', 'activates', this[`${side}FieldSpell`], side);
  }
  async activateSetSpellTrap(zoneIndex, side = 'player') {
    return this._submitCommand('SELECT_ACTIVATE', 'activates', this.getSideState(side).spells[zoneIndex], side);
  }
  async activatePendulumScale(uid, zoneIndex, side = 'player') {
    return this._submitCommand('SELECT_ACTIVATE', 'activates', this._handCard(uid, side), side, {
      place: this._placement(side, this.runtime.constants.OcgLocation.SZONE, Number(zoneIndex)) });
  }
  async activateMonsterEffect(reference, side = 'player') {
    return this._submitCommand('SELECT_ACTIVATE', 'activates', this.getMonsterEntry(side, reference)?.card, side);
  }
  async toggleMonsterPosition(reference, side = 'player') {
    return this._submitCommand('SELECT_POS_CHANGE', 'pos_changes', this.getMonsterEntry(side, reference)?.card, side);
  }
  async summonExtraDeck(uid, side = 'player') {
    const card = [...this.getSideState(side).extraDeck, ...this.getSideState(side).faceUpExtraDeck].find(card => card.uid === uid);
    return this._submitCommand('SELECT_SPECIAL_SUMMON', 'special_summons', card, side);
  }
  async performPendulumSummon(side = 'player', requestedUids = null) {
    const reference = this._prompt?.special_summons?.find(reference => this._resolveCard(reference)?.isPendulumScale);
    return this._submitCommand('SELECT_SPECIAL_SUMMON', 'special_summons', this._resolveCard(reference), side,
      { pendulumCards: requestedUids });
  }
  async executeAttack(attackerReference, defenderReference = null) {
    const attacker = this.getMonsterEntry('player', attackerReference)?.card;
    const defender = defenderReference == null ? null : this.getMonsterEntry('opponent', defenderReference)?.card;
    if (defenderReference != null && !defender) return false;
    return this._submitCommand('SELECT_BATTLE', 'attacks', attacker, 'player', { attackTarget: defender?.nativeRef });
  }
  async changePhase(phase) {
    if (!this.runtime || this.isResolvingAction || this._duelEnded || this.nativeError) return false;
    const prompt = this._prompt;
    if (!prompt || this.sideForPlayer(prompt.player) !== 'player') return false;
    const { OcgMessageType: M, OcgResponseType: R, SelectIdleCMDAction: I, SelectBattleCMDAction: B } = this.runtime.constants;
    let response = null;
    if (prompt.type === M.SELECT_IDLECMD && phase === 'battle' && prompt.to_bp) response = { type: R.SELECT_IDLECMD, action: I.TO_BP, index: null };
    if (prompt.type === M.SELECT_IDLECMD && phase === 'end' && prompt.to_ep) response = { type: R.SELECT_IDLECMD, action: I.TO_EP, index: null };
    if (prompt.type === M.SELECT_BATTLECMD && phase === 'main2' && prompt.to_m2) response = { type: R.SELECT_BATTLECMD, action: B.TO_M2, index: null };
    if (prompt.type === M.SELECT_BATTLECMD && phase === 'end' && prompt.to_ep) response = { type: R.SELECT_BATTLECMD, action: B.TO_EP, index: null };
    if (!response) return false;
    this.runtime.respond(response);
    this._prompt = this.pendingNativeDecision = null;
    return await this._pump();
  }
  async respondNative(response) {
    if (!this.runtime || this.isResolvingAction || !this._prompt
      || !this._validateResponse(this._prompt, response)) return false;
    this.runtime.respond(response);
    this._prompt = this.pendingNativeDecision = null;
    return await this._pump();
  }

  getSideState(side) {
    return { hand: this[`${side}Hand`], deck: this[`${side}Deck`], monsters: this[`${side}Monsters`],
      spells: this[`${side}Spells`], graveyard: this[`${side}Graveyard`], extraDeck: this[`${side}ExtraDeck`],
      faceUpExtraDeck: this[`${side}FaceUpExtraDeck`], extraMonsters: this.field.getControlledExtraMonsters(side) };
  }
  getMonsterEntries(side, { faceUpOnly = false } = {}) {
    return [...this[`${side}Monsters`].map((card, zoneIndex) => card && { card, zoneType: 'main', zoneIndex }),
      ...this.extraMonsterZones.map((entry, zoneIndex) => entry?.controllerId === side && { card: entry.card, zoneType: 'extra', zoneIndex })]
      .filter(entry => entry && (!faceUpOnly || !entry.card.isSetFaceDown));
  }
  getControlledFieldCards(side) {
    return [...this.getMonsterEntries(side).map(entry => entry.card), ...this[`${side}Spells`].filter(Boolean),
      ...[this[`${side}FieldSpell`]].filter(Boolean)];
  }
  normalizeMonsterZoneReference(reference, defaultZoneType = 'main') {
    if (reference && typeof reference === 'object') {
      const zoneIndex = Number(reference.zoneIndex ?? reference.index);
      return Number.isInteger(zoneIndex) ? { zoneType: ['extra', 'extra_monster'].includes(reference.zoneType) ? 'extra' : 'main', zoneIndex } : null;
    }
    if (typeof reference === 'string' && reference.includes(':')) {
      const [zoneType, index] = reference.split(':');
      return this.normalizeMonsterZoneReference({ zoneType, zoneIndex: index });
    }
    const zoneIndex = Number(reference);
    return Number.isInteger(zoneIndex) ? { zoneType: defaultZoneType, zoneIndex } : null;
  }
  getMonsterEntry(side, reference, defaultZoneType = 'main') {
    const normalized = this.normalizeMonsterZoneReference(reference, defaultZoneType);
    return normalized ? this.getMonsterEntries(side).find(entry => entry.zoneType === normalized.zoneType && entry.zoneIndex === normalized.zoneIndex) || null : null;
  }
  getMonsterZoneKey(reference) {
    const normalized = this.normalizeMonsterZoneReference(reference);
    return normalized ? `${normalized.zoneType}:${normalized.zoneIndex}` : null;
  }
  hasMonsterAttacked(reference) {
    const card = reference?.card || this.getMonsterEntry(this.currentTurn, reference)?.card;
    if (!card) return false;
    const prompt = this._prompt;
    const M = this.runtime?.constants.OcgMessageType;
    // The existing UI uses this method to gate attack selection. Native attacks
    // are authoritative even for monsters allowed several attacks in one turn.
    if (prompt?.type === M?.SELECT_BATTLECMD) return !prompt.attacks.some(candidate => this._matchesCard(candidate, card));
    return Boolean(card.hasAttacked);
  }
  hasAvailablePlayerAction() {
    const actions = this.getAvailableActions();
    return Object.values(actions).some(value => Array.isArray(value) ? value.length : value === true);
  }
  canStartFieldSpellAction(side) {
    return !this.isResolvingAction && this._prompt?.type === this.runtime?.constants.OcgMessageType.SELECT_IDLECMD
      && this.sideForPlayer(this._prompt.player) === side;
  }
  getFieldSpellForSide(side) { return this[`${side}FieldSpell`]; }
  getOpponentSide(side) { return side === 'player' ? 'opponent' : 'player'; }
  // Mid-duel card injection and synthetic outcomes are intentionally absent
  // from the native protocol. Surrender terminates the local session explicitly.
  addCardToHand() { this.log('L’ajout de cartes pendant un duel natif est indisponible.', 'system'); return null; }
  drawCard() { return null; }
  discardCard() { return false; }
  selectSummonTribute() { return false; }
  selectSynchroMaterial() { return false; }
  cancelSummonTribute() { return false; }
  cancelExtraSummon() { return false; }
  async performXyzSummon(side, uid) { return this.summonExtraDeck(uid, side); }
  async performLinkSummon(side, uid) { return this.summonExtraDeck(uid, side); }
  endGame(winner, reason = 'surrender') {
    if (this._duelEnded || reason !== 'surrender' || !SIDES.includes(winner)) return false;
    this.winner = winner;
    this.endReason = reason;
    this._duelEnded = true;
    this.isResolvingAction = this.isResolvingEffect = false;
    this._duelGeneration += 1;
    this.runtime?.close();
    this.pendingNativeDecision = this._prompt = null;
    this.stateChanged();
    this._notifyGameOver();
    return true;
  }
  _notifyGameOver() {
    if (this._gameOverNotified) return;
    this._gameOverNotified = true;
    this.callbacks.onGameOver(this.winner, { winner: this.winner,
      loser: this.winner === 'draw' ? null : this.getOpponentSide(this.winner),
      reason: this.endReason, source: this.engine, nativeReason: this.nativeWinReason });
  }
  cancelPendingAsyncWork() { this._duelGeneration += 1; }
  dispose() {
    this.cancelPendingAsyncWork();
    this._duelEnded = true;
    this.runtime?.close();
    this.pendingNativeDecision = this._prompt = null;
  }
}

export default NativeDuelGame;
