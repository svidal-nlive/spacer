// core/events.js - tiny pub/sub (reused)
const listeners = new Map();
export function on(type, fn){ let set = listeners.get(type); if(!set){ set = new Set(); listeners.set(type,set);} set.add(fn); }
export function off(type, fn){ listeners.get(type)?.delete(fn); }
export function emit(type, payload){ listeners.get(type)?.forEach(fn=>fn(payload)); }
