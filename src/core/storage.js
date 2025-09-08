// core/storage.js - namespaced localStorage helpers (adapted)
const NS = 'sp_';
export function load(key, def){ try{ const v = localStorage.getItem(NS+key); return v==null?def:JSON.parse(v);}catch{ return def; } }
export function save(key, value){ try{ localStorage.setItem(NS+key, JSON.stringify(value)); }catch{} }
