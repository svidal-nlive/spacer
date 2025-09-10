// core/uiBounds.js - compute UI gutters and playable screen bounds (in CSS px)
import { canvas } from './canvas.js';
// Note: existing gutters are tuned for HUD drawing. Additional helpers below
// provide viewport/title-safe/action-safe bounds for the dev layout overlay.

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

// --- Layout overlay helpers (CSS px) ---
export function getViewportRectCSS(){
  const dpr = window.devicePixelRatio || 1;
  return { x: 0, y: 0, width: canvas.width/dpr, height: canvas.height/dpr };
}

function getLetterboxHeightsCSS(){
  try{
    const dpr = window.devicePixelRatio || 1;
    const hCSS = canvas.height / dpr;
    const k = (window?.spacerLetterboxK ?? 0);
    const bar = Math.round(hCSS * 0.14 * Math.max(0, Math.min(1, k)));
    return { top: bar, bottom: bar };
  }catch{ return { top:0, bottom:0 }; }
}

export function getTitleSafeRectCSS(){
  const vp = getViewportRectCSS();
  const g = getUiGuttersPx();
  const lb = getLetterboxHeightsCSS();
  // side padding ~4% of width, min 12, max 32
  const sidePad = Math.max(12, Math.min(32, Math.round(vp.width * 0.04)));
  const topPad = (g.top || 0) + (lb.top || 0);
  const botPad = (g.bottom || 0) + (lb.bottom || 0);
  return {
    x: vp.x + sidePad,
    y: vp.y + Math.max(12, topPad + 8),
    width: Math.max(0, vp.width - sidePad*2),
    height: Math.max(0, vp.height - Math.max(12, topPad + 8) - Math.max(12, botPad + 8)),
  };
}

export function getActionSafeRectCSS(){
  const ts = getTitleSafeRectCSS();
  // action area slightly smaller than HUD/title-safe; 24px or 6% inset (whichever larger)
  const inset = Math.max(24, Math.round(Math.min(ts.width, ts.height) * 0.06));
  return {
    x: ts.x + inset,
    y: ts.y + inset,
    width: Math.max(0, ts.width - inset*2),
    height: Math.max(0, ts.height - inset*2),
  };
}
