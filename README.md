# Nordic Depths

[![Quality](https://github.com/MykolaDotsenko/nordic-depths/actions/workflows/quality.yml/badge.svg)](https://github.com/MykolaDotsenko/nordic-depths/actions/workflows/quality.yml)

**A 2023 layered parallax exercise preserved at the top of the page, followed by a modern extension that turns the same visual idea into a tested motion system.**

[**Open Nordic Depths →**](https://mykoladotsenko.github.io/nordic-depths/) · [Architecture](./ARCHITECTURE.md) · [Motion notes](./MOTION.md)

## Why the original is still there

I did not replace the old forest/dungeon exercise with a completely new portfolio page.

The first two screens preserve the original composition and its distinctive parallax ratios:

| Plane | Transform |
| --- | --- |
| Far/base | `scrollTop / 1.6` |
| Middle | `scrollTop / 2.5` |
| Near/front | `scrollTop / 5.7` |
| Hero copy | `scrollTop / 2` |
| Dungeon copy | `scrollTop / -7.5` |

Those values are now regression-tested so the repository can evolve without erasing what the original project actually was.

## The extension

After the preserved sequence, the page introduces:

- layer anatomy / X-Ray view;
- native-anchor Scene Compass;
- Motion Lab preferences;
- full, compact and reduced motion profiles;
- night/aurora choreography;
- pointer depth;
- accessible focus/reduced-motion/forced-colors states.

The modern controls stay hidden while the original 2023 sequence is playing.

## Motion ownership

The old and new parts deliberately do not share one animation engine.

```text
PRESERVED ORIGINAL
native scroll
   ↓
original-parallax.js
   ↓
CSS variables / original ratios

MODERN EXTENSION
system preferences + Motion Lab
   ↓
motion model
   ├── GSAP scenes
   └── pointer depth
```

The old ScrollSmoother dependency was not brought back. Native scrolling remains authoritative.

## Stack

- semantic HTML
- modern CSS
- Vanilla JavaScript / native modules
- GSAP + ScrollTrigger for the extension
- native browser scrolling
- original PNG/JPEG artwork
- Playwright / axe / GitHub Actions

No React, Three.js, UI kit or application-state framework.

## Accessibility

Reduced-motion freezes the historical parallax and disables spatial extension motion.

The project also includes skip navigation, visible focus, semantic reading order, forced-colors fallback and automated axe checks.

## Verification

```bash
npm install
npm run check
npx playwright install
npm run test:e2e
```

Tests protect the historical ratios, actual far/middle/near movement order, reduced-motion behaviour, navigation, Motion Lab persistence, overflow and critical accessibility states.

## Run locally

```bash
npm install
npm run dev
```

Open `http://127.0.0.1:4173`.

## History

The repository began in September 2023 as a compact layered-forest parallax exercise with Finnish personal copy. Keeping that first version visible is intentional: the repo shows the progression from an early visual experiment to a more disciplined motion implementation instead of rewriting the past.
