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
  enter(){ this.stageY = 0; },
  update(dt){ this.stageY += 40*dt; /* slow autoscroll placeholder */ },
  applyCamera(ctx, camZoom, cx, cy){
    // scroll upward by stageY
    ctx.setTransform(camZoom,0,0,camZoom,cx,cy + game.player.y - this.stageY);
  },
  getPlayerWorld(){ return {x: game.playerPos.x, y: game.playerPos.y + this.stageY}; },
};

const modes = { ring: ringMode, vertical: verticalMode };

export function getArena(){ return modes[game.arenaMode] || ringMode; }
export function setArena(mode){
  if(modes[mode]){ game.arenaMode = mode; modes[mode].enter?.(); }
}
