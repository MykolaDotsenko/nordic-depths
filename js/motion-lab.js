import { formatVelocity, smoothVelocity } from "./motion-model.js";
import {
  DEFAULT_MOTION_PREFERENCES,
  normalizeMotionPreferences,
} from "./motion-preferences.js";

const PROFILE_KEYS = {
  system: "profileSystem",
  full: "profileFull",
  compact: "profileCompact",
  reduced: "profileReduced",
};

export function initMotionLab({
  preferences = DEFAULT_MOTION_PREFERENCES,
  systemReduced = false,
  t = (key) => key,
  onPreferencesChange = () => {},
} = {}) {
  const toggle = document.querySelector("[data-motion-lab-toggle]");
  const dialog = document.querySelector("[data-motion-lab]");
  if (!toggle || !dialog || typeof dialog.showModal !== "function") {
    return {
      cleanup: () => {},
      refresh: () => {},
      setProfile: () => {},
      setScene: () => {},
      setSystemReduced: () => {},
    };
  }

  const close = dialog.querySelector("[data-motion-lab-close]");
  const reset = dialog.querySelector("[data-motion-lab-reset]");
  const radios = Array.from(dialog.querySelectorAll('input[name="motion-profile"]'));
  const depth = dialog.querySelector("[data-depth-control]");
  const depthOutput = dialog.querySelector("[data-depth-output]");
  const profileReadout = dialog.querySelector("[data-profile-readout]");
  const systemReadout = dialog.querySelector("[data-system-motion-readout]");
  const sceneReadout = dialog.querySelector("[data-scene-readout]");
  const velocityReadout = dialog.querySelector("[data-velocity-readout]");

  let current = normalizeMotionPreferences(preferences);
  let profileMode = "full";
  let reducedBySystem = systemReduced;
  let sceneLabel = "";
  let velocity = 0;
  let lastY = 0;
  let lastTime = 0;
  let velocityFrame = 0;

  const syncControls = () => {
    radios.forEach((radio) => {
      radio.checked = radio.value === current.profile;
    });

    if (depth) depth.value = String(Math.round(current.depthScale * 100));
    if (depthOutput) depthOutput.value = `${Math.round(current.depthScale * 100)}%`;
  };

  const render = () => {
    if (profileReadout) profileReadout.textContent = t(PROFILE_KEYS[profileMode] ?? "profileFull");
    if (systemReadout) systemReadout.textContent = t(reducedBySystem ? "stateOn" : "stateOff");
    if (sceneReadout && sceneLabel) sceneReadout.textContent = sceneLabel;
  };

  const apply = (next) => {
    current = normalizeMotionPreferences({ ...current, ...next });
    syncControls();
    onPreferencesChange(current);
  };

  // Velocity is sampled every frame while the panel is open, so it settles
  // back to 0 px/s when scrolling stops.
  const sampleVelocity = (now) => {
    const y = window.scrollY;
    velocity = smoothVelocity(velocity, y - lastY, now - lastTime);
    lastY = y;
    lastTime = now;
    if (velocityReadout) {
      const text = formatVelocity(velocity);
      if (velocityReadout.textContent !== text) velocityReadout.textContent = text;
    }
    velocityFrame = window.requestAnimationFrame(sampleVelocity);
  };

  const startVelocity = () => {
    velocity = 0;
    lastY = window.scrollY;
    lastTime = performance.now();
    if (!velocityFrame) velocityFrame = window.requestAnimationFrame(sampleVelocity);
  };

  const stopVelocity = () => {
    if (velocityFrame) window.cancelAnimationFrame(velocityFrame);
    velocityFrame = 0;
  };

  const openDialog = () => {
    dialog.hidden = false;
    dialog.showModal();
    toggle.setAttribute("aria-expanded", "true");
    startVelocity();
  };

  const closeDialog = () => dialog.close();

  const onDialogClose = () => {
    toggle.setAttribute("aria-expanded", "false");
    stopVelocity();
  };

  const onRadioChange = (event) => {
    if (event.target instanceof HTMLInputElement && event.target.checked) {
      apply({ profile: event.target.value });
    }
  };

  const onDepthInput = () => {
    if (depthOutput && depth) depthOutput.value = `${depth.value}%`;
  };

  const onDepthChange = () => {
    if (depth) apply({ depthScale: Number(depth.value) / 100 });
  };

  const onReset = () => apply(DEFAULT_MOTION_PREFERENCES);

  toggle.hidden = false;
  dialog.hidden = false;
  syncControls();
  render();

  toggle.addEventListener("click", openDialog);
  close?.addEventListener("click", closeDialog);
  dialog.addEventListener("close", onDialogClose);
  reset?.addEventListener("click", onReset);
  radios.forEach((radio) => radio.addEventListener("change", onRadioChange));
  depth?.addEventListener("input", onDepthInput);
  depth?.addEventListener("change", onDepthChange);

  return {
    cleanup() {
      toggle.removeEventListener("click", openDialog);
      close?.removeEventListener("click", closeDialog);
      dialog.removeEventListener("close", onDialogClose);
      reset?.removeEventListener("click", onReset);
      radios.forEach((radio) => radio.removeEventListener("change", onRadioChange));
      depth?.removeEventListener("input", onDepthInput);
      depth?.removeEventListener("change", onDepthChange);
      stopVelocity();
      if (dialog.open) dialog.close();
    },
    refresh: render,
    setProfile(profile) {
      profileMode = profile.mode;
      render();
    },
    setScene(label) {
      sceneLabel = label;
      render();
    },
    setSystemReduced(reduced) {
      reducedBySystem = reduced;
      render();
    },
  };
}
