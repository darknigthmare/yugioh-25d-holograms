import { DuelGame } from './src/game.js';
import {
  initBoardTilt,
  createCardDOM,
  spawnHologram,
  animateAttack,
  createExplosion,
  getLocalCoords,
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

let game = null;
let selectedAttackerIndex = null;
let currentDraggedUid = null;
let selectedHandUid = null;
let pendingAction = null;
const recordedFinishedGames = new WeakSet();
const lpAnimationFrames = new Map();

const STORAGE_KEYS = Object.freeze({
  muted: 'ygo_muted',
  gameMode: 'ygo_game_mode',
  difficulty: 'ygo_ai_difficulty',
  customDeck: 'ygo_custom_deck',
  statistics: 'ygo_duel_statistics'
});

function readStoredJson(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return value && typeof value === 'object' ? value : fallback;
  } catch {
    return fallback;
  }
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
  activeDialog = dialog;

  requestAnimationFrame(() => {
    const target = preferredFocus
      || dialog.querySelector('[autofocus]')
      || dialog.querySelector(focusableSelector)
      || dialog.querySelector('.modal-content')
      || dialog;
    target?.focus();
  });
}

function closeDialog(dialog, { restoreFocus = true } = {}) {
  if (!dialog) return;
  dialog.classList.add('hidden');

  if (activeDialog === dialog) {
    activeDialog = null;
    document.body.classList.remove('modal-open');
    if (restoreFocus && dialogReturnFocus?.isConnected) {
      dialogReturnFocus.focus();
    }
    dialogReturnFocus = null;
  }
}

function dismissActiveDialog() {
  if (!activeDialog || activeDialog.dataset.dismissible !== 'true') return;

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

  if (window.innerWidth <= 1050) {
    const availableWidth = Math.max(280, field.clientWidth - 16);
    const scale = Math.min(1, availableWidth / 960);
    boardWrapper.style.setProperty('--responsive-board-scale', String(scale));
  } else {
    boardWrapper.style.removeProperty('--responsive-board-scale');
  }
}

window.addEventListener('resize', updateResponsiveBoardScale, { passive: true });
requestAnimationFrame(updateResponsiveBoardScale);

// Setup Mute Toggle
const muteBtn = document.getElementById('btn-mute');
let uiMuted = localStorage.getItem(STORAGE_KEYS.muted) === 'true';
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
  localStorage.setItem(STORAGE_KEYS.muted, String(uiMuted));
  speechAnnouncerEnabled = !uiMuted;
  if (uiMuted && window.speechSynthesis !== undefined) {
    window.speechSynthesis.cancel();
  }
  updateMuteControl();
  announceStatus(uiMuted ? 'Son désactivé' : 'Son activé');
});

// Setup Start game trigger (safeguard for Web Audio)
const startModal = document.getElementById('start-modal');
const startBtn = document.getElementById('btn-start-duel');
startBtn.addEventListener('click', () => {
  closeDialog(startModal, { restoreFocus: false });
  startHologramHum();
  initGameInstance();
});
openDialog(startModal, document.querySelector('.deck-choice-card.active'));

// Setup Restart Game trigger
const gameoverModal = document.getElementById('gameover-modal');
const restartBtn = document.getElementById('btn-restart-duel');
restartBtn.addEventListener('click', () => {
  closeDialog(gameoverModal, { restoreFocus: false });
  document.body.classList.remove('duel-ended');
  startHologramHum();
  initGameInstance();
});

// Reset Game button
const resetBtn = document.getElementById('btn-reset');
resetBtn.addEventListener('click', () => {
  if (confirm("Réinitialiser le duel actuel ?")) {
    initGameInstance();
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
    if (game.playerExtraDeck.length === 0) {
      extraList.innerHTML = '<p class="modal-empty-state">Votre Extra Deck est vide.</p>';
    }

    game.playerExtraDeck.forEach(card => {
      const cardEl = createCardDOM(card, false);
      cardEl.setAttribute('role', 'button');
      cardEl.setAttribute('tabindex', '0');
      cardEl.setAttribute('aria-label', `Tenter d’invoquer ${card.name} depuis l’Extra Deck`);
      cardEl.addEventListener('click', async () => {
        closeDialog(extraModal);
        await game.summonExtraDeck(card.uid);
      });
      cardEl.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          cardEl.click();
        }
      });
      extraList.appendChild(cardEl);
    });

    openDialog(extraModal, extraList.querySelector('[role="button"]') || closeExtraBtn);
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

// Setup Action Choice Modal listeners (Face Up / Face Down)
const actionModal = document.getElementById('action-modal');
const btnFaceUp = document.getElementById('btn-action-faceup');
const btnFaceDown = document.getElementById('btn-action-facedown');
const btnCancel = document.getElementById('btn-action-cancel');

if (actionModal && btnFaceUp && btnFaceDown && btnCancel) {
  btnFaceUp.addEventListener('click', async () => {
    if (!pendingAction || !game) return;
    closeDialog(actionModal);
    const { uid, zoneType, index } = pendingAction;
    pendingAction = null;

    if (zoneType === 'monster') {
      await game.summonMonster(uid, index);
    } else if (zoneType === 'spell') {
      await game.playSpellTrap(uid, index);
    }
  });

  btnFaceDown.addEventListener('click', async () => {
    if (!pendingAction || !game) return;
    closeDialog(actionModal);
    const { uid, zoneType, index } = pendingAction;
    pendingAction = null;

    if (zoneType === 'monster') {
      await game.setMonsterFaceDown(uid, index);
    } else if (zoneType === 'spell') {
      await game.setSpellTrapFaceDown(uid, index);
    }
  });

  btnCancel.addEventListener('click', () => {
    pendingAction = null;
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
  if (!request || request.side !== 'player' || !decisionModal) return null;

  return new Promise(resolve => {
    if (pendingDecisionResolver) {
      pendingDecisionResolver(null);
    }
    pendingDecisionResolver = resolve;
    decisionOptions.innerHTML = '';

    if (['activate-monster-effect', 'activate-hand-effect', 'activate-field-effect'].includes(request.type)) {
      decisionTitle.textContent = 'ACTIVER UN EFFET ?';
      const damageText = request.damage ? ` pour éviter ${request.damage} dommages` : '';
      decisionDescription.textContent = request.card?.name
        ? `Souhaitez-vous activer l’effet optionnel de ${request.card.name}${damageText} ?`
        : 'Souhaitez-vous activer cet effet optionnel ?';

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
      request.choices.forEach(choice => {
        const value = typeof choice === 'object' ? choice.value : choice;
        const label = typeof choice === 'object'
          ? choice.label
          : ({ heads: 'PILE', tails: 'FACE' }[choice] || String(choice));
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'btn';
        button.textContent = label;
        button.addEventListener('click', () => finishDecision(value));
        decisionOptions.appendChild(button);
      });
      decisionCancelBtn.textContent = 'ANNULER';
      decisionCancelBtn.classList.toggle('hidden', request.required === true);
    } else if (Array.isArray(request.candidates) && request.candidates.length > 0) {
      decisionTitle.textContent = 'CHOISIR UNE CARTE';
      decisionDescription.textContent = 'Sélectionnez la cible de l’effet.';
      request.candidates.forEach(candidate => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'decision-card-option';
        const stats = candidate.atk === undefined
          ? ''
          : ` — ATK ${candidate.atk} / DEF ${candidate.def ?? '—'}`;
        button.textContent = `${candidate.name}${stats}`;
        button.addEventListener('click', () => finishDecision(candidate.uid));
        decisionOptions.appendChild(button);
      });
      decisionCancelBtn.textContent = request.type === 'chain-response'
        ? 'PASSER LA PRIORITÉ'
        : 'UTILISER LE CHOIX CONSEILLÉ';
      decisionCancelBtn.classList.remove('hidden');
    } else {
      pendingDecisionResolver = null;
      resolve(null);
      return;
    }

    openDialog(decisionModal, decisionOptions.querySelector('button'));
  });
}

decisionCancelBtn?.addEventListener('click', () => finishDecision(null));

function requestUiChainOpportunity(request) {
  if (!request || request.side !== 'player' || !request.candidates?.length) return null;
  return requestUiDecision({
    type: 'chain-response',
    side: 'player',
    title: 'RÉPONDRE À LA CHAÎNE ?',
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

if (settingsModal && settingsBtn && closeSettingsBtn && inputCardBack) {
  settingsBtn.addEventListener('click', () => {
    inputCardBack.value = localStorage.getItem('custom_card_back') || '';
    inputCardBack.removeAttribute('aria-invalid');
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

    localStorage.setItem('custom_card_back', validatedUrl);
    inputCardBack.removeAttribute('aria-invalid');
    closeDialog(settingsModal);
    announceStatus('Dos de carte appliqué.');
    if (game) {
      updateUI(game);
    }
  });
}

// Setup View Toggle (Arena vs Compact)
const toggleViewBtn = document.getElementById('btn-toggle-view');
const boardEl = document.getElementById('duel-board');
toggleViewBtn.addEventListener('click', () => {
  if (!boardEl.classList.contains('arena-mode') && !boardEl.classList.contains('real-mode')) {
    // Transition from Compact to Arena
    boardEl.classList.add('arena-mode');
    toggleViewBtn.textContent = 'VUE : ARÈNE';
    toggleViewBtn.classList.remove('btn-magenta');
    toggleViewBtn.style.borderColor = 'var(--neon-cyan)';
    playSummon();
    addLogEntry("Mode Arène activé ! Séparation du plateau et projection des hologrammes dans l'arène.", "system");
  } else if (boardEl.classList.contains('arena-mode')) {
    // Transition from Arena to Real Mode (Taille réelle)
    boardEl.classList.remove('arena-mode');
    boardEl.classList.add('real-mode');
    toggleViewBtn.textContent = 'VUE : RÉELLE';
    toggleViewBtn.classList.add('btn-magenta');
    toggleViewBtn.style.borderColor = 'var(--neon-magenta)';
    playSummon();
    addLogEntry("Mode Réel activé ! Les monstres apparaissent à TAILLE RÉELLE au centre !", "system");
  } else {
    // Transition from Real Mode to Compact
    boardEl.classList.remove('real-mode');
    toggleViewBtn.textContent = 'VUE : COMPACTE';
    toggleViewBtn.classList.remove('btn-magenta');
    toggleViewBtn.style.borderColor = 'var(--neon-cyan)';
    playSummon();
    addLogEntry("Mode Compact activé ! Réunification du plateau de jeu.", "system");
  }
});

// Next Phase button
const nextPhaseBtn = document.getElementById('btn-next-phase');
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
    [game.playerFieldSpell, game.opponentFieldSpell]
  ];
  return collections
    .flat()
    .find(card => card && String(card.uid) === String(uid)) || null;
}

// Inspector works with mouse, touch, and keyboard, but only for public cards.
async function inspectVisibleCard(target) {
  const inspectable = target.closest?.(
    '.card-entity[data-card-visible="true"], .monster-hologram-entity[data-card-visible="true"]'
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
    extra: ['23995346', '44508094', '31924889']
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
    extra: ['31924889']
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
    extra: []
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
      '66602787', '66602787', '66602787', // Saggi
      '13039848', '13039848', '13039848', // defensive neutral monster
      '48305365', '48305365', '48305365', // Axe Raider
      '49791927', '49791927', '49791927', // Tiger Axe
      '24094653', '24094653', '24094653', // Polymerization
      '12580477', '12580477', '12580477', // Raigeki
      '44095762', '44095762', '44095762', // Mirror Force
      '04206964', '04206964', '04206964', // Trap Hole
      '83764718', // Monster Reborn — Limited 1
      '88819587', '88819587', '88819587' // neutral Dragon support
    ],
    extra: ['23995346']
  },
  yugi: {
    main: [
      '46986414', '46986414', '46986414', // Dark Magician
      '38033121', '38033121', '38033121', // Dark Magician Girl
      '40640057', '40640057', '40640057', // Kuriboh
      '91152256', '91152256', '91152256', // Celtic Guardian
      '13039848', '13039848', '13039848', // Giant Soldier of Stone
      '15025844', '15025844', '15025844', // Mystical Elf
      '41392891', '41392891', '41392891', // Feral Imp
      '32452818', '32452818', '32452818', // Beaver Warrior
      '28279543', '28279543', // Curse of Dragon
      '06368038', '06368038', // Gaia
      '70781052', '70781052', // Summoned Skull
      '12580477', '12580477', '12580477', // Raigeki
      '44095762', '44095762', '44095762', // Mirror Force
      '04206964', '04206964', '04206964', // Trap Hole
      '83764718' // Monster Reborn — Limited 1
    ],
    extra: []
  },
  joey: {
    main: [
      '74677422', '74677422', '74677422', // Red-Eyes Black Dragon
      '71625222', '71625222', '71625222', // Time Wizard
      '88819587', '88819587', '88819587', // Baby Dragon
      '48305365', '48305365', '48305365', // Axe Raider
      '64428736', '64428736', '64428736', // Alligator's Sword
      '44287299', '44287299', '44287299', // Masaki
      '49791927', '49791927', '49791927', // Tiger Axe
      '05053103', '05053103', '05053103', // Battle Ox
      '91152256', '91152256', '91152256', // warrior support
      '12580477', '12580477', '12580477', // Raigeki
      '44095762', '44095762', '44095762', // Mirror Force
      '04206964', '04206964', '04206964', // Trap Hole
      '83764718', // Monster Reborn — Limited 1
      '13039848', '13039848', '13039848' // defensive neutral monster
    ],
    extra: []
  }
};

let selectedGameMode = localStorage.getItem(STORAGE_KEYS.gameMode) === 'sandbox'
  ? 'sandbox'
  : 'strict';
let selectedAiDifficulty = ['easy', 'normal', 'hard'].includes(localStorage.getItem(STORAGE_KEYS.difficulty))
  ? localStorage.getItem(STORAGE_KEYS.difficulty)
  : 'normal';
let currentSelectedDeckId = 'kaiba';

const savedCustomDeck = readStoredJson(STORAGE_KEYS.customDeck, { main: [], extra: [] });
let customDeckMainIds = Array.isArray(savedCustomDeck.main) ? savedCustomDeck.main.map(String) : [];
let customDeckExtraIds = Array.isArray(savedCustomDeck.extra) ? savedCustomDeck.extra.map(String) : [];
let duelStatistics = {
  duels: Math.max(0, Number(readStoredJson(STORAGE_KEYS.statistics, {}).duels) || 0),
  wins: Math.max(0, Number(readStoredJson(STORAGE_KEYS.statistics, {}).wins) || 0),
  losses: Math.max(0, Number(readStoredJson(STORAGE_KEYS.statistics, {}).losses) || 0),
  draws: Math.max(0, Number(readStoredJson(STORAGE_KEYS.statistics, {}).draws) || 0)
};

// Setup choice selector interaction
const choiceCards = document.querySelectorAll('.deck-choice-card');
const deckBuilderSec = document.getElementById('deck-builder-section');
const gameModeInputs = document.querySelectorAll('input[name="game-mode"]');
const difficultyInputs = document.querySelectorAll('input[name="ai-difficulty"]');
const modeDescription = document.getElementById('mode-description');
const sandboxPanel = document.getElementById('sandbox-panel');
const statisticsDisplay = document.getElementById('duel-statistics');

function saveCustomDeck() {
  localStorage.setItem(STORAGE_KEYS.customDeck, JSON.stringify({
    main: customDeckMainIds,
    extra: customDeckExtraIds
  }));
}

function renderDuelStatistics() {
  if (!statisticsDisplay) return;
  const drawText = duelStatistics.draws > 0 ? ` · ${duelStatistics.draws} nul` : '';
  statisticsDisplay.textContent = `${duelStatistics.duels} duel${duelStatistics.duels > 1 ? 's' : ''}`
    + ` · ${duelStatistics.wins} victoire${duelStatistics.wins > 1 ? 's' : ''}`
    + ` · ${duelStatistics.losses} défaite${duelStatistics.losses > 1 ? 's' : ''}${drawText}`;
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

  const strictMode = selectedGameMode === 'strict';
  const customChoice = document.querySelector('.deck-choice-card[data-deck-id="custom"]');
  if (customChoice) {
    customChoice.disabled = strictMode;
    customChoice.classList.toggle('hidden', strictMode);
    customChoice.setAttribute('aria-hidden', strictMode ? 'true' : 'false');
  }

  if (strictMode && currentSelectedDeckId === 'custom') {
    selectDeckChoice(document.querySelector('.deck-choice-card[data-deck-id="kaiba"]'));
  }

  if (sandboxPanel) {
    sandboxPanel.classList.toggle('hidden', strictMode);
    sandboxPanel.setAttribute('aria-hidden', strictMode ? 'true' : 'false');
  }
  const sandboxSearchInput = document.getElementById('search-input');
  if (sandboxSearchInput) {
    sandboxSearchInput.disabled = strictMode;
    sandboxSearchInput.setAttribute('aria-disabled', strictMode ? 'true' : 'false');
  }

  if (modeDescription) {
    modeDescription.textContent = strictMode
      ? 'Mode strict : decks intégrés légaux ; invocations et effets non pris en charge refusés.'
      : 'Anime Sandbox : recherche API et expérimentations libres activées.';
  }
}

gameModeInputs.forEach(input => {
  input.addEventListener('change', () => {
    if (!input.checked) return;
    selectedGameMode = input.value === 'sandbox' ? 'sandbox' : 'strict';
    localStorage.setItem(STORAGE_KEYS.gameMode, selectedGameMode);
    updateModeControls();
    announceStatus(selectedGameMode === 'strict' ? 'Mode TCG Advanced strict sélectionné.' : 'Mode Anime Sandbox sélectionné.');
  });
});

difficultyInputs.forEach(input => {
  input.addEventListener('change', () => {
    if (!input.checked) return;
    selectedAiDifficulty = ['easy', 'hard'].includes(input.value) ? input.value : 'normal';
    localStorage.setItem(STORAGE_KEYS.difficulty, selectedAiDifficulty);
    announceStatus(`Difficulté ${input.parentElement.textContent.trim()} sélectionnée.`);
  });
});

choiceCards.forEach(card => {
  card.addEventListener('click', () => {
    selectDeckChoice(card);
  });
});

updateModeControls();
renderDuelStatistics();

// Render the catalog of cards and current custom deck items
function initDeckBuilderUI() {
  const libraryContainer = document.getElementById('library-cards-list');
  libraryContainer.innerHTML = '';

  // Combine all normal starter cards + extra cards for the pool
  const allCardTemplates = [...STARTER_CARDS, ...EXTRA_DECK_CARDS];

  allCardTemplates.forEach(template => {
    const cardItem = document.createElement('button');
    cardItem.type = 'button';
    cardItem.className = 'builder-card-item';
    cardItem.style.backgroundImage = `url("${getCardCroppedImageUrl(template.id)}")`;
    cardItem.title = `${template.name} - ATK: ${template.atk} / DEF: ${template.def}`;
    cardItem.setAttribute('aria-label', `Ajouter ${template.name} au deck`);

    // Add event to add to my custom deck
    cardItem.addEventListener('click', () => {
      const isExtra = template.type.includes('Fusion') || template.type.includes('Synchro') || template.type.includes('Link');
      const targetList = isExtra ? customDeckExtraIds : customDeckMainIds;

      // Count current occurrences (max 3 limit)
      const count = targetList.filter(id => id === template.id).length;
      if (count < 3) {
        targetList.push(template.id);
        saveCustomDeck();
        updateDeckBuilderList();
      } else {
        announceStatus(`Maximum atteint : trois copies de ${template.name}.`);
      }
    });

    libraryContainer.appendChild(cardItem);
  });

  updateDeckBuilderList();
}

function updateDeckBuilderList() {
  const deckListContainer = document.getElementById('builder-my-deck-list');
  deckListContainer.innerHTML = '';

  const allCardTemplates = [...STARTER_CARDS, ...EXTRA_DECK_CARDS];

  // Map custom deck IDs to actual card templates
  const mainCards = customDeckMainIds.map(id => allCardTemplates.find(t => t.id === id)).filter(Boolean);
  const extraCards = customDeckExtraIds.map(id => allCardTemplates.find(t => t.id === id)).filter(Boolean);
  const myDeckCombined = [...mainCards, ...extraCards];

  myDeckCombined.forEach((template, index) => {
    const cardItem = document.createElement('button');
    cardItem.type = 'button';
    cardItem.className = 'builder-card-item';
    cardItem.style.backgroundImage = `url("${getCardCroppedImageUrl(template.id)}")`;
    cardItem.title = `${template.name} (Cliquez pour retirer)`;
    cardItem.setAttribute('aria-label', `Retirer ${template.name} du deck`);

    cardItem.addEventListener('click', () => {
      const isExtra = template.type.includes('Fusion') || template.type.includes('Synchro') || template.type.includes('Link');
      if (isExtra) {
        const targetIndex = customDeckExtraIds.indexOf(template.id);
        if (targetIndex !== -1) customDeckExtraIds.splice(targetIndex, 1);
      } else {
        const targetIndex = customDeckMainIds.indexOf(template.id);
        if (targetIndex !== -1) customDeckMainIds.splice(targetIndex, 1);
      }
      saveCustomDeck();
      updateDeckBuilderList();
    });

    deckListContainer.appendChild(cardItem);
  });

  // Update stats
  const totalCount = customDeckMainIds.length;
  document.getElementById('deck-size-val').textContent = `Main: ${totalCount} / Extra: ${customDeckExtraIds.length}`;

  const validityBadge = document.getElementById('deck-validity-badge');
  const customDeckIsValid = totalCount >= 40 && totalCount <= 60 && customDeckExtraIds.length <= 15;
  validityBadge.setAttribute('aria-live', 'polite');
  if (customDeckIsValid) {
    validityBadge.textContent = "Taille valide";
    validityBadge.className = "badge-status success";
  } else {
    validityBadge.textContent = "40 à 60 cartes requises";
    validityBadge.className = "badge-status danger";
  }

  if (currentSelectedDeckId === 'custom') {
    startBtn.disabled = !customDeckIsValid;
    startBtn.setAttribute('aria-disabled', customDeckIsValid ? 'false' : 'true');
  }
}

/**
 * Initializes the game core
 */
function initGameInstance() {
  lpAnimationFrames.forEach(frameId => cancelAnimationFrame(frameId));
  lpAnimationFrames.clear();

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
  closeDialog(settingsModal, { restoreFocus: false });

  selectedAttackerIndex = null;
  currentDraggedUid = null;
  selectedHandUid = null;
  pendingAction = null;

  // 1. Resolve selected deck
  let mainIds = [];
  let extraIds = [];

  if (currentSelectedDeckId === 'custom') {
    if (customDeckMainIds.length < 40 || customDeckMainIds.length > 60 || customDeckExtraIds.length > 15) {
      announceStatus("Votre deck personnalisé doit contenir 40 à 60 cartes principales et au maximum 15 cartes Extra.");
      openDialog(startModal, document.getElementById('deck-validity-badge'));
      return;
    }
    mainIds = [...customDeckMainIds];
    extraIds = [...customDeckExtraIds];
  } else {
    const deckCollection = selectedGameMode === 'strict'
      ? PREMADE_DECKS
      : SANDBOX_PREMADE_DECKS;
    const premade = deckCollection[currentSelectedDeckId] || deckCollection.kaiba;
    mainIds = [...premade.main];
    extraIds = [...premade.extra];
  }

  // Find card templates
  const allTemplates = [...STARTER_CARDS, ...EXTRA_DECK_CARDS];
  const playerMainCards = mainIds.map(id => allTemplates.find(t => t.id === id)).filter(Boolean);
  const playerExtraCards = extraIds.map(id => allTemplates.find(t => t.id === id)).filter(Boolean);

  // Avoid mirror-character duels: Yugi faces Kaiba, the other presets face Yugi.
  const opponentDeckId = currentSelectedDeckId === 'yugi' ? 'kaiba' : 'yugi';
  const deckCollection = selectedGameMode === 'strict'
    ? PREMADE_DECKS
    : SANDBOX_PREMADE_DECKS;
  const opponentPreset = deckCollection[opponentDeckId];
  const opponentMainCards = opponentPreset.main.map(id => allTemplates.find(t => t.id === id)).filter(Boolean);
  const opponentExtraCards = opponentPreset.extra.map(id => allTemplates.find(t => t.id === id)).filter(Boolean);

  const playerLabel = document.getElementById('player-label');
  const opponentLabel = document.getElementById('opponent-label');
  const characterNames = { kaiba: 'KAIBA', yugi: 'YUGI', joey: 'JOEY', custom: 'DUELLISTE' };
  if (playerLabel) playerLabel.textContent = `${characterNames[currentSelectedDeckId] || 'DUELLISTE'} (VOUS)`;
  if (opponentLabel) opponentLabel.textContent = `${characterNames[opponentDeckId]} (IA)`;

  game = new DuelGame({
    onStateChange: updateUI,
    onLog: (msg, type) => {
      const safeMessage = sanitizePublicLogMessage(msg, type);
      addLogEntry(safeMessage, type);
      handleLogSpeech(safeMessage, type);
    },
    onAnimation: handleGameAnimations,
    onGameOver: handleGameOver,
    onDecision: requestUiDecision,
    onChainOpportunity: requestUiChainOpportunity
  }, {
    rulesMode: selectedGameMode,
    aiDifficulty: selectedAiDifficulty
  });

  const duelStarted = game.startDuel(playerMainCards, opponentMainCards, playerExtraCards, opponentExtraCards);
  if (duelStarted === false) {
    stopHologramHum();
    openDialog(startModal, startBtn);
    announceStatus('Le deck a été refusé. Consultez le journal de combat pour connaître les erreurs.');
    return;
  }
  updateModeControls();
  announceStatus(`Duel lancé en mode ${selectedGameMode === 'strict' ? 'TCG Advanced strict' : 'Anime Sandbox'}, difficulté ${selectedAiDifficulty}.`);
  startBGM();
  setBGMStyle('normal');
}

/**
 * Update the user interface based on game state
 */
function updateUI(gameState) {
  // 1. Life points counters
  animateLpChange('player-lp', gameState.playerLP);
  animateLpChange('opponent-lp', gameState.opponentLP);

  // 2. Deck and Playmat zone counts
  document.getElementById('player-deck-count').textContent = gameState.playerDeck.length;
  document.getElementById('opponent-deck-count').textContent = gameState.opponentDeck.length;
  document.getElementById('player-gy-count').textContent = gameState.playerGraveyard.length;
  document.getElementById('opponent-gy-count').textContent = gameState.opponentGraveyard.length;
  document.getElementById('player-extra-count').textContent = gameState.playerExtraDeck.length;
  document.getElementById('opponent-extra-count').textContent = gameState.opponentExtraDeck.length;
  document.getElementById('player-banished-count').textContent = gameState.playerBanished.length;
  document.getElementById('opponent-banished-count').textContent = gameState.opponentBanished.length;

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
  if (phaseEl) phaseEl.classList.add('active');

  // 4. Update phase transition button text based on TCG phases
  if (gameState.currentTurn === 'player' && !gameState.isDiscarding) {
    nextPhaseBtn.style.display = 'block';
    nextPhaseBtn.disabled = false;
    nextPhaseBtn.setAttribute('aria-disabled', 'false');
    if (gameState.currentPhase === 'main1') {
      if (gameState.turnCount === 1) {
        nextPhaseBtn.textContent = 'TERMINER LE TOUR';
      } else {
        nextPhaseBtn.textContent = 'PHASE DE COMBAT';
      }
    } else if (gameState.currentPhase === 'battle') {
      nextPhaseBtn.textContent = 'MAIN PHASE 2';
    } else if (gameState.currentPhase === 'main2') {
      nextPhaseBtn.textContent = 'TERMINER LE TOUR';
    } else {
      nextPhaseBtn.textContent = '...';
    }
  } else {
    nextPhaseBtn.style.display = 'none';
    nextPhaseBtn.disabled = true;
    nextPhaseBtn.setAttribute('aria-disabled', 'true');
  }

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
  document.querySelectorAll('.player-m-zone').forEach(z => z.classList.remove('tribute-candidate', 'tribute-selected'));
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
  }
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
  const duration = 800; // ms
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

  setTimeout(() => {
    newEl.classList.add('hidden');
  }, 1200);
}

/**
 * Render player's hand cards fanned out
 */
function renderHand(handCards) {
  const handContainer = document.getElementById('player-hand');
  handContainer.innerHTML = '';

  handCards.forEach((card, idx) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'hand-card-wrapper';

    // Add fan angles
    const angle = (idx - (handCards.length - 1) / 2) * 4; // fanning
    wrapper.style.transform = `rotateZ(${angle}deg)`;

    const cardEl = createCardDOM(card, false);
    cardEl.dataset.uid = card.uid;
    cardEl.dataset.handIndex = idx;
    cardEl.setAttribute('role', 'button');
    cardEl.tabIndex = 0;
    cardEl.setAttribute(
      'aria-label',
      game?.isDiscarding
        ? `Défausser ${card.name}`
        : `${card.name}. Sélectionner cette carte pour la jouer.`
    );
    cardEl.classList.toggle('selected-hand-card', selectedHandUid === card.uid);
    cardEl.classList.toggle('discard-candidate', Boolean(game?.isDiscarding));
    cardEl.setAttribute('aria-pressed', selectedHandUid === card.uid ? 'true' : 'false');
    cardEl.draggable = !game?.isDiscarding;

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
      highlightValidDropZones(card.card_type);
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
        highlightValidDropZones(card.card_type);
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
}

/**
 * Drag and drop zone highlighting helper
 */
function highlightValidDropZones(cardType) {
  const selector = cardType === 'monster' ? '.player-m-zone' : '.player-s-zone';
  document.querySelectorAll(selector).forEach(zone => {
    const isOccupied = zone.querySelector('.card-entity');
    if (!isOccupied) {
      zone.classList.add('active-zone');
    }
  });
}

function clearDropZoneHighlights() {
  document.querySelectorAll('.card-zone').forEach(zone => {
    zone.classList.remove('active-zone', 'drag-over');
  });
}

async function openMonsterActionMenu(zoneIndex) {
  if (!game || game.currentTurn !== 'player' || !game.currentPhase.startsWith('main')) return;
  const card = game.playerMonsters[zoneIndex];
  if (!card || card.isSetFaceDown || game.isResolvingAction) return;

  const availableEffects = game.getAvailableActions?.('player')?.monsterEffects || [];
  const effectIsAvailable = availableEffects.some(action => action.zoneIndex === zoneIndex);
  const choices = [];
  if (effectIsAvailable) {
    choices.push({ value: 'effect', label: `ACTIVER L’EFFET DE ${card.name.toUpperCase()}` });
  }
  choices.push({ value: 'position', label: 'CHANGER LA POSITION DE COMBAT' });

  const choice = await requestUiDecision({
    type: 'monster-field-action',
    side: 'player',
    title: card.name,
    description: 'Choisissez une action disponible pour ce monstre.',
    choices
  });

  if (choice === 'effect' && effectIsAvailable) {
    await game.activateMonsterEffect?.(zoneIndex, 'player');
  } else if (choice === 'position') {
    game.toggleMonsterPosition(zoneIndex);
  }
}

// Set up Drop Zones event listeners
document.querySelectorAll('.card-zone').forEach(zone => {
  const zoneSideLabel = zone.dataset.side === 'player' ? 'joueur' : 'adversaire';
  const zoneTypeLabel = zone.dataset.zoneType === 'monster' ? 'monstre' : 'magie ou piège';
  zone.setAttribute('role', 'button');
  zone.tabIndex = 0;
  zone.setAttribute('aria-label', `Zone ${zoneTypeLabel} ${zoneSideLabel} ${Number(zone.dataset.index) + 1}`);

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
    const facedownBtn = document.getElementById('btn-action-facedown');

    if (cardInstance && cardInstance.type && cardInstance.type.includes('Link')) {
      // Direct face-up summon for Link Monsters
      await game.summonMonster(uid, index);
    } else {
      // Set pending action and show choices modal
      pendingAction = { uid, zoneType, index };
      const actionChoiceModal = document.getElementById('action-modal');
      openDialog(actionChoiceModal, btnFaceUp);
    }

    clearDropZoneHighlights();
  });

  // Card zone click handler (handles Battle attacks, Tribute selections, and Synchro selections)
  zone.addEventListener('click', async () => {
    if (!game) return;

    const zoneType = zone.dataset.zoneType;
    const side = zone.dataset.side;
    const index = parseInt(zone.dataset.index);

    // Touch/keyboard placement after selecting a card from the hand.
    if (
      selectedHandUid
      && side === 'player'
      && game.currentTurn === 'player'
      && game.currentPhase.startsWith('main')
      && !game.isResolvingAction
    ) {
      const selectedCard = game.playerHand.find(card => card.uid === selectedHandUid);
      const zoneIsEmpty = zone.querySelector('.card-entity') === null;
      const typeMatches = selectedCard
        && ((selectedCard.card_type === 'monster' && zoneType === 'monster')
          || (selectedCard.card_type !== 'monster' && zoneType === 'spell'));

      if (selectedCard && zoneIsEmpty && typeMatches) {
        const uid = selectedHandUid;
        selectedHandUid = null;
        clearDropZoneHighlights();

        if (selectedCard.type?.includes('Link')) {
          await game.summonMonster(uid, index);
        } else {
          pendingAction = { uid, zoneType, index };
          openDialog(actionModal, btnFaceUp);
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
      if (side === 'player' && zoneType === 'monster') {
        game.selectSummonTribute(index);
      }
      return;
    }

    // 2. Intercept click for Synchro Materials
    if (game.pendingExtraSummon) {
      if (side === 'player' && zoneType === 'monster') {
        game.selectSynchroMaterial(index);
      }
      return;
    }

    // Intercept click to activate a face-down Spell/Trap card during Main Phase
    if (side === 'player' && zoneType === 'spell' && game.currentTurn === 'player' && game.currentPhase.startsWith('main')) {
      const card = game.playerSpells[index];
      if (card && card.isSetFaceDown) {
        if (confirm(`Voulez-vous activer la carte face cachée : ${card.name} ?`)) {
          game.activateSetSpellTrap(index);
        }
        return;
      }
    }

    if (
      side === 'player'
      && zoneType === 'monster'
      && game.currentTurn === 'player'
      && game.currentPhase.startsWith('main')
      && game.playerMonsters[index] !== null
    ) {
      await openMonsterActionMenu(index);
      return;
    }

    // 3. Standard Battle Phase attacks
    if (game.currentTurn !== 'player' || game.currentPhase !== 'battle') return;

    if (side === 'player' && zoneType === 'monster' && game.playerMonsters[index] !== null) {
      // Select Attacker
      if (game.attackedMonsters.has(index)) {
        addLogEntry("Ce monstre a déjà attaqué ce tour-ci !", 'danger');
        return;
      }

      const pan = getZonePan(side, index);
      playClick(pan);

      // Reset previous select
      document.querySelectorAll('.player-m-zone').forEach(z => z.classList.remove('attacker-active'));

      if (selectedAttackerIndex === index) {
        selectedAttackerIndex = null;
      } else {
        selectedAttackerIndex = index;
        zone.classList.add('attacker-active');
      }
      updateBattleHighlights();
    }
    else if (side === 'opponent' && zoneType === 'monster' && selectedAttackerIndex !== null && zone.classList.contains('can-target')) {
      // Attack target monster
      game.executeAttack(selectedAttackerIndex, index);
      selectedAttackerIndex = null;
      document.querySelectorAll('.player-m-zone').forEach(z => z.classList.remove('attacker-active'));
    }
  });

  // Right click handler to change battle position (Attack/Defense) or Flip Summon
  zone.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    if (!game || game.currentTurn !== 'player' || !game.currentPhase.startsWith('main') || game.isResolvingAction || game.pendingSummon || game.pendingExtraSummon) return;

    const zoneType = zone.dataset.zoneType;
    const side = zone.dataset.side;
    const index = parseInt(zone.dataset.index);

    if (side === 'player' && zoneType === 'monster' && game.playerMonsters[index] !== null) {
      game.toggleMonsterPosition(index);
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
      if (side === 'player' && zoneType === 'monster') {
        game?.toggleMonsterPosition(index);
      }
    }
  });
});

// Click outside board zones cancels attacker select, tribute summon or synchro summon
document.addEventListener('click', (e) => {
  if (!e.target.closest('.card-zone') && !e.target.closest('.hand-card-wrapper') && !e.target.closest('#btn-next-phase') && !e.target.closest('#extra-deck-modal') && !e.target.closest('#action-modal')) {
    if (selectedAttackerIndex !== null) {
      selectedAttackerIndex = null;
      document.querySelectorAll('.player-m-zone').forEach(z => z.classList.remove('attacker-active'));
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
      selectedHandUid = null;
      clearDropZoneHighlights();
      document.querySelectorAll('#player-hand .card-entity').forEach(element => {
        element.classList.remove('selected-hand-card');
        element.setAttribute('aria-pressed', 'false');
      });
    }
  }
});

/**
 * Highlights enemy zones that can be targeted during battle
 */
function updateBattleHighlights() {
  document.querySelectorAll('.opponent-m-zone').forEach(z => z.classList.remove('can-target'));

  if (!game || game.currentTurn !== 'player' || game.currentPhase !== 'battle' || selectedAttackerIndex === null) {
    return;
  }

  const hasOpponentMonsters = game.opponentMonsters.some(m => m !== null);

  if (hasOpponentMonsters) {
    // Player must attack one of the opponent's monsters
    document.querySelectorAll('.opponent-m-zone').forEach(zone => {
      const idx = parseInt(zone.dataset.index);
      if (game.opponentMonsters[idx] !== null) {
        zone.classList.add('can-target');
      }
    });
  } else {
    // Direct attack triggers by clicking ANY opponent monster zone to launch attack
    document.querySelectorAll('.opponent-m-zone').forEach(zone => {
      zone.classList.add('can-target');
    });
  }
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
  const levelStars = isMonster && card.level ? '★'.repeat(card.level) : '';

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

/**
 * Handles GameOver overlays
 */
function handleGameOver(winner) {
  stopHologramHum();
  if (pendingDecisionResolver) finishDecision(null);
  const gameoverTitle = document.getElementById('gameover-title');
  const gameoverText = document.getElementById('gameover-text');

  if (game && !recordedFinishedGames.has(game)) {
    recordedFinishedGames.add(game);
    duelStatistics.duels += 1;
    if (winner === 'player') duelStatistics.wins += 1;
    else if (winner === 'opponent') duelStatistics.losses += 1;
    else duelStatistics.draws += 1;
    localStorage.setItem(STORAGE_KEYS.statistics, JSON.stringify(duelStatistics));
    renderDuelStatistics();
  }

  if (winner === 'player') {
    gameoverTitle.textContent = "VICTOIRE !";
    gameoverTitle.style.color = "var(--neon-cyan)";
    gameoverText.textContent = "Vous avez vaincu l’intelligence artificielle adverse. Le rapport du duel a été enregistré.";
  } else if (winner === 'opponent') {
    gameoverTitle.textContent = "DÉFAITE...";
    gameoverTitle.style.color = "var(--neon-magenta)";
    gameoverText.textContent = "Vos Life Points ont atteint zéro. Analysez le journal puis tentez une nouvelle stratégie.";
  } else {
    gameoverTitle.textContent = "MATCH NUL";
    gameoverTitle.style.color = "var(--neon-gold)";
    gameoverText.textContent = "Le duel se termine sans vainqueur. Le résultat a été enregistré.";
  }

  document.body.classList.add('duel-ended');
  nextPhaseBtn.disabled = true;
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
  const boardEl = document.getElementById('duel-board');

  if (event.type === 'summon') {
    const side = event.target;
    const idx = event.zoneIndex;
    const card = event.card;

    const zoneQuery = `.card-zone.${side}-m-zone[data-index="${idx}"]`;
    const zoneEl = boardEl.querySelector(zoneQuery);

    if (zoneEl) {
      spawnHologram(zoneEl, card, side === 'opponent');
      playSummon(getZonePan(side, idx));
    }
  }
  else if (event.type === 'toggle-position') {
    const side = event.target;
    const idx = event.zoneIndex;
    const position = event.position;

    const zoneQuery = `.card-zone.${side}-m-zone[data-index="${idx}"]`;
    const zoneEl = boardEl.querySelector(zoneQuery);

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

    const zoneQuery = `.card-zone.${side}-s-zone[data-index="${idx}"]`;
    const zoneEl = boardEl.querySelector(zoneQuery);

    if (zoneEl) {
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
        setTimeout(() => {
          if (game !== duelAtAnimation || !zoneEl.contains(cardEl)) return;
          zoneEl.innerHTML = '';
        }, 500);
      }
    }
  }
  else if (event.type === 'destroy') {
    const side = event.target;
    const idx = event.zoneIndex;

    const zoneQuery = `.card-zone.${side}-m-zone[data-index="${idx}"]`;
    const zoneEl = boardEl.querySelector(zoneQuery);

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
      setTimeout(() => {
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
    const zoneQuery = `.card-zone.${side}-m-zone[data-index="${atkIdx}"]`;
    const zoneEl = boardEl.querySelector(zoneQuery);

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
        setTimeout(() => holo.classList.remove('combat-lunge'), 500);
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
    const srcZone = boardEl.querySelector(`.card-zone.${side}-m-zone[data-index="${atkIdx}"]`);
    const destZone = boardEl.querySelector(`.card-zone.${oppSide}-m-zone[data-index="${defIdx}"]`);

    if (srcZone && destZone) {
      const attackerCard = side === 'player' ? game.playerMonsters[atkIdx] : game.opponentMonsters[atkIdx];
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
        setTimeout(() => attackerHolo.classList.remove('combat-lunge'), 500);
      }

      // 2. Recoil defender after attack projectile hits (approx 350ms delay)
      const defenderHolo = destZone.querySelector('.monster-hologram-entity');
      setTimeout(() => {
        if (defenderHolo) {
          const recoilY = oppSide === 'player' ? 30 : -30;
          defenderHolo.style.setProperty('--recoil-y', `${recoilY}px`);
          defenderHolo.style.setProperty('--recoil-z', `-15px`);
          defenderHolo.classList.remove('combat-recoil');
          void defenderHolo.offsetWidth; // trigger reflow
          defenderHolo.classList.add('combat-recoil');
          setTimeout(() => defenderHolo.classList.remove('combat-recoil'), 500);
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
      setTimeout(() => container.classList.remove('shake-screen'), 450);
    }

    // LP Glitch feedback
    const lpEl = document.getElementById(`${event.target}-lp`);
    if (lpEl) {
      lpEl.classList.add('glitch-text');
      setTimeout(() => lpEl.classList.remove('glitch-text'), 600);
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
      setTimeout(() => notifier.remove(), 1200);
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

let speechAnnouncerEnabled = !uiMuted;

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

  if (card) {
    const faceDown = card.isSetFaceDown || (side === 'opponent' && card.location === 'hand');
    const concealIdentity = faceDown && side === 'opponent';
    // Concealed cards intentionally have no data-id, so locate them by their
    // non-sensitive state marker instead.
    const existingCardEl = concealIdentity
      ? zoneEl.querySelector('.card-entity[data-concealed="true"]')
      : [...zoneEl.querySelectorAll('.card-entity[data-card-visible="true"]')]
        .find(element => String(element.dataset.uid) === String(card.uid));
    const zoneTypeLabel = zoneEl.dataset.zoneType === 'monster'
      ? 'monstre'
      : (zoneEl.dataset.zoneType === 'field' ? 'Terrain' : 'magie ou piège');
    const zoneNumber = zoneEl.dataset.index === undefined ? '' : ` ${Number(zoneEl.dataset.index) + 1}`;
    zoneEl.setAttribute(
      'aria-label',
      concealIdentity
        ? `Zone ${zoneTypeLabel}${zoneNumber} ${side === 'player' ? 'joueur' : 'adversaire'}, carte face cachée`
        : `Zone ${zoneTypeLabel}${zoneNumber} ${side === 'player' ? 'joueur' : 'adversaire'}, ${card.name}${faceDown ? ', face cachée' : ''}${side === 'player' ? '. Ouvrir les actions' : ''}`
    );

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
  } else {
    zoneEl.innerHTML = '';
    zoneEl.classList.remove('defense-position');
    const zoneTypeLabel = zoneEl.dataset.zoneType === 'monster'
      ? 'monstre'
      : (zoneEl.dataset.zoneType === 'field' ? 'Terrain' : 'magie ou piège');
    const zoneNumber = zoneEl.dataset.index === undefined ? '' : ` ${Number(zoneEl.dataset.index) + 1}`;
    zoneEl.setAttribute(
      'aria-label',
      `Zone ${zoneTypeLabel}${zoneNumber} ${side === 'player' ? 'joueur' : 'adversaire'}, vide`
    );
  }
}
