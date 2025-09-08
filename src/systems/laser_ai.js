// systems/laser_ai.js - autonomous firing logic for turret lasers
import { spawnLaser } from '../entities/laser.js';
import { forEachEnemyShot } from '../entities/enemyShot.js';
import { game } from '../core/state.js';

// Fires short laser bursts at a capped fire rate toward nearest enemy shots.
// Player upgrades (game.dmg) scale laser damage equally.
const state = { cd: 0 };

export function updateLaserAI(dt){
  if(!game.laserEnabled) { state.cd = Math.max(0, state.cd - dt); return; }
  // fire cadence: fast enough to catch many shots
  let baseRps = 10; // shots per second
  state.cd = Math.max(0, state.cd - dt);
  // pick nearest active enemy shot to center
  let nearest = null, bestD = Infinity;
  forEachEnemyShot(s=>{ const d = Math.hypot(s.x, s.y); if(d<bestD){ bestD=d; nearest=s; } });
  if(!nearest) return;
  if(state.cd===0){
    // Predictive aim: estimate lead angle using shot velocity towards center if available.
    const targetVx = nearest.vx ?? 0, targetVy = nearest.vy ?? 0;
    const tLead = Math.min(0.12, bestD/1600); // lead time capped
    let aimX = nearest.x + targetVx * tLead;
    let aimY = nearest.y + targetVy * tLead;
    // Faint jitter to feel alive: tiny angular noise ±2°
    const jitter = (Math.random()*2-1) * (Math.PI/90);
    const ang = Math.atan2(aimY, aimX) + jitter; // from center to target
    const muzzle = 24; const mx = Math.cos(ang)*muzzle, my = Math.sin(ang)*muzzle;
    // Fire 1 beam normally; if SPREAD is active, fire double beams with small separation.
    const count = (game.powerups.spreadT>0) ? 2 : 1;
    const sep = 0.08; // radians offset for twin beams
    for(let i=0;i<count;i++){
      const a = count===2 ? (i===0? ang-sep : ang+sep) : ang;
      spawnLaser(mx, my, a, { speed: 1650, dmg: game.dmg, ttl: 0.22 });
    }
  // modifiers: RAPID power-up and player hold boost
  const rapidMul = (game.powerups.rapidT>0)? 1.8:1.0;
  const holdMul = (window?.spacerInput?.secondaryHold || false) ? 1.3 : 1.0;
  state.cd = 1/(baseRps*rapidMul*holdMul);
  }
}

export function resetLaserAI(){ state.cd = 0; }
