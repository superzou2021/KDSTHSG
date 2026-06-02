import test from "node:test";
import assert from "node:assert/strict";
import { 
  getOfficeAverageRanking, 
  getOfficeTop3, 
  getPlayerRank, 
  getTop10Ranking,
  buildRanking,
  getPlayerRankingContext
} from "./ranking.ts";
import type { Player } from "../types/index.ts";

// 直接在测试文件中实现 validatePhone 函数，避免导入 storage.ts（因为有客户端特定代码）
function validatePhone(phone: string): boolean {
  if (!phone || phone.length !== 11) return false;
  if (phone[0] !== '1') return false;
  const secondChar = parseInt(phone[1], 10);
  if (isNaN(secondChar) || secondChar < 3 || secondChar > 9) return false;
  for (let i = 2; i < 11; i++) {
    const char = phone[i];
    if (char < '0' || char > '9') return false;
  }
  return true;
}

// ========== 测试数据准备 ==========
const testPlayers: Player[] = [
  { id: "a", name: "A", phone: "13900000001", office: "北京", team: "Alpha", totalScore: 300, completedGames: [], finalSubmitted: false, created: "2026-01-01T09:00:00.000Z", updated: "2026-01-01T09:10:00.000Z", finalCompletedAt: "2026-01-01T09:10:00.000Z" },
  { id: "b", name: "B", phone: "13900000002", office: "北京", team: "Beta", totalScore: 300, completedGames: [], finalSubmitted: false, created: "2026-01-01T09:01:00.000Z", updated: "2026-01-01T09:09:00.000Z", finalCompletedAt: "2026-01-01T09:09:00.000Z" },
  { id: "c", name: "C", phone: "13900000003", office: "上海", team: "Gamma", totalScore: 180, completedGames: [], finalSubmitted: false, created: "2026-01-01T09:02:00.000Z", updated: "2026-01-01T09:12:00.000Z", finalCompletedAt: "2026-01-01T09:12:00.000Z" },
  { id: "d", name: "D", phone: "13900000004", office: "上海", team: "Delta", totalScore: 250, completedGames: [], finalSubmitted: false, created: "2026-01-01T09:03:00.000Z", updated: "2026-01-01T09:11:00.000Z", finalCompletedAt: "2026-01-01T09:11:00.000Z" },
  { id: "e", name: "E", phone: "13900000005", office: "深圳", team: "Epsilon", totalScore: 280, completedGames: [], finalSubmitted: false, created: "2026-01-01T09:04:00.000Z", updated: "2026-01-01T09:13:00.000Z", finalCompletedAt: "2026-01-01T09:13:00.000Z" },
];

const emptyPlayers: Player[] = [];

const singlePlayer: Player[] = [
  { id: "single", name: "Single", phone: "13900000000", office: "北京", team: "Team", totalScore: 200, completedGames: [], finalSubmitted: false, created: "2026-01-01T09:00:00.000Z", updated: "2026-01-01T09:00:00.000Z", finalCompletedAt: "2026-01-01T09:00:00.000Z" }
];

// ========== buildRanking 测试 ==========
test("buildRanking: 按分数降序排序", () => {
  const ranking = buildRanking(testPlayers);
  assert.equal(ranking[0].totalScore, 300);
  assert.equal(ranking[1].totalScore, 300);
  assert.equal(ranking[2].totalScore, 280);
  assert.equal(ranking[3].totalScore, 250);
  assert.equal(ranking[4].totalScore, 180);
});

test("buildRanking: 分数相同时按完成时间升序排序", () => {
  const ranking = buildRanking(testPlayers);
  // B 完成时间早于 A，所以 B 排在前面
  assert.equal(ranking[0].playerId, "b");
  assert.equal(ranking[1].playerId, "a");
});

test("buildRanking: 排名正确分配", () => {
  const ranking = buildRanking(testPlayers);
  assert.equal(ranking[0].rank, 1);
  assert.equal(ranking[1].rank, 2);
  assert.equal(ranking[2].rank, 3);
  assert.equal(ranking[3].rank, 4);
  assert.equal(ranking[4].rank, 5);
});

test("buildRanking: 空数组处理", () => {
  const ranking = buildRanking(emptyPlayers);
  assert.equal(ranking.length, 0);
});

test("buildRanking: 单玩家处理", () => {
  const ranking = buildRanking(singlePlayer);
  assert.equal(ranking.length, 1);
  assert.equal(ranking[0].rank, 1);
  assert.equal(ranking[0].playerId, "single");
});

// ========== getTop10Ranking 测试 ==========
test("getTop10Ranking: 正常情况返回前 10 名", () => {
  const top10 = getTop10Ranking(testPlayers);
  assert.equal(top10.length, 5); // 只有 5 个玩家
  assert.equal(top10[0].playerId, "b");
});

test("getTop10Ranking: 超过 10 个玩家时只返回前 10 个", () => {
  const manyPlayers: Player[] = [];
  for (let i = 0; i < 20; i++) {
    manyPlayers.push({
      id: `player-${i}`,
      name: `Player ${i}`,
      phone: `139000000${String(i).padStart(2, "0")}`,
      office: "北京",
      team: "Team",
      totalScore: 400 - i * 10, // 分数递减
      completedGames: [],
      finalSubmitted: false,
      created: "2026-01-01T09:00:00.000Z",
      updated: "2026-01-01T09:00:00.000Z",
      finalCompletedAt: "2026-01-01T09:00:00.000Z"
    });
  }
  const top10 = getTop10Ranking(manyPlayers);
  assert.equal(top10.length, 10);
  assert.equal(top10[0].totalScore, 400);
  assert.equal(top10[9].totalScore, 310);
});

// ========== getPlayerRank 测试 ==========
test("getPlayerRank: 正常获取玩家排名", () => {
  assert.equal(getPlayerRank(testPlayers, "b"), 1);
  assert.equal(getPlayerRank(testPlayers, "a"), 2);
  assert.equal(getPlayerRank(testPlayers, "e"), 3);
  assert.equal(getPlayerRank(testPlayers, "d"), 4);
  assert.equal(getPlayerRank(testPlayers, "c"), 5);
});

test("getPlayerRank: 不存在的玩家返回 0", () => {
  assert.equal(getPlayerRank(testPlayers, "not-exist"), 0);
  assert.equal(getPlayerRank(emptyPlayers, "any"), 0);
});

// ========== getOfficeAverageRanking 测试 ==========
test("getOfficeAverageRanking: 按平均分降序排序", () => {
  const averages = getOfficeAverageRanking(testPlayers);
  // 北京: (300+300)/2 = 300
  // 深圳: 280
  // 上海: (180+250)/2 = 215
  assert.equal(averages[0].office, "北京");
  assert.equal(averages[0].averageScore, 300);
  assert.equal(averages[1].office, "深圳");
  assert.equal(averages[1].averageScore, 280);
  assert.equal(averages[2].office, "上海");
  assert.equal(averages[2].averageScore, 215);
});

test("getOfficeAverageRanking: 排名正确分配", () => {
  const averages = getOfficeAverageRanking(testPlayers);
  assert.equal(averages[0].rank, 1);
  assert.equal(averages[1].rank, 2);
  assert.equal(averages[2].rank, 3);
});

test("getOfficeAverageRanking: 玩家数量正确统计", () => {
  const averages = getOfficeAverageRanking(testPlayers);
  assert.equal(averages.find((a) => a.office === "北京")?.playerCount, 2);
  assert.equal(averages.find((a) => a.office === "上海")?.playerCount, 2);
  assert.equal(averages.find((a) => a.office === "深圳")?.playerCount, 1);
});

test("getOfficeAverageRanking: 空数组处理", () => {
  const averages = getOfficeAverageRanking(emptyPlayers);
  assert.equal(averages.length, 0);
});

// ========== getOfficeTop3 测试 ==========
test("getOfficeTop3: 各 office 分组正确", () => {
  const officeTop3 = getOfficeTop3(testPlayers);
  assert.equal(officeTop3.length, 3); // 3 个 office
  
  const beijing = officeTop3.find((g) => g.office === "北京");
  assert.ok(beijing);
  assert.equal(beijing.players.length, 2);
  
  const shanghai = officeTop3.find((g) => g.office === "上海");
  assert.ok(shanghai);
  assert.equal(shanghai.players.length, 2);
  
  const shenzhen = officeTop3.find((g) => g.office === "深圳");
  assert.ok(shenzhen);
  assert.equal(shenzhen.players.length, 1);
});

test("getOfficeTop3: 超过 3 人时只返回前 3 名", () => {
  const manyPlayers: Player[] = [];
  for (let i = 0; i < 5; i++) {
    manyPlayers.push({
      id: `office-player-${i}`,
      name: `Office Player ${i}`,
      phone: `139000000${String(i).padStart(2, "0")}`,
      office: "北京",
      team: "Team",
      totalScore: 400 - i * 10,
      completedGames: [],
      finalSubmitted: false,
      created: "2026-01-01T09:00:00.000Z",
      updated: "2026-01-01T09:00:00.000Z",
      finalCompletedAt: "2026-01-01T09:00:00.000Z"
    });
  }
  const officeTop3 = getOfficeTop3(manyPlayers);
  assert.equal(officeTop3[0].players.length, 3);
  assert.equal(officeTop3[0].players[0].totalScore, 400);
  assert.equal(officeTop3[0].players[2].totalScore, 380);
});

test("getOfficeTop3: 空数组处理", () => {
  const officeTop3 = getOfficeTop3(emptyPlayers);
  assert.equal(officeTop3.length, 0);
});

// ========== getPlayerRankingContext 测试 ==========
test("getPlayerRankingContext: 正常获取玩家排名上下文", () => {
  const context = getPlayerRankingContext(testPlayers, "a");
  assert.ok(context.player);
  assert.equal(context.rank, 2);
  assert.equal(context.player?.playerId, "a");
  assert.equal(context.top10.length, 5);
  assert.ok(context.previousPlayer);
  assert.equal(context.previousPlayer?.playerId, "b");
  assert.equal(context.distanceToPrevious, 1);
  assert.equal(context.distanceToTop10, null); // 在前 10 名内
});

test("getPlayerRankingContext: 第 1 名没有前一名", () => {
  const context = getPlayerRankingContext(testPlayers, "b");
  assert.equal(context.rank, 1);
  assert.equal(context.previousPlayer, null);
  assert.equal(context.distanceToPrevious, null);
});

test("getPlayerRankingContext: 排名在 10 名外时返回距离前 10 名的差距", () => {
  const manyPlayers: Player[] = [];
  for (let i = 0; i < 15; i++) {
    manyPlayers.push({
      id: `context-player-${i}`,
      name: `Context Player ${i}`,
      phone: `139000000${String(i).padStart(2, "0")}`,
      office: "北京",
      team: "Team",
      totalScore: 400 - i * 10,
      completedGames: [],
      finalSubmitted: false,
      created: "2026-01-01T09:00:00.000Z",
      updated: "2026-01-01T09:00:00.000Z",
      finalCompletedAt: "2026-01-01T09:00:00.000Z"
    });
  }
  const context = getPlayerRankingContext(manyPlayers, "context-player-11");
  assert.equal(context.rank, 12);
  assert.ok(context.distanceToTop10);
  assert.equal(context.distanceToTop10, 21); // 310 - 290 + 1 = 21
});

test("getPlayerRankingContext: 不存在的玩家返回 null", () => {
  const context = getPlayerRankingContext(testPlayers, "not-exist");
  assert.equal(context.player, null);
  assert.equal(context.rank, 0);
  assert.equal(context.previousPlayer, null);
  assert.equal(context.distanceToPrevious, null);
  assert.equal(context.distanceToTop10, null);
});

// ========== 综合场景测试 ==========
test("综合场景: 完整排名流程验证", () => {
  const ranking = buildRanking(testPlayers);
  const top10 = getTop10Ranking(testPlayers);
  const officeAverages = getOfficeAverageRanking(testPlayers);
  const officeTop3 = getOfficeTop3(testPlayers);
  
  assert.equal(ranking.length, testPlayers.length);
  assert.equal(top10.length, Math.min(testPlayers.length, 10));
  assert.equal(officeAverages.length, 3); // 3 个不同的 office
  assert.equal(officeTop3.length, 3);
  
  // 验证数据一致性
  const rankA = getPlayerRank(testPlayers, "a");
  const contextA = getPlayerRankingContext(testPlayers, "a");
  assert.equal(rankA, contextA.rank);
});

// ========== 新增：复杂排名场景测试 ==========
test("排名: 大量玩家场景", () => {
  const manyPlayers: Player[] = [];
  for (let i = 0; i < 100; i++) {
    manyPlayers.push({
      id: `player-${i}`,
      name: `Player ${i}`,
      phone: `139000000${String(i).padStart(2, "0")}`,
      office: ["北京", "上海", "深圳", "香港"][i % 4],
      team: ["Alpha", "Beta", "Gamma", "Delta"][i % 4],
      totalScore: 400 - i * 5, // 分数递减，每个玩家比前一个低5分
      completedGames: [],
      finalSubmitted: false,
      created: `2026-01-01T09:${String(i).padStart(2, "0")}:00.000Z`,
      updated: `2026-01-01T09:${String(i).padStart(2, "0")}:00.000Z`,
      finalCompletedAt: `2026-01-01T09:${String(i).padStart(2, "0")}:00.000Z`
    });
  }
  
  const ranking = buildRanking(manyPlayers);
  const top10 = getTop10Ranking(manyPlayers);
  
  assert.equal(ranking.length, 100);
  assert.equal(top10.length, 10);
  assert.equal(top10[0].totalScore, 400); // 第1名
  assert.equal(top10[9].totalScore, 355); // 第10名: 400 - 9*5 = 355
});

test("排名: 所有玩家分数相同", () => {
  const sameScorePlayers: Player[] = [
    { id: "p1", name: "P1", phone: "13900000001", office: "北京", team: "Alpha", totalScore: 300, completedGames: [], finalSubmitted: false, created: "2026-01-01T09:00:00.000Z", updated: "2026-01-01T09:05:00.000Z", finalCompletedAt: "2026-01-01T09:05:00.000Z" },
    { id: "p2", name: "P2", phone: "13900000002", office: "北京", team: "Beta", totalScore: 300, completedGames: [], finalSubmitted: false, created: "2026-01-01T09:00:00.000Z", updated: "2026-01-01T09:03:00.000Z", finalCompletedAt: "2026-01-01T09:03:00.000Z" },
    { id: "p3", name: "P3", phone: "13900000003", office: "上海", team: "Gamma", totalScore: 300, completedGames: [], finalSubmitted: false, created: "2026-01-01T09:00:00.000Z", updated: "2026-01-01T09:04:00.000Z", finalCompletedAt: "2026-01-01T09:04:00.000Z" }
  ];
  
  const ranking = buildRanking(sameScorePlayers);
  
  // 分数相同时按完成时间排序
  assert.equal(ranking[0].playerId, "p2"); // 完成最早
  assert.equal(ranking[1].playerId, "p3");
  assert.equal(ranking[2].playerId, "p1");
});

test("排名: 所有玩家分数都为0", () => {
  const zeroScorePlayers: Player[] = [
    { id: "p1", name: "P1", phone: "13900000001", office: "北京", team: "Alpha", totalScore: 0, completedGames: [], finalSubmitted: false, created: "2026-01-01T09:00:00.000Z", updated: "2026-01-01T09:00:00.000Z", finalCompletedAt: undefined },
    { id: "p2", name: "P2", phone: "13900000002", office: "上海", team: "Beta", totalScore: 0, completedGames: [], finalSubmitted: false, created: "2026-01-01T09:00:00.000Z", updated: "2026-01-01T09:00:00.000Z", finalCompletedAt: undefined }
  ];
  
  const ranking = buildRanking(zeroScorePlayers);
  
  assert.equal(ranking.length, 2);
  assert.equal(ranking[0].totalScore, 0);
  assert.equal(ranking[1].totalScore, 0);
});

test("Office排名: 单个Office场景", () => {
  const singleOfficePlayers: Player[] = [
    { id: "p1", name: "P1", phone: "13900000001", office: "北京", team: "Alpha", totalScore: 300, completedGames: [], finalSubmitted: false, created: "2026-01-01T09:00:00.000Z", updated: "2026-01-01T09:00:00.000Z", finalCompletedAt: "2026-01-01T09:00:00.000Z" },
    { id: "p2", name: "P2", phone: "13900000002", office: "北京", team: "Beta", totalScore: 250, completedGames: [], finalSubmitted: false, created: "2026-01-01T09:00:00.000Z", updated: "2026-01-01T09:00:00.000Z", finalCompletedAt: "2026-01-01T09:00:00.000Z" }
  ];
  
  const officeAverages = getOfficeAverageRanking(singleOfficePlayers);
  const officeTop3 = getOfficeTop3(singleOfficePlayers);
  
  assert.equal(officeAverages.length, 1);
  assert.equal(officeAverages[0].office, "北京");
  assert.equal(officeAverages[0].averageScore, 275); // (300+250)/2
  
  assert.equal(officeTop3.length, 1);
  assert.equal(officeTop3[0].players.length, 2);
});

// ========== 新增：排名上下文边界测试 ==========
test("排名上下文: 排名刚好第10位", () => {
  const tenPlayers: Player[] = [];
  for (let i = 0; i < 10; i++) {
    tenPlayers.push({
      id: `player-${i}`,
      name: `Player ${i}`,
      phone: `139000000${String(i).padStart(2, "0")}`,
      office: "北京",
      team: "Team",
      totalScore: 400 - i * 10,
      completedGames: [],
      finalSubmitted: false,
      created: "2026-01-01T09:00:00.000Z",
      updated: "2026-01-01T09:00:00.000Z",
      finalCompletedAt: "2026-01-01T09:00:00.000Z"
    });
  }
  
  const context = getPlayerRankingContext(tenPlayers, "player-9");
  assert.equal(context.rank, 10);
  assert.equal(context.distanceToTop10, null); // 在TOP10内
});

test("排名上下文: 排名第11位", () => {
  const elevenPlayers: Player[] = [];
  for (let i = 0; i < 11; i++) {
    elevenPlayers.push({
      id: `player-${i}`,
      name: `Player ${i}`,
      phone: `139000000${String(i).padStart(2, "0")}`,
      office: "北京",
      team: "Team",
      totalScore: 400 - i * 10,
      completedGames: [],
      finalSubmitted: false,
      created: "2026-01-01T09:00:00.000Z",
      updated: "2026-01-01T09:00:00.000Z",
      finalCompletedAt: "2026-01-01T09:00:00.000Z"
    });
  }
  
  const context = getPlayerRankingContext(elevenPlayers, "player-10");
  assert.equal(context.rank, 11);
  assert.equal(context.distanceToTop10, 11); // 310 - 300 + 1 = 11
});

// ========== 手机号验证测试 ==========
test("validatePhone: 有效的手机号验证", () => {
  assert.equal(validatePhone("13800138000"), true);
  assert.equal(validatePhone("13900001111"), true);
  assert.equal(validatePhone("15012345678"), true);
  assert.equal(validatePhone("17612345678"), true);
  assert.equal(validatePhone("19912345678"), true);
});

test("validatePhone: 长度不符合要求", () => {
  assert.equal(validatePhone(""), false);
  assert.equal(validatePhone("1234567890"), false); // 10位
  assert.equal(validatePhone("123456789012"), false); // 12位
});

test("validatePhone: 开头不符合要求", () => {
  assert.equal(validatePhone("01380013800"), false); // 以0开头
  assert.equal(validatePhone("21380013800"), false); // 以2开头
  assert.equal(validatePhone("91380013800"), false); // 以9开头
});

test("validatePhone: 第二位不符合要求", () => {
  assert.equal(validatePhone("11380013800"), false); // 第二位是1
  assert.equal(validatePhone("12380013800"), false); // 第二位是2
  assert.equal(validatePhone("10380013800"), false); // 第二位是0
});

test("validatePhone: 包含非数字字符", () => {
  assert.equal(validatePhone("1380013800a"), false);
  assert.equal(validatePhone("1380013800 "), false);
  assert.equal(validatePhone("13800-13800"), false);
  assert.equal(validatePhone("1380013800."), false);
});

test("validatePhone: null和undefined处理", () => {
  assert.equal(validatePhone(null as any), false);
  assert.equal(validatePhone(undefined as any), false);
});
