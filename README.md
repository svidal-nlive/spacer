
# Spacer

Spacer is a fast-paced, neon-themed arcade shooter with a circular arena core loop, vertical boss stages, heat management, abilities, and a shop system. The game is built for both desktop and mobile, with responsive controls and a focus on replayable waves and boss encounters.

## Features

- **Arena Modes:** Circular and vertical stage transitions (boss waves 5, 10, 15...)
- **Boss System:** Multi-phase bosses with cinematic intros/outros and unique attack patterns
- **Elite Enemies:** Affix system for enemy elites (Shielded, Swift, Juggernaut, Cold, Volatile)
- **Abilities:** Pulsar, EMP, dash, time dilation, kinetic barrier, and more
- **Weapons:** Shotgun, railgun, missile pod, DoT ammo, and weapon slot switching
- **Shop & Upgrades:** In-game shop for upgrades and abilities
- **Dev Tools:** Debug overlays, dev flags, Playwright visual regression

See [`dev_checlist.md`](./dev_checlist.md) for the current development roadmap and priorities.

## Development Workflow

**All contributors must follow [`instructions.md`](./instructions.md) for building, testing, and pushing changes.**

## Quick Start

1. Install dependencies:

 ```bash
 npm install
 ```

1. Start the dev server:

 ```bash
 npm run dev
 ```

 Open the printed URL in your browser.

1. Preview production build:

 ```bash
 npm run build
 npm run preview -- --port 5173 --strictPort
 ```

## Local Docker Testing

For fast local builds and container testing:

```bash
make up-local
```

See [`instructions.md`](./instructions.md) for full details and Makefile targets.

## Controls

- Aim: Move mouse or drag on touch
- Fire: Hold mouse/touch
- Audio toggle: Press `m` (click canvas first to init audio)

## CI/CD

Pushes to `main` build and publish a Docker image to GHCR, then deploy on the server via Docker Compose. Manual and forced CI triggers available via Makefile.

## Documentation

- [docs/design-plan.md](./docs/design-plan.md): Full roadmap and module map
- [dev_checlist.md](./dev_checlist.md): Developer checklist and priorities
- [instructions.md](./instructions.md): Build, test, and deployment workflow
