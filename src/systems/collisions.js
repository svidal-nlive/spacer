// systems/collisions.js - circle-circle bullets vs enemies
import { forEachBullet, deactivateBullet } from '../entities/bullet.js';
import { forEachEnemy, damageEnemy } from '../entities/enemy.js';
export function handleBulletEnemyCollisions(){
  forEachBullet(b=>{
    let hit = false;
    forEachEnemy(e=>{
      if(hit || !e.active) return;
      const dx=b.x-e.x, dy=b.y-e.y, rr=b.r+e.r;
      if(dx*dx+dy*dy<=rr*rr){ damageEnemy(e,b.dmg); hit=true; }
    });
    if(hit) deactivateBullet(b);
  });
}
