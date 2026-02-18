# Loadout

**[Try it live](http://loadout-app.s3-website-us-east-1.amazonaws.com/)**

Barbell plate calculator — a mobile-first web app that turns a target weight into a set-by-set loading plan with warmups, plate-by-plate delta instructions, and visual plate diagrams.

## Why this exists

This project is a playground for shipping a real, useful tool under tight constraints:

- **Single-file deploy.** The build produces one self-contained HTML file (no external JS/CSS/images) uploaded straight to S3. The custom `build.js` strips ES module exports from the calc module and inlines everything — HTML, CSS, JS, even the favicon — into a single `dist/index.html`.
- **Pure logic / UI separation.** All calculation lives in `src/calc.js` with zero DOM dependencies, fully exported and unit-tested. The UI in `src/index.html` consumes it as an ES module. This makes the math easy to test and reason about independently.
- **Bitmask subset-sum for warmup selection.** Warmup sets pick the best subset of the working-set plates (not an independent greedy solve) so every warmup is a strict subset you build toward. The solver enumerates subsets via bitmask arithmetic — compact, O(2^n) over a small plate array, no recursion.
- **Zero runtime dependencies.** One dev dependency (Vite, for HMR during development). Icons are hand-rolled PNGs generated from pixel data using only `node:zlib` — no canvas, no Sharp, no image library.
- **node:test, no framework.** Tests run on the built-in Node test runner. Nothing to install, nothing to configure.

## Dev

```
pnpm dev         # Vite dev server at localhost:5173
pnpm test        # unit tests (node:test)
pnpm build       # → dist/index.html (single inlined file)
pnpm gen-icons   # regenerate favicon + apple-touch-icon PNGs
```

## Features

- Warmup sets at configurable percentages (default 50%, 75%)
- Plate-by-plate delta instructions ("Add: 25, 10")
- Visual plate diagram per set
- Settings: bar weight, max weight, warmup percentages, available plates
- State persisted to localStorage

## Deploy

CI runs tests, builds, and uploads `dist/index.html` to S3 on push to `main`.
