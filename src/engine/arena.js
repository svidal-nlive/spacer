// engine/arena.js - arena mode router and vertical-stage scaffold
// This module defines stubs to support multiple arena modes.
// Modes:
// - 'ring' (default): stationary turret at origin; enemies spawn around.
// - 'vertical' (new): top-down scroller with player ship moving within bounds.

import { game } from '../core/state.js';
import { canvas } from '../core/canvas.js';

// Minimal contract for an arena mode implementation
// - enter(): called when mode is activated
// - update(dt): tick world-space transforms unique to the mode
// - applyCamera(ctx): set transform before drawing world entities
// - getPlayerWorld(): returns {x,y} for weapons/abilities origin

const ringMode = {
  name: 'ring',
  enter(){ /* no-op */ },
  update(dt){ /* no-op for now */ },
  applyCamera(ctx, camZoom, cx, cy){
    ctx.setTransform(camZoom,0,0,camZoom,cx,cy + game.player.y);
  },
  getPlayerWorld(){ return {x:0,y:0}; },
};

// Vertical stage stub — scrolling top-down playfield.
// TODOs:
// - implement stageScrollY and parallax layers
// - clamp player inside playable bounds (below boss barrier when active)
// - add timeline hooks for formations and pickups
const verticalMode = {
  name: 'vertical',
  stageY: 0,
  speed: 60, // px/s autoscroll
  parallax: [ {k:0.2, seed:1234}, {k:0.45, seed:5678}, {k:0.75, seed:9012} ],
  enter(){ this.stageY = 0; },
  update(dt){ this.stageY += this.speed*dt; },
  applyCamera(ctx, camZoom, cx, cy){
    // scroll upward by stageY
    ctx.setTransform(camZoom,0,0,camZoom,cx,cy + game.player.y - this.stageY);
    // draw simple parallax backdrop behind world (stars as dots)
    try{ this._drawParallax(ctx, camZoom, cx, cy); }catch{}
  },
  getPlayerWorld(){ return {x: game.playerPos.x, y: game.playerPos.y + this.stageY}; },
  // naive starfield parallax
  _rand(seed){ let s = seed|0; s ^= s<<13; s ^= s>>>17; s ^= s<<5; return (s>>>0)/0xffffffff; },
  _drawParallax(ctx, camZoom, cx, cy){
    const dpr = window.devicePixelRatio||1; const w = (canvas.width/dpr); const h = (canvas.height/dpr);
    ctx.save(); ctx.resetTransform(); ctx.scale(dpr,dpr);
    // dark sky
    ctx.fillStyle = '#0a0e14'; ctx.fillRect(0,0,w,h);
    // layers
    for(const layer of this.parallax){
      const density = 0.0016 * (layer.k*1.2); // stars per px^2
      const count = Math.floor(w*h*density/80)+20;
      const offY = (this.stageY*layer.k) % (h*2);
      ctx.fillStyle = `rgba(183,243,255,${0.35+0.25*layer.k})`;
      for(let i=0;i<count;i++){
        const r1 = this._rand(layer.seed + i*97 + 1);
        const r2 = this._rand(layer.seed + i*197 + 2);
        const x = (r1 * (w+40)) - 20;
        let y = (r2 * (h*2)) - offY; // repeat every 2h
        // wrap
        if(y< -20) y += h*2; if(y> h*2) y -= h*2;
        const sz = (0.5 + 1.5*layer.k) * (0.6 + 0.8*(this._rand(layer.seed+i*313)%1));
        ctx.fillRect(Math.floor(x), Math.floor(y - h), sz, sz);
      }
    }
    ctx.restore();
  },
};

const modes = { ring: ringMode, vertical: verticalMode };

export function getArena(){ return modes[game.arenaMode] || ringMode; }
export function setArena(mode){
  if(modes[mode]){ game.arenaMode = mode; modes[mode].enter?.(); }
}
