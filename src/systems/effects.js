// systems/effects.js - transient visual effects (pulsar ring, emp cone)
import { ctx } from '../core/canvas.js';

const rings = []; // {t:0..1, r0, r1}
const sparks = []; // {x, y, t}
const cones = []; // {t:0..1, ang, arc}
const deaths = []; // {x,y,t, col}

export function spawnPulsarFX(){ rings.push({ t: 0, r0: 24, r1: 220 }); }
export function spawnEmpFX(angle){ cones.push({ t: 0, ang: angle, arc: Math.PI/3 }); }

export function updateEffects(dt){
  for(const r of rings){ r.t += dt/0.5; }
  for(const c of cones){ c.t += dt/0.35; }
  for(const s of sparks){ s.t += dt/0.25; }
  for(const d of deaths){ d.t += dt/0.35; }
  // cull
  for(let i=rings.length-1;i>=0;i--){ if(rings[i].t>=1) rings.splice(i,1); }
  for(let i=cones.length-1;i>=0;i--){ if(cones[i].t>=1) cones.splice(i,1); }
  for(let i=sparks.length-1;i>=0;i--){ if(sparks[i].t>=1) sparks.splice(i,1); }
  for(let i=deaths.length-1;i>=0;i--){ if(deaths[i].t>=1) deaths.splice(i,1); }
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
  ctx.restore();
}
  export function resetEffects(){ rings.length=0; cones.length=0; sparks.length=0; deaths.length=0; }
export function spawnShotSpark(x,y){ sparks.push({x,y,t:0}); }
export function spawnEnemyDeathFX(x,y,col){ deaths.push({x,y,t:0,col}); }
