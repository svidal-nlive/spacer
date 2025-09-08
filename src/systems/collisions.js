// systems/collisions.js - circle-circle bullets vs enemies
import { forEachBullet, deactivateBullet } from '../entities/bullet.js';
import { forEachEnemy, damageEnemy } from '../entities/enemy.js';
import { bossActive, damageBoss, boss } from '../entities/boss.js';
export function handleBulletEnemyCollisions(){
  forEachBullet(b=>{
    let hit = false;
    forEachEnemy(e=>{
      if(hit || !e.active) return;
      const dx=b.x-e.x, dy=b.y-e.y, rr=b.r+e.r;
      if(dx*dx+dy*dy<=rr*rr){ damageEnemy(e,b.dmg); hit=true; }
    });
    if(!hit && bossActive()){
      const dx = b.x - boss.x, dy = b.y - boss.y, rr = b.r + boss.r;
      if(dx*dx + dy*dy <= rr*rr){ damageBoss(b.dmg); hit=true; }
    }
    if(hit) deactivateBullet(b);
  });
}
