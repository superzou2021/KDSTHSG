import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateBingoScore,
  calculateEliminationScore,
  calculateQuizScore,
  calculateStoryScore
} from "./scoring.ts";

test("scoring functions cap scores at 100", () => {
  assert.equal(calculateBingoScore(12), 100);
  assert.equal(calculateQuizScore(11), 100);
  assert.equal(calculateEliminationScore(8), 100);
});

test("story scoring applies full-correct bonus", () => {
  assert.equal(calculateStoryScore([true, true, true]), 100);
  assert.equal(calculateStoryScore([true, false, true]), 60);
});
