# Developer Checklist — Spacer

Keep this checklist up to date. Any time you add a feature (even partially), do both:
- Move/mark the item into the correct section below and adjust its subtasks.
- Update the "Recommended next steps" section just after the checklist to reflect the new reality.

Tip: For partial implementations, leave boxes unchecked, but add a short note after the item like "(phase 1 done: spawn + visuals)".

---

## Checklist (grouped by scope)

### A) Discussed but not yet implemented

#### Enemies (Core Archetypes)
- [ ] Flanker (fast, circle-strafe behavior; short windup dash)
	- [ ] Polish: dash telegraph, afterimage trail, distinct audio swish
- [ ] Artillery (keeps distance; lobbed arcing shots with AOE on impact)
	- [ ] Polish: ground impact decal, soft screen bump on close hits
- [ ] Support (heals/shields allies; prioritizes elites/bosses)
	- [ ] Polish: beam link VFX, heal tick SFX, colorblind-safe cue
- [ ] Burster (suicide diver; on-death radial shards)
	- [ ] Polish: fuse glow, expanding warning ring, shard twinkle SFX

#### Enemy Elites & Modifiers
- [x] Elite framework (affixes applied on spawn: Shielded, Swift, Juggernaut, Cold, Volatile; weighted, optional stacking later waves)
	- [x] Basic: stat mods, per-wave chance scaling, spawn stinger
	- [x] UX: elite outline + name tag fade
	- [x] Hooks: unique death burst per affix (Cold, Volatile implemented; others pending)
	- [ ] More affixes: Cold, Volatile (not implemented)
- [ ] Affix pool with stacking caps and weighted rarity
	- [ ] Polish: spawn stinger SFX, subtle screen vignette while an elite is alive

#### Bosses
- [ ] Boss system: multi-phase, HP bar, arena locks, telegraphs
	- [ ] Polish: intro banner, phase transition SFX, shake with cooldown
- [ ] Boss 1 — The Overseer (spiral barrages, sweeping beam, minion summon)
	- [ ] Polish: beam charge-up light, phase voice ping, distinctive theme loop
- [ ] Boss 2 — The Devourer (vacuum pull, vomit mines, armor plates weakpoints)
	- [ ] Polish: weakpoint sparkle cue, mine hiss loop, damage armor flakes

#### Projectile Types & Patterns
- [ ] Homing shards (slow correction; reacquisition on miss)
	- [ ] Polish: seek trail particles, homing-tightness upgrade hook
- [ ] Boomerang blades (out-and-back path; pierce 1 on outbound)
	- [ ] Polish: Doppler whoosh, spin sprite
- [ ] Mines (sticky on arena; arm → blink → explode into rings)
	- [ ] Polish: blinking LED cadence, danger marker text
- [ ] Laser sweepers (enemy line lasers with warning sweep arcs)
	- [ ] Polish: pre-beam laser sight, bloom on hit, lingering scorch
- [ ] Pattern library (spiral, rings, waves, cones, Lissajous)
	- [ ] Polish: pattern-specific colorways and tempo

#### Player Weapons & Systems
- [ ] Weapon slots and switching (primary/secondary with unique stats)
	- [ ] Polish: quick-swap SFX, small HUD slot icons
- [ ] Shotgun (spread, falloff; heat-efficient burst)
	- [ ] Polish: muzzle flash cones, pellet tracers
- [ ] Railgun (charge → piercing beam; overheat-heavy)
	- [ ] Polish: screen scanline shimmer, impact sparks
- [ ] Missile pod (lock-on n targets, salvo cadence)
	- [ ] Polish: lock boxes UI, smoke trails, mini explosions
- [ ] DoT ammo (burn, shock, slow procs hooked to upgrades)
	- [ ] Polish: status icons on enemies, tick SFX

#### Player Special Abilities
- [ ] Dash/Blink (i-frames, cancel shots briefly)
	- [ ] Polish: chromatic streak, subtle time stretch
- [ ] Time Dilation (slow nearby projectiles/enemies)
	- [ ] Polish: ripple shader, lowpass filter on audio
- [ ] Kinetic Barrier (temporary shield that reflects shots)
	- [ ] Polish: hex shader, ping when reflecting
- [ ] Gravity Well (pull + DoT; combo with Pulsar/EMP)
	- [ ] Polish: spiral particles, bass rumble
- [ ] Drone Buddy (orbiting helper with its own upgrade path)
	- [ ] Polish: chirp SFX, tiny LED ring to indicate state

#### Enemy AI & Encounters
- [ ] Formations & waves (V, line, pincer; timed mixes)
	- [ ] Polish: entrance telegraphs, formation VO callout
- [ ] Behavior layers (kite, focus-fire, retreat to heal)
	- [ ] Polish: intent emotes over heads, subtle path ribbons
- [ ] Spawners (corner/edge portals with cadence and quotas)
	- [ ] Polish: portal VFX, spawn hum loop

#### Meta & Progression (optional for v1)
- [ ] Unlock tracks (new weapons/abilities via milestones)
	- [ ] Polish: unlock splash card, confetti burst
- [ ] Daily/Weekly modifiers (mutators, score boards)
	- [ ] Polish: seed code display, special banner

---

### B) Started but unfinished

- [ ] Shop UI responsiveness — header wrapping and layout guards
	- Note: initial pass done; continue visual QA across extreme DPRs
	- [ ] Polish: caption typography scale, hit-test padding tuning
- [ ] Autonomous Laser (intercepts enemy shots)
	- Note: core implemented; expand pierce tiers and heat interaction
	- [ ] Polish: beam start/end caps, harmonic SFX layers
- [ ] AUTO test mode (range gate + grid)
	- Note: works; add dev-only gating and a settings hotkey
	- [ ] Polish: grid fade pulse, dashed arc style toggle
- [ ] Fairness safeguards (invuln window, aim error, cadence desync)
	- Note: in; add per-difficulty tuning knobs
	- [ ] Polish: debug overlays for fairness metrics

---

### C) Nice to have (not critical for core loop)

- [ ] Rebindable controls + gamepad remap UI
- [ ] Colorblind and accessibility presets (enemy/projectile palettes)
- [ ] Photo mode / replay of last 10s on death
- [ ] Seeded runs toggle + shareable run codes
- [ ] In-game glossary/help with icons for statuses and enemy types
- [ ] Minimal analytics: wave length, damage taken sources (local only)

---

### D) Final polish passes (cross-cutting)

- [ ] VFX pass: unify color language for danger/utility/ally
- [ ] SFX pass: per-weapon layers + dynamic mix ducking during boss telegraphs
- [ ] UI pass: responsive HUD at 0.75×–2.0× DPR; caption grid for shop
- [ ] Performance pass: object pools for all projectiles/VFX; GC audit
- [ ] QA pass: edge spawns telegraphs; restart/resume correctness; mobile taps

---

## Recommended next steps (keep in sync with updates above)

1) Build the Elite framework
	 - Data: affix defs (name, color, stat mods, onSpawn/onDeath hooks)
	 - Code: apply at spawn in `entities/enemy.js`; decorate draw; cap stacks
	 - UX: name tag + outline + spawn stinger

2) Implement Boss System and The Overseer
	 - System: phases, HP bar, arena lock, telegraph timeline
	 - Patterns: spiral volleys, sweeping beam with pre-beam sight, add-wave summon
	 - Files to touch: `scenes/wave.js` (phase control), `entities/enemy.js` (boss type), `entities/enemyShot.js` (patterns), `ui/hud.js` (boss bar)

3) Weapon slots + first new weapon (Shotgun)
	 - Add weapon interface (fire(), heat, ammo hooks) and swap input/UI
	 - Balance: pellet count, spread, falloff; new shop card for Shotgun

4) New enemy archetype: Artillery
	 - Keep distance AI, arcing projectile with ground AOE decal + slow
	 - Fairness: visible arc hint, AOE warn ring, min time-to-impact

5) Ability: Dash/Blink
	 - Short i-frames, cancel window, ability ring UI; cooldown tuning
	 - Synergy: dash through shots to reflect small projectiles (later)

6) Pattern library foundation
	 - Reusable emitters for spiral/ring/wave; parameters per caller
	 - Hook into enemies, elites, and bosses as building blocks

Once the above are stable, iterate on polish passes and expand to Missile pod, Homing shards, and Gravity Well.

