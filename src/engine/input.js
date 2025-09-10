// engine/input.js - mouse/touch/gamepad aim+fire + basic keyboard state
import { canvas } from '../core/canvas.js';
export const input = { aimAngle: 0, firing: false, secondaryHold: false, gamepadIndex: null, _prevButtons: [], gpQTriggered:false, gpETriggered:false, isTouch: false };
// export a simple keysHeld map for movement-oriented schemes
export const keysHeld = Object.create(null);
// naive touch capability detection; refined on first pointerdown
try{ input.isTouch = (navigator.maxTouchPoints&&navigator.maxTouchPoints>0) || ('ontouchstart' in window); }catch{}
function getAngleFromPointer(clientX, clientY){
  const rect = canvas.getBoundingClientRect();
  const x = clientX - rect.left - rect.width/2;
  const y = clientY - rect.top - rect.height/2;
  return Math.atan2(y, x);
}
canvas.addEventListener('pointerdown', e=>{ input.firing = true; input.aimAngle = getAngleFromPointer(e.clientX, e.clientY); if(e.pointerType==='touch') input.isTouch = true; });
canvas.addEventListener('pointermove', e=>{ input.aimAngle = getAngleFromPointer(e.clientX, e.clientY); });
window.addEventListener('pointerup', ()=>{ input.firing = false; });
// track key state (lowercased); used by top-down/vertical modes
window.addEventListener('keydown', (e)=>{
  const k = (e.key||'').toLowerCase();
  if(!k) return;
  keysHeld[k] = true;
});
window.addEventListener('keyup', (e)=>{
  const k = (e.key||'').toLowerCase();
  if(!k) return;
  keysHeld[k] = false;
});
export function pollGamepad(){
  const pads = navigator.getGamepads?.(); if(!pads) return; const idx = input.gamepadIndex ?? 0; const gp = pads[idx]; if(!gp) return;
  const axX = gp.axes[0]||0, axY = gp.axes[1]||0; if(Math.hypot(axX,axY)>0.2){ input.aimAngle = Math.atan2(axY, axX);} input.firing = gp.buttons[0]?.pressed || input.firing;
  // edge-detect LB/RB (buttons 4 and 5)
  const prev = input._prevButtons; input.gpQTriggered = false; input.gpETriggered = false;
  const lb = !!gp.buttons[4]?.pressed; const rb = !!gp.buttons[5]?.pressed;
  if(lb && !prev[4]) input.gpQTriggered = true;
  if(rb && !prev[5]) input.gpETriggered = true;
  input._prevButtons[4] = lb; input._prevButtons[5] = rb;
}
