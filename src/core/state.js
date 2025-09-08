// core/state.js - global game state
export const game = {
  score: 0,
  best: 0,
  wave: 1,
  lives: 3,
  credits: 0,
  lastReward: 0,
  lastRewardKills: 0,
  lastRewardClear: 0,
  earnedThisWave: 0,
  // player combat
  heat: 0, heatMax: 100, heatRate: 28, heatCool: 22, overheated: false,
  rof: 7, dmg: 1, bulletSpeed: 900, pierce: 0,
  upgrades: { damage: 0, rof: 0, bulletSpeed: 0, pierce: 0 },
  // abilities (cooldowns in seconds)
  abilQ_cd: 0, abilQ_max: 10, // Pulsar (tuned)
  abilE_cd: 0, abilE_max: 7,  // EMP (tuned)
  // settings
  laserEnabled: true,
  autoFire: false, // DEV: autonomous main weapon (toggle via on-screen AUTO)
  autoRange: 240, // px radius within which AUTO firing activates
  showAutoGrid: false, // visualize AUTO activation range
  settingsOpen: false,
  // accessibility / UI
  showAbilityLabels: true,
  abilityUiMode: 'corner', // 'corner' | 'ring'
  abilityUiCorner: 'bottom-right', // 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  // transient UI timers
  readyFlashQ: 0, readyFlashE: 0,
  screenFlash: 0,
  screenFlashColor: '#25d0ff',
  // on-hit invulnerability (seconds remaining)
  invulnT: 0,
  // timed power-ups (seconds remaining)
  powerups: { rapidT: 0, spreadT: 0, shieldT: 0, slowT: 0, twoXT: 0 },
  // pickup stacks toward activation (collect 3 to activate)
  pickupStacks: { rapid: 0, spread: 0, shield: 0, slow: 0, twox: 0, bomb: 0 },
  // transient pulses when a stack activates (for HUD glow)
  stackPulse: { rapid: 0, spread: 0, shield: 0, slow: 0, twox: 0, bomb: 0 },
};
