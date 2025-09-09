// core/uiBounds.js - compute UI gutters and playable screen bounds (in CSS px)
import { canvas } from './canvas.js';

// Detect if the on-screen button overlay is anchored near a screen edge
function measureOverlayHeightNear(edge){
  try{
    const el = document.getElementById('ui-buttons-overlay');
    if(!el) return 0;
    const style = getComputedStyle(el);
    if(style.display === 'none') return 0;
    const r = el.getBoundingClientRect();
    if(edge === 'bottom'){
      const near = (window.innerHeight - r.bottom) < 80;
      return near ? Math.ceil(r.height + 24) : 0; // include breathing room
    }
    if(edge === 'top'){
      const near = r.top < 80;
      return near ? Math.ceil(r.height + 24) : 0;
    }
    return 0;
  }catch{ return 0; }
}

export function getUiGuttersPx(){
  const dpr = window.devicePixelRatio || 1;
  const hCSS = canvas.height / dpr;
  // Base top gutter: top HUD bar (32) + a small gap under it for clarity
  const TOPBAR_H = 32; const HUD_GAP = 8;
  let top = TOPBAR_H + HUD_GAP;
  // If the overlay is anchored near the top, add its height too
  top += measureOverlayHeightNear('top');
  // Bottom gutter purely from bottom-anchored overlay height
  let bottom = 0;
  bottom += measureOverlayHeightNear('bottom');
  // Clamp so gutters never exceed screen height
  const maxGutters = Math.max(0, Math.min(hCSS - 40, top + bottom));
  if(top + bottom > maxGutters){
    // proportionally reduce to fit
    const scale = maxGutters / (top + bottom);
    top = Math.round(top * scale); bottom = Math.round(bottom * scale);
  }
  return { top, bottom };
}

export function getPlayableScreenBounds(){
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.width / dpr; const h = canvas.height / dpr;
  const g = getUiGuttersPx();
  const x = 0; const y = g.top; const width = w; const height = Math.max(0, h - g.top - g.bottom);
  return { x, y, width, height };
}
