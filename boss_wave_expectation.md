Overview

- Trigger: Waves 5, 10, 15… become “Vertical Stage” waves.
- Experience: Continuous vertical scroll (1942 vibe) with enemy formations → mid events → boss fight.
- Cinematic intro: Reveal that the turret has always been a ship’s cannon; attach the turret to a sleek ship chassis, then zoom/transition into the stage.
- Camera: Zooms out during the intro, then locks to a steady upward scroll with parallax background and more visible play area.
- Exit: On boss defeat, reverse cinematic: zoom in, ship docks, chassis fades, turret returns to center; gameplay reverts to ring mode for the next wave.

Core Mechanics

- Arena mode: new mode "vertical" (aka topdown-stage) distinct from current “ring” and boss topdown experiments.
- Scrolling world:
  - World Y scrolls upward at a base speed (e.g., 140 px/s → +10% per stage tier).
  - Background: 2–3 parallax star layers; occasional nebula bands/asteroid belts.
- Player ship:
  - Full mobility within the screen (up, down, left, right), clamped to the playable area (respects safe-area gutters).
  - Aiming should be fixed toward the nose of the ship since we will move the ship around the battle field: mouse click/touch control ships fire (hold for auto fire); gamepad/keys/touch drag and mouse movement while holding right mouse button, moves the ship
  - Heat/overheat cap increased and cooldown reduced; bullets originate at the ship’s nose (small nozzle effect).
  - Optional micro-thrust/drag for feel: modest acceleration and friction rather than instant velocity snaps.
- Abilities:
  - Q Pulsar: radial shockwave that pushes/damages enemies and erases nearby bullets (brief expanding ring).
  - E EMP: cone or ring that stuns standard enemies, interrupts elites, slightly staggers the boss; erases some bullets.
  - Ability bars live top-right by default (already aligned) and pulse subtly on ready (no harsh screen flash).
- Powerups/pickups:
  - Dropped by minibosses/carriers; float downward with magnetization within a small radius to reduce frustration.
  - Counters/bars remain in top-right gutter; no overlap with ability bars.

Cinematic Entry

- Phase: verticalIntro (2.5–3.5s)
  - Letterbox in; top HUD fades to “Stage 1 — Approach.”
  - Turret at center slides down; ship silhouette fades in behind it, clamps on with a metallic SFX.
  - Camera dolly back (zoom out to 0.75–0.85 scale), revealing a larger field; parallax starts moving.
  - Controls disabled until the last 0.5s; then a “GO” sweep line moves up, enabling input.
- Transition to gameplay: letterbox recedes to slim bars; stage scroll engages.

Enemy Design: Formations and Patterns Each formation is a bundle: spawn lane(s), entry curve, formation spacing, role mix, and an attack behavior.

- Lanes

  - Straight 3–5 lanes that enter from top, drift slightly, then exit bottom; some lanes shoot in cadence.
  - Variants: alternating empty lanes; staggered timing; slow/fast lane mix.
- V/Wedges

  - V-shape flight enters from top corners and collapses toward center, firing aimed spreads at the nearest player pos.
  - Elite tip with shield can require ability use.
- Zig-zag Strafe

  - Horizontal strafe down the screen with 2–3 direction changes; fires when turning.
- Spirals/Swirls

  - Ring of light fighters that rotate around an invisible pivot while descending; drop small aimed shots on beat.
  - Late variant fires spiral “corkscrew” bullets (clearable by Pulsar/EMP).
- Carriers and Drones

  - Slow carriers enter along a sine; periodically release drone trios that chase the player.
  - Carriers drop pickups or a temporary shield bubble on death.
- Dive Bombers

  - Fast units appear at edges, lock onto the player, then dash along a curved path; telegraph trail before commit.
- Turret Platforms

  - Small pods drift in and hold position for 2–3s; fire barrages, then back off.
  - Pods can be elite (rotating shields) or explosive on death.
- Mine Lines

  - Horizontal or diagonal strings of slow mines; detonate when shot or on proximity; reward spacing and Pulsar timing.
- Mini-boss Beats (optional pre-boss)

  - A tougher ship with a weak spot; modest HP, slow bullet curtain, drops two pickups.

Attack Patterns

- Aimed shots: fire at current getPlayerWorldPos() with small lead time; fairness enforced (min TTI).
- Fans/cones: 3–7 bullet fan with slight spread; late stage adds a delayed secondary fan.
- Rings: full 360° ring; low speed, on predictable beats; encourages weaving.
- Lasers: short telegraphs, thin beams sweeping 30–60°; avoid unfair close spawns near the player.
- Bomb drops: slow bombs that push the player laterally; detonations clear other bullets in a small radius.

Boss Fight (Wave 5 example: The Overseer)

- Entrance (bossIntro 3s)

  - Screen clears; large ship descends to upper third of the playfield.
  - Boss HP bar appears in top gutter under HUD; camera subtly zooms another 5% out, then locks.
- Phase design (emphasis on minion orchestration first, then direct aggression)

  - Phase 1 (100–75%): “Command and Screen”
    - Boss only fires occasional aimed singles.
    - Calls 3 formation beats: lanes → zig-zag → carriers+drones.
  - Phase 2 (75–45%): “Pressure Cooker”
    - Adds spiral formations and dive bombers; boss fires slow 3-shot fans after each formation.
    - Random shield bubble spawns near boss; pop for big damage window.
  - Phase 3 (45–15%): “Curtains”
    - Boss launches ring curtains; leaves safe lanes; minions continue but fewer.
    - Adds 1–2 laser sweeps with clear telegraph arcs.
  - Phase 4 (15–0%): “Enrage”
    - Stops calling minions; aggressive directed patterns:
      - Alternating fan + aimed single.
      - Occasional donut ring plus two dive bombers.
    - Short vulnerability windows (core opens); EMP extends window slightly.
- Defeat and Outro

  - Core overload: white-hot glow, two expanding shockwaves that clear bullets.
  - Rewards auto-collect; screen slows scroll; camera zooms in 10–15% as letterbox returns for the outro cinematic.

Stage Flow (Wave 5 timeline example, ~90–110s)

- Intro cinematic: 3s.
- Section A (20s): lanes → zig-zag → carriers.
- Section B (20s): V wedges → turret pods → mine line + pickup carrier.
- Section C (20s): spirals → dive bombers → mini-boss (optional 10s).
- Boss intro: 3s.
- Boss phases: 30–40s based on DPS.
- Shop: as today, then revert to ring mode.

UI and Presentation

- Top/Bottom gutters: retained. Top houses HUD, boss bar, ability bars; bottom houses controls.
- Camera and zoom:
  - Intro: interpolate render scale 1.0 → 0.8; ease-out.
  - Stage: small vertical camera bob synced to music beats for life; very subtle.
- Ability-ready feedback: small pulse on ability bars + subtle peripheral bloom; no screen-wide flash.
- Audio button: clear ON/OFF state; muted shows crossed speaker with darker fill.
- Remove legacy “Laser” text badge from HUD; laser toggle remains on the control row.

Integration With Existing Systems

- Modes
  - Add arenaMode: 'vertical' for stage waves.
  - Keep 'ring' unchanged for regular waves; no logic regression.
- Player position
  - Continue using getPlayerWorldPos() as the single source of truth; in vertical mode it’s the ship’s true world pos.
- Playable bounds
  - Continue to use getPlayableScreenBounds() and gutters; spawns avoid gutters; AI clamps within bounds.
- Spawner and patterns
  - Introduce a stage timeline (DSL or simple JSON) describing beats:
    - time window, formation type, params (count, speed, path, firing recipe).
  - Paths: Catmull–Rom splines or param equations (sine, zig-zag, spiral) for deterministic motion.
- Fairness and collisions
  - Maintain projectile “minimum time-to-impact” checks and never spawn inside the player’s prox-box.
  - Keep invulnerability grace on hit; add a small nudge away from bullet clusters (optional).

Transition Back to Ring Mode

- After boss defeat and shop:
  - Fade parallax; ship docks/disappears; turret recenters.
  - Camera scale eases back to 1.0; arenaMode switches to 'ring'.
  - Resume standard wave loop with persistent upgrades and credits applied.

Difficulty Scaling Across Boss Waves

- Wave 10, 15…:
  - Faster scroll, denser formations, more elites per formation.
  - Additional pattern twists (double lasers, delayed bombs).
  - Boss gains new sub-attacks or different phase order.

QA/Dev Aids

- URL flags (for testing, no code now—spec only)
  - ?mode=vertical forces stage mode.
  - ?wave=N jumps to a specific wave.
  - ?skipIntro=1 bypasses the intro cinematic.
  - ?zoom=0.8 sets stage zoom.
  - ?speed=1.25 scales scroll and enemy speed.
  - ?patterns=spiral,zigzag limits spawns to named patterns for testing.
- Dev overlay tools
  - Draw paths (splines), spawn boxes, safe lanes.
  - Toggle bullet culling visualization.

Performance/Polish Targets

- Object pooling for bullets/drones.
- Avoid overdraw with thin laser beams and capped particle counts.
- Parallax layers batched and cached (offscreen canvas).
- Mobile safe-area padding observed; buttons auto-wrap/smaller on narrow widths.
