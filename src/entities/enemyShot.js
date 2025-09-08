// entities/enemyShot.js - enemy projectiles
import { canvas, ctx } from '../core/canvas.js';
import { game } from '../core/state.js';

const MAX = 512;
const pool = Array.from({length:MAX}, ()=>({active:false,x:0,y:0,vx:0,vy:0,r:6,ttl:0,col:'#ffb63b'}));

export function spawnEnemyShot(x,y, ang, speed=220, color='#ffb63b'){
  const s = pool.find(o=>!o.active); if(!s) return null;
  // Enforce a minimum time-to-impact (fairness): clamp projectile speed by distance
  const slowMul = game.powerups.slowT>0? 0.7:1.0;
  const defaultV = speed*slowMul;
  const dist = Math.hypot(x, y);
  const MIN_TTI = 1.25; // seconds; shots should take at least this long to reach center when spawned
  const maxV = dist / MIN_TTI; // cap speed so time-to-impact >= MIN_TTI
  const v = Math.min(defaultV, maxV);
  s.active=true; s.x=x; s.y=y; s.vx=Math.cos(ang)*v; s.vy=Math.sin(ang)*v; s.r=6; s.ttl=7.0; s.col=color; return s;
}

export function updateEnemyShots(dt){
  for(const s of pool){ if(!s.active) continue; s.x += s.vx*dt; s.y += s.vy*dt; s.ttl -= dt; if(s.ttl<=0){ s.active=false; continue; }
    // simple bounds check (offscreen padding)
    const pad = 32; if(Math.abs(s.x) > canvas.width/2 + pad || Math.abs(s.y) > canvas.height/2 + pad){ s.active=false; continue; }
    // collide with player
    const PLAYER_R = 22;
    const d = Math.hypot(s.x, s.y);
  if(d <= PLAYER_R + s.r){
      s.active=false;
      // If currently invulnerable, ignore damage entirely
      if(game.invulnT>0){ /* no-op while invulnerable */ }
      else if(game.powerups.shieldT>0){ game.powerups.shieldT = Math.max(0, game.powerups.shieldT - 2); }
      else {
        game.lives = Math.max(0, game.lives-1);
        game.screenFlash=0.35; game.screenFlashColor='#ff6b6b';
        // grant brief invulnerability window after taking a hit
        game.invulnT = 1.0;
      }
    }
  }
}

export function drawEnemyShots(){
  ctx.save();
  for(const s of pool){
    if(!s.active) continue;
    const a = Math.atan2(s.vy, s.vx);
    const r = s.r;
    ctx.translate(s.x, s.y);
    ctx.rotate(a);
    // oriented diamond (rotated square)
    ctx.fillStyle = s.col;
    ctx.strokeStyle = '#2b1a0a';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, -r); // top
    ctx.lineTo(r, 0);  // right
    ctx.lineTo(0, r);  // bottom
    ctx.lineTo(-r, 0); // left
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // glow
    ctx.rotate(-a);
    ctx.translate(-s.x, -s.y);
  }
  ctx.restore();
}

export function forEachEnemyShot(fn){ for(const s of pool){ if(s.active) fn(s); } }
export function deactivateEnemyShot(s){ s.active=false; }
export function resetEnemyShots(){ for(const s of pool){ s.active=false; } }