import { clamp } from "./motion-model.js";

// Glow travel at the screen edges, in px, before the intensity setting.
const RANGE_X = 90;
const RANGE_Y = 60;
const EASING = 0.12;

export function initPointerDepth(profile) {
  const hero = document.querySelector("[data-extension-start]");

  if (!hero || !profile.pointerEnabled) {
    return () => {};
  }

  const scale = profile.depthScale ?? 1;
  let frame = 0;
  let visible = true;
  let targetX = 0;
  let targetY = 0;
  let x = 0;
  let y = 0;

  // One frame-coalesced loop that eases towards the pointer and stops once settled.
  const render = () => {
    frame = 0;
    x += (targetX - x) * EASING;
    y += (targetY - y) * EASING;
    hero.style.setProperty("--pointer-x", `${x.toFixed(1)}px`);
    hero.style.setProperty("--pointer-y", `${y.toFixed(1)}px`);

    if (Math.abs(targetX - x) > 0.2 || Math.abs(targetY - y) > 0.2) {
      frame = window.requestAnimationFrame(render);
    }
  };

  const onPointerMove = (event) => {
    if (!visible) return;
    const limitX = RANGE_X * 1.25;
    const limitY = RANGE_Y * 1.25;
    targetX = clamp((event.clientX / window.innerWidth - 0.5) * 2 * RANGE_X * scale, -limitX, limitX);
    targetY = clamp((event.clientY / window.innerHeight - 0.5) * 2 * RANGE_Y * scale, -limitY, limitY);

    if (!frame) {
      frame = window.requestAnimationFrame(render);
    }
  };

  const observer =
    "IntersectionObserver" in window
      ? new IntersectionObserver(([entry]) => {
          visible = entry.isIntersecting;
        })
      : null;

  observer?.observe(hero);
  window.addEventListener("pointermove", onPointerMove, { passive: true });

  return () => {
    window.removeEventListener("pointermove", onPointerMove);
    observer?.disconnect();
    if (frame) window.cancelAnimationFrame(frame);
    hero.style.removeProperty("--pointer-x");
    hero.style.removeProperty("--pointer-y");
  };
}
