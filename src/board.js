import { playClick } from './audio.js';
import { getCardCroppedImageUrl, getCardImageUrl } from './cards.js';
import { escapeHtml, safeImageUrl } from './security.js';

const boardAnimationTimeouts = new Map();
let boardAnimationGeneration = 0;

function boardMotionDuration(duration) {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 0 : duration;
}

function scheduleBoardAnimation(callback, duration, onCancel = null) {
  const generation = boardAnimationGeneration;
  const timeoutId = window.setTimeout(() => {
    boardAnimationTimeouts.delete(timeoutId);
    if (generation === boardAnimationGeneration) callback();
    else onCancel?.();
  }, boardMotionDuration(duration));
  boardAnimationTimeouts.set(timeoutId, onCancel);
  return timeoutId;
}

export function cancelBoardAnimations(boardEl = null) {
  boardAnimationGeneration += 1;
  boardAnimationTimeouts.forEach((onCancel, timeoutId) => {
    window.clearTimeout(timeoutId);
    onCancel?.();
  });
  boardAnimationTimeouts.clear();
  boardEl?.querySelectorAll?.(
    '.attack-projectile, .explosion-container, .raigeki-lightning, '
    + '.mirror-force-barrier, .reborn-ankh'
  ).forEach(element => element.remove());
}

/**
 * Initializes the 3D board tilt parallax effect based on mouse move.
 */
export function initBoardTilt(containerSelector, boardSelector) {
  const container = document.querySelector(containerSelector);
  const board = document.querySelector(boardSelector);
  if (!container || !board) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const coarsePointer = window.matchMedia('(pointer: coarse)');

  container.addEventListener('mousemove', (e) => {
    if (reduceMotion.matches || coarsePointer.matches || board.classList.contains('real-mode')) return;

    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;

    // Normalize mouse coords (-1 to 1)
    const normX = x / (rect.width / 2);
    const normY = y / (rect.height / 2);

    // Calculate rotation angles
    // Base pitch: 52 degrees, tilts up/down by 8 degrees
    // Base roll/yaw: 0 degrees, tilts left/right by 10 degrees
    const pitch = 52 - normY * 8;
    const roll = normX * 10;

    board.style.transform = `rotateX(${pitch}deg) rotateZ(${roll}deg) translateY(-20px)`;
  });

  container.addEventListener('mouseleave', () => {
    if (reduceMotion.matches || coarsePointer.matches || board.classList.contains('real-mode')) return;

    // Smooth reset
    board.style.transform = `rotateX(52deg) rotateZ(0deg) translateY(-20px)`;
  });
}

/**
 * Creates a card DOM element
 */
export function createCardDOM(card, faceDown = false, concealIdentity = faceDown) {
  const cardEl = document.createElement('div');
  cardEl.className = `card-entity${concealIdentity ? ' concealed-card' : ` ${card.card_type}`}`;
  cardEl.draggable = !faceDown;
  cardEl.setAttribute('role', 'img');
  cardEl.setAttribute('aria-label', concealIdentity ? 'Carte face cachée' : (card.name || 'Carte'));
  cardEl.tabIndex = -1;

  // Do not expose private card information through DOM attributes or assistive
  // technology. Visible cards keep their identifiers for the inspector.
  if (concealIdentity) {
    cardEl.dataset.concealed = 'true';
  } else {
    cardEl.dataset.id = card.id;
    if (card.uid) cardEl.dataset.uid = card.uid;
    cardEl.dataset.cardType = card.card_type;
    cardEl.dataset.cardVisible = 'true';
  }

  let storedCardBack = '';
  try {
    storedCardBack = localStorage.getItem('custom_card_back') || '';
  } catch {
    storedCardBack = '';
  }
  const customCardBack = safeImageUrl(storedCardBack);
  const frontImage = concealIdentity
    ? ''
    : safeImageUrl(
      card.image_url,
      getCardImageUrl(card.id)
    );

  const cardInner = document.createElement('div');
  cardInner.className = `card-inner ${faceDown ? 'face-down' : ''}`;

  const cardFront = document.createElement('div');
  cardFront.className = 'card-front';
  if (frontImage) {
    cardFront.style.backgroundImage = `url("${frontImage}")`;
  }

  const glow = document.createElement('div');
  glow.className = 'card-glow-effect';
  cardFront.appendChild(glow);

  const cardBack = document.createElement('div');
  cardBack.className = `card-back ${customCardBack ? 'custom-back-active' : ''}`;
  if (customCardBack) {
    cardBack.style.backgroundImage = `url("${customCardBack}")`;
    cardBack.style.backgroundSize = 'cover';
    cardBack.style.backgroundColor = 'transparent';
  }

  cardInner.append(cardFront, cardBack);
  cardEl.appendChild(cardInner);

  // Play click sound on hover
  cardEl.addEventListener('mouseenter', () => {
    if (!faceDown) {
      cardEl.classList.add('hovered');
    }
  });

  cardEl.addEventListener('mouseleave', () => {
    cardEl.classList.remove('hovered');
  });

  return cardEl;
}

/**
 * Creates a 2.5D monster hologram DOM element
 */
export function createMonsterHologramDOM(card, isOpponent = false) {
  const holo = document.createElement('div');
  const isDefense = card.position === 'defense';
  const isFaceDown = card.isSetFaceDown || false;
  const concealIdentity = isFaceDown && isOpponent;
  const attrClass = card.attribute
    ? String(card.attribute).toLowerCase().replace(/[^a-z0-9_-]/g, '')
    : 'light';

  const atk = typeof card.getAtk === 'function' ? card.getAtk() : card.atk;
  const def = typeof card.getDef === 'function' ? card.getDef() : card.def;
  const isPowerhouse = atk >= 2500;

  // Attribute and ATK-threshold classes are observable DOM data. Never attach
  // them to an opponent's face-down monster.
  holo.className = [
    'monster-hologram-entity',
    concealIdentity ? 'concealed-hologram' : `attr-${attrClass}`,
    isOpponent ? 'opponent-holo' : '',
    isDefense ? 'defense-mode' : '',
    isFaceDown ? 'face-down' : '',
    !concealIdentity && isPowerhouse ? 'power-aura' : ''
  ].filter(Boolean).join(' ');
  if (concealIdentity) {
    holo.dataset.concealed = 'true';
    holo.setAttribute('aria-hidden', 'true');
  } else {
    holo.dataset.id = card.id;
    if (card.uid) holo.dataset.uid = card.uid;
    holo.dataset.cardVisible = 'true';
    holo.setAttribute('role', 'img');
    holo.setAttribute('aria-label', `${card.name}, ATK ${atk}, DEF ${def ?? 'non applicable'}`);
  }

  const imageUrl = concealIdentity
    ? ''
    : safeImageUrl(
      card.image_url_cropped,
      getCardCroppedImageUrl(card.id)
    );
  const cardName = concealIdentity ? '' : escapeHtml(card.name);

  holo.innerHTML = concealIdentity ? `
    <div class="holo-beam"></div>
    <div class="holo-base-ring concealed-hologram-ring"></div>
    <div class="holo-sprite-container concealed-hologram-card">
      <div class="holo-scanlines"></div>
      <div class="holo-glow-aura"></div>
    </div>
  ` : `
    <div class="holo-beam"></div>
    <div class="holo-base-ring attr-${attrClass}"></div>
    <div class="holo-sprite-container">
      <img src="${imageUrl}" alt="${cardName}" class="holo-sprite">
      <div class="holo-scanlines"></div>
      <div class="holo-glow-aura"></div>

      <!-- Defensive Hexagonal Shield -->
      <div class="holo-defense-shield">
        <div class="shield-hexagon"></div>
      </div>
    </div>
    <div class="holo-stats">
      <div class="holo-stat-name">${cardName}</div>
      <div class="holo-stat-atkdef">
        <span class="stat-badge atk">ATK ${atk}</span>
        <span class="stat-badge def">DEF ${def !== null ? def : '—'}</span>
      </div>
    </div>
  `;

  return holo;
}

/**
 * Triggers summoning animations and holographic spawning
 */
export function spawnHologram(zoneEl, card, isOpponent = false) {
  // Clear any existing contents of the zone
  zoneEl.innerHTML = '';

  // Set defense class on the parent zone to rotate card flat on the board
  if (card.position === 'defense') {
    zoneEl.classList.add('defense-position');
  } else {
    zoneEl.classList.remove('defense-position');
  }

  // Create flat card inside zone (face-down if card is set face-down)
  const flatCard = createCardDOM(
    card,
    card.isSetFaceDown || false,
    Boolean(isOpponent && card.isSetFaceDown)
  );
  flatCard.classList.add('card-flat-on-board');
  zoneEl.appendChild(flatCard);

  // If it's a monster, spawn the vertical hologram!
  if (card.card_type === 'monster') {
    const holo = createMonsterHologramDOM(card, isOpponent);
    zoneEl.appendChild(holo);

    // Trigger animation flow
    requestAnimationFrame(() => {
      holo.classList.add('spawning');

      // After spawning animation finishes (approx 800ms)
      scheduleBoardAnimation(() => {
        holo.classList.remove('spawning');
        holo.classList.add('active-hologram');
      }, 800);
    });
  } else {
    // Spells and traps just show the flat card
    requestAnimationFrame(() => {
      flatCard.classList.add('placed');
    });
  }
}

/**
 * Resolves either a legacy Main Monster Zone reference or a shared Extra
 * Monster Zone reference to its DOM node. Extra Monster Zones are shared, so
 * their current controller is stored on the zone instead of encoded in a
 * player/opponent class name.
 */
export function findMonsterZoneElement(boardEl, side, reference) {
  if (!boardEl) return null;
  const zoneType = reference?.zoneType === 'extra' || reference?.zoneType === 'extra_monster'
    ? 'extra'
    : 'main';
  const zoneIndex = Number(reference?.zoneIndex ?? reference);
  if (!Number.isInteger(zoneIndex)) return null;
  if (zoneType === 'extra') {
    return boardEl.querySelector(
      `[data-zone-type="extra-monster"][data-index="${zoneIndex}"], `
      + `.extra-monster-zone[data-index="${zoneIndex}"]`
    );
  }
  return boardEl.querySelector(`.card-zone.${side}-m-zone[data-index="${zoneIndex}"]`);
}

/**
 * Renders the two shared Extra Monster Zones whenever the matching DOM nodes
 * are present. The optional renderer makes this helper deterministic in unit
 * tests and lets UI adapters reuse their own animation policy.
 */
export function syncExtraMonsterZones(boardEl, gameState, renderer = spawnHologram) {
  if (!boardEl || !gameState) return 0;
  const entries = Array.isArray(gameState.extraMonsterZones)
    ? gameState.extraMonsterZones
    : [];
  let synced = 0;

  for (let zoneIndex = 0; zoneIndex < 2; zoneIndex += 1) {
    const zoneEl = findMonsterZoneElement(boardEl, null, {
      zoneType: 'extra',
      zoneIndex
    });
    if (!zoneEl) continue;
    synced += 1;

    const entry = entries[zoneIndex] || null;
    const card = entry?.card || null;
    const controllerId = entry?.controllerId || '';
    zoneEl.dataset.controllerId = controllerId;
    zoneEl.classList?.toggle?.('player-controlled', controllerId === 'player');
    zoneEl.classList?.toggle?.('opponent-controlled', controllerId === 'opponent');

    if (!card) {
      zoneEl.innerHTML = '';
      delete zoneEl.dataset.renderedCardUid;
      zoneEl.dataset.ownerLabel = 'LIBRE';
      zoneEl.tabIndex = -1;
      zoneEl.setAttribute?.('aria-disabled', 'true');
      zoneEl.setAttribute?.(
        'aria-label',
        `Zone Monstre Extra partagée ${zoneIndex + 1}, libre`
      );
      continue;
    }

    zoneEl.dataset.ownerLabel = controllerId === 'opponent' ? 'IA' : 'VOUS';
    zoneEl.tabIndex = 0;
    zoneEl.setAttribute?.('aria-disabled', 'false');
    zoneEl.setAttribute?.(
      'aria-label',
      `Zone Monstre Extra ${zoneIndex + 1}, ${controllerId === 'opponent' ? 'adversaire' : 'joueur'}, ${card.name}`
    );
    const renderedUid = zoneEl.dataset.renderedCardUid;
    if (String(renderedUid || '') !== String(card.uid || '')) {
      renderer(zoneEl, card, controllerId === 'opponent');
      zoneEl.dataset.renderedCardUid = String(card.uid || '');
    } else {
      zoneEl.classList?.toggle?.('defense-position', card.position === 'defense');
    }
  }
  return synced;
}

/**
 * Helper to calculate local 2D coordinates relative to board container.
 * This is crucial when zones are nested inside split containers (like board halves).
 */
export function getLocalCoords(element, boardEl) {
  let x = 0;
  let y = 0;
  let curr = element;
  while (curr && curr !== boardEl) {
    x += curr.offsetLeft;
    y += curr.offsetTop;
    curr = curr.offsetParent;
  }
  return {
    x: x + element.clientWidth / 2,
    y: y + element.clientHeight / 2
  };
}

/**
 * Creates a 3D laser/beam attack projectile from source zone to target zone
 */
export function animateAttack(boardEl, srcZone, destZone, color = '#00ffff', projType = 'beam') {
  return new Promise((resolve) => {
    // Calculate offsets within the board robustly
    const srcCoords = getLocalCoords(srcZone, boardEl);
    const destCoords = getLocalCoords(destZone, boardEl);
    const srcX = srcCoords.x;
    const srcY = srcCoords.y;
    const destX = destCoords.x;
    const destY = destCoords.y;

    // Create projectile element
    const proj = document.createElement('div');
    proj.className = `attack-projectile ${projType}`;
    proj.style.left = `${srcX}px`;
    proj.style.top = `${srcY}px`;
    proj.style.background = `radial-gradient(circle, ${color} 0%, rgba(255,255,255,0.8) 20%, transparent 70%)`;
    proj.style.boxShadow = `0 0 25px ${color}, 0 0 50px ${color}`;
    proj.style.transform = `translate3d(-50%, -50%, 60px)`; // Float 60px above the board

    // Create tail line
    const tail = document.createElement('div');
    tail.className = 'projectile-tail';
    tail.style.backgroundColor = color;
    tail.style.boxShadow = `0 0 10px ${color}`;
    proj.appendChild(tail);

    boardEl.appendChild(proj);

    // Trigger projectile movement using requestAnimationFrame & CSS transitions
    requestAnimationFrame(() => {
      // Calculate angle and distance for the tail stretching
      const dx = destX - srcX;
      const dy = destY - srcY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx) * (180 / Math.PI);

      tail.style.width = `${dist}px`;
      // Rotate tail to point towards destination
      tail.style.transform = `rotateZ(${angle}deg)`;

      // Animate projectile position
      proj.style.transition = boardMotionDuration(500) === 0
        ? 'none'
        : 'all 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
      proj.style.left = `${destX}px`;
      proj.style.top = `${destY}px`;
    });

    // After animation finishes
    scheduleBoardAnimation(() => {
      proj.remove();

      // Trigger hit explosion in the target zone
      createExplosion(boardEl, destX, destY, color);
      resolve();
    }, 500, () => {
      proj.remove();
      resolve();
    });
  });
}

/**
 * Spawns a beautiful particle explosion at local coordinates
 */
export function createExplosion(boardEl, x, y, color = '#ff3300') {
  const expl = document.createElement('div');
  expl.className = 'explosion-container';
  expl.style.left = `${x}px`;
  expl.style.top = `${y}px`;
  expl.style.transform = `translate3d(-50%, -50%, 60px)`;

  // Add flashing flash ring
  const ring = document.createElement('div');
  ring.className = 'explosion-ring';
  ring.style.borderColor = color;
  ring.style.boxShadow = `0 0 20px ${color}`;
  expl.appendChild(ring);

  // Add particles
  const particleCount = 20;
  for (let i = 0; i < particleCount; i++) {
    const p = document.createElement('div');
    p.className = 'explosion-particle';
    p.style.backgroundColor = color;
    p.style.boxShadow = `0 0 8px ${color}`;

    // Random direction and distance
    const angle = Math.random() * Math.PI * 2;
    const speed = 50 + Math.random() * 80;
    const tx = Math.cos(angle) * speed;
    const ty = Math.sin(angle) * speed;
    const tz = (Math.random() - 0.5) * 60; // Spread in Z space too!

    p.style.setProperty('--tx', `${tx}px`);
    p.style.setProperty('--ty', `${ty}px`);
    p.style.setProperty('--tz', `${tz}px`);

    expl.appendChild(p);
  }

  boardEl.appendChild(expl);

  // Remove after animation finishes
  scheduleBoardAnimation(() => {
    expl.remove();
  }, 1000);
}

/**
 * Triggers lightning rain cinematic across target side monster zones
 */
export function triggerRaigekiCinematic(boardEl, targetSide) {
  const mainMonsterZones = [
    ...boardEl.querySelectorAll(`.card-zone.${targetSide}-m-zone`)
  ];
  const extraMonsterZones = [
    ...boardEl.querySelectorAll(
      `[data-zone-type="extra-monster"][data-controller-id="${targetSide}"], `
      + `.extra-monster-zone[data-controller-id="${targetSide}"]`
    )
  ];
  const monsterZones = [...new Set([...mainMonsterZones, ...extraMonsterZones])];
  monsterZones.forEach((zone) => {
    const coords = getLocalCoords(zone, boardEl);
    const lightning = document.createElement('div');
    lightning.className = 'raigeki-lightning';
    lightning.style.left = `${coords.x}px`;
    lightning.style.top = `${coords.y - 120}px`;
    boardEl.appendChild(lightning);

    scheduleBoardAnimation(() => lightning.remove(), 800);
  });
}

/**
 * Triggers a protective mirror force barrier fanning up in front of defending side
 */
export function triggerMirrorForceCinematic(boardEl, side) {
  const barrier = document.createElement('div');
  barrier.className = 'mirror-force-barrier';

  // Place on defending half
  barrier.style.top = side === 'player' ? '65%' : '35%';
  boardEl.appendChild(barrier);

  scheduleBoardAnimation(() => barrier.remove(), 1500);
}

/**
 * Triggers a golden Egyptian Ankh cross floating above target zone
 */
export function triggerRebornCinematic(boardEl, side, zoneIndex) {
  const zoneQuery = `.card-zone.${side}-m-zone[data-index="${zoneIndex}"]`;
  const zoneEl = boardEl.querySelector(zoneQuery);
  if (!zoneEl) return;

  const coords = getLocalCoords(zoneEl, boardEl);
  const ankh = document.createElement('div');
  ankh.className = 'reborn-ankh';
  ankh.style.left = `${coords.x}px`;
  ankh.style.top = `${coords.y}px`;

  ankh.innerHTML = `
    <svg class="ankh-svg" viewBox="0 0 100 100">
      <path d="M 50 15 C 40 15, 35 35, 50 45 C 65 35, 60 15, 50 15 Z M 50 45 L 50 85 M 25 50 L 75 50" />
    </svg>
  `;
  boardEl.appendChild(ankh);

  scheduleBoardAnimation(() => ankh.remove(), 1500);
}
