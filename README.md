# Little Reef

Prototype V1 of **Little Reef**, a miniature Three.js aquarium where fish are data-driven, selectable, and breed into inherited offspring.

## Run locally

```bash
npm install
npm run dev
```

## Production build

```bash
npm install
npm run build
npm run preview
```

## Architecture

The V1 client is organized by natural game domains under `src/`: `reef`, `fish`, `breeding`, `selection`, and `ui`. Services own game state and behavior; renderers translate that state into Three.js visuals.

## Prototype loop

Living reef → select fish → choose two parents → breed → inherited offspring joins the reef.

## Deployment

Every push to `main` builds the Vite app and deploys `dist/` through GitHub Pages.

Live target: https://softstrangestudio.github.io/LittleReef/
