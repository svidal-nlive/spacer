// scenes/wave.js - manage a wave, spawn and clear
import { canvas, ctx } from '../core/canvas.js';
import { game } from '../core/state.js';
import { input } from '../engine/input.js';
import { clamp } from '../core/rng.js';
import { spawnBullet, updateBullets, drawBullets } from '../entities/bullet.js';
import { spawnEnemy, spawnEnemyAt, updateEnemies, drawEnemies, forEachEnemy } from '../entities/enemy.js';
import { updateEnemyShots, drawEnemyShots, forEachEnemyShot, deactivateEnemyShot } from '../entities/enemyShot.js';
import { handleBulletEnemyCollisions } from '../systems/collisions.js';
import { handleBulletEnemyShotCollisions } from '../systems/bullet_vs_enemyShot.js';
import { updateLasers, drawLasers, handleLaserEnemyShotCollisions } from '../entities/laser.js';
import { updateLaserAI, resetLaserAI } from '../systems/laser_ai.js';
import { drawTopBar, drawHeatRing, drawBossBar } from '../ui/hud.js';
import { getUiGuttersPx } from '../core/uiBounds.js';
import { getPlayableScreenBounds } from '../core/uiBounds.js';
import { setScene } from '../engine/sceneManager.js';
import { shopScene } from './shop.js';
import { gameOverScene } from './gameover.js';
import { updateEffects, drawEffects, spawnPulsarFX, spawnEmpFX, spawnEnemyDeathFX, triggerLetterboxIn, triggerLetterboxOut, enableBossBarrier, disableBossBarrier, getBossBarrierWorldY, getBossBarrierScreenY } from '../systems/effects.js';
import { spawnBoss, updateBoss, drawBoss, bossActive, boss } from '../entities/boss.js';
import { beep, isMuted } from '../core/audio.js';
import { updatePickups, drawPickups, forEachPickup, deactivatePickup } from '../entities/pickup.js';

export const waveScene = {
  enemySpawnT: 0,
  enemyRadius: Math.min(window.innerWidth, window.innerHeight)/3, // deprecated: keep for compatibility
  fireCooldown: 0,
  spawned: 0,
  quota: 0,
  camZoom: 1,
  autoAbilityCd: 0,
  // wave flow state
  state: 'spawn', // 'spawn' -> 'clear' -> (boss waves) 'bossIntro' -> 'bossFight' -> 'bossOutro' -> 'end'
  stateT: 0,
  enter(){
    this.enemySpawnT = 0; this.fireCooldown = 0; this.spawned = 0; game.lastReward = 0; game.earnedThisWave = 0; game.lastRewardKills = 0; game.lastRewardClear = 0;
    // set a per-wave quota and alive cap
  const base = 10, perWave = 8;
    this.quota = base + (game.wave-1)*perWave;
  resetLaserAI();
  // initialize flow state
  this.state = 'spawn'; this.stateT = 0; game.arenaMode = 'ring';
  // Reset overlays and boss if this is not a boss wave
  if(!isBossWave()){
    disableBossBarrier(); triggerLetterboxOut(0.001); game.player.y = 0; game.player.targetY = 0;
    if(bossActive()) boss.active = false;
  }
  // Notify UI to show play overlay
  window.dispatchEvent(new CustomEvent('spacer:show-ui', { detail:{ type:'play' } }));
    this.autoAbilityCd = 0;
  // If boss wave, kick off cinematic immediately so it’s apparent
  if(isBossWave()){
    triggerLetterboxIn(0.8); enableBossBarrier(); game.arenaMode='topdown';
    // Pre-position player below barrier so camera shift is evident
    const yScreen = getBossBarrierScreenY();
    game.player.y = (yScreen - (canvas.height*0.5)) + 10; game.player.targetY = game.player.y;
    this.state = 'bossIntro'; this.stateT = 0;
  }
  },
  update(dt){
  this.stateT += dt;
  // gamepad ability triggers
  if(input.gpQTriggered) usePulsar();
  if(input.gpETriggered) useEmp();
    // tick ability cooldowns and handle ready flash
    const prevQ = game.abilQ_cd; const prevE = game.abilE_cd;
    game.abilQ_cd = Math.max(0, game.abilQ_cd - dt);
    game.abilE_cd = Math.max(0, game.abilE_cd - dt);
  // On ability ready, trigger a subtle, graceful flash (softer than damage/bomb)
  if(prevQ>0 && game.abilQ_cd===0){ game.readyFlashQ = 0.8; game.screenFlash = Math.max(game.screenFlash, 0.18); game.screenFlashColor = '#25d0ff'; }
  else game.readyFlashQ = Math.max(0, game.readyFlashQ - dt);
  if(prevE>0 && game.abilE_cd===0){ game.readyFlashE = 0.8; game.screenFlash = Math.max(game.screenFlash, 0.18); game.screenFlashColor = '#ffb63b'; }
  else game.readyFlashE = Math.max(0, game.readyFlashE - dt);
  game.screenFlash = Math.max(0, game.screenFlash - dt*0.9);
  // on-hit invulnerability decay
  if(game.invulnT>0) game.invulnT = Math.max(0, game.invulnT - dt);

    // heat
    if(game.overheated){
      game.heat = Math.max(0, game.heat - game.heatCool*dt);
      if(game.heat<=10) game.overheated=false;
    } else {
      if(input.firing){ game.heat += game.heatRate*dt; } else { game.heat -= game.heatCool*dt; }
      game.heat = clamp(game.heat, 0, game.heatMax);
      if(game.heat>=game.heatMax){ game.overheated=true; }
    }
    // firing
    this.fireCooldown = Math.max(0, this.fireCooldown - dt);
    // Auto-aim/auto-fire (DEV): target nearest enemy; manage heat; trigger abilities
    if(game.autoFire){
      // Aim at nearest enemy
      let nearest=null, best=1e9; forEachEnemy(e=>{ const d=Math.hypot(e.x,e.y); if(d<best){ best=d; nearest=e; } });
      if(nearest){ input.aimAngle = Math.atan2(nearest.y, nearest.x); }

      // Heat-aware firing: back off near cap, resume when cooled a bit
      const heatPct = game.heat / game.heatMax;
      // Range gate: only fire if nearest enemy is within autoRange
      const inRange = nearest ? (Math.hypot(nearest.x, nearest.y) <= game.autoRange) : false;
      if(heatPct > 0.92) input.firing = false; else if(nearest && inRange) input.firing = true; else input.firing = false;

      // Use abilities opportunistically to demonstrate gameplay
      this.autoAbilityCd = Math.max(0, this.autoAbilityCd - dt);
      if(this.autoAbilityCd===0){
        // Count local pressure
        let nearEnemies=0, tanks=0, forwardEnemies=0, nearShots=0, forwardShots=0; const ang = input.aimAngle; const cone = Math.PI/3; const radQ = 200; const radShot = 170;
        forEachEnemy(e=>{ const d=Math.hypot(e.x,e.y); if(d<radQ) { nearEnemies++; if(e.type==='tank') tanks++; }
          // directional cone in front of aim
          const a=Math.atan2(e.y,e.x); const da=Math.atan2(Math.sin(a-ang), Math.cos(a-ang)); if(Math.abs(da)<=cone/2 && d<=260) forwardEnemies++; });
        forEachEnemyShot(s=>{ const d=Math.hypot(s.x,s.y); if(d<radShot) nearShots++; const a=Math.atan2(s.y,s.x); const da=Math.atan2(Math.sin(a-ang), Math.cos(a-ang)); if(Math.abs(da)<=cone/2 && d<=240) forwardShots++; });
        // Pulsar when swarmed, many shots near, tank contact, or about to overheat
        if(game.abilQ_cd===0 && (nearEnemies>=3 || tanks>=1 || nearShots>=5 || heatPct>0.97)){
          usePulsar(); this.autoAbilityCd = 0.4;
        }
        // EMP when a cluster ahead or many shots in front
        else if(game.abilE_cd===0 && (forwardEnemies>=2 || forwardShots>=4)){
          useEmp(); this.autoAbilityCd = 0.35;
        }
      }
    }
    if(!game.overheated && input.firing && this.fireCooldown===0){
      const muzzle = 28; const mx = Math.cos(input.aimAngle)*muzzle; const my = Math.sin(input.aimAngle)*muzzle;
      const spreadN = (game.powerups.spreadT>0)? 3 : 1; const spreadAngle = 0.15;
      const rapidMul = (game.powerups.rapidT>0)? 1.8 : 1.0;
      for(let i=0;i<spreadN;i++){
        const a = input.aimAngle + (spreadN>1? (i-1)*spreadAngle : 0);
        spawnBullet(mx, my, a, {speed: game.bulletSpeed, dmg: game.dmg, ttl: 1.2});
      }
      this.fireCooldown = (1/game.rof) / rapidMul;
    }
    // count alive for flow
    let alive=0; forEachEnemy(e=>{ if(e.active) alive++; });
    // wave flow state machine
    if(this.state==='spawn'){
      // spawn using quota + alive cap with type mix
      const aliveCap = Math.min(6 + game.wave*2, 20);
      this.enemySpawnT -= dt;
      if(this.spawned < this.quota && this.enemySpawnT<=0 && alive<aliveCap){
        // choose type by wave: early mostly grunts; add strikers then tanks
        const wv = game.wave;
        const r = Math.random();
        let type = 'grunt';
        if(wv>=2 && r<0.3) type='striker';
        if(wv>=4 && r<0.15) type='tank';
        // spawn from a random screen edge
        const dpr = window.devicePixelRatio || 1; const wpx = canvas.width/dpr, hpx = canvas.height/dpr;
        // Avoid spawning into UI gutters by using playable bounds for edge selection
        const pb = getPlayableScreenBounds();
        const side = Math.floor(Math.random()*4); // 0=top,1=right,2=bottom,3=left
        let x=0,y=0; const pad=24;
        // Compute world spawn positions by mapping playable bounds extents back to world-centered coordinates
        const leftX = -wpx/2, rightX = wpx/2, topY = -hpx/2, botY = hpx/2;
        const playTopY = topY + pb.y; // screen px to world y
        const playBotY = topY + pb.y + pb.height;
        const playLeftX = leftX + pb.x; // pb.x currently 0, but keep for future left gutters
        const playRightX = leftX + pb.x + pb.width;
        if(side===0){ // top: along playable top edge
          const sx = (Math.random() * (playRightX - playLeftX - 2*pad)) + (playLeftX + pad);
          x = sx; y = topY - pad; // just beyond screen
        }
        if(side===1){ // right: along playable vertical span
          const sy = (Math.random() * (playBotY - playTopY - 2*pad)) + (playTopY + pad);
          x = rightX + pad; y = sy;
        }
        if(side===2){ // bottom: along playable bottom edge
          const sx = (Math.random() * (playRightX - playLeftX - 2*pad)) + (playLeftX + pad);
          x = sx; y = botY + pad;
        }
        if(side===3){ // left
          const sy = (Math.random() * (playBotY - playTopY - 2*pad)) + (playTopY + pad);
          x = leftX - pad; y = sy;
        }
        const e = spawnEnemyAt(x, y, type);
        if(e){ this.spawned += e.quota; }
        this.enemySpawnT = Math.max(0.2, 1.2 - game.wave*0.05);
      }
      // move to clear once quota met
      if(this.spawned>=this.quota){ this.state='clear'; this.stateT=0; }
    }
    else if(this.state==='clear'){
      // wait for board to clear, then branch: boss wave or end
      if(alive===0){
        if(isBossWave()){
          // cinematic intro and barrier
          triggerLetterboxIn(0.8); enableBossBarrier(); game.arenaMode='topdown'; this.state='bossIntro'; this.stateT=0;
        } else {
          this.state='end'; this.stateT=0; concludeWave(); return;
        }
      }
    }
    else if(this.state==='bossIntro'){
      // Let the cinematic breathe briefly, then spawn boss
      if(this.stateT>=1.0 && !bossActive()){
        spawnBoss();
      }
      if(bossActive()){
        this.state='bossFight'; this.stateT=0;
      }
    }
    else if(this.state==='bossFight'){
      // gate until boss dies
      if(!bossActive()){
        this.state='bossOutro'; this.stateT=0; triggerLetterboxOut(0.6); disableBossBarrier(); game.arenaMode='ring';
      }
    }
    else if(this.state==='bossOutro'){
      if(this.stateT>=0.65){ this.state='end'; this.stateT=0; concludeWave(); return; }
    }

  updateBullets(dt); updateEnemies(dt); updateEnemyShots(dt); handleBulletEnemyCollisions(); handleBulletEnemyShotCollisions();
  updateLaserAI(dt); updateLasers(dt); handleLaserEnemyShotCollisions();
  updateEffects(dt);
  updateBoss(dt);
  // pickups
  updatePickups(dt);
  // collect: player collects by proximity to turret center
  forEachPickup(p=>{
    const d = Math.hypot(p.x, p.y);
    if(d <= 30){ applyPickup(p.type); deactivatePickup(p); }
  });
  // tick power-up timers
  if(game.powerups.rapidT>0) game.powerups.rapidT = Math.max(0, game.powerups.rapidT - dt);
  if(game.powerups.spreadT>0) game.powerups.spreadT = Math.max(0, game.powerups.spreadT - dt);
  if(game.powerups.shieldT>0) game.powerups.shieldT = Math.max(0, game.powerups.shieldT - dt);
  if(game.powerups.slowT>0) game.powerups.slowT = Math.max(0, game.powerups.slowT - dt);
  if(game.powerups.twoXT>0) game.powerups.twoXT = Math.max(0, game.powerups.twoXT - dt);

  // end conditions
  if(game.lives<=0){ setScene(gameOverScene); return; }
    // Update player target render offset per arena mode
    if(game.arenaMode==='topdown'){
      // Place turret 10px below the barrier line (now aligned to top of playable area)
      const yScreen = getBossBarrierScreenY();
      const offsetFromCenter = yScreen - (canvas.height * 0.5);
      game.player.targetY = offsetFromCenter + 10;
    } else {
      // Return to center in ring mode
      game.player.targetY = 0;
    }
  },
  render(){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    // subtle camera zoom cadence based on heat and enemy pressure
    const dpr = window.devicePixelRatio || 1;
  const pb = getPlayableScreenBounds();
  const wCSS = canvas.width/dpr, hCSS = canvas.height/dpr;
    const pressure = Math.min(1, (game.heat/game.heatMax)*0.7 + 0.3);
    this.camZoom += (1 + 0.02*pressure - this.camZoom) * 0.08; // ease
  // center of playable area in CSS px
  const cx = (pb.x + pb.width/2) * dpr;
  const cy = (pb.y + pb.height/2) * dpr;
  ctx.save();
  // Use DPR-aware world transform for all world elements (fixes tiny/hidden turret on mobile)
  // Smoothly ease player render offset to target
  const ease = 0.12;
  game.player.y += (game.player.targetY - game.player.y) * ease;
  ctx.setTransform(dpr*this.camZoom,0,0,dpr*this.camZoom,cx,cy + game.player.y);
  // turret (higher contrast + outline)
  ctx.fillStyle = '#0e1b2b';
  ctx.beginPath(); ctx.arc(0,0, 22, 0, Math.PI*2); ctx.fill();
  ctx.lineWidth = 3; ctx.strokeStyle = '#25d0ffbb'; ctx.stroke();
  // invulnerability shimmer ring
  if(game.invulnT>0){ ctx.save(); const a = Math.min(1, game.invulnT/1.0); ctx.globalAlpha = 0.25 + 0.35*a; ctx.strokeStyle='#ffd3d3'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(0,0, 26, 0, Math.PI*2); ctx.stroke(); ctx.restore(); }
  // barrel
  ctx.save(); ctx.rotate(input.aimAngle); ctx.fillStyle = game.overheated? '#ff4d6d':'#25d0ff'; ctx.fillRect(0,-4,32,8); ctx.restore();
  // world entities
  drawBullets(ctx);
  // In boss cinematic phases, avoid drawing regular enemies during intro for clarity
  if(this.state!=='bossIntro') drawEnemies(ctx);
  drawPickups();
  drawBoss(ctx);
  // AUTO grid visualization (faint) in world space
  if(game.autoFire && game.showAutoGrid){
    ctx.save();
    ctx.globalAlpha = 0.14; ctx.strokeStyle = '#25d0ff'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(0,0, game.autoRange, 0, Math.PI*2); ctx.stroke();
    // faded dotted spokes
    ctx.globalAlpha = 0.08; ctx.lineWidth = 1;
    for(let i=0;i<8;i++){ const a = i*(Math.PI/4); const r=game.autoRange; ctx.beginPath(); ctx.moveTo(Math.cos(a)* (r-10), Math.sin(a)*(r-10)); ctx.lineTo(Math.cos(a)* r, Math.sin(a)* r); ctx.stroke(); }
    ctx.restore();
  }
  // VFX + enemy shots
  drawEffects(); drawEnemyShots(); drawLasers();
  ctx.restore();
  // Heat ring at the playable center respecting render offset
  drawHeatRing((pb.x + pb.width/2) * dpr, (pb.y + pb.height/2) * dpr + game.player.y, 30, game.heat/game.heatMax);
  // top bar with ability chips
  // compute a fade alpha for 2x badge: ease in first 0.5s, ease out last 0.5s
  let twoXAlpha = 0;
  if(game.powerups.twoXT>0){ const t = game.powerups.twoXT; const max = 15; const head = 0.5, tail = 0.5; const inA = Math.min(1, (max - t)/head); const outA = Math.min(1, t/tail); twoXAlpha = Math.min(inA, outA); }
  drawTopBar({score: game.score, wave: `${game.wave}  ❤${game.lives}  ⓒ${game.credits} (+${game.earnedThisWave})`, heat: game.heat, heatMax: game.heatMax, muted: false, twoXActive: game.powerups.twoXT>0, twoXAlpha});
  drawAbilityUI();
  if(bossActive()) drawBossBar(boss.name, boss.hp, boss.maxHp);
  drawScreenEdgeFlash();
  }
};

function isBossWave(){ return (game.wave % 5) === 0; }

function concludeWave(){
  const base = 10 + Math.floor(game.wave*3);
  // credit breakdown
  game.lastRewardKills = game.earnedThisWave;
  game.lastRewardClear = base;
  // grant the base clear bonus now
  game.credits += base;
  game.lastReward = game.lastRewardKills + game.lastRewardClear;
  game.wave++;
  // go to shop
  setScene(shopScene);
}

// ability triggers (keyboard/gamepad)
window.addEventListener('keydown', (e)=>{
  if(e.repeat) return;
  if(getSceneRef()!==waveScene) return;
  const k = e.key.toLowerCase();
  if(k==='q') usePulsar();
  if(k==='e') useEmp();
});

import { getScene as getSceneRef } from '../engine/sceneManager.js';
import { getPlayerWorldPos } from '../core/state.js';
function usePulsar(){ if(game.abilQ_cd>0) return; // radial shockwave: damage or pushback
  // tuned: larger radius, a bit more push
  const radius = 200;
  const damage = Math.max(1, Math.ceil(game.dmg));
  const mult = game.powerups.twoXT>0? 2:1;
  const p = getPlayerWorldPos();
  forEachEnemy(e=>{ if(!e.active) return; const d = Math.hypot(e.x-p.x,e.y-p.y); if(d<radius){ e.hp -= damage; if(e.hp<=0){ e.active=false; game.score+=100*mult; game.credits+=1*mult; game.earnedThisWave+=1*mult; } else { const nx=(e.x-p.x)/d, ny=(e.y-p.y)/d; e.x += nx*42; e.y += ny*42; } } });
  // clear enemy shots in radius
  forEachEnemyShot(s=>{ const d = Math.hypot(s.x-p.x, s.y-p.y); if(d<radius) deactivateEnemyShot(s); });
  spawnPulsarFX();
  if(!isMuted()) beep({freq:540, freqEnd:400, type:'triangle', duration:0.09, gain:0.035, attack:0.004, release:0.05});
  game.abilQ_cd = game.abilQ_max;
}
function useEmp(){ if(game.abilE_cd>0) return; // forward cone stun/damage
  const p = getPlayerWorldPos();
  const ang = input.aimAngle; const arc = Math.PI/2.6; const range = 260; // slightly wider and longer
  const damage = Math.max(1, Math.ceil(game.dmg));
  const mult = game.powerups.twoXT>0? 2:1;
  forEachEnemy(e=>{ if(!e.active) return; const a = Math.atan2(e.y-p.y, e.x-p.x); let da = Math.atan2(Math.sin(a-ang), Math.cos(a-ang)); if(Math.abs(da)<=arc/2){ const d=Math.hypot(e.x-p.x,e.y-p.y); if(d<=range){ e.hp -= damage; if(e.hp<=0){ e.active=false; game.score+=100*mult; game.credits+=1*mult; game.earnedThisWave+=1*mult; } else { const nx=(e.x-p.x)/d, ny=(e.y-p.y)/d; e.x += nx*26; e.y += ny*26; } } }});
  // clear enemy shots in cone
  forEachEnemyShot(s=>{ const a = Math.atan2(s.y-p.y, s.x-p.x); let da = Math.atan2(Math.sin(a-ang), Math.cos(a-ang)); const d=Math.hypot(s.x-p.x,s.y-p.y); if(Math.abs(da)<=arc/2 && d<=range){ deactivateEnemyShot(s); } });
  spawnEmpFX(ang);
  if(!isMuted()) beep({freq:820, freqEnd:720, type:'sawtooth', duration:0.07, gain:0.03, attack:0.002, release:0.04});
  game.abilE_cd = game.abilE_max;
}

// HUD: draw small cooldown chips on the top bar
function drawAbilityChips(){
  const dpr = window.devicePixelRatio || 1; const barH = 32; const pad = 8;
  const wCSS = canvas.width/dpr; const y = barH - 8; const size = 14; const gap = 6; let x = wCSS - 12 - size*2 - gap;
  const items = [
    { label:'Q', cd: game.abilQ_cd, max: game.abilQ_max },
    { label:'E', cd: game.abilE_cd, max: game.abilE_max },
  ];
  ctx.save(); ctx.resetTransform(); ctx.scale(dpr,dpr); ctx.font='10px system-ui,sans-serif';
  for(const it of items){
    const pct = it.cd>0? (it.cd/it.max) : 0;
    ctx.fillStyle = '#0f1621'; ctx.fillRect(x, y-size, size, size);
    ctx.strokeStyle = '#1e2f45'; ctx.strokeRect(x+0.5, y-size+0.5, size-1, size-1);
    if(pct>0){ ctx.fillStyle = '#132033'; ctx.fillRect(x, y-size, size, size*pct); }
  // ready flash overlay
  const flash = it.label==='Q' ? game.readyFlashQ : game.readyFlashE;
  if(flash>0 && pct===0){ ctx.globalAlpha = Math.min(1, flash/0.2); ctx.fillStyle='#25d0ff55'; ctx.fillRect(x, y-size, size, size); ctx.globalAlpha=1; }
    ctx.fillStyle = it.cd>0? '#7e9cb0' : '#b7f3ff';
    ctx.fillText(it.label, x+4, y-3);
    x += size + gap;
  }
  ctx.restore();
}

// Draw near-turret radial cooldown arcs and on-screen button tips
function drawAbilityTurretIndicators(){
  const dpr = window.devicePixelRatio || 1; const pb = getPlayableScreenBounds();
  const cx = (pb.x + pb.width/2) * dpr, cy = (pb.y + pb.height/2) * dpr; const r = 40;
  ctx.save();
  // Q arc (left)
  const qPct = game.abilQ_cd>0 ? 1 - (game.abilQ_cd/game.abilQ_max) : 1;
  drawCooldownArc(cx-24, cy+36, r*0.6, qPct, '#25d0ff');
  // E arc (right)
  const ePct = game.abilE_cd>0 ? 1 - (game.abilE_cd/game.abilE_max) : 1;
  drawCooldownArc(cx+24, cy+36, r*0.6, ePct, '#ffb63b');
  ctx.restore();
}

function drawCooldownArc(x, y, radius, pct, color){
  const dpr = window.devicePixelRatio || 1;
  ctx.save(); ctx.resetTransform(); ctx.scale(dpr,dpr);
  ctx.strokeStyle = '#1e2f45'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x/dpr,y/dpr,radius/dpr,0,Math.PI*2); ctx.stroke();
  ctx.strokeStyle = color; ctx.beginPath(); ctx.arc(x/dpr,y/dpr,radius/dpr, -Math.PI/2, -Math.PI/2 + Math.PI*2*pct); ctx.stroke();
  // ready flash ring pulse when just ready
  const flash = (color==='#25d0ff')? game.readyFlashQ : game.readyFlashE;
  if(flash>0 && pct>=1){ ctx.globalAlpha = Math.min(0.8, flash); ctx.strokeStyle = color; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(x/dpr,y/dpr,(radius+3)/dpr, 0, Math.PI*2); ctx.stroke(); ctx.globalAlpha = 1; }
  ctx.restore();
}

// Unified ability UI renderer: corner bars or ring style
function drawAbilityUI(){
  if(game.abilityUiMode==='ring'){
    drawAbilityRings();
  } else {
    drawAbilityBars();
  }
  drawPowerupBadges();
}

function drawAbilityBars(){
  const dpr = window.devicePixelRatio || 1; ctx.save(); ctx.resetTransform(); ctx.scale(dpr,dpr);
  const PAD = 12; const GAPB = 6;
  // compute a responsive bar width
  const wCSS = canvas.width/dpr; const gutters = getUiGuttersPx();
  const maxBarW = 140; const minBarW = 100;
  const barW = Math.max(minBarW, Math.min(maxBarW, Math.floor(wCSS * 0.35)));
  const barH = 6;
  // Anchor inside the bottom gutter by default (keeps UI off the playfield)
  const yStart = (canvas.height/dpr) - (gutters.bottom || 0);
  const topStart = gutters.top || 0;
  // Corner selection chooses left/right and top/bottom gutter
  const corner = 'top-right'; // force right side placement for clarity
  let x = (wCSS - PAD - barW);
  let yBase = corner.includes('top') ? (topStart + PAD) : (yStart + PAD);
  // Q on top, E below
  drawCooldownBar(x, yBase, barW, barH, 1 - (game.abilQ_cd>0? game.abilQ_cd/game.abilQ_max : 0), '#25d0ff', game.readyFlashQ);
  drawCooldownBar(x, yBase + barH + GAPB, barW, barH, 1 - (game.abilE_cd>0? game.abilE_cd/game.abilE_max : 0), '#ffb63b', game.readyFlashE);
  ctx.restore();
}

function drawCooldownBar(x,y,w,h,pct,color,flash){
  // bg
  ctx.fillStyle = '#0f1621'; ctx.fillRect(x,y,w,h);
  ctx.strokeStyle = '#1e2f45'; ctx.strokeRect(x+0.5,y+0.5,w-1,h-1);
  // fill
  ctx.fillStyle = color; ctx.fillRect(x,y,Math.max(0,Math.min(1,pct))*w,h);
  if(flash>0 && pct>=1){ ctx.globalAlpha = Math.min(0.7, flash); ctx.fillStyle=color; ctx.fillRect(x-2,y-2,w+4,h+4); ctx.globalAlpha=1; }
}

function drawAbilityRings(){
  const dpr = window.devicePixelRatio || 1; const pb = getPlayableScreenBounds();
  const cx = (pb.x + pb.width/2) * dpr, cy = (pb.y + pb.height/2) * dpr + game.player.y; ctx.save(); ctx.setTransform(dpr,0,0,dpr,0,0);
  // draw two thin rings around the heat ring radius
  const baseR = 38; const r1 = baseR + 10, r2 = baseR + 16;
  const pQ = 1 - (game.abilQ_cd>0? game.abilQ_cd/game.abilQ_max : 0);
  const pE = 1 - (game.abilE_cd>0? game.abilE_cd/game.abilE_max : 0);
  ringProgress(cx/dpr, cy/dpr, r1, pQ, '#25d0ff', game.readyFlashQ);
  ringProgress(cx/dpr, cy/dpr, r2, pE, '#ffb63b', game.readyFlashE);
  ctx.restore();
}

function ringProgress(cx, cy, r, pct, color, flash){
  ctx.save();
  ctx.strokeStyle='#1e2f45'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.stroke();
  ctx.strokeStyle=color; ctx.lineWidth=3; ctx.beginPath(); ctx.arc(cx,cy,r,-Math.PI/2, -Math.PI/2 + Math.PI*2*Math.max(0,Math.min(1,pct))); ctx.stroke();
  if(flash>0 && pct>=1){ ctx.globalAlpha=Math.min(0.8,flash); ctx.lineWidth=5; ctx.beginPath(); ctx.arc(cx,cy,r+3,0,Math.PI*2); ctx.stroke(); ctx.globalAlpha=1; }
  ctx.restore();
}

function drawPowerupBadges(){
  // show small badges for active powerups with a tiny timer bar
  const dpr = window.devicePixelRatio || 1; ctx.save(); ctx.resetTransform(); ctx.scale(dpr,dpr);
  const PAD = 12, GAP = 8; const size = 14; const bw = 64; const barH = 6;
  const gutters = getUiGuttersPx();
  const wCSS = canvas.width/dpr;
  // container width from left edge of glyph circle to end of timer bar
  const containerW = size + 10 + bw; // circle diameter + gap + bar width
  const listRows = 5; const rowH = 16; const listH = listRows * rowH;
  let x, y;
  const corner = 'top-right'; const right = true; const top = true;
  const yStart = (canvas.height/dpr) - (gutters.bottom || 0);
  const topStart = gutters.top || 0;
  // Anchor to the same gutter as ability bars, on the opposite horizontal edge for balance
  y = (top ? topStart : yStart) + PAD + size/2;
  // place badges on the opposite side from ability bars to avoid overlap
  x = right ? (PAD + size/2) : (wCSS - PAD - containerW + size/2);
  const items = [
    {key:'rapidT', ch:'R', col:'#25d0ff', max:15, stackKey:'rapid'},
    {key:'spreadT', ch:'S', col:'#7dd3fc', max:15, stackKey:'spread'},
    {key:'shieldT', ch:'H', col:'#90f5a8', max:15, stackKey:'shield'},
    {key:'slowT', ch:'⟲', col:'#c6b6ff', max:12, stackKey:'slow'},
    {key:'twoXT', ch:'2x', col:'#ffd166', max:15, stackKey:'twox'},
  ];
  let i=0;
  ctx.font='10px system-ui,sans-serif'; ctx.textBaseline='middle'; ctx.textAlign='left';
  for(const it of items){ const t = game.powerups[it.key]||0; const yy = y + i*16; const pct = t>0? Math.max(0, Math.min(1, t/it.max)) : 0;
  // glyph circle with optional pulse glow
  const pulse = game.stackPulse[it.stackKey]||0; if(pulse>0) game.stackPulse[it.stackKey] = Math.max(0, pulse - 0.016);
  if(pulse>0){ ctx.save(); ctx.globalAlpha=Math.min(0.9,pulse); ctx.shadowColor=it.col; ctx.shadowBlur=12; ctx.fillStyle=`${it.col}22`; ctx.beginPath(); ctx.arc(x, yy, size/2+3, 0, Math.PI*2); ctx.fill(); ctx.restore(); }
  ctx.fillStyle='rgba(15,22,33,0.9)'; ctx.strokeStyle='#1e2f45'; ctx.beginPath(); ctx.arc(x, yy, size/2, 0, Math.PI*2); ctx.fill(); ctx.stroke();
    ctx.fillStyle=it.col; ctx.fillText(it.ch, x-4, yy+1);
    // timer bar
    const bx=x+10, by=yy-4, bw=64, bh=6; ctx.fillStyle='#0f1621'; ctx.fillRect(bx,by,bw,bh); ctx.strokeStyle='#1e2f45'; ctx.strokeRect(bx+0.5,by+0.5,bw-1,bh-1);
    if(t>0){ ctx.fillStyle=it.col; ctx.fillRect(bx,by,bw*pct,bh); }
    // draw N/3 stack ticks along top border of the timer bar
    const stacks = game.pickupStacks[it.stackKey]||0;
    const tickGap = bw/3;
    ctx.strokeStyle = it.col; ctx.globalAlpha = 0.8;
    for(let s=0;s<stacks;s++){
      const tx = bx + (s+1)*tickGap - 1;
      ctx.beginPath(); ctx.moveTo(tx, by-2); ctx.lineTo(tx, by+bh+2); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    i++;
  }
  ctx.restore();
}

// Apply pickup stacks: collect 3 to activate effect; stacks persist across waves
function applyPickup(type){
  addPickupStack(type, ()=>{
    switch(type){
      case 'rapid': game.powerups.rapidT = Math.min(15, (game.powerups.rapidT||0)+7); break;
      case 'spread': game.powerups.spreadT = Math.min(15, (game.powerups.spreadT||0)+7); break;
      case 'shield': game.powerups.shieldT = Math.min(15, (game.powerups.shieldT||0)+10); break;
      case 'slow': game.powerups.slowT = Math.min(12, (game.powerups.slowT||0)+6); break;
      case 'twox': game.powerups.twoXT = Math.min(15, (game.powerups.twoXT||0)+8); break;
      case 'bomb': triggerBomb(); break;
    }
  });
}

const STACK_CAPS = { rapid: 2, spread: 2, shield: 3, slow: 2, twox: 4, bomb: 1 };
function addPickupStack(type, onActivate){
  const k = type; // keys: rapid, spread, shield, slow, twox, bomb
  const cap = STACK_CAPS[k] ?? 3;
  const cur = game.pickupStacks[k]||0;
  let s = cur + 1;
  let activated = false;
  while(s>=cap){ onActivate(); s -= cap; activated = true; }
  game.pickupStacks[k] = s;
  if(activated){
    game.stackPulse[k] = 0.6;
    if(!isMuted()) beep({freq:660, freqEnd:560, type:'sine', duration:0.08, gain:0.03, attack:0.002, release:0.05});
  }
}

function triggerBomb(){
  // damage all enemies on screen heavily
  const mult = game.powerups.twoXT>0? 2:1;
  forEachEnemy(e=>{ if(!e.active) return; e.hp -= Math.max(2, Math.ceil(game.dmg*2)); if(e.hp<=0){ e.active=false; game.score+=100*mult; game.credits += 1*mult; game.earnedThisWave += 1*mult; } });
  // clear all shots on bomb
  forEachEnemyShot(s=> deactivateEnemyShot(s));
  if(!isMuted()) beep({freq:180, freqEnd:120, type:'sine', duration:0.18, gain:0.045, attack:0.004, release:0.12});
  spawnPulsarFX(); game.screenFlash = 0.6; game.screenFlashColor = '#ff6b6b';
}

// labels intentionally removed for clarity

// Screen-edge flash vignette
function drawScreenEdgeFlash(){
  if(game.screenFlash<=0) return;
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.width/dpr, h = canvas.height/dpr;
  const isDamage = game.screenFlashColor === '#ff6b6b'; // strong red flash for damage/bomb
  // Softer cap and thinner band for ability-ready flashes; stronger for damage
  const cap = isDamage ? 0.45 : 0.18;
  const a = Math.min(cap, game.screenFlash);
  if(a <= 0.001) return;
  ctx.save(); ctx.resetTransform(); ctx.scale(dpr,dpr);
  // thickness scales gently; abilities use a thinner band
  const baseThick = isDamage ? 24 : 12;
  const thick = baseThick;
  // four sides with linear gradients
  const sides = [
    {x:0,y:0,w, h:thick, dir:'down'},       // top
    {x:0,y:h-thick,w, h:thick, dir:'up'},   // bottom
    {x:0,y:0,w:thick,h, dir:'right'},       // left
    {x:w-thick,y:0,w:thick,h, dir:'left'},  // right
  ];
  // Use lighter blend for ability flashes to feel graceful; normal for damage
  const prevComp = ctx.globalCompositeOperation;
  if(!isDamage) ctx.globalCompositeOperation = 'screen';
  for(const s of sides){
    let g;
    if(s.dir==='down'){ g = ctx.createLinearGradient(0,0,0,s.h); g.addColorStop(0, `${game.screenFlashColor}${alphaHex(a)}`); g.addColorStop(1, `${game.screenFlashColor}00`); }
    if(s.dir==='up'){ g = ctx.createLinearGradient(0,0,0,s.h); g.addColorStop(0, `${game.screenFlashColor}00`); g.addColorStop(1, `${game.screenFlashColor}${alphaHex(a)}`); }
    if(s.dir==='right'){ g = ctx.createLinearGradient(0,0,s.w,0); g.addColorStop(0, `${game.screenFlashColor}${alphaHex(a)}`); g.addColorStop(1, `${game.screenFlashColor}00`); }
    if(s.dir==='left'){ g = ctx.createLinearGradient(0,0,s.w,0); g.addColorStop(0, `${game.screenFlashColor}00`); g.addColorStop(1, `${game.screenFlashColor}${alphaHex(a)}`); }
    ctx.fillStyle = g; ctx.fillRect(s.x, s.y, s.w, s.h);
  }
  // Add a faint center bloom for ability flashes for a smoother feel
  if(!isDamage){
    const cx = w/2, cy = h/2;
    const rMax = Math.min(w,h) * 0.45;
    const rg = ctx.createRadialGradient(cx, cy, rMax*0.1, cx, cy, rMax);
    const softA = Math.min(0.08, a * 0.5);
    rg.addColorStop(0, `${game.screenFlashColor}${alphaHex(softA)}`);
    rg.addColorStop(1, `${game.screenFlashColor}00`);
    ctx.fillStyle = rg; ctx.beginPath(); ctx.rect(0,0,w,h); ctx.fill();
  }
  ctx.globalCompositeOperation = prevComp;
  ctx.restore();
}

function alphaHex(a){ // a in [0,1]
  const v = Math.round(Math.min(1, Math.max(0,a)) * 255).toString(16).padStart(2,'0');
  return v;
}

// Lazy getter to avoid import cycles in some bundlers (should be fine in Vite)
// no-op helper removed; direct import used
