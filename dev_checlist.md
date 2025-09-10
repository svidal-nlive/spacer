# Developer Checklist — Spacer

Keep this checklist up to date. Any time you add a feature (even partially), do both:
- Move/mark the item into the correct section below and adjust its subtasks.
- Update the "Recommended next steps" section just after the checklist to reflect the new reality.

Tip: For partial implementations, leave boxes unchecked, but add a short note after the item like "(phase 1 done: spawn + visuals)".

---

## Checklist (grouped by scope)

### A) Discussed but not yet implemented

#### Vertical Stage (Boss Waves 5, 10, 15…)
- [x] Arena mode: `vertical` scaffold (mode switch, camera hook, basic scroll)
	- [x] Parallax backdrop pass 1 (starfield)
	- [ ] Stage lifecycle (pause/resume) and clean revert to ring with cinematic
	- [ ] Camera: zoom-out to ~0.8 during intro, subtle vertical bob; respect safe-area gutters
	- [ ] Playable bounds: spawn culling and gutter avoidance
- [ ] Cinematics (intro/outro)
	- [ ] Intro: letterbox in; turret slides down; ship chassis reveal + clamp-on SFX; zoom-out; “GO” sweep
	- [ ] Outro: bullet-clear, reward auto-collect; zoom-in; ship docks; revert to ring mode
	- [ ] Audio stingers + timing polish
- [ ] Player Ship (controls + feel)
	- [ ] Fixed-forward firing from ship nose (no cursor-aimed turret for this stage)
	- [x] Input scheme stubs
	- [ ] Inputs:
		- [ ] Mouse/touch: click/tap to fire; hold = continuous fire
		- [ ] Gamepad/keys: move ship (WASD/Arrows/Left stick)
		- [ ] Right mouse held OR touch drag: move ship while held/dragging (stub present, needs nudge)
	- [ ] Movement: accel/drag, clamp to bounds; magnetized pickups within small radius
		- [x] Accel/drag and clamp
	- [ ] Abilities tuning: Pulsar radius/push; EMP stun/interrupt; bullet-clear rules
	- [ ] Overheat policy (stage-local):
		- [ ] Decide: disable overheat entirely OR raise cap significantly (e.g., +200%) with faster cooldown
		- [ ] Implement toggle + UI behavior (hide/resize heat meter when disabled or expanded)
- [ ] Formation system & stage timeline
	- [ ] Timeline DSL for beats (time windows, formation type, params)
	- [ ] Formation primitives:
		- [ ] Lanes (3–5 lanes; staggered; cadence fire)
		- [ ] V/Wedge (corner entries, converge + aimed spreads)
		- [ ] Zig-zag strafers (direction changes fire windows)
		- [ ] Spirals/Swirls (orbit + slow drops; corkscrew variant later)
		- [ ] Carriers + Drones (carrier sine path; drone releases)
		- [ ] Dive bombers (telegraph + curved dash)
		- [ ] Turret pods (hold position 2–3s; barrage; withdraw)
	- [x] Minimal stage beats wired for wave 5 (lanes, wedge, tanks)
		- [ ] Mine lines (horizontal/diagonal; proximity/warn ring)
	- [ ] Pattern emitters: aimed/fan/ring/laser/bomb; fairness min-TTI
	- [ ] Optional miniboss beat (pickup carrier or weakpoint pod)
- [ ] Boss — The Overseer (vertical rework)
	- [ ] Entrance sequence + lock-in
	- [ ] Phase set (1–4) orchestrating formations → direct aggression
	- [ ] Curtains/lasers with safe lanes; HP bar below HUD and below letterbox
	- [ ] Defeat sequence: dual shockwaves, bullet-clear, reward burst
- [ ] UI/HUD
	- [ ] Ability bars top-right; subtle ready pulses (no harsh flash)
	- [ ] Boss bar alignment under letterbox; responsive at low DPR
	- [ ] Controls overlay minimal; audio button clear state
	- [ ] Heat meter behavior per overheat policy (hidden or expanded)
		- [x] Temporary: gentler heat rate + faster cooldown in vertical mode
- [ ] Testing & Dev
	- [ ] URL flags: `mode=vertical`, `wave=N`, `skipIntro=1`, `zoom`, `speed`, `patterns`
		- Note: basic flags `arena` and `scheme` are wired; extend to planned names
	- [ ] Dev overlays: path/formation debug, spawn boxes, safe lanes
	- [ ] Performance: pooled projectiles/VFX; draw batching; DPR QA
	- [ ] Fairness: prox-box no-spawn; minimum time-to-impact checks
	- [ ] Mobile/touch ergonomics + safe-area QA

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
1) Vertical stage wave-5 finish line
	- Camera polish: intro zoom-out, subtle bob; skipIntro flag
	- Bounds: spawn culling; prox-box no-spawn; min-TTI check
	- Input: right-drag/touch-drag nudge; touch fire hold; pickup magnetization
	- HUD: decide overheat policy (hide vs. expanded), reflect in heat UI
	- Stage beats: add 1–2 more simple formations; add fairness guards

2) Boss intro and outro cinematics
	- Boss entrance lock-in; defeat bullet-clear + reward burst; revert to ring

3) Dev flags and overlays
	- `mode`/`zoom`/`speed`/`skipIntro`/`patterns`; simple path/formation debug overlay

4) Performance/QA quick pass
	- Pooled VFX/projectiles hotspots; DPR/safe-area checks; mobile ergos

After Vertical Stage ships, resume: Elite expansion, weapon slots (Shotgun), Artillery, Dash, and pattern library breadth.

