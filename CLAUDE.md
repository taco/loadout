# Loadout — Claude Code instructions

## Package manager
Always use **pnpm**. Never npm or yarn.

## Commands
- `pnpm dev` — Vite dev server at http://localhost:5173, HMR, use this for all visual testing
- `pnpm test` — node:test, runs directly against src/calc.js (no server needed)
- `pnpm build` — custom build.js → dist/index.html (single inlined file, deployed to S3)

## Structure
- `src/calc.js` — pure calculation logic, no DOM, fully exported and unit-tested
- `src/index.html` — entire UI: all HTML, CSS, and JS in one file (imports calc.js as ES module)
- `calc.test.js` — unit tests for calc.js only; import path is `./src/calc.js`
- `build.js` — strips exports from calc.js and inlines it into a single dist/index.html
- `vite.config.js` — root is `src/`, port 5173

## Architecture notes
- All state lives in `localStorage` under key `plateCalc`; `loadState()` / `saveState()` handle it
- `state.barWeight` and `state.maxWeight` drive the slider min/max; bar is in Settings, not the main UI
- Warmup sets always render — no percentage-proximity filter
- The build intentionally produces a **single HTML file** with no external dependencies (S3 deploy)
- Tests use `node:test` (built-in), no test framework to install
