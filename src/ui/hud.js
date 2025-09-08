// ui/hud.js - draw top bar, heat ring
import { ctx, canvas } from '../core/canvas.js';
import { game } from '../core/state.js';
import { bossActive } from '../entities/boss.js';
export function drawTopBar({score, wave, heat, heatMax, muted, twoXActive, twoXAlpha}){
  const w = canvas.width; const dpr = window.devicePixelRatio || 1; const barH = 32*dpr;
  ctx.save(); ctx.resetTransform(); ctx.scale(dpr,dpr);
  ctx.fillStyle = 'rgba(10,13,18,0.9)'; ctx.fillRect(0,0,w/dpr,barH/dpr);
  ctx.fillStyle = '#b7f3ff'; ctx.font = '12px system-ui, sans-serif';
  const scoreText = `Score ${score.toString().padStart(6,'0')}`;
  const waveText = `  Wave ${wave}`;
  const x0 = 12, y0 = 20;
  ctx.fillText(scoreText + waveText, x0, y0);
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
    ctx.fillStyle = '#0f1621'; ctx.font = '10px system-ui, sans-serif';
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
      ctx.fillStyle = '#0f1621'; ctx.font = '9px system-ui, sans-serif';
      ctx.fillText('2x', bx2+5, y0-1);
      ctx.restore();
    }
  }
  // heat bar
  const meterW = 160, meterH = 8; const x = (w/dpr)-meterW-12, y = 12;
  ctx.fillStyle = '#142231'; ctx.fillRect(x,y,meterW,meterH);
  const pct = Math.min(1, heat/heatMax);
  ctx.fillStyle = pct<0.8? '#25d0ff' : pct<1? '#ffb63b':'#ff4d6d';
  ctx.fillRect(x,y,meterW*pct,meterH);
  ctx.strokeStyle = '#1e2f45'; ctx.strokeRect(x+0.5,y+0.5,meterW-1,meterH-1);
  // mute indicator
  ctx.globalAlpha = muted? 0.8:0.3; ctx.fillStyle = '#b7f3ff'; ctx.fillText(muted?'Muted':'Audio', x-56, 20); ctx.globalAlpha=1;
  // laser toggle badge (tiny)
  const badgeW = 38, badgeH = 14; const bx = x - badgeW - 70; const by = 12;
  ctx.globalAlpha = 0.9; ctx.fillStyle = game.laserEnabled? '#90f5a8' : '#3a4a58';
  ctx.fillRect(bx, by, badgeW, badgeH);
  ctx.strokeStyle = '#1e2f45'; ctx.strokeRect(bx+0.5, by+0.5, badgeW-1, badgeH-1);
  ctx.fillStyle = '#0f1621'; ctx.font='10px system-ui, sans-serif';
  ctx.fillText(game.laserEnabled? 'Laser ON':'Laser OFF', bx+3, by+10);
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
  const x = (wCSS - barW)/2; const y = PAD + TOPBAR_H + GAP;
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
