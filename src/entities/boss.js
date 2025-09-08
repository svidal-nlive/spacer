// entities/boss.js — Boss System scaffolding (The Overseer)
import { game } from '../core/state.js';
import { spawnEnemyShot, spawnRadialShots } from './enemyShot.js';
import { spawnEnemyDeathFX } from '../systems/effects.js';
import { beep, isMuted } from '../core/audio.js';
import { spawnEnemyAt } from './enemy.js';

export const boss = {
  active: false,
  name: 'The Overseer',
  x: 0, y: -220,
  r: 36,
  hp: 0, maxHp: 0,
  phase: 1,
  t: 0,
  spiralT: 0,
  sweep: { state: 'idle', t: 0, ang: Math.PI/2, dir: 1, arc: Math.PI/3 },
  summonT: 3.0,
};

export function spawnBoss(){
  boss.active = true; boss.name = 'The Overseer'; boss.x = 0; boss.y = -220; boss.r = 36;
  const w = Math.max(1, game.wave||1);
  boss.maxHp = 60 + (w-1)*20;
  boss.hp = boss.maxHp;
  boss.phase = 1; boss.t = 0; boss.spiralT = 0; boss.sweep = { state:'idle', t:0, ang:Math.PI/2, dir:1, arc:Math.PI/3 }; boss.summonT = 2.5;
  if(!isMuted()) beep({freq:360, freqEnd:220, type:'sawtooth', duration:0.25, gain:0.045, attack:0.01, release:0.2});
}

export function bossActive(){ return boss.active; }

export function updateBoss(dt){ if(!boss.active) return; boss.t += dt;
  // phase transitions
  const hpPct = boss.hp / boss.maxHp;
  if(hpPct <= 0.6) boss.phase = 2;
  if(hpPct <= 0.3) boss.phase = 3;

  // simple hover motion
  boss.x = Math.sin(boss.t*0.6) * 120;
  boss.y = -200 + Math.cos(boss.t*0.5) * 20;

  // attacks
  // Spiral volleys: frequent, but in the top-down concept we swap to minion volleys
  boss.spiralT -= dt;
  const spiralCd = boss.phase>=3? 1.2 : boss.phase===2? 1.6 : 2.0;
  if(boss.spiralT<=0){
    // Spawn a ring of strikers near the barrier line that dash downward
    const count = boss.phase>=3? 8 : boss.phase===2? 6 : 5;
    const rad = 180; const off = boss.t*0.7;
    for(let i=0;i<count;i++){
      const a = off + (i/count)*Math.PI*2;
      const x = boss.x + Math.cos(a)*rad; const y = boss.y + Math.sin(a)*rad;
      spawnEnemyAt(x, y, 'striker');
    }
    boss.spiralT = spiralCd;
  }

  // Sweeping beam: telegraph then fire line shots while sweeping
  updateSweep(dt);

  // Summon adds periodically
  boss.summonT -= dt;
  const summonCd = boss.phase>=3? 6.0 : 7.5;
  if(boss.summonT<=0){
    summonAdds(); boss.summonT = summonCd;
  }
}

function updateSweep(dt){
  const sw = boss.sweep;
  if(sw.state==='idle'){
    // chance to start telegraph
    if(Math.random() < 0.012){ sw.state='tel'; sw.t=0; sw.dir = Math.random()<0.5? -1:1; sw.ang = Math.atan2(-boss.y, -boss.x) + (Math.random()*0.6-0.3); }
    return;
  }
  if(sw.state==='tel'){
    sw.t += dt;
    if(sw.t>=0.8){ sw.state='fire'; sw.t=0; }
    return;
  }
  if(sw.state==='fire'){
    sw.t += dt;
    const duration = 1.0;
    // sweep angle over time
    const prog = Math.min(1, sw.t/duration);
    const curAng = sw.ang + sw.dir * (boss.phase>=3? 0.9:0.7) * (prog*2-1);
    // emit a short "overpowered unit" volley: drop 2 grunts and 1 tank staggered along the sweep
    if(Math.random()<0.25){
      const ox = Math.cos(curAng) * 30; const oy = Math.sin(curAng) * 30;
      spawnEnemyAt(boss.x + ox, boss.y + oy, 'grunt');
      spawnEnemyAt(boss.x + ox*1.6, boss.y + oy*1.6, 'grunt');
      if(boss.phase>=2) spawnEnemyAt(boss.x + ox*2.2, boss.y + oy*2.2, 'tank');
    }
    if(sw.t>=duration){ sw.state='idle'; sw.t=0; }
  }
}

function summonAdds(){
  // spawn a small group near screen edges
  const types = ['grunt','striker','grunt'];
  const rad = 260; const angles = [Math.PI*0.85, Math.PI*1.15, Math.PI*0.5];
  for(let i=0;i<types.length;i++){
    const a = angles[i%angles.length];
    const x = Math.cos(a) * rad; const y = Math.sin(a) * rad;
    spawnEnemyAt(x, y, types[i]);
  }
}

export function drawBoss(ctx){ if(!boss.active) return;
  // body
  ctx.save();
  ctx.fillStyle = '#1d2235';
  ctx.strokeStyle = '#ff6b6b';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(boss.x, boss.y, boss.r, 0, Math.PI*2); ctx.fill(); ctx.stroke();
  // small eye
  ctx.fillStyle = '#ffb63b'; ctx.beginPath(); ctx.arc(boss.x + 10*Math.sin(boss.t*2), boss.y - 6, 4, 0, Math.PI*2); ctx.fill();
  // sweep telegraph
  const sw = boss.sweep; if(sw.state==='tel'){
    const k = Math.min(1, sw.t/0.8);
    ctx.globalAlpha = 0.3 * (0.5 + 0.5*Math.sin(boss.t*8));
    ctx.fillStyle = '#ff946b';
    const r = 320;
    ctx.beginPath();
    ctx.moveTo(boss.x, boss.y);
    ctx.arc(boss.x, boss.y, r, sw.ang - sw.arc/2, sw.ang + sw.arc/2);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

export function damageBoss(dmg){ if(!boss.active) return; boss.hp -= dmg; if(boss.hp<=0){ boss.hp=0; killBoss(); } }

function killBoss(){
  // end, reward, VFX
  spawnEnemyDeathFX(boss.x, boss.y, '#ff6b6b');
  boss.active=false;
  const mult = game.powerups.twoXT>0? 2:1;
  const reward = 15 + Math.floor((game.wave||1)*4);
  game.credits += reward*mult; game.earnedThisWave += reward*mult; game.score += 2000*mult;
  if(!isMuted()) beep({freq:520, freqEnd:260, type:'triangle', duration:0.22, gain:0.045, attack:0.004, release:0.12});
}
