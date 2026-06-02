import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateBingoScore,
  calculateEliminationScore,
  calculateQuizScore,
  calculateStoryScore
} from "./scoring.ts";

// ========== Bingo 猜词游戏评分测试 ==========
test("calculateBingoScore: 正常情况测试", () => {
  assert.equal(calculateBingoScore(0), 0);
  assert.equal(calculateBingoScore(1), 10);
  assert.equal(calculateBingoScore(5), 50);
  assert.equal(calculateBingoScore(10), 100);
});

test("calculateBingoScore: 边界情况测试", () => {
  assert.equal(calculateBingoScore(-1), 0); // 负数应该返回 0
  assert.equal(calculateBingoScore(11), 100); // 超过满分
  assert.equal(calculateBingoScore(100), 100); // 极大值
});

// ========== Quick Quiz 游戏评分测试 ==========
test("calculateQuizScore: 正常情况测试", () => {
  assert.equal(calculateQuizScore(0), 0);
  assert.equal(calculateQuizScore(1), 10);
  assert.equal(calculateQuizScore(5), 50);
  assert.equal(calculateQuizScore(10), 100);
});

test("calculateQuizScore: 边界情况测试", () => {
  assert.equal(calculateQuizScore(-5), 0);
  assert.equal(calculateQuizScore(11), 100);
  assert.equal(calculateQuizScore(50), 100);
});

// ========== 真假故事游戏评分测试 ==========
test("calculateStoryScore: 全对加分测试", () => {
  assert.equal(calculateStoryScore([true, true, true]), 100); // 全对 30*3+10=100
  assert.equal(calculateStoryScore([true, false, true]), 60); // 两个对 60
  assert.equal(calculateStoryScore([false, false, false]), 0); // 全错
});

test("calculateStoryScore: 不同数量题目测试", () => {
  assert.equal(calculateStoryScore([true, true]), 60); // 两个对 60
  assert.equal(calculateStoryScore([true]), 30); // 一个对 30
  assert.equal(calculateStoryScore([]), 0); // 空数组
});

test("calculateStoryScore: 边界情况测试", () => {
  assert.equal(calculateStoryScore([true, true, true, true]), 100); // 四个对也会被封顶
  assert.equal(calculateStoryScore([true, true, false, true]), 90); // 30*3=90
});

// ========== 站立淘汰游戏评分测试 ==========
test("calculateEliminationScore: 正常情况测试", () => {
  assert.equal(calculateEliminationScore(0), 0);
  assert.equal(calculateEliminationScore(1), 20);
  assert.equal(calculateEliminationScore(3), 60);
  assert.equal(calculateEliminationScore(5), 100);
});

test("calculateEliminationScore: 边界情况测试", () => {
  assert.equal(calculateEliminationScore(-1), 0);
  assert.equal(calculateEliminationScore(6), 100);
  assert.equal(calculateEliminationScore(20), 100);
});

// ========== 综合测试 ==========
test("所有评分函数都返回 0-100 之间的整数", () => {
  const scoringFunctions = [
    calculateBingoScore,
    calculateQuizScore,
    calculateEliminationScore
  ];
  
  for (const fn of scoringFunctions) {
    for (let i = -10; i <= 20; i++) {
      const score = fn(i);
      assert.ok(score >= 0 && score <= 100, `${fn.name}(${i}) = ${score} 超出范围`);
      assert.ok(Number.isInteger(score), `${fn.name}(${i}) = ${score} 不是整数`);
    }
  }
  
  // 测试 story scoring
  const storyTests = [
    [],
    [true],
    [false],
    [true, true, true],
    [true, false, true, true, true]
  ];
  for (const testCase of storyTests) {
    const score = calculateStoryScore(testCase);
    assert.ok(score >= 0 && score <= 100, `calculateStoryScore(${JSON.stringify(testCase)}) = ${score} 超出范围`);
    assert.ok(Number.isInteger(score), `calculateStoryScore(${JSON.stringify(testCase)}) = ${score} 不是整数`);
  }
});

// ========== 新增：极端情况测试 ==========
test("calculateBingoScore: 极端值测试", () => {
  assert.equal(calculateBingoScore(0), 0);
  assert.equal(calculateBingoScore(1), 10);
  assert.equal(calculateBingoScore(10), 100);
  assert.equal(calculateBingoScore(-100), 0);
  assert.equal(calculateBingoScore(1000), 100);
  assert.equal(calculateBingoScore(5.5), 55); // 小数不被取整
});

test("calculateQuizScore: 极端值测试", () => {
  assert.equal(calculateQuizScore(0), 0);
  assert.equal(calculateQuizScore(10), 100);
  assert.equal(calculateQuizScore(-50), 0);
  assert.equal(calculateQuizScore(100), 100);
  assert.equal(calculateQuizScore(7.3), 73); // 小数不被取整
});

test("calculateStoryScore: 各种组合测试", () => {
  assert.equal(calculateStoryScore([true, false, true]), 60); // 两个对
  assert.equal(calculateStoryScore([false, true, false]), 30); // 一个对
  assert.equal(calculateStoryScore([false, false, true, true]), 60); // 两个对
  assert.equal(calculateStoryScore([true, true, true, true, true]), 100); // 封顶
});

test("calculateEliminationScore: 极端值测试", () => {
  assert.equal(calculateEliminationScore(0), 0);
  assert.equal(calculateEliminationScore(5), 100);
  assert.equal(calculateEliminationScore(-10), 0);
  assert.equal(calculateEliminationScore(100), 100);
  assert.equal(calculateEliminationScore(3.7), 74); // 小数不被取整
});

// ========== 新增：NaN和非数字输入测试 ==========
test("评分函数: NaN输入处理", () => {
  assert.ok(isNaN(calculateBingoScore(NaN)));
  assert.ok(isNaN(calculateQuizScore(NaN)));
  assert.ok(isNaN(calculateEliminationScore(NaN)));
});

test("评分函数: 非数字输入处理", () => {
  // undefined 会转换为 NaN
  assert.ok(isNaN(calculateBingoScore(undefined as any)));
  assert.ok(isNaN(calculateQuizScore(undefined as any)));
  assert.ok(isNaN(calculateEliminationScore(undefined as any)));
  
  // null 会转换为 0
  assert.equal(calculateBingoScore(null as any), 0);
  assert.equal(calculateQuizScore(null as any), 0);
  assert.equal(calculateEliminationScore(null as any), 0);
});
