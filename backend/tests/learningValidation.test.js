import test from "node:test";
import assert from "node:assert/strict";
import { hasCompletedAllLessons } from "../src/utils/learningValidation.js";

test("accepts a module only when every lesson is completed", () => {
  assert.equal(hasCompletedAllLessons(["a", "b"], ["a", "b"], 100), true);
});

test("rejects incomplete lessons even when progress percentage is 100", () => {
  assert.equal(hasCompletedAllLessons(["a", "b"], ["a"], 100), false);
});

test("rejects an empty module and non-complete progress", () => {
  assert.equal(hasCompletedAllLessons([], [], 100), false);
  assert.equal(hasCompletedAllLessons(["a"], ["a"], 99), false);
});

test("compares database identifiers by their string values", () => {
  assert.equal(hasCompletedAllLessons([{ toString: () => "lesson-1" }], ["lesson-1"], 100), true);
});
