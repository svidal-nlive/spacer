// core/audio.js - audio context + beep (adapted)
import { load, save } from './storage.js';
let audioCtx; let muted = load('muted', false);
export function initAudio(){ if(!audioCtx) audioCtx = new (window.AudioContext||window.webkitAudioContext)(); }
export function isMuted(){ return muted; }
export function toggleMute(){ muted = !muted; save('muted', muted); return muted; }
export function beep({freq=440, freqEnd=null, type='square', duration=0.06, gain=0.02, attack=0.005, release=0.04}={}){
  if(!audioCtx || muted) return;
  const o = audioCtx.createOscillator(); const g = audioCtx.createGain();
  o.type=type; o.frequency.value=freq;
  o.connect(g).connect(audioCtx.destination);
  const t = audioCtx.currentTime;
  // gain envelope
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(gain, t+attack);
  g.gain.setTargetAtTime(0.0001, t+duration, release);
  // optional tiny pitch sweep
  if(typeof freqEnd === 'number'){
    o.frequency.setValueAtTime(freq, t);
    o.frequency.linearRampToValueAtTime(freqEnd, t+duration);
  }
  o.start(t);
  o.stop(t + duration + release*2);
}
