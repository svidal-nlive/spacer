// entities/pickup.js - timed power-up pickups
import { game } from '../core/state.js';
import { ctx } from '../core/canvas.js';
import { input } from '../engine/input.js';

const MAX = 64;
const pool = Array.from({length:MAX}, ()=>({active:false,x:0,y:0,t:0,type:'rapid'}));
const TYPES = ['rapid','spread','shield','slow','twox','bomb'];

export function spawnPickup(x,y){
  const p = pool.find(o=>!o.active); if(!p) return null;
  p.active=true; p.x=x; p.y=y; p.t=10; // 10s to collect
  // weight common ones higher
  const r = Math.random();
  p.type = r<0.25? 'rapid' : r<0.5? 'spread' : r<0.7? 'shield' : r<0.85? 'slow' : r<0.95? 'twox' : 'bomb';
  return p;
}

export function updatePickups(dt){
  for(const p of pool){ if(!p.active) continue; p.t -= dt; if(p.t<=0){ p.active=false; continue; }
    // magnet toward player: stronger when near, stronger on touch; center fallback in ring mode
    const ox = (game.arenaMode==='vertical' || game.arenaMode==='topdown')? game.playerPos.x : 0;
    const oy = (game.arenaMode==='vertical' || game.arenaMode==='topdown')? game.playerPos.y : 0;
    const dx = ox - p.x, dy = oy - p.y; const d = Math.hypot(dx,dy);
    const base = 18 + (input.isTouch? 10:0);
    const boost = d<140? (1.2 + (1 - d/140)*1.1) : 1.0;
    const speed = base * boost;
    if(d>1){ const nx = dx/d, ny = dy/d; p.x += nx*speed*dt; p.y += ny*speed*dt; }
  }
}

export function drawPickups(){
  ctx.save(); ctx.fillStyle='#b7f3ff'; ctx.strokeStyle='#1e2f45';
  for(const p of pool){ if(!p.active) continue; ctx.beginPath(); ctx.arc(p.x,p.y,8,0,Math.PI*2); ctx.fillStyle='rgba(15,22,33,0.9)'; ctx.fill(); ctx.stroke();
    // icon glyph
    ctx.fillStyle= colorFor(p.type);
    drawGlyph(p);
  }
  ctx.restore();
}

function drawGlyph(p){ ctx.save(); ctx.translate(p.x,p.y); ctx.font='10px system-ui,sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
  const ch = p.type==='rapid'? 'R' : p.type==='spread'? 'S' : p.type==='shield'? 'H' : p.type==='slow'? '⟲' : p.type==='twox'? '2x' : '◎';
  ctx.fillText(ch, 0, 0); ctx.restore(); }

function colorFor(t){
  switch(t){
    case 'rapid': return '#25d0ff';
    case 'spread': return '#7dd3fc';
    case 'shield': return '#90f5a8';
    case 'slow': return '#c6b6ff';
    case 'twox': return '#ffd166';
    case 'bomb': return '#ff6b6b';
    default: return '#b7f3ff';
  }
}

export function forEachPickup(fn){ for(const p of pool){ if(p.active) fn(p); } }
export function deactivatePickup(p){ p.active=false; }
export function resetPickups(){ for(const p of pool){ p.active=false; } }
