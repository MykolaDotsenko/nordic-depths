# Architecture

## Two motion surfaces

```text
PRESERVED 2023 ORIGINAL                MODERN CONTINUATION
native scroll                          system signals + Motion Lab preferences
   │                                       │
original-parallax.js                    motion-model.js (pure)
   │                                       │
--original-scroll ─► CSS divisors       ┌──┴───────────────┐
                                      motion.js        pointer-depth.js
                                      (GSAP scenes)    (intro glow)
```

The original never reads Motion Lab and never uses GSAP. The continuation never touches the original's transforms.

## Modules

| File | Responsibility |
| --- | --- |
| `js/app.js` | Wires everything: language, chrome visibility, original parallax, Motion Lab, compass, scroll motion, pointer glow. Re-runs on a back/forward-cache restore. |
| `js/original-parallax.js` | Writes `--original-scroll` from `window.scrollY`, once per animation frame; frozen at `0px` under reduced motion. |
| `js/motion-model.js` | Pure functions: motion profile (full / compact / reduced), clamping, scroll-velocity smoothing. |
| `js/motion-preferences.js` | Normalises and persists the Motion Lab override and intensity (storage is optional). |
| `js/motion.js` | GSAP/ScrollTrigger scenes: intro handoff, X-Ray, Rhythm doors, night image drift, system reveal, aurora build, content reveals. Everything is created in one `gsap.context` and reverted on profile changes. |
| `js/pointer-depth.js` | Eases the intro glow towards a fine pointer; idle while the intro is off screen. |
| `js/motion-lab.js` | The Motion Lab dialog: profile radios, intensity, telemetry (sampled every frame while open). |
| `js/scene-compass.js` | Marks the current scene in the compass and drives the progress bar fallback when CSS scroll timelines are unavailable. |
| `js/i18n.js` | English dictionary and the FI/EN switch. |

## Languages

The markup is Finnish. Elements carry `data-i18n` (content) or `data-i18n-attr` (attributes such as `aria-label` and scene labels); `js/i18n.js` holds the English strings and reads the Finnish ones back from the DOM, so each language has one source. The choice is stored locally, and `?lang=en|fi` overrides it for the visit. An inline script in `<head>` hides the page for the moment before English is applied, so English visitors never see a flash of Finnish.

## Chrome visibility

Header, compass, progress bar and the Motion Lab toggle stay out of the 2023 sequence and appear as the continuation approaches. They are hidden with opacity, not `visibility`, so keyboard focus can still reach them, and focusing them reveals them. The FI/EN switch is always visible. Without JavaScript all chrome is simply visible.

## Images

`img/source/` keeps the 2023 PNG/JPEG artwork. `scripts/build-images.mjs` writes WebP derivatives into `img/`: landscape widths for every screen, plus a centre crop for portrait screens (cover only ever shows the middle 1620px there). The hero layers are `<picture>` elements inside the same transformed layer divs, so responsive images did not change the parallax.

## Build and deploy

`scripts/build-site.mjs` copies only the page, CSS, JS, fonts, images and the two GSAP files into `_site/`, then fails if anything the HTML, CSS or JS references is missing or if an image ships without being referenced. Browser tests run against that build. The Quality workflow deploys `_site/` to GitHub Pages only after the static and browser jobs pass on `main`.

## Persisted state

Two keys in `localStorage`, both optional: `nordic-depths:motion` (profile override and intensity) and `nordic-depths:lang`.

## Tests

- **Static** (`scripts/check-project.mjs`): document basics, the 2023 divisors, every HTML class styled, one GSAP version, image size budgets.
- **Unit** (`tests/`): motion profiles, velocity smoothing, preferences storage, language resolution, English dictionary completeness.
- **Browser** (`e2e/`, four browsers): exact parallax divisors and travel order; title legible on arrival and sinking after scroll (pixel-based, eight screen sizes in both languages); no overflowing headings in either language from 320px to 1920px; chrome, navigation, contact, keyboard order and skip link; Motion Lab persistence, velocity decay and reduced profile; X-Ray and Rhythm choreography; no-JS rendering; axe; first-load byte budget. `e2e/visual.spec.js` saves review screenshots that CI uploads.
