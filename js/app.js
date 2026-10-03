import { initFireflies } from "./fireflies.js";
import { initI18n } from "./i18n.js";
import { initOriginalParallax } from "./original-parallax.js";
import { getMotionProfile } from "./motion-model.js";
import { loadMotionPreferences, saveMotionPreferences } from "./motion-preferences.js";
import { initMotionLab } from "./motion-lab.js";
import { initPointerDepth } from "./pointer-depth.js";
import { initSceneCompass } from "./scene-compass.js";
import { initScrollMotion } from "./motion.js";

document.documentElement.classList.add("js");

const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
const coarsePointerQuery = window.matchMedia("(pointer: coarse)");

let preferences = loadMotionPreferences();
let cleanupMotion = () => {};
let cleanupOriginalParallax = () => {};
let cleanupPointer = () => {};
let cleanupFireflies = () => {};
let motionLab = null;
let currentScene = null;

const sceneLabel = (scene) => scene?.dataset.sceneLabel || scene?.id || "";

function createProfile() {
  return getMotionProfile({
    reducedMotion: reducedMotionQuery.matches,
    coarsePointer: coarsePointerQuery.matches,
    override: preferences.profile,
    depthScale: preferences.depthScale,
  });
}

// The modern chrome (header, compass, progress, Motion Lab) appears only as the
// continuation approaches, so the 2023 sequence plays without it.
function initExtensionChrome() {
  const extension = document.querySelector("[data-extension-start]");
  if (!extension) return () => {};

  let frame = 0;
  let threshold = 0;

  const measure = () => {
    threshold = Math.max(0, extension.getBoundingClientRect().top + window.scrollY - window.innerHeight * 0.32);
  };

  const render = () => {
    frame = 0;
    document.body.classList.toggle("extension-active", window.scrollY >= threshold);
  };

  const schedule = () => {
    if (!frame) frame = window.requestAnimationFrame(render);
  };

  const onResize = () => {
    measure();
    schedule();
  };

  measure();
  render();
  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", onResize, { passive: true });

  return () => {
    window.removeEventListener("scroll", schedule);
    window.removeEventListener("resize", onResize);
    if (frame) window.cancelAnimationFrame(frame);
    document.body.classList.remove("extension-active");
  };
}

function syncOriginalParallax() {
  cleanupOriginalParallax();
  cleanupOriginalParallax = initOriginalParallax({
    reducedMotion: reducedMotionQuery.matches,
  });
}

function syncMotion() {
  cleanupMotion();
  cleanupPointer();
  cleanupFireflies();

  const profile = createProfile();
  document.documentElement.dataset.motion = profile.mode;
  document.documentElement.dataset.motionOverride = preferences.profile;

  cleanupMotion = initScrollMotion(profile);
  cleanupPointer = initPointerDepth(profile);
  cleanupFireflies = initFireflies(profile);
  motionLab?.setProfile(profile);
  motionLab?.setSystemReduced(reducedMotionQuery.matches);
}

function start() {
  const i18n = initI18n({
    onChange() {
      motionLab?.refresh();
      motionLab?.setScene(sceneLabel(currentScene));
    },
  });

  const cleanupExtensionChrome = initExtensionChrome();
  syncOriginalParallax();

  motionLab = initMotionLab({
    preferences,
    systemReduced: reducedMotionQuery.matches,
    t: i18n.t,
    onPreferencesChange(next) {
      preferences = saveMotionPreferences(next);
      syncMotion();
    },
  });

  const cleanupCompass = initSceneCompass({
    onSceneChange(scene) {
      currentScene = scene;
      motionLab?.setScene(sceneLabel(scene));
    },
  });

  syncMotion();

  const onReducedMotionChange = () => {
    syncOriginalParallax();
    syncMotion();
  };
  const onPointerChange = () => syncMotion();

  reducedMotionQuery.addEventListener("change", onReducedMotionChange);
  coarsePointerQuery.addEventListener("change", onPointerChange);

  window.addEventListener(
    "pagehide",
    () => {
      cleanupExtensionChrome();
      cleanupCompass();
      cleanupMotion();
      cleanupOriginalParallax();
      cleanupPointer();
      cleanupFireflies();
      motionLab?.cleanup();
      i18n.cleanup();
      reducedMotionQuery.removeEventListener("change", onReducedMotionChange);
      coarsePointerQuery.removeEventListener("change", onPointerChange);
    },
    { once: true },
  );
}

// A page restored from the back/forward cache ran its pagehide cleanup; start again.
window.addEventListener("pageshow", (event) => {
  if (event.persisted) start();
});

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", start, { once: true });
} else {
  start();
}
