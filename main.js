import { DuelGame } from './src/game.js';
import { NATIVE_CARDS } from './src/core/native/NativeCardRegistry.js';
import { loadNativeCardResources } from './src/core/native/NativeCardData.js';
import { createNativeCardPresentationTemplate } from './src/core/native/NativeCardCatalogue.js';
import { createTcgFormatPolicy } from './src/core/tcg/TcgCardLegality.js';
import { MatchController } from './src/ui/MatchController.js';
import { TCGMatchClock } from './src/ui/TCGMatchClock.js';
import { DuelViewController } from './src/ui/DuelViewController.js';
import { PrivateCardInspection } from './src/ui/PrivateCardInspection.js';
import { SoloCampaignController } from './src/ui/SoloCampaignController.js';
import { getMission, buildMissionDecks } from './src/content/SoloCampaign.js';
import { createCampaignDuelTracker } from './src/content/CampaignDuelTracker.js';
import { chooseAIChainResponse, chooseAIResponseTarget } from './src/content/AIResponsePolicy.js';
import { isHandPlacementDestinationLegal } from './src/ui/HandPlacement.js';
import { isFieldSpellCard } from './src/core/FieldSpellRules.js';
import { isSpellCardActivationPermitted } from './src/core/FieldRuleRuntime.js';
import { normalizeStrictCardId } from './src/core/StrictCardRegistry.js';
import { getDeckCopyIdentity } from './src/core/CardNameRules.js';
import { canAddDeckBuilderCard, getDeckBuilderCopyLimit, validateCustomDeck } from './src/ui/DeckBuilderRules.js';
import {
  initBoardTilt,
  createCardDOM,
  createMonsterHologramDOM,
  spawnHologram,
  animateAttack,
  createExplosion,
  getLocalCoords,
  findMonsterZoneElement,
  cancelBoardAnimations,
  triggerRaigekiCinematic,
  triggerMirrorForceCinematic,
  triggerRebornCinematic
} from './src/board.js';
import {
  playClick,
  playDrawCard,
  playSummon,
  playAttack,
  playExplosion,
  playLpLoss,
  startHologramHum,
  stopHologramHum,
  toggleMute,
  startBGM,
  stopBGM,
  setBGMStyle
} from './src/audio.js';
import { searchCards, getCardById } from './src/api.js';
import {
  STARTER_CARDS,
  EXTRA_DECK_CARDS,
  getCardCroppedImageUrl,
  getCardImageUrl
} from './src/cards.js';
import { escapeHtml, safeImageUrl } from './src/security.js';
import { PublicCardConfirmation } from './src/ui/PublicCardConfirmation.js';
import { getDuelistAvatar, DEFAULT_DUELIST_AVATAR_ID } from './src/content/DuelistAvatarCatalog.js';
import {
  validateDuelistAvatarProfile, collectDuelistAvatarUnlocks,
  getDuelistAvatarUnlockState, selectDuelistAvatar
} from './src/content/DuelistAvatarProgress.js';
import { DuelistAvatarPicker } from './src/ui/DuelistAvatarPicker.js';

let game = null;
let matchController = null;
let duelViewController = null;
let duelistAvatarProfile = null;
let duelistAvatarPicker = null;
let duelistAvatarStorageBlocked = false;
let duelistAvatarReturnDialog = null;
let currentOpponentAvatarId = 'kaiba';
const privateCardInspection = new PrivateCardInspection({
  documentRef: document,
  cardDetails: (card, gameState) => gameState?.resources
    ? createNativeCardPresentationTemplate(gameState.resources, card.id) : null,
  imageUrl: card => safeImageUrl(card.image_url, getCardImageUrl(card.id))
});
const publicCardConfirmation = new PublicCardConfirmation({
  documentRef: document,
  cardDetails: (card, gameState) => gameState?.resources
    ? createNativeCardPresentationTemplate(gameState.resources, card.id) : null,
  imageUrl: card => safeImageUrl(card.image_url, getCardImageUrl(card.id))
});
let pendingMatchLaunch = null;
let duelLaunchGeneration = 0;
let matchClock = null;
let matchClockInterval = null;
let sideDeckDraft = null;
let selectedSideDeckCard = null;
let selectedAttackerIndex = null;
let currentDraggedUid = null;
let selectedHandUid = null;
let pendingAction = null;
let previousPendulumAvailable = false;
let duelStartedAt = 0;
let activeDuelInProgress = false;
let lastDuelResult = null;
let activeCampaignMissionId = null;
let campaignTracker = null;
let campaignPreviousPreferences = null;
const recordedFinishedGames = new WeakSet();
const lpAnimationFrames = new Map();
const uiAnimationTimeouts = new Set();
let lpAnnouncementTimeout = null;
const MAX_LOG_ENTRIES = 180;

const STORAGE_KEYS = Object.freeze({
  muted: 'ygo_muted',
  voiceCommentary: 'ygo_voice_commentary',
  gameMode: 'ygo_game_mode',
  difficulty: 'ygo_ai_difficulty',
  duelSeries: 'ygo_duel_series',
  matchTimeLimit: 'ygo_match_time_limit',
  customDeck: 'ygo_custom_deck',
  statistics: 'ygo_duel_statistics',
  duelistAvatar: 'ygo_duelist_avatar_v1',
  activeMatch: 'ygo_active_match_v1',
  realBaseEnvironment: 'ygo_real_base_environment'
});

function readStoredValue(key, fallback = null) {
  try {
    const value = localStorage.getItem(key);
    return value === null ? fallback : value;
  } catch {
    return fallback;
  }
}

function writeStoredValue(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function removeStoredValue(key) {
  try {
    localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

function readStoredJson(key, fallback) {
  try {
    const value = JSON.parse(readStoredValue(key, 'null'));
    return value && typeof value === 'object' ? value : fallback;
  } catch {
    return fallback;
  }
}

function getMotionDuration(duration) {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 0 : duration;
}

function scheduleUiAnimation(callback, duration) {
  const timeoutId = window.setTimeout(() => {
    uiAnimationTimeouts.delete(timeoutId);
    callback();
  }, getMotionDuration(duration));
  uiAnimationTimeouts.add(timeoutId);
  return timeoutId;
}

function cancelUiAnimations() {
  uiAnimationTimeouts.forEach(timeoutId => window.clearTimeout(timeoutId));
  uiAnimationTimeouts.clear();
  if (lpAnnouncementTimeout !== null) {
    window.clearTimeout(lpAnnouncementTimeout);
    lpAnnouncementTimeout = null;
  }
  document.querySelectorAll(
    '.chain-notification, .lp-loss-indicator:not(.hidden)'
  ).forEach(element => {
    if (element.classList.contains('lp-loss-indicator')) element.classList.add('hidden');
    else element.remove();
  });
  document.querySelectorAll('.combat-lunge, .combat-recoil, .shake-screen, .glitch-text')
    .forEach(element => element.classList.remove(
      'combat-lunge',
      'combat-recoil',
      'shake-screen',
      'glitch-text'
    ));
}

function announceStatus(message) {
  const announcer = document.getElementById('sr-announcer');
  if (!announcer) return;
  announcer.textContent = '';
  window.setTimeout(() => {
    announcer.textContent = message;
  }, 20);
}

let activeDialog = null;
let dialogReturnFocus = null;
const focusableSelector = [
  'button:not([disabled])',
  '[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'summary',
  '[tabindex]:not([tabindex="-1"])'
].join(',');

function openDialog(dialog, preferredFocus = null) {
  if (!dialog) return;

  if (activeDialog && activeDialog !== dialog) {
    activeDialog.classList.add('hidden');
  }

  dialogReturnFocus = document.activeElement instanceof HTMLElement
    ? document.activeElement
    : null;
  dialog.classList.remove('hidden');
  document.body.classList.add('modal-open');
  const appContainer = document.querySelector('.app-container');
  if (appContainer && !appContainer.contains(dialog)) appContainer.setAttribute('inert', '');
  else appContainer?.removeAttribute('inert');
  activeDialog = dialog;

  requestAnimationFrame(() => {
    const target = preferredFocus
      || dialog.querySelector('[autofocus]')
      || dialog.querySelector(focusableSelector)
      || dialog.querySelector('.modal-content')
      || dialog;
    target?.focus({ preventScroll: true });
    if (['start-modal', 'campaign-modal'].includes(dialog.id)) {
      dialog.querySelector('.modal-content')?.scrollTo(0, 0);
    }
  });
}

function closeDialog(dialog, { restoreFocus = true } = {}) {
  if (!dialog) return;
  dialog.classList.add('hidden');

  if (activeDialog === dialog) {
    activeDialog = null;
    document.body.classList.remove('modal-open');
    document.querySelector('.app-container')?.removeAttribute('inert');
    if (restoreFocus && dialogReturnFocus?.isConnected) {
      dialogReturnFocus.focus();
    }
    dialogReturnFocus = null;
  }
}

function dismissActiveDialog() {
  if (!activeDialog || activeDialog.dataset.dismissible !== 'true') return;

  if (activeDialog.id === 'campaign-modal') {
    closeDialog(activeDialog, { restoreFocus: false });
    openDialog(startModal, document.getElementById('btn-open-campaign'));
    return;
  }

  if (activeDialog.id === 'duelist-avatar-modal') {
    duelistAvatarPicker?.close();
    return;
  }

  if (activeDialog.id === 'field-atlas-modal') {
    closeFieldAtlas();
    return;
  }

  if (activeDialog.id === 'decision-modal') {
    finishDecision(null);
    return;
  }
  if (activeDialog.id === 'action-modal') {
    pendingAction = null;
  }
  closeDialog(activeDialog);
}

document.addEventListener('keydown', event => {
  if (!activeDialog || activeDialog.classList.contains('hidden')) return;

  if (event.key === 'Escape' && activeDialog.dataset.dismissible === 'true') {
    event.preventDefault();
    dismissActiveDialog();
    return;
  }

  if (event.key !== 'Tab') return;
  const focusable = [...activeDialog.querySelectorAll(focusableSelector)]
    .filter(element => !element.closest('.hidden') && element.getClientRects().length > 0);
  if (focusable.length === 0) {
    event.preventDefault();
    activeDialog.focus();
    return;
  }

  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
});

// Initialize board tilt
initBoardTilt('#parallax-container', '#duel-board');

function updateResponsiveBoardScale() {
  const field = document.getElementById('parallax-container');
  const boardWrapper = document.querySelector('.duel-board-shadow-box');
  if (!field || !boardWrapper) return;

  // Vue Réelle projects this exact board with the shared Three/CSS3D camera.
  // A second mobile-pan or wrapper transform would desynchronise its hitboxes.
  if (field.classList.contains('real-duel-view-active')) {
    field.classList.remove('board-pan-mode');
    boardWrapper.style.removeProperty('--responsive-board-scale');
    return;
  }

  if (window.innerWidth <= 600) {
    field.classList.add('board-pan-mode');
    boardWrapper.style.removeProperty('--responsive-board-scale');
  } else if (window.innerWidth <= 1050) {
    field.classList.remove('board-pan-mode');
    const availableWidth = Math.max(280, field.clientWidth - 16);
    const scale = Math.min(1, availableWidth / 960);
    boardWrapper.style.setProperty('--responsive-board-scale', String(scale));
  } else {
    field.classList.remove('board-pan-mode');
    boardWrapper.style.removeProperty('--responsive-board-scale');
  }
}

function positionMobileBoardForPlayer() {
  if (window.innerWidth > 600) return;
  const field = document.getElementById('parallax-container');
  if (!field || field.classList.contains('real-duel-view-active')) return;
  requestAnimationFrame(() => {
    // A view change or resize can occur after this pan was scheduled.
    if (window.innerWidth > 600 || field.classList.contains('real-duel-view-active')) return;
    field.scrollLeft = Math.max(0, (field.scrollWidth - field.clientWidth) / 2);
    field.scrollTop = Math.max(0, field.scrollHeight - field.clientHeight);
  });
}

window.addEventListener('resize', updateResponsiveBoardScale, { passive: true });
requestAnimationFrame(updateResponsiveBoardScale);

// Setup Mute Toggle
const muteBtn = document.getElementById('btn-mute');
let uiMuted = readStoredValue(STORAGE_KEYS.muted) === 'true';
let voiceCommentaryPreferred = readStoredValue(STORAGE_KEYS.voiceCommentary, 'true') !== 'false';
let realBaseEnvironmentId = readStoredValue(STORAGE_KEYS.realBaseEnvironment) === 'cave'
  ? 'cave'
  : 'clearing';
let speechAnnouncerEnabled = voiceCommentaryPreferred && !uiMuted;
if (uiMuted) {
  toggleMute();
}

function updateMuteControl() {
  muteBtn.textContent = `SON : ${uiMuted ? 'OFF' : 'ON'}`;
  muteBtn.setAttribute('aria-pressed', uiMuted ? 'true' : 'false');
  muteBtn.classList.toggle('btn-magenta', !uiMuted);
}

updateMuteControl();
muteBtn.addEventListener('click', () => {
  uiMuted = toggleMute();
  if (!uiMuted && !activeDuelInProgress) stopBGM();
  writeStoredValue(STORAGE_KEYS.muted, String(uiMuted));
  speechAnnouncerEnabled = voiceCommentaryPreferred && !uiMuted;
  if (uiMuted && window.speechSynthesis !== undefined) {
    window.speechSynthesis.cancel();
  }
  updateMuteControl();
  updateCommentaryControl();
  announceStatus(uiMuted ? 'Son désactivé' : 'Son activé');
});

// Setup Start game trigger (safeguard for Web Audio)
const startModal = document.getElementById('start-modal');
const fieldAtlasDialog = document.getElementById('field-atlas-modal');
let fieldAtlas = null;
let fieldAtlasLoader = null;
function closeFieldAtlas() {
  fieldAtlas?.close();
  closeDialog(fieldAtlasDialog, { restoreFocus: false });
  openDialog(startModal, document.getElementById('btn-open-field-atlas'));
}
document.getElementById('btn-close-field-atlas').addEventListener('click', closeFieldAtlas);
document.getElementById('btn-open-field-atlas').addEventListener('click', async () => {
  openDialog(fieldAtlasDialog, document.getElementById('field-atlas-search'));
  try {
    fieldAtlasLoader ||= import('./src/ui/FieldSpellAtlas.js');
    const { FieldSpellAtlas } = await fieldAtlasLoader;
    if (activeDialog !== fieldAtlasDialog) return;
    fieldAtlas ||= new FieldSpellAtlas(fieldAtlasDialog);
    fieldAtlas.open();
  } catch {
    fieldAtlasLoader = null;
    document.getElementById('field-atlas-summary').textContent = 'Le catalogue n’a pas pu se charger. Réessayez en le rouvrant.';
  }
});
document.getElementById('simulator-card-coverage').textContent = 'Projet fan non officiel. Le mode TCG Advanced applique la liste complète du 21/09/2026 au catalogue natif, avec les règles modernes d’Invocation, de Chaîne et de combat. Le Duel libre accueille aussi les cartes OCG et annoncées. Le catalogue indique séparément la précision des décors 3D.';
const startBtn = document.getElementById('btn-start-duel');
const campaignController = new SoloCampaignController({
  openDialog, closeDialog,
  onBack: () => {
    closeDialog(document.getElementById('campaign-modal'), { restoreFocus: false });
    openDialog(startModal, document.getElementById('btn-open-campaign'));
  },
  onLaunch: async mission => {
    campaignPreviousPreferences ||= { mode: selectedGameMode, difficulty: selectedAiDifficulty, series: selectedDuelSeries };
    selectedGameMode = 'strict';
    selectedAiDifficulty = mission.aiDifficulty;
    selectedDuelSeries = 'single';
    activeCampaignMissionId = mission.id;
    clearPersistedMatch();
    matchController = null;
    pendingMatchLaunch = null;
    startHologramHum();
    await initGameInstance();
  }
});
document.getElementById('btn-open-campaign').addEventListener('click', () => campaignController.open());
document.getElementById('btn-result-campaign').addEventListener('click', () => {
  returnToConfiguration();
  campaignController.open();
});
function leaveCampaign() {
  activeCampaignMissionId = null;
  campaignTracker = null;
  if (campaignPreviousPreferences) {
    selectedGameMode = campaignPreviousPreferences.mode;
    selectedAiDifficulty = campaignPreviousPreferences.difficulty;
    selectedDuelSeries = campaignPreviousPreferences.series;
    campaignPreviousPreferences = null;
  }
  document.getElementById('campaign-duel-status').classList.add('hidden');
}
startBtn.addEventListener('click', async () => {
  leaveCampaign();
  clearPersistedMatch();
  matchController = null;
  pendingMatchLaunch = null;
  sideDeckDraft = null;
  selectedSideDeckCard = null;
  closeDialog(startModal, { restoreFocus: false });
  startHologramHum();
  await initGameInstance();
});
openDialog(startModal, document.getElementById('start-modal-title'));

// Setup Restart Game trigger
const gameoverModal = document.getElementById('gameover-modal');
const restartBtn = document.getElementById('btn-restart-duel');
const returnConfigBtn = document.getElementById('btn-return-config');
restartBtn.addEventListener('click', async () => {
  closeDialog(gameoverModal, { restoreFocus: false });
  document.body.classList.remove('duel-ended');
  const matchView = matchController?.getViewModel();
  if (selectedDuelSeries === 'match' && matchView?.status === 'between_games') {
    openSideDeckEditor();
    return;
  }
  if (selectedDuelSeries === 'match' && matchView?.status === 'complete') {
    clearPersistedMatch();
    matchController = null;
  }
  startHologramHum();
  await initGameInstance();
});

returnConfigBtn?.addEventListener('click', () => {
  const matchView = matchController?.getViewModel();
  const abandoningMatch = selectedDuelSeries === 'match'
    && matchView
    && matchView.status !== 'complete';
  if (
    abandoningMatch
    && !window.confirm('Abandonner définitivement ce Match et revenir à la configuration ? Le score en cours sera perdu.')
  ) {
    return;
  }
  returnToConfiguration({ announce: true });
});

// Abandon the current Duel without silently destroying a Match.
const resetBtn = document.getElementById('btn-reset');
resetBtn.addEventListener('click', () => {
  if (!game || !activeDuelInProgress) {
    returnToConfiguration({ announce: true });
    return;
  }
  const matchView = matchController?.getViewModel();
  const isActiveMatch = selectedDuelSeries === 'match' && matchView?.status === 'active';
  const message = isActiveMatch
    ? `Abandonner le Duel ${matchView.gameNumber} ? Il sera compté comme une défaite dans le Match.`
    : 'Abandonner ce Duel ? Il sera enregistré comme une défaite par abandon.';
  if (window.confirm(message)) {
    abandonCurrentDuel();
  }
});
// Setup Extra Deck Modal listeners
const extraZone = document.getElementById('player-extra-zone');
const extraModal = document.getElementById('extra-deck-modal');
const extraList = document.getElementById('extra-deck-list');
const closeExtraBtn = document.getElementById('close-extra-modal');

if (extraZone && extraModal && extraList && closeExtraBtn) {
  const openExtraDeck = () => {
    if (!game || game.currentTurn !== 'player' || !game.currentPhase.startsWith('main') || game.isResolvingAction || game.pendingSummon || game.pendingExtraSummon) return;

    extraList.innerHTML = '';
    const availableActions = game.getAvailableActions?.('player') || {};
    const legalExtraUids = new Set([
      ...(availableActions.fusionExtraUids || []),
      ...(availableActions.synchroExtraUids || []),
      ...(availableActions.xyzExtraUids || []),
      ...(availableActions.linkExtraUids || [])
    ].map(String));
    const pendulumOptions = availableActions.canPendulumSummon
      ? game.getPendulumOptions?.('player')
      : null;
    const legalFaceUpPendulumUids = new Set(
      (pendulumOptions?.fromExtraDeck || []).map(card => String(card.uid))
    );
    const pendulumSelectionRequired = pendulumOptions?.nativeSelectionRequired === true;
    if (availableActions.canPendulumSummon && pendulumSelectionRequired) {
      const procedureButton = document.createElement('button');
      procedureButton.type = 'button';
      procedureButton.className = 'btn btn-magenta native-extra-pendulum-action';
      procedureButton.textContent = 'CHOISIR LES MONSTRES PENDULE';
      procedureButton.setAttribute('aria-label', 'Lancer l’Invocation Pendule puis choisir les monstres autorisés dans la Main et l’Extra Deck');
      procedureButton.addEventListener('click', async () => {
        closeDialog(extraModal);
        await game.performPendulumSummon('player');
      });
      extraList.appendChild(procedureButton);
    }
    const extraCards = [
      ...game.playerExtraDeck.map(card => ({ card, faceUp: false })),
      ...(game.playerFaceUpExtraDeck || []).map(card => ({ card, faceUp: true }))
    ];
    if (extraCards.length === 0) {
      extraList.innerHTML = '<p class="modal-empty-state">Votre Extra Deck est vide.</p>';
    }

    extraCards.forEach(({ card, faceUp }) => {
      const legal = faceUp
        ? availableActions.canPendulumSummon && legalFaceUpPendulumUids.has(String(card.uid))
        : legalExtraUids.has(String(card.uid));
      const deferredPendulumChoice = faceUp && pendulumSelectionRequired && availableActions.canPendulumSummon;
      const unavailableReason = faceUp
        ? deferredPendulumChoice
          ? 'Utilisez « Choisir les monstres Pendule » pour sélectionner les monstres autorisés.'
          : 'Invocation Pendule indisponible : vérifiez les Échelles, le Niveau, les zones et la limite d’une fois par tour.'
        : 'Invocation indisponible : matériels, procédure ou zone d’arrivée insuffisants.';
      const cardEl = createCardDOM(card, false);
      cardEl.classList.toggle('face-up-extra-card', faceUp);
      cardEl.classList.toggle('extra-card-unavailable', !legal);
      cardEl.setAttribute('role', 'button');
      cardEl.setAttribute('tabindex', '0');
      cardEl.setAttribute('aria-disabled', legal ? 'false' : 'true');
      cardEl.setAttribute(
        'aria-label',
        legal
          ? (
            faceUp
              ? `Invoquer par Pendulation ${card.name} depuis l’Extra Deck face recto`
              : `Invoquer ${card.name} depuis l’Extra Deck`
          )
          : `${card.name}${deferredPendulumChoice ? ', Extra Deck face recto' : ', indisponible'}. ${unavailableReason}`
      );
      if (faceUp) {
        const badge = document.createElement('span');
        badge.className = 'face-up-extra-badge';
        badge.textContent = 'FACE RECTO';
        cardEl.appendChild(badge);
      }
      if (!legal) {
        const reason = document.createElement('span');
        reason.className = 'extra-card-reason';
        reason.textContent = deferredPendulumChoice ? 'CHOIX PENDULE' : 'INDISPONIBLE';
        reason.title = unavailableReason;
        cardEl.appendChild(reason);
      }
      cardEl.addEventListener('click', async () => {
        if (!legal) {
          announceStatus(`${card.name} : ${unavailableReason}`);
          return;
        }
        closeDialog(extraModal);
        if (faceUp) {
          await game.performPendulumSummon('player', [card.uid]);
        } else {
          await game.summonExtraDeck(card.uid);
        }
      });
      cardEl.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          cardEl.click();
        }
      });
      extraList.appendChild(cardEl);
    });

    openDialog(extraModal, extraList.querySelector('.native-extra-pendulum-action')
      || extraList.querySelector('[role="button"]') || closeExtraBtn);
  };

  extraZone.addEventListener('click', openExtraDeck);
  extraZone.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openExtraDeck();
    }
  });

  closeExtraBtn.addEventListener('click', () => {
    closeDialog(extraModal);
  });
}

const publicZoneModal = document.getElementById('public-zone-modal');
const publicZoneTitle = document.getElementById('public-zone-title');
const publicZoneList = document.getElementById('public-zone-list');
const closePublicZoneBtn = document.getElementById('btn-close-public-zone');
const publicPileDefinitions = [
  {
    elementId: 'player-graveyard-zone',
    title: 'VOTRE CIMETIÈRE',
    collection: () => game?.playerGraveyard || [],
    hideFaceDown: false
  },
  {
    elementId: 'opponent-graveyard-zone',
    title: 'CIMETIÈRE ADVERSE',
    collection: () => game?.opponentGraveyard || [],
    hideFaceDown: false
  },
  {
    elementId: 'player-banished-zone',
    title: 'VOS CARTES BANNIES',
    collection: () => game?.playerBanished || [],
    hideFaceDown: false
  },
  {
    elementId: 'opponent-banished-zone',
    title: 'CARTES BANNIES ADVERSES',
    collection: () => game?.opponentBanished || [],
    hideFaceDown: true
  }
];

function openPublicPile(definition) {
  if (!publicZoneModal || !publicZoneList || !publicZoneTitle || !game) return;
  const cards = definition.collection();
  publicZoneTitle.textContent = `${definition.title} (${cards.length})`;
  publicZoneList.innerHTML = '';
  if (cards.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'modal-empty-state';
    empty.textContent = 'Cette zone est vide.';
    publicZoneList.appendChild(empty);
  }
  cards.forEach((card, index) => {
    const concealIdentity = Boolean(definition.hideFaceDown && card?.isSetFaceDown);
    const cardEl = createCardDOM(card, concealIdentity, concealIdentity);
    cardEl.setAttribute('role', concealIdentity ? 'img' : 'button');
    cardEl.tabIndex = concealIdentity ? -1 : 0;
    cardEl.setAttribute(
      'aria-label',
      concealIdentity
        ? `Carte bannie face verso ${index + 1}, identité masquée`
        : `${card.name}, carte ${index + 1} sur ${cards.length}. Afficher dans l’inspecteur.`
    );
    if (!concealIdentity) {
      const inspect = () => updateInspector(card);
      cardEl.addEventListener('click', inspect);
      cardEl.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          inspect();
        }
      });
    }
    publicZoneList.appendChild(cardEl);
  });
  openDialog(
    publicZoneModal,
    publicZoneList.querySelector('[role="button"]') || closePublicZoneBtn
  );
}

publicPileDefinitions.forEach(definition => {
  const zone = document.getElementById(definition.elementId);
  if (!zone) return;
  zone.setAttribute('role', 'button');
  zone.tabIndex = 0;
  zone.setAttribute('aria-haspopup', 'dialog');
  const activate = () => openPublicPile(definition);
  zone.addEventListener('click', activate);
  zone.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      activate();
    }
  });
});
closePublicZoneBtn?.addEventListener('click', () => closeDialog(publicZoneModal));

// Setup Action Choice Modal listeners (Face Up / Face Down)
const actionModal = document.getElementById('action-modal');
const btnFaceUp = document.getElementById('btn-action-faceup');
const btnFaceDown = document.getElementById('btn-action-facedown');
const btnCancel = document.getElementById('btn-action-cancel');
const actionModalTitle = document.getElementById('action-modal-title');
const actionModalDescription = document.getElementById('action-modal-description');

function canActivateHandPendulumScale(card, zoneIndex = null) {
  if (typeof game?.canActivatePendulumScale === 'function') return game.canActivatePendulumScale(card, 'player', zoneIndex);
  if (!game || !card?.isPendulumMonster || game.currentTurn !== 'player'
    || !game.currentPhase.startsWith('main') || game.isResolvingAction
    || game.pendingSummon || game.pendingExtraSummon || game.isDiscarding) return false;
  const indices = zoneIndex === null ? [0, 4] : [zoneIndex];
  return indices.some(index => [0, 4].includes(index) && game.playerSpells[index] === null)
    && !game.defense.isActionProhibited('player', 'ACTIVATE_EFFECT', card)
    && isSpellCardActivationPermitted(game, card, 'player', { pendulumScale: true })
    && !(card.pendulumActivationRequiresEmptyMonsterField
      && game.getMonsterEntries('player').length);
}

function prepareActionDialog(card, { zoneType, index, isPendulumScale }) {
  btnFaceUp.disabled = false;
  btnFaceDown.disabled = false;
  if (isPendulumScale) {
    const sideLabel = index === 0 ? 'gauche' : 'droite';
    const cardName = card?.name || 'cette carte';
    const scale = card?.pendulumScale ?? '—';
    actionModalTitle.textContent = 'ACTIVER UNE ÉCHELLE PENDULE';
    actionModalDescription.textContent =
      `Activer ${cardName} comme Échelle Pendule ${scale} dans la zone ${sideLabel}.`;
    btnFaceUp.textContent = `ACTIVER L’ÉCHELLE ${scale}`;
    btnFaceUp.disabled = !canActivateHandPendulumScale(card, index);
    if (btnFaceUp.disabled) {
      actionModalDescription.textContent = 'Cette Échelle Pendule ne peut pas être activée dans la situation actuelle.';
    }
    btnFaceDown.classList.add('hidden');
    return;
  }

  if (zoneType === 'field') {
    actionModalTitle.textContent = 'MAGIE DE TERRAIN';
    actionModalDescription.textContent =
      `Activez ${card?.name || 'cette carte'} ou posez-la face cachée dans votre Zone Terrain.`;
    btnFaceUp.textContent = 'ACTIVER LE TERRAIN';
    btnFaceUp.disabled = !game.canActivateSpell(card, 'player');
    if (btnFaceUp.disabled) {
      actionModalDescription.textContent = 'L’activation de ce Terrain est interdite actuellement. Vous pouvez le poser face cachée.';
    }
    btnFaceDown.textContent = 'POSER FACE CACHÉE';
    btnFaceDown.disabled = typeof game.canSetSpell === 'function' && !game.canSetSpell(card, 'player');
    btnFaceDown.classList.remove('hidden');
    return;
  }

  actionModalTitle.textContent = 'ACTION SUR LE TERRAIN';
  actionModalDescription.textContent = 'Choisissez l’action autorisée pour cette carte et cette zone.';
  btnFaceUp.textContent = zoneType === 'monster'
    ? 'INVOQUER FACE RECTO'
    : 'ACTIVER FACE RECTO';
  btnFaceDown.textContent = 'POSER FACE CACHÉE';
  btnFaceDown.classList.remove('hidden');
  if (zoneType === 'monster') {
    const actions = game.getAvailableActions('player');
    const canNormalSummon = actions.normalSummonCardUids.includes(card.uid);
    btnFaceUp.disabled = !canNormalSummon;
    btnFaceDown.disabled = !(actions.normalSetCardUids || actions.normalSummonCardUids).includes(card.uid);
    if (!canNormalSummon) {
      actionModalDescription.textContent = btnFaceDown.disabled
        ? 'Ce monstre ne peut pas être Invoqué Normalement ni posé dans la situation actuelle.'
        : 'L’Invocation face recto est indisponible ; ce monstre peut être posé face cachée.';
    }
  } else {
    btnFaceUp.disabled = !game.canActivateSpell(card, 'player');
    btnFaceDown.disabled = typeof game.canSetSpell === 'function' && !game.canSetSpell(card, 'player');
    if (btnFaceUp.disabled) {
      actionModalDescription.textContent = 'Cette carte ne peut pas être activée depuis la Main actuellement. Vous pouvez la poser face cachée.';
    }
  }
}

function getActionDialogInitialFocus() {
  if (!btnFaceUp.disabled) return btnFaceUp;
  if (!btnFaceDown.disabled && !btnFaceDown.classList.contains('hidden')) return btnFaceDown;
  return btnCancel;
}

if (actionModal && btnFaceUp && btnFaceDown && btnCancel) {
  btnFaceUp.addEventListener('click', async () => {
    if (!pendingAction || !game) return;
    closeDialog(actionModal);
    const { uid, zoneType, index, isPendulumScale } = pendingAction;
    pendingAction = null;
    btnFaceDown.classList.remove('hidden');

    if (zoneType === 'monster') {
      await game.summonMonster(uid, index);
    } else if (isPendulumScale) {
      await game.activatePendulumScale(uid, index, 'player');
    } else if (zoneType === 'field') {
      await game.activateFieldSpellFromHand(uid, 'player');
    } else if (zoneType === 'spell') {
      await game.playSpellTrap(uid, index);
    }
  });

  btnFaceDown.addEventListener('click', async () => {
    if (!pendingAction || !game) return;
    closeDialog(actionModal);
    const { uid, zoneType, index } = pendingAction;
    pendingAction = null;
    btnFaceDown.classList.remove('hidden');

    if (zoneType === 'monster') {
      await game.setMonsterFaceDown(uid, index);
    } else if (zoneType === 'field') {
      await game.setFieldSpellFaceDownFromHand(uid, 'player');
    } else if (zoneType === 'spell') {
      await game.setSpellTrapFaceDown(uid, index);
    }
  });

  btnCancel.addEventListener('click', () => {
    pendingAction = null;
    btnFaceDown.classList.remove('hidden');
    closeDialog(actionModal);
  });
}

const decisionModal = document.getElementById('decision-modal');
const decisionTitle = document.getElementById('decision-modal-title');
const decisionDescription = document.getElementById('decision-modal-description');
const decisionOptions = document.getElementById('decision-options');
const decisionCancelBtn = document.getElementById('btn-decision-cancel');
let pendingDecisionResolver = null;

function finishDecision(value) {
  const resolver = pendingDecisionResolver;
  pendingDecisionResolver = null;
  closeDialog(decisionModal);
  resolver?.(value);
}

function requestUiDecision(request) {
  if (request?.side === 'opponent') {
    const choice = chooseAIResponseTarget(game, request);
    if (choice !== undefined) return choice;
  }
  if (!request || request.side !== 'player' || !decisionModal) return undefined;

  return new Promise(resolve => {
    if (pendingDecisionResolver) {
      pendingDecisionResolver(null);
    }
    pendingDecisionResolver = resolve;
    decisionOptions.innerHTML = '';

    if ([
      'activate-monster-effect',
      'activate-hand-effect',
      'activate-field-effect',
      'activate-graveyard-effect',
      'activate-trap'
    ].includes(request.type)) {
      decisionTitle.textContent = request.title || 'ACTIVER UN EFFET ?';
      const damageText = request.damage ? ` pour éviter ${request.damage} dommages` : '';
      decisionDescription.textContent = request.description || (request.card?.name
        ? `Souhaitez-vous activer l’effet optionnel de ${request.card.name}${damageText} ?`
        : 'Souhaitez-vous activer cet effet optionnel ?');

      [
        { label: 'OUI, ACTIVER', value: true, className: 'btn btn-magenta' },
        { label: 'NON', value: false, className: 'btn' }
      ].forEach(option => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = option.className;
        button.textContent = option.label;
        button.addEventListener('click', () => finishDecision(option.value));
        decisionOptions.appendChild(button);
      });
      decisionCancelBtn.classList.add('hidden');
    } else if (Array.isArray(request.choices) && request.choices.length > 0) {
      decisionTitle.textContent = request.title || (request.type === 'coin-call' ? 'ANNONCER LE PILE OU FACE' : 'CHOISIR UNE ACTION');
      decisionDescription.textContent = request.description
        || (request.type === 'coin-call' ? 'Choisissez votre annonce avant le lancer.' : 'Sélectionnez une option.');
      const choicesContainer = document.createElement('div');
      choicesContainer.className = 'decision-choice-list';
      const searchStatus = document.createElement('p');
      searchStatus.className = 'decision-search-status';
      searchStatus.setAttribute('role', 'status');
      searchStatus.setAttribute('aria-live', 'polite');
      const searchText = value => String(value).normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase();
      const renderChoices = (query = '') => {
        choicesContainer.replaceChildren();
        const needle = searchText(query.trim());
        const matches = request.searchable
          ? request.choices.filter(choice => searchText(`${choice.label ?? choice} ${choice.value ?? ''}`).includes(needle))
          : request.choices;
        const choices = request.searchable
          ? matches.slice(0, 100) : matches;
        searchStatus.textContent = matches.length === 0 ? 'Aucune carte autorisée ne correspond à cette recherche.'
          : matches.length > choices.length ? `${choices.length} sur ${matches.length} cartes. Précisez votre recherche.`
            : `${matches.length} carte${matches.length > 1 ? 's' : ''} autorisée${matches.length > 1 ? 's' : ''}.`;
        choices.forEach(choice => {
        const value = typeof choice === 'object' ? choice.value : choice;
        const label = typeof choice === 'object'
          ? choice.label
          : ({ heads: 'PILE', tails: 'FACE' }[choice] || String(choice));
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'btn';
        button.textContent = label;
        button.addEventListener('click', () => finishDecision(value));
        choicesContainer.appendChild(button);
        });
      };
      if (request.searchable) {
        const search = document.createElement('input');
        search.type = 'search';
        search.placeholder = 'Rechercher une carte par son nom';
        search.setAttribute('aria-label', 'Rechercher parmi les cartes autorisées');
        search.addEventListener('input', () => renderChoices(search.value));
        decisionOptions.appendChild(search);
        decisionOptions.appendChild(searchStatus);
      }
      decisionOptions.appendChild(choicesContainer);
      renderChoices();
      decisionCancelBtn.textContent = 'ANNULER';
      decisionCancelBtn.classList.toggle('hidden', request.required === true);
    } else if (
      request.type === 'assign-pendulum-zones'
      && Array.isArray(request.items)
      && request.items.length > 0
    ) {
      decisionTitle.textContent = request.title || 'PLACER LES MONSTRES PENDULE';
      decisionDescription.textContent = request.description
        || 'Attribuez une Zone distincte à chaque monstre.';
      const selectedByCard = new Map();
      const optionButtons = [];
      const confirmButton = document.createElement('button');
      confirmButton.type = 'button';
      confirmButton.className = 'btn btn-magenta decision-confirm-button';
      confirmButton.textContent = 'CONFIRMER LES ZONES';
      confirmButton.disabled = true;

      const destinationKey = destination => (
        `${destination.zoneType}:${destination.zoneIndex}`
      );
      const refreshAssignments = () => {
        const reserved = new Map(
          [...selectedByCard.entries()].map(([cardUid, destination]) => (
            [destinationKey(destination), cardUid]
          ))
        );
        optionButtons.forEach(({ button, cardUid, destination }) => {
          const selected = selectedByCard.get(cardUid);
          const occupiedBy = reserved.get(destinationKey(destination));
          const isSelected = selected
            && destinationKey(selected) === destinationKey(destination);
          button.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
          button.classList.toggle('selected', Boolean(isSelected));
          button.disabled = Boolean(occupiedBy && occupiedBy !== cardUid);
        });
        confirmButton.disabled = selectedByCard.size !== request.items.length;
        announceStatus(
          `${selectedByCard.size} zone${selectedByCard.size > 1 ? 's' : ''} attribuée${selectedByCard.size > 1 ? 's' : ''} sur ${request.items.length}.`
        );
      };

      request.items.forEach(item => {
        const group = document.createElement('div');
        group.className = 'decision-assignment-group';
        group.setAttribute('role', 'group');
        group.setAttribute('aria-label', `Zone de ${item.card.name}`);
        const label = document.createElement('p');
        label.className = 'decision-assignment-label';
        label.textContent = item.card.name;
        group.appendChild(label);
        item.destinations.forEach(destination => {
          const button = document.createElement('button');
          button.type = 'button';
          button.className = 'btn';
          button.textContent = destination.label;
          button.setAttribute('aria-pressed', 'false');
          button.addEventListener('click', () => {
            selectedByCard.set(String(item.card.uid), {
              zoneType: destination.zoneType,
              zoneIndex: destination.zoneIndex
            });
            refreshAssignments();
          });
          optionButtons.push({
            button,
            cardUid: String(item.card.uid),
            destination
          });
          group.appendChild(button);
        });
        decisionOptions.appendChild(group);
      });
      confirmButton.addEventListener('click', () => finishDecision(
        request.items.map(item => ({
          cardUid: String(item.card.uid),
          ...selectedByCard.get(String(item.card.uid))
        }))
      ));
      decisionOptions.appendChild(confirmButton);
      refreshAssignments();
      decisionCancelBtn.textContent = 'ANNULER';
      decisionCancelBtn.classList.toggle('hidden', request.required === true);
    } else if (
      request.multiple === true
      && Array.isArray(request.candidates)
    ) {
      decisionTitle.textContent = request.title || 'CHOISIR PLUSIEURS CARTES';
      decisionDescription.textContent = request.description || 'Sélectionnez les cartes, puis confirmez.';
      const selected = new Set();
      const minimum = Math.max(0, Number(request.minimum) || 0);
      const maximum = Math.max(minimum, Number(request.maximum) || request.candidates.length);
      const validSelections = Array.isArray(request.validSelections)
        ? new Set(request.validSelections.map(selection => (
          selection.map(String).sort().join('|')
        )))
        : null;
      const confirmButton = document.createElement('button');
      confirmButton.type = 'button';
      confirmButton.className = 'btn btn-magenta decision-confirm-button';
      confirmButton.textContent = 'CONFIRMER LA SÉLECTION';
      confirmButton.disabled = true;
      const selectionSummary = document.createElement('p');
      selectionSummary.className = 'decision-selection-summary';
      selectionSummary.setAttribute('role', 'status');
      selectionSummary.setAttribute('aria-live', 'polite');
      if (request.includedCandidates?.length) {
        const included = document.createElement('p');
        included.className = 'decision-included-cards';
        included.textContent = `Déjà inclus : ${request.includedCandidates.map(candidate => candidate.label || candidate.name).join(' ; ')}`;
        decisionOptions.appendChild(included);
      }

      const updateMultipleSelection = () => {
        const selectedKey = [...selected].sort().join('|');
        confirmButton.disabled = (
          selected.size < minimum
          || selected.size > maximum
          || (validSelections && !validSelections.has(selectedKey))
          || (typeof request.validateSelection === 'function' && !request.validateSelection([...selected]))
        );
        confirmButton.textContent = `CONFIRMER (${selected.size}/${maximum})`;
        selectionSummary.textContent = typeof request.selectionSummary === 'function'
          ? request.selectionSummary([...selected]) : '';
        announceStatus(
          `${selected.size} carte${selected.size > 1 ? 's' : ''} sélectionnée${selected.size > 1 ? 's' : ''} sur ${maximum}.`
        );
      };

      request.candidates.forEach(candidate => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'decision-card-option';
        button.setAttribute('aria-pressed', 'false');
        const source = candidate.source === 'extra'
          ? 'Extra Deck face recto'
          : (candidate.source === 'field' ? 'Terrain' : 'Main');
        button.textContent = candidate.label
          || `${candidate.name} — ${candidate.meta || `Niv. ${candidate.level ?? '—'} — ${source}`}`;
        button.addEventListener('click', () => {
          const uid = String(candidate.uid);
          if (selected.has(uid)) {
            selected.delete(uid);
          } else if (selected.size < maximum) {
            selected.add(uid);
          } else {
            announceStatus(`Vous pouvez sélectionner au maximum ${maximum} monstres.`);
          }
          button.classList.toggle('selected', selected.has(uid));
          button.setAttribute('aria-pressed', selected.has(uid) ? 'true' : 'false');
          updateMultipleSelection();
        });
        decisionOptions.appendChild(button);
      });
      if (typeof request.selectionSummary === 'function') decisionOptions.appendChild(selectionSummary);
      confirmButton.addEventListener('click', () => finishDecision([...selected]));
      decisionOptions.appendChild(confirmButton);
      updateMultipleSelection();
      decisionCancelBtn.textContent = 'ANNULER';
      decisionCancelBtn.classList.toggle('hidden', request.required === true);
    } else if (Array.isArray(request.candidates) && request.candidates.length > 0) {
      decisionTitle.textContent = request.title || 'CHOISIR UNE CARTE';
      decisionDescription.textContent = request.description || 'Sélectionnez la cible de l’effet.';
      request.candidates.forEach(candidate => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'decision-card-option';
        const stats = candidate.atk === undefined
          ? ''
          : ` — ATK ${candidate.atk} / DEF ${candidate.def ?? '—'}`;
        button.textContent = candidate.label || `${candidate.name}${stats}`;
        button.addEventListener('click', () => finishDecision(candidate.uid));
        decisionOptions.appendChild(button);
      });
      decisionCancelBtn.textContent = request.type === 'chain-response'
        ? 'PASSER LA PRIORITÉ'
        : 'UTILISER LE CHOIX CONSEILLÉ';
      decisionCancelBtn.classList.toggle('hidden', request.required === true);
    } else {
      pendingDecisionResolver = null;
      resolve(undefined);
      return;
    }

    decisionModal.dataset.dismissible = request.required === true ? 'false' : 'true';
    openDialog(decisionModal, decisionOptions.querySelector('input[type="search"], button'));
  });
}

decisionCancelBtn?.addEventListener('click', () => finishDecision(null));

function requestUiChainOpportunity(request) {
  if (request?.side === 'opponent') return chooseAIChainResponse(game, request);
  if (!request || request.side !== 'player' || !request.candidates?.length) return null;
  const timing = request.context?.timingEvent || request.context?.event;
  const title = request.lastLink ? 'RÉPONDRE À LA CHAÎNE ?'
    : timing === 'PHASE_END' ? 'AVANT DE QUITTER LA PHASE'
      : timing === 'SUMMON_SUCCESS' ? 'RÉPONDRE À L’INVOCATION'
        : timing === 'ATTACK_DECLARATION' ? 'RÉPONDRE À L’ATTAQUE'
          : 'ACTIVER UN EFFET RAPIDE ?';
  return requestUiDecision({
    type: 'chain-response',
    side: 'player',
    title,
    description: 'Sélectionnez une réponse légale ou passez la priorité.',
    candidates: request.candidates.map(candidate => ({
      uid: candidate.cardUid,
      name: candidate.name,
      atk: undefined,
      def: undefined
    }))
  });
}

// Setup Custom Card Back Settings Modal
const settingsModal = document.getElementById('settings-modal');
const settingsBtn = document.getElementById('btn-settings');
const closeSettingsBtn = document.getElementById('btn-close-settings');
const inputCardBack = document.getElementById('input-card-back');
const presetBackButtons = document.querySelectorAll('.btn-preset-back');
const commentaryToggleBtn = document.getElementById('btn-toggle-commentary');
const realEnvironmentSelect = document.getElementById('select-real-environment');

function updateCommentaryControl() {
  if (!commentaryToggleBtn) return;
  const stateLabel = voiceCommentaryPreferred
    ? (uiMuted ? 'ON (SON GÉNÉRAL OFF)' : 'ON')
    : 'OFF';
  commentaryToggleBtn.textContent = `COMMENTAIRE VOCAL : ${stateLabel}`;
  commentaryToggleBtn.setAttribute('aria-pressed', voiceCommentaryPreferred ? 'true' : 'false');
  commentaryToggleBtn.classList.toggle('btn-magenta', voiceCommentaryPreferred);
}
updateCommentaryControl();

if (settingsModal && settingsBtn && closeSettingsBtn && inputCardBack) {
  settingsBtn.addEventListener('click', () => {
    inputCardBack.value = readStoredValue('custom_card_back', '');
    inputCardBack.removeAttribute('aria-invalid');
    if (realEnvironmentSelect) {
      realEnvironmentSelect.value = realBaseEnvironmentId;
    }
    openDialog(settingsModal, inputCardBack);
  });

  presetBackButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      inputCardBack.value = btn.dataset.url;
    });
  });

  closeSettingsBtn.addEventListener('click', () => {
    const requestedUrl = inputCardBack.value.trim();
    const validatedUrl = requestedUrl ? safeImageUrl(requestedUrl) : '';
    if (requestedUrl && !validatedUrl) {
      inputCardBack.setAttribute('aria-invalid', 'true');
      announceStatus("L’URL du dos de carte doit utiliser HTTP ou HTTPS.");
      inputCardBack.focus();
      return;
    }

    writeStoredValue('custom_card_back', validatedUrl);
    realBaseEnvironmentId = realEnvironmentSelect?.value === 'cave'
      ? 'cave'
      : 'clearing';
    writeStoredValue(STORAGE_KEYS.realBaseEnvironment, realBaseEnvironmentId);
    duelViewController?.setEnvironmentOptions({ baseEnvironmentId: realBaseEnvironmentId });
    inputCardBack.removeAttribute('aria-invalid');
    closeDialog(settingsModal);
    announceStatus('Dos de carte appliqué.');
    if (game) {
      updateUI(game);
    }
  });
}

commentaryToggleBtn?.addEventListener('click', () => {
  voiceCommentaryPreferred = !voiceCommentaryPreferred;
  speechAnnouncerEnabled = voiceCommentaryPreferred && !uiMuted;
  writeStoredValue(STORAGE_KEYS.voiceCommentary, String(voiceCommentaryPreferred));
  if (!speechAnnouncerEnabled) window.speechSynthesis?.cancel?.();
  updateCommentaryControl();
  announceStatus(
    voiceCommentaryPreferred
      ? 'Commentaire vocal activé.'
      : 'Commentaire vocal désactivé.'
  );
});

// The three presentations share the exact same DuelGame instance.  Only the
// immersive decorative layer is lazy-loaded when "Vue Réelle" is requested.
const toggleViewBtn = document.getElementById('btn-toggle-view');
const boardEl = document.getElementById('duel-board');
duelViewController = new DuelViewController({
  buttonElement: toggleViewBtn,
  boardElement: boardEl,
  gameState: game,
  environmentOptions: { baseEnvironmentId: realBaseEnvironmentId },
  onModeChange: mode => {
    updateResponsiveBoardScale();
    playSummon();
    const messages = {
      compact: 'Vue Compacte activée.',
      arena: 'Vue Arène activée : le plateau et les hologrammes sont espacés.',
      real: 'Vue Réelle 3D activée : vous êtes derrière votre console, face à l’adversaire.'
    };
    addLogEntry(messages[mode] || 'Vue du duel modifiée.', 'system');
    announceStatus(messages[mode] || 'Vue du duel modifiée.');
  },
  onError: error => {
    console.error('Vue Réelle indisponible :', error);
    addLogEntry('La Vue Réelle est indisponible. La vue classique reste jouable.', 'danger');
    announceStatus('Vue Réelle indisponible. Retour à la vue précédente.');
  }
});

// Next Phase button
const nextPhaseBtn = document.getElementById('btn-next-phase');
const endTurnBtn = document.getElementById('btn-end-turn');
const pendulumSummonBtn = document.getElementById('btn-pendulum-summon');
const pendulumStatus = document.getElementById('pendulum-status');
pendulumSummonBtn?.addEventListener('click', async () => {
  if (!game || game.isResolvingAction) return;
  const summoned = await game.performPendulumSummon('player');
  if (!summoned) {
    announceStatus('Aucune Invocation Pendule légale n’est actuellement disponible.');
  }
});
nextPhaseBtn.addEventListener('click', () => {
  if (!game || game.currentTurn !== 'player' || game.isResolvingAction) return;

  if (game.currentPhase === 'main1') {
    if (game.turnCount === 1) {
      game.changePhase('end');
    } else {
      game.changePhase('battle');
    }
  } else if (game.currentPhase === 'battle') {
    game.changePhase('main2');
  } else if (game.currentPhase === 'main2') {
    game.changePhase('end');
  }
});
endTurnBtn?.addEventListener('click', () => {
  if (
    !game
    || game.currentTurn !== 'player'
    || game.isResolvingAction
    || game.pendingSummon
    || game.pendingExtraSummon
    || game.isDiscarding
    || !['main1', 'battle', 'main2'].includes(game.currentPhase)
  ) {
    return;
  }
  game.changePhase('end');
});

function findLiveCardByUid(uid) {
  if (!game || !uid) return null;
  const collections = [
    game.playerHand,
    game.opponentHand,
    game.playerDeck,
    game.opponentDeck,
    game.playerMonsters,
    game.opponentMonsters,
    game.playerSpells,
    game.opponentSpells,
    game.playerGraveyard,
    game.opponentGraveyard,
    game.playerBanished,
    game.opponentBanished,
    game.playerExtraDeck,
    game.opponentExtraDeck,
    game.playerFaceUpExtraDeck,
    game.opponentFaceUpExtraDeck,
    (game.extraMonsterZones || []).map(entry => entry?.card),
    [game.playerFieldSpell, game.opponentFieldSpell]
  ];
  return collections
    .flat()
    .find(card => card && String(card.uid) === String(uid)) || null;
}

// Inspector works with mouse, touch, and keyboard, but only for public cards.
async function inspectVisibleCard(target) {
  const closestInspectable = target.closest?.(
    '.card-entity[data-card-visible="true"], .monster-hologram-entity[data-card-visible="true"]'
  );
  const inspectable = closestInspectable || (
    target.matches?.('.card-zone')
      ? target.querySelector(
        '.card-entity[data-card-visible="true"], .monster-hologram-entity[data-card-visible="true"]'
      )
      : null
  );
  if (!inspectable?.dataset.id) return;

  const liveCard = findLiveCardByUid(inspectable.dataset.uid);
  if (liveCard) {
    updateInspector(liveCard);
    return;
  }

  const card = await getCardById(inspectable.dataset.id);
  if (card) updateInspector(card);
}

document.addEventListener('mouseover', event => inspectVisibleCard(event.target));
document.addEventListener('focusin', event => inspectVisibleCard(event.target));
document.addEventListener('pointerup', event => inspectVisibleCard(event.target));
document.querySelectorAll('.field-zone').forEach(zone => {
  zone.setAttribute('role', 'button');
  zone.tabIndex = -1;
  zone.setAttribute('aria-disabled', 'true');
  zone.addEventListener('click', () => inspectVisibleCard(zone));
  zone.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      inspectVisibleCard(zone);
    }
  });
});

// Premade decks definition
const SANDBOX_PREMADE_DECKS = {
  kaiba: {
    main: [
      '89631139', '89631139', '89631139', // Blue-Eyes
      '13039848', '13039848', '13039848', // Giant Soldier
      '88819587', '88819587', '88819587', // Baby Dragon
      '83764718', '83764718', '83764718', // Reborn
      '12580477', '12580477', '12580477', // Raigeki
      '55144522', '55144522', '55144522', // Pot of Greed
      '04206964', '04206964', '04206964', // Trap Hole
      '91152256', '91152256', '91152256', // Celtic Guardian
      '63977008', '63977008', '63977008', // Junk Synchron
      '40640057', '40640057', '40640057', // Kuriboh
      '44095762', '44095762', '44095762', // Mirror Force
      '70781052', '70781052', '70781052', // Summoned Skull
      '46986414', '46986414', // Dark Magician
      '38033121', '38033121' // Dark Magician Girl
    ],
    extra: ['23995346', '44508094', '31924889', '84013237', '77637979']
  },
  yugi: {
    main: [
      '46986414', '46986414', '46986414', // Dark Magician
      '38033121', '38033121', '38033121', // DM Girl
      '40640057', '40640057', '40640057', // Kuriboh
      '91152256', '91152256', '91152256', // Celtic Guardian
      '83764718', '83764718', '83764718', // Reborn
      '55144522', '55144522', '55144522', // Pot
      '04206964', '04206964', '04206964', // Trap Hole
      '13039848', '13039848', '13039848', // Giant Soldier
      '63977008', '63977008', '63977008', // Junk Synchron
      '12580477', '12580477', '12580477', // Raigeki
      '44095762', '44095762', '44095762', // Mirror Force
      '70781052', '70781052', '70781052', // Summoned Skull
      '71625222', '71625222', // Time Wizard
      '88819587', '88819587' // Baby Dragon
    ],
    extra: ['31924889', '84013237', '77637979']
  },
  joey: {
    main: [
      '74677422', '74677422', '74677422', // Red-Eyes
      '71625222', '71625222', '71625222', // Time Wizard
      '88819587', '88819587', '88819587', // Baby Dragon
      '91152256', '91152256', '91152256', // Celtic Guardian
      '44095762', '44095762', '44095762', // Mirror Force
      '04206964', '04206964', '04206964', // Trap Hole
      '55144522', '55144522', '55144522', // Pot
      '83764718', '83764718', '83764718', // Reborn
      '13039848', '13039848', '13039848', // Giant Soldier
      '40640057', '40640057', '40640057', // Kuriboh
      '70781052', '70781052', '70781052', // Summoned Skull
      '38033121', '38033121', '38033121', // Dark Magician Girl
      '63977008', '63977008', // Junk Synchron
      '12580477', '12580477' // Raigeki
    ],
    extra: ['84013237', '77637979']
  }
};

// Legal Advanced-format presets built only from locally supported cards.
// Signature cards stay with their canonical Duel Monsters owner where the
// current pool permits it; generic cards complete the 40-card minimum.
const PREMADE_DECKS = {
  kaiba: {
    main: [
      '89631139', '89631139', '89631139', // Blue-Eyes White Dragon
      '05053103', '05053103', '05053103', // Battle Ox
      '97590747', '97590747', '97590747', // La Jinn
      '14898066', '14898066', '14898066', // Vorse Raider
      '66602787', '66602787', '26202165', // Saggi and Sangan search support
      '13039848', '13039848', '54652250', // defensive neutral and Flip destruction
      '48305365', '48305365', '81777047', // Axe Raider and Luminous Spark
      '49791927', '49791927', '50913601', // Tiger Axe and Mountain
      '24094653', '24094653', '24094653', // Polymerization
      '12580477', // Raigeki
      '05318639', '14087893', // Quick-Play interaction: MST and Book of Moon
      '44095762', '44095762', '44095762', // Mirror Force
      '04206964', '04206964', '04206964', // Trap Hole
      '83764718', // Monster Reborn — Limited 1
      '88819587', '88819587', '31560081' // Dragon support and Flip spell recovery
    ],
    extra: ['23995346', '84013237', '77637979'],
    side: ['40640057', '71625222', '46986414', '15025844', '70781052']
  },
  yugi: {
    main: [
      '46986414', '46986414', '46986414', // Dark Magician
      '38033121', '38033121', '38033121', // Dark Magician Girl
      '40640057', '40640057', '26202165', // Kuriboh and Sangan search support
      '91152256', '91152256', '91152256', // Celtic Guardian
      '13039848', '81380218', '54652250', // Giant Soldier, Chorus and Flip destruction
      '15025844', '15025844', '31560081', // Mystical Elf and Magician of Faith
      '05405694', '05405694', // Black Luster Soldier
      '55761792', '55761792', // Black Luster Ritual
      '94415058', '94415058', // Stargazer Magician
      '20409757', '20409757', // Timegazer Magician
      '06368038', '18161786', // Gaia and Mystic Plasma Zone
      '70781052', '70781052', // Summoned Skull
      '12580477', // Raigeki
      '05318639', '14087893', // Quick-Play interaction: MST and Book of Moon
      '44095762', '44095762', '44095762', // Mirror Force
      '04206964', '04206964', '04206964', // Trap Hole
      '83764718' // Monster Reborn — Limited 1
    ],
    extra: ['84013237', '77637979'],
    side: ['05053103', '97590747', '14898066', '66602787', '88819587']
  },
  joey: {
    main: [
      '74677422', '74677422', '74677422', // Red-Eyes Black Dragon
      '71625222', '71625222', '71625222', // Time Wizard
      '88819587', '88819587', '88819587', // Baby Dragon
      '48305365', '48305365', '48305365', // Axe Raider
      '64428736', '64428736', '56594520', // Alligator's Sword and Gaia Power
      '44287299', '44287299', '54652250', // Masaki and Flip destruction
      '49791927', '49791927', '26202165', // Tiger Axe and Sangan search support
      '05053103', '05053103', '86318356', // Battle Ox and Sogen
      '91152256', '91152256', '91152256', // warrior support
      '12580477', // Raigeki
      '05318639', '14087893', // Quick-Play interaction: MST and Book of Moon
      '44095762', '44095762', '44095762', // Mirror Force
      '04206964', '04206964', '04206964', // Trap Hole
      '83764718', // Monster Reborn — Limited 1
      '13039848', '13039848', '31560081' // defensive neutral and Flip spell recovery
    ],
    extra: ['84013237', '77637979'],
    side: ['40640057', '46986414', '38033121', '15025844', '97590747']
  }
};

let selectedGameMode = ['sandbox', 'native'].includes(readStoredValue(STORAGE_KEYS.gameMode))
  ? readStoredValue(STORAGE_KEYS.gameMode)
  : 'strict';
let nativeCatalogueResources = null;
let nativeCatalogueToolkit = null;
let nativeCataloguePromise = null;
let nativeTcgPolicy = null;
const nativeBuilderOptions = (mode = selectedGameMode) => {
  const options = { native: mode !== 'sandbox', format: mode === 'native' ? 'ALL' : 'TCG' };
  if (!nativeCatalogueResources || !nativeCatalogueToolkit) return options;
  return { ...options, ...(mode === 'strict' ? nativeTcgPolicy : {}),
    isSupportedCard: (card, section) => nativeCatalogueToolkit.isSupportedNativeCatalogueCard(nativeCatalogueResources, card, section),
    getCopyIdentity: mode === 'strict' ? nativeTcgPolicy.getCopyIdentity
      : card => nativeCatalogueToolkit.getNativeCardCopyIdentity(nativeCatalogueResources, card) };
};
const activeLibraryTemplates = () => {
  if (selectedGameMode === 'sandbox') return [...STARTER_CARDS, ...EXTRA_DECK_CARDS];
  const query = document.getElementById('builder-card-search')?.value.trim();
  if (!nativeCatalogueResources || !query) return NATIVE_CARDS;
  return selectedGameMode === 'strict'
    ? nativeCatalogueToolkit.searchNativeTcgCardCatalogue(nativeCatalogueResources, query, { limit: 100 })
    : nativeCatalogueToolkit.searchNativeCardCatalogue(nativeCatalogueResources, query, { limit: 100 });
};

async function ensureNativeCatalogue() {
  if (nativeCatalogueResources) return nativeCatalogueResources;
  if (nativeCataloguePromise) return nativeCataloguePromise;
  nativeCataloguePromise = (async () => {
    const [toolkit, resources] = await Promise.all([
      import('./src/core/native/NativeCardCatalogue.js'), loadNativeCardResources()
    ]);
    nativeCatalogueToolkit = toolkit;
    nativeCatalogueResources = resources;
    nativeTcgPolicy = createTcgFormatPolicy(resources);
    for (const id of [...NATIVE_CARDS.map(card => card.id), ...customDeckMainIds, ...customDeckExtraIds, ...customDeckSideIds]) {
      const card = toolkit.createNativeTcgCardTemplate(resources, id) ?? toolkit.createNativeCardTemplate(resources, id);
      if (card) {
        knownCardTemplates.set(String(id), card);
        knownCardTemplates.set(String(card.id), card);
        canonicalCardTemplates.set(normalizeStrictCardId(id), card);
        canonicalCardTemplates.set(normalizeStrictCardId(card.id), card);
      }
    }
    return resources;
  })();
  try { return await nativeCataloguePromise; }
  finally { nativeCataloguePromise = null; }
}
let selectedAiDifficulty = ['easy', 'normal', 'hard'].includes(readStoredValue(STORAGE_KEYS.difficulty))
  ? readStoredValue(STORAGE_KEYS.difficulty)
  : 'normal';
let selectedDuelSeries = readStoredValue(STORAGE_KEYS.duelSeries) === 'match'
  ? 'match'
  : 'single';
if (selectedDuelSeries === 'match' && selectedGameMode !== 'strict') selectedGameMode = 'strict';
let currentSelectedDeckId = 'kaiba';

function isTemplateExtraDeckCard(card) {
  return Boolean(
    card?.belongsInExtraDeck
    || card?.extra_type
    || /Fusion|Synchro|Xyz|Link/i.test(card?.type || '')
  );
}

const knownCardTemplates = new Map(
  NATIVE_CARDS.map(template => [String(template.id), template])
);

const canonicalCardTemplates = new Map(
  NATIVE_CARDS.map(template => [normalizeStrictCardId(template.id), template])
);

function canonicalCustomDeckIds(ids) {
  return (Array.isArray(ids) ? ids : []).flatMap(id => {
    const template = canonicalCardTemplates.get(normalizeStrictCardId(id));
    return template ? [String(template.id)] : /^\d{1,9}$/.test(String(id)) && Number(id) > 0 ? [normalizeStrictCardId(id)] : [];
  });
}

function normalizeCustomDeckIds(mainIds, extraIds) {
  return {
    main: canonicalCustomDeckIds(mainIds)
      .filter(id => {
        const template = knownCardTemplates.get(id);
        return !template || !isTemplateExtraDeckCard(template);
      }),
    extra: canonicalCustomDeckIds(extraIds)
      .filter(id => !knownCardTemplates.has(id) || isTemplateExtraDeckCard(knownCardTemplates.get(id)))
  };
}

const savedCustomDeck = readStoredJson(STORAGE_KEYS.customDeck, { main: [], extra: [] });
const normalizedSavedCustomDeck = normalizeCustomDeckIds(savedCustomDeck.main, savedCustomDeck.extra);
let customDeckMainIds = normalizedSavedCustomDeck.main;
let customDeckExtraIds = normalizedSavedCustomDeck.extra;
let customDeckSideIds = canonicalCustomDeckIds(savedCustomDeck.side);
if (
  JSON.stringify(savedCustomDeck.main || []) !== JSON.stringify(customDeckMainIds)
  || JSON.stringify(savedCustomDeck.extra || []) !== JSON.stringify(customDeckExtraIds)
  || JSON.stringify(savedCustomDeck.side || []) !== JSON.stringify(customDeckSideIds)
) {
  writeStoredValue(STORAGE_KEYS.customDeck, JSON.stringify({ ...normalizedSavedCustomDeck, side: customDeckSideIds }));
}
const storedStatistics = readStoredJson(STORAGE_KEYS.statistics, {});
let duelStatistics = {
  duels: Math.max(0, Number(storedStatistics.duels) || 0),
  wins: Math.max(0, Number(storedStatistics.wins) || 0),
  losses: Math.max(0, Number(storedStatistics.losses) || 0),
  draws: Math.max(0, Number(storedStatistics.draws) || 0),
  reasons: {
    lp_zero: Math.max(0, Number(storedStatistics.reasons?.lp_zero) || 0),
    deck_out: Math.max(0, Number(storedStatistics.reasons?.deck_out) || 0),
    exodia: Math.max(0, Number(storedStatistics.reasons?.exodia) || 0),
    surrender: Math.max(0, Number(storedStatistics.reasons?.surrender) || 0),
    draw: Math.max(0, Number(storedStatistics.reasons?.draw) || 0),
    other: Math.max(0, Number(storedStatistics.reasons?.other) || 0)
  },
  last: storedStatistics.last && typeof storedStatistics.last === 'object'
    ? storedStatistics.last
    : null
};

function getDuelistAvatarContext() {
  return {
    statistics: duelStatistics,
    campaignProgress: campaignController.progress,
    earnedAvatarIds: duelistAvatarProfile?.earnedAvatarIds || []
  };
}

function persistDuelistAvatarProfile() {
  if (duelistAvatarStorageBlocked) return false;
  return writeStoredValue(STORAGE_KEYS.duelistAvatar, JSON.stringify(duelistAvatarProfile));
}

function synchronizeDuelistAvatarAppearance(opponentAvatarId = currentOpponentAvatarId) {
  const playerAvatar = getDuelistAvatar(duelistAvatarProfile?.selectedAvatarId)
    || getDuelistAvatar(DEFAULT_DUELIST_AVATAR_ID);
  const opponentAvatar = getDuelistAvatar(opponentAvatarId) || getDuelistAvatar('kaiba');
  currentOpponentAvatarId = opponentAvatar.id;
  const identities = { playerAvatarId: playerAvatar.id, opponentAvatarId: opponentAvatar.id };
  duelViewController?.setDuelistAvatars?.(identities);
  const playerLabel = document.getElementById('player-label');
  if (playerLabel) {
    playerLabel.textContent = `${playerAvatar.name.toLocaleUpperCase('fr')} (VOUS)`;
    playerLabel.setAttribute('data-avatar-id', playerAvatar.id);
    playerLabel.setAttribute('title', playerAvatar.name);
  }
  return identities;
}

function refreshDuelistAvatarUnlocks({ persist = true } = {}) {
  const result = collectDuelistAvatarUnlocks(duelistAvatarProfile, getDuelistAvatarContext());
  duelistAvatarProfile = result.profile;
  const state = getDuelistAvatarUnlockState(duelistAvatarProfile.selectedAvatarId, getDuelistAvatarContext());
  const selectionChanged = !state.unlocked;
  if (selectionChanged) duelistAvatarProfile = { ...duelistAvatarProfile, selectedAvatarId: DEFAULT_DUELIST_AVATAR_ID };
  if (persist && (result.newlyUnlocked.length || selectionChanged)) persistDuelistAvatarProfile();
  duelistAvatarPicker?.render();
  synchronizeDuelistAvatarAppearance();
  return result.newlyUnlocked;
}

function chooseHumanDuelistAvatar(id) {
  const choice = selectDuelistAvatar(duelistAvatarProfile, id, getDuelistAvatarContext());
  if (!choice.accepted) return choice;
  duelistAvatarProfile = choice.profile;
  // Explicitly choosing an avatar replaces only this cosmetic preference.
  duelistAvatarStorageBlocked = false;
  const saved = persistDuelistAvatarProfile();
  synchronizeDuelistAvatarAppearance();
  const message = saved
    ? `Avatar ${getDuelistAvatar(id).name} sélectionné et enregistré.`
    : 'Avatar sélectionné pour cette session. Le navigateur a refusé la sauvegarde locale.';
  announceStatus(message);
  return { ...choice, saved, message };
}

function initializeDuelistAvatarSelection() {
  const checked = validateDuelistAvatarProfile(readStoredValue(STORAGE_KEYS.duelistAvatar));
  duelistAvatarProfile = checked.profile;
  duelistAvatarStorageBlocked = !checked.valid;
  refreshDuelistAvatarUnlocks();
  const rootElement = document.getElementById('duelist-avatar-picker-root');
  const dialogElement = document.getElementById('duelist-avatar-modal');
  if (!rootElement || !dialogElement) return;
  duelistAvatarPicker = new DuelistAvatarPicker({
    rootElement, dialogElement,
    getProfile: () => duelistAvatarProfile,
    getContext: getDuelistAvatarContext,
    onSelect: chooseHumanDuelistAvatar,
    openDialog: (dialog, focus) => {
      refreshDuelistAvatarUnlocks();
      duelistAvatarReturnDialog = activeDialog;
      openDialog(dialog, focus);
    },
    closeDialog: dialog => {
      const ownedDialog = activeDialog === dialog;
      const returnDialog = duelistAvatarReturnDialog;
      duelistAvatarReturnDialog = null;
      closeDialog(dialog, { restoreFocus: false });
      if (ownedDialog && returnDialog && returnDialog !== dialog) {
        const focusId = returnDialog.id === 'start-modal' ? 'duelist-avatar-open' : 'btn-settings-avatars';
        openDialog(returnDialog, document.getElementById(focusId));
      }
    }
  });
  document.getElementById('btn-settings-avatars')?.addEventListener('click', () => duelistAvatarPicker.open());
}

initializeDuelistAvatarSelection();

// Setup choice selector interaction
const choiceCards = document.querySelectorAll('.deck-choice-card');
const deckBuilderSec = document.getElementById('deck-builder-section');
const gameModeInputs = document.querySelectorAll('input[name="game-mode"]');
const difficultyInputs = document.querySelectorAll('input[name="ai-difficulty"]');
const duelSeriesInputs = document.querySelectorAll('input[name="duel-series"]');
const modeDescription = document.getElementById('mode-description');
const sandboxPanel = document.getElementById('sandbox-panel');
const statisticsDisplay = document.getElementById('duel-statistics');

function saveCustomDeck() {
  const normalized = normalizeCustomDeckIds(customDeckMainIds, customDeckExtraIds);
  customDeckMainIds = normalized.main;
  customDeckExtraIds = normalized.extra;
  customDeckSideIds = canonicalCustomDeckIds(customDeckSideIds);
  const saved = writeStoredValue(STORAGE_KEYS.customDeck, JSON.stringify({
    main: customDeckMainIds,
    extra: customDeckExtraIds,
    side: customDeckSideIds
  }));
  if (!saved) {
    announceStatus('Le navigateur a refusé la sauvegarde locale du Deck. Il reste utilisable pour cette session.');
  }
  return saved;
}

function renderDuelStatistics() {
  if (!statisticsDisplay) return;
  const drawText = duelStatistics.draws > 0 ? ` · ${duelStatistics.draws} nul` : '';
  statisticsDisplay.textContent = `${duelStatistics.duels} duel${duelStatistics.duels > 1 ? 's' : ''}`
    + ` · ${duelStatistics.wins} victoire${duelStatistics.wins > 1 ? 's' : ''}`
    + ` · ${duelStatistics.losses} défaite${duelStatistics.losses > 1 ? 's' : ''}${drawText}`;
  if (duelStatistics.last?.reasonLabel) {
    statisticsDisplay.textContent += ` · Dernière fin : ${duelStatistics.last.reasonLabel}`;
  }
}

function selectDeckChoice(card) {
  if (!card || card.disabled) return;
  choiceCards.forEach(choice => {
    choice.classList.toggle('active', choice === card);
    choice.setAttribute('aria-pressed', choice === card ? 'true' : 'false');
  });

  currentSelectedDeckId = card.dataset.deckId;
  const isCustom = currentSelectedDeckId === 'custom';
  deckBuilderSec.classList.toggle('hidden', !isCustom);
  if (isCustom) {
    initDeckBuilderUI();
  } else {
    startBtn.disabled = false;
    startBtn.setAttribute('aria-disabled', 'false');
  }
}

function updateModeControls() {
  gameModeInputs.forEach(input => {
    input.checked = input.value === selectedGameMode;
  });
  difficultyInputs.forEach(input => {
    input.checked = input.value === selectedAiDifficulty;
  });
  duelSeriesInputs.forEach(input => {
    input.checked = input.value === selectedDuelSeries;
  });

  const strictMode = selectedGameMode === 'strict';
  const sandboxMode = selectedGameMode === 'sandbox';
  const matchMode = selectedDuelSeries === 'match';
  const timeOption = document.getElementById('match-time-limit');
  if (timeOption) timeOption.disabled = !matchMode;
  const sandboxModeInput = document.querySelector('input[name="game-mode"][value="sandbox"]');
  const nativeModeInput = document.querySelector('input[name="game-mode"][value="native"]');
  if (nativeModeInput) nativeModeInput.disabled = matchMode;
  if (sandboxModeInput) {
    sandboxModeInput.disabled = matchMode;
    sandboxModeInput.setAttribute('aria-disabled', matchMode ? 'true' : 'false');
    sandboxModeInput.setAttribute('aria-describedby', 'mode-description');
  }
  const customChoice = document.querySelector('.deck-choice-card[data-deck-id="custom"]');
  if (customChoice) {
    customChoice.disabled = false;
    customChoice.classList.remove('hidden');
    customChoice.setAttribute('aria-hidden', 'false');
  }

  if (currentSelectedDeckId === 'custom') initDeckBuilderUI();

  if (sandboxPanel) {
    sandboxPanel.classList.toggle('hidden', !sandboxMode);
    sandboxPanel.setAttribute('aria-hidden', sandboxMode ? 'false' : 'true');
  }
  const sandboxSearchInput = document.getElementById('search-input');
  if (sandboxSearchInput) {
    sandboxSearchInput.disabled = !sandboxMode;
    sandboxSearchInput.setAttribute('aria-disabled', sandboxMode ? 'false' : 'true');
  }

  if (modeDescription) {
    modeDescription.textContent = strictMode
      ? (matchMode
        ? 'Match TCG Advanced : Side Deck, choix du premier joueur et premier à deux victoires.'
        : 'TCG Advanced : catalogue natif et liste complète des cartes interdites, limitées et semi-limitées.')
      : selectedGameMode === 'native' ? 'Duel libre : les 339 Terrains TCG, OCG et annoncés, avec leurs effets complets. Trois copies par nom ; Main Deck de 40 à 60 cartes.' : 'Anime Sandbox : recherche API et expérimentations libres activées.';
  }
}

gameModeInputs.forEach(input => {
  input.addEventListener('change', () => {
    if (!input.checked) return;
    selectedGameMode = ['sandbox', 'native'].includes(input.value) ? input.value : 'strict';
    writeStoredValue(STORAGE_KEYS.gameMode, selectedGameMode);
    updateModeControls();
    announceStatus(selectedGameMode === 'strict' ? 'Mode TCG Advanced strict sélectionné.' : selectedGameMode === 'native' ? 'Duel libre avec tous les Terrains sélectionné.' : 'Mode Anime Sandbox sélectionné.');
  });
});

difficultyInputs.forEach(input => {
  input.addEventListener('change', () => {
    if (!input.checked) return;
    selectedAiDifficulty = ['easy', 'hard'].includes(input.value) ? input.value : 'normal';
    writeStoredValue(STORAGE_KEYS.difficulty, selectedAiDifficulty);
    announceStatus(`Difficulté ${input.parentElement.textContent.trim()} sélectionnée.`);
  });
});

const matchTimeOption = document.getElementById('match-time-limit');
if (matchTimeOption) {
  matchTimeOption.checked = readStoredValue(STORAGE_KEYS.matchTimeLimit) === 'true';
  matchTimeOption.addEventListener('change', () => {
    writeStoredValue(STORAGE_KEYS.matchTimeLimit, String(matchTimeOption.checked));
  });
}

duelSeriesInputs.forEach(input => {
  input.addEventListener('change', () => {
    if (!input.checked) return;
    selectedDuelSeries = input.value === 'match' ? 'match' : 'single';
    if (selectedDuelSeries === 'match' && selectedGameMode !== 'strict') {
      selectedGameMode = 'strict';
      writeStoredValue(STORAGE_KEYS.gameMode, selectedGameMode);
    }
    writeStoredValue(STORAGE_KEYS.duelSeries, selectedDuelSeries);
    updateModeControls();
    announceStatus(
      selectedDuelSeries === 'match'
        ? 'Format Match officiel, premier à deux victoires, sélectionné.'
        : 'Format Duel unique sélectionné.'
    );
  });
});

choiceCards.forEach(card => {
  card.addEventListener('click', () => {
    selectDeckChoice(card);
  });
});

document.getElementById('builder-add-to-side')?.addEventListener('change', initDeckBuilderUI);
document.querySelectorAll('[data-builder-preset]').forEach(button => {
  button.addEventListener('click', () => {
    const collection = selectedGameMode !== 'sandbox' ? PREMADE_DECKS : SANDBOX_PREMADE_DECKS;
    const preset = collection[button.dataset.builderPreset];
    if (!preset) return;
    customDeckMainIds = [...preset.main];
    customDeckExtraIds = [...preset.extra];
    customDeckSideIds = [...(preset.side || [])];
    saveCustomDeck();
    initDeckBuilderUI();
    announceStatus(`Deck personnalisé remplacé par le preset ${button.dataset.builderPreset.toUpperCase()}.`);
  });
});

function getCustomDeckCards() {
  const resolve = ids => ids.map(id => knownCardTemplates.get(id) || { id, name: `Carte ${id} — chargement requis`, card_type: 'unknown' });
  return {
    mainDeck: resolve(customDeckMainIds),
    extraDeck: resolve(customDeckExtraIds),
    sideDeck: resolve(customDeckSideIds)
  };
}

function builderDestination(template) {
  return document.getElementById('builder-add-to-side')?.checked ? 'sideDeck'
    : isTemplateExtraDeckCard(template) ? 'extraDeck' : 'mainDeck';
}

function updateDeckBuilderLibrary() {
  const deck = getCustomDeckCards();
  const allCards = [...deck.mainDeck, ...deck.extraDeck, ...deck.sideDeck];
  document.querySelectorAll('#library-cards-list [data-card-id]').forEach(button => {
    const template = knownCardTemplates.get(button.dataset.cardId);
    const destination = builderDestination(template);
    const permission = canAddDeckBuilderCard(deck, template, destination, selectedGameMode, nativeBuilderOptions());
    const copyIdentity = nativeBuilderOptions().getCopyIdentity || getDeckCopyIdentity;
    const count = allCards.filter(card => copyIdentity(card) === copyIdentity(template)).length;
    const limit = getDeckBuilderCopyLimit(template, selectedGameMode, nativeBuilderOptions());
    button.disabled = !permission.allowed;
    button.title = permission.allowed ? `${template.name} — ${count}/${limit} copies`
      : permission.message;
    button.setAttribute('aria-label', `Ajouter ${template.name} ${destination === 'sideDeck' ? 'au Side Deck' : 'au deck'}`);
    button.querySelector('.builder-card-count').textContent = limit === 0 ? 'INTERDITE' : `${count}/${limit}`;
  });
}

updateModeControls();
renderDuelStatistics();

// Render the catalog of cards and current custom deck items
function filterDeckBuilderLibrary() {
  const needle = (document.getElementById('builder-card-search')?.value || '').trim().toLocaleLowerCase();
  document.querySelectorAll('#library-cards-list [data-card-id]').forEach(button => {
    const card = knownCardTemplates.get(button.dataset.cardId);
    const kind = document.getElementById('builder-card-filter')?.value || 'all';
    const wrongType = kind === 'field' ? !isFieldSpellCard(card) : kind !== 'all' && card?.card_type !== kind;
    const wrongQuery = Boolean(needle) && !`${card?.name} ${card?.name_en} ${card?.id} ${card?.desc || ''}`.toLocaleLowerCase().includes(needle);
    button.hidden = wrongType || (selectedGameMode !== 'sandbox' && nativeCatalogueResources ? false : wrongQuery);
  });
}
document.getElementById('builder-card-search')?.addEventListener('input', () => {
  if (selectedGameMode !== 'sandbox' && nativeCatalogueResources) initDeckBuilderUI();
  else filterDeckBuilderLibrary();
});
document.getElementById('builder-card-filter')?.addEventListener('change', filterDeckBuilderLibrary);

function initDeckBuilderUI() {
  const libraryContainer = document.getElementById('library-cards-list');
  libraryContainer.innerHTML = '';

  // Combine all normal starter cards + extra cards for the pool
  const allCardTemplates = activeLibraryTemplates();

  allCardTemplates.forEach(template => {
    knownCardTemplates.set(String(template.id), template);
    canonicalCardTemplates.set(normalizeStrictCardId(template.id), template);
    const cardItem = document.createElement('button');
    cardItem.type = 'button';
    cardItem.className = 'builder-card-item';
    cardItem.dataset.cardId = String(template.id);
    cardItem.style.backgroundImage = `url("${template.image_url_cropped || getCardCroppedImageUrl(template.id)}")`;
    if (template.nativeCatalogueOnly) {
      const label = document.createElement('span');
      label.className = 'builder-card-name';
      label.textContent = template.name;
      cardItem.appendChild(label);
    }
    const count = document.createElement('span');
    count.className = 'builder-card-count';
    cardItem.appendChild(count);

    // Add event to add to my custom deck
    cardItem.addEventListener('click', () => {
      const destination = builderDestination(template);
      const permission = canAddDeckBuilderCard(getCustomDeckCards(), template, destination, selectedGameMode, nativeBuilderOptions());
      if (!permission.allowed) return announceStatus(permission.message);
      const targetList = destination === 'sideDeck' ? customDeckSideIds
        : destination === 'extraDeck' ? customDeckExtraIds : customDeckMainIds;
      targetList.push(String(template.id));
      saveCustomDeck();
      updateDeckBuilderList();
    });

    libraryContainer.appendChild(cardItem);
  });

  updateDeckBuilderList();
  filterDeckBuilderLibrary();
  const catalogueStatus = document.getElementById('builder-catalogue-status');
  if (selectedGameMode !== 'sandbox') {
    if (nativeCatalogueResources) {
      const count = selectedGameMode === 'strict'
        ? nativeCatalogueToolkit.getNativeTcgCardCatalogueCount(nativeCatalogueResources)
        : nativeCatalogueToolkit.getNativeCardCatalogueCount(nativeCatalogueResources);
      if (catalogueStatus) catalogueStatus.textContent = `${count.toLocaleString('fr-FR')} cartes ${selectedGameMode === 'strict' ? 'TCG • liste Advanced complète du 21/09/2026' : 'avec règles natives • Duel libre'}. Recherchez une carte, un nom ou un effet ; 100 résultats maximum. Les cartes sans illustration locale utilisent un visuel neutre.`;
    } else {
      if (catalogueStatus) catalogueStatus.textContent = 'Chargement du catalogue et des règles de cartes…';
      if (!nativeCataloguePromise) ensureNativeCatalogue().then(() => {
        if (selectedGameMode !== 'sandbox' && currentSelectedDeckId === 'custom') initDeckBuilderUI();
      }).catch(() => {
        if (catalogueStatus) catalogueStatus.textContent = 'Chargement impossible. Changez de mode puis réessayez.';
      });
    }
  } else if (catalogueStatus) catalogueStatus.textContent = 'Bibliothèque illustrée : 339 Terrains et 51 autres cartes. La disponibilité et les restrictions TCG sont indiquées sur chaque carte.';
}

function updateDeckBuilderList() {
  const normalized = normalizeCustomDeckIds(customDeckMainIds, customDeckExtraIds);
  customDeckMainIds = normalized.main;
  customDeckExtraIds = normalized.extra;
  customDeckSideIds = canonicalCustomDeckIds(customDeckSideIds);
  const deckListContainer = document.getElementById('builder-my-deck-list');
  deckListContainer.innerHTML = '';

  for (const [label, ids] of [
    ['Main Deck', customDeckMainIds], ['Extra Deck', customDeckExtraIds], ['Side Deck', customDeckSideIds]
  ]) {
    const section = document.createElement('section');
    const heading = document.createElement('h3');
    heading.className = 'builder-section-title';
    heading.textContent = `${label} (${ids.length})`;
    section.appendChild(heading);
    const grid = document.createElement('div');
    grid.className = 'builder-cards-grid';
    ids.forEach((id, index) => {
      const template = knownCardTemplates.get(id) || { id, name: `Carte ${id} — chargement requis`, image_url_cropped: '/cards/native-unknown.png', nativeCatalogueOnly: true };
      const cardItem = document.createElement('button');
      cardItem.type = 'button';
      cardItem.className = 'builder-card-item';
      cardItem.style.backgroundImage = `url("${template.image_url_cropped || getCardCroppedImageUrl(template.id)}")`;
      if (template.nativeCatalogueOnly) {
        const cardName = document.createElement('span');
        cardName.className = 'builder-card-name';
        cardName.textContent = template.name;
        cardItem.appendChild(cardName);
      }
      cardItem.title = `${template.name} (Cliquez pour retirer)`;
      cardItem.setAttribute('aria-label', `Retirer ${template.name} du ${label}`);
      cardItem.addEventListener('click', () => {
        ids.splice(index, 1);
        saveCustomDeck();
        updateDeckBuilderList();
      });
      grid.appendChild(cardItem);
    });
    section.appendChild(grid);
    deckListContainer.appendChild(section);
  }

  // Update stats
  const totalCount = customDeckMainIds.length;
  document.getElementById('deck-size-val').textContent = `Main: ${totalCount} / Extra: ${customDeckExtraIds.length} / Side: ${customDeckSideIds.length}`;

  const validityBadge = document.getElementById('deck-validity-badge');
  const validation = validateCustomDeck(getCustomDeckCards(), selectedGameMode, nativeBuilderOptions());
  const customDeckIsValid = validation.valid;
  validityBadge.setAttribute('aria-live', 'polite');
  if (customDeckIsValid) {
    validityBadge.textContent = "Deck valide";
    validityBadge.className = "badge-status success";
  } else {
    validityBadge.textContent = validation.message;
    validityBadge.className = "badge-status danger";
  }
  updateDeckBuilderLibrary();

  if (currentSelectedDeckId === 'custom') {
    startBtn.disabled = !customDeckIsValid;
    startBtn.setAttribute('aria-disabled', customDeckIsValid ? 'false' : 'true');
  }
}

function chooseRandomParticipant() {
  try {
    if (globalThis.crypto?.getRandomValues) {
      const randomValues = new Uint32Array(1);
      globalThis.crypto.getRandomValues(randomValues);
      return randomValues[0] % 2 === 0 ? 'player' : 'opponent';
    }
  } catch {
    // Math.random is an acceptable local fallback for the opening method.
  }
  return Math.random() < 0.5 ? 'player' : 'opponent';
}

async function resolveOpeningFirstPlayer(sessionLabel = 'Duel') {
  const chooser = chooseRandomParticipant();
  if (chooser === 'opponent') {
    return { chooser, firstPlayer: 'opponent' };
  }
  const decision = await requestUiDecision({
    type: 'select-first-player',
    side: 'player',
    title: 'CHOIX DU PREMIER JOUEUR',
    description: `Vous avez remporté la méthode aléatoire. Qui commencera le ${sessionLabel} ?`,
    required: true,
    choices: [
      { value: 'player', label: 'JE COMMENCE' },
      { value: 'opponent', label: "L'ADVERSAIRE COMMENCE" }
    ]
  });
  return {
    chooser,
    firstPlayer: ['player', 'opponent'].includes(decision) ? decision : 'player'
  };
}

/**
 * Initializes the game core
 */
async function initGameInstance(matchLaunch = null) {
  privateCardInspection.clear();
  publicCardConfirmation.clear();
  const launchGeneration = ++duelLaunchGeneration;
  let launchMatch = matchLaunch ? matchController : null;
  const currentLaunch = () => {
    if (launchGeneration !== duelLaunchGeneration) return false;
    if (matchClock?.expired) { finishMatchAtTime(); return false; }
    return !launchMatch || (matchController === launchMatch && launchMatch.getViewModel().status === 'active');
  };
  const campaignMission = getMission(activeCampaignMissionId);
  campaignTracker = null;
  // Every Duel starts in the unchanged compact presentation.  Switching views
  // later never resets the game state.
  await duelViewController?.setMode('compact');
  if (!currentLaunch()) return;
  lpAnimationFrames.forEach(frameId => cancelAnimationFrame(frameId));
  lpAnimationFrames.clear();
  cancelUiAnimations();
  cancelBoardAnimations(document.getElementById('duel-board'));
  activeDuelInProgress = false;
  lastDuelResult = null;

  if (typeof game?.dispose === 'function') game.dispose();
  else if (typeof game?.destroy === 'function') game.destroy();
  else game?.cancelPendingAsyncWork?.();

  if (pendingDecisionResolver) {
    finishDecision(null);
  }

  // Clear any old UI elements on board
  document.querySelectorAll('.card-zone').forEach(z => z.innerHTML = '');
  document.getElementById('log-content').innerHTML = '';
  document.body.classList.remove('duel-ended');
  closeDialog(actionModal, { restoreFocus: false });
  closeDialog(extraModal, { restoreFocus: false });
  closeDialog(publicZoneModal, { restoreFocus: false });
  closeDialog(settingsModal, { restoreFocus: false });
  duelistAvatarReturnDialog = null;
  closeDialog(document.getElementById('duelist-avatar-modal'), { restoreFocus: false });
  closeDialog(document.getElementById('side-deck-modal'), { restoreFocus: false });

  selectedAttackerIndex = null;
  currentDraggedUid = null;
  selectedHandUid = null;
  pendingAction = null;
  previousPendulumAvailable = false;

  if (selectedGameMode !== 'sandbox') {
    try { await ensureNativeCatalogue(); }
    catch {
      if (!currentLaunch()) return;
      stopHologramHum();
      openDialog(startModal, startBtn);
      announceStatus('Le chargement des cartes partenaires a échoué. Réessayez.');
      return;
    }
    if (!currentLaunch()) return;
  }

  // 1. Resolve selected deck
  let mainIds = [];
  let extraIds = [];
  let sideIds = [];

  if (currentSelectedDeckId === 'custom' && !campaignMission && !matchLaunch) {
    const normalized = normalizeCustomDeckIds(customDeckMainIds, customDeckExtraIds);
    customDeckMainIds = normalized.main;
    customDeckExtraIds = normalized.extra;
    customDeckSideIds = canonicalCustomDeckIds(customDeckSideIds);
    const validation = validateCustomDeck(getCustomDeckCards(), selectedGameMode, nativeBuilderOptions());
    if (!validation.valid) {
      announceStatus(validation.message);
      openDialog(startModal, document.getElementById('deck-validity-badge'));
      return;
    }
    mainIds = [...customDeckMainIds];
    extraIds = [...customDeckExtraIds];
    sideIds = [...customDeckSideIds];
  } else {
    const deckCollection = selectedGameMode !== 'sandbox'
      ? PREMADE_DECKS
      : SANDBOX_PREMADE_DECKS;
    const premade = deckCollection[currentSelectedDeckId] || deckCollection.kaiba;
    mainIds = [...premade.main];
    extraIds = [...premade.extra];
    sideIds = [...(premade.side || [])];
  }

  // Find card templates
  const allTemplates = [...knownCardTemplates.values()];
  let playerMainCards = mainIds.map(id => allTemplates.find(t => normalizeStrictCardId(t.id) === normalizeStrictCardId(id))).filter(Boolean);
  let playerExtraCards = extraIds.map(id => allTemplates.find(t => normalizeStrictCardId(t.id) === normalizeStrictCardId(id))).filter(Boolean);
  let playerSideCards = sideIds.map(id => allTemplates.find(t => normalizeStrictCardId(t.id) === normalizeStrictCardId(id))).filter(Boolean);

  // Avoid mirror-character duels: Yugi faces Kaiba, the other presets face Yugi.
  const opponentDeckId = currentSelectedDeckId === 'yugi' ? 'kaiba' : 'yugi';
  const deckCollection = selectedGameMode !== 'sandbox'
    ? PREMADE_DECKS
    : SANDBOX_PREMADE_DECKS;
  const opponentPreset = deckCollection[opponentDeckId];
  let opponentMainCards = opponentPreset.main.map(id => allTemplates.find(t => normalizeStrictCardId(t.id) === normalizeStrictCardId(id))).filter(Boolean);
  let opponentExtraCards = opponentPreset.extra.map(id => allTemplates.find(t => normalizeStrictCardId(t.id) === normalizeStrictCardId(id))).filter(Boolean);
  let opponentSideCards = (opponentPreset.side || [])
    .map(id => allTemplates.find(t => normalizeStrictCardId(t.id) === normalizeStrictCardId(id)))
    .filter(Boolean);

  let singleStartingPlayer = 'player';
  if (campaignMission) {
    const missionDecks = buildMissionDecks(campaignMission.id);
    playerMainCards = missionDecks.player.mainDeck;
    playerExtraCards = missionDecks.player.extraDeck;
    opponentMainCards = missionDecks.opponent.mainDeck;
    opponentExtraCards = missionDecks.opponent.extraDeck;
    singleStartingPlayer = campaignMission.firstPlayerId;
    matchController = null;
    pendingMatchLaunch = null;
    campaignTracker = createCampaignDuelTracker(crypto.randomUUID());
  } else if (selectedDuelSeries === 'match') {
    if (!matchLaunch) {
      const opening = await resolveOpeningFirstPlayer('Duel 1');
      if (!currentLaunch()) return;
      const openingChooser = opening.chooser;
      const openingFirstPlayer = opening.firstPlayer;
      matchController = new MatchController({ engineOptions: nativeBuilderOptions() });
      launchMatch = matchController;
      try {
        matchController.startMatch({
          ...(document.getElementById('match-time-limit')?.checked ? {
            tournamentPolicy: 'TCG_EU_SWISS', timeLimitMinutes: 50
          } : {}),
          playerIds: ['player', 'opponent'],
          playerLabels: { player: 'Vous', opponent: 'Adversaire IA' },
          firstPlayerId: openingFirstPlayer,
          initialDecisionPlayerId: openingChooser,
          decks: {
            player: {
              mainDeck: playerMainCards,
              extraDeck: playerExtraCards,
              sideDeck: playerSideCards
            },
            opponent: {
              mainDeck: opponentMainCards,
              extraDeck: opponentExtraCards,
              sideDeck: opponentSideCards
            }
          }
        });
        matchLaunch = matchController.getDuelLaunchConfig();
        launchMatch = matchController;
        syncMatchClock();
      } catch (error) {
        const issues = error?.issues?.map(issue => issue.message).join(' | ');
        addLogEntry(`Match refusé : ${issues || error.message}`, 'danger');
        stopHologramHum();
        openDialog(startModal, startBtn);
        announceStatus('Le Match ne peut pas démarrer car un Deck enregistré est invalide.');
        return;
      }
    }

    playerMainCards = matchLaunch.decks.player.mainDeck;
    playerExtraCards = matchLaunch.decks.player.extraDeck;
    opponentMainCards = matchLaunch.decks.opponent.mainDeck;
    opponentExtraCards = matchLaunch.decks.opponent.extraDeck;
    pendingMatchLaunch = matchLaunch;
  } else {
    matchController = null;
    pendingMatchLaunch = null;
    singleStartingPlayer = (await resolveOpeningFirstPlayer('Duel')).firstPlayer;
    if (!currentLaunch()) return;
  }

  const opponentLabel = document.getElementById('opponent-label');
  const characterNames = { kaiba: 'KAIBA', yugi: 'YUGI', joey: 'JOEY', custom: 'DUELLISTE' };
  synchronizeDuelistAvatarAppearance(opponentDeckId);
  if (opponentLabel) opponentLabel.textContent = `${characterNames[opponentDeckId]} (IA)`;
  if (campaignMission) {
    opponentLabel.textContent = `${campaignMission.opponentName.toUpperCase()} (IA)`;
  }

  let GameClass = DuelGame;
  let nativeResources;
  if (selectedGameMode !== 'sandbox') {
    announceStatus('Chargement des règles et des scripts de cartes…');
    try {
      const [module, resources] = await Promise.all([
        import('./src/core/native/NativeDuelGame.js'), loadNativeCardResources()
      ]);
      GameClass = module.NativeDuelGame;
      nativeResources = resources;
      if (!currentLaunch()) return;
    } catch (error) {
      if (!currentLaunch()) return;
      stopHologramHum();
      addLogEntry(`Chargement du duel impossible : ${error.message}`, 'danger');
      openDialog(startModal, startBtn);
      announceStatus('Le chargement des règles a échoué. Vous pouvez réessayer.');
      return;
    }
  }
  game = new GameClass({
    onStateChange: state => { if (currentLaunch()) updateUI(state); },
    onLog: (msg, type) => {
      if (!currentLaunch()) return;
      const safeMessage = sanitizePublicLogMessage(msg, type);
      addLogEntry(safeMessage, type);
      handleLogSpeech(safeMessage, type);
    },
    onAnimation: event => { if (currentLaunch()) handleGameAnimations(event); },
    onGameOver: (...result) => { if (currentLaunch()) handleGameOver(...result); },
    onDecision: request => currentLaunch() ? requestUiDecision(request) : null,
    onChainOpportunity: requestUiChainOpportunity
  }, {
    isSessionCurrent: currentLaunch,
    rulesMode: selectedGameMode,
    nativeResources,
    validateDeck: ({ mainDeck, extraDeck }, mode) => validateCustomDeck({ mainDeck, extraDeck, sideDeck: [] }, mode, {
      ...nativeBuilderOptions(mode), ...(matchLaunch?.banlistId ? { banlistId: matchLaunch.banlistId } : {})
    }),
    aiDifficulty: selectedAiDifficulty
  });

  const startingPlayerId = matchLaunch?.firstPlayerId || singleStartingPlayer;
  const launchedGame = game;
  const duelStarted = await launchedGame.startDuel(
    playerMainCards,
    opponentMainCards,
    playerExtraCards,
    opponentExtraCards,
    { startingPlayer: startingPlayerId }
  );
  if (!currentLaunch() || game !== launchedGame) {
    launchedGame.dispose?.();
    return;
  }
  if (recordedFinishedGames.has(launchedGame)) return;
  if (duelStarted === false) {
    stopHologramHum();
    openDialog(startModal, startBtn);
    announceStatus('Le deck a été refusé. Consultez le journal de combat pour connaître les erreurs.');
    return;
  }
  activeDuelInProgress = true;
  duelStartedAt = Date.now();
  positionMobileBoardForPlayer();
  updateModeControls();
  const matchSuffix = selectedDuelSeries === 'match'
    ? `, Duel ${matchLaunch?.gameNumber || 1} du Match`
    : '';
  announceStatus(
    `Duel lancé en mode ${selectedGameMode === 'strict' ? 'TCG Advanced strict' : selectedGameMode === 'native' ? 'Duel libre • tous les Terrains' : 'Anime Sandbox'}${matchSuffix}, difficulté ${selectedAiDifficulty}. `
    + `${startingPlayerId === 'player' ? 'Vous commencez.' : 'L’adversaire commence.'}`
  );
  startBGM();
  setBGMStyle('normal');
}

/**
 * Update the user interface based on game state
 */
async function openNativeActionMenu(cardUid = null) {
  const actionGame = game;
  const actions = (actionGame?.getAvailableActions?.('player')?.nativeActions || [])
    .filter(action => !cardUid || action.cardUid === cardUid);
  if (!actions.length) { announceStatus('Aucun effet ou invocation disponible actuellement.'); return; }
  const selected = await requestUiDecision({
    side: 'player', type: 'native-available-actions', title: 'EFFETS ET INVOCATIONS',
    description: 'Les coûts, cibles et autres choix vous seront demandés après cette sélection.',
    choices: actions.map(action => ({ value: action.id, label: action.label }))
  });
  if (selected != null && game === actionGame) await actionGame.activateNativeAction(selected);
}
document.getElementById('btn-native-actions')?.addEventListener('click', () => openNativeActionMenu());

function updateUI(gameState) {
  const nativeActions = gameState.getAvailableActions?.('player')?.nativeActions || [];
  const nativeButton = document.getElementById('btn-native-actions');
  nativeButton?.classList.toggle('hidden', !nativeActions.length);
  if (nativeButton) nativeButton.disabled = !nativeActions.length;
  campaignTracker?.observeState(gameState);
  const campaignMission = getMission(activeCampaignMissionId);
  const campaignStatus = document.getElementById('campaign-duel-status');
  campaignStatus.classList.toggle('hidden', !campaignMission);
  if (campaignMission) {
    const facts = campaignTracker?.snapshot(gameState) || {};
    const technical = campaignMission.objectives[0];
    const value = technical.comparison === 'distinct' ? (facts[technical.stat]?.length || 0) : (facts[technical.stat] || 0);
    campaignStatus.textContent = `DÉFI ${campaignMission.number}/12 · ${campaignMission.title} · Objectif bonus ${value}/${technical.target}`;
    campaignStatus.title = `${technical.label} ${campaignMission.objectives[1].label}`;
  }
  const matchStatus = document.getElementById('match-status');
  const matchView = matchController?.getViewModel();
  if (matchStatus) {
    const showMatch = selectedDuelSeries === 'match' && matchView && matchView.status !== 'idle';
    matchStatus.classList.toggle('hidden', !showMatch);
    matchStatus.textContent = showMatch
      ? `MATCH · DUEL ${matchView.gameNumber} · ${matchView.scores.player}-${matchView.scores.opponent}`
      : '';
  }

  // 1. Life points counters
  animateLpChange('player-lp', gameState.playerLP);
  animateLpChange('opponent-lp', gameState.opponentLP);

  // 2. Deck and Playmat zone counts
  document.getElementById('player-deck-count').textContent = gameState.playerDeck.length;
  document.getElementById('opponent-deck-count').textContent = gameState.opponentDeck.length;
  document.getElementById('player-gy-count').textContent = gameState.playerGraveyard.length;
  document.getElementById('opponent-gy-count').textContent = gameState.opponentGraveyard.length;
  const playerFaceUpExtraCount = gameState.playerFaceUpExtraDeck?.length || 0;
  const playerExtraTotal = gameState.playerExtraDeck.length + playerFaceUpExtraCount;
  document.getElementById('player-extra-count').textContent = playerExtraTotal;
  document.getElementById('opponent-extra-count').textContent =
    gameState.opponentExtraDeck.length + (gameState.opponentFaceUpExtraDeck?.length || 0);
  document.getElementById('player-extra-zone')?.setAttribute(
    'aria-label',
    `Ouvrir votre Extra Deck : ${playerExtraTotal} carte${playerExtraTotal > 1 ? 's' : ''}, dont ${playerFaceUpExtraCount} face recto.`
  );
  document.getElementById('player-banished-count').textContent = gameState.playerBanished.length;
  document.getElementById('opponent-banished-count').textContent = gameState.opponentBanished.length;
  [
    ['player-graveyard-zone', 'Ouvrir votre Cimetière', gameState.playerGraveyard.length],
    ['opponent-graveyard-zone', 'Ouvrir le Cimetière adverse', gameState.opponentGraveyard.length],
    ['player-banished-zone', 'Ouvrir vos cartes bannies', gameState.playerBanished.length],
    ['opponent-banished-zone', 'Ouvrir les cartes bannies adverses', gameState.opponentBanished.length]
  ].forEach(([id, label, count]) => {
    document.getElementById(id)?.setAttribute(
      'aria-label',
      `${label} : ${count} carte${count > 1 ? 's' : ''}.`
    );
  });

  // Dynamic BGM style update based on duel state
  if (gameState.playerLP <= 2000 || gameState.opponentLP <= 2000) {
    setBGMStyle('danger');
  } else if (gameState.currentPhase === 'battle') {
    setBGMStyle('battle');
  } else {
    setBGMStyle('normal');
  }

  // 3. Phase display highlights
  document.querySelectorAll('.phase-step').forEach(el => el.classList.remove('active'));
  const phaseEl = document.getElementById(`phase-${gameState.currentPhase}`);
  if (phaseEl) {
    phaseEl.classList.add('active');
    document.querySelector('.phase-indicator-box')?.setAttribute(
      'aria-label',
      `Phase actuelle : ${phaseEl.dataset.phaseLabel || phaseEl.title || gameState.currentPhase}`
    );
  }

  // 4. Keep sequential phase navigation and expose an explicit legal End turn action.
  const canChoosePlayerPhase = gameState.currentTurn === 'player'
    && !gameState.isDiscarding
    && !gameState.isResolvingAction
    && !gameState.pendingSummon
    && !gameState.pendingExtraSummon;
  const phaseActions = gameState.getAvailableActions?.('player') || {};
  const nativePhases = typeof gameState.activateNativeAction === 'function';
  const hasSequentialPhase = nativePhases
    ? canChoosePlayerPhase && (phaseActions.canBattlePhase || phaseActions.canMainPhase2 || (gameState.currentPhase === 'main2' && phaseActions.canEndPhase))
    : canChoosePlayerPhase && (
    (gameState.currentPhase === 'main1' && gameState.turnCount > 1)
    || gameState.currentPhase === 'battle'
    || gameState.currentPhase === 'main2'
  );
  if (hasSequentialPhase) {
    nextPhaseBtn.style.display = 'block';
    nextPhaseBtn.disabled = false;
    nextPhaseBtn.setAttribute('aria-disabled', 'false');
    if (gameState.currentPhase === 'main1') {
      nextPhaseBtn.textContent = 'PHASE SUIVANTE : COMBAT';
    } else if (gameState.currentPhase === 'battle') {
      nextPhaseBtn.textContent = 'PHASE SUIVANTE : MAIN 2';
    } else {
      nextPhaseBtn.textContent = 'PHASE SUIVANTE : FIN';
    }
  } else {
    nextPhaseBtn.style.display = 'none';
    nextPhaseBtn.disabled = true;
    nextPhaseBtn.setAttribute('aria-disabled', 'true');
  }
  const canEndTurn = canChoosePlayerPhase
    && (nativePhases ? phaseActions.canEndPhase : ['main1', 'battle', 'main2'].includes(gameState.currentPhase));
  endTurnBtn?.classList.toggle('hidden', !canEndTurn);
  if (endTurnBtn) {
    endTurnBtn.disabled = !canEndTurn;
    endTurnBtn.setAttribute('aria-disabled', canEndTurn ? 'false' : 'true');
  }

  const pendulumAvailable = Boolean(
    gameState.getAvailableActions?.('player')?.canPendulumSummon
    && !gameState.isDiscarding
    && !gameState.pendingSummon
    && !gameState.pendingExtraSummon
  );
  pendulumSummonBtn?.classList.toggle('hidden', !pendulumAvailable);
  if (pendulumSummonBtn) {
    pendulumSummonBtn.disabled = !pendulumAvailable;
    pendulumSummonBtn.setAttribute('aria-disabled', pendulumAvailable ? 'false' : 'true');
  }
  const pendulumOptions = pendulumAvailable
    ? gameState.getPendulumOptions?.('player')
    : null;
  if (pendulumStatus) {
    pendulumStatus.classList.toggle('hidden', !pendulumAvailable);
    if (pendulumAvailable && pendulumOptions?.scales) {
      const lowScale = Math.min(
        pendulumOptions.scales.leftScale,
        pendulumOptions.scales.rightScale
      );
      const highScale = Math.max(
        pendulumOptions.scales.leftScale,
        pendulumOptions.scales.rightScale
      );
      const eligibleCount =
        (pendulumOptions.fromHand?.length || 0)
        + (pendulumOptions.fromExtraDeck?.length || 0);
      pendulumStatus.textContent =
        `Échelles ${pendulumOptions.scales.leftScale}/${pendulumOptions.scales.rightScale} · `
        + `niveaux ${lowScale + 1} à ${highScale - 1} · `
        + `${eligibleCount} monstre${eligibleCount > 1 ? 's' : ''} disponible${eligibleCount > 1 ? 's' : ''}.`;
    } else if (pendulumAvailable && pendulumOptions?.nativeSelectionRequired === true) {
      pendulumStatus.textContent = 'Choisissez les monstres autorisés dans votre Main et votre Extra Deck.';
    } else {
      pendulumStatus.textContent = '';
    }
  }
  if (pendulumAvailable && !previousPendulumAvailable) {
    announceStatus('Invocation Pendule disponible.');
  }
  previousPendulumAvailable = pendulumAvailable;

  const turnStatus = document.getElementById('turn-status');
  const discardStatus = document.getElementById('discard-status');
  const phaseNames = {
    draw: 'Pioche',
    standby: 'Standby',
    main1: 'Main Phase 1',
    battle: 'Battle Phase',
    main2: 'Main Phase 2',
    end: 'End Phase'
  };
  if (gameState.isDiscarding) {
    const cardsToDiscard = Math.max(1, gameState.playerHand.length - 6);
    if (turnStatus) {
      turnStatus.textContent = `Défausse obligatoire : ${cardsToDiscard} carte${cardsToDiscard > 1 ? 's' : ''} à choisir.`;
    }
    discardStatus?.classList.remove('hidden');
  } else {
    if (turnStatus) {
      turnStatus.textContent = gameState.currentTurn === 'player'
        ? `Votre tour — ${phaseNames[gameState.currentPhase] || gameState.currentPhase}`
        : `Tour de l’adversaire — ${phaseNames[gameState.currentPhase] || gameState.currentPhase}`;
    }
    discardStatus?.classList.add('hidden');
  }

  const canOpenExtraDeck = gameState.currentTurn === 'player'
    && String(gameState.currentPhase).startsWith('main')
    && !gameState.isResolvingAction
    && !gameState.pendingSummon
    && !gameState.pendingExtraSummon
    && !gameState.isDiscarding;
  extraZone?.setAttribute('aria-disabled', canOpenExtraDeck ? 'false' : 'true');
  extraZone?.classList.toggle('zone-disabled', !canOpenExtraDeck);

  // 5. Render Hand
  renderHand(gameState.playerHand);

  // Sync board playmat zones
  syncBoardZones(gameState);

  // 6. Highlight active attacker or targetable zones in Battle Phase
  updateBattleHighlights();

  // 7. Interactive Tribute Summon UI Highlights
  document.querySelectorAll('.player-m-zone, .extra-m-zone')
    .forEach(z => z.classList.remove('tribute-candidate', 'tribute-selected'));
  if (gameState.pendingSummon) {
    const list = gameState.pendingSummon.selectedTributeIndices;
    document.querySelectorAll('.player-m-zone').forEach((zone, idx) => {
      if (gameState.playerMonsters[idx] !== null) {
        zone.classList.add('tribute-candidate');
        if (list.includes(idx)) {
          zone.classList.add('tribute-selected');
        }
      }
    });
    document.querySelectorAll('.extra-m-zone.player-controlled').forEach(zone => {
      const key = `extra:${zone.dataset.index}`;
      zone.classList.add('tribute-candidate');
      zone.classList.toggle('tribute-selected', list.includes(key));
    });
  }

  // 8. Interactive Synchro Summon Material Highlights
  if (gameState.pendingExtraSummon) {
    const list = gameState.pendingExtraSummon.selectedMaterialIndices;
    document.querySelectorAll('.player-m-zone').forEach((zone, idx) => {
      if (gameState.playerMonsters[idx] !== null) {
        zone.classList.add('tribute-candidate');
        if (list.includes(idx)) {
          zone.classList.add('tribute-selected');
        }
      }
    });
    document.querySelectorAll('.extra-m-zone.player-controlled').forEach(zone => {
      const key = `extra:${zone.dataset.index}`;
      zone.classList.add('tribute-candidate');
      zone.classList.toggle('tribute-selected', list.includes(key));
    });
  }
  updateBoardZoneAccessibility();
  duelViewController?.update(gameState);
}

/**
 * Smooth counter animation for Life Points
 */
function animateLpChange(elId, targetValue) {
  const el = document.getElementById(elId);
  if (!el) return;
  const previousFrame = lpAnimationFrames.get(elId);
  if (previousFrame !== undefined) {
    cancelAnimationFrame(previousFrame);
    lpAnimationFrames.delete(elId);
  }
  const currentValue = parseInt(el.textContent) || 0;
  if (currentValue === targetValue) return;

  const diff = targetValue - currentValue;
  const duration = getMotionDuration(800);
  const announceFinalLifePoints = () => {
    if (lpAnnouncementTimeout !== null) window.clearTimeout(lpAnnouncementTimeout);
    lpAnnouncementTimeout = window.setTimeout(() => {
      lpAnnouncementTimeout = null;
      const playerValue = document.getElementById('player-lp')?.textContent || '0';
      const opponentValue = document.getElementById('opponent-lp')?.textContent || '0';
      const announcer = document.getElementById('lp-announcer');
      if (announcer) {
        announcer.textContent = `Life Points : vous ${playerValue}, adversaire ${opponentValue}.`;
      }
    }, 40);
  };
  if (duration === 0) {
    el.textContent = targetValue;
    announceFinalLifePoints();
    return;
  }
  const start = performance.now();

  function step(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);

    // Ease out quad
    const easeProgress = progress * (2 - progress);
    const value = Math.round(currentValue + diff * easeProgress);
    el.textContent = value;

    if (progress < 1) {
      lpAnimationFrames.set(elId, requestAnimationFrame(step));
    } else {
      lpAnimationFrames.delete(elId);
      announceFinalLifePoints();
    }
  }

  lpAnimationFrames.set(elId, requestAnimationFrame(step));
}

/**
 * Floating numbers animation when LP are lost
 */
function triggerLPLossAnimation(target, damage) {
  const lossEl = document.getElementById(`${target}-lp-loss`);
  if (!lossEl) return;

  lossEl.textContent = `-${damage}`;
  lossEl.classList.remove('hidden');

  // Clone to restart the animation
  const newEl = lossEl.cloneNode(true);
  lossEl.parentNode.replaceChild(newEl, lossEl);

  scheduleUiAnimation(() => {
    newEl.classList.add('hidden');
  }, 1200);
}

/**
 * Render player's hand cards fanned out
 */
function renderHand(handCards) {
  const handContainer = document.getElementById('player-hand');
  const focusedHandCard = document.activeElement?.closest?.('#player-hand .card-entity');
  const focusedUid = focusedHandCard?.dataset.uid || null;
  const focusedIndex = Number(focusedHandCard?.dataset.handIndex);
  const availableActions = game?.getAvailableActions?.('player') || {};
  const legalNormalSummons = new Set([...(availableActions.normalSummonCardUids || []), ...(availableActions.normalSetCardUids || [])].map(String));
  const canUseHand = Boolean(
    game
    && game.currentTurn === 'player'
    && game.currentPhase.startsWith('main')
    && !game.isResolvingAction
    && !game.pendingSummon
    && !game.pendingExtraSummon
  );
  const hasOpenSpellZone = Boolean(game?.playerSpells?.some(card => card === null));
  handContainer.innerHTML = '';

  handCards.forEach((card, idx) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'hand-card-wrapper';

    // Add fan angles
    const angle = (idx - (handCards.length - 1) / 2) * 4; // fanning
    wrapper.style.transform = `rotateZ(${angle}deg)`;

    const cardEl = createCardDOM(card, false);
    const isActionable = Boolean(
      game?.isDiscarding
      || (
        canUseHand
        && (
          (card.card_type === 'monster' && (legalNormalSummons.has(String(card.uid))
            || canActivateHandPendulumScale(card)))
          || (
            card.card_type !== 'monster'
            && (typeof game.canSetSpell === 'function' ? (game.canSetSpell(card, 'player') || game.canActivateSpell(card, 'player')) : (isFieldSpellCard(card) || hasOpenSpellZone))
          )
        )
      )
    );
    cardEl.dataset.uid = card.uid;
    cardEl.dataset.handIndex = idx;
    cardEl.setAttribute('role', 'button');
    cardEl.tabIndex = 0;
    cardEl.setAttribute('aria-disabled', isActionable ? 'false' : 'true');
    cardEl.setAttribute(
      'aria-label',
      game?.isDiscarding
        ? `Défausser ${card.name}`
        : isActionable
          ? `${card.name}. Sélectionner cette carte pour la jouer.`
          : `${card.name}. Aucune action légale actuellement ; la carte reste consultable.`
    );
    cardEl.classList.toggle('selected-hand-card', selectedHandUid === card.uid);
    cardEl.classList.toggle('discard-candidate', Boolean(game?.isDiscarding));
    cardEl.setAttribute('aria-pressed', selectedHandUid === card.uid ? 'true' : 'false');
    cardEl.draggable = isActionable && !game?.isDiscarding;

    // Bind Drag & Drop Events
    cardEl.addEventListener('dragstart', (e) => {
      if (game?.isDiscarding) {
        e.preventDefault();
        return;
      }
      currentDraggedUid = card.uid;
      cardEl.classList.add('dragging');
      e.dataTransfer.setData('text/plain', card.uid);
      e.dataTransfer.effectAllowed = 'move';

      // Highlight correct drop zones on board
      highlightValidDropZones(card);
    });

    cardEl.addEventListener('dragend', () => {
      currentDraggedUid = null;
      cardEl.classList.remove('dragging');
      clearDropZoneHighlights();
    });

    // A single activation works equally with mouse, touch, Enter, and Space.
    cardEl.addEventListener('click', () => {
      if (game && game.isDiscarding) {
        game.discardCard(card.uid);
        announceStatus(`${card.name} défaussé.`);
        return;
      }

      if (!game || game.currentTurn !== 'player' || !game.currentPhase.startsWith('main') || game.isResolvingAction) {
        announceStatus(`${card.name} ne peut pas être joué actuellement.`);
        return;
      }
      if (!isActionable) {
        announceStatus(`${card.name} n’a aucune action légale actuellement.`);
        return;
      }

      selectedHandUid = selectedHandUid === card.uid ? null : card.uid;
      document.querySelectorAll('#player-hand .card-entity').forEach(element => {
        const isSelected = element.dataset.uid === selectedHandUid;
        element.classList.toggle('selected-hand-card', isSelected);
        element.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
      });

      clearDropZoneHighlights();
      if (selectedHandUid) {
        highlightValidDropZones(card);
      }
    });

    cardEl.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        cardEl.click();
      }
    });

    wrapper.appendChild(cardEl);
    handContainer.appendChild(wrapper);
  });

  if (focusedUid) {
    const restored = [...handContainer.querySelectorAll('.card-entity')]
      .find(element => String(element.dataset.uid) === String(focusedUid));
    const fallback = handContainer.querySelector(
      `.card-entity[data-hand-index="${Math.min(
        Number.isFinite(focusedIndex) ? focusedIndex : 0,
        Math.max(0, handCards.length - 1)
      )}"]`
    );
    (restored || fallback)?.focus();
  }
}

/**
 * Drag and drop zone highlighting helper
 */
function canPlaceHandCard(options) {
  if (typeof game?.activateNativeAction !== 'function') return isHandPlacementDestinationLegal(options);
  const { card, zoneType, zoneIndex, occupied } = options;
  const actions = game.getAvailableActions('player');
  if (isFieldSpellCard(card)) return zoneType === 'field' && (game.canActivateSpell(card, 'player') || game.canSetSpell(card, 'player'));
  if (card?.card_type === 'monster') {
    if (zoneType === 'spell') return !occupied && [0, 4].includes(Number(zoneIndex)) && canActivateHandPendulumScale(card, Number(zoneIndex));
    return zoneType === 'monster' && [...(actions.normalSummonCardUids || []), ...(actions.normalSetCardUids || [])].includes(card.uid);
  }
  return zoneType === 'spell' && !occupied && (game.canActivateSpell(card, 'player') || game.canSetSpell(card, 'player'));
}

function highlightValidDropZones(card) {
  const selectors = isFieldSpellCard(card)
    ? ['.player-field-pos']
    : card?.card_type === 'monster'
      ? ['.player-m-zone']
      : ['.player-s-zone'];
  if (card?.isPendulumMonster && !selectors.includes('.player-s-zone')) {
    selectors.push('.player-s-zone');
  }
  const controlledMonsterCount = game?.getMonsterEntries?.('player')?.length || 0;
  document.querySelectorAll(selectors.join(',')).forEach(zone => {
    const legal = canPlaceHandCard({
      card,
      zoneType: zone.dataset.zoneType,
      zoneIndex: Number(zone.dataset.index),
      occupied: Boolean(zone.querySelector('.card-entity')),
      controlledMonsterCount
    });
    if (legal) {
      zone.classList.add('active-zone');
    }
  });
  updateBoardZoneAccessibility();
}

function clearDropZoneHighlights() {
  document.querySelectorAll('.card-zone').forEach(zone => {
    zone.classList.remove('active-zone', 'drag-over');
  });
  updateBoardZoneAccessibility();
}

function clearSelectedHandCard() {
  selectedHandUid = null;
  clearDropZoneHighlights();
  document.querySelectorAll('#player-hand .card-entity').forEach(element => {
    element.classList.remove('selected-hand-card');
    element.setAttribute('aria-pressed', 'false');
  });
}

async function openMonsterActionMenu(zoneReference) {
  if (!game || game.currentTurn !== 'player' || !game.currentPhase.startsWith('main')) return;
  const actionGame = game;
  const entry = actionGame.getMonsterEntry?.('player', zoneReference);
  const card = entry?.card;
  if (!card || game.isResolvingAction || game.pendingSummon || game.pendingExtraSummon || game.isDiscarding
    || game.chain?.chainStatus !== 'idle') return;
  const sourceInstance = card.runtimeInstanceId;

  const availableEffects = game.getAvailableActions?.('player')?.monsterEffects || [];
  const effectIsAvailable = !card.isSetFaceDown && availableEffects.some(action => (
    action.zoneIndex === entry.zoneIndex
    && (action.zoneType || 'main') === entry.zoneType
  ));
  const choices = [];
  if (effectIsAvailable) {
    choices.push({ value: 'effect', label: `ACTIVER L’EFFET DE ${card.name.toUpperCase()}` });
  }
  if (game.getAvailableActions?.('player')?.positionChangeCardUids
    ? game.getAvailableActions('player').positionChangeCardUids.includes(card.uid)
    : !card.isLinkMonster && card.extra_type !== 'link'
    && card.turnSummoned !== game.turnCount && !card.hasChangedPositionThisTurn
    && !card.hasAttacked && !(card.attacksDeclaredThisTurn > 0)
    && !game.hasMonsterAttacked?.(entry)) {
    choices.push({ value: 'position', label: card.isSetFaceDown
      ? 'FLIPO-INVOQUER EN POSITION D’ATTAQUE' : 'CHANGER LA POSITION DE COMBAT' });
  }
  if (!choices.length) {
    announceStatus(`${card.name} n’a aucune action manuelle disponible actuellement.`);
    return;
  }

  const choice = await requestUiDecision({
    type: 'monster-field-action',
    side: 'player',
    title: card.name,
    description: 'Choisissez une action disponible pour ce monstre.',
    choices
  });

  const currentCard = game?.getMonsterEntry?.('player', zoneReference)?.card;
  if (game !== actionGame || currentCard !== card || card.runtimeInstanceId !== sourceInstance
    || game.currentTurn !== 'player' || !game.currentPhase.startsWith('main')
    || game.isResolvingAction || game.pendingSummon || game.pendingExtraSummon || game.isDiscarding
    || game.chain?.chainStatus !== 'idle') return;

  if (choice === 'effect' && effectIsAvailable) {
    await game.activateMonsterEffect?.(zoneReference, 'player');
  } else if (choice === 'position') {
    await game.toggleMonsterPosition(zoneReference);
  }
}

async function openSetCardActionMenu(zoneType, zoneIndex) {
  const actionGame = game;
  if (!actionGame || actionGame.currentTurn !== 'player' || !actionGame.currentPhase.startsWith('main')
    || actionGame.isResolvingAction || actionGame.pendingSummon || actionGame.pendingExtraSummon
    || actionGame.isDiscarding || actionGame.chain?.chainStatus !== 'idle') return;
  const currentCard = () => zoneType === 'field'
    ? actionGame.playerFieldSpell : actionGame.playerSpells[zoneIndex];
  const card = currentCard();
  if (!card?.isSetFaceDown) return;
  if (card.card_type === 'trap' && typeof actionGame.activateNativeAction !== 'function') {
    announceStatus(`${card.name} s’active dans une fenêtre de réponse correspondant à son effet.`);
    return;
  }
  if (!actionGame.canActivateSpell(card, 'player')) {
    announceStatus(`${card.name} ne peut pas être activée dans la situation actuelle.`);
    return;
  }
  const sourceInstance = card.runtimeInstanceId;
  const choice = await requestUiDecision({
    type: 'set-card-field-action', side: 'player', title: card.name,
    description: 'L’adversaire pourra répondre à l’activation.',
    choices: [{ value: 'activate', label: 'ACTIVER FACE RECTO' }]
  });
  if (choice !== 'activate' || game !== actionGame || currentCard() !== card
    || card.runtimeInstanceId !== sourceInstance || !card.isSetFaceDown
    || actionGame.currentTurn !== 'player' || !actionGame.currentPhase.startsWith('main')
    || actionGame.isResolvingAction || actionGame.pendingSummon || actionGame.pendingExtraSummon
    || actionGame.isDiscarding || actionGame.chain?.chainStatus !== 'idle'
    || !actionGame.canActivateSpell(card, 'player')) return;
  if (zoneType === 'field') await actionGame.activateSetFieldSpell('player');
  else await actionGame.activateSetSpellTrap(zoneIndex);
}

// Set up Drop Zones event listeners
document.querySelectorAll('.card-zone').forEach(zone => {
  const zoneSideLabel = zone.dataset.side === 'player'
    ? 'joueur'
    : (zone.dataset.side === 'opponent' ? 'adversaire' : 'partagée');
  const zoneTypeLabel = zone.dataset.zoneType === 'monster'
    ? 'monstre'
    : zone.dataset.zoneType === 'extra-monster'
      ? 'Monstre Extra'
      : zone.dataset.zoneType === 'field'
        ? 'Terrain'
        : 'magie ou piège';
  zone.setAttribute('role', 'button');
  zone.tabIndex = -1;
  zone.setAttribute('aria-disabled', 'true');
  const initialZoneLabel = zone.dataset.zoneType === 'field'
    ? `Zone ${zoneTypeLabel} ${zoneSideLabel}`
    : `Zone ${zoneTypeLabel} ${zoneSideLabel} ${Number(zone.dataset.index) + 1}`;
  zone.dataset.baseAriaLabel = initialZoneLabel;
  zone.setAttribute('aria-label', initialZoneLabel);

  zone.addEventListener('dragover', (e) => {
    e.preventDefault();
    if (zone.classList.contains('active-zone')) {
      zone.classList.add('drag-over');
    }
  });

  zone.addEventListener('dragleave', () => {
    zone.classList.remove('drag-over');
  });

  zone.addEventListener('drop', async (e) => {
    e.preventDefault();
    zone.classList.remove('drag-over');

    const uid = e.dataTransfer.getData('text/plain') || currentDraggedUid;
    if (!uid || !game) return;

    const zoneType = zone.dataset.zoneType;
    const side = zone.dataset.side;
    const index = parseInt(zone.dataset.index);

    if (side !== 'player' || !zone.classList.contains('active-zone')) return;

    // Check if Link Monster (cannot be Set face-down)
    const cardInstance = game.playerHand.find(c => c.uid === uid);

    if (cardInstance && cardInstance.type && cardInstance.type.includes('Link')) {
      // Direct face-up summon for Link Monsters
      await game.summonMonster(uid, index);
    } else {
      // Set pending action and show choices modal
      pendingAction = {
        uid,
        zoneType,
        index,
        isPendulumScale: Boolean(cardInstance?.isPendulumMonster && zoneType === 'spell')
      };
      prepareActionDialog(cardInstance, pendingAction);
      const actionChoiceModal = document.getElementById('action-modal');
      openDialog(actionChoiceModal, getActionDialogInitialFocus());
    }

    clearDropZoneHighlights();
  });

  // Card zone click handler (handles Battle attacks, Tribute selections, and Synchro selections)
  zone.addEventListener('click', async () => {
    if (!game) return;

    const zoneType = zone.dataset.zoneType;
    const side = zone.dataset.side;
    const index = parseInt(zone.dataset.index);
    const monsterReference = zoneType === 'extra-monster'
      ? { zoneType: 'extra', zoneIndex: index }
      : index;

    // Touch/keyboard placement after selecting a card from the hand.
    if (
      selectedHandUid
      && side === 'player'
      && game.currentTurn === 'player'
      && game.currentPhase.startsWith('main')
      && !game.isResolvingAction
    ) {
      const selectedCard = game.playerHand.find(card => card.uid === selectedHandUid);
      const placementIsLegal = canPlaceHandCard({
        card: selectedCard,
        zoneType,
        zoneIndex: index,
        occupied: Boolean(zone.querySelector('.card-entity')),
        controlledMonsterCount: game.getMonsterEntries?.('player')?.length || 0
      });

      if (selectedCard && placementIsLegal) {
        const uid = selectedHandUid;
        clearSelectedHandCard();

        if (selectedCard.type?.includes('Link')) {
          await game.summonMonster(uid, index);
        } else {
          pendingAction = {
            uid,
            zoneType,
            index,
            isPendulumScale: Boolean(selectedCard.isPendulumMonster && zoneType === 'spell')
          };
          prepareActionDialog(selectedCard, pendingAction);
          openDialog(actionModal, getActionDialogInitialFocus());
        }
        return;
      }

      if (selectedHandUid) {
        announceStatus('Cette zone ne peut pas recevoir la carte sélectionnée.');
        return;
      }
    }

    // 1. Intercept click for Tribute Sacrifices
    if (game.pendingSummon) {
      if (side === 'player' && ['monster', 'extra-monster'].includes(zoneType)) {
        game.selectSummonTribute(monsterReference);
      }
      return;
    }

    // 2. Intercept click for Synchro Materials
    if (game.pendingExtraSummon) {
      if (side === 'player' && ['monster', 'extra-monster'].includes(zoneType)) {
        game.selectSynchroMaterial(monsterReference);
      }
      return;
    }

    // Intercept click to activate a face-down Spell/Trap card during Main Phase
    if (
      side === 'player'
      && ['spell', 'field'].includes(zoneType)
      && game.currentTurn === 'player'
      && game.currentPhase.startsWith('main')
    ) {
      const card = zoneType === 'field'
        ? game.playerFieldSpell
        : game.playerSpells[index];
      if (card && card.isSetFaceDown) {
        await openSetCardActionMenu(zoneType, index);
        return;
      }
      if (card && typeof game.activateNativeAction === 'function') {
        await openNativeActionMenu(card.uid);
        return;
      }
    }

    if (
      side === 'player'
      && ['monster', 'extra-monster'].includes(zoneType)
      && game.currentTurn === 'player'
      && game.currentPhase.startsWith('main')
      && game.getMonsterEntry?.('player', monsterReference)
    ) {
      await openMonsterActionMenu(monsterReference);
      return;
    }

    // 3. Standard Battle Phase attacks
    if (game.currentTurn !== 'player' || game.currentPhase !== 'battle') return;

    if (
      side === 'player'
      && ['monster', 'extra-monster'].includes(zoneType)
      && game.getMonsterEntry?.('player', monsterReference)
    ) {
      // Select Attacker
      if (game.hasMonsterAttacked?.(monsterReference)) {
        addLogEntry("Ce monstre a déjà attaqué ce tour-ci !", 'danger');
        return;
      }

      const pan = getZonePan(side, index);
      playClick(pan);

      // Reset previous select
      document.querySelectorAll('.player-m-zone, .extra-m-zone.player-controlled')
        .forEach(z => z.classList.remove('attacker-active'));

      const selectedKey = selectedAttackerIndex === null
        ? null : game.getMonsterZoneKey?.(selectedAttackerIndex);
      const clickedKey = game.getMonsterZoneKey?.(monsterReference);
      if (selectedKey === clickedKey) {
        selectedAttackerIndex = null;
      } else {
        selectedAttackerIndex = monsterReference;
        zone.classList.add('attacker-active');
      }
      updateBattleHighlights();
    }
    else if (
      side === 'opponent'
      && ['monster', 'extra-monster'].includes(zoneType)
      && selectedAttackerIndex !== null
      && zone.classList.contains('can-target')
    ) {
      // Attack target monster
      game.executeAttack(selectedAttackerIndex, monsterReference);
      selectedAttackerIndex = null;
      document.querySelectorAll('.player-m-zone, .extra-m-zone.player-controlled')
        .forEach(z => z.classList.remove('attacker-active'));
    }
  });

  // Right click handler to change battle position (Attack/Defense) or Flip Summon
  zone.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    if (!game || game.currentTurn !== 'player' || !game.currentPhase.startsWith('main') || game.isResolvingAction || game.pendingSummon || game.pendingExtraSummon) return;

    const zoneType = zone.dataset.zoneType;
    const side = zone.dataset.side;
    const index = parseInt(zone.dataset.index);

    const monsterReference = zoneType === 'extra-monster'
      ? { zoneType: 'extra', zoneIndex: index }
      : index;

    if (
      side === 'player'
      && ['monster', 'extra-monster'].includes(zoneType)
      && game.getMonsterEntry?.('player', monsterReference)
    ) {
      game.toggleMonsterPosition(monsterReference);
    }
  });

  zone.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      zone.click();
    } else if (event.key.toLowerCase() === 'r') {
      event.preventDefault();
      const zoneType = zone.dataset.zoneType;
      const side = zone.dataset.side;
      const index = parseInt(zone.dataset.index);
      const monsterReference = zoneType === 'extra-monster'
        ? { zoneType: 'extra', zoneIndex: index }
        : index;
      if (side === 'player' && ['monster', 'extra-monster'].includes(zoneType)) {
        game?.toggleMonsterPosition(monsterReference);
      }
    }
  });
});

// Some browsers flatten nested CSS-3D hit testing to the board plane. If a
// visible legal zone is inside the pointer coordinates but the compositor
// reports the board itself, forward the activation to that exact DOM zone.
// The synthetic zone click then follows the normal shared placement handler.
document.getElementById('duel-board')?.addEventListener('click', event => {
  if (event.target.closest?.('.card-zone')) return;

  const matchingZone = [...document.querySelectorAll('.card-zone.active-zone')]
    .find(zone => {
      const bounds = zone.getBoundingClientRect();
      return (
        event.clientX >= bounds.left
        && event.clientX <= bounds.right
        && event.clientY >= bounds.top
        && event.clientY <= bounds.bottom
      );
    });

  if (!matchingZone) return;
  event.preventDefault();
  event.stopPropagation();
  matchingZone.click();
});

// Click outside board zones cancels attacker select, tribute summon or synchro summon
document.addEventListener('click', (e) => {
  if (
    !e.target.closest('.card-zone')
    && !e.target.closest('.hand-card-wrapper')
    && !e.target.closest('#btn-next-phase')
    && !e.target.closest('#btn-toggle-view')
    && !e.target.closest('#extra-deck-modal')
    && !e.target.closest('#action-modal')
    && !e.target.closest('#decision-modal')
    && !e.target.closest('#side-deck-modal')
    && !e.target.closest('#public-zone-modal')
    && !e.target.closest('#settings-modal')
    && !e.target.closest('#gameover-modal')
    && !e.target.closest('.real-duel-camera-controls')
  ) {
    if (selectedAttackerIndex !== null) {
      selectedAttackerIndex = null;
      document.querySelectorAll('.player-m-zone, .extra-m-zone.player-controlled')
        .forEach(z => z.classList.remove('attacker-active'));
      updateBattleHighlights();
    }
    if (game) {
      if (game.pendingSummon) {
        game.cancelSummonTribute();
      }
      if (game.pendingExtraSummon) {
        game.cancelExtraSummon();
      }
    }
    if (selectedHandUid !== null) {
      clearSelectedHandCard();
    }
  }
});

/**
 * Highlights enemy zones that can be targeted during battle
 */
function updateBoardZoneAccessibility() {
  document.querySelectorAll('.card-zone').forEach(zone => {
    const hasVisibleCard = Boolean(zone.querySelector(
      '.card-entity[data-card-visible="true"], .monster-hologram-entity[data-card-visible="true"]'
    ));
    const hasOwnSetCard = zone.dataset.side === 'player'
      && Boolean(zone.querySelector('.card-entity[data-card-visible="false"]'));
    const isPlacementTarget = zone.classList.contains('active-zone');
    const isTributeCandidate = zone.classList.contains('tribute-candidate');
    const isTributeSelected = zone.classList.contains('tribute-selected');
    const isAttackTarget = zone.classList.contains('can-target');
    const isAttacker = zone.classList.contains('attacker-active');
    const interactive = hasVisibleCard
      || hasOwnSetCard
      || isPlacementTarget
      || isTributeCandidate
      || isAttackTarget
      || isAttacker;
    const states = [];
    if (hasOwnSetCard) states.push('votre carte face verso ; sélectionner pour les actions disponibles');
    if (isPlacementTarget) states.push('destination légale pour la carte sélectionnée');
    if (isTributeCandidate) {
      states.push(isTributeSelected ? 'matériel ou sacrifice sélectionné' : 'matériel ou sacrifice disponible');
    }
    if (isAttackTarget) states.push('cible d’attaque légale');
    if (isAttacker) states.push('attaquant sélectionné');
    zone.tabIndex = interactive ? 0 : -1;
    zone.setAttribute('aria-disabled', interactive ? 'false' : 'true');
    if (isTributeCandidate || isAttacker) {
      zone.setAttribute('aria-pressed', (isTributeSelected || isAttacker) ? 'true' : 'false');
    } else {
      zone.removeAttribute('aria-pressed');
    }
    const baseLabel = zone.dataset.baseAriaLabel || zone.getAttribute('aria-label') || 'Zone de Duel';
    zone.setAttribute(
      'aria-label',
      states.length > 0 ? `${baseLabel}. ${states.join('. ')}.` : baseLabel
    );
  });
}

function updateBattleHighlights() {
  document.querySelectorAll('.opponent-m-zone, .extra-m-zone')
    .forEach(z => z.classList.remove('can-target'));

  if (!game || game.currentTurn !== 'player' || game.currentPhase !== 'battle' || selectedAttackerIndex === null) {
    updateBoardZoneAccessibility();
    return;
  }

  const opponentEntries = game.getMonsterEntries?.('opponent') || [];
  const hasOpponentMonsters = opponentEntries.length > 0;

  if (hasOpponentMonsters) {
    opponentEntries.forEach(entry => {
      const zone = entry.zoneType === 'extra'
        ? document.querySelector(`.extra-m-zone[data-index="${entry.zoneIndex}"]`)
        : document.querySelector(`.opponent-m-zone[data-index="${entry.zoneIndex}"]`);
      zone?.classList.add('can-target');
    });
  } else {
    // Direct attack triggers by clicking ANY opponent monster zone to launch attack
    document.querySelectorAll('.opponent-m-zone').forEach(zone => {
      zone.classList.add('can-target');
    });
  }
  updateBoardZoneAccessibility();
}

/**
 * Adds an entry to the glass log sidebar
 */
function sanitizePublicLogMessage(message, type = 'system') {
  const text = String(message ?? '');
  if (type === 'opponent' && /^L['’]adversaire pioche\s*:/i.test(text)) {
    return "L’adversaire pioche une carte.";
  }
  return text;
}

function addLogEntry(message, type = 'system') {
  const logContent = document.getElementById('log-content');
  const entry = document.createElement('div');
  entry.className = `log-entry ${type}`;

  // Basic markdown bolding parsing: **text** -> <strong>text</strong>
  const publicMessage = sanitizePublicLogMessage(message, type);
  const parsed = escapeHtml(publicMessage).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  entry.innerHTML = parsed;

  logContent.appendChild(entry);
  while (logContent.childElementCount > MAX_LOG_ENTRIES) {
    logContent.firstElementChild?.remove();
  }
  logContent.scrollTop = logContent.scrollHeight; // Auto scroll to bottom
}

/**
 * Card Inspector Display Updates
 */
function updateInspector(card) {
  const display = document.getElementById('inspector-display');
  if (!card) {
    display.innerHTML = `<div class="inspector-no-card">Survolez une carte ou un hologramme pour afficher ses détails.</div>`;
    return;
  }

  const isMonster = card.card_type === 'monster';
  const currentLevel = Number(typeof card.getLevel === 'function' ? card.getLevel() : card.level);
  const currentRank = Number(typeof card.getRank === 'function' ? card.getRank() : card.rank);
  const currentLinkRating = Number(card.linkRating ?? card.level);
  const levelStars = !isMonster ? '' : card.isLinkMonster
    ? `LIEN ${Number.isInteger(currentLinkRating) ? currentLinkRating : '—'}`
    : card.extra_type === 'xyz' || card.isXyzMonster === true
      ? `RANG ${Number.isInteger(currentRank) ? currentRank : '—'}`
      : Number.isInteger(currentLevel) && currentLevel > 0
        ? currentLevel <= 12 ? '★'.repeat(currentLevel) : `NIV. ${currentLevel}` : '';

  const atk = typeof card.getAtk === 'function' ? card.getAtk() : (card.atk !== undefined ? card.atk : 0);
  const def = typeof card.getDef === 'function' ? card.getDef() : (card.def !== undefined ? card.def : 0);
  const imgUrl = safeImageUrl(
    card.image_url,
    getCardImageUrl(card.id)
  );
  const safeName = escapeHtml(card.name);
  const safeType = escapeHtml(card.type);
  const safeDescription = escapeHtml(card.desc);
  const safeAttribute = escapeHtml(card.attribute || 'SPELL/TRAP');

  const statsHTML = isMonster
    ? `<div class="inspector-stats">
         <span class="inspector-stat-atk">ATK ${atk}</span>
         <span class="inspector-stat-def">DEF ${def !== null ? def : '—'}</span>
         <span class="inspector-stat-lvl">${levelStars}</span>
       </div>`
    : `<div class="inspector-stats">
         <span class="inspector-stat-lvl" style="color:var(--neon-cyan)">${safeAttribute}</span>
       </div>`;

  display.innerHTML = `
    <div class="inspector-image-wrapper">
      <img src="${imgUrl}" alt="${safeName}">
    </div>
    <div class="inspector-title">${safeName}</div>
    <div class="inspector-type">${safeType}</div>
    ${statsHTML}
    <div class="inspector-desc">${safeDescription}</div>
  `;
}

const sideDeckModal = document.getElementById('side-deck-modal');
const sideDeckEditor = document.getElementById('side-deck-editor');
const sideDeckScore = document.getElementById('side-deck-score');
const sideDeckFeedback = document.getElementById('side-deck-feedback');
const firstPlayerChoice = document.getElementById('first-player-choice');
const startNextDuelBtn = document.getElementById('btn-start-next-duel');
const clearSideSelectionBtn = document.getElementById('btn-clear-side-selection');
const abandonMatchBtn = document.getElementById('btn-abandon-match');
const nextFirstPlayerInputs = document.querySelectorAll('input[name="next-first-player"]');

function isExtraDeckCard(card) {
  return isTemplateExtraDeckCard(card);
}

function getCardStrategicScore(card) {
  const fixedScores = {
    '12580477': 3200, // Raigeki
    '44095762': 3000, // Mirror Force
    '83764718': 2900, // Monster Reborn
    '04206964': 2500, // Trap Hole
    '24094653': 2400 // Polymerization
  };
  const fixed = fixedScores[String(card?.id)];
  if (fixed) return fixed;
  const attack = Number(card?.atk ?? card?.baseAtk ?? 0);
  const defense = Number(card?.def ?? card?.baseDef ?? 0);
  const extraBonus = isExtraDeckCard(card) ? 500 : 0;
  return Math.max(attack, defense * 0.72) + extraBonus;
}

function buildAISideDeckDraft() {
  const editorModel = matchController?.getSideDeckEditorModel('opponent');
  if (!editorModel?.activeDeck) return null;
  const draft = structuredClone(editorModel.activeDeck);
  if (selectedAiDifficulty === 'easy' || draft.sideDeck.length === 0) return draft;

  let bestSwap = null;
  draft.sideDeck.forEach((sideCard, sideIndex) => {
    const section = isExtraDeckCard(sideCard) ? 'extraDeck' : 'mainDeck';
    draft[section].forEach((activeCard, deckIndex) => {
      const improvement = getCardStrategicScore(sideCard) - getCardStrategicScore(activeCard);
      if (
        !bestSwap
        || improvement > bestSwap.improvement
        || (
          improvement === bestSwap.improvement
          && `${sideCard.id}:${activeCard.id}` < `${bestSwap.sideCard.id}:${bestSwap.activeCard.id}`
        )
      ) {
        bestSwap = {
          section,
          sideIndex,
          deckIndex,
          sideCard,
          activeCard,
          improvement
        };
      }
    });
  });

  if (bestSwap?.improvement > 0) {
    draft[bestSwap.section][bestSwap.deckIndex] = bestSwap.sideCard;
    draft.sideDeck[bestSwap.sideIndex] = bestSwap.activeCard;
  }
  return draft;
}

function persistMatchBetweenDuels() {
  const view = matchController?.getViewModel();
  if (selectedDuelSeries !== 'match' || view?.status !== 'between_games') {
    return false;
  }
  const payload = {
    version: 1,
    controller: matchController.serialize(),
    selectedDeckId: currentSelectedDeckId,
    aiDifficulty: selectedAiDifficulty,
    clock: matchClock?.serialize() ?? null,
    savedAt: Date.now()
  };
  return writeStoredValue(STORAGE_KEYS.activeMatch, JSON.stringify(payload));
}

function clearPersistedMatch() {
  removeStoredValue(STORAGE_KEYS.activeMatch);
}

function stopMatchClock() {
  if (matchClockInterval !== null) clearInterval(matchClockInterval);
  matchClockInterval = null;
  matchClock = null;
  document.getElementById('match-clock')?.classList.add('hidden');
}

function syncMatchClock(snapshot = null) {
  const view = matchController?.getViewModel();
  if (view?.tournamentPolicy !== 'TCG_EU_SWISS' || !['active', 'between_games'].includes(view.status)) {
    stopMatchClock();
    return;
  }
  if (matchClockInterval !== null) clearInterval(matchClockInterval);
  matchClock = new TCGMatchClock({ snapshot });
  const tick = () => {
    const label = document.getElementById('match-clock');
    if (label) {
      label.textContent = `SWISS TCG · ${matchClock.label()}`;
      label.classList.remove('hidden');
    }
    if (matchClock.expired) finishMatchAtTime();
  };
  tick();
  if (matchClock) matchClockInterval = setInterval(tick, 1000);
}

function finishMatchAtTime() {
  const view = matchController?.getViewModel();
  if (view?.tournamentPolicy !== 'TCG_EU_SWISS' || !['active', 'between_games'].includes(view.status)) return false;
  const result = matchController.endMatchAtTime();
  duelLaunchGeneration += 1;
  stopMatchClock();
  clearPersistedMatch();
  game?.dispose?.();
  activeDuelInProgress = false;
  lastDuelResult = null;
  privateCardInspection.clear();
  publicCardConfirmation.clear();
  stopHologramHum();
  stopBGM();
  window.speechSynthesis?.cancel?.();
  cancelUiAnimations();
  cancelBoardAnimations(document.getElementById('duel-board'));
  if (pendingDecisionResolver) finishDecision(null);
  if (activeDialog) closeDialog(activeDialog, { restoreFocus: false });
  document.getElementById('gameover-title').textContent = 'TEMPS ÉCOULÉ · DOUBLE DÉFAITE';
  document.getElementById('gameover-text').textContent = `Le Match n’est pas terminé après 50 minutes. La politique Swiss KDE-E attribue une défaite aux deux joueurs. Duels terminés : Vous ${result.scores.player} — ${result.scores.opponent} Adversaire.`;
  restartBtn.textContent = 'NOUVEAU MATCH';
  document.body.classList.add('duel-ended');
  nextPhaseBtn.disabled = true;
  endTurnBtn?.classList.add('hidden');
  if (endTurnBtn) endTurnBtn.disabled = true;
  selectedAttackerIndex = selectedHandUid = pendingAction = null;
  pendingMatchLaunch = null;
  openDialog(gameoverModal, restartBtn);
  announceStatus('Temps écoulé. Double défaite du Match Swiss TCG.');
  return true;
}

function restorePersistedMatchBetweenDuels() {
  const payload = readStoredJson(STORAGE_KEYS.activeMatch, null);
  if (!payload || payload.version !== 1 || typeof payload.controller !== 'string') {
    if (payload) clearPersistedMatch();
    return false;
  }
  try {
    const restored = MatchController.deserialize(payload.controller, { engineOptions: nativeBuilderOptions('strict') });
    const view = restored.getViewModel();
    if (view.status !== 'between_games') {
      clearPersistedMatch();
      return false;
    }
    if (view.tournamentPolicy === 'TCG_EU_SWISS') {
      if (!payload.clock) throw new Error('Le chronomètre du Match sauvegardé est absent.');
      new TCGMatchClock({ snapshot: payload.clock });
    }
    matchController = restored;
    pendingMatchLaunch = null;
    selectedDuelSeries = 'match';
    selectedGameMode = 'strict';
    selectedAiDifficulty = ['easy', 'normal', 'hard'].includes(payload.aiDifficulty)
      ? payload.aiDifficulty
      : 'normal';
    const restoredDeckChoice = [...choiceCards].find(
      choice => choice.dataset.deckId === String(payload.selectedDeckId || 'kaiba')
    );
    if (restoredDeckChoice) {
      selectDeckChoice(restoredDeckChoice);
    }
    writeStoredValue(STORAGE_KEYS.duelSeries, selectedDuelSeries);
    writeStoredValue(STORAGE_KEYS.gameMode, selectedGameMode);
    writeStoredValue(STORAGE_KEYS.difficulty, selectedAiDifficulty);
    updateModeControls();
    syncMatchClock(payload.clock ?? null);
    if (matchController.getViewModel().status === 'complete') return false;
    closeDialog(startModal, { restoreFocus: false });
    openSideDeckEditor();
    if (sideDeckFeedback) {
      sideDeckFeedback.textContent =
        `Match restauré. ${sideDeckFeedback.textContent}`;
    }
    announceStatus('Match restauré entre deux Duels.');
    return true;
  } catch {
    clearPersistedMatch();
    return false;
  }
}

function returnToConfiguration({ announce = false } = {}) {
  privateCardInspection.clear();
  publicCardConfirmation.clear();
  duelistAvatarReturnDialog = null;
  duelLaunchGeneration += 1;
  stopMatchClock();
  leaveCampaign();
  // Leaving the Duel also tears down the active immersive presentation. The
  // cached module may be reused later, but no Real-view animation remains
  // visible behind the configuration dialog.
  void duelViewController?.setMode('compact');
  activeDuelInProgress = false;
  duelStartedAt = 0;
  lastDuelResult = null;
  lpAnimationFrames.forEach(frameId => cancelAnimationFrame(frameId));
  lpAnimationFrames.clear();
  cancelUiAnimations();
  cancelBoardAnimations(document.getElementById('duel-board'));
  game?.dispose?.();
  game?.cancelPendingAsyncWork?.();
  game = null;
  matchController = null;
  pendingMatchLaunch = null;
  sideDeckDraft = null;
  selectedSideDeckCard = null;
  selectedAttackerIndex = null;
  selectedHandUid = null;
  pendingAction = null;
  clearPersistedMatch();
  stopHologramHum();
  stopBGM();
  window.speechSynthesis?.cancel?.();
  document.body.classList.remove('duel-ended');
  if (activeDialog) closeDialog(activeDialog, { restoreFocus: false });
  document.querySelectorAll('#gameover-modal, #side-deck-modal, #extra-deck-modal, #public-zone-modal')
    .forEach(dialog => closeDialog(dialog, { restoreFocus: false }));
  const matchStatus = document.getElementById('match-status');
  if (matchStatus) {
    matchStatus.textContent = '';
    matchStatus.classList.add('hidden');
  }
  resetBtn.textContent = 'ABANDONNER LE DUEL';
  updateModeControls();
  openDialog(startModal, document.querySelector('.deck-choice-card.active') || startBtn);
  if (announce) announceStatus('Retour à la configuration. Le Duel actif est fermé.');
}

function abandonCurrentDuel() {
  if (!game || !activeDuelInProgress) return false;
  const result = {
    winner: 'opponent',
    loser: 'player',
    reason: 'surrender',
    source: 'player'
  };
  const ended = game.endGame?.('opponent', 'surrender');
  if (ended === false && !recordedFinishedGames.has(game)) {
    handleGameOver(result);
  }
  return ended !== false;
}

window.addEventListener('beforeunload', event => {
  if (!activeDuelInProgress) return;
  event.preventDefault();
  event.returnValue = '';
});

window.addEventListener('pagehide', () => {
  if (!activeDuelInProgress) persistMatchBetweenDuels();
});

function renderSideDeckEditor() {
  if (!sideDeckEditor || !sideDeckDraft) return;
  const previousFocus = document.activeElement?.classList?.contains('side-deck-card')
    ? {
      section: document.activeElement.dataset.section,
      index: document.activeElement.dataset.index
    }
    : null;
  sideDeckEditor.innerHTML = '';

  const createCardButton = (card, section, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'side-deck-card';
    button.dataset.section = section;
    button.dataset.index = String(index);
    button.classList.toggle(
      'selected',
      selectedSideDeckCard?.section === section && selectedSideDeckCard?.index === index
    );
    button.textContent = card.name;
    button.title = `${card.name} — ${card.type}`;
    button.setAttribute(
      'aria-label',
      `${card.name}, ${card.type || 'carte'}, ${section === 'sideDeck' ? 'Side Deck' : section === 'extraDeck' ? 'Extra Deck' : 'Main Deck'}. Sélectionner pour échanger.`
    );
    button.setAttribute('aria-describedby', 'side-deck-feedback');
    button.setAttribute(
      'aria-pressed',
      selectedSideDeckCard?.section === section && selectedSideDeckCard?.index === index
        ? 'true'
        : 'false'
    );
    button.addEventListener('click', () => {
      const current = { section, index };
      if (
        selectedSideDeckCard?.section === current.section
        && selectedSideDeckCard?.index === current.index
      ) {
        selectedSideDeckCard = null;
        sideDeckFeedback.textContent = 'Sélection annulée.';
        renderSideDeckEditor();
        return;
      }

      if (!selectedSideDeckCard) {
        selectedSideDeckCard = current;
        sideDeckFeedback.textContent = 'Choisissez maintenant la carte à échanger dans l’autre section.';
        renderSideDeckEditor();
        return;
      }

      const first = selectedSideDeckCard;
      const firstIsSide = first.section === 'sideDeck';
      const secondIsSide = current.section === 'sideDeck';
      if (firstIsSide === secondIsSide) {
        selectedSideDeckCard = current;
        sideDeckFeedback.textContent = 'Sélectionnez une carte du Side Deck et une carte du Main ou de l’Extra Deck.';
        renderSideDeckEditor();
        return;
      }

      const sideRef = firstIsSide ? first : current;
      const deckRef = firstIsSide ? current : first;
      const sideCard = sideDeckDraft.sideDeck[sideRef.index];
      const deckCard = sideDeckDraft[deckRef.section]?.[deckRef.index];
      const compatible = deckRef.section === 'extraDeck'
        ? isExtraDeckCard(sideCard)
        : !isExtraDeckCard(sideCard);
      if (!sideCard || !deckCard || !compatible) {
        selectedSideDeckCard = null;
        sideDeckFeedback.textContent = deckRef.section === 'extraDeck'
          ? 'Une carte de l’Extra Deck doit être échangée contre une carte Extra du Side Deck.'
          : 'Une carte du Main Deck doit être échangée contre une carte Main du Side Deck.';
        renderSideDeckEditor();
        return;
      }

      sideDeckDraft[deckRef.section][deckRef.index] = sideCard;
      sideDeckDraft.sideDeck[sideRef.index] = deckCard;
      const staged = matchController.stageSideDeck('player', sideDeckDraft);
      if (!staged.valid) {
        sideDeckDraft[deckRef.section][deckRef.index] = deckCard;
        sideDeckDraft.sideDeck[sideRef.index] = sideCard;
        selectedSideDeckCard = null;
        sideDeckFeedback.textContent = staged.issues?.map(issue => issue.message || issue.code).join(' | ') || 'Échange refusé.';
        renderSideDeckEditor();
        return;
      }
      persistMatchBetweenDuels();
      selectedSideDeckCard = null;
      sideDeckFeedback.textContent = `${deckCard.name} et ${sideCard.name} ont été échangées.`;
      renderSideDeckEditor();
    });
    return button;
  };

  const createSection = (title, section, cards) => {
    const wrapper = document.createElement('section');
    wrapper.className = 'side-deck-section';
    const heading = document.createElement('h3');
    heading.textContent = `${title} (${cards.length})`;
    const list = document.createElement('div');
    list.className = 'side-deck-card-list';
    cards.forEach((card, index) => list.appendChild(createCardButton(card, section, index)));
    wrapper.append(heading, list);
    return wrapper;
  };

  const registered = document.createElement('div');
  registered.className = 'side-deck-section-main';
  registered.append(
    createSection('MAIN DECK', 'mainDeck', sideDeckDraft.mainDeck),
    createSection('EXTRA DECK', 'extraDeck', sideDeckDraft.extraDeck)
  );
  sideDeckEditor.append(
    registered,
    createSection('SIDE DECK', 'sideDeck', sideDeckDraft.sideDeck)
  );

  if (previousFocus) {
    sideDeckEditor
      .querySelector(
        `.side-deck-card[data-section="${previousFocus.section}"][data-index="${previousFocus.index}"]`
      )
      ?.focus();
  }
}

function updateNextDuelButtonState() {
  const view = matchController?.getViewModel();
  if (!startNextDuelBtn || !view?.nextDuel) return;
  startNextDuelBtn.disabled = view.nextDuel.firstPlayerDecisionRequired;
  startNextDuelBtn.setAttribute(
    'aria-disabled',
    view.nextDuel.firstPlayerDecisionRequired ? 'true' : 'false'
  );
}

function openSideDeckEditor() {
  let view = matchController?.getViewModel();
  if (!view || view.status !== 'between_games') return;

  let randomMethodFeedback = '';
  if (view.nextDuel.randomDecisionRequired) {
    const randomWinner = chooseRandomParticipant();
    matchController.recordRandomMethodWinner(randomWinner);
    view = matchController.getViewModel();
    randomMethodFeedback = randomWinner === 'player'
      ? ' Après le Duel nul, la nouvelle méthode aléatoire vous donne le choix.'
      : " Après le Duel nul, la nouvelle méthode aléatoire donne le choix à l'IA.";
  }

  const editorModel = matchController.getSideDeckEditorModel('player');
  sideDeckDraft = structuredClone(editorModel.draftDeck || editorModel.activeDeck);
  selectedSideDeckCard = null;
  if (sideDeckScore) {
    sideDeckScore.textContent =
      `Score du Match : Vous ${view.scores.player} — ${view.scores.opponent} Adversaire`;
  }
  if (sideDeckFeedback) {
    sideDeckFeedback.textContent = editorModel.draftDeck.sideDeck.length > 0
      ? 'Sélectionnez deux cartes compatibles pour les échanger, ou conservez votre configuration.'
      : 'Votre Side Deck est vide : choisissez seulement qui commencera le prochain Duel.';
    sideDeckFeedback.textContent += randomMethodFeedback;
  }

  const chooserIsPlayer = view.nextDuel.chooserPlayerId === 'player';
  firstPlayerChoice?.classList.toggle('hidden', !chooserIsPlayer);
  nextFirstPlayerInputs.forEach(input => {
    input.checked = view.nextDuel.firstPlayerId === input.value;
  });
  if (!chooserIsPlayer && view.nextDuel.firstPlayerDecisionRequired) {
    matchController.chooseFirstPlayer('opponent', 'opponent');
    sideDeckFeedback.textContent += ' L’IA a choisi de commencer le prochain Duel.';
  }
  persistMatchBetweenDuels();

  renderSideDeckEditor();
  updateNextDuelButtonState();
  const initialFocus = editorModel.draftDeck.sideDeck.length > 0
    ? sideDeckEditor.querySelector('.side-deck-card')
    : (
      document.querySelector('input[name="next-first-player"]:not(:disabled)')
      || startNextDuelBtn
    );
  openDialog(sideDeckModal, initialFocus);
}

nextFirstPlayerInputs.forEach(input => {
  input.addEventListener('change', () => {
    if (!input.checked || !matchController) return;
    try {
      matchController.chooseFirstPlayer('player', input.value);
      sideDeckFeedback.textContent = input.value === 'player'
        ? 'Vous avez choisi de commencer le prochain Duel.'
        : 'Vous avez choisi de laisser l’adversaire commencer.';
      persistMatchBetweenDuels();
      updateNextDuelButtonState();
    } catch (error) {
      sideDeckFeedback.textContent = error.message;
    }
  });
});

clearSideSelectionBtn?.addEventListener('click', () => {
  selectedSideDeckCard = null;
  sideDeckFeedback.textContent = 'Sélection d’échange annulée.';
  renderSideDeckEditor();
});

abandonMatchBtn?.addEventListener('click', () => {
  if (window.confirm('Abandonner définitivement le Match et revenir à la configuration ? Le score en cours sera perdu.')) {
    returnToConfiguration({ announce: true });
  }
});

startNextDuelBtn?.addEventListener('click', async () => {
  if (!matchController || !sideDeckDraft) return;
  const staged = matchController.stageSideDeck('player', sideDeckDraft);
  if (!staged.valid) {
    sideDeckFeedback.textContent = staged.issues.map(issue => issue.message).join(' ');
    return;
  }
  try {
    const aiDraft = buildAISideDeckDraft();
    if (aiDraft) {
      let aiStaged = matchController.stageSideDeck('opponent', aiDraft);
      if (!aiStaged.valid) {
        const unchangedAI = matchController.getSideDeckEditorModel('opponent').activeDeck;
        aiStaged = matchController.stageSideDeck('opponent', unchangedAI);
      }
      if (!aiStaged.valid) {
        sideDeckFeedback.textContent = 'Le Side Deck de l’IA n’a pas pu être validé.';
        return;
      }
    }
    const prepared = matchController.prepareNextDuel();
    if (!prepared.valid) {
      sideDeckFeedback.textContent = prepared.issues.map(issue => issue.message).join(' ');
      return;
    }
    pendingMatchLaunch = prepared.launch;
    clearPersistedMatch();
    closeDialog(sideDeckModal, { restoreFocus: false });
    document.body.classList.remove('duel-ended');
    startHologramHum();
    await initGameInstance(prepared.launch);
  } catch (error) {
    sideDeckFeedback.textContent = error.message;
  }
});

/**
 * Handles GameOver overlays
 */
function normalizeDuelEndReason(reason) {
  const normalized = String(reason || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  const aliases = {
    lp: 'lp_zero',
    life_points: 'lp_zero',
    life_points_zero: 'lp_zero',
    deckout: 'deck_out',
    deck_empty: 'deck_out',
    concede: 'surrender',
    concession: 'surrender',
    abandoned: 'surrender',
    tie: 'draw'
  };
  return aliases[normalized] || normalized || 'other';
}

function normalizeDuelResult(resultOrWinner, legacyDetails = null) {
  const raw = resultOrWinner && typeof resultOrWinner === 'object'
    ? resultOrWinner
    : {
      ...(legacyDetails && typeof legacyDetails === 'object'
        ? legacyDetails
        : (typeof legacyDetails === 'string' ? { reason: legacyDetails } : {})),
      winner: resultOrWinner
    };
  let winner = raw.winner ?? raw.winnerId ?? null;
  if (winner === 'draw' || raw.draw === true) winner = null;
  if (!['player', 'opponent'].includes(winner)) winner = null;
  const loser = ['player', 'opponent'].includes(raw.loser)
    ? raw.loser
    : winner === 'player'
      ? 'opponent'
      : winner === 'opponent'
        ? 'player'
        : null;

  let reason = normalizeDuelEndReason(raw.reason || raw.endReason);
  if (reason === 'other') {
    const loserDeck = loser === 'player' ? game?.playerDeck : game?.opponentDeck;
    const loserLp = loser === 'player' ? game?.playerLP : game?.opponentLP;
    if (Array.isArray(loserDeck) && loserDeck.length === 0 && Number(loserLp) > 0) {
      reason = 'deck_out';
    } else if (Number(loserLp) <= 0) {
      reason = 'lp_zero';
    } else if (winner === null) {
      reason = 'draw';
    }
  }
  if (winner === null && reason === 'other') reason = 'draw';
  return {
    winner,
    loser,
    reason,
    source: raw.source || raw.cause || null
  };
}

function getDuelResultMessage(result) {
  if (result.winner === null) {
    return 'Le Duel se termine sans vainqueur.';
  }
  const playerWon = result.winner === 'player';
  if (result.reason === 'exodia') {
    return playerWon
      ? 'Victoire par Exodia : vous avez réuni les cinq parties en main.'
      : 'Défaite par Exodia : l’adversaire a réuni les cinq parties en main.';
  }
  if (result.reason === 'deck_out') {
    return playerWon
      ? 'Victoire par Deck Out : l’adversaire ne pouvait plus piocher.'
      : 'Défaite par Deck Out : votre Deck ne contenait plus de carte à piocher.';
  }
  if (result.reason === 'surrender') {
    return playerWon
      ? 'Victoire par abandon de l’adversaire.'
      : 'Vous avez abandonné ce Duel.';
  }
  if (result.reason === 'lp_zero') {
    return playerWon
      ? 'Victoire : les Life Points de l’adversaire ont atteint zéro.'
      : 'Défaite : vos Life Points ont atteint zéro.';
  }
  return playerWon
    ? 'Vous remportez ce Duel.'
    : 'L’adversaire remporte ce Duel.';
}

function getDuelReasonLabel(reason) {
  return {
    lp_zero: 'Life Points à zéro',
    deck_out: 'Deck Out',
    exodia: 'Exodia',
    surrender: 'abandon',
    draw: 'nul',
    other: 'autre'
  }[reason] || 'autre';
}

function handleGameOver(resultOrWinner, legacyDetails = null) {
  privateCardInspection.clear();
  publicCardConfirmation.clear();
  if (matchClock?.expired && matchController?.getViewModel().tournamentPolicy) {
    finishMatchAtTime();
    return;
  }
  if (game && recordedFinishedGames.has(game)) return;
  const result = normalizeDuelResult(resultOrWinner, legacyDetails);
  lastDuelResult = result;
  activeDuelInProgress = false;
  stopHologramHum();
  stopBGM();
  window.speechSynthesis?.cancel?.();
  cancelUiAnimations();
  cancelBoardAnimations(document.getElementById('duel-board'));
  if (pendingDecisionResolver) finishDecision(null);
  const gameoverTitle = document.getElementById('gameover-title');
  const gameoverText = document.getElementById('gameover-text');
  let matchView = matchController?.getViewModel() || null;

  if (game) {
    recordedFinishedGames.add(game);
    duelStatistics.duels += 1;
    if (result.winner === 'player') duelStatistics.wins += 1;
    else if (result.winner === 'opponent') duelStatistics.losses += 1;
    else duelStatistics.draws += 1;
    const statisticsReason = ['lp_zero', 'deck_out', 'surrender', 'draw', 'exodia'].includes(result.reason)
      ? result.reason
      : 'other';
    duelStatistics.reasons[statisticsReason] += 1;
    duelStatistics.last = {
      reason: statisticsReason,
      reasonLabel: getDuelReasonLabel(statisticsReason),
      durationSeconds: duelStartedAt > 0
        ? Math.max(0, Math.round((Date.now() - duelStartedAt) / 1000))
        : 0,
      format: selectedDuelSeries,
      mode: selectedGameMode,
      difficulty: selectedAiDifficulty,
      recordedAt: new Date().toISOString()
    };
    writeStoredValue(STORAGE_KEYS.statistics, JSON.stringify(duelStatistics));
    renderDuelStatistics();
    if (selectedDuelSeries === 'match' && matchView?.status === 'active') {
      matchView = matchController.recordDuelResult(result.winner);
      if (matchView?.status === 'between_games') persistMatchBetweenDuels();
      else clearPersistedMatch();
    }
  }

  const baseResultMessage = getDuelResultMessage(result);
  if (result.winner === 'player') {
    gameoverTitle.textContent = "VICTOIRE !";
    gameoverTitle.style.color = "var(--neon-cyan)";
    gameoverText.textContent = baseResultMessage;
  } else if (result.winner === 'opponent') {
    gameoverTitle.textContent = "DÉFAITE...";
    gameoverTitle.style.color = "var(--neon-magenta)";
    gameoverText.textContent = baseResultMessage;
  } else {
    gameoverTitle.textContent = "MATCH NUL";
    gameoverTitle.style.color = "var(--neon-gold)";
    gameoverText.textContent = baseResultMessage;
  }

  if (selectedDuelSeries === 'match' && matchView) {
    if (matchView.status === 'between_games') {
      gameoverTitle.textContent = result.winner === 'player'
        ? `DUEL ${matchView.games.length} GAGNÉ`
        : result.winner === 'opponent'
          ? `DUEL ${matchView.games.length} PERDU`
          : `DUEL ${matchView.games.length} NUL`;
      gameoverText.textContent =
        `${baseResultMessage} Score du Match : Vous ${matchView.scores.player} — ${matchView.scores.opponent} Adversaire. Préparez votre Side Deck avant le Duel suivant.`;
      restartBtn.textContent = 'PRÉPARER LE DUEL SUIVANT';
    } else if (matchView.status === 'complete') {
      stopMatchClock();
      const playerWon = matchView.winnerId === 'player';
      gameoverTitle.textContent = matchView.winnerId === null
        ? 'MATCH NUL'
        : playerWon ? 'MATCH GAGNÉ !' : 'MATCH PERDU';
      gameoverTitle.style.color = playerWon ? 'var(--neon-cyan)' : 'var(--neon-magenta)';
      gameoverText.textContent =
        `${baseResultMessage} Résultat final : Vous ${matchView.scores.player} — ${matchView.scores.opponent} Adversaire.`;
      restartBtn.textContent = 'NOUVEAU MATCH';
    }
  } else {
    restartBtn.textContent = 'RECOMMENCER';
  }

  document.getElementById('btn-result-campaign').classList.toggle('hidden', !activeCampaignMissionId);
  if (activeCampaignMissionId && campaignTracker && game) {
    campaignTracker.observeState(game);
    const campaignResult = campaignController.complete(activeCampaignMissionId, result.winner || 'draw', campaignTracker.snapshot(game));
    gameoverText.textContent += ` ${campaignResult.summary}`;
    restartBtn.textContent = 'RÉESSAYER CE DÉFI';
  }

  const newlyUnlockedAvatars = refreshDuelistAvatarUnlocks();
  if (newlyUnlockedAvatars.length) {
    const names = newlyUnlockedAvatars.slice(0, 3).map(id => getDuelistAvatar(id)?.name).filter(Boolean);
    const remaining = newlyUnlockedAvatars.length > 3 ? ` et ${newlyUnlockedAvatars.length - 3} autre(s)` : '';
    gameoverText.textContent += ` Avatars débloqués : ${names.join(', ')}${remaining}.`;
  }

  document.body.classList.add('duel-ended');
  nextPhaseBtn.disabled = true;
  endTurnBtn?.classList.add('hidden');
  if (endTurnBtn) endTurnBtn.disabled = true;
  pendingAction = null;
  openDialog(gameoverModal, restartBtn);
  announceStatus(`${gameoverTitle.textContent}. ${gameoverText.textContent}`);
}

/**
 * Card search debounce and fetch
 */
const searchInput = document.getElementById('search-input');
const searchResults = document.getElementById('search-results');
let searchTimeout = null;
let latestSearchRequest = 0;

searchInput.addEventListener('input', () => {
  clearTimeout(searchTimeout);
  latestSearchRequest += 1;

  const query = searchInput.value;
  if (!query || query.trim().length < 2) {
    searchResults.innerHTML = '';
    return;
  }

  searchResults.innerHTML = '<div style="grid-column:1/-1; text-align:center; font-size:0.75rem; color:var(--text-dim);">Recherche...</div>';
  const requestId = latestSearchRequest;

  searchTimeout = setTimeout(async () => {
    const cards = await searchCards(query);
    if (requestId === latestSearchRequest && query === searchInput.value) {
      displaySearchResults(cards);
    }
  }, 400);
});

function displaySearchResults(cards) {
  searchResults.innerHTML = '';

  if (cards.length === 0) {
    searchResults.innerHTML = '<div style="grid-column:1/-1; text-align:center; font-size:0.75rem; color:var(--text-dim);">Aucune carte trouvée.</div>';
    return;
  }

  cards.forEach(card => {
    const div = document.createElement('button');
    div.type = 'button';
    div.className = 'result-card-item';
    div.dataset.id = card.id;

    // Use cropped image for search result thumbnail
    const thumbnail = document.createElement('div');
    thumbnail.className = 'result-card-img';
    const thumbnailUrl = safeImageUrl(
      card.image_url_cropped,
      getCardCroppedImageUrl(card.id)
    );
    thumbnail.style.backgroundImage = `url("${thumbnailUrl}")`;

    const cardName = document.createElement('div');
    cardName.className = 'result-card-name';
    cardName.textContent = card.name;
    div.append(thumbnail, cardName);

    // Click on search result adds it to player's hand! Extremely fun sandbox feature
    div.addEventListener('click', () => {
      if (!game || game.winner) return;
      if (selectedGameMode !== 'sandbox' || game.rulesMode !== 'sandbox') {
        addLogEntry("La recherche API est disponible uniquement en mode Anime Sandbox.", 'system');
        return;
      }
      if (game.currentTurn !== 'player' || !game.currentPhase.startsWith('main') || game.isResolvingAction) {
        addLogEntry("Le mode Sandbox peut ajouter une carte uniquement pendant votre Main Phase.", 'system');
        return;
      }
      playClick();

      const cardState = game.addCardToHand(card, 'player');
      if (cardState) {
        addLogEntry(`Ajouté à votre main : **${cardState.name}**`, 'player');
      }
    });

    searchResults.appendChild(div);
  });
}

/**
 * Helper to calculate stereo panning based on zone index
 */
function getZonePan(side, idx) {
  return side === 'player' ? (idx - 2) * 0.35 : (2 - idx) * 0.35;
}

/**
 * Custom color based on card attribute
 */
function getAttributeColor(attribute) {
  if (!attribute) return '#00ffff';
  switch (attribute.toLowerCase()) {
    case 'light': return '#ffd700';
    case 'dark': return '#ba55d3';
    case 'fire': return '#ff4500';
    case 'water': return '#00bfff';
    case 'wind': return '#32cd32';
    case 'earth': return '#d2691e';
    default: return '#00ffff';
  }
}

/**
 * Projectile style based on monster race
 */
function getAttackProjType(card) {
  if (!card) return 'beam';
  if (card.id === '89631139' || card.id === '23995346') {
    return 'signature-blueeyes';
  }
  if (card.id === '46986414' || card.id === '38033121') {
    return 'signature-darkmagician';
  }
  const race = card.race ? card.race.toLowerCase() : '';
  if (race.includes('spellcaster') || race.includes('fiend')) {
    return 'magic';
  } else if (race.includes('warrior')) {
    return 'slash';
  }
  return 'beam';
}

/**
 * Central event visual routing system
 */
function handleGameAnimations(event) {
  // Private confirmations belong only to their authorized local inspection.
  // Consume even rejected inspect payloads before any public event consumer.
  if (event?.type === 'inspect') {
    publicCardConfirmation.clear();
    privateCardInspection.handle(event, game);
    return;
  }
  if (event?.private === true) return;
  if (publicCardConfirmation.handle(event, game)) privateCardInspection.clear();
  campaignTracker?.recordAnimation(event);
  duelViewController?.playAnimation?.(event);
  const boardEl = document.getElementById('duel-board');

  // A Chain may continue after a card changes visibility. Refresh that public
  // zone at resolution instead of leaving its old artwork until the Chain ends.
  if (event.type === 'set-monster' || event.type === 'flip-summon'
    || (event.type === 'toggle-position' && event.publicReveal === true
      && ['main', 'extra'].includes(event.zoneType || 'main'))) {
    const reference = { zoneType: event.zoneType || 'main', zoneIndex: event.zoneIndex };
    syncZoneCard(findMonsterZoneElement(boardEl, event.target, reference),
      game?.getMonsterEntry?.(event.target, reference)?.card || null, event.target);
  } else if (event.type === 'mystical-space-typhoon-cinematic') {
    const zone = event.zoneType === 'field' ? document.getElementById(`${event.target}-field-zone`)
      : boardEl.querySelector(`.${event.target}-s-zone[data-index="${event.zoneIndex}"]`);
    const card = event.zoneType === 'field' ? game?.[`${event.target}FieldSpell`]
      : game?.getSideState?.(event.target)?.spells[event.zoneIndex];
    syncZoneCard(zone, card || null, event.target);
    duelViewController?.update(game);
  }

  if (event.type === 'summon') {
    const side = event.target;
    const idx = event.zoneIndex;
    const card = event.card;

    const zoneEl = findMonsterZoneElement(boardEl, side, {
      zoneType: event.zoneType || 'main',
      zoneIndex: idx
    });

    if (zoneEl) {
      spawnHologram(zoneEl, card, side === 'opponent');
      playSummon(getZonePan(side, idx));
    }
  }
  else if (event.type === 'toggle-position' && ['main', 'extra'].includes(event.zoneType || 'main')) {
    const side = event.target;
    const idx = event.zoneIndex;
    const position = event.position;

    const zoneEl = findMonsterZoneElement(boardEl, side, {
      zoneType: event.zoneType || 'main',
      zoneIndex: idx
    });

    if (zoneEl) {
      const holo = zoneEl.querySelector('.monster-hologram-entity');

      playClick(getZonePan(side, idx));

      if (position === 'defense') {
        zoneEl.classList.add('defense-position');
        if (holo) holo.classList.add('defense-mode');
      } else {
        zoneEl.classList.remove('defense-position');
        if (holo) holo.classList.remove('defense-mode');
      }
    }
  }
  else if (event.type === 'activate') {
    const side = event.target;
    const idx = event.zoneIndex;
    const card = event.card;
    const faceDown = event.faceDown || false;

    const zoneQuery = event.zoneType === 'field'
      ? `#${side}-field-zone`
      : `.card-zone.${side}-s-zone[data-index="${idx}"]`;
    const zoneEl = boardEl.querySelector(zoneQuery);

    if (zoneEl && card) {
      zoneEl.innerHTML = '';
      const flatCard = createCardDOM(card, faceDown, Boolean(faceDown && side === 'opponent'));
      flatCard.classList.add('card-flat-on-board');
      zoneEl.appendChild(flatCard);

      if (faceDown) {
        flatCard.classList.add('placed-facedown');
      } else {
        flatCard.classList.add('placed');
        playClick(getZonePan(side, idx));
      }
    }
    if (event.zoneType === 'field' && side === 'player' && !event.fromSet) {
      // The live card has already left the hand while its activation Chain is
      // pending. Refresh only the hand representation; a full environment
      // update would incorrectly replace the previous scenery before the
      // activation resolves successfully.
      renderHand(game?.playerHand || []);
    }
  }
  else if (event.type === 'clear-spell') {
    const side = event.target;
    const idx = event.zoneIndex;

    const zoneQuery = `.card-zone.${side}-s-zone[data-index="${idx}"]`;
    const zoneEl = boardEl.querySelector(zoneQuery);

    if (zoneEl) {
      const cardEl = zoneEl.querySelector('.card-entity');
      if (cardEl) {
        const duelAtAnimation = game;
        cardEl.style.transition = 'opacity 0.5s';
        cardEl.style.opacity = '0';
        scheduleUiAnimation(() => {
          if (game !== duelAtAnimation || !zoneEl.contains(cardEl)) return;
          zoneEl.innerHTML = '';
        }, 500);
      }
    }
  }
  else if (event.type === 'destroy') {
    const side = event.target;
    const idx = event.zoneIndex;

    const zoneEl = findMonsterZoneElement(boardEl, side, {
      zoneType: event.zoneType || 'main',
      zoneIndex: idx
    });

    if (zoneEl) {
      const holo = zoneEl.querySelector('.monster-hologram-entity');
      const flatCard = zoneEl.querySelector('.card-entity');

      const coords = getLocalCoords(zoneEl, boardEl);
      const x = coords.x;
      const y = coords.y;

      const pan = getZonePan(side, idx);
      playExplosion(pan);
      createExplosion(boardEl, x, y, side === 'player' ? '#ff3300' : '#ff00cc');

      if (holo) {
        holo.classList.add('holo-dissolve');
      }
      if (flatCard) {
        flatCard.style.transition = 'opacity 0.4s';
        flatCard.style.opacity = '0';
      }

      const duelAtAnimation = game;
      scheduleUiAnimation(() => {
        if (game !== duelAtAnimation) return;
        if ((holo && zoneEl.contains(holo)) || (flatCard && zoneEl.contains(flatCard))) {
          zoneEl.innerHTML = '';
          zoneEl.classList.remove('defense-position');
        }
      }, 500);
    }
  }
  else if (event.type === 'attack-direct') {
    const target = event.target;
    const atkIdx = event.atkZoneIndex;
    const card = event.card;

    const side = target === 'player' ? 'opponent' : 'player';
    const zoneEl = findMonsterZoneElement(boardEl, side, {
      zoneType: event.atkZoneType || 'main',
      zoneIndex: atkIdx
    });

    if (zoneEl) {
      const srcPan = getZonePan(side, atkIdx);
      const destPan = target === 'player' ? 0.6 : -0.6;
      playAttack(srcPan, destPan);

      // Attacker physical lunge movement!
      const holo = zoneEl.querySelector('.monster-hologram-entity');
      if (holo) {
        const lungeY = side === 'player' ? -50 : 50;
        holo.style.setProperty('--lunge-y', `${lungeY}px`);
        holo.style.setProperty('--lunge-z', `15px`);
        holo.classList.remove('combat-lunge');
        void holo.offsetWidth; // trigger reflow
        holo.classList.add('combat-lunge');
        scheduleUiAnimation(() => holo.classList.remove('combat-lunge'), 500);
      }

      // Calculate coordinates to hit player LP or opponent LP
      const mockDest = document.createElement('div');
      mockDest.style.position = 'absolute';
      mockDest.style.width = '10px';
      mockDest.style.height = '10px';

      if (target === 'opponent') {
        mockDest.style.left = '50%';
        mockDest.style.top = '0px';
      } else {
        mockDest.style.left = '50%';
        mockDest.style.top = `${boardEl.clientHeight}px`;
      }
      boardEl.appendChild(mockDest);

      const color = getAttributeColor(card.attribute);
      const projType = getAttackProjType(card);

      animateAttack(boardEl, zoneEl, mockDest, color, projType).then(() => {
        mockDest.remove();
      });
    }
  }
  else if (event.type === 'attack-monster') {
    const side = event.attackerSide;
    const atkIdx = event.atkZoneIndex;
    const defIdx = event.defZoneIndex;

    const oppSide = side === 'player' ? 'opponent' : 'player';
    const srcReference = {
      zoneType: event.atkZoneType || 'main',
      zoneIndex: atkIdx
    };
    const destReference = {
      zoneType: event.defZoneType || 'main',
      zoneIndex: defIdx
    };
    const srcZone = findMonsterZoneElement(boardEl, side, srcReference);
    const destZone = findMonsterZoneElement(boardEl, oppSide, destReference);

    if (srcZone && destZone) {
      const attackerCard = game.getMonsterEntry?.(side, srcReference)?.card;
      const srcPan = getZonePan(side, atkIdx);
      const destPan = getZonePan(oppSide, defIdx);

      playAttack(srcPan, destPan);

      // 1. Attacker physical lunge movement!
      const attackerHolo = srcZone.querySelector('.monster-hologram-entity');
      if (attackerHolo) {
        const lungeY = side === 'player' ? -50 : 50;
        attackerHolo.style.setProperty('--lunge-y', `${lungeY}px`);
        attackerHolo.style.setProperty('--lunge-z', `15px`);
        attackerHolo.classList.remove('combat-lunge');
        void attackerHolo.offsetWidth; // trigger reflow
        attackerHolo.classList.add('combat-lunge');
        scheduleUiAnimation(() => attackerHolo.classList.remove('combat-lunge'), 500);
      }

      // 2. Recoil defender after attack projectile hits (approx 350ms delay)
      const defenderHolo = destZone.querySelector('.monster-hologram-entity');
      scheduleUiAnimation(() => {
        if (defenderHolo) {
          const recoilY = oppSide === 'player' ? 30 : -30;
          defenderHolo.style.setProperty('--recoil-y', `${recoilY}px`);
          defenderHolo.style.setProperty('--recoil-z', `-15px`);
          defenderHolo.classList.remove('combat-recoil');
          void defenderHolo.offsetWidth; // trigger reflow
          defenderHolo.classList.add('combat-recoil');
          scheduleUiAnimation(() => defenderHolo.classList.remove('combat-recoil'), 500);
        }
      }, 350);

      const color = getAttributeColor(attackerCard ? attackerCard.attribute : 'light');
      const projType = getAttackProjType(attackerCard);

      animateAttack(boardEl, srcZone, destZone, color, projType);
    }
  }
  else if (event.type === 'draw') {
    playDrawCard(0);
  }
  else if (event.type === 'lp-loss') {
    const pan = event.target === 'player' ? 0.5 : -0.5;
    playLpLoss(pan);
    triggerLPLossAnimation(event.target, event.damage);

    // Screen shake feedback
    const container = document.getElementById('parallax-container');
    if (container) {
      container.classList.remove('shake-screen');
      void container.offsetWidth; // Trigger reflow
      container.classList.add('shake-screen');
      scheduleUiAnimation(() => container.classList.remove('shake-screen'), 450);
    }

    // LP Glitch feedback
    const lpEl = document.getElementById(`${event.target}-lp`);
    if (lpEl) {
      lpEl.classList.add('glitch-text');
      scheduleUiAnimation(() => lpEl.classList.remove('glitch-text'), 600);
    }
  }
  else if (event.type === 'raigeki-cinematic') {
    const target = event.target;
    triggerRaigekiCinematic(boardEl, target);
  }
  else if (event.type === 'mirror-force-cinematic') {
    const target = event.target; // side that activated mirror force
    triggerMirrorForceCinematic(boardEl, target);
  }
  else if (event.type === 'reborn-cinematic') {
    const side = event.target;
    const idx = event.zoneIndex;
    triggerRebornCinematic(boardEl, side, idx);
  }
  else if (event.type === 'chain-pop') {
    const board = document.getElementById('duel-board');
    if (board) {
      const notifier = document.createElement('div');
      notifier.className = 'chain-notification';
      notifier.textContent = `CHAIN LINK ${event.linkNumber}`;
      board.appendChild(notifier);
      scheduleUiAnimation(() => notifier.remove(), 1200);
    }
    playSummon();
  }
  else if (event.type === 'chain-resolve') {
    playClick(0);
  }
}

// ----------------------------------------------------
// CENTRAL SPEECH SYNTHESIS & COMMENTATOR SYSTEM
// ----------------------------------------------------

function speakAnnounce(text) {
  if (!speechAnnouncerEnabled || window.speechSynthesis === undefined) return;
  try {
    window.speechSynthesis.cancel(); // Prevent queue buildup

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'fr-FR';
    utterance.rate = 1.15;
    utterance.pitch = 0.85;

    // Select French voice if possible
    const voices = window.speechSynthesis.getVoices();
    const frVoice = voices.find(v => v.lang.startsWith('fr'));
    if (frVoice) {
      utterance.voice = frVoice;
    }

    window.speechSynthesis.speak(utterance);
  } catch (e) {
    console.warn('Speech synthesis failed:', e);
  }
}

// Pre-trigger voices load
if (window.speechSynthesis !== undefined) {
  window.speechSynthesis.getVoices();
  if (window.speechSynthesis.onvoiceschanged !== undefined) {
    window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
  }
}

function handleLogSpeech(msg, type) {
  // Strip formatting
  const cleanMsg = msg.replace(/\*\*|__/g, '').replace(/<[^>]*>/g, '');

  if (type === 'phase') {
    if (cleanMsg.includes('Phase de Pioche')) {
      const turnName = cleanMsg.includes('Joueur') ? "du joueur" : "de l'adversaire";
      speakAnnounce(`Tour ${game.turnCount}. Phase de Pioche ${turnName}.`);
    } else if (cleanMsg.includes('Phase de Combat')) {
      speakAnnounce("Phase de Combat !");
    }
  }
  else if (type === 'player') {
    if (cleanMsg.includes('invoquez')) {
      const cardName = cleanMsg.split('invoquez ')[1].split(' (')[0];
      speakAnnounce(`Invocation ! ${cardName} !`);
    } else if (cleanMsg.includes('activez la Carte Magie')) {
      const cardName = cleanMsg.split('Magie ')[1].split(' !')[0];
      speakAnnounce(`Magie activée ! ${cardName} !`);
    } else if (cleanMsg.includes('posez une Carte Piège')) {
      speakAnnounce("Carte Piège posée face cachée !");
    }
  }
  else if (type === 'opponent') {
    if (cleanMsg.includes('invoque')) {
      const cardName = cleanMsg.split('invoque ')[1].split(' (')[0];
      speakAnnounce(`L'adversaire invoque ${cardName} !`);
    } else if (cleanMsg.includes('active la Carte Magie')) {
      const cardName = cleanMsg.split('Magie ')[1].split(' !')[0];
      speakAnnounce(`L'adversaire active la magie ${cardName} !`);
    } else if (cleanMsg.includes('pose une carte face cachée')) {
      speakAnnounce("L'adversaire pose une carte face cachée.");
    }
  }
  else if (type === 'danger') {
    if (cleanMsg.includes('subit')) {
      const target = cleanMsg.includes("L'adversaire") ? "L'adversaire" : "Le joueur";
      const pts = cleanMsg.split('subit ')[1].split(' points')[0];
      speakAnnounce(`${target} subit ${pts} points de dégâts !`);
    }
  }
  else if (type === 'duel-start') {
    speakAnnounce("Le duel commence ! Préparez vos disques de duel !");
  }
  else if (type === 'duel-end') {
    speakAnnounce(cleanMsg);
  }
}

function syncBoardZones(gameState) {
  (gameState.extraMonsterZones || []).forEach((entry, idx) => {
    const zoneEl = document.querySelector(`.card-zone.extra-m-zone[data-index="${idx}"]`);
    if (zoneEl) {
      zoneEl.dataset.side = entry?.controllerId || 'shared';
      zoneEl.dataset.controllerId = entry?.controllerId || '';
      zoneEl.classList.toggle('player-controlled', entry?.controllerId === 'player');
      zoneEl.classList.toggle('opponent-controlled', entry?.controllerId === 'opponent');
    }
    syncZoneCard(zoneEl, entry?.card || null, entry?.controllerId || 'shared');
  });

  // Sync Player Monsters
  gameState.playerMonsters.forEach((card, idx) => {
    const zoneEl = document.querySelector(`.card-zone.player-m-zone[data-index="${idx}"]`);
    syncZoneCard(zoneEl, card, 'player');
  });

  // Sync Opponent Monsters
  gameState.opponentMonsters.forEach((card, idx) => {
    const zoneEl = document.querySelector(`.card-zone.opponent-m-zone[data-index="${idx}"]`);
    syncZoneCard(zoneEl, card, 'opponent');
  });

  // Sync Player Spells/Traps
  gameState.playerSpells.forEach((card, idx) => {
    const zoneEl = document.querySelector(`.card-zone.player-s-zone[data-index="${idx}"]`);
    syncZoneCard(zoneEl, card, 'player');
  });

  // Sync Opponent Spells/Traps
  gameState.opponentSpells.forEach((card, idx) => {
    const zoneEl = document.querySelector(`.card-zone.opponent-s-zone[data-index="${idx}"]`);
    syncZoneCard(zoneEl, card, 'opponent');
  });

  // Sync Player Field Spell
  const playerFieldZone = document.getElementById('player-field-zone');
  syncZoneCard(playerFieldZone, gameState.playerFieldSpell, 'player');

  // Sync Opponent Field Spell
  const opponentFieldZone = document.getElementById('opponent-field-zone');
  syncZoneCard(opponentFieldZone, gameState.opponentFieldSpell, 'opponent');
}

function syncZoneCard(zoneEl, card, side) {
  if (!zoneEl) return;

  const zoneSideLabel = side === 'player'
    ? 'joueur'
    : (side === 'opponent' ? 'adversaire' : 'partagée');
  const isExtraMonsterZone = zoneEl.dataset.zoneType === 'extra-monster';
  if (isExtraMonsterZone) {
    zoneEl.dataset.ownerLabel = side === 'player'
      ? 'VOUS'
      : (side === 'opponent' ? 'IA' : 'LIBRE');
    zoneEl.tabIndex = card ? 0 : -1;
    zoneEl.setAttribute('aria-disabled', card ? 'false' : 'true');
  }

  if (card) {
    const faceDown = card.isSetFaceDown || (side === 'opponent' && card.location === 'hand');
    const concealIdentity = faceDown && side === 'opponent';
    // Concealed cards intentionally have no data-id, so locate them by their
    // non-sensitive state marker instead.
    const existingCardEl = concealIdentity
      ? zoneEl.querySelector('.card-entity[data-concealed="true"]')
      : [...zoneEl.querySelectorAll('.card-entity[data-card-visible="true"]')]
        .find(element => String(element.dataset.uid) === String(card.uid));
    const zoneTypeLabel = ['monster', 'extra-monster'].includes(zoneEl.dataset.zoneType)
      ? (zoneEl.dataset.zoneType === 'extra-monster' ? 'Monstre Extra' : 'monstre')
      : (zoneEl.dataset.zoneType === 'field' ? 'Terrain' : 'magie ou piège');
    const zoneNumber = zoneEl.dataset.zoneType === 'field' || zoneEl.dataset.index === undefined
      ? ''
      : ` ${Number(zoneEl.dataset.index) + 1}`;
    const baseAriaLabel = concealIdentity
      ? `Zone ${zoneTypeLabel}${zoneNumber} ${zoneSideLabel}, carte face cachée`
      : `Zone ${zoneTypeLabel}${zoneNumber} ${zoneSideLabel}, ${card.name}${faceDown ? ', face cachée' : ''}${side === 'player' ? '. Ouvrir les actions' : ''}`;
    zoneEl.dataset.baseAriaLabel = baseAriaLabel;
    zoneEl.setAttribute('aria-label', baseAriaLabel);

    if (!existingCardEl) {
      zoneEl.innerHTML = '';

      if (card.position === 'defense') {
        zoneEl.classList.add('defense-position');
      } else {
        zoneEl.classList.remove('defense-position');
      }

      const flatCard = createCardDOM(card, faceDown, concealIdentity);
      flatCard.classList.add('card-flat-on-board');
      if (faceDown) flatCard.classList.add('placed-facedown');
      else flatCard.classList.add('placed');

      zoneEl.appendChild(flatCard);

      if (card.card_type === 'monster') {
        const existingHolo = zoneEl.querySelector('.monster-hologram-entity');
        if (!existingHolo) {
          const holo = createMonsterHologramDOM(card, side === 'opponent');
          if (card.position === 'defense') holo.classList.add('defense-mode');
          if (faceDown) holo.classList.add('face-down');
          holo.classList.add('active-hologram');
          zoneEl.appendChild(holo);
        }
      }
    } else {
      if (card.position === 'defense') {
        zoneEl.classList.add('defense-position');
      } else {
        zoneEl.classList.remove('defense-position');
      }

      const holo = zoneEl.querySelector('.monster-hologram-entity');
      if (holo) {
        const atk = typeof card.getAtk === 'function' ? card.getAtk() : card.atk;
        const def = typeof card.getDef === 'function' ? card.getDef() : card.def;
        if (card.position === 'defense') holo.classList.add('defense-mode');
        else holo.classList.remove('defense-mode');

        if (faceDown) holo.classList.add('face-down');
        else holo.classList.remove('face-down');

        if (!concealIdentity) {
          holo.dataset.uid = card.uid;
          holo.setAttribute('aria-label', `${card.name}, ATK ${atk}, DEF ${def ?? 'non applicable'}`);
          holo.classList.toggle('power-aura', atk >= 2500);
          const atkBadge = holo.querySelector('.stat-badge.atk');
          const defBadge = holo.querySelector('.stat-badge.def');
          if (atkBadge) atkBadge.textContent = `ATK ${atk}`;
          if (defBadge) defBadge.textContent = `DEF ${def !== null ? def : '—'}`;
        }
      }

      const inner = existingCardEl.querySelector('.card-inner');
      if (inner) {
        if (faceDown) {
          inner.classList.add('face-down');
        } else {
          inner.classList.remove('face-down');
        }
      }
    }

    let scaleBadge = zoneEl.querySelector('.pendulum-scale-badge');
    if (card.isPendulumScale) {
      if (!scaleBadge) {
        scaleBadge = document.createElement('span');
        scaleBadge.className = 'pendulum-scale-badge';
        zoneEl.appendChild(scaleBadge);
      }
      scaleBadge.textContent = `ÉCHELLE ${card.pendulumScale}`;
    } else {
      scaleBadge?.remove();
    }
  } else {
    zoneEl.innerHTML = '';
    zoneEl.classList.remove('defense-position');
    const zoneTypeLabel = ['monster', 'extra-monster'].includes(zoneEl.dataset.zoneType)
      ? (zoneEl.dataset.zoneType === 'extra-monster' ? 'Monstre Extra' : 'monstre')
      : (zoneEl.dataset.zoneType === 'field' ? 'Terrain' : 'magie ou piège');
    const zoneNumber = zoneEl.dataset.zoneType === 'field' || zoneEl.dataset.index === undefined
      ? ''
      : ` ${Number(zoneEl.dataset.index) + 1}`;
    const baseAriaLabel = `Zone ${zoneTypeLabel}${zoneNumber} ${zoneSideLabel}, vide`;
    zoneEl.dataset.baseAriaLabel = baseAriaLabel;
    zoneEl.setAttribute('aria-label', baseAriaLabel);
  }
  if (zoneEl.dataset.zoneType === 'field') {
    zoneEl.tabIndex = card ? 0 : -1;
    zoneEl.setAttribute('aria-disabled', card ? 'false' : 'true');
  }
}

if (import.meta.env.DEV) {
  Object.defineProperty(window, '__YGO_QA__', {
    configurable: true,
    value: Object.freeze({
      getGame: () => game,
      getViewMode: () => duelViewController?.getMode() || 'compact',
      setViewMode: mode => duelViewController?.setMode(mode),
      getMatchView: () => matchController?.getViewModel() || null,
      getCampaignProgress: () => structuredClone(campaignController.progress),
      getActiveCampaignMissionId: () => activeCampaignMissionId,
      finishDuel: (winner, reason = 'lp_zero') => game?.endGame(winner, reason)
    })
  });
}

queueMicrotask(async () => {
  if (!readStoredValue(STORAGE_KEYS.activeMatch)) return;
  try {
    await ensureNativeCatalogue();
    restorePersistedMatchBetweenDuels();
  } catch {
    announceStatus('Le catalogue du Match sauvegardé n’a pas pu être chargé. Réessayez en rechargeant la page.');
  }
});
