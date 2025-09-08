// core/canvas.js - HiDPI canvas setup (adapted)
export const canvas = document.getElementById('game');
export const ctx = canvas.getContext('2d');
export function setupCanvasSize(){
  const dpr = window.devicePixelRatio || 1;
  const w = Math.floor(window.innerWidth);
  const h = Math.floor(window.innerHeight);
  canvas.style.width = w+'px'; canvas.style.height = h+'px';
  canvas.width = Math.floor(w*dpr); canvas.height = Math.floor(h*dpr);
  ctx.setTransform(dpr,0,0,dpr,0,0);
}
window.addEventListener('resize', setupCanvasSize);
setupCanvasSize();
