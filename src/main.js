// main.js - boot minimal playable loop
import { canvas } from './core/canvas.js';
import { start } from './engine/loop.js';
import { pollGamepad } from './engine/input.js';
import { setArena } from './engine/arena.js';
import { setInputScheme } from './engine/inputScheme.js';
import { initAudio, toggleMute, isMuted } from './core/audio.js';
import { save, load } from './core/storage.js';
import { game } from './core/state.js';
import { setScene, update as sceneUpdate, render as sceneRender, getScene } from './engine/sceneManager.js';
import { waveScene } from './scenes/wave.js';
import { shopScene } from './scenes/shop.js';
import { uiButtons } from './ui/buttons.js';
import { setScene as goScene } from './engine/sceneManager.js';

// Mark app boot state for automation
try { window.spacerReady = false; document.body.setAttribute('data-spacer-ready','0'); } catch {}

// simple UI bar clicks
// load persisted UI prefs
game.showAbilityLabels = load('showAbilityLabels', true);
game.abilityUiMode = load('abilityUiMode', game.abilityUiMode);
game.abilityUiCorner = load('abilityUiCorner', game.abilityUiCorner);
game.laserEnabled = load('laserEnabled', game.laserEnabled);
game.autoFire = load('autoFire', game.autoFire);
game.autoRange = load('autoRange', game.autoRange);
game.showAutoGrid = load('showAutoGrid', game.showAutoGrid);
// vertical heat policy persistence
game.verticalHeatPolicy = load('verticalHeatPolicy', game.verticalHeatPolicy);
// URL toggles: ?auto=1 to enable auto-fire; ?devShop=1 to open shop immediately
try{
  const params = new URLSearchParams(window.location.search);
  if(params.get('auto')==='1') { game.autoFire = true; }
  if(params.get('grid')==='1') { game.showAutoGrid = true; }
  if(params.get('laser')==='0') { game.laserEnabled = false; }
  if(params.get('devShop')==='1') { setScene(shopScene); }
  // Jump directly to a specific wave for testing: ?wave=5
  const waveParam = parseInt(params.get('wave')||'', 10);
  if(!Number.isNaN(waveParam) && waveParam>0){
    game.wave = waveParam; setScene(waveScene);
  }
  if(params.get('dev')==='1') { game.devMode = true; }
  if(params.get('pause')==='1') { game.devPause = true; }
  // Arena and input scheme dev flags
  const arena = params.get('arena'); if(arena){ setArena(arena); }
  const scheme = params.get('scheme'); if(scheme){ setInputScheme(scheme); }
  // Aliases per checklist
  const mode = params.get('mode'); if(mode){ setArena(mode); }
  const speed = parseFloat(params.get('speed')||'');
  if(!Number.isNaN(speed)){
    try{ import('./engine/arena.js').then(m=>{ try{ m.getArena().speed = speed; }catch{} }); }catch{}
  }
  // Cinematic helpers
  if(params.get('skipIntro')==='1') { game.devSkipIntro = true; }
  const zoom = parseFloat(params.get('zoom')||''); if(!Number.isNaN(zoom)){ game.devZoom = zoom; }
  // Vertical heat policy: ?heat=expanded|disabled (alias: heatPolicy)
  const heatParam = (params.get('heat') || params.get('heatPolicy'));
  if(heatParam && (heatParam==='expanded' || heatParam==='disabled')){
    game.verticalHeatPolicy = heatParam; save('verticalHeatPolicy', heatParam);
  }
  // Patterns/dev flags: ?patterns=1 to speed stage beats; ?pattern=lanes|wedge|tanks|swirl to force a pattern
  if(params.get('patterns')==='1'){ game.devPatternsFast = true; }
  const pat = params.get('pattern'); if(pat){ game.devPattern = pat; }
  // Formation overlay: ?form=1 to show spawn boxes & lanes
  if(params.get('form')==='1'){ game.devFormationOverlay = true; }
}catch{ /* no-op */ }

// Enforce ability bars in top gutter by default, overriding any saved preference
import { save as __saveOverride } from './core/storage.js';
game.abilityUiMode = 'corner'; __saveOverride('abilityUiMode', game.abilityUiMode);
game.abilityUiCorner = 'top-right'; __saveOverride('abilityUiCorner', game.abilityUiCorner);
window.addEventListener('keydown', (e)=>{
  if(e.key==='m') toggleMute();
  // hold-to-fire secondary (lasers); press and hold 'O'
  if(e.key.toLowerCase()==='o'){ inputSecondaryHold(true); }
  if(e.key.toLowerCase()==='h'){ game.showAbilityLabels = !game.showAbilityLabels; save('showAbilityLabels', game.showAbilityLabels); }
  // toggle ability UI mode
  if(e.key.toLowerCase()==='u'){
    game.abilityUiMode = game.abilityUiMode==='corner'? 'ring':'corner';
    save('abilityUiMode', game.abilityUiMode);
  }
  // cycle corners with I/J/K/L (rows/cols)
  const c = game.abilityUiCorner;
  const set = (v)=>{ game.abilityUiCorner=v; save('abilityUiCorner', v); };
  switch(e.key.toLowerCase()){
    case 'i': { // top row TL<->TR
      if(c.startsWith('top')) set(c==='top-left'? 'top-right':'top-left'); else set('top-left');
      break;
    }
    case 'k': { // bottom row BL<->BR
      if(c.startsWith('bottom')) set(c==='bottom-left'? 'bottom-right':'bottom-left'); else set('bottom-left');
      break;
    }
    case 'j': { // left col TL<->BL
      if(c.endsWith('left')) set(c==='top-left'? 'bottom-left':'top-left'); else set('top-left');
      break;
    }
    case 'l': { // right col TR<->BR
      if(c.endsWith('right')) set(c==='top-right'? 'bottom-right':'top-right'); else set('top-right');
      break;
    }
    case 'p': { // toggle autonomous lasers (challenge mode)
      game.laserEnabled = !game.laserEnabled; save('laserEnabled', game.laserEnabled);
      break;
    }
    case '`': // backtick toggles dev pause
    case '~': {
      if(game.devMode){ game.devPause = !game.devPause; }
      break;
    }
  }
});

// Release secondary on keyup
window.addEventListener('keyup', (e)=>{
  if(e.key.toLowerCase()==='o'){ inputSecondaryHold(false); }
});

// helper to set input.secondaryHold
import { input } from './engine/input.js';
// expose a tiny global to let systems check current secondary hold state without tight coupling
window.spacerInput = input;
function inputSecondaryHold(v){ input.secondaryHold = !!v; }
canvas.addEventListener('pointerdown', ()=> initAudio());

// On-screen buttons for abilities and audio
// Dynamic overlay UI per scene via simple event bus
function computeOverlayPosition(){
  if(game.abilityUiMode==='corner'){
    const c = game.abilityUiCorner||'bottom-right';
  if(c.includes('top-right')) return 'bottom-left';
  if(c.includes('top-left')) return 'bottom-right';
  if(c.includes('bottom-right')) return 'top-left';
  if(c.includes('bottom-left')) return 'top-right';
  }
  return 'bottom-right';
}

function showPlayOverlay(){
  const triggerQ = ()=>{ const ev = new KeyboardEvent('keydown', {key:'q'}); window.dispatchEvent(ev); };
  const triggerE = ()=>{ const ev = new KeyboardEvent('keydown', {key:'e'}); window.dispatchEvent(ev); };
  const triggerMute = ()=> { toggleMute(); showPlayOverlay(); };
  const toggleLaser = ()=>{ game.laserEnabled = !game.laserEnabled; save('laserEnabled', game.laserEnabled); };
  const toggleAuto = ()=>{ game.autoFire = !game.autoFire; save('autoFire', game.autoFire); };
  // on-screen secondary hold button
  const startHold = ()=> inputSecondaryHold(true);
  const stopHold = ()=> inputSecondaryHold(false);
  const buttons = [
    // Ability bars are drawn in HUD; omit redundant Q/E buttons in play overlay
    { label: game.laserEnabled? 'Lsr':'Lsr', title:'Toggle Laser (P)', onClick: toggleLaser, testid:'btn-laser' },
  { label: (isMuted()? '🔇' : '🔊'), title:'Audio (M)', onClick: triggerMute, testid:'btn-audio' },
    { label:'AUTO', title:'Dev Auto-Fire Toggle', onClick: toggleAuto, variant:'pill', testid:'btn-auto' },
    { label:'⎍', title:'Secondary Hold (O)', onClick: ()=>{}, onDown:startHold, onUp:stopHold, testid:'btn-secondary' },
    { label:'⚙', title:'Settings', onClick: ()=>{ game.settingsOpen = !game.settingsOpen; showSettingsOverlay(); }, testid:'btn-settings' },
  ];
  if(game.devMode){ buttons.push({ label:'Dev', title:'Developer Tools', onClick: ()=> showDevOverlay(), variant:'pill', testid:'btn-dev' }); }
  uiButtons.show(buttons, { position: computeOverlayPosition() });
  // Visual indication for mute state
  try{
    const audioBtn = document.querySelector('#ui-buttons-overlay [data-testid="btn-audio"]');
    if(audioBtn){
      if(isMuted()){
        audioBtn.style.opacity = '0.55';
        audioBtn.style.filter = 'grayscale(0.6)';
      } else {
        audioBtn.style.opacity = '1';
        audioBtn.style.filter = 'none';
      }
    }
  }catch{}
  if(game.settingsOpen) showSettingsOverlay();
}

// Minimal settings overlay focused on AUTO options
function showSettingsOverlay(){
  const close = ()=>{ game.settingsOpen=false; uiButtons.show([], {position:'top-right'}); showPlayOverlay(); };
  const decRange = ()=>{ game.autoRange = Math.max(80, Math.round(game.autoRange - 20)); save('autoRange', game.autoRange); showSettingsOverlay(); };
  const incRange = ()=>{ game.autoRange = Math.min(600, Math.round(game.autoRange + 20)); save('autoRange', game.autoRange); showSettingsOverlay(); };
  const toggleGrid = ()=>{ game.showAutoGrid = !game.showAutoGrid; save('showAutoGrid', game.showAutoGrid); showSettingsOverlay(); };
  const devMenu = ()=>{ showDevOverlay(); };
  const toggleHeat = ()=>{
    const next = (game.verticalHeatPolicy==='expanded'? 'disabled' : 'expanded');
    game.verticalHeatPolicy = next; save('verticalHeatPolicy', next); showSettingsOverlay();
  };
  uiButtons.show([
  { label:'—', title:'Range -', onClick: decRange, testid:'btn-range-dec' },
  { label:`${game.autoRange}px`, title:'AUTO Range', onClick: ()=>{} , variant:'pill', testid:'lbl-range' },
  { label:'+', title:'Range +', onClick: incRange, testid:'btn-range-inc' },
  { label: game.showAutoGrid? 'Grid✓':'Grid', title:'Toggle AUTO Grid', onClick: toggleGrid, variant:'pill', testid:'btn-grid' },
  // Vertical-stage heat policy toggle (always visible; only affects vertical mode)
  { label: (game.verticalHeatPolicy==='disabled'? 'Heat: Off' : 'Heat: Wide'), title:'Vertical Heat Policy', onClick: toggleHeat, variant:'pill', testid:'btn-heat-policy' },
  ...(game.devMode? [{ label:'Dev', title:'Developer Tools', onClick: devMenu, variant:'pill', testid:'btn-dev' }]: []),
  { label:'Close', title:'Close Settings', onClick: close, variant:'pill', testid:'btn-settings-close' },
  ], { position:'bottom-right', caption:'Settings — AUTO' });
}

// Dev overlay: fast wave jump and quick toggles
function showDevOverlay(){
  const back = ()=> showSettingsOverlay();
  // wave jump helpers
  const setWave = (w)=>{ game.wave = Math.max(1, Math.floor(w)); goScene(waveScene); window.dispatchEvent(new CustomEvent('spacer:show-ui', { detail:{ type:'play' } })); };
  const minus10 = ()=> setWave(game.wave - 10);
  const minus1 = ()=> setWave(game.wave - 1);
  const plus1 = ()=> setWave(game.wave + 1);
  const plus10 = ()=> setWave(game.wave + 10);
  const togglePause = ()=>{ game.devPause = !game.devPause; };
  const togglePatterns = ()=>{ game.devPatternsFast = !game.devPatternsFast; };
  const toggleForm = ()=>{ game.devFormationOverlay = !game.devFormationOverlay; };
  uiButtons.show([
  { label:'-10', title:'Wave -10', onClick: minus10, testid:'btn-wave--10' },
  { label:'-1', title:'Wave -1', onClick: minus1, testid:'btn-wave--1' },
  { label:`Wave ${game.wave}`, title:'Current Wave', onClick: ()=>{}, variant:'pill', testid:'lbl-wave' },
  { label:'+1', title:'Wave +1', onClick: plus1, testid:'btn-wave-+1' },
  { label:'+10', title:'Wave +10', onClick: plus10, testid:'btn-wave-+10' },
  { label:'Boss', title:'Next Boss Wave', onClick: ()=>{ const w = game.wave; const nextBoss = (Math.floor((w-1)/5)+1)*5; setWave(nextBoss); }, variant:'pill', testid:'btn-next-boss' },
  { label: game.devPause? 'Resume':'Pause', title:'Dev Pause (no overlay)', onClick: togglePause, variant:'pill', testid:'btn-dev-pause' },
  { label: game.devPatternsFast? 'Patterns✓':'Patterns', title:'Speed Stage Beats', onClick: togglePatterns, variant:'pill', testid:'btn-dev-patterns' },
  { label: game.devFormationOverlay? 'Form✓':'Form', title:'Show Formation Overlay', onClick: toggleForm, variant:'pill', testid:'btn-dev-form' },
  { label:'Back', title:'Back', onClick: back, variant:'pill', testid:'btn-back' },
  ], { position:'bottom-right', caption:'Dev — Wave Jump' });
}

function showShopOverlay(){
  const reroll = ()=>{ const ev = new KeyboardEvent('keydown', {key:'r'}); window.dispatchEvent(ev); };
  const lock = ()=>{ const ev = new KeyboardEvent('keydown', {key:'l'}); window.dispatchEvent(ev); };
  const skip = ()=>{ const ev = new KeyboardEvent('keydown', {key:' '}); window.dispatchEvent(ev); };
  uiButtons.show([
  { label:'R', title:'Reroll (R)', onClick: reroll, testid:'btn-reroll' },
  { label:'L', title:'Toggle Lock (L)', onClick: lock, testid:'btn-lock' },
  { label:'Skip', title:'Skip (Space)', onClick: skip, variant:'pill', testid:'btn-skip' },
  ], { position: 'bottom-left' });
}

function showGameOverOverlay(){
  uiButtons.show([
  { label:'Restart', title:'Restart Run', onClick: ()=>{ const ev = new KeyboardEvent('keydown', {key:' '}); window.dispatchEvent(ev); }, variant:'wide', testid:'btn-restart' }
  ], { position:'center' });
}

function updateOverlayForScene(){
  const s = getScene();
  if(!s) return;
  if(s?.enter === waveScene.enter) showPlayOverlay();
  else if(s?.skip) showShopOverlay();
  else showGameOverOverlay();
}

// Event bus
window.addEventListener('spacer:show-ui', (e)=>{
  const type = e.detail?.type;
  if(type==='play') showPlayOverlay();
  else if(type==='shop') showShopOverlay();
  else if(type==='gameover') showGameOverOverlay();
});
function update(dt){ pollGamepad(); sceneUpdate(dt); }
function render(alpha){ sceneRender(alpha); }
if(getScene()!==shopScene) setScene(waveScene);
start(update, render);
// Initial overlay
window.dispatchEvent(new CustomEvent('spacer:show-ui', { detail:{ type: getScene()===shopScene? 'shop':'play' } }));
// Signal readiness for external automation (e.g., Playwright)
try { window.spacerReady = true; document.body.setAttribute('data-spacer-ready','1'); window.dispatchEvent(new CustomEvent('spacer:ready')); } catch {}
