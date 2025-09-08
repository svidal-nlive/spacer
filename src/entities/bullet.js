// entities/bullet.js - simple pooled bullets
const POOL_SIZE = 512;
const pool = Array.from({length: POOL_SIZE}, ()=>({active:false,x:0,y:0,vx:0,vy:0,r:3,dmg:1,ttl:1}));
export function spawnBullet(x,y,angle,{speed=900,dmg=1,ttl=1}={}){
  const b = pool.find(o=>!o.active); if(!b) return null;
  b.active=true; b.x=x; b.y=y; b.vx=Math.cos(angle)*speed; b.vy=Math.sin(angle)*speed; b.r=3; b.dmg=dmg; b.ttl=ttl; return b;
}
export function updateBullets(dt){ for(const b of pool){ if(!b.active) continue; b.x += b.vx*dt; b.y += b.vy*dt; b.ttl -= dt; if(b.ttl<=0 || Math.abs(b.x)>4000 || Math.abs(b.y)>4000){ b.active=false; } } }
export function forEachBullet(fn){ for(const b of pool){ if(b.active) fn(b); } }
export function deactivateBullet(b){ b.active=false; }
export function resetBullets(){ for(const b of pool){ b.active=false; } }
export function drawBullets(ctx){ ctx.save(); ctx.fillStyle='#b7f3ff'; for(const b of pool){ if(!b.active) continue; ctx.beginPath(); ctx.arc(b.x,b.y,b.r,0,Math.PI*2); ctx.fill(); } ctx.restore(); }
