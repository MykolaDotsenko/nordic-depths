export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const PROFILE_MODES = new Set(["system", "full", "compact", "reduced"]);

function resolveMode({ reducedMotion, coarsePointer, override }) {
  if (override !== "system") return override;
  if (reducedMotion) return "reduced";
  if (coarsePointer) return "compact";
  return "full";
}

export function getMotionProfile({
  reducedMotion = false,
  coarsePointer = false,
  override = "system",
  depthScale = 1,
} = {}) {
  const safeOverride = PROFILE_MODES.has(override) ? override : "system";
  const safeDepthScale = clamp(Number(depthScale) || 1, 0.5, 1.25);
  const mode = resolveMode({ reducedMotion, coarsePointer, override: safeOverride });

  if (mode === "reduced") {
    return Object.freeze({
      mode,
      depthScale: safeDepthScale,
      scrollIntensity: 0,
      revealDistance: 0,
      pointerEnabled: false,
    });
  }

  if (mode === "compact") {
    return Object.freeze({
      mode,
      depthScale: safeDepthScale,
      scrollIntensity: 0.58 * safeDepthScale,
      revealDistance: 22,
      pointerEnabled: false,
    });
  }

  return Object.freeze({
    mode: "full",
    depthScale: safeDepthScale,
    scrollIntensity: safeDepthScale,
    revealDistance: 38,
    pointerEnabled: true,
  });
}

// Exponentially smoothed scroll velocity in px/s. Sampled every animation frame,
// so a resting page (deltaY = 0) decays towards zero instead of freezing.
export function smoothVelocity(previous, deltaY, elapsedMs, factor = 0.2) {
  const raw = (deltaY / Math.max(elapsedMs, 1)) * 1000;
  const next = previous + (raw - previous) * factor;
  return Math.abs(next) < 0.5 ? 0 : next;
}

export function formatVelocity(velocity) {
  const rounded = Math.round(velocity);
  return `${rounded > 0 ? "+" : ""}${rounded === 0 ? 0 : rounded} px/s`;
}
