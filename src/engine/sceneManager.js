// engine/sceneManager.js - basic scene switcher
let current = null;
export function setScene(scene){ if(current?.exit) current.exit(); current = scene; current?.enter?.(); }
export function update(dt){ current?.update?.(dt); }
export function render(alpha){ current?.render?.(alpha); }
export function getScene(){ return current; }
