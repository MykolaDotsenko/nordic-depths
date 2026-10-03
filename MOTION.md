# Motion

## The 2023 contract

The original forest moves each plane by a fixed divisor of the scroll position, exactly as the 2023 exercise did:

| Element | Transform |
| --- | --- |
| Far plane | `scroll / 1.6` |
| Middle plane | `scroll / 2.5` |
| Near plane | `scroll / 5.7` |
| Title block | `scroll / 2` |
| Dungeon copy | `scroll / -7.5` |

`original-parallax.js` supplies the scroll value; CSS applies the divisors with the original 0.75s easing. The static checks keep the divisors literal and the browser tests measure them.

The 2023 ScrollSmoother runtime is not used. Native scrolling moves the page immediately and the planes catch up through the easing, so the motion is slightly springier than the original's smoothed scroll.

The title is now longer than the 2023 text, and the line above it names who and what (Mykola Dotsenko, full-stack developer). The block rests with its last line just above the forest line, inside the clearing between the two big trunks. That makes it fully readable on arrival on every screen, and it still sinks behind the foliage as the page scrolls. The divisors are unchanged.

Under `prefers-reduced-motion: reduce` the scroll value stays at `0px` and the transforms are removed. Motion Lab cannot change this part.

## The continuation

The motion profile comes from `motion-model.js`:

| Profile | When | Effect |
| --- | --- | --- |
| Full | fine pointer | all scenes, 38px reveals, pointer glow, 240 fireflies that scatter around the pointer |
| Compact | coarse pointer | gentler X-Ray tilt, 22px reveals, no pointer glow, 110 fireflies |
| Reduced | reduced-motion preference | no scroll choreography, no CSS drift or twinkle, no fireflies, no smooth scrolling |

Motion Lab can force any profile for the continuation. Choosing Reduced there also stops the motion CSS owns (aurora drift, mist drift, star twinkle) and switches the fireflies off. Its intensity scales the fireflies' parallax, not their number.

## Scenes

- **Handoff**: the dungeon backdrop settles and darkens as the intro arrives, and the title rises line by line out of masks. The gold eyebrow echoes the 2023 title glow.
- **X-Ray**: the same three forest images, as transparent planes, compose the hero image; then the stack tilts into 3D, the planes separate and their divisor tags appear; it orbits slightly and recomposes. On wide screens the stage is sticky for the length of the section; on narrow or short screens it animates as it passes. Without motion it shows a still exploded view.
- **Focus**: slow mist drift behind the text.
- **Rhythm**: two dark shutters slide apart like doors as the scene arrives, and the cave light comes up; the night image drifts with scroll.
- **Structure**: architecture nodes and connectors reveal once.
- **Outcome**: aurora ribbons build with scroll while drifting in CSS; a layer of stars twinkles.
- **Intro glow**: on fine pointers, two soft lights ease towards the pointer (about ±90px); idle when the intro is off screen.
- **Fireflies** (WebGL): sparks rise behind the intro and cool from ember to aurora teal. Each sits at a depth between the far and the near forest plane and lags the scroll by that plane's 2023 divisor (`1/1.6` far, `1/5.7` near), so the field has the forest's own parallax. Near sparks are large, dim bokeh that keep the copy's contrast; far ones are small and twinkle faster. On fine pointers the planes tilt with the pointer-depth signal and nearby sparks scatter and flare. The field is seeded with 2023, so it looks the same on every visit and does not jump when Motion Lab restarts it. The drawing buffer is capped at about 1.6 million pixels, since soft glows do not need retina density.

## Constraints

- Native scrolling is the only scroll source: no smooth-scroll library, no scroll hijacking.
- Scroll-linked motion animates `transform` and `opacity` (the X-Ray drives its transforms through CSS variables). The firefly canvas is the one exception: it draws only while the intro is on screen and the tab is visible.
- Every adapter returns a cleanup function, and the scroll scenes live in one GSAP context, so profile changes never stack listeners or tweens.
