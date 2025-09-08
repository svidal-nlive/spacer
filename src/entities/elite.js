// entities/elite.js — minimal stubs for Elite framework
// Goal: allow enemies to optionally spawn with an elite modifier that tweaks stats and visuals.

// Lightweight pool of known elite affixes. Keep numbers conservative for now.
export const ELITE_DEFS = {
  Shielded: {
    color: '#5cc2ff',
    outline: 1,
    apply(e){ e.hp = Math.ceil(e.hp * 1.8); e.elite = 'Shielded'; },
  },
  Swift: {
    color: '#9eff6b',
    outline: 1,
    apply(e){ e.speed = Math.round(e.speed * 1.25); e.elite = 'Swift'; },
  },
  Juggernaut: {
    color: '#ff9e6b',
    outline: 2,
    apply(e){ e.r += 2; e.hp = Math.ceil(e.hp * 2.3); e.elite = 'Juggernaut'; },
  },
};

// Roll a simple elite with low chance; can be adjusted later by wave.
export function maybeAffixElite(e, chance = 0.08){
  if(Math.random() > chance) return e;
  const keys = Object.keys(ELITE_DEFS);
  const def = ELITE_DEFS[keys[Math.floor(Math.random()*keys.length)]];
  def.apply(e);
  e.eliteColor = def.color; e.eliteOutline = def.outline || 1;
  return e;
}

// Draw helper — called from enemy draw when e.elite is set
export function drawEliteOutline(ctx, e){
  if(!e.elite) return;
  ctx.save();
  ctx.strokeStyle = e.eliteColor || '#25d0ff';
  ctx.lineWidth = e.eliteOutline || 1.5;
  ctx.globalAlpha = 0.9;
  ctx.beginPath(); ctx.arc(e.x, e.y, e.r + 3, 0, Math.PI*2); ctx.stroke();
  ctx.restore();
}
