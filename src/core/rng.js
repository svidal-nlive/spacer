// core/rng.js - utilities (reused)
export const rand = (min,max)=> Math.random()*(max-min)+min;
export const clamp = (v,a,b)=> Math.max(a, Math.min(b,v));
export const now = ()=> performance.now();
