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
import { STARTER_CARDS, EXTRA_DECK_CARDS } from './src/cards.js';
import { escapeHtml, safeImageUrl } from './src/security.js';

let game = null;
let selectedAttackerIndex = null;
let currentDraggedUid = null;
let selectedHandUid = null;
let pendingAction = null;

// Initialize board tilt
initBoardTilt('#parallax-container', '#duel-board');

// Setup Mute Toggle
const muteBtn = document.getElementById('btn-mute');
muteBtn.addEventListener('click', () => {
  const isMuted = toggleMute();
  speechAnnouncerEnabled = !isMuted;
  if (isMuted && window.speechSynthesis !== undefined) {
    window.speechSynthesis.cancel();
  }
  muteBtn.textContent = `SON : ${isMuted ? 'OFF' : 'ON'}`;
  muteBtn.classList.toggle('btn-magenta', isMuted);
});

// Setup Start game trigger (safeguard for Web Audio)
const startModal = document.getElementById('start-modal');
const startBtn = document.getElementById('btn-start-duel');
startBtn.addEventListener('click', () => {
  startModal.classList.add('hidden');
  startHologramHum();
  initGameInstance();
});

// Setup Restart Game trigger
const gameoverModal = document.getElementById('gameover-modal');
const restartBtn = document.getElementById('btn-restart-duel');
restartBtn.addEventListener('click', () => {
  gameoverModal.classList.add('hidden');
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
  extraZone.addEventListener('click', () => {
    if (!game || game.currentTurn !== 'player' || !game.currentPhase.startsWith('main') || game.isResolvingAction || game.pendingSummon || game.pendingExtraSummon) return;

    extraList.innerHTML = '';
    game.playerExtraDeck.forEach(card => {
      const cardEl = createCardDOM(card, false);
      cardEl.addEventListener('click', async () => {
        extraModal.classList.add('hidden');
        await game.summonExtraDeck(card.uid);
      });
      extraList.appendChild(cardEl);
    });

    extraModal.classList.remove('hidden');
  });

  closeExtraBtn.addEventListener('click', () => {
    extraModal.classList.add('hidden');
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
    actionModal.classList.add('hidden');
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
    actionModal.classList.add('hidden');
    const { uid, zoneType, index } = pendingAction;
    pendingAction = null;

    if (zoneType === 'monster') {
      await game.setMonsterFaceDown(uid, index);
    } else if (zoneType === 'spell') {
      await game.setSpellTrapFaceDown(uid, index);
    }
  });

  btnCancel.addEventListener('click', () => {
    actionModal.classList.add('hidden');
    pendingAction = null;
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
    settingsModal.classList.remove('hidden');
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
      alert("L'URL du dos de carte doit utiliser HTTP ou HTTPS.");
      return;
    }

    localStorage.setItem('custom_card_back', validatedUrl);
    settingsModal.classList.add('hidden');
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

// Setup Inspector hover events for the whole app
document.addEventListener('mouseover', async (e) => {
  const cardEl = e.target.closest('.card-entity');
  const holoEl = e.target.closest('.monster-hologram-entity');

  if (cardEl) {
    const cardId = cardEl.dataset.id;
    const card = await getCardById(cardId);
    if (card) updateInspector(card);
  } else if (holoEl) {
    const cardId = holoEl.dataset.id;
    const card = await getCardById(cardId);
    if (card) updateInspector(card);
  }
});

// Premade decks definition
const PREMADE_DECKS = {
  kaiba: {
    main: [
      '89631139', '89631139', '89631139', // Blue-Eyes
      '13039848', '13039848', '13039848', // Giant Soldier
      '88819079', '88819079', '88819079', // Baby Dragon
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
      '88819079', '88819079' // Baby Dragon
    ],
    extra: ['31924889']
  },
  joey: {
    main: [
      '74677422', '74677422', '74677422', // Red-Eyes
      '71625222', '71625222', '71625222', // Time Wizard
      '88819079', '88819079', '88819079', // Baby Dragon
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

let currentSelectedDeckId = 'kaiba';
let customDeckMainIds = [];
let customDeckExtraIds = [];

// Setup choice selector interaction
const choiceCards = document.querySelectorAll('.deck-choice-card');
const deckBuilderSec = document.getElementById('deck-builder-section');

choiceCards.forEach(card => {
  card.addEventListener('click', () => {
    choiceCards.forEach(c => {
      c.classList.remove('active');
      c.setAttribute('aria-pressed', 'false');
    });
    card.classList.add('active');
    card.setAttribute('aria-pressed', 'true');

    const deckId = card.dataset.deckId;
    currentSelectedDeckId = deckId;

    if (deckId === 'custom') {
      deckBuilderSec.classList.remove('hidden');
      initDeckBuilderUI();
    } else {
      deckBuilderSec.classList.add('hidden');
    }
  });
});

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
    cardItem.style.backgroundImage = `url(https://images.ygoprodeck.com/images/cards_cropped/${template.id}.jpg)`;
    cardItem.title = `${template.name} - ATK: ${template.atk} / DEF: ${template.def}`;

    // Add event to add to my custom deck
    cardItem.addEventListener('click', () => {
      const isExtra = template.type.includes('Fusion') || template.type.includes('Synchro') || template.type.includes('Link');
      const targetList = isExtra ? customDeckExtraIds : customDeckMainIds;

      // Count current occurrences (max 3 limit)
      const count = targetList.filter(id => id === template.id).length;
      if (count < 3) {
        targetList.push(template.id);
        updateDeckBuilderList();
      } else {
        alert(`Vous ne pouvez pas ajouter plus de 3 copies de ${template.name}.`);
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
    cardItem.style.backgroundImage = `url(https://images.ygoprodeck.com/images/cards_cropped/${template.id}.jpg)`;
    cardItem.title = `${template.name} (Cliquez pour retirer)`;

    cardItem.addEventListener('click', () => {
      const isExtra = template.type.includes('Fusion') || template.type.includes('Synchro') || template.type.includes('Link');
      if (isExtra) {
        const targetIndex = customDeckExtraIds.indexOf(template.id);
        if (targetIndex !== -1) customDeckExtraIds.splice(targetIndex, 1);
      } else {
        const targetIndex = customDeckMainIds.indexOf(template.id);
        if (targetIndex !== -1) customDeckMainIds.splice(targetIndex, 1);
      }
      updateDeckBuilderList();
    });

    deckListContainer.appendChild(cardItem);
  });

  // Update stats
  const totalCount = customDeckMainIds.length;
  document.getElementById('deck-size-val').textContent = `Main: ${totalCount} / Extra: ${customDeckExtraIds.length}`;

  const validityBadge = document.getElementById('deck-validity-badge');
  if (totalCount >= 40 && totalCount <= 60 && customDeckExtraIds.length <= 15) {
    validityBadge.textContent = "Taille valide";
    validityBadge.className = "badge-status success";
  } else {
    validityBadge.textContent = "40 à 60 cartes requises";
    validityBadge.className = "badge-status danger";
  }
}

/**
 * Initializes the game core
 */
function initGameInstance() {
  // Clear any old UI elements on board
  document.querySelectorAll('.card-zone').forEach(z => z.innerHTML = '');
  document.getElementById('log-content').innerHTML = '';

  selectedAttackerIndex = null;
  currentDraggedUid = null;
  selectedHandUid = null;

  // 1. Resolve selected deck
  let mainIds = [];
  let extraIds = [];

  if (currentSelectedDeckId === 'custom') {
    if (customDeckMainIds.length < 40 || customDeckMainIds.length > 60 || customDeckExtraIds.length > 15) {
      alert("Votre deck personnalisé doit contenir 40 à 60 cartes principales et au maximum 15 cartes Extra !");
      document.getElementById('start-modal').classList.remove('hidden');
      return;
    }
    mainIds = [...customDeckMainIds];
    extraIds = [...customDeckExtraIds];
  } else {
    const premade = PREMADE_DECKS[currentSelectedDeckId] || PREMADE_DECKS.kaiba;
    mainIds = [...premade.main];
    extraIds = [...premade.extra];
  }

  // Find card templates
  const allTemplates = [...STARTER_CARDS, ...EXTRA_DECK_CARDS];
  const playerMainCards = mainIds.map(id => allTemplates.find(t => t.id === id)).filter(Boolean);
  const playerExtraCards = extraIds.map(id => allTemplates.find(t => t.id === id)).filter(Boolean);

  // Opponent uses Yugi deck as default
  const opponentMainCards = PREMADE_DECKS.yugi.main.map(id => allTemplates.find(t => t.id === id)).filter(Boolean);
  const opponentExtraCards = PREMADE_DECKS.yugi.extra.map(id => allTemplates.find(t => t.id === id)).filter(Boolean);

  game = new DuelGame({
    onStateChange: updateUI,
    onLog: (msg, type) => {
      addLogEntry(msg, type);
      handleLogSpeech(msg, type);
    },
    onAnimation: handleGameAnimations,
    onGameOver: handleGameOver
  });

  game.startDuel(playerMainCards, opponentMainCards, playerExtraCards, opponentExtraCards);
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
  }

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
      requestAnimationFrame(step);
    }
  }

  requestAnimationFrame(step);
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
    cardEl.classList.toggle('selected-hand-card', selectedHandUid === card.uid);
    cardEl.setAttribute('aria-pressed', selectedHandUid === card.uid ? 'true' : 'false');

    // Bind Drag & Drop Events
    cardEl.addEventListener('dragstart', (e) => {
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

    // Double click to discard if in Hand Size Discard state
    cardEl.addEventListener('dblclick', () => {
      if (game && game.isDiscarding) {
        game.discardCard(card.uid);
      }
    });

    // Touch and keyboard alternative to drag-and-drop: select a card, then a zone.
    cardEl.addEventListener('click', () => {
      if (!game || game.isDiscarding || game.currentTurn !== 'player' || !game.currentPhase.startsWith('main') || game.isResolvingAction) {
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
      actionChoiceModal.classList.remove('hidden');
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
          actionModal.classList.remove('hidden');
        }
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

  // Double click handler to change battle position (Attack/Defense) during Main Phase 1 or 2
  zone.addEventListener('dblclick', () => {
    if (!game || game.currentTurn !== 'player' || !game.currentPhase.startsWith('main') || game.isResolvingAction || game.pendingSummon || game.pendingExtraSummon) return;

    const zoneType = zone.dataset.zoneType;
    const side = zone.dataset.side;
    const index = parseInt(zone.dataset.index);

    if (side === 'player' && zoneType === 'monster' && game.playerMonsters[index] !== null) {
      game.toggleMonsterPosition(index);
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
function addLogEntry(message, type = 'system') {
  const logContent = document.getElementById('log-content');
  const entry = document.createElement('div');
  entry.className = `log-entry ${type}`;

  // Basic markdown bolding parsing: **text** -> <strong>text</strong>
  const parsed = escapeHtml(message).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
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
    `https://images.ygoprodeck.com/images/cards/${encodeURIComponent(card.id)}.jpg`
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
      <img src="${imgUrl}" alt="${safeName}" crossorigin="anonymous">
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
  const gameoverTitle = document.getElementById('gameover-title');
  const gameoverText = document.getElementById('gameover-text');

  if (winner === 'player') {
    gameoverTitle.textContent = "VICTOIRE !";
    gameoverTitle.style.color = "var(--neon-cyan)";
    gameoverText.innerHTML = "Félicitations, vous avez vaincu l'intelligence artificielle adverse !<br>Votre sens tactique fait honneur à Yugi Muto.";
  } else {
    gameoverTitle.textContent = "DÉFAITE...";
    gameoverTitle.style.color = "var(--neon-magenta)";
    gameoverText.innerHTML = "Vous avez succombé aux attaques de l'adversaire...<br>Croyez en l'âme des cartes et réessayez !";
  }

  gameoverModal.classList.remove('hidden');
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
      `https://images.ygoprodeck.com/images/cards_cropped/${encodeURIComponent(card.id)}.jpg`
    );
    thumbnail.style.backgroundImage = `url("${thumbnailUrl}")`;

    const cardName = document.createElement('div');
    cardName.className = 'result-card-name';
    cardName.textContent = card.name;
    div.append(thumbnail, cardName);

    // Click on search result adds it to player's hand! Extremely fun sandbox feature
    div.addEventListener('click', () => {
      if (!game || game.winner) return;
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
      const flatCard = createCardDOM(card, faceDown || side === 'opponent');
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
        cardEl.style.transition = 'opacity 0.5s';
        cardEl.style.opacity = '0';
        setTimeout(() => { zoneEl.innerHTML = ''; }, 500);
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

      setTimeout(() => {
        zoneEl.innerHTML = '';
        zoneEl.classList.remove('defense-position');
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

let speechAnnouncerEnabled = true;

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
    // Check if card is already rendered
    const existingCardEl = zoneEl.querySelector(`.card-entity[data-id="${card.id}"]`);
    const faceDown = card.isSetFaceDown || (side === 'opponent' && card.location === 'hand');

    if (!existingCardEl) {
      zoneEl.innerHTML = '';

      if (card.position === 'defense') {
        zoneEl.classList.add('defense-position');
      } else {
        zoneEl.classList.remove('defense-position');
      }

      const flatCard = createCardDOM(card, faceDown);
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
        if (card.position === 'defense') holo.classList.add('defense-mode');
        else holo.classList.remove('defense-mode');

        if (faceDown) holo.classList.add('face-down');
        else holo.classList.remove('face-down');
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
  }
}
