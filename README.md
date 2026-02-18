# Loadout

Barbell plate calculator for iOS. Enter a target weight, get a set-by-set loading plan with warmups.

## Dev

```
pnpm dev       # Vite at localhost:5173
pnpm test      # unit tests
pnpm build     # → dist/index.html
```

## Features

- Warmup sets at configurable percentages (default 50%, 75%)
- Plate-by-plate delta instructions ("Add: 25, 10")
- Visual plate diagram per set
- Settings: bar weight, max weight, warmup %, available plates
- Persists state to localStorage

## Deploy

CI runs tests, builds, and uploads `dist/index.html` to S3 on push to `main`.
