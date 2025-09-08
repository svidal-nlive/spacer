// engine/loop.js - fixed timestep update + render
import { now } from '../core/rng.js';
let last = 0, acc = 0; const STEP = 1000/60; // ms
let running = false; let update = ()=>{}; let render = ()=>{};
export function start(onUpdate, onRender){ update = onUpdate; render = onRender; running = true; last = now(); requestAnimationFrame(tick); }
export function stop(){ running=false; }
function tick(){ if(!running) return; const t = now(); let dt = t-last; last = t; if(dt>250) dt=250; acc += dt; while(acc>=STEP){ update(STEP/1000); acc -= STEP; } render(acc/STEP); requestAnimationFrame(tick); }
