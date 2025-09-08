// entities/enemy.js - simple spawn from rim toward center
import { rand } from '../core/rng.js';
import { game } from '../core/state.js';
import { spawnPickup } from './pickup.js';
import { spawnEnemyDeathFX } from '../systems/effects.js';
import { maybeAffixElite } from './elite.js';
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
  // Low chance to roll an elite modifier (scaled later per wave)
  maybeAffixElite(e, 0.07);
  return e;
}

export function spawnEnemyAt(x, y, type='grunt'){
  const e = enemies.find(o=>!o.active); if(!e) return null;
  e.active=true; e.x = x; e.y = y; e.type=type; e.tel=0;
  if(type==='striker'){ e.r=12; e.hp=2; e.speed=95; e.fireCd=1.8; e.fireT=1.2; e.quota=1; }
  else if(type==='tank'){ e.r=16; e.hp=6; e.speed=40; e.fireCd=1.2; e.fireT=0.6; e.quota=2; }
  else { e.r=14; e.hp=3; e.speed=60; e.fireCd=2.4; e.fireT=1.4; e.quota=1; }
  // Desync firing cadence a bit to avoid synchronized volleys
  e.fireCd *= rand(0.9, 1.15);
  e.fireT *= rand(0.6, 1.4);
  maybeAffixElite(e, 0.07);
  return e;
}
export const PLAYER_R = 22; // turret body radius
export function updateEnemies(dt){
  for(const e of enemies){
    if(!e.active) continue;
    const d = Math.hypot(e.x,e.y);
    const slowMul = game.powerups.slowT>0? 0.55 : 1.0;
    if(d>1){ e.x += (-e.x/d)*e.speed*slowMul*dt; e.y += (-e.y/d)*e.speed*slowMul*dt; }
    // firing with simple telegraph
    e.fireT -= dt;
    if(e.fireT<=0){
      if(e.tel<=0){ e.tel = 0.25; e.fireT = 0.25; }
      else {
        let ang = Math.atan2(-e.y, -e.x);
        // Add slight aim error when close to player to increase fairness
        // Max error ~0.18 rad up close, tapering to 0 beyond 260px
        const close=120, far=260; const dAim = Math.hypot(e.x,e.y);
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
  if(!isMuted()) beep({freq:500, freqEnd:350, type:'triangle', duration:0.06, gain:0.03, attack:0.003, release:0.05});
  // small chance to drop a pickup
  if(Math.random()<0.18){ spawnPickup(e.x, e.y); }
  }
}
export function drawEnemies(ctx){ ctx.save(); for(const e of enemies){ if(!e.active) continue; ctx.strokeStyle='#25d0ff33'; ctx.fillStyle= e.type==='tank'? '#2a2c3a' : e.type==='striker'? '#18283d' : '#1a2a40'; ctx.beginPath(); ctx.arc(e.x,e.y,e.r,0,Math.PI*2); ctx.fill(); ctx.stroke();
  // Elite outline
  if(e.elite){ ctx.save(); ctx.strokeStyle = e.eliteColor || '#25d0ff'; ctx.globalAlpha=0.85; ctx.lineWidth = (e.eliteOutline||1.5); ctx.beginPath(); ctx.arc(e.x,e.y,e.r+3,0,Math.PI*2); ctx.stroke(); ctx.restore(); }
  if(e.tel>0){ ctx.save(); ctx.globalAlpha=Math.min(0.9,e.tel*2.5); ctx.strokeStyle='#ffb63b'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(e.x,e.y,e.r+4,0,Math.PI*2); ctx.stroke(); ctx.restore(); } } ctx.restore(); }

export function resetEnemies(){
  for(const e of enemies){ e.active=false; e.tel=0; }
}
