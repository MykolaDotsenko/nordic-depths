import test from "node:test";
import assert from "node:assert/strict";

import { clamp, formatVelocity, getMotionProfile, smoothVelocity } from "../js/motion-model.js";

test("clamp bounds numeric values", () => {
  assert.equal(clamp(-2, 0, 1), 0);
  assert.equal(clamp(0.4, 0, 1), 0.4);
  assert.equal(clamp(5, 0, 1), 1);
});

test("reduced system motion overrides pointer capability", () => {
  const profile = getMotionProfile({ reducedMotion: true, coarsePointer: false });
  assert.equal(profile.mode, "reduced");
  assert.equal(profile.scrollIntensity, 0);
  assert.equal(profile.pointerEnabled, false);
});

test("explicit full profile can be inspected in Motion Lab", () => {
  const profile = getMotionProfile({ reducedMotion: true, override: "full", depthScale: 1.2 });
  assert.equal(profile.mode, "full");
  assert.equal(profile.scrollIntensity, 1.2);
  assert.equal(profile.depthScale, 1.2);
});

test("coarse pointer receives compact motion", () => {
  const profile = getMotionProfile({ coarsePointer: true });
  assert.equal(profile.mode, "compact");
  assert.equal(profile.scrollIntensity, 0.58);
  assert.equal(profile.pointerEnabled, false);
});

test("fine pointer receives full motion", () => {
  const profile = getMotionProfile();
  assert.equal(profile.mode, "full");
  assert.equal(profile.scrollIntensity, 1);
  assert.equal(profile.pointerEnabled, true);
});

test("unknown overrides fall back to the system profile", () => {
  assert.equal(getMotionProfile({ override: "turbo", coarsePointer: true }).mode, "compact");
});

test("depth intensity is bounded", () => {
  assert.equal(getMotionProfile({ depthScale: 0.1 }).depthScale, 0.5);
  assert.equal(getMotionProfile({ depthScale: 3 }).depthScale, 1.25);
});

test("scroll velocity follows movement and decays to zero at rest", () => {
  let velocity = smoothVelocity(0, 60, 16);
  assert.ok(velocity > 0);
  for (let frame = 0; frame < 30; frame += 1) velocity = smoothVelocity(velocity, 60, 16);
  assert.ok(Math.abs(velocity - 3750) < 50, `steady scroll reads about 3750 px/s, got ${velocity}`);

  for (let frame = 0; frame < 60; frame += 1) velocity = smoothVelocity(velocity, 0, 16);
  assert.equal(velocity, 0);
});

test("velocity guards against zero elapsed time", () => {
  assert.ok(Number.isFinite(smoothVelocity(0, 40, 0)));
});

test("velocity readout is signed and never shows -0", () => {
  assert.equal(formatVelocity(0), "0 px/s");
  assert.equal(formatVelocity(-0.2), "0 px/s");
  assert.equal(formatVelocity(812.6), "+813 px/s");
  assert.equal(formatVelocity(-120.4), "-120 px/s");
});
