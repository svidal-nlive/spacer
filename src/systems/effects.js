// systems/effects.js - transient visual effects (pulsar ring, emp cone)
import { ctx } from '../core/canvas.js';
import { getPlayableScreenBounds } from '../core/uiBounds.js';
import { game } from '../core/state.js';

const rings = []; // {t:0..1, r0, r1}
const sparks = []; // {x, y, t}
const cones = []; // {t:0..1, ang, arc}
const deaths = []; // {x,y,t, col}
// Elite-specific VFX
const frosts = []; // Cold death burst {x,y,t}
const booms = [];  // Volatile explosion {x,y,t}
// Cinematic overlays
const letterbox = { active:false, t:0, dir:0, dur:0.8 }; // dir: 1=in, -1=out
const bossBarrier = { enabled:false, y:0, pulse:0 };
// Gameplay auras
const coldAuras = []; // {x,y,t,maxT,r,strength}

export function spawnPulsarFX(){ rings.push({ t: 0, r0: 24, r1: 220 }); }
export function spawnEmpFX(angle){ cones.push({ t: 0, ang: angle, arc: Math.PI/3 }); }

export function updateEffects(dt){
  for(const r of rings){ r.t += dt/0.5; }
  for(const c of cones){ c.t += dt/0.35; }
  for(const s of sparks){ s.t += dt/0.25; }
  for(const d of deaths){ d.t += dt/0.35; }
  for(const f of frosts){ f.t += dt/0.6; }
  for(const b of booms){ b.t += dt/0.4; }
  for(const a of coldAuras){ a.t += dt; }
  // cull
  for(let i=rings.length-1;i>=0;i--){ if(rings[i].t>=1) rings.splice(i,1); }
  for(let i=cones.length-1;i>=0;i--){ if(cones[i].t>=1) cones.splice(i,1); }
  for(let i=sparks.length-1;i>=0;i--){ if(sparks[i].t>=1) sparks.splice(i,1); }
  for(let i=deaths.length-1;i>=0;i--){ if(deaths[i].t>=1) deaths.splice(i,1); }
  for(let i=frosts.length-1;i>=0;i--){ if(frosts[i].t>=1) frosts.splice(i,1); }
  for(let i=booms.length-1;i>=0;i--){ if(booms[i].t>=1) booms.splice(i,1); }
  for(let i=coldAuras.length-1;i>=0;i--){ if(coldAuras[i].t>=coldAuras[i].maxT) coldAuras.splice(i,1); }
  // letterbox anim
  if (letterbox.active && letterbox.dir !== 0) {
    letterbox.t += (dt / Math.max(0.0001, letterbox.dur)) * (letterbox.dir > 0 ? 1 : -1);
    if (letterbox.t >= 1) { letterbox.t = 1; if (letterbox.dir > 0) { letterbox.dir = 0; } }
    if (letterbox.t <= 0) { letterbox.t = 0; letterbox.active = false; letterbox.dir = 0; }
  }
  // barrier shimmer
  if (bossBarrier.enabled) bossBarrier.pulse = (bossBarrier.pulse + dt * 2.0) % 1.0;
}

export function drawEffects(){
  ctx.save();
  // draw assumes origin already centered by caller
  for(const r of rings){
    const k = Math.min(1, r.t);
    const rr = r.r0 + (r.r1 - r.r0) * k;
    ctx.globalAlpha = 1 - k;
    ctx.strokeStyle = '#25d0ff';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0,0, rr, 0, Math.PI*2); ctx.stroke();
  }
  ctx.globalAlpha = 1;
  for(const c of cones){
    const k = Math.min(1, c.t);
    ctx.globalAlpha = 0.35 * (1-k);
    ctx.fillStyle = '#25d0ff';
    const r = 260 * k;
    ctx.beginPath();
    ctx.moveTo(0,0);
    ctx.arc(0,0, r, c.ang - c.arc/2, c.ang + c.arc/2);
    ctx.closePath();
    ctx.fill();
  }
  // shot sparks: small 4-ray star burst
  for(const s of sparks){
    const k = Math.min(1, s.t);
    const a = (1-k);
    const r = 10 * (1 - 0.4*k);
    ctx.globalAlpha = 0.8 * a;
    ctx.strokeStyle = '#ffd166';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(s.x - r, s.y); ctx.lineTo(s.x + r, s.y);
    ctx.moveTo(s.x, s.y - r); ctx.lineTo(s.x, s.y + r);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  // enemy death burst: ring + shards
  for(const d of deaths){
    const k = Math.min(1, d.t);
    const a = 1-k;
    const rr = 8 + 36*k;
    // ring
    ctx.globalAlpha = 0.4*a; ctx.strokeStyle = d.col||'#ffd166'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(d.x, d.y, rr, 0, Math.PI*2); ctx.stroke(); ctx.globalAlpha=1;
    // cross shards
    const r = 14*(1-0.3*k);
    ctx.globalAlpha = 0.8*a; ctx.strokeStyle = d.col||'#ffd166'; ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(d.x-r, d.y); ctx.lineTo(d.x+r, d.y);
    ctx.moveTo(d.x, d.y-r); ctx.lineTo(d.x, d.y+r);
    ctx.stroke(); ctx.globalAlpha=1;
  }
  // Cold burst: icy ring + 6 spokes fading out
  for(const f of frosts){
    const k = Math.min(1, f.t);
    const a = 1-k;
    const rr = 10 + 44*k;
    ctx.globalAlpha = 0.5*a; ctx.strokeStyle = '#a6d2ff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(f.x, f.y, rr, 0, Math.PI*2); ctx.stroke(); ctx.globalAlpha=1;
    // spokes
    const spokeR = 16*(1-0.2*k);
    ctx.globalAlpha = 0.8*a; ctx.strokeStyle = '#cbe5ff'; ctx.lineWidth = 1.4;
    for(let i=0;i<6;i++){
      const ang = i*(Math.PI/3);
      const dx = Math.cos(ang)*spokeR, dy = Math.sin(ang)*spokeR;
      ctx.beginPath(); ctx.moveTo(f.x-dx, f.y-dy); ctx.lineTo(f.x+dx, f.y+dy); ctx.stroke();
    }
    ctx.globalAlpha=1;
  }
  // Volatile explosion: hot ring + 8 rays
  for(const b of booms){
    const k = Math.min(1, b.t);
    const a = 1-k;
    const rr = 12 + 52*k;
    ctx.globalAlpha = 0.4*a; ctx.strokeStyle = '#ff946b'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(b.x, b.y, rr, 0, Math.PI*2); ctx.stroke(); ctx.globalAlpha=1;
    // rays
    const rayR = 20*(1-0.25*k);
    ctx.globalAlpha = 0.85*a; ctx.strokeStyle = '#ffb63b'; ctx.lineWidth = 2;
    for(let i=0;i<8;i++){
      const ang = i*(Math.PI/4);
      const dx = Math.cos(ang)*rayR, dy = Math.sin(ang)*rayR;
      ctx.beginPath(); ctx.moveTo(b.x-dx, b.y-dy); ctx.lineTo(b.x+dx, b.y+dy); ctx.stroke();
    }
    ctx.globalAlpha=1;
  }
  // Cold aura visualization: subtle disk with edge glow
  for(const a of coldAuras){
    const k = Math.min(1, a.t / a.maxT);
    const alpha = 0.18 * (1-k);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#8ecaff';
    ctx.beginPath(); ctx.arc(a.x, a.y, a.r, 0, Math.PI*2); ctx.fill();
    ctx.globalAlpha = Math.min(0.35, 0.25*(1-k));
    ctx.strokeStyle = '#bde0ff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(a.x, a.y, a.r, 0, Math.PI*2); ctx.stroke();
    ctx.globalAlpha = 1;
  }
  ctx.restore();
  // Screen-space overlays (letterbox + barrier) — ignore world transform
  const w = ctx.canvas.width, h = ctx.canvas.height;
  // Letterbox bars
  if (letterbox.active || letterbox.t > 0) {
    const k = easeOutCubic(clamp01(letterbox.t));
    const barH = Math.round(h * 0.14 * k); // 14% max
    if (barH > 0) {
      ctx.save(); ctx.setTransform(1,0,0,1,0,0);
      ctx.fillStyle = 'rgba(0,0,0,0.85)';
      ctx.fillRect(0, 0, w, barH);
      ctx.fillRect(0, h - barH, w, barH);
      ctx.restore();
    }
  }
  // Boss barrier at mid-screen (or custom y)
  if (bossBarrier.enabled) {
    // Place barrier at explicit y if set; otherwise align to top of playable area
    let y = bossBarrier.y;
    if(!y){ const pb = getPlayableScreenBounds(); y = pb.y; }
    ctx.save(); ctx.setTransform(1,0,0,1,0,0);
    const glow = 0.35 + 0.25 * Math.sin(bossBarrier.pulse * Math.PI * 2);
    ctx.strokeStyle = `rgba(141, 210, 255, ${glow})`;
    ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    ctx.lineWidth = 1; ctx.setLineDash([10, 8]); ctx.lineDashOffset = - (bossBarrier.pulse * 18);
    ctx.strokeStyle = 'rgba(189, 224, 255, 0.35)'; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    ctx.restore();
  }
}
  export function resetEffects(){ rings.length=0; cones.length=0; sparks.length=0; deaths.length=0; }
export function spawnShotSpark(x,y){ sparks.push({x,y,t:0}); }
export function spawnEnemyDeathFX(x,y,col){ deaths.push({x,y,t:0,col}); }
export function spawnColdBurstFX(x,y){ frosts.push({x,y,t:0}); }
export function spawnVolatileExplosionFX(x,y){ booms.push({x,y,t:0}); }
export function spawnColdAura(x,y,{radius=180,duration=3.0,strength=0.45}={}){
  coldAuras.push({x,y,t:0,maxT:duration,r:radius,strength});
}
// Compute movement speed multiplier at (x,y) due to cold auras (<=1)
export function getColdSlowMul(x,y){
  if(coldAuras.length===0) return 1;
  let mul = 1;
  for(const a of coldAuras){
    const d = Math.hypot(x-a.x, y-a.y); if(d>a.r) continue;
    const falloff = 1 - (d/a.r); // 1 at center -> 0 at edge
    const local = 1 - a.strength * falloff;
    if(local < mul) mul = local;
  }
  // Clamp to a reasonable floor to avoid freezing completely
  return Math.max(0.55, mul);
}
// Cinematic helpers
export function triggerLetterboxIn(dur=0.8){ letterbox.active = true; letterbox.dir = 1; letterbox.dur = dur; }
export function triggerLetterboxOut(dur=0.6){ letterbox.active = true; letterbox.dir = -1; letterbox.dur = dur; }
export function isLetterboxActive(){ return letterbox.active || letterbox.t > 0; }

// Boss barrier controls
export function enableBossBarrier(yPx){ bossBarrier.enabled = true; bossBarrier.y = yPx || 0; }
export function disableBossBarrier(){ bossBarrier.enabled = false; }
export function getBossBarrierScreenY(){
  // Prefer explicit y; otherwise align to top of playable area
  if (bossBarrier.y) return bossBarrier.y;
  try { const pb = getPlayableScreenBounds(); return pb.y; } catch { return ctx.canvas.height * 0.5; }
}
export function getBossBarrierWorldY(){
  // Adjust by the current world vertical offset (player render offset) so world-space queries
  // align with the screen-space barrier when the world is shifted during top-down mode.
  const worldOffsetY = (game && game.player && typeof game.player.y === 'number') ? game.player.y : 0;
  return getBossBarrierScreenY() - (ctx.canvas.height * 0.5) - worldOffsetY;
}

// small helpers
function clamp01(v){ return v<0?0:v>1?1:v; }
function easeOutCubic(t){ return 1 - Math.pow(1 - t, 3); }
