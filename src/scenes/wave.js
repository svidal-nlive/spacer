// scenes/wave.js - manage a wave, spawn and clear
import { canvas, ctx } from '../core/canvas.js';
import { game } from '../core/state.js';
import { input, keysHeld } from '../engine/input.js';
import { getArena, setArena } from '../engine/arena.js';
import { activeScheme, setInputScheme } from '../engine/inputScheme.js';
import { clamp } from '../core/rng.js';
import { spawnBullet, updateBullets, drawBullets } from '../entities/bullet.js';
import { spawnEnemy, spawnEnemyAt, updateEnemies, drawEnemies, forEachEnemy } from '../entities/enemy.js';
import { updateEnemyShots, drawEnemyShots, forEachEnemyShot, deactivateEnemyShot } from '../entities/enemyShot.js';
import { handleBulletEnemyCollisions } from '../systems/collisions.js';
import { handleBulletEnemyShotCollisions } from '../systems/bullet_vs_enemyShot.js';
import { updateLasers, drawLasers, handleLaserEnemyShotCollisions } from '../entities/laser.js';
import { updateLaserAI, resetLaserAI } from '../systems/laser_ai.js';
import { drawTopBar, drawHeatRing, drawBossBar } from '../ui/hud.js';
import { getUiGuttersPx, getViewportRectCSS, getTitleSafeRectCSS, getActionSafeRectCSS } from '../core/uiBounds.js';
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
  state: 'spawn', // 'spawn' -> 'clear' -> (boss waves) 'stage' -> 'bossIntro' -> 'bossFight' -> 'bossOutro' -> 'end'
  stateT: 0,
  // simple vertical stage timeline (wave 5 stub)
  stageBeat: 0,
  // cinematic zoom
  zoomTween: { t:0, dur:0, from:1, to:1 },
  // stage intro input gate (disable controls, show "GO")
  _gateActive: false,
  _gateT: 0,
  _gateDur: 0,
  // cinematic intro: light chassis reveal during letterbox-in
  _introChassisT: 0,
  _introClampDid: false,
  // simple muzzle flash for vertical shots
  _muzzleT: 0,
  _muzzleX: 0,
  _muzzleY: 0,
  _muzzleA: 0,
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
  // If boss wave, start with a short vertical stage section before the boss
  if(isBossWave()){
  triggerLetterboxIn(0.8); enableBossBarrier(); setArena('vertical'); setInputScheme('verticalFixed');
  // intro zoom-out tween (target ~0.8 per spec)
  this.zoomTween = { t:0, dur: 1.2, from: 1.0, to: 0.8 };
  // reset intro reveal timers
  this._introChassisT = 0; this._introClampDid = false;
  // Pre-position player below barrier so camera shift is evident (consider letterbox offset)
  const dpr = window.devicePixelRatio || 1;
  const yScreen = getBossBarrierScreenY(); // CSS px
  // Convert to device px to match world render offset scale
  game.player.y = (yScreen*dpr - (canvas.height*0.5)) + 20; game.player.targetY = game.player.y;
  // Start player at bottom of playable area with some margin
  const pb = getPlayableScreenBounds();
  const startX = 0; // centered horizontally
  const startYcss = pb.y + pb.height - 60; // 60px above bottom of playable
  game.playerPos.x = 0;
  game.playerPos.y = (startYcss - (pb.y + pb.height/2)) * dpr;
  // run a short stage before boss; gate inputs briefly and show GO sweep
  this.state = 'stage'; this.stateT = 0; this.stageBeat = 0;
  this._gateDur = (game.devSkipIntro? 0.25 : 2.6); this._gateT = 0; this._gateActive = true;
  }
  },
  update(dt){
  this.stateT += dt;
  // tick gate
  if(this._gateActive){ this._gateT += dt; if(this._gateT >= this._gateDur){ this._gateActive = false; } }
  // tick arena mode (scroll, etc.)
  try{ getArena().update?.(dt); }catch{}
  // zoom tween update
  if(this.zoomTween.dur>0 && this.zoomTween.t < this.zoomTween.dur){ this.zoomTween.t = Math.min(this.zoomTween.dur, this.zoomTween.t + dt); }
  // letterbox intro chassis reveal timer
  if(this.state==='stage' && game.arenaMode==='vertical' && this._gateActive){ this._introChassisT += dt; }
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

  // topdown/vertical free movement: WASD/Arrows
    if(game.arenaMode==='topdown' || game.arenaMode==='vertical'){
      const speed = (game.arenaMode==='vertical')? 280 : 240; // px/s
      // keyboard state
      let { vx, vy } = (game.arenaMode==='vertical') ? activeScheme.getDesiredVelocity() : (function(){
        const left = keysHeld['a']||keysHeld['arrowleft'];
        const right = keysHeld['d']||keysHeld['arrowright'];
        const up = keysHeld['w']||keysHeld['arrowup'];
        const down = keysHeld['s']||keysHeld['arrowdown'];
        let vx = (right?1:0) - (left?1:0);
        let vy = (down?1:0) - (up?1:0);
        const len = Math.hypot(vx,vy)||1; return { vx: vx/len, vy: vy/len };
      })();
      // input gating during cinematic: suppress movement
      if(this._gateActive){ vx = 0; vy = 0; }
      if(game.arenaMode==='vertical'){
        // accel/drag
        const ax = vx*speed*2.4, ay = vy*speed*2.4;
        // add optional pointer-drag nudge
        if(activeScheme._nudge && (performance.now() - activeScheme._nudge.t) < 80){
          const k = 10; game.playerVel.x += (activeScheme._nudge.dx||0)*k*dt; game.playerVel.y += (activeScheme._nudge.dy||0)*k*dt;
        }
        game.playerVel.x += ax*dt; game.playerVel.y += ay*dt;
        // drag
        const drag = 4.5; game.playerVel.x -= game.playerVel.x*drag*dt; game.playerVel.y -= game.playerVel.y*drag*dt;
        // integrate
        game.playerPos.x += game.playerVel.x*dt; game.playerPos.y += game.playerVel.y*dt;
      } else {
        game.playerPos.x += vx*speed*dt; game.playerPos.y += vy*speed*dt;
      }
      // clamp within playable bounds below barrier
      const dpr = window.devicePixelRatio || 1; const pb = getPlayableScreenBounds();
      const halfW = (canvas.width/dpr)/2, halfH=(canvas.height/dpr)/2;
      // Convert world pos (device px) to screen CSS for clamping
      const sx = (game.playerPos.x / dpr) + (pb.x + pb.width/2);
      const syBase = (game.playerPos.y / dpr) + (pb.y + pb.height/2);
      // barrier screen Y (CSS)
      const yBarCSS = getBossBarrierScreenY();
      // compute minY as a bit below barrier; maxY at bottom of playable
      const minYCSS = Math.max(pb.y + 30, yBarCSS + 30);
      const maxYCSS = pb.y + pb.height - 30;
      const minXCSS = pb.x + 30; const maxXCSS = pb.x + pb.width - 30;
      const clampedSX = Math.min(maxXCSS, Math.max(minXCSS, sx));
      const clampedSY = Math.min(maxYCSS, Math.max(minYCSS, syBase));
      // convert back to world
      game.playerPos.x = (clampedSX - (pb.x + pb.width/2)) * dpr;
      game.playerPos.y = (clampedSY - (pb.y + pb.height/2)) * dpr;
      // if clamped, zero velocity component against the wall in vertical mode
      if(game.arenaMode==='vertical'){
        if(sx!==clampedSX) game.playerVel.x = 0;
        if(syBase!==clampedSY) game.playerVel.y = 0;
      }
    }
    // heat (stage-local tweak: in vertical mode, expand cap cooling feel)
    const verticalHeatBoost = (game.arenaMode==='vertical');
    if(game.overheated){
      game.heat = Math.max(0, game.heat - game.heatCool*dt);
      if(game.heat<=10) game.overheated=false;
    } else {
      const heatRate = verticalHeatBoost ? game.heatRate*0.7 : game.heatRate;
      const heatCool = verticalHeatBoost ? game.heatCool*1.35 : game.heatCool;
      if(input.firing){ game.heat += heatRate*dt; } else { game.heat -= heatCool*dt; }
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
    // suppress firing while gated
    const canFire = !this._gateActive;
    if(!game.overheated && input.firing && this.fireCooldown===0 && canFire){
      const muzzle = 28;
  const isTD = (game.arenaMode==='topdown' || game.arenaMode==='vertical');
  const ox = isTD ? game.playerPos.x : 0;
  const oy = isTD ? game.playerPos.y : 0;
      const aimAngle = (game.arenaMode==='vertical') ? activeScheme.getAimAngle() : input.aimAngle;
      const mx = ox + Math.cos(aimAngle)*muzzle; const my = oy + Math.sin(aimAngle)*muzzle;
      const spreadN = (game.powerups.spreadT>0)? 3 : 1; const spreadAngle = 0.15;
      const rapidMul = (game.powerups.rapidT>0)? 1.8 : 1.0;
      for(let i=0;i<spreadN;i++){
        const a = aimAngle + (spreadN>1? (i-1)*spreadAngle : 0);
  spawnBullet(mx, my, a, {speed: game.bulletSpeed, dmg: game.dmg, ttl: 1.2});
      }
      // nozzle flash in vertical mode (cone/flare)
      if(game.arenaMode==='vertical'){
        this._muzzleX = mx; this._muzzleY = my; this._muzzleA = aimAngle; this._muzzleT = 0.12;
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
          // start vertical stage section
          triggerLetterboxIn(0.8); enableBossBarrier(); setArena('vertical'); setInputScheme('verticalFixed'); this.state='stage'; this.stateT=0; this.stageBeat=0;
        } else {
          this.state='end'; this.stateT=0; concludeWave(); return;
        }
      }
    }
    else if(this.state==='stage'){
      // Three simple formation beats, then bossIntro
      const fast = !!game.devPatternsFast;
      const times = fast? [0.1,0.3,0.5,0.7,0.9,1.1,1.3,1.5] : [0.4,4.0,8.0,10.8,13.6,18.0,21.0,24.0];
      const pat = (game.devPattern||'').toLowerCase();
      const wants = (key)=> !pat || pat===key;
      // Beat 0: lane grunts
      if(this.stageBeat===0 && this.stateT>=times[0]){ if(wants('lanes')) spawnLaneGrunts(); this.stageBeat=1; this.stateT=0; }
      // Beat 1: wedge strikers
      if(this.stageBeat===1 && this.stateT>=times[1]){ if(wants('wedge')) spawnWedgeStrikers(); this.stageBeat=2; this.stateT=0; }
      // Beat 2: turrets (tanks) drop-in
      if(this.stageBeat===2 && this.stateT>=times[2]){ if(wants('tanks')) spawnTurretPods(); this.stageBeat=3; this.stateT=0; }
      // Beat 3: zig-zag strafers
      if(this.stageBeat===3 && this.stateT>=times[3]){ if(wants('zig')) spawnZigZagStrafers(); this.stageBeat=4; this.stateT=0; }
      // Beat 4: spiral swirl drop
      if(this.stageBeat===4 && this.stateT>=times[4]){ if(wants('swirl')) spawnSpiralSwirl(); this.stageBeat=5; this.stateT=0; }
      // Beat 5: carriers + drones line
      if(this.stageBeat===5 && this.stateT>=times[5]){ if(wants('carriers')) spawnCarriersAndDrones(); this.stageBeat=6; this.stateT=0; }
      // Beat 6: mine lines (hazards: slow strikers posing as mines)
      if(this.stageBeat===6 && this.stateT>=times[6]){ if(wants('mines')) spawnMineLines(); this.stageBeat=7; this.stateT=0; }
      // transition when field mostly clear after last beat
      if(this.stageBeat>=7 && this.stateT>=times[7]){
        // wait until few alive remain
        let alive=0; forEachEnemy(e=>{ if(e.active) alive++; });
        if(alive<=2){ this.state='bossIntro'; this.stateT=0; }
      }
    }
    else if(this.state==='bossIntro'){
      // Letterbox lock-in beat + short curtain flicker
      const introDelay = game.devSkipIntro? 0.2 : 1.1;
      // gentle lock-in pulse (screen-edge glow)
      if(this.stateT<0.4){ game.screenFlash = Math.max(game.screenFlash, 0.08); game.screenFlashColor = '#25d0ff'; }
      if(this.stateT>=introDelay && !bossActive()){
        spawnBoss();
      }
      if(bossActive()){
        // brief entrance settle
        if(this.stateT>=introDelay+0.35){ this.state='bossFight'; this.stateT=0; }
      }
    }
    else if(this.state==='bossFight'){
      // gate until boss dies
      if(!bossActive()){
        this.state='bossOutro'; this.stateT=0;
        // outro zoom-in tween
        this.zoomTween = { t:0, dur: 0.8, from: this.camZoom, to: 1.0 };
        // letterbox out later in outro
        // reset player world pos when leaving topdown
        game.playerPos.x = 0; game.playerPos.y = 0;
        // cache current vertical scroll speed to restore later; we'll slow it during outro for a docking feel
        try{ const a = getArena(); if(a?.name==='vertical'){ this._outroSpeedFrom = a.speed; } }catch{}
      }
    }
  else if(this.state==='bossOutro'){
      // perform bullet-clear and reward auto-collect early in outro
      if(this.stateT<0.2){ try{ bulletClear(); }catch{} }
      // vertical: gently slow autoscroll and nudge player upward like docking
      try{
        const a = getArena();
        if(a?.name==='vertical'){
          const e = Math.min(1, this.stateT/0.8); const ease = e*e*(3-2*e);
          const from = (this._outroSpeedFrom??a.speed);
          a.speed = Math.max(0, from * (1 - ease));
          // move player toward slight negative Y (upward) smoothly
          const targetY = -50; game.playerPos.y += (targetY - game.playerPos.y) * Math.min(1, 2.5*dt);
          // attract pickups toward player for auto-collect sweep
          forEachPickup(p=>{ const ox = game.playerPos.x, oy = game.playerPos.y; const dx = ox - p.x, dy = oy - p.y; const d = Math.hypot(dx,dy) || 1; const pull = 260*dt; p.x += (dx/d)*pull; p.y += (dy/d)*pull; });
        }
      }catch{}
  // ease out letterbox midway; add dual shockwave hints (using existing VFX ring)
  if(this.stateT>=0.4){ triggerLetterboxOut(0.6); spawnPulsarFX(); }
  if(this.stateT>=0.6){ spawnPulsarFX(); }
      // at end, revert to ring
      if(this.stateT>=0.8){
        // restore vertical scroll speed for next stage usage
        try{ const a = getArena(); if(a?.name==='vertical' && this._outroSpeedFrom!=null){ a.speed = this._outroSpeedFrom; } }catch{}
        disableBossBarrier(); setArena('ring'); setInputScheme('twinStick');
      }
  // Extend outro with a brief slow-down and fade before shop transition for clarity
  const outroTotal = 1.2; // extend to 1.2s
  if(this.stateT>=outroTotal){ this.state='end'; this.stateT=0; concludeWave(); return; }
    }

  updateBullets(dt); updateEnemies(dt); updateEnemyShots(dt); handleBulletEnemyCollisions(); handleBulletEnemyShotCollisions();
  updateLaserAI(dt); updateLasers(dt); handleLaserEnemyShotCollisions();
  updateEffects(dt);
  updateBoss(dt);
  // pickups
  updatePickups(dt);
  // collect: player collects by proximity to turret center
  forEachPickup(p=>{
    const ox = (game.arenaMode==='topdown') ? game.playerPos.x : 0;
    const oy = (game.arenaMode==='topdown') ? game.playerPos.y : 0;
    const d = Math.hypot(p.x - ox, p.y - oy);
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
      // Place turret a bit below the barrier line (account for DPR)
      const dpr2 = window.devicePixelRatio || 1;
      const yScreen = getBossBarrierScreenY(); // CSS px
      const offsetFromCenter = (yScreen*dpr2) - (canvas.height * 0.5);
      game.player.targetY = offsetFromCenter + 40;
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
    let targetZoom = (game.devZoom!=null? game.devZoom : (1 + 0.02*pressure));
    // apply cinematic tween if active
    if(this.zoomTween.dur>0 && this.zoomTween.t<=this.zoomTween.dur){
      const k = this.zoomTween.t/this.zoomTween.dur; const ease = k*k*(3-2*k); // smoothstep
      targetZoom = this.zoomTween.from + (this.zoomTween.to - this.zoomTween.from)*ease;
    }
  this.camZoom += (targetZoom - this.camZoom) * 0.08; // ease
  // center of playable area in CSS px
  const cx = (pb.x + pb.width/2) * dpr;
  const cy = (pb.y + pb.height/2) * dpr;
  ctx.save();
  // Use DPR-aware world transform for all world elements (fixes tiny/hidden turret on mobile)
  // Smoothly ease player render offset to target
  const ease = 0.12;
  game.player.y += (game.player.targetY - game.player.y) * ease;
  // Arena-managed camera transform (ring/topdown vs vertical)
  const arena = getArena();
  // subtle vertical bob in vertical mode
  const bob = (game.arenaMode==='vertical') ? Math.sin(performance.now()/800)*6*dpr : 0;
  arena.applyCamera(ctx, dpr*this.camZoom, cx, cy + bob);
  // turret (render at world origin in ring mode; at playerPos in topdown)
  ctx.save();
  const px = (game.arenaMode==='topdown') ? game.playerPos.x : 0;
  const py = (game.arenaMode==='topdown') ? game.playerPos.y : 0;
  ctx.translate(px, py);
  ctx.fillStyle = '#0e1b2b';
  ctx.beginPath(); ctx.arc(0,0, 22, 0, Math.PI*2); ctx.fill();
  ctx.lineWidth = 3; ctx.strokeStyle = '#25d0ffbb'; ctx.stroke();
  // invulnerability shimmer ring
  if(game.invulnT>0){ ctx.save(); const a = Math.min(1, game.invulnT/1.0); ctx.globalAlpha = 0.25 + 0.35*a; ctx.strokeStyle='#ffd3d3'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(0,0, 26, 0, Math.PI*2); ctx.stroke(); ctx.restore(); }
  // barrel
  const aim = (game.arenaMode==='vertical') ? activeScheme.getAimAngle() : input.aimAngle;
  ctx.save(); ctx.rotate(aim); ctx.fillStyle = game.overheated? '#ff4d6d':'#25d0ff'; ctx.fillRect(0,-4,32,8); ctx.restore();
  // draw muzzle flash cone/flare in vertical mode
  if(game.arenaMode==='vertical' && this._muzzleT>0){
    this._muzzleT = Math.max(0, this._muzzleT - 1/60);
    ctx.save();
    ctx.translate(this._muzzleX - px, this._muzzleY - py);
    ctx.rotate(this._muzzleA);
    const t = Math.min(1, this._muzzleT/0.12);
    const prevComp = ctx.globalCompositeOperation; ctx.globalCompositeOperation = 'lighter';
    // core flare
    ctx.globalAlpha = 0.6 * t; ctx.fillStyle = '#fff1b8';
    ctx.beginPath(); ctx.arc(6, 0, 3 + 3*t, 0, Math.PI*2); ctx.fill();
    // cone
    ctx.globalAlpha = 0.5 * t; ctx.fillStyle = '#ffd166';
    const w1 = 3 + 4*t; const w2 = 10 + 14*t; const len = 22 + 24*t;
    ctx.beginPath(); ctx.moveTo(0, -w1); ctx.lineTo(len, -w2); ctx.lineTo(len, w2); ctx.lineTo(0, w1); ctx.closePath(); ctx.fill();
    // hot inner beam
    ctx.globalAlpha = 0.35 * t; ctx.fillStyle = '#fffbe6';
    ctx.fillRect(0, -1.5, len*0.9, 3);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = prevComp; ctx.restore();
  }
  ctx.restore();
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
  // Dev: layered layout overlay for screenshots (URL ?layout=1)
  try{
    const params = new URLSearchParams(window.location.search);
    if(params.get('layout')==='1'){
      const dprO = window.devicePixelRatio||1; ctx.save(); ctx.resetTransform(); ctx.scale(dprO,dprO);
      const vp = getViewportRectCSS();
      const ts = getTitleSafeRectCSS();
      const as = getActionSafeRectCSS();
      // Magenta – full device/frame bounds
      ctx.strokeStyle = '#ff00cc'; ctx.lineWidth = 8; ctx.strokeRect(0,0, canvas.width/dprO, canvas.height/dprO);
      // Cyan – Browser viewport
      ctx.strokeStyle = '#1e90ff'; ctx.lineWidth = 6; ctx.strokeRect(vp.x+3, vp.y+3, vp.width-6, vp.height-6);
      // Green – HUD/title-safe area
      ctx.strokeStyle = '#22c55e'; ctx.lineWidth = 6; ctx.strokeRect(ts.x, ts.y, ts.width, ts.height);
      // Yellow – Action-safe area
      ctx.strokeStyle = '#eab308'; ctx.lineWidth = 6; ctx.strokeRect(as.x, as.y, as.width, as.height);
      // Red – Bleed/gutter zone (between title-safe and action-safe): draw as inner border inside title-safe
      ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 10; ctx.strokeRect(as.x-5, as.y-5, as.width+10, as.height+10);
      ctx.restore();
    }
  }catch{}
  // Cinematic intro: light chassis reveal under letterbox with clamp-on SFX
  if(game.arenaMode==='vertical' && this.state==='stage' && this._gateActive){
    const dprC = window.devicePixelRatio||1; ctx.save(); ctx.resetTransform(); ctx.scale(dprC,dprC);
    const wCSS2 = canvas.width/dprC, hCSS2 = canvas.height/dprC;
    // faint ship silhouette near center-bottom
    const k = Math.min(1, this._introChassisT/0.8);
    const alpha = 0.12 + 0.25 * k; // fade in
    const y = hCSS2*0.62 + (1-k)*30; // ease up slightly
    ctx.globalAlpha = alpha; ctx.fillStyle = '#9fdcff';
    // simple chassis: diamond + small wings
    ctx.beginPath();
    const cx2 = wCSS2/2;
    ctx.moveTo(cx2, y-12); ctx.lineTo(cx2+10, y); ctx.lineTo(cx2, y+12); ctx.lineTo(cx2-10, y); ctx.closePath(); ctx.fill();
    ctx.globalAlpha = alpha*0.7; ctx.fillRect(cx2-16, y-3, 6, 6); ctx.fillRect(cx2+10, y-3, 6, 6);
    ctx.globalAlpha = 1; ctx.restore();
    // one-time clamp-on SFX ping mid-letterbox
    if(!this._introClampDid && this._introChassisT>0.4){ this._introClampDid = true; if(!isMuted()) beep({freq:300, freqEnd:220, type:'square', duration:0.06, gain:0.03, attack:0.004, release:0.05}); }
  }
  // Heat ring at the playable center respecting render offset
  // Heat ring follows player in topdown, remains center in ring mode
  const isTD = (game.arenaMode==='topdown' || game.arenaMode==='vertical');
  const hx = (pb.x + pb.width/2) * dpr + (isTD? game.playerPos.x : 0);
  const hy = (pb.y + pb.height/2) * dpr + game.player.y + (isTD? game.playerPos.y : 0);
  drawHeatRing(hx, hy, 30, game.heat/game.heatMax);
  // top bar with ability chips
  // compute a fade alpha for 2x badge: ease in first 0.5s, ease out last 0.5s
  let twoXAlpha = 0;
  if(game.powerups.twoXT>0){ const t = game.powerups.twoXT; const max = 15; const head = 0.5, tail = 0.5; const inA = Math.min(1, (max - t)/head); const outA = Math.min(1, t/tail); twoXAlpha = Math.min(inA, outA); }
  drawTopBar({score: game.score, wave: `${game.wave}  ❤${game.lives}  ⓒ${game.credits} (+${game.earnedThisWave})`, heat: game.heat, heatMax: game.heatMax, muted: false, twoXActive: game.powerups.twoXT>0, twoXAlpha});
  drawAbilityUI();
  if(bossActive()) drawBossBar(boss.name, boss.hp, boss.maxHp);
  // Dev formation overlay: spawn boxes and safe lanes (screen space)
  if(game.devFormationOverlay && game.arenaMode==='vertical'){
    const dprO = window.devicePixelRatio||1; ctx.save(); ctx.resetTransform(); ctx.scale(dprO,dprO);
    const pbCSS = getPlayableScreenBounds();
    ctx.globalAlpha = 0.5; ctx.strokeStyle = '#2b6cb0'; ctx.setLineDash([6,4]);
    // Safe lanes: 5 equidistant vertical lanes within playable area
    const lanes = 5; const laneW = pbCSS.width/lanes;
    for(let i=0;i<=lanes;i++){
      const x = pbCSS.x + i*laneW; ctx.beginPath(); ctx.moveTo(x, pbCSS.y); ctx.lineTo(x, pbCSS.y + pbCSS.height); ctx.stroke();
    }
    // Spawn boxes hinting beats used earlier (top band)
    const boxH = 80; const pad = 10;
    // lanes beat
    ctx.strokeStyle='#3b82f6'; ctx.setLineDash([8,6]);
    ctx.strokeRect(pbCSS.x+pad, pbCSS.y+pad, pbCSS.width-pad*2, boxH);
    // wedge beat narrower
    ctx.strokeStyle='#22c55e'; ctx.setLineDash([6,4]);
    ctx.strokeRect(pbCSS.x+pbCSS.width*0.15, pbCSS.y+pad+boxH+10, pbCSS.width*0.7, boxH*0.7);
    // tanks line
    ctx.strokeStyle='#f59e0b'; ctx.setLineDash([10,6]);
    ctx.strokeRect(pbCSS.x+pad, pbCSS.y+pad+boxH*2+20, pbCSS.width-pad*2, boxH*0.6);
    // zig area
    ctx.strokeStyle='#ef4444'; ctx.setLineDash([4,3]);
    ctx.strokeRect(pbCSS.x+pbCSS.width*0.1, pbCSS.y+pad+boxH*2.8+26, pbCSS.width*0.8, boxH*0.8);
    // swirl ring hint
    ctx.strokeStyle='#a78bfa'; ctx.setLineDash([2,4]);
    const cx = pbCSS.x + pbCSS.width/2, cy = pbCSS.y + pad + boxH*4.0; const r = Math.min(pbCSS.width, pbCSS.height)*0.25;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2); ctx.stroke();
    ctx.setLineDash([]); ctx.globalAlpha = 1; ctx.restore();
  }
  // Diagnostics overlay: FPS, DPR, canvas/viewport sizes, aim cone
  if(game.devDiagnosticsOverlay){
    const dprD = window.devicePixelRatio||1; ctx.save(); ctx.resetTransform(); ctx.scale(dprD,dprD);
    const wCSS = canvas.width/dprD, hCSS = canvas.height/dprD;
    // FPS estimate
    const now = performance.now(); this._fpsTimes = this._fpsTimes||[]; this._fpsTimes.push(now); while(this._fpsTimes.length>0 && now - this._fpsTimes[0] > 1000) this._fpsTimes.shift();
    const fps = this._fpsTimes.length;
    ctx.fillStyle = '#b7f3ff'; ctx.font='11px system-ui,sans-serif';
    ctx.fillText(`FPS ${fps}  DPR ${dprD.toFixed(2)}  ${Math.round(canvas.width)}x${Math.round(canvas.height)} px`, 8, 14);
    // auto-fire range ring if enabled
    if(game.autoFire){ ctx.globalAlpha=0.12; ctx.strokeStyle='#25d0ff'; ctx.lineWidth=2; ctx.beginPath(); const pb = getPlayableScreenBounds(); const cx=(pb.x+pb.width/2)*dprD, cy=(pb.y+pb.height/2)*dprD; ctx.arc(cx, cy, game.autoRange, 0, Math.PI*2); ctx.stroke(); ctx.globalAlpha=1; }
    ctx.restore();
  }
  // GO sweep overlay during gated intro
  if(this._gateActive && game.arenaMode==='vertical' && this.state==='stage'){
    const k = Math.min(1, this._gateT / Math.max(0.001, this._gateDur));
    const dpr2 = window.devicePixelRatio||1; ctx.save(); ctx.resetTransform(); ctx.scale(dpr2,dpr2);
    const wCSS2 = canvas.width/dpr2, hCSS2 = canvas.height/dpr2;
    ctx.globalAlpha = 0.7 * Math.sin(k*Math.PI);
    ctx.fillStyle = '#b7f3ff'; ctx.font = 'bold 36px system-ui,sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
    const y = hCSS2*0.65 - (k*20);
    ctx.fillText('GO', wCSS2/2, y);
    ctx.globalAlpha = 1; ctx.restore();
  }
  // End-of-outro screen fade to black for clarity
  if(this.state==='bossOutro'){
    const t = this.stateT; const start = 0.9, end = 1.2; if(t>=start){
      const dprF = window.devicePixelRatio||1; const k = Math.min(1, (t-start)/Math.max(0.0001, end-start));
      ctx.save(); ctx.resetTransform(); ctx.scale(dprF,dprF); ctx.globalAlpha = 0.6*k; ctx.fillStyle = '#000';
      ctx.fillRect(0,0, canvas.width/dprF, canvas.height/dprF); ctx.restore();
    }
  }
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

// --- Minimal formations for vertical stage stub ---
function spawnLaneGrunts(){
  // 5 lanes, spawn grunts offset vertically above
  const cols = 5; const spacing = 80; const startX = -((cols-1)/2)*spacing;
  for(let i=0;i<cols;i++){
    const x = startX + i*spacing; const y = -360; spawnEnemyAt(x, y, 'grunt');
  }
}
function spawnWedgeStrikers(){
  // V wedge: strikers aiming downward
  const rows = 3; const spacing = 70;
  for(let r=0;r<rows;r++){
    const off = (r*spacing);
    spawnEnemyAt(-off, -320 - r*40, 'striker');
    if(r>0) spawnEnemyAt(off, -320 - r*40, 'striker');
  }
}
function spawnTurretPods(){
  // a few tanks along a wide line
  const xs = [-160, 0, 160];
  for(const x of xs) spawnEnemyAt(x, -340, 'tank');
}
function spawnZigZagStrafers(){
  // spawn strikers offset left/right that will naturally zig as they chase
  const ys = [-360, -300, -260];
  for(const y of ys){ spawnEnemyAt(-180, y, 'striker'); spawnEnemyAt(180, y, 'striker'); }
}
function spawnSpiralSwirl(){
  // drop a ring of grunts in a swirl pattern above
  const count = 8; const rad = 200; const off = Math.random()*Math.PI*2;
  for(let i=0;i<count;i++){
    const a = off + (i/count)*Math.PI*2; const x = Math.cos(a)*rad; const y = -360 + Math.sin(a)*60;
    spawnEnemyAt(x, y, 'grunt');
  }
}

// New: Carriers + Drones (carriers are tanks with escort strikers)
function spawnCarriersAndDrones(){
  const cols = 2; const sep = 180; const baseY = -360;
  for(let i=0;i<cols;i++){
    const x = i===0? -sep/2 : sep/2; const y = baseY;
    // carrier (tank)
    spawnEnemyAt(x, y, 'tank');
    // drones
    spawnEnemyAt(x-40, y-30, 'striker');
    spawnEnemyAt(x+40, y-30, 'striker');
  }
}

// New: Mine lines (slow strikers spaced across a band)
function spawnMineLines(){
  const bandY = -320; const cols = 6; const span = 360; const startX = -span/2;
  for(let i=0;i<cols;i++){
    const x = startX + i*(span/(cols-1));
    spawnEnemyAt(x, bandY, 'striker');
  }
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
import { forEachBullet, deactivateBullet } from '../entities/bullet.js';

function bulletClear(){
  // deactivate all bullets on screen
  try{ forEachBullet(b=> deactivateBullet(b)); }catch{}
}
function usePulsar(){ if(game.abilQ_cd>0) return; // radial shockwave: damage or pushback
  // gate abilities during intro cinematic
  if(waveScene._gateActive) return;
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
  if(waveScene._gateActive) return;
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
  // subtle "ready" pulse: soft glow + sheen sweep instead of hard flash block
  if(flash>0 && pct>=1){
    const t = (performance.now?.()/1000)||0; const pulse = 0.5 + 0.5*Math.sin(t*6.0);
    const a = Math.min(0.6, 0.25 + flash*0.5) * pulse;
    // outer glow
    ctx.save(); ctx.globalAlpha = a; ctx.shadowColor = color; ctx.shadowBlur = 12; ctx.fillStyle = color + '22';
    ctx.fillRect(x-1,y-1,w+2,h+2); ctx.restore();
    // sheen sweep
    const k = (t*0.8) % 1; const sx = x + k*w;
    const grad = ctx.createLinearGradient(sx-18, y, sx+18, y);
    grad.addColorStop(0, 'rgba(255,255,255,0)');
    grad.addColorStop(0.5, 'rgba(255,255,255,0.25)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.save(); ctx.globalAlpha = Math.min(0.45, flash); ctx.fillStyle = grad; ctx.fillRect(x,y,w,h); ctx.restore();
  }
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
