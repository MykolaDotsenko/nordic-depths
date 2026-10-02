import test from "node:test";
import assert from "node:assert/strict";

import {
  DEFAULT_MOTION_PREFERENCES,
  loadMotionPreferences,
  normalizeMotionPreferences,
  saveMotionPreferences,
} from "../js/motion-preferences.js";

const memoryStorage = (initial = {}) => {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value)),
    data,
  };
};

const brokenStorage = {
  getItem() {
    throw new Error("blocked");
  },
  setItem() {
    throw new Error("blocked");
  },
};

test("motion preferences normalize unknown persisted values", () => {
  assert.deepEqual(normalizeMotionPreferences({ profile: "wild", depthScale: 4 }), {
    profile: "system",
    depthScale: 1.25,
  });
  assert.deepEqual(normalizeMotionPreferences(), DEFAULT_MOTION_PREFERENCES);
  assert.deepEqual(normalizeMotionPreferences(null), DEFAULT_MOTION_PREFERENCES);
});

test("preferences round-trip through storage", () => {
  const storage = memoryStorage();
  const saved = saveMotionPreferences({ profile: "compact", depthScale: 0.8 }, storage);
  assert.deepEqual(saved, { profile: "compact", depthScale: 0.8 });
  assert.deepEqual(loadMotionPreferences(storage), { profile: "compact", depthScale: 0.8 });
});

test("malformed stored JSON falls back to defaults", () => {
  const storage = memoryStorage({ "nordic-depths:motion": "{not json" });
  assert.deepEqual(loadMotionPreferences(storage), DEFAULT_MOTION_PREFERENCES);
});

test("blocked storage never breaks the page", () => {
  assert.deepEqual(loadMotionPreferences(brokenStorage), DEFAULT_MOTION_PREFERENCES);
  assert.deepEqual(saveMotionPreferences({ profile: "reduced" }, brokenStorage), {
    profile: "reduced",
    depthScale: 1,
  });
});
