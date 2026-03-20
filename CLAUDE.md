# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev              # Start Vite dev server
pnpm build            # Type-check then build (tsc --noEmit && vite build)
pnpm test             # Run tests with Vitest
pnpm preview          # Preview production build
pnpm media:encode     # Re-encode video assets via scripts/encode-media.sh
```

Run a single test file:
```bash
pnpm vitest run src/video/selection.test.ts
```

## Architecture

Vanilla TypeScript SPA (no framework) built with Vite. The application is a production-grade adaptive video player that displays a black hole animation. No React, Vue, or similar — DOM manipulation is done directly.

### Video system (`src/video/`)

The core of the codebase. Data flows: `capabilities.ts` → `selection.ts` → `player.ts`.

- **`types.ts`** — Shared type definitions (`VideoVariant`, `PlaybackEnvironment`, `VariantRanking`, etc.)
- **`manifest.ts`** — Declares the 6 video variants: 3 resolutions (720p/1080p/2160p) × 2 codecs (AV1 WebM / H.264 MP4)
- **`capabilities.ts`** — Probes the browser environment: Network Information API, Media Capabilities API (`decodingInfo`), viewport size, DPR, `save-data` header. Produces a `PlaybackEnvironment` object.
- **`selection.ts`** — Pure ranking algorithm. Takes the environment and variant manifest, computes a preferred resolution ladder, scores variants by resolution match → smooth playback → power efficiency → codec (AV1 > H.264), returns an ordered fallback sequence. The last-resort is always 720p H.264.
- **`player.ts`** — Mounts the player into the DOM. Manages state in a closure: active variant, recovery attempts, rejected/unsupported variant sets, stall monitoring, Visibility API integration, and poster-to-video reveal via `requestVideoFrameCallback`.
- **`diagnostics.ts`** — Typed console logger for player lifecycle events.
- **`selection.test.ts`** — Vitest unit tests covering variant selection scenarios.

### Configuration

`src/config/playerConfig.ts` exposes runtime tunables:
- `zoom` — CSS `--video-scale` variable
- `playbackRate`
- `enableConsoleDiagnostics`
- `stallRecoveryThresholdMs` (default 1600ms)
- `maxRecoveryAttemptsPerSession` (default 2)

### Styling

`src/styles.css` — GPU-accelerated video layout (will-change, translateZ(0)), poster fade transition, radial gradient overlay, dark color scheme. No CSS framework.

### Deployment

GitHub Actions (`.github/workflows/deploy.yml`) builds and deploys to GitHub Pages on push to `main`.

### Media assets

Source assets live in `/assets`. The encode script generates AV1 WebM (720p, 1080p, 2160p) and H.264 MP4 (720p, 1080p) from the original `black-hole.mp4`.
