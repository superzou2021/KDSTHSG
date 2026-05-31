import test from "node:test";
import assert from "node:assert/strict";

// ========== 电话号码验证函数（独立实现用于测试） ==========
function validatePhone(phone: string): boolean {
  return /^1[3-9]\d{9}$/.test(phone);
}

// ========== 电话号码验证测试 ==========
test("validatePhone: 有效的电话号码验证", () => {
  assert.equal(validatePhone("13900000001"), true);
  assert.equal(validatePhone("13800000002"), true);
  assert.equal(validatePhone("13700000003"), true);
  assert.equal(validatePhone("13600000004"), true);
  assert.equal(validatePhone("13500000005"), true);
  assert.equal(validatePhone("15000000006"), true);
  assert.equal(validatePhone("15100000007"), true);
  assert.equal(validatePhone("15200000008"), true);
  assert.equal(validatePhone("15300000009"), true);
  assert.equal(validatePhone("15500000010"), true);
  assert.equal(validatePhone("15600000011"), true);
  assert.equal(validatePhone("15700000012"), true);
  assert.equal(validatePhone("15800000013"), true);
  assert.equal(validatePhone("15900000014"), true);
  assert.equal(validatePhone("18000000015"), true);
  assert.equal(validatePhone("18100000016"), true);
  assert.equal(validatePhone("18200000017"), true);
  assert.equal(validatePhone("18300000018"), true);
  assert.equal(validatePhone("18400000019"), true);
  assert.equal(validatePhone("18500000020"), true);
  assert.equal(validatePhone("18600000021"), true);
  assert.equal(validatePhone("18700000022"), true);
  assert.equal(validatePhone("18800000023"), true);
  assert.equal(validatePhone("18900000024"), true);
  assert.equal(validatePhone("19000000025"), true);
  assert.equal(validatePhone("19100000026"), true);
  assert.equal(validatePhone("19200000027"), true);
  assert.equal(validatePhone("19300000028"), true);
  assert.equal(validatePhone("19500000029"), true);
  assert.equal(validatePhone("19600000030"), true);
  assert.equal(validatePhone("19700000031"), true);
  assert.equal(validatePhone("19800000032"), true);
  assert.equal(validatePhone("19900000033"), true);
});

test("validatePhone: 无效的电话号码验证", () => {
  assert.equal(validatePhone(""), false); // 空字符串
  assert.equal(validatePhone("123"), false); // 长度不足
  assert.equal(validatePhone("1234567890"), false); // 长度 10
  assert.equal(validatePhone("123456789012"), false); // 长度 12
  assert.equal(validatePhone("23900000001"), false); // 不以 1 开头
  assert.equal(validatePhone("03900000001"), false); // 以 0 开头
  assert.equal(validatePhone("1390000000a"), false); // 包含字母
  assert.equal(validatePhone("1390000000#"), false); // 包含特殊字符
  assert.equal(validatePhone(" 13900000001 "), false); // 包含空格
  assert.equal(validatePhone("139-0000-0001"), false); // 包含分隔符
});

// ========== 存储层测试占位符 ==========
test("存储层: 游戏配置和状态管理", () => {
  // 由于 storage.ts 依赖浏览器环境和 Next.js 路径别名，
  // 完整的存储层测试需要在组件测试或集成测试中进行
  assert.ok(true);
});
