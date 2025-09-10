# Developer Checklist — Spacer

**All development work must follow the [instructions.md](./instructions.md) for building, testing, and pushing changes.**
Refer to those instructions before starting any new feature, bugfix, or deployment.

Keep this checklist up to date. Any time you add a feature (even partially), do both:

- Move/mark the item into the correct section below and adjust its subtasks.
- Update the "Recommended next steps" section just after the checklist to reflect the new reality.

Tip: For partial implementations, leave boxes unchecked, but add a short note after the item like "(phase 1 done: spawn + visuals)".

---

## Verification — Wave 5 (Vertical Stage) vs boss_wave_expectation.md — 2025-09-10

Observed OK

- Vertical mode engages on wave 5 with parallax starfield and upward scroll.
- Letterbox bars and boss barrier line appear; boss HP bar positions below the letterbox/top HUD.
- Player movement uses keys and right-drag/touch nudge; fixed-forward firing works in vertical mode.
- Heat tuned in vertical mode (slower heat gain, faster cooldown); heat meter policy supported.
- Stage timeline has simple beats (lanes → wedge → zig-zag → swirl), then boss; dev flags allow forced pattern and fast beats.
- Boss fight active with telegraph sweep, summons, and HP bar; outro clears bullets and reverts to ring mode.

Deviations / Omissions to address (updated after quick-pass)

- Cinematic intro polish partially implemented: basic “GO” sweep + explicit input gating added; camera zoom now ~0.80 (within spec). Missing: ship-chassis reveal + clamp-on SFX, richer sweep visuals.
- Overheat UI policy surfaced: HUD respects vertical-stage policy (expanded vs disabled). Settings toggle present and URL param supported (?heat=expanded|disabled).
- Ability bars are rendered as HUD bars in the top-right; subtle “ready” pulse polish is still TBD.
- Formation breadth: carriers+drones, mine lines, and optional miniboss pre-boss not present yet.
- Boss entrance lock-in theatrics not fully realized (screen clear cue, additional zoom tweak before lock, subtle pause beat).
- Outro polish: reward auto-collect sweep, scroll slow-down, and docking cinematic remain minimal/absent.
- Muzzle/nozzle flash upgraded to cone/flare with additive blend; further tuning possible but no longer a basic rectangle.

Automation & tooling

- Screenshots pipeline now waits for app readiness (window.spacerReady/body[data-spacer-ready="1"]).
- Local override exposes container on [http://localhost:8085](http://localhost:8085) for reliable Playwright runs.

Action items added below in relevant sections.

---

## Checklist (grouped by scope)

### A) Discussed but not yet implemented

#### Vertical Stage (Boss Waves 5, 10, 15…)

- [x] Arena mode: `vertical` scaffold (mode switch, camera hook, basic scroll)
  - [x] Parallax backdrop pass 1 (starfield)
  - [x] Clean revert to ring with outro bullet-clear
  - [x] Camera: zoom-out to ~0.8 during intro; subtle vertical bob
  - [ ] Respect safe-area gutters and full bounds polish
  - [x] Playable bounds: prox-box no-spawn + min-TTI backoff
- [ ] Cinematics (intro/outro)
  - [ ] Intro: letterbox in; turret slides down; ship chassis reveal + clamp-on SFX; zoom-out; “GO” sweep
    - [x] Gate input for first ~2.5s; enable on “GO” sweep end
    - [x] Tune zoom to 0.75–0.85 target (~0.80)
    - [x] Basic “GO” sweep implemented
  - [ ] Outro: reward auto-collect; zoom-in; ship docks; revert to ring mode
    - [x] Bullet-clear on outro start; revert to ring mode
    - [ ] Scroll slow-down and docking animation
  - [ ] Audio stingers + timing polish
- [ ] Player Ship (controls + feel)
  - [x] Fixed-forward firing from ship nose (vertical stage)
  - [x] Input scheme stubs
  - [ ] Inputs:
    - [ ] Mouse/touch: click/tap to fire; hold = continuous fire
    - [ ] Gamepad/keys: move ship (WASD/Arrows/Left stick)
    - [x] Right mouse held OR touch drag: move ship while held/dragging (basic nudge)
  - [x] Movement: accel/drag and clamp; magnetized pickups toward player
  - [ ] Abilities tuning: Pulsar radius/push; EMP stun/interrupt; bullet-clear rules
  - [x] Overheat policy (stage-local): policy selectable (expanded|disabled); faster cooldown in vertical mode
  - [x] Toggle + UI behavior implemented (heat meter hidden or expanded per policy)
  - [x] Nozzle muzzle flash/spark at barrel in vertical mode (cone/flare additive)
- [ ] Formation system & stage timeline
  - [ ] Timeline DSL for beats (time windows, formation type, params)
  - [ ] Formation primitives:
    - [x] Lanes (3–5 lanes; staggered; cadence fire)
    - [x] V/Wedge (corner entries, converge + aimed spreads)
    - [x] Zig-zag strafers (direction changes fire windows)
    - [x] Spirals/Swirls (orbit + slow drops)
    - [ ] Carriers + Drones (carrier sine path; drone releases)
    - [ ] Dive bombers (telegraph + curved dash)
    - [ ] Turret pods (hold/withdraw cadence)
  - [x] Minimal stage beats wired for wave 5 (lanes, wedge, zig, swirl)
  - [ ] Mine lines (horizontal/diagonal; proximity/warn ring)
  - [ ] Carriers + drones beat
  - [ ] Optional miniboss pre-boss beat
  - [ ] Pattern emitters: aimed/fan/ring/laser/bomb; fairness min-TTI
  - [ ] Optional miniboss beat (pickup carrier or weakpoint pod)
- [ ] Boss — The Overseer (vertical rework)
  - [ ] Entrance sequence + lock-in
  - [ ] Phase set (1–4) orchestrating formations → direct aggression
  - [x] HP bar below HUD and below letterbox (placement)
  - [ ] Curtains/lasers with safe lanes
  - [ ] Defeat sequence: dual shockwaves, bullet-clear, reward burst
- [ ] UI/HUD
  - [ ] Ability bars top-right; subtle ready pulses (no harsh flash)
    - [x] Bars rendered as HUD element in stage mode (top-right)
    - [ ] Subtle “ready” pulse polish
  - [x] Boss bar alignment under letterbox; responsive baseline
  - [x] Controls overlay minimal; audio button shows mute state
  - [x] Heat meter behavior per overheat policy (hidden or expanded)
    - [x] Gentler heat rate + faster cooldown in vertical mode
- [ ] Testing & Dev
  - [x] URL flags: `mode|arena`, `wave`, `skipIntro`, `zoom`, `speed`, `patterns`, `pattern`, `heat`
  - [x] Dev overlay: wave jump, pause toggle, fast patterns toggle
  - [ ] Dev overlays: path/formation debug, spawn boxes, safe lanes
  - [ ] Performance: pooled projectiles/VFX; draw batching; DPR QA
  - [x] Fairness: prox-box no-spawn; minimum time-to-impact checks
  - [~] Mobile/touch ergonomics + safe-area QA (overlay sizing/safe-area guards improved)

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
  - [x] Zoom ~0.80
  - [x] Subtle bob (vertical mode)
  - [x] skipIntro flag
- Bounds: spawn culling; prox-box no-spawn; min-TTI check
  - [x] Prox-box no-spawn + min-TTI backoff
- Input: right-drag/touch-drag nudge; touch fire hold; pickup magnetization
  - [x] Touch-drag also nudges
  - [x] Right-drag nudge (basic)
  - [x] Pickup magnetization toward player
- HUD: decide overheat policy (hide vs. expanded), reflect in heat UI
  - [x] Implemented: expanded meter in vertical; policy toggle in settings and URL
- Stage beats: add 1–2 more simple formations; add fairness guards

1) Boss intro and outro cinematics

- [x] Intro/outro zoom tweens (base)
- [x] Bullet-clear on outro start; revert to ring
- Boss entrance lock-in; reward burst polish

1) Dev flags and overlays

- `mode`/`zoom`/`speed`/`skipIntro`/`patterns`/`pattern`/`heat`; simple path/formation debug overlay

1) Performance/QA quick pass

- Pooled VFX/projectiles hotspots; DPR/safe-area checks; mobile ergos

1) Automation & tooling

- [x] Add readiness signal (window.spacerReady + body[data-spacer-ready="1"]) in app
- [x] Update Playwright snapshots to wait up to ~65s for readiness
- [x] Map local port 8085 in docker-compose.local for consistent local runs

After Vertical Stage ships, resume: Elite expansion, weapon slots (Shotgun), Artillery, Dash, and pattern library breadth.
