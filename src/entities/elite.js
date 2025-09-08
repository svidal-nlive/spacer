// entities/elite.js — Elite framework (affix system)
// Goal: allow enemies to optionally spawn with 1–N elite modifiers that tweak stats and visuals.

// Affix pool with conservative default weights and simple hooks
import { spawnColdBurstFX, spawnVolatileExplosionFX, spawnColdAura } from '../systems/effects.js';
export const ELITE_DEFS = {
  Shielded: {
    name: 'Shielded',
    color: '#5cc2ff',
    outline: 1,
    weight: 3,
    apply(e){ e.hp = Math.ceil(e.hp * 1.8); },
    onSpawn(e){ /* could add shimmer */ },
    onDeath(e){ /* could add extra shards */ },
  },
  Swift: {
    name: 'Swift',
    color: '#9eff6b',
    outline: 1,
    weight: 3,
    apply(e){ e.speed = Math.round(e.speed * 1.25); },
    onSpawn(e){}, onDeath(e){},
  },
  Juggernaut: {
    name: 'Juggernaut',
    color: '#ff9e6b',
    outline: 2,
    weight: 2,
    apply(e){ e.r += 2; e.hp = Math.ceil(e.hp * 2.3); },
    onSpawn(e){}, onDeath(e){},
  },
  Cold: {
    name: 'Cold',
    color: '#b6d7ff',
    outline: 1,
    weight: 2,
    apply(e){ /* future: slow aura could be applied here */ },
    onSpawn(e){},
    onDeath(e){
      spawnColdBurstFX(e.x, e.y);
      // create a temporary slow aura around the death location
      spawnColdAura(e.x, e.y, { radius: 180, duration: 3.0, strength: 0.45 });
    },
  },
  Volatile: {
    name: 'Volatile',
    color: '#ffb63b',
    outline: 2,
    weight: 1,
    apply(e){ /* future: slight self-damage tick or extra on-hit */ },
    onSpawn(e){},
    onDeath(e){
      spawnVolatileExplosionFX(e.x, e.y);
      // small AoE damage around the death location will be applied in wave update
      e._eliteVolatileBoom = { x: e.x, y: e.y, radius: 140, dmg: 2 };
    },
  },
};

function weightedPick(keys, weights){
  const total = weights.reduce((a,b)=>a+b,0);
  let r = Math.random()*total;
  for(let i=0;i<keys.length;i++){ r -= weights[i]; if(r<=0) return keys[i]; }
  return keys[keys.length-1];
}

// Apply 0..maxStacks affixes with overall chance; duplicates disabled
export function maybeAffixElite(e, opts={}){
  const { chance=0.08, maxStacks=1 } = opts;
  if(Math.random() > chance) return e;
  const keys = Object.keys(ELITE_DEFS);
  const chosen = [];
  const taken = new Set();
  // pick first
  let k1 = weightedPick(keys, keys.map(k=>ELITE_DEFS[k].weight||1));
  taken.add(k1); chosen.push(k1);
  // try additional picks with diminishing odds
  for(let i=1;i<maxStacks;i++){
    const remaining = keys.filter(k=>!taken.has(k)); if(remaining.length===0) break;
    // 50% of base chance gate per additional stack
    if(Math.random() > Math.max(0.15, chance*0.5)) break;
    const w = remaining.map(k=>ELITE_DEFS[k].weight||1);
    const ki = weightedPick(remaining, w);
    taken.add(ki); chosen.push(ki);
  }
  // apply and annotate enemy
  for(const name of chosen){ ELITE_DEFS[name].apply(e); ELITE_DEFS[name].onSpawn?.(e); }
  e.elite = true;
  e.elites = chosen;
  e.eliteName = chosen.join(' + ');
  const cols = chosen.map(n=>ELITE_DEFS[n].color);
  e.eliteColor = cols[0] || '#25d0ff';
  e.eliteOutline = Math.max(1.5, ...chosen.map(n=>ELITE_DEFS[n].outline||1.5));
  // timer for name tag fade
  e.eliteNameT = 1.6;
  return e;
}

// Draw helpers — called from enemy draw when e.elite is set
export function drawEliteOutline(ctx, e){
  if(!e.elite) return;
  ctx.save();
  ctx.strokeStyle = e.eliteColor || '#25d0ff';
  ctx.lineWidth = e.eliteOutline || 1.5;
  ctx.globalAlpha = 0.9;
  ctx.beginPath(); ctx.arc(e.x, e.y, e.r + 3, 0, Math.PI*2); ctx.stroke();
  ctx.restore();
}

export function drawEliteName(ctx, e){
  if(!e.elite || !e.eliteName || (e.eliteNameT??0)<=0) return;
  const t = e.eliteNameT; // 0..1.6
  const a = Math.min(1, t/0.25) * Math.min(1, (t)/1.6);
  ctx.save();
  ctx.globalAlpha = 0.85 * a;
  ctx.font = '10px system-ui,sans-serif';
  const text = e.eliteName;
  // measure using current transform (world space OK for size)
  const w = ctx.measureText(text).width;
  const padX = 4, padY = 2, rh = 12, rw = w + padX*2;
  ctx.fillStyle = 'rgba(10,15,24,0.9)';
  ctx.strokeStyle = '#1e2f45';
  const x = e.x - rw/2, y = e.y - e.r - rh - 6;
  // rounded rect background
  ctx.beginPath();
  const r = 4; const x2 = x+rw, y2 = y+rh;
  ctx.moveTo(x+r,y); ctx.arcTo(x2,y,x2,y2,r); ctx.arcTo(x2,y2,x,y2,r); ctx.arcTo(x,y2,x,y,r); ctx.arcTo(x,y,x2,y,r);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = e.eliteColor || '#b7f3ff';
  ctx.fillText(text, x + padX, y + rh - padY - 1);
  ctx.restore();
}

// On-death hook dispatcher
export function handleEliteOnDeath(e){
  if(!e || !e.elite || !Array.isArray(e.elites)) return;
  for(const name of e.elites){ ELITE_DEFS[name].onDeath?.(e); }
}

// No circular deps: effects does not import elite
