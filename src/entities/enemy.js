// entities/enemy.js - simple spawn from rim toward center
import { rand } from '../core/rng.js';
import { game, getPlayerWorldPos } from '../core/state.js';
import { spawnPickup } from './pickup.js';
import { spawnEnemyDeathFX } from '../systems/effects.js';
import { maybeAffixElite, handleEliteOnDeath, drawEliteName } from './elite.js';
import { getColdSlowMul, getBossBarrierWorldY } from '../systems/effects.js';
import { canvas } from '../core/canvas.js';
import { getPlayableScreenBounds } from '../core/uiBounds.js';
import { beep, isMuted } from '../core/audio.js';
import { spawnEnemyShot } from './enemyShot.js';
const MAX = 256;
export const enemies = Array.from({length:MAX}, ()=>({active:false,x:0,y:0,r:14,hp:3,speed:60,type:'grunt',fireT:0,fireCd:0,tel:0,quota:1}));
export function spawnEnemy(radius, type='grunt'){
  const e = enemies.find(o=>!o.active); if(!e) return null; const theta = rand(-Math.PI,Math.PI);
  e.active=true; e.x = Math.cos(theta)*radius; e.y = Math.sin(theta)*radius; e.type=type; e.tel=0;
  if(type==='striker'){ e.r=12; e.hp=2; e.speed=95; e.fireCd=1.8; e.fireT=1.2; e.quota=1; }
  else if(type==='tank'){ e.r=16; e.hp=6; e.speed=40; e.fireCd=1.2; e.fireT=0.6; e.quota=2; }
  else { e.r=14; e.hp=3; e.speed=60; e.fireCd=2.4; e.fireT=1.4; e.quota=1; }
  // Desync firing cadence a bit to avoid synchronized volleys
  e.fireCd *= rand(0.9, 1.15);
  e.fireT *= rand(0.6, 1.4);
  // Elite roll — chance scales up slowly with wave; allow rare double stacks late
  const w = game.wave||1;
  const base = 0.06, per = 0.01; // cautious
  const chance = Math.min(0.18, base + (w-1)*per);
  const maxStacks = w>=6? 2 : 1;
  maybeAffixElite(e, { chance, maxStacks });
  // Spawn stinger on elite
  if(e.elite && !isMuted()) beep({freq:720, freqEnd:540, type:'triangle', duration:0.07, gain:0.035, attack:0.003, release:0.05});
  return e;
}

export function spawnEnemyAt(x, y, type='grunt'){
  const e = enemies.find(o=>!o.active); if(!e) return null;
  // Fairness: prox-box no-spawn; min time-to-impact backoff
  const p = getPlayerWorldPos();
  const d = Math.hypot(x - p.x, y - p.y);
  const prox = 120; // no-spawn radius
  if(d < prox){ const nx=(x-p.x)/(d||1), ny=(y-p.y)/(d||1); const extra = (prox - d) + 30; x = p.x + nx*(d+extra); y = p.y + ny*(d+extra); }
  // ensure min TTI (~0.7s at 60px/s -> ~42px away along approach vector)
  const minTTIDist = 42;
  if(d < minTTIDist){ const nx=(x-p.x)/(d||1), ny=(y-p.y)/(d||1); x = p.x + nx*minTTIDist; y = p.y + ny*minTTIDist; }
  e.active=true; e.x = x; e.y = y; e.type=type; e.tel=0;
  if(type==='striker'){ e.r=12; e.hp=2; e.speed=95; e.fireCd=1.8; e.fireT=1.2; e.quota=1; }
  else if(type==='tank'){ e.r=16; e.hp=6; e.speed=40; e.fireCd=1.2; e.fireT=0.6; e.quota=2; }
  else { e.r=14; e.hp=3; e.speed=60; e.fireCd=2.4; e.fireT=1.4; e.quota=1; }
  // Desync firing cadence a bit to avoid synchronized volleys
  e.fireCd *= rand(0.9, 1.15);
  e.fireT *= rand(0.6, 1.4);
  // Elite roll — same as edge spawn
  const w = game.wave||1; const base = 0.06, per = 0.01; const chance = Math.min(0.18, base + (w-1)*per); const maxStacks = w>=6? 2 : 1;
  maybeAffixElite(e, { chance, maxStacks });
  if(e.elite && !isMuted()) beep({freq:720, freqEnd:540, type:'triangle', duration:0.07, gain:0.035, attack:0.003, release:0.05});
  return e;
}
export const PLAYER_R = 22; // turret body radius
export function updateEnemies(dt){
  for(const e of enemies){
    if(!e.active) continue;
    // elite name tag timer
    if(e.eliteNameT && e.eliteNameT>0){ e.eliteNameT = Math.max(0, e.eliteNameT - dt); }
  const player = getPlayerWorldPos();
  const dxToP = player.x - e.x, dyToP = player.y - e.y;
  const d = Math.hypot(dxToP,dyToP);
  const slowMul = game.powerups.slowT>0? 0.55 : 1.0;
  // Apply Cold aura slow (elite death field)
  const auraMul = getColdSlowMul(e.x, e.y);
  const moveMul = slowMul * auraMul;
  if(d>1){ e.x += (dxToP/d)*e.speed*moveMul*dt; e.y += (dyToP/d)*e.speed*moveMul*dt; }
    // Boss top-down barrier: prevent enemies from crossing below the barrier line; apply soft clamp
    if(game.arenaMode==='topdown'){
      const yBar = getBossBarrierWorldY();
      const soft = 8; // px
      if(e.y > yBar - soft){
        e.y = yBar - soft;
      }
    }
    // Keep enemies within playable vertical bounds (avoid UI gutters)
    {
      const dpr = window.devicePixelRatio || 1;
      const pb = getPlayableScreenBounds();
      const hCSS = canvas.height / dpr;
      const topY = -(hCSS/2) + pb.y; // screen->world
      const botY = topY + pb.height;
      const soft = 6;
      if(e.y < topY + soft) e.y = topY + soft;
      if(e.y > botY - soft) e.y = botY - soft;
    }
    // firing with simple telegraph
    e.fireT -= dt;
    if(e.fireT<=0){
      if(e.tel<=0){ e.tel = 0.25; e.fireT = 0.25; }
      else {
  let ang = Math.atan2(player.y - e.y, player.x - e.x);
        // Add slight aim error when close to player to increase fairness
        // Max error ~0.18 rad up close, tapering to 0 beyond 260px
  const close=120, far=260; const dAim = Math.hypot(dxToP,dyToP);
        if(dAim < far){ let t=(far - dAim)/(far - close); if(t<0) t=0; if(t>1) t=1; const maxErr=0.18*t; ang += (Math.random()*2-1)*maxErr; }
  const speed = e.type==='striker'? 240 : e.type==='tank'? 180 : 200;
        const color = e.type==='tank'? '#ff946b' : '#ffb63b';
        spawnEnemyShot(e.x, e.y, ang, speed, color);
        e.fireT = e.fireCd; e.tel=0;
      }
    } else if(e.tel>0){ e.tel = Math.max(0, e.tel - dt); }
    // reach center -> damage player
  if(d <= PLAYER_R + e.r){
      e.active=false;
      if(game.invulnT>0){
        // ignore while invulnerable
      } else if(game.powerups.shieldT>0){
        // consume a small chunk of shield time instead of a life
        game.powerups.shieldT = Math.max(0, game.powerups.shieldT - 2);
      } else {
        game.lives = Math.max(0, game.lives-1);
        game.screenFlash=0.35; game.screenFlashColor='#ff6b6b';
        game.invulnT = 1.0;
      }
    }
  }
}
export function forEachEnemy(fn){ for(const e of enemies){ if(e.active) fn(e); } }
export function damageEnemy(e, dmg){
  e.hp -= dmg;
  if(e.hp<=0){
  e.active=false; const mult = game.powerups.twoXT>0? 2:1; const cred = (e.type==='tank'? 2:1);
  game.score += 100*mult; game.credits += cred*mult; game.earnedThisWave += cred*mult;
  spawnEnemyDeathFX(e.x, e.y, e.type==='tank'? '#ff946b': '#ffd166');
  // elite on-death
  handleEliteOnDeath(e);
  // Volatile AoE damage trigger
  if(e._eliteVolatileBoom){
    const boom = e._eliteVolatileBoom; // {x,y,radius,dmg}
    for(const ee of enemies){ if(!ee.active) continue; const dd = Math.hypot(ee.x - boom.x, ee.y - boom.y); if(dd <= boom.radius){ ee.hp -= boom.dmg; if(ee.hp<=0){ ee.active=false; const m = game.powerups.twoXT>0? 2:1; const c = (ee.type==='tank'? 2:1); game.score += 100*m; game.credits += c*m; game.earnedThisWave += c*m; spawnEnemyDeathFX(ee.x, ee.y, ee.type==='tank'? '#ff946b': '#ffd166'); handleEliteOnDeath(ee); } } }
  }
  if(!isMuted()) beep({freq:500, freqEnd:350, type:'triangle', duration:0.06, gain:0.03, attack:0.003, release:0.05});
  // small chance to drop a pickup
  if(Math.random()<0.18){ spawnPickup(e.x, e.y); }
  }
}
export function drawEnemies(ctx){ ctx.save(); for(const e of enemies){ if(!e.active) continue; ctx.strokeStyle='#25d0ff33'; ctx.fillStyle= e.type==='tank'? '#2a2c3a' : e.type==='striker'? '#18283d' : '#1a2a40'; ctx.beginPath(); ctx.arc(e.x,e.y,e.r,0,Math.PI*2); ctx.fill(); ctx.stroke();
  // Elite outline + tag
  if(e.elite){ ctx.save(); ctx.strokeStyle = e.eliteColor || '#25d0ff'; ctx.globalAlpha=0.85; ctx.lineWidth = (e.eliteOutline||1.5); ctx.beginPath(); ctx.arc(e.x,e.y,e.r+3,0,Math.PI*2); ctx.stroke(); ctx.restore();
  // name tag
  drawEliteName(ctx, e);
  }
  if(e.tel>0){ ctx.save(); ctx.globalAlpha=Math.min(0.9,e.tel*2.5); ctx.strokeStyle='#ffb63b'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(e.x,e.y,e.r+4,0,Math.PI*2); ctx.stroke(); ctx.restore(); } } ctx.restore(); }

export function resetEnemies(){
  for(const e of enemies){ e.active=false; e.tel=0; }
}
