// scenes/shop.js - between-wave upgrades with countdown
import { canvas, ctx } from '../core/canvas.js';
import { game } from '../core/state.js';
import { setScene, getScene } from '../engine/sceneManager.js';
import { waveScene } from './wave.js';

const CARDS = [
  { id:'dmg', name:'Damage+', stat:'dmg', base:1, inc:0.25, price:20 },
  { id:'rof', name:'Rate of Fire+', stat:'rof', base:7, inc:0.7, price:20 },
  { id:'spd', name:'Bullet Speed+', stat:'bulletSpeed', base:900, inc:90, price:20 },
  { id:'prc', name:'Pierce (Laser)', stat:'pierce', base:0, inc:1, price:35 },
];

function rollCards(){
  const picks = new Set();
  while(picks.size<3){ picks.add(CARDS[Math.floor(Math.random()*CARDS.length)]); }
  return [...picks].map(c=>({ ...c, tier:(game.upgrades[c.stat]||0), cost: Math.round(c.price * (1+ (game.upgrades[c.stat]||0)*0.6)) }));
}

export const shopScene = {
  t: 20, cards: [], locked: new Set(),
  enter(){ this.t = 20; if(!this.cards.length) this.cards = rollCards(); window.dispatchEvent(new CustomEvent('spacer:show-ui', { detail:{ type:'shop' } })); },
  buy(i){ const card = this.cards[i]; if(!card) return; if(game.credits<card.cost) return; game.credits -= card.cost; game.upgrades[card.stat] = (game.upgrades[card.stat]||0)+1; game[card.stat] += card.inc; this.cards[i] = { ...card, tier: card.tier+1, cost: Math.round(card.price * (1+ (card.tier+1)*0.6)) }; },
  reroll(){ const cost = 10; if(game.credits<cost) return; game.credits-=cost; const kept = this.cards.map((c,i)=> this.locked.has(i)? c : null); const rolled = rollCards(); this.cards = kept.map((k,i)=> k || rolled.shift()); },
  lock(i){ if(this.locked.has(i)) this.locked.delete(i); else this.locked.add(i); },
  skip(){ setScene(waveScene); },
  update(dt){
    this.t -= dt; if(this.t<=0){ setScene(waveScene); return; }
    // lazy init hover alpha for smooth fade
    if(!this._hoverAlpha){ this._hoverAlpha = [0,0,0]; }
    const speed = 8; // fade speed
    for(let i=0;i<3;i++){
      const target = (this._hover===i) ? 1 : 0;
      const a = this._hoverAlpha[i] || 0;
      this._hoverAlpha[i] = a + (target - a) * Math.min(1, dt*speed);
    }
  },
  render(){
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(1,0,0,1,0,0);
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.scale(dpr,dpr);
  const wCSS = canvas.width/dpr, hCSS = canvas.height/dpr;
  const narrow = wCSS < 720;
    // responsive font scaling
    const scale = Math.min(1.25, Math.max(0.8, wCSS/1280));
    const headerSize = Math.round(16*scale);
    const titleSize = Math.round(14*scale);
    const smallSize = Math.round(12*scale);
    // dim bg
    ctx.fillStyle='rgba(10,13,18,0.9)'; ctx.fillRect(0,0,wCSS,hCSS);
    // header
    ctx.fillStyle='#b7f3ff'; ctx.font=`${headerSize}px system-ui,sans-serif`;
  const last = game.lastReward;
  const parts = last>0 ? (narrow ? `Last +${last}` : `Last: +${last} (Kills +${game.lastRewardKills}, Clear +${game.lastRewardClear})`) : '';
  const headerText = `Shop — Credits ${game.credits} ${parts ? '— '+parts+' — ' : ''}Next in ${Math.ceil(this.t)}s`;
  const headerTop = 20; const headerLH = headerSize + 6;
  const headerBottom = wrapText(ctx, headerText, 20, headerTop + headerSize, wCSS - 40, headerLH);
    // cards responsive layout
    const x0 = 20, y0 = Math.max(80, (headerBottom || (headerTop + headerSize)) + 24);
    const w = narrow ? (wCSS - 40) : 260;
    const h = 120; const gap = 20;
  let cardsBottom = 0;
  this.cards.forEach((c, i)=>{
      const x = narrow ? x0 : (x0 + i*(w+gap));
      const y = narrow ? (y0 + i*(h+gap)) : y0;
      const canAfford = game.credits >= c.cost;
      ctx.fillStyle='#0f1621'; ctx.fillRect(x,y,w,h);
      ctx.strokeStyle= canAfford? '#1e2f45' : '#1a2635'; ctx.strokeRect(x+0.5,y+0.5,w-1,h-1);
      ctx.fillStyle= canAfford? '#b7f3ff' : '#7e9cb0'; ctx.font=`${titleSize}px system-ui,sans-serif`;
      ctx.fillText(`${c.name}`, x+12, y+10 + titleSize);
      ctx.font=`${smallSize}px system-ui,sans-serif`;
      ctx.fillText(`Tier ${c.tier}  +${c.inc}  Cost ${c.cost}`, x+12, y+10 + titleSize + 8 + smallSize);
      // bottom helper line kept inside card bounds
      ctx.fillText(canAfford? 'Click to buy' : `Need ${c.cost - game.credits} more`, x+12, y+h-10);
      // subtle hover highlight (fade in/out)
      const ha = (this._hoverAlpha && this._hoverAlpha[i]) || 0;
      if(ha > 0.02){
        ctx.save();
        const a1 = Math.min(1, ha);
        ctx.shadowColor = `rgba(37,208,255,${0.53*a1})`;
        ctx.shadowBlur = 10 * a1;
        ctx.strokeStyle = `rgba(37,208,255,${0.33*a1})`;
        ctx.lineWidth = 1 + a1; // from 1 to 2
        ctx.strokeRect(x+1.5, y+1.5, w-3, h-3);
        ctx.restore();
      }
      if(this.locked.has(i)){ ctx.strokeStyle='#25d0ff'; ctx.strokeRect(x+2.5,y+2.5,w-5,h-5); }
      // track bottom of last card actually drawn
      if(y + h > cardsBottom) cardsBottom = y + h;
    });
  // utilities (light, subtle hint line below cards)
  const uy = cardsBottom + (narrow ? 20 : 40);
  ctx.save();
  ctx.globalAlpha = 0.65;
  ctx.fillStyle='#7e9cb0'; ctx.font=`${Math.max(11, smallSize-1)}px system-ui,sans-serif`;
  wrapText(ctx, '[R] Reroll (10)    [L] Toggle Lock on hover    [Space] Skip', 20, uy, wCSS - 40, (smallSize + 6) - 2);
  ctx.restore();
  }
};

// input handling
window.addEventListener('keydown', (e)=>{
  if(getScene()!==shopScene) return;
  const sc = shopScene; if(!sc) return;
  if(e.key.toLowerCase()==='r'){ sc.reroll(); e.preventDefault(); e.stopPropagation(); }
  if(e.key===' '){ sc.skip(); e.preventDefault(); e.stopPropagation(); }
});
canvas.addEventListener('click', (e)=>{
  if(getScene() !== shopScene) return;
  const sc = shopScene; if(!sc || !sc.cards) return;
  const rect = canvas.getBoundingClientRect(); const px = e.clientX - rect.left; const py = e.clientY - rect.top;
  const { narrow, x0, y0, w, h, gap } = computeShopLayout();
  sc.cards.forEach((_, i)=>{
    const x = narrow ? x0 : (x0 + i*(w+gap));
    const y = narrow ? (y0 + i*(h+gap)) : y0;
    if(px>=x && px<=x+w && py>=y && py<=y+h){ sc.buy(i); }
  });
});

canvas.addEventListener('mousemove', (e)=>{ if(getScene()===shopScene) shopScene._hover = getHoverIndex(e); });
window.addEventListener('keydown', (e)=>{
  if(e.key.toLowerCase()==='l'){
    const i = shopScene._hover; if(i!=null) shopScene.lock(i);
  }
});

function getHoverIndex(e){
  const rect = canvas.getBoundingClientRect(); const px = e.clientX - rect.left; const py = e.clientY - rect.top;
  const { narrow, x0, y0, w, h, gap } = computeShopLayout();
  for(let i=0;i<3;i++){
    const x = narrow ? x0 : (x0 + i*(w+gap));
    const y = narrow ? (y0 + i*(h+gap)) : y0; if(px>=x && px<=x+w && py>=y && py<=y+h) return i;
  }
  return null;
}

// simple word-wrap helper for canvas text
function wrapText(ctx, text, x, y, maxWidth, lineHeight){
  const words = text.split(/\s+/);
  let line = '';
  let yy = y;
  for(const w of words){
    const test = line ? line + ' ' + w : w;
    if(ctx.measureText(test).width > maxWidth && line){
      ctx.fillText(line, x, yy);
      line = w;
      yy += lineHeight;
    } else {
      line = test;
    }
  }
  if(line) ctx.fillText(line, x, yy);
  return yy;
}

// Compute layout numbers shared by render and event hit-testing
function computeShopLayout(){
  const dpr = window.devicePixelRatio || 1;
  const wCSS = canvas.width/dpr;
  const narrow = wCSS < 720;
  const scale = Math.min(1.25, Math.max(0.8, wCSS/1280));
  const headerSize = Math.round(16*scale);
  const headerTop = 20; const headerLH = headerSize + 6;
  // estimate header lines using current font metrics
  const prevFont = ctx.font;
  ctx.font = `${headerSize}px system-ui,sans-serif`;
  const last = game.lastReward;
  const parts = last>0 ? (narrow ? `Last +${last}` : `Last: +${last} (Kills +${game.lastRewardKills}, Clear +${game.lastRewardClear})`) : '';
  const headerText = `Shop — Credits ${game.credits} ${parts ? '— '+parts+' — ' : ''}Next in ${Math.ceil((shopScene?.t ?? 0))}s`;
  const maxW = wCSS - 40;
  const lines = measureWrap(ctx, headerText, maxW);
  ctx.font = prevFont;
  const firstBaseline = headerTop + headerSize;
  const headerBottom = firstBaseline + (lines-1)*headerLH;
  const x0 = 20;
  const y0 = Math.max(80, headerBottom + 24);
  const w = narrow ? (wCSS - 40) : 260;
  const h = 120; const gap = 20;
  return { narrow, x0, y0, w, h, gap };
}

function measureWrap(ctx, text, maxWidth){
  const words = (text||'').split(/\s+/);
  let line = '';
  let lines = 0;
  for(const w of words){
    const test = line ? line + ' ' + w : w;
    if(ctx.measureText(test).width > maxWidth && line){
      lines++; line = w;
    } else {
      line = test;
    }
  }
  if(line) lines++;
  return lines || 1;
}
