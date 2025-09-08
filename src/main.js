// main.js - boot minimal playable loop
import { canvas } from './core/canvas.js';
import { start } from './engine/loop.js';
import { pollGamepad } from './engine/input.js';
import { initAudio, toggleMute } from './core/audio.js';
import { save, load } from './core/storage.js';
import { game } from './core/state.js';
import { setScene, update as sceneUpdate, render as sceneRender, getScene } from './engine/sceneManager.js';
import { waveScene } from './scenes/wave.js';
import { shopScene } from './scenes/shop.js';
import { uiButtons } from './ui/buttons.js';

// simple UI bar clicks
// load persisted UI prefs
game.showAbilityLabels = load('showAbilityLabels', true);
game.abilityUiMode = load('abilityUiMode', game.abilityUiMode);
game.abilityUiCorner = load('abilityUiCorner', game.abilityUiCorner);
game.laserEnabled = load('laserEnabled', game.laserEnabled);
game.autoFire = load('autoFire', game.autoFire);
game.autoRange = load('autoRange', game.autoRange);
game.showAutoGrid = load('showAutoGrid', game.showAutoGrid);
// URL toggles: ?auto=1 to enable auto-fire; ?devShop=1 to open shop immediately
try{
  const params = new URLSearchParams(window.location.search);
  if(params.get('auto')==='1') { game.autoFire = true; }
  if(params.get('grid')==='1') { game.showAutoGrid = true; }
  if(params.get('laser')==='0') { game.laserEnabled = false; }
  if(params.get('devShop')==='1') { setScene(shopScene); }
}catch{ /* no-op */ }
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
    if(c.includes('bottom-right')) return 'bottom-left';
    if(c.includes('bottom-left')) return 'bottom-right';
  }
  return 'bottom-right';
}

function showPlayOverlay(){
  const triggerQ = ()=>{ const ev = new KeyboardEvent('keydown', {key:'q'}); window.dispatchEvent(ev); };
  const triggerE = ()=>{ const ev = new KeyboardEvent('keydown', {key:'e'}); window.dispatchEvent(ev); };
  const triggerMute = ()=> toggleMute();
  const toggleLaser = ()=>{ game.laserEnabled = !game.laserEnabled; save('laserEnabled', game.laserEnabled); };
  const toggleAuto = ()=>{ game.autoFire = !game.autoFire; save('autoFire', game.autoFire); };
  // on-screen secondary hold button
  const startHold = ()=> inputSecondaryHold(true);
  const stopHold = ()=> inputSecondaryHold(false);
  uiButtons.show([
    { label:'Q', title:'Pulsar (Q)', onClick: triggerQ },
    { label:'E', title:'EMP (E)', onClick: triggerE },
    { label: game.laserEnabled? 'Lsr':'Lsr', title:'Toggle Laser (P)', onClick: toggleLaser },
    { label:'🔊', title:'Audio (M)', onClick: triggerMute },
    { label:'AUTO', title:'Dev Auto-Fire Toggle', onClick: toggleAuto, variant:'pill' },
    { label:'⎍', title:'Secondary Hold (O)', onClick: ()=>{}, onDown:startHold, onUp:stopHold },
    { label:'⚙', title:'Settings', onClick: ()=>{ game.settingsOpen = !game.settingsOpen; showSettingsOverlay(); } },
  ], { position: computeOverlayPosition() });
  if(game.settingsOpen) showSettingsOverlay();
}

// Minimal settings overlay focused on AUTO options
function showSettingsOverlay(){
  const close = ()=>{ game.settingsOpen=false; uiButtons.show([], {position:'top-right'}); showPlayOverlay(); };
  const decRange = ()=>{ game.autoRange = Math.max(80, Math.round(game.autoRange - 20)); save('autoRange', game.autoRange); showSettingsOverlay(); };
  const incRange = ()=>{ game.autoRange = Math.min(600, Math.round(game.autoRange + 20)); save('autoRange', game.autoRange); showSettingsOverlay(); };
  const toggleGrid = ()=>{ game.showAutoGrid = !game.showAutoGrid; save('showAutoGrid', game.showAutoGrid); showSettingsOverlay(); };
  uiButtons.show([
    { label:'—', title:'Range -', onClick: decRange },
    { label:`${game.autoRange}px`, title:'AUTO Range', onClick: ()=>{} , variant:'pill' },
    { label:'+', title:'Range +', onClick: incRange },
    { label: game.showAutoGrid? 'Grid✓':'Grid', title:'Toggle AUTO Grid', onClick: toggleGrid, variant:'pill' },
    { label:'Close', title:'Close Settings', onClick: close, variant:'pill' },
  ], { position:'bottom-right', caption:'Settings — AUTO' });
}

function showShopOverlay(){
  const reroll = ()=>{ const ev = new KeyboardEvent('keydown', {key:'r'}); window.dispatchEvent(ev); };
  const lock = ()=>{ const ev = new KeyboardEvent('keydown', {key:'l'}); window.dispatchEvent(ev); };
  const skip = ()=>{ const ev = new KeyboardEvent('keydown', {key:' '}); window.dispatchEvent(ev); };
  uiButtons.show([
  { label:'R', title:'Reroll (R)', onClick: reroll },
  { label:'L', title:'Toggle Lock (L)', onClick: lock },
  { label:'Skip', title:'Skip (Space)', onClick: skip, variant:'pill' },
  ], { position: 'bottom-left', caption: 'Shop Controls' });
}

function showGameOverOverlay(){
  uiButtons.show([
    { label:'Restart', title:'Restart Run', onClick: ()=>{ const ev = new KeyboardEvent('keydown', {key:' '}); window.dispatchEvent(ev); }, variant:'wide' }
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
