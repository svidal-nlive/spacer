# Spacer – Refactor Plan

This document outlines the system design, feature scope, and implementation plan to adapt `galaga-reloaded` into `spacer` with a circular‑arena turret core loop.

## Guiding constraints

- Keep neon‑on‑midnight aesthetic; Canvas‑based rendering for both gameplay and HUD.
- Inputs: mouse/touch drag to aim, hold to fire; Q/E abilities; gamepad support.
- Short escalating waves with a between‑wave shop; overheat is a core limiter.

## Requirements checklist

- Core loop: rotate, fire, manage heat, collect power‑ups, survive waves, shop, repeat.
- Controls: mouse, touch, and gamepad; abilities on Q/E; pause/mute/fullscreen in top bar.
- Systems: overheat, power‑ups, abilities (Pulsar/EMP), camera zoom cadence.
- Enemies: geometric swarms from rim; tanks, elites, strikers, milestone bosses.
- Shop: upgrade cards with tiers, prices, reroll/lock/skip, countdown.
- Progression: lives, waves with callouts, score and best run persistence.
- Presentation: clean neon HUD, minimal clutter during battle, tasteful SFX/juice.
- Tech: single Canvas; modular JS; reuse core utils from `galaga-reloaded` where sensible.

## High‑level architecture

- Game loop: fixed‑timestep update with render on rAF; clamp large dt.
- SceneManager: Boot/Attract -> Wave -> Shop -> GameOver.
- Subsystems: Input, Audio, RNG, Storage, UI/HUD, Camera, Spawner/Waves, Shop.
- Entities: Turret, Bullet, Enemy (archetypes via behaviors), Pickup, Projectile, Effect.
- Coordinates: arena in polar (r, θ) mapped to canvas (x, y); center‑anchored turret.

## Core data contracts (draft)

- GameState: { scene, score, best, credits, wave, lives, options: { muted, fullscreen }, rngSeed }
- PlayerState: { angle, heat, heatMax, heatRate, heatCool, overheatedUntil, canFire, abilities: { pulsar: { readyAt, level }, emp: { readyAt, level } }, upgrades: { damage, rof, bulletSpeed, pierce } }
- Enemy: { id, type, r, theta, hp, speed, armor, stunnedUntil, radius }
- Bullet: { id, x, y, vx, vy, dmg, pierce, ttl, radius }
- Pickup: { id, kind, x, y, ttl, apply(player, game), expire(player, game) }
- WaveDef: { id, spawnBudget, patterns[], boss?: boolean }
- Card: { id, name, stat, tier, price, locked?: boolean }

## Scenes and flow

1. Boot/Attract: title, controls hint, press to start; loads saved best and options.
2. Wave: gameplay; HUD heat meter, lives, score, wave label; spawning and camera cadence.
3. Shop: upgrade cards (3–5), reroll/lock/skip, countdown; show credits and preview deltas.
4. GameOver: run summary, best score check, prompt to restart.

## Systems detail

### Overheat

- Heat increases while firing: heat += heatRate * dt; decreases when not firing: heat -= heatCool * dt.
- On reaching heatMax, enter lockout for N seconds; cannot fire until heat <= coolThreshold.
- HUD arc around turret and top bar meter show heat; screen tint/steam effect on overheat.

### Weapons and bullets

- Base: single bullet along aim with base damage, rof, speed; upgrades modify these.
- Pierce: allows bullets to pass through up to P targets; each hit decrements pierce.
- Spread: temporary power‑up adds angled extra bullets; Rapid increases rof; BulletSpeed boosts velocity.
- Object pooling for bullets to keep GC low.

### Power‑ups (momentary pickups)

- RAPID (+x% rof), SPREAD (+N side bullets), SLOW (enemy speed x0.y), SHIELD (temp one‑hit block), 2x (score/credits multiplier), BOMB (AOE nuke). Duration 8–15s.
- Spawn from destroyed enemies with drop rates that scale by wave; visible timers in HUD.

### Abilities (earned as you advance)

- Pulsar (Q): radial shockwave from turret. Clears enemy projectiles; damages enemies with 1/r falloff. Cooldown, leveled by upgrades.
- EMP (E): forward cone; stuns standard enemies and strips 1 armor layer from armored types. Cooldown, leveled by upgrades.

### Camera cadence

- Zooms in subtly (scale 1.0 → 1.15) with wave intensity (enemy count/projectiles); resets to 1.0 in Shop and between waves. Smooth easing.

### Enemies

- Tank (slow, high HP), Elite (fast, weaving), Striker (armored dash), Boss (milestones: 5, 10, ...).
- Behaviors defined per type; later add projectile shooters and shielded variants.
- Spawn from rim radius R and advance inward; avoidance and rush mechanics force heat management.

### Waves and spawner

- WaveDef budget and patterns (rings, arcs, alternating types). Difficulty curve increases HP/speed and density.
- Performance scoring: time‑to‑clear, damage taken, overheat events; converts to credits.

### Shop and upgrades

- Card pool: Damage+, Rate of Fire+, Bullet Speed+, Pierce (Laser). Tiers raise effect and cost.
- Utilities: Reroll (costs credits), Lock (reserve a card for next shop), Skip (bank credits; start sooner).
- 20s countdown; auto‑start next wave when timer ends or shop closed.

### HUD and UI

- Top bar: Pause, Mute, Fullscreen; score and wave; tiny indicators for active power‑ups.
- Heat meter: circular arc around turret (in‑arena) and optional bar in top bar.
- Callouts: “WAVE N” cinematic; pre‑wave tip at bottom; minimal mid‑wave text.

### Persistence

- LocalStorage: best score, audio prefs, last keybindings (if remapping later).

## Module/file map (proposed)

- index.html, styles.css, src/main.js
- src/core/: audio.js, rng.js, storage.js, canvas.js, events.js (reuse from `galaga-reloaded` where possible)
- src/engine/: loop.js, sceneManager.js, camera.js, input.js
- src/entities/: turret.js, enemy.js, bullet.js, pickup.js, effects.js
- src/systems/: combat.js, heat.js, collisions.js, spawner.js, powerups.js, abilities.js, shop.js
- src/scenes/: boot.js, wave.js, shop.js, gameover.js
- src/ui/: hud.js, callouts.js, buttons.js
- assets/: minimal SFX place‑holders; visual style via Canvas (no external sprites required)

## Milestones and acceptance

- M1 (playable loop): aim/fire, heat/lockout, basic enemy with collisions, bullets, RAPID/SPREAD pickups, HUD heat + score, pause/mute. 60 FPS smoke test.
- M2 (waves + shop): wave progression, credits, upgrade cards (damage/rof/speed/pierce), reroll/lock/skip with countdown.
- M3 (abilities + variety): Pulsar and EMP with cooldowns, enemy archetypes, camera cadence, 2–3 new power‑ups.
- M4 (polish): SFX, callouts, best‑score persistence, screen shake/flash, tuning, accessibility toggles.

## Tech plan

- Reuse `galaga-reloaded/src/core` modules for audio, rng, storage, canvas/events with minimal tweaks.
- Keep ES modules; simple dev server (Vite or static) and Playwright smoke test.
- Object pooling for bullets and effects; minimal allocations in hot paths.

## Test plan

- Unit: heat math, collisions (circle‑circle), wave budget correctness, card pricing tiers.
- Integration: end‑to‑end “start → clear wave → shop → next wave” smoke with Playwright.
- Performance: frame time under 16ms at 1080p with 200+ active objects.

## Risks and mitigations

- Input complexity (mouse/touch/gamepad): centralize mapping and normalize axes; fallbacks when unsupported.
- Overheat feel: expose tuning constants; add debug overlay to visualize heat and DPS.
- Camera zoom nausea: cap range, smooth easing, disable in options.

## Next steps

1. Scaffold `spacer` project structure and copy core utils from `galaga-reloaded`.
2. Implement engine loop, input, and HUD heat arc with a static turret.
3. Add bullets, enemies, collisions; tune overheat.
4. Introduce waves and basic shop UI; wire upgrade effects.
5. Layer abilities and additional enemy patterns; add camera cadence.
