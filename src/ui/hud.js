// ui/hud.js - draw top bar, heat ring
import { ctx, canvas } from '../core/canvas.js';
import { game } from '../core/state.js';
import { getUiGuttersPx } from '../core/uiBounds.js';
import { bossActive } from '../entities/boss.js';
export function drawTopBar({score, wave, heat, heatMax, muted, twoXActive, twoXAlpha}){
  const w = canvas.width; const dpr = window.devicePixelRatio || 1; const barH = 32*dpr;
  const safeTop = (window.visualViewport?.offsetTop || 0) + (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('padding-top'))||0);
  const cssSafeTop = Math.max(0, (typeof window !== 'undefined' ? (window.safeAreaInsetTop||0) : 0));
  ctx.save(); ctx.resetTransform(); ctx.scale(dpr,dpr);
  // underlay: draw top UI gutter first so subsequent HUD text renders on top
  const gutters = getUiGuttersPx();
  if(gutters.top > 0){
    const wCSS = canvas.width/dpr; const y0 = 0; const gh = gutters.top;
    ctx.fillStyle = 'rgba(10,13,18,0.85)';
    ctx.fillRect(0, y0, wCSS, gh);
    ctx.strokeStyle = '#1e2f45';
    ctx.beginPath(); ctx.moveTo(0.5, gh-0.5); ctx.lineTo(wCSS-0.5, gh-0.5); ctx.stroke();
  }
  // top bar shifted by safe-area inset top
  ctx.fillStyle = 'rgba(10,13,18,0.9)'; ctx.fillRect(0,0 + 0,w/dpr,barH/dpr);
  // clamp font for readability on small devices
  const hudFontPx = Math.max(12, Math.min(14, Math.round(12 * (window.innerWidth<=380? 1.05 : 1))));
  ctx.fillStyle = '#b7f3ff'; ctx.font = `${hudFontPx}px system-ui, sans-serif`;
  const scoreText = `Score ${score.toString().padStart(6,'0')}`;
  let waveText = `  Wave ${wave}`;
  const x0 = 12, y0 = 20; // baseline within bar
  // prevent overlap with heat meter by truncating tail if needed
  const meterW = 160, meterH = 8;
  const meterX = (w/dpr) - meterW - 12;
  const maxTextW = meterX - 8 - x0; // 8px gap
  let full = scoreText + waveText;
  if(ctx.measureText(full).width > maxTextW){
    // try truncating wave text with ellipsis
    const prefixW = ctx.measureText(scoreText).width;
    const avail = Math.max(0, maxTextW - prefixW);
    const ell = '…';
    let trimmed = waveText;
    while(trimmed.length > 0 && ctx.measureText(trimmed + ell).width > avail){
      trimmed = trimmed.slice(0, -1);
    }
    waveText = trimmed + (trimmed.length < (waveText.length) ? ell : '');
    full = scoreText + waveText;
  }
  ctx.fillText(full, x0, y0);
  // x2 gold badge glow near score when active
  if(twoXActive){
    const alpha = Math.max(0, Math.min(1, twoXAlpha==null? 1 : twoXAlpha));
    const sw = ctx.measureText(scoreText).width;
    const bx = x0 + sw + 8; const by = y0 - 10; const bw = 22; const bh = 14;
    // glow
    ctx.save(); ctx.globalAlpha = alpha;
    ctx.shadowColor = '#ffd166'; ctx.shadowBlur = 10; ctx.fillStyle = '#ffd16622';
    ctx.fillRect(bx-2, by-2, bw+4, bh+4);
    ctx.restore();
    // pill
    ctx.save(); ctx.globalAlpha = alpha;
    ctx.fillStyle = '#ffd166'; ctx.strokeStyle = '#1e2f45';
    roundRect(ctx, bx, by, bw, bh, 6, true, true);
  ctx.fillStyle = '#0f1621'; ctx.font = `${Math.max(9, hudFontPx-2)}px system-ui, sans-serif`;
    ctx.fillText('2x', bx+6, y0-1);
    ctx.restore();

    // mirror a tiny 2x near credits within the wave text
    const creditIconIdx = waveText.indexOf('ⓒ');
    if(creditIconIdx>=0){
      // include digits after the credit icon
      let i = creditIconIdx + 1;
      while(i < waveText.length && /[0-9]/.test(waveText[i])) i++;
      const prefix = waveText.slice(0, i);
      const preW = ctx.measureText(scoreText + prefix).width;
      const bx2 = x0 + preW + 6; const by2 = by + 2; const bw2 = 18; const bh2 = 12;
      ctx.save(); ctx.globalAlpha = alpha;
      ctx.fillStyle = '#ffd166'; ctx.strokeStyle = '#1e2f45';
      roundRect(ctx, bx2, by2, bw2, bh2, 5, true, true);
  ctx.fillStyle = '#0f1621'; ctx.font = `${Math.max(8, hudFontPx-3)}px system-ui, sans-serif`;
      ctx.fillText('2x', bx2+5, y0-1);
      ctx.restore();
    }
  }
  // heat bar (vertical mode may hide or reflect expanded policy later; for now always show)
  const x = (w/dpr)-meterW-12, y = 12;
  ctx.fillStyle = '#142231'; ctx.fillRect(x,y,meterW,meterH);
  const pct = Math.min(1, heat/heatMax);
  ctx.fillStyle = pct<0.8? '#25d0ff' : pct<1? '#ffb63b':'#ff4d6d';
  ctx.fillRect(x,y,meterW*pct,meterH);
  ctx.strokeStyle = '#1e2f45'; ctx.strokeRect(x+0.5,y+0.5,meterW-1,meterH-1);
  // remove text label near the heat meter to avoid confusion and clutter
  // (heat meter alone communicates overheat state clearly)
  // draw bottom UI gutter after HUD so it overlays the playfield
  if(gutters.bottom > 0){
    const wCSS = canvas.width/dpr;
    const yStart = (canvas.height/dpr) - gutters.bottom;
    ctx.fillStyle = 'rgba(10,13,18,0.85)';
    ctx.fillRect(0, yStart, wCSS, gutters.bottom);
    ctx.strokeStyle = '#1e2f45';
    ctx.beginPath(); ctx.moveTo(0.5, yStart+0.5); ctx.lineTo(wCSS-0.5, yStart+0.5); ctx.stroke();
  }
  ctx.restore();
}
export function drawHeatRing(cx, cy, r, pct){
  const start = -Math.PI/2; const end = start + Math.PI*2*pct;
  ctx.save();
  ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.strokeStyle='#132033'; ctx.lineWidth=4; ctx.stroke();
  ctx.beginPath(); ctx.arc(cx,cy,r,start,end); ctx.strokeStyle=pct<0.8? '#25d0ff' : pct<1? '#ffb63b':'#ff4d6d'; ctx.lineWidth=4; ctx.stroke();
  ctx.restore();
}

export function drawBossBar(name, hp, maxHp){
  if(!bossActive() || maxHp<=0) return;
  const dpr = window.devicePixelRatio || 1; const PAD = 12; const TOPBAR_H = 32; const GAP = 8;
  const wCSS = canvas.width/dpr; const barW = Math.min(420, wCSS - PAD*2); const barH = 10;
  // nudge down slightly on very short screens to avoid crowding
  const x = (wCSS - barW)/2;
  // account for letterbox top height (CSS px) so bar is not hidden
  let letterboxTopCSS = 0;
  try {
    const hCSS = canvas.height/dpr;
    const k = (window?.spacerLetterboxK ?? 0);
    letterboxTopCSS = Math.round(hCSS * 0.14 * k);
  } catch {}
  const y = letterboxTopCSS + PAD + TOPBAR_H + (window.innerHeight<=700? GAP*0.5 : GAP);
  const pct = Math.max(0, Math.min(1, hp/maxHp));
  ctx.save(); ctx.resetTransform(); ctx.scale(dpr,dpr);
  ctx.fillStyle = 'rgba(10,13,18,0.9)'; ctx.fillRect(x, y, barW, barH);
  ctx.strokeStyle = '#1e2f45'; ctx.strokeRect(x+0.5, y+0.5, barW-1, barH-1);
  ctx.fillStyle = '#ff6b6b'; ctx.fillRect(x, y, barW*pct, barH);
  ctx.fillStyle = '#ffd3d3'; ctx.font='11px system-ui,sans-serif'; ctx.textAlign='center';
  ctx.fillText(`${name}`, x + barW/2, y - 4);
  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r, fill, stroke){
  if (w < 2 * r) r = w / 2; if (h < 2 * r) r = h / 2;
  ctx.beginPath();
  ctx.moveTo(x+r, y);
  ctx.arcTo(x+w, y,   x+w, y+h, r);
  ctx.arcTo(x+w, y+h, x,   y+h, r);
  ctx.arcTo(x,   y+h, x,   y,   r);
  ctx.arcTo(x,   y,   x+w, y,   r);
  ctx.closePath();
  if (fill) ctx.fill(); if (stroke) ctx.stroke();
}

// bottom gutter height retrieval moved to core/uiBounds.js
