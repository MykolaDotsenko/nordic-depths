# Nordic Depths

[![Quality](https://github.com/MykolaDotsenko/nordic-depths/actions/workflows/quality.yml/badge.svg)](https://github.com/MykolaDotsenko/nordic-depths/actions/workflows/quality.yml)

Mykola Dotsenko's portfolio. A 2023 layered-forest parallax exercise stays at the top of the page, and the continuation turns the same idea of clear layers into a story about interface craft, motion and software structure.

[**Open the site (FI)**](https://mykoladotsenko.github.io/nordic-depths/) · [In English](https://mykoladotsenko.github.io/nordic-depths/?lang=en) · [Architecture](./ARCHITECTURE.md) · [Motion notes](./MOTION.md)

## What is on the page

- **The 2023 original**: the forest and the dungeon, with the exercise's parallax divisors kept exactly (see [MOTION.md](./MOTION.md)). The title is placed so it is readable on arrival and then sinks behind the trees.
- **The continuation**: Idea → Layers → Focus → Rhythm → Craft → Structure → Outcome, ending in a contact block (LinkedIn, GitHub).
- **X-Ray**: the three forest planes compose the hero image, separate into a 3D stack labelled with their divisors, then recompose.
- **Motion Lab**: switch the continuation between full, compact and reduced motion, with live telemetry.
- **Finnish and English**: Finnish by default; the FI/EN switch is visible from the first screen, and `?lang=en` opens English directly.

## Accessibility and performance

- Reduced motion freezes the 2023 parallax and stops all continuation motion; Motion Lab's "Reduced" does the same for the continuation.
- Skip link, visible focus, keyboard-reachable chrome, correct `lang`, forced-colors styles; axe runs in CI for both languages.
- Artwork ships as responsive WebP (with portrait crops for phones). First load is about 0.6–0.8 MB instead of the original 6 MB.

## Run and verify

```bash
npm install
npm run dev          # http://127.0.0.1:4173
npm run check        # static checks, ESLint, unit tests
npx playwright install
npm run test:e2e     # Chromium, Firefox, WebKit and mobile Chromium against the _site build
```

`npm run build` writes the deployable site to `_site/` and fails on any missing or unreferenced file. `npm run images` regenerates the WebP files from `img/source/` (needs ImageMagick), and `node scripts/capture-assets.mjs` re-renders the social preview image and the icons.

## Stack

Semantic HTML, modern CSS and plain JavaScript modules; GSAP + ScrollTrigger for the continuation's scroll choreography; Playwright, axe and GitHub Actions for verification. No framework, no bundler, native scrolling throughout.

## History

The repository began in September 2023 as a small parallax exercise with Finnish copy. The first screens are kept on purpose: the page shows how that experiment grew into a tested, accessible piece of front-end engineering instead of hiding where it started.
