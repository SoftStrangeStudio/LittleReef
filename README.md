# Little Reef

**Little Reef** is a live miniature Three.js aquarium with data-first procedural fish, selection and two-parent breeding, controlled swimming, schooling and avoidance, a deterministic rock arch, and reviewed GLB coral.

Play: https://softstrangestudio.github.io/LittleReef/

## Run locally

```bash
npm ci
npm run dev
```

## Validate and build

```bash
npm run test:coral
npm run test:arch
npm run test:swim
npm run test:menu
node scripts/test-audio-service.mjs
npm run build
```

See [.agent/validation.md](.agent/validation.md) for the clean-clone, deployment, and 30-second visual-review boundaries.

## Current scope

Implemented: live aquarium rendering, generated fish, deterministic genomes/inheritance, selection, two-parent offspring with lineage, goals, procedural audio, physics, menu transition, controlled navigation, rock arch, and static GLB coral.

Planned or incomplete: final eligibility and nursery capacity, authoritative save/state versioning, keep/sell, economy, long-term collection/progression, browser-owned regression capture, and release acceptance.

The client is organized by game domains under `src/`. Services own current behavior and state; renderers translate records into Three.js visuals. The frozen Drive design's matrix-authority contract has not yet been reconciled with the live service architecture.

## Handoff and authority

- Start with [.agent/start-here.md](.agent/start-here.md).
- Team workspace: [Little Reef Shared Drive](https://drive.google.com/drive/folders/1vcP0SBoHk7ROD8jdV11jn1Egx_b8SQPd)
- Current state: [LittleReef-Handoff](https://docs.google.com/document/d/1Kf3Qe6MFSYgtUvxSVywF0n095AQdM7tnPzf9bwwYSRI/edit)
- Tasks: [LittleReef Production Tracker](https://docs.google.com/spreadsheets/d/1JL1YuEZYvZc9XcoUrJZNIW6dK_iABD8MPgRw6tz1e-o/edit)

Every authorized push to `main` builds the Vite app and deploys `dist/` through the existing GitHub Pages workflow.
