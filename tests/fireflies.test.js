import test from "node:test";
import assert from "node:assert/strict";

import { createSeeds, drawingRatio, particleCount, seededRandom } from "../js/fireflies.js";
import { getMotionProfile } from "../js/motion-model.js";

test("the seeded generator repeats itself and stays inside 0..1", () => {
  const first = seededRandom(2023);
  const second = seededRandom(2023);
  const values = Array.from({ length: 1000 }, () => first());
  assert.deepEqual(
    values.slice(0, 10),
    Array.from({ length: 10 }, () => second()),
  );
  assert.ok(values.every((value) => value >= 0 && value < 1));
  assert.notDeepEqual(values.slice(0, 10), Array.from({ length: 10 }, seededRandom(1)));
});

test("every visit and every Motion Lab restart gets the same firefly field", () => {
  assert.deepEqual(createSeeds(240), createSeeds(240));
});

test("seeds hold five values in 0..1 per particle, and most sparks are far away", () => {
  const count = 2000;
  const seeds = createSeeds(count);
  assert.equal(seeds.length, count * 5);
  assert.ok(seeds.every((value) => value >= 0 && value <= 1));

  const depths = Array.from({ length: count }, (_, index) => seeds[index * 5 + 3]);
  const far = depths.filter((depth) => depth < 0.25).length / count;
  const near = depths.filter((depth) => depth > 0.8).length / count;
  assert.ok(far > 0.4, `far share ${far}`);
  assert.ok(near > 0.05 && near < 0.2, `near share ${near}`);

  const warmth = Array.from({ length: count }, (_, index) => seeds[index * 5 + 4]);
  assert.ok(warmth.every((value) => value === 0 || value === 1));
});

test("the particle count follows the motion profile", () => {
  assert.equal(particleCount(getMotionProfile()), 240);
  assert.equal(particleCount(getMotionProfile({ coarsePointer: true })), 110);
  assert.equal(particleCount(getMotionProfile({ reducedMotion: true })), 0);
  assert.equal(particleCount(getMotionProfile({ override: "reduced" })), 0);
  // The intensity slider changes travel, not the field itself.
  assert.equal(particleCount(getMotionProfile({ depthScale: 0.5 })), 240);
});

test("the drawing buffer never exceeds 2× density or the pixel budget", () => {
  assert.equal(drawingRatio(1, 1280, 720), 1);
  assert.equal(drawingRatio(3, 390, 844), 2);
  assert.equal(drawingRatio(undefined, 800, 600), 1);
  const ratio = drawingRatio(2, 2560, 1440);
  assert.ok(ratio < 1, `ratio ${ratio}`);
  assert.ok(2560 * 1440 * ratio * ratio <= 1_600_001);
});
