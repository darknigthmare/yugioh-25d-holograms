export const REAL_DUEL_CAMERA_PRESET_IDS = Object.freeze([
  'player',
  'diagonal-left',
  'diagonal-right',
  'console',
  'overview'
]);

export const REAL_DUEL_CAMERA_PRESETS = Object.freeze({
  player: Object.freeze({
    label: 'JOUEUR',
    accessibleLabel: 'Vue joueur face au terrain',
    shortcut: 'Alt+1'
  }),
  'diagonal-left': Object.freeze({
    label: 'DIAG. G',
    accessibleLabel: 'Vue diagonale depuis la gauche',
    shortcut: 'Alt+2'
  }),
  'diagonal-right': Object.freeze({
    label: 'DIAG. D',
    accessibleLabel: 'Vue diagonale depuis la droite',
    shortcut: 'Alt+3'
  }),
  console: Object.freeze({
    label: 'CONSOLE',
    accessibleLabel: 'Vue rapprochée de la console du joueur',
    shortcut: 'Alt+4'
  }),
  overview: Object.freeze({
    label: 'GLOBALE',
    accessibleLabel: 'Vue globale surélevée de l’arène',
    shortcut: 'Alt+5'
  })
});

const CAMERA_POSES = Object.freeze({
  desktop: Object.freeze({
    player: Object.freeze({
      position: Object.freeze([0, 15, 25]),
      target: Object.freeze([0, 0, 0]),
      fov: 36
    }),
    'diagonal-left': Object.freeze({
      position: Object.freeze([-12.5, 15.5, 25]),
      target: Object.freeze([0, 0.8, -0.5]),
      fov: 39
    }),
    'diagonal-right': Object.freeze({
      position: Object.freeze([12.5, 15.5, 25]),
      target: Object.freeze([0, 0.8, -0.5]),
      fov: 39
    }),
    console: Object.freeze({
      position: Object.freeze([0, 8.5, 21]),
      target: Object.freeze([0, 1.35, 8.4]),
      fov: 40
    }),
    overview: Object.freeze({
      position: Object.freeze([0, 27, 25.5]),
      target: Object.freeze([0, 0, -0.5]),
      fov: 41
    })
  }),
  tablet: Object.freeze({
    player: Object.freeze({
      position: Object.freeze([0, 15.5, 26]),
      target: Object.freeze([0, 2.2, 0]),
      fov: 43
    }),
    'diagonal-left': Object.freeze({
      position: Object.freeze([-10, 16.5, 27]),
      target: Object.freeze([0, 1, -0.5]),
      fov: 46
    }),
    'diagonal-right': Object.freeze({
      position: Object.freeze([10, 16.5, 27]),
      target: Object.freeze([0, 1, -0.5]),
      fov: 46
    }),
    console: Object.freeze({
      position: Object.freeze([0, 9, 23]),
      target: Object.freeze([0, 1.35, 8]),
      fov: 41
    }),
    overview: Object.freeze({
      position: Object.freeze([0, 29, 27]),
      target: Object.freeze([0, 0.5, -1]),
      fov: 49
    })
  }),
  mobile: Object.freeze({
    player: Object.freeze({
      position: Object.freeze([0, 16, 27]),
      target: Object.freeze([0, 0.8, 0]),
      fov: 54
    }),
    'diagonal-left': Object.freeze({
      position: Object.freeze([-7.5, 17.5, 29]),
      target: Object.freeze([0, 1, -0.5]),
      fov: 55
    }),
    'diagonal-right': Object.freeze({
      position: Object.freeze([7.5, 17.5, 29]),
      target: Object.freeze([0, 1, -0.5]),
      fov: 55
    }),
    console: Object.freeze({
      position: Object.freeze([0, 10, 25]),
      target: Object.freeze([0, 1.4, 7.5]),
      fov: 49
    }),
    overview: Object.freeze({
      position: Object.freeze([0, 33, 30]),
      target: Object.freeze([0, 0.5, -1]),
      fov: 56
    })
  })
});

export function normalizeRealDuelCameraPreset(presetId, fallback = 'player') {
  if (REAL_DUEL_CAMERA_PRESET_IDS.includes(presetId)) return presetId;
  return REAL_DUEL_CAMERA_PRESET_IDS.includes(fallback) ? fallback : 'player';
}

export function resolveRealDuelCameraPose(presetId, viewportWidth = 1280) {
  const normalizedPreset = normalizeRealDuelCameraPreset(presetId);
  const width = Number(viewportWidth);
  const breakpoint = Number.isFinite(width) && width <= 600
    ? 'mobile'
    : (Number.isFinite(width) && width <= 1050 ? 'tablet' : 'desktop');
  const pose = CAMERA_POSES[breakpoint][normalizedPreset];

  return Object.freeze({
    presetId: normalizedPreset,
    breakpoint,
    position: Object.freeze([...pose.position]),
    target: Object.freeze([...pose.target]),
    fov: pose.fov
  });
}

export default REAL_DUEL_CAMERA_PRESETS;
