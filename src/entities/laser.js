// entities/laser.js - autonomous turret lasers to intercept enemy shots
import { ctx } from '../core/canvas.js';

const MAX = 384;
const pool = Array.from({length:MAX}, ()=>({active:false,x:0,y:0,vx:0,vy:0,ang:0,r:2,ttl:0.28,dmg:1}));

export function spawnLaser(x,y,ang,{speed=1400,dmg=1,ttl=0.28}={}){
  const l = pool.find(o=>!o.active); if(!l) return null;
  l.active=true; l.x=x; l.y=y; l.ang=ang; l.vx=Math.cos(ang)*speed; l.vy=Math.sin(ang)*speed; l.r=2; l.ttl=ttl; l.dmg=dmg; return l;
}

export function updateLasers(dt){
  for(const l of pool){ if(!l.active) continue; l.x += l.vx*dt; l.y += l.vy*dt; l.ttl -= dt; if(l.ttl<=0) l.active=false; }
}

export function drawLasers(){
  ctx.save();
  // bright thin beam segments with slight glow
  for(const l of pool){ if(!l.active) continue; const len = 16; const w = 2.2; ctx.translate(l.x, l.y); ctx.rotate(l.ang);
    ctx.shadowColor = '#8df1ff'; ctx.shadowBlur = 8; ctx.strokeStyle = '#b7f3ff'; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(len,0); ctx.stroke();
    ctx.shadowBlur = 0; ctx.rotate(-l.ang); ctx.translate(-l.x, -l.y);
  }
  ctx.restore();
}

export function forEachLaser(fn){ for(const l of pool){ if(l.active) fn(l); } }
export function deactivateLaser(l){ l.active=false; }
export function resetLasers(){ for(const l of pool){ l.active=false; } }

// Collisions: lasers vs enemy shots only
import { forEachEnemyShot, deactivateEnemyShot } from './enemyShot.js';
import { spawnShotSpark } from '../systems/effects.js';
import { beep, isMuted } from '../core/audio.js';

export function handleLaserEnemyShotCollisions(){
  forEachLaser(l=>{
    let hitCount = 0;
    forEachEnemyShot(s=>{
      if(!s.active) return;
      const dx = l.x - s.x, dy = l.y - s.y; const rr = (l.r + s.r);
      if(dx*dx + dy*dy <= rr*rr){
        deactivateEnemyShot(s); hitCount++;
        spawnShotSpark(s.x, s.y);
      }
    });
    if(hitCount>0){ if(!isMuted()) beep({freq:1100, freqEnd:900, type:'sine', duration:0.04, gain:0.02, attack:0.001, release:0.03}); }
  });
}
