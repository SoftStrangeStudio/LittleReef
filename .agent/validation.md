# Validation guide

## Clean-clone baseline

```bash
git clone https://github.com/SoftStrangeStudio/LittleReef.git
cd LittleReef
git switch main
git status --short --branch
npm ci
npm run test:coral
npm run test:arch
npm run test:swim
npm run test:menu
node scripts/test-audio-service.mjs
npm run build
```

Expected production coral catalog: 10 GLBs plus `public/assets/coral/catalog.json`. The default game loads IDs `01`, `03`, `05`, `07`, and `09` into 18 deterministic placements.

## Deployment checks

- Public game: https://softstrangestudio.github.io/LittleReef/
- Confirm the Pages workflow for the current `main` commit succeeds.
- Confirm the page returns HTTP 200.
- For coral changes, confirm configured URLs under `/LittleReef/assets/coral/` return successfully.
- Confirm the deployed bundle contains the expected runtime change; do not rely on the local build alone.

## Visual and interaction boundary

Any visible reef, fish, coral, arch, navigation, camera, or UI change needs a comparable 30-second gameplay review with fixed camera, world seed, population, duration, and frame rate. Population/obstacle changes also need a stress pass. Preserve failed captures as evidence rather than silently replacing them.

Inspect at least:

- fish body winding, shading, silhouette and LOD transitions;
- menu-to-reef transition and pointer control;
- arch passage and central route clearance;
- coral floor contact, scale, materials, clutter and collision behavior;
- fish pile-ups, clipping and trapping;
- disposal/reload behavior for shared resources.

## Claims not covered by headless checks

Headless or software-GPU rendering does not prove real pointer/touch behavior, audible output, autoplay behavior, device performance, or identical appearance on every browser/GPU. State those limits explicitly and use a deployed browser play check for such claims.
