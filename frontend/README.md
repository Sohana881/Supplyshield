# SupplyShield

Autonomous Exception Resolution for Enterprise Supply Chains — a frontend
prototype. Single React app, local state only, no backend. Includes a full
accessibility/personalization layer (theme, brightness, contrast, text
scale, dyslexia font, reduced motion, speech-to-text, text-to-speech,
English/Hindi i18n).

## Run it

Requires [Node.js](https://nodejs.org) 18 or newer.

```bash
npm install
npm run dev
```

Then open the URL Vite prints (usually `http://localhost:5173`). It should
open automatically.

## Build for production

```bash
npm run build
npm run preview   # serve the built output locally to check it
```

The build lands in `dist/` — deployable to any static host (Netlify,
Vercel, S3, GitHub Pages, etc).

## Project layout

```
supplyshield/
├── index.html          # Vite entry HTML
├── package.json
├── vite.config.js
└── src/
    ├── main.jsx         # React root — renders <App />
    └── App.jsx          # Entire application (store, sequencer, all views,
                          # accessibility provider) — single file by design
                          # so it stays easy to diff and drop into another
                          # host if needed.
```

## What's real vs. simulated

- All product data (inventory, suppliers, routes, finance, agents) is
  local mock state defined at the top of `App.jsx`.
- "Run Autonomous Recovery" and "Inject Second Disruption" drive a real
  state-transition queue (`useSequencer`) — each step actually updates
  React state on a delay, it isn't pre-written text.
- No network calls, no backend. Swapping in a real API means replacing
  `useSupplyShieldStore` and `useSequencer` with calls to your service and
  keeping every view component as-is (they only read from `store`).

## Extending it

- **State/backend**: replace the local `useState`-based store with a
  fetch/WebSocket-backed store of the same shape.
- **New incident types**: `useSupplyShieldStore`'s `incident` object and
  `Active Incidents` page currently assume a single incident — generalize
  to an array to support more.
- **i18n coverage**: UI chrome is translated (English/Hindi) via the
  `t()` function in `App.jsx`; the generated timeline/audit narrative
  itself is still English-only.
