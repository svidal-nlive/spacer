// scenes/gameover.js - show final score and best, restart prompt
import { canvas, ctx } from '../core/canvas.js';
import { game } from '../core/state.js';
import { save, load } from '../core/storage.js';
import { setScene, getScene } from '../engine/sceneManager.js';
import { resetBullets } from '../entities/bullet.js';
import { resetEnemies } from '../entities/enemy.js';
import { resetEnemyShots } from '../entities/enemyShot.js';
import { resetPickups } from '../entities/pickup.js';
import { resetEffects } from '../systems/effects.js';
import { waveScene } from './wave.js';
import { uiButtons } from '../ui/buttons.js';

export const gameOverScene = {
  enter(){
    game.best = Math.max(load('best', 0), game.score); save('best', game.best);
  // show a Restart button centered for touch via global UI bus
  window.dispatchEvent(new CustomEvent('spacer:show-ui', { detail:{ type:'gameover' } }));
  },
  update(dt){},
  render(){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle='#b7f3ff'; ctx.font='20px system-ui,sans-serif';
    ctx.fillText('Run Over', 40, 80);
    ctx.font='16px system-ui,sans-serif';
    ctx.fillText(`Score: ${game.score}`, 40, 110);
    ctx.fillText(`Best:  ${game.best}`, 40, 136);
    ctx.fillText('Press Space to restart', 40, 170);
  },
  exit(){ uiButtons.clear(); }
};

window.addEventListener('keydown', (e)=>{
  if(getScene()!==gameOverScene) return;
  if(e.key===' '){
    restartRun(); e.preventDefault(); e.stopPropagation();
  }
});

function restartRun(){
  // reset minimal state
  game.score=0; game.wave=1; game.lives=3; game.credits=0; game.heat=0; game.overheated=false;
  game.invulnT = 0; game.screenFlash = 0; game.readyFlashQ=0; game.readyFlashE=0;
  // clear power-ups, stacks, and cooldowns
  game.powerups = { rapidT:0, spreadT:0, shieldT:0, slowT:0, twoXT:0 };
  game.pickupStacks = { rapid:0, spread:0, shield:0, slow:0, twox:0, bomb:0 };
  game.stackPulse = { rapid:0, spread:0, shield:0, slow:0, twox:0, bomb:0 };
  game.abilQ_cd = 0; game.abilE_cd = 0;
  // clear world entities/effects for a fresh map
  resetBullets(); resetEnemies(); resetEnemyShots(); resetPickups(); resetEffects();
  setScene(waveScene);
}
