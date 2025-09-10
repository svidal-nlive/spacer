// engine/inputScheme.js - pluggable input schemes
// Stubs for the new Vertical Stage controls: fixed-forward firing and steer by keys/gamepad/right-click drag.

import { input, keysHeld } from './input.js';
import { game } from '../core/state.js';

// Contract
// - enter()
// - update(dt)
// - getDesiredVelocity(): {vx, vy}
// - getAimAngle(): number

export const schemes = {
  // Default twin-stick: pointer angle aims; primary fires on click/hold.
  twinStick: {
    name: 'twinStick',
    enter(){},
    update(dt){},
    getDesiredVelocity(){ return {vx:0, vy:0}; },
    getAimAngle(){ return input.aimAngle; },
  },
  // Vertical: forward-fixed barrel; ship moves with keys/gamepad; optional right-click drag to steer.
  verticalFixed: {
    name: 'verticalFixed',
    _dragging: false,
    _dragLast: null,
    enter(){ this._dragging=false; this._dragLast=null; },
    update(dt){ /* pointer handling installed once below */ },
    getDesiredVelocity(){
      const left = !!(keysHeld['a']||keysHeld['arrowleft']);
      const right = !!(keysHeld['d']||keysHeld['arrowright']);
      const up = !!(keysHeld['w']||keysHeld['arrowup']);
      const down = !!(keysHeld['s']||keysHeld['arrowdown']);
      let vx = (right?1:0) - (left?1:0);
      let vy = (down?1:0) - (up?1:0);
      const len = Math.hypot(vx,vy)||1; vx/=len; vy/=len;
      return { vx, vy };
    },
    getAimAngle(){
      // Fixed forward (upwards in world space)
      return -Math.PI/2;
    },
  }
};

export let activeScheme = schemes.twinStick;
export function setInputScheme(name){ if(schemes[name]) activeScheme = schemes[name]; }

// Pointer right-button drag to nudge movement (vertical scheme only)
// We attach conservative handlers; schemes can choose to ignore.
window.addEventListener('pointerdown', (e)=>{
  if(e.button===2 || e.pointerType==='touch'){
    activeScheme._dragging = true; activeScheme._dragLast = {x:e.clientX, y:e.clientY};
  }
});
window.addEventListener('pointermove', (e)=>{
  if(activeScheme._dragging){
    const last = activeScheme._dragLast; activeScheme._dragLast = {x:e.clientX, y:e.clientY};
    if(last && activeScheme.name==='verticalFixed'){
      // nudge: small delta contributes to desired movement via global velocity (set on wave update)
      const dx = e.clientX - last.x; const dy = e.clientY - last.y;
      // store on scheme; wave can read and apply as accel
      activeScheme._nudge = { dx, dy, t: performance.now() };
    }
  }
});
window.addEventListener('pointerup', ()=>{ activeScheme._dragging=false; activeScheme._dragLast=null; });
window.addEventListener('contextmenu', (e)=>{
  // prevent default context menu if we're using right-drag for steering
  if(activeScheme?.name==='verticalFixed'){ e.preventDefault?.(); }
});
