# Repository profile

## Identity

- Repository: [SoftStrangeStudio/LittleReef](https://github.com/SoftStrangeStudio/LittleReef)
- Default/deployment branch: `main`
- Public game: [Little Reef](https://softstrangestudio.github.io/LittleReef/)
- Validated implementation baseline: `a2340a31ab3bc6ae8d434c85bc5d5a9f8755c0f4`
- Runtime: browser JavaScript modules, Vite `7.1.3`, Three.js `0.179.1`, Cannon-es `0.20.0`
- Ownership: Soft Strange Studio; repository source and assets are implementation authority.

## External authority

- [Canonical Shared Drive workspace](https://drive.google.com/drive/folders/1vcP0SBoHk7ROD8jdV11jn1Egx_b8SQPd)
- [Current handoff](https://docs.google.com/document/d/1Kf3Qe6MFSYgtUvxSVywF0n095AQdM7tnPzf9bwwYSRI/edit)
- [Production Tracker](https://docs.google.com/spreadsheets/d/1JL1YuEZYvZc9XcoUrJZNIW6dK_iABD8MPgRw6tz1e-o/edit)
- A separate private My Drive `LittleReef` folder is a review archive, not project authority.
- Frozen v0.1 Drive records are historical baselines and must not be silently edited.

## Repository boundaries

- Application entry and orchestration: `src/main.js`, `src/app/`
- Runtime domains: `src/fish/`, `src/breeding/`, `src/reef/`, `src/control/`, `src/physics/`, `src/menu/`, `src/audio/`, `src/ui/`
- Nexus-derived fish generator: `src/nexus/fish/`
- Static production assets: `public/assets/coral/`
- Deterministic validation: `scripts/`
- Deployment: `.github/workflows/deploy-pages.yml` (protected by default)
- Review video and image evidence is retained outside the deployed repository; canonical results belong in Drive.

## Deployment boundary

Every authorized push to `main` invokes the existing Pages workflow. Do not edit the workflow to deliver ordinary game or documentation changes. Verify the deployed page and relevant asset URLs after runtime or asset changes.

## Explicit exclusions for incidental changes

Do not casually alter dependency versions, workflow files, save-data contracts, fish generation, breeding rules, audio, coral source GLBs, or rock-arch geometry. Any such change needs its own bounded task and validation.
